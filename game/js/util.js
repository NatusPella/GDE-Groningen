import { waterClearance } from './waterindex.js';
import { waterPolyAt, BRIDGE_DRY } from './waterlevels.js';
import { pointInPolygon } from './polygon.js';
// Uploads only the first `count` instances of an instanced attribute: a
// pool sized for thousands would otherwise send its whole array each time.
export function markInstancesDirty(attr, count) {
  attr.clearUpdateRanges();
  if (count > 0) attr.addUpdateRange(0, count * attr.itemSize);
  attr.needsUpdate = count > 0;
}
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const dist = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);
export const dist2 = (x1, y1, x2, y2) => { const dx = x2 - x1, dy = y2 - y1; return dx * dx + dy * dy; };

export function angleLerp(a, b, t) {
  return a + normalizeAngle(b - a) * t;
}

export function normalizeAngle(a) {
  a = a % (Math.PI * 2);
  if (a > Math.PI) a -= Math.PI * 2;
  if (a < -Math.PI) a += Math.PI * 2;
  return a;
}

// Closest point on segment [a,b] to point p. Returns {x,y,t,dist2}.
// Nearest point on the centre line of any road of the list that passes ok(road): the one plain
// scan under tileplace.nearestOnRoads and the tile generator's nearestRoad (#102). -> { road, i (segment),
// t, x, y, d2, d, dx, dy (the segment's direction), ux, uy (unit) } or null.
export function nearestOnRoadList(roads, x, y, ok = null) {
  let best = null;
  for (const road of roads) {
    if (ok && !ok(road)) continue;
    const P = road.pts;
    for (let i = 0; i < P.length - 1; i++) {
      const cp = closestPointOnSegment(x, y, P[i][0], P[i][1], P[i + 1][0], P[i + 1][1]);
      if (!best || cp.dist2 < best.d2) best = { road, i, t: cp.t, x: cp.x, y: cp.y, d2: cp.dist2, dx: P[i + 1][0] - P[i][0], dy: P[i + 1][1] - P[i][1] };
    }
  }
  if (best) { best.d = Math.sqrt(best.d2); const L = Math.hypot(best.dx, best.dy) || 1e-9; best.ux = best.dx / L; best.uy = best.dy / L; }
  return best;
}

export function closestPointOnSegment(px, py, ax, ay, bx, by) {
  const abx = bx - ax, aby = by - ay;
  const len2 = abx * abx + aby * aby;
  let t = len2 > 1e-9 ? ((px - ax) * abx + (py - ay) * aby) / len2 : 0;
  t = clamp(t, 0, 1);
  const cx = ax + abx * t, cy = ay + aby * t;
  return { x: cx, y: cy, t, dist2: dist2(px, py, cx, cy) };
}

// Distance from (px, py) to the segment (ax, ay)-(bx, by).
export function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy;
  const t = L2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / L2)) : 0;
  return Math.hypot(px - ax - dx * t, py - ay - dy * t);
}

// Ray-casting point-in-polygon. poly: [[x,y],...] (closed or open, ok either way).
export { pointInPolygon };

// On-foot water test shared by player/companion/peds: the water rule (waterlevels.js waterPolyAt)
// with its height and bridge vetoes. The polygon test runs first because map.isOnBridge scans
// nearby roads and is only needed to veto a hit.
// z (absolute height, optional): below the canal in an aqueduct is dry.

export function isInWater(map, x, y, z = 0) {
  return !!waterPolyAt(map, x, y, z, BRIDGE_DRY);
}

// Canal surface: real Groningen canals lie 2-2.5 m below the quays, which
// leaves a seated boater's head clear of the ~0.5 m bridge decks.
export const WATER_Y = -2.3;

// Raw water-polygon test without the bridge veto: a swimmer under a bridge
// is still in the water. Inside one of the map's own water polygons.
export function inMapWater(map, x, y) {
  return !!waterPolyAt(map, x, y);
}

