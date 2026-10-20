// Table of a PERF_ONLY=ab run (routes.js route ab: variants take turns in one process, so they feel the same load):
//   PERF_AB='aan=;uit=actoren+schaduw' PERF_ONLY=ab node scripts/perf/run.mjs <naam> <voorinstelling>
//   node scripts/perf/abin.mjs <PERF_OUT>/<naam>.json
// Per variant the median over its windows of the main thread's CPU ms per frame (mcpu, from the thread sampler),
// the in-page frame CPU (cpu p50) and the interval; then the paired difference per round (the windows of one round are adjacent).
import fs from 'node:fs';

const d = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const w = (d.routes.ab || {}).windows || [];
const tc = d.threadCpu || {};
const med = (a) => { const s = a.filter((x) => x != null).sort((x, y) => x - y); return s.length ? s[s.length >> 1] : null; };
const rows = w.map((x) => ({ ...x, mcpu: (tc[`ab:${x.key || `${x.name}:${x.round}`}`] || {}).mainMsPerFrame }));
const names = [...new Set(rows.map((x) => x.name))];
console.log('variant'.padEnd(14) + ['vensters', 'mcpu', 'cpu p50', 'cpu avg', 'interval', 'calls', 'matrix', 'frustum'].map((h) => h.padStart(10)).join(''));
for (const n of names) {
  const r = rows.filter((x) => x.name === n);
  console.log(n.padEnd(14) + [r.length, med(r.map((x) => x.mcpu)), med(r.map((x) => x.cpuP50)), med(r.map((x) => x.cpuAvg)), med(r.map((x) => x.avg)), med(r.map((x) => x.calls)), med(r.map((x) => x.umw)), med(r.map((x) => x.fto))].map((x) => String(x == null ? '-' : x).padStart(10)).join(''));
}
// the first variant of each mode (name@mode) is the base of that mode
const baseOf = (n) => names.find((m) => m.split('@')[1] === n.split('@')[1]);
for (const n of names) {
  const base = baseOf(n);
  if (n === base) continue;
  const rounds = [...new Set(rows.map((x) => x.round))];
  const dm = [], dc = [], pct = [];
  for (const k of rounds) {
    const a = rows.find((x) => x.name === base && x.round === k), b = rows.find((x) => x.name === n && x.round === k);
    if (a && b && a.mcpu != null && b.mcpu != null) { dm.push(+(b.mcpu - a.mcpu).toFixed(2)); pct.push((b.mcpu - a.mcpu) / a.mcpu * 100); }
    if (a && b) dc.push(+(b.cpuAvg - a.cpuAvg).toFixed(2));
  }
  console.log(`${n} min ${base}: mcpu per ronde ${dm.join(', ')} ms; mediaan ${med(dm)} ms (${med(pct) != null ? med(pct).toFixed(1) : '-'}%), lager in ${dm.filter((x) => x < 0).length} van ${dm.length}; cpu avg mediaan ${med(dc)} ms`);
}
