// Verse wereld-cache (#314 C2b, releaseblokkade): de kruispuntenbouw van de provincie
// (scripts/world/junction_tiles.mjs junctionsOf) draait de stadscode (junctionModel,
// allSignals) op een map zonder rasters en zonder junctionRows. Vóór de fix zette
// allSignals de signaalgrid op null terwijl signalised hem net aan het vullen was:
// "Cannot read properties of null (reading 'insertPoint')" bij een verse cache.
//   node scripts/junction_tiles_world_test.mjs
import assert from 'node:assert/strict';
import { allSignals, junctionModel } from '../game/js/junctions.js';
import { snapSignals, junctionsOf } from './world/junction_tiles.mjs';
import { SpatialGrid } from '../game/js/spatialgrid.js';

let n = 0;
const ok = (v, wat) => { assert.ok(v, wat); n++; };
const road = (pts, extra = {}) => ({ kind: 'roads', row: { pts, cat: 'normal', type: 'residential', width: 6, name: 'Straat', ...extra } });
const signal = (x, y) => ({ kind: 'furniture', row: { k: 'signals', pts: [[x, y]] } });

// Een pack zoals build_province het heeft: twee kruisende wegen en een OSM-licht.
const feats = [road([[-80, 0], [0, 0], [80, 0]]), road([[0, -80], [0, 0], [0, 80]]), signal(0, 0)];
const snapped = snapSignals(feats);
ok(snapped.lights.length === 1, 'het OSM-licht wordt op de weg gesnapt');
const built = junctionsOf(snapped.feats, snapped.lights);
ok(built.nodes.length >= 1, 'de kruispuntenbouw levert een knooppunt', String(built.nodes.length));
ok(built.nodes.some((node) => node.arms.some((arm) => arm.rule === 'signal')), 'het licht staat als seinarm in het model');

// De volgorde die de verse cache liet vallen: eerst allSignals (dat bouwde en leegde de
// signaalgrid), daarna junctionModel → signalised. Dit mag geen null-grid meer geven.
const mapRoads = feats.filter((f) => f.kind === 'roads').map((f) => f.row);
const roadGrid = new SpatialGrid(80);
for (const r of mapRoads) {
  const xs = r.pts.map((q) => q[0]), ys = r.pts.map((q) => q[1]);
  roadGrid.insert(r, [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]);
}
const map = { roads: mapRoads, roadGrid, meta: { trafficLights: snapped.lights } };
const lights = allSignals(map);
ok(lights.length >= 1, 'allSignals op de bouwmap werkt', String(lights.length));
const model = junctionModel(map);
ok(model.size >= 1, 'junctionModel na allSignals werkt (geen null-signaalgrid)', String(model.size));
// en nog een keer, zodat de cache/invalidatie niet alsnog een lege grid achterlaat
ok(allSignals(map).length === lights.length && junctionModel(map).size === model.size, 'tweede ronde geeft hetzelfde');
console.log(`junction_tiles_world_test ok (${n} checks)`);
