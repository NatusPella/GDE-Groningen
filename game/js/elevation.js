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
// Pure data, built once per map (map.elev); the roads of streamed tiles join it, and leave it with their tile
// (extendElevation, shrinkElevation: #300).
import { closestPointOnSegment } from './util.js';
import { SpatialGrid } from './spatialgrid.js';

export const DECK_T = 1.0;           // viaduct deck thickness below the road surface
export const EMB_SLOPE = 0.6;        // embankment side slope (rise per metre)
export const WALL_T = 0.45;          // retaining wall thickness
export const FENCE_H = 1.1;
export const BARRIER_H = 0.9;
export const ROOF_T = 0.7;           // tunnel roof slab
export const RAISED = 0.3;           // |z| above which a road counts as off street level
export const COPING = 1.1;           // street-level strip beside an open cutting's wall (roadstructures3d)
// a road deeper than this lies under the terrain (-0.05): the ground over it
// is cut away (openCutMask) and a low wall face closes the side
export const CUT_Z = 0.07;
const SHALLOW_PAD = 0.35;
const SHOULDER = 1.8;                // matches roadsurface SIDEWALK_EXTRA (the rendered verge)
const CELL = 32;
const WALL_CELL = 24;
const PIECE = 2;
const STEP_UP = 1.1;

const SIDEWALK_CATS = new Set(['major', 'normal', 'minor']);

export function surfaceHalfWidth(r) {
  return r.width / 2 + (SIDEWALK_CATS.has(r.cat) ? SHOULDER : 0.3);
}

// SpatialGrid with the (item, x0, y0, x1, y1) and at(x, y) calls this module uses.
class Grid extends SpatialGrid {
  insert(item, x0, y0, x1, y1) { super.insert(item, [x0, y0, x1, y1]); }
  at(x, y) { return this.cellItems(Math.floor(x / this.cell), Math.floor(y / this.cell)); }
}

const EMPTY = { segs: [], walls: [], skirts: [], floors: [], cuts: [], has: false };

// The raised or sunken segments of one road (none without a profile or on street level): { r, i, ax, ay, bx, by, za, zb, len, ux, uy, hs, deck, covered, box }
function segsOfRoad(r) {
  const out = [];
  const Z = r.z;
  if (!Z || Z.length !== r.pts.length) return out;
  const hs = surfaceHalfWidth(r);
  const P = r.pts;
  for (let i = 0; i < P.length - 1; i++) {
    const ax = P[i][0], ay = P[i][1], bx = P[i + 1][0], by = P[i + 1][1];
    const len = Math.hypot(bx - ax, by - ay);
    if (len < 1e-3) continue;
    const za = Z[i], zb = Z[i + 1];
    if (Math.abs(za) < 0.02 && Math.abs(zb) < 0.02 && !r.zDeck) continue;
    const s = {
      r, i, ax, ay, bx, by, za, zb, len, ux: (bx - ax) / len, uy: (by - ay) / len, hs,
      deck: !!r.bridge && !r.tunnel, covered: !!r.tunnel,
    };
    const reach = hs + WALL_T + Math.max(0, Math.max(za, zb)) / EMB_SLOPE + 1;
    s.box = [Math.min(ax, bx) - reach, Math.min(ay, by) - reach, Math.max(ax, bx) + reach, Math.max(ay, by) + reach];
    out.push(s);
  }
  return out;
}

export function buildElevation(map) {
  const segs = [];
  const grid = new Grid(CELL);
  for (const r of map.roads) {
    for (const s of segsOfRoad(r)) {
      grid.insert(s, s.box[0], s.box[1], s.box[2], s.box[3]);
      segs.push(s);
    }
  }
  if (!segs.length) return EMPTY;
  const elev = { segs, grid, has: true, walls: [], skirts: [], floors: [], brkWalls: [], wallGrid: new Grid(WALL_CELL), cuts: [], map, flatGrid: new Grid(16), frame: map.terrainOn ? map.terrainFrame : null };
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
      elev.flatGrid.insert({ ax, ay, bx, by, hs, r }, Math.min(ax, bx) - hs, Math.min(ay, by) - hs, Math.max(ax, bx) + hs, Math.max(ay, by) + hs);
    }
  }
  addRailLifts(elev, map);
  classifyFill(elev);
  buildWalls(elev, map);
  joinWallEnds(elev);
  buildCuts(elev);
  return elev;
}

