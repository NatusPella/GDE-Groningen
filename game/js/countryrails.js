// #1092: de leuningen van de polderbruggen over een maar zijn weg: de maaren waren een verzonnen slotenrooster, geen kaartdata, en er staat
// dus geen brug meer. countryRailsNear en de rest van de API blijven (spelers en voertuigen vragen er nog naar), maar geven niets terug.
// De bruggen van de tegels hebben hun eigen leuningen (de wegmeshes). Zuiver: geen DOM, geen three.js.

export const COUNTRY_RAIL_H = 1.15;

const _lines = [];

// Railing lines within about R of (x, y), flat [ax, ay, bx, by, ...] (shared array).
export function countryRailsNear(x, y, R = 4) {
  _lines.length = 0;
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
