// Road height solver and profile audit (docs/PROVINCIE-PLAN.md 2.11).
//
//   node scripts/world/profile.mjs            audit game/stad.json
//   node scripts/world/profile.mjs --solve    solve, audit the result (dry run)
//   node scripts/world/profile.mjs --write    solve and write road.z back
//   node scripts/world/profile.mjs --strict   exit 1 when the audit finds a problem
//   --terrain                                 solve over the AHN terrain (scripts/world/fetch_ahn.py; F2)
//
// See solve() for the model. The audit checks every profiled road: grade per
// class, vertical curve radius, steps at joints, clearance at every crossing
// of a raised or sunken road with a road or rail, and steps between ribbons
// that overlap in plan (a ramp alongside its carriageway).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  gradeLimit, GRADE_TOL, radiusMin, clearanceUnder, CAR, nodeKey, gradeOrder, zAlong,
  buildNetwork, planCrossings, bumpCrossings, ribbonHalf, profileStats,
} from '../../game/js/roadprofile.js';
import { railLiftZ, roadZAt } from '../../game/js/elevation.js';
import { railHeightFn, overAtRailCrossing, LC_ZONE } from '../../game/js/railprofile.js';
import { isDeckRoad } from '../../game/js/deckterrain.js';
import { terrainBases, underWindows } from './terrain_profile.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// ------------------------------------------------------------------ inputs

// Terrain under a point, metres relative to street level. The city has no
// elevation raster yet: flat. An AHN DTM raster (docs/PROVINCIE-PLAN.md 2.7)
// plugs in here as a sampler (x, y) -> metres, relative to the local street
// level of the tile it is in.
export const flatTerrain = () => 0;

// Rails as crossing items: the track height from the rail profile
// (railprofile.mjs; the radial rail lifts on a map without one) and the level
// crossings, where road and track meet at one height.
export function railItems(data) {
  const zAt = railHeightFn(data, railLiftZ);
  const lcs = data.levelCrossings || [];
  return (data.rails || []).map((r) => ({ pts: r.pts || r, rail: true, cat: 'rail', type: 'rail', ly: r.ly || null, zAt, lcs }));
}
const atLevelCrossing = (rail, x, y) => rail.lcs.some((l) => Math.hypot(l.x - x, l.y - y) < LC_ZONE);

// How far along `road` (m, each way from the crossing point) its profile must
// clear `other`: the other ribbon's half width over the sine of the angle the
// two cross at, so a shallow crossing (a cycle path alongside a trunk road)
// is cleared along its whole overlap, not just where the centre lines meet.
const MAX_OVERLAP = 40;
export function overlapReach(c, road, other) {
  const half = other.rail ? 3 : other.width / 2;
  const seg = (r, k) => (r.pts[k + 1] ? [r.pts[k + 1][0] - r.pts[k][0], r.pts[k + 1][1] - r.pts[k][1]] : [1, 0]);
  const [ax, ay] = seg(c.a, c.i), [bx, by] = seg(c.b, c.j);
  const sin = Math.max(0.15, Math.abs(ax * by - ay * bx) / ((Math.hypot(ax, ay) * Math.hypot(bx, by)) || 1));
  void road;
  return Math.min(MAX_OVERLAP, half / sin) + 3;
}

// A crossing between two items as { up, lo, x, y, need, zUp, zLo } or null
// when it is not a grade separation (both at the same level, a level crossing).
function separation(c) {
  const za = c.a.rail ? c.a.zAt(c.x, c.y) : zAlong(c.a, c.i, c.t);
  const zb = c.b.rail ? c.b.zAt(c.x, c.y) : zAlong(c.b, c.j, c.u);
  let oa = c.a.rail ? (za > 3 ? 1 : 0) : gradeOrder(c.a), ob = c.b.rail ? (zb > 3 ? 1 : 0) : gradeOrder(c.b);
  // a car road and the track away from a level crossing never meet: the road
  // goes over where OSM grades it above the track, else the track goes over
  // it (where the track cannot climb that high the road dips the rest)
  const rail = c.a.rail ? c.a : c.b.rail ? c.b : null, road = rail === c.a ? c.b : c.a;
  if (rail && !road.rail && CAR.has(road.cat)) {
    if (atLevelCrossing(rail, c.x, c.y)) return null;
    const up = overAtRailCrossing(rail, rail === c.a ? c.i : c.j, road) === 'road' ? road : rail;
    oa = c.a === up ? 1 : 0; ob = c.b === up ? 1 : 0;
  }
  // a road the solver raised or sank (or a lifted rail) is where it is
  if (Math.abs(za - zb) > 1.5) { oa = za > zb ? 1 : -1; ob = -oa; }
  if (oa === ob) return null;
  const [up, lo, zUp, zLo, iu, tu, il, tl] = oa > ob ? [c.a, c.b, za, zb, c.i, c.t, c.j, c.u] : [c.b, c.a, zb, za, c.j, c.u, c.i, c.t];
  return { up, lo, x: c.x, y: c.y, zUp, zLo, iu, tu, il, tl, need: clearanceUnder(lo) };
}

const crossFilter = (a, b) => {
  if (a.rail && b.rail) return false;
  const carA = a.rail || CAR.has(a.cat), carB = b.rail || CAR.has(b.cat);
  if (!carA && !carB) return false;
  // a foot or cycle way only matters under or over a raised or sunken road
  return !!(a.z || b.z || a.rail || b.rail);
};

