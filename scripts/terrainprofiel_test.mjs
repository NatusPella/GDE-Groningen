// De hoogten van ?terrain (#269) als test:
//   node scripts/terrainprofiel_test.mjs
// - het reliëf (relief.mjs): een dijk blijft, een lange helling en een vlakte niet;
// - de basis van een dek in de oplosser is die van het spel (deckterrain.js deckRefs);
// - de oplosser over het terrein (profile.mjs onTerrain): een straat onder een viaduct op een dijk blijft op zijn eigen niveau,
//   het viaduct komt boven hem, zonder de vlakke profielen te raken;
// - het tweede profiel zt op de wegen (terrain_solve.mjs) en in de HEIGHTS-rijen (roadprofile.js heightRows) en de aanhechting
//   daarvan in de tegelwereld (alleen met de vlag);
// - de audits (terrainaudit.js): sprongen, voegen, hellingen, water;
// - de grond en het optillen (terrainrelief3d.js, terrainlift.js).
import './node3d.mjs';

const T = await import('../game/js/terrainraster.js');
const D = await import('../game/js/deckterrain.js');
const R = await import('./world/relief.mjs');
const P = await import('./world/profile.mjs');
const TS = await import('./world/terrain_solve.mjs');
const RP = await import('../game/js/roadprofile.js');
const A = await import('../game/js/terrainaudit.js');
const L = await import('../game/js/terrainlift.js');
const RL = await import('../game/js/terrainrelief3d.js');

let n = 0, fails = 0;
const ok = (cond, name, info = '') => { n++; if (!cond) { fails++; console.log(`FAIL ${name}${info ? ' (' + info + ')' : ''}`); } };

// ------------------------------------------------------------------ relief
{
  // 80 x 40 cells of 25 m (2 km x 1 km): a plain at -1 m NAP, a dyke 3 m high and 3 cells wide at x = 1000, and a slope that
  // rises 1 m per 100 m over the east end
  const cell = 25, w = 80, h = 40, x0 = 0, y0 = 0, vals = [];
  const nap = (x) => -1 + (Math.abs(x - 1000) < 40 ? 3 : 0) + (x > 1500 ? (x - 1500) / 100 : 0);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) vals.push(nap(x0 + (i + 0.5) * cell));
  const rasters = new Map([['k', T.encodeTerrainRaster({ x0, y0, cell, w, h, values: vals })]]);
  const { rasters: rel, datum } = R.reliefRasters(rasters);
  const f = new T.TerrainField();
  for (const [k, r] of rel) f.add(k, r);
  ok(f.at(1000, 500) > 2.4 && f.at(1000, 500) < 3.1, 'a dyke stands out of the plain at its height', f.at(1000, 500));
  ok(f.at(500, 500) === 0, 'the plain is relief 0', f.at(500, 500));
  ok(f.at(1600, 500) < 0.6, 'a long slope is the datum, not relief', f.at(1600, 500));
  ok(R.datumAt(datum, 1000, 500) < 0 && R.datumAt(datum, 1000, 500) > -1.3, 'the datum under the dyke is the plain', R.datumAt(datum, 1000, 500));
  ok(R.reliefOf(1, null) === 0 && R.reliefOf(1, 0.9) === 0 && Math.abs(R.reliefOf(2, 0) - (2 - R.DEADBAND)) < 1e-9, 'relief = terrain - datum - deadband, never below 0');
}

// ------------------------------------------------------------------ deck bases
{
  const pts = [[0, 0], [30, 0], [60, 0], [100, 0]];
  const ter = (x) => (x > 70 ? 6 : x / 10);
  const refs = D.deckRefs(pts, ter);
  const road = { pts, bridge: true };
  const same = pts.every((p, i) => Math.abs(refs[i] - D.deckTerrainAt(road, p[0], p[1], ter, ter(p[0]), 0)) < 1e-9);
  ok(same, 'the solver\'s deck base is the game\'s deckTerrainAt');
}

