// Road heights: the ring and its grade-separated junctions carry a per-vertex
// height profile (road.z, from scripts/add_elevation.py); everything else is
// at street level (0). This module turns those profiles into
//  - surfaces: road decks, trench floors and embankment slopes, queried with
//    groundHeightAt(x, y, zHint) - the highest surface at or just above zHint,
//    so a car on a viaduct stays on it and the street below stays the street;
//  - walls: retaining walls of cuttings (solid from the trench, with a fence
//    on top solid from the street), crash barriers along raised roads;
//  - the open-cut mask: where the ground is cut away (terrain, grass, green
//    and the canal bed discard fragments there, see cutmask3d.js).
// Pure data, built once per map (map.elev).
import { closestPointOnSegment } from './util.js';

export const DECK_T = 1.0;           // viaduct deck thickness below the road surface
export const EMB_SLOPE = 0.6;        // embankment side slope (rise per metre)
export const WALL_T = 0.45;          // retaining wall thickness
export const FENCE_H = 1.1;
export const BARRIER_H = 0.9;
export const ROOF_T = 0.7;           // tunnel roof slab
export const RAISED = 0.3;
export const COPING = 1.1;           // street-level strip beside an open cutting's wall (roadstructures3d)           // |z| above which a road counts as off street level
const SHOULDER = 1.8;                // matches roadsurface SIDEWALK_EXTRA (the rendered verge)
const CELL = 32;
const WALL_CELL = 24;
const PIECE = 2;
const STEP_UP = 1.1;

const SIDEWALK_CATS = new Set(['major', 'normal', 'minor']);

export function surfaceHalfWidth(r) {
  return r.width / 2 + (SIDEWALK_CATS.has(r.cat) ? SHOULDER : 0.3);
}

function cellKey(cx, cy) { return cx * 65536 + cy; }

class Grid {
  constructor(cell) { this.cell = cell; this.map = new Map(); }
  insert(item, x0, y0, x1, y1) {
    const c = this.cell;
    for (let cx = Math.floor(x0 / c); cx <= Math.floor(x1 / c); cx++) {
      for (let cy = Math.floor(y0 / c); cy <= Math.floor(y1 / c); cy++) {
        const k = cellKey(cx, cy);
        let a = this.map.get(k);
        if (!a) this.map.set(k, a = []);
        a.push(item);
      }
    }
  }
  at(x, y) { return this.map.get(cellKey(Math.floor(x / this.cell), Math.floor(y / this.cell))); }
}

const EMPTY = { segs: [], walls: [], skirts: [], floors: [], cuts: [], has: false };

export function buildElevation(map) {
  const segs = [];
  const grid = new Grid(CELL);
  for (const r of map.roads) {
    const Z = r.z;
    if (!Z || Z.length !== r.pts.length) continue;
    const hs = surfaceHalfWidth(r);
    const P = r.pts;
    for (let i = 0; i < P.length - 1; i++) {
      const ax = P[i][0], ay = P[i][1], bx = P[i + 1][0], by = P[i + 1][1];
      const len = Math.hypot(bx - ax, by - ay);
      if (len < 1e-3) continue;
      const za = Z[i], zb = Z[i + 1];
      if (Math.abs(za) < 0.02 && Math.abs(zb) < 0.02) continue;
      const s = {
        r, i, ax, ay, bx, by, za, zb, len, ux: (bx - ax) / len, uy: (by - ay) / len, hs,
        deck: !!r.bridge && !r.tunnel, covered: !!r.tunnel,
      };
      const reach = hs + WALL_T + Math.max(0, Math.max(za, zb)) / EMB_SLOPE + 1;
      grid.insert(s, Math.min(ax, bx) - reach, Math.min(ay, by) - reach, Math.max(ax, bx) + reach, Math.max(ay, by) + reach);
      segs.push(s);
    }
  }
  if (!segs.length) return EMPTY;
  const elev = { segs, grid, has: true, walls: [], skirts: [], floors: [], brkWalls: [], wallGrid: new Grid(WALL_CELL), cuts: [], map, flatGrid: new Grid(16) };
  // street-level road ribbons near the raised/sunken ones: they pass under
  // embankments (which then need an abutment, not a slope) and over cuttings
  const near = (x, y) => grid.at(x, y);
  for (const r of map.roads) {
    const hs = surfaceHalfWidth(r);
    const P = r.pts, Z = r.z;
    for (let i = 0; i < P.length - 1; i++) {
      if (Z && (Math.abs(Z[i]) >= 0.02 || Math.abs(Z[i + 1]) >= 0.02)) continue;
      const ax = P[i][0], ay = P[i][1], bx = P[i + 1][0], by = P[i + 1][1];
      if (!near(ax, ay) && !near(bx, by) && !near((ax + bx) / 2, (ay + by) / 2)) continue;
      elev.flatGrid.insert({ ax, ay, bx, by, hs }, Math.min(ax, bx) - hs, Math.min(ay, by) - hs, Math.max(ax, bx) + hs, Math.max(ay, by) + hs);
    }
  }
  addRailLifts(elev, map);
  classifyFill(elev);
  buildWalls(elev, map);
  joinWallEnds(elev);
  buildCuts(elev);
  return elev;
}