// Ribbons running side by side close enough that their surfaces overlap in
// plan (a slip road leaving or joining its carriageway, the halves of a dual
// carriageway): follower vertex -> { lead, i, t, d } on the nearest leader
// (main road before link, then the longer road). Only car roads that have a
// profile or touch one.
const RANK = { motorway: 0, trunk: 1, primary: 2, secondary: 3, motorway_link: 4, trunk_link: 5, primary_link: 6, secondary_link: 7 };
const roadLen = (r) => r.pts.reduce((a, p, i) => (i ? a + Math.hypot(p[0] - r.pts[i - 1][0], p[1] - r.pts[i - 1][1]) : 0), 0);
export function overlaps(roads, { angle = 35, margin = 0.5, carriageway = false } = {}) {
  const half = carriageway ? (r) => r.width / 2 : ribbonHalf;
  const cand = roads.filter((r) => CAR.has(r.cat) && r.z);
  const order = new Map(cand.map((r) => [r, [RANK[r.type] ?? 9, -roadLen(r)]]));
  const less = (a, b) => { const x = order.get(a), y = order.get(b); return x[0] - y[0] || x[1] - y[1]; };
  const G = 40, grid = new Map();
  for (const r of cand) {
    const P = r.pts, hs = ribbonHalf(r);
    for (let i = 0; i < P.length - 1; i++) {
      for (let gx = Math.floor((Math.min(P[i][0], P[i + 1][0]) - hs) / G); gx <= Math.floor((Math.max(P[i][0], P[i + 1][0]) + hs) / G); gx++) {
        for (let gy = Math.floor((Math.min(P[i][1], P[i + 1][1]) - hs) / G); gy <= Math.floor((Math.max(P[i][1], P[i + 1][1]) + hs) / G); gy++) {
          const k = gx * 100000 + gy;
          (grid.get(k) || grid.set(k, []).get(k)).push([r, i]);
        }
      }
    }
  }
  const cosMax = Math.cos(angle * Math.PI / 180);
  const out = [];
  for (const f of cand) {
    const P = f.pts, hf = half(f);
    const own = new Set(P.map(nodeKey));
    P.forEach((p, j) => {
      const a = P[Math.max(0, j - 1)], b = P[Math.min(P.length - 1, j + 1)];
      const fl = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      const fx = (b[0] - a[0]) / fl, fy = (b[1] - a[1]) / fl;
      let best = null;
      for (const [l, i] of grid.get(Math.floor(p[0] / G) * 100000 + Math.floor(p[1] / G)) || []) {
        if (l === f || less(l, f) >= 0) continue;
        const A = l.pts[i], B = l.pts[i + 1];
        if (own.has(nodeKey(A)) && own.has(nodeKey(B))) continue;
        const dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy);
        if (L < 1e-6 || Math.abs((fx * dx + fy * dy) / L) < cosMax) continue;
        const t = Math.max(0, Math.min(1, ((p[0] - A[0]) * dx + (p[1] - A[1]) * dy) / (L * L)));
        const d = Math.hypot(A[0] + dx * t - p[0], A[1] + dy * t - p[1]);
        if (d < hf + half(l) - margin && (!best || d < best.d)) best = { lead: l, i, t, d };
      }
      if (best) out.push({ f, j, ...best });
    });
  }
  return out;
}

// ------------------------------------------------------------------ audit

export function audit(data, { terrain = flatTerrain, limit = 12 } = {}) {
  const roads = data.roads;
  const rep = { roads: 0, steep: [], radius: [], joints: [], clearance: [], paths: [], overlap: [], crossings: 0 };
  for (const r of roads) {
    if (!r.z) continue;
    rep.roads++;
    const g = gradeLimit(r) + GRADE_TOL, R = radiusMin(r);
    for (const q of profileStats(r)) {
      if (Math.abs(q.g) > g) rep.steep.push({ road: label(r), g: q.g, at: at(r.pts[q.i]) });
      // a kink worth a vertical curve: the grade changes by more than 1 %
      if (q.R < R * 0.5 && q.dg > 0.01) rep.radius.push({ road: label(r), R: q.R, at: at(r.pts[q.i]) });
    }
  }
  // joints: every vertex shared by roads has one height
  const net = buildNetwork(roads);
  for (const n of net.ids) {
    if (n.roads.length < 2) continue;
    let lo = Infinity, hi = -Infinity;
    for (const [r, i] of n.roads) { const z = r.z ? r.z[i] : 0; lo = Math.min(lo, z); hi = Math.max(hi, z); }
    if (hi - lo > 0.02) rep.joints.push({ d: hi - lo, at: [Math.round(n.x), Math.round(n.y)], roads: n.roads.map(([r]) => label(r)).join(' / ') });
  }
  // clearance at grade separations
  const items = [...roads, ...railItems(data)];
  for (const c of planCrossings(items, crossFilter)) {
    const s = separation(c);
    if (!s) continue;
    rep.crossings++;
    const dz = s.zUp - s.zLo;
    if (dz >= s.need - 0.05) continue;
    const q = { up: label(s.up), lo: label(s.lo), loCat: s.lo.cat, dz, need: s.need, at: [Math.round(s.x), Math.round(s.y)] };
    // a foot or cycle path through a tunnel or over a bridge the game keeps at
    // street level (profile.mjs --paths gives it a profile)
    const path = (r) => r.cat === 'foot' || r.cat === 'cycle';
    if (path(s.up) || path(s.lo)) rep.paths.push(q);
    else rep.clearance.push(q);
  }
  // steps between overlapping ribbons
  for (const o of overlaps(roads, { carriageway: true })) {
    const zf = o.f.z[o.j], zl = zAlong(o.lead, o.i, o.t);
    if (Math.abs(zf - zl) > 0.15 && Math.abs(zf - zl) < 3) rep.overlap.push({ f: label(o.f), lead: label(o.lead), dz: zf - zl, at: at(o.f.pts[o.j]) });
  }
  void terrain; void limit;
  return rep;
}

const label = (r) => (r.rail ? 'spoor' : `${r.ref || ''} ${r.name || ''}`.trim() || r.type);
const at = (p) => [Math.round(p[0]), Math.round(p[1])];

export function printAudit(rep, limit = 8) {
  const worst = (list, key, n = limit) => list.slice().sort((a, b) => Math.abs(b[key]) - Math.abs(a[key])).slice(0, n);
  console.log(`${rep.roads} roads with a profile, ${rep.crossings} grade separations`);
  console.log(`steeper than the class limit (+${GRADE_TOL * 100} %): ${rep.steep.length}`);
  for (const q of worst(rep.steep, 'g')) console.log(`  ${(q.g * 100).toFixed(1)} % ${q.road} at ${q.at}`);
  console.log(`vertical curves under half the class radius: ${rep.radius.length}`);
  for (const q of rep.radius.slice().sort((a, b) => a.R - b.R).slice(0, limit)) console.log(`  R ${q.R.toFixed(0)} m ${q.road} at ${q.at}`);
  console.log(`steps at joints (> 2 cm): ${rep.joints.length}`);
  for (const q of worst(rep.joints, 'd')) console.log(`  ${q.d.toFixed(2)} m ${q.roads} at ${q.at}`);
  const low = (list) => list.slice().sort((a, b) => (a.dz - a.need) - (b.dz - b.need)).slice(0, limit);
  console.log(`roads and rails crossing under the clearance: ${rep.clearance.length}`);
  for (const q of low(rep.clearance)) console.log(`  ${q.dz.toFixed(2)} of ${q.need.toFixed(1)} m: ${q.up} over ${q.lo} at ${q.at}`);
  console.log(`foot and cycle paths under or over a road without their tunnel or bridge (open, --paths): ${rep.paths.length}`);
  for (const q of low(rep.paths)) console.log(`  ${q.dz.toFixed(2)} of ${q.need.toFixed(1)} m: ${q.up} over ${q.lo} at ${q.at}`);
  console.log(`steps between overlapping carriageways (0.15-3 m): ${rep.overlap.length}`);
  for (const q of worst(rep.overlap, 'dz')) console.log(`  ${q.dz.toFixed(2)} m ${q.f} beside ${q.lead} at ${q.at}`);
}

