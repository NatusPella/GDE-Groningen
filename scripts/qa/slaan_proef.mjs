// Slaan-proef (#1355, #1356): één Electron (wegwerpprofiel) laat de speler met de vuisten naast een voorbijganger zwaaien (slaan_proef.page.js).
//   node scripts/qa/slaan_proef.mjs [--out=<map>] [--prefix=voor|na]
// GDE_GAME_DIR=<gestagede game-map> (met backslashes), ELECTRON_EXE=<pad>; uitvoer: <out>/slaan-<prefix>.json, run-<prefix>.log.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const OUT = path.resolve(arg('out', path.join(os.tmpdir(), 'gde-qa-slaan')));
const PREFIX = arg('prefix', 'x');
fs.mkdirSync(OUT, { recursive: true });
const profile = path.join(OUT, `profiel-${process.pid}`);
const script = path.join(OUT, '_page.js');
fs.writeFileSync(script, fs.readFileSync(path.join(HERE, 'slaan_proef.page.js'), 'utf8'));
const electron = process.env.ELECTRON_EXE || path.join(ROOT, 'desktop', 'node_modules', 'electron', 'dist', process.platform === 'win32' ? 'electron.exe' : 'Electron');
fs.mkdirSync(profile, { recursive: true });
const env = { ...process.env, GDE_TEST_PROFILE: profile, GDE_PROFILE_DIR: profile, GDE_NO_THROTTLE: '1', GDE_MENU_TEST: '1' };
if (process.env.GDE_GAME_DIR) env.GDE_GAME_DIR = path.resolve(process.env.GDE_GAME_DIR);
delete env.ELECTRON_RUN_AS_NODE;
const r = spawnSync(electron, ['.', '--no-sandbox', '--in-process-gpu', '--windowed', '--stil', '--force-device-scale-factor=1', '--window-size=1600x900',
  '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--disable-background-timer-throttling', '--disable-features=CalculateNativeWinOcclusion',
  `--smoke-test=${path.join(OUT, `shots-${PREFIX}.png`)}`, `--perf-script=${script}`],
{ cwd: path.join(ROOT, 'desktop'), env, encoding: 'utf8', maxBuffer: 1 << 28, timeout: 4 * 60 * 1000, killSignal: 'SIGKILL' });
if (r.error) console.error('Electron starten mislukt:', r.error.message);
fs.writeFileSync(path.join(OUT, `run-${PREFIX}.log`), `${r.stdout || ''}\n${r.stderr || ''}`);
fs.rmSync(profile, { recursive: true, force: true });
const l = (r.stdout || '').split('\n').find((x) => x.startsWith('[perf-script] '));
if (l) fs.writeFileSync(path.join(OUT, `slaan-${PREFIX}.json`), l.slice(14));
console.log(l ? l.slice(14, 3500) : 'geen [perf-script]-resultaat', `\nexit ${r.status}; uitvoer: ${OUT}`);
process.exit(l ? 0 : 1);
