import { createWaterIndex } from './waterindex.js';

// Water bodies, levels, depths, boat classes and the one water query
// (docs/PROVINCIE-PLAN.md 2.11, "Water"). Pure data and geometry: the build
// step (scripts/world/water.mjs) and the game share it.
//
// A water polygon carries, once the build step has run:
//   body  its connected water body (polygons whose shores touch)
//   kind  'kanaal' | 'diep' | 'vaart' | 'sloot' | 'vijver'
//   lv    the water level, metres relative to street level (the peil)
//   dp    depth below the level (m)
//   nav   the largest boat class that fits (0-4, BOAT_CLASS)
// and a road that is a movable bridge `movable` ('bascule', 'swing', 'lift',
// 'retractable', 'draw'; OSM bridge:movable).

// The city water is one boezem (the Groninger stadsboezem, about NAP -0.93 m):
// drawn at util.js WATER_Y, 2.3 m below the quays. Ponds that do not touch it
// keep their own peil; until the renderer draws per body (F2) they are drawn
// at the same height.
export const BOEZEM_Y = -2.3;
export const BOEZEM_NAP = -0.93;

// per kind: depth below the level, the largest boat class, the level relative
// to street level where the kind has its own (a polder ditch)
export const WATER_KINDS = {
  kanaal: { depth: 4.5, nav: 4 },   // shipping canals: wide enough for a barge
  diep: { depth: 2.4, nav: 3 },     // city canals, diepen, havens: tour boats
  vaart: { depth: 1.4, nav: 2 },    // narrow canals and vaarten: sloepen
  vijver: { depth: 1.5, nav: 1 },   // ponds and park lakes: canoes, pedalos
  sloot: { depth: 0.6, nav: 1, level: -0.8 }, // ditches: waded, a canoe at most
};
// widths (2 A / P of a polygon, ~ the width of a long one) between the kinds
export const KIND_WIDTH = { kanaal: 30, diep: 9, vaart: 4 };

// Boat classes: 0 nothing (wading only), 1 paddled (kano, kajak, sup,
// waterfiets), 2 small motor boats (sloep, rubberboot, dinghy, rowing
// shells), 3 tour boats and barges of the city (rondvaart, the eight, a
// skutsje), 4 inland shipping (binnenvaart).
export const BOAT_CLASS = {
  kano: 1, kajak: 1, sup: 1, waterfiets: 1,
  sloep: 2, rubberboot: 2, dinghy: 2, skiff: 2,
  acht: 3, rondvaart: 3, skutsje: 3,
  binnenvaart: 4,
};
// Air draft (m above the water of the highest fixed point, people seated or
// kneeling) and draft (m below it) per boat kind; a sloep with a wheelhouse
// (the police) is taller. A skutsje lowers its mast for a bridge but not
// below 2.6 m: a fixed city bridge (1.8 m) has to open for it.
export const AIR_DRAFT = {
  kano: 1.0, kajak: 1.0, sup: 1.0, waterfiets: 1.5, sloep: 1.3, sloepCabin: 1.75, rubberboot: 1.2, dinghy: 1.1,
  skiff: 0.9, acht: 1.0, rondvaart: 1.6, skutsje: 2.6, binnenvaart: 4.2,
};
export const DRAFT = {
  kano: 0.2, kajak: 0.2, sup: 0.15, waterfiets: 0.3, sloep: 0.6, sloepCabin: 0.7, rubberboot: 0.3, dinghy: 0.4,
  skiff: 0.2, acht: 0.3, rondvaart: 0.9, skutsje: 1.0, binnenvaart: 2.6,
};
// a walker stands in water up to this deep (wades); deeper, he swims
export const WADE_MAX = 1.2;
// the deck of a city bridge: its top at the road, its soffit this far below
export const BRIDGE_DECK_T = 0.5;

// --------------------------------------------------------------- geometry

export function polyArea(P) {
  let a = 0;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) a += P[j][0] * P[i][1] - P[i][0] * P[j][1];
  return Math.abs(a / 2);
}
export function polyPerimeter(P) {
  let s = 0;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) s += Math.hypot(P[i][0] - P[j][0], P[i][1] - P[j][1]);
  return s;
}
export function inPolygon(x, y, P) {
  let c = false;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    if ((P[i][1] > y) !== (P[j][1] > y) && x < ((P[j][0] - P[i][0]) * (y - P[i][1])) / (P[j][1] - P[i][1]) + P[i][0]) c = !c;
  }
  return c;
}
function boundsOf(P) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of P) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
  return [x0, y0, x1, y1];
}
function distToOutline(P, x, y) {
  let best = Infinity;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    const ax = P[j][0], ay = P[j][1], dx = P[i][0] - ax, dy = P[i][1] - ay, L2 = dx * dx + dy * dy || 1e-9;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L2));
    best = Math.min(best, Math.hypot(ax + dx * t - x, ay + dy * t - y));
  }
  return best;
}

