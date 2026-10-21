// Paired differences of two variants of an `r46` run (scripts/perf/routes.js, PERF_ONLY=r46): per round the second variant minus the first, with the
// standard error over the rounds, for the frame, the main thread, the interval, the GPU timer and any hitch section.
//   node scripts/perf/r46pair.mjs <naam>.json <oud> <nieuw> [sectie ...]      FROM=<ronde> skips the earlier rounds (a profiler window)
import fs from 'node:fs';
const [f, A, B, ...secs] = process.argv.slice(2);
if (!f || !A || !B) { console.error('usage: node scripts/perf/r46pair.mjs <naam>.json <oud> <nieuw> [sectie ...]'); process.exit(2); }
const j = JSON.parse(fs.readFileSync(f, 'utf8'));
const rows = j.routes.r46.rows;
const from = Number(process.env.FROM || 0);
const val = (r, k) => k === 'cb' ? r.cpuAvg : k === 'main' ? j.threadCpu['r46:' + r.name + ':' + r.round].mainMsPerFrame : k === 'avg' ? r.avg : k === 'gpuq' ? r.gpuAvg : (r.sections || {})[k] || 0;
console.log(JSON.stringify(j.machine));
for (const k of ['cb', 'main', 'avg', 'gpuq', ...secs]) {
  const d = [], a = [], b = [];
  for (const ra of rows.filter((r) => r.name === A && r.round >= from)) {
    const rb = rows.find((r) => r.name === B && r.round === ra.round);
    if (!rb) continue;
    a.push(val(ra, k)); b.push(val(rb, k)); d.push(val(rb, k) - val(ra, k));
  }
  const mean = (x) => x.reduce((p, c) => p + c, 0) / x.length;
  const m = mean(d), sd = Math.sqrt(mean(d.map((x) => (x - m) ** 2)) * d.length / Math.max(1, d.length - 1)), se = sd / Math.sqrt(d.length);
  const med = [...d].sort((p, c) => p - c)[d.length >> 1];
  console.log(k.padEnd(26), A, mean(a).toFixed(2).padStart(7), B, mean(b).toFixed(2).padStart(7), 'diff', m.toFixed(2).padStart(6), '±', se.toFixed(2), 'median diff', med.toFixed(2), `lower in ${d.filter((x) => x < 0).length}/${d.length}`);
}
