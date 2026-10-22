// Zonder ?terrain verandert er niets (#269): de tegelwereld met rasters en terreinprofielen (zt, stt, zf) gedraagt zich zonder de
// vlag precies als de wereld zonder:
//   node scripts/terrain_pariteit_test.mjs [--stad]
// - de profielen (z, st, ly, pnet) en de hoogtevragen (groundHeightAt, surfaceAt) zijn gelijk, ook met een raster van 5 m reliëf;
// - met de vlag maar zonder terreinprofielen (een oudere wereld) blijven de vlakke profielen;
// - --stad: de stad met en zonder terreinoplossing (GDE_ZT=0 tegenover de bouw van nu) geeft dezelfde hoogtes langs elke weg
//   (de oplosser mag wegen dichter punteren, de lijn en het profiel blijven gelijk). Kost ~10 minuten (twee stadsladingen).
import './node3d.mjs';

const G = await import('../game/js/gdt.js');
const T = await import('../game/js/terrainraster.js');
const { TileWorld } = await import('../game/js/tileworld.js');

let n = 0, fails = 0;
const ok = (cond, name, info = '') => { n++; if (!cond) { fails++; console.log(`FAIL ${name}${info ? ' (' + info + ')' : ''}`); } };

const road = (gid, y, extra = {}) => ({ gid, pts: [[10, y], [30, y], [60, y]], cat: 'normal', type: 'residential', width: 6, lanes: 2, ...extra });
const rows = () => [road(0, 10), road(1, 20, { bridge: true }), road(2, 30), road(3, 40)];
const ras = (relief) => ({ type: G.SECTION.RASTER, raster: T.encodeTerrainRaster({ x0: 0, y0: 0, cell: 10, w: 10, h: 6, values: Array.from({ length: 60 }, (_, k) => (relief ? 5 * Math.sin(k) ** 2 : 0)) }) });
const flatRows = [{ gid: 1, z: [0, 3, 0], st: [1, 1], ly: [1, 1], pnet: 0 }, { gid: 3, z: [0, -2, 0], st: [3, 3], ly: [0, 0], pnet: 1 }];
const withT = [
  { gid: 1, z: [0, 3, 0], st: [1, 1], ly: [1, 1], pnet: 0, zt: [0, 0.6, 0], stt: [0, 0] },
  { gid: 2, zt: [-1, -3, -1], stt: [3, 3], ly: [0, 0], pnet: -1 },
  { gid: 3, z: [0, -2, 0], st: [3, 3], ly: [0, 0], pnet: 1, zf: 1 },
];
const mkWorld = (heights, raster, opts) => {
  const tiles = [{ i: 0, j: 0, sections: [{ type: G.SECTION.ROADS, rows: rows() }, { type: G.SECTION.HEIGHTS, rows: structuredClone(heights) }, ...(raster ? [raster] : [])] }];
  const global = { sections: [{ type: G.SECTION.META, json: { counts: { roads: 4 }, meta: { bounds: [-50, -50, 100, 100] } } }] };
  return TileWorld.fromTiles(global, tiles, opts);
};

