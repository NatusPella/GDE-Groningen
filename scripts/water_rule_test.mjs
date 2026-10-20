// Eén waterregel (#101): waterPolyAt/waterAt(map, x, y, z, opts) is de regel; isInWater, inMapWater, overOpenWater,
// shallowWater, wildlife (waterPointNear) en de nabijheidschecks zijn waterAt plus hun eigen opties, op een raster
// over een verzonnen kaart en over de echte stadskaart.
//   node scripts/water_rule_test.mjs
import './node3d.mjs';
globalThis.requestAnimationFrame = (f) => setImmediate(f);
const L = await import('../game/js/waterlevels.js');
const U = await import('../game/js/util.js');
const V = await import('../game/js/vehicle.js');
const WI = await import('../game/js/waterindex.js');
let n = 0, fails = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FAIL ' + m); } };
const rect = (x0, y0, x1, y1, extra = {}) => ({ pts: [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], ...extra });
const water = [rect(0, 0, 200, 40), rect(300, 0, 340, 40), rect(400, 0, 440, 40, { kind: 'sloot', lv: -0.8, dp: 0.6 }), rect(500, 0, 540, 40, { kind: 'meer', lv: -1, dp: 3 })];
const map = {
  water, waterNear: (x, y, r) => water.filter((p) => x >= p.pts[0][0] - r && x <= p.pts[1][0] + r && y >= p.pts[0][1] - r && y <= p.pts[2][1] + r),
  isOnBridge: (x, y) => (x > 90 && x < 110) || (x > 410 && x < 420), coveredAt: (x, y) => x > 310 && x < 330, roadsNear: () => [],
};
// the rules as they were written out before #101 (isInWater, overOpenWater's water test, shallowWater)
const legacyIsInWater = (m, x, y, z = 0) => {
  if (!L.waterPolyAt(m, x, y)) return false;
  if (z < -3 && m.coveredAt && m.coveredAt(x, y)) return false;
  if (z > 1.5) return false;
  return !m.isOnBridge(x, y);
};
const legacyShallow = (m, x, y) => {
  const w = L.waterAt(m, x, y);
  if (!w || !w.wade || w.level <= L.BOEZEM_Y || (m.isOnBridge && m.isOnBridge(x, y))) return null;
  return w;
};
const strip = (w) => JSON.stringify(w, (k, v) => (v === Infinity ? 'Inf' : v));

let diff = 0, wet = 0, shallowN = 0;
for (let x = -20; x < 560; x += 5) for (let y = -20; y < 60; y += 5) {
  const w = L.waterAt(map, x, y);
  for (const z of [0, 2, -4, 1.6, -3.5]) {
    const expect = !!w && !(z < -3 && w.covered) && !(z > 1.5) && !map.isOnBridge(x, y);
    if (U.isInWater(map, x, y, z) !== expect) diff++;
    if (legacyIsInWater(map, x, y, z) !== expect) diff++;
    // the same by the options of waterAt
    if (!!L.waterAt(map, x, y, z, { bridgeDry: true }) !== expect) diff++;
    // the height rule alone, bridges left to the caller
    if (!!L.waterAt(map, x, y, z) !== (!!w && !(z < -3 && w.covered) && !(z > 1.5))) diff++;
    // a car sinks where the walker is in the water, and the water is no wade (a ditch, a shallow with a peil of its own)
    const sinks = expect && !L.shallowWater(map, x, y);
    if (V.overOpenWater(map, x, y, z) !== sinks) diff++;
  }
  if (U.isInWater(map, x, y) !== legacyIsInWater(map, x, y)) diff++;
  if (U.inMapWater(map, x, y) !== !!w) diff++;
  if (strip(L.shallowWater(map, x, y)) !== strip(legacyShallow(map, x, y))) diff++;
  if (strip(L.waterAt(map, x, y, undefined, { shallow: true })) !== strip(legacyShallow(map, x, y))) diff++;
  if (L.waterNearby(map, x, y, 40) !== (map.waterNear(x, y, 40).length > 0)) diff++;
  const p = L.waterPolyAt(map, x, y, undefined, L.BRIDGE_DRY);
  if (!!p !== (!!w && !map.isOnBridge(x, y))) diff++;
  if (w) {
    wet++;
    ok(typeof w.covered === 'boolean', 'covered is a boolean');
    ok(typeof w.kind === 'string' && typeof w.depth === 'number' && typeof w.level === 'number', 'waterAt has kind, depth, level and covered');
  }
  if (L.shallowWater(map, x, y)) shallowN++;
}
ok(diff === 0, 'waterAt, isInWater, inMapWater, overOpenWater and shallowWater are one rule, ' + diff + ' differences');
ok(wet > 100 && shallowN > 5, 'the grid has water and a ditch to wade (' + wet + ', ' + shallowN + ')');
ok(L.waterAt(map, 320, 20).covered === true && L.waterAt(map, 20, 20).covered === false, 'covered follows coveredAt');
ok(!L.shallowWater(map, 415, 20) && !!L.shallowWater(map, 430, 20) && !L.shallowWater(map, 20, 20), 'shallow: a ditch is waded, dry under a bridge deck, the canal is not shallow');
ok(!!L.waterAt(map, 100, 20) && !L.waterAt(map, 100, 20, 0, { bridgeDry: true }), 'bridgeDry: water under a deck is wet as it lies and dry for a walker');
ok(!L.waterAt(map, 20, 20, 2) && !!L.waterAt(map, 20, 20, 0) && !L.waterAt(map, 320, 20, -4) && !!L.waterAt(map, 320, 20, -2), 'z: dry on a viaduct and under an aqueduct');

