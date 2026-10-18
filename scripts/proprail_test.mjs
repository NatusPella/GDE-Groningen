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

// the fences across a tile seam (#124): no hole of 10 m in a row of posts on the border of two 160 m tiles
{
  const CS = await import('../game/js/countryside.js');
  const CF = await import('../game/js/countryfield.js');
  CF.setCountryBounds([-2000, -2000, 2000, 2000]);
  const posts = [];
  for (let tx = 40; tx < 46; tx++) for (let ty = 40; ty < 46; ty++) {
    const m = (CS.countryTileItems(tx, ty).items.post || { m: [] }).m;
    for (let q = 0; q < m.length; q += 16) posts.push([m[q + 12], m[q + 14]]);
  }
  let seam = 0;
  for (const axis of [0, 1]) {
    const rows = new Map();
    for (const p of posts) { const k = Math.round(p[axis] * 20); (rows.get(k) || rows.set(k, []).get(k)).push(p[1 - axis]); }
    for (const list of rows.values()) {
      list.sort((u, v) => u - v);
      for (let i = 1; i < list.length; i++) { const gap = list[i] - list[i - 1]; if (gap > 6.5 && gap < 13 && Math.floor(list[i - 1] / 160) !== Math.floor(list[i] / 160)) seam++; }
    }
  }
  ok(posts.length > 500, 'the test area has fences', String(posts.length));
  ok(seam <= posts.length * 0.004, 'a seam gap in less than 0.4% of the posts', `${seam} of ${posts.length}`);
}

// the painted ditches are off where the tiles hold the real ones (#124): only after the world is built with them
{
  const CF = await import('../game/js/countryfield.js');
  CF.setCountryBounds([-2000, -2000, 2000, 2000]);
  const B = { x0: 20, y0: 20, w: 6, h: 6, data: new Uint8Array(36).fill(1) }; // blocks 20..25 (the point 21000, 21000 and on)
  CF.setProvinceBlocks(B);
  const scan = () => { let ditch = 0, total = 0; for (let x = 21500; x < 22500; x += 2.5) for (let y = 21500; y < 21700; y += 2.5) { total++; if (CF.countrySurface(x, y) === 'sloot') ditch++; } return { ditch, total }; };
  CF.setProvinceDitches(false);
  const off = scan();
  ok(off.ditch > 20, 'by default the painted ditches are ground kind sloot in a province block', JSON.stringify(off));
  CF.setProvinceDitches(true);
  const on = scan();
  ok(on.ditch === 0, 'with the real ditches in the tiles none are left', JSON.stringify(on));
  ok(CF.osmDitchesAt(21, 21) && !CF.osmDitchesAt(5, 5), 'only in the blocks the tiles cover');
  // outside the province blocks the painted ditches stay
  let outside = 0;
  for (let x = 4500; x < 5500; x += 2.5) for (let y = 4500; y < 4700; y += 2.5) if (CF.countrySurface(x, y) === 'sloot') outside++;
  ok(outside > 20, 'and outside them', String(outside));
  CF.setProvinceDitches(false);
  CF.setProvinceBlocks(null);
}

// the land use of the tiles (OSM landuse) over the hash (#124): no wire and no herd on arable, wire and herds on a meadow
{
  const CS = await import('../game/js/countryside.js');
  const CF = await import('../game/js/countryfield.js');
  CF.setCountryBounds([-2000, -2000, 2000, 2000]);
  const run = (use) => {
    CE.setExtraUse(use ? () => use : null);
    let posts = 0, wires = 0, animals = 0;
    for (let tx = 40; tx < 46; tx++) for (let ty = 40; ty < 46; ty++) {
      const t = CS.countryTileItems(tx, ty);
      posts += ((t.items.post || { m: [] }).m.length) / 16;
      wires += ((t.items.wire || { m: [] }).m.length) / 16;
      animals += t.animals.filter((a) => a.kind === 'cow' || a.kind === 'sheep' || a.kind === 'horse').length;
    }
    CE.setExtraUse(null);
    return { posts, wires, animals };
  };
  const hash = run(null), akker = run('akker'), weide = run('weide');
  ok(hash.posts > 500 && hash.animals > 20, 'the hash makes fences and herds', JSON.stringify(hash));
  ok(akker.animals === 0, 'no herd grazes on arable', JSON.stringify(akker));
  ok(akker.posts < hash.posts * 0.6, 'and far fewer fence posts', akker.posts + ' vs ' + hash.posts);
  ok(weide.animals > hash.animals * 0.8 && weide.posts > hash.posts, 'a meadow keeps its herds and its wire', JSON.stringify(weide));
  ok(CE.landUseAt(0, 0) === null, 'without tiles the land use is silent');
}