// --------------------------------------------------------------- bodies

// Connected water bodies over a list of polygons ({ pts }): two polygons are
// one body where a vertex of one lies within `touch` m of the other's outline
// (or inside it). Returns Int32Array body per polygon and the body count.
export function waterBodies(water, touch = 1.0) {
  const n = water.length;
  const parent = Int32Array.from({ length: n }, (_, i) => i);
  const find = (i) => { while (parent[i] !== i) i = parent[i] = parent[parent[i]]; return i; };
  const B = water.map((w) => boundsOf(w.pts));
  const G = 64, grid = new Map();
  B.forEach((b, i) => {
    for (let gx = Math.floor((b[0] - touch) / G); gx <= Math.floor((b[2] + touch) / G); gx++)
      for (let gy = Math.floor((b[1] - touch) / G); gy <= Math.floor((b[3] + touch) / G); gy++) {
        const k = gx * 65536 + gy;
        (grid.get(k) || grid.set(k, []).get(k)).push(i);
      }
  });
  for (let i = 0; i < n; i++) {
    for (const p of water[i].pts) {
      for (const j of grid.get(Math.floor(p[0] / G) * 65536 + Math.floor(p[1] / G)) || []) {
        if (j === i || find(i) === find(j)) continue;
        const b = B[j];
        if (p[0] < b[0] - touch || p[0] > b[2] + touch || p[1] < b[1] - touch || p[1] > b[3] + touch) continue;
        if (inPolygon(p[0], p[1], water[j].pts) || distToOutline(water[j].pts, p[0], p[1]) < touch) parent[find(i)] = find(j);
      }
    }
  }
  const ids = new Map(), body = new Int32Array(n);
  for (let i = 0; i < n; i++) { const r = find(i); if (!ids.has(r)) ids.set(r, ids.size); body[i] = ids.get(r); }
  return { body, count: ids.size };
}

// Rasterises a set of polygons (indices into water) on a grid of `cell` m and
// gives the distance from each water cell to the nearest dry one (chamfer
// 3-4): { W, H, x0, y0, cell, poly (index + 1 per cell), dist (m) }.
export function waterGrid(water, list, cell = 2.5) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const i of list) for (const p of water[i].pts) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
  x0 -= cell; y0 -= cell;
  const W = Math.ceil((x1 - x0) / cell) + 2, H = Math.ceil((y1 - y0) / cell) + 2;
  const poly = new Int32Array(W * H);
  for (const i of list) {
    const P = water[i].pts, b = boundsOf(P);
    for (let gy = Math.max(0, Math.floor((b[1] - y0) / cell)); gy <= Math.min(H - 1, Math.ceil((b[3] - y0) / cell)); gy++) {
      const y = y0 + (gy + 0.5) * cell, xs = [];
      for (let k = 0, j = P.length - 1; k < P.length; j = k++) if ((P[k][1] > y) !== (P[j][1] > y)) xs.push(P[k][0] + ((P[j][0] - P[k][0]) * (y - P[k][1])) / (P[j][1] - P[k][1]));
      xs.sort((a, c) => a - c);
      for (let q = 0; q + 1 < xs.length; q += 2) {
        for (let gx = Math.max(0, Math.ceil((xs[q] - x0) / cell - 0.5)); gx <= Math.min(W - 1, Math.floor((xs[q + 1] - x0) / cell - 0.5)); gx++) poly[gy * W + gx] = i + 1;
      }
    }
  }
  const BIG = 1e9, d = new Float32Array(W * H);
  for (let k = 0; k < W * H; k++) d[k] = poly[k] ? BIG : 0;
  const a = 1, b = Math.SQRT2;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const k = y * W + x;
    if (!d[k]) continue;
    let v = d[k];
    if (x > 0) v = Math.min(v, d[k - 1] + a);
    if (y > 0) { v = Math.min(v, d[k - W] + a); if (x > 0) v = Math.min(v, d[k - W - 1] + b); if (x < W - 1) v = Math.min(v, d[k - W + 1] + b); }
    d[k] = v;
  }
  for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) {
    const k = y * W + x;
    if (!d[k]) continue;
    let v = d[k];
    if (x < W - 1) v = Math.min(v, d[k + 1] + a);
    if (y < H - 1) { v = Math.min(v, d[k + W] + a); if (x < W - 1) v = Math.min(v, d[k + W + 1] + b); if (x > 0) v = Math.min(v, d[k + W - 1] + b); }
    d[k] = v;
  }
  // cells to metres: a cell next to the shore is half a cell from it
  for (let k = 0; k < W * H; k++) if (d[k]) d[k] = (d[k] - 0.5) * cell;
  return { W, H, x0, y0, cell, poly, dist: d };
}

