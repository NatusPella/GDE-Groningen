// Beelden en metingen op losse stadsplekken voor de tester-bugs #323 t/m #335: één headless Electron (slot uit gde-locks,
// wegwerpprofiel, BelowNormal), sluit zelf af.
//   node scripts/qa/stadbugs.mjs --spots=<json> [--out=<map>] [--settle=<ms>] [--game-dir=<gestaged game-map>]
// De spots-json is { spots: [{ naam, x, y, a, views: [{ n, p: [x, y, h], l: [x, y, h] }], eval }], clock } (zie stadbugs.page.js).
// Omgeving: ELECTRON_EXE=<pad> als desktop/node_modules/electron ontbreekt; --game-dir (of GDE_GAME_DIR, met backslashes).
// Uitvoer: <out>/shots-<naam>-<n>.png, stadbugs.json, run.log. Het slot wordt altijd vrijgegeven.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const OUT = path.resolve(arg('out', path.join(os.tmpdir(), 'gde-stadbugs')));
fs.mkdirSync(OUT, { recursive: true });
const cfg = JSON.parse(fs.readFileSync(path.resolve(arg('spots')), 'utf8'));
cfg.settle = Number(arg('settle', cfg.settle || 7000));
const script = path.join(OUT, '_page.js');
fs.writeFileSync(script, `window.__sb = ${JSON.stringify(cfg)};\n` + fs.readFileSync(path.join(HERE, 'stadbugs.page.js'), 'utf8'));
const electron = process.env.ELECTRON_EXE || path.join(ROOT, 'desktop', 'node_modules', 'electron', 'dist', process.platform === 'win32' ? 'electron.exe' : 'Electron');
const profile = `gde-test-sb-${process.pid}`;
const env = { ...process.env, GDE_TEST_PROFILE: profile };
if (arg('game-dir')) env.GDE_GAME_DIR = path.resolve(arg('game-dir')); // path.resolve: met schuine strepen serveert de app niets
delete env.ELECTRON_RUN_AS_NODE;
const LOCKS = process.env.GDE_LOCKS || path.join(os.homedir(), 'gde-locks');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let slot = null;
if (fs.existsSync(LOCKS)) {
  for (let poging = 0; poging < 900 && !slot; poging++) {
    for (const n of [1, 2, 3]) { try { fs.mkdirSync(path.join(LOCKS, `electron-${n}`)); slot = path.join(LOCKS, `electron-${n}`); break; } catch { /* bezet */ } }
    if (!slot) { if (poging % 30 === 0) console.log('wacht op een Electron-slot...'); await sleep(8000 + Math.floor(Math.random() * 4000)); }
  }
  if (!slot) { console.error('geen Electron-slot gekregen'); process.exit(3); }
}
const free = () => { if (slot) { try { fs.rmdirSync(slot); } catch { /* weg */ } slot = null; } };
process.on('exit', free);
const args = ['.', '--windowed', '--stil', '--force-device-scale-factor=1', '--window-size=1600x900', `--smoke-test=${path.join(OUT, 'shots.png')}`, `--perf-script=${script}`];
const child = spawn(electron, args, { cwd: path.join(ROOT, 'desktop'), env, stdio: ['ignore', 'pipe', 'pipe'] });
let log = '';
child.stdout.on('data', (d) => { log += d; });
child.stderr.on('data', (d) => { log += d; });
const killer = setTimeout(() => { try { child.kill('SIGKILL'); } catch { /* al weg */ } }, 40 * 60 * 1000);
try { if (child.pid) os.setPriority(child.pid, os.constants.priority.PRIORITY_BELOW_NORMAL); } catch { /* geen recht */ }
const code = await new Promise((res) => { child.on('error', () => res(-1)); child.on('close', res); });
clearTimeout(killer);
free();
fs.writeFileSync(path.join(OUT, 'run.log'), log);
fs.rmSync(path.join(os.tmpdir(), profile), { recursive: true, force: true });
let res = {};
for (const l of log.split('\n')) { const m = l.match(/^\[perf-script\] (.*)$/); if (m) try { res = JSON.parse(m[1]); } catch { /* laatste regel telt */ } }
fs.writeFileSync(path.join(OUT, 'stadbugs.json'), JSON.stringify(res, null, 1));
for (const [n, r] of Object.entries(res.results || {})) console.log(n, JSON.stringify(r).slice(0, 1500));
console.log(`uitvoer: ${OUT}, exit ${code}, fouten: ${(res.errors || []).length}`);
process.exit(code === 0 && Object.keys(res.results || {}).length ? 0 : 1);
