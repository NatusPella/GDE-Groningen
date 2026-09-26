// Shared on-foot collision for everything that walks (player, companion,
// pedestrians, animals): building footprints - minus the passages that
// footways and streets cut through them - and solid street props.
import { closestPointOnSegment, pointInPolygon } from './util.js';
import { resolveWalkerProps } from './breakables.js';
import { countryWeight } from './countryfield.js';
import { pushOutOfPlan } from './countryplan.js';
import { resolveRailings } from './bridgerails.js';
import { resolveElevWalls } from './elevation.js';
import { pushOutOfWaterObstacles } from './waterindex.js';

// A way that enters a footprint and leaves it again within this length is a
// building passage (OSM tunnel=building_passage, arcades, poortjes); longer
// runs are indoor corridors and stay closed.
const PASSAGE_MAX = 60;
const SAMPLE = 0.5;
// how far past the corridor's half-width a walker already inside the
// footprint is still pulled back into the corridor rather than out of the
// building
const PASSAGE_SLACK = 0.6;

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

// Corridors (polyline + half-width) of every way that runs through `b`,
// computed once per footprint on first contact. OSM often splits a passage
// into its own way ending on the wall nodes, so a run may also start or end
// at a way end that sits on the outline.
const EDGE_TOL = 1;
function computePassages(map, b) {
  const out = [], doors = [];
  const [minx, miny, maxx, maxy] = b.bounds;
  const cx = (minx + maxx) / 2, cy = (miny + maxy) / 2;
  const reach = Math.max(maxx - minx, maxy - miny) / 2 + 2;
  for (const r of map.roadsNear(cx, cy, reach)) {
    const rb = r.bounds;
    if (rb && (rb[2] < minx || rb[0] > maxx || rb[3] < miny || rb[1] > maxy)) continue;
    const P = r.pts;
    let run = null, open = false, lastOut = null;
    const finish = () => {
      if (open && pathLength(run) <= PASSAGE_MAX) out.push({ pts: run, hw: passageHalfWidth(r) });
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
            open = !!lastOut || outlineDist(x, y, b.pts) < EDGE_TOL;
            run = lastOut ? [lastOut] : [];
            if (k === 0 || !lastOut) run.push([x, y]);
          } else if (k === 0 || (k === n && last)) run.push([x, y]);
        } else {
          if (run) { run.push([x, y]); finish(); }
          lastOut = [x, y];
        }
      }
    }
    if (run) {
      const e = run[run.length - 1];
      open = open && run.length > 1 && outlineDist(e[0], e[1], b.pts) < EDGE_TOL;
      finish();
    }
    for (const e of [P[0], P[P.length - 1]]) {
      if (e[0] > minx - 1 && e[0] < maxx + 1 && e[1] > miny - 1 && e[1] < maxy + 1 && outlineDist(e[0], e[1], b.pts) < EDGE_TOL && deadEnd(map, r, e)) doors.push(e);
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
function nearestCorridor(passages, x, y) {
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

// Push a circle out of any nearby building polygon it overlaps - including
// when its centre is already inside, where the nearest-edge vector points
// outward rather than away from the wall. Inside a passage the circle is
// kept within the corridor instead.
export function resolveBuildingCollisions(x, y, radius, map) {
  const nearby = map.buildingsNear(x, y, radius + 2);
  // several passes: in a tight gap between two buildings one push can land
  // against the other wall
  for (let iter = 0; iter < 5; iter++) {
    for (const b of nearby) {
      const [minx, miny, maxx, maxy] = b.bounds;
      if (x < minx - radius || x > maxx + radius || y < miny - radius || y > maxy + radius) continue;
      const pts = b.pts;
      let bestDist2 = Infinity, bestX = 0, bestY = 0, bestI = 0;
      for (let i = 0; i < pts.length - 1; i++) {
        const cp = closestPointOnSegment(x, y, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
        if (cp.dist2 < bestDist2) { bestDist2 = cp.dist2; bestX = cp.x; bestY = cp.y; bestI = i; }
      }
      const d = Math.sqrt(bestDist2);
      const inside = pointInPolygon(x, y, pts);
      if (!inside && d >= radius) continue;
      const passages = passagesOf(map, b);
      if (passages.length) {
        if (inside) {
          const c = nearestCorridor(passages, x, y);
          if (c.d < c.hw + PASSAGE_SLACK) {
            const lim = Math.max(0.05, c.hw - radius);
            if (c.d > lim) { x = c.x + (x - c.x) / c.d * lim; y = c.y + (y - c.y) / c.d * lim; }
            continue;
          }
        } else {
          const c = nearestCorridor(passages, bestX, bestY);
          if (c.d < c.hw) continue;
        }
      }
      let ox, oy;
      if (d > 1e-6) {
        ox = (x - bestX) / d;
        oy = (y - bestY) / d;
        if (inside) { ox = -ox; oy = -oy; }
      } else {
        const ex = pts[bestI + 1][0] - pts[bestI][0], ey = pts[bestI + 1][1] - pts[bestI][1];
        const el = Math.hypot(ex, ey) || 1;
        ox = -ey / el;
        oy = ex / el;
        if (pointInPolygon(bestX + ox * radius, bestY + oy * radius, pts)) { ox = -ox; oy = -oy; }
      }
      x = bestX + ox * radius;
      y = bestY + oy * radius;
    }
  }
  // Ommelanden farmsteads, houses, silos, masts and terps (countryplan)
  if (countryWeight(x, y) > 0.5) {
    const o = { x, y };
    if (pushOutOfPlan(o, radius)) { x = o.x; y = o.y; }
  }
  return [x, y];
}

// One walker step: props first (a bumped post nudges you sideways), then the
// buildings, which always win. `vx, vy` is the walker's velocity - fast enough
// and light props get kicked over instead of blocking; `opts.kick` false keeps
// every prop solid, `opts.skipSeats` lets a ped reach its bench or chair.
// z: the walker's absolute height (ring viaducts, cuttings - elevation.js);
// up on a deck or down in a cutting the street-level buildings don't apply.
// hop: feet height above the ground while jumping; low props and railings
// under the feet are jumped over.
export function resolveWalker(x, y, radius, map, vx = 0, vy = 0, opts = null, z = 0, hop = 0) {
  if (map.elev && map.elev.has) {
    const w = resolveElevWalls(map.elev, x, y, z, radius);
    if (w) [x, y] = w;
    if (z > 4 || z < -3.5) return [x, y];
  }
  [x, y] = resolveWalkerProps(x, y, radius, vx, vy, opts, hop);
  [x, y] = resolveRailings(x, y, radius, map, hop);
  // moored houseboats along the quays are solid too
  const hb = pushOutOfWaterObstacles(map, x, y, radius);
  if (hb) [x, y] = hb;
  return resolveBuildingCollisions(x, y, radius, map);
}

// Is (x, y) inside one of the corridors cut through footprint `b`?
export function inPassage(map, b, x, y) {
  const passages = passagesOf(map, b);
  if (!passages.length) return false;
  const c = nearestCorridor(passages, x, y);
  return c.d < c.hw;
}