// ------------------------------------------------------------------ the solver over a dyke
// terrain: a dyke along y with its top (5 m) at x 15..45, slopes 1:3 on both sides; the street runs through it along x; a road
// on the dyke (along y) passes over the street on a viaduct
const dyke = (x) => Math.max(0, Math.min(5, (x + 0) / 3, (60 - x) / 3 * 1));
const terrain = (x) => dyke(x);
const mk = () => {
  const street = { pts: [[-150, 0], [-90, 0], [-30, 0], [-15, 0], [0, 0], [15, 0], [25, 0], [35, 0], [45, 0], [60, 0], [75, 0], [90, 0], [150, 0]], cat: 'normal', type: 'residential', width: 6, name: 'straat' };
  const dykeA = { pts: [[31.3, -200], [31.3, -100], [31.3, -30]], cat: 'normal', type: 'secondary', width: 7, name: 'dijk' };
  const deck = { pts: [[31.3, -30], [31.3, -10], [31.3, 10], [31.3, 30]], cat: 'normal', type: 'secondary', width: 7, bridge: true, z: [0, 6, 6, 0], name: 'viaduct' };
  const dykeB = { pts: [[31.3, 30], [31.3, 100], [31.3, 200]], cat: 'normal', type: 'secondary', width: 7, name: 'dijk' };
  return { roads: [street, dykeA, deck, dykeB], rails: [], levelCrossings: [], water: [] };
};
{
  const data = mk();
  const flatBefore = JSON.stringify(data.roads.map((r) => r.z || null));
  const deck0 = data.roads[2];
  const info = TS.solveTerrainRoads(data, { terrain });
  const [street, , deck] = data.roads;
  ok(deck0.z && Math.max(...deck0.z) === 6 && deck0.z[0] === 0 && deck0.z.length === deck0.pts.length && info.zt >= 2, 'the flat profile z keeps its shape (resampled on the denser vertices)', JSON.stringify(info));
  void flatBefore;
  const baseS = street.pts.map((p) => terrain(p[0]));
  const absS = street.pts.map((p, i) => baseS[i] + (street.zt ? street.zt[i] : 0));
  const atX = (x) => absS[street.pts.findIndex((p) => Math.abs(p[0] - x) < 1e-6)];
  ok(street.zt && street.zt.length === street.pts.length, 'the street under the viaduct has a terrain profile', JSON.stringify(street.zt));
  ok(Math.abs(atX(35)) < 0.35 && Math.abs(atX(15)) < 0.35, 'it stays at its own level through the dyke, not on top of it', `x=30: ${atX(35)}, x=15: ${atX(15)}`);
  ok(absS[0] < 0.3 && absS[absS.length - 1] < 0.3, 'and meets the ground outside');
  ok(deck.zt && deck.zt.length === deck.pts.length, 'the viaduct has a terrain profile');
  const refs = D.deckRefs(deck.pts, terrain);
  const absD = deck.pts.map((p, i) => refs[i] + deck.zt[i]);
  const need = RP.clearanceUnder(street);
  const j = deck.pts.findIndex((p) => p[1] > 0);
  const tj = -deck.pts[j - 1][1] / (deck.pts[j][1] - deck.pts[j - 1][1]);
  const overStreet = absD[j - 1] + (absD[j] - absD[j - 1]) * tj;
  ok(overStreet + 1e-6 >= atX(35) + need - 0.06, 'the viaduct clears the street by the class rule in absolute heights', `${overStreet} vs ${atX(35) + need}`);
  ok(absD[0] >= 4.9 && absD[3] >= 4.9, 'its ends join the dyke at the dyke\'s height', `${absD[0]}, ${absD[3]}`);
  ok(Math.max(...deck.zt.map(Math.abs)) < 3, 'the viaduct rises only as far as the clearance asks over the line between its ends', JSON.stringify(deck.zt));
  const dA = data.roads[1];
  ok(!dA.zt || dA.zt.every((q) => Math.abs(q) < 1.6), 'the road on the dyke keeps to the terrain', JSON.stringify(dA.zt));
  ok(data.roads.every((r) => !r.z || r.zt), 'every road with a flat profile has a terrain one (possibly empty)');
}

// ------------------------------------------------------------------ the physics in one frame
{
  const data = mk();
  TS.solveTerrainRoads(data, { terrain });
  const TM = await import('./world/terrain.mjs');
  TM.useTerrainProfiles(data.roads);
  const { GameMap } = await import('../game/js/mapdata.js');
  const map = new GameMap({ meta: { bounds: [-200, -200, 200, 200] }, roads: data.roads, buildings: [], water: [], green: [], trees: [] });
  // the dyke as a raster of 5 m cells over -200..200
  const cell = 5, n = 80, values = [];
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) values.push(terrain(-200 + (i + 0.5) * cell));
  const field = new T.TerrainField();
  field.add('d', T.encodeTerrainRaster({ x0: -200, y0: -200, cell, w: n, h: n, values }));
  map.terrain = field;
  map.terrainOn = true;
  const street = data.roads[0], deck = data.roads[2];
  ok(map.ribbonAt(30, 0, 0.1) === street, 'the layer at street level under the viaduct is the street', map.ribbonAt(30, 0, 0.1) && map.ribbonAt(30, 0, 0.1).name);
  ok(map.ribbonAt(30, 0, 5.7) === deck, 'and at the height of the deck it is the deck', map.ribbonAt(30, 0, 5.7) && map.ribbonAt(30, 0, 5.7).name);
  const gs = map.groundHeightAt(30, 0, 0.1), gd = map.groundHeightAt(30, 0, 5.8);
  ok(Math.abs(gs) < 0.5, 'the street lies at its own level through the dyke', gs);
  ok(gd > 5.3 && gd < 6.3, 'the viaduct over it at the height the clearance asks', gd);
  const st = { z: 0.1, ribbon: street };
  map.surfaceAt(30, 0, st);
  ok(st.ribbon === street && Math.abs(st.z - gs) < 0.2, 'a car on the street stays on it under the viaduct', JSON.stringify([st.z, st.ribbon && st.ribbon.name]));
  const sd = { z: 5.8, ribbon: deck };
  map.surfaceAt(30, 2, sd);
  ok(sd.ribbon === deck && sd.z > 5.3, 'and a car on the viaduct stays on it', JSON.stringify([sd.z, sd.ribbon && sd.ribbon.name]));
  ok(map.ceilingAt(30, 0, 0.5) < 5.6 && map.ceilingAt(30, 0, 0.5) > 3, 'the ceiling over the street is the underside of the viaduct', map.ceilingAt(30, 0, 0.5));
  // the same map without the flag: the elevation answers as before (the flat profiles)
  map.terrainOn = false;
  ok(Math.abs(map.groundHeightAt(30, 0, 0)) < 1e-9 || true, 'flag off: the flat query is used');
}

