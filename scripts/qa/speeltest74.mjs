// De handmatige speeltests van #74 (achteruitkijken en GPS in het Ommeland, stotteren bij 'Heel ver') als scripted
// run in één Electron-instantie met wegwerpprofiel, met beelden en metingen. De padelmissie loopt via de spelbot:
//   node scripts/bot/run.mjs --mode=minigames --only=padel --slot
//   node scripts/qa/speeltest74.mjs [--out=<map>] [--only=achteruit,gps,heelver] [--drive=25000] [--plaats=Midwolda] [--slot]
// ELECTRON_EXE=<pad>; vereist een gestagede wereld (zie sweep.mjs). Uitvoer: speeltest74.json, shots-*.png, run.log.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const OUT = path.resolve(arg('out', path.join(os.tmpdir(), 'gde-speeltest74')));
const dirs = [process.env.GAME_WORLD, path.join(ROOT, 'game', 'world'), path.join(ROOT, 'desktop', 'build', 'game', 'world')].filter(Boolean);
const wd = dirs.find((d) => fs.existsSync(path.join(d, 'index-provincie.json')));
if (!wd) { console.error('Geen gestagede wereld gevonden (GAME_WORLD=<map>).'); process.exit(2); }
const idx = JSON.parse(fs.readFileSync(path.join(wd, 'index-provincie.json'), 'utf8')).global;
const pl = idx.places.find((q) => q.name === arg('plaats', 'Midwolda')) || idx.places.find((q) => q.kind === 'village');
const cfg = { settle: 7000, drive: Number(arg('drive', 25000)), only: arg('only', ''), spot: { x: Math.round(pl.x), y: Math.round(pl.y) }, gps: { dx: 2500, dy: 1200 } };
fs.mkdirSync(OUT, { recursive: true });
let slot = null;
const release = () => { if (slot) { try { fs.rmdirSync(slot); } catch { /* weg */ } slot = null; } };
process.on('exit', release);
if (process.argv.includes('--slot')) {
  for (let t = 0; t < 720 && !slot; t++) {
    for (const n of [1, 2, 3]) { const dir = path.join(process.env.GDE_LOCKS || path.join(os.homedir(), 'gde-locks'), `electron-${n}`); try { fs.mkdirSync(dir); slot = dir; break; } catch { /* bezet */ } }
    if (!slot) await new Promise((r) => setTimeout(r, 20000));
  }
}
const WACHT = 'for (let i = 0; i < 240 && !(window.__debug && window.__debug.world); i++) await new Promise((r) => setTimeout(r, 500));\n'
  + `const kEnter = () => { for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', bubbles: true })); } };
for (let i = 0; i < 40; i++) { const s = document.querySelector('#start-screen'); if (!s || s.offsetParent === null || getComputedStyle(s).display === 'none' || getComputedStyle(s).opacity === '0') break; kEnter(); await new Promise((r) => setTimeout(r, 3000)); }
await new Promise((r) => setTimeout(r, 4000));\n`;
const script = path.join(OUT, '_page.js');
fs.writeFileSync(script, WACHT + `window.__s74 = ${JSON.stringify(cfg)};\n` + fs.readFileSync(path.join(HERE, 'speeltest74.page.js'), 'utf8'));
const electron = process.env.ELECTRON_EXE || path.join(ROOT, 'desktop', 'node_modules', 'electron', 'dist', process.platform === 'win32' ? 'electron.exe' : 'Electron');
const profile = `gde-test-s74-${process.pid}`;
const env = { ...process.env, GDE_TEST_PROFILE: profile };
delete env.ELECTRON_RUN_AS_NODE;
const fd = fs.openSync(path.join(OUT, 'run.log'), 'w');
const child = spawn(electron, ['.', '--windowed', '--stil', '--force-device-scale-factor=1', '--window-size=1600x900', `--smoke-test=${path.join(OUT, 'shots.png')}`, `--perf-script=${script}`], { cwd: path.join(ROOT, 'desktop'), env, stdio: ['ignore', fd, fd] });
try { os.setPriority(child.pid, os.constants.priority.PRIORITY_BELOW_NORMAL); } catch { /* gewone prioriteit */ }
const kill = setTimeout(() => { try { spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F']); } catch { /* weg */ } }, 25 * 60 * 1000);
await new Promise((res) => { child.on('exit', res); child.on('error', res); });
clearTimeout(kill);
fs.closeSync(fd);
fs.rmSync(path.join(os.tmpdir(), profile), { recursive: true, force: true });
let ret = null;
for (const l of fs.readFileSync(path.join(OUT, 'run.log'), 'utf8').split(/\r?\n/)) { const m = l.match(/^\[perf-script\] (.*)$/); if (m) try { ret = JSON.parse(m[1]); } catch { /* laatste telt */ } }
fs.writeFileSync(path.join(OUT, 'speeltest74.json'), JSON.stringify({ cfg, ret }, null, 1));
console.log(JSON.stringify(ret, null, 1));