export const problems = (rep) => rep.steep.length + rep.joints.length + rep.clearance.length + rep.overlap.length;

// ------------------------------------------------------------------ solver

// Depth of a tunnel's road below the terrain: clearance, roof slab, cover
const ROOF = 0.7, COVER = 0.5;
export const TUNNEL_DEPTH = 4.6 + ROOF + COVER;
const UNDER_WATER = -8.2;   // a road under a canal (aqueduct) stays under its bed
export const STEP = 8;             // vertex spacing of a road that gets a new profile
const COUPLE_TOL = 0.05;
// an untagged way's prior dip under the terrain shallower than this is taken
// for the terrain (what the old per-way solve left where nothing asks for one)
const SMALL = 0.8;

// A deck that hangs over a lane running under its edge, not over its axis: the
// clearance audit does not count it as a passage (laneUnderDeck), but the game
// still drives under it, so it must leave the tallest vehicle room there. The
// solved Emmaviaduct profile sagged between its rail clearance and its south
// approach down to 3.88 m over the service lane by the station (#501); a floor
// keeps that stretch of the deck at 4.2 m (clearance_audit.mjs) plus the deck
// thickness and a little margin. [x, y, reach, min z, only this cat]
export const DECK_FLOORS = [
  [-245, 934, 30, 4.2 + 1.0 + 0.1, 'major'],
];
// Raise such a deck over the lane: the vertices within reach move up by the
// deficit where the lane is, tapering to nothing at the edge, so the deck keeps
// its joints and its grade (a solve with a pin would re-profile the whole
// network around it).
export function applyDeckFloors(roads, floors = DECK_FLOORS) {
  let moved = 0;
  for (const [x, y, reach, minZ, cat] of floors) {
    for (const r of roads) {
      if (!r.bridge || r.tunnel || (cat && r.cat !== cat) || !r.z) continue;
      if (!r.pts.some((p) => Math.hypot(p[0] - x, p[1] - y) <= reach)) continue;
      const def = minZ - roadZAt(r, x, y);
      if (def <= 0.005) continue;
      r.pts.forEach((p, i) => {
        const d = Math.hypot(p[0] - x, p[1] - y);
        if (d >= reach) return;
        const w = 1 - (d / reach) ** 2;
        r.z[i] = Math.round((r.z[i] + def * w) * 100) / 100;
        moved++;
      });
    }
  }
  return moved;
}

