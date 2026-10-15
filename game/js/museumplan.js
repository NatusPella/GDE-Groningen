// The walkable ground floor of the Groninger Museum (world coordinates, no
// three.js: mapdata.js attaches it to the museum footprint at load). Rooms are
// oriented rectangles; where two overlap there is a doorway. The cycle bridge
// runs through the entrance building (noord, atrium, zuid: open to bikes),
// the main entrance is the glass door from the atrium into the gang to the
// Entreehal under the gold tower, the back door (achterdeur) leads from the
// north passage into zaal 1, and zaal 3 holds the Gouden Eierbal case (H6).
// Walking inside uses passages.js (inRooms), drawing museum3d.js.
import { P, PO, PA } from './worldframe.js';

// the museum's grid runs ~3.7 degrees off the map axes
const TH = PA(62, 798, -0.064);
const UX = Math.cos(TH), UY = Math.sin(TH);

function room(id, cx, cy, lenU, lenV, h, extra = {}) {
  return { id, cx, cy, ux: UX, uy: UY, hl: lenU / 2, hw: lenV / 2, h, ...extra };
}

export const MUSEUM_ROOMS = [
  room('noord', ...P(50.3, 782.3), 4.2, 15.4, 4.0, { bikes: true, name: 'Fietspassage' }),
  room('atrium', ...P(52.4, 799.0), 6.0, 20.4, 4.4, { bikes: true, name: 'Atrium' }),
  // the west half of the loop the cycle path makes round the entrance desk
  room('atriumW', ...P(49.5, 799.0), 2.4, 12.0, 4.4, { bikes: true, name: 'Atrium' }),
  room('zuid', ...P(51.7, 815.8), 4.0, 15.4, 4.0, { bikes: true, name: 'Fietspassage' }),
  room('gang', ...P(59.9, 798.3), 10.2, 3.2, 3.4, { name: 'Entree' }),
  room('entreehal', ...P(73.8, 797.9), 19.0, 9.6, 6.0, { name: 'Entreehal' }),
  room('zaal1', ...P(72.2, 782.9), 11.6, 16.0, 4.8, { name: 'Zaal 1' }),
  room('zaal3', ...P(73.9, 812.3), 10.6, 15.6, 4.8, { name: 'Zaal 3' }),
  room('deur1', ...P(71.6, 792.2), 2.4, 3.2, 3.0),
  room('deur3', ...P(72.6, 803.5), 2.4, 3.2, 3.0),
  room('achterdeur', ...P(59.4, 780.9), 15.6, 2.2, 3.0, { name: 'Achteringang' }),
];

export const MUSEUM_CASE = { ...PO(73.9, 815.3) };

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
