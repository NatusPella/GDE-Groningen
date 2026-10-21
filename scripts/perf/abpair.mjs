// Paired differences of a PERF_ONLY=ab run (routes.js route ab), a table the abin.mjs median hides: per round the main thread's CPU per frame
// (thread sampler, mcpu) and the in-page median frame CPU (cpuP50, robust to a single long frame) of each variant against the first one,
// with the mean, the standard deviation and the standard error of the pairs. A difference is only worth believing when it is a few standard errors.
//   node scripts/perf/abpair.mjs <PERF_OUT>/<naam>.json
import fs from 'node:fs';

const d = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const w = (d.routes.ab || {}).windows || [];
const tc = d.threadCpu || {};
const names = [...new Set(w.map((x) => x.name))];
const by = {};
for (const x of w) (by[x.name] ||= [])[x.round] = { mcpu: (tc['ab:' + x.key] || {}).mainMsPerFrame, p50: x.cpuP50, avg: x.cpuAvg, calls: x.calls, frames: x.frames };
const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length;
const sd = (a) => { const m = mean(a); return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / Math.max(1, a.length - 1)); };
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s[s.length >> 1]; };
console.log('variant'.padEnd(16) + ['mcpu med', 'p50 med', 'calls', 'frames'].map((h) => h.padStart(10)).join(''));
for (const n of names) {
  const r = by[n].filter(Boolean);
  console.log(n.padEnd(16) + [med(r.map((x) => x.mcpu).filter((v) => v != null)).toFixed(2), med(r.map((x) => x.p50)).toFixed(2), Math.round(med(r.map((x) => x.calls))), Math.round(med(r.map((x) => x.frames)))].map((v) => String(v).padStart(10)).join(''));
}
for (const n of names.slice(1)) {
  for (const k of ['mcpu', 'p50']) {
    const diffs = [];
    by[n].forEach((x, i) => { const a = by[names[0]][i]; if (x && a && x[k] != null && a[k] != null) diffs.push(x[k] - a[k]); });
    if (diffs.length < 2) continue;
    const se = sd(diffs) / Math.sqrt(diffs.length);
    console.log(`${n} min ${names[0]} (${k}): mean ${mean(diffs).toFixed(2)} ms, median ${med(diffs).toFixed(2)}, sd ${sd(diffs).toFixed(2)}, se ${se.toFixed(2)}, n ${diffs.length}, ${diffs.filter((v) => v < 0).length} lower`);
  }
}
