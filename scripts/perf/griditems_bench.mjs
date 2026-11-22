// #1184: gridItems met en zonder bewaarde lijst. node scripts/perf/griditems_bench.mjs [wegen=12000] [aanroepen=40]
import { SpatialGrid, gridItems } from '../../game/js/spatialgrid.js';
const N = +process.argv[2] || 12000, C = +process.argv[3] || 40;
let seed = 3; const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
const g = new SpatialGrid(80);
for (let i = 0; i < N; i++) { const x = rnd() * 6000, y = rnd() * 6000, w = rnd() * 400; g.insert({ i }, [x, y, x + w, y + rnd() * 100]); }
const oud = (grid) => { const out = [], seen = new Set(); for (const arr of grid.map.values()) for (const it of arr) if (!seen.has(it)) { seen.add(it); out.push(it); } return out; };
for (let k = 0; k < 3; k++) {
  let t = performance.now(); for (let i = 0; i < C; i++) oud(g); const a = performance.now() - t;
  t = performance.now(); for (let i = 0; i < C; i++) gridItems(g); const b = performance.now() - t;
  console.log(`zonder bewaring ${(a / C).toFixed(2)} ms per aanroep, met ${(b / C).toFixed(3)} ms (rondes zonder wijziging; ${gridItems(g).length} items)`);
}
