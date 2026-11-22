// Gelijkheidscontrole en microbench van gridItems met bewaarde uitkomst (22-11, perf-60-normaal).
// Gebruik: node scripts/perf/griditems_bench.mjs
import { SpatialGrid, gridItems } from '../../game/js/spatialgrid.js';

function reference(grid) {
  const out = [], seen = new Set();
  for (const arr of grid.map.values()) for (const it of arr) if (!seen.has(it)) { seen.add(it); out.push(it); }
  return out;
}
let seed = 99; const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
const g = new SpatialGrid(50), items = [];
for (let i = 0; i < 12000; i++) {
  const x = rnd() * 4000, y = rnd() * 4000, w = rnd() * 120;
  const it = { i, bounds: [x, y, x + w, y + w * rnd()] }; items.push(it); g.insert(it, it.bounds);
}
const same = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
let bad = 0;
const check = () => { if (!same(gridItems(g), reference(g))) bad++; if (!same(gridItems(g), reference(g))) bad++; };
check();
for (let k = 0; k < 200; k++) {
  const it = items[Math.floor(rnd() * items.length)];
  if (k % 3 === 0) g.remove(it, it.bounds); else if (k % 3 === 1) { const nb = [it.bounds[0] + 70, it.bounds[1], it.bounds[2] + 70, it.bounds[3]]; g.update(it, it.bounds, nb); it.bounds = nb; } else { g.remove(it, it.bounds); g.insert(it, it.bounds); }
  check();
}
const a = gridItems(g); a.sort((p, q) => q.i - p.i); if (!same(gridItems(g), reference(g))) bad++; // een beller mag zijn kopie sorteren
g.touch(); g.map.values().next().value.pop(); if (!same(gridItems(g), reference(g))) bad++; // rechtstreekse wijziging plus touch
g.clear(); if (gridItems(g).length) bad++;
console.log('verschillen:', bad);
for (const it of items) g.insert(it, it.bounds);
const run = (f) => { const t = process.hrtime.bigint(); let s = 0; for (let k = 0; k < 30; k++) s += f(g).length; return Number(process.hrtime.bigint() - t) / 1e6; };
for (let k = 0; k < 3; k++) { run(reference); run(gridItems); }
const A = [], B = [];
for (let k = 0; k < 7; k++) { A.push(run(reference)); B.push(run(gridItems)); }
const med = (v) => v.slice().sort((p, q) => p - q)[v.length >> 1];
console.log('30 leesbeurten per losse bouw: oud ms', med(A).toFixed(1), 'nieuw (zonder wijziging ertussen) ms', med(B).toFixed(1));
process.exit(bad ? 1 : 0);
