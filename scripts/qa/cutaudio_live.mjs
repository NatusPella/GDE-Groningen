// Het geluid van de gestuurde scènes met rijdende voertuigen echt gemeten (#117): één Electron (slot uit gde-locks, wegwerpprofiel,
// BelowNormal) met de audiotap (--audio-graph: de graaf speelt in een gedempte uitvoer, het niveau vóór de uitgang wordt gemeten).
//   node scripts/qa/cutaudio_live.mjs [--out=<map>] [--only=M01,M09] [--prop=politie,bakkie] [--max=12] [--speed=2] [--game-dir=<gestaged game-map>]
// Uitvoer: <out>/cutaudio.json (per scène: wat de scène in de geluidsrij zette, hoeveel bronnen er in de graaf startten, RMS en piek
// in de scène tegenover de stilte ervoor), run.log. Niemand heeft het gehoord: dit meet alleen dat er geluid komt en hoe hard.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const OUT = path.resolve(arg('out', path.join(os.tmpdir(), 'gde-cutaudio-live')));
fs.mkdirSync(OUT, { recursive: true });
const cfg = { only: arg('only', '').split(',').filter(Boolean), prop: arg('prop', '').split(',').filter(Boolean), max: Number(arg('max', 12)), speed: Number(arg('speed', 2)) };
const WACHT = 'for (let i = 0; i < 240 && !(window.__debug && window.__debug.world); i++) await new Promise((r) => setTimeout(r, 500));\n'
  + "const kEnter = () => { for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', bubbles: true })); } };\n"
  + "for (let i = 0; i < 40; i++) { const s = document.querySelector('#start-screen'); if (!s || !s.classList.contains('visible')) break; const it = [...s.querySelectorAll('.ss-item')].find((e) => /nieuw s/i.test(e.textContent)); if (it) it.click(); else kEnter(); await new Promise((r) => setTimeout(r, 2500)); }\n"
  + 'await new Promise((r) => setTimeout(r, 4000));\n';
const script = path.join(OUT, '_page.js');
fs.writeFileSync(script, WACHT + `window.__cl = ${JSON.stringify(cfg)};\n` + fs.readFileSync(path.join(HERE, 'cutaudio_live.page.js'), 'utf8'));
const electron = process.env.ELECTRON_EXE || path.join(ROOT, 'desktop', 'node_modules', 'electron', 'dist', process.platform === 'win32' ? 'electron.exe' : 'Electron');
const profile = `gde-test-cl-${process.pid}`;
const env = { ...process.env, GDE_TEST_PROFILE: profile };
if (arg('game-dir')) env.GDE_GAME_DIR = path.resolve(arg('game-dir'));
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
const tap = path.join(HERE, 'audiotap.js');
const args = ['.', '--windowed', '--stil', '--audio-graph', `--bench-eval=${tap}`, '--force-device-scale-factor=1', '--window-size=1280x720', `--smoke-test=${path.join(OUT, 'shots.png')}`, `--perf-script=${script}`];
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
fs.writeFileSync(path.join(OUT, 'cutaudio.json'), JSON.stringify(res, null, 1));
const g = (res.results && res.results.geluid) || {};
for (const [id, r] of Object.entries(g)) console.log(id, JSON.stringify(r));
console.log(`uitvoer: ${OUT}, exit ${code}, scènes: ${Object.keys(g).length}, tap: ${res.results && res.results.tap}, fouten: ${(res.errors || []).length}`);
process.exit(code === 0 && Object.keys(g).length ? 0 : 1);
