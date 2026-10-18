// Rail LOD per distance (#158, #157): node scripts/rail_lod_test.mjs
// Pure logic of what railway3d.js builds: the focus (the player, or the point a cutscene
// camera looks at, tilefocus.js), the rail reach (viewdist.js railViewDistance) and the
// chunks that are wanted (railChunkWanted). Checks per draw distance and distance:
//  - rails round the focus are built up to the reach, not beyond it plus a chunk;
//  - a cutscene camera standing on a line far from the player still has the rails under
//    the lens (the focus follows the camera, not the player);
//  - the reach grows with the setting and stays within [min, max];
//  - the high-detail ring (detailDistanceFor) is never wider than the rail reach.
import { VIEW_DISTANCES, railViewDistance, railChunkWanted, RAIL_VIEW, RAIL_CHUNK, detailDistanceFor } from '../game/js/viewdist.js';
import { cameraFocus, LOOK_MAX } from '../game/js/tilefocus.js';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info ? ' (' + info + ')' : ''}`); } };
const chunkCentre = (v) => (Math.floor(v / RAIL_CHUNK) + 0.5) * RAIL_CHUNK;

// the reach per setting
let last = 0;
for (const [name, dist] of Object.entries(VIEW_DISTANCES)) {
  const v = railViewDistance(dist);
  ok(v >= RAIL_VIEW.min && v <= RAIL_VIEW.max, `reach ${name} within [min, max]`, v);
  ok(v >= last, `reach grows with the setting (${name})`);
  last = v;
  for (const q of ['laag', 'middel', 'hoog']) ok(detailDistanceFor(q, dist) <= v, `detail ring <= rail reach (${name}/${q})`);
}
ok(railViewDistance(150) === RAIL_VIEW.min, 'kort: the minimum reach');
ok(railViewDistance(900) === Math.min(RAIL_VIEW.max, 900 * RAIL_VIEW.factor), 'heel ver: the factor, capped');

// a straight line along +x through the focus; chunks every RAIL_CHUNK
for (const [name, dist] of Object.entries(VIEW_DISTANCES)) {
  const view = railViewDistance(dist);
  const focus = { x: 12345, y: -6789 };
  for (const d of [40, 150, 400, 900]) {
    const wanted = railChunkWanted(chunkCentre(focus.x + d), chunkCentre(focus.y), focus.x, focus.y, view);
    // inside the reach the chunk must be built; a full chunk beyond reach + its half diagonal must not
    if (d + RAIL_CHUNK <= view) ok(wanted, `${name}: rail ${d} m from the focus is built`);
    if (d - RAIL_CHUNK > view + RAIL_CHUNK * 0.71) ok(!wanted, `${name}: rail ${d} m from the focus is not built`);
  }
}

// a cutscene camera on the line, d metres from the player: the focus is the camera's look
// point (at most LOOK_MAX from the eye), so the chunk under the lens is built at any d
for (const [name, dist] of Object.entries(VIEW_DISTANCES)) {
  const view = railViewDistance(dist);
  for (const d of [40, 150, 400, 900, 3000, 8000]) {
    const eye = { x: 1000 + d, y: 2000, z: 5 };
    const o = { position: eye, lookAt: { x: eye.x - 120, y: eye.y, z: 1 } }; // looks back along the line
    const f = cameraFocus(o);
    ok(Math.abs(f.x - (eye.x - LOOK_MAX)) < 1e-6, `${name}: focus ${d} m out is ${LOOK_MAX} m in front of the lens`);
    ok(railChunkWanted(chunkCentre(eye.x), chunkCentre(eye.y), f.x, f.y, view), `${name}: the rail under a camera ${d} m from the player is built`);
    // the player's own spot is far from the focus: not built there (that is the saving)
    if (d > view + 3 * RAIL_CHUNK) ok(!railChunkWanted(chunkCentre(1000), chunkCentre(2000), f.x, f.y, view), `${name}: the rail at the player ${d} m away is not built`);
  }
}

console.log(fails ? `${fails} of ${n} FAILED` : `ok: ${n} checks`);
process.exit(fails ? 1 : 0);
