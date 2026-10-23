// Parking at the real places (facilities.js): the bays of every mapped
// parking lot (amenity=parking surface areas, street-side bays) laid out in
// rows on its real outline, and the parking lanes along streets
// (parking:lane / parking:both). parkedcars.js fills the bays with cars,
// ownedvehicles.js parks your own car in them, parkinglots3d.js paints the
// asphalt and the white lines. Deterministic: the same lot gives the same
// bays every visit.
import { FAC, facilitiesIn } from './facilities.js';
import { pointInPolygon, isInWater, closestPointOnSegment } from './util.js';

export const BAY_W = 2.5;
export const BAY_D = 5.0;
const AISLE = 6.0;
const PARALLEL_L = 6.0;
const MAX_BAYS = 300;
// garagepark: the multi-storey and underground garages (#418); the mapped ones without an
// outline (Forum, Ossenmarkt) get a few bays at their entrance instead
const LOT_KINDS = ['parking', 'streetpark', 'garagepark'];
const ENTRANCE_BAYS = 4;
const CAR = { len: 4.4, wid: 1.8 };

// Solid ground for a car's corner: no building, water or through road.
function blocked(map, x, y) {
  for (const b of map.buildingsNear(x, y, 0.5)) {
    const [x0, y0, x1, y1] = b.bounds;
    if (x >= x0 && x <= x1 && y >= y0 && y <= y1 && pointInPolygon(x, y, b.pts)) return true;
  }
  if (isInWater(map, x, y)) return true;
  for (const r of map.roadsNear(x, y, 8)) {
    if (r.cat === 'foot' || r.cat === 'cycle' || r.type === 'service' || r.z) continue;
    const hw = (r.width || 6) / 2;
    for (let i = 0; i < r.pts.length - 1; i++) {
      if (closestPointOnSegment(x, y, r.pts[i][0], r.pts[i][1], r.pts[i + 1][0], r.pts[i + 1][1]).dist2 < hw * hw) return true;
    }
  }
  return false;
}

function boxFree(map, poly, x, y, angle, len, wid) {
  const c = Math.cos(angle), s = Math.sin(angle);
  for (const [lx, ly] of [[len / 2, wid / 2], [len / 2, -wid / 2], [-len / 2, wid / 2], [-len / 2, -wid / 2], [0, 0]]) {
    const px = x + lx * c - ly * s, py = y + lx * s + ly * c;
    if (poly && !pointInPolygon(px, py, poly)) return false;
    if (blocked(map, px, py)) return false;
  }
  return true;
}

// Lot frame: the direction of the outline's longest edge.
function frameOf(poly) {
  let best = 0, ang = 0;
  for (let i = 0; i < poly.length - 1; i++) {
    const L = Math.hypot(poly[i + 1][0] - poly[i][0], poly[i + 1][1] - poly[i][1]);
    if (L > best) { best = L; ang = Math.atan2(poly[i + 1][1] - poly[i][1], poly[i + 1][0] - poly[i][0]); }
  }
  const ux = Math.cos(ang), uy = Math.sin(ang);
  let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
  for (const [x, y] of poly) {
    const u = x * ux + y * uy, v = -x * uy + y * ux;
    u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v);
  }
  return { ang, ux, uy, u0, u1, v0, v1 };
}

const at = (f, u, v) => [u * f.ux - v * f.uy, u * f.uy + v * f.ux];

// A garage mapped as a point: up to ENTRANCE_BAYS parallel bays beside the nearest street,
// on ground that is free (no building, water or through road), fixed order so the same
// garage always gives the same bays.
function entranceBays(map, f, out) {
  const r = map.nearestRoadPoint ? map.nearestRoadPoint(f.x, f.y, 40, true) : null;
  let ang = 0;
  if (r && r.road && r.road.pts && r.road.pts.length > 1) {
    const P = r.road.pts;
    let best = Infinity;
    for (let i = 0; i < P.length - 1; i++) {
      const d = closestPointOnSegment(f.x, f.y, P[i][0], P[i][1], P[i + 1][0], P[i + 1][1]).dist2;
      if (d < best) { best = d; ang = Math.atan2(P[i + 1][1] - P[i][1], P[i + 1][0] - P[i][0]); }
    }
  }
  const ux = Math.cos(ang), uy = Math.sin(ang);
  for (const [du, dv] of [[0, 0], [PARALLEL_L, 0], [-PARALLEL_L, 0], [0, 2.8], [PARALLEL_L, 2.8], [-PARALLEL_L, 2.8], [0, -2.8], [PARALLEL_L, -2.8], [-PARALLEL_L, -2.8]]) {
    if (out.length >= ENTRANCE_BAYS) break;
    const x = f.x + du * ux - dv * uy, y = f.y + du * uy + dv * ux;
    if (boxFree(map, null, x, y, ang, CAR.len, CAR.wid)) out.push({ x, y, angle: ang, len: PARALLEL_L, wid: 2.3 });
  }
  return out;
}

