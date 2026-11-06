// Placement queries over the streamed tiles (docs/PROVINCIE-PLAN.md): the one way
// the city and the countryside ask "is something standing here" and "where is
// the nearest road". They read the map's buildings and roads (map.buildingsNear,
// map.roadsNear), so they answer for the tiles that are in. A place that is
// fixed ahead of the player (a shop door, a village's uitje) asks for its tiles
// first (withTiles) and then runs on what is resident.
import { pointInPolygon, closestPointOnSegment, nearestOnRoadList } from './util.js';

// A polygon's distance to a point, 0 inside it.
function polyDist(x, y, pts) {
  if (pointInPolygon(x, y, pts)) return 0;
  let best = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const cp = closestPointOnSegment(x, y, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
    if (cp.dist2 < best) best = cp.dist2;
  }
  return Math.sqrt(best);
}

// Signed metres from (x, y) to the edge of the water of the tiles that are in
// (map.waterNear and the flat water of the far tiles): positive on the water,
// negative on land (how far the shore is), -99 when none lies within R.
export function waterGap(map, x, y, R = 30) {
  let best = -99;
  const lists = [map.waterNear(x, y, R)];
  if (map.flatWaterNear) lists.push(map.flatWaterNear(x, y, R));
  for (const list of lists) {
    for (const w of list) {
      const q = w.bounds;
      if (q && (x < q[0] - R || x > q[2] + R || y < q[1] - R || y > q[3] + R)) continue;
      const P = w.pts;
      let d2 = Infinity;
      for (let i = 0; i < P.length - 1; i++) {
        const cp = closestPointOnSegment(x, y, P[i][0], P[i][1], P[i + 1][0], P[i + 1][1]);
        if (cp.dist2 < d2) d2 = cp.dist2;
      }
      const v = pointInPolygon(x, y, P) ? Math.sqrt(d2) : -Math.sqrt(d2);
      if (v > best) best = v;
    }
  }
  return best;
}

// The building whose outline (grown by m) holds (x, y), or null.
export function buildingAt(map, x, y, m = 0) {
  for (const b of map.buildingsNear(x, y, m + 1)) {
    const q = b.bounds;
    if (!q || x < q[0] - m || x > q[2] + m || y < q[1] - m || y > q[3] + m) continue;
    if (m <= 0 ? pointInPolygon(x, y, b.pts) : polyDist(x, y, b.pts) <= m) return b;
  }
  return null;
}

// A building's oriented box on its longest wall: { x, y (centre), w (along a), l (across), a, lv (storeys) }.
const BOX = new WeakMap();
export function boxOf(b) {
  if (BOX.has(b)) return BOX.get(b);
  const P = b.pts;
  let best = 0, a = 0;
  for (let i = 0; i < P.length - 1; i++) {
    const L = Math.hypot(P[i + 1][0] - P[i][0], P[i + 1][1] - P[i][1]);
    if (L > best) { best = L; a = Math.atan2(P[i + 1][1] - P[i][1], P[i + 1][0] - P[i][0]); }
  }
  const c = Math.cos(a), s = Math.sin(a);
  let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
  for (const [x, y] of P) {
    const u = x * c + y * s, v = -x * s + y * c;
    if (u < u0) u0 = u; if (u > u1) u1 = u; if (v < v0) v0 = v; if (v > v1) v1 = v;
  }
  const cu = (u0 + u1) / 2, cv = (v0 + v1) / 2;
  const box = { x: cu * c - cv * s, y: cu * s + cv * c, w: u1 - u0, l: v1 - v0, a, lv: b.h || 1 };
  BOX.set(b, box);
  return box;
}

// Moves obj ({x, y}) out of the buildings, radius clear of their walls.
export function pushOutOfBuildings(map, obj, radius) {
  const [x, y] = map.escapeBuilding(obj.x, obj.y, radius);
  const hit = x !== obj.x || y !== obj.y;
  obj.x = x; obj.y = y;
  return hit;
}

// A fixed spot (a shop door, a café, a padel door) inside a building, moved to
// just outside it (the building is solid: a door inside it can never be
// reached). null when the spot is clear. ok(x, y): the caller's own test (not
// in the water, not in another footprint).
export function clearOfBuildings(map, x, y, ok = () => true, margin = 0.9) {
  if (!buildingAt(map, x, y, 0.2)) return null;
  const [ex, ey] = map.escapeBuilding(x, y, margin);
  if (!buildingAt(map, ex, ey, 0.2) && ok(ex, ey)) return { x: ex, y: ey };
  for (let r = 2; r <= 14; r += 2) {
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      const [px, py] = map.escapeBuilding(x + Math.cos(a) * r, y + Math.sin(a) * r, margin);
      if (!buildingAt(map, px, py, 0.2) && ok(px, py)) return { x: px, y: py };
    }
  }
  return null;
}