// The kind of one polygon from the width of the channel it lies in (`w`, m:
// twice the largest distance to the shore of its body inside it, so a sliver
// mapped under a bridge counts as the canal it is part of) and whether it
// belongs to the boezem (the largest body: the canals of the city).
export function classifyWater(poly, onBoezem, w = null) {
  if (w === null) w = 2 * polyArea(poly.pts) / (polyPerimeter(poly.pts) || 1);
  const name = (poly.name || '').toLowerCase();
  if (/sloot|tocht/.test(name) && w < KIND_WIDTH.vaart) return 'sloot';
  if (/vijver|plas|meer|kolk/.test(name) && !onBoezem) return 'vijver';
  if (!onBoezem) return w < 2.5 ? 'sloot' : 'vijver';
  if (w >= KIND_WIDTH.kanaal) return 'kanaal';
  if (w >= KIND_WIDTH.diep || /haven|diep|kanaal/.test(name)) return 'diep';
  if (w >= KIND_WIDTH.vaart) return 'vaart';
  return 'sloot';
}

// Annotates the polygons (body, kind, lv, dp, nav) and returns the bodies:
// [{ id, polys, kind, level, nap, area, nav }]. The largest body is the
// boezem; every other keeps its own peil (drawn at the boezem height for now).
export function annotateWater(water, cell = 2.5) {
  const { body, count } = waterBodies(water);
  // channel width per polygon from each body's distance field
  const width = new Float64Array(water.length);
  const lists = Array.from({ length: count }, () => []);
  water.forEach((_, i) => lists[body[i]].push(i));
  for (const list of lists) {
    const g = waterGrid(water, list, cell);
    // the grid is a cell coarse: in narrow water the exact distance to the
    // body's shore (edges shared by two polygons are no shore)
    let idx = null;
    for (let k = 0; k < g.W * g.H; k++) {
      if (!g.poly[k]) continue;
      const pi = g.poly[k] - 1;
      let d = g.dist[k];
      if (d < 3 * cell) {
        if (!idx) idx = createWaterIndex(list.map((i) => water[i]));
        const cx = k % g.W, cy = (k - cx) / g.W;
        d = idx.nearestShore(g.x0 + (cx + 0.5) * cell, g.y0 + (cy + 0.5) * cell, 4 * cell).d;
      }
      width[pi] = Math.max(width[pi], 2 * d);
    }
  }
  // a polygon too thin for a cell centre: its own width
  water.forEach((w, i) => { if (!width[i]) width[i] = 2 * polyArea(w.pts) / (polyPerimeter(w.pts) || 1); });
  const area = new Float64Array(count);
  water.forEach((w, i) => { area[body[i]] += polyArea(w.pts); });
  let boezem = 0;
  for (let b = 1; b < count; b++) if (area[b] > area[boezem]) boezem = b;
  const rank = { sloot: 0, vijver: 1, vaart: 2, diep: 3, kanaal: 4 };
  const bodies = Array.from({ length: count }, (_, id) => ({ id, polys: [], kind: 'sloot', level: BOEZEM_Y, nap: id === boezem ? BOEZEM_NAP : null, area: Math.round(area[id]), nav: 0, boezem: id === boezem }));
  water.forEach((w, i) => {
    const b = bodies[body[i]];
    const kind = classifyWater(w, b.boezem, width[i] || null);
    const K = WATER_KINDS[kind];
    w.body = b.id;
    w.kind = kind;
    w.lv = K.level !== undefined && !b.boezem ? K.level : BOEZEM_Y;
    w.dp = K.depth;
    w.nav = K.nav;
    b.polys.push(i);
    if (rank[kind] > rank[b.kind]) b.kind = kind;
    b.nav = Math.max(b.nav, K.nav);
  });
  for (const b of bodies) b.level = water[b.polys[0]].lv;
  return bodies;
}

