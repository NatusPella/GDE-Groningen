// Plekbeeld: één Electron (wegwerpprofiel) springt naar elke plek (echt laadscherm, de wereld stroomt zoals in het spel) en neemt per plek een
// luchtbeeld (schuin op 70 m, cameraOverride) en een beeld van de speler zelf (plek_beeld.page.js). Voor plekken ver van de start (#953).
//   node scripts/qa/plek_beeld.mjs --lijst=<json [{naam,x,y}]> [--out=<map>] [--klok=23]
// GDE_GAME_DIR, ELECTRON_EXE, GDE_DESKTOP, GDE_ELECTRON_EXTRA_ARGS zoals snelreis_meting.mjs. Uitvoer: <out>/shots-pb-*.png, plek_beeld.json, run.log.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const OUT = path.resolve(arg('out', path.join(os.tmpdir(), 'gde-qa-snelreis')));
fs.mkdirSync(OUT, { recursive: true });
const profile = process.env.GDE_PROFILE_DIR || `gde-test-pb-${process.pid}`;
const script = path.join(OUT, '_page.js');
const cfg = { plekken: JSON.parse(fs.readFileSync(path.resolve(arg('lijst')), 'utf8')), klok: arg('klok') == null ? null : Number(arg('klok')) };
fs.writeFileSync(script, `window.__pb = ${JSON.stringify(cfg)};\n` + fs.readFileSync(path.join(HERE, 'plek_beeld.page.js'), 'utf8'));
const electron = process.env.ELECTRON_EXE || path.join(ROOT, 'desktop', 'node_modules', 'electron', 'dist', process.platform === 'win32' ? 'electron.exe' : 'Electron');
const env = { ...process.env, GDE_TEST_PROFILE: profile, GDE_NO_THROTTLE: '1' };
if (process.env.GDE_GAME_DIR) env.GDE_GAME_DIR = path.resolve(process.env.GDE_GAME_DIR);
delete env.ELECTRON_RUN_AS_NODE;
const extra = (process.env.GDE_ELECTRON_EXTRA_ARGS || '').split(',').filter(Boolean); // bv. --no-sandbox als de omgeving Chromium's sandbox weigert
const r = spawnSync(electron, ['.', ...extra, '--windowed', '--stil', '--force-device-scale-factor=1', '--window-size=1280x720',
  '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--disable-background-timer-throttling', '--disable-features=CalculateNativeWinOcclusion',
  `--smoke-test=${path.join(OUT, 'shots.png')}`, `--perf-script=${script}`],
{ cwd: process.env.GDE_DESKTOP || path.join(ROOT, 'desktop'), env, encoding: 'utf8', maxBuffer: 1 << 28, timeout: 15 * 60 * 1000, killSignal: 'SIGKILL' });
if (r.error) console.error('Electron starten mislukt:', r.error.message);
fs.writeFileSync(path.join(OUT, 'run.log'), `${r.stdout || ''}\n${r.stderr || ''}`);
fs.rmSync(path.resolve(os.tmpdir(), profile), { recursive: true, force: true });
const l = (r.stdout || '').split('\n').find((x) => x.startsWith('[perf-script] '));
if (l) fs.writeFileSync(path.join(OUT, 'plek_beeld.json'), l.slice(14));
console.log(l ? 'klaar' : 'geen [perf-script]-resultaat', `\nexit ${r.status}; uitvoer: ${OUT}`);
process.exit(l ? 0 : 1);
