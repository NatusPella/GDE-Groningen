// Save guarantee: old saves and settings files keep loading (game/js/savemigrate.js).
//   node scripts/save_migration_test.mjs
// Every fixture in scripts/fixtures/saves/ is a save (or settings file) in the
// shape an earlier version wrote, read from the git history of savegame.js,
// story.js and settings.js. Each one is migrated to the current version and
// checked: the story step it continues at exists, and money, garage, outfits
// and prestaties come through untouched. Add a fixture whenever a release
// changes the save; never edit an old one.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { migrateSave, migrateSettings, plausiblePos, savedStoryStep, savedArc, SAVE_VERSION, SETTINGS_VERSION } from '../game/js/savemigrate.js';
import { STEP_BY_ID, RETIRED_STEPS, ARC_ID, STEPS } from '../game/js/storyarc.js';
import { STAT_DEFAULTS, statsFromSave } from '../game/js/world.js';
import { CHEAT_BY_ID } from '../game/js/cheatlist.js';
import { legacyToWorld, legacyAngleToWorld } from '../game/js/rdnew.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, 'scripts/fixtures/saves');
const src = (f) => fs.readFileSync(path.join(ROOT, 'game/js', f), 'utf8');

// ids the game accepts, read from the sources (those modules need a browser)
const shops = src('shops.js');
const block = (text, start) => text.slice(text.indexOf(start), text.indexOf('\n};', text.indexOf(start)));
const VEHICLES = new Set([...block(src('shopdata.js'), 'export const VEHICLE_STOCK').matchAll(/^ {2}(\w+): \{ kind:/gm)].map((m) => m[1]));
const OUTFIT_IDS = new Set([...block(shops, 'export const OUTFITS').matchAll(/id: '([\w-]+)'/g)].map((m) => m[1]));
const UPGRADES = new Set([...shops.slice(shops.indexOf('export const CAR_UPGRADES'), shops.indexOf('];', shops.indexOf('export const CAR_UPGRADES'))).matchAll(/id: '([\w-]+)'/g)].map((m) => m[1]));
const STATS = new Set(Object.keys(STAT_DEFAULTS));

let n = 0, fails = 0;
const ok = (cond, name, info = '') => { n++; if (!cond) { fails++; console.log(`FAIL ${name}${info ? ' (' + info + ')' : ''}`); } };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const movedTo = (o, n) => { const [x, y] = legacyToWorld(o.x, o.y); return Math.abs(n.x - x) <= 0.051 && Math.abs(n.y - y) <= 0.051; };

for (const sanity of [[VEHICLES, 'omafiets'], [OUTFIT_IDS, 'incognito'], [UPGRADES, 'turbo'], [STATS, 'pedKills']]) ok(sanity[0].has(sanity[1]), `id list from source has ${sanity[1]}`);

const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.json')).sort();
for (const file of files) {
  const fx = JSON.parse(fs.readFileSync(path.join(DIR, file), 'utf8'));
  const exp = fx._expect || {};
  const tag = file.replace(/\.json$/, '');

  if (fx.settings) {
    const m = migrateSettings(fx.settings);
    ok(m && m.data.v === SETTINGS_VERSION, `${tag}: migrates to settings v${SETTINGS_VERSION}`);
    if (!m) continue;
    for (const [k, v] of Object.entries(exp)) ok(v === null ? !(k in m.data) : m.data[k] === v, `${tag}: ${k}`, JSON.stringify(m.data[k]));
    ok(same(migrateSettings(m.data).data, m.data), `${tag}: migrating twice changes nothing`);
    continue;
  }

  const before = fx.save;
  const m = migrateSave(before);
  if (exp.rejected) {
    ok(m === null, `${tag}: a newer save is not read`);
    ok(before.v === 99, `${tag}: and left as it was`);
    continue;
  }
  ok(m && m.data.v === SAVE_VERSION, `${tag}: migrates to v${SAVE_VERSION}`, m && m.steps.join(' '));
  if (!m) continue;
  const d = m.data;
  ok(same(before, fx.save) && before !== d, `${tag}: the original is not modified`);
  ok(same(migrateSave(d).data, d) && migrateSave(d).steps.length === 0, `${tag}: migrating twice changes nothing`);

  // there is one story (#187): a save of the first version ('oud', every save before 0.35) becomes a save of
  // the story that is left: what the player owns stays, the story starts at its beginning, once a message at the load
  const converted = (before.arc || 'oud') !== 'nieuw';
  ok(savedArc(d) === 'nieuw' && d.arc === 'nieuw' && ARC_ID === 'nieuw', `${tag}: belongs to the one story`, d.arc);
  if (converted) {
    ok(d.oudGemigreerd === true, `${tag}: marked as migrated from the first version (the message at the load)`);
    for (const k of ['story', 'missions', 'kalender', 'doel', 'ctx']) ok(!(k in d), `${tag}: ${k} of the first version dropped`);
  } else {
    ok(!('oudGemigreerd' in d), `${tag}: a save of the story that is left gets no migration message`);
  }

  // playable: the story continues at a step that exists (a converted save at the beginning)
  const step = savedStoryStep(d);
  ok(step && (STEP_BY_ID.has(step.id) || step.end), `${tag}: continues at an existing step`, JSON.stringify(step && (step.id || step)));
  if (converted) ok(step && step.id === STEPS[0].id, `${tag}: starts at the beginning of the story`, step && step.id);
  if (exp.step && !converted) ok(step && step.id === exp.step, `${tag}: continues at ${exp.step}`, step && step.id);
  if (d.story && !converted) {
    const unknown = [...d.story.done, ...d.story.skipped, ...d.story.voorschot].filter((id) => !STEP_BY_ID.has(id));
    ok(!unknown.length, `${tag}: no retired or unknown step ids left`, unknown.join(','));
    const kept = before.story.done.filter((id) => !RETIRED_STEPS.includes(id));
    ok(same(d.story.done, kept), `${tag}: every current step that was done stays done`);
    ok(same(d.story.flags, before.story.flags) && same(d.story.cards, before.story.cards), `${tag}: flags and cards intact`);
  }

  // money
  ok(same(d.money, before.money), `${tag}: money intact`, `${d.money}`);
  if ('moneyBackup' in exp) ok(d.moneyBackup === exp.moneyBackup, `${tag}: moneyBackup intact for the money restore`);
  ok(Number.isFinite(d.money) ? d.money === exp.money : Number.isFinite(d.moneyBackup), `${tag}: money is a number or can be restored`);

  // stats: the kill counters became knockouts in 0.24 and kills again in
  // 0.28 (a wrecked police car counts as a cop kill); nothing lost
  const old = before.stats || {};
  const wrecked = old.copCarsWrecked || 0;
  for (const [o, k] of [['kills', 'knockouts'], ['pedKills', 'pedKnockouts'], ['copKills', 'copKnockouts']]) {
    ok(!(k in d.stats), `${tag}: no ${k} left`);
    // (copCarsWrecked only ever sat next to the knockout counters; where a
    // fixture has it beside kills it is added all the same)
    const base = o in old ? old[o] : old[k];
    const want = base === undefined ? undefined : base + (o === 'pedKills' ? 0 : wrecked);
    if (want !== undefined) ok(d.stats[o] === want, `${tag}: ${o} is ${want}`, d.stats[o]);
  }
  ok(!('copCarsWrecked' in d.stats), `${tag}: no copCarsWrecked left`);
  for (const k of Object.keys(d.stats)) ok(STATS.has(k) || k === 'spent', `${tag}: stat ${k} is one the game keeps`);
  ok(d.stats.missionsDone === old.missionsDone, `${tag}: missionsDone intact`);
  if (!converted) ok(same(d.missions, before.missions), `${tag}: mission progress intact`);

  // garage, outfits, prestaties
  const sh = d.shops;
  if (sh) {
    const noPos = (list) => list.map(({ x, y, angle, ...rest }) => rest);
    ok(same(noPos(sh.vehicles), noPos(before.shops.vehicles)), `${tag}: garage intact`);
    sh.vehicles.forEach((v, i) => {
      const o = before.shops.vehicles[i];
      if (!Number.isFinite(o.x)) return ok(!('x' in v), `${tag}: ${v.key} without a place stays without`);
      if (before.v >= 7) return ok(o.x === v.x && o.y === v.y && o.angle === v.angle, `${tag}: ${v.key} already in RD New, not moved`);
      ok(movedTo(o, v), `${tag}: ${v.key} at the same real place (RD New)`, `${o.x},${o.y} -> ${v.x},${v.y}`);
      if (Number.isFinite(o.angle)) ok(Math.abs(v.angle - legacyAngleToWorld(o.x, o.y, o.angle)) < 0.06, `${tag}: ${v.key} heading turned with the frame`);
    });
    for (const v of sh.vehicles) ok(VEHICLES.has(v.key), `${tag}: vehicle ${v.key} still exists`);
    for (const v of sh.vehicles) for (const u of v.upgrades) ok(UPGRADES.has(u) || /bel|mand|slot/.test(u), `${tag}: upgrade ${u} still exists`);
    ok(same(sh.ownedOutfits, before.shops.ownedOutfits) && same(sh.outfit, before.shops.outfit), `${tag}: outfits intact`);
    for (const id of [...sh.ownedOutfits, ...Object.values(sh.outfit)]) ok(OUTFIT_IDS.has(id), `${tag}: outfit ${id} still exists`);
  }
  if (before.prestaties) ok(same(d.prestaties, before.prestaties), `${tag}: prestaties intact`);
  // the radio: a 0.27-dev station id is 'on' now, 'uit' is 'off', no field stays no field
  if ('radio' in exp) ok(d.radio === exp.radio, `${tag}: radio is ${exp.radio}`, d.radio);
  else if (!('radio' in before)) ok(!('radio' in d), `${tag}: no radio field added`);
  // the streken: every save has them, with what its story earned; nothing switched on by a migration
  const sk = d.streken;
  ok(sk && Array.isArray(sk.unlocked) && Array.isArray(sk.on), `${tag}: streken section present`);
  if (sk) {
    for (const id of sk.unlocked) ok(CHEAT_BY_ID.has(id), `${tag}: streek ${id} exists`);
    if (!before.streken) ok(sk.on.length === 0, `${tag}: no streek switched on`);
    else if (exp.strekenAfter) ok(same(sk, exp.strekenAfter), `${tag}: retired streken dropped, the rest intact`, JSON.stringify(sk));
    else ok(same(sk, before.streken), `${tag}: streken intact`);
    for (const id of exp.streken || []) ok(sk.unlocked.includes(id), `${tag}: streek ${id} unlocked`);
    for (const id of exp.strekenLocked || []) ok(!sk.unlocked.includes(id), `${tag}: streek ${id} still locked`);
  }
  for (const k of ['visitedLandmarks', 'meubels', 'bijbaan', 'postgame', 'duif', 'character']) {
    if (k in before) ok(same(d[k], before[k]), `${tag}: ${k} intact`);
  }
  // positions: the same real place in the RD New frame (save v7)
  for (const k of ['pos', 'doel']) {
    const o = before[k];
    if (!(k in before) || (converted && k === 'doel')) continue;
    if (!o || !Number.isFinite(o.x)) { ok(same(d[k], o), `${tag}: ${k} without a place intact`); continue; }
    const { x, y, ...rest } = d[k], { x: ox, y: oy, ...orest } = o;
    // a save of v7 or later is in the RD New frame already: nothing moves
    ok(same(rest, orest) && (before.v >= 7 ? same(o, d[k]) : movedTo(o, d[k])), `${tag}: ${k} at the same real place`, `${ox},${oy} -> ${x},${y}`);
  }
  if (before.v < 8) ok(d.frame === 'rd-new', `${tag}: marked as RD New`);
  if (exp.pos) ok(Math.hypot(d.pos.x - exp.pos[0], d.pos.y - exp.pos[1]) < 0.06, `${tag}: pos is ${exp.pos}`, `${d.pos.x},${d.pos.y}`);
}

// the arc of a save: a save of the first version becomes a save of the story that is left (migration 9)
{
  ok(savedArc() === 'nieuw', 'savedArc: always the story that is left');
  const a = migrateSave({ v: 8, money: 1, story: { v: 1, done: ['H1'] }, missions: { completed: [0] } });
  ok(a && a.data.arc === 'nieuw' && a.steps.join() === '8->9,9->10', 'a v8 save without arc is the first version, and becomes the story that is left');
  ok(a && a.data.money === 1 && !a.data.story && !a.data.missions && a.data.oudGemigreerd === true, 'its money stays, its story starts over');
  const b = migrateSave({ v: 9, arc: 'oud', money: 5, shops: { vehicles: [] }, story: { v: 1, done: ['H1'] } });
  ok(b && b.data.arc === 'nieuw' && b.steps.join() === '9->10' && b.data.shops && b.data.money === 5, 'a v9 save of the first version is converted by the last step only');
  const c = migrateSave({ v: 9, arc: 'nieuw', money: 1, story: { v: 1, done: ['M00'] } });
  ok(c && c.data.arc === 'nieuw' && c.data.story.done[0] === 'M00' && !('oudGemigreerd' in c.data), 'a save of the story that is left keeps its story');
  ok(SAVE_VERSION >= 10, 'save v10 converted the first version');
  ok(SETTINGS_VERSION >= 10, 'settings v10 dropped the Verhaal choice');
  for (const [from, has] of [[{ v: 9, verhaal: 'oud' }, false], [{ v: 8, verhaal: 'nieuw', gore: false }, false], [{ v: 3 }, false]]) {
    const m = migrateSettings(from);
    ok(m && !('verhaal' in m.data) && !('nieuwverhaal' in m.data), `settings ${JSON.stringify(from)}: no Verhaal choice left`, m && JSON.stringify(m.data));
  }
}

// every station id the radio list ever saved
for (const [id, want] of [['gmusic', 'on'], ['nachtstreek', 'on'], ['grunn', 'on'], ['uit', 'off'], ['on', 'on'], ['off', 'off'], [42, 'on']]) {
  const m = migrateSave({ v: 2, money: 1, radio: id });
  ok(m && m.data.radio === want, `radio ${JSON.stringify(id)} becomes ${want}`, m && m.data.radio);
}

// the blood-and-limbs switch is back, on by default (settings.js)
ok(/\n\s+gore: true,/.test(src('settings.js')), 'settings.js has gore on by default');
for (const [g, want] of [[true, true], [false, false], ['ja', undefined]]) {
  const m = migrateSettings({ v: 7, gore: g });
  ok(m && m.data.gore === want, `settings v7 gore ${JSON.stringify(g)} becomes ${want}`, m && m.data.gore);
}

// loading resets the counters first: a counter the save lacks is 0, not this session's value
{
  const st = statsFromSave({ kills: 7, missionsDone: 'x', bogus: 9 });
  ok(st.kills === 7 && st.pedKills === 0 && st.copKills === 0 && st.missionsDone === 0 && st.playerWrecks === 0, 'statsFromSave: save values, defaults for the rest');
  ok(!('bogus' in st), 'statsFromSave: unknown keys dropped');
  ok(Object.keys(statsFromSave(null)).length === STATS.size && statsFromSave(undefined).kills === 0, 'statsFromSave: no stats at all gives the defaults');
  ok(statsFromSave({ kills: -3 }).kills === 0, 'statsFromSave: negative counter clamps to 0');
}

// #212: a position outside the province frame is not placed; a migrated legacy Ommeland one is
{
  const old = migrateSave({ v: 6, pos: { x: 6000, y: -2500 } }).data;
  const [wx, wy] = legacyToWorld(6000, -2500);
  ok(plausiblePos(old.pos) && Math.abs(old.pos.x - wx) < 0.2 && old.frame === 'rd-new', 'a legacy Ommeland position migrates once into the RD frame');
  const again = migrateSave(old).data;
  ok(again.pos.x === old.pos.x && again.pos.y === old.pos.y, 'a migrated save does not move again');
  ok(!plausiblePos({ x: 233000, y: 582000 }) && !plausiblePos({ x: NaN, y: 0 }) && !plausiblePos(null) && plausiblePos({ x: -4200, y: 1900 }), 'plausiblePos');
}

console.log(`${n - fails}/${n} checks passed over ${files.length} fixtures`);
process.exit(fails ? 1 : 0);
