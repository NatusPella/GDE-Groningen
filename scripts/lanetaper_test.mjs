// Lane lines that bend across where lane counts change (#130): node scripts/lanetaper_test.mjs
import './node3d.mjs';
import { loadCityWorld } from './lib/loadworld.mjs';
import { findJoint, taperLines, taperOffset, taperLength } from '../game/js/lanetaper.js';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info ? ' (' + info + ')' : ''}`); } };
const road = (pts, o = {}) => ({ pts, type: 'secondary', cat: 'major', width: 7, oneway: false, roundabout: false, name: 'T', ...o });
const one = (pts, lanes, o = {}) => road(pts, { oneway: true, lanesFwd: lanes, lanesBwd: 0, laneW: 3, width: lanes * 3 + 2, ...o });

const A = one([[0, 0], [50, 0]], 3), B = one([[50, 0], [100, 0]], 2);
ok(findJoint(A, false, [A, B]) && findJoint(A, false, [A, B]).same, 'A end meets B start');
ok(findJoint(A, true, [A, B]) === null, 'free end is no joint');
const T = road([[50, 0], [50, 40]]);
ok(findJoint(A, false, [A, B, T]) === null, 'a third way makes a junction');
const L = one([[50, 0], [100, 0]], 2, { type: 'secondary_link' });
ok(findJoint(A, false, [A, L]) === null, 'a slip road is no joint');
ok(findJoint(A, false, [A, one([[50, 0], [80, 40]], 2)]) === null, 'a bend is no joint');

// 3 lanes -> 2: A's second line (no match over there) bends to B's line
const ta = taperLines(A, false, [A, B]);
ok(ta.length === 2 && ta.every((q) => q.to === 0), 'both lines bend to the single line of B', JSON.stringify(ta));
ok(taperLines(B, true, [A, B]).length === 0, 'the narrower way has nothing to taper');
ok(taperLines(A, false, [A, one([[50, 0], [100, 0]], 3)]).length === 0, 'equal lanes: no taper');

// same joint with B drawn the other way round: two-way, flipped frame
const C = road([[100, 0], [50, 0]], { lanesFwd: 1, lanesBwd: 1, laneW: 3, width: 7 });
const D = road([[0, 0], [50, 0]], { lanesFwd: 2, lanesBwd: 2, laneW: 3, width: 13 });
const td = taperLines(D, false, [C, D]);
ok(td.length === 2, 'two-way 2+2 next to 1+1 tapers both lines', JSON.stringify(td));
ok(findJoint(D, false, [C, D]).same === false, 'opposite drawing direction flips the frame');

// offsets run from the line at the far end to the target at the node
const t = { off: 3, to: 0 };
ok(taperOffset(t, 0, 30) === 0 && taperOffset(t, 30, 30) === 3 && taperOffset(t, 99, 30) === 3 && taperOffset(t, 15, 30) === 1.5, 'taperOffset ramps');
ok(taperLength(500) === 35 && taperLength(20) === 8 && taperLength(5) === 6, 'taper length is bounded');

// on the real map: roads get tapered lines and their markings stay finite
const RS = await import('../game/js/roadsurface.js');
const map = (await loadCityWorld()).map;
RS.setRoadNetwork(map);
let tapered = 0, bad = 0;
for (const r of map.roads) {
  if (r.cat !== 'major' && r.cat !== 'normal') continue;
  const near = (p) => map.roadGrid.query(p[0] - 2, p[1] - 2, p[0] + 2, p[1] + 2);
  const t = taperLines(r, true, near(r.pts[0])).length + taperLines(r, false, near(r.pts[r.pts.length - 1])).length;
  if (!t) continue;
  tapered++;
  const g = RS.roadSurfaceGeometries(r, true).mark;
  if (g && !g.attributes.position.array.every(Number.isFinite)) bad++;
}
ok(tapered > 20, `the city map has tapered lane lines (${tapered} roads)`);
ok(bad === 0, 'their markings stay finite');

console.log(`lanetaper_test: ${n - fails}/${n}`);
process.exit(fails ? 1 : 0);