// Where one way of a cutting ends and the next begins (or a wall piece is
// left out at a joint, or the cutting runs into a tunnel), the retaining
// walls stop short of each other and the cut-away ground shows through: a
// short wall face (drawn only) bridges every loose end of a cutting's wall
// to the nearest loose end nearby.
function joinWallEnds(elev) {
  const open = (w) => w.kind === 'cut' && w.low && !w.parapet;
  const CELL = 4, grid = new Map(), ends = [];
  const key = (x, y) => Math.floor(x / CELL) * 65536 + Math.floor(y / CELL);
  for (const w of elev.walls) {
    if (!open(w)) continue;
    for (const [x, y, z] of [[w.ax, w.ay, w.za], [w.bx, w.by, w.zb]]) {
      const e = { w, x, y, z, loose: true };
      ends.push(e);
      const k = key(x, y);
      if (!grid.has(k)) grid.set(k, []);
      grid.get(k).push(e);
    }
  }
  const around = (e, r, fn) => {
    for (let cx = Math.floor((e.x - r) / CELL); cx <= Math.floor((e.x + r) / CELL); cx++) {
      for (let cy = Math.floor((e.y - r) / CELL); cy <= Math.floor((e.y + r) / CELL); cy++) {
        for (const f of grid.get(cx * 65536 + cy) || []) if (f.w !== e.w) fn(f, Math.hypot(f.x - e.x, f.y - e.y));
      }
    }
  };
  for (const e of ends) around(e, 0.3, (f, d) => { if (d < 0.3) e.loose = false; });
  for (const e of ends) {
    if (!e.loose) continue;
    let best = null, bd = 2.6;
    around(e, bd, (f, d) => { if (f.loose && d < bd && d > 0.05 && Math.abs(f.z - e.z) < 1.5) { best = f; bd = d; } });
    if (!best) continue;
    e.loose = best.loose = false;
    const nx = e.w.nx + best.w.nx, ny = e.w.ny + best.w.ny, l = Math.hypot(nx, ny) || 1;
    elev.skirts.push({ ax: e.x, ay: e.y, bx: best.x, by: best.y, nx: nx / l, ny: ny / l, za: e.z, zb: best.z, seg: e.w.seg, coping: e.w.coping && best.w.coping });
  }
}

// Track height where the rail climbs over a road (railway.js railZ, the
// same railLifts), so the embankment and viaduct railway3d draws carry
// whoever gets onto them instead of being walked and driven through.
const RAIL_STEP = 4;
const RAIL_BED_HALF = 2.1;           // railway3d embankment crown
const RAIL_DECK_HALF = 2.5;          // railway3d DECK_HALF
const RAIL_DECK_Z = 2.55;            // railway3d DECK_Z (- a hair)
const RAIL_SLOPE = 1 / 1.3;          // railway3d embankProfile foot

export function railLiftZ(lifts, x, y) {
  let z = 0;
  for (const L of lifts) {
    const d = Math.hypot(L.x - x, L.y - y);
    if (d >= L.plateau + L.ramp) continue;
    const t = Math.max(0, (d - L.plateau) / L.ramp);
    const h = L.h * (1 - t * t * (3 - 2 * t));
    if (h > z) z = h;
  }
  return z;
}

function addRailLifts(elev, map) {
  const lifts = map.railLifts || [];
  if (!lifts.length) return;
  for (const rail of map.rails || []) {
    const P = rail.pts || rail;
    for (let i = 0; i < P.length - 1; i++) {
      const [x0, y0] = P[i], [x1, y1] = P[i + 1];
      const L = Math.hypot(x1 - x0, y1 - y0);
      if (L < 1e-3) continue;
      const n = Math.max(1, Math.ceil(L / RAIL_STEP));
      for (let k = 0; k < n; k++) {
        const ax = x0 + (x1 - x0) * k / n, ay = y0 + (y1 - y0) * k / n;
        const bx = x0 + (x1 - x0) * (k + 1) / n, by = y0 + (y1 - y0) * (k + 1) / n;
        const za = railLiftZ(lifts, ax, ay), zb = railLiftZ(lifts, bx, by);
        if (za < 0.05 && zb < 0.05) continue;
        const len = L / n;
        const deck = Math.min(za, zb) >= RAIL_DECK_Z;
        const hs = deck ? RAIL_DECK_HALF : RAIL_BED_HALF;
        const s = {
          r: rail, i, ax, ay, bx, by, za, zb, len, ux: (bx - ax) / len, uy: (by - ay) / len, hs,
          deck, covered: false, rail: true, slope: RAIL_SLOPE,
        };
        const reach = hs + Math.max(za, zb) / RAIL_SLOPE + 1;
        elev.grid.insert(s, Math.min(ax, bx) - reach, Math.min(ay, by) - reach, Math.max(ax, bx) + reach, Math.max(ay, by) + reach);
        elev.segs.push(s);
      }
    }
  }
}

// Is (x, y) on a road surface clearly below zTop (a street-level road, or a
// lower raised/sunken one)? That is where an embankment cannot be.
export function lowerSurfaceAt(elev, x, y, zTop) {
  if (zTop - 1.5 > 0) {
    const flat = elev.flatGrid.at(x, y);
    if (flat) {
      for (const f of flat) {
        if (closestPointOnSegment(x, y, f.ax, f.ay, f.bx, f.by).dist2 < f.hs * f.hs) return true;
      }
    }
  }
  const list = elev.grid.at(x, y);
  if (list) {
    for (const s of list) {
      if (s.rail) continue;
      const q = onSeg(s, x, y);
      if (q.d <= s.hs && q.z < zTop - 1.5) return true;
    }
  }
  return false;
}