// Hull probes (bow, stern, both beams, the quarters, the centre) in boat-local
// metres; a probe counts as dry when it has less than BOAT_EDGE_CLEAR of free
// water around it (quay walls, banks, moored houseboats).
export const BOAT_EDGE_CLEAR = 1.0;
function hullProbes(v) {
  const h = (v.model.len || 4) * 0.5, bw = (v.model.wid || 1.6) * 0.5;
  return [[0, 0], [h, 0], [-h, 0], [0, bw], [0, -bw], [h * 0.6, bw], [h * 0.6, -bw], [-h * 0.6, bw], [-h * 0.6, -bw]];
}

// how many hull probes are too close to the shore at (x, y, angle)
export function boatDryPoints(map, v, x, y, angle) {
  const c = Math.cos(angle), s = Math.sin(angle);
  let dry = 0;
  for (const [lx, ly] of hullProbes(v)) {
    if (waterClearance(map, x + lx * c - ly * s, y + lx * s + ly * c, BOAT_EDGE_CLEAR + 0.5) < BOAT_EDGE_CLEAR) dry++;
  }
  return dry;
}

// how far the hull reaches into the clearance band, summed over the probes:
// compare before/after a move to let a boat that already touches back off
// while refusing any move that pushes it further in
export function boatShoreDepth(map, v, x, y, angle) {
  const c = Math.cos(angle), s = Math.sin(angle);
  let depth = 0;
  for (const [lx, ly] of hullProbes(v)) {
    const d = waterClearance(map, x + lx * c - ly * s, y + lx * s + ly * c, BOAT_EDGE_CLEAR + 0.5);
    if (d < BOAT_EDGE_CLEAR) depth += BOAT_EDGE_CLEAR - Math.max(d, -2);
  }
  return depth;
}

// After a boat moved from (px, py, pa) to its current pose: keep the move when
// it doesn't push the hull further into the shore band, otherwise slide
// (keep only the part of the move along the wall), else undo it. Returns
// false when the boat was stopped.
export function keepBoatOffShore(map, v, px, py, pa) {
  const before = boatShoreDepth(map, v, px, py, pa);
  const ok = (x, y, a) => { const d = boatShoreDepth(map, v, x, y, a); return d < 1e-3 || d <= before + 1e-4; };
  const nx = v.x, ny = v.y, na = v.angle;
  if (ok(nx, ny, na)) return true;
  for (const [x, y, a] of [[nx, py, na], [px, ny, na], [nx, py, pa], [px, ny, pa], [px, py, na]]) {
    if (ok(x, y, a)) { v.x = x; v.y = y; v.angle = a; v.speed *= 0.92; return x !== px || y !== py; }
  }
  v.x = px; v.y = py; v.angle = pa;
  return false;
}

export function polygonBounds(poly) {
  let minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
  for (const [x, y] of poly) {
    if (x < minx) minx = x;
    if (x > maxx) maxx = x;
    if (y < miny) miny = y;
    if (y > maxy) maxy = y;
  }
  return [minx, miny, maxx, maxy];
}

export function segIntersect(p0, p1, p2, p3) {
  const d1x = p1[0] - p0[0], d1y = p1[1] - p0[1];
  const d2x = p3[0] - p2[0], d2y = p3[1] - p2[1];
  const denom = d1x * d2y - d1y * d2x;
  if (Math.abs(denom) < 1e-9) return null;
  const dx = p2[0] - p0[0], dy = p2[1] - p0[1];
  const t = (dx * d2y - dy * d2x) / denom;
  const u = (dx * d1y - dy * d1x) / denom;
  if (t < 0 || t > 1 || u < 0 || u > 1) return null;
  return { x: p0[0] + d1x * t, y: p0[1] + d1y * t, t, u };
}

export class SeededRng {
  constructor(seed) { this.s = seed >>> 0 || 1; }
  next() {
    let x = this.s;
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    this.s = x >>> 0;
    return this.s / 4294967296;
  }
  range(lo, hi) { return lo + this.next() * (hi - lo); }
  pick(arr) { return arr[Math.floor(this.next() * arr.length)]; }
}
