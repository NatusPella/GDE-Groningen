// Groen en bomen van de stad uit de OSM-tegelbouw (STAD_LAAG=green,trees, #90 fase B) tegenover citymap.json:
// twee vaste stadswerelden, dezelfde vragen op een raster. Slaat over zonder provincie-extract.
import assert from 'node:assert/strict';
import { haveProvince } from './world/build_province.mjs';
import { loadLegacySources } from './lib/loadworld.mjs';
if (!haveProvince()) { console.log('SKIP stadlaag_groen_test: geen data/cache/province'); process.exit(0); }
const P = await import('./world/pack_tiles.mjs');
const { worldOf } = await import('./lib/cityparity.mjs');
const base = P.build(await loadLegacySources());
const swapped = P.build(await loadLegacySources(['green', 'trees']));
const A = await worldOf(base, base.blobs), C = await worldOf(swapped, swapped.blobs);
const b = A.meta.bounds, step = Number(process.env.STEP) || 30;
const inside = (x, y, q) => { let c = false; for (let i = 0, j = q.length - 1; i < q.length; j = i++) if ((q[i][1] > y) !== (q[j][1] > y) && x < ((q[j][0] - q[i][0]) * (y - q[i][1])) / (q[j][1] - q[i][1]) + q[i][0]) c = !c; return c; };
const kindAt = (w, x, y) => { const g = w.greenNear(x, y, 1).filter((p) => inside(x, y, p.pts)); return g.length ? g.map((p) => p.kind).sort().join('+') : null; };
const r = { n: 0, both: 0, onlyA: 0, onlyC: 0, kind: 0, pairs: {} };
for (let x = b[0] + 40; x < b[2] - 40; x += step) for (let y = b[1] + 40; y < b[3] - 40; y += step) {
  r.n++;
  const ka = kindAt(A, x, y), kc = kindAt(C, x, y);
  if (ka && kc) { r.both++; if (ka === kc) r.kind++; else { const k = `${ka}>${kc}`; r.pairs[k] = (r.pairs[k] || 0) + 1; } } else if (ka) r.onlyA++; else if (kc) r.onlyC++;
}
// bomen: welk deel van de stadsbomen heeft binnen 3 m een boom in de tegelbouw, en andersom
let near = 0, nearR = 0;
for (const t of A.trees) if (C.treesNear(t[0], t[1], 3).length) near++;
for (const t of C.trees) if (A.treesNear(t[0], t[1], 3).length) nearR++;
const pct = (a, d) => (d ? (100 * a / d).toFixed(1) : '-') + '%';
console.log(`groen: punten ${r.n}, beide ${r.both}, alleen oud ${r.onlyA}, alleen tegels ${r.onlyC}; soort gelijk ${pct(r.kind, r.both)}`);
console.log('soort-verschillen', JSON.stringify(Object.entries(r.pairs).sort((a, c) => c[1] - a[1]).slice(0, 8)));
console.log(`bomen: oud ${A.trees.length}, tegels ${C.trees.length}; oude bomen met een tegelboom binnen 3 m ${pct(near, A.trees.length)}, andersom ${pct(nearR, C.trees.length)}`);
console.log(`groen-rijen oud ${base.counts.green}, tegels ${swapped.counts.green}; wegen ${base.counts.roads}/${swapped.counts.roads}`);
assert.equal(base.counts.buildings, swapped.counts.buildings, 'gebouwen ongewijzigd');
assert.ok(r.onlyA / Math.max(1, r.both + r.onlyA) <= 0.1, 'groen van de stad ontbreekt in de tegels');
assert.ok(r.kind / Math.max(1, r.both) >= 0.8, 'groensoort');
assert.ok(near / Math.max(1, A.trees.length) >= 0.6, 'bomen van de stad ontbreken in de tegels');
console.log('stadlaag_groen_test: ok');
