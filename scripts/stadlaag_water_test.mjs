// Het stadswater uit de OSM-tegelbouw (STAD_LAAG=water, #90 fase B) tegenover het water uit citymap.json:
// twee vaste stadswerelden, dezelfde vragen op een raster over de stad. Slaat over zonder provincie-extract.
import assert from 'node:assert/strict';
import { haveProvince } from './world/build_province.mjs';
if (!haveProvince()) { console.log('SKIP stadlaag_water_test: geen data/cache/province'); process.exit(0); }
const P = await import('./world/pack_tiles.mjs');
const { worldOf } = await import('./lib/cityparity.mjs');
const base = P.build(P.loadSources());
const swapped = P.build(await P.loadSourcesLaag(undefined, ['water']));
const A = await worldOf(base, base.blobs), C = await worldOf(swapped, swapped.blobs);
const b = A.meta.bounds, step = Number(process.env.STEP) || 30;
const r = { n: 0, both: 0, onlyA: 0, onlyC: 0, kind: 0, lv: 0, extra: {}, ex: [] };
const at = (w, x, y) => w.waterNear(x, y, 1).find((p) => { let c = false; const q = p.pts; for (let i = 0, j = q.length - 1; i < q.length; j = i++) if ((q[i][1] > y) !== (q[j][1] > y) && x < ((q[j][0] - q[i][0]) * (y - q[i][1])) / (q[j][1] - q[i][1]) + q[i][0]) c = !c; return c; });
for (let x = b[0] + 40; x < b[2] - 40; x += step) for (let y = b[1] + 40; y < b[3] - 40; y += step) {
  r.n++;
  const pa = at(A, x, y), pc = at(C, x, y);
  if (pa && pc) { r.both++; if (pa.kind === pc.kind) r.kind++; if (pa.lv === pc.lv) r.lv++; } else if (pa) r.onlyA++; else if (pc) { r.onlyC++; const k = `${pc.kind}|${pc.name || '-'}`; r.extra[k] = (r.extra[k] || 0) + 1; if (r.onlyC % 40 === 1) r.ex.push([Math.round(x), Math.round(y), k]); }
}
const pct = (a, d) => (d ? (100 * a / d).toFixed(1) : '-') + '%';
console.log(`punten ${r.n}: beide nat ${r.both}, alleen oud ${r.onlyA}, alleen tegels ${r.onlyC}; soort gelijk ${pct(r.kind, r.both)}, peil gelijk ${pct(r.lv, r.both)}`);
console.log('extra water (soort|naam: punten)', JSON.stringify(Object.entries(r.extra).sort((a, b) => b[1] - a[1]).slice(0, 15)));
if (process.env.DEBUG_EX) console.log(r.ex.map((e) => e.join(' ')).join('\n'));
console.log(`water-rijen oud ${base.counts.water}, tegels ${swapped.counts.water}; wegen ${base.counts.roads}/${swapped.counts.roads}, gebouwen ${base.counts.buildings}/${swapped.counts.buildings}`);
assert.equal(base.counts.buildings, swapped.counts.buildings, 'gebouwen ongewijzigd');
// OSM kent meer water dan de stadskaart (sloten, vijvers): alleen water dat de stad had en de tegels missen is een fout
assert.ok(r.onlyA / Math.max(1, r.both + r.onlyA) <= 0.03, 'water van de stad ontbreekt in de tegels');
assert.ok(r.kind / Math.max(1, r.both) >= 0.85, 'watersoort');
assert.ok(r.lv / Math.max(1, r.both) >= 0.95, 'waterpeil');
console.log('stadlaag_water_test: ok');
