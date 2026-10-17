// The province's street-level detail from the builder (A6 of
// docs/ARCHITECTUUR-STAD-NAAR-TEGELS.md): a tree every 6 m along natural=tree_row
// (as process_osm.py does for the city), the trees' species and row flags from the
// greenery hook (one species in a row, a church's lime trees), and the mapped
// signs, crossings, gates and post boxes as furniture rows (ctx.signs).
import assert from 'node:assert/strict';
import { fromOsm } from '../game/js/worldbuilder.js';
import { greeneryHook } from '../game/js/builderhooks.js';
import { worldToWgs, wgsToWorld } from '../game/js/rdnew.js';
import { TREE_FLAG, SPECIES } from '../game/js/greenery.js';

const wgs = (x, y) => worldToWgs(x, y);
const x0 = 24000, y0 = 4000;

// a 61 m tree row: a tree at 0, 6, ... 60 m
const row = { type: 'way', id: 1, tags: { natural: 'tree_row' }, g: [wgs(x0, y0), wgs(x0 + 61, y0)] };
const trees = fromOsm(row, {}).filter((f) => f.kind === 'trees').map((f) => f.row);
assert.equal(trees.length, 11, 'a tree every 6 m');
assert.ok(Math.abs(trees[1][0] - trees[0][0] - 6) < 0.2);

// the hook: the row is one species and flagged; a tree by a church counts the church
// (tileBlob hands the hook rows spread into objects: { gid, 0: x, 1: y, rowSeed })
const cp = (t, i) => ({ gid: i, ...t });
const tile = { i: 0, j: 0, x0: 0, y0: 0, size: 1000 };
const rows = { tile, trees: trees.map(cp), roads: [], water: [], green: [], rails: [], buildings: [] };
greeneryHook(rows);
const sp = new Set(rows.trees.map((t) => t[2]));
assert.equal(sp.size, 1, 'one species in a row');
assert.ok(rows.trees.every((t) => t[4] & TREE_FLAG.row), 'flagged as a row');
assert.ok(rows.trees.every((t) => t[3] > 0 && SPECIES[t[2]]), 'height and species');
const lone = { tile, trees: [{ gid: 0, 0: x0 + 500, 1: y0 + 500 }], roads: [], water: [], green: [], rails: [], buildings: [{ pts: [[x0 + 480, y0 + 480], [x0 + 490, y0 + 480], [x0 + 490, y0 + 490], [x0 + 480, y0 + 490], [x0 + 480, y0 + 480]], type: 'church' }] };
greeneryHook(lone);
assert.ok(lone.trees[0][2] >= 0 && !(lone.trees[0][4] & TREE_FLAG.row));
const again = { tile, trees: trees.map(cp), roads: [], water: [], green: [], rails: [], buildings: [] };
greeneryHook(again);
assert.deepEqual(again.trees.map((t) => [t[2], t[3], t[4]]), rows.trees.map((t) => [t[2], t[3], t[4]]), 'deterministic');

// signs, crossings, gates, post boxes
const [la, lo] = wgs(x0, y0);
const node = (tags) => ({ type: 'node', id: 7, lat: la, lon: lo, tags });
const k = (tags, ctx) => fromOsm(node(tags), ctx).filter((f) => f.kind === 'furniture').map((f) => f.row.k + (f.row.v ? ':' + f.row.v : ''));
const ctx = { signs: true };
assert.deepEqual(k({ highway: 'stop' }, ctx), ['stop']);
assert.deepEqual(k({ highway: 'give_way' }, ctx), ['giveway']);
assert.deepEqual(k({ highway: 'crossing', crossing: 'zebra' }, ctx), ['crossing:zebra']);
assert.deepEqual(k({ highway: 'crossing', crossing: 'unmarked' }, ctx), [], 'an unmarked crossing is no furniture');
assert.deepEqual(k({ barrier: 'lift_gate' }, ctx), ['gate:lift_gate']);
assert.deepEqual(k({ amenity: 'post_box' }, ctx), ['postbox']);
assert.deepEqual(k({ highway: 'stop' }, {}), [], 'only where the builder asks for them');
assert.deepEqual(k({ highway: 'street_lamp' }, ctx), ['lamp'], 'mapped lamps stay');
const p = fromOsm(node({ highway: 'stop' }), ctx)[0].row.pts[0];
assert.ok(Math.hypot(p[0] - x0, p[1] - y0) < 0.1 && Math.hypot(...wgsToWorld(la, lo).map((v, i) => v - [x0, y0][i])) < 0.1);
console.log('province_detail_test ok');
