// tileplace.nearestOnRoads: the one plain nearest-road point query (#102),
// on a hand-made map. node scripts/nearest_road_test.mjs
const { nearestOnRoads } = await import('../game/js/tileplace.js');
let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FAIL ' + m); } };
const roads = [
  { name: 'Aweg', cat: 'normal', pts: [[0, 0], [100, 0]] },
  { name: 'Bweg', cat: 'major', pts: [[0, 10], [100, 10]] },
  { name: 'Pad', cat: 'foot', pts: [[0, 2], [100, 2]] },
];
const map = { roadsNear: (x, y, r) => roads.filter((q) => q.pts.some((p) => Math.abs(p[0] - x) <= r + 100 && Math.abs(p[1] - y) <= r)) };
let q = nearestOnRoads(map, 30, 4);
ok(q && q.road.name === 'Pad' && q.x === 30 && q.y === 2 && q.d2 === 4 && q.dx === 100 && q.dy === 0, 'nearest of all roads');
q = nearestOnRoads(map, 30, 4, 60, (r) => r.cat !== 'foot');
ok(q && q.road.name === 'Aweg', 'the filter skips the path');
ok(nearestOnRoads(map, 30, 400, 20) === null, 'nothing in reach: null');
ok(nearestOnRoads(map, 30, 4, 40, (r) => r.name === 'Bweg').y === 10, 'filter by name');
// the list scan under it, as the tile generator uses it: segment, t and the unit direction
const { nearestOnRoadList } = await import('../game/js/util.js');
const L = nearestOnRoadList(roads, 30, 4);
ok(L && L.road.name === 'Pad' && L.i === 0 && Math.abs(L.t - 0.3) < 1e-9 && L.ux === 1 && L.uy === 0 && L.d === 2 && L.d2 === 4, 'list scan: road, segment, t, direction and distance');
ok(nearestOnRoadList([], 0, 0) === null && nearestOnRoadList(roads, 30, 4, () => false) === null, 'list scan: nothing: null');
console.log(`nearest_road: ${n} checks, ${fails} failed`);
process.exit(fails ? 1 : 0);
