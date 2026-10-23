// Gebieden veroveren in beeld (#414): de catalogus van de echte wereld, de kaartlaag Veroverd en het overzicht in het
// Loopbaan-scherm, in één Electron-instantie met wegwerpprofiel.
//   node scripts/qa/gebieden_shots.mjs --game-dir=<gestagede game> --out=<map> [--slot]
// --game-dir: een map die `GDE_STAGE_OUT=<map> node desktop/build.mjs` maakte (standaard desktop/build/game).
// ELECTRON_EXE=<pad naar electron.exe> als desktop/node_modules/electron/dist ontbreekt.
// --page=<bestand>: een ander page-script dan gebieden_shots.page.js (bijvoorbeeld een sonde).
// --slot: neemt een Electron-slot volgens $GDE_LOCKS/README.txt (standaard ~/gde-locks) en geeft het vrij.
// Uitvoer: shots-gb-*.png, result.json, run.log.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const OUT = path.resolve(arg('out', path.join(os.tmpdir(), 'gde-gebieden')));
const GAME = arg('game-dir', '') ? path.resolve(arg('game-dir', '')) : '';
const LOCKS = process.env.GDE_LOCKS || path.join(os.homedir(), 'gde-locks');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let slot = null;
async function takeSlot() {
  for (let tries = 0; tries < 5400; tries++) { // elke 2 s, ~3 uur: de slots wisselen snel van eigenaar
    for (const n of [1, 2, 3]) {
      try { fs.mkdirSync(path.join(LOCKS, `electron-${n}`)); slot = path.join(LOCKS, `electron-${n}`); console.log(`slot electron-${n}`); return; } catch { /* bezet */ }
    }
    await sleep(2000);
  }
  throw new Error('geen Electron-slot gekregen');
}
const release = () => { if (slot) { try { fs.rmdirSync(slot); } catch { /* al weg */ } slot = null; } };
process.on('exit', release);
if (process.argv.includes('--slot')) await takeSlot();

fs.mkdirSync(OUT, { recursive: true });
const electron = process.env.ELECTRON_EXE || path.join(ROOT, 'desktop', 'node_modules', 'electron', 'dist', process.platform === 'win32' ? 'electron.exe' : 'Electron');
const profile = `gde-test-gb-${process.pid}`;
const script = path.join(OUT, '_page.js');
fs.writeFileSync(script, fs.readFileSync(arg('page', '') ? path.resolve(arg('page', '')) : path.join(HERE, 'gebieden_shots.page.js'), 'utf8'));
const env = { ...process.env, GDE_TEST_PROFILE: profile };
if (GAME) env.GDE_GAME_DIR = GAME;
delete env.ELECTRON_RUN_AS_NODE;
let stdout = '', stderr = '';
const child = spawn(electron, ['.', '--windowed', '--stil', '--force-device-scale-factor=1', '--window-size=1280x720', `--smoke-test=${path.join(OUT, 'shots.png')}`, `--perf-script=${script}`], { cwd: path.join(ROOT, 'desktop'), env });
try { os.setPriority(child.pid, os.constants.priority.PRIORITY_BELOW_NORMAL); } catch { /* geen rechten */ }
child.stdout.on('data', (d) => { stdout += d; });
child.stderr.on('data', (d) => { stderr += d; });
const killer = setTimeout(() => child.kill('SIGKILL'), 15 * 60 * 1000);
const code = await new Promise((res) => child.on('close', res));
clearTimeout(killer);
fs.writeFileSync(path.join(OUT, 'run.log'), `${stdout}\n${stderr}`);
fs.rmSync(path.join(os.tmpdir(), profile), { recursive: true, force: true });
let res = {};
for (const l of stdout.split(/\r?\n/)) { const m = l.match(/^\[perf-script\] (.*)$/); if (m) try { res = JSON.parse(m[1]); } catch { /* geen JSON */ } }
fs.writeFileSync(path.join(OUT, 'result.json'), JSON.stringify(res, null, 1));
const nan = stdout.split(/\r?\n/).filter((l) => /Computed radius is NaN/.test(l)).length;
const fouten = `${stdout}\n${stderr}`.split(/\r?\n/).filter((l) => /\[gb-error\]|Uncaught|TypeError|ReferenceError/.test(l));
const shots = fs.readdirSync(OUT).filter((f) => /^shots-gb-.*\.png$/.test(f)).length;
console.log(`exit ${code}, screenshots ${shots}, NaN-regels ${nan}, paginafouten ${fouten.length}`);
for (const f of fouten.slice(0, 10)) console.log('  ' + f.slice(0, 200));
release();
console.log(`uitvoer: ${OUT}`);
process.exit(code !== 0 || !shots ? 1 : 0);
