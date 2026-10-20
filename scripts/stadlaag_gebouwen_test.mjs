// Gebouwen van de stad uit de OSM-tegelbouw (STAD_LAAG=buildings, #90 fase B) tegenover citymap.json:
// het handwerk (landmarks, interieurs, markt) blijft, de rest komt uit OSM met de 3D BAG-join van pack_tiles.
// Twee vaste stadswerelden, dezelfde vragen op een raster. Slaat over zonder provincie-extract.
import assert from 'node:assert/strict';
import { haveProvince } from './world/build_province.mjs';
import { loadLegacySources } from './lib/loadworld.mjs';
if (!haveProvince()) { console.log('SKIP stadlaag_gebouwen_test: geen data/cache/province'); process.exit(0); }
const P = await import('./world/pack_tiles.mjs');
const { worldOf } = await import('./lib/cityparity.mjs');
const base = P.build(await loadLegacySources());
const swapped = P.build(await loadLegacySources(['buildings']));
const A = await worldOf(base, base.blobs), C = await worldOf(swapped, swapped.blobs);
const b = A.meta.bounds, step = Number(process.env.STEP) || 25;
const inside = (x, y, q) => { let c = false; for (let i = 0, j = q.length - 1; i < q.length; j = i++) if ((q[i][1] > y) !== (q[j][1] > y) && x < ((q[j][0] - q[i][0]) * (y - q[i][1])) / (q[j][1] - q[i][1]) + q[i][0]) c = !c; return c; };
const at = (w, x, y) => w.buildingsNear(x, y, 0.5).find((p) => inside(x, y, p.pts));
const r = { n: 0, both: 0, onlyA: 0, onlyC: 0, h1: 0, h3: 0 };
for (let x = b[0] + 40; x < b[2] - 40; x += step) for (let y = b[1] + 40; y < b[3] - 40; y += step) {
  r.n++;
  const pa = at(A, x, y), pc = at(C, x, y);
  if (pa && pc) { r.both++; const d = Math.abs((pa.hm ?? 0) - (pc.hm ?? 0)); if (d <= 1) r.h1++; if (d <= 3) r.h3++; } else if (pa) r.onlyA++; else if (pc) r.onlyC++;
}
const src = (map) => { const o = {}; for (const x of map.buildings) o[x.hsrc] = (o[x.hsrc] || 0) + 1; return JSON.stringify(o); };
const lm = (map) => map.buildings.filter((x) => x.landmark).length;
const pct = (a, d) => (d ? (100 * a / d).toFixed(1) : '-') + '%';
console.log(`gebouwen: punten ${r.n}, beide ${r.both}, alleen oud ${r.onlyA}, alleen tegels ${r.onlyC}; hoogte binnen 1 m ${pct(r.h1, r.both)}, 3 m ${pct(r.h3, r.both)}`);
console.log(`rijen oud ${A.buildings.length}, tegels ${C.buildings.length}; landmarks ${lm(A)}/${lm(C)}; hoogtebron oud ${src(A)}, tegels ${src(C)}`);
assert.equal(lm(A), lm(C), 'landmarks behouden');
assert.ok(r.onlyA / Math.max(1, r.both + r.onlyA) <= 0.05, 'gebouwen van de stad ontbreken in de tegels');
assert.ok(r.h1 / Math.max(1, r.both) >= 0.8, 'hoogtes');
console.log('stadlaag_gebouwen_test: ok');
