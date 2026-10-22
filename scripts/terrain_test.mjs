// The AHN terrain hook (docs/PROVINCIE-PLAN.md 2.7):
//   node scripts/terrain_test.mjs
// - a raster round trip (int16 cm), bilinear sampling, no data;
// - the RASTER section of a tile (gdt.js) and the field a TileWorld keeps;
// - flat by default: a map without rasters answers 0 everywhere, and the
//   height solvers take a terrain sampler (a raised field lifts the profile
//   with it, relative heights stay);
// - with fetched rasters (scripts/world/fetch_ahn.py --fetch, not committed):
//   finite heights inside, street level near 0.
import './node3d.mjs';
import fs from 'node:fs';

const T = await import('../game/js/terrainraster.js');
const G = await import('../game/js/gdt.js');
const RP = await import('./world/railprofile.mjs');

let n = 0, fails = 0;
const ok = (cond, name, info = '') => { n++; if (!cond) { fails++; console.log(`FAIL ${name}${info ? ' (' + info + ')' : ''}`); } };

// a 4 x 3 raster: height = x / 10 + y / 100 at the cell centres
const w = 4, h = 3, cell = 5, x0 = 1000, y0 = 2000;
const values = [];
for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) values.push((x0 + (i + 0.5) * cell) / 10 + (y0 + (j + 0.5) * cell) / 100);
values[11] = NaN;
const R = T.encodeTerrainRaster({ x0, y0, cell, w, h, values });
ok(R.codec === T.RASTER_CODEC.i16cm && R.data.length === w * h * 2, 'int16 cm per cell');
const D = T.decodeTerrainRaster(R);
ok(Math.abs(D.z[5] - values[5]) < 0.006 && Number.isNaN(D.z[11]), 'round trip to the cm, no data kept');
const mid = T.sampleRaster(D, x0 + 1.0 * cell, y0 + 1.0 * cell);
ok(Math.abs(mid - ((x0 + 5) / 10 + (y0 + 5) / 100)) < 0.01, 'bilinear between the cell centres', mid);
ok(T.sampleRaster(D, x0 - 10, y0) === null, 'outside: null');
ok(T.sampleRaster(D, x0 + 3.7 * cell, y0 + 2.7 * cell) === null, 'on no data: null');
// the tile section and back
const blob = G.encodeBlob({ i: 0, j: 0, sections: [{ type: G.SECTION.RASTER, raster: R }] });
const back = G.decodeBlob(blob).sections.find((s) => s.type === G.SECTION.RASTER).raster;
ok(back.w === w && back.codec === 1 && back.data.length === R.data.length && back.data.every((v, i) => v === R.data[i]), 'RASTER section round trip (2 bytes a cell)');
const field = new T.TerrainField();
ok(field.at(x0 + 7, y0 + 7) === 0, 'an empty field is flat');
field.add('t', back);
ok(Math.abs(field.at(x0 + 7.5, y0 + 7.5) - ((x0 + 7.5) / 10 + (y0 + 7.5) / 100)) < 0.01 && field.at(0, 0) === 0, 'a field: the raster inside, flat outside');
field.drop('t');
ok(field.size === 0 && field.at(x0 + 7, y0 + 7) === 0, 'dropped: flat again');

// the game map is flat without rasters
const { GameMap } = await import('../game/js/mapdata.js');
const map = new GameMap({ meta: { bounds: [-10, -10, 10, 10] }, roads: [], buildings: [], water: [], green: [], trees: [] });
ok(map.terrainAt(3, 4) === 0, 'GameMap.terrainAt is flat by default');

// the solvers take a terrain: a field raised 2 m lifts the track with it
const line = (a, b, step = 50) => { const P = []; for (let x = a; x <= b; x += step) P.push([x, 0]); return P; };
const mk = () => ({ rails: [{ pts: line(-3010, 2990) }], roads: [{ pts: [[0, -50], [0, 50]], cat: 'normal', type: 'residential', width: 6 }], levelCrossings: [], railLifts: [{ x: 0, y: 0, h: 6, plateau: 8, ramp: 120 }], railRoutes: [] });
const flat = RP.solve(mk());
const raised = RP.solve(mk(), { terrain: () => 2 });
const zf = [...flat.rails.values()][0], zr = [...raised.rails.values()][0];
ok(zf && zr && zf.every((z, i) => Math.abs(z - zr[i]) < 0.02), 'over a raised terrain the profile is the same above it');

