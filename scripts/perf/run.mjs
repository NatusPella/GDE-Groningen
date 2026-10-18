// Windows/Linux/macOS version of run.sh (zsh, macOS only): the fixed perf routes
// (routes.js) in the staged desktop build (run `npm run stage` in desktop/ first).
//   node scripts/perf/run.mjs <name> [electron flags...]
//   e.g. node scripts/perf/run.mjs hoog --preset=quality:hoog --hitch
// Env: PERF_OUT (default <tmp>/gde-perf), PERF_DUR (ms per route, default 20000),
// PERF_ONLY=foot,ring,a7,... PERF_DIAG=1, PERF_PROFILE=<routes>, PERF_SIM=0-2,
// PERF_LOCKS=<dir> (take an Electron slot with mkdir <dir>/electron-1..3 while running;
// see the lock protocol of the night rounds). 1920x1080 CSS px at dpr 1, silent,
// throwaway profile. Output: $PERF_OUT/<name>.json (routes, also those that finished
// before a crash) and <name>.log; prints the table.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = process.env.PERF_OUT || path.join(os.tmpdir(), 'gde-perf');
const [name, ...extra] = process.argv.slice(2);
if (!name) { console.error('usage: node scripts/perf/run.mjs <name> [electron flags...]'); process.exit(2); }
fs.mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
let slot = null;
async function takeSlot() {
  const dir = process.env.PERF_LOCKS;
  if (!dir) return;
  for (;;) {
    for (const n of [1, 2, 3]) {
      try { fs.mkdirSync(path.join(dir, 'electron-' + n)); slot = path.join(dir, 'electron-' + n); return; } catch { /* taken */ }
    }
    console.error('no electron slot free, waiting 60 s');
    await sleep(60000);
  }
}
const release = () => { if (slot) { try { fs.rmdirSync(slot); } catch { /* gone */ } slot = null; } };
process.on('exit', release);
process.on('SIGINT', () => { release(); process.exit(130); });

const hook = fs.readFileSync(path.join(HERE, 'hook.js'), 'utf8');
void hook;
const script = `window.__perfDur = ${Number(process.env.PERF_DUR) || 20000}; window.__perfOnly = '${process.env.PERF_ONLY || ''}'; window.__perfDiag = ${process.env.PERF_DIAG || 0}; window.__perfProfile = '${process.env.PERF_PROFILE || ''}'; window.__perfSim = '${process.env.PERF_SIM || ''}'; window.__perfJump = ${process.env.PERF_JUMP || 0};\n` + fs.readFileSync(path.join(HERE, 'routes.js'), 'utf8');
const scriptFile = path.join(OUT, `_${name}.js`);
fs.writeFileSync(scriptFile, script);

await takeSlot();
const profile = `gde-test-k1perf-${name}`;
fs.rmSync(path.join(os.tmpdir(), profile), { recursive: true, force: true });
const desktop = path.join(HERE, '..', '..', 'desktop');
const electron = path.join(desktop, 'node_modules', 'electron', 'dist', process.platform === 'win32' ? 'electron.exe' : 'electron');
const args = ['.', '--windowed', '--stil', '--force-device-scale-factor=1', '--window-size=1920x1080', `--smoke-test=${path.join(OUT, name + '.png')}`,
  `--bench-eval=${path.join(HERE, 'hook.js')}`, `--perf-script=${scriptFile}`, ...extra];
const logFile = path.join(OUT, name + '.log');
const log = fs.createWriteStream(logFile);
console.error(`start ${new Date().toTimeString().slice(0, 8)} load ${os.loadavg().map((x) => x.toFixed(2)).join(' ')}`);
const t0 = Date.now();
const child = spawn(electron, args, { cwd: desktop, env: { ...process.env, GDE_TEST_PROFILE: profile }, stdio: ['ignore', 'pipe', 'pipe'] });
child.stdout.pipe(log, { end: false });
child.stderr.pipe(log, { end: false });
const code = await new Promise((res) => child.on('exit', res));
log.end();
release();
fs.rmSync(path.join(os.tmpdir(), profile), { recursive: true, force: true });
fs.rmSync(scriptFile, { force: true });
console.error(`exit ${code} after ${Math.round((Date.now() - t0) / 1000)} s`);

const lines = fs.readFileSync(logFile, 'utf8').split(/\r?\n/);
let result = null;
for (const l of lines) if (l.startsWith('[perf-script] ')) { try { result = JSON.parse(l.slice(14)); } catch { /* partial */ } }
if (!result) {
  // the run did not finish: keep the routes that did
  result = { partial: true, routes: {} };
  for (const l of lines) {
    const m = /^\[renderer\] \[perf-route-data\] (\S+) /.exec(l);
    if (m) { try { result.routes[m[1]] = JSON.parse(l.slice(l.indexOf('{'), l.lastIndexOf('}') + 1)); } catch { /* skip */ } }
  }
}
result.errors = lines.filter((l) => l.startsWith('[renderer] [perf-route-error]'));
result.machine = { load: os.loadavg(), cpus: os.cpus().length, cpu: os.cpus()[0].model, memGB: Math.round(os.totalmem() / 1e9) };
fs.writeFileSync(path.join(OUT, name + '.json'), JSON.stringify(result));

const COLS = [['avg', 'avg'], ['p95', 'p95'], ['p99', 'p99'], ['max', 'max'], ['cpuAvg', 'cpu'], ['cpuP95', 'cpu95'], ['gpuAvg', 'gpu'], ['callsPerFrame', 'calls'], ['trisPerFrame', 'tris'], ['longTasks', 'long'], ['longMax', 'lmax'], ['over50', '>50'], ['heapMB', 'heap']];
console.log(`${name}  gpu-timer ${result.gpu}  dpr ${result.dpr}  css ${JSON.stringify(result.css)}  ${result.partial ? 'PARTIAL' : ''}`);
console.log('route'.padEnd(11) + COLS.map(([, h]) => h.padStart(8)).join(''));
for (const [n, r] of Object.entries(result.routes || {})) {
  if (!r) continue;
  if (r.error) { console.log(n.padEnd(11) + 'ERROR ' + r.error); continue; }
  console.log(n.padEnd(11) + COLS.map(([k]) => String(r[k] == null ? '-' : k === 'trisPerFrame' ? Math.round(r[k] / 1000) + 'k' : r[k]).padStart(8)).join(''));
}
for (const e of result.errors) console.log(e.slice(0, 300));
process.exit(code === 0 ? 0 : 1);
