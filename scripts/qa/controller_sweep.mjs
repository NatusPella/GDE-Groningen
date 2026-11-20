// QA-controller: loopt de schermen af met een nagebootste gamepad (navigator.getGamepads) in Electron (#985, QA-controller 20-11).
//   node scripts/qa/controller_sweep.mjs [--out=<map>] [--familie=xbox|ps|switch] [--formaat=1280x720] [--schermen=kaart,winkel] [--settle=6000]
//   node scripts/qa/controller_sweep.mjs --samenvatting=<controller.json>     (een korte tabel; ook zonder Electron)
// Het paginascript (controller_sweep.page.js) drukt knoppen en kantelt sticks; per scherm meet het focus, bereikbaarheid, A, B, bumpers, scroll,
// toetsenbordhints en dubbele focusringen. GDE_GAME_DIR=<gestagede game-map> (backslashes), ELECTRON_EXE=<pad>, GDE_ELECTRON_FLAGS="--no-sandbox --in-process-gpu",
// GDE_PROFILE_DIR=<map voor het wegwerpprofiel> zoals bij schermen_sweep.mjs. Uitvoer: <out>/controller-<familie>.json; exit 0 als er een resultaat is.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };

import { bevindingen } from './controller_sweep_logic.mjs';

if (arg('samenvatting', '')) {
  const j = JSON.parse(fs.readFileSync(arg('samenvatting'), 'utf8'));
  console.log(['scherm', 'doelen', 'bereikt', 'A', 'B', 'bumper', 'bevindingen'].join('\t'));
  for (const [s, r] of Object.entries(j.schermen || {})) console.log([s, r.doelen ?? '', r.bereikt ?? '', r.aKlik ?? '', r.bTerug ?? '', r.bumper ? (r.bumper.rt || r.bumper.rb ? 'ja' : 'nee') : '', bevindingen(r).join('; ')].join('\t'));
  process.exit(0);
}

const OUT = path.resolve(arg('out', path.join(os.tmpdir(), 'gde-qa-controller')));
const familie = arg('familie', 'xbox');
const m = arg('formaat', '1280x720').match(/^(\d{3,4})x(\d{3,4})$/);
if (!m) { console.error('onbekend formaat'); process.exit(2); }
fs.mkdirSync(OUT, { recursive: true });
const electron = process.env.ELECTRON_EXE || path.join(ROOT, 'desktop', 'node_modules', 'electron', 'dist', process.platform === 'win32' ? 'electron.exe' : 'Electron');
const body = fs.readFileSync(path.join(HERE, 'controller_sweep.page.js'), 'utf8');
const profile = path.join(process.env.GDE_PROFILE_DIR || OUT, `profiel-${process.pid}`);
fs.mkdirSync(profile, { recursive: true });
const script = path.join(OUT, `_page-${familie}.js`);
fs.writeFileSync(script, `window.__cs = ${JSON.stringify({ naam: arg('formaat', '1280x720'), familie, schermen: arg('schermen', '').split(',').filter(Boolean), zonderSubs: arg('subs', '1') === '0' })};\n` + body);
const env = { ...process.env, GDE_TEST_PROFILE: profile, GDE_MENU_TEST: '1', GDE_NO_THROTTLE: '1' };
if (process.env.GDE_GAME_DIR) env.GDE_GAME_DIR = path.resolve(process.env.GDE_GAME_DIR);
delete env.ELECTRON_RUN_AS_NODE;
const extra = (process.env.GDE_ELECTRON_FLAGS || '').split(' ').filter(Boolean);
const r = spawnSync(electron, ['.', ...extra, '--windowed', '--stil', '--force-device-scale-factor=1', `--window-size=${m[1]}x${m[2]}`,
  '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--disable-features=CalculateNativeWinOcclusion',
  `--smoke-test=${path.join(OUT, 'shots.png')}`, `--perf-script=${script}`],
{ cwd: process.env.GDE_DESKTOP || path.join(ROOT, 'desktop'), env, encoding: 'utf8', maxBuffer: 1 << 28, timeout: 25 * 60 * 1000, killSignal: 'SIGKILL' });
const log = `${r.stdout || ''}\n${r.stderr || ''}`;
fs.writeFileSync(path.join(OUT, `run-${familie}.log`), log);
fs.rmSync(profile, { recursive: true, force: true });
const l = (r.stdout || '').split('\n').find((x) => x.startsWith('[perf-script] '));
let j = null;
if (l) { try { j = JSON.parse(l.slice(14)); } catch { /* */ } }
if (j) fs.writeFileSync(path.join(OUT, `controller-${familie}.json`), JSON.stringify(j, null, 1));
console.log(j ? `${familie}: ${Object.keys(j.schermen).length} schermen, ${(j.fouten || []).length} console-fouten, ${(j.overgeslagen || []).join('; ')}` : `geen resultaat (exit ${r.status})`);
console.log(`uitvoer: ${OUT}`);
process.exit(j ? 0 : 1);
