// De GPS-route in beeld (#320): de gele/paarse lijn op de minimap en de grote kaart voor vaste paren (het geval uit het issue:
// van het centrum naar het zuidoosten), met de routelengte tegen hemelsbreed in result.json. Eén Electron-instantie met wegwerpprofiel.
//   node scripts/qa/route_beeld.mjs --game-dir=[<label>=]<gestagede game>[,...] --out=<map> [--slot] [--zoom=1.6] [--settle=<ms>]
// --game-dir: een map die `GDE_STAGE_OUT=<map> node desktop/build.mjs` maakte (standaard desktop/build/game); voor een voor/na-vergelijk
//   geef je twee mappen op (voor=<map>,na=<map>); ze draaien na elkaar in hetzelfde slot. Elke run schrijft naar <out>/<label>/. ELECTRON_EXE=<pad naar electron.exe> als desktop/node_modules/electron/dist ontbreekt.
// --slot: neemt een Electron-slot volgens C:/Users/abuis/gde-locks/README.txt (mkdir electron-1..3) en geeft het vrij.
// Uitvoer: shots-rb-<paar>-<mini|kaart>.png, result.json, run.log.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const OUT0 = path.resolve(arg('out', path.join(os.tmpdir(), 'gde-route-beeld')));
const RUNS = arg('game-dir', '').split(',').filter(Boolean).map((s, i) => {
  const m = /^([A-Za-z][\w-]*)=(.+)$/.exec(s);
  return m ? { label: m[1], game: path.resolve(m[2]) } : { label: i ? `run${i + 1}` : 'run', game: path.resolve(s) };
});
if (!RUNS.length) RUNS.push({ label: 'run', game: '' });
const LOCKS = 'C:/Users/abuis/gde-locks';
// plaatsen in RD New (stad.json meta.landmarks, de wegnamen uit de stadsdata)
const Z = Number(arg('zoom', 1.6));
const scen = [
  { naam: 'goudkantoor-bergenweg', van: [86.5, 111.7], naar: [1929.4, 717.6], zoom: Z },
  { naam: 'goudkantoor-eemskanaal', van: [86.5, 111.7], naar: [1190.6, 134], zoom: Z },
  { naam: 'hoofdstation-hereweg', van: [-45.2, 955.7], naar: [433.3, 959.7], zoom: Z * 3 },
  { naam: 'aakerk-hoofdstation', van: [-195.1, 364.5], naar: [-45.2, 955.7], zoom: Z * 2 },
  { naam: 'goudkantoor-zuid', van: [86.5, 111.7], naar: [856, 2004], zoom: Z },
];
const cfg = { scen, settle: Number(arg('settle', 3500)), mapSettle: Number(arg('map-settle', 4500)) };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let slot = null;
async function takeSlot() {
  for (let tries = 0; tries < 360; tries++) { // ~30 minuten
    for (const n of [1, 2, 3]) {
      try { fs.mkdirSync(path.join(LOCKS, `electron-${n}`)); slot = path.join(LOCKS, `electron-${n}`); console.log(`slot electron-${n}`); return; } catch { /* bezet */ }
    }
    await sleep(5000); // een poller van 60 s verliest van andere sessies
  }
  throw new Error('geen Electron-slot gekregen');
}
const release = () => { if (slot) { try { fs.rmdirSync(slot); } catch { /* al weg */ } slot = null; } };
process.on('exit', release);
if (process.argv.includes('--slot')) await takeSlot();

const electron = process.env.ELECTRON_EXE || path.join(ROOT, 'desktop', 'node_modules', 'electron', 'dist', process.platform === 'win32' ? 'electron.exe' : 'Electron');
let failed = 0;
for (const run of RUNS) {
  const OUT = RUNS.length > 1 || run.label !== 'run' ? path.join(OUT0, run.label) : OUT0;
  fs.mkdirSync(OUT, { recursive: true });
  const profile = `gde-test-rb-${process.pid}-${run.label}`;
  const script = path.join(OUT, '_page.js');
  fs.writeFileSync(script, `window.__rbCfg = ${JSON.stringify(cfg)};\n` + fs.readFileSync(path.join(HERE, 'route_beeld.page.js'), 'utf8'));
  const env = { ...process.env, GDE_TEST_PROFILE: profile };
  if (run.game) env.GDE_GAME_DIR = run.game; // path.resolve: met schuine strepen serveert de app niets
  delete env.ELECTRON_RUN_AS_NODE;
  let stdout = '', stderr = '';
  const child = spawn(electron, ['.', '--windowed', '--stil', '--force-device-scale-factor=1', '--window-size=1280x720', `--smoke-test=${path.join(OUT, 'shots.png')}`, `--perf-script=${script}`], { cwd: path.join(ROOT, 'desktop'), env });
  try { os.setPriority(child.pid, os.constants.priority.PRIORITY_BELOW_NORMAL); } catch { /* geen rechten */ }
  child.stdout.on('data', (d) => { stdout += d; });
  child.stderr.on('data', (d) => { stderr += d; });
  const killer = setTimeout(() => child.kill('SIGKILL'), 20 * 60 * 1000);
  const code = await new Promise((res) => child.on('close', res));
  clearTimeout(killer);
  fs.writeFileSync(path.join(OUT, 'run.log'), `${stdout}\n${stderr}`);
  fs.rmSync(path.join(os.tmpdir(), profile), { recursive: true, force: true });
  let res = {};
  for (const l of stdout.split(/\r?\n/)) { const m = l.match(/^\[perf-script\] (.*)$/); if (m) try { res = JSON.parse(m[1]); } catch { /* geen JSON */ } }
  fs.writeFileSync(path.join(OUT, 'result.json'), JSON.stringify(res, null, 1));
  const nan = stdout.split(/\r?\n/).filter((l) => /Computed radius is NaN/.test(l)).length;
  const fouten = `${stdout}\n${stderr}`.split(/\r?\n/).filter((l) => /\[rb-error\]|Uncaught|TypeError|ReferenceError/.test(l));
  const shots = fs.readdirSync(OUT).filter((f) => /^shots-rb-.*\.png$/.test(f)).length;
  console.log(`${run.label}: exit ${code}, screenshots ${shots}/${scen.length * 2}, NaN-regels ${nan}, paginafouten ${fouten.length}`);
  for (const s of res.scen || []) console.log(`  ${s.naam}: route ${s.route} m, hemelsbreed ${s.hemelsbreed} m, verhouding ${s.verhouding}${s.compromis ? ' (' + s.compromis + ')' : ''}`);
  for (const f of fouten.slice(0, 10)) console.log('  ' + f.slice(0, 200));
  if (code !== 0 || !shots) failed++;
}
release();
console.log(`uitvoer: ${OUT0}`);
process.exit(failed ? 1 : 0);
