// Weilandranden over spoor (#124): the province's rails are an obstacle for fences, hedges and
// herds everywhere, not only within 5 km of the city (countryedge.js edgeBlocked) and the real
// tiles' track blocks too (provinceworld.js realBlockedAt via map.railNear).
//   node scripts/proprail_test.mjs
import './node3d.mjs';
const PW = await import('../game/js/provinceworld.js');
const CE = await import('../game/js/countryedge.js');
const G = await import('../game/js/gdt.js');

let n = 0, fails = 0;
const ok = (c, m, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${m}${info ? ' (' + info + ')' : ''}`); } };

// a hand-made map: one rail row along y = 0 from x = 0 to 400, in a province tile
const [i, j] = G.tileIndexOf(200, 0);
const tile = G.tileKey(i, j);
const rail = { pts: [[0, 0], [400, 0]], bounds: [0, 0, 400, 0] };
const map = {
  resident: new Set([`${i},${j}`]),
  buildingsNear: () => [], roadsNear: () => [], waterNear: () => [], flatWaterNear: () => [],
  railNear: (x, y, r) => (x >= -r && x <= 400 + r && Math.abs(y) <= r ? [rail] : []),
};
const isTile = (k) => (k === tile ? { flags: 1 } : null);
ok(PW.realBlockedAt(map, isTile, 200, 1, 0.5), 'a point on the ballast is blocked');
ok(PW.realBlockedAt(map, isTile, 200, 2.4, 0.5), 'and within the ballast plus the margin');
ok(!PW.realBlockedAt(map, isTile, 200, 6, 0.5), 'six metres off is free');
ok(!PW.realBlockedAt(map, isTile, 450, 0, 0.5), 'past the end of the rail is free');
ok(PW.realBlockedAt(map, isTile, 200, 3.9, 2), 'a bigger margin (a fence post: 2 m) reaches further');
// a map without a rail query (the city's own) still works
const plain = { ...map, railNear: undefined };
ok(!PW.realBlockedAt(plain, isTile, 200, 0, 0.5), 'a map without railNear has no rail rule');

// edgeBlocked: the rail cells count far from the city too (the 5 km exception is gone)
CE.EDGE.ready = true;
CE.EDGE.bounds = [-100, -100, 100, 100];
const key = (a, b) => a * 1000003 + b;
CE.EDGE.railCells.add(key(Math.floor(30000 / 8), Math.floor(30000 / 8)));
ok(CE.edgeBlocked(30002, 30002, 2), 'a rail cell 30 km from the city blocks');
ok(!CE.edgeBlocked(30200, 30200, 2), 'and its neighbour does not');
CE.EDGE.ready = false;

console.log(`${n} checks, ${fails} failed`);
process.exit(fails ? 1 : 0);
