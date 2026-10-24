// De kaartacties in beeld (#445): uitleg, actiebalk, Reis erheen, waypoint, Haal weg, gast en het keuzevenster, in één
// Electron-instantie met wegwerpprofiel (zelfde opzet als kaartstijl_shots.mjs).
//   node scripts/qa/kaart_acties_shots.mjs --game-dir=<gestagede game> --out=<map> [--slot]
// ELECTRON_EXE=<pad naar electron.exe> als desktop/node_modules/electron/dist ontbreekt.
// Uitvoer: shots-ka-*.png, result.json (de uitkomst per stap), run.log.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const OUT = path.resolve(arg('out', path.join(os.tmpdir(), 'gde-kaart-acties')));
const GAME = arg('game-dir', '') ? path.resolve(arg('game-dir', '')) : '';
const LOCKS = process.env.GDE_LOCKS || path.join(os.homedir(), 'gde-locks');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let slot = null;
const release = () => { if (slot) { try { fs.rmdirSync(slot); } catch { /* al weg */ } slot = null; } };
process.on('exit', release);
if (process.argv.includes('--slot')) {
  for (let tries = 0; tries < 40 && !slot; tries++) {
    for (const n of [1, 2, 3]) {
      try { fs.mkdirSync(path.join(LOCKS, `electron-${n}`)); slot = path.join(LOCKS, `electron-${n}`); console.log(`slot electron-${n}`); break; } catch { /* bezet */ }
    }
    if (!slot) await sleep(30000);
  }
  if (!slot) throw new Error('geen Electron-slot gekregen');
}

fs.mkdirSync(OUT, { recursive: true });
const profile = `gde-test-ka-${process.pid}`;
const electron = process.env.ELECTRON_EXE || path.join(ROOT, 'desktop', 'node_modules', 'electron', 'dist', process.platform === 'win32' ? 'electron.exe' : 'Electron');
const env = { ...process.env, GDE_TEST_PROFILE: profile };
if (GAME) env.GDE_GAME_DIR = GAME;
delete env.ELECTRON_RUN_AS_NODE;
let stdout = '', stderr = '';
const child = spawn(electron, ['.', '--windowed', '--stil', '--force-device-scale-factor=1', '--window-size=1280x720', `--smoke-test=${path.join(OUT, 'shots.png')}`, `--perf-script=${path.join(HERE, 'kaart_acties_shots.page.js')}`], { cwd: path.join(ROOT, 'desktop'), env });
try { os.setPriority(child.pid, os.constants.priority.PRIORITY_BELOW_NORMAL); } catch { /* geen rechten */ }
child.stdout.on('data', (d) => { stdout += d; });
child.stderr.on('data', (d) => { stderr += d; });
const killer = setTimeout(() => child.kill('SIGKILL'), 10 * 60 * 1000);
const code = await new Promise((res) => child.on('close', res));
clearTimeout(killer);
release();
fs.writeFileSync(path.join(OUT, 'run.log'), `${stdout}\n${stderr}`);
fs.rmSync(path.join(os.tmpdir(), profile), { recursive: true, force: true });
let res = {};
for (const l of stdout.split(/\r?\n/)) { const m = l.match(/^\[perf-script\] (.*)$/); if (m) try { res = JSON.parse(m[1]); } catch { /* geen JSON */ } }
fs.writeFileSync(path.join(OUT, 'result.json'), JSON.stringify(res, null, 1));
const nan = stdout.split(/\r?\n/).filter((l) => /Computed radius is NaN/.test(l)).length;
const fouten = `${stdout}\n${stderr}`.split(/\r?\n/).filter((l) => /\[ka-error\]|Uncaught|TypeError|ReferenceError/.test(l));
const shots = fs.readdirSync(OUT).filter((f) => /^shots-ka-.*\.png$/.test(f)).length;
console.log(`exit ${code}, screenshots ${shots}/7, NaN-regels ${nan}, paginafouten ${fouten.length}`);
for (const f of fouten.slice(0, 10)) console.log('  ' + f.slice(0, 200));
console.log(`uitvoer: ${OUT}`);
process.exit(code !== 0 || !shots ? 1 : 0);