// The height solver for one connected network at a time (every road that has
// a profile, or needs one, and whatever shares its vertices): a least-squares
// fit with hard constraints, solved by smoothing steps alternated with
// projections onto the constraints (POCS):
//   soft  - stay near the prior profile (the design heights: the current
//           road.z, AHN/DSM deck samples once they exist) and the terrain
//           elsewhere; vertical curves (second differences along each road
//           and through the joints where two roads carry on)
//   hard  - one height per vertex (joints are continuous by construction);
//           vertices shared with a road that keeps to the terrain stay on it;
//           clearance at every grade separation by the class of what passes
//           below (roadprofile.js CLEARANCE: the tagged side moves, a bridge
//           rises and a tunnel sinks); tunnels at least TUNNEL_DEPTH under
//           the terrain (UNDER_WATER under a canal); the grade limit per
//           class; a slip road follows its carriageway while their lanes
//           overlap in plan.
// opts.paths: foot and cycle ways that cross a raised or sunken road get a
// profile too (a cycle bridge over a trunk road, a path through a tunnel).
// Returns { roads: Map(road -> z[]), pts: Map(road -> densified pts), stats }.
// opts.pins: [{ road, x, y, reach, minZ }]: a vertex of `road` within `reach` m of (x, y) lies at least `minZ` over
// the terrain (a bridge over a shipping canal clears the barges: province_profile.mjs); the road rises, and the roads
// it joins ramp with it. opts.noSink: nothing is sunk under the terrain (a tunnel under a road stays at street level and
// the road over it rises instead; a road under a rail stays flat): the province has no cut-away ground to show a trench.
// opts.onTerrain (#269, with opts.terrain): solve in absolute heights over the AHN terrain, the way the game reads a profile back with
// ?terrain: a bridge or tunnel is measured from the line between the terrain at its ends, any other road from the terrain at its
// vertices (terrain_profile.mjs terrainBases); the flat profiles (road.z) only tell which side of a crossing is up; the
// clearances are absolute; and a street that passes under a deck is held at its own level under the dyke the deck stands on
// (underWindows), as AHN has no data under the deck. Only roads that need a profile are solved (decks, what a crossing moves, what
// a ramp must reach): the others keep to the terrain, steep or not. Returns the same, z relative to the base of each road.
export function solve(data, { terrain = flatTerrain, iters = 600, pullPrior = 0.05, paths = false, protect = new Set(), couple = true, coupleAll = false, clear = true, pins = [], noSink = false, onTerrain = false } = {}) {
  const roads = data.roads;
  const rails = railItems(data);
  const water = data.water || [];
  // 1. who moves at each crossing that needs it; roads that get a new
  // profile are densified so their ramps have vertices
  // (plus the crossings where two ways only share a vertex because their
  // profiles landed on the same centimetre: a deck over a street, #501)
  const crossings = [...planCrossings([...roads, ...rails], crossFilter), ...bumpCrossings(buildNetwork(roads))];
  const active = new Set(onTerrain ? [] : roads.filter((r) => r.z));
  const movers = [];
  // terrain mode: the base and the voorkeurshoogte (abs) of every original road, the streets that pass under a deck lowered
  const base0 = onTerrain ? terrainBases(roads, terrain) : null;
  const pri0 = onTerrain ? new Map([...base0].map(([r, a]) => [r, Float64Array.from(a)])) : null;
  const underSpots = [];
  const lowered0 = new Set();
  if (onTerrain) {
    // every crossing of a deck with a road that is no deck, whether or not either has a flat profile (a cycle tunnel under a trunk road has
    // none): a street under a viaduct on a dyke (held down), a road over a tunnel whose cutting AHN shows (held up)
    for (const c of planCrossings(roads, (p, q) => isDeckRoad(p) !== isDeckRoad(q))) {
      const D = isDeckRoad(c.a) ? c.a : c.b, other = D === c.a ? c.b : c.a;
      if (D.bridge && !D.tunnel) underSpots.push({ lo: other, x: c.x, y: c.y, mode: 'dyke' });
      else if (D.tunnel && !D.bridge) underSpots.push({ lo: other, x: c.x, y: c.y, mode: 'hole' });
    }
    for (const r of underWindows(underSpots, pri0, terrain)) lowered0.add(r);
  }
  // abs height of the voorkeurshoogte of road r at vertex i + t along its segment (terrain mode)
  const priAt = (r, i, t) => { const a = pri0.get(r); return a[i] + (a[Math.min(i + 1, a.length - 1)] - a[i]) * t; };
  // a foot or cycle way that OSM puts on a bridge over the track or in a
  // tunnel under it gets a profile too (the old rail lifts went over them)
  const railCross = crossings.filter((c) => (c.a.rail || c.b.rail) && !(c.a.rail && c.b.rail) && separation(c));
  const overRail = new Set(railCross.map((c) => (c.a.rail ? c.b : c.a)).filter((r) => !CAR.has(r.cat) && gradeOrder(r) !== 0));
  // round a grade separation with the track the street grid is dense: the
  // foot and cycle ways joining a road that ramps there ramp with it
  const RAIL_PATHS = 250;
  const nearRail = (r) => railCross.some((c) => r.pts.some((p) => Math.abs(p[0] - c.x) < RAIL_PATHS && Math.abs(p[1] - c.y) < RAIL_PATHS));
  const pathMay = new Map();
  const may = (r) => {
    if (r.rail) return false;
    if (CAR.has(r.cat) || paths || r.z || overRail.has(r)) return true;
    if (!pathMay.has(r)) pathMay.set(r, nearRail(r));
    return pathMay.get(r);
  };
  for (const c of crossings) {
    const s = separation(c);
    if (!s) continue;
    let m = mover(s);
    if (noSink && m === 'lo') m = s.up.rail || s.lo.rail ? null : 'up';
    if (!m) continue;
    // (a foot or cycle path that should move but may not, without
    // opts.paths, stays as it is: a trunk road does not hump over it)
    const road = m === 'up' ? s.up : s.lo;
    if (!may(road)) continue;
    movers.push({ c, m });
    active.add(road);
  }
  // the pins act like a mover that rises over a fixed height
  // (terrain mode: the other side's height at the crossing is absolute: its voorkeurshoogte, or terrain + height for a track)
  const absOf = (other, s, which) => {
    if (!other.rail) return which === 'lo' ? priAt(other, s.il, s.tl) : priAt(other, s.iu, s.tu);
    return terrain(s.x, s.y) + (which === 'lo' ? s.zLo : s.zUp);
  };
  const moverInfo = ({ c, m, pin }) => {
    if (pin) {
      let zp = pin.minZ;
      if (onTerrain) { const P = pin.road.pts; let b = 0, bd = Infinity; P.forEach((p, i) => { const d = Math.hypot(p[0] - pin.x, p[1] - pin.y); if (d < bd) { bd = d; b = i; } }); zp += base0.get(pin.road)[b]; }
      return { road: pin.road, other: null, zo: zp, need: 0, reach: pin.reach };
    }
    const s = separation(c);
    const road = m === 'up' ? s.up : s.lo, other = m === 'up' ? s.lo : s.up;
    const zo = onTerrain ? absOf(other, s, m === 'up' ? 'lo' : 'up') : (m === 'up' ? s.zLo : s.zUp);
    return { road, other, s, zo, need: s.need, reach: overlapReach(c, road, other) };
  };
  for (const pin of pins) {
    if (!roads.includes(pin.road)) continue;
    active.add(pin.road);
    movers.push({ c: { x: pin.x, y: pin.y }, m: 'up', pin });
  }
  // a ramp may need more room than the road that moves has: the roads it
  // runs on into (a side street dipping under a flyover, the cycle path on
  // from a cycle bridge) join in where the grade envelope from the
  // crossings leaves the terrain
  for (let round = 0; round < 16; round++) {
    const g0 = buildNetwork(roads);
    const lo0 = new Float64Array(g0.ids.length).fill(-Infinity), hi0 = new Float64Array(g0.ids.length).fill(Infinity);
    for (const mv of movers) {
      const { c, m } = mv;
      const { road, zo, need, reach } = moverInfo(mv);
      const a = g0.of.get(road);
      road.pts.forEach((p, i) => {
        if (Math.hypot(p[0] - c.x, p[1] - c.y) > reach + STEP) return;
        if (m === 'up') lo0[a[i]] = Math.max(lo0[a[i]], zo + need);
        else hi0[a[i]] = Math.min(hi0[a[i]], zo - need);
      });
    }
    const ref0 = onTerrain ? new Float64Array(g0.ids.length) : null;
    if (onTerrain) {
      for (let n = 0; n < g0.ids.length; n++) ref0[n] = terrain(g0.ids[n].x, g0.ids[n].y);
      for (const deckPass of [false, true]) for (const r of roads) {
        if (isDeckRoad(r) !== deckPass) continue;
        g0.of.get(r).forEach((n, i) => { ref0[n] = base0.get(r)[i]; });
      }
      // a street held at its own level under a dyke: nothing over it may stand higher than its voorkeurshoogte
      // a sunk tunnel's roof: the roads it joins ramp with it
      for (const r of roads) if (sunkTunnel(r) && CAR.has(r.cat)) { const a = g0.of.get(r); a.forEach((n, i) => { if (i > 0 && i < a.length - 1) hi0[n] = Math.min(hi0[n], base0.get(r)[i] - TUNNEL_DEPTH); }); }
      for (const r of lowered0) g0.of.get(r).forEach((n, i) => { const p = pri0.get(r)[i], b = base0.get(r)[i]; if (p < b - 0.02) hi0[n] = Math.min(hi0[n], p); else if (p > b + 0.02) lo0[n] = Math.max(lo0[n], p); });
    }
    const envLo = envelope(roads, g0, lo0, 1), envHi = envelope(roads, g0, hi0, -1);
    let added = 0;
    for (let n = 0; n < g0.ids.length; n++) {
      const nd = g0.ids[n], t = onTerrain ? ref0[n] : terrain(nd.x, nd.y);
      if (envLo[n] <= t + 0.02 && envHi[n] >= t - 0.02) continue;
      for (const [r] of nd.roads) if (!active.has(r) && may(r)) { active.add(r); added++; }
    }
    if (!added) break;
  }
  if (onTerrain) for (const r of lowered0) if (may(r)) active.add(r);
  // every deck gets a terrain profile, a flat one too: a bridge drives over the line between its ends, not over the ground under it
  if (onTerrain) for (const r of roads) if (isDeckRoad(r) && !r.rail) active.add(r);
  // a car road that runs over a crest or a hollow of the terrain sharper than its class allows gets a profile of its own (the solver's
  // vertical curves round it), and so do the car roads that join the decks and those roads at an end: they carry the curve on
  if (onTerrain) {
    // (a road that has a terrain profile from an earlier pass stays in: its joints were solved with it free)
    for (const r of roads) if (r.zt && r.zt.length) active.add(r);
    for (const r of roads) if (CAR.has(r.cat) && !isDeckRoad(r) && !r.rail && terrainKink(r, base0.get(r))) active.add(r);
    const endKeys = new Set();
    for (const r of active) { endKeys.add(nodeKey(r.pts[0])); endKeys.add(nodeKey(r.pts[r.pts.length - 1])); }
    for (const r of roads) {
      if (active.has(r) || !CAR.has(r.cat) || r.rail || r.pts.length < 2) continue;
      if (endKeys.has(nodeKey(r.pts[0])) || endKeys.has(nodeKey(r.pts[r.pts.length - 1]))) active.add(r);
    }
  }
  const newPts = new Map();
  for (const r of active) {
    if ((onTerrain ? r.zt : r.z) || protect.has(r)) continue;
    const P = densify(r.pts, STEP);
    if (P.length !== r.pts.length) newPts.set(r, P);
  }
  const ptsOf = (r) => newPts.get(r) || r.pts;
  const view = roads.map((r) => (newPts.has(r) ? { ...r, pts: newPts.get(r), z: null } : r));
  const back = new Map(view.map((v, i) => [v, roads[i]]));
  const net = buildNetwork(view);
  const N = net.ids.length;
  const z = new Float64Array(N), prior = new Float64Array(N), ter = new Float64Array(N);
  const lo = new Float64Array(N).fill(-Infinity), hi = new Float64Array(N).fill(Infinity);
  const free = new Uint8Array(N);
  for (let n = 0; n < N; n++) { ter[n] = terrain(net.ids[n].x, net.ids[n].y); z[n] = prior[n] = ter[n]; }
  // terrain mode: the bases and voorkeurshoogtes of the solver's own view of the roads (the densified copies)
  let baseV = null;
  if (onTerrain) {
    baseV = terrainBases(view, terrain);
    const priV = new Map([...baseV].map(([v, a]) => [v, Float64Array.from(a)]));
    const spotsV = underSpots.map((q) => ({ ...q, lo: view[roads.indexOf(q.lo)] }));
    underWindows(spotsV, priV, terrain);
    // non-decks first: a deck's own base wins at a node they share
    for (const deckPass of [false, true]) for (const v of view) {
      if (isDeckRoad(v) !== deckPass) continue;
      net.of.get(v).forEach((n, i) => { z[n] = prior[n] = priV.get(v)[i]; });
    }
    for (const v of view) {
      if (!active.has(back.get(v))) continue;
      net.of.get(v).forEach((n, i) => { const p = priV.get(v)[i], b = baseV.get(v)[i]; if (p < b - 0.02) hi[n] = Math.min(hi[n], p); else if (p > b + 0.02) lo[n] = Math.max(lo[n], p); });
    }
  }
  for (const v of view) {
    const r = back.get(v), a = net.of.get(v);
    if (!active.has(r)) continue;
    if (!onTerrain && r.z && !newPts.has(r)) a.forEach((n, i) => { z[n] = r.z[i] + ter[n]; if (tagged(r) || !(r.z[i] < 0 && r.z[i] > -SMALL)) prior[n] = z[n]; });
    for (const n of a) free[n] = 1;
  }
  // a vertex shared with a road that keeps to the terrain stays on it
  for (const v of view) {
    if (active.has(back.get(v))) continue;
    for (const n of net.of.get(v)) free[n] = 0;
  }
  // tunnels: deep enough under the terrain (or the canal bed); where the
  // prior profile is shallower (a tunnel way that starts at its portal ramp)
  // no shallower than that
  const wet = wetTest(water);
  for (const v of view) {
    const r = back.get(v);
    if (!active.has(r) || !r.tunnel || r.bridge || !CAR.has(r.cat)) continue;
    // (terrain mode: a tunnel the flat profile did not sink stays a flat deck, a car park or underpass of the data has no depth to give)
    if (onTerrain && !sunkTunnel(r)) continue;
    const a = net.of.get(v), withPrior = r.z && !newPts.has(r) && !onTerrain;
    a.forEach((n, i) => {
      const nd = net.ids[n];
      const deep = (onTerrain ? baseV.get(v)[i] : ter[n]) - (wet(nd.x, nd.y) ? -UNDER_WATER : TUNNEL_DEPTH);
      if (!withPrior && (i === 0 || i === a.length - 1)) return;
      hi[n] = Math.min(hi[n], withPrior ? Math.max(deep, prior[n] + 0.2) : deep);
    });
  }
  // edges with their grade limits, and vertical curves (a, b, c, La, Lc,
  // 1 / minimum radius): the grade may change by (La + Lc) / 2R at b
  const edges = [], pairs = [];
  for (const v of view) {
    const r = back.get(v), a = net.of.get(v), P = v.pts;
    if (!active.has(r)) continue;
    const g = gradeLimit(r), k = 1 / radiusMin(r);
    for (let i = 0; i < a.length - 1; i++) {
      const L = Math.hypot(P[i + 1][0] - P[i][0], P[i + 1][1] - P[i][1]);
      if (L < 1e-3 || a[i] === a[i + 1]) continue;
      edges.push(a[i], a[i + 1], g === Infinity ? 1e9 : g * L);
    }
    if (!CAR.has(r.cat)) continue;
    for (let i = 1; i < a.length - 1; i++) {
      const La = Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]), Lc = Math.hypot(P[i + 1][0] - P[i][0], P[i + 1][1] - P[i][1]);
      if (La > 0.5 && Lc > 0.5) pairs.push(a[i - 1], a[i], a[i + 1], La, Lc, k);
    }
  }
  // through a joint where exactly two road ends meet, the curve carries on
  for (let n = 0; n < N; n++) {
    const ends = net.ids[n].roads.filter(([r, i]) => i === 0 || i === r.pts.length - 1);
    if (net.ids[n].roads.length !== 2 || ends.length !== 2) continue;
    const nb = ends.map(([v, i]) => {
      const a = net.of.get(v), P = v.pts, j = i === 0 ? 1 : P.length - 2;
      return [a[j], Math.hypot(P[j][0] - P[i][0], P[j][1] - P[i][1])];
    });
    const k = Math.max(...net.ids[n].roads.map(([v]) => 1 / radiusMin(v)));
    if (nb[0][1] > 0.5 && nb[1][1] > 0.5 && net.ids[n].roads.every(([v]) => CAR.has(v.cat))) pairs.push(nb[0][0], n, nb[1][0], nb[0][1], nb[1][1], k);
  }
  // slip roads that follow their carriageway (on the solver's view)
  const couples = overlaps(view.filter((v) => active.has(back.get(v))).map((v) => (v.z ? v : { ...v, z: [] })), { carriageway: true })
    .filter((o) => (coupleAll || (/_link$/.test(o.f.type) && !/_link$/.test(o.lead.type))) && o.f.z && o.f.z.length && o.lead.z && Math.abs(o.f.z[o.j] - zAlong(o.lead, o.i, o.t)) < 1.0);
  const nodeOf = (v, i) => net.of.get(findView(v))[i];
  function findView(v) { return net.of.has(v) ? v : view.find((q) => q.pts === v.pts); }
  const cpl = !couple ? [] : couples.map((o) => [nodeOf(o.f, o.j), nodeOf(o.lead, o.i), nodeOf(o.lead, o.i + 1), o.t]);
  // crossings: the mover's vertices around the crossing point clear the
  // other side's prior height there; the other side's vertices there keep
  // from closing the gap (no feedback: a lower road joined to the upper one
  // through a ramp cannot push it up and up)
  const nearOf = (road, c, reach) => {
    const v = view[roads.indexOf(road)], P = v.pts, a = net.of.get(v), out = [];
    for (let i = 0; i < P.length; i++) if (Math.hypot(P[i][0] - c.x, P[i][1] - c.y) <= reach) out.push(a[i]);
    return out;
  };
  // the segment of road over the crossing point: [node a, node b, t]
  const segAt = (road, c) => {
    const v = view[roads.indexOf(road)], P = v.pts, a = net.of.get(v);
    let bi = 0, bd = Infinity, bt = 0;
    for (let i = 0; i < P.length - 1; i++) {
      const dx = P[i + 1][0] - P[i][0], dy = P[i + 1][1] - P[i][1], L2 = dx * dx + dy * dy || 1;
      const t = Math.max(0, Math.min(1, ((c.x - P[i][0]) * dx + (c.y - P[i][1]) * dy) / L2));
      const d = Math.hypot(P[i][0] + dx * t - c.x, P[i][1] + dy * t - c.y);
      if (d < bd) { bd = d; bi = i; bt = t; }
    }
    return [a[bi], a[bi + 1], bt];
  };
  const binds = !clear ? [] : movers.map((mv) => {
    const { c, m } = mv;
    const { road, other, zo, need, reach } = moverInfo(mv);
    const near = nearOf(road, c, reach);
    const keep = !other || other.rail ? [] : nearOf(other, c, overlapReach(c, other, road));
    return { m, near, keep, seg: segAt(road, c), oseg: !other || other.rail ? null : segAt(other, c), zo, need };
  });
  // the height at the crossing point itself: (1 - t) z_a + t z_b >= (or <=) target
  const lin = [];
  for (const b of binds) {
    const sg = b.m === 'up' ? 1 : -1;
    lin.push([...b.seg, sg, b.zo + sg * b.need]);
    if (b.oseg) lin.push([...b.oseg, -sg, b.zo]);
  }
  const bounds = () => {
    const L = Float64Array.from(lo), H = Float64Array.from(hi);
    for (const b of binds) {
      for (const n of b.near) {
        if (b.m === 'up') L[n] = Math.max(L[n], b.zo + b.need);
        else H[n] = Math.min(H[n], b.zo - b.need);
      }
      for (const n of b.keep) {
        if (b.m === 'up') H[n] = Math.min(H[n], Math.max(b.zo, prior[n]));
        else L[n] = Math.max(L[n], Math.min(b.zo, prior[n]));
      }
    }
    return [L, H];
  };
  const project = (L, H, sweeps = 4, curves = true) => {
    for (let k = 0; k < sweeps; k++) {
      for (let n = 0; n < N; n++) {
        if (!free[n]) { z[n] = ter[n]; continue; }
        if (z[n] < L[n]) z[n] = L[n];
        if (z[n] > H[n]) z[n] = H[n];
      }
      for (const [a, b, t, sg, target] of lin) {
        const v = z[a] * (1 - t) + z[b] * t, ex = (target - v) * sg;
        if (ex <= 0) continue;
        const wa = free[a] ? 1 - t : 0, wb = free[b] ? t : 0, s2 = wa * wa + wb * wb;
        if (!s2) continue;
        z[a] += sg * ex * wa / s2; z[b] += sg * ex * wb / s2;
      }
      if (curves) for (const [f, a, b, t] of cpl) {
        const zl = z[a] + (z[b] - z[a]) * t;
        if (!free[f]) continue;
        if (z[f] > zl + COUPLE_TOL) z[f] = zl + COUPLE_TOL;
        else if (z[f] < zl - COUPLE_TOL) z[f] = zl - COUPLE_TOL;
      }
      if (curves) for (let p = 0; p < pairs.length; p += 6) {
        const a = pairs[p], b = pairs[p + 1], c = pairs[p + 2], La = pairs[p + 3], Lc = pairs[p + 4];
        const d = (z[c] - z[b]) / Lc - (z[b] - z[a]) / La, lim = pairs[p + 5] * (La + Lc) / 2;
        if (Math.abs(d) <= lim) continue;
        const ex = d - Math.sign(d) * lim;
        const wa = free[a] ? 1 / La : 0, wb = free[b] ? -(1 / La + 1 / Lc) : 0, wc = free[c] ? 1 / Lc : 0;
        const s2 = wa * wa + wb * wb + wc * wc;
        if (!s2) continue;
        z[a] -= ex * wa / s2; z[b] -= ex * wb / s2; z[c] -= ex * wc / s2;
      }
      for (let e = 0; e < edges.length; e += 3) {
        const a = edges[e], b = edges[e + 1], m = edges[e + 2];
        const d = z[b] - z[a];
        if (Math.abs(d) <= m) continue;
        const ex = (Math.abs(d) - m) * Math.sign(d);
        if (free[a] && free[b]) { z[a] += ex / 2; z[b] -= ex / 2; }
        else if (free[a]) z[a] += ex;
        else if (free[b]) z[b] -= ex;
      }
    }
  };
  // from the prior, projections onto the constraints with a pull back to the
  // prior between them: the nearest profile that keeps every rule
  let [L, H] = bounds();
  for (let it = 0; it < iters; it++) {
    const pull = pullPrior * (1 - it / iters);
    if (pull > 0) for (let n = 0; n < N; n++) if (free[n]) z[n] += (prior[n] - z[n]) * pull;
    if (it % 20 === 0) [L, H] = bounds();
    project(L, H);
  }
  [L, H] = bounds();
  project(L, H, 200, false);
  // out: z per road vertex, relative to the terrain
  const out = new Map();
  for (const v of view) {
    const r = back.get(v);
    if (!active.has(r)) continue;
    const a = net.of.get(v);
    const zs = Array.from(a, (n, i) => Math.round((z[n] - (onTerrain ? baseV.get(v)[i] : ter[n])) * 100) / 100);
    out.set(r, zs);
  }
  return { roads: out, pts: newPts, stats: { nodes: N, free: free.reduce((s, f) => s + f, 0), movers: movers.length, couples: cpl.length, active: active.size } };
}

