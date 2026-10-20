// Detail and view distances per profile (viewdist.js, issues #157 and #158):
// rails reach further than the old fixed 190 m, the high-detail ring grows
// with the quality profile inside the memory budget, and the streaming focus
// of a cutscene camera far from the player is the camera's, not the player's.
//   node scripts/viewdist_test.mjs
import * as V from '../game/js/viewdist.js';
import { tileFocus, cameraFocus, LOOK_MAX } from '../game/js/tilefocus.js';

let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log('FAIL ' + m); } };

// rails: never nearer than before, grow with the view distance, capped
let prev = 0;
for (const k of ['kort', 'normaal', 'ver', 'heelver']) {
  const r = V.railViewDistance(V.VIEW_DISTANCES[k]);
  ok(r >= 190 && r <= V.RAIL_VIEW.max && r >= prev, `rail view ${k}: ${r}`);
  prev = r;
}
ok(V.railViewDistance(V.VIEW_DISTANCES.ver) >= V.VIEW_DISTANCES.ver, 'rails reach at least the view distance on "ver"');
ok(V.railViewDistance(V.VIEW_DISTANCES.heelver) > 600, 'rails on "heel ver" go beyond 600 m');
ok(V.railViewDistance(1e9) === V.RAIL_VIEW.max && V.railViewDistance(0) === V.RAIL_VIEW.min, 'rail view is clamped');
ok(V.railViewDistance(300, { min: 100, factor: 2, max: 900 }) === 600, 'rail view takes its own config');

// memory: the worst case of resident track chunks stays a small part of the GPU budget (1.2 GB on Hoog)
const worst = V.railChunkCount(V.railViewDistance(V.VIEW_DISTANCES.heelver)) * V.RAIL_CHUNK_MB;
ok(worst <= 120, `rail chunks worst case ${worst} MB`);

// the high-detail ring: unchanged for laag and for short views, bigger on better profiles, area bounded
ok(V.detailDistanceFor('hoog', 150) === V.DETAIL_BASE, 'a short view keeps 140 m');
ok(V.detailDistanceFor('laag', 900) === V.DETAIL_BASE, 'laag keeps 140 m');
ok(V.detailDistanceFor('middel', 600) > V.DETAIL_BASE && V.detailDistanceFor('hoog', 600) > V.detailDistanceFor('middel', 600), 'middel < hoog');
for (const q of Object.keys(V.DETAIL_DIST)) ok((V.DETAIL_DIST[q] / V.DETAIL_BASE) ** 2 <= V.DETAIL_AREA_MAX, `detail area ratio ${q}`);
ok(V.detailDistanceFor('onbekend', 900) === V.DETAIL_BASE, 'unknown profile falls back');
ok(V.detailDistanceFor('hoog', 900, 3) === V.DETAIL_WEAK && V.DETAIL_WEAK < V.DETAIL_BASE, 'cpuLevel 3 shrinks the ring');
ok(V.detailDistanceFor('hoog', 900, 2) === V.detailDistanceFor('hoog', 900), 'cpuLevel 2 does not');

// a cutscene camera far from the player: the streamer follows the camera's look point
const player = { x: 0, y: 0 };
const cam = { position: { x: 5000, y: 3000 }, lookAt: { x: 5300, y: 3000 } };
const f = cameraFocus(cam);
ok(f && Math.hypot(f.x - cam.position.x, f.y - cam.position.y) <= LOOK_MAX + 1e-6, 'focus is within LOOK_MAX of the eye');
const st = {};
const t1 = tileFocus(player, cam, st, 0.016);
ok(Math.hypot(t1.x - 5000, t1.y - 3000) <= LOOK_MAX + 1e-6 && Math.hypot(t1.x, t1.y) > 4000, 'tiles follow the camera, not the player');
ok(LOOK_MAX >= 80, 'wide shots keep detail at their far side');
const t2 = tileFocus(player, null, st, 0.016);
ok(t2.x === 0 && t2.y === 0 && Object.keys(t2.opts).length === 0, 'back to the player after the cut: a jump, no speed');

if (fails) { console.log(fails + ' failed'); process.exit(1); }
console.log('viewdist: all passed');
