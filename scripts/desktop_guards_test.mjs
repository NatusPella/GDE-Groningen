// De twee grepen uit desktop/guards.cjs (#593): de DevTools-sneltoets hoort alleen
// bij de debugbuild, en een app://-pad moet echt binnen de gamemap vallen (geen
// buurmap die met dezelfde letters begint). main.js gebruikt ze; de broncheck
// onderaan bewaakt dat de aanroep gegate blijft.
//   node scripts/desktop_guards_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { devtoolsShortcut, insideDir } = require('../desktop/guards.cjs');
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
let n = 0;
const ok = (c, m) => { assert.ok(c, m); n++; };

// DevTools-sneltoets: F12 en Ctrl+Shift+I, alleen bij een echte toetsaanslag
ok(devtoolsShortcut({ type: 'keyDown', key: 'F12' }), 'F12');
ok(devtoolsShortcut({ type: 'keyDown', key: 'i', control: true, shift: true }), 'Ctrl+Shift+I');
ok(devtoolsShortcut({ type: 'keyDown', key: 'I', control: true, shift: true }), 'Ctrl+Shift+I met hoofdletter');
ok(!devtoolsShortcut({ type: 'keyUp', key: 'F12' }), 'keyUp opent niets');
ok(!devtoolsShortcut({ type: 'keyDown', key: 'i', control: true }), 'Ctrl+I is geen DevTools');
ok(!devtoolsShortcut({ type: 'keyDown', key: 'F11' }), 'F11 is volledig scherm, geen DevTools');
ok(!devtoolsShortcut(null), 'geen invoer');

// app://-pad: binnen de map goed, een buurmap met dezelfde prefix niet
const dir = path.join('tmp', 'stage', 'game');
ok(insideDir(dir, path.join(dir, 'index.html')), 'index.html in de gamemap');
ok(insideDir(dir, path.join(dir, 'js', 'dit', 'bestaat', 'niet.js')), 'diep pad in de gamemap');
ok(insideDir(dir, dir), 'de map zelf');
ok(!insideDir(dir, path.join('tmp', 'stage', 'game2', 'x.html')), 'buurmap game2 valt erbuiten');
ok(!insideDir(dir, path.join(dir, '..', 'game2', 'x.html')), '.. naar een buurmap valt erbuiten');
ok(!insideDir(dir, path.join('tmp', 'elders', 'x.html')), 'los pad valt erbuiten');
ok(!insideDir(dir, path.join(dir, '..', '..', 'geheim.txt')), 'traversal valt erbuiten');

// main.js: DevTools alleen achter de devtools-vlag, en de padcontrole via insideDir
const main = fs.readFileSync(path.join(ROOT, 'desktop', 'main.js'), 'utf8');
ok(/if \(devtools && devtoolsShortcut\(input\)\)/.test(main), 'toggleDevTools staat achter de devtools-vlag (#593 punt 1)');
ok(/insideDir\(GAME_DIR, file\)/.test(main), 'de app://-controle gebruikt insideDir (#593 punt 9)');
ok(!/file\.startsWith\(GAME_DIR\)/.test(main), 'de oude stringprefix-controle is weg');
ok(/require\('\.\/guards\.cjs'\)/.test(main), 'main.js laadt guards.cjs');

console.log(`desktop_guards_test: ${n} checks ok`);
