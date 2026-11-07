import { SpatialGrid, gridItems } from './spatialgrid.js';

// The vertical design rules for track (docs/PROVINCIE-PLAN.md 2.11, "Spoor")
// and the one height query the game, the solver and the audits share. Pure
// data and geometry: no scene, no DOM.
//
// A rail's profile is `rail.z` (metres above street level per vertex of
// `rail.pts`, the top of the ballast bed, as railway3d draws it), set per
// connected rail network by scripts/world/railprofile.mjs. Maps without it
// (older builds, the Ommeland's flat rails) fall back to the radial rail lifts
// of add_railways.py (elevation.js railLiftZ).

// Grades: 1.25 % on main track, 2.5 % where nothing else fits (exceptional,
// ProRail OVS); vertical curves of at least 5 km radius (2 km exceptional).
export const RAIL_GRADE = 0.0125;
export const RAIL_GRADE_MAX = 0.025;
export const RAIL_RADIUS = 5000;
export const RAIL_RADIUS_MIN = 2000;
// what the grade check allows over a polyline of a curve
export const RAIL_GRADE_TOL = 0.001;
// Top of rail above the bed (railway3d RAIL_TOP) and the platform top above
// the top of rail: the NL norm is 0.76 m (new 0.84 m), so 0.76-0.84.
export const RAIL_TOP = 0.26;
export const PLATFORM_ABOVE_RAIL = 0.76;
export const PLATFORM_RANGE = [0.76, 0.84];
// platform edge from the track centre (m) and the stretch either side of a stop
// that is kept level (the longest train is ~110 m)
export const PLATFORM_EDGE = 1.65;
export const PLATFORM_HALF = 70;
// Contact wire above the top of rail on electrified track (NL 1500 V: ~5.5 m
// nominal) and the free height a deck over any track keeps (wire + margin):
// roadprofile.js CLEARANCE.rail.
export const CATENARY_H = 5.5;
export const RAIL_CLEAR = 6.0;
// a level crossing: track and road within this of the crossing point share one height
export const LC_PIN = 8;
// around a level crossing no grade separation is looked for (add_railways.py)
export const LC_ZONE = 30;

// Who goes over where a road crosses segment i of the track away from a
// level crossing: 'road' or 'rail', from the OSM grade order of both (a rail's
// `ly` per segment, from its bridge/viaduct/layer tags, railprofile.mjs).
// Equal orders keep the old rule of add_railways.py: the track goes over.
export function overAtRailCrossing(rail, i, road) {
  const rl = rail.ly ? rail.ly[Math.min(i, rail.ly.length - 1)] | 0 : 0;
  const ro = (road.layer | 0) || ((road.bridge ? 1 : 0) - (road.tunnel ? 1 : 0));
  return ro > rl ? 'road' : 'rail';
}

// --------------------------------------------------------------- height query

// A height field over a set of rails: (x, y) -> z of the nearest rail within
// `reach` metres (interpolated along its segment), else 0. `rails` are the
// map's { pts, z? } rows. Built once per rails array.
const cache = new WeakMap();
const stampOf = (rails) => rails.reduce((a, r) => a + (r && r.z ? r.z.length + 1 : 0), rails.length);
export function railHeightIndex(rails, cell = 32) {
  if (!rails) return null;
  const stamp = stampOf(rails);
  let idx = cache.get(rails);
  if (idx && idx.stamp === stamp) return idx;
  const grid = new SpatialGrid(cell);
  let any = false;
  for (const r of rails) {
    const P = r.pts || r, Z = r.z;
    if (!Z || !P || Z.length !== P.length) continue;
    if (!Z.some((z) => Math.abs(z) > 0.005)) continue;
    any = true;
    for (let i = 0; i < P.length - 1; i++) {
      grid.insert(
        { ax: P[i][0], ay: P[i][1], bx: P[i + 1][0], by: P[i + 1][1], za: Z[i], zb: Z[i + 1] },
        [Math.min(P[i][0], P[i + 1][0]) - 4, Math.min(P[i][1], P[i + 1][1]) - 4, Math.max(P[i][0], P[i + 1][0]) + 4, Math.max(P[i][1], P[i + 1][1]) + 4],
      );
    }
  }
  idx = { grid, cell, any, stamp };
  cache.set(rails, idx);
  return idx;
}

