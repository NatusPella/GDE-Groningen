// Speelcheck van de vaarroute (#232 #233 #184): één headless Electron (wegwerpprofiel) zet een waypoint op de Waddenzee,
// laat een sloep de route van de stad naar Lauwersoog in stukken varen en de Waddenzee op, met screenshots.
//   node scripts/qa/vaar_run.mjs --game-dir=<gestaged game-map> [--out=<map>] [--settle=6000] [--leg=14] [--sea=30]
// De game-map is `desktop/build/game` of een kopie met de provinciewereld (GDE_GAME_DIR);
// GDE_DESKTOP=<map> voor een desktop-map met node_modules; ELECTRON_EXE=<pad> als desktop/node_modules/electron/dist ontbreekt.
// Uitvoer: <out>/shots-<id>.png, vaar.json, run.log.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const OUT = path.resolve(arg('out', path.join(os.tmpdir(), 'gde-qa-vaar')));
fs.mkdirSync(OUT, { recursive: true });
const profile = `gde-test-va-${process.pid}`;
const script = path.join(OUT, '_page.js');
fs.writeFileSync(script, `window.__va = ${JSON.stringify({ settle: Number(arg("settle", 6000)), leg: Number(arg("leg", 14)), sea: Number(arg("sea", 30)) })};\n` + fs.readFileSync(path.join(HERE, 'vaar.page.js'), 'utf8'));
const electron = process.env.ELECTRON_EXE || path.join(ROOT, 'desktop', 'node_modules', 'electron', 'dist', process.platform === 'win32' ? 'electron.exe' : 'Electron');
const env = { ...process.env, GDE_TEST_PROFILE: profile };
if (arg('game-dir')) env.GDE_GAME_DIR = path.resolve(arg('game-dir'));
delete env.ELECTRON_RUN_AS_NODE;
const r = spawnSync(electron, ['.', '--windowed', '--stil', '--force-device-scale-factor=1', '--window-size=1600x900',
  `--smoke-test=${path.join(OUT, 'shots.png')}`, `--perf-script=${script}`],
  { cwd: process.env.GDE_DESKTOP || path.join(ROOT, 'desktop'), env, encoding: 'utf8', maxBuffer: 1 << 28, timeout: 40 * 60 * 1000, killSignal: 'SIGKILL' });
if (r.error) console.error('Electron starten mislukt:', r.error.message);
fs.writeFileSync(path.join(OUT, 'run.log'), `${r.stdout || ''}\n${r.stderr || ''}`);
fs.rmSync(path.join(os.tmpdir(), profile), { recursive: true, force: true });
let full = {};
for (const l of (r.stdout || '').split('\n')) { const m = l.match(/^\[perf-script\] (.*)$/); if (m) try { full = JSON.parse(m[1]); } catch { /* laatste regel telt */ } }
fs.writeFileSync(path.join(OUT, 'vaar.json'), JSON.stringify(full, null, 1));
console.log(JSON.stringify({ route: full.route, start: full.start, doel: full.doel, fout: full.fout, fouten: (full.fouten || []).length }));
for (const c of full.checkpoints || []) console.log('checkpoint', JSON.stringify(c));
for (const z of full.zee || []) console.log('zee', JSON.stringify(z));
console.log(`uitvoer: ${OUT}, exit ${r.status}${r.signal ? ' ' + r.signal : ''}`);
process.exit(r.status === 0 && Object.keys(full).length ? 0 : 1);
