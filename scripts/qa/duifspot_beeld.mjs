// De duivenspotmissie "Kieken van boven" in beeld (#1025): één Electron (wegwerpprofiel) start de missie, vliegt bij het Groninger Museum
// en neemt beelden met de wereldmarkers (na) en zonder (voor).
//   node scripts/qa/duifspot_beeld.mjs [--out=<map>] [--settle=9000]
// GDE_GAME_DIR=<gestagede game-map> (met backslashes), ELECTRON_EXE=<pad>; uitvoer: <out>/shots-*.png, duifspot.json, run.log.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const OUT = path.resolve(arg('out', path.join(os.tmpdir(), 'gde-qa-duifspot')));
fs.mkdirSync(OUT, { recursive: true });
const profile = path.join(OUT, `profiel-${process.pid}`);
const script = path.join(OUT, '_page.js');
fs.writeFileSync(script, `window.__ds = ${JSON.stringify({ settle: Number(arg('settle', 9000)) })};\n` + fs.readFileSync(path.join(HERE, 'duifspot_beeld.page.js'), 'utf8'));
const hoofd = path.join(ROOT, '..', '..', '..', 'desktop', 'node_modules', 'electron', 'dist', process.platform === 'win32' ? 'electron.exe' : 'Electron'); // een worktree deelt de Electron van de hoofdmap
const electron = process.env.ELECTRON_EXE || (fs.existsSync(path.join(ROOT, 'desktop', 'node_modules')) ? path.join(ROOT, 'desktop', 'node_modules', 'electron', 'dist', process.platform === 'win32' ? 'electron.exe' : 'Electron') : hoofd);
fs.mkdirSync(profile, { recursive: true });
const env = { ...process.env, GDE_TEST_PROFILE: profile, GDE_NO_THROTTLE: '1' };
env.GDE_GAME_DIR = path.resolve(process.env.GDE_GAME_DIR || path.join(ROOT, 'desktop', 'build', 'game'));
delete env.ELECTRON_RUN_AS_NODE;
const r = spawnSync(electron, ['.', '--windowed', '--stil', '--force-device-scale-factor=1', '--window-size=1600x900', '--no-sandbox', '--in-process-gpu',
  '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--disable-background-timer-throttling', '--disable-features=CalculateNativeWinOcclusion',
  `--smoke-test=${path.join(OUT, 'shots.png')}`, `--perf-script=${script}`],
{ cwd: process.env.GDE_DESKTOP || path.join(ROOT, 'desktop'), env, encoding: 'utf8', maxBuffer: 1 << 28, timeout: 8 * 60 * 1000, killSignal: 'SIGKILL' });
if (r.error) console.error('Electron starten mislukt:', r.error.message);
fs.writeFileSync(path.join(OUT, 'run.log'), `${r.stdout || ''}\n${r.stderr || ''}`);
fs.rmSync(profile, { recursive: true, force: true });
const l = (r.stdout || '').split('\n').find((x) => x.startsWith('[perf-script] '));
if (l) fs.writeFileSync(path.join(OUT, 'duifspot.json'), l.slice(14));
console.log(l ? l.slice(14, 3000) : 'geen [perf-script]-resultaat', `\nexit ${r.status}; uitvoer: ${OUT}`);
process.exit(l ? 0 : 1);
