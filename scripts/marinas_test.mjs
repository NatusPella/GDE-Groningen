// Logic test for the marina planner (game/js/marinas.js, #7): finger piers and
// berths on synthetic water, room to the quay and the fairway, no overlaps.
//   node scripts/marinas_test.mjs
import { planMarina, quayEdges } from '../game/js/marinas.js';

let fails = 0, n = 0;
const ok = (c, name) => { n++; if (!c) { fails++; console.log('FAIL', name); } };
const seeded = (seed) => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

// a rectangular basin [0,W] x [0,H] (counter-clockwise): clearance = distance to its edge
const basin = (W, H) => {
  const pts = [[0, 0], [W, 0], [W, H], [0, H], [0, 0]];
  const clear = (x, y, r) => { const d = Math.min(x, y, W - x, H - y); return d <= 0 ? -1 : Math.min(d, r); };
  return { pts, clear };
};

const wide = basin(80, 50);
ok(quayEdges(wide.pts, wide.clear).length >= 2, 'quay edges found on a basin');
const plan = planMarina(wide.pts, wide.clear, { rng: seeded(7) });
ok(plan && plan.berths.length >= 4, `a wide basin takes a marina (${plan && plan.berths.length} berths)`);
ok(plan && /^(Jachthaven|Watersport|Haven)/.test(plan.name), 'invented Dutch name');
if (plan) {
  for (const b of plan.berths) {
    ok(Number.isFinite(b.x) && Number.isFinite(b.y) && Number.isFinite(b.angle), 'berth is finite');
    // centre and stern in open water (the bow lies against the quay)
    const hx = Math.cos(b.angle) * b.len / 2, hy = Math.sin(b.angle) * b.len / 2;
    for (const k of [-1, 0]) ok(wide.clear(b.x + hx * k, b.y + hy * k, 3) >= b.wid / 2, 'berth in the water, clear of the bank');
  }
  for (let i = 0; i < plan.berths.length; i++) for (let j = i + 1; j < plan.berths.length; j++) {
    const a = plan.berths[i], c = plan.berths[j];
    ok(Math.hypot(a.x - c.x, a.y - c.y) >= (a.wid + c.wid) / 2 + 0.5, 'berths do not overlap');
  }
  for (const f of plan.fingers) {
    ok(wide.clear(f.x1 + plan.quay.nx * 9, f.y1 + plan.quay.ny * 9, 10) > 0, 'water remains beyond a finger tip (fairway)');
  }
}
const canal = basin(200, 9);
ok(planMarina(canal.pts, canal.clear, { rng: seeded(3) }) === null, 'a narrow canal gets no marina (fairway stays open)');
const small = basin(10, 40);
ok(planMarina(small.pts, small.clear, { rng: seeded(3) }) === null, 'a quay shorter than the minimum gets none');
const blockedPlan = planMarina(wide.pts, wide.clear, { rng: seeded(7), blocked: () => true });
ok(blockedPlan === null, 'everything blocked: none');
const again = planMarina(wide.pts, wide.clear, { rng: seeded(7) });
ok(JSON.stringify(again) === JSON.stringify(plan), 'same seed, same plan');

console.log(fails ? `${fails} of ${n} failed` : `marinas: ${n} checks ok`);
process.exit(fails ? 1 : 0);
