// Heeft de geometrieworker de overlaytegels van de stad nodig (#314)? De worker bouwt de wegvlakken, kunstwerken en oevers uit zijn
// eigen kopie van de kaart (geokernels.js roadInit, loadMapAuto: stadstegels + overlays). Dit script bouwt dezelfde kaart met en
// zonder overlays en vergelijkt per weg de hash van wat roadGeo maakt (vlakken, markering, kunstwerken) en per water van shoreParts.
//   GAME_WORLD=<wereldmap> node --expose-gc scripts/perf/worker_overlay_diff.mjs [--water] [--uit=<bestand>]
// Eén variant per proces; met --vergelijk=<a.json>,<b.json> staat het verschil. Zonder wereld: SKIP.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { wereldMap, heeftWereld } from '../lib/stadtegels.mjs';

const arg = (k) => (process.argv.find((a) => a.startsWith('--' + k + '=')) || '').split('=').slice(1).join('=');
if (arg('vergelijk')) {
  const [a, b] = arg('vergelijk').split(',').map((f) => JSON.parse(fs.readFileSync(f, 'utf8')));
  const out = { wegen: a.roads.length, verschilWegen: 0, voorbeelden: [], water: a.shore ? a.shore.length : 0, verschilWater: 0 };
  for (let i = 0; i < a.roads.length; i++) if (a.roads[i] !== b.roads[i]) { out.verschilWegen++; if (out.voorbeelden.length < 12) out.voorbeelden.push([i, a.keys[i]]); }
  if (a.shore) for (let i = 0; i < a.shore.length; i++) if (a.shore[i] !== b.shore[i]) out.verschilWater++;
  console.log(JSON.stringify(out, null, 1));
  process.exit(0);
}
if (!heeftWereld()) { console.log('SKIP worker_overlay_diff: geen wereld (GAME_WORLD)'); process.exit(0); }
const dir = wereldMap();
const metOverlays = process.argv.includes('--overlays');
const S = await import('../../game/js/tilestore.js');
const { loadTileWorld } = await import('../../game/js/tileworld.js');
const { adoptSideSpans } = await import('../../game/js/movablebridges.js');
const { slimWorkerMap } = await import('../../game/js/mapdata.js');
const { setRoadNetwork, roadSurfaceGeometries, roadKey } = await import('../../game/js/roadsurface.js');
const { structureArrays, overpassDeckArrays } = await import('../../game/js/roadstructures3d.js');
const files = {};
for (const f of fs.readdirSync(dir)) if (/\.(gdp|json|gz)$/.test(f)) files[f] = new Uint8Array(fs.readFileSync(path.join(dir, f)));
const tw = await loadTileWorld('world/', { source: new S.MemorySource(files), pool: false, extra: metOverlays ? [{ name: 'index-provincie.json', only: (q) => !!q.ov }] : [] });
const map = tw.world;
adoptSideSpans(map.roads);
const waterOnly = process.argv.includes('--water');
const water0 = map.water.slice();
slimWorkerMap(map);
setRoadNetwork(map);

// een hash over alles wat uit de kernel komt (getypeerde arrays, objecten, getallen)
function feed(h, v, seen = new Set()) {
  if (v === null || v === undefined) { h.update('n'); return; }
  if (ArrayBuffer.isView(v)) { h.update(Buffer.from(v.buffer, v.byteOffset, v.byteLength)); return; }
  if (typeof v !== 'object') { h.update(String(v)); return; }
  if (v.isBufferGeometry) { for (const k of Object.keys(v.attributes).sort()) { h.update(k); feed(h, v.attributes[k].array, seen); } if (v.index) feed(h, v.index.array, seen); for (const g of v.groups) h.update(JSON.stringify(g)); return; }
  if (seen.has(v)) return;
  seen.add(v);
  for (const k of Object.keys(v).sort()) { if (k === 'r' || k === 'road') continue; h.update(k); feed(h, v[k], seen); }
}
const hash = (v) => { const h = crypto.createHash('md5'); feed(h, v); return h.digest('hex').slice(0, 12); };
const res = { keys: [], roads: [] };
if (!waterOnly) {
  for (const r of map.roads) {
    let g, st = null;
    try {
      g = roadSurfaceGeometries(r, true);
      if (map.elev && map.elev.has) st = r.z ? structureArrays(r, map) : overpassDeckArrays(r, map);
    } catch (e) { g = { err: String(e.message).slice(0, 80) }; }
    res.keys.push(roadKey(r));
    res.roads.push(hash([g.sidewalk, g.road, g.mark, g.err, st]));
  }
}
if (process.argv.includes('--water')) {
  const { shoreParts } = await import('../../game/js/quaywalls.js');
  res.shore = [];
  for (let wi = 0; wi < water0.length; wi++) {
    let s;
    try { s = shoreParts(water0[wi], map, 0, true); } catch (e) { s = { err: String(e.message).slice(0, 80) }; }
    res.shore.push(hash(s.parts ? [s.parts.map((q) => [q.kind, q.geo]), s.seats, s.hulls] : s));
  }
}
fs.writeFileSync(arg('uit') || 'worker_diff.json', JSON.stringify(res));
console.log(`${metOverlays ? 'met' : 'zonder'} overlays: ${res.roads.length} wegen${res.shore ? `, ${res.shore.length} wateren` : ''} gehasht`);
