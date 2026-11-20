// De light sims van ronde 2 in beeld (#985, #980): één Electron (wegwerpprofiel) start kartbaan, discgolf, pitch & putt, zwembad, skatepark, wandeling en padel, leest de
// strook en neemt een beeld per sim (lichtsims_ronde2_beeld.page.js).
//   node scripts/qa/lichtsims_ronde2_beeld.mjs [--out=<map>] [--prefix=na] [--only=kartbaan,padel] [--settle=8000]
// GDE_GAME_DIR=<gestagede game-map> (met backslashes), ELECTRON_EXE=<pad>, GDE_PROFILE_DIR (anders onder de uitvoermap); uitvoer: <out>/<prefix>-*.png, lichtsims-<prefix>.json, run.log.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const OUT = path.resolve(arg('out', path.join(os.tmpdir(), 'gde-qa-lichtsims-ronde2')));
const PREFIX = arg('prefix', 'x');
const ONLY = arg('only', '');
fs.mkdirSync(OUT, { recursive: true });
const profile = path.join(OUT, `profiel-${process.pid}`);
const script = path.join(OUT, '_page.js');
fs.writeFileSync(script, `window.__ls = ${JSON.stringify({ prefix: PREFIX, only: ONLY ? ONLY.split(',') : null })};\n` + fs.readFileSync(path.join(HERE, 'lichtsims_ronde2_beeld.page.js'), 'utf8'));
const electron = process.env.ELECTRON_EXE || path.join(ROOT, 'desktop', 'node_modules', 'electron', 'dist', process.platform === 'win32' ? 'electron.exe' : 'Electron');
fs.mkdirSync(profile, { recursive: true });
const env = { ...process.env, GDE_TEST_PROFILE: profile, GDE_PROFILE_DIR: profile, GDE_NO_THROTTLE: '1' };
if (process.env.GDE_GAME_DIR) env.GDE_GAME_DIR = path.resolve(process.env.GDE_GAME_DIR);
delete env.ELECTRON_RUN_AS_NODE;
const r = spawnSync(electron, ['.', '--no-sandbox', '--in-process-gpu', '--windowed', '--stil', '--force-device-scale-factor=1', '--window-size=1280x720',
  '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--disable-background-timer-throttling', '--disable-features=CalculateNativeWinOcclusion',
  `--smoke-test=${path.join(OUT, 'shots.png')}`, `--perf-script=${script}`],
{ cwd: process.env.GDE_DESKTOP || path.join(ROOT, 'desktop'), env, encoding: 'utf8', maxBuffer: 1 << 28, timeout: 25 * 60 * 1000, killSignal: 'SIGKILL' });
if (r.error) console.error('Electron starten mislukt:', r.error.message);
fs.writeFileSync(path.join(OUT, `run-${PREFIX}.log`), `${r.stdout || ''}\n${r.stderr || ''}`);
fs.rmSync(profile, { recursive: true, force: true });
const l = (r.stdout || '').split('\n').find((x) => x.startsWith('[perf-script] '));
if (l) fs.writeFileSync(path.join(OUT, `lichtsims-${PREFIX}.json`), l.slice(14));
console.log(l ? l.slice(14, 4000) : 'geen [perf-script]-resultaat', `\nexit ${r.status}; uitvoer: ${OUT}`);
process.exit(l ? 0 : 1);
