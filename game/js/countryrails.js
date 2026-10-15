import { REAL, RTILE, roadsInTile } from './countryreal.js';
import { BLOCK, ROAD_IN, ROAD_W, edgeRoad, maarX, maarY, realWater } from './countryfield.js';
import { deckHalf } from './countryedge.js';

// The railings of the Ommeland bridges as lines, matching the decks
// countryside.js draws: a real road bridge (its deck spans the segment, the
// railings deckHalf(width) off the centre line) and a polder road over a
// maar (an 11 m deck, railings 2.95 m off the road's centre). Solid for
// vehicles (vehicle.js corner probes) and for walkers unless they jump over
// (collision.js). Pure: no DOM, no three.js.

const ROAD_C = ROAD_IN + ROAD_W / 2;
const POLDER_RAIL = 2.95;
const POLDER_SPAN = 5.5;
export const COUNTRY_RAIL_H = 1.15;

const _lines = [];
let realCache = new Map();

function realBridgeLines(tx, ty) {
  const k = tx * 100003 + ty;
  let out = realCache.get(k);
  if (out) return out;
  out = [];
  const R = roadsInTile(tx, ty);
  if (R) {
    for (let i = 0; i < R.length; i += 2) {
      const r = REAL.roads[R[i]];
      if (!r.bridge) continue;
      const a = r.pts[R[i + 1]], b = r.pts[R[i + 1] + 1];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (len <= 4 || realWater((a[0] + b[0]) / 2, (a[1] + b[1]) / 2) <= -3) continue;
      // the deck is (len + 2) long round the segment's middle
      const ux = (b[0] - a[0]) / len, uy = (b[1] - a[1]) / len, h = deckHalf(r.w);
      for (const s of [1, -1]) {
        const ox = -uy * h * s, oy = ux * h * s;
        out.push(a[0] - ux + ox, a[1] - uy + oy, b[0] + ux + ox, b[1] + uy + oy);
      }
    }
  }
  if (realCache.size > 400) realCache = new Map();
  realCache.set(k, out);
  return out;
}

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
  if (REAL.ready) {
    for (let tx = Math.floor((x - R) / RTILE); tx <= Math.floor((x + R) / RTILE); tx++) {
      for (let ty = Math.floor((y - R) / RTILE); ty <= Math.floor((y + R) / RTILE); ty++) {
        const L = realBridgeLines(tx, ty);
        for (let i = 0; i < L.length; i++) _lines.push(L[i]);
      }
    }
  }
  return _lines;
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