// A tunnel way the flat solution sank (road.z under -1 m somewhere)
const sunkTunnel = (r) => !!r.tunnel && !r.bridge && !!r.z && r.z.some((q) => q < -1);

// Does a road that follows the terrain (heights `h` at its vertices) have a crest or a hollow a vehicle would leave the ground over:
// the grade changes at a vertex by more than 4 % and by more than twice what its class allows (roadprofile.js radiusMin)?
export function terrainKink(r, h, minChange = 0.04) {
  const P = r.pts, k = 1 / radiusMin(r);
  for (let i = 1; i + 1 < P.length; i++) {
    const La = Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]), Lc = Math.hypot(P[i + 1][0] - P[i][0], P[i + 1][1] - P[i][1]);
    if (La < 0.5 || Lc < 0.5) continue;
    const d = Math.abs((h[i + 1] - h[i]) / Lc - (h[i] - h[i - 1]) / La);
    if (d > minChange && d > k * (La + Lc)) return true;
  }
  return false;
}

// Grade envelope over the whole network from per-node bounds: sign 1 gives the
// lowest height the lower bounds allow (b - g * distance), -1 the highest the
// upper bounds allow. A max-heap Dijkstra over every road's segments.
function envelope(roads, net, bound, sign) {
  const N = net.ids.length;
  const val = new Float64Array(N).fill(-Infinity);
  const heap = [];
  const push = (v, n) => { heap.push([v, n]); let i = heap.length - 1; while (i) { const p = (i - 1) >> 1; if (heap[p][0] >= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] > heap[m][0]) m = l; if (r < heap.length && heap[r][0] > heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
  for (let n = 0; n < N; n++) if (Number.isFinite(bound[n])) { val[n] = bound[n] * sign; push(val[n], n); }
  const adj = Array.from({ length: N }, () => []);
  for (const r of roads) {
    const a = net.of.get(r), P = r.pts, g = Math.min(0.1, gradeLimit(r));
    for (let i = 0; i < a.length - 1; i++) {
      const L = Math.hypot(P[i + 1][0] - P[i][0], P[i + 1][1] - P[i][1]);
      adj[a[i]].push(a[i + 1], g * L); adj[a[i + 1]].push(a[i], g * L);
    }
  }
  while (heap.length) {
    const [v, n] = pop();
    if (v < val[n] - 1e-9) continue;
    const A = adj[n];
    for (let k = 0; k < A.length; k += 2) {
      const w = v - A[k + 1];
      if (w > val[A[k]] + 1e-9 && w > -20) { val[A[k]] = w; push(w, A[k]); }
    }
  }
  return val.map((v) => (v === -Infinity ? (sign > 0 ? -Infinity : Infinity) : v * sign));
}

function zNearest(v, a, z, x, y) {
  const P = v.pts;
  let bd = Infinity, bz = 0;
  for (let i = 0; i < P.length - 1; i++) {
    const dx = P[i + 1][0] - P[i][0], dy = P[i + 1][1] - P[i][1], L2 = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((x - P[i][0]) * dx + (y - P[i][1]) * dy) / L2));
    const d = (P[i][0] + dx * t - x) ** 2 + (P[i][1] + dy * t - y) ** 2;
    if (d < bd) { bd = d; bz = z[a[i]] + (z[a[i + 1]] - z[a[i]]) * t; }
  }
  return bz;
}

