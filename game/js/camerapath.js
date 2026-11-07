import { pointInPolygon } from './util.js';
import { tourKeys } from './wijkintocht.js';

// Camera paths for cutscenes, free of DOM and three.js: poses use map
// coordinates (x/y on the map, z = height in metres).

export const V = (x, y, z) => ({ x, y, z });
export const W = (wx, h, wy) => ({ x: wx, y: wy, z: h });
export const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);
export const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
export const easeOut = (t) => 1 - (1 - t) ** 3;

function cr(a, b, c, d, t) {
  const t2 = t * t, t3 = t2 * t;
  const f = (p0, p1, p2, p3) => 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
  return V(f(a.x, b.x, c.x, d.x), f(a.y, b.y, c.y, d.y), f(a.z, b.z, c.z, d.z));
}

// Smooth Catmull-Rom camera move through evenly timed keyframes {pos, look, fov?}.
export function pathShot(keys, ease = easeInOut) {
  return (u) => {
    const s = ease(clamp01(u)) * (keys.length - 1);
    const i = Math.min(keys.length - 2, Math.floor(s));
    const t = s - i;
    const k0 = keys[Math.max(0, i - 1)], k1 = keys[i], k2 = keys[i + 1], k3 = keys[Math.min(keys.length - 1, i + 2)];
    const pose = { position: cr(k0.pos, k1.pos, k2.pos, k3.pos, t), lookAt: cr(k0.look, k1.look, k2.look, k3.look, t) };
    if (k1.fov != null && k2.fov != null) pose.fov = k1.fov + (k2.fov - k1.fov) * t;
    return pose;
  };
}

const LEVEL_H = 3.1;

export function roofAt(map, x, y) {
  let top = 0;
  for (const b of map.buildingsNear(x, y, 1)) {
    const [x0, y0, x1, y1] = b.bounds;
    if (x < x0 || x > x1 || y < y0 || y > y1 || !pointInPolygon(x, y, b.pts)) continue;
    top = Math.max(top, (b.h || 3) * LEVEL_H + 3.5);
  }
  return top;
}

function edgeDistance(x, y, pts) {
  let best = Infinity;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy;
    const t = l2 > 0 ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / l2)) : 0;
    best = Math.min(best, Math.hypot(x - (a[0] + t * dx), y - (a[1] + t * dy)));
  }
  return best;
}

// How far the building at (x, y) reaches from that point (the farthest corner of its bounds) and how high its roof
// is. A landmark orbit has to start outside this reach: the Forum is 85 m wide, so an orbit of 28 m around its
// point runs through the building (#329). Only the buildings that hold the point count; a landmark point beside its building (within `pad` m) takes the
// closest landmark building instead, not every big neighbour.
export function buildingReach(map, x, y, pad = 12) {
  let near = null, nearD = pad;
  const hold = [];
  const corners = (b) => { let r = 0; const [x0, y0, x1, y1] = b.bounds; for (const cx of [x0, x1]) for (const cy of [y0, y1]) r = Math.max(r, Math.hypot(cx - x, cy - y)); return r; };
  for (const b of map.buildingsNear(x, y, 80)) {
    const [x0, y0, x1, y1] = b.bounds;
    if (x < x0 - pad || x > x1 + pad || y < y0 - pad || y > y1 + pad) continue;
    if (pointInPolygon(x, y, b.pts)) { hold.push({ r: corners(b), t: (b.h || 3) * LEVEL_H + 3.5 }); continue; }
    // a landmark point just beside its building: the closest such building, not every big neighbour
    const d = b.landmark ? edgeDistance(x, y, b.pts) : Infinity;
    if (d <= nearD) { near = b; nearD = d; }
  }
  // of the buildings that hold the point the tall ones count: a low plinth or hall under a tower does not set the orbit
  const top = Math.max(0, ...hold.map((q) => q.t));
  const reach = Math.max(0, ...hold.filter((q) => q.t >= top * 0.6).map((q) => q.r));
  if (!hold.length && near) return { reach: corners(near), top: (near.h || 3) * LEVEL_H + 3.5 };
  return { reach, top };
}

// Lifts any keyframe that would sit inside a building up over its roof.
export function clearKeys(w, keys) {
  const lift = keys.map((k) => roofAt(w.map, k.pos.x, k.pos.y));
  for (let i = 0; i + 1 < keys.length; i++) {
    const m = roofAt(w.map, (keys[i].pos.x + keys[i + 1].pos.x) / 2, (keys[i].pos.y + keys[i + 1].pos.y) / 2);
    lift[i] = Math.max(lift[i], m);
    lift[i + 1] = Math.max(lift[i + 1], m);
  }
  keys.forEach((k, i) => { if (lift[i] && k.pos.z < lift[i] + 1.5) k.pos.z = lift[i] + 1.5; });
  return keys;
}

// Highest roof within `side` metres of the line a-b (sampled).
function roofline(w, ax, ay, bx, by, side) {
  const len = Math.hypot(bx - ax, by - ay) || 1;
  const nx = -(by - ay) / len, ny = (bx - ax) / len;
  let top = 0;
  const n = Math.max(2, Math.ceil(len / 12));
  for (let i = 0; i <= n; i++) {
    const x = ax + (bx - ax) * (i / n), y = ay + (by - ay) * (i / n);
    for (const o of [-side, -side / 2, 0, side / 2, side]) top = Math.max(top, roofAt(w.map, x + nx * o, y + ny * o));
  }
  return top;
}

// a: the player's heading; behind: the closing pose behind the player {pos, look}.
// clearKeys, plus every roof along each leg (not just its midpoint)
function clearPath(w, keys) {
  clearKeys(w, keys);
  for (let i = 0; i + 1 < keys.length; i++) {
    const a = keys[i].pos, b = keys[i + 1].pos;
    const top = roofline(w, a.x, a.y, b.x, b.y, 3) + 2;
    if (a.z < top) a.z = top;
    if (b.z < top) b.z = top;
  }
  return keys;
}

// De intocht (#706): één lange tocht van het overzicht door de stops naar het eindbeeld achter
// de speler. De keyframes komen uit wijkintocht.js (data-gedreven), clearPath tilt ze over de
// daken en pathShot maakt er een vloeiende baan van. Puur: alleen de kaart en de poses.
export function veroverTourShot(w, gebied, stops, behind, opts = {}) {
  if (!w || !w.map || !gebied || !Array.isArray(stops) || !stops.length) return null;
  return pathShot(clearPath(w, tourKeys(gebied, stops, behind, opts)), (t) => t);
}
