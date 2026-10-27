// The vertical design rules for roads (docs/PROVINCIE-PLAN.md 2.11) and the
// network they apply to, shared by the height solver (scripts/world/profile.mjs),
// the profile audit and the game's debug overlay. Pure data and geometry.
//
// A road's profile is `road.z` (metres above street level per vertex); the
// network joins roads at shared vertices (1 cm), so a joint has one height by
// construction. Crossings without a shared vertex are grade separations: the
// upper one clears the lower one by the clearance of the lower one's class.

// Maximum grade per highway type (NL design practice: motorway 4 %, N-road 5 %,
// urban 6-8 %, ramps 6 %; foot and cycle ramps 6-8 %). Steps are not limited.
export const MAX_GRADE = {
  motorway: 0.04, trunk: 0.05, primary: 0.05, secondary: 0.06, tertiary: 0.07,
  motorway_link: 0.06, trunk_link: 0.06, primary_link: 0.06, secondary_link: 0.07, tertiary_link: 0.07,
  residential: 0.08, unclassified: 0.08, living_street: 0.08, service: 0.1, track: 0.1, busway: 0.06,
  pedestrian: 0.08, cycleway: 0.06, footway: 0.08, path: 0.08, bridleway: 0.08,
};
// what the grade check allows over a solved profile: the limit plus the
// vertical curve rounding a vertex (a polyline of a curve is a little steeper
// than the curve)
export const GRADE_TOL = 0.006;

// Minimum radius of a vertical curve (m): motorway 1000, N-road 600, urban 300,
// cycle ramps 60, foot ramps 30
export const MIN_RADIUS = {
  motorway: 1000, trunk: 600, primary: 400, motorway_link: 300, trunk_link: 300, primary_link: 300,
  // foot and cycle ramps (the solver rounds car roads only; the audit checks these)
  cycleway: 60, footway: 30, path: 30, pedestrian: 30, bridleway: 30, steps: 1,
};
export const DEFAULT_RADIUS = 300;

// Free height under a deck by the class of what passes below (m), and the
// deck's own thickness (elevation.js DECK_T): the crossing's height difference.
export const CLEARANCE = { road: 4.6, motorway: 4.8, cycle: 2.5, foot: 2.5, rail: 6.0 };
export const DECK = 1.0;

export function gradeLimit(r) {
  return MAX_GRADE[r.type] ?? (r.cat === 'foot' ? Infinity : 0.08);
}
export function radiusMin(r) {
  return MIN_RADIUS[r.type] ?? DEFAULT_RADIUS;
}
// the height difference a crossing over `lower` needs (deck included)
export function clearanceUnder(lower) {
  if (lower.rail) return CLEARANCE.rail + DECK;
  if (lower.type === 'motorway') return CLEARANCE.motorway + DECK;
  if (lower.cat === 'cycle' || lower.cat === 'foot') return CLEARANCE.cycle + DECK;
  return CLEARANCE.road + DECK;
}

export const CAR = new Set(['major', 'normal', 'minor']);
export const nodeKey = (p) => Math.round(p[0] * 100) * 1e7 + Math.round(p[1] * 100);

// OSM grade order of a way: +1 above street level, -1 below, 0 at it
export function gradeOrder(r) {
  const layer = r.layer | 0;
  if (r.rail) return r.order | 0;
  if (layer) return Math.sign(layer);
  return (r.bridge ? 1 : 0) - (r.tunnel ? 1 : 0);
}

// Height of road r at vertex i + t along segment i
export function zAlong(r, i, t) {
  const Z = r.z;
  if (!Z) return 0;
  return Z[i] + (Z[i + 1] - Z[i]) * t;
}

