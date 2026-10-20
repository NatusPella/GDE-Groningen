// Road seams audit (issue #130): scripts/world/road_seams.mjs on made-up
// junctions, then on the city map (counts may not grow past today's).
//   node scripts/road_seams_test.mjs
import fs from 'node:fs';
import { auditSeams } from './world/road_seams.mjs';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info ? ' (' + info + ')' : ''}`); } };
const road = (pts, o = {}) => ({ pts, type: 'secondary', cat: 'normal', width: 7, speed: 14, oneway: false, roundabout: false, name: 'T', bridge: false, ...o });
const one = (pts, lanes, o = {}) => road(pts, { oneway: true, lanesFwd: lanes, lanesBwd: 0, laneW: 3, width: lanes * 3 + 2, ...o });
const two = (pts, f, b, o = {}) => road(pts, { lanesFwd: f, lanesBwd: b, laneW: 3, width: (f + b) * 3 + 1, ...o });
const count = (roads, k) => auditSeams(roads)[k].length;

// lane count at a through joint
ok(count([one([[0, 0], [50, 0]], 2), one([[50, 0], [100, 0]], 2)], 'laneJump') === 0, 'equal lanes: no jump');
ok(count([one([[0, 0], [50, 0]], 2), one([[50, 0], [100, 0]], 3)], 'laneJump') === 1, '2 -> 3 lanes without a taper is counted');
ok(count([two([[0, 0], [50, 0]], 2, 1), two([[100, 0], [50, 0]], 1, 2)], 'laneJump') === 0, 'a way drawn the other way round matches by direction');
ok(count([one([[0, 0], [50, 0]], 2), one([[100, 0], [50, 0]], 3)], 'laneJump') === 1, 'two one-ways running head on are counted');
ok(count([two([[0, 0], [50, 0]], 1, 1), two([[50, 0], [100, 0]], 2, 1)], 'laneJump') === 1, 'two-way 1+1 -> 2+1 counted');
ok(count([one([[0, 0], [50, 0]], 2), one([[50, 0], [100, 0]], 3), road([[50, 0], [50, 40]])], 'laneJump') === 0, 'a third arm makes it a junction, not a joint');
ok(count([one([[0, 0], [50, 0]], 2), one([[50, 0], [100, 0]], 3, { type: 'secondary_link' })], 'laneJump') === 0, 'a slip road is not a joint');
ok(count([one([[0, 0], [50, 0]], 2), one([[50, 0], [100, 0]], 3, { bridge: true, layer: 1 })], 'laneJump') === 0, 'different levels do not join');
ok(count([one([[0, 0], [50, 0]], 2), one([[50, 0], [80, 40]], 3)], 'laneJump') === 0, 'a sharp bend is a corner, not a joint');
ok(count([one([[0, 0], [50, 0]], 2, { width: 8 }), one([[50, 0], [100, 0]], 2, { width: 12 })], 'widthJump') === 1, 'a 4 m kerb step is counted');
ok(count([one([[0, 0], [50, 0]], 2, { width: 8 }), one([[50, 0], [100, 0]], 2, { width: 8.5 })], 'widthJump') === 0, 'a 0.5 m step is not');

// gaps
ok(count([road([[0, 0], [100, 0]]), road([[50, 3.8], [50, 40]])], 'gap') === 1, 'a way ending 3 m off the edge of another is a gap');
ok(count([road([[0, 0], [100, 0]]), road([[50, 0], [50, 40]])], 'gap') === 0, 'a way touching the other at a node is not');
ok(count([road([[0, 0], [100, 0]]), road([[50, 30], [50, 40]])], 'gap') === 0, 'far away is a dead end');
ok(count([road([[0, 0], [100, 0]]), road([[50, 3.8], [50, 40]], { bridge: true, layer: 1 })], 'gap') === 0, 'another level is no gap');

// overlap and crossings
ok(count([road([[0, 0], [100, 0]]), road([[0, 3], [100, 3]])], 'overlap') === 1, 'two ribbons 3 m apart overlap');
ok(count([road([[0, 0], [100, 0]]), road([[0, 8], [100, 8]])], 'overlap') === 0, 'ribbons 8 m apart (7 m wide) do not');
ok(count([road([[0, 0], [100, 0]]), road([[0, 3], [100, 3]], { layer: 1, bridge: true })], 'overlap') === 0, 'a bridge above is not an overlap');
ok(count([road([[0, 0], [100, 0]]), road([[50, -30], [50, 30]])], 'crossNoNode') === 1, 'crossing without a node is counted');
ok(count([road([[0, 0], [50, 0], [100, 0]]), road([[50, -30], [50, 0], [50, 30]])], 'crossNoNode') === 0, 'with a shared node it is a junction');
ok(count([road([[0, 0], [100, 0]]), road([[50, -30], [50, 30]], { tunnel: true })], 'crossNoNode') === 0, 'a tunnel below is no crossing');

ok(count([road([[0, 0], [100, 0]], { tunnel: true, layer: -1 }), road([[50, -30], [50, 30]], { tunnel: true, layer: -2 })], 'crossNoNode') === 0, 'two tunnels at different depths do not cross')

// the city map: today's counts are the ceiling
const { loadStadData } = await import('./lib/loadworld.mjs');
const data = await loadStadData();
const f = auditSeams(data.roads);
const CEIL = { laneJump: 230, widthJump: 7, gap: 17, overlap: 135, crossNoNode: 0 };
for (const [k, max] of Object.entries(CEIL)) ok(f[k].length <= max, `map: ${k} not above ${max}`, f[k].length);

console.log(`${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
