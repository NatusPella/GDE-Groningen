// Microbench en gelijkheidscontrole van nearestOnRoadList (22-11, perf-60-normaal): de scalaire versie
// tegen de oorspronkelijke met closestPointOnSegment. Gebruik: node scripts/perf/nearestroad_bench.mjs
import { nearestOnRoadList, closestPointOnSegment } from '../../game/js/util.js';

function reference(roads, x, y, ok = null) {
  let best = null;
  for (const road of roads) {
    if (ok && !ok(road)) continue;
    const P = road.pts;
    for (let i = 0; i < P.length - 1; i++) {
      const cp = closestPointOnSegment(x, y, P[i][0], P[i][1], P[i + 1][0], P[i + 1][1]);
      if (!best || cp.dist2 < best.d2) best = { road, i, t: cp.t, x: cp.x, y: cp.y, d2: cp.dist2, dx: P[i + 1][0] - P[i][0], dy: P[i + 1][1] - P[i][1] };
    }
  }
  if (best) { best.d = Math.sqrt(best.d2); const L = Math.hypot(best.dx, best.dy) || 1e-9; best.ux = best.dx / L; best.uy = best.dy / L; }
  return best;
}
let seed = 12345; const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
const roads = [];
for (let r = 0; r < 60; r++) {
  const pts = []; let x = rnd() * 500, y = rnd() * 500;
  const n = r % 7 === 0 ? 1 : 2 + Math.floor(rnd() * 30);
  for (let k = 0; k < n; k++) { pts.push([x, y]); x += (rnd() - 0.4) * 30; y += (rnd() - 0.5) * 30; if (k === 3) pts.push([x, y]); }
  roads.push({ pts, cat: r % 3 ? 'normal' : 'foot' });
}
roads.push({ pts: [] }, { pts: [[5, 5], [5, 5]] });
const pts = Array.from({ length: 2000 }, () => [rnd() * 520 - 10, rnd() * 520 - 10]);
const ser = (q) => JSON.stringify(q, (k, v) => (k === 'road' ? roads.indexOf(v) : v));
let bad = 0;
for (const [x, y] of pts) for (const ok of [null, (r) => r.cat !== 'foot']) if (ser(nearestOnRoadList(roads, x, y, ok)) !== ser(reference(roads, x, y, ok))) bad++;
console.log('verschillen:', bad, 'van', pts.length * 2);
const time = (f) => { const t = process.hrtime.bigint(); let s = 0; for (let k = 0; k < 20; k++) for (const [x, y] of pts) { const q = f(roads, x, y); s += q ? q.d : 0; } return Number(process.hrtime.bigint() - t) / 1e6; };
for (let k = 0; k < 3; k++) { time(reference); time(nearestOnRoadList); }
const A = [], B = [];
for (let k = 0; k < 7; k++) { A.push(time(reference)); B.push(time(nearestOnRoadList)); }
const med = (v) => v.slice().sort((a, b) => a - b)[v.length >> 1];
console.log('oud ms', med(A).toFixed(1), 'nieuw ms', med(B).toFixed(1), 'x', (med(A) / med(B)).toFixed(2));
process.exit(bad ? 1 : 0);
