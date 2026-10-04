// Ommeland props on the roads: lays out a sample of countryside tiles the
// way the streamer does (countryside.js countryTileItems, reeds included)
// and measures every tree, hedge, fence, reed clump, bale and farm prop
// against the paved ways the ground shader paints (countryedge.js roadGap:
// real roads, cycle paths, drives, polder roads, village streets).
//   on road   the prop's foot is on the asphalt / klinkers
//   shoulder  closer to the road edge than its own clearance (SHOULDER)
//   node scripts/country_props_audit.mjs [--tiles=N] [--list] [--max=N] [--low]
// --low lays the tiles out as on the Laag graphics preset.
// Also counts the real building boxes standing on a road.
// Exits 1 when more than --max (default 0) props or --max-buildings
// (default 5) buildings stand on a road.
import './node3d.mjs';
import fs from 'node:fs';
import zlib from 'node:zlib';

const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find((x) => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const N_TILES = +opt('tiles', 500);
const MAX = +opt('max', 0);
const BMAX = +opt('max-buildings', 5);
const LIST = args.includes('--list');

const root = new URL('../game/', import.meta.url);
const { GameMap, applyMapExtras } = await import('../game/js/mapdata.js');
const data = JSON.parse(fs.readFileSync(new URL('citymap.json', root)));
applyMapExtras(data, JSON.parse(fs.readFileSync(new URL('mapextras.json', root))));
const map = new GameMap(data);
const F = await import('../game/js/countryfield.js');
const { initReal } = await import('../game/js/countryreal.js');
const { roadGap, realBuildingRoadHits, EDGE } = await import('../game/js/countryedge.js');
const { REAL } = await import('../game/js/countryreal.js');
const { ensureCountryEdge } = await import('../game/js/countryplan.js');
const { countryTileItems, setCountryPropLevel } = await import('../game/js/countryside.js');
if (args.includes('--low')) setCountryPropLevel('laag');

F.setCountryBounds(map.meta.bounds);
const om = JSON.parse(fs.readFileSync(new URL('ommeland.json', root)));
const bin = zlib.gunzipSync(fs.readFileSync(new URL('ommeland.bin', root)));
initReal(map, { ...om, bin: bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength) });
ensureCountryEdge(map);

// clearance from the road edge each kind needs (m): canopies and hedges
// keep their crown off the asphalt, posts and reeds may stand at the edge
const SHOULDER = {
  tree: 1.2, poplar: 1.2, willow: 1.2, hedge: 1.0, post: 0.3, wire: 0.3, gate: 0.5, bale: 1.0, reed: 0.3,
  barrack: 1.5, shed: 1.5, mestsilo: 1.5, towersilo: 1.5, feedsilo: 1.5, clamp: 1.5, plough: 1,
  tractorBody: 1, tractorBase: 1, trailerBody: 1, trailerBase: 1, grave: 0.5, glass: 1.5, clubhouse: 1.5,
  mast: 0.5, goal: 1, barrier: 0.3, bank: 0.5, rush: 0.3,
};
const kindOf = (k) => (k in SHOULDER ? k : /^(house|fkhr|folda|fsmall|fdairy)/.test(k) ? 'building' : null);
SHOULDER.building = 1.5;

const [x0, y0, x1, y1] = om.extent;
let seed = 12345;
const rnd = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
const T = 160;
const tiles = [];
for (let tries = 0; tiles.length < N_TILES && tries < N_TILES * 20; tries++) {
  const x = x0 - 3000 + rnd() * (x1 - x0 + 6000), y = y0 - 3000 + rnd() * (y1 - y0 + 6000);
  if (F.edgeDistance(x, y) < -60) continue;
  tiles.push([Math.floor(x / T), Math.floor(y / T)]);
}