// Raised segments that are not bridge ways (ramps, embankments, a raised
// roundabout) split into ~2 m pieces: `over` where the road itself passes
// over a lower road (drawn as a deck, open below), else per side `retain`
// where the embankment slope would bury a lower road (a vertical abutment
// wall instead), otherwise a grass slope.
function classifyFill(elev) {
  for (const s of elev.segs) {
    if (s.deck || s.rail || (s.za <= RAISED && s.zb <= RAISED)) continue;
    const n = Math.max(1, Math.round(s.len / PIECE));
    s.pieces = [];
    for (let k = 0; k < n; k++) {
      const t0 = k / n, t1 = (k + 1) / n, tm = (t0 + t1) / 2;
      const z = s.za + (s.zb - s.za) * tm;
      const cx = s.ax + s.ux * s.len * tm, cy = s.ay + s.uy * s.len * tm;
      const piece = { t0, t1, z, over: false, retain: [false, false] };
      if (z > RAISED) {
        piece.over = z > 2 && (lowerSurfaceAt(elev, cx, cy, z) || lowerSurfaceAt(elev, cx - s.uy * s.hs * 0.7, cy + s.ux * s.hs * 0.7, z) || lowerSurfaceAt(elev, cx + s.uy * s.hs * 0.7, cy - s.ux * s.hs * 0.7, z));
        if (!piece.over) {
          [1, -1].forEach((side, j) => {
            const nx = -s.uy * side, ny = s.ux * side;
            const w = Math.max(0, z) / EMB_SLOPE;
            for (const f of [0.3, 0.7, 1]) {
              const d = s.hs + w * f;
              if (lowerSurfaceAt(elev, cx + nx * d, cy + ny * d, z - (d - s.hs) * EMB_SLOPE + 1.5)) { piece.retain[j] = true; break; }
            }
          });
        }
      }
      s.pieces.push(piece);
    }
  }
}

// Height of segment s at its closest point to (x, y) and the distance to it.
const _q = { d: 0, z: 0, t: 0 };
function onSeg(s, x, y) {
  const cp = closestPointOnSegment(x, y, s.ax, s.ay, s.bx, s.by);
  _q.d = Math.sqrt(cp.dist2);
  _q.t = cp.t;
  _q.z = s.za + (s.zb - s.za) * cp.t;
  return _q;
}

// On a street-level road surface (also the level stretches of a road that
// has a height profile)?
function onFlatRoad(map, x, y) {
  for (const r of map.roadsNear(x, y, 12)) {
    const hw = surfaceHalfWidth(r);
    const P = r.pts, Z = r.z;
    for (let i = 0; i < P.length - 1; i++) {
      if (Z && (Math.abs(Z[i]) > 0.02 || Math.abs(Z[i + 1]) > 0.02)) continue;
      if (closestPointOnSegment(x, y, P[i][0], P[i][1], P[i + 1][0], P[i + 1][1]).dist2 < hw * hw) return true;
    }
  }
  return false;
}

// Where two road ribbons overlap at different heights (a ramp splitting off
// or merging), whoever is within STAY_ON of more than one of them takes the
// one whose centreline is nearest (relative to its width) instead of the
// highest, so a car keeps to the road it is driving on.
const STAY_ON = 0.35;
const OVERLAP_BAND = 1.2;
const _roadZ = [], _roadD = [], _capZ = [], _capD = [], _capX = [], _capY = [], _capR = [], _midS = [];

// Nearest street-level road ribbon near the raised ones at (x, y): distance
// to its centreline over its half width (Infinity when on none).
function flatRoadAt(elev, x, y) {
  const flat = elev.flatGrid.at(x, y);
  let best = Infinity;
  if (!flat) return best;
  for (const f of flat) {
    const d2 = closestPointOnSegment(x, y, f.ax, f.ay, f.bx, f.by).dist2;
    if (d2 < f.hs * f.hs) best = Math.min(best, Math.sqrt(d2) / f.hs);
  }
  return best;
}

