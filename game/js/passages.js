// Building passages: the corridors that footways and streets cut through a
// footprint (collision.js keeps walkers inside them, vehicle.js and the spot
// checks treat them as open ground, models3d_buildings.js cuts the opening).
import { closestPointOnSegment, pointInPolygon } from './util.js';
import { rectDist } from './museumplan.js';

// A way that enters a footprint and leaves it again is a building passage
// when OSM maps it as one (tunnel=building_passage, covered, arcades), when
// it is a street (traffic drives it, so it must be a real opening), or when
// it is a footway or cycleway run of a plausible poortje length. Longer
// footway runs are indoor corridors, and the outlines of pedestrian areas
// that clip a facade or a corner by a metre are no passage: those stay wall.
const PASSAGE_MAX = 60;
const MAPPED_MAX = 150;
const CLIP_MIN = 2.5;
const SAMPLE = 0.5;

function keepRun(r, len, mapped) {
  if (mapped) return len <= MAPPED_MAX;
  if (r.cat !== 'foot' && r.cat !== 'cycle') return len <= MAPPED_MAX;
  if (r.type === 'pedestrian') return false;
  return len >= CLIP_MIN && len <= PASSAGE_MAX;
}

function passageHalfWidth(r) {
  const w = r.width || 3;
  if (r.cat === 'foot' || r.cat === 'cycle') return Math.max(0.9, w / 2);
  return Math.max(1.2, w / 2 - 0.2);
}

function pathLength(P) {
  let L = 0;
  for (let i = 1; i < P.length; i++) L += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]);
  return L;
}

function outlineDist(x, y, pts) {
  let best = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const cp = closestPointOnSegment(x, y, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
    if (cp.dist2 < best) best = cp.dist2;
  }
  return Math.sqrt(best);
}

// How deep into the footprint a run gets (sampled along it).
function runDepth(run, ring) {
  let best = 0;
  for (let i = 0; i < run.length - 1; i++) {
    const [ax, ay] = run[i], [bx, by] = run[i + 1];
    const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / 0.5));
    for (let k = 0; k <= n; k++) best = Math.max(best, outlineDist(ax + (bx - ax) * k / n, ay + (by - ay) * k / n, ring));
  }
  return best;
}

// The OSM passage (tunnel=building_passage, covered, ...) this run follows:
// its middle within a few metres of a mapped passage way.
function mappedKind(map, run) {
  const ways = map.passageWays;
  if (!ways || !ways.length) return null;
  const L = pathLength(run);
  let s = L / 2, mx = run[0][0], my = run[0][1];
  for (let i = 1; i < run.length; i++) {
    const l = Math.hypot(run[i][0] - run[i - 1][0], run[i][1] - run[i - 1][1]);
    if (s <= l && l > 0) { mx = run[i - 1][0] + (run[i][0] - run[i - 1][0]) * s / l; my = run[i - 1][1] + (run[i][1] - run[i - 1][1]) * s / l; break; }
    s -= l;
  }
  for (const w of ways) {
    const [x0, y0, x1, y1] = w.bounds;
    if (mx < x0 - 4 || mx > x1 + 4 || my < y0 - 4 || my > y1 + 4) continue;
    for (let i = 0; i < w.pts.length - 1; i++) {
      if (closestPointOnSegment(mx, my, w.pts[i][0], w.pts[i][1], w.pts[i + 1][0], w.pts[i + 1][1]).dist2 < 16) return w.kind;
    }
  }
  return null;
}

