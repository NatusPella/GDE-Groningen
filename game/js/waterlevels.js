import { createWaterIndex } from './waterindex.js';
import { pointInPolygon as inPolygon } from './polygon.js';

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
export const SMALL_POND_AREA = 400, // alleen een vijver zonder weg of brug binnen POND_ROAD_CLEAR (#327)
   SMALL_POND_LEVEL = -0.35, SMALL_POND_DEPTH = 0.5;
export const BOEZEM_NAP = -0.93;

// The water of a body that lies at its own peil is drawn there (#299): the Lauwersmeer, held at
// its lake level behind the locks of Lauwersoog and Zoutkamp, lies 1,3 m above the Wadden and the
// Reitdiep. Every other water is drawn at WATER_Y whatever its `lv` says (their `lv` is a guess of
// the build: a lake that touches no boezem polygon in the data is not a lake with a peil of its own).
export const OWN_SURFACE = /^Lauwersmeer$/;
// metres the polygon's surface lies above WATER_Y
export function surfaceLift(poly) {
  if (!poly) return 0;
  if (poly._lift === undefined) poly._lift = poly.kind === 'meer' && poly.lv !== undefined && poly.name && OWN_SURFACE.test(poly.name) ? Math.max(0, poly.lv - BOEZEM_Y) : 0;
  return poly._lift;
}
// the highest surface at (x, y): the lake over the creek polygons the data lays inside it
export function surfaceLiftAt(map, x, y) {
  if (!map || !map.waterNear) return 0;
  let best = 0;
  for (const w of map.waterNear(x, y, 0.5)) {
    const l = surfaceLift(w);
    if (l <= best) continue;
    const b = w.bounds || (w.bounds = boundsOf(w.pts));
    if (x < b[0] || x > b[2] || y < b[1] || y > b[3]) continue;
    if (pointInStaticPolygon(x, y, w.pts)) best = l;
  }
  return best;
}