// The walkable/drivable surface at (x, y) for something currently at zHint:
// the highest surface no more than STEP_UP above it (see STAY_ON for
// overlapping roads). Falling back to the lowest surface when there is none
// (standing over an open cut).
export function groundHeightAt(elev, x, y, zHint = 0, stepUp = STEP_UP) {
  if (!elev.has) return 0;
  const list = elev.grid.at(x, y);
  if (!list) return 0;
  let best = -Infinity, lowest = Infinity, bestRoad = false, cap = -Infinity, capRoad = false;
  let ground = true;
  const lim = zHint + stepUp;
  _roadZ.length = _roadD.length = _capZ.length = _capD.length = _capX.length = _capY.length = _capR.length = _midS.length = 0;
  for (const s of list) {
    const q = onSeg(s, x, y);
    let z = null, road = false;
    const slope = s.slope || EMB_SLOPE;
    if (q.d <= s.hs) {
      z = q.z;
      road = true;
      if (z < -RAISED && !s.covered) ground = false;
    } else if (!s.deck && q.z > RAISED && q.d < s.hs + q.z / slope) {
      z = q.z - (q.d - s.hs) * slope;
      if ((!s.rail && lowerSurfaceAt(elev, x, y, z + 1.5)) || fillPieceAt(s, q.t, x, y) === false) z = null;
    }
    if (z === null) continue;
    if (z <= lim) {
      // (a hair past the end still counts as on the segment: a point on a
      // vertex is on both of its segments, not on their caps)
      const along = (x - s.ax) * s.ux + (y - s.ay) * s.uy;
      const end = along < -0.05 || along > s.len + 0.05;
      // (only a road's real ends lose the overlap choice; a cap at an inner
      // vertex is the same road carrying on)
      const tip = (q.t <= 0 && s.i === 0) || (q.t >= 1 && s.i === s.r.pts.length - 2);
      if (road && end) {
        _capZ.push(z); _capD.push(q.d / s.hs + (tip ? 1 : 0));
        _capX.push(q.t <= 0 ? s.ax : s.bx); _capY.push(q.t <= 0 ? s.ay : s.by); _capR.push(s.r);
      } else {
        if (road) { _roadZ.push(z); _roadD.push(q.d / s.hs); _midS.push(s); }
        if (end) { if (z > cap) { cap = z; capRoad = road; } }
        else if (z > best) { best = z; bestRoad = road; }
      }
    }
    if (z < lowest) lowest = z;
  }
  // a road's flat end cap reaches over the ramp it joins (the next segments
  // of the same road, or the next way at a ramp's foot): where that ribbon is
  // here, the cap would be a small step in it, so it only counts where
  // neither the same road nor a ribbon carrying on from its end vertex at
  // its height covers the point
  for (let i = 0; i < _capZ.length; i++) {
    const z = _capZ[i];
    let joined = false;
    for (const m of _midS) {
      if (m.r === _capR[i]) { joined = true; break; }
      const q = onSeg(m, _capX[i], _capY[i]);
      if (q.d <= m.hs && Math.abs(q.z - z) < 0.05) { joined = true; break; }
    }
    if (joined) continue;
    _roadZ.push(z); _roadD.push(_capD[i]);
    if (z > cap) { cap = z; capRoad = true; }
  }
  if ((cap > best + 0.5 || best === -Infinity) && cap > best) { best = cap; bestRoad = capRoad; }
  if (!ground && onFlatRoad(elev.map, x, y)) ground = true;
  if (ground && 0 <= lim) {
    // a street-level road next to the raised ones is a road surface too
    const nd = best < OVERLAP_BAND ? flatRoadAt(elev, x, y) : Infinity;
    if (nd < Infinity) { _roadZ.push(0); _roadD.push(nd); }
    if (0 > best) { best = 0; bestRoad = nd < Infinity; }
  }
  if (_roadZ.length > (bestRoad ? 1 : 0)) {
    let pick = -1;
    for (let i = 0; i < _roadZ.length; i++) {
      if (Math.abs(_roadZ[i] - zHint) <= STAY_ON && (pick < 0 || _roadD[i] < _roadD[pick])) pick = i;
    }
    if (pick >= 0) return _roadZ[pick];
  }
  if (best > -Infinity) return best;
  // below every surface here (pushed into the side of a cutting): stay put,
  // the walls move it back; never pop up to the street
  return Math.min(zHint, lowest < Infinity ? lowest : 0);
}

// Is (x, y) on a raised or sunken surface: a road deck or cutting floor off
// street level, an embankment slope or a retaining wall? `pad` widens the
// road part (clearance for things placed beside it).
export function offLevelAt(elev, x, y, pad = 0) {
  if (!elev.has) return false;
  const list = elev.grid.at(x, y);
  if (!list) return false;
  for (const s of list) {
    const q = onSeg(s, x, y);
    if (Math.abs(q.z) <= RAISED) continue;
    if (q.z < 0) {
      if (!s.covered && q.d <= s.hs + WALL_T + pad) return true;
      continue;
    }
    if (q.d <= s.hs + pad) return true;
    const slope = s.slope || EMB_SLOPE;
    if (!s.deck && q.d < s.hs + q.z / slope + pad && fillPieceAt(s, q.t, x, y) !== false) {
      if (s.rail || !lowerSurfaceAt(elev, x, y, q.z - (q.d - s.hs) * slope + 1.5)) return true;
    }
  }
  return false;
}

// Is the embankment slope beside fill segment s real at arc t, on the side of
// (x, y)? false where that piece is a deck over a road or an abutment wall.
function fillPieceAt(s, t, x, y) {
  if (!s.pieces) return true;
  const k = Math.min(s.pieces.length - 1, Math.floor(t * s.pieces.length));
  const p = s.pieces[k];
  if (p.over) return false;
  const side = (x - s.ax) * -s.uy + (y - s.ay) * s.ux >= 0 ? 0 : 1;
  return !p.retain[side];
}

// Height of road r itself at (x, y) (0 for flat roads).
export function roadZAt(r, x, y) {
  const Z = r && r.z;
  if (!Z) return 0;
  const P = r.pts;
  let bd = Infinity, bz = 0;
  for (let i = 0; i < P.length - 1; i++) {
    const cp = closestPointOnSegment(x, y, P[i][0], P[i][1], P[i + 1][0], P[i + 1][1]);
    if (cp.dist2 < bd) { bd = cp.dist2; bz = Z[i] + (Z[i + 1] - Z[i]) * cp.t; }
  }
  return bz;
}

