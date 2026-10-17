import { waterClearance } from './waterindex.js';
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
export function closestPointOnSegment(px, py, ax, ay, bx, by) {
  const abx = bx - ax, aby = by - ay;
  const len2 = abx * abx + aby * aby;
  let t = len2 > 1e-9 ? ((px - ax) * abx + (py - ay) * aby) / len2 : 0;
  t = clamp(t, 0, 1);
  const cx = ax + abx * t, cy = ay + aby * t;
  return { x: cx, y: cy, t, dist2: dist2(px, py, cx, cy) };
}

// Ray-casting point-in-polygon. poly: [[x,y],...] (closed or open, ok either way).
export function pointInPolygon(px, py, poly) {
  let inside = false;
  const n = poly.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = poly[i][0], yi = poly[i][1];
    const xj = poly[j][0], yj = poly[j][1];
    const intersect = ((yi > py) !== (yj > py)) &&
      (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

// pointInPolygon for large polygons that never change (water): the edges
// are bucketed by height bands once, a test only walks the band of py.
// Same crossing rule, so the same answer.
const pipBands = new WeakMap();
function bandsOf(poly) {
  let B = pipBands.get(poly);
  if (B) return B;
  const n = poly.length;
  let y0 = Infinity, y1 = -Infinity;
  for (const p of poly) { if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; }
  const nb = Math.max(1, Math.min(4096, n >> 2));
  const bh = (y1 - y0) / nb || 1;
  const lists = Array.from({ length: nb }, () => []);
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const a = poly[i][1], b = poly[j][1];
    const k0 = Math.max(0, Math.min(nb - 1, Math.floor((Math.min(a, b) - y0) / bh)));
    const k1 = Math.max(0, Math.min(nb - 1, Math.floor((Math.max(a, b) - y0) / bh)));
    for (let k = k0; k <= k1; k++) lists[k].push(i, j);
  }
  B = { y0, y1, bh, nb, lists };
  pipBands.set(poly, B);
  return B;
}
export function pointInStaticPolygon(px, py, poly) {
  if (poly.length < 48) return pointInPolygon(px, py, poly);
  const B = bandsOf(poly);
  if (py < B.y0 || py >= B.y1) return false;
  const L = B.lists[Math.max(0, Math.min(B.nb - 1, Math.floor((py - B.y0) / B.bh)))];
  let inside = false;
  for (let e = 0; e < L.length; e += 2) {
    const pi = poly[L[e]], pj = poly[L[e + 1]];
    const xi = pi[0], yi = pi[1], xj = pj[0], yj = pj[1];
    if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
}

// On-foot water test shared by player/companion/peds. The polygon
// test runs first because map.isOnBridge scans nearby roads and is only
// needed to veto a hit.
// z (absolute height, optional): below the canal in an aqueduct is dry.

export function isInWater(map, x, y, z = 0) {
  for (const w of map.waterNear(x, y, 0.5)) {
    const [minx, miny, maxx, maxy] = w.bounds;
    if (x < minx || x > maxx || y < miny || y > maxy) continue;
    if (pointInStaticPolygon(x, y, w.pts)) {
      if (z < -3 && map.coveredAt && map.coveredAt(x, y)) return false;
      if (z > 1.5) return false;
      return !map.isOnBridge(x, y);
    }
  }
  return false;
}

// Canal surface: real Groningen canals lie 2-2.5 m below the quays, which
// leaves a seated boater's head clear of the ~0.5 m bridge decks.
export const WATER_Y = -2.3;

// Raw water-polygon test without the bridge veto: a swimmer under a bridge
// is still in the water.
// inside one of the map's own water polygons
export function inMapWater(map, x, y) {
  for (const w of map.waterNear(x, y, 0.5)) {
    const [minx, miny, maxx, maxy] = w.bounds;
    if (x < minx || x > maxx || y < miny || y > maxy) continue;
    if (pointInPolygon(x, y, w.pts)) return true;
  }
  return false;
}

export function inWaterPoly(map, x, y) {
  return inMapWater(map, x, y);
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