// ?terrain (#78): a dyke of 5 m across a polder; the ground, a road on it and one on a viaduct follow
{
  const dx0 = 0, dy0 = 0, dcell = 10, dw = 40, dh = 10;
  const vals = [];
  for (let j = 0; j < dh; j++) for (let i = 0; i < dw; i++) { const d = Math.abs((i + 0.5) * dcell - 200); vals.push(d < 20 ? 5 - d / 20 * 5 + 0 : -1 + (d < 60 ? (60 - d) / 40 * 0 : 0)); }
  const crest = T.encodeTerrainRaster({ x0: dx0, y0: dy0, cell: dcell, w: dw, h: dh, values: vals });
  const dm = new GameMap({ meta: { bounds: [0, 0, 400, 100] }, roads: [
    { pts: [[0, 50], [400, 50]], cat: 'normal', type: 'residential', width: 6 },
    { pts: [[100, 80], [300, 80]], cat: 'normal', type: 'primary', width: 8, z: [4, 4], bridge: true },
  ], buildings: [], water: [], green: [], trees: [] });
  dm.terrain = new T.TerrainField(); dm.terrain.add('d', crest);
  const flatZ = dm.groundHeightAt(200, 20, 0);
  ok(flatZ === 0 && dm.surfaceAt(200, 20, { z: 0, ribbon: null }).z === 0, 'terrain off: the dyke does not exist');
  dm.terrainOn = true;
  const top = dm.groundHeightAt(200, 20, 0), foot = dm.groundHeightAt(100, 20, 0);
  ok(top > 3.5 && foot < -0.8, 'terrain on: the ground is the dyke crest and the polder', `${top} ${foot}`);
  const st = dm.surfaceAt(200, 20, { z: 3.9, ribbon: null });
  ok(Math.abs(st.z - top) < 0.01, 'surfaceAt: a walker at the crest stays on it', st.z);
  const rb = dm.ribbonAt(200, 80, 7.7);
  ok(rb && rb.type === 'primary', 'ribbonAt: the bridge over the dyke is found at its absolute height', rb && rb.type);
  ok(dm.ceilingAt(200, 20, 3.9) === Infinity, 'ceilingAt: nothing above the crest');
  const under = dm.surfaceAt(200, 80, { z: 7.7, ribbon: null });
  ok(Math.abs(under.z - (3.75 - (await import('../game/js/deckterrain.js')).DECK_DEADBAND + 4)) < 0.05 && under.kind === "road", 'a bridge with z 4 over a dyke: follows the crest (less the deadband) + 4', `${under.z} ${under.kind}`);
}

// the province build puts the raster in the tile (build_province.mjs --terrain)
{
  const { tileBlob } = await import('./world/build_corridor.mjs');
  const [ox, oy] = G.tileOrigin(0, 0);
  const ras = T.encodeTerrainRaster({ x0: ox, y0: oy, cell: 25, w: 40, h: 40, values: new Float32Array(1600).fill(3.5) });
  const list = [{ kind: 'roads', row: { pts: [[ox + 10, oy + 10], [ox + 200, oy + 10]], cat: 'normal', type: 'residential', width: 6 } }];
  const gid = { roads: 0, buildings: 0, water: 0, green: 0, trees: 0, canopies: 0, furniture: 0 };
  const tb = tileBlob(0, 0, list, gid, 1, 1, null, { terrain: ras });
  const sec = tb && G.decodeBlob(tb.bytes).sections.find((q) => q.type === G.SECTION.RASTER);
  ok(sec && sec.raster.w === 40 && Math.abs(T.decodeTerrainRaster(sec.raster).z[7] - 3.5) < 0.01, 'tileBlob: the tile carries its terrain raster');
}

// fetched rasters (optional)
// a road that is no deck runs on the terrain at its vertices, straight in between (#269): the raster's
// kinks (here a 20 m dip between the vertices) do not reach a car on the road
{
  const { roadTerrainAt } = await import('../game/js/deckterrain.js');
  const bump = (x) => (Math.abs(x - 50) < 10 ? -3 : 0); // the dip between two vertices
  const road = { pts: [[0, 0], [100, 0]], cat: 'normal', type: 'primary', width: 8 };
  ok(roadTerrainAt(road, 50, 0, bump) === 0 && roadTerrainAt(road, 25, 0, (x) => x / 10) === 2.5, 'a road follows its vertices, not the terrain between them');
  ok(roadTerrainAt(road, -20, 3, (x) => x / 10) === 0 && roadTerrainAt(road, 140, 3, (x) => x / 10) === 10, 'beyond its ends the terrain of the end');
  const f1 = (x) => x / 10, f2 = (x) => x / 5;
  ok(roadTerrainAt(road, 50, 0, f1) === 5 && roadTerrainAt(road, 50, 0, f2) === 10, 'a new terrain sampler renews the vertex heights');
  const rm = new GameMap({ meta: { bounds: [0, 0, 200, 100] }, roads: [road], buildings: [], water: [], green: [], trees: [] });
  rm.terrain = new T.TerrainField(); rm.terrainOn = true;
  rm.terrain.at = bump;
  ok(rm.terrainBase(road, 50, 0) === 0 && rm.terrainBase(null, 50, 0) === -3, 'GameMap.terrainBase: the road on its vertices, the ground on the terrain');
}

const idx = new URL('../data/world/ahn/index.json', import.meta.url);
if (fs.existsSync(idx)) {
  const { loadTerrainField } = await import('./world/terrain.mjs');
  const F = loadTerrainField();
  const [key, t] = Object.entries(JSON.parse(fs.readFileSync(idx, 'utf8')).tiles)[0];
  const z = F.at(t.x0 + 500, t.y0 + 500);
  ok(Number.isFinite(z) && Math.abs(z) < 15, `AHN tile ${key}: a height near street level`, z);
  // the sample dyke tile (Reitdiepdijk, 229_586 at 10 m): a crest well above the polder beside it
  const dk = JSON.parse(fs.readFileSync(idx, 'utf8')).tiles['229_586'];
  if (dk && dk.abs) {
    let hi = -1e9, lo = 1e9;
    for (let y = dk.y0 + 5; y < dk.y0 + 1000; y += 10) for (let x = dk.x0 + 5; x < dk.x0 + 1000; x += 10) { const v = F.at(x, y); hi = Math.max(hi, v); lo = Math.min(lo, v); }
    ok(hi - lo > 4, 'AHN 229_586: the dyke stands 4+ m above the polder', `${lo} ${hi}`);
  }
} else console.log('(no AHN rasters fetched: scripts/world/fetch_ahn.py --fetch)');

console.log(`${n - fails}/${n} terrain checks passed`);
process.exit(fails ? 1 : 0);