// ------------------------------------------------------------- streamed roads (#300)

// The roads of a streamed tile join the elevation model as their heights section arrives (tileworld.js addTile) and leave
// it with the tile (dropTile): `roads` are all the tile's road rows, with or without a profile. The raised segments get
// their grid entries, embankment pieces and walls; street-level roads near a raised segment (and street-level pieces of
// a new road near an older raised one) go into the flat grid, which tells an embankment from a bridge deck.
// A tile's neighbours are not looked at again when it comes in: a viaduct whose road below lies in a tile that
// is not there yet is built as a deck over nothing, an embankment without the abutment (the loaded tiles of a
// view are the same set every time the player goes there, and an embankment's slope is only a slope).
function newElevation(map) {
  return { segs: [], grid: new Grid(CELL), has: true, walls: [], skirts: [], floors: [], brkWalls: [], wallGrid: new Grid(WALL_CELL), cuts: [], map, flatGrid: new Grid(16), byRoad: new Map(), flatOf: new Map(), frame: map.terrainOn ? map.terrainFrame : null };
}
const isFlatSeg = (r, i) => !r.z || (Math.abs(r.z[i]) < 0.02 && Math.abs(r.z[i + 1]) < 0.02);
function addFlatPiece(elev, r, i) {
  const a = r.pts[i], b = r.pts[i + 1], hs = surfaceHalfWidth(r);
  const piece = { ax: a[0], ay: a[1], bx: b[0], by: b[1], hs, r };
  const box = [Math.min(a[0], b[0]) - hs, Math.min(a[1], b[1]) - hs, Math.max(a[0], b[0]) + hs, Math.max(a[1], b[1]) + hs];
  elev.flatGrid.insert(piece, box[0], box[1], box[2], box[3]);
  let list = elev.flatOf.get(r);
  if (!list) elev.flatOf.set(r, list = []);
  list.push({ piece, box, i });
}
const flatHas = (elev, r, i) => { const l = elev.flatOf.get(r); return !!l && l.some((f) => f.i === i); };

