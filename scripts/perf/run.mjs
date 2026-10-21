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
import { spawn, spawnSync } from 'node:child_process';
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
    await sleep(Number(process.env.PERF_LOCK_POLL) || 60000);
  }
}
const release = () => { if (slot) { try { fs.rmdirSync(slot); } catch { /* gone */ } slot = null; } };
process.on('exit', release);
process.on('SIGINT', () => { release(); process.exit(130); });

const hook = fs.readFileSync(path.join(HERE, 'hook.js'), 'utf8');
void hook;
const script = `window.__perfDur = ${Number(process.env.PERF_DUR) || 20000}; window.__perfOnly = '${process.env.PERF_ONLY || ''}'; window.__perfDiag = ${process.env.PERF_DIAG || 0}; window.__perfProfile = '${process.env.PERF_PROFILE || ''}'; window.__perfSim = '${process.env.PERF_SIM || ''}'; window.__perfJump = ${process.env.PERF_JUMP || 0}; window.__perfSettle = ${Number(process.env.PERF_SETTLE) || 0}; window.__perfAb = ${JSON.stringify((process.env.PERF_AB || '').split(';').filter(Boolean).map((v) => { const i = v.indexOf('='); return [v.slice(0, i), v.slice(i + 1).split('+').filter(Boolean)]; }))}; window.__perfAbWin = ${Number(process.env.PERF_AB_WIN) || 5000}; window.__perfAbRounds = ${Number(process.env.PERF_AB_ROUNDS) || 6}; window.__perfAbPre = ${Number(process.env.PERF_AB_PRE) || 0}; window.__perfAbMove = ${Number(process.env.PERF_AB_MOVE) || 0}; window.__perfPool = ${process.env.PERF_POOL ? 1 : 0}; window.__perfSamples = ${Number(process.env.PERF_SAMPLES) || 0};\n` + fs.readFileSync(path.join(HERE, 'routes.js'), 'utf8');
const scriptFile = path.join(OUT, `_${name}.js`);
fs.writeFileSync(scriptFile, script);

await takeSlot();
const profile = `gde-test-k1perf-${name}`;
fs.rmSync(path.join(os.tmpdir(), profile), { recursive: true, force: true });
const desktop = path.join(HERE, '..', '..', 'desktop');
const electron = process.env.ELECTRON_EXE || path.join(desktop, 'node_modules', 'electron', 'dist', process.platform === 'win32' ? 'electron.exe' : 'electron');
const args = ['.', '--windowed', '--stil', '--force-device-scale-factor=1', '--window-size=1920x1080',
  // with other windows over this one Chromium would throttle it as occluded or backgrounded: a measuring run must not be slowed by that
  '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--disable-features=CalculateNativeWinOcclusion', `--smoke-test=${path.join(OUT, name + '.png')}`,
  `--bench-eval=${path.join(HERE, 'hook.js')}`, `--perf-script=${scriptFile}`];