// Lowest ceiling above an entity at z (tunnel roof, viaduct deck), or Infinity.
export function ceilingAt(elev, x, y, z) {
  if (!elev.has) return Infinity;
  const list = elev.grid.at(x, y);
  if (!list) return Infinity;
  let c = Infinity;
  for (const s of list) {
    const q = onSeg(s, x, y);
    if (q.d > s.hs + WALL_T) continue;
    if (s.covered && z < -RAISED) {
      const under = roofTopAt(elev, x, y, q.z) - ROOF_T;
      if (under > z && under < c) c = under;
    } else if (q.z - DECK_T > z + 0.5 && q.z > RAISED && q.d <= s.hs) {
      if (q.z - DECK_T < c) c = q.z - DECK_T;
    }
  }
  return c;
}

// Top of a tunnel roof: just under the street, or under the canal bed
// where the road passes below the water (aqueduct). For a tunnel at zSelf,
// never above another sunken road that runs over it (the A28 under the
// Julianaplein ramps): its roof is that road's floor.
export function roofTopAt(elev, x, y, zSelf = null) {
  const map = elev.map;
  let top = -0.06;
  for (const w of map.waterNear(x, y, 6)) {
    const [minx, miny, maxx, maxy] = w.bounds;
    if (x < minx - 6 || x > maxx + 6 || y < miny - 6 || y > maxy + 6) continue;
    top = waterRoof(map, x, y);
    break;
  }
  if (zSelf === null) return top;
  const list = elev.grid.at(x, y);
  if (list) {
    for (const sg of list) {
      if (sg.rail) continue;
      const q = onSeg(sg, x, y);
      if (q.d <= sg.hs + WALL_T && q.z > zSelf + 2.5 && q.z < top - 0.05) top = q.z - 0.05;
    }
  }
  return top;
}

function waterRoof(map, x, y) {
  // inside or within a few metres of a canal the roof drops below its bed
  for (const [dx, dy] of [[0, 0], [5, 0], [-5, 0], [0, 5], [0, -5]]) {
    if (map.inWaterRaw(x + dx, y + dy)) return -2.95;
  }
  return -0.06;
}

// Is (x, y) inside a covered (tunnel) road section? Water above it is the
// canal over an aqueduct, not water for whoever drives through below.
export function coveredAt(elev, x, y) {
  if (!elev.has) return false;
  const list = elev.grid.at(x, y);
  if (!list) return false;
  for (const s of list) {
    if (!s.covered) continue;
    if (onSeg(s, x, y).d <= s.hs + WALL_T) return true;
  }
  return false;
}

// ------------------------------------------------------------------ walls

function surfaceOf(elev, x, y, except, zNear, tol, rail = false) {
  return surfaceZ(elev, x, y, except, zNear, tol, rail) !== null;
}
// the highest such surface's height, or null
function surfaceZ(elev, x, y, except, zNear, tol, rail = false) {
  const list = elev.grid.at(x, y);
  if (!list) return null;
  let best = null;
  for (const s of list) {
    if (s.r === except || !!s.rail !== rail) continue;
    const q = onSeg(s, x, y);
    if (q.d <= s.hs + 0.2 && Math.abs(q.z - zNear) < tol && (best === null || q.z > best)) best = q.z;
  }
  return best;
}

// Floor height of another open sunken road at (x, y), or null.
function sunkenNeighbourZ(elev, x, y, except) {
  const list = elev.grid.at(x, y);
  if (!list) return null;
  let best = null;
  for (const s of list) {
    if (s.r === except || s.rail || s.covered) continue;
    const q = onSeg(s, x, y);
    if (q.d <= s.hs && q.z < -RAISED && (best === null || q.z > best)) best = q.z;
  }
  return best;
}

