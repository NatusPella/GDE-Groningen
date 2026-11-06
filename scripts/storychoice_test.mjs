// There is one story (#187): the first version is gone and so is the choice between the two.
//   node scripts/storychoice_test.mjs
// - no switch, setting, environment variable or title-screen card is left that chooses a story;
//   ARC_ID is 'nieuw'; the settings migration drops `verhaal`
// - a player of the first version keeps playing (oudmigratie.js + savemigrate.js): the save and the
//   prestaties are copied once, nothing old is removed, the story starts at its beginning
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { migrateSettings, migrateSave, savedArc, SETTINGS_VERSION, SAVE_VERSION } from '../game/js/savemigrate.js';
import { migrateOudeOpslag, mergeLife } from '../game/js/oudmigratie.js';
import { ARC_ID, STEPS, MISSION_IDS } from '../game/js/storyarc.js';
import { BASE_KEYS, KEYS } from '../game/js/storagekeys.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let n = 0, fails = 0;
const ok = (cond, name, info = '') => { n++; if (!cond) { fails++; console.log(`FAIL ${name}${info ? ' (' + info + ')' : ''}`); } };
const src = (f) => fs.readFileSync(path.join(ROOT, 'game/js', f), 'utf8');
const fixture = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/fixtures/saves', f), 'utf8'));

class MemStorage {
  constructor(init = {}) { this.m = new Map(Object.entries(init)); }
  getItem(k) { return this.m.has(k) ? this.m.get(k) : null; }
  setItem(k, v) { this.m.set(k, String(v)); }
  removeItem(k) { this.m.delete(k); }
}

