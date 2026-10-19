// Lane lines at a through joint where the number of lanes changes (#130).
// Two car ways meet end to end and one has a lane line the other lacks: that
// line does not stop dead but bends across to the nearest line of the other
// way over TAPER_LEN metres, as a lane drop or added lane is painted.
// Pure: roads in, offsets out (road_seams_test.mjs, lanetaper_test.mjs).
import { laneLayout } from './lanes.js';

const TAPER_LEN = 35;   // m, shortened to 40% of the way when that is shorter
const TOUCH = 0.3;             // m: an end this close to the node counts as touching
const CAR = new Set(['major', 'normal', 'minor']);
const level = (r) => r.layer ?? (r.tunnel ? -1 : r.bridge ? 1 : 0);

// unit vector leaving the node along the way
function away(r, atStart) {
  const P = r.pts, n = P.length;
  const [a, b] = atStart ? [P[0], P[1]] : [P[n - 1], P[n - 2]];
  const d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  return [(b[0] - a[0]) / d, (b[1] - a[1]) / d];
}

// The one other car way that continues `r` at its start/end, from `near` (roads
// around the node, any order), or null when the node is a junction, a slip road,
// another level or a bend. -> { o, oAtStart, same } (same: both run the same way)
export function findJoint(r, atStart, near) {
  if (!CAR.has(r.cat) || r.roundabout || r.pts.length < 2) return null;
  const p = r.pts[atStart ? 0 : r.pts.length - 1];
  let hit = null;
  for (const o of near) {
    if (o === r || !CAR.has(o.cat)) {
      if (o !== r && o.pts && o.pts.some((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) < TOUCH)) return null;
      continue;
    }
    if (!o.pts.some((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) < TOUCH)) continue;
    const s = Math.hypot(o.pts[0][0] - p[0], o.pts[0][1] - p[1]) < TOUCH;
    const e = Math.hypot(o.pts[o.pts.length - 1][0] - p[0], o.pts[o.pts.length - 1][1] - p[1]) < TOUCH;
    if (hit || (s === e)) return null;      // a third way, or the node lies mid-way / ring
    hit = { o, oAtStart: s };
  }
  if (!hit) return null;
  const { o } = hit;
  if (o.roundabout || level(o) !== level(r) || o.type.endsWith('_link') !== r.type.endsWith('_link')) return null;
  const a = away(r, atStart), b = away(o, hit.oAtStart);
  if (a[0] * b[0] + a[1] * b[1] > -0.8) return null;
  hit.same = atStart !== hit.oAtStart;
  return hit;
}

// Lane lines of `r` that do not continue past its start/end: [{ off, to }],
// `to` being the offset (in r's own frame) the line bends to.
export function taperLines(r, atStart, near) {
  const j = findJoint(r, atStart, near);
  if (!j) return [];
  const mine = laneLayout(r), theirs = laneLayout(j.o);
  // only the way with more lanes bends: the other one keeps its lines and the two meet
  if (mine.lines.length <= theirs.lines.length) return [];
  const sg = j.same ? 1 : -1;
  const cands = theirs.lines.map((x) => x * sg);
  if (theirs.divider != null) cands.push(theirs.divider * sg);
  const out = [];
  for (const off of mine.lines) {
    if (cands.some((c) => Math.abs(c - off) < 0.7)) continue;
    let to = null;
    for (const c of cands) if (to === null || Math.abs(c - off) < Math.abs(to - off)) to = c;
    // no line over there to join: bend to the edge of the narrower way
    if (to === null) to = Math.sign(off || 1) * Math.max(0.5, Math.min(r.width, j.o.width) / 2 - 0.35);
    out.push({ off, to });
  }
  return out;
}

export function taperLength(L) {
  return Math.max(6, Math.min(TAPER_LEN, L * 0.4));
}

// Offset of a tapered line at distance d from the node (0 at the node).
export function taperOffset(t, d, len) {
  const k = Math.max(0, Math.min(1, d / len));
  return t.to + (t.off - t.to) * k;
}