// Pieces of retaining wall (cut) and crash barrier (raise), ~2 m each,
// offset to the verge edge. n points into the road. A cut piece has `low`
// (solid for whoever is in the trench) and `fence` (solid for whoever is up
// at street level); openings where another road at the same level joins, and
// no fence where a street crosses over the cutting or on top of a tunnel.
function buildWalls(elev, map) {
  const walls = elev.walls;
  for (const s of elev.segs) {
    // a rail viaduct has parapets; its embankment ramps are open
    if (s.rail && !s.deck) continue;
    const n = Math.max(1, Math.round(s.len / PIECE));
    for (const side of [1, -1]) {
      const nx = -s.uy * side, ny = s.ux * side; // outward
      const off = s.hs + (s.za < 0 || s.zb < 0 ? WALL_T / 2 : 0.1);
      for (let k = 0; k < n; k++) {
        const t0 = k / n, t1 = (k + 1) / n, tm = (t0 + t1) / 2;
        const zr = s.za + (s.zb - s.za) * tm;
        const mx = s.ax + s.ux * s.len * tm + nx * off, my = s.ay + s.uy * s.len * tm + ny * off;
        // a dip of under a metre needs no retaining wall
        const cut = zr < -1.0;
        const raise = zr > 1.2;
        if (!cut && !raise && !s.rail && !s.covered && Math.min(s.za + (s.zb - s.za) * t0, s.za + (s.zb - s.za) * t1) < -RAISED &&
          !surfaceOf(elev, mx, my, s.r, zr, 1.6) && !onFlatRoad(map, mx, my)) {
          // where a ramp starts down into a cutting the ground is already cut
          // away (openCutMask) before a retaining wall is needed: a low
          // wall face to street level closes the side, drawn only
          elev.skirts.push({
            ax: s.ax + s.ux * s.len * t0 + nx * off, ay: s.ay + s.uy * s.len * t0 + ny * off,
            bx: s.ax + s.ux * s.len * t1 + nx * off, by: s.ay + s.uy * s.len * t1 + ny * off,
            nx: -nx, ny: -ny, za: s.za + (s.zb - s.za) * t0, zb: s.za + (s.zb - s.za) * t1, seg: s,
            coping: !onFlatRoad(map, mx + nx * COPING, my + ny * COPING),
          });
        }
        if (!cut && !raise) {
          if (s.rail || s.covered) continue;
          // a ramp out of the cutting tucked under the edge of a higher way
          // alongside (a slip road climbing faster): the cut-away ground
          // between them is closed by a wall face up to the other surface
          // (also up to a street-level ribbon overlapping the ramp's edge)
          const zs = surfaceZ(elev, mx, my, s.r, zr, 1.6);
          const zn = zs !== null ? zs : onFlatRoad(map, mx, my) ? 0 : null;
          if (zn !== null && zn > zr + 0.25 && Math.min(s.za + (s.zb - s.za) * t0, s.za + (s.zb - s.za) * t1) < -RAISED) {
            elev.skirts.push({
              ax: s.ax + s.ux * s.len * t0 + nx * off, ay: s.ay + s.uy * s.len * t0 + ny * off,
              bx: s.ax + s.ux * s.len * t1 + nx * off, by: s.ay + s.uy * s.len * t1 + ny * off,
              nx: -nx, ny: -ny, za: s.za + (s.zb - s.za) * t0, zb: s.za + (s.zb - s.za) * t1, seg: s, coping: false, top: zn,
            });
          }
          // a shallow ramp beside the deep cutting it leads into: a parapet on its edge
          if (surfaceOf(elev, mx, my, s.r, zr, 1.0)) continue;
          const zo = sunkenNeighbourZ(elev, mx + nx * 1.2, my + ny * 1.2, s.r);
          if (zo === null || zo > zr - 1.0) continue;
          const par = {
            ax: s.ax + s.ux * s.len * t0 + nx * off, ay: s.ay + s.uy * s.len * t0 + ny * off,
            bx: s.ax + s.ux * s.len * t1 + nx * off, by: s.ay + s.uy * s.len * t1 + ny * off,
            nx: -nx, ny: -ny, za: s.za + (s.zb - s.za) * t0, zb: s.za + (s.zb - s.za) * t1, z: zr,
            kind: 'cut', seg: s, low: true, fence: false, covered: false, parapet: true, top: zr + BARRIER_H,
          };
          walls.push(par);
          elev.wallGrid.insert(par, Math.min(par.ax, par.bx) - 2, Math.min(par.ay, par.by) - 2, Math.max(par.ax, par.bx) + 2, Math.max(par.ay, par.by) + 2);
          continue;
        }
        const joined = s.rail ? surfaceOf(elev, mx, my, s.r, zr, 1.2, true)
          // (a crash barrier that would stand on the asphalt of a ramp alongside
          // it, even a couple of metres lower, is left out)
          : surfaceOf(elev, mx, my, s.r, zr, cut ? 1.6 : 2.5) || (Math.abs(zr) < (cut ? 1.6 : 2.5) && onFlatRoad(map, mx, my));
        const piece = {
          ax: s.ax + s.ux * s.len * t0 + nx * off, ay: s.ay + s.uy * s.len * t0 + ny * off,
          bx: s.ax + s.ux * s.len * t1 + nx * off, by: s.ay + s.uy * s.len * t1 + ny * off,
          nx: -nx, ny: -ny, // into the road
          za: s.za + (s.zb - s.za) * t0, zb: s.za + (s.zb - s.za) * t1, z: zr,
          kind: cut ? 'cut' : 'barrier', seg: s,
          low: !joined, fence: false, covered: s.covered,
        };
        if (cut) {
          // no fence where the other carriageway of the cutting continues beyond this wall
          piece.fence = !s.covered && !joined && !onFlatRoad(map, mx, my) &&
            ![1.5, 3.5, 6].some((d) => surfaceOf(elev, mx + nx * d, my + ny * d, s.r, zr, 3));
          piece.top = s.covered ? roofTopAt(elev, mx, my, zr) : 0;
          if (!s.covered && joined) {
            // the way alongside lies higher (a slip road climbing out beside
            // it, overlapping the verge): the wall rises to its surface, drawn
            // only, since that way's lanes run over this edge
            const zn = surfaceZ(elev, mx, my, s.r, zr, 1.6);
            if (zn !== null && zn > zr + 0.5) { piece.low = true; piece.top = zn; piece.drawOnly = true; }
          }
          if (!s.covered && !joined) {
            // beside another sunken road (a ramp climbing out of the cutting
            // next to the main carriageway) the lower road's wall only rises
            // to the other one, which gets a parapet instead of a fence
            const zo = sunkenNeighbourZ(elev, mx + nx * 1.2, my + ny * 1.2, s.r);
            if (zo !== null) {
              piece.fence = false;
              if (zo > zr + 0.5) piece.top = zo;
              else if (zo < zr - 0.5) { piece.top = zr + BARRIER_H; piece.parapet = true; }
              else piece.low = false;
            }
          }
        }
        if (cut && !s.covered && !s.rail && !piece.low) {
          // no wall here: another road runs alongside at about this level
          // (the other carriageway, a ramp merging) or a street passes at
          // the top. The ground in between is cut away (openCutMask): a
          // floor strip at road level reaches over to the neighbour's
          // surface, or beside a street a low wall face closes the side
          let reach = 0;
          for (let d = 0.25; d <= 8; d += 0.25) if (surfaceOf(elev, mx + nx * d, my + ny * d, s.r, zr, 1.2)) { reach = d; break; }
          const ends = { ax: piece.ax, ay: piece.ay, bx: piece.bx, by: piece.by, nx: piece.nx, ny: piece.ny, za: piece.za, zb: piece.zb, seg: s };
          if (reach) elev.floors.push({ ...ends, reach });
          else if (onFlatRoad(map, mx, my)) elev.skirts.push({ ...ends, coping: false });
        }
        if (cut && piece.low && !s.covered) piece.coping = !onFlatRoad(map, mx, my) && !onFlatRoad(map, mx + nx * COPING, my + ny * COPING);
        if (raise && s.pieces && !joined) {
          const fp = s.pieces[Math.min(s.pieces.length - 1, k * s.pieces.length / n | 0)];
          if (fp && fp.retain[side > 0 ? 0 : 1]) {
            // abutment: nothing from below gets into the embankment
            const ret = { ...piece, kind: 'retain', low: true };
            walls.push(ret);
            elev.wallGrid.insert(ret, Math.min(ret.ax, ret.bx) - 2, Math.min(ret.ay, ret.by) - 2, Math.max(ret.ax, ret.bx) + 2, Math.max(ret.ay, ret.by) + 2);
          }
        }
        if (!piece.low && !piece.fence) continue;
        // steel crash barriers beside the lanes and the fences along the
        // cuttings give way to a car like a bridge railing (props in
        // cityprops.js); concrete viaduct barriers and trench walls stay solid
        const brk = piece.fence ? 'hek' : piece.kind === 'barrier' && !s.deck ? 'vangrail' : null;
        if (brk) {
          piece.brk = brk;
          const zk = brk === 'hek' ? piece.top : zr;
          piece.brkZ = zk;
          piece.key = brk + '@' + Math.round(((piece.ax + piece.bx) / 2) * 10) + ',' + Math.round(((piece.ay + piece.by) / 2) * 10);
          elev.brkWalls.push(piece);
        }
        walls.push(piece);
        if (piece.drawOnly) continue;
        const x0 = Math.min(piece.ax, piece.bx), x1 = Math.max(piece.ax, piece.bx);
        const y0 = Math.min(piece.ay, piece.by), y1 = Math.max(piece.ay, piece.by);
        elev.wallGrid.insert(piece, x0 - 2, y0 - 2, x1 + 2, y1 + 2);
      }
    }
  }
}

