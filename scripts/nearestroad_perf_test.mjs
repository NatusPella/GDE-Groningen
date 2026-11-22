// #1184: nearestOnRoadList zonder object per segment: gelijk aan de oude versie (bit voor bit, ook bij gelijkspel en
// nulsegmenten) en minder afval. Microbench alleen als --bench. node scripts/nearestroad_perf_test.mjs [--bench]
import { nearestOnRoadList, closestPointOnSegment } from '../game/js/util.js';
let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FAIL ' + m); } };

function oldList(roads, x, y, okf = null) {
  let best = null;
  for (const road of roads) {
    if (okf && !okf(road)) continue;
    const P = road.pts;
    for (let i = 0; i < P.length - 1; i++) {
      const cp = closestPointOnSegment(x, y, P[i][0], P[i][1], P[i + 1][0], P[i + 1][1]);
      if (!best || cp.dist2 < best.d2) best = { road, i, t: cp.t, x: cp.x, y: cp.y, d2: cp.dist2, dx: P[i + 1][0] - P[i][0], dy: P[i + 1][1] - P[i][1] };
    }
  }
  if (best) { best.d = Math.sqrt(best.d2); const L = Math.hypot(best.dx, best.dy) || 1e-9; best.ux = best.dx / L; best.uy = best.dy / L; }
  return best;
}
let seed = 12345;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const mkRoads = (nr, np, span) => Array.from({ length: nr }, (_, k) => {
  let x = rnd() * span, y = rnd() * span;
  const pts = [[x, y]];
  for (let i = 1; i < np; i++) { x += rnd() * 40 - 20; y += rnd() * 40 - 20; pts.push(i % 7 === 0 ? [x, y] : [Math.round(x), Math.round(y)]); }
  if (k % 11 === 0) pts.push([...pts[pts.length - 1]]); // nulsegment
  return { name: 'r' + k, cat: k % 3 ? 'normal' : 'foot', pts };
});
const same = (a, b) => (a === null && b === null) || (a && b && a.road === b.road && a.i === b.i && Object.is(a.t, b.t) && Object.is(a.x, b.x) && Object.is(a.y, b.y)
  && Object.is(a.d2, b.d2) && Object.is(a.d, b.d) && Object.is(a.dx, b.dx) && Object.is(a.dy, b.dy) && Object.is(a.ux, b.ux) && Object.is(a.uy, b.uy));
const roads = mkRoads(120, 14, 400);
let eq = true;
for (let k = 0; k < 4000; k++) {
  const x = rnd() * 440 - 20, y = rnd() * 440 - 20;
  if (!same(nearestOnRoadList(roads, x, y), oldList(roads, x, y))) { eq = false; break; }
  const f = (r) => r.cat === 'foot';
  if (!same(nearestOnRoadList(roads, x, y, f), oldList(roads, x, y, f))) { eq = false; break; }
}
ok(eq, 'gelijk aan de oude versie op 8000 vragen (road, i, t, x, y, d2, d, dx, dy, ux, uy)');
// gelijkspel: twee wegen op dezelfde lijn, de eerste wint
const tie = [{ pts: [[0, 0], [10, 0]] }, { pts: [[0, 0], [10, 0]] }];
ok(nearestOnRoadList(tie, 5, 3).road === tie[0], 'gelijkspel: de eerste weg wint (strikt kleiner)');
ok(nearestOnRoadList([{ pts: [[1, 1]] }], 0, 0) === null && nearestOnRoadList([{ pts: [] }], 0, 0) === null, 'weg zonder segment: null');
const zero = [{ pts: [[2, 2], [2, 2]] }];
ok(same(nearestOnRoadList(zero, 5, 6), oldList(zero, 5, 6)), 'nulsegment gelijk');

if (process.argv.includes('--bench')) {
  const R = 40, Q = 400, qs = Array.from({ length: Q }, () => [rnd() * 400, rnd() * 400]);
  const run = (f) => { let s = 0; const t0 = process.hrtime.bigint(); for (let r = 0; r < R; r++) for (const [x, y] of qs) s += f(roads, x, y).d; return [Number(process.hrtime.bigint() - t0) / 1e6, s]; };
  for (let k = 0; k < 3; k++) { const [a] = run(oldList), [b] = run(nearestOnRoadList); console.log(`oud ${a.toFixed(0)} ms, nieuw ${b.toFixed(0)} ms (x${(a / b).toFixed(2)}) voor ${R * Q} vragen over ${roads.length} wegen`); }
}
console.log(`nearestroad_perf: ${n} checks, ${fails} failed`);
process.exit(fails ? 1 : 0);