// A way whose height OSM says something about: its profile is a design
// height; any other way keeps as close to the terrain as the rules let it
// (its ramps are what the decks and tunnels it joins need, no more)
const tagged = (r) => !!(r.bridge || r.tunnel || r.layer || r.viaduct || r.embankment || r.cutting);

// Which side of a grade separation moves to make room: 'up', 'lo' or null.
function mover(s) {
  const { up, lo } = s;
  if (lo.rail) return up.rail ? null : 'up';
  if (up.rail) return 'lo';
  const tagUp = gradeOrder(up) > 0, tagDown = gradeOrder(lo) < 0;
  if (tagUp && !(tagDown && s.zLo < -1)) return 'up';
  if (tagDown) return 'lo';
  if (up.z && !lo.z) return 'up';
  if (lo.z && !up.z) return 'lo';
  return 'up';
}

export function densify(P, step) {
  const out = [P[0]];
  for (let i = 0; i < P.length - 1; i++) {
    const a = P[i], b = P[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const n = Math.max(1, Math.ceil(L / step));
    for (let k = 1; k < n; k++) out.push([Math.round((a[0] + (b[0] - a[0]) * k / n) * 100) / 100, Math.round((a[1] + (b[1] - a[1]) * k / n) * 100) / 100]);
    out.push(b);
  }
  return out;
}

export function wetTest(water) {
  const boxes = water.map((w) => {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const p of w.pts) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
    return [x0 - 6, y0 - 6, x1 + 6, y1 + 6, w.pts];
  });
  const inside = (x, y, P) => {
    let c = false;
    for (let i = 0, j = P.length - 1; i < P.length; j = i++) if ((P[i][1] > y) !== (P[j][1] > y) && x < ((P[j][0] - P[i][0]) * (y - P[i][1])) / (P[j][1] - P[i][1]) + P[i][0]) c = !c;
    return c;
  };
  return (x, y) => boxes.some(([x0, y0, x1, y1, P]) => x >= x0 && x <= x1 && y >= y0 && y <= y1 && [[0, 0], [6, 0], [-6, 0], [0, 6], [0, -6]].some(([dx, dy]) => inside(x + dx, y + dy, P)));
}