// Does a wall piece block something at height z (absolute)?
// Returns +1 (must stay on the road side), -1 (must stay outside) or 0.
function wallSide(w, z) {
  // (a road in a cutting passes under the deck the embankment ends at)
  if (w.kind === 'retain') return z < w.z - 1.2 && z > -2 ? -1 : 0;
  if (w.parapet) return z > w.z - 0.6 && z < w.z + 3 ? 1 : 0;
  if (w.kind === 'cut') {
    // the trench wall holds whoever drives down on its floor, not a ramp
    // alongside that is still near the top
    if (z < w.top - RAISED) return w.low && z > w.z - 2 && z < w.z + 2.5 ? 1 : 0;
    // the fence stands at street level: a deck crossing over the cutting clears it
    return w.fence && z < w.top + 1.5 ? -1 : 0;
  }
  // a crash barrier is under a metre tall: a deck two metres above it clears it
  return w.low && z > w.z - 1.2 && z < w.z + 2 ? 1 : 0;
}

// Knocked-out barrier and fence sections (breakables.js registers the test)
let wallBroken = null;
export function setWallBrokenTest(fn) { wallBroken = fn; }
export function isWallBroken(w) { return !!(w.brk && wallBroken && wallBroken(w.key)); }

// Breakable wall pieces whose middle lies in the square cell at (x0, y0):
// { kind, x, y, angle, half, z, w }.
export function breakableWallsIn(elev, x0, y0, size) {
  const out = [];
  for (const w of elev.brkWalls || []) {
    const x = (w.ax + w.bx) / 2, y = (w.ay + w.by) / 2;
    if (x < x0 || x >= x0 + size || y < y0 || y >= y0 + size) continue;
    out.push({ kind: w.brk, x, y, angle: Math.atan2(w.by - w.ay, w.bx - w.ax), half: Math.hypot(w.bx - w.ax, w.by - w.ay) / 2, z: w.brkZ, w });
  }
  return out;
}

// Walkers: push a circle of radius back to its allowed side of every wall.
export function resolveElevWalls(elev, x, y, z, radius) {
  if (!elev.has) return null;
  const list = elev.wallGrid.at(x, y);
  if (!list) return null;
  let moved = false;
  for (const w of list) {
    const side = wallSide(w, z);
    if (!side || ((w.brk === 'vangrail' || side < 0) && isWallBroken(w))) continue;
    const ex = w.bx - w.ax, ey = w.by - w.ay, el = Math.hypot(ex, ey) || 1;
    const along = ((x - w.ax) * ex + (y - w.ay) * ey) / el;
    if (along < -radius || along > el + radius) continue;
    const s = ((x - w.ax) * w.nx + (y - w.ay) * w.ny) * side;
    if (s >= radius || s < -radius - 0.8) continue;
    const push = radius - s;
    x += w.nx * side * push;
    y += w.ny * side * push;
    moved = true;
  }
  return moved ? [x, y] : null;
}

