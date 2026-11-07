import { buildingAt, roadNear, waterGap, segDist } from './tileplace.js';
import { edgeDistance } from './countryfield.js';
import { isInWater } from './util.js';
import { worldPlaceAt, worldPlaceNamed } from './worldplaces.js';
import { inProvinceData } from './provinceworld.js';
import { gridItems } from './spatialgrid.js';

// Placement queries for the countryside extras (worldends.js, dorpsuitjes.js,
// pg_koe.js): open ground out in the province (the tiles' buildings and roads),
// water and shore. Read-only, deterministic; the tiles round it must be in (tileplace.js withTiles).

// The place (x, y) is in out in the country, for the location chip and the
// garage: { place, near: false } in a village (or a town's built-up part), out
// in the fields { place: the nearest village within 5 km or '', near: true },
// with the district when there is one; null in town.
export function ommelandArea(x, y) {
  if (edgeDistance(x, y) <= 60) return null;
  return worldPlaceAt(x, y) || { place: '', near: true };
}
// Rail segments bucketed per 100 m cell, built once.
const RCELL = 100;
let railCells = null;
function railIndex(map) {
  if (railCells) return railCells;
  railCells = new Map();
  const lists = [map.countryRails || [], gridItems(map.railGrid).map((r) => r.pts || r), (map.railRoutes || []).map((r) => r.pts)];
  for (const list of lists) {
    for (const P of list) {
      for (let i = 1; i < P.length; i++) {
        const a = P[i - 1], b = P[i];
        for (let cx = Math.floor(Math.min(a[0], b[0]) / RCELL); cx <= Math.floor(Math.max(a[0], b[0]) / RCELL); cx++) {
          for (let cy = Math.floor(Math.min(a[1], b[1]) / RCELL); cy <= Math.floor(Math.max(a[1], b[1]) / RCELL); cy++) {
            const k = cx * 100003 + cy;
            if (!railCells.has(k)) railCells.set(k, []);
            railCells.get(k).push(a, b);
          }
        }
      }
    }
  }
  return railCells;
}

export function railClear(map, x, y, m) {
  const cells = railIndex(map);
  for (let cx = Math.floor((x - m) / RCELL); cx <= Math.floor((x + m) / RCELL); cx++) {
    for (let cy = Math.floor((y - m) / RCELL); cy <= Math.floor((y + m) / RCELL); cy++) {
      const L = cells.get(cx * 100003 + cy);
      if (!L) continue;
      for (let i = 0; i < L.length; i += 2) if (segDist(x, y, L[i], L[i + 1])[0] < m) return false;
    }
  }
  return true;
}

// Free, dry ground for a prop of radius r: in the province's data, off the
// roads (unless `road` is false), clear of buildings, water and rails; the
// tiles round it must be in (tileplace.js withTiles).
export function openGround(map, x, y, { r = 3, road = 1.5, rail = 9 } = {}) {
  if (inProvinceData(x, y) === false) return false;
  if (waterGap(map, x, y, r + 3) > -r - 1.5) return false;
  if (buildingAt(map, x, y, r)) return false;
  if (road !== false) {
    const q = roadNear(map, x, y, r + road + 1);
    if (q && q.d < r + road) return false;
  }
  if (!railClear(map, x, y, rail)) return false;
  // near the city data its own buildings and water count too
  if (edgeDistance(x, y) < 80) {
    if (isInWater(map, x, y)) return false;
    const [sx, sy] = map.escapeBuilding(x, y, r);
    if (Math.hypot(sx - x, sy - y) > 0.2) return false;
    if (map.buildingsNear(x, y, r + 1).length && !map.canWalkOut(x, y, 20)) return false;
  }
  return true;
}

// First open spot on rings from rMin to rMax round (x, y), starting at angle
// a0 and sweeping ±spread (radians; Math.PI = all round).
export function findOpenSpot(map, x, y, { rMin = 0, rMax = 120, step = 6, a0 = 0, spread = Math.PI, opts = {}, test = null } = {}) {
  for (let r = rMin; r <= rMax; r += step) {
    const n = r < 1 ? 1 : Math.max(6, Math.ceil((2 * spread * r) / step));
    for (let i = 0; i < n; i++) {
      // alternate either side of a0: 0, +1, -1, +2, -2 ...
      const k = i === 0 ? 0 : (i % 2 ? 1 : -1) * Math.ceil(i / 2);
      const a = a0 + (n > 1 ? (k / Math.ceil(n / 2)) * spread : 0);
      const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
      if (!openGround(map, px, py, opts)) continue;
      if (test && !test(px, py, a)) continue;
      return { x: px, y: py, a };
    }
  }
  return null;
}

// Nearest open water (at least `depth` m from its shore) round (x, y), on the
// tiles that are in.
export function waterNear(map, x, y, { rMax = 2500, depth = 18, step = 20 } = {}) {
  for (let r = step; r <= rMax; r += step) {
    const n = Math.max(12, Math.ceil((2 * Math.PI * r) / step));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
      if (waterGap(map, px, py, 2) >= depth) return { x: px, y: py, a };
    }
  }
  return null;
}

// From a point on the water, the first dry spot heading towards (tx, ty):
// the shore, `back` m up the bank.
export function shoreFrom(map, wx, wy, tx, ty, back = 4) {
  const d = Math.hypot(tx - wx, ty - wy) || 1;
  const ux = (tx - wx) / d, uy = (ty - wy) / d;
  for (let s = 0; s < d; s += 1) {
    const x = wx + ux * s, y = wy + uy * s;
    if (waterGap(map, x, y, back + 2) < -back) return { x, y, ux, uy, edge: { x: x - ux * back, y: y - uy * back } };
  }
  return null;
}

// The province's place by name.
export const placeNamed = worldPlaceNamed;
