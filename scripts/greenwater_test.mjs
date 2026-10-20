// Water wins over green (game/js/greenwater.js, used by grass.js):
//   node scripts/greenwater_test.mjs
// - the helper drops triangles whose centre is in water;
// - on the city map: green polygons that overlap water keep no triangle in water.
import fs from 'node:fs';

globalThis.requestAnimationFrame = (f) => setImmediate(f);
const { dryIndices } = await import('../game/js/greenwater.js');
const { createWaterIndex } = await import('../game/js/waterindex.js');

let n = 0, fails = 0;
const ok = (cond, name, info = '') => { n++; if (!cond) { fails++; console.log(`FAIL ${name}${info ? ' (' + info + ')' : ''}`); } };

const pos = [0, 0, 0, 10, 0, 0, 0, 0, 10, 20, 0, 20, 30, 0, 20, 20, 0, 30];
const kept = dryIndices(pos, [0, 1, 2, 3, 4, 5], (x) => x > 15);
ok(kept.length === 3 && kept[0] === 0, 'helper keeps the dry triangle, drops the wet one', String(kept));

const { loadCityData } = await import('./lib/loadworld.mjs');
const map = await loadCityData({ extras: false });
const wi = createWaterIndex(map.water);
let overlaps = 0, dropped = 0, wet = 0;
for (const g of map.green) {
  const pts = g.pts;
  if (pts.length < 3 || !pts.some((p) => wi.inWater(p[0], p[1]))) continue;
  overlaps++;
  const tri = []; for (let i = 1; i + 1 < pts.length; i++) tri.push([0, i, i + 1]);
  const p3 = []; for (const p of pts) p3.push(p[0], 0, p[1]);
  const idx = tri.flat();
  const out = dryIndices(p3, idx, wi.inWater);
  dropped += idx.length - out.length;
  for (let i = 0; i < out.length; i += 3) {
    const a = out[i] * 3, b = out[i + 1] * 3, c = out[i + 2] * 3;
    if (wi.inWater((p3[a] + p3[b] + p3[c]) / 3, (p3[a + 2] + p3[b + 2] + p3[c + 2]) / 3)) wet++;
  }
}
ok(overlaps > 0, 'the city map has green overlapping water', String(overlaps));
ok(wet === 0, 'no green triangle left in water', String(wet));
console.log(`${n - fails}/${n} ok (${overlaps} overlapping greens, ${dropped / 3} triangles dropped)`);
process.exit(fails ? 1 : 0);
