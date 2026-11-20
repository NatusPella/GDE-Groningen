// POP-IN in het echte spel meten (#1004): één Electron (wegwerpprofiel) loopt vaste routes (Binnenstad te voet,
// provinciale weg per auto, korte vlucht), de pagina-probe (popin.page.js) meldt per frame wat nieuw getekend wordt,
// en een reeks stills (1280x720) van dezelfde route gaat naar <out>/shots-<tag>-<route>-<n>.png.
//   node scripts/qa/popin.mjs --tag=voor|na [--out=<map>] [--only=foot,a7,heli] [--dur=30000] [--shots=6]
// GDE_GAME_DIR=<gestagede game-map> (met backslashes), ELECTRON_EXE=<pad>; uitvoer: <out>/popin-<tag>.json, run-<tag>.log.
// Neem een Electron-slot via desktop/build/slots/slot.mjs (run popin -- node scripts/qa/popin.mjs ...).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const OUT = path.resolve(arg('out', path.join(os.tmpdir(), 'gde-qa-popin')));
const TAG = arg('tag', 'voor');
fs.mkdirSync(OUT, { recursive: true });
const profile = path.join(OUT, `profiel-${TAG}-${process.pid}`); // absoluut: %TEMP% is soms niet schrijfbaar
const script = path.join(OUT, `_page-${TAG}.js`);
const cfg = { only: arg('only', ''), dur: Number(arg('dur', 0)) || undefined, shots: arg('shots', '') === '' ? undefined : Number(arg('shots', 6)), tag: TAG };
fs.writeFileSync(script, `window.__popin = ${JSON.stringify(cfg)};\n` + fs.readFileSync(path.join(HERE, 'popin.page.js'), 'utf8'));
const electron = process.env.ELECTRON_EXE || path.join(ROOT, 'desktop', 'node_modules', 'electron', 'dist', process.platform === 'win32' ? 'electron.exe' : 'Electron');
fs.mkdirSync(profile, { recursive: true });
const env = { ...process.env, GDE_TEST_PROFILE: profile, GDE_NO_THROTTLE: '1' };
if (process.env.GDE_GAME_DIR) env.GDE_GAME_DIR = path.resolve(process.env.GDE_GAME_DIR);
delete env.ELECTRON_RUN_AS_NODE;
const r = spawnSync(electron, ['.', '--windowed', '--stil', '--no-sandbox', '--in-process-gpu', '--force-device-scale-factor=1', '--window-size=1280x720',
  '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--disable-background-timer-throttling', '--disable-features=CalculateNativeWinOcclusion',
  `--smoke-test=${path.join(OUT, 'shots.png')}`, `--perf-script=${script}`],
{ cwd: process.env.GDE_DESKTOP || path.join(ROOT, 'desktop'), env, encoding: 'utf8', maxBuffer: 1 << 28, timeout: 10 * 60 * 1000, killSignal: 'SIGKILL' });
if (r.error) console.error('Electron starten mislukt:', r.error.message);
fs.writeFileSync(path.join(OUT, `run-${TAG}.log`), `${r.stdout || ''}\n${r.stderr || ''}`);
fs.rmSync(profile, { recursive: true, force: true });
const l = (r.stdout || '').split('\n').find((x) => x.startsWith('[perf-script] '));
if (l) fs.writeFileSync(path.join(OUT, `popin-${TAG}.json`), l.slice(14));
console.log(l ? `resultaat ${l.length} tekens` : 'geen [perf-script]-resultaat', `\nexit ${r.status}; uitvoer: ${OUT}`);
process.exit(l ? 0 : 1);