// per kind: depth below the level, the largest boat class, the level relative
// to street level where the kind has its own (a polder ditch)
export const WATER_KINDS = {
  kanaal: { depth: 4.5, nav: 4 },   // shipping canals: wide enough for a barge
  diep: { depth: 2.4, nav: 3 },     // city canals, diepen, havens: tour boats
  vaart: { depth: 1.4, nav: 2 },    // narrow canals and vaarten: sloepen
  vijver: { depth: 1.5, nav: 1 },   // ponds and park lakes: canoes, pedalos
  zee: { depth: 8.0, nav: 4 },      // the sea off the coast (vaarnet.js patches: Eems, Dollard)
  meer: { depth: 3.0, nav: 3, level: -1.0 }, // open lakes (province): their own peil, a tour boat sails
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
  binnenvaart: 4, zeeschip: 4, sleper: 4,
};
// Air draft (m above the water of the highest fixed point, people seated or
// kneeling) and draft (m below it) per boat kind; a sloep with a wheelhouse
// (the police) is taller. A skutsje lowers its mast for a bridge but not
// below 2.6 m: a fixed city bridge (1.8 m) has to open for it.
export const AIR_DRAFT = {
  kano: 1.0, kajak: 1.0, sup: 1.0, waterfiets: 1.5, sloep: 1.3, sloepCabin: 1.75, rubberboot: 1.2, dinghy: 1.1,
  skiff: 0.9, acht: 1.0, rondvaart: 1.6, skutsje: 2.6, binnenvaart: 4.2,
  zeeschip: 4.2, sleper: 4.2, // (de masten gestreken: het schip komt onder de vaste bruggen van het vaarnet door, #398)
};
export const DRAFT = {
  kano: 0.2, kajak: 0.2, sup: 0.15, waterfiets: 0.3, sloep: 0.6, sloepCabin: 0.7, rubberboot: 0.3, dinghy: 0.4,
  skiff: 0.2, acht: 0.3, rondvaart: 0.9, skutsje: 1.0, binnenvaart: 2.6, zeeschip: 3.6, sleper: 2.2,
};
// Het loopdek van een boot, m boven de waterlijn (#434): het dolboord waar een
// speler op staat, net zo solide als een autodak (player.js). Alleen de bootjes
// met een dicht dek; een kano, kajak, sup of roeishell heeft geen dek om op te
// staan en een binnenvaartschip, zeeschip of sleper ligt te hoog om er vanaf de
// kade of uit het water op te komen: die staan er niet in (null).
export const BOAT_DECK = {
  sloep: 0.36, sloepCabin: 0.36,  // (een sloep met een stuurhut heeft hetzelfde dek)
  rondvaart: 0.42, rubberboot: 0.32, dinghy: 0.24, waterfiets: 0.3,
};
export function boatDeck(kind) {
  return Object.prototype.hasOwnProperty.call(BOAT_DECK, kind) ? BOAT_DECK[kind] : null;
}
// a walker stands in water up to this deep (wades); deeper, he swims
export const WADE_MAX = 1.2;
// The shipping waterways of the province by name (CEMT class III and up: barges
// of 4.2 m air draft sail them). The map cuts a canal into strips whose width
// (2 A / P) says 'diep', so nav alone keeps a barge in the city: a polygon with
// one of these names is a canal of class 4 (vaarnet.js, scripts/world/vaarnet.mjs).
export const MAIN_WATERWAYS = /^(Eemskanaal|Van Starkenborghkanaal|Winschoterdiep|Noord-Willemskanaal|Reitdiep|Lauwers)/;
export function promoteMainWaterway(poly) {
  if (!poly || poly.nav === undefined || poly.nav < 3 || poly.nav >= 4 || !poly.name || !MAIN_WATERWAYS.test(poly.name)) return false;
  poly.nav = 4;
  if (poly.kind === 'diep') { poly.kind = 'kanaal'; poly.dp = WATER_KINDS.kanaal.depth; }
  return true;
}
// Waterway class per water (#234): where a boat kind belongs. 'hoofd' the main waterways
// (shipping canals, rivers, the sea and the great lakes: nav 4 and wide enough for a
// barge), 'haven' a harbour basin that takes a barge, 'klein' everything else (diepen,
// vaarten, ditches, ponds, city canals): sloepen, tour boats and paddlers, no barge. Inland
// shipping (class 4) spawns and sails on hoofd and haven only.
export const BARGE_MIN_WIDTH = 24;   // m, mean channel width (2 A / P) of the water a barge belongs on
export const BARGE_MIN_CLEAR = 8;    // m of open water round a barge's spawn or wander spot (beam 6.6 m plus room)
export const SMALL_WATER = /sloot|greppel|wetering|leidijk|beek|spui|droogmakerij/i;
export function meanWidth(poly) {
  if (poly._meanW === undefined) poly._meanW = 2 * polyArea(poly.pts) / (polyPerimeter(poly.pts) || 1);
  return poly._meanW;
}
export function waterwayClass(poly) {
  if (!poly) return 'klein';
  const nav = poly.nav ?? (WATER_KINDS[poly.kind] || WATER_KINDS.diep).nav, w = poly.pts ? meanWidth(poly) : Infinity;
  if (poly.kind === 'sloot' || poly.kind === 'vijver' || poly.kind === 'vaart' || nav < 3) return 'klein';
  if (poly.name && SMALL_WATER.test(poly.name)) return 'klein';
  // a canal drawn in strips: a strip of a named main waterway is narrow by itself; the room round the boat (BARGE_MIN_CLEAR) judges its real width
  const named = !!poly.name && (MAIN_WATERWAYS.test(poly.name) || SHIPPING_NAMES.test(poly.name));
  if (w < BARGE_MIN_WIDTH && !(named && nav >= 4)) return 'klein';
  if (nav >= 4) return 'hoofd';
  return poly.name && /haven|dok\b/i.test(poly.name) ? 'haven' : 'klein';
}
export const bargeWater = (poly) => { const c = waterwayClass(poly); return c === 'hoofd' || c === 'haven'; };
// the same by what waterAt returns (no width there): a ditch or vaart is never barge water. A pond
// is left out on purpose: the city map draws pond polygons over canals the province data has (#234).
export const bargeWaterAt = (w) => !!w && w.kind !== 'sloot' && w.kind !== 'vaart' && w.navigable >= 3;
// the deck of a city bridge: its top at the road, its soffit this far below
export const BRIDGE_DECK_T = 0.5;
// The clearance (m above the water) of a fixed bridge over a shipping waterway of the province (MAIN_WATERWAYS: the Eemskanaal,
// the Van Starkenborghkanaal ...). AANNAME (#295): the map holds no deck heights for the province's bridges; CEMT class IV asks for
// 5,25 m and the barge of the game (4,2 m) clears that with room to spare. province_profile.mjs gives such a bridge a deck this high.
export const SHIPPING_CLEAR = 5.25;

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
export { inPolygon };
function boundsOf(P) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of P) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
  return [x0, y0, x1, y1];
}

