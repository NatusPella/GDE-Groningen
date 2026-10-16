import { REAL, RTILE, buildingAt, inRealExtent, roadsInTile, nearestPlace } from './countryreal.js';
import { realWater, edgeDistance, urbanWeight } from './countryfield.js';
import { isInWater } from './util.js';
import { worldPlaceAt } from './worldplaces.js';

// Placement queries for the Ommeland extras (worldends.js, dorpsuitjes.js,
// pg_koe.js): open ground in the real Ommelanden, the nearest real road,
// water and shore. Read-only over countryreal.js data; deterministic.

function segDist(x, y, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy || 1)));
  const px = a[0] + dx * t, py = a[1] + dy * t;
  return [Math.hypot(px - x, py - y), px, py, t];
}

// The Ommeland place (x, y) is in, for the location chip and the garage:
// { place, near: false } in a village (or a town's built-up part), out in
// the fields { place: the nearest village within 5 km or '', near: true };
// null in town or without the real data.
export function ommelandArea(x, y) {
  if (!REAL.ready || edgeDistance(x, y) <= 60) return null;
  // past the old Ommeland data: the tile world's places (worldplaces.js),
  // with the district when there is one
  if (!inRealExtent(x, y)) {
    const w = worldPlaceAt(x, y);
    if (w) return w;
  }
  const p = nearestPlace(x, y, 0, true);
  if (!p) return { place: '', near: true };
  const d = Math.hypot(p.x - x, p.y - y);
  if (d < p.r * 1.3 || (d < 2500 && urbanWeight(x, y) > 0.3)) return { place: p.n, near: false };
  const q = nearestPlace(x, y);
  return { place: q && Math.hypot(q.x - x, q.y - y) < 5000 ? q.n : '', near: true };
}

// Nearest real road within R: { d (to the road edge, < 0 on it), x, y (on the
// centre line), road, ux, uy (its direction) } or null. ok(road): only roads
// that pass.
export function realRoadNear(x, y, R = 40, ok = null) {
  if (!REAL.ready) return null;
  let best = null;
  const t0x = Math.floor((x - R) / RTILE), t1x = Math.floor((x + R) / RTILE);
  const t0y = Math.floor((y - R) / RTILE), t1y = Math.floor((y + R) / RTILE);
  for (let tx = t0x; tx <= t1x; tx++) {
    for (let ty = t0y; ty <= t1y; ty++) {
      const L = roadsInTile(tx, ty);
      if (!L) continue;
      for (let k = 0; k < L.length; k += 2) {
        const r = REAL.roads[L[k]], a = r.pts[L[k + 1]], b = r.pts[L[k + 1] + 1];
        if (ok && !ok(r)) continue;
        const [d, px, py] = segDist(x, y, a, b);
        const de = d - r.w / 2;
        if (de > R || (best && de >= best.d)) continue;
        const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
        best = { d: de, x: px, y: py, road: r, ux: (b[0] - a[0]) / l, uy: (b[1] - a[1]) / l };
      }
    }
  }
  return best;
}

// Rail segments bucketed per 100 m cell, built once.
const RCELL = 100;
let railCells = null;
function railIndex(map) {
  if (railCells) return railCells;
  railCells = new Map();
  const lists = [map.countryRails || [], (map.rails || []).map((r) => r.pts || r), (map.railRoutes || []).map((r) => r.pts)];
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

// Free, dry ground for a prop of radius r: in the real data, off the roads
// (unless `road` is false), clear of real and city buildings, water and
// rails. (Inside the real data the polder plan adds no farms of its own.)
export function openGround(map, x, y, { r = 3, road = 1.5, rail = 9, edge = 20 } = {}) {
  if (!REAL.ready || !inRealExtent(x, y, edge)) return false;
  if (realWater(x, y) > -r - 1.5) return false;
  if (buildingAt(x, y, r) >= 0) return false;
  if (road !== false) {
    const q = realRoadNear(x, y, r + road + 1);
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

// Nearest open water (realWater at least `depth` m in) round (x, y).
export function waterNear(x, y, { rMax = 2500, depth = 18, step = 20 } = {}) {
  for (let r = step; r <= rMax; r += step) {
    const n = Math.max(12, Math.ceil((2 * Math.PI * r) / step));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
      if (realWater(px, py) >= depth) return { x: px, y: py, a };
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
    if (realWater(x, y) < -back) return { x, y, ux, uy, edge: { x: x - ux * back, y: y - uy * back } };
  }
  return null;
}

// Real place by name (countryreal places).
export function placeNamed(name) {
  return (REAL.places || []).find((p) => p.n === name) || null;
}
