// The province's building derivation (scripts/world/derive_tiles.mjs, game/js/derive.js):
// a footprint keeps 1.5 m from a ground-level car road, a building=roof and a
// footprint a railway runs through become canopies, doubled footprints merge,
// a footprint inside another of the same height steps up 0.4 m, a footway
// through a solid block ends at its facade; and the result is deterministic.
import assert from 'node:assert/strict';
import { deriveFeatures } from './world/derive_tiles.mjs';

const rect = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x, y]];
const bld = (pts, o = {}) => ({ kind: 'buildings', row: { pts, h: 2, type: 'house', name: null, ...o } });
const road = (pts, o = {}) => ({ kind: 'roads', row: { pts, cat: 'normal', type: 'residential', width: 6, bridge: false, ...o } });

const make = () => [
  road([[0, 0], [100, 0]]),
  bld(rect(10, 0.8, 8, 8)), // 0.8 m from the centreline of the street
  bld(rect(30, 20, 10, 10)), bld(rect(30, 20, 10, 10), { name: 'Doorn' }), // the same footprint twice
  bld(rect(50, 20, 12, 12)), bld(rect(53, 23, 4, 4)), // a part inside its building, same height
  bld(rect(70, 20, 10, 6), { type: 'roof' }),
  bld(rect(10, 40, 12, 6), { h: 3 }), { kind: 'rails', row: { pts: [[5, 43], [30, 43]] } },
  road([[100, 60], [100, 76]], { cat: 'foot', type: 'footway', width: 1.8 }), bld(rect(95, 70, 10, 10), { h: 3 }), // a footway that ends deep inside a block
];

const a = deriveFeatures(make());
const b = deriveFeatures(make());
assert.deepEqual(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b)), 'same input, same output');

const of = (r, k) => r.feats.filter((f) => f.kind === k);
const near = of(a, 'buildings').find((f) => f.row.pts.some((p) => p[0] > 9 && p[0] < 19 && p[1] < 5));
const dmin = Math.min(...near.row.pts.map((p) => Math.abs(p[1])));
assert.ok(dmin >= 1.49, `footprint pushed 1.5 m off the street (${dmin})`);
assert.equal(a.stats.moved, 1);
assert.equal(a.stats.merged, 1, 'the doubled footprint merges');
assert.equal(of(a, 'buildings').filter((f) => f.row.pts[0][0] === 30).length, 1);
assert.equal(of(a, 'buildings').find((f) => f.row.pts[0][0] === 30).row.name, 'Doorn', 'the name survives the merge');
assert.equal(of(a, 'canopies').length, 2, 'building=roof and the footprint over the rail');
assert.equal(a.stats.lifted, 1);
assert.equal(of(a, 'buildings').filter((f) => (f.row.pts[0][0] === 53 || f.row.pts[0][0] === 50) && f.row.lift === 0.4).length, 1, 'one of the two steps up');
const way = of(a, 'roads').filter((f) => f.row.cat === 'foot');
assert.ok(way.length >= 1 && way.every((f) => f.row.clipped), 'the footway ends at the facade');
assert.ok(of(a, 'buildings').every((f) => !('bounds' in f.row) && !f.row.passages), 'no working keys left on the rows');
console.log('derive_tiles_test ok');