// The road classes the old Ommeland data coded (motorway 1, slip roads 2,
// trunk and primary 3, secondary 4, tertiary 5, unclassified 6, residential
// 7); 0 for the rest (service, track, paths).
const KIND = {
  motorway: 1, motorway_link: 2, trunk_link: 2, primary_link: 2, secondary_link: 2, tertiary_link: 2,
  trunk: 3, primary: 3, secondary: 4, tertiary: 5, unclassified: 6, residential: 7, living_street: 7,
};
export const roadKind = (r) => KIND[r.type] || 0;
// a road a car may stop on or be placed beside (no motorway or slip road)
export const carRoad = (r) => roadKind(r) > 2 && !r.bridge;

export function segDist(x, y, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy || 1)));
  const px = a[0] + dx * t, py = a[1] + dy * t;
  return [Math.hypot(px - x, py - y), px, py];
}

// Nearest road within R (to its edge) that passes ok(road): { d (< 0 on it),
// x, y (on the centre line), road, ux, uy (its direction) } or null. Only
// roads with a class (roadKind) count: paths and service roads are not roads
// for placing a door or a car.
export function roadNear(map, x, y, R = 40, ok = null) {
  let best = null;
  for (const r of map.roadsNear(x, y, R + 40)) {
    if (!roadKind(r) || (ok && !ok(r))) continue;
    const hw = (r.width || 5) / 2;
    const P = r.pts;
    for (let i = 0; i < P.length - 1; i++) {
      const [d, px, py] = segDist(x, y, P[i], P[i + 1]);
      const de = d - hw;
      if (de > R || (best && de >= best.d)) continue;
      const l = Math.hypot(P[i + 1][0] - P[i][0], P[i + 1][1] - P[i][1]) || 1;
      best = { d: de, x: px, y: py, road: r, ux: (P[i + 1][0] - P[i][0]) / l, uy: (P[i + 1][1] - P[i][1]) / l };
    }
  }
  return best;
}

// Nearest point on the centre line of any road within R that passes ok(road):
// { x, y, d2 (squared distance), road, i (segment), dx, dy (its direction) } or
// null. The plain point question ("where is the road") for callers that need
// no class, width or graph rules; roadNear is the one with road classes.
export function nearestOnRoads(map, x, y, R = 60, ok = null) {
  return nearestOnRoadList(map.roadsNear(x, y, R), x, y, ok);
}

// The name of the road within ~15 m of (x, y), or ''.
export function streetAt(map, x, y) {
  const q = roadNear(map, x, y, 15, (r) => !!(r.name || r.ref));
  return q ? q.road.name || q.road.ref : '';
}

// Is every tile round the points in? (a map without a tile store: always)
export function tilesIn(map, points, radius = 160) {
  const st = map.store;
  if (!st) return true;
  for (const [x, y] of points) if (st.missing(st.keysAround(x, y, radius)).length) return false;
  return true;
}

// Runs fn with the tiles round the points resident: they are asked for, held
// while fn runs and let go after. fn is sync, so what it places is placed on
// real data wherever the player is. A map without a tile store runs fn at once.
// slice (ms): the tiles go into the map's grids that many ms at a time, a
// frame apart (a title screen that keeps moving), instead of all at once.
export async function withTiles(map, points, fn, { radius = 160, token = 'place', slice = 0 } = {}) {
  const st = map.store;
  if (!st) return fn();
  const keys = new Set();
  for (const [x, y] of points) for (const k of st.keysAround(x, y, radius)) keys.add(k);
  for (const k of keys) st.pin(k);
  try {
    const t0 = performance.now();
    await Promise.all([...keys].map((k) => st.request(k, { priority: -500 }))); // geen token: dit venster wacht zijn beurt af en trekt niets in (#588)
    const t1 = performance.now();
    if (slice > 0 && typeof requestAnimationFrame === 'function') {
      // (a frame, or 50 ms when the window is hidden and frames stop)
      while (map.tileQueue.items.length) {
        map.tileQueue.run(slice);
        await new Promise((r) => { const t = setTimeout(r, 50); requestAnimationFrame(() => { clearTimeout(t); r(); }); });
      }
    } else map.tileQueue.run(1e9);
    const t2 = performance.now();
    const out = fn();
    // (window.__tileWindows: what each window cost, in ms, for the load-time budget)
    if (typeof window !== 'undefined') (window.__tileWindows || (window.__tileWindows = [])).push({ token, tiles: keys.size, load: Math.round(t1 - t0), add: Math.round(t2 - t1), fn: Math.round(performance.now() - t2) });
    return out;
  } finally {
    for (const k of keys) st.unpin(k);
  }
}
