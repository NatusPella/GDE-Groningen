import { BLOCK, ROAD_IN, ROAD_W, edgeRoad, maarX, maarY } from './countryfield.js';

// The railings of the polder bridges as lines, matching the decks
// countryside.js draws: a polder road over a maar (an 11 m deck, railings
// 2.95 m off the road's centre). Solid for vehicles (vehicle.js corner
// probes) and for walkers unless they jump over (collision.js). The bridges
// of the tiles have their own railings (the road meshes). Pure: no DOM, no
// three.js.

const ROAD_C = ROAD_IN + ROAD_W / 2;
const POLDER_RAIL = 2.95;
const POLDER_SPAN = 5.5;
export const COUNTRY_RAIL_H = 1.15;

const _lines = [];

function polderLines(bx, by, out) {
  const X = bx * BLOCK, Y = by * BLOCK;
  if (maarY(by) && edgeRoad(bx, by, 0) && edgeRoad(bx, by - 1, 0)) {
    for (const s of [1, -1]) out.push(X + ROAD_C + POLDER_RAIL * s, Y - POLDER_SPAN, X + ROAD_C + POLDER_RAIL * s, Y + POLDER_SPAN);
  }
  if (maarX(bx) && edgeRoad(bx, by, 1) && edgeRoad(bx - 1, by, 1)) {
    for (const s of [1, -1]) out.push(X - POLDER_SPAN, Y + ROAD_C + POLDER_RAIL * s, X + POLDER_SPAN, Y + ROAD_C + POLDER_RAIL * s);
  }
}

// Railing lines within about R of (x, y), flat [ax, ay, bx, by, ...] (shared array).
export function countryRailsNear(x, y, R = 4) {
  _lines.length = 0;
  for (let bx = Math.floor((x - R - POLDER_SPAN) / BLOCK); bx <= Math.floor((x + R + POLDER_SPAN) / BLOCK); bx++) {
    for (let by = Math.floor((y - R - POLDER_SPAN) / BLOCK); by <= Math.floor((y + R + POLDER_SPAN) / BLOCK); by++) polderLines(bx, by, _lines);
  }
  return _lines;
}

// First polder railing a walker at (x, y) heading along the unit (dx, dy) meets
// within `reach`: { dist, h, depth } or null. Used for vaulting over it (#959):
// the railing is 1.15 m, low enough to swing over like a bridge railing.
export function countryRailAhead(x, y, dx, dy, reach) {
  const L = countryRailsNear(x, y, reach + 2);
  let best = null;
  for (let i = 0; i < L.length; i += 4) {
    const ax = L[i], ay = L[i + 1], bx = L[i + 2], by = L[i + 3];
    const ex = bx - ax, ey = by - ay;
    const den = dx * ey - dy * ex;
    if (Math.abs(den) < 1e-6) continue;
    const wx = ax - x, wy = ay - y;
    const t = (wx * ey - wy * ex) / den, u = (wx * dy - wy * dx) / den;
    if (t < 0 || t > reach || u < 0 || u > 1) continue;
    if (!best || t < best.dist) best = { dist: t, h: COUNTRY_RAIL_H, depth: 0.12 };
  }
  return best;
}

// Keeps obj ({x, y}, radius r) on its side of every railing: the side of
// (fromX, fromY) when given (a fast corner probe that went through in one
// step comes back), else the side it is on. Returns the push normal
// { nx, ny, x, y } (towards obj, at the railing) or null.
const _hit = { nx: 0, ny: 0, x: 0, y: 0 };
export function pushOutOfRails(obj, r, fromX = obj.x, fromY = obj.y) {
  const L = countryRailsNear(obj.x, obj.y, r + 2);
  let hit = null;
  for (let i = 0; i < L.length; i += 4) {
    const ax = L[i], ay = L[i + 1], dx = L[i + 2] - ax, dy = L[i + 3] - ay;
    const len = Math.hypot(dx, dy);
    if (len < 1e-3) continue;
    const ux = dx / len, uy = dy / len;
    const t = (obj.x - ax) * ux + (obj.y - ay) * uy;
    if (t < 0 || t > len) continue;
    const side = -(obj.x - ax) * uy + (obj.y - ay) * ux;
    const ref = -(fromX - ax) * uy + (fromY - ay) * ux;
    const want = Math.abs(ref) > 1e-4 ? Math.sign(ref) : Math.sign(side) || 1;
    if (Math.sign(side) === want && Math.abs(side) >= r) continue;
    // never reach across: a point far on the other side is not at this railing
    if (Math.sign(side) !== want && Math.abs(side) > r + 3) continue;
    const nx = -uy * want, ny = ux * want;
    const px = ax + ux * t, py = ay + uy * t;
    obj.x = px + nx * (r + 0.02);
    obj.y = py + ny * (r + 0.02);
    _hit.nx = nx; _hit.ny = ny; _hit.x = px; _hit.y = py;
    hit = _hit;
  }
  return hit;
}
