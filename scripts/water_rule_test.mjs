// Eén waterregel (#101): isInWater en inMapWater zijn waterAt plus hun eigen veto's, op een raster over een gemaakte kaart.
//   node scripts/water_rule_test.mjs
import './node3d.mjs';
globalThis.requestAnimationFrame = (f) => setImmediate(f);
const L = await import('../game/js/waterlevels.js');
const U = await import('../game/js/util.js');
let n = 0, fails = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FAIL ' + m); } };
const rect = (x0, y0, x1, y1, extra = {}) => ({ pts: [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], ...extra });
const water = [rect(0, 0, 200, 40), rect(300, 0, 340, 40)];
const map = {
  water, waterNear: (x, y, r) => water.filter((p) => x >= p.pts[0][0] - r && x <= p.pts[1][0] + r && y >= p.pts[0][1] - r && y <= p.pts[2][1] + r),
  isOnBridge: (x, y) => x > 90 && x < 110, coveredAt: (x, y) => x > 310 && x < 330, roadsNear: () => [],
};
let diff = 0, wet = 0;
for (let x = -20; x < 360; x += 5) for (let y = -20; y < 60; y += 5) {
  const w = L.waterAt(map, x, y);
  for (const z of [0, 2, -4]) {
    const expect = !!w && !(z < -3 && w.covered) && !(z > 1.5) && !map.isOnBridge(x, y);
    if (U.isInWater(map, x, y, z) !== expect) diff++;
  }
  if (U.inMapWater(map, x, y) !== !!w) diff++;
  if (w) { wet++; ok(typeof w.covered === 'boolean', 'covered is a boolean'); }
}
ok(diff === 0, 'isInWater and inMapWater agree with waterAt, ' + diff + ' differences');
ok(wet > 100, 'the grid has water');
ok(L.waterAt(map, 320, 20).covered === true && L.waterAt(map, 20, 20).covered === false, 'covered follows coveredAt');
console.log(`${n} checks, ${fails} failed`);
process.exit(fails ? 1 : 0);
