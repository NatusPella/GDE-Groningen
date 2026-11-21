// The frame of an enterable interior (epic Interieurs, #1150): where the hall of a building lies
// behind its front door. Pure geometry, no scene, no map: (footprint ring, door) in, rectangle out.
//
// Local frame of a door: origin on the facade line at the door, u along the facade (the edge tangent),
// v INTO the building (against the outward normal). The hall is the largest axis-aligned (in that
// frame) rectangle that starts behind the facade wall and lies inside the footprint with a margin,
// so the interior is always inside the building the player sees from outside: the same footprint,
// the same door, no separate place (docs/INTERIEURS-21-11.md).
import { pointInPolygon, distToRing } from './shopbind.js';

// Facade line to the inner wall face (the facade mesh has no thickness: the interior is a shell
// inside it) and side walls to the footprint edge.
export const WALL_T = 0.3;
export const INSET = 0.25;
export const HALL_STEP = 0.5;
export const MAX_HALL_W = 26;
export const MAX_HALL_D = 18;

// door: an edge of the ring ({ ax, ay, tx, ty, nx, ny, len }) and the distance c from its start
export function frameOf(edge, c) {
  return { ox: edge.ax + edge.tx * c, oy: edge.ay + edge.ty * c, tx: edge.tx, ty: edge.ty, nx: edge.nx, ny: edge.ny };
}

export const toWorld = (f, u, v) => [f.ox + f.tx * u - f.nx * v, f.oy + f.ty * u - f.ny * v];
export const toLocal = (f, x, y) => {
  const dx = x - f.ox, dy = y - f.oy;
  return [dx * f.tx + dy * f.ty, -(dx * f.nx + dy * f.ny)];
};
// a direction in local axes to the world: (du, dv)
export const dirToWorld = (f, du, dv) => [f.tx * du - f.nx * dv, f.ty * du - f.ny * dv];

// the closing duplicate of a ring (b.pts closes itself) is dropped
export function openRing(pts) {
  if (!pts || pts.length < 3) return [];
  const a = pts[0], z = pts[pts.length - 1];
  return a[0] === z[0] && a[1] === z[1] ? pts.slice(0, -1) : pts;
}

// The hall behind a door: { u0, u1, v0, v1 } in the door frame (v0 = WALL_T), or null when the
// footprint offers less than min.w x min.d behind it or the door would sit in a corner.
// A point counts as free when it lies inside the footprint with INSET to every edge.
export function findHall(ring, f, opts = {}) {
  const minW = opts.minW ?? 3, minD = opts.minD ?? 3, maxW = opts.maxW ?? MAX_HALL_W, maxD = opts.maxD ?? MAX_HALL_D;
  const doorClear = opts.doorClear ?? 0.9;
  const R = openRing(ring);
  if (R.length < 3) return null;
  const free = (u, v) => {
    const [x, y] = toWorld(f, u, v);
    return pointInPolygon(x, y, R) && distToRing(x, y, R) >= INSET - 1e-6;
  };
  const colFree = (u, d) => {
    for (let v = WALL_T; v < d - 1e-6; v += HALL_STEP) if (!free(u, v + 0.01)) return false;
    return free(u, d);
  };
  let best = null;
  for (let d = WALL_T + minD; d <= WALL_T + maxD + 1e-6; d += HALL_STEP) {
    if (!colFree(0, d)) break;
    let u0 = 0, u1 = 0;
    while (u0 - HALL_STEP >= -maxW / 2 && colFree(u0 - HALL_STEP, d)) u0 -= HALL_STEP;
    while (u1 + HALL_STEP <= maxW / 2 && colFree(u1 + HALL_STEP, d)) u1 += HALL_STEP;
    if (u1 - u0 < minW || u0 > -doorClear || u1 < doorClear) continue;
    const area = (u1 - u0) * (d - WALL_T);
    if (!best || area > best.area) best = { u0, u1, v0: WALL_T, v1: d, area };
  }
  if (!best) return null;
  // refine: grow every side in steps of 10 cm while the new edge stays free
  let { u0, u1, v1 } = best;
  const rowFree = (v, a, b) => { for (let u = a; u < b - 1e-6; u += HALL_STEP) if (!free(u, v)) return false; return free(b, v); };
  const FINE = 0.1;
  for (let k = 0; k < 5 && u0 - FINE >= -maxW / 2 && colFree(u0 - FINE, v1); k++) u0 -= FINE;
  for (let k = 0; k < 5 && u1 + FINE <= maxW / 2 && colFree(u1 + FINE, v1); k++) u1 += FINE;
  for (let k = 0; k < 5 && v1 + FINE <= WALL_T + maxD && rowFree(v1 + FINE, u0, u1); k++) v1 += FINE;
  const r2 = (x) => Math.round(x * 100) / 100;
  return { u0: r2(u0), u1: r2(u1), v0: best.v0, v1: r2(v1) };
}