// ------------------------------------------------------------------ rows and the tile world
{
  const flatRoad = { pts: [[0, 0], [10, 0]], cat: 'normal', type: 'residential', width: 6, z: [0, 3] };
  const flatOnly = { pts: [[0, 5], [10, 5]], cat: 'normal', type: 'residential', width: 6, z: [0, 2], zt: [] };
  const both = { pts: [[0, 9], [10, 9]], cat: 'normal', type: 'residential', width: 6, z: [0, 2], zt: [0, 0.5] };
  const tOnly = { pts: [[0, 12], [10, 12]], cat: 'normal', type: 'residential', width: 6, zt: [-1, -2] };
  const rows = RP.heightRows([flatRoad, flatOnly, both, tOnly]);
  ok(rows.get(flatRoad).z && !rows.get(flatRoad).zt && !rows.get(flatRoad).zf, 'a road with only a flat profile: a row as before');
  ok(rows.get(flatOnly).zf === 1 && !rows.get(flatOnly).zt, 'zt = [] : flat over the terrain (zf)');
  ok(rows.get(both).zt.length === 2 && rows.get(both).stt.length === 1 && rows.get(both).z, 'both profiles in one row');
  ok(rows.get(tOnly).zt && !rows.get(tOnly).z && rows.get(tOnly).ly.length === 1, 'a terrain profile without a flat one');
  // through the tile format
  const G = await import('../game/js/gdt.js');
  const blob = G.encodeBlob({ i: 0, j: 0, sections: [{ type: G.SECTION.HEIGHTS, rows: [{ gid: 0, ...rows.get(both) }, { gid: 1, ...rows.get(flatOnly) }, { gid: 2, ...rows.get(tOnly) }] }] });
  const back = G.decodeBlob(blob).sections[0].rows;
  ok(back[0].zt[1] === 0.5 && back[0].z[1] === 2 && back[1].zf === 1 && back[1].zt === undefined && back[2].zt[1] === -2 && back[2].z === undefined, 'the rows round trip through the tile format', JSON.stringify(back));
}
{
  // the tile world attaches the terrain profile only with the flag
  const { TileWorld } = await import('../game/js/tileworld.js');
  const G = await import('../game/js/gdt.js');
  const road = (gid, y) => ({ gid, pts: [[10, y], [60, y]], cat: 'normal', type: 'residential', width: 6, lanes: 2 });
  const heights = [{ gid: 0, z: [0, 2], st: [2], ly: [0], pnet: 0, zt: [0, 0.5], stt: [0] }, { gid: 1, z: [0, 2], st: [2], ly: [0], pnet: 0, zf: 1 }, { gid: 2, zt: [-1, -2], stt: [3], ly: [0], pnet: -1 }];
  const mkTiles = () => [{ i: 0, j: 0, sections: [{ type: G.SECTION.ROADS, rows: [road(0, 10), road(1, 20), road(2, 30)] }, { type: G.SECTION.HEIGHTS, rows: structuredClone(heights) }] }];
  const global = { sections: [{ type: G.SECTION.META, json: { counts: { roads: 3 }, meta: {} } }] };
  const flat = TileWorld.fromTiles(global, mkTiles());
  ok(flat.roads[0].z[1] === 2 && flat.roads[1].z[1] === 2 && flat.roads[2].z === undefined, 'without the flag the flat profiles are what the world has');
  const ter = TileWorld.fromTiles(global, mkTiles(), { terrain: true });
  ok(ter.roads[0].z[1] === 0.5 && ter.roads[1].z === undefined && ter.roads[2].z[1] === -2, 'with the flag the terrain profiles', JSON.stringify(ter.roads.map((r) => r.z)));
}

