// The province's traffic lights and junction model (scripts/world/junction_tiles.mjs):
// signals snap onto the road they belong to (2.5 m, a cycle path only: bike),
// the city's junctionModel runs over a pack's roads, and a tile's JUNCTIONS
// rows name road pieces of that very tile, at the vertex of the node.
import assert from 'node:assert/strict';
import { snapSignals, junctionsOf } from './world/junction_tiles.mjs';
import { tileBlob } from './world/build_corridor.mjs';
import * as G from '../game/js/gdt.js';
import { RULES } from '../game/js/junctions.js';

const [ox, oy] = G.tileOrigin(40, 20);
const X = (v) => ox + v, Y = (v) => oy + v;
const road = (pts, o = {}) => ({ kind: 'roads', row: { pts: pts.map(([x, y]) => [X(x), Y(y)]), cat: 'normal', type: 'residential', width: 6, oneway: false, roundabout: false, bridge: false, ...o } });
const sig = (x, y) => ({ kind: 'furniture', row: { k: 'signals', pts: [[X(x), Y(y)]], osm: 1 } });

const feats = () => [
  road([[0, 100], [100, 100]], { type: 'secondary', cat: 'major', width: 9 }), road([[100, 100], [200, 100]], { type: 'secondary', cat: 'major', width: 9 }),
  road([[100, 0], [100, 100]]), road([[100, 100], [100, 200]]),
  road([[300, 300], [320, 300]], { cat: 'cycle', type: 'cycleway', width: 2 }),
  sig(101, 101), // 1.4 m from the junction node
  sig(310, 301), // on the cycle path only
  sig(500, 500), // on no road: dropped
];

const s = snapSignals(feats());
assert.equal(s.lights.length, 2, 'one car light, one bike light; the loose one is dropped');
const car = s.lights.find((l) => !l.bike);
assert.ok(Math.abs(car.y - Y(100)) < 0.01 || Math.abs(car.x - X(100)) < 0.01, 'snapped onto a road');
assert.ok(Math.hypot(car.x - X(100), car.y - Y(100)) <= 1.01, 'within a metre of where it was');
assert.equal(s.lights.filter((l) => l.bike).length, 1);

const j = junctionsOf(s.feats, s.lights);
assert.equal(j.nodes.length, 1, 'one junction: the cross');
assert.equal(j.nodes[0].control, 'signals', 'the light makes it a signalled junction');
assert.ok(j.nodes[0].arms.every((a) => a.rule === 'signal'));
assert.equal(j.nodes[0].arms.length, 4, 'four roads end at the node');

// the tile's rows
const gid = { buildings: 0, roads: 0, water: 0, green: 0, trees: 0, rails: 0, canopies: 0, furniture: 0 };
const tb = tileBlob(40, 20, s.feats, gid, 1, 1, null, { junctions: j.nodes });
assert.ok(tb && tb.n.junctions === 1, 'the junction is in the tile of its node');
const blob = G.decodeBlob(tb.bytes);
const roads = blob.sections.find((q) => q.type === G.SECTION.ROADS).rows;
const jr = blob.sections.find((q) => q.type === G.SECTION.JUNCTIONS).rows[0];
assert.equal(jr.c, 'signals');
assert.deepEqual(jr.p[0], [X(100), Y(100)]);
for (const [rg, idx, d, rule] of jr.a) {
  const r = roads.find((q) => q.gid === rg);
  assert.ok(r, 'the arm names a road piece of this tile');
  assert.deepEqual(r.pts[idx], jr.p[0], 'at the node vertex');
  assert.ok(d === 1 || d === -1);
  assert.equal(RULES[rule], 'signal');
}
const furn = blob.sections.find((q) => q.type === G.SECTION.FURNITURE).rows;
assert.equal(furn.filter((q) => q.k === 'signals').length, 2);
const again = tileBlob(40, 20, s.feats, { ...gid, roads: 0, furniture: 0 }, 1, 1, null, { junctions: j.nodes });
assert.deepEqual(Buffer.from(again.bytes), Buffer.from(tb.bytes), 'same input, same bytes');
console.log('junction_tiles_test ok');
