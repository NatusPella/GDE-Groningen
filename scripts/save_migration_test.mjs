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
import { migrateSave, migrateSettings, savedStoryStep, SAVE_VERSION, SETTINGS_VERSION } from '../game/js/savemigrate.js';
import { STEP_BY_ID, RETIRED_STEPS } from '../game/js/storyarc.js';
import { CHEAT_BY_ID } from '../game/js/cheatlist.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, 'scripts/fixtures/saves');
const src = (f) => fs.readFileSync(path.join(ROOT, 'game/js', f), 'utf8');

// ids the game accepts, read from the sources (those modules need a browser)
const shops = src('shops.js');
const block = (text, start) => text.slice(text.indexOf(start), text.indexOf('\n};', text.indexOf(start)));
const VEHICLES = new Set([...block(shops, 'export const VEHICLE_STOCK').matchAll(/^ {2}(\w+): \{ kind:/gm)].map((m) => m[1]));
const OUTFIT_IDS = new Set([...block(shops, 'export const OUTFITS').matchAll(/id: '([\w-]+)'/g)].map((m) => m[1]));
const UPGRADES = new Set([...shops.slice(shops.indexOf('export const CAR_UPGRADES'), shops.indexOf('];', shops.indexOf('export const CAR_UPGRADES'))).matchAll(/id: '([\w-]+)'/g)].map((m) => m[1]));
const statsLine = /this\.stats = \{([^}]*)\}/.exec(src('world.js'))[1];
const STATS = new Set([...statsLine.matchAll(/(\w+):/g)].map((m) => m[1]));

let n = 0, fails = 0;
const ok = (cond, name, info = '') => { n++; if (!cond) { fails++; console.log(`FAIL ${name}${info ? ' (' + info + ')' : ''}`); } };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

for (const sanity of [[VEHICLES, 'omafiets'], [OUTFIT_IDS, 'incognito'], [UPGRADES, 'turbo'], [STATS, 'knockouts']]) ok(sanity[0].has(sanity[1]), `id list from source has ${sanity[1]}`);

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

  // playable: the story continues at a step that exists
  const step = savedStoryStep(d);
  ok(step && (STEP_BY_ID.has(step.id) || step.end), `${tag}: continues at an existing step`, JSON.stringify(step && (step.id || step)));
  if (exp.step) ok(step && step.id === exp.step, `${tag}: continues at ${exp.step}`, step && step.id);
  if (d.story) {
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

  // stats: the kill counters became knockouts, nothing lost
  const old = before.stats || {};
  for (const [o, k] of [['kills', 'knockouts'], ['pedKills', 'pedKnockouts'], ['copKills', 'copKnockouts']]) {
    ok(!(o in d.stats), `${tag}: no ${o} left`);
    if (o in old) ok(d.stats[k] === old[o], `${tag}: ${o} carried over to ${k}`);
  }
  for (const k of Object.keys(d.stats)) ok(STATS.has(k) || k === 'spent', `${tag}: stat ${k} is one the game keeps`);
  ok(d.stats.missionsDone === old.missionsDone, `${tag}: missionsDone intact`);
  ok(same(d.missions, before.missions), `${tag}: mission progress intact`);

  // garage, outfits, prestaties
  const sh = d.shops;
  if (sh) {
    ok(same(sh.vehicles, before.shops.vehicles), `${tag}: garage intact`);
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
    else ok(same(sk, before.streken), `${tag}: streken intact`);
    for (const id of exp.streken || []) ok(sk.unlocked.includes(id), `${tag}: streek ${id} unlocked`);
    for (const id of exp.strekenLocked || []) ok(!sk.unlocked.includes(id), `${tag}: streek ${id} still locked`);
  }
  for (const k of ['visitedLandmarks', 'meubels', 'bijbaan', 'postgame', 'doel', 'duif', 'character', 'pos']) {
    if (k in before) ok(same(d[k], before[k]), `${tag}: ${k} intact`);
  }
}

// every station id the radio list ever saved
for (const [id, want] of [['gmusic', 'on'], ['nachtstreek', 'on'], ['grunn', 'on'], ['uit', 'off'], ['on', 'on'], ['off', 'off'], [42, 'on']]) {
  const m = migrateSave({ v: 2, money: 1, radio: id });
  ok(m && m.data.radio === want, `radio ${JSON.stringify(id)} becomes ${want}`, m && m.data.radio);
}

console.log(`${n - fails}/${n} checks passed over ${files.length} fixtures`);
process.exit(fails ? 1 : 0);