const per = {};
const bad = [];
let total = 0, onRoad = 0, shoulder = 0;
const t0 = Date.now();
for (const [tx, ty] of tiles) {
  const tile = countryTileItems(tx, ty);
  for (const k in tile.items) {
    const kind = kindOf(k);
    if (!kind) continue;
    const m = tile.items[k].m;
    for (let i = 0; i < m.length; i += 16) {
      const x = m[i + 12], y = m[i + 14];
      const g = roadGap(x, y, 6);
      const P = per[kind] || (per[kind] = { n: 0, road: 0, shoulder: 0 });
      P.n++; total++;
      if (g < 0) { P.road++; onRoad++; bad.push([kind, x, y, g]); }
      else if (g < SHOULDER[kind]) { P.shoulder++; shoulder++; }
    }
  }
}
console.log(`${tiles.length} tiles, ${total} props in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
console.log('kind'.padEnd(12), 'props'.padStart(7), 'on road'.padStart(8), 'shoulder'.padStart(9));
for (const [k, P] of Object.entries(per).sort((a, b) => b[1].road - a[1].road || b[1].shoulder - a[1].shoulder)) {
  if (P.road || P.shoulder || LIST) console.log(k.padEnd(12), String(P.n).padStart(7), String(P.road).padStart(8), String(P.shoulder).padStart(9));
}
console.log(`TOTAL on road ${onRoad}, in shoulder ${shoulder}`);

// the hedges and fences as walls (countrywalls.js): vaultable, off the
// roads, and a walker is held back by them
const CW = await import('../game/js/countrywalls.js');
const { vaultDecision } = await import('../game/js/vaultkit.js');
let walls = 0, wallRoad = 0, notVault = 0, held = 0, tested = 0;
for (const [tx, ty] of tiles.slice(0, 200)) {
  const W = countryTileItems(tx, ty).walls || [];
  CW.setTileWalls(tx, ty, W);
  for (let k = 0; k < W.length; k += 6) {
    walls++;
    if (roadGap((W[k] + W[k + 2]) / 2, (W[k + 1] + W[k + 3]) / 2, 2) < 0) wallRoad++;
    if (vaultDecision(W[k + 4], { landing: {} }) !== 'vault') notVault++;
    if (k % 60 === 0) {
      // walk straight at the middle of the wall: stopped short of it
      const mx = (W[k] + W[k + 2]) / 2, my = (W[k + 1] + W[k + 3]) / 2, l = Math.hypot(W[k + 2] - W[k], W[k + 3] - W[k + 1]) || 1;
      const nx = -(W[k + 3] - W[k + 1]) / l, ny = (W[k + 2] - W[k]) / l;
      const o = { x: mx + nx * 0.05, y: my + ny * 0.05 };
      tested++;
      if (CW.pushOutOfWalls(o, 0.35) && CW.wallAhead(mx + nx * 1.2, my + ny * 1.2, -nx, -ny, 1.3, 0.2)) held++;
    }
  }
  CW.clearTileWalls(tx, ty);
}
console.log(`WALLS ${walls} hedge/fence pieces in 200 tiles, ${wallRoad} on a road, ${notVault} not vaultable, ${held}/${tested} block a walker and are found ahead`);
if (wallRoad || notVault || held < tested) process.exitCode = 1;

// the real building boxes (countryreal.js) left in the tiles after
// countryedge.js clearRealBuildings: none may stand on a road
let bOn = 0, bN = 0;
for (const L of REAL.bTiles.values()) {
  for (const i of L) {
    if (F.edgeDistance(REAL.bx[i], REAL.by[i]) < -40) continue;
    bN++;
    if (realBuildingRoadHits(i)) { bOn++; if (LIST && bOn <= 20) console.log('   building', i, REAL.bx[i].toFixed(1), REAL.by[i].toFixed(1)); }
  }
}
const fx = EDGE.buildingFix || {};
console.log(`BUILDINGS ${bN} in the Ommeland, ${bOn} on a road (load-time fix: ${fx.clipped} shortened, ${fx.dropped} dropped of ${fx.checked}, in ${fx.ms} ms, ${fx.sampled} sampled)`);
if (LIST) for (const b of bad.slice(0, 40)) console.log('  ', b[0], b[1].toFixed(1), b[2].toFixed(1), 'gap', b[3].toFixed(2));
process.exit(onRoad > MAX || bOn > BMAX || process.exitCode ? 1 : 0);