// Vehicles: one-sided like bridge railings - a probe up to `band` past a wall
// on the wrong side is pushed back. Returns {x, y, nx, ny, depth} or null.
// props: the breakable sections are left to their props (the player's
// vehicle, which always has the props around it streamed in).
export function elevWallContact(elev, x, y, z, band = 1.4, props = false) {
  if (!elev.has) return null;
  const list = elev.wallGrid.at(x, y);
  if (!list) return null;
  let best = null;
  for (const w of list) {
    const side = wallSide(w, z);
    if (!side) continue;
    // (a cutting's fence is the breakable part, its wall below is not)
    if (w.brk && (w.brk === 'vangrail' || side < 0) && (props || isWallBroken(w))) continue;
    const ex = w.bx - w.ax, ey = w.by - w.ay, el = Math.hypot(ex, ey) || 1;
    const along = ((x - w.ax) * ex + (y - w.ay) * ey) / el;
    if (along < 0 || along > el) continue;
    const s = ((x - w.ax) * w.nx + (y - w.ay) * w.ny) * side;
    if (s > 0 || s < -band) continue;
    const depth = -s + 0.05;
    if (!best || depth > best.depth) best = { x: x - w.nx * side * s, y: y - w.ny * side * s, nx: w.nx * side, ny: w.ny * side, depth };
  }
  return best;
}

// ------------------------------------------------------------------ open cuts

function buildCuts(elev) {
  // open (not covered) sunken segment runs: footprint quads out to the wall
  for (const s of elev.segs) {
    if (s.covered || (s.za > -RAISED && s.zb > -RAISED)) continue;
    elev.cuts.push(s);
  }
}

// Rasterise the open cuts into a mask (255 = no ground, 128 = covered: no
// canal bed) over their bounding
// box, `res` metres per texel. Returns null when there are none.
export function openCutMask(elev, maxTex = 4096) {
  if (!elev.has || !elev.cuts.length) return null;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const pad = WALL_T + 0.2;
  for (const s of [...elev.cuts, ...elev.segs.filter((q) => q.covered)]) {
    const r = s.hs + pad;
    x0 = Math.min(x0, s.ax - r, s.bx - r); y0 = Math.min(y0, s.ay - r, s.by - r);
    x1 = Math.max(x1, s.ax + r, s.bx + r); y1 = Math.max(y1, s.ay + r, s.by + r);
  }
  const res = Math.max(0.5, Math.max(x1 - x0, y1 - y0) / maxTex);
  const w = Math.ceil((x1 - x0) / res) + 1, h = Math.ceil((y1 - y0) / res) + 1;
  const data = new Uint8Array(w * h);
  for (const s of elev.cuts) {
    const r = s.hs + pad;
    const i0 = Math.max(0, Math.floor((Math.min(s.ax, s.bx) - r - x0) / res));
    const i1 = Math.min(w - 1, Math.ceil((Math.max(s.ax, s.bx) + r - x0) / res));
    const j0 = Math.max(0, Math.floor((Math.min(s.ay, s.by) - r - y0) / res));
    const j1 = Math.min(h - 1, Math.ceil((Math.max(s.ay, s.by) + r - y0) / res));
    for (let j = j0; j <= j1; j++) {
      const py = y0 + j * res;
      for (let i = i0; i <= i1; i++) {
        const px = x0 + i * res;
        const cp = closestPointOnSegment(px, py, s.ax, s.ay, s.bx, s.by);
        if (cp.dist2 > r * r) continue;
        const z = s.za + (s.zb - s.za) * cp.t;
        if (z < -RAISED) data[j * w + i] = 255;
      }
    }
  }
  // the round end of an open run reaches over the tunnel it runs into: the
  // ground there is the tunnel roof, not a hole (out to the open run's pad
  // and a texel more, or the corners beside the portal stay open)
  for (const s of elev.segs) {
    if (!s.covered) continue;
    const r = s.hs + pad + res;
    const i0 = Math.max(0, Math.floor((Math.min(s.ax, s.bx) - r - x0) / res));
    const i1 = Math.min(w - 1, Math.ceil((Math.max(s.ax, s.bx) + r - x0) / res));
    const j0 = Math.max(0, Math.floor((Math.min(s.ay, s.by) - r - y0) / res));
    const j1 = Math.min(h - 1, Math.ceil((Math.max(s.ay, s.by) + r - y0) / res));
    for (let j = j0; j <= j1; j++) {
      const py = y0 + j * res;
      for (let i = i0; i <= i1; i++) {
        const px = x0 + i * res;
        const cp = closestPointOnSegment(px, py, s.ax, s.ay, s.bx, s.by);
        // covered: 128, the ground stays but the canal bed under it goes
        // (it would hang in the tunnel as a second, black ceiling)
        if (cp.dist2 <= r * r && (cp.t > 0 && cp.t < 1 ? true : !data[j * w + i])) data[j * w + i] = 128;
      }
    }
  }
  // streets crossing over the cut keep their ground (their deck is drawn by roadstructures3d)
  return { data, w, h, x0, y0, res };
}