// Bays of lot f: [{x, y, angle, len, wid}] (angle: the way a car stands in it).
export function lotBays(map, f) {
  if (f._bays) return f._bays;
  const out = [];
  f._bays = out;
  const poly = f.poly;
  if (f.kind === 'garagepark' && (!poly || poly.length < 4)) return entranceBays(map, f, out);
  if (!poly || poly.length < 4) return out;
  const F = frameOf(poly);
  const depth = F.v1 - F.v0;
  if (depth < 4.5) {
    // a strip along the street: parallel bays
    const v = (F.v0 + F.v1) / 2;
    for (let u = F.u0 + PARALLEL_L / 2; u <= F.u1 - PARALLEL_L / 2 && out.length < MAX_BAYS; u += PARALLEL_L) {
      const [x, y] = at(F, u, v);
      if (boxFree(map, poly, x, y, F.ang, PARALLEL_L - 0.6, Math.min(2.3, depth))) out.push({ x, y, angle: F.ang, len: PARALLEL_L, wid: 2.3 });
    }
    return out;
  }
  // rows of perpendicular bays, back to back, an aisle between each pair
  const rows = [];
  for (let v = F.v0 + 0.3; v + BAY_D <= F.v1 - 0.3 + 1e-6;) {
    rows.push({ v: v + BAY_D / 2, face: 1 });
    v += BAY_D;
    if (v + BAY_D <= F.v1 - 0.3) { rows.push({ v: v + BAY_D / 2, face: -1 }); v += BAY_D; }
    v += AISLE;
  }
  for (const row of rows) {
    const angle = F.ang + (Math.PI / 2) * (row.face > 0 ? 1 : -1);
    for (let u = F.u0 + BAY_W / 2 + 0.3; u <= F.u1 - BAY_W / 2 - 0.3 && out.length < MAX_BAYS; u += BAY_W) {
      const [x, y] = at(F, u, row.v);
      if (boxFree(map, poly, x, y, angle, BAY_D - 0.4, BAY_W - 0.3)) out.push({ x, y, angle, len: BAY_D, wid: BAY_W });
    }
  }
  return out;
}

// Parallel slots along the mapped parking lanes: [{x, y, angle, len, wid}].
export function laneBays(map, lane) {
  if (lane._bays) return lane._bays;
  const out = [];
  lane._bays = out;
  const P = lane.pts;
  for (let i = 0; i < P.length - 1; i++) {
    const a = P[i], b = P[i + 1];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (len < PARALLEL_L + 8) continue;
    const ux = (b[0] - a[0]) / len, uy = (b[1] - a[1]) / len;
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
    const cityRoad = map.nearestRoadPoint ? map.nearestRoadPoint(mx, my, 6, true) : null;
    const hw = cityRoad ? (cityRoad.road.width || 6) / 2 : 3;
    for (const [bit, side] of [[1, 1], [2, -1]]) {
      if (!(lane.sides & bit)) continue;
      // OSM left/right: left of the way's direction is (uy, -ux) in a y-south frame
      const nx = uy * side, ny = -ux * side;
      const angle = Math.atan2(uy, ux) + (side > 0 ? Math.PI : 0);
      for (let t = 4 + PARALLEL_L / 2; t <= len - 4 - PARALLEL_L / 2; t += PARALLEL_L) {
        const x = a[0] + ux * t + nx * (hw + 1.1), y = a[1] + uy * t + ny * (hw + 1.1);
        if (boxFree(map, null, x, y, angle, CAR.len, CAR.wid)) out.push({ x, y, angle, len: PARALLEL_L, wid: 2.2 });
      }
    }
  }
  return out;
}

// Lots whose outline reaches into the box round (x, y).
export function lotsNear(x, y, r) {
  if (!FAC.ready) return [];
  return facilitiesIn(LOT_KINDS, x - r - 150, y - r - 150, x + r + 150, y + r + 150).filter((f) => {
    if (!f.poly && f.kind !== 'garagepark') return false;
    if (!f._box) {
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const [px, py] of f.poly || [[f.x - 12, f.y - 12], [f.x + 12, f.y + 12]]) { x0 = Math.min(x0, px); y0 = Math.min(y0, py); x1 = Math.max(x1, px); y1 = Math.max(y1, py); }
      f._box = [x0, y0, x1, y1];
    }
    const [x0, y0, x1, y1] = f._box;
    return x1 >= x - r && x0 <= x + r && y1 >= y - r && y0 <= y + r;
  });
}

export function lanesNear(x, y, r) {
  if (!FAC.ready) return [];
  return FAC.lanes.filter((l) => {
    if (!l._box) {
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const [px, py] of l.pts) { x0 = Math.min(x0, px); y0 = Math.min(y0, py); x1 = Math.max(x1, px); y1 = Math.max(y1, py); }
      l._box = [x0, y0, x1, y1];
    }
    const [x0, y0, x1, y1] = l._box;
    return x1 >= x - r && x0 <= x + r && y1 >= y - r && y0 <= y + r;
  });
}

// Every bay (lots and lanes) with its centre in the box.
export function baysIn(map, x0, y0, x1, y1) {
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, r = Math.max(x1 - x0, y1 - y0) / 2;
  const out = [];
  const take = (b, id, k) => { if (b.x >= x0 && b.x < x1 && b.y >= y0 && b.y < y1) out.push({ ...b, id, k }); };
  for (const f of lotsNear(cx, cy, r)) lotBays(map, f).forEach((b, k) => take(b, Math.round(f.x * 7 + f.y * 13), k));
  for (const l of lanesNear(cx, cy, r)) laneBays(map, l).forEach((b, k) => take(b, Math.round(l.pts[0][0] * 7 + l.pts[0][1] * 13), k));
  return out;
}
