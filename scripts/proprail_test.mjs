// (#1092: de procedurele weilandranden zijn weg; wat hier nog telt is de poort realBlockedAt/edgeBlocked voor de overige props en de
// regel dat het hashraster geen paal, draad, poort, berm of bies meer zet.)
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

// #1092: the hash grid sets no fence post, wire, gate, bank or rush any more: an edge needs a line of the map
{
  const CS = await import('../game/js/countryside.js');
  const CF = await import('../game/js/countryfield.js');
  CF.setCountryBounds([-2000, -2000, 2000, 2000]);
  const count = { post: 0, wire: 0, gate: 0, bank: 0, rush: 0, hedge: 0 };
  for (let tx = 40; tx < 46; tx++) for (let ty = 40; ty < 46; ty++) {
    const items = CS.countryTileItems(tx, ty).items;
    for (const k of Object.keys(count)) count[k] += ((items[k] || { m: [] }).m.length) / 16;
  }
  ok(Object.values(count).every((v) => v === 0), 'no post, wire, gate, bank or rush from the hash grid', JSON.stringify(count));
}

// #1092: the hash grid's painted ditches (strip, main and maar) are gone for good: no ground kind 'sloot' anywhere on the polder grid, with or
// without the tiles' ditches (the tiles' water is the rule where a tile is in: waterlevels.js)
{
  const CF = await import('../game/js/countryfield.js');
  CF.setCountryBounds([-2000, -2000, 2000, 2000]);
  const B = { x0: 20, y0: 20, w: 6, h: 6, data: new Uint8Array(36).fill(1) }; // blocks 20..25 (the point 21000, 21000 and on)
  CF.setProvinceBlocks(B);
  const scan = (x0, y0) => { let ditch = 0, total = 0; for (let x = x0; x < x0 + 1000; x += 2.5) for (let y = y0; y < y0 + 200; y += 2.5) { total++; if (CF.countrySurface(x, y) === 'sloot') ditch++; } return { ditch, total }; };
  for (const on of [false, true]) {
    CF.setProvinceDitches(on);
    const inside = scan(21500, 21500), outside = scan(4500, 4500);
    ok(inside.ditch === 0 && outside.ditch === 0, 'no painted ditch is ground kind sloot (ditches of the tiles ' + (on ? 'on' : 'off') + ')', JSON.stringify({ inside, outside }));
  }
  CF.setProvinceDitches(false);
  ok(CF.osmDitchesAt(21, 21) === false, 'the flag is off by default');
  CF.setProvinceDitches(true);
  ok(CF.osmDitchesAt(21, 21) && !CF.osmDitchesAt(5, 5), 'only in the blocks the tiles cover');
  const p = CF.parcelAt(21700, 21600);
  ok(p.dDitch > 100 && p.dMain > 100 && p.dMaar > 100, 'the parcel lookup knows no ditch distance');
  CF.setProvinceDitches(false);
  CF.setProvinceBlocks(null);
}

// the land use of the tiles (OSM landuse) over the hash (#124): no herd on arable, herds on a meadow (the wire of the meadow is gone, #1092)
{
  const CS = await import('../game/js/countryside.js');
  const CF = await import('../game/js/countryfield.js');
  CF.setCountryBounds([-2000, -2000, 2000, 2000]);
  const run = (use) => {
    CE.setExtraUse(use ? () => use : null);
    let animals = 0;
    for (let tx = 40; tx < 46; tx++) for (let ty = 40; ty < 46; ty++) {
      const t = CS.countryTileItems(tx, ty);
      animals += t.animals.filter((a) => a.kind === 'cow' || a.kind === 'sheep' || a.kind === 'horse').length;
    }
    CE.setExtraUse(null);
    return { animals };
  };
  const hash = run(null), akker = run('akker'), weide = run('weide');
  // #1092: zonder echte weide geen vee (geen verzonnen kavels); een echte weide houdt zijn kudden, ook als het hash-rooster uit staat
  ok(hash.animals === 0, 'the hash alone makes no herds (no real meadow, no cattle)', JSON.stringify(hash));
  ok(akker.animals === 0, 'no herd grazes on arable', JSON.stringify(akker));
  ok(weide.animals > 20, 'a real meadow keeps its herds', JSON.stringify(weide));
  CF.setCountryFiction(true);
  const fic = run(null);
  ok(fic.animals > 20, 'with the generator switched on (unit tests only) the hash makes herds again', JSON.stringify(fic));
  CF.setCountryFiction(false);
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

// the mapped hedges of the tiles stay queryable (the trim of tilegreenery.js), the countryside does not look at them any more
{
  const { TileWorld } = await import('../game/js/tileworld.js');
  ok(TileWorld.prototype.hedgeNear.call({}, 0, 0, 5).length === 0, 'a world without mapped hedges is silent');
}

console.log(`${n} checks, ${fails} failed`);
process.exit(fails ? 1 : 0);
