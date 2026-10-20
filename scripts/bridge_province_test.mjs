// The movable bridges of the whole province (#153, #154) from the real tiles:
// how many there are, that each gets a leaf, paint and two boat signals beside
// the span, and what lies under the signal posts.
// Needs game/world with the province layer.
//   node scripts/bridge_province_test.mjs
import './node3d.mjs';
import fs from 'node:fs';

globalThis.requestAnimationFrame = (f) => setImmediate(f);
const root = new URL('../game/world/', import.meta.url);
if (!fs.existsSync(new URL('index-provincie.json', root))) { console.log('SKIP no game/world with the province layer'); process.exit(0); }
await import('../game/js/mapdata.js');
const S = await import('../game/js/tilestore.js');
const TW = await import('../game/js/tileworld.js');
const RS = await import('../game/js/roadsurface.js');
const MB = await import('../game/js/movablebridges.js');
const M3 = await import('../game/js/movablebridges3d.js');
const L = await import('../game/js/waterlevels.js');

let n = 0, fails = 0;
const ok = (c, m, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${m}${info ? ' (' + info + ')' : ''}`); } };

const files = new Proxy({}, { get: (o, f) => (typeof f === 'string' ? (o[f] || (o[f] = new Uint8Array(fs.readFileSync(new URL(f, root))))) : undefined) });
const T = await TW.loadTileWorld('world/', { source: new S.MemorySource(files), pool: false, extra: ['index-provincie.json'] });
if (!T) { console.log('SKIP no tile index'); process.exit(0); }
const map = T.world;
const keys = Object.keys(T.index.tiles);
const roads = new Set();
for (const k of keys) {
  await T.store.request(k, { priority: -1 });
  map.tileQueue.run(1e9);
  for (const t of [T.index.tiles[k]]) void t;
}
// every streamed road that is a movable bridge (the tile roads are reached through the road index)
const G = await import('../game/js/gdt.js');
for (const k of keys) {
  const t = T.index.tiles[k], o = G.tileOrigin(t.i, t.j);
  for (const r of map.roadsNear(o[0] + 500, o[1] + 500, 720)) if (r.movable && r.bridge) roads.add(r);
}
RS.setRoadNetwork(map);
const bridges = MB.buildMovableBridges({ roads: [...roads] });
const kinds = {};
for (const b of bridges) kinds[b.kind] = (kinds[b.kind] || 0) + 1;
console.log(`${bridges.length} movable bridges in the province:`, JSON.stringify(kinds));
ok(bridges.length > 0, 'the province has movable bridges');

M3.initMovableBridges3D({ add() {}, remove() {} }, map);
const views = M3._bridgeViewsForTest();
ok(views.length === bridges.length, 'a view per bridge');
let painted = 0, noPaint = 0, onWater = 0, onLand = 0, onRoad = 0;
for (const v of views) {
  const leafMeshes = v.leaves.flatMap((l) => l.leaf.children);
  if (leafMeshes.length) painted++; else noPaint++;
  ok(v.signals.length === 2, `two boat signals at ${v.b.name || 'a bridge'}`);
  for (const s of v.signals) {
    const x = s.root.position.x, y = s.root.position.z;
    const w = L.waterAt(map, x, y);
    if (w) onWater++; else onLand++;
    const dx = x - v.b.x, dy = y - v.b.y;
    const along = dx * v.b.ux + dy * v.b.uy, across = -dx * v.b.uy + dy * v.b.ux;
    ok(Math.abs(along) > v.b.len / 2 && Math.abs(across) >= v.b.half + 1.2 - 1e-6, 'the signal stands beyond the span end, beside the deck');
    // not in the middle of a carriageway
    for (const r of map.roadsNear(x, y, 6)) {
      if (r === v.b.r || r.cat === 'foot' || r.cat === 'cycle') continue;
      for (let i = 0; i < r.pts.length - 1; i++) {
        const ax = r.pts[i][0], ay = r.pts[i][1], bx = r.pts[i + 1][0] - ax, by = r.pts[i + 1][1] - ay, l2 = bx * bx + by * by || 1;
        const t = Math.max(0, Math.min(1, ((x - ax) * bx + (y - ay) * by) / l2));
        if (Math.hypot(ax + bx * t - x, ay + by * t - y) < r.width / 2) { onRoad++; i = 1e9; break; }
      }
    }
  }
}
console.log(`leaves with a road surface: ${painted} (${noPaint} flat-coloured); signal posts: ${onWater} over water, ${onLand} on land, ${onRoad} on another road`);
ok(painted === views.length, 'every leaf wears its road');
ok(onRoad <= 0.03 * views.length * 2, `almost all posts stand clear of other roads (${onRoad} of ${views.length * 2} do not; junctions at the abutments)`);
ok(onWater <= 0.05 * views.length * 2, `almost all posts stand on the bank, not in the water (${onWater} of ${views.length * 2} do not)`);
// the auto-opening rule on real spans: a tall boat on the water axis, 150 m out, heading for the deck
let triggers = 0;
for (const b of bridges) {
  MB.resetMovableBridges();
  const nx = -b.uy, ny = b.ux;
  const v = { isBoat: true, model: { kind: 'skutsje' }, x: b.x - nx * 150, y: b.y - ny * 150, speed: 5, angle: Math.atan2(ny, nx) };
  const world = { vehicles: [v], pedestrians: [], player: { x: 1e6, y: 1e6 }, time: 0 };
  for (let t = 0; t < 200 && b.state === 'closed'; t += 0.1) { v.x += nx * 0.5; v.y += ny * 0.5; MB.updateMovableBridges(0.1, world); }
  const dist = Math.hypot(v.x - b.x, v.y - b.y);
  if (b.state !== 'closed') { triggers++; ok(dist > 10 && dist < 150, `opens before the boat arrives (${dist.toFixed(0)} m out)`); }
}
ok(triggers === bridges.length, `every bridge opens for a tall boat (${triggers} of ${bridges.length})`);
console.log(fails ? `${fails} of ${n} FAILED` : `${n} province bridge checks passed`);
process.exit(fails ? 1 : 0);
