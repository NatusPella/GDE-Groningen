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
export const RAISED = 0.3;           // |z| above which a road counts as off street level
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

const EMPTY = { segs: [], walls: [], cuts: [], has: false };

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
  const elev = { segs, grid, has: true, walls: [], wallGrid: new Grid(WALL_CELL), cuts: [], map, flatGrid: new Grid(16) };
  // street-level road ribbons near the raised/sunken ones: they pass under
  // embankments (which then need an abutment, not a slope) and over cuttings
  const near = (x, y) => grid.at(x, y);
  for (const r of map.roads) {
    if (r.z) continue;
    const hs = surfaceHalfWidth(r);
    const P = r.pts;
    for (let i = 0; i < P.length - 1; i++) {
      const ax = P[i][0], ay = P[i][1], bx = P[i + 1][0], by = P[i + 1][1];
      if (!near(ax, ay) && !near(bx, by) && !near((ax + bx) / 2, (ay + by) / 2)) continue;
      elev.flatGrid.insert({ ax, ay, bx, by, hs }, Math.min(ax, bx) - hs, Math.min(ay, by) - hs, Math.max(ax, bx) + hs, Math.max(ay, by) + hs);
    }
  }
  classifyFill(elev);
  buildWalls(elev, map);
  buildCuts(elev);
  return elev;
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
    if (s.deck || (s.za <= RAISED && s.zb <= RAISED)) continue;
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

function onFlatRoad(map, x, y) {
  for (const r of map.roadsNear(x, y, 12)) {
    if (r.z) continue;
    const hw = surfaceHalfWidth(r);
    const P = r.pts;
    for (let i = 0; i < P.length - 1; i++) {
      if (closestPointOnSegment(x, y, P[i][0], P[i][1], P[i + 1][0], P[i + 1][1]).dist2 < hw * hw) return true;
    }
  }
  return false;
}

// The walkable/drivable surface at (x, y) for something currently at zHint:
// the highest surface no more than STEP_UP above it. Falling back to the
// lowest surface when there is none (standing over an open cut).
export function groundHeightAt(elev, x, y, zHint = 0, stepUp = STEP_UP) {
  if (!elev.has) return 0;
  const list = elev.grid.at(x, y);
  if (!list) return 0;
  let best = -Infinity, lowest = Infinity, cap = -Infinity;
  let ground = true;
  const lim = zHint + stepUp;
  for (const s of list) {
    const q = onSeg(s, x, y);
    let z = null;
    if (q.d <= s.hs) {
      z = q.z;
      if (z < -RAISED && !s.covered) ground = false;
    } else if (!s.deck && q.z > RAISED && q.d < s.hs + q.z / EMB_SLOPE) {
      z = q.z - (q.d - s.hs) * EMB_SLOPE;
      if (lowerSurfaceAt(elev, x, y, z + 1.5) || fillPieceAt(s, q.t, x, y) === false) z = null;
    }
    if (z === null) continue;
    if (z <= lim) {
      // past a segment's end its flat end cap would put a small step in a
      // ramp; the next segment's own ribbon is the smooth surface there
      if (q.t <= 0 || q.t >= 1) { if (z > cap) cap = z; }
      else if (z > best) best = z;
    }
    if (z < lowest) lowest = z;
  }
  if (cap > best + 0.5 || best === -Infinity) best = Math.max(best, cap);
  if (!ground && onFlatRoad(elev.map, x, y)) ground = true;
  if (ground && 0 <= lim && 0 > best) best = 0;
  if (best > -Infinity) return best;
  // below every surface here (pushed into the side of a cutting): stay put,
  // the walls move it back; never pop up to the street
  return Math.min(zHint, lowest < Infinity ? lowest : 0);
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
      const under = roofTopAt(elev, x, y) - ROOF_T;
      if (under > z && under < c) c = under;
    } else if (q.z - DECK_T > z + 0.5 && q.z > RAISED && q.d <= s.hs) {
      if (q.z - DECK_T < c) c = q.z - DECK_T;
    }
  }
  return c;
}