// TileWorld.landUseAt: the smallest polygon holding the point wins
{
  const { TileWorld } = await import('../game/js/tileworld.js');
  const big = { pts: [[0, 0], [100, 0], [100, 100], [0, 100]], bounds: [0, 0, 100, 100], use: 'akker' };
  const small = { pts: [[10, 10], [30, 10], [30, 30], [10, 30]], bounds: [10, 10, 30, 30], use: 'weide' };
  const fake = { parcelGrid: { query: () => [big, small] } };
  const at = (x, y) => TileWorld.prototype.landUseAt.call(fake, x, y);
  ok(at(50, 50) === 'akker' && at(20, 20) === 'weide' && at(200, 200) === null, 'the smallest polygon wins, none outside');
  ok(TileWorld.prototype.landUseAt.call({}, 1, 1) === null, 'a world without parcels is silent');
  const PW = await import('../game/js/provinceworld.js');
  const mapR = { resident: new Set(['0,0']), landUseAt: () => 'akker' };
  const [ti, tj] = G.tileIndexOf(500, 500);
  const isT = (k) => (k === G.tileKey(ti, tj) ? {} : null);
  ok(PW.realUseAt(mapR, isT, 500, 500) === 'akker' || ti !== 0 || tj !== 0, 'realUseAt asks the world for a province tile that is in');
  ok(PW.realUseAt({ resident: new Set(), landUseAt: () => 'akker' }, isT, 500, 500) === null, 'and is silent for a tile that is not in');
}

// a mapped OSM hedge keeps the hash's own hedges out (#124)
{
  const CS = await import('../game/js/countryside.js');
  const CF = await import('../game/js/countryfield.js');
  const PW2 = await import('../game/js/provinceworld.js');
  CF.setCountryBounds([-2000, -2000, 2000, 2000]);
  const hedges = (hook) => {
    CE.setExtraHedge(hook);
    let h = 0;
    for (let tx = 40; tx < 48; tx++) for (let ty = 40; ty < 48; ty++) h += ((CS.countryTileItems(tx, ty).items.hedge || { m: [] }).m.length) / 16;
    CE.setExtraHedge(null);
    return h;
  };
  const free = hedges(null), mapped = hedges(() => true);
  ok(free > 50, 'the hash makes hedges', String(free));
  ok(free - mapped >= 50, 'the hash grid hedges (cross ditches, road verges) stay out where OSM maps a hedge; the farm and village ones are not the grid', free + ' vs ' + mapped);
  const row = { pts: [[0, 0], [100, 0]] };
  const m = { hedgeNear: (x, y, r) => (Math.abs(y) <= r + 1 ? [row] : []) };
  ok(PW2.realHedgeNear(m, 50, 3, 6) && !PW2.realHedgeNear(m, 50, 9, 6) && !PW2.realHedgeNear({}, 50, 1, 6), 'a mapped hedge within r, not beyond, not without a world query');
  const { TileWorld } = await import('../game/js/tileworld.js');
  ok(TileWorld.prototype.hedgeNear.call({}, 0, 0, 5).length === 0, 'a world without mapped hedges is silent');
}

console.log(`${n} checks, ${fails} failed`);
process.exit(fails ? 1 : 0);
