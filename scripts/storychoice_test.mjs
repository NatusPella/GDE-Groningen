// The choice of story arc (game/js/storyflag.js, storychoice.js, settings.js, savegame.js):
//   node scripts/storychoice_test.mjs
// - the arc follows the environment, the URL and the setting, in that order; default 'oud'
// - the setting `verhaal` defaults to 'oud' and migrates; a save records its arc and keeps it
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { migrateSettings, migrateSave, savedArc, SETTINGS_VERSION } from '../game/js/savemigrate.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let n = 0, fails = 0;
const ok = (cond, name, info = '') => { n++; if (!cond) { fails++; console.log(`FAIL ${name}${info ? ' (' + info + ')' : ''}`); } };

// the arc a fresh page load picks, in a child process (the flag is decided once at import)
function arcWith({ env, search = '', settings = null, flag = null }) {
  const entries = Object.entries({ ...(settings ? { 'gde-settings': JSON.stringify(settings) } : {}), ...(flag ? { 'gde-nieuwverhaal': flag } : {}) });
  const code = [
    `const store = new Map(${JSON.stringify(entries)});`,
    'globalThis.localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null) };',
    search ? `globalThis.location = { search: ${JSON.stringify(search)} };` : '',
    `const m = await import(${JSON.stringify(path.join(ROOT, 'game/js/storyflag.js'))});`,
    "console.log(m.ARC_ID + ' ' + m.arcForced());",
  ].join('\n');
  const e = { ...process.env };
  delete e.GDE_NIEUW_VERHAAL;
  if (env !== undefined) e.GDE_NIEUW_VERHAAL = env;
  const r = spawnSync(process.execPath, ['--input-type=module', '-e', code], { env: e, encoding: 'utf8' });
  return r.stdout.trim() || r.stderr.trim();
}
ok(arcWith({}) === 'oud false', 'default: the old arc, not forced', arcWith({}));
ok(arcWith({ settings: { verhaal: 'oud' } }) === 'oud false', 'setting oud: the old arc');
ok(arcWith({ settings: { verhaal: 'nieuw' } }) === 'nieuw false', 'setting nieuw: the new arc, not forced (the setting can change it)');
ok(arcWith({ env: '1' }) === 'nieuw true', 'GDE_NIEUW_VERHAAL=1 forces the new arc');
ok(arcWith({ env: '1', settings: { verhaal: 'oud' } }) === 'nieuw true', 'the environment beats the setting');
ok(arcWith({ env: '0', settings: { verhaal: 'nieuw' } }) === 'oud true', 'GDE_NIEUW_VERHAAL=0 forces the old arc');
ok(arcWith({ search: '?nieuwverhaal' }) === 'nieuw true', '?nieuwverhaal forces the new arc');
ok(arcWith({ search: '?stil&nieuwverhaal=1' }) === 'nieuw true', '?nieuwverhaal=1 too');
ok(arcWith({ search: '?nieuwverhaal=0', settings: { verhaal: 'nieuw' } }) === 'oud true', '?nieuwverhaal=0 forces the old arc');
ok(arcWith({ flag: '1' }) === 'nieuw false', 'the hidden localStorage flag still works');
ok(arcWith({ settings: { verhaal: 'iets' } }) === 'oud false', 'an unknown setting value is the old arc');

// the setting: default 'oud', migration
const src = (f) => fs.readFileSync(path.join(ROOT, 'game/js', f), 'utf8');
ok(/verhaal: 'oud',/.test(src('settings.js')), 'settings.js: Verhaal defaults to oud');
ok(/KEEP_ON_RESET = new Set\([^)]*'verhaal'/.test(src('settings.js')), 'settings.js: "Standaard herstellen" does not switch story');
ok(SETTINGS_VERSION >= 9, 'settings v9 added the Verhaal choice');
for (const [from, want] of [[{ v: 8 }, 'oud'], [{ v: 8, verhaal: 'nieuw' }, 'nieuw'], [{ v: 8, verhaal: 'rommel' }, 'oud'], [{ v: 3, quality: 'laag' }, 'oud'], [{ v: 9, verhaal: 'nieuw' }, 'nieuw']]) {
  const m = migrateSettings(from);
  ok(m && m.data.verhaal === want, `settings ${JSON.stringify(from)} -> verhaal ${want}`, m && m.data.verhaal);
}
ok(/picker\('verhaal'/.test(src('pausemenu.js')) && /\['oud', 'Klassiek'\], \['nieuw'/.test(src('pausemenu.js')), 'Instellingen has the Verhaal row (Klassiek / Nieuw)');
ok(/act: 'story'/.test(src('startscreen.js')) && /arcName\(save\.arc\)/.test(src('startscreen.js')), 'the title screen shows the story and the arc of the save');

// the save records its arc and a loaded save keeps it
const sg = src('savegame.js');
ok(/arc: ARC_ID,/.test(sg), 'serialize writes arc: ARC_ID');
ok(/if \(savedArc\(m\.data\) !== ARC_ID\) return null;/.test(sg), 'readSave never returns a save of the other arc');
ok(/if \(savedArc\(d\) !== ARC_ID\) return false;/.test(sg), 'applySave never loads a save of the other arc');
ok(/arc: savedArc\(d\)/.test(sg), 'the save summary names the arc');
const keys = src('storagekeys.js');
ok(/ARC_KEYS = \[[^\]]*'save'[^\]]*'saveBackup'/.test(keys) && /'-nieuw'/.test(keys), 'the new arc has its own save and backup key');
for (const [save, arc] of [[{ v: 9, arc: 'nieuw' }, 'nieuw'], [{ v: 9, arc: 'oud' }, 'oud'], [{ v: 8 }, 'oud'], [{ v: 4, story: { v: 1, done: [] } }, 'oud']]) {
  const m = migrateSave(save);
  ok(m && savedArc(m.data) === arc && m.data.arc === arc, `a save ${JSON.stringify(save)} keeps/gets arc ${arc}`);
}

console.log(`${n - fails}/${n} story choice checks passed`);
process.exit(fails ? 1 : 0);