// Corridors (polyline + half-width) of every way that runs through `b`,
// computed once per footprint on first contact. OSM often splits a passage
// into its own way ending on the wall nodes, so a run may also start or end
// at a way end that sits on the outline, and a passage made of several ways
// meeting inside the footprint (the cycle bridge through the Groninger
// Museum) counts once its pieces together reach the outline twice.
const EDGE_TOL = 1;
const JOIN_TOL = 0.4;
function computePassages(map, b) {
  const out = [], doors = [], runs = [];
  if (b.noPassages) return out;
  const [minx, miny, maxx, maxy] = b.bounds;
  const cx = (minx + maxx) / 2, cy = (miny + maxy) / 2;
  const reach = Math.max(maxx - minx, maxy - miny) / 2 + 2;
  for (const r of map.roadsNear(cx, cy, reach)) {
    const rb = r.bounds;
    if (rb && (rb[2] < minx || rb[0] > maxx || rb[3] < miny || rb[1] > maxy)) continue;
    const P = r.pts;
    let run = null, s0 = false, lastOut = null;
    const finish = (s1) => {
      // a footway that only grazes the facade (never deeper in than its own
      // width) is a pavement drawn a little into the wall, not a passage
      // (a street that clips a corner stays open for the traffic on it, but
      // there is nothing to show)
      const graze = run.length > 1 && runDepth(run, b.pts) <= Math.max(1.0, passageHalfWidth(r));
      if (run.length > 1 && (!graze || (r.cat !== 'foot' && r.cat !== 'cycle'))) runs.push({ pts: run, r, s0, s1, graze });
      run = null;
    };
    for (let i = 0; i < P.length - 1; i++) {
      const [ax, ay] = P[i], [bx, by] = P[i + 1];
      if (Math.max(ax, bx) < minx - 1 || Math.min(ax, bx) > maxx + 1 || Math.max(ay, by) < miny - 1 || Math.min(ay, by) > maxy + 1) {
        lastOut = [bx, by];
        continue;
      }
      const len = Math.hypot(bx - ax, by - ay);
      const n = Math.max(1, Math.ceil(len / SAMPLE));
      const last = i === P.length - 2;
      for (let k = 0; k <= n; k++) {
        if (k === n && !last) break;
        const t = k / n;
        const x = ax + (bx - ax) * t, y = ay + (by - ay) * t;
        const inside = x > minx && x < maxx && y > miny && y < maxy && pointInPolygon(x, y, b.pts);
        if (inside) {
          if (!run) {
            s0 = !!lastOut || outlineDist(x, y, b.pts) < EDGE_TOL;
            run = lastOut ? [lastOut] : [];
            if (k === 0 || !lastOut) run.push([x, y]);
          } else if (k === 0 || (k === n && last)) run.push([x, y]);
        } else {
          if (run) { run.push([x, y]); finish(true); }
          lastOut = [x, y];
        }
      }
    }
    if (run) {
      const e = run[run.length - 1];
      finish(outlineDist(e[0], e[1], b.pts) < EDGE_TOL);
    }
    for (const e of [P[0], P[P.length - 1]]) {
      if (e[0] > minx - 1 && e[0] < maxx + 1 && e[1] > miny - 1 && e[1] < maxy + 1 && outlineDist(e[0], e[1], b.pts) < EDGE_TOL && deadEnd(map, r, e)) doors.push(e);
    }
  }
  // join runs that meet inside the footprint
  const parent = runs.map((_, i) => i);
  const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const near = (p, q) => Math.abs(p[0] - q[0]) < JOIN_TOL && Math.abs(p[1] - q[1]) < JOIN_TOL;
  runs.forEach((ra, i) => {
    for (const [end, open] of [[ra.pts[0], ra.s0], [ra.pts[ra.pts.length - 1], ra.s1]]) {
      if (open) continue;
      runs.forEach((rb, j) => { if (j !== i && rb.pts.some((q) => near(q, end))) parent[find(i)] = find(j); });
    }
  });
  const groups = new Map();
  runs.forEach((ra, i) => { const k = find(i); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(ra); });
  for (const g of groups.values()) {
    const ends = [];
    for (const ra of g) {
      if (ra.s0) ends.push(ra.pts[0]);
      if (ra.s1) ends.push(ra.pts[ra.pts.length - 1]);
    }
    if (ends.length < 2 || !ends.some((e) => Math.hypot(e[0] - ends[0][0], e[1] - ends[0][1]) > 1.5)) continue;
    // how far the passage takes you: its longest piece or the span between its ends
    let len = Math.max(...g.map((ra) => pathLength(ra.pts)));
    for (const a of ends) for (const e of ends) len = Math.max(len, Math.hypot(a[0] - e[0], a[1] - e[1]));
    const mapped = g.map((ra) => mappedKind(map, ra.pts)).find(Boolean) || null;
    for (const ra of g) {
      if (!keepRun(ra.r, len, mapped)) continue;
      out.push({ pts: ra.pts, hw: passageHalfWidth(ra.r), len, mapped, cat: ra.r.cat, road: ra.r, shown: len >= CLIP_MIN && !ra.graze });
    }
  }
  linkDoors(b, doors, out);
  return out;
}

