// Windows/Linux/macOS version of loadcheck.sh (zsh): laadtijd tot het titelscherm en heap, A/B tussen gestagede builds.
//   ELECTRON_EXE=<electron> node scripts/perf/loadcheck.mjs --a=<gamemap A> --b=<gamemap B> [--runs=3] [--slot]
// Een gamemap is een gestagede game (desktop/build/game of GDE_STAGE_OUT). --slot neemt een Electron-slot (<GDE_LOCKS>/electron-1..3,
// wacht 60 s als ze bezet zijn) en geeft het altijd vrij. Per run één JSON-regel; op een drukke machine zijn de ms onbruikbaar.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const arg = (k, d = '') => { const a = process.argv.find((x) => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const A = arg('a'), B = arg('b'), runs = +arg('runs', '3');
if (!A || !B) { console.error('usage: node scripts/perf/loadcheck.mjs --a=<gamemap> --b=<gamemap> [--runs=3] [--slot]'); process.exit(2); }
const OUT = fs.mkdtempSync(path.join(os.tmpdir(), 'gde-loadcheck-'));
const LOCKS = process.env.GDE_LOCKS || path.join(os.homedir(), 'gde-locks');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let slot = null;
const release = () => { if (slot) { try { fs.rmdirSync(slot); } catch { /* weg */ } slot = null; } };
process.on('exit', release);
process.on('SIGINT', () => { release(); process.exit(130); });
if (process.argv.includes('--slot')) {
  for (;;) {
    for (const n of [1, 2, 3]) { try { fs.mkdirSync(path.join(LOCKS, `electron-${n}`)); slot = path.join(LOCKS, `electron-${n}`); break; } catch { /* bezet */ } }
    if (slot) break;
    console.error('geen Electron-slot vrij, wacht 60 s');
    await sleep(60000);
  }
}
const desktop = path.join(HERE, '..', '..', 'desktop');
const electron = process.env.ELECTRON_EXE || path.join(desktop, 'node_modules', 'electron', 'dist', process.platform === 'win32' ? 'electron.exe' : 'electron');
const one = (label, gameDir) => {
  const profile = `gde-test-load-${process.pid}`;
  const png = path.join(OUT, `load-${label}.png`);
  const r = spawnSync(electron, [desktop, '--windowed', '--stil', '--enable-precise-memory-info', '--force-device-scale-factor=1', '--window-size=1280x720',
    `--smoke-test=${png}`, `--perf-script=${path.join(HERE, 'loadmarks.js')}`], { env: { ...process.env, GDE_GAME_DIR: gameDir, GDE_TEST_PROFILE: profile }, encoding: 'utf8', timeout: 240000 });
  const line = ((r.stdout || '') + (r.stderr || '')).split(/\r?\n/).find((l) => l.startsWith('[perf-script]'));
  fs.rmSync(path.join(os.tmpdir(), profile), { recursive: true, force: true });
  let j = null;
  try { j = JSON.parse(line.replace(/^\[perf-script\]\s*/, '')); } catch { /* geen regel */ }
  console.log(JSON.stringify({ label, load: os.loadavg()[0], ...(j ? { title: j.title, marks: j.marks, heapMB: j.heapMB, tile: j.tileStats && { resident: j.tileStats.resident, loads: j.tileStats.loads } } : { fout: (r.stderr || '').slice(-300) }) }));
};
try {
  for (let k = 1; k <= runs; k++) { one('A' + k, A); one('B' + k, B); }
} finally { release(); }