// The road network: unique vertices (nodes) and, per road, the node of each
// vertex. { nodes: Map(key -> { id, x, y, roads: [[road, i], ...] }), ids: [node per id],
//   of: Map(road -> Int32Array), bumps: [{ x, y, up: [road, i], lo: [road, i] }] }
// A shared vertex is a joint only when the ways meet there. Densifying two
// crossing ways can put a vertex of both on the same centimetre (#501: the N46
// slip road over the Roeierspad), and merging those would pull the street below
// up to the deck (or the deck down to the street). A raised way with an explicit
// layer that *passes through* the point is over the other one, not joined to it:
// those vertices become two nodes, and `bumps` marks the crossing so the deck
// can be held at its clearance (profile.mjs). A raised way that *ends* there
// still lands on the road below (an off-ramp joining its carriageway), so it
// keeps the joint.
export function buildNetwork(roads) {
  const at = new Map();
  for (const r of roads) r.pts.forEach((p, i) => {
    const k = nodeKey(p);
    const l = at.get(k);
    if (l) l.push([r, i]); else at.set(k, [[r, i]]);
  });
  const nodes = new Map(), ids = [], of = new Map(), bumps = [];
  for (const r of roads) of.set(r, new Int32Array(r.pts.length));
  for (const [k, list] of at) {
    const order = list.map(([r]) => gradeOrder(r));
    const top = Math.max(...order), bottom = Math.min(...order);
    // an explicitly layered raised way (layer > 0) that passes through the
    // point is a deck over the other one: a way tagged as a bridge without a
    // layer is often a short culvert or a ramp that starts at grade, and must
    // not lift anything (#501)
    const over = top > 0 && top > bottom
      ? list.filter(([r, i], q) => order[q] === top && i > 0 && i < r.pts.length - 1 && (r.layer | 0) > 0)
      : [];
    const groups = new Map();
    if (!over.length) groups.set('', list);
    else list.forEach((e, q) => groups.set(`${order[q]}`, (groups.get(`${order[q]}`) || []).concat([e])));
    const [r0, i0] = list[0];
    for (const [suffix, entries] of groups) {
      const kk = suffix ? `${k}|${suffix}` : k;
      let n = nodes.get(kk);
      if (!n) { n = { id: ids.length, x: r0.pts[i0][0], y: r0.pts[i0][1], roads: [] }; nodes.set(kk, n); ids.push(n); }
      for (const [r, i] of entries) { n.roads.push([r, i]); of.get(r)[i] = n.id; }
    }
    if (over.length) bumps.push({ x: r0.pts[i0][0], y: r0.pts[i0][1], up: over[0], lo: list.filter((e, q) => order[q] === bottom)[0] });
  }
  return { nodes, ids, of, bumps };
}

// The crossings that split vertices create, in the shape planCrossings returns
// ({ a, i, t, b, j, u, x, y }), so the solver can measure them.
export function bumpCrossings(net) {
  const seg = (r, i) => (i >= r.pts.length - 1 ? [Math.max(0, r.pts.length - 2), 1] : [i, 0]);
  return (net.bumps || []).map((b) => {
    const [ai, at] = seg(b.up[0], b.up[1]), [bi, bt] = seg(b.lo[0], b.lo[1]);
    return { a: b.up[0], i: ai, t: at, b: b.lo[0], j: bi, u: bt, x: b.x, y: b.y };
  });
}

// Connected components of the roads that carry a profile and every road
// sharing a vertex with them: { comp: Map(road -> id), count }
export function profiledNetworks(roads, net = buildNetwork(roads)) {
  const parent = new Int32Array(net.ids.length).map((_, i) => i);
  const find = (i) => { while (parent[i] !== i) i = parent[i] = parent[parent[i]]; return i; };
  for (const r of roads) {
    if (!r.z) continue;
    const a = net.of.get(r);
    for (let i = 1; i < a.length; i++) { const x = find(a[0]), y = find(a[i]); if (x !== y) parent[x] = y; }
  }
  const comp = new Map(), ids = new Map();
  for (const r of roads) {
    if (!r.z) continue;
    const root = find(net.of.get(r)[0]);
    if (!ids.has(root)) ids.set(root, ids.size);
    comp.set(r, ids.get(root));
  }
  return { comp, count: ids.size };
}

function segHit(ax, ay, bx, by, cx, cy, dx, dy) {
  const rx = bx - ax, ry = by - ay, sx = dx - cx, sy = dy - cy;
  const den = rx * sy - ry * sx;
  if (Math.abs(den) < 1e-9) return null;
  const qx = cx - ax, qy = cy - ay;
  const t = (qx * sy - qy * sx) / den, u = (qx * ry - qy * rx) / den;
  return t > 0 && t < 1 && u > 0 && u < 1 ? [t, u] : null;
}