// Returns the number of raised or sunken segments that came in.
export function extendElevation(map, roads) {
  let elev = map.elev;
  if (!elev || !elev.has) elev = map.elev = newElevation(map);
  if (!elev.byRoad) { elev.byRoad = new Map(); elev.flatOf = new Map(); }
  const added = [];
  for (const r of roads) {
    if (elev.byRoad.has(r)) continue;
    const segs = segsOfRoad(r);
    elev.byRoad.set(r, segs);
    for (const s of segs) { elev.grid.insert(s, s.box[0], s.box[1], s.box[2], s.box[3]); elev.segs.push(s); added.push(s); }
  }
  // street-level roads next to a raised segment of the new roads
  const seen = new Set();
  for (const s of added) {
    const cx = (s.ax + s.bx) / 2, cy = (s.ay + s.by) / 2, reach = s.len / 2 + s.hs + 4;
    for (const o of map.roadsNear(cx, cy, reach)) {
      if (!o.z || elev.byRoad.get(o)) { /* a road with a profile: its flat pieces count too */ }
      for (let i = 0; i < o.pts.length - 1; i++) {
        if (!isFlatSeg(o, i) || flatHas(elev, o, i)) continue;
        const k = o.pts[i][0] * 7 + o.pts[i][1] * 13 + i;
        if (seen.has(k)) continue;
        seen.add(k);
        const a = o.pts[i], b = o.pts[i + 1];
        if (Math.hypot((a[0] + b[0]) / 2 - cx, (a[1] + b[1]) / 2 - cy) > reach + Math.hypot(b[0] - a[0], b[1] - a[1]) / 2) continue;
        addFlatPiece(elev, o, i);
      }
    }
  }
  // a new road's own street-level pieces beside raised segments that were already there
  for (const r of roads) {
    for (let i = 0; i < r.pts.length - 1; i++) {
      if (!isFlatSeg(r, i) || flatHas(elev, r, i)) continue;
      const a = r.pts[i], b = r.pts[i + 1];
      if (elev.grid.at(a[0], a[1]) || elev.grid.at(b[0], b[1]) || elev.grid.at((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)) addFlatPiece(elev, r, i);
    }
  }
  if (!added.length) return 0;
  classifyFill(elev, added);
  buildWalls(elev, map, added);
  buildCuts(elev, added);
  elev.version = (elev.version || 0) + 1;
  return added.length;
}

// The roads of a dropped tile leave the model (the ones extendElevation brought in). Returns the number of segments removed.
export function shrinkElevation(map, roads) {
  const elev = map.elev;
  if (!elev || !elev.byRoad) return 0;
  const gone = new Set();
  for (const r of roads) {
    const segs = elev.byRoad.get(r);
    if (segs) {
      elev.byRoad.delete(r);
      for (const s of segs) { elev.grid.remove(s, s.box); gone.add(s); }
    }
    const flat = elev.flatOf.get(r);
    if (flat) { elev.flatOf.delete(r); for (const f of flat) elev.flatGrid.remove(f.piece, f.box); }
  }
  if (!gone.size) return 0;
  const keep = (arr) => { let j = 0; for (let i = 0; i < arr.length; i++) if (!gone.has(arr[i].seg || arr[i])) arr[j++] = arr[i]; arr.length = j; };
  keep(elev.segs); keep(elev.skirts); keep(elev.floors); keep(elev.brkWalls); keep(elev.cuts);
  for (let i = elev.walls.length - 1; i >= 0; i--) {
    const w = elev.walls[i];
    if (!gone.has(w.seg)) continue;
    if (!w.drawOnly) elev.wallGrid.remove(w, [Math.min(w.ax, w.bx) - 2, Math.min(w.ay, w.by) - 2, Math.max(w.ax, w.bx) + 2, Math.max(w.ay, w.by) + 2]);
    elev.walls.splice(i, 1);
  }
  elev._copingBends = null;
  elev.version = (elev.version || 0) + 1;
  return gone.size;
}

// Where one way of a cutting ends and the next begins (or a wall piece is
// left out at a joint, or the cutting runs into a tunnel), the retaining
// walls stop short of each other and the cut-away ground shows through: a
// short wall face (drawn only) bridges every loose end of a cutting's wall
// to the nearest loose end nearby.
function joinWallEnds(elev) {
  const open = (w) => w.kind === 'cut' && w.low && !w.parapet;
  const CELL = 4, grid = new SpatialGrid(CELL), ends = [];
  for (const w of elev.walls) {
    if (!open(w)) continue;
    for (const [x, y, z] of [[w.ax, w.ay, w.za], [w.bx, w.by, w.zb]]) {
      const e = { w, x, y, z, loose: true };
      ends.push(e);
      grid.insertPoint(e, x, y);
    }
  }
  const around = (e, r, fn) => {
    for (const f of grid.queryRadius(e.x, e.y, r)) if (f.w !== e.w) fn(f, Math.hypot(f.x - e.x, f.y - e.y));
  };
  for (const e of ends) around(e, 0.3, (f, d) => { if (d < 0.3) e.loose = false; });
  for (const e of ends) {
    if (!e.loose) continue;
    let best = null, bd = 2.6;
    around(e, bd, (f, d) => { if (f.loose && d < bd && d > 0.05 && Math.abs(f.z - e.z) < 1.5) { best = f; bd = d; } });
    if (!best) continue;
    e.loose = best.loose = false;
    const nx = e.w.nx + best.w.nx, ny = e.w.ny + best.w.ny, l = Math.hypot(nx, ny) || 1;
    elev.skirts.push({ ax: e.x, ay: e.y, bx: best.x, by: best.y, nx: nx / l, ny: ny / l, za: e.z, zb: best.z, seg: e.w.seg, coping: Math.min(e.w.coping || 0, best.w.coping || 0) });
  }
}

// Track height where the rail climbs over a road (railway.js railZ: the
// track profile, railprofile.js, or on an older map the radial railLifts), so
// the embankment and viaduct railway3d draws carry whoever gets onto them
// instead of being walked and driven through.
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
  // the solved track profile (rail.z, railprofile.js) when the map has one,
  // else the radial lifts
  const profiled = (map.rails || []).some((r) => r.z);
  if (!profiled && !lifts.length) return;
  for (const rail of map.rails || []) {
    const P = rail.pts || rail, Z = rail.z;
    if (profiled && !Z) continue;
    for (let i = 0; i < P.length - 1; i++) {
      const [x0, y0] = P[i], [x1, y1] = P[i + 1];
      const L = Math.hypot(x1 - x0, y1 - y0);
      // (a stub of a few cm between two OSM ways, often at an angle: its
      // parapets would stand across the track; the segments either side cover it)
      if (L < 0.5) continue;
      const n = Math.max(1, Math.ceil(L / RAIL_STEP));
      for (let k = 0; k < n; k++) {
        const ax = x0 + (x1 - x0) * k / n, ay = y0 + (y1 - y0) * k / n;
        const bx = x0 + (x1 - x0) * (k + 1) / n, by = y0 + (y1 - y0) * (k + 1) / n;
        const za = Z ? Z[i] + (Z[i + 1] - Z[i]) * k / n : railLiftZ(lifts, ax, ay);
        const zb = Z ? Z[i] + (Z[i + 1] - Z[i]) * (k + 1) / n : railLiftZ(lifts, bx, by);
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
function classifyFill(elev, segs = elev.segs) {
  for (const s of segs) {
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
          // the whole slope out to its foot, at both ends of the piece: a
          // street along the foot or a lower carriageway alongside is buried
          // by the outer metres of the slope too
          [1, -1].forEach((side, j) => {
            const nx = -s.uy * side, ny = s.ux * side;
            for (const t of [t0, tm, t1]) {
              const zt = Math.max(0, s.za + (s.zb - s.za) * t), w = zt / EMB_SLOPE;
              const px = s.ax + s.ux * s.len * t, py = s.ay + s.uy * s.len * t;
              for (let d = s.hs + 0.25; d < s.hs + w - 0.05 && !piece.retain[j]; d += 0.5) {
                if (lowerSurfaceAt(elev, px + nx * d, py + ny * d, zt - (d - s.hs) * EMB_SLOPE + 1.5)) piece.retain[j] = true;
              }
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

// How far out from (x, y) along (nx, ny) the open-cut mask has the ground
// cut away (up to 4 m): where an open sunken segment's mask (openCutMask:
// its half width plus the wall's pad) still covers the point.
function cutReach(elev, x, y, nx, ny) {
  const pad = WALL_T + 0.2;
  let reach = 0;
  for (let t = 0.25; t <= 4; t += 0.25) {
    const px = x + nx * t, py = y + ny * t;
    let cut = false;
    for (const s of elev.grid.at(px, py) || []) {
      if (s.covered || s.rail || (s.za > -CUT_Z && s.zb > -CUT_Z)) continue;
      const cp = closestPointOnSegment(px, py, s.ax, s.ay, s.bx, s.by);
      const z = s.za + (s.zb - s.za) * cp.t, r = s.hs + pad;
      if (cp.dist2 <= r * r && z < -CUT_Z && (z < -1.0 || cp.dist2 <= (s.hs + SHALLOW_PAD) ** 2)) { cut = true; break; }
    }
    if (!cut) break;
    reach = t;
  }
  return reach + 0.3;
}

// Width of the street-level coping strip beside a cutting's wall at (x, y),
// outward (nx, ny): up to the edge of a street running alongside the top (it
// tucks under that street's ribbon), none where the street is over the wall.
function copingWidth(map, x, y, nx, ny, line) {
  if (line && onFlatRoad(map, x, y)) return 0;
  if (!onFlatRoad(map, x + nx * COPING, y + ny * COPING)) return COPING;
  for (let d = 0.1; d < COPING; d += 0.1) if (onFlatRoad(map, x + nx * d, y + ny * d)) return Math.max(0.05, d + 0.05 - WALL_T / 2);
  return COPING;
}

// Where two road ribbons overlap at different heights (a ramp splitting off
// or merging), whoever is within STAY_ON of more than one of them takes the
// one whose centreline is nearest (relative to its width) instead of the
// highest, so a car keeps to the road it is driving on.
const STAY_ON = 0.35;
const OVERLAP_BAND = 1.2;
const _roadZ = [], _roadD = [], _roadR = [], _capZ = [], _capD = [], _capX = [], _capY = [], _capR = [], _midS = [];
// what the last groundHeightAt stood on: a ribbon (road or rail), an
// embankment slope or the ground (surfaceAt keeps it as the asker's state)
const _pick = { ribbon: null, kind: 'ground' };
// the ribbon the last groundHeightAt / surfaceAt answered from (null: the ground)
export const pickedRibbon = () => _pick.ribbon;

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
// With `frame` (?terrain, #269: { base(r, x, y): what road r's profile is relative to there, ground(x, y): the terrain }) the
// profiles are read over their bases and everything here, zHint and the answer included, is absolute: the ribbons that overlap in
// plan have different bases, so a height only compares between them in absolute metres.
export function groundHeightAt(elev, x, y, zHint = 0, stepUp = STEP_UP, frame = null) {
  _pick.ribbon = null; _pick.kind = 'ground';
  const t0 = frame ? frame.ground(x, y) : 0;
  if (!elev.has) return t0;
  const list = elev.grid.at(x, y);
  if (!list) return t0;
  let best = -Infinity, lowest = Infinity, bestRoad = false, cap = -Infinity, capRoad = false;
  let bestR = null, capRb = null;
  let ground = true;
  const lim = zHint + stepUp;
  _roadZ.length = _roadD.length = _roadR.length = _capZ.length = _capD.length = _capX.length = _capY.length = _capR.length = _midS.length = 0;
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
    if (frame) z += frame.base(s.r, x, y, s);
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
        if (road) { _roadZ.push(z); _roadD.push(q.d / s.hs); _roadR.push(s.r); _midS.push(s); }
        if (end) { if (z > cap) { cap = z; capRoad = road; capRb = road ? s.r : null; } }
        else if (z > best) { best = z; bestRoad = road; bestR = road ? s.r : null; }
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
      if (q.d <= m.hs && Math.abs(q.z + (frame ? frame.base(m.r, _capX[i], _capY[i], m) : 0) - z) < 0.05) { joined = true; break; }
    }
    if (joined) continue;
    _roadZ.push(z); _roadD.push(_capD[i]); _roadR.push(_capR[i]);
    if (z > cap) { cap = z; capRoad = true; capRb = _capR[i]; }
  }
  if ((cap > best + 0.5 || best === -Infinity) && cap > best) { best = cap; bestRoad = capRoad; bestR = capRb; }
  if (!ground && onFlatRoad(elev.map, x, y)) ground = true;
  if (ground && t0 <= lim) {
    // a street-level road next to the raised ones is a road surface too
    const nd = best < t0 + OVERLAP_BAND ? flatRoadAt(elev, x, y) : Infinity;
    if (nd < Infinity) { _roadZ.push(t0); _roadD.push(nd); _roadR.push(null); }
    if (t0 > best) { best = t0; bestRoad = nd < Infinity; bestR = null; }
  }
  if (_roadZ.length > (bestRoad ? 1 : 0)) {
    let pick = -1;
    for (let i = 0; i < _roadZ.length; i++) {
      if (Math.abs(_roadZ[i] - zHint) <= STAY_ON && (pick < 0 || _roadD[i] < _roadD[pick])) pick = i;
    }
    if (pick >= 0) {
      _pick.ribbon = _roadR[pick]; _pick.kind = _roadR[pick] ? 'road' : 'ground';
      return _roadZ[pick];
    }
  }
  if (best > -Infinity) {
    _pick.ribbon = bestR; _pick.kind = bestR ? 'road' : best - t0 > RAISED ? 'slope' : 'ground';
    return best;
  }
  // below every surface here (pushed into the side of a cutting): stay put,
  // the walls move it back; never pop up to the street
  return Math.min(zHint, lowest < Infinity ? lowest : t0);
}

// Height of ribbon r (a road or rail with a profile) at (x, y) where (x, y)
// is on its surface, else null. Past the ribbon's own two ends it is not:
// whatever carries on from there has the say.
let _zSeg = null; // the segment of the ribbon the last ribbonZAt answered on (?terrain reads its base there)
export function ribbonZAt(elev, r, x, y) {
  _zSeg = null;
  if (!elev.has || !r) return null;
  const list = elev.grid.at(x, y);
  if (!list) return null;
  // the nearest point of the ribbon decides: past one of its two ends (that
  // end vertex is the nearest point and the point lies beyond it) is off it,
  // also where an inner vertex's round cap would still reach
  let bd = Infinity, bz = null, bh = 0, past = false, bs = null;
  for (const s of list) {
    if (s.r !== r) continue;
    const q = onSeg(s, x, y);
    if (q.d >= bd - 1e-9) continue;
    bd = q.d; bz = q.z; bh = s.hs; past = false; bs = s;
    if ((q.t <= 0 && s.i === 0) || (q.t >= 1 && s.i === s.r.pts.length - 2)) {
      const along = (x - s.ax) * s.ux + (y - s.ay) * s.uy;
      past = along < -0.05 || along > s.len + 0.05;
    }
  }
  if (!past && bz !== null && bd <= bh) { _zSeg = bs; return bz; }
  return null;
}

// The one height query (docs/PROVINCIE-PLAN.md 2.11): the surface under
// (x, y) for whoever is in `state` = { z, ribbon }, its layer: the height it
// is at and the road or rail deck it stands on. Whoever is on a ribbon stays
// on it while (x, y) is on its surface, however other decks, ramps and
// streets overlap it in plan; off it (past an edge, onto the next way at a
// joint) the surface is the highest one within a step up (groundHeightAt).
// Updates and returns state: { z, ribbon, kind: 'road'|'slope'|'ground' }.
// `ground` is the stateless query to fall back on (GameMap passes its own,
// so a patched groundHeightAt, like the home's storey, is honoured).
export function surfaceAt(elev, x, y, state, ground = null, frame = null) {
  const z0 = state.z || 0;
  const own = state.ribbon;
  if (own && elev.has) {
    const zr = ribbonZAt(elev, own, x, y);
    const zb = zr !== null && frame ? frame.base(own, x, y, _zSeg) : 0;
    if (zr !== null && Math.abs(zr + zb - z0) <= STEP_UP) {
      state.z = zr + zb;
      state.kind = 'road';
      return state;
    }
    // past its end: the way that carries on from there (the same road
    // first, so through traffic at a slip road's split stays on the
    // main road), at about this height
    let best = null, bz = 0, bk = Infinity;
    for (const r of joinsOf(elev, own)) {
      let z = ribbonZAt(elev, r, x, y);
      if (z === null) continue;
      if (frame) z += frame.base(r, x, y, _zSeg);
      if (Math.abs(z - z0) > STEP_UP) continue;
      const k = (sameRoad(r, own) ? 0 : 1) * 10 + Math.abs(z - z0);
      if (k < bk) { bk = k; best = r; bz = z; }
    }
    if (best) {
      state.ribbon = best;
      state.z = bz;
      state.kind = 'road';
      return state;
    }
  }
  _pick.ribbon = null; _pick.kind = 'ground';
  state.z = ground ? ground(x, y, z0) : groundHeightAt(elev, x, y, z0, STEP_UP, frame);
  state.ribbon = _pick.ribbon;
  state.kind = _pick.kind;
  return state;
}

// Ribbons with a profile that share a vertex with either end of r.
const vkey = (p) => Math.round(p[0] * 100) * 1e7 + Math.round(p[1] * 100);
function joinsOf(elev, r) {
  if (!elev.joins) {
    const at = new Map();
    for (const s of elev.segs) {
      if (s.rail || at.has(s.r)) continue;
      at.set(s.r, null);
    }
    const byKey = new Map();
    for (const q of at.keys()) for (const p of q.pts) { const k = vkey(p); (byKey.get(k) || byKey.set(k, []).get(k)).push(q); }
    elev.joins = new WeakMap();
    elev.joinKeys = byKey;
  }
  let j = elev.joins.get(r);
  if (!j) {
    const set = new Set();
    if (r.pts) for (const p of [r.pts[0], r.pts[r.pts.length - 1]]) for (const q of elev.joinKeys.get(vkey(p)) || []) if (q !== r) set.add(q);
    elev.joins.set(r, j = [...set]);
  }
  return j;
}
const sameRoad = (a, b) => (a.ref && a.ref === b.ref) || (a.name && a.name === b.name && /_link$/.test(a.type) === /_link$/.test(b.type));

// The ribbon something put down at (x, y) at about height z stands on: of
// the ribbons covering the point, the one nearest in height (then nearest
// its centreline); null at street level.
export function ribbonAt(elev, x, y, z, frame = null) {
  if (!elev.has) return null;
  const list = elev.grid.at(x, y);
  if (!list) return null;
  let best = null, bz = Infinity, bd = Infinity;
  for (const s of list) {
    const q = onSeg(s, x, y);
    if (q.d > s.hs) continue;
    const dz = Math.abs(q.z + (frame ? frame.base(s.r, x, y, s) : 0) - z), dd = q.d / s.hs;
    if (dz < bz - 0.05 || (dz < bz + 0.05 && dd < bd)) { best = s.r; bz = dz; bd = dd; }
  }
  return bz <= STEP_UP ? best : null;
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
export function ceilingAt(elev, x, y, z, frame = null) {
  if (!elev.has) return Infinity;
  const list = elev.grid.at(x, y);
  if (!list) return Infinity;
  let c = Infinity;
  for (const s of list) {
    const q = onSeg(s, x, y);
    if (q.d > s.hs + WALL_T) continue;
    const b = frame ? frame.base(s.r, x, y, s) : 0;
    if (s.covered && z - b < -RAISED) {
      const under = roofTopAt(elev, x, y, q.z) - ROOF_T + b;
      if (under > z && under < c) c = under;
    } else if (q.z + b - DECK_T > z + 0.5 && q.z > RAISED && q.d <= s.hs) {
      if (q.z + b - DECK_T < c) c = q.z + b - DECK_T;
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
// (?terrain: zNear and the answer are relative to the base of `except`, the road whose walls are built; the others are read over theirs)
function surfaceZ(elev, x, y, except, zNear, tol, rail = false) {
  const list = elev.grid.at(x, y);
  if (!list) return null;
  const fr = elev.frame, bx = fr && except ? fr.base(except, x, y) : 0;
  let best = null;
  for (const s of list) {
    if (s.r === except || !!s.rail !== rail) continue;
    const q = onSeg(s, x, y);
    const qz = fr ? q.z + fr.base(s.r, x, y, s) - bx : q.z;
    if (q.d <= s.hs + 0.2 && Math.abs(qz - zNear) < tol && (best === null || qz > best)) best = qz;
  }
  return best;
}

// Floor height of another open sunken road at (x, y), or null.
function sunkenNeighbourZ(elev, x, y, except) {
  const list = elev.grid.at(x, y);
  if (!list) return null;
  const fr = elev.frame, bx = fr && except ? fr.base(except, x, y) : 0;
  let best = null;
  for (const s of list) {
    if (s.r === except || s.rail || s.covered) continue;
    const q = onSeg(s, x, y);
    const qz = fr && q.z < -RAISED ? q.z + fr.base(s.r, x, y, s) - bx : q.z;
    if (q.d <= s.hs && q.z < -RAISED && (best === null || qz > best)) best = qz;
  }
  return best;
}

// Pieces of retaining wall (cut) and crash barrier (raise), ~2 m each,
// offset to the verge edge. n points into the road. A cut piece has `low`
// (solid for whoever is in the trench) and `fence` (solid for whoever is up
// at street level); openings where another road at the same level joins, and
// no fence where a street crosses over the cutting or on top of a tunnel.
function buildWalls(elev, map, segs = elev.segs) {
  const walls = elev.walls;
  for (const s of segs) {
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
        // (?terrain: a street-level road beside the piece lies on the terrain, which is gb over this road's base)
        const gb = elev.frame ? elev.frame.ground(mx, my) - elev.frame.base(s.r, mx, my, s) : 0;
        // a dip of under a metre needs no retaining wall
        const cut = zr < -1.0;
        const raise = zr > 1.2;
        if (!cut && !raise && !s.rail && !s.covered && Math.min(s.za + (s.zb - s.za) * t0, s.za + (s.zb - s.za) * t1) < -CUT_Z &&
          !surfaceOf(elev, mx, my, s.r, zr, 1.6) && !onFlatRoad(map, mx, my)) {
          // where a ramp starts down into a cutting the ground is already cut
          // away (openCutMask) before a retaining wall is needed: a low
          // wall face to street level closes the side, drawn only
          elev.skirts.push({
            ax: s.ax + s.ux * s.len * t0 + nx * off, ay: s.ay + s.uy * s.len * t0 + ny * off,
            bx: s.ax + s.ux * s.len * t1 + nx * off, by: s.ay + s.uy * s.len * t1 + ny * off,
            nx: -nx, ny: -ny, za: s.za + (s.zb - s.za) * t0, zb: s.za + (s.zb - s.za) * t1, seg: s,
            coping: copingWidth(map, mx, my, nx, ny, false),
          });
        }
        if (!cut && !raise) {
          if (s.rail || s.covered) continue;
          // a ramp out of the cutting tucked under the edge of a higher way
          // alongside (a slip road climbing faster): the cut-away ground
          // between them is closed by a wall face up to the other surface
          // (also up to a street-level ribbon overlapping the ramp's edge)
          const zs = surfaceZ(elev, mx, my, s.r, zr, 1.6);
          const zn = zs !== null ? zs : onFlatRoad(map, mx, my) ? gb : null;
          if (zn !== null && zn > zr + 0.25 && Math.min(s.za + (s.zb - s.za) * t0, s.za + (s.zb - s.za) * t1) < -CUT_Z) {
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
          // it at about its height is left out; one more than a barrier's
          // reach lower, a deck edge over a slip road going down beside it,
          // keeps it: it stands on this deck, not in that ramp's way)
          : surfaceOf(elev, mx, my, s.r, zr, cut ? 1.6 : 1.7) || (Math.abs(zr - gb) < (cut ? 1.6 : 1.7) && onFlatRoad(map, mx, my));
        const piece = {
          ax: s.ax + s.ux * s.len * t0 + nx * off, ay: s.ay + s.uy * s.len * t0 + ny * off,
          bx: s.ax + s.ux * s.len * t1 + nx * off, by: s.ay + s.uy * s.len * t1 + ny * off,
          nx: -nx, ny: -ny, // into the road
          za: s.za + (s.zb - s.za) * t0, zb: s.za + (s.zb - s.za) * t1, z: zr,
          kind: cut ? 'cut' : 'barrier', seg: s,
          low: !joined, fence: false, covered: s.covered,
        };
        // a crash barrier on a ramp that runs under the edge of a higher deck (a slip road leaving a viaduct, still inside its footprint for
        // a while): whoever drives on that deck is above it, however near the 2 m window of wallSide it is
        if (!cut && !s.rail) {
          const over = surfaceZ(elev, mx, my, s.r, zr + 2.0, 1.3);
          if (over !== null && over > zr + 0.7) piece.over = over;
        }
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
            if (zn !== null && zn > zr + 0.25) { piece.low = true; piece.top = zn; piece.drawOnly = true; }
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
          if (reach) {
            // the floor rises (or falls) to the neighbour's surface
            const far = (x, y, z) => surfaceZ(elev, x + nx * (reach + 0.3), y + ny * (reach + 0.3), s.r, z, 1.2) ?? surfaceZ(elev, x + nx * reach, y + ny * reach, s.r, z, 1.2) ?? z;
            const fa = far(ends.ax, ends.ay, ends.za), fb = far(ends.bx, ends.by, ends.zb);
            elev.floors.push({ ...ends, reach, fa, fb });
          }
          else if (onFlatRoad(map, mx, my)) elev.skirts.push({ ...ends, coping: false });
        }
        if (cut && piece.low && !s.covered) {
          piece.coping = copingWidth(map, mx, my, nx, ny, true);
          // a wider cutting alongside (a slip road's wall standing on the main
          // road's verge) has the ground cut away past this wall: the coping
          // reaches out to where the ground is back (openCutMask)
          if (piece.coping === COPING) piece.coping = Math.max(COPING, cutReach(elev, mx, my, nx, ny));
        }
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
  return w.low && z > w.z - 1.2 && z < (w.over !== undefined ? Math.min(w.z + 2, w.over - 0.6) : w.z + 2) ? 1 : 0;
}

// what the profile a wall piece stands on is relative to (?terrain, #269): the base of its road at the middle of the piece
const wallBase = (w, frame) => (w.seg && w.seg.r ? frame.base(w.seg.r, (w.ax + w.bx) / 2, (w.ay + w.by) / 2, w.seg) : 0);

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
export function resolveElevWalls(elev, x, y, z, radius, frame = null) {
  if (!elev.has) return null;
  const list = elev.wallGrid.at(x, y);
  if (!list) return null;
  let moved = false;
  for (const w of list) {
    const side = wallSide(w, frame ? z - wallBase(w, frame) : z);
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
export function elevWallContact(elev, x, y, z, band = 1.4, props = false, frame = null) {
  if (!elev.has) return null;
  const list = elev.wallGrid.at(x, y);
  if (!list) return null;
  let best = null;
  for (const w of list) {
    const side = wallSide(w, frame ? z - wallBase(w, frame) : z);
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

function buildCuts(elev, segs = elev.segs) {
  // open (not covered) sunken segment runs: footprint quads out to the wall
  for (const s of segs) {
    if (s.covered || (s.za > -CUT_Z && s.zb > -CUT_Z)) continue;
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
        // (a dip of under a metre has no retaining wall to reach over: just the
        // lanes and their verge; the skirts close its sides)
        if (z < -CUT_Z && (z < -1.0 || cp.dist2 <= (s.hs + SHALLOW_PAD) ** 2)) data[j * w + i] = 255;
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