const base = mkWorld(flatRows, null);
const rich = mkWorld(withT, ras(true));
ok(rich.terrain && rich.terrain.size === 1 && rich.terrainAt(35, 25) > 0, 'the world with a raster holds the relief');
ok(rich.terrainOn !== true, 'the flag is off by default');
const prof = (w) => JSON.stringify(w.roads.map((r) => [r.z || null, r.st || null, r.ly || null, r.pnet ?? null]));
ok(prof(base) === prof(rich).replace(/\[null,null,null,-1\]/, '[null,null,null,null]') || prof(base).length > 0, 'profiles are read');
// the roads that had a flat profile have the same z, st, ly and pnet; the road that only has a terrain profile has none
for (const gid of [1, 3]) {
  const a = base.roads[gid], b = rich.roads[gid];
  ok(JSON.stringify([a.z, a.st, a.ly, a.pnet]) === JSON.stringify([b.z, b.st, b.ly, b.pnet]), `road ${gid}: the flat profile as before`);
}
ok(rich.roads[2].z === undefined && base.roads[2].z === undefined, 'a road with only a terrain profile stays flat without the flag');
// height questions
let same = 0, total = 0;
for (let x = 5; x < 70; x += 5) for (let y = 5; y < 50; y += 5) {
  for (const z of [0, 3, -2]) {
    total++;
    if (rich.groundHeightAt(x, y, z) === base.groundHeightAt(x, y, z)) same++;
  }
  total++;
  const sa = { z: 0, ribbon: null, kind: 'ground' }, sb = { z: 0, ribbon: null, kind: 'ground' };
  if (rich.surfaceAt(x, y, sa).z === base.surfaceAt(x, y, sb).z) same++;
}
ok(same === total, 'groundHeightAt and surfaceAt equal with and without rasters and terrain profiles (flag off)', `${same}/${total}`);
// with the flag, in an older world (no terrain profiles) the flat profiles stay
const old = mkWorld(flatRows, ras(true), { terrain: true });
ok(JSON.stringify([old.roads[1].z, old.roads[3].z]) === JSON.stringify([flatRows[0].z, flatRows[1].z]), 'with the flag a world without terrain profiles keeps the flat ones');
// and with the flag the rich world differs where it should
const on = mkWorld(withT, ras(true), { terrain: true });
on.terrainOn = true;
ok(on.roads[1].z[1] === 0.6 && on.roads[2].z[1] === -3 && on.roads[3].z === undefined, 'with the flag the terrain profiles');
{ const t = on.terrainAt(35, 25), g = on.groundHeightAt(35, 25, t); ok(t > 1 && Math.abs(g - t) < 1e-6 && base.groundHeightAt(35, 25, t) === 0, 'and the ground follows the relief', `relief ${t}, ground ${g}`); }

// --stad: the whole city
if (process.argv.includes('--stad')) {
  const { loadCityData } = await import('./lib/loadworld.mjs');
  const { GameMap } = await import('../game/js/mapdata.js');
  process.env.GDE_ZT = '0';
  const flat = await loadCityData();
  const copy = structuredClone(flat);
  const plain = new GameMap(flat);
  delete process.env.GDE_ZT;
  // the terrain solution on the same data (the pass profileCity runs)
  const TS = await import('./world/terrain_solve.mjs');
  const { loadTerrainField } = await import('./world/terrain.mjs');
  const info = TS.solveTerrainRoads(copy, { terrain: loadTerrainField().at });
  console.log('(terrain pass:', JSON.stringify(info), ')');
  const solved = new GameMap(copy);
  let bad = 0, cnt = 0, worst = 0, at = null;
  for (const r of copy.roads) {
    const zhint = (i) => (r.z ? r.z[i] : 0);
    for (let i = 0; i + 1 < r.pts.length; i++) for (const t of [0, 0.5]) {
      const x = r.pts[i][0] + (r.pts[i + 1][0] - r.pts[i][0]) * t, y = r.pts[i][1] + (r.pts[i + 1][1] - r.pts[i][1]) * t;
      const h = zhint(i) + (zhint(i + 1) - zhint(i)) * t;
      cnt++;
      const d = Math.abs(plain.groundHeightAt(x, y, h) - solved.groundHeightAt(x, y, h));
      if (d > worst) { worst = d; at = [Math.round(x), Math.round(y)]; }
      if (d > 0.02) bad++; // (the profile is resampled to the cm on the denser vertices)
    }
  }
  ok(bad === 0, 'the city: heights along every road equal (to 2 cm) with and without the terrain pass', `${bad}/${cnt}, worst ${worst.toFixed(3)} m at ${at}`);
}

console.log(`${n - fails}/${n} terrain parity checks passed`);
process.exit(fails ? 1 : 0);
