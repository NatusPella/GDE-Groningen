// The walkable ground floor of the Groninger Museum (world coordinates, no
// three.js: mapdata.js attaches it to the museum footprint at load). Rooms are
// oriented rectangles; where two overlap there is a doorway. The cycle bridge
// runs through the entrance building (noord, atrium, zuid: open to bikes),
// the main entrance is the glass door from the atrium into the gang to the
// Entreehal under the gold tower, the back door (achterdeur) leads from the
// north passage into zaal 1, and zaal 3 holds the Gouden Eierbal case (H6).
// Walking inside uses passages.js (inRooms), drawing museum3d.js.
import { P } from './worldframe.js';

// the museum's grid runs ~3.7 degrees off the map axes
const TH = -0.0806;
const UX = Math.cos(TH), UY = Math.sin(TH);

function room(id, cx, cy, lenU, lenV, h, extra = {}) {
  return { id, cx, cy, ux: UX, uy: UY, hl: lenU / 2, hw: lenV / 2, h, ...extra };
}

export const MUSEUM_ROOMS = [
  room('noord', 62.44, 786.8, 4.2, 15.4, 4.0, { bikes: true, name: 'Fietspassage' }),
  room('atrium', 64.82, 803.57, 6.0, 20.4, 4.4, { bikes: true, name: 'Atrium' }),
  // the west half of the loop the cycle path makes round the entrance desk
  room('atriumW', 61.92, 803.62, 2.4, 12.0, 4.4, { bikes: true, name: 'Atrium' }),
  room('zuid', 64.4, 820.49, 4.0, 15.4, 4.0, { bikes: true, name: 'Fietspassage' }),
  room('gang', 72.33, 802.74, 10.2, 3.2, 3.4, { name: 'Entree' }),
  room('entreehal', 86.25, 802.11, 19.0, 9.6, 6.0, { name: 'Entreehal' }),
  room('zaal1', 84.4, 787.04, 11.6, 16.0, 4.8, { name: 'Zaal 1' }),
  room('zaal3', 86.59, 816.6, 10.6, 15.6, 4.8, { name: 'Zaal 3' }),
  room('deur1', 83.95, 796.41, 2.4, 3.2, 3.0),
  room('deur3', 85.14, 807.77, 2.4, 3.2, 3.0),
  room('achterdeur', 71.54, 785.24, 15.6, 2.2, 3.0, { name: 'Achteringang' }),
];

export const MUSEUM_CASE = { x: 86.64, y: 819.62 };

// Signed distance from (x, y) to the edge of rectangle r (negative inside).
export function rectDist(r, x, y) {
  const dx = x - r.cx, dy = y - r.cy;
  const a = dx * r.ux + dy * r.uy, c = -dx * r.uy + dy * r.ux;
  return Math.max(Math.abs(a) - r.hl, Math.abs(c) - r.hw);
}

// (x, y) pulled into rectangle r shrunk by `m` on every side.
export function clampToRect(r, x, y, m) {
  const dx = x - r.cx, dy = y - r.cy;
  let a = dx * r.ux + dy * r.uy, c = -dx * r.uy + dy * r.ux;
  const la = Math.max(0.01, r.hl - m), lc = Math.max(0.01, r.hw - m);
  a = Math.max(-la, Math.min(la, a));
  c = Math.max(-lc, Math.min(lc, c));
  return [r.cx + a * r.ux - c * r.uy, r.cy + a * r.uy + c * r.ux];
}

// Do two oriented rectangles share ground (separating axis test)?
export function rectsOverlap(p, q) {
  for (const r of [p, q]) {
    for (const [ax, ay] of [[r.ux, r.uy], [-r.uy, r.ux]]) {
      const rad = (s) => Math.abs(ax * s.ux + ay * s.uy) * s.hl + Math.abs(-ax * s.uy + ay * s.ux) * s.hw;
      if (Math.abs((q.cx - p.cx) * ax + (q.cy - p.cy) * ay) > rad(p) + rad(q)) return false;
    }
  }
  return true;
}

// The doorway between two rooms is the strip where they overlap, however thin.
// A walker (radius m) is free there when it is within m of both rooms: clamping
// it into one room alone would keep its centre m short of that room's end, and
// with an overlap thinner than that it could never cross into the other
// (the Forum's street doors overlapped the foyer by 10 cm).
const LINKS = new WeakMap();
export function inDoorway(rooms, x, y, m) {
  let links = LINKS.get(rooms);
  if (!links) {
    links = [];
    for (let i = 0; i < rooms.length; i++) for (let j = i + 1; j < rooms.length; j++) if (rectsOverlap(rooms[i], rooms[j])) links.push([rooms[i], rooms[j]]);
    LINKS.set(rooms, links);
  }
  for (const [p, q] of links) if (!p.shut && !q.shut && rectDist(p, x, y) < m && rectDist(q, x, y) < m) return true;
  return false;
}

// Rect corners, counter-clockwise: [[x, y] x4]
export function rectCorners(r) {
  const P = (a, c) => [r.cx + a * r.ux - c * r.uy, r.cy + a * r.uy + c * r.ux];
  return [P(-r.hl, -r.hw), P(r.hl, -r.hw), P(r.hl, r.hw), P(-r.hl, r.hw)];
}

export function attachMuseumPlan(buildings) {
  const b = buildings.find((q) => q.landmark === 'Groninger Museum' && q.parts);
  if (!b) return null;
  b.rooms = MUSEUM_ROOMS;
  b.noPassages = true;
  return b;
}
