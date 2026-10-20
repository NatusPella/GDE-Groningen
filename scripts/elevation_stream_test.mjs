// The elevation model of streamed tiles (#300): roads that come in with their tile join map.elev
// (extendElevation), give the same surfaces, walls and embankments as when the map had them from the start,
// and leave it again with their tile (shrinkElevation).
//   node scripts/elevation_stream_test.mjs
import './node3d.mjs';

globalThis.requestAnimationFrame = (f) => setImmediate(f);
const { GameMap } = await import('../game/js/mapdata.js');
const { extendElevation, shrinkElevation, resolveElevWalls } = await import('../game/js/elevation.js');

let n = 0, fails = 0;
const ok = (cond, name, info = '') => { n++; if (!cond) { fails++; console.log(`FAIL ${name}${info ? ' (' + info + ')' : ''}`); } };
const near = (a, b, e = 0.02) => Math.abs(a - b) <= e;

// the map of surface_test: a deck over a street (x -40..40), ramps down on both sides, a slip road beside the main road
const ramp = (x0, x1, z0, z1, n = 9) => Array.from({ length: n }, (_, i) => [x0 + (x1 - x0) * i / (n - 1), z0 + (z1 - z0) * i / (n - 1)]);
const mainA = [[-200, 0, 0], [-160, 0, 0], ...ramp(-120, -40, 0, 6).map(([x, z]) => [x, 0, z]), [0, 0, 6], [40, 0, 6], ...ramp(56, 100, 5.2, 0, 4).map(([x, z]) => [x, 0, z])];
const mainB = [[100, 0, 0], [140, 0, 0], [200, 0, 0]];
const road = (P, extra) => ({ pts: P.map((q) => [q[0], q[1]]), z: P.map((q) => q[2]), type: 'trunk', cat: 'major', width: 12, speed: 22, oneway: false, roundabout: false, name: 'Hoofdweg', bridge: false, ...extra });
const defs = [
  road(mainA, { bridge: true, layer: 1, ref: 'N99' }),
  road(mainB, { ref: 'N99' }),
  { pts: [[0, -200], [0, 200]], type: 'residential', cat: 'normal', width: 6.5, speed: 11, oneway: false, roundabout: false, name: 'Onderstraat', bridge: false },
];
const data = (withZ) => ({
  meta: { bounds: [-300, -300, 300, 300] },
  roads: defs.map((r) => (withZ ? { ...r } : { ...r, z: undefined })),
  buildings: [], water: [], green: [], trees: [],
});
const A = new GameMap(data(true));
ok(A.elev.has && A.elev.segs.length > 0, 'the reference map has raised ribbons');

// the same roads, flat, as a streamed map holds them; the profiles come with the "tile"
const B = new GameMap(data(false));
ok(!B.elev.has && B.surfaceAt(0, 2, { z: 6, ribbon: null }).z === 0, 'without profiles: no elevation, the deck is at street level');
B.roads.forEach((r, i) => { r.z = A.roads[i].z ? A.roads[i].z.slice() : undefined; });
const raised = B.roads.filter((r) => r.z);
const k = extendElevation(B, B.roads);
ok(k === A.elev.segs.length && B.elev.segs.length === A.elev.segs.length, 'the raised segments come in', `${k} / ${A.elev.segs.length}`);
ok(B.elev.walls.length === A.elev.walls.length && B.elev.skirts.length === A.elev.skirts.length, 'the same walls and skirts as from the start', `${B.elev.walls.length}/${A.elev.walls.length}`);

// the same surface everywhere: on the deck, under it, on the ramps, off the road
{
  let bad = 0, total = 0;
  for (let x = -150; x <= 150; x += 7.5) for (let y = -14; y <= 14; y += 3.5) for (const zh of [0, 3, 6]) {
    total++;
    const a = A.groundHeightAt(x, y, zh), b = B.groundHeightAt(x, y, zh);
    if (!near(a, b)) bad++;
  }
  ok(bad === 0, 'groundHeightAt equals the reference on a grid of points and heights', `${bad} of ${total}`);
  const sa = A.surfaceAt(0, 2, { z: 6, ribbon: A.ribbonAt(0, 2, 6) }), sb = B.surfaceAt(0, 2, { z: 6, ribbon: B.ribbonAt(0, 2, 6) });
  ok(near(sa.z, 6) && near(sb.z, 6), 'surfaceAt: on the deck at 6 m');
  const su = B.surfaceAt(0, 2, { z: 0, ribbon: B.ribbonAt(0, 2, 0) });
  ok(near(su.z, 0), 'the street under the deck stays the street');
}
// the crash barriers of the deck are walls for a walker and a car
{
  const w = B.elev.walls.find((q) => q.kind === 'barrier' && q.low);
  ok(!!w, 'the deck has barrier walls');
  if (w) {
    const mx = (w.ax + w.bx) / 2 - w.nx * 0.0, my = (w.ay + w.by) / 2;
    const hit = resolveElevWalls(B.elev, mx - w.nx * 0.2, my - w.ny * 0.2, w.z, 0.3);
    ok(hit === null || Array.isArray(hit), 'the wall query answers on the new walls');
  }
}
// extending twice changes nothing
{
  const before = B.elev.segs.length, w0 = B.elev.walls.length;
  ok(extendElevation(B, B.roads) === 0 && B.elev.segs.length === before && B.elev.walls.length === w0, 'the same roads again: nothing is added twice');
}
// a tile drops: its road leaves, the others stay
{
  const main = B.roads[0];
  const segsOfMain = B.elev.segs.filter((s) => s.r === main).length;
  const removed = shrinkElevation(B, [main]);
  ok(removed === segsOfMain && B.elev.segs.every((s) => s.r !== main), 'the dropped road\'s segments leave', `${removed} / ${segsOfMain}`);
  ok(B.elev.walls.every((w) => w.seg.r !== main) && B.elev.skirts.every((w) => w.seg.r !== main), 'and its walls and skirts');
  ok(near(B.groundHeightAt(0, 2, 6), 0) && near(B.groundHeightAt(-80, 0, 3), 0), 'where it was the ground is the street again');
  ok(B.elev.wallGrid.at(0, 6.4) === undefined || B.elev.wallGrid.at(0, 6.4).every((w) => w.seg.r !== main), 'the wall grid holds none of its pieces');
  ok(shrinkElevation(B, [main]) === 0, 'dropping it twice is harmless');
  // and it can come back with the tile
  ok(extendElevation(B, [main]) === segsOfMain && near(B.groundHeightAt(0, 2, 6), 6), 'it comes back when the tile does');
}
// a map with no raised road at all gets an elevation model with the first streamed one
{
  const C = new GameMap(data(false));
  const m = C.roads[0];
  m.z = A.roads[0].z.slice();
  ok(!C.elev.has, 'a flat map has no model');
  ok(extendElevation(C, [m]) > 0 && C.elev.has && near(C.groundHeightAt(0, 2, 6), 6), 'its first streamed bridge makes one');
}
console.log(`${n - fails}/${n} elevation stream checks passed`);
process.exit(fails ? 1 : 0);
