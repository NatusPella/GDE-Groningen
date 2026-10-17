// Teleports to the edge of the map (issue #81): the four corners, the Lauwersmeer
// shore (Lauwersoog, Zoutkamp, the NW corner), the twelve wereldeinden and a spot
// 22 tiles outside the extract. Each goes through the 'Overal en nergens' code path
// (cheats.js teleportSpot) with the tiles around it streamed in; nothing may throw
// and a spot inside the data must give an answer. Needs game/world with the
// province layer (desktop stage).
//   node scripts/edge_smoke_test.mjs
import './node3d.mjs';
import fs from 'node:fs';

globalThis.requestAnimationFrame = (f) => setImmediate(f);
const root = new URL('../game/world/', import.meta.url);
const alt = new URL('../desktop/build/game/world/', import.meta.url);
const dir = fs.existsSync(new URL('index-provincie.json', root)) ? root : fs.existsSync(new URL('index-provincie.json', alt)) ? alt : null;
if (!dir) { console.log('SKIP no game/world with the province layer'); process.exit(0); }

await import('../game/js/mapdata.js');
await import('../game/js/player.js');
const G = await import('../game/js/gdt.js');
const S = await import('../game/js/tilestore.js');
const TW = await import('../game/js/tileworld.js');
const WL = await import('../game/js/waterlevels.js');
const WI = await import('../game/js/waterindex.js');
const CH = await import('../game/js/cheats.js');

let n = 0, fails = 0;
const ok = (c, m, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${m}${info ? ' (' + info + ')' : ''}`); } };

const files = new Proxy({}, { get: (o, f) => (typeof f === 'string' ? (o[f] || (o[f] = new Uint8Array(fs.readFileSync(new URL(f, dir))))) : undefined) });
const T = await TW.loadTileWorld('world/', { source: new S.MemorySource(files), pool: false, extra: ['index-provincie.json'] });
const map = T.world, idx = T.index;
const has = (i, j) => !!idx.tiles[G.tileKey(i, j)];

const load = async (x, y) => {
  const [i, j] = G.tileIndexOf(x, y);
  for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) {
    const k = G.tileKey(i + di, j + dj);
    if (idx.tiles[k]) await T.store.request(k, { priority: -1 });
  }
  map.tileQueue.run(1e9);
};

let I0 = 1e9, I1 = -1e9, J0 = 1e9, J1 = -1e9;
for (const t of Object.values(idx.tiles)) { I0 = Math.min(I0, t.i); I1 = Math.max(I1, t.i); J0 = Math.min(J0, t.j); J1 = Math.max(J1, t.j); }
const nearest = (ci, cj) => {
  let best = null;
  for (const t of Object.values(idx.tiles)) {
    const d = Math.hypot(t.i - ci, t.j - cj);
    if (!best || d < best.d) best = { d, t };
  }
  const o = G.tileOrigin(best.t.i, best.t.j);
  return [o[0] + 500, o[1] + 500];
};
// RD to the world frame (gdt.js: tile 234_581 starts at x 330, y 75)
const rd = (x, y) => [x - 233670, 582075 - y];
const spots = [
  ['NW corner', ...nearest(I0, J0)], ['NE corner', ...nearest(I1, J0)], ['SW corner', ...nearest(I0, J1)], ['SE corner', ...nearest(I1, J1)],
  ['Lauwersoog', ...rd(209800, 606900)], ['Zoutkamp', ...rd(211700, 600500)], ['Anjum', ...rd(200500, 595900)],
];
for (const e of spots) await load(e[1], e[2]);

// the twelve wereldeinden, placed as the game does
const RG = await import('../game/js/roadgraph.js');
const PW = await import('../game/js/provinceworld.js');
const L = idx.layers && idx.layers.provincie;
if (L && L.global) {
  PW.initProvince({ index: idx, world: map });
  const zlib = await import('node:zlib');
  const rows = RG.decodeRoadNet(JSON.parse(zlib.gunzipSync(Buffer.from(files[L.global.roadsFile])).toString()));
  RG.setRoadNet(rows);
  const W = await import('../game/js/worldends.js');
  for (const e of W.worldEndDebug()) spots.push(['wereldeinde ' + e.id, e.x, e.y]);
}
// 22 tiles outside the extract (SW)
spots.push(['22 tiles SW of the extract', G.tileOrigin(I0 - 22, J1 + 22)[0] + 500, G.tileOrigin(I0 - 22, J1 + 22)[1] + 500]);

for (const [name, x, y] of spots) {
  try {
    await load(x, y);
    // the queries a player standing there and the vehicles, boats and GPS make, on a grid round the spot
    for (let dx = -300; dx <= 300; dx += 100) for (let dy = -300; dy <= 300; dy += 100) {
      const px = x + dx, py = y + dy;
      WL.waterAt(map, px, py); WI.waterClearance(map, px, py, 8); map.nearestRoadPoint(px, py, 200, true, true);
      map.groundHeightAt && map.groundHeightAt(px, py, 0); map.surfaceAt && map.surfaceAt(px, py, { z: 0, ribbon: null });
      map.findOpenSpawn(px, py, 60, true); map.isOnBridge(px, py); map.escapeBuilding(px, py, 1);
    }
    for (const car of [false, true]) {
      const s = CH.teleportSpot(map, x, y, car);
      const inside = has(...G.tileIndexOf(x, y));
      ok(!inside || (s && Number.isFinite(s.x) && Number.isFinite(s.y)), `${name}: a spot inside the data gives an answer`, `${x},${y} car ${car}`);
      if (s) {
        map.groundHeightAt && map.groundHeightAt(s.x, s.y, 0);
        map.escapeBuilding(s.x, s.y, 1.2);
        map.isOnBridge(s.x, s.y);
        await load(s.x, s.y);
        RG.roadNetReady() && RG.snapRoad(s.x, s.y, 600);
      }
    }
  } catch (e) {
    ok(false, `${name}: no error`, `${x},${y} ${e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e}`);
  }
}
console.log(`${n} checks, ${fails} failed (${spots.length} spots)`);
process.exit(fails ? 1 : 0);
