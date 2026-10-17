// ?ommelandtegels (issue #3): the province tiles as the one source inside the
// old Ommeland area. Needs game/world (desktop stage or pack_tiles + build_province).
//  - the cover: which points the tiles own (index-provincie.json flags);
//  - countryreal: covered buildings leave the tile buckets, the rest stays;
//  - countryedge: the ground shader's road pieces stop a rim inside the tile;
//  - without the cover nothing changes.
//   node scripts/ommelandtegels_test.mjs
import './node3d.mjs';
import fs from 'node:fs';

const { GameMap, applyMapExtras } = await import('../game/js/mapdata.js');
const CR = await import('../game/js/countryreal.js');
const CE = await import('../game/js/countryedge.js');
const PW = await import('../game/js/provinceworld.js');
const TW = await import('../game/js/tileworld.js');
const G = await import('../game/js/gdt.js');

const root = new URL('../game/', import.meta.url);
let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log('FAIL ' + m); } };
const read = (f) => JSON.parse(fs.readFileSync(new URL(f, root)));

if (!fs.existsSync(new URL('world/index-provincie.json', root))) { console.log('SKIP no game/world with the province layer'); process.exit(0); }
const index = read('world/index.json');
TW.mergeIndex(index, read('world/index-provincie.json'));

// --- the cover
const cover = PW.tileCoverOf(index);
const own = Object.values(index.tiles).find((t) => t.flags & PW.PFLAG.PROVINCE && t.flags & PW.PFLAG.BUILT && t.flags & PW.PFLAG.OLD);
ok(!!own, 'the province layer has a built tile inside the old Ommeland');
const [ox, oy] = G.tileOrigin(own.i, own.j);
ok(cover(ox + 500, oy + 500), 'the middle of a built province tile is covered');
ok(!cover(0, 0), 'the city centre is not covered');
ok(!cover(-90000, 0), 'far outside is not covered');

// --- the rim: a road along a tile edge
{
  CR.REAL.covered = (x, y) => x >= 0 && x < 1000 && y >= 0 && y < 1000;
  const far = CE.paintPieces([100, 500], [900, 500]);
  ok(far.length === 0, `a road deep inside a covered tile is not painted (${JSON.stringify(far)})`);
  const out = CE.paintPieces([-500, 500], [500, 500]);
  ok(out.length === 1 && out[0][0] === 0, `a road from outside into a tile is painted up to the rim (${JSON.stringify(out)})`);
  const reach = -500 + out[0][1] * 1000;
  ok(reach >= CE.TILE_RIM - 9 && reach <= CE.TILE_RIM + 9, `the rim is ${CE.TILE_RIM} m (${reach.toFixed(1)})`);
  const across = CE.paintPieces([-500, 500], [1500, 500]);
  ok(across.length === 2, 'a road across a tile is painted on both sides');
  CR.REAL.covered = null;
  const all = CE.paintPieces([100, 500], [900, 500]);
  ok(all.length === 1 && all[0][0] === 0 && all[0][1] === 1, 'without the cover the whole segment is painted');
}

// --- countryreal: the buckets
const data = read('citymap.json');
applyMapExtras(data, read('mapextras.json'));
const om = read('ommeland.json');
om.bin = (await import('node:zlib')).gunzipSync(fs.readFileSync(new URL('ommeland.bin', root)));
om.bin = om.bin.buffer.slice(om.bin.byteOffset, om.bin.byteOffset + om.bin.byteLength);
const count = () => { let n = 0; for (const L of CR.REAL.bTiles.values()) n += L.length; return n; };
const reset = () => { CR.REAL.ready = false; CR.REAL.bTiles = new Map(); CR.REAL.aTiles = new Map(); CR.REAL.rTiles = new Map(); CR.REAL.churchTiles = new Map(); CR.REAL.tileCovered = 0; };
CR.setTileCover(null);
const gm = new GameMap(data);
CR.initReal(gm, om);
const countAll = () => { let n = 0; for (const L of CR.REAL.aTiles.values()) n += L.length; return n; };
const plain = count(), roads = CR.REAL.rTiles.size, roadRows = CR.REAL.roads.length;
ok(plain > 1000 && CR.REAL.tileCovered === 0, `the old layers have buildings (${plain})`);
reset();
CR.setTileCover(cover);
CR.initReal(gm, om);
const withTiles = count();
ok(CR.REAL.tileCovered > 0 && withTiles + CR.REAL.tileCovered === plain, `covered buildings are left out: ${plain} -> ${withTiles} (${CR.REAL.tileCovered})`);
ok(withTiles > 0, 'buildings outside the tiles stay');
ok(countAll() === plain, 'the placement buckets keep every building');
ok(CR.REAL.roads.length < roadRows && CR.REAL.roads.every((r) => !r.pts.every((q) => cover(q[0], q[1]))), `roads wholly in tiles are left out: ${roadRows} -> ${CR.REAL.roads.length}`);
for (const [k, L] of CR.REAL.bTiles) for (const i of L) if (cover(CR.REAL.bx[i], CR.REAL.by[i])) { ok(false, 'a covered building is still bucketed'); break; }
console.log(`ommelandtegels: ${plain} buildings, ${CR.REAL.tileCovered} left to the tiles, ${withTiles} stay`);
console.log(fails ? `${fails} FAIL` : 'PASS');
process.exit(fails ? 1 : 0);