// Roads whose consecutive vertices a bus lane or bus road names (mapextras):
// their vertices must not move or multiply
export function protectedRoads(data, extras) {
  const key = (p) => `${Math.round(p[0] * 100)},${Math.round(p[1] * 100)}`;
  const pairs = new Set();
  for (const b of [...(extras.busLanes || []), ...(extras.busRoads || [])]) for (let i = 0; i < b.pts.length - 1; i++) { pairs.add(key(b.pts[i]) + '>' + key(b.pts[i + 1])); pairs.add(key(b.pts[i + 1]) + '>' + key(b.pts[i])); }
  const out = new Set();
  for (const r of data.roads) for (let i = 0; i < r.pts.length - 1; i++) if (pairs.has(key(r.pts[i]) + '>' + key(r.pts[i + 1]))) { out.add(r); break; }
  return out;
}

// The busways mapextras adds as roads of their own (mapdata.js turns each
// busRoads entry that follows no road of the map into one): the solver must see
// them, or a viaduct passes a few decimetres over a busway. Returns
// [{ entry, road }]; push the roads into data.roads for the solve, then
// restoreBusRoads() carries the profile back into the extras.
export function busRoadsOf(data, extras) {
  const key = (p) => `${Math.round(p[0] * 100)},${Math.round(p[1] * 100)}`;
  const edges = new Set();
  for (const r of data.roads) for (let i = 0; i < r.pts.length - 1; i++) edges.add(key(r.pts[i]) + '>' + key(r.pts[i + 1]));
  const out = [];
  for (const br of extras.busRoads || []) {
    let follows = false;
    for (let i = 0; i < br.pts.length - 1 && !follows; i++) follows = edges.has(key(br.pts[i]) + '>' + key(br.pts[i + 1])) || edges.has(key(br.pts[i + 1]) + '>' + key(br.pts[i]));
    if (follows) continue;
    out.push({ entry: br, road: { pts: br.pts.map((q) => q.slice()), type: 'busway', cat: 'normal', width: br.width || 6.5, speed: 11, oneway: !!br.oneway, name: br.name || '', bridge: !!br.bridge, busOnly: true } });
  }
  return out;
}

