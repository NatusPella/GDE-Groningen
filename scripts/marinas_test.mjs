// Logic test for the marina planner (game/js/marinas.js, #7): finger piers and
// berths on synthetic water, room to the quay and the fairway, no overlaps.
//   node scripts/marinas_test.mjs
import './node3d.mjs';
import fs from 'node:fs';

const { planMarina, quayEdges, MARINA_NAMES } = await import('../game/js/marinas.js');

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

// the city: game/marinas.json is what the planner makes of the real water (run
// `node scripts/world/marinas.mjs --write` after changing the planner or the map)
{
  const { GameMap, applyMapExtras } = await import('../game/js/mapdata.js');
  const { waterClearance } = await import('../game/js/waterindex.js');
  const { buildMarinas } = await import('./world/marinas.mjs');
  const root = new URL('../game/', import.meta.url);
  const { loadCityData } = await import('./lib/loadworld.mjs');
  const data = await loadCityData();
  const map = new GameMap(data);
  const file = JSON.parse(fs.readFileSync(new URL('marinas.json', root))).marinas;
  ok(file.length >= 3 && file.length <= MARINA_NAMES.length, `marinas in the city (${file.length})`);
  ok(JSON.stringify(buildMarinas(map)) === JSON.stringify(file), 'marinas.json is what the planner makes of the map');
  ok(new Set(file.map((m) => m.name)).size === file.length, 'every marina has its own invented name');
  for (const m of file) {
    ok(m.berths.length >= 8 && m.fingers.length >= m.berths.length, `${m.name}: berths between the fingers`);
    for (const b of m.berths) {
      const hx = Math.cos(b.a) * 2, hy = Math.sin(b.a) * 2;
      ok(waterClearance(map, b.x - hx, b.y - hy, 3) >= 0.8, `${m.name}: berth stern in open water`);
      ok(!map.isOnBridge(b.x, b.y), `${m.name}: no berth on a bridge`);
    }
  }
}

console.log(fails ? `${fails} of ${n} failed` : `marinas: ${n} checks ok`);
process.exit(fails ? 1 : 0);