export function railHeightAt(idx, x, y, reach = 3.5) {
  if (!idx || !idx.any) return 0;
  let bd = reach * reach, bz = 0;
  for (const g of idx.grid.query(x, y, x, y)) {
    const dx = g.bx - g.ax, dy = g.by - g.ay;
    const L2 = dx * dx + dy * dy || 1e-9;
    const t = Math.max(0, Math.min(1, ((x - g.ax) * dx + (y - g.ay) * dy) / L2));
    const ex = g.ax + dx * t - x, ey = g.ay + dy * t - y, d = ex * ex + ey * ey;
    if (d < bd) { bd = d; bz = g.za + (g.zb - g.za) * t; }
  }
  return bz;
}

// The track height function of a map ({ rails, railLifts }): the solved
// profile when the rails carry one, else the radial lifts (passed in, so this
// module needs nothing from elevation.js).
export function railHeightFn(map, liftZ = null, rails = null) {
  const idx = railHeightIndex(rails || gridItems(map.railGrid));
  if (idx && idx.any) {
    const f = (x, y) => railHeightAt(idx, x, y);
    f.profiled = true;
    return f;
  }
  const lifts = map.railLifts || [];
  const f = liftZ && lifts.length ? (x, y) => liftZ(lifts, x, y) : () => 0;
  f.profiled = false;
  f.lifted = lifts.length > 0;
  return f;
}

// The raised stretches of the profiled rails, as { x, y, h, plateau, ramp }
// like the old rail lifts (one per local top above 1 m), for the probes that
// walk the slopes (ringcheck.js probeRailLifts).
export function profileLifts(rails) {
  const out = [];
  for (const r of rails || []) {
    const P = r.pts, Z = r.z;
    if (!Z) continue;
    let i = 0;
    while (i < Z.length) {
      if (Z[i] < 1) { i++; continue; }
      let j = i, top = i;
      while (j < Z.length && Z[j] >= 1) { if (Z[j] > Z[top]) top = j; j++; }
      if (!out.some((o) => Math.hypot(o.x - P[top][0], o.y - P[top][1]) < 40)) {
        let len = 0;
        for (let k = Math.max(1, i); k < Math.min(j, Z.length); k++) len += Math.hypot(P[k][0] - P[k - 1][0], P[k][1] - P[k - 1][1]);
        out.push({ x: P[top][0], y: P[top][1], h: Z[top], plateau: 10, ramp: Math.max(60, len) });
      }
      i = j;
    }
  }
  return out;
}

// What a segment of track is built as: ground, embankment or deck (bridge or
// viaduct: over water, or high enough for railway3d to put it on piers).
export const RAIL_STRUCT = { ground: 0, embankment: 1, deck: 2 };
export const RAIL_DECK_Z = 2.6;
export function railStructures(r) {
  const Z = r.z, out = [];
  if (!Z) return out;
  for (let i = 0; i < Z.length - 1; i++) {
    const lo = Math.min(Z[i], Z[i + 1]), hi = Math.max(Z[i], Z[i + 1]);
    out.push(lo >= RAIL_DECK_Z - 0.05 ? RAIL_STRUCT.deck : hi > 0.05 ? RAIL_STRUCT.embankment : RAIL_STRUCT.ground);
  }
  return out;
}

// Per vertex: grade after it and the vertical curve radius at it, over a
// profile sampled along s (arrays of equal length). Shared by the audit.
export function railProfileStats(s, z) {
  const out = [];
  for (let i = 0; i < s.length - 1; i++) {
    const L = s[i + 1] - s[i];
    if (L < 0.5) continue;
    out.push({ i, s: s[i], L, g: (z[i + 1] - z[i]) / L });
  }
  for (let k = 1; k < out.length; k++) {
    const a = out[k - 1], b = out[k], dg = Math.abs(b.g - a.g);
    b.dg = dg;
    b.R = dg > 1e-5 ? ((a.L + b.L) / 2) / dg : Infinity;
  }
  if (out.length) { out[0].dg = 0; out[0].R = Infinity; }
  return out;
}