// Puts a busway's solved profile (and densified vertices) back into its extras entry
export function restoreBusRoads(list) {
  let changed = 0;
  for (const { entry, road } of list) {
    const before = JSON.stringify([entry.pts, entry.z]);
    entry.pts = road.pts;
    if (road.z && road.z.some((q) => Math.abs(q) >= 0.02)) entry.z = road.z.map((q) => Math.round(q * 100) / 100); else delete entry.z;
    if (JSON.stringify([entry.pts, entry.z]) !== before) changed++;
  }
  return changed;
}

// Puts a solution into the map data: road.z (and the densified vertices of
// roads that got a new profile); a road that ends up flat loses its z.
export function apply(data, sol) {
  let changed = 0, cleared = 0;
  for (const [r, zs] of sol.roads) {
    if (sol.pts.has(r)) r.pts = sol.pts.get(r);
    const flat = zs.every((q) => Math.abs(q) < 0.02);
    if (flat) { if (r.z) { delete r.z; cleared++; } continue; }
    if (!r.z || r.z.some((q, i) => Math.abs(q - zs[i]) > 0.005)) changed++;
    r.z = zs;
  }
  return { changed, cleared };
}

// ------------------------------------------------------------------ main

async function main() {
  const args = process.argv.slice(2);
  const { loadCityData } = await import('../lib/loadworld.mjs');
  const data = await loadCityData({ extras: false });
  if (args.includes('--solve') || args.includes('--write')) {
    console.log('before:');
    printAudit(audit(data), 4);
    const extrasFile = path.join(ROOT, 'game/mapextras.json');
    const extras = JSON.parse(fs.readFileSync(extrasFile, 'utf8'));
    const protect = protectedRoads(data, extras);
    const bus = busRoadsOf(data, extras);
    for (const { road } of bus) data.roads.push(road);
    const t0 = performance.now();
    // a road that gets a profile brings its own crossings with paths and
    // service roads into play: solve again until nothing changes (3 passes at most)
    // --terrain: the AHN field (terrain.mjs; F2, the game draws flat until then)
    const terrain = args.includes('--terrain') ? (await import('./terrain.mjs')).loadTerrainField().at : flatTerrain;
    for (let pass = 0; pass < 3; pass++) {
      const sol = solve(data, { terrain, paths: args.includes('--paths'), protect, couple: !args.includes('--no-couple'), clear: !args.includes('--no-clear') });
      const res = apply(data, sol);
      console.log(`pass ${pass + 1} solved in ${((performance.now() - t0) / 1000).toFixed(1)} s: ${JSON.stringify(sol.stats)}; ${res.changed} profiles changed, ${res.cleared} flat now, ${sol.pts.size} roads densified`);
      if (!res.changed && !res.cleared && !sol.pts.size) break;
    }
    console.log(`decks raised over a lane under their edge: ${applyDeckFloors(data.roads)} vertices`);
    data.roads = data.roads.filter((r) => !bus.some((b) => b.road === r));
    const busChanged = restoreBusRoads(bus);
    if (args.includes('--write')) {
      if (busChanged) { fs.writeFileSync(extrasFile, JSON.stringify(extras)); console.log(`wrote ${busChanged} busways into ${path.relative(ROOT, extrasFile)}`); }
      const { writeStadFrom } = await import('./stad_file.mjs');
      const file = writeStadFrom(data, ['roads']);
      console.log(`wrote ${path.relative(ROOT, file)}`);
    }
    console.log('after:');
  }
  const rep = audit(data);
  printAudit(rep);
  if (args.includes('--strict') && problems(rep)) process.exit(1);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) main().catch((e) => { console.error(e); process.exit(1); }); // niet awaiten: loadworld.mjs laadt build_province.mjs, dat dit bestand weer importeert (een lus met top-level await blijft hangen)