// Every place two ways cross in plan without a shared vertex: { a, i, t, b, j, u, x, y }
// (a's segment i at t, b's segment j at u). `items` are roads and rails ({ pts, rail: true }).
export function planCrossings(items, filter = () => true) {
  const G = 48, grid = new Map();
  items.forEach((r, ri) => {
    const P = r.pts;
    for (let i = 0; i < P.length - 1; i++) {
      const gx0 = Math.floor(Math.min(P[i][0], P[i + 1][0]) / G), gx1 = Math.floor(Math.max(P[i][0], P[i + 1][0]) / G);
      const gy0 = Math.floor(Math.min(P[i][1], P[i + 1][1]) / G), gy1 = Math.floor(Math.max(P[i][1], P[i + 1][1]) / G);
      for (let gx = gx0; gx <= gx1; gx++) for (let gy = gy0; gy <= gy1; gy++) {
        const k = gx * 100000 + gy;
        let c = grid.get(k);
        if (!c) grid.set(k, c = []);
        c.push(ri, i);
      }
    }
  });
  const out = [], seen = new Set();
  for (const c of grid.values()) {
    for (let p = 0; p < c.length; p += 2) {
      for (let q = p + 2; q < c.length; q += 2) {
        let ia = c[p], sa = c[p + 1], ib = c[q], sb = c[q + 1];
        if (ia === ib) continue;
        if (ia > ib) { [ia, ib] = [ib, ia]; [sa, sb] = [sb, sa]; }
        const a = items[ia], b = items[ib];
        if (!filter(a, b)) continue;
        const k = `${ia}:${sa}:${ib}:${sb}`;
        if (seen.has(k)) continue;
        seen.add(k);
        const A = a.pts[sa], B = a.pts[sa + 1], C = b.pts[sb], D = b.pts[sb + 1];
        const ka = nodeKey(A), kb = nodeKey(B), kc = nodeKey(C), kd = nodeKey(D);
        if (ka === kc || ka === kd || kb === kc || kb === kd) continue;
        const h = segHit(A[0], A[1], B[0], B[1], C[0], C[1], D[0], D[1]);
        if (!h) continue;
        out.push({ a, i: sa, t: h[0], b, j: sb, u: h[1], x: A[0] + (B[0] - A[0]) * h[0], y: A[1] + (B[1] - A[1]) * h[0] });
      }
    }
  }
  return out;
}

// Surface half width of a road ribbon (elevation.js surfaceHalfWidth)
const SIDEWALK = new Set(['major', 'normal', 'minor']);
export const ribbonHalf = (r) => r.width / 2 + (SIDEWALK.has(r.cat) ? 1.8 : 0.3);

// Grade and vertical curve per vertex of a profiled road: [{ i, g, R }] where
// g is the segment grade after vertex i and R the radius at vertex i (Infinity
// when straight); segments under `minLen` are merged into the next.
export function profileStats(r, minLen = 2) {
  const P = r.pts, Z = r.z, out = [];
  if (!Z) return out;
  let s = 0;
  const S = [0];
  for (let i = 1; i < P.length; i++) S.push(s += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
  for (let i = 0; i < P.length - 1; i++) {
    const L = S[i + 1] - S[i];
    if (L < minLen) continue;
    const g = (Z[i + 1] - Z[i]) / L;
    out.push({ i, s: S[i], L, g });
  }
  for (let k = 1; k < out.length; k++) {
    const a = out[k - 1], b = out[k];
    const dg = Math.abs(b.g - a.g);
    b.dg = dg;
    b.R = dg > 1e-4 ? ((a.L + b.L) / 2) / dg : Infinity;
  }
  if (out.length) { out[0].R = Infinity; out[0].dg = 0; }
  return out;
}

// What a segment of a profiled road is built as (the tile heights section):
// on the ground, a deck (bridge way off street level), an embankment
// (raised fill), an open cutting or a tunnel (covered).
export const STRUCT = { ground: 0, deck: 1, embankment: 2, cutting: 3, tunnel: 4 };
const RAISED = 0.3, CUT = 0.07;
export function segmentStructures(r) {
  const Z = r.z, out = [];
  for (let i = 0; i < r.pts.length - 1; i++) {
    const za = Z[i], zb = Z[i + 1], hi = Math.max(za, zb), lo = Math.min(za, zb);
    if (r.tunnel && !r.bridge && lo < -RAISED) out.push(STRUCT.tunnel);
    else if (hi > RAISED) out.push(r.bridge ? STRUCT.deck : STRUCT.embankment);
    else if (lo < -CUT) out.push(STRUCT.cutting);
    else out.push(STRUCT.ground);
  }
  return out;
}

// The heights rows of a map's roads: road -> { pnet, z, st, ly } for every
// road with a profile (pnet: its connected network, st: structure per
// segment, ly: the OSM grade order per segment)
// With a terrain profile (`zt`, scripts/world/terrain_solve.mjs, the one ?terrain reads) the row carries it
// next to `z`: zt, its structures stt and, for a road without a flat profile, the grade orders ly. A road with
// a flat profile and `zt = []` is flat over the terrain; the row has no zt then, only `zf: 1` (#269).
export function heightRows(roads) {
  const { comp } = profiledNetworks(roads);
  const out = new Map();
  for (const r of roads) {
    const zt = r.zt && r.zt.length ? r.zt : null;
    if (!r.z && !zt) continue;
    const o = gradeOrder(r);
    const row = {};
    if (r.z) {
      const st = segmentStructures(r);
      Object.assign(row, { pnet: comp.get(r), z: r.z, st, ly: st.map(() => o) });
    }
    if (zt) {
      const stt = segmentStructures({ ...r, z: zt });
      row.zt = zt;
      row.stt = stt;
      if (!r.z) { row.pnet = -1; row.ly = stt.map(() => o); }
    } else if (r.z && r.zt) row.zf = 1;
    out.set(r, row);
  }
  return out;
}
