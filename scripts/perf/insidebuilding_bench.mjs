// CPU-profiel 21-11: insideBuilding (routing.js) was de grootste enkele post van de routegraaf-herbouw. Oude weg
// (buildingsNear: kopie + Set per aanroep) tegen de nieuwe (één cel zonder kopie), zelfde uitkomst.
// Gebruik: node scripts/perf/insidebuilding_bench.mjs [gebouwen=6000] [toetsen=300000]
import { SpatialGrid } from '../../game/js/spatialgrid.js';
import '../node3d.mjs';
const { insideBuilding } = await import('../../game/js/routing.js');

const NB = +process.argv[2] || 6000, NQ = +process.argv[3] || 300000, SIZE = 2400;
let seed = 7; const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
const grid = new SpatialGrid(80);
for (let i = 0; i < NB; i++) {
  const x = rnd() * SIZE, y = rnd() * SIZE, w = 8 + rnd() * 20, h = 8 + rnd() * 20;
  const b = { pts: [[x, y], [x + w, y], [x + w, y + h], [x, y + h]], bounds: [x, y, x + w, y + h] };
  grid.insert(b, b.bounds);
}
const near = (x, y, r) => grid.query(x - r, y - r, x + r, y + r);
const nieuw = { buildingGrid: grid, buildingsNear: near };
const oud = { buildingsNear: near }; // zonder buildingGrid valt insideBuilding op de oude weg terug
const pts = Array.from({ length: NQ }, () => [rnd() * SIZE, rnd() * SIZE]);
const run = (m) => { let n = 0; const t = performance.now(); for (const [x, y] of pts) if (insideBuilding(m, x, y)) n++; return [n, performance.now() - t]; };
run(nieuw); run(oud);
const [a, ta] = run(oud), [b, tb] = run(nieuw);
console.log(`oud ${ta.toFixed(0)} ms, nieuw ${tb.toFixed(0)} ms (${(ta / tb).toFixed(1)}x), binnen: ${a} / ${b}`);
if (a !== b) { console.error('UITKOMST VERSCHILT'); process.exit(1); }
