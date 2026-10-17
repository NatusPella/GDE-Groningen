// Placement over the streamed tiles (game/js/tileplace.js): what a fixed spot far
// from the player reads. Needs game/world (desktop stage, or pack_tiles +
// build_corridor + build_province).
//  - withTiles: a far spot's tiles are not in; inside the window they are, the
//    buildings and roads answer, and the pins are let go after;
//  - buildingAt / boxOf / clearOfBuildings on a real village building;
//  - roadNear finds a classed road, its class and width, and no path;
//  - a shop door (facilities.js countryDoor) lands on open ground beside a road.
//   node scripts/tileplace_test.mjs
import './node3d.mjs';

const { loadGameWorld } = await import('./worldload.mjs');
const T = await loadGameWorld();
if (!T) { console.log('SKIP no game/world with the province layer'); process.exit(0); }
const map = T.world;
const TP = await import('../game/js/tileplace.js');
const G = await import('../game/js/gdt.js');
let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FAIL ' + m); } };

// Ten Boer: a village well outside the pinned city
const X = 8572.98, Y = -6583.35;
const [ti, tj] = G.tileIndexOf(X, Y);
const key = G.tileKey(ti, tj);
ok(T.store.has(key) && !T.store.ready(key), 'the tile of Ten Boer exists and is not in yet');
ok(!TP.tilesIn(map, [[X, Y]], 100), 'tilesIn says no before');
ok(TP.buildingAt(map, X, Y, 0) === null, 'nothing is found on a tile that is not in');
let seen = null;
const res = await TP.withTiles(map, [[X, Y]], () => {
  seen = { in: TP.tilesIn(map, [[X, Y]], 100), buildings: map.buildingsNear(X, Y, 120).length, roads: map.roadsNear(X, Y, 120).length };
  return 42;
}, { radius: 120 });
ok(res === 42, 'withTiles returns what fn returns');
ok(seen.in && seen.buildings > 10 && seen.roads > 3, `the window has the village in (${JSON.stringify(seen)})`);
ok(!T.store.entries.get(key).pinned, 'the tiles are let go after');

// sliced: the tiles go in a few ms a frame, the result is the same
{
  const [X2, Y2] = [1931.4, -9027.27]; // Bedum
  const k2 = G.tileKey(...G.tileIndexOf(X2, Y2));
  ok(!T.store.ready(k2), 'the tile of Bedum is not in yet');
  const frames = { n: 0 };
  const raf = globalThis.requestAnimationFrame;
  globalThis.requestAnimationFrame = (f) => { frames.n++; raf(f); };
  const r2 = await TP.withTiles(map, [[X2, Y2]], () => map.buildingsNear(X2, Y2, 120).length, { radius: 120, slice: 0.05 });
  globalThis.requestAnimationFrame = raf;
  ok(r2 > 10 && frames.n >= 2, `a sliced window gives the same view over several frames (${r2} buildings, ${frames.n} frames)`);
}

// a building: the point inside it, the margin, its box, a way out
const b = map.buildingsNear(X, Y, 150).find((q) => q.pts.length >= 5 && q.bounds[2] - q.bounds[0] < 40 && q.bounds[2] - q.bounds[0] > 6);
ok(!!b, 'a village building to test with');
if (b) {
  const cx = (b.bounds[0] + b.bounds[2]) / 2, cy = (b.bounds[1] + b.bounds[3]) / 2;
  const inside = TP.buildingAt(map, cx, cy, 0) || TP.buildingAt(map, b.pts[0][0] * 0.999 + cx * 0.001, b.pts[0][1] * 0.999 + cy * 0.001, 0.3);
  ok(!!inside, 'a point of the building is in a building');
  const q = TP.boxOf(b);
  ok(q.w > 0 && q.l > 0 && Math.abs(q.x - cx) < (b.bounds[2] - b.bounds[0]) && TP.boxOf(b) === q, `its box is cached and holds it (${q.w.toFixed(1)} x ${q.l.toFixed(1)})`);
  const [px, py] = b.pts[0];
  ok(!!TP.buildingAt(map, px + (px < cx ? -0.5 : 0.5), py + (py < cy ? -0.5 : 0.5), 1.5), 'half a metre off its corner counts with a 1.5 m margin');
  const o = { x: cx, y: cy };
  const moved = TP.pushOutOfBuildings(map, o, 0.9);
  ok(moved && !TP.buildingAt(map, o.x, o.y, 0.2), 'pushOutOfBuildings gets a point out');
  const c = TP.clearOfBuildings(map, cx, cy);
  ok(c && !TP.buildingAt(map, c.x, c.y, 0.2), 'clearOfBuildings finds a way out');
  ok(TP.clearOfBuildings(map, cx + 400, cy + 400) === null || !TP.buildingAt(map, cx + 400, cy + 400, 0.2), 'a free spot is left alone');
}

// roads
{
  const q = TP.roadNear(map, X, Y, 150);
  ok(!!q && TP.roadKind(q.road) > 0 && q.d < 150, 'a classed road near the village centre');
  const far = TP.roadNear(map, X, Y, 150, (r) => TP.roadKind(r) > 2);
  ok(!far || TP.roadKind(far.road) > 2, 'the filter holds');
  for (const r of map.roadsNear(X, Y, 150)) if (!TP.roadKind(r)) { ok(!TP.roadNear(map, r.pts[0][0], r.pts[0][1], 0.5) || TP.roadNear(map, r.pts[0][0], r.pts[0][1], 0.5).road !== r, 'a path or service road is no road for placing'); break; }
  ok(typeof TP.streetAt(map, X, Y) === 'string', 'streetAt gives a name or nothing');
}

// a shop door in the village, on the tiles
{
  const Fac = await import('../game/js/facilities.js');
  const door = Fac.countryDoor(map, X, Y);
  ok(door === null || (!TP.buildingAt(map, door.x, door.y, 0.2) && Math.hypot(door.x - X, door.y - Y) < 120), 'a door is on open ground near its spot (or there is none)');
}

console.log(`tileplace: ${n} checks, ${fails} failed`);
process.exit(fails ? 1 : 0);