// --------------------------------------------------------------- boats

export function boatModelKind(v) {
  const k = (v && v.model && v.model.kind) || 'sloep';
  if (k === 'sloep' && v && (v.isPolice || v.cabin)) return 'sloepCabin';
  return k;
}
export const boatClassOf = (v) => BOAT_CLASS[boatModelKind(v) === 'sloepCabin' ? 'sloep' : boatModelKind(v)] ?? 2;
export const airDraftOf = (v) => AIR_DRAFT[boatModelKind(v)] ?? 1.3;
export const draftOf = (v) => DRAFT[boatModelKind(v)] ?? 0.6;

// Free height under a bridge deck over water at level `level`: the deck's
// top is the road surface (street level + its profile z), its soffit
// BRIDGE_DECK_T below. A movable bridge that is open has none above it.
export function bridgeClearance(road, zDeck = 0, level = BOEZEM_Y) {
  if (road && road._open) return Infinity;
  return zDeck - BRIDGE_DECK_T - level;
}
// Can a boat of air draft `air` pass under a bridge of clearance `clear`?
// (kept 5 cm clear)
export const passesUnder = (air, clear) => clear >= air + 0.05;

// --------------------------------------------------------------- the query

// The one water query for boats, swimmers, the heli and walkers:
//   waterAt(map, x, y) -> null on dry land, else
//   { level, depth, body, kind, navigable, wade, clearanceAbove }
// clearanceAbove: free height to a bridge deck over (x, y) (Infinity when
// none). `country` is countryedge.js countryWater for the Ommeland past the
// city polygons ('deep' | 'wade' | 'ditch' | null); it is set by the game.
let countryKind = null;
export function setCountryWaterKind(fn) { countryKind = fn; }

const COUNTRY = {
  deep: { kind: 'diep', depth: WATER_KINDS.diep.depth, nav: 3, level: BOEZEM_Y },
  wade: { kind: 'vaart', depth: 0.9, nav: 1, level: -0.9 },
  ditch: { kind: 'sloot', depth: WATER_KINDS.sloot.depth, nav: 1, level: WATER_KINDS.sloot.level },
};

export function waterAt(map, x, y) {
  let poly = null;
  for (const w of map.waterNear ? map.waterNear(x, y, 0.5) : []) {
    const b = w.bounds || (w.bounds = boundsOf(w.pts));
    if (x < b[0] || x > b[2] || y < b[1] || y > b[3]) continue;
    if (inPolygon(x, y, w.pts)) { poly = w; break; }
  }
  if (poly) {
    const kind = poly.kind || 'diep';
    const K = WATER_KINDS[kind] || WATER_KINDS.diep;
    const level = poly.lv ?? BOEZEM_Y, depth = poly.dp ?? K.depth;
    return {
      level, depth, body: poly.body ?? -1, kind, navigable: poly.nav ?? K.nav, wade: depth <= WADE_MAX,
      clearanceAbove: clearanceOver(map, x, y, level),
    };
  }
  const c = countryKind ? countryKind(x, y) : null;
  if (!c) return null;
  const K = COUNTRY[c];
  return { level: K.level, depth: K.depth, body: -1, kind: K.kind, navigable: K.nav, wade: K.depth <= WADE_MAX, clearanceAbove: Infinity };
}

// free height from the level to the nearest bridge deck over (x, y)
export function clearanceOver(map, x, y, level = BOEZEM_Y) {
  if (!map.roadsNear) return Infinity;
  let best = Infinity;
  for (const r of map.roadsNear(x, y, 8)) {
    if (!r.bridge) continue;
    const P = r.pts, half = (r.width || 4) / 2 + 1.5;
    for (let i = 0; i < P.length - 1; i++) {
      const ax = P[i][0], ay = P[i][1], dx = P[i + 1][0] - ax, dy = P[i + 1][1] - ay, L2 = dx * dx + dy * dy || 1e-9;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L2));
      if (Math.hypot(ax + dx * t - x, ay + dy * t - y) > half) continue;
      const z = r.z ? r.z[i] + (r.z[i + 1] - r.z[i]) * t : 0;
      best = Math.min(best, bridgeClearance(r, z, level));
    }
  }
  return best;
}