// the choice is gone
ok(ARC_ID === 'nieuw', 'ARC_ID is nieuw');
for (const f of ['storyflag.js', 'storychoice.js', 'storyarc_oud.js']) ok(!fs.existsSync(path.join(ROOT, 'game/js', f)), `${f} is gone`);
const used = fs.readdirSync(path.join(ROOT, 'game/js')).filter((f) => f.endsWith('.js')).filter((f) => /storyflag|storychoice|storyarc_oud|nieuwVerhaal\(\)|arcForced|GDE_NIEUW_VERHAAL|\?nieuwverhaal/.test(src(f).replace(/\/\/.*$/gm, '')));
ok(used.length === 0, 'no module in game/js still uses the story switch', used.join(','));
ok(!/GDE_NIEUW_VERHAAL/.test(fs.readFileSync(path.join(ROOT, 'desktop/main.js'), 'utf8')), 'the desktop app has no GDE_NIEUW_VERHAAL');
ok(!/verhaal/.test(src('settings.js').replace(/\/\/.*$/gm, '')), 'settings.js has no Verhaal choice');
ok(!/picker\('verhaal'/.test(src('pausemenu.js')), 'Instellingen has no Verhaal row');
ok(!/ss-choice|openChoice|Kies je verhaal/.test(src('startscreen.js')), 'the title screen has no story cards');
const sg = src('savegame.js');
ok(!/savedArc\(m\.data\) !== ARC_ID/.test(sg) && !/savedArc\(d\) !== ARC_ID/.test(sg), 'readSave and applySave have no arc gate');
ok(/OUD_GEMIGREERD_TEKST/.test(sg) && /d\.oudGemigreerd/.test(sg), 'applySave says so once when the first version is migrated');
ok(/import '\.\/oudmigratie\.js'/.test(src('main.js')), 'main.js runs the storage migration first');
ok(/ARC_SUFFIX = '-nieuw'/.test(src('storagekeys.js')) && KEYS.save === 'gde-save-v1-nieuw' && BASE_KEYS.save === 'gde-save-v1', 'the keys: the old stay, the story that is left keeps its -nieuw keys');

// the settings migration
ok(SETTINGS_VERSION >= 10, 'settings v10 dropped the Verhaal choice');
for (const from of [{ v: 8 }, { v: 8, verhaal: 'oud' }, { v: 9, verhaal: 'nieuw', nieuwverhaal: true }, { v: 3, quality: 'laag' }]) {
  const m = migrateSettings(from);
  ok(m && !('verhaal' in m.data) && !('nieuwverhaal' in m.data), `settings ${JSON.stringify(from)}: no Verhaal choice`, m && JSON.stringify(m.data));
}

// a player of the first version, storage side then save side
for (const f of ['0.37-oud-verhaal-met-voortgang.json', '0.37-oud-verhaal-zonder-voortgang.json']) {
  const before = fixture(f).save;
  const raw = JSON.stringify(before);
  const ls = new MemStorage({ [BASE_KEYS.save]: raw });
  const report = migrateOudeOpslag(ls);
  ok(report.save && !report.skipped, `${f}: the save is copied`);
  ok(ls.getItem(BASE_KEYS.save) === raw, `${f}: the old save is untouched`);
  ok(ls.getItem(KEYS.save) === raw, `${f}: copied as it was, readSave migrates it`);
  ok(ls.getItem(BASE_KEYS.oudGemigreerd) === '1', `${f}: marked as done`);
  const m = migrateSave(JSON.parse(ls.getItem(KEYS.save)));
  ok(m && m.data.v === SAVE_VERSION && savedArc(m.data) === 'nieuw', `${f}: a save of the story that is left`);
  ok(m && m.data.money === before.money && JSON.stringify(m.data.shops) === JSON.stringify(before.shops) && JSON.stringify(m.data.prestaties) === JSON.stringify(before.prestaties), `${f}: money, shops and prestaties stay`);
  ok(m && !m.data.story && !m.data.missions && m.data.oudGemigreerd === true, `${f}: the story starts over`);
  // second boot: nothing again, and a new game is not undone
  ls.removeItem(KEYS.save);
  ok(migrateOudeOpslag(ls).skipped && ls.getItem(KEYS.save) === null, `${f}: after Nieuw spel the old save does not come back`);
}
{
  // a save of the story that is left is never replaced
  const mine = JSON.stringify({ v: 10, arc: 'nieuw', money: 7 });
  const ls = new MemStorage({ [BASE_KEYS.save]: JSON.stringify(fixture('0.37-oud-verhaal-met-voortgang.json').save), [KEYS.save]: mine });
  const r = migrateOudeOpslag(ls);
  ok(!r.save && ls.getItem(KEYS.save) === mine, 'a save of the story that is left stays');
}
{
  // nothing to migrate: still marked, nothing written
  const ls = new MemStorage({});
  const r = migrateOudeOpslag(ls);
  ok(!r.save && !r.prestaties && ls.getItem(KEYS.save) === null && ls.getItem(BASE_KEYS.oudGemigreerd) === '1', 'a fresh profile: nothing copied');
  ok(migrateOudeOpslag(null).skipped && migrateOudeOpslag(undefined).skipped, 'no storage: skipped');
}
{
  // prestaties: copied when there are none yet, merged otherwise, the old key stays
  const oud = { v: 1, unlocked: { m1_klaar: 5 }, stats: { km: 10 }, sets: { s: ['a'] }, missions: { 0: { best: 60, medal: 1, runs: 2 } }, challenges: {}, fresh: [] };
  const nieuw = { v: 1, unlocked: { m1_klaar: 9, andere: 3 }, stats: { km: 4 }, sets: { s: ['b'] }, missions: { 0: { best: 50, medal: 0, runs: 1 } }, challenges: {}, fresh: [] };
  const a = new MemStorage({ [BASE_KEYS.achievements]: JSON.stringify(oud) });
  const ra = migrateOudeOpslag(a);
  ok(ra.prestaties && a.getItem(KEYS.achievements) === JSON.stringify(oud) && a.getItem(BASE_KEYS.achievements) === JSON.stringify(oud), 'prestaties: copied, the old key stays');
  const b = new MemStorage({ [BASE_KEYS.achievements]: JSON.stringify(oud), [KEYS.achievements]: JSON.stringify(nieuw) });
  migrateOudeOpslag(b);
  const mixed = JSON.parse(b.getItem(KEYS.achievements));
  ok(mixed.unlocked.m1_klaar === 5 && mixed.unlocked.andere === 3 && mixed.stats.km === 10 && mixed.sets.s.join() === 'a,b' && mixed.missions[0].best === 50 && mixed.missions[0].runs === 2, 'prestaties: merged, the best of both', JSON.stringify(mixed));
  ok(mergeLife(null, null).v === 1 && Object.keys(mergeLife('x', 5).unlocked).length === 0, 'mergeLife: rubbish in, an empty record out');
}
{
  // a full storage: nothing marked, the next boot tries again
  const ls = new MemStorage({ [BASE_KEYS.save]: '{"v":9,"arc":"oud"}' });
  ls.setItem = () => { const e = new Error('full'); e.name = 'QuotaExceededError'; throw e; };
  const r = migrateOudeOpslag(ls);
  ok(!r.save && ls.getItem(BASE_KEYS.oudGemigreerd) === null, 'a full storage: not marked, tried again next time');
}

// #590: after the one-time migration a downgraded 0.28 build can still write a newer save under an
// old key. It is taken when its savedAt is later, never when it is older, and a deleted save is not
// revived. The pre-migration backup is carried across to the key savegame.js reads.
{
  const arc = JSON.stringify({ v: 10, arc: 'nieuw', savedAt: 5000, money: 100 });
  const older = JSON.stringify({ v: 9, arc: 'oud', savedAt: 1000, money: 10 });
  const newer = JSON.stringify({ v: 9, arc: 'oud', savedAt: 9000, money: 50 });
  const mk = (init) => { const ls = new MemStorage(init); ls.setItem(BASE_KEYS.oudGemigreerd, '1'); return ls; };
  const a = mk({ [KEYS.save]: arc, 'gte-save-v1': newer });
  const r = migrateOudeOpslag(a);
  ok(r.skipped && r.laat && a.getItem(KEYS.save) === newer, 'a newer save from a downgraded build is taken');
  const b = mk({ [KEYS.save]: arc, 'gte-save-v1': older });
  ok(!migrateOudeOpslag(b).laat && b.getItem(KEYS.save) === arc, 'an older save from a downgraded build is not taken');
  const c = mk({ [KEYS.save]: arc, [BASE_KEYS.save]: newer });
  ok(migrateOudeOpslag(c).laat && c.getItem(KEYS.save) === newer, 'a newer old-story save is taken too');
  const d = mk({ 'gte-save-v1': newer });
  ok(!migrateOudeOpslag(d).laat && d.getItem(KEYS.save) === null, 'without a save of the story that is left nothing is revived');
  // the backup: old key -> old story key -> the key savegame.js reads, on a first and on a later boot
  const backup = JSON.stringify({ v: 9, at: 1, save: JSON.stringify({ v: 9, money: 1 }) });
  const e = new MemStorage({ 'gte-save-backup': backup });
  const re = migrateOudeOpslag(e);
  ok(re.backup && e.getItem(KEYS.saveBackup) === backup, 'the old backup reaches the key savegame.js reads');
  const f = mk({ [BASE_KEYS.saveBackup]: backup });
  ok(migrateOudeOpslag(f).backup && f.getItem(KEYS.saveBackup) === backup, 'a later boot still carries the backup across');
  const g = mk({ [KEYS.saveBackup]: 'already there' });
  ok(!migrateOudeOpslag(g).backup && g.getItem(KEYS.saveBackup) === 'already there', 'an existing backup is never replaced');
}

// ids only grow
ok(MISSION_IDS.slice(0, 18).join() === 'berend,chaos,kei,noorderzon,ringweg,kroegentocht,fatbike,rondvaart,pinautomaat,duifverkenning,museumkraak,vetgekaapt,vlag,skutsje,traumaduif,fjord,bod,ontzet', 'MISSION_IDS: the ids of the first version keep their places');
ok(STEPS[0].id === 'M00', 'the story starts at M00');

console.log(`${n - fails}/${n} story checks passed`);
process.exit(fails ? 1 : 0);