// Footways that stop dead at a wall are doors. Two doors of one building
// that face each other through it (the Academiegebouw's front entrance and
// its courtyard door) are joined by a straight hall, so a courtyard whose
// only way out is through the building can be left on foot.
const HALL_MIN = 4, HALL_MAX = 45, HALL_HW = 1.1;
function deadEnd(map, way, e) {
  for (const o of map.roadsNear(e[0], e[1], 1)) {
    if (o === way) continue;
    for (const q of o.pts) if (Math.abs(q[0] - e[0]) < 0.3 && Math.abs(q[1] - e[1]) < 0.3) return false;
  }
  return true;
}
function linkDoors(b, doors, out) {
  if (doors.length < 2) return;
  const linked = new Set();
  for (let i = 0; i < doors.length; i++) {
    let best = -1, bestD = HALL_MAX;
    for (let j = 0; j < doors.length; j++) {
      if (j === i) continue;
      const d = Math.hypot(doors[j][0] - doors[i][0], doors[j][1] - doors[i][1]);
      if (d < HALL_MIN || d >= bestD || !throughInterior(b, doors[i], doors[j], d)) continue;
      best = j; bestD = d;
    }
    if (best < 0) continue;
    const key = Math.min(i, best) + ',' + Math.max(i, best);
    if (linked.has(key)) continue;
    linked.add(key);
    out.push({ pts: [doors[i], doors[best]], hw: HALL_HW, hall: true });
  }
}

function throughInterior(b, a, c, d) {
  const n = Math.ceil(d / SAMPLE);
  for (let k = 1; k < n; k++) {
    const t = k / n, s = t * d;
    if (s < 1.5 || d - s < 1.5) continue;
    if (!pointInPolygon(a[0] + (c[0] - a[0]) * t, a[1] + (c[1] - a[1]) * t, b.pts)) return false;
  }
  return true;
}

export function passagesOf(map, b) {
  return b.passages || (b.passages = computePassages(map, b));
}

// Nearest corridor centreline point to (x, y), in a shared result object.
const _c = { d: Infinity, x: 0, y: 0, hw: 0 };
export function nearestCorridor(passages, x, y) {
  _c.d = Infinity;
  for (const ps of passages) {
    const P = ps.pts;
    for (let i = 0; i < P.length - 1; i++) {
      const cp = closestPointOnSegment(x, y, P[i][0], P[i][1], P[i + 1][0], P[i + 1][1]);
      // rank by distance relative to each corridor's own width
      const d = Math.sqrt(cp.dist2);
      if (d - ps.hw < _c.d - _c.hw) { _c.d = d; _c.x = cp.x; _c.y = cp.y; _c.hw = ps.hw; }
    }
  }
  return _c;
}

// Is (x, y) inside one of the corridors cut through footprint `b`?
// Walkable rooms inside a footprint (b.rooms, museumplan.js): the room of
// (x, y) or null. `who`: 'walker', 'bike' (rooms open to bikes) or 'car' (none).
export function roomAt(b, x, y, slack = 0, who = 'walker') {
  if (!b.rooms || who === 'car') return null;
  for (const r of b.rooms) if ((who !== 'bike' || r.bikes) && rectDist(r, x, y) < slack) return r;
  return null;
}

export function inPassage(map, b, x, y, slack = 0, who = 'walker') {
  if (b.rooms && roomAt(b, x, y, slack, who)) return true;
  const passages = passagesOf(map, b);
  if (!passages.length) return false;
  const c = nearestCorridor(passages, x, y);
  return c.d < c.hw + slack;
}
