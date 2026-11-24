// perf-r3 (24-11): de watermesh van een vlak vast water gebruikt een eigen index over het vaste water binnen 40 m (waterindex.js
// staticPolyWaterIndex) in plaats van de index over al het vaste water, die na elke tegelwissel opnieuw werd gebouwd. Deze test rekent
// op de echte stad na dat beide dezelfde geometrie geven: dezelfde hoekpunten, voor elk vlak.
//   node scripts/waterlokaal_test.mjs   (game/world nodig; zonder wereld SKIP)
import './node3d.mjs';
import { skipUnlessCity, loadCityData } from './lib/loadworld.mjs';
await skipUnlessCity('waterlokaal_test');
const WI = await import('../game/js/waterindex.js');
const { buildWaterGeometry } = await import('../game/js/water3d.js');

const map = await loadCityData({ extras: false });
// de stadsdata hebben geen waterNear (dat is de tegelwereld): een raster over de vlakken op hun box, zoals tileworld.js
if (!map.waterNear) {
  const { SpatialGrid } = await import('../game/js/spatialgrid.js');
  const { polygonBounds } = await import('../game/js/util.js');
  const g = new SpatialGrid(64);
  for (const w of map.water || []) { if (!w.bounds) w.bounds = polygonBounds(w.pts); g.insert(w, w.bounds); }
  map.waterNear = (x, y, r) => g.queryRadius(x, y, r);
}
const polys = (map.water || []).filter((w) => !w.tile);
const global = WI.getWaterIndex(map);
let n = 0, bad = 0;
const same = (a, b) => a.length === b.length && a.every((v, i) => Math.abs(v - b[i]) < 1e-6);
for (const poly of polys) {
  const local = WI.getWaterIndex(map, poly);
  const ga = buildWaterGeometry(poly, global, null), la = buildWaterGeometry(poly, local, null);
  const pa = ga.attributes.position.array, pb = la.attributes.position.array;
  n++;
  if (!same(pa, pb)) { bad++; if (bad <= 5) console.log(`FAIL vlak ${n}: ${pa.length / 3} tegen ${pb.length / 3} hoekpunten`); }
}
console.log(`waterlokaal_test: ${n - bad}/${n} vlakken gelijk`);
process.exit(bad ? 1 : 0);
