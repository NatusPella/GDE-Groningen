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

// On-foot water test shared by player/companion/peds/pickups. The polygon
// test runs first because map.isOnBridge scans nearby roads and is only
// needed to veto a hit.
export function isInWater(map, x, y) {
  for (const w of map.waterNear(x, y, 0.5)) {
    const [minx, miny, maxx, maxy] = w.bounds;
    if (x < minx || x > maxx || y < miny || y > maxy) continue;
    if (pointInPolygon(x, y, w.pts)) return !map.isOnBridge(x, y);
  }
  return false;
}

export const WATER_Y = -1.1;

// Raw water-polygon test without the bridge veto: a swimmer under a bridge
// is still in the water.
export function inWaterPoly(map, x, y) {
  for (const w of map.waterNear(x, y, 0.5)) {
    const [minx, miny, maxx, maxy] = w.bounds;
    if (x < minx || x > maxx || y < miny || y > maxy) continue;
    if (pointInPolygon(x, y, w.pts)) return true;
  }
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
