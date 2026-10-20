// Track height solver and line audit (docs/PROVINCIE-PLAN.md 2.11, "Spoor").
//
//   node scripts/world/railprofile.mjs            audit game/stad.json
//   node scripts/world/railprofile.mjs --solve    solve, audit the result (dry run)
//   node scripts/world/railprofile.mjs --write    solve and write rail.z (+ densified pts)
//   node scripts/world/railprofile.mjs --strict   exit 1 when the audit finds a problem
//
// After --write, `node scripts/world/profile.mjs --write` re-solves the roads
// against the new track heights: where the track may not climb as high as the
// old rail lift (a station or a level crossing too close), the road under it
// dips the rest of the clearance.
//
// The model, per connected rail network (rails that share a vertex: lines,
// sidings, yards and switches):
//   hard  - a level crossing: the track within LC_PIN of it at exactly the
//           road's height; a platform stretch (PLATFORM_HALF either side of a
//           stop): level, on the terrain; under a road deck: the free height
//           (roadprofile.js clearanceUnder of a rail); the grade (1.25 %, or
//           2.5 % in the stretches where 1.25 % cannot reach a required
//           height); vertical curves (R >= 5 km, 2 km where the grade is
//           exceptional)
//   soft  - over every road the track crosses without a level crossing (the
//           rail lifts of add_railways.py), the road's clearance; else as
//           low as the rules let it (on the terrain: least earthworks)
// Solved by grade envelopes (the lowest profile that clears every crossing,
// under the highest that the pins allow) followed by projections onto the
// curve and grade limits.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { nodeKey, planCrossings, zAlong, clearanceUnder, gradeOrder, CAR } from '../../game/js/roadprofile.js';
import {
  RAIL_GRADE, RAIL_GRADE_MAX, RAIL_RADIUS, RAIL_RADIUS_MIN, RAIL_GRADE_TOL, RAIL_TOP, LC_PIN, LC_ZONE, PLATFORM_HALF,
  PLATFORM_ABOVE_RAIL, PLATFORM_RANGE, CATENARY_H, RAIL_CLEAR, railHeightIndex, railHeightAt, railProfileStats, overAtRailCrossing,
} from '../../game/js/railprofile.js';
import { wgsToWorld } from '../../game/js/rdnew.js';
import { railLiftZ } from '../../game/js/elevation.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const STEP = 10;           // vertex spacing of a profiled rail
const TWIN_D = 6;          // tracks closer than this share one formation (track centres 4-5 m apart)
const EXCEPT_REACH = 900;  // how far round a shortfall the grade may be exceptional
const DECK = 1.0;

export const flatTerrain = () => 0;

// vertices every `step` m at most; out.seg[k]: the source segment of segment k
function densify(P, step) {
  const out = [P[0]];
  out.seg = [];
  for (let i = 0; i < P.length - 1; i++) {
    const a = P[i], b = P[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const n = Math.max(1, Math.ceil(L / step));
    for (let k = 1; k < n; k++) { out.push([Math.round((a[0] + (b[0] - a[0]) * k / n) * 100) / 100, Math.round((a[1] + (b[1] - a[1]) * k / n) * 100) / 100]); out.seg.push(i); }
    out.push(b);
    out.seg.push(i);
  }
  return out;
}

const PLATFORM_TRACK = 6;
function boundsOf(P) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of P) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
  return [x0, y0, x1, y1];
}
// inside polygon P or within d of its outline
function nearPolygon(P, x, y, d) {
  let inside = false;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    if ((P[i][1] > y) !== (P[j][1] > y) && x < ((P[j][0] - P[i][0]) * (y - P[i][1])) / (P[j][1] - P[i][1]) + P[i][0]) inside = !inside;
  }
  if (inside) return true;
  for (let i = 0; i < P.length; i++) {
    const a = P[i], b = P[(i + 1) % P.length], dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / L2));
    if (Math.hypot(a[0] + dx * t - x, a[1] + dy * t - y) < d) return true;
  }
  return false;
}

// The platforms of data/railways_raw.json (railway=platform areas) in the
// world frame: [{ pts, layer, ref }]
export function platformsFrom(elements) {
  return elements.filter((e) => e.type === 'way' && e.geometry && (e.tags || {}).railway === 'platform').map((e) => {
    const pts = e.geometry.map((g) => wgsToWorld(g.lat, g.lon).map((v) => Math.round(v * 100) / 100));
    if (pts.length > 2 && pts[0][0] === pts[pts.length - 1][0] && pts[0][1] === pts[pts.length - 1][1]) pts.pop();
    const out = { pts, layer: parseInt(e.tags.layer, 10) || 0 };
    if (e.tags.ref) out.ref = e.tags.ref;
    return out;
  });
}

