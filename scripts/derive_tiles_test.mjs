// The province's building derivation (scripts/world/derive_tiles.mjs, game/js/derive.js):
// a footprint keeps 1.5 m from a ground-level car road, a building=roof and a
// footprint a railway runs through become canopies, doubled footprints merge,
// a footprint inside another of the same height steps up 0.4 m, a footway
// through a solid block ends at its facade; and the result is deterministic.
import assert from 'node:assert/strict';
import { deriveFeatures, trimWaterways } from './world/derive_tiles.mjs';

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

// a canal of guessed width (14 m) with a farm on its bank is narrowed there; a mapped width and a houseboat are left alone
const ribbonOf = (pts, hw) => { const L = pts.map(([x, y]) => [x, y + hw]), R = pts.map(([x, y]) => [x, y - hw]).reverse(); return [...L, ...R, L[0]]; };
const line = [[0, 200], [40, 200], [80, 200], [120, 200]];
const canal = (fixed) => ({ kind: 'water', row: { pts: ribbonOf(line, 7), name: null }, line: { pts: line, hw: 7, fixed } });
const farm = bld(rect(50, 205, 20, 12)); // its near wall 2 m inside the guessed 14 m channel (water y 193..207)
const boat = bld(rect(100, 197, 8, 4), { type: 'houseboat' });
const wetAt = (f, x, y) => { const P = f.row.pts; let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) if ((P[i][1] > y) !== (P[j][1] > y) && x < ((P[j][0] - P[i][0]) * (y - P[i][1])) / (P[j][1] - P[i][1]) + P[i][0]) c = !c; return c; };
const wetIn = (f, b) => wetAt(f, b.row.pts[0][0] + 5, b.row.pts[0][1] + 0.5); // just inside the near wall
const guessed = [canal(false), farm, boat];
assert.ok(wetIn(guessed[0], farm), 'before: the near wall of the farm stands in the guessed channel');
assert.equal(trimWaterways(guessed), 1, 'one waterway narrowed');
assert.ok(!wetIn(guessed[0], farm), 'the farm no longer stands in the water');
assert.ok(wetIn(guessed[0], boat), 'the houseboat still floats');
const widths = guessed[0].row.pts.map((p) => Math.abs(p[1] - 200));
assert.ok(Math.max(...widths) >= 6.9 && Math.min(...widths) >= 1.49, 'narrowed to no less than 3 m, wide elsewhere');
const mapped = [canal(true), bld(rect(50, 205, 20, 12))];
assert.equal(trimWaterways(mapped), 0, 'a mapped width is not touched');
console.log('derive_tiles_test ok');