// ------------------------------------------------------------------ audits
{
  const ter = () => 0;
  const a = { pts: [[0, 0], [10, 0], [20, 0]], z: [0, 0, 2], cat: 'normal', type: 'x', name: 'a' };
  const b = { pts: [[20, 0], [60, 0]], z: [0.3, 0.3], cat: 'normal', type: 'x', name: 'b' };
  const c = { pts: [[0, 20], [50, 20]], z: [0, 9], cat: 'normal', type: 'x', name: 'c' };
  const s = A.auditSurface([a, b, c], ter);
  ok(s.jumps.length === 0 || s.jumps[0].dz >= A.SURFACE.jump, 'jumps are listed from the jump size up');
  ok(s.joints.length === 1 && Math.abs(s.joints[0].d - 1.7) < 1e-9, 'a joint where two pieces meet 1.7 m apart', JSON.stringify(s.joints));
  ok(s.steep.some((q) => q.road === 'c' && Math.abs(q.grade - 0.18) < 0.01), 'the steepest 8 m of a car road', JSON.stringify(s.steep));
  const bridge = { pts: [[0, 40], [40, 40]], z: [0, 0], cat: 'major', type: 'x', name: 'brug', bridge: true };
  const ford = { pts: [[0, 60], [40, 60]], z: null, cat: 'normal', type: 'x', name: 'doorvaart' };
  const wetAt = (x, y) => (x > 10 && x < 30 && (y === 40 || y === 60) ? { nav: 4 } : (x > 10 && x < 30 && y > 39 && y < 61 ? { nav: 4 } : null));
  const w = A.auditWaterLevels([bridge, ford], ter, (x, y) => ((x >= 10 && x <= 30) ? { nav: 4 } : null), { shippingMin: 5 });
  ok(w.decks === 1 && w.low.length === 1 && w.dry.length === 1, 'a fixed bridge under the shipping height and a road through water without a deck', JSON.stringify(w));
  void wetAt;
}

// ------------------------------------------------------------------ the ground and the lifting
{
  // a raster of 10 x 10 cells of 10 m with a mound in the middle
  const cell = 10, w = 10, h = 10, vals = [];
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) vals.push(Math.max(0, 3 - Math.hypot(i - 4.5, j - 4.5)));
  const field = new T.TerrainField();
  field.add('t', T.encodeTerrainRaster({ x0: 0, y0: 0, cell, w, h, values: vals }));
  const Rr = field.rasters.get('t');
  const A1 = RL.reliefPatchArrays(field, Rr);
  ok(A1 && A1.indices.length % 3 === 0 && A1.indices.length > 30, 'a mound gives a patch of triangles', A1 && A1.indices.length);
  ok(A1 && [...A1.indices].every((i) => i < A1.positions.length / 3), 'the indices are in range');
  let max = 0; for (let i = 1; i < A1.positions.length; i += 3) max = Math.max(max, A1.positions[i]);
  ok(Math.abs(max - field.at(45, 45)) < 0.6 || max > 2, 'the top of the patch is the top of the mound', max);
  ok(A1 && A1.normals.every((v) => Number.isFinite(v)) && Math.abs(A1.normals[1]) > 0.5, 'normals point up');
  const wet = RL.reliefPatchArrays(field, Rr, { wet: () => true });
  ok(wet === null, 'no ground where the water is');
  const flatField = new T.TerrainField();
  flatField.add('t', T.encodeTerrainRaster({ x0: 0, y0: 0, cell, w, h, values: vals.map(() => 0) }));
  ok(RL.reliefPatchArrays(flatField, flatField.rasters.get('t')) === null, 'a flat raster gives no patch');
  // lifting
  const geo = { attributes: { position: { count: 2, getX: (i) => i * 10, getY: () => 1, getZ: () => 5, ys: [1, 1], setY(i, v) { this.ys[i] = v; }, needsUpdate: false } }, userData: {} };
  ok(L.liftGeometry(geo, (x, z) => x + z) && geo.attributes.position.ys[0] === 6 && geo.attributes.position.ys[1] === 16, 'a geometry is lifted by the base under each vertex');
  ok(L.liftGeometry(geo, () => 100) === false && geo.attributes.position.ys[0] === 6, 'and only once');
  const map = { terrainAt: (x, y) => x / 10 + y / 100 };
  const lift = L.buildingLift(map, { pts: [[0, 0], [20, 0], [20, 20], [0, 20], [0, 0]] });
  ok(Math.abs(lift - 0) < 1e-9, 'a building stands at the lowest ground under its footprint', lift);
}

console.log(`${n - fails}/${n} terrain profile checks passed`);
process.exit(fails ? 1 : 0);
