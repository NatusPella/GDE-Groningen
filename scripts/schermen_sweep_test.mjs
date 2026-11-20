// De QA-sweep van de schermen (scripts/qa/schermen_sweep.*): zonder Electron controleren we dat het paginascript als
// functietekst parseert, dat elke detector erin staat en dat de samenvatting een resultaatbestand goed telt.
//   node scripts/schermen_sweep_test.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
let n = 0, fails = 0;
const ok = (c, m, info = '') => { n++; if (!c) { fails++; console.log('FAIL ' + m + (info ? ' (' + info + ')' : '')); } };

const page = fs.readFileSync(path.join(ROOT, 'scripts/qa/schermen_sweep.page.js'), 'utf8');
let parse = true;
try { new (Object.getPrototypeOf(async function () {}).constructor)(page); } catch (e) { parse = false; ok(false, 'paginascript parseert', e.message); }
ok(parse, 'paginascript parseert als async functietekst (perf-script)');
for (const k of ['buitenBeeld', 'afgekapt', 'bedekt', 'contrast', 'klein', 'geenFocus', 'geenControllerFocus', 'geenFocusring', 'kleinDoel']) ok(page.includes(k), `detector ${k} staat in het paginascript`);
ok(/localStorage/.test(page) === false, 'het paginascript raakt geen echte opslag');
ok(/const FOCUSABLE = .*\[tabindex\]/.test(page), 'de controllerselector komt overeen met gamepad.js');
const pad = fs.readFileSync(path.join(ROOT, 'game/js/gamepad.js'), 'utf8').match(/const FOCUSABLE = ('[^']+')/);
ok(!!pad && page.includes('const FOCUSABLE = ' + pad[1]), 'FOCUSABLE is gelijk aan die in gamepad.js (anders meet de sweep een andere controller)');

// de samenvatting
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gde-sweep-test-'));
const f = path.join(dir, 'sweep.json');
const leeg = { buitenBeeld: [], afgekapt: [], bedekt: [], contrast: [], klein: [], geenFocus: [], geenControllerFocus: [], geenFocusring: [], kleinDoel: [] };
fs.writeFileSync(f, JSON.stringify({ '1280x720': { schermen: { kaart: { ...leeg, klein: [{ el: 'a' }, { el: 'b' }] }, hud: leeg } } }));
const r = spawnSync(process.execPath, [path.join(ROOT, 'scripts/qa/schermen_sweep.mjs'), `--samenvatting=${f}`], { encoding: 'utf8' });
const regels = (r.stdout || '').trim().split('\n');
ok(r.status === 0 && regels.length === 3, 'samenvatting geeft kop en twee regels', r.stdout);
ok(regels[1] && regels[1].split('\t')[6] === '2', 'twee kleine teksten geteld');
fs.rmSync(dir, { recursive: true, force: true });
console.log(`schermen_sweep_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
