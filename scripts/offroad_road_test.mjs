// A road lies over whatever is under it (#165): a ditch or wet polygon crossing
// a mapped road, or the countryside's grass, must not make a car on that road
// wade or drag; beside the road it still does.
//   node scripts/offroad_road_test.mjs
import './node3d.mjs';
const L = await import('../game/js/waterlevels.js');
const V = await import('../game/js/vehicle.js');

let n = 0, fails = 0;
const ok = (c, m, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${m}${info ? ' (' + info + ')' : ''}`); } };

// a ditch (50 x 20) with a country road running east-west across it at y = 10, 6 m wide
const K = L.WATER_KINDS.sloot;
const ditch = { pts: [[0, 0], [50, 0], [50, 20], [0, 20]], bounds: [0, 0, 50, 20], kind: 'sloot', lv: K.level ?? L.BOEZEM_Y, dp: K.depth, nav: K.nav, bank: 'oever' };
const mkRoad = (extra = {}) => ({ pts: [[-30, 10], [80, 10]], width: 6, cat: 'normal', type: 'unclassified', ...extra });
const mkMap = (roads) => ({ waterNear: () => [ditch], isOnBridge: () => false, roadsNear: () => roads, water: [], waterGrid: null, buildings: [], greenNear: () => [] });

{
  const map = mkMap([mkRoad()]);
  ok(V.offroadGround(map, 25, 5) === 'ditch', 'beside the road the ditch still drags');
  ok(V.offroadGround(map, 25, 10) === null, 'on the road through the ditch the car does not wade or drag');
  ok(V.offroadGround(map, 25, 12.5) === null && V.offroadGround(map, 25, 6.4) === 'ditch', 'the road is as wide as its surface');
  ok(V.carRoadAt(map, 25, 10) && !V.carRoadAt(map, 25, 14), 'carRoadAt follows the width');
}
{
  // not a road for cars: a footway or cycle path, and the span of a bridge that is up
  for (const [m, r] of [['a footway', { cat: 'foot' }], ['a cycle path', { cat: 'cycle' }], ['an open bridge', { bridge: true, _open: true }]]) {
    const map = mkMap([mkRoad(r)]);
    ok(V.offroadGround(map, 25, 10) === 'ditch', `${m} does not make the ditch dry`);
  }
  ok(V.offroadGround(mkMap([mkRoad({ bridge: true })]), 25, 10) === null, 'a bridge that is down is dry (as before)');
}
{
  const map = { waterNear: () => [], isOnBridge: () => false, water: [], buildings: [] };
  ok(V.offroadGround(map, 25, 10) !== undefined, 'a map without roadsNear still answers');
}

console.log(fails ? `${fails} of ${n} FAILED` : `${n} offroad-road checks passed`);
process.exit(fails ? 1 : 0);
