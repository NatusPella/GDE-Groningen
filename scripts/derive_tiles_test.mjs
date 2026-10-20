// The province's building derivation (scripts/world/derive_tiles.mjs, game/js/derive.js):
// a footprint keeps 1.5 m from a ground-level car road, a building=roof and a
// footprint a railway runs through become canopies, doubled footprints merge,
// a footprint inside another of the same height steps up 0.4 m, a footway
// through a solid block ends at its facade; and the result is deterministic.
import assert from 'node:assert/strict';
import { deriveFeatures, trimWaterways, slideOutOfWater, floatStuckSheds, cutDitches, ribbon, DITCH } from './world/derive_tiles.mjs';

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

// a footprint a few metres inside a lake slides to the bank; one far out and a houseboat stay; no footprint is dropped
const pond = { kind: 'water', row: { pts: rect(0, 300, 100, 100) } };
const onBank = bld(rect(40, 296, 10, 8)); // 4 m inside the south shore (y 300)
const farOut = bld(rect(40, 340, 10, 8), { name: 'Terp' });
const floats = bld(rect(10, 310, 8, 4), { type: 'houseboat' });
const pier = bld(rect(20, 297, 12, 3), { type: 'yes' }); // a landing stage mapped as a building: long and narrow, floats on
const sl = [pond, onBank, farOut, floats, pier];
assert.equal(slideOutOfWater(sl), 1, 'one footprint slid');
assert.ok(onBank.row.pts.every(([, y]) => y <= 300.01 || y >= 399.99 || Math.abs(y - 300) < 0.01 || y < 300.5), 'it stands on the bank');
assert.ok(Math.max(...onBank.row.pts.map((p) => p[1])) <= 300.01 || Math.min(...onBank.row.pts.map((p) => p[1])) >= 399.99, 'wholly on dry land');
assert.equal(farOut.row.pts[0][1], 340, 'one 40 m out stays where it is');
assert.equal(floats.row.pts[0][1], 310, 'the houseboat floats on');
assert.equal(pier.row.pts[0][1], 297, 'the landing stage stays');
// a footprint 20 m inside slides 20 m (the limit is 25 m since 2026-10-20), but beyond 12 m not onto a road or a rail (#297)
{
  const lake = { kind: 'water', row: { pts: rect(0, 500, 200, 100) } };
  const deep = bld(rect(40, 512, 10, 8)); // wholly inside, 20 m from the north shore at y 500
  assert.equal(slideOutOfWater([lake, deep]), 1, 'a footprint 20 m in slides');
  assert.ok(Math.max(...deep.row.pts.map((p) => p[1])) <= 500.01, 'and ends on dry land');
  const blocked = bld(rect(40, 512, 10, 8));
  const was = JSON.stringify(blocked.row.pts);
  assert.equal(slideOutOfWater([lake, blocked, road([[0, 496], [200, 496]])]), 0, 'a street along the bank (4 m off) stops a long slide');
  assert.equal(JSON.stringify(blocked.row.pts), was, 'and the footprint stays');
  const railed = bld(rect(40, 512, 10, 8));
  assert.equal(slideOutOfWater([lake, railed, { kind: 'rails', row: { pts: [[0, 497], [200, 497]] } }]), 0, 'so does a rail');
}
// what cannot slide and is a small low shed wholly in the water floats on as a houseboat; a named, tall or large one stays (#297)
{
  const sea = { kind: 'water', row: { pts: rect(0, 700, 400, 400) } };
  const shed = bld(rect(100, 800, 6, 5), { h: 0.8, type: 'yes' });
  const named = bld(rect(120, 800, 6, 5), { h: 0.8, type: 'yes', name: 'Visschuur' });
  const tall = bld(rect(140, 800, 6, 5), { h: 3, type: 'yes' });
  const large = bld(rect(160, 800, 30, 20), { h: 0.8, type: 'yes' });
  const onLand = bld(rect(10, 10, 6, 5), { h: 0.8, type: 'yes' });
  assert.equal(floatStuckSheds([sea, shed, named, tall, large, onLand]), 1, 'one shed turned into a houseboat');
  assert.equal(shed.row.type, 'houseboat', 'the small low one in the water floats');
  assert.ok(named.row.type === 'yes' && tall.row.type === 'yes' && large.row.type === 'yes' && onLand.row.type === 'yes', 'a named, tall, large or dry one stays');
}
// the real ditches against the track, roads and other water (#124)
{
  const hw = 1.2;
  const ditch = (pts) => ({ kind: 'water', row: { pts: ribbon(pts, hw), nav: 1, kind: 'sloot' }, line: { pts, hw, ditch: true, fixed: true } });
  const rail = (pts) => ({ kind: 'rails', row: { pts } });
  const road = (pts, extra = {}) => ({ kind: 'roads', row: { pts, width: 6, cat: 'normal', ...extra } });
  const pieces = (feats) => feats.filter((f) => f.kind === 'water' && f.line);
  const lengthOf = (f) => f.line.pts.reduce((n, p, i) => (i ? n + Math.hypot(p[0] - f.line.pts[i - 1][0], p[1] - f.line.pts[i - 1][1]) : 0), 0);

  // a ditch of 100 m over the track: two pieces, a gap of twice RAIL_GAP
  let F = [ditch([[0, 0], [100, 0]]), rail([[50, -20], [50, 20]])];
  let st = cutDitches(F);
  assert.equal(st.cut, 1, 'one crossing');
  let P = pieces(F);
  assert.equal(P.length, 2, 'two pieces');
  assert.ok(Math.abs(P[0].line.pts.at(-1)[0] - (50 - DITCH.RAIL_GAP)) < 0.01 && Math.abs(P[1].line.pts[0][0] - (50 + DITCH.RAIL_GAP)) < 0.01, 'the track runs on dry ground');
  assert.ok(P.every((f) => f.row.pts[0][0] === f.row.pts.at(-1)[0] && f.row.pts.length > 4), 'every piece is a closed ribbon');

  // a road at ground level: its half width and a metre each side; a bridge or a footway does not cut
  F = [ditch([[0, 0], [100, 0]]), road([[50, -20], [50, 20]])];
  cutDitches(F);
  P = pieces(F);
  assert.equal(P.length, 2, 'a road cuts');
  assert.ok(Math.abs(P[1].line.pts[0][0] - P[0].line.pts.at(-1)[0] - 2 * (3 + DITCH.ROAD_GAP)) < 0.01, 'the gap is the road width and a metre each side');
  for (const extra of [{ bridge: true }, { tunnel: true }, { cat: 'foot' }]) {
    F = [ditch([[0, 0], [100, 0]]), road([[50, -20], [50, 20]], extra)];
    assert.equal(cutDitches(F).cut, 0, 'no cut for ' + JSON.stringify(extra));
    assert.equal(pieces(F).length, 1);
  }

  // two crossings next to each other make one gap; a piece under MIN is dropped
  F = [ditch([[0, 0], [100, 0]]), rail([[40, -20], [40, 20]]), rail([[44, -20], [44, 20]])];
  st = cutDitches(F);
  assert.equal(pieces(F).length, 2, 'rails 4 m apart: one gap');
  F = [ditch([[0, 0], [14, 0]]), rail([[10, -20], [10, 20]])];
  st = cutDitches(F);
  assert.ok(pieces(F).every((f) => lengthOf(f) >= DITCH.MIN), 'no piece under MIN');
  assert.ok(st.dropped >= 1, 'the short ones are dropped: ' + JSON.stringify(st));

  // the end of a ditch 8 m short of a canal is carried on to its bank; 30 m short it stays; one inside it stays
  const canal = { kind: 'water', row: { pts: [[0, 8], [100, 8], [100, 40], [0, 40], [0, 8]], nav: 3, kind: 'diep' } };
  F = [ditch([[20, -30], [20, 0]]), canal];
  st = cutDitches(F);
  assert.equal(st.joined, 1, 'joined');
  assert.ok(Math.abs(pieces(F)[0].line.pts.at(-1)[1] - 8) < 0.01, 'to the canal bank');
  F = [ditch([[20, -60], [20, -22]]), canal];
  assert.equal(cutDitches(F).joined, 0, 'too far to join');
  F = [ditch([[20, 20], [20, 30]]), canal];
  assert.equal(cutDitches(F).joined, 0, 'already in the water');

  // without ditches nothing changes
  F = [{ kind: 'water', row: { pts: ribbon([[0, 0], [100, 0]], 7), nav: 3 }, line: { pts: [[0, 0], [100, 0]], hw: 7 } }, rail([[50, -20], [50, 20]])];
  assert.equal(cutDitches(F).cut, 0, 'a canal is not a ditch');
  const full = deriveFeatures([ditch([[0, 0], [100, 0]]), rail([[50, -20], [50, 20]])], { clear: false, clip: false });
  assert.equal(full.stats.ditchCut, 1, 'deriveFeatures cuts ditches');
}
console.log('derive_tiles_test ok');
