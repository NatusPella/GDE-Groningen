// What the threads of a Chromium trace do (desktop `console.log('[trace] ms')` from a perf route; GDE_TRACE_OUT=<dir> keeps the file).
//   node scripts/perf/trace.mjs <trace.json> [--n=40] [--thread=CrRendererMain] [--frames]
// Per thread of interest (renderer main thread, GPU process main/driver threads, compositor): busy time per second, and the self time per event name
// (a slice minus the slices nested in it), so a wait inside a task shows under its own name. `--frames` prints for the main thread the
// slices of 1 ms or more of three consecutive frames (the tasks that start with FireAnimationFrame / RunTask), to see the order of the work.
import fs from 'node:fs';
const file = process.argv.slice(2).find((a) => !a.startsWith('--'));
const N = Number((process.argv.find((a) => a.startsWith('--n=')) || '--n=40').slice(4));
const only = (process.argv.find((a) => a.startsWith('--thread=')) || '').slice(9);
const frames = process.argv.includes('--frames');
const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
const ev = Array.isArray(raw) ? raw : raw.traceEvents;
const names = new Map(), procs = new Map();
for (const e of ev) {
  if (e.ph === 'M' && e.name === 'thread_name') names.set(e.pid + ':' + e.tid, e.args.name);
  if (e.ph === 'M' && e.name === 'process_name') procs.set(e.pid, e.args.name);
}
const byThread = new Map();
let tMin = Infinity, tMax = -Infinity;
for (const e of ev) {
  if (e.ph !== 'X' && e.ph !== 'B' && e.ph !== 'E') continue;
  const k = e.pid + ':' + e.tid;
  if (!byThread.has(k)) byThread.set(k, []);
  byThread.get(k).push(e);
  if (e.ts < tMin) tMin = e.ts;
  if (e.ts > tMax) tMax = e.ts;
}
// B/E pairs into complete slices
const slices = (list) => {
  list.sort((a, b) => a.ts - b.ts || (b.dur || 0) - (a.dur || 0));
  const out = [], stackB = [];
  for (const e of list) {
    if (e.ph === 'X') out.push({ name: e.name, ts: e.ts, dur: e.dur || 0, cat: e.cat, args: e.args });
    else if (e.ph === 'B') stackB.push(e);
    else if (e.ph === 'E') { const b = stackB.pop(); if (b) out.push({ name: b.name, ts: b.ts, dur: e.ts - b.ts, cat: b.cat, args: b.args }); }
  }
  return out.sort((a, b) => a.ts - b.ts || b.dur - a.dur);
};
const selfTimes = (sl) => {
  const self = new Map(), stack = [];
  let busy = 0;
  const close = (s) => { self.set(s.name, (self.get(s.name) || 0) + s.dur - s.child); if (!stack.length) busy += s.dur; else stack[stack.length - 1].child += s.dur; };
  for (const s of sl) {
    while (stack.length && stack[stack.length - 1].ts + stack[stack.length - 1].dur <= s.ts) close(stack.pop());
    stack.push({ ...s, child: 0 });
  }
  while (stack.length) close(stack.pop());
  return { self, busy };
};
const interesting = (n, p) => /CrRendererMain|CrGpuMain|VizCompositor|Compositor|GpuWatchdog|ThreadPool|CompositorTileWorker|Chrome_InProcGpu|DrawThread|GPU/i.test(n) || /Renderer|GPU/i.test(p || '');
const span = (tMax - tMin) / 1e6;
console.log(`trace ${file}: ${ev.length} events, ${span.toFixed(2)} s`);
for (const [k, list] of byThread) {
  const pid = Number(k.split(':')[0]);
  const tn = names.get(k) || '?', pn = procs.get(pid) || '?';
  if (only ? tn !== only : !interesting(tn, pn)) continue;
  const sl = slices(list);
  const { self, busy } = selfTimes(sl);
  if (busy / 1000 < 50) continue;
  console.log(`\n== ${pn} / ${tn} (${k}): busy ${(busy / 1000).toFixed(0)} ms in ${span.toFixed(1)} s (${(busy / 1e6 / span * 100).toFixed(0)}%), ${sl.length} slices`);
  [...self].sort((a, b) => b[1] - a[1]).slice(0, N).forEach(([n, us]) => console.log(`${(us / 1000).toFixed(0).padStart(7)} ms ${(us / busy * 100).toFixed(1).padStart(5)}%  ${n}`));
  if (frames && /CrRendererMain/.test(tn)) {
    const starts = sl.filter((s) => /FireAnimationFrame|AnimationFrame|PageAnimator|WebFrameWidgetImpl::BeginMainFrame|ProxyMain::BeginMainFrame/.test(s.name));
    console.log(' frame starts:', starts.slice(0, 8).map((s) => s.name + '@' + ((s.ts - tMin) / 1000).toFixed(1) + '+' + (s.dur / 1000).toFixed(1)).join(', '));
    const f0 = starts.length > 20 ? starts[10].ts : sl[0].ts;
    const win = sl.filter((s) => s.ts >= f0 && s.ts < f0 + 3 * 18000 && s.dur >= 500);
    for (const s of win) console.log(`   +${((s.ts - f0) / 1000).toFixed(2).padStart(7)} ms  ${(s.dur / 1000).toFixed(2).padStart(6)}  ${s.name}`);
  }
}
