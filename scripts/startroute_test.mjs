// #581: elke testrun start zoals de speler (boot → wereld); alleen de QA/opname-route houdt het
// oude titelscherm. Bronchecks zonder Electron:  node scripts/startroute_test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };

const ss = read('game/js/startscreen.js');

// --- de keuze in runStartScreen: het oude scherm alleen voor de QA/opname-route ---
const route = /export function runStartScreen\(world, opts\) \{([\s\S]*?)\n\}/.exec(ss);
ok(route, 'runStartScreen bestaat');
const body = route ? route[1] : '';
ok(/const menu = FLAGS\.menutest \|\| FLAGS\.trailer \|\| FLAGS\.preview \|\| FLAGS\.attract;/.test(body), 'alleen ?menutest, trailer, preview en attract kiezen het oude scherm');
for (const flag of ['stil', 'storytest', 'benchmark', 'noattract', 'perf', 'spotsonly']) {
  ok(!new RegExp(`FLAGS\\.${flag}\\b`).test(body), `${flag} forceert het menu niet meer`);
}
ok(/return menu \? runMenuScreen\(world, opts, pending\) : runBootScreen\(world, opts, pending\);/.test(body), 'de rest, ook de testruns, gaat via de boot');

// --- de benchmark draait vanuit de boot, op dezelfde wereld als vroeger ---
ok(/function runBootScreen\(world, opts, pending = null\)/.test(ss), 'de boot krijgt de openstaande intro mee');
ok(/pending\.mode === 'benchmark'/.test(ss) && /runBenchmarkSuite\(world, env\)/.test(ss), 'de benchmark draait vanuit de boot');
ok(/if \(firstRun\) benchmarkFirstRun\(opts, \(\) => startNew\(\)\);[\s\S]{0,120}else if \(save\) continueGame\(\); else startNew\(\);/.test(ss), 'na de benchmark start het spel gewoon');

// --- de QA-harnassen die het scherm zelf bedienen vragen het met GDE_MENU_TEST (devtools → ?menutest) ---
const dt = read('desktop/devtools.js');
ok(/process\.env\.GDE_MENU_TEST && 'menutest'/.test(dt), 'GDE_MENU_TEST geeft de QA-scripts het oude scherm');
ok(/started: document\.body\.classList\.contains\('game-started'\)/.test(dt), 'de smoke-run meldt of de wereld al gestart is');
ok(/if \(document\.body\.classList\.contains\('game-started'\) && !up\) break;/.test(dt), 'een testrun wacht niet meer op een menu dat niet komt');

// --- de verhaaltest wacht op de spelstart, niet meer op het menu ---
const st = read('game/js/storytest.js');
ok(/if \(ss && ss\.classList\.contains\('visible'\)\)/.test(st) && /game-started'\), 180000\)/.test(st), 'de verhaaltest start zoals de speler');

// --- de menu-achtergrond wordt niet meer voor elke start gepland ---
ok(/if \(planned \|\| !\(FLAGS\.menutest \|\| FLAGS\.trailer \|\| FLAGS\.preview \|\| FLAGS\.attract\)\) return;/.test(ss), 'planMenuStart hangt aan de menu-route');

console.log(`${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