// the real city map: the rules agree on every kind of spot (water, quays, bridges, aqueducts)
{
  const { loadCityWorld } = await import('./lib/loadworld.mjs');
  const { map: city } = await loadCityWorld({ src: 'json' });
  const b = city.meta.bounds;
  const pts = [];
  for (let x = b[0] + 0.137; x < b[2]; x += 12) for (let y = b[1] + 0.291; y < b[3]; y += 12) pts.push([x, y]);
  for (const w of city.water) for (let k = 0; k < w.pts.length; k++) {
    const a = w.pts[k], c = w.pts[(k + 1) % w.pts.length];
    pts.push([a[0], a[1], 1], [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2, 1], [a[0] + 0.01, a[1] - 0.01]);
  }
  const index = WI.getWaterIndex(city);
  let d = 0, d2 = 0, wetC = 0, bridged = 0, covered = 0, idxDiff = 0, near = 0;
  for (const [x, y, onEdge] of pts) {
    const w = L.waterAt(city, x, y);
    if (w) { wetC++; if (city.isOnBridge(x, y)) bridged++; if (w.covered) covered++; }
    for (const z of [0, 2, -4]) {
      if (U.isInWater(city, x, y, z) !== legacyIsInWater(city, x, y, z)) d++;
      if (!!L.waterAt(city, x, y, z, { bridgeDry: true }) !== legacyIsInWater(city, x, y, z)) d++;
    }
    if (U.inMapWater(city, x, y) !== !!w || city.inWaterRaw(x, y) !== !!w) d++;
    if (strip(L.shallowWater(city, x, y)) !== strip(legacyShallow(city, x, y))) d2++;
    // the bulk index (waterindex.js inWater: terrain holes, quay walls, grass) is the same polygons, indexed
    if (!onEdge && index.inWater(x, y) !== !!w) idxDiff++;
    if (L.waterNearby(city, x, y, 60) !== (city.waterNear(x, y, 60).length > 0)) near++;
  }
  ok(wetC > 10000 && bridged > 100 && covered > 0, `the city grid has water, bridges and an aqueduct (${wetC}, ${bridged}, ${covered})`);
  ok(d === 0 && d2 === 0 && near === 0, `city: ${pts.length} points, the rule and its wrappers agree (${d + d2 + near} differences)`);
  ok(idxDiff === 0, `city: the water index (waterindex.js inWater) agrees with the rule off the outlines (${idxDiff} differences)`);
}
console.log(`${n} checks, ${fails} failed`);
process.exit(fails ? 1 : 0);
