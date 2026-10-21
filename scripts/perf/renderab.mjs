// Table of a PERF_ONLY=renderab run (routes.js): per variant the CPU ms of the main thread per scene render (thread sampler, so the time the
// thread was pre-empted or waited for the GPU is not in it), the wall ms (median and lower quartile) and the GL calls per render; then the
// paired difference per round against the first variant.
//   PERF_AB='oud=pool;nieuw=' PERF_ONLY=renderab node scripts/perf/run.mjs <naam> <voorinstelling>
//   node scripts/perf/renderab.mjs <PERF_OUT>/<naam>.json
import fs from 'node:fs';

const d = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const rows = ((d.routes.renderab || {}).rows || []).map((x) => ({ ...x, cpu: (d.threadCpu[`renderab:${x.name}:${x.round}`] || {}).mainMsPerFrame }));
const med = (a) => { const s = a.filter((x) => x != null).sort((x, y) => x - y); return s.length ? s[s.length >> 1] : null; };
const names = [...new Set(rows.map((x) => x.name))];
console.log('variant'.padEnd(10) + ['rondes', 'cpu/render', 'wand med', 'wand q1', 'calls', 'tris'].map((h) => h.padStart(12)).join(''));
for (const n of names) {
  const r = rows.filter((x) => x.name === n);
  console.log(n.padEnd(10) + [r.length, med(r.map((x) => x.cpu)), med(r.map((x) => x.median)), med(r.map((x) => x.q1)), med(r.map((x) => x.calls)), med(r.map((x) => x.tris))].map((x) => String(x == null ? '-' : x).padStart(12)).join(''));
}
const base = names[0];
for (const n of names.slice(1)) {
  const dc = [], dw = [];
  for (const k of [...new Set(rows.map((x) => x.round))]) {
    const a = rows.find((x) => x.name === base && x.round === k), b = rows.find((x) => x.name === n && x.round === k);
    if (a && b && a.cpu != null && b.cpu != null) dc.push(+(b.cpu - a.cpu).toFixed(2));
    if (a && b) dw.push(+(b.q1 - a.q1).toFixed(2));
  }
  console.log(`${n} min ${base}: cpu per ronde ${dc.join(', ')} ms, mediaan ${med(dc)} (lager in ${dc.filter((x) => x < 0).length} van ${dc.length}); wand q1 mediaan ${med(dw)}`);
}