// Top of a tunnel roof: just under the street, or under the canal bed
// where the road passes below the water (aqueduct).
export function roofTopAt(elev, x, y) {
  const map = elev.map;
  for (const w of map.waterNear(x, y, 6)) {
    const [minx, miny, maxx, maxy] = w.bounds;
    if (x < minx - 6 || x > maxx + 6 || y < miny - 6 || y > maxy + 6) continue;
    return waterRoof(map, x, y);
  }
  return -0.06;
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

function surfaceOf(elev, x, y, except, zNear, tol) {
  const list = elev.grid.at(x, y);
  if (!list) return false;
  for (const s of list) {
    if (s.r === except) continue;
    const q = onSeg(s, x, y);
    if (q.d <= s.hs + 0.2 && Math.abs(q.z - zNear) < tol) return true;
  }
  return false;
}

// Pieces of retaining wall (cut) and crash barrier (raise), ~2 m each,
// offset to the verge edge. n points into the road. A cut piece has `low`
// (solid for whoever is in the trench) and `fence` (solid for whoever is up
// at street level); openings where another road at the same level joins, and
// no fence where a street crosses over the cutting or on top of a tunnel.
function buildWalls(elev, map) {
  const walls = elev.walls;
  for (const s of elev.segs) {
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
        if (!cut && !raise) continue;
        const joined = surfaceOf(elev, mx, my, s.r, zr, cut ? 1.6 : 1.2) || (Math.abs(zr) < 1.6 && onFlatRoad(map, mx, my));
        const piece = {
          ax: s.ax + s.ux * s.len * t0 + nx * off, ay: s.ay + s.uy * s.len * t0 + ny * off,
          bx: s.ax + s.ux * s.len * t1 + nx * off, by: s.ay + s.uy * s.len * t1 + ny * off,
          nx: -nx, ny: -ny, // into the road
          za: s.za + (s.zb - s.za) * t0, zb: s.za + (s.zb - s.za) * t1, z: zr,
          kind: cut ? 'cut' : 'barrier', seg: s,
          low: !joined, fence: false, covered: s.covered,
        };
        if (cut) {
          piece.fence = !s.covered && !onFlatRoad(map, mx, my);
          piece.top = s.covered ? roofTopAt(elev, mx, my) : 0;
        }
        if (raise && s.pieces) {
          const fp = s.pieces[Math.min(s.pieces.length - 1, k * s.pieces.length / n | 0)];
          if (fp && fp.retain[side > 0 ? 0 : 1]) {
            // abutment: nothing from below gets into the embankment
            const ret = { ...piece, kind: 'retain', low: true };
            walls.push(ret);
            elev.wallGrid.insert(ret, Math.min(ret.ax, ret.bx) - 2, Math.min(ret.ay, ret.by) - 2, Math.max(ret.ax, ret.bx) + 2, Math.max(ret.ay, ret.by) + 2);
          }
        }
        if (!piece.low && !piece.fence) continue;
        walls.push(piece);
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
  if (w.kind === 'retain') return z < w.z - 1.2 ? -1 : 0;
  if (w.kind === 'cut') {
    if (z < w.top - RAISED) return w.low && z > w.z - 2 ? 1 : 0;
    return w.fence ? -1 : 0;
  }
  return w.low && z > w.z - 1.2 && z < w.z + 3 ? 1 : 0;
}

// Walkers: push a circle of radius back to its allowed side of every wall.
export function resolveElevWalls(elev, x, y, z, radius) {
  if (!elev.has) return null;
  const list = elev.wallGrid.at(x, y);
  if (!list) return null;
  let moved = false;
  for (const w of list) {
    const side = wallSide(w, z);
    if (!side) continue;
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
export function elevWallContact(elev, x, y, z, band = 1.4) {
  if (!elev.has) return null;
  const list = elev.wallGrid.at(x, y);
  if (!list) return null;
  let best = null;
  for (const w of list) {
    const side = wallSide(w, z);
    if (!side) continue;
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

// Rasterise the open cuts into a mask (1 = no ground) over their bounding
// box, `res` metres per texel. Returns null when there are none.
export function openCutMask(elev, maxTex = 4096) {
  if (!elev.has || !elev.cuts.length) return null;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const pad = WALL_T + 0.2;
  for (const s of elev.cuts) {
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
  // streets crossing over the cut keep their ground (their deck is drawn by roadstructures3d)
  return { data, w, h, x0, y0, res };
}