// a switch in the extra arguments replaces the default one of the same name (--window-size=1280x720 for a smaller window); the shell reads the first
for (const x of extra) { const n = x.split('=')[0]; const i = args.findIndex((q, k) => k > 0 && q.split('=')[0] === n); if (i > 0) args.splice(i, 1); }
args.push(...extra);
const logFile = path.join(OUT, name + '.log');
const log = fs.createWriteStream(logFile);
console.error(`start ${new Date().toTimeString().slice(0, 8)} load ${os.loadavg().map((x) => x.toFixed(2)).join(' ')}`);
// other Electron instances (other agents) and the CPU they take disturb the numbers: count them around the run
const others = () => { try { const o = spawnSync(process.platform === 'win32' ? 'tasklist' : 'pgrep', process.platform === 'win32' ? ['/FI', 'IMAGENAME eq electron.exe', '/NH'] : ['-c', 'electron'], { encoding: 'utf8' }).stdout; return process.platform === 'win32' ? (o.match(/electron.exe/g) || []).length : Number(o) || 0; } catch { return null; } };
// how busy the machine is around the run (the Windows load average is always 0): CPU use over one second before the start and after the end, free memory
const cpuTimes = () => os.cpus().reduce((a, c) => { const t = c.times; a.idle += t.idle; a.all += t.user + t.nice + t.sys + t.idle + t.irq; return a; }, { idle: 0, all: 0 });
const cpuBusy = async () => { const a = cpuTimes(); await sleep(1000); const b = cpuTimes(); return +(100 * (1 - (b.idle - a.idle) / Math.max(1, b.all - a.all))).toFixed(0); };
const busyBefore = await cpuBusy();
const before = others();
const t0 = Date.now();
const child = spawn(electron, args, { cwd: desktop, env: { ...process.env, GDE_TEST_PROFILE: profile }, stdio: ['ignore', 'pipe', 'pipe'] });
child.stdout.pipe(log, { end: false });
child.stderr.pipe(log, { end: false });
// PERF_THREADS=0 turns the per-thread CPU sampler off (threadcpu.ps1; Windows)
const threadFile = path.join(OUT, name + '.threads');
let sampler = null;
if (process.platform === 'win32' && process.env.PERF_THREADS !== '0') {
  sampler = spawn('pwsh', ['-NoProfile', '-File', path.join(HERE, 'threadcpu.ps1'), String(child.pid), threadFile], { stdio: 'ignore' });
  sampler.on('error', () => { sampler = null; });
}
const code = await new Promise((res) => child.on('exit', res));
if (sampler) await Promise.race([new Promise((res) => sampler.on('exit', res)), sleep(3000)]);
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
// main-thread CPU (not wall) time per frame in each route's measuring window, from the thread samples
result.threadCpu = {};
try {
  const marks = {};
  for (const l of lines) { const m = /\[perf-mark\] (start|end) (\S+) (\d+)(?: (\d+))?/.exec(l); if (m) (marks[m[2]] ||= {})[m[1]] = { t: Number(m[3]), frames: Number(m[4]) }; }
  const th = new Map();
  if (fs.existsSync(threadFile)) for (const l of fs.readFileSync(threadFile, 'utf8').split(String.fromCharCode(10))) {
    const [t, pid, type, tid, ms] = l.split('|'); if (!ms) continue;
    const k = pid + ':' + type + ':' + tid; if (!th.has(k)) th.set(k, []); th.get(k).push([Number(t), Number(ms)]);
  }
  const at = (arr, t) => { // cpu ms at wall time t, linear between samples
    if (!arr.length || t < arr[0][0] - 400 || t > arr[arr.length - 1][0] + 400) return null;
    let lo = arr[0]; for (const s of arr) { if (s[0] >= t) { const hi = s; return hi[0] === lo[0] ? hi[1] : lo[1] + (hi[1] - lo[1]) * (t - lo[0]) / (hi[0] - lo[0]); } lo = s; }
    return lo[1];
  };
  for (const [rn, mk] of Object.entries(marks)) {
    if (!mk.start || !mk.end) continue;
    const dur = mk.end.t - mk.start.t, rows = [];
    for (const [k, arr] of th) { const a = at(arr, mk.start.t), b = at(arr, mk.end.t); if (a != null && b != null && b - a > dur * 0.02) rows.push([k, b - a]); }
    const byType = (ty) => rows.filter(([k]) => k.split(':')[1] === ty).sort((x, y) => y[1] - x[1]);
    const f = Math.max(1, mk.end.frames);
    const main = byType('renderer')[0], gpu = byType('gpu-process')[0];
    result.threadCpu[rn] = { frames: f, wallMs: dur, mainMsPerFrame: main ? +(main[1] / f).toFixed(2) : null, gpuThreadMsPerFrame: gpu ? +(gpu[1] / f).toFixed(2) : null,
      otherThreads: rows.filter(([k]) => k !== (main || [])[0] && k !== (gpu || [])[0]).sort((x, y) => y[1] - x[1]).slice(0, 5).map(([k, ms]) => [k, +(ms / f).toFixed(2)]) };
    if (result.routes && result.routes[rn]) result.routes[rn].mainCpuPerFrame = result.threadCpu[rn].mainMsPerFrame;
  }
} catch (e) { result.threadCpuError = String(e); }
fs.rmSync(threadFile, { force: true });
result.errors = lines.filter((l) => l.startsWith('[renderer] [perf-route-error]'));
result.machine = { cpuBusyBeforePct: busyBefore, cpuBusyAfterPct: await cpuBusy(), freeMemGB: +(os.freemem() / 1e9).toFixed(1), electronProcsBefore: before, electronProcsAfter: others(), load: os.loadavg(), cpus: os.cpus().length, cpu: os.cpus()[0].model, memGB: Math.round(os.totalmem() / 1e9) };
fs.writeFileSync(path.join(OUT, name + '.json'), JSON.stringify(result));

const COLS = [['avg', 'avg'], ['p95', 'p95'], ['p99', 'p99'], ['max', 'max'], ['cpuAvg', 'cpu'], ['mainCpuPerFrame', 'mcpu'], ['cpuP95', 'cpu95'], ['gpuAvg', 'gpu'], ['callsPerFrame', 'calls'], ['trisPerFrame', 'tris'], ['longTasks', 'long'], ['longMax', 'lmax'], ['over50', '>50'], ['heapMB', 'heap']];
console.log(`${name}  gpu-timer ${result.gpu}  dpr ${result.dpr}  css ${JSON.stringify(result.css)}  ${result.partial ? 'PARTIAL' : ''}`);
console.log('route'.padEnd(11) + COLS.map(([, h]) => h.padStart(8)).join(''));
for (const [n, r] of Object.entries(result.routes || {})) {
  if (!r) continue;
  if (r.error) { console.log(n.padEnd(11) + 'ERROR ' + r.error); continue; }
  console.log(n.padEnd(11) + COLS.map(([k]) => String(r[k] == null ? '-' : k === 'trisPerFrame' ? Math.round(r[k] / 1000) + 'k' : r[k]).padStart(8)).join(''));
}
for (const e of result.errors) console.log(e.slice(0, 300));
process.exit(code === 0 ? 0 : 1);
