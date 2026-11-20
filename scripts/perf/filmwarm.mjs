// Meting van de openingsfilm op het spelerspad (laadtijd en haperingen in de eerste 25 s van de film, #985):
//   node scripts/perf/filmwarm.mjs --label=voor [--flags=noattract,warm] [--out=<map>] [--size=1280x720]
// Env: GDE_GAME_DIR (gestagede game-map, met backslashes), ELECTRON_EXE, GDE_DESKTOP (map met desktop/main.js).
// Draait scripts/perf/programs.page.js zonder --stil (het echte pad) met ?noattract,warm: het laadscherm warmt dan echt voor
// (een testrun slaat dat anders over). Uitvoer: <out>/<label>.json met bootMs (laadtijd tot game-started), shaders,
// programma's op 0/25/30 s en de frames boven 50/100 ms in de eerste 25 s. Alleen draaien als er geen andere game-Electron draait.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const LABEL = arg('label', 'run');
const OUT = path.resolve(arg('out', path.join(os.tmpdir(), 'gde-filmwarm')));
const SIZE = arg('size', '1280x720');
const FLAGS = arg('flags', 'noattract,warm');
fs.mkdirSync(OUT, { recursive: true });
const profile = path.join(OUT, `profiel-${LABEL}-${process.pid}`);
fs.mkdirSync(profile, { recursive: true });
const script = path.join(OUT, `_${LABEL}.js`);
fs.writeFileSync(script, `window.__progAt = [0, 25, 60];\n` + (process.env.GDE_DIAG ? fs.readFileSync(path.join(HERE, 'startdiag.page.js'), 'utf8') + '\n' : '') + fs.readFileSync(path.join(HERE, 'programs.page.js'), 'utf8'));
const electron = process.env.ELECTRON_EXE || path.join(ROOT, 'desktop', 'node_modules', 'electron', 'dist', 'electron.exe');
const env = { ...process.env, GDE_TEST_PROFILE: profile, GDE_NO_THROTTLE: '1', ELECTRON_DISABLE_SANDBOX: '1', GDE_DEV: '1' };
if (process.env.GDE_TMP) { fs.mkdirSync(process.env.GDE_TMP, { recursive: true }); env.TEMP = env.TMP = path.resolve(process.env.GDE_TMP); } // %TEMP% is niet overal schrijfbaar
if (process.env.GDE_GAME_DIR) env.GDE_GAME_DIR = path.resolve(process.env.GDE_GAME_DIR);
delete env.ELECTRON_RUN_AS_NODE;
const r = spawnSync(electron, ['.', '--windowed', '--no-sandbox', '--enable-precise-memory-info', '--force-device-scale-factor=1', `--window-size=${SIZE}`,
  ...(process.env.GDE_EXTRA_ARGS ? process.env.GDE_EXTRA_ARGS.split(' ') : []), '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--disable-background-timer-throttling', '--disable-features=CalculateNativeWinOcclusion',
  `--url-flags=${FLAGS}`, `--smoke-test=${path.join(OUT, `${LABEL}.png`)}`, `--perf-script=${script}`],
{ cwd: process.env.GDE_DESKTOP || path.join(ROOT, 'desktop'), env, encoding: 'utf8', maxBuffer: 1 << 28, timeout: 8 * 60 * 1000, killSignal: 'SIGKILL' });
fs.writeFileSync(path.join(OUT, `${LABEL}.log`), `${r.stdout || ''}\n${r.stderr || ''}`);
fs.rmSync(profile, { recursive: true, force: true });
const l = (r.stdout || '').split('\n').find((x) => x.startsWith('[perf-script] '));
if (!l) { console.log('geen [perf-script]-resultaat, exit', r.status); process.exit(1); }
const j = JSON.parse(l.slice(14));
fs.writeFileSync(path.join(OUT, `${LABEL}.json`), JSON.stringify(j));
if (j.diag) fs.writeFileSync(path.join(OUT, `${LABEL}-diag.json`), JSON.stringify(j.diag, null, 1));
const m = j.marks || {};
console.log(JSON.stringify({
  label: LABEL, bootMs: j.bootMs, startWarm: m.startWarm, shaders: m.shaders, warmWorst: m.warmWorstFrame, introWarm: m.introWarm,
  programmas: (j.snaps || []).map((s) => [s.at, s.count, s.linked, s.heapMB]), win0_25: j.win && j.win.s0_25, win0_60: j.win && j.win.s0_60,
  hitches25: (j.hitches || []).filter(([t]) => t < 25000).map(([t, d]) => `${t}:${d}`).join(' '),
}));