// inPolygon for large polygons that never change (water): the edges
// are bucketed by height bands once, a test only walks the band of py.
// Same crossing rule, so the same answer.
const pipBands = new WeakMap();
function bandsOf(poly) {
  let B = pipBands.get(poly);
  if (B) return B;
  const n = poly.length;
  let y0 = Infinity, y1 = -Infinity;
  for (const p of poly) { if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; }
  const nb = Math.max(1, Math.min(4096, n >> 2));
  const bh = (y1 - y0) / nb || 1;
  const lists = Array.from({ length: nb }, () => []);
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const a = poly[i][1], b = poly[j][1];
    const k0 = Math.max(0, Math.min(nb - 1, Math.floor((Math.min(a, b) - y0) / bh)));
    const k1 = Math.max(0, Math.min(nb - 1, Math.floor((Math.max(a, b) - y0) / bh)));
    for (let k = k0; k <= k1; k++) lists[k].push(i, j);
  }
  B = { y0, y1, bh, nb, lists };
  pipBands.set(poly, B);
  return B;
}
export function pointInStaticPolygon(px, py, poly) {
  if (poly.length < 48) return inPolygon(px, py, poly);
  const B = bandsOf(poly);
  if (py < B.y0 || py >= B.y1) return false;
  const L = B.lists[Math.max(0, Math.min(B.nb - 1, Math.floor((py - B.y0) / B.bh)))];
  let inside = false;
  for (let e = 0; e < L.length; e += 2) {
    const pi = poly[L[e]], pj = poly[L[e + 1]];
    const xi = pi[0], yi = pi[1], xj = pj[0], yj = pj[1];
    if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
}

// The water polygon holding (x, y), or null: the one lookup behind waterAt,
// isInWater, inMapWater, overOpenWater and the waterPoly of a boat (the water rule, #101).
//   z (absolute height of whoever asks, optional): over the water on a viaduct (z > 1.5) or
//     below it in an aqueduct (z < -3 where map.coveredAt) is dry. Without z there is no height rule.
//   opts.bridgeDry: a bridge deck at (x, y) makes it dry (map.isOnBridge). The walker's and the
//     car's rule; a swimmer under a bridge, a boat and the plain polygon test leave it off.
export const BRIDGE_DRY = Object.freeze({ bridgeDry: true });
export function waterPolyAt(map, x, y, z, opts) {
  if (!map.waterNear) return null;
  const poly = waterPolyIn(map.waterNear(x, y, 0.5), x, y);
  if (!poly) return null;
  if (z < -3 && map.coveredAt && map.coveredAt(x, y)) return null;
  if (z > 1.5) return null;
  if (opts && opts.bridgeDry && map.isOnBridge && map.isOnBridge(x, y)) return null;
  return poly;
}
// Is there water within r of (x, y), in the map's water grid (cells, not an exact distance): a gull,
// a police boat or a pigeon looks for water round the player; not "is this point wet" (waterAt).
export function waterNearby(map, x, y, r) {
  return !!map.waterNear && map.waterNear(x, y, r).length > 0;
}
// the same test over a list got once (a road's whole run: mapdata.js markDryRoad)
export function waterPolyIn(polys, x, y) {
  for (const w of polys) {
    const b = w.bounds || (w.bounds = boundsOf(w.pts));
    if (x < b[0] || x > b[2] || y < b[1] || y > b[3]) continue;
    if (pointInStaticPolygon(x, y, w.pts)) return w;
  }
  return null;
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
export function waterBodies(water, touch = 1.0, apart = null) {
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
        if (j === i || find(i) === find(j) || (apart && (apart.has(i) || apart.has(j)))) continue;
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

// The grid cells (index into g.dist) whose centre lies in the polygon P, by the same scanline as waterGrid.
export function cellsOf(g, P, fn) {
  const { W, H, x0, y0, cell } = g, b = boundsOf(P);
  for (let gy = Math.max(0, Math.floor((b[1] - y0) / cell)); gy <= Math.min(H - 1, Math.ceil((b[3] - y0) / cell)); gy++) {
    const y = y0 + (gy + 0.5) * cell, xs = [];
    for (let k = 0, j = P.length - 1; k < P.length; j = k++) if ((P[k][1] > y) !== (P[j][1] > y)) xs.push(P[k][0] + ((P[j][0] - P[k][0]) * (y - P[k][1])) / (P[j][1] - P[k][1]));
    xs.sort((a, c) => a - c);
    for (let q = 0; q + 1 < xs.length; q += 2) {
      for (let gx = Math.max(0, Math.ceil((xs[q] - x0) / cell - 0.5)); gx <= Math.min(W - 1, Math.floor((xs[q + 1] - x0) / cell - 0.5)); gx++) fn(gy * W + gx);
    }
  }
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
// focus(x, y): the boezem is the body with most water where focus holds (the city's tiles), not the largest of all
// A small pond is only laid at street level where no road crosses it or runs beside it, and no bridge spans it
// (POND_ROAD_CLEAR): at street level under a bridge or over a crossing the road's water check and the deck break
// (the story test's water crossings, #327). Roads: the rows with pts, cat and bridge; foot paths count only as a bridge.
export const POND_ROAD_CLEAR = 15;
export function pondAwayFromRoads(roads) {
  const cell = 64, grid = new Map();
  const add = (k, r) => { const l = grid.get(k); if (l) l.push(r); else grid.set(k, [r]); };
  for (const r of roads) {
    if (r.cat === 'foot' && !r.bridge) continue;
    const b = boundsOf(r.pts);
    for (let x = Math.floor((b[0] - POND_ROAD_CLEAR) / cell); x <= Math.floor((b[2] + POND_ROAD_CLEAR) / cell); x++) for (let y = Math.floor((b[1] - POND_ROAD_CLEAR) / cell); y <= Math.floor((b[3] + POND_ROAD_CLEAR) / cell); y++) add(`${x},${y}`, r);
  }
  return (w) => {
    const b = boundsOf(w.pts), seen = new Set();
    for (let x = Math.floor((b[0] - POND_ROAD_CLEAR) / cell); x <= Math.floor((b[2] + POND_ROAD_CLEAR) / cell); x++) for (let y = Math.floor((b[1] - POND_ROAD_CLEAR) / cell); y <= Math.floor((b[3] + POND_ROAD_CLEAR) / cell); y++) {
      for (const r of grid.get(`${x},${y}`) || []) {
        if (seen.has(r)) continue;
        seen.add(r);
        for (let i = 0; i < r.pts.length - 1; i++) {
          const a = r.pts[i], c = r.pts[i + 1];
          if (Math.max(a[0], c[0]) < b[0] - POND_ROAD_CLEAR || Math.min(a[0], c[0]) > b[2] + POND_ROAD_CLEAR || Math.max(a[1], c[1]) < b[1] - POND_ROAD_CLEAR || Math.min(a[1], c[1]) > b[3] + POND_ROAD_CLEAR) continue;
          if (inPolygon(a[0], a[1], w.pts) || distToOutline(w.pts, a[0], a[1]) < POND_ROAD_CLEAR || distToOutline(w.pts, c[0], c[1]) < POND_ROAD_CLEAR) return false;
          // a long segment that passes beside the pond: sample along it
          const L = Math.hypot(c[0] - a[0], c[1] - a[1]);
          for (let t = 4; t < L; t += 4) { const x0 = a[0] + (c[0] - a[0]) * t / L, y0 = a[1] + (c[1] - a[1]) * t / L; if (inPolygon(x0, y0, w.pts) || distToOutline(w.pts, x0, y0) < POND_ROAD_CLEAR) return false; }
        }
      }
    }
    return true;
  };
}
export function annotateWater(water, cell = 2.5, apart = null, focus = null, pondOk = null) {
  const { body, count } = waterBodies(water, 1.0, apart);
  // channel width per polygon from each body's distance field
  const width = new Float64Array(water.length);
  const lists = Array.from({ length: count }, () => []);
  water.forEach((_, i) => lists[body[i]].push(i));
  for (const list of lists) {
    const g = waterGrid(water, list, cell);
    // the grid is a cell coarse: in narrow water the exact distance to the
    // body's shore (edges shared by two polygons are no shore)
    let idx = null;
    // (a cell the grid holds for the last polygon over it is every polygon's own: a ribbon laid over a canal
    // polygon would take the polygon's widest cells, and its width would fall to a ditch's. One distance per cell.)
    const dOf = new Map();
    const distAt = (k) => {
      let d = g.dist[k];
      if (d < 3 * cell) {
        let v = dOf.get(k);
        if (v === undefined) {
          if (!idx) idx = createWaterIndex(list.map((i) => water[i]));
          const cx = k % g.W, cy = (k - cx) / g.W;
          v = idx.nearestShore(g.x0 + (cx + 0.5) * cell, g.y0 + (cy + 0.5) * cell, 4 * cell).d;
          dOf.set(k, v);
        }
        d = v;
      }
      return d;
    };
    for (const i of list) cellsOf(g, water[i].pts, (k) => { const d = distAt(k); if (2 * d > width[i]) width[i] = 2 * d; });
  }
  // a polygon too thin for a cell centre: its own width
  water.forEach((w, i) => { if (!width[i]) width[i] = 2 * polyArea(w.pts) / (polyPerimeter(w.pts) || 1); });
  const area = new Float64Array(count);
  water.forEach((w, i) => { area[body[i]] += polyArea(w.pts); });
  let score = area;
  if (focus) {
    score = new Float64Array(count);
    water.forEach((w, i) => { const c = polyCentre(w.pts); if (focus(c[0], c[1])) score[body[i]] += polyArea(w.pts); });
  }
  let boezem = 0;
  for (let b = 1; b < count; b++) if (score[b] > score[boezem]) boezem = b;
  const rank = { sloot: 0, vijver: 1, vaart: 2, diep: 3, meer: 3.5, kanaal: 4 };
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
    // a small pond that hangs on no canal (a basin on a square, a pool in a garden) is not the boezem: at the canal's
    // level (2.3 m under the street) it was a pit the size of a house on the Grote Markt (#327), so it lies at street level
    if (kind === 'vijver' && !b.boezem && b.area < SMALL_POND_AREA && (!pondOk || pondOk(w))) { w.lv = SMALL_POND_LEVEL; w.dp = SMALL_POND_DEPTH; }
    b.polys.push(i);
    if (rank[kind] > rank[b.kind]) b.kind = kind;
    b.nav = Math.max(b.nav, K.nav);
  });
  for (const b of bodies) b.level = water[b.polys[0]].lv;
  return bodies;
}

// Province water (docs/PROVINCIE-PLAN.md 2.11): one row per mapped water
// polygon, with no body graph (a body can span packs): kind from the row's
// own width (2 A / P) and name, then the same lv, dp and nav fields as the
// city water, so waterAt, boats, swimmers and the heli read it alike. A wide
// or large polygon counts as open water (the boezem's rule), a narrow one
// with a ditch name is a sloot.
// the polygons (indexes) a lock sits in
function lockChambers(rows, locks) {
  const chambers = new Set();
  rows.forEach((w, i) => {
    const b = boundsOf(w.pts);
    for (const k of locks) {
      if (k.x < b[0] - 8 || k.x > b[2] + 8 || k.y < b[1] - 8 || k.y > b[3] + 8) continue;
      if (inPolygon(k.x, k.y, w.pts) || distToOutline(w.pts, k.x, k.y) < LOCK_NEAR) { chambers.add(i); break; }
    }
  });
  return chambers;
}

// The city profile of the province build (#90 phase 3): the water of the city's tiles is classified as
// the city map does (annotateWater: the channel width from each body's distance field, the largest body is
// the boezem), not polygon by polygon, so a canal mapped in pieces is still a kanaal. Same fields as
// annotateProvinceWater; a lock chamber is flagged `lock` but does not split the body (the city has one
// boezem); `focus(x, y)` says where the city is, so its water is the boezem and not a lake of the pack.
// `base` offsets the body ids.
// A strip of a mapped canal (its centre line drawn 14 m wide) that lies wholly in a shipping canal's polygon is
// part of that canal, as it was where the city map had them as one polygon (the arms of the Diepenring: Turfsingel,
// Schuitendiep, Spilsluizen): it takes the polygon's kind, depth and class. Only a diep or vaart strip, only
// where OVER_CANAL of its samples lie in kanaal polygons.
const OVER_CANAL = 0.9;
function laidOverCanal(water) {
  const canals = water.filter((w) => w.nav === 4 && w.kind === 'kanaal').map((w) => ({ w, b: w.bounds || (w.bounds = boundsOf(w.pts)) }));
  if (!canals.length) return 0;
  let n = 0;
  for (const w of water) {
    if (w.kind !== 'diep' && w.kind !== 'vaart') continue;
    const A = polyArea(w.pts);
    if (A > 60000) continue;
    const b = w.bounds || (w.bounds = boundsOf(w.pts));
    const near = canals.filter((c) => c.b[0] <= b[2] && c.b[2] >= b[0] && c.b[1] <= b[3] && c.b[3] >= b[1]);
    if (!near.length) continue;
    const step = Math.max(4, Math.sqrt(A / 60));
    let all = 0, hit = 0;
    for (let y = b[1] + step / 2; y < b[3]; y += step) for (let x = b[0] + step / 2; x < b[2]; x += step) {
      if (!inPolygon(x, y, w.pts)) continue;
      all++;
      if (near.some((c) => x >= c.b[0] && x <= c.b[2] && y >= c.b[1] && y <= c.b[3] && pointInStaticPolygon(x, y, c.w.pts))) hit++;
    }
    if (all >= 3 && hit >= OVER_CANAL * all) { w.kind = 'kanaal'; w.dp = WATER_KINDS.kanaal.depth; w.nav = WATER_KINDS.kanaal.nav; n++; }
  }
  return n;
}
const polySig = (w) => { const P = w.pts, m = P[P.length >> 1], l = P[P.length - 1]; return `${P.length}|${P[0]}|${m}|${l}|${w.name || ''}`; };
export function annotateCityWater(rows, { base = 0, village = null, locks = [], focus = null, roads = null } = {}) {
  const chambers = lockChambers(rows, locks);
  rows.forEach((w, i) => { if (chambers.has(i)) w.lock = true; });
  // The same polygon comes from every pack that holds it (a canal over a pack's edge): classified once, as the
  // old city map had it once, else the copies lay over each other and a copy could lose its widest cells to another.
  const seen = new Map(), uniq = [], of = rows.map((w) => {
    const k = polySig(w);
    let u = seen.get(k);
    if (u === undefined) { u = uniq.length; seen.set(k, u); uniq.push(w); }
    return u;
  });
  const bodies = annotateWater(uniq, 2.5, null, focus, roads ? pondAwayFromRoads(roads) : null);
  laidOverCanal(uniq);
  rows.forEach((w, i) => {
    const u = uniq[of[i]];
    if (w !== u) { w.body = u.body; w.kind = u.kind; w.lv = u.lv; w.dp = u.dp; w.nav = u.nav; }
  });
  rows.forEach((w) => {
    w.body += base;
    const c = polyCentre(w.pts);
    w.bank = (w.kind === 'kanaal' || w.kind === 'diep' || w.kind === 'vaart') && village && village(c[0], c[1]) ? 'kade' : 'oever';
  });
  return { rows, bodies: bodies.length };
}

export function annotateProvinceWater(rows, { base = 0, village = null, locks = [] } = {}) {
  // A lock splits the water: the polygon with a lock in it (the chamber) joins
  // neither side, so the waters either side of it are bodies of their own and
  // keep their own peil; the chamber is flagged `lock`.
  const chambers = lockChambers(rows, locks);
  // bodies within the rows given (a pack): polygons whose shores touch share a
  // body, its area decides open water (a lake keeps its own peil) and whether
  // a thin sliver is part of a canal
  const { body, count } = waterBodies(rows, 1.0, chambers);
  rows.forEach((w, i) => { if (chambers.has(i)) w.lock = true; });
  const area = new Float64Array(count);
  rows.forEach((w, i) => { area[body[i]] += polyArea(w.pts); });
  rows.forEach((w, i) => {
    const A = polyArea(w.pts), w2 = 2 * A / (polyPerimeter(w.pts) || 1);
    const bodyA = area[body[i]];
    let kind = classifyWater(w, w2 >= KIND_WIDTH.vaart || A > 4000 || bodyA > 20000, w2);
    if (bodyA >= LAKE_AREA && w2 >= LAKE_WIDTH) kind = 'meer';
    const K = WATER_KINDS[kind];
    w.body = base + body[i];
    w.kind = kind;
    w.lv = K.level !== undefined ? K.level : BOEZEM_Y;
    w.dp = K.depth;
    w.nav = K.nav;
    // the great waters inland shipping sails on (#7): wide enough and named for it
    if (w.nav < 4 && w2 >= SHIPPING_WIDTH && SHIPPING_NAMES.test(w.name || '')) { w.nav = 4; w.dp = Math.max(w.dp, WATER_KINDS.kanaal.depth); }
    // quay or natural bank: a canal or haven inside a built-up stretch is walled
    const c = polyCentre(w.pts);
    w.bank = (kind === 'kanaal' || kind === 'diep' || kind === 'vaart') && village && village(c[0], c[1]) ? 'kade' : 'oever';
  });
  return { rows, bodies: count };
}
// the shipping waters of the province by name; narrower than SHIPPING_WIDTH (m) is not sailed by a barge
export const SHIPPING_NAMES = /eemskanaal|starkenborgh|reitdiep|dollard|waddenzee|lauwersmeer|eems|hoendiep|winschoterdiep|noord-willemskanaal/i;
export const SHIPPING_WIDTH = 30;
const LAKE_AREA = 250000, LAKE_WIDTH = 60, LOCK_NEAR = 6;
const polyCentre = (P) => { let x = 0, y = 0; for (const p of P) { x += p[0]; y += p[1]; } return [x / P.length, y / P.length]; };

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

// The one water query for boats, swimmers, the heli, walkers and vehicles (#101):
//   waterAt(map, x, y, z?, opts?) -> null on dry land, else
//   { level, depth, kind, covered, ...: body, navigable, wade, lock, clearanceAbove }
// level: the peil (m relative to street level); depth: below it; kind: WATER_KINDS;
// covered: the water runs under a roof or road here (an aqueduct): a walker above it is dry;
// clearanceAbove: free height to a bridge deck over (x, y) (Infinity when none).
// The rule is waterPolyAt's, which gives the polygon itself (z and opts.bridgeDry, see there); the
// other question a caller has is an option, not a second finder:
//   opts.bridgeDry  a bridge deck over the water makes it dry (walkers, cars; isInWater is this)
//   opts.shallow    only water a vehicle drives through: wadeable, with a peil of its own above the
//                   boezem's (a polder ditch, the shallows of a lake), and dry under a bridge deck
//                   (shallowWater is this)
// Plain waterAt(map, x, y) is the water as it lies: a swimmer under a bridge is in it, a boat sails it.
export function waterAt(map, x, y, z, opts) {
  const shallow = !!(opts && opts.shallow);
  const poly = waterPolyAt(map, x, y, z, shallow ? BRIDGE_DRY : opts);
  if (!poly) return null;
  const kind = poly.kind || 'diep';
  const K = WATER_KINDS[kind] || WATER_KINDS.diep;
  const level = poly.lv ?? BOEZEM_Y, depth = poly.dp ?? K.depth;
  const wade = depth <= WADE_MAX;
  if (shallow && (!wade || level <= BOEZEM_Y)) return null;
  return {
    level, depth, body: poly.body ?? -1, kind, navigable: poly.nav ?? K.nav, wade, lock: !!poly.lock,
    covered: !!(map.coveredAt && map.coveredAt(x, y)),
    clearanceAbove: clearanceOver(map, x, y, level),
  };
}

// Water a vehicle drives through: waded depth and a peil of its own above the
// boezem's (a polder ditch, a shallow of a lake). Deep water sinks it (vehicle.js
// overOpenWater); on a bridge it is dry. null elsewhere.
const SHALLOW = Object.freeze({ shallow: true });
export const shallowWater = (map, x, y) => waterAt(map, x, y, undefined, SHALLOW);

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