function routeSampler(route) {
  const P = route.pts, S = [0];
  for (let i = 1; i < P.length; i++) S.push(S[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
  const at = (s) => {
    if (s <= 0) return P[0];
    if (s >= S[S.length - 1]) return P[P.length - 1];
    let lo = 0, hi = S.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (S[m] <= s) lo = m; else hi = m; }
    const t = (s - S[lo]) / ((S[hi] - S[lo]) || 1);
    return [P[lo][0] + (P[hi][0] - P[lo][0]) * t, P[lo][1] + (P[hi][1] - P[lo][1]) * t];
  };
  return { at, len: S[S.length - 1] };
}

// The road surface height under (x, y): the nearest car or cycle road whose
// ribbon covers it (0 when none does).
function roadZNear(roads, x, y) {
  let bd = Infinity, bz = 0;
  for (const r of roads) {
    const P = r.pts;
    for (let i = 0; i < P.length - 1; i++) {
      const dx = P[i + 1][0] - P[i][0], dy = P[i + 1][1] - P[i][1], L2 = dx * dx + dy * dy || 1;
      const t = Math.max(0, Math.min(1, ((x - P[i][0]) * dx + (y - P[i][1]) * dy) / L2));
      const d = Math.hypot(P[i][0] + dx * t - x, P[i][1] + dy * t - y);
      if (d < r.width / 2 + 1 && d < bd) { bd = d; bz = zAlong(r, i, t); }
    }
  }
  return bz;
}

// The crossings between the given rail views and the map's roads (no shared
// vertex): { rail, i, t, road, j, u, x, y, zRoad }
function railRoadCrossings(railViews, roads) {
  const items = [...railViews, ...roads];
  return planCrossings(items, (a, b) => a.rail !== b.rail && (a.rail ? b : a).cat !== 'foot').map((c) => {
    const [rail, i, t, road, j, u] = c.a.rail ? [c.a, c.i, c.t, c.b, c.j, c.u] : [c.b, c.j, c.u, c.a, c.i, c.t];
    return { rail, i, t, road, j, u, x: c.x, y: c.y, zRoad: zAlong(road, j, u) };
  });
}

// The OSM tags of each rail polyline, matched by geometry to the rail ways in
// data/railways_raw.json (within 1.5 m): rail.ly, the grade order per segment
// (bridge/viaduct/layer; left out when all 0), and rail.el (1 on contact-line
// track, by the way most of its length lies on).
export function matchRailTags(rails, elements) {
  const ways = elements.filter((e) => e.type === 'way' && e.geometry && (e.tags || {}).railway === 'rail');
  const G = 40, grid = new Map();
  ways.forEach((w, wi) => {
    const P = w.geometry.map((g) => wgsToWorld(g.lat, g.lon));
    w._P = P;
    for (let i = 0; i < P.length - 1; i++) {
      for (let gx = Math.floor(Math.min(P[i][0], P[i + 1][0]) / G); gx <= Math.floor(Math.max(P[i][0], P[i + 1][0]) / G); gx++)
        for (let gy = Math.floor(Math.min(P[i][1], P[i + 1][1]) / G); gy <= Math.floor(Math.max(P[i][1], P[i + 1][1]) / G); gy++)
          (grid.get(gx * 65536 + gy) || grid.set(gx * 65536 + gy, []).get(gx * 65536 + gy)).push(wi, i);
    }
  });
  let matched = 0;
  const layerOf = (t) => parseInt(t.layer, 10) || (t.bridge && t.bridge !== 'no' ? 1 : 0) - (t.tunnel && t.tunnel !== 'no' ? 1 : 0);
  for (const r of rails) {
    const votes = new Map();
    const P = r.pts, ly = [];
    for (let i = 0; i < P.length - 1; i++) {
      const L = Math.hypot(P[i + 1][0] - P[i][0], P[i + 1][1] - P[i][1]);
      const x = (P[i][0] + P[i + 1][0]) / 2, y = (P[i][1] + P[i + 1][1]) / 2;
      const c = grid.get(Math.floor(x / G) * 65536 + Math.floor(y / G)) || [];
      let best = -1, bd = 1.5;
      for (let k = 0; k < c.length; k += 2) {
        const Q = ways[c[k]]._P, j = c[k + 1];
        const dx = Q[j + 1][0] - Q[j][0], dy = Q[j + 1][1] - Q[j][1], L2 = dx * dx + dy * dy || 1;
        const t = Math.max(0, Math.min(1, ((x - Q[j][0]) * dx + (y - Q[j][1]) * dy) / L2));
        const d = Math.hypot(Q[j][0] + dx * t - x, Q[j][1] + dy * t - y);
        if (d < bd) { bd = d; best = c[k]; }
      }
      if (best >= 0) votes.set(best, (votes.get(best) || 0) + L);
      ly.push(best >= 0 ? layerOf(ways[best].tags) : 0);
    }
    if (!votes.size) continue;
    const w = ways[[...votes].sort((a, b) => b[1] - a[1])[0][0]];
    if (ly.some((q) => q)) r.ly = ly; else delete r.ly;
    delete r.layer;
    if (w.tags.electrified === 'contact_line') r.el = 1; else delete r.el;
    matched++;
  }
  return matched;
}

export function solve(data, { terrain = flatTerrain, iters = 400 } = {}) {
  const rails = data.rails || [];
  const roads = data.roads || [];
  const lifts = data.railLifts || [];
  const lcs = data.levelCrossings || [];
  const views = rails.map((r) => {
    const pts = densify(r.pts, STEP);
    return { src: r, pts, rail: true, ly: r.ly ? pts.seg.map((i) => r.ly[i]) : null };
  });
  // nodes
  const nodes = new Map(), ids = [];
  const of = views.map((v) => Int32Array.from(v.pts, (p) => {
    const k = nodeKey(p);
    let n = nodes.get(k);
    if (n === undefined) { n = ids.length; nodes.set(k, n); ids.push({ x: p[0], y: p[1], ends: 0, deg: 0 }); }
    return n;
  }));
  const N = ids.length;
  views.forEach((v, vi) => { const a = of[vi]; ids[a[0]].ends++; ids[a[a.length - 1]].ends++; for (const n of a) ids[n].deg++; });
  // networks (union-find)
  const parent = Int32Array.from({ length: N }, (_, i) => i);
  const find = (i) => { while (parent[i] !== i) i = parent[i] = parent[parent[i]]; return i; };
  for (const a of of) for (let i = 1; i < a.length; i++) { const x = find(a[0]), y = find(a[i]); if (x !== y) parent[x] = y; }
  const ter = Float64Array.from(ids, (n) => terrain(n.x, n.y));
  // a spatial lookup of nodes
  const G = 25, ngrid = new Map();
  ids.forEach((n, i) => { const k = Math.floor(n.x / G) * 65536 + Math.floor(n.y / G); (ngrid.get(k) || ngrid.set(k, []).get(k)).push(i); });
  const nodesNear = (x, y, r) => {
    const out = [];
    for (let gx = Math.floor((x - r) / G); gx <= Math.floor((x + r) / G); gx++) for (let gy = Math.floor((y - r) / G); gy <= Math.floor((y + r) / G); gy++) {
      for (const i of ngrid.get(gx * 65536 + gy) || []) if (Math.hypot(ids[i].x - x, ids[i].y - y) <= r) out.push(i);
    }
    return out;
  };
  const pin = new Float64Array(N).fill(NaN), lb = new Float64Array(N).fill(-Infinity), ub = new Float64Array(N).fill(Infinity);
  const why = { lc: 0, platform: 0, under: 0, over: 0 };
  // level crossings: the road's height
  for (const c of lcs) {
    const near = roads.filter((r) => r.cat !== 'foot' && r.pts.some((p) => Math.hypot(p[0] - c.x, p[1] - c.y) < 60));
    const z = roadZNear(near, c.x, c.y);
    for (const n of nodesNear(c.x, c.y, LC_PIN)) { pin[n] = z + ter[n]; why.lc++; }
  }
  // platforms: the track along a platform (OSM railway=platform, within
  // PLATFORM_TRACK of its outline) is level: on the terrain, or for a
  // platform OSM puts on layer 1 (an elevated station) at the height that
  // clears every road under it (set once the crossings are known)
  const platforms = data.railPlatforms || [];
  const groups = [];
  for (const pl of platforms) {
    const b = boundsOf(pl.pts);
    const cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2, R = Math.hypot(b[2] - b[0], b[3] - b[1]) / 2 + PLATFORM_TRACK;
    const members = nodesNear(cx, cy, R).filter((n) => nearPolygon(pl.pts, ids[n].x, ids[n].y, PLATFORM_TRACK));
    if (members.length) groups.push({ members, raised: (pl.layer | 0) > 0 });
  }
  // stops without a mapped platform (a halt past the map): level on the terrain round the stop
  for (const route of data.railRoutes || []) {
    const smp = routeSampler(route);
    for (const st of route.stops || []) {
      if (st.offmap) continue;
      const [sx, sy] = smp.at(st.s);
      if (platforms.some((pl) => nearPolygon(pl.pts, sx, sy, 60))) continue;
      const members = [];
      for (let s = st.s - PLATFORM_HALF; s <= st.s + PLATFORM_HALF; s += 5) {
        const [x, y] = smp.at(s);
        for (const n of nodesNear(x, y, 6)) members.push(n);
      }
      groups.push({ members, raised: false });
    }
  }
  // roads crossing the track away from a level crossing
  // (found on the rails' own vertices: a road through a densified vertex
  // would slip between two segments)
  const srcItems = views.map((v) => ({ pts: v.src.pts, rail: true, ly: v.src.ly || null, view: v }));
  const crossings = railRoadCrossings(srcItems, roads).filter((c) => !lcs.some((l) => Math.hypot(l.x - c.x, l.y - c.y) < LC_ZONE));
  const liftAt = (x, y) => lifts.some((L) => Math.hypot(L.x - x, L.y - y) < Math.max(20, L.plateau + 8));
  for (const c of crossings) {
    const r = c.road, reach = r.width / 2 + 3;
    const near = nodesNear(c.x, c.y, reach).filter((n) => of[views.indexOf(c.rail.view)].includes(n));
    if (c.zRoad > 3 || overAtRailCrossing(c.rail, c.i, r) === 'road' || gradeOrder(r) < 0) {
      // a deck over the track (or a way OSM puts on a bridge over it, which
      // profile.mjs raises), or a way through a tunnel under it: the track
      // stays on the terrain, under the deck with its free height
      const cap = c.zRoad > 3 ? c.zRoad - clearanceUnder({ rail: true }) : 0;
      for (const n of near) ub[n] = Math.min(ub[n], cap + ter[n]);
      why.under++;
    } else if (CAR.has(r.cat) || liftAt(c.x, c.y)) {
      // the track over the road (the old rail lift): its clearance
      const need = c.zRoad + clearanceUnder(r);
      if (need <= 0.05) continue;
      for (const n of near) lb[n] = Math.max(lb[n], need + ter[n]);
      why.over++;
    }
  }
  // tracks side by side (a double line, a yard, a switch fanning out) share
  // one formation: nodes of different rails within TWIN_D share their bounds
  // and are kept at one height
  const viewOf = new Int32Array(N).fill(-1);
  of.forEach((a, vi) => { for (const n of a) viewOf[n] = viewOf[n] === -1 ? vi : viewOf[n]; });
  const twins = [];
  for (let n = 0; n < N; n++) for (const m of nodesNear(ids[n].x, ids[n].y, TWIN_D)) if (m > n && viewOf[m] !== viewOf[n]) twins.push(n, m);
  for (let round = 0; round < 4; round++) {
    for (let k = 0; k < twins.length; k += 2) {
      const a = twins[k], b = twins[k + 1];
      const l = Math.max(lb[a], lb[b]), u = Math.min(ub[a], ub[b]);
      lb[a] = lb[b] = l; ub[a] = ub[b] = u;
    }
  }
  const pairTwins = () => {
    for (let k = 0; k < twins.length; k += 2) {
      const a = twins[k], b = twins[k + 1], pa = !Number.isNaN(pin[a]), pb = !Number.isNaN(pin[b]);
      if (pa && pb) continue;
      if (pa) z[b] = z[a]; else if (pb) z[a] = z[b]; else z[a] = z[b] = (z[a] + z[b]) / 2;
    }
  };
  for (const g of groups) {
    let lo = -Infinity;
    for (const n of g.members) lo = Math.max(lo, lb[n] - ter[n]);
    const level = g.raised && Number.isFinite(lo) ? lo : 0;
    for (const n of g.members) if (Number.isNaN(pin[n])) { pin[n] = level + ter[n]; why.platform++; }
  }
  // edges and curve triples
  const edges = [], pairs = [];
  views.forEach((v, vi) => {
    const a = of[vi], P = v.pts;
    for (let i = 0; i < a.length - 1; i++) {
      const L = Math.hypot(P[i + 1][0] - P[i][0], P[i + 1][1] - P[i][1]);
      if (L > 1e-3 && a[i] !== a[i + 1]) edges.push([a[i], a[i + 1], L]);
    }
    for (let i = 1; i < a.length - 1; i++) {
      const La = Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]), Lc = Math.hypot(P[i + 1][0] - P[i][0], P[i + 1][1] - P[i][1]);
      if (La > 0.5 && Lc > 0.5) pairs.push([a[i - 1], a[i], a[i + 1], La, Lc]);
    }
  });
  // through a joint of exactly two rail ends the curve carries on
  const endNb = new Map();
  views.forEach((v, vi) => {
    const a = of[vi], P = v.pts;
    for (const [i, j] of [[0, 1], [a.length - 1, a.length - 2]]) {
      if (j < 0 || j >= a.length) continue;
      const L = Math.hypot(P[j][0] - P[i][0], P[j][1] - P[i][1]);
      (endNb.get(a[i]) || endNb.set(a[i], []).get(a[i])).push([a[j], L]);
    }
  });
  for (const [n, nb] of endNb) if (nb.length === 2 && ids[n].deg === 2 && nb[0][1] > 0.5 && nb[1][1] > 0.5) pairs.push([nb[0][0], n, nb[1][0], nb[0][1], nb[1][1]]);

  // grade per edge and curve limit per triple, exceptional near a shortfall
  const gEdge = new Float64Array(edges.length).fill(RAIL_GRADE);
  const kPair = new Float64Array(pairs.length).fill(1 / RAIL_RADIUS);
  const adj = Array.from({ length: N }, () => []);
  edges.forEach(([a, b], e) => { adj[a].push(e); adj[b].push(e); });

  // envelope: sign +1 the lowest profile the lower bounds need, -1 the
  // highest the upper bounds (pins included) allow
  const envelope = (bound, sign) => {
    const val = new Float64Array(N).fill(-Infinity);
    const heap = [];
    const push = (v, n) => { heap.push([v, n]); let i = heap.length - 1; while (i) { const p = (i - 1) >> 1; if (heap[p][0] >= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] > heap[m][0]) m = l; if (r < heap.length && heap[r][0] > heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
    for (let n = 0; n < N; n++) if (Number.isFinite(bound[n])) { val[n] = bound[n] * sign; push(val[n], n); }
    while (heap.length) {
      const [v, n] = pop();
      if (v < val[n] - 1e-9) continue;
      for (const e of adj[n]) {
        const [a, b, L] = edges[e], m = a === n ? b : a;
        const w = v - gEdge[e] * L;
        if (w > val[m] + 1e-9) { val[m] = w; push(w, m); }
      }
    }
    return val.map((v) => (v === -Infinity ? sign * -Infinity : v * sign));
  };
  const upper = () => { const u = Float64Array.from(ub); for (let n = 0; n < N; n++) if (!Number.isNaN(pin[n])) u[n] = Math.min(u[n], pin[n]); return u; };
  const lower = () => { const l = Float64Array.from(lb); for (let n = 0; n < N; n++) if (!Number.isNaN(pin[n])) l[n] = Math.max(l[n], pin[n]); return l; };
  const z = new Float64Array(N);
  let U, Lw, short = [];
  const solveOnce = () => {
    U = envelope(upper(), -1);
    Lw = envelope(lower(), 1);
    for (let n = 0; n < N; n++) z[n] = Math.min(U[n], Math.max(Lw[n], ter[n]));
    // the curves: projections onto the curve limit, the grade and the
    // envelopes (which hold every pin and bound the grade lets hold)
    const lo = (n) => Math.min(U[n], Math.max(Lw[n], -Infinity));
    for (let it = 0; it < iters; it++) {
      for (let p = 0; p < pairs.length; p++) {
        const [a, b, c, La, Lc] = pairs[p];
        const d = (z[c] - z[b]) / Lc - (z[b] - z[a]) / La, lim = kPair[p] * (La + Lc) / 2;
        if (Math.abs(d) <= lim) continue;
        const ex = d - Math.sign(d) * lim;
        const wa = 1 / La, wb = -(1 / La + 1 / Lc), wc = 1 / Lc, s2 = wa * wa + wb * wb + wc * wc;
        z[a] -= ex * wa / s2; z[b] -= ex * wb / s2; z[c] -= ex * wc / s2;
      }
      for (let e = 0; e < edges.length; e++) {
        const [a, b, L] = edges[e], m = gEdge[e] * L, d = z[b] - z[a];
        if (Math.abs(d) <= m) continue;
        const ex = (Math.abs(d) - m) * Math.sign(d);
        z[a] += ex / 2; z[b] -= ex / 2;
      }
      pairTwins();
      for (let n = 0; n < N; n++) {
        if (!Number.isNaN(pin[n])) { z[n] = pin[n]; continue; }
        const l = lo(n);
        if (z[n] < l) z[n] = l;
        if (z[n] > U[n]) z[n] = U[n];
      }
    }
    // a last pass that enforces the curves, the grade and the hard bounds
    // only (the pins and the bounds win)
    for (let it = 0; it < 1500; it++) {
      for (let p = 0; p < pairs.length; p++) {
        const [a, b, c, La, Lc] = pairs[p];
        const d = (z[c] - z[b]) / Lc - (z[b] - z[a]) / La, lim = kPair[p] * (La + Lc) / 2;
        if (Math.abs(d) <= lim) continue;
        const ex = d - Math.sign(d) * lim;
        const fa = Number.isNaN(pin[a]) ? 1 : 0, fb = Number.isNaN(pin[b]) ? 1 : 0, fc = Number.isNaN(pin[c]) ? 1 : 0;
        const wa = fa / La, wb = -fb * (1 / La + 1 / Lc), wc = fc / Lc, s2 = wa * wa + wb * wb + wc * wc;
        if (!s2) continue;
        const w = 1.7 * ex / s2;
        z[a] -= w * wa; z[b] -= w * wb; z[c] -= w * wc;
      }
      pairTwins();
      for (let n = 0; n < N; n++) if (Number.isNaN(pin[n]) && z[n] < Math.min(lb[n], U[n])) z[n] = Math.min(lb[n], U[n]);
      for (let e = 0; e < edges.length; e++) {
        const [a, b, L] = edges[e], m = gEdge[e] * L, d = z[b] - z[a];
        if (Math.abs(d) <= m) continue;
        const ex = (Math.abs(d) - m) * Math.sign(d);
        const fa = Number.isNaN(pin[a]), fb = Number.isNaN(pin[b]);
        if (fa && fb) { z[a] += ex / 2; z[b] -= ex / 2; } else if (fa) z[a] += ex; else if (fb) z[b] -= ex;
      }
      for (let n = 0; n < N; n++) if (!Number.isNaN(pin[n])) z[n] = pin[n]; else if (z[n] > U[n]) z[n] = U[n];
    }
    // and the grade alone last (the twins and the curves may leave a hair over it)
    for (let it = 0; it < 200; it++) {
      for (let e = 0; e < edges.length; e++) {
        const [a, b, L] = edges[e], m = gEdge[e] * L, d = z[b] - z[a];
        if (Math.abs(d) <= m) continue;
        const ex = (Math.abs(d) - m) * Math.sign(d);
        const fa = Number.isNaN(pin[a]), fb = Number.isNaN(pin[b]);
        if (fa && fb) { z[a] += ex / 2; z[b] -= ex / 2; } else if (fa) z[a] += ex; else if (fb) z[b] -= ex;
      }
    }
    short = [];
    for (let n = 0; n < N; n++) if (Number.isFinite(lb[n]) && z[n] < lb[n] - 0.05) short.push(n);
  };
  solveOnce();
  let exceptional = 0;
  if (short.length) {
    const sx = short.map((n) => [ids[n].x, ids[n].y]);
    const nearShort = (n) => sx.some(([x, y]) => Math.hypot(ids[n].x - x, ids[n].y - y) < EXCEPT_REACH);
    edges.forEach(([a, b], e) => { if (nearShort(a) || nearShort(b)) { gEdge[e] = RAIL_GRADE_MAX; exceptional++; } });
    pairs.forEach(([, b], p) => { if (nearShort(b)) kPair[p] = 1 / RAIL_RADIUS_MIN; });
    solveOnce();
  }
  // out: z per rail (relative to the terrain), densified pts where a rail got a profile
  const out = new Map(), pts = new Map();
  views.forEach((v, vi) => {
    const zs = Array.from(of[vi], (n) => Math.round((z[n] - ter[n]) * 100) / 100);
    if (zs.every((q) => Math.abs(q) < 0.01)) return;
    out.set(v.src, zs);
    pts.set(v.src, v.pts);
  });
  const nets = new Set();
  for (let n = 0; n < N; n++) nets.add(find(n));
  return {
    rails: out, pts,
    shortfall: short.map((n) => ({ x: Math.round(ids[n].x), y: Math.round(ids[n].y), z: z[n] - ter[n], need: lb[n] - ter[n] })),
    stats: { nodes: N, networks: nets.size, profiled: out.size, exceptionalEdges: exceptional, ...why },
  };
}

// Puts a solution into the map data: rail.z and the densified pts; a rail
// that ends up flat loses its z (and keeps its own vertices).
export function apply(data, sol) {
  let changed = 0;
  for (const r of data.rails || []) {
    const zs = sol.rails.get(r);
    if (!zs) { if (r.z) { delete r.z; changed++; } continue; }
    const P = sol.pts.get(r);
    if (r.ly) r.ly = P.seg.map((i) => r.ly[i]);
    r.pts = P.map((p) => p);
    r.z = zs;
    changed++;
  }
  return { changed };
}

// ------------------------------------------------------------------ audit

// Every line (railRoutes) from end to end, sampled every 2 m through the one
// height query the trains use: jumps, grade, vertical curves, level
// crossings at the road's height, level platforms, clearance at every road
// crossing (the road's deck over the track, or the track over the road).
export function audit(data, { step = 2 } = {}) {
  const idx = railHeightIndex(data.rails);
  const lifts = data.railLifts || [];
  const zAt = idx && idx.any ? (x, y) => railHeightAt(idx, x, y) : (x, y) => railLiftZ(lifts, x, y);
  const roads = data.roads || [];
  const lcs = data.levelCrossings || [];
  const rep = { profiled: !!(idx && idx.any), lines: [], jumps: [], steep: [], exceptional: 0, curves: [], lc: [], platforms: [], clearance: [], clearanceOk: 0, catenary: [] };
  const lineViews = (data.railRoutes || []).map((r) => ({ pts: r.pts, rail: true, route: r }));
  const cross = railRoadCrossings(lineViews, roads).filter((c) => !lcs.some((l) => Math.hypot(l.x - c.x, l.y - c.y) < LC_ZONE));
  for (const route of data.railRoutes || []) {
    const smp = routeSampler(route);
    const S = [], Z = [], XY = [];
    for (let s = 0; s <= smp.len; s += step) { const [x, y] = smp.at(s); S.push(s); Z.push(zAt(x, y)); XY.push([x, y]); }
    let maxG = 0, exc = 0;
    for (let i = 1; i < S.length; i++) {
      const dz = Math.abs(Z[i] - Z[i - 1]);
      if (dz > RAIL_GRADE_MAX * step * 2 + 0.03) rep.jumps.push({ line: route.name, dz, at: XY[i].map(Math.round) });
    }
    // grade and curve over 20 m chords (a train spans its bogies)
    const W = Math.max(1, Math.round(20 / step));
    const s20 = [], z20 = [];
    for (let i = 0; i < S.length; i += W) { s20.push(S[i]); z20.push(Z[i]); }
    for (const q of railProfileStats(s20, z20)) {
      maxG = Math.max(maxG, Math.abs(q.g));
      if (Math.abs(q.g) > RAIL_GRADE + RAIL_GRADE_TOL) exc += q.L;
      if (Math.abs(q.g) > RAIL_GRADE_MAX + RAIL_GRADE_TOL) rep.steep.push({ line: route.name, g: q.g, at: XY[Math.min(XY.length - 1, q.i * W)].map(Math.round) });
      if (q.R < RAIL_RADIUS_MIN * 0.5 && q.dg > 0.002) rep.curves.push({ line: route.name, R: q.R, at: XY[Math.min(XY.length - 1, q.i * W)].map(Math.round) });
    }
    rep.exceptional += exc;
    // level platforms round every stop
    for (const st of route.stops || []) {
      if (st.offmap) continue;
      let lo = Infinity, hi = -Infinity;
      for (let s = st.s - PLATFORM_HALF + 10; s <= st.s + PLATFORM_HALF - 10; s += step) { const [x, y] = smp.at(s); const z = zAt(x, y); lo = Math.min(lo, z); hi = Math.max(hi, z); }
      const top = PLATFORM_ABOVE_RAIL;
      if (hi - lo > 0.03 || top < PLATFORM_RANGE[0] || top > PLATFORM_RANGE[1]) rep.platforms.push({ line: route.name, stop: st.name, spread: hi - lo });
    }
    rep.lines.push({ name: route.name, km: Math.round(smp.len) / 1000, maxG, exceptionalM: Math.round(exc), electrified: !!(trackNear(data.rails, ...smp.at(smp.len / 2)) || {}).rail?.el });
  }
  // level crossings: the track at the road's height
  for (const c of lcs) {
    const near = roads.filter((r) => r.cat !== 'foot' && r.pts.some((p) => Math.hypot(p[0] - c.x, p[1] - c.y) < 60));
    const zr = roadZNear(near, c.x, c.y), zt = zAt(c.x, c.y);
    if (Math.abs(zr - zt) > 0.01) rep.lc.push({ at: [Math.round(c.x), Math.round(c.y)], zRoad: zr, zRail: zt });
  }
  // clearance at every road crossing of a line
  const seen = new Set();
  for (const c of cross) {
    const k = `${Math.round(c.x / 4)},${Math.round(c.y / 4)},${roads.indexOf(c.road)}`;
    if (seen.has(k)) continue;
    seen.add(k);
    const zt = zAt(c.x, c.y), zr = c.zRoad;
    const label = `${c.road.ref || ''} ${c.road.name || ''}`.trim() || c.road.type;
    const track = trackNear(data.rails, c.x, c.y);
    const roadOver = zr > zt + 1.5 || (Math.abs(zr - zt) <= 1.5 && track && overAtRailCrossing(track.rail, track.i, c.road) === 'road');
    if (roadOver) {
      const need = clearanceUnder({ rail: true });
      if (zr - zt < need - 0.05) rep.clearance.push({ road: label, over: 'weg over spoor', dz: zr - zt, need, at: [Math.round(c.x), Math.round(c.y)] });
      else rep.clearanceOk++;
      // contact wire: underside of the deck above the wire on electrified lines
      if (track && track.rail.el) {
        const free = zr - DECK - (zt + RAIL_TOP);
        if (free < CATENARY_H + 0.2) rep.catenary.push({ road: label, free, at: [Math.round(c.x), Math.round(c.y)] });
      }
    } else {
      if (c.road.cat === 'foot') continue;
      const need = clearanceUnder(c.road);
      if (zt - zr < need - 0.05) rep.clearance.push({ road: label, over: 'spoor over weg', dz: zt - zr, need, at: [Math.round(c.x), Math.round(c.y)] });
      else rep.clearanceOk++;
    }
  }
  void RAIL_CLEAR;
  return rep;
}

// the rail segment nearest (x, y) within 4 m: { rail, i }
function trackNear(rails, x, y) {
  let best = null, bd = 4;
  for (const r of rails || []) {
    const P = r.pts;
    for (let i = 0; i < P.length - 1; i++) {
      if (Math.abs(P[i][0] - x) > 200 || Math.abs(P[i][1] - y) > 200) continue;
      const dx = P[i + 1][0] - P[i][0], dy = P[i + 1][1] - P[i][1], L2 = dx * dx + dy * dy || 1;
      const t = Math.max(0, Math.min(1, ((x - P[i][0]) * dx + (y - P[i][1]) * dy) / L2));
      const d = Math.hypot(P[i][0] + dx * t - x, P[i][1] + dy * t - y);
      if (d < bd) { bd = d; best = { rail: r, i }; }
    }
  }
  return best;
}

export const problems = (rep) => rep.jumps.length + rep.steep.length + rep.lc.length + rep.platforms.length + rep.clearance.length + rep.catenary.length;

export function printAudit(rep, limit = 8) {
  console.log(`track: ${rep.profiled ? 'solved profile (rail.z)' : 'radial rail lifts (no profile yet)'}`);
  for (const l of rep.lines) console.log(`  ${l.name}: ${l.km.toFixed(2)} km, steepest ${(l.maxG * 100).toFixed(2)} %, ${l.exceptionalM} m over ${(RAIL_GRADE * 100).toFixed(2)} %${l.electrified ? ', electrified' : ''}`);
  console.log(`jumps between 2 m samples: ${rep.jumps.length}`);
  for (const q of rep.jumps.slice(0, limit)) console.log(`  ${q.dz.toFixed(2)} m ${q.line} at ${q.at}`);
  console.log(`steeper than ${(RAIL_GRADE_MAX * 100).toFixed(1)} %: ${rep.steep.length}`);
  for (const q of rep.steep.slice().sort((a, b) => Math.abs(b.g) - Math.abs(a.g)).slice(0, limit)) console.log(`  ${(q.g * 100).toFixed(2)} % ${q.line} at ${q.at}`);
  console.log(`vertical curves under half of ${RAIL_RADIUS_MIN} m: ${rep.curves.length}`);
  for (const q of rep.curves.slice().sort((a, b) => a.R - b.R).slice(0, limit)) console.log(`  R ${q.R.toFixed(0)} m ${q.line} at ${q.at}`);
  console.log(`level crossings off the road's height: ${rep.lc.length}`);
  for (const q of rep.lc.slice(0, limit)) console.log(`  road ${q.zRoad.toFixed(2)} track ${q.zRail.toFixed(2)} at ${q.at}`);
  console.log(`platform stretches not level: ${rep.platforms.length}`);
  for (const q of rep.platforms.slice(0, limit)) console.log(`  ${q.stop} (${q.line}): ${q.spread.toFixed(2)} m`);
  console.log(`road crossings: ${rep.clearanceOk} clear, ${rep.clearance.length} under the clearance`);
  for (const q of rep.clearance.slice().sort((a, b) => (a.dz - a.need) - (b.dz - b.need)).slice(0, limit)) console.log(`  ${q.dz.toFixed(2)} of ${q.need.toFixed(1)} m: ${q.over}, ${q.road} at ${q.at}`);
  console.log(`contact wire under a deck closer than ${CATENARY_H + 0.2} m above the rail: ${rep.catenary.length}`);
}

async function main() {
  const args = process.argv.slice(2);
  const { loadCityData } = await import('../lib/loadworld.mjs');
  const data = await loadCityData({ extras: false });
  if (args.includes('--solve') || args.includes('--write')) {
    console.log('before:');
    printAudit(audit(data), 4);
    const rawFile = path.join(ROOT, 'data/railways_raw.json');
    if (fs.existsSync(rawFile)) {
      const els = JSON.parse(fs.readFileSync(rawFile, 'utf8')).elements;
      console.log(`rail tags: ${matchRailTags(data.rails, els)} of ${data.rails.length} rails matched to their OSM way`);
      data.railPlatforms = platformsFrom(els);
      console.log(`platforms: ${data.railPlatforms.length} (${data.railPlatforms.filter((p) => p.layer > 0).length} raised)`);
    }
    const t0 = performance.now();
    // --terrain: the AHN field (terrain.mjs; F2, the game draws flat until then)
    const sol = solve(data, args.includes('--terrain') ? { terrain: (await import('./terrain.mjs')).loadTerrainField().at } : {});
    const res = apply(data, sol);
    console.log(`solved in ${((performance.now() - t0) / 1000).toFixed(1)} s: ${JSON.stringify(sol.stats)}; ${res.changed} rails changed`);
    if (sol.shortfall.length) {
      console.log(`track short of a road's clearance (the road dips the rest, profile.mjs --write): ${sol.shortfall.length} vertices`);
      const worst = new Map();
      for (const q of sol.shortfall) { const k = `${Math.round(q.x / 50)},${Math.round(q.y / 50)}`; if (!worst.has(k) || worst.get(k).need - worst.get(k).z < q.need - q.z) worst.set(k, q); }
      for (const q of [...worst.values()].slice(0, 12)) console.log(`  at (${q.x}, ${q.y}): ${q.z.toFixed(2)} of ${q.need.toFixed(2)} m`);
    }
    if (args.includes('--write')) {
      const { writeStadFrom } = await import('./stad_file.mjs');
      const file = writeStadFrom(data, ['rails', 'railPlatforms']);
      console.log(`wrote ${path.relative(ROOT, file)}`);
    }
    console.log('after:');
  }
  const rep = audit(data);
  printAudit(rep);
  if (args.includes('--strict') && problems(rep)) process.exit(1);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) main().catch((e) => { console.error(e); process.exit(1); }); // niet awaiten: loadworld.mjs laadt build_province.mjs, dat dit bestand weer importeert (een lus met top-level await blijft hangen)
