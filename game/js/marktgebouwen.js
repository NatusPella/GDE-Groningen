import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { GeoBuilder } from './pixelart3d.js';
import { LANDMARK_MATERIALS, LM, hasLandmarkModel } from './landmarks3d.js';
import { glassMaterial, paneUV, PANE_HOME, PANE_SHOP } from './interiorglass.js';
import { pointInPolygon } from './util.js';

// The buildings round the Grote Markt and the Vismarkt (docs/markt-gebouwen.md).
// Two kinds:
// - 'model': a building of its own (Korenbeurs, Groot Handelshuis,
//   Calmershuis), drawn like the landmarks with LANDMARK_MATERIALS.
// - 'facade': the historic-centre treatment for the ordinary buildings
//   fronting both squares and the first block of the streets into them. Each
//   street frontage is split into plots of 5-9 m with their own gable type,
//   colour, eave height, sash windows and shopfront. Seeded per building,
//   built once and cached like any building part; shared materials only, so
//   staticbatch3d.js merges them per cell.
// Everything stays inside the footprint below head height: collision is
// unchanged. Plot facades rise 0.3-2 m above the body (b.h storeys), the
// roofs and gables behind them sit on its flat top.

const LEVEL = 3.1;
// landmarks3d.js and this module meet in an import cycle: LM is read on the
// first call (lmReady), never while the modules load.
let G, C, MARKT_FACADE_MATERIALS;
const F_PLAIN = 0, F_GLASS = 1, F_BRICK = 2, F_METAL = 3, F_TILE = 4;
function lmReady() {
  if (G) return;
  ({ G, C } = LM);
  MARKT_FACADE_MATERIALS = [LANDMARK_MATERIALS[G.PLAIN], glassMaterial, LANDMARK_MATERIALS[G.BRICK], LANDMARK_MATERIALS[G.METAL], LANDMARK_MATERIALS[G.TILE]];
}

// --- where -------------------------------------------------------------------------

// The open squares (map metres, x east, y south), traced from the map.
const SQUARES = [
  [[152, 38], [216, 40], [229, 70], [240, 102], [196, 128], [150, 162]],
  [[20, 62], [117, 47], [152, 38], [152, 86], [99, 79], [40, 101], [20, 112]],
  [[-80, 255], [10, 214], [60, 186], [86, 198], [66, 238], [-6, 283], [-78, 303]],
];
const FRONT_DIST = 32;
// Natalini's Waagstraat complex: the block between Guldenstraat, Grote Markt,
// Waagstraat and Tussen Beide Markten, the town-hall wing south of the
// Stadhuis and the small block at the Herestraat.
const NATALINI = [[36, 98], [99, 76], [123, 139], [128, 170], [110, 180], [72, 179], [19, 97]];
// Postwar north wall of the Grote Markt (burnt April 1945, rebuilt 1950s).
const POSTWAR = [[20, -10], [215, -10], [216, 44], [117, 52], [20, 66]];

function polyDist(x, y, poly) {
  if (pointInPolygon(x, y, poly)) return 0;
  let best = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy)));
    best = Math.min(best, Math.hypot(x - a[0] - dx * t, y - a[1] - dy * t));
  }
  return best;
}
const squareDist = (x, y) => Math.min(...SQUARES.map((p) => polyDist(x, y, p)));

const MODELS = {
  Korenbeurs: (B, b, ring, edges) => korenbeurs(B, ring, edges),
  'Het Groot Handelshuis': (B, b, ring, edges) => grootHandelshuis(B, b, ring, edges),
  Calmershuis: (B, b, ring, edges) => calmershuis(B, ring, edges),
  'Kiosk Grote Markt': (B, b, ring) => kiosk(B, ring),
  'Van Gend & Loos': (B, b, ring, edges) => vanGendLoos(B, b, ring, edges),
  'Mutua Fides': (B, b, ring, edges) => mutuaFides(B, b, ring, edges),
  Merckt: (B, b, ring, edges) => merckt(B, b, ring, edges),
};
const NO_FACADE = new Set(['church', 'cathedral', 'industrial', 'shed', 'garage', 'garages', 'houseboat', 'roof', 'kiosk', 'carport', 'service', 'construction']);

function centroidOf(b) {
  const [minx, miny, maxx, maxy] = b.bounds;
  return [(minx + maxx) / 2, (miny + maxy) / 2];
}

// 'model' | 'facade' | null, cached on the building.
export function marktKind(b) {
  lmReady();
  if (b._marktKind !== undefined) return b._marktKind;
  let k = null;
  if (b.name && MODELS[b.name]) k = 'model';
  else if (b.markt) k = 'facade';
  else if (!b.landmark && !hasLandmarkModel(b) && b.bounds && !NO_FACADE.has(b.type) && b.pts && b.pts.length >= 3) {
    const [cx, cy] = centroidOf(b);
    if (squareDist(cx, cy) < 60) {
      const n = b.pts.length;
      for (let i = 0; i < n && !k; i++) {
        const a = b.pts[i], c = b.pts[(i + 1) % n];
        if (Math.hypot(c[0] - a[0], c[1] - a[1]) >= 3 && squareDist((a[0] + c[0]) / 2, (a[1] + c[1]) / 2) < FRONT_DIST) k = 'facade';
      }
    }
  }
  return (b._marktKind = k);
}

// --- small helpers -----------------------------------------------------------------

function hash2(x, y) {
  const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return h - Math.floor(h);
}
function rngOf(seed) {
  let s = Math.floor(seed * 2147483646) + 1;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}
const pick = (r, list) => list[Math.floor(r() * list.length) % list.length];
function shade(hex, f) {
  const r = Math.min(255, Math.round(((hex >> 16) & 0xff) * f));
  const g = Math.min(255, Math.round(((hex >> 8) & 0xff) * f));
  const b = Math.min(255, Math.round((hex & 0xff) * f));
  return (r << 16) | (g << 8) | b;
}

// Edge-local frame (models3d edge format): s along, y up, d outward.
const wp = (e, s, y, d) => [e.ax + e.tx * s + e.nx * d, y, e.ay + e.ty * s + e.ny * d];
function fq(B, e, s0, s1, y0, y1, d, c, g = F_PLAIN, uvs = null) {
  B.quadOut(wp(e, s0, y0, d), wp(e, s1, y0, d), wp(e, s1, y1, d), wp(e, s0, y1, d), [e.nx, 0, e.ny], c, g, uvs);
}
const FR = 1, TOP = 2, BOT = 4, SIDES = 8, BACK = 16;
function fbx(B, e, s0, s1, y0, y1, d0, d1, c, g = F_PLAIN, faces = FR | TOP | SIDES) {
  const n = [e.nx, 0, e.ny], t = [e.tx, 0, e.ty];
  if (faces & FR) B.quadOut(wp(e, s0, y0, d1), wp(e, s1, y0, d1), wp(e, s1, y1, d1), wp(e, s0, y1, d1), n, c, g);
  if (faces & TOP) B.quadOut(wp(e, s0, y1, d0), wp(e, s1, y1, d0), wp(e, s1, y1, d1), wp(e, s0, y1, d1), [0, 1, 0], c, g);
  if (faces & BOT) B.quadOut(wp(e, s0, y0, d0), wp(e, s1, y0, d0), wp(e, s1, y0, d1), wp(e, s0, y0, d1), [0, -1, 0], c, g);
  if (faces & BACK) B.quadOut(wp(e, s1, y0, d0), wp(e, s0, y0, d0), wp(e, s0, y1, d0), wp(e, s1, y1, d0), [-n[0], 0, -n[2]], c, g);
  if (faces & SIDES) {
    B.quadOut(wp(e, s0, y0, d0), wp(e, s0, y0, d1), wp(e, s0, y1, d1), wp(e, s0, y1, d0), [-t[0], 0, -t[2]], c, g);
    B.quadOut(wp(e, s1, y0, d0), wp(e, s1, y0, d1), wp(e, s1, y1, d1), wp(e, s1, y1, d0), t, c, g);
  }
}
const pane = (e, rank, kind, w, h, bay = 0) => paneUV(rank, kind, w, h, e.tx, e.ty, e.nx, e.ny, bay);

// How far the footprint runs inward behind s on edge e (m, capped).
function inwardDepth(ring, e, s, cap = 16) {
  for (let d = 0.8; d <= cap; d += 0.6) {
    const x = e.ax + e.tx * s - e.nx * d, y = e.ay + e.ty * s - e.ny * d;
    if (!pointInPolygon(x, y, ring)) return d - 0.6;
  }
  return cap;
}

// --- palette -----------------------------------------------------------------------

const BRICK = [0x8e3b2c, 0x9c4632, 0x7d3326, 0xa65a3f, 0x6e2f25, 0x94412f];
const PLASTER = [0xece5d3, 0xf3efe4, 0xe0d6bc, 0xdcd9d0, 0xe8dab4, 0xd8cfbb];
const PAINTED = [0x3e5b4a, 0x6b6f72, 0x34414b, 0x8b8577];
const POSTWAR_BRICK = [0x8a4a36, 0x9a6a4e, 0x7a4a3a, 0xa7825e, 0x6f5143];
const NATALINI_BRICK = [0xa64b3a, 0x9a4436, 0xb25a40, 0x8f4133];
const TILES = [0x8a4b3a, 0x40454d, 0x565a62, 0x74402f, 0x3a3d44];
const STONE = 0xd9ccae, WHITE = 0xf2efe6, CORNICE = 0xeae6dc;
const SIGNS = [0x2f4a3a, 0x5a1f22, 0x1f2a3a, 0x232323, 0x7a5a2a, 0x3a3a3c];
const AWNINGS = [0x2f5a3a, 0x7a2424, 0x24386a, 0x8a6a2a, 0x3a3a3c, 0x5a2a3a];
const GLASS = 0x2c3a44;

// --- plot kinds --------------------------------------------------------------------

// Weighted plot kinds per setting.
const MIX = {
  historic: [['lijst', 30], ['lijstFlat', 18], ['trap', 15], ['klok', 13], ['tuit', 7], ['shop1900', 10], ['postwar', 7]],
  postwar: [['postwar', 70], ['postwarGable', 22], ['lijstFlat', 8]],
  natalini: [['natalini', 60], ['nataliniGable', 40]],
};
function mixPick(r, mix) {
  const tot = mix.reduce((s, m) => s + m[1], 0);
  let x = r() * tot;
  for (const [k, w] of mix) if ((x -= w) < 0) return k;
  return mix[0][0];
}
const GABLED = new Set(['trap', 'klok', 'tuit', 'postwarGable', 'nataliniGable']);

function plotStyle(kind, r) {
  const S = { kind, frame: WHITE, sill: STONE, trim: CORNICE, lintel: null, arch: false, g: F_PLAIN, tile: pick(r, TILES), bars: true };
  if (kind === 'postwar' || kind === 'postwarGable') {
    S.wall = pick(r, POSTWAR_BRICK); S.g = F_BRICK; S.frame = r() < 0.5 ? 0xd8d4c8 : 0x3a3a3a; S.sill = 0xc8c4ba; S.bars = false;
  } else if (kind === 'natalini' || kind === 'nataliniGable') {
    S.wall = pick(r, NATALINI_BRICK); S.g = F_BRICK; S.lintel = 0xe2d8c0; S.arch = true; S.sill = 0xe2d8c0; S.trim = 0xe2d8c0;
    S.tile = 0x6f9a86;
  } else if (kind === 'shop1900') {
    S.wall = pick(r, BRICK); S.g = F_BRICK; S.lintel = STONE; S.arch = r() < 0.6;
  } else {
    const x = r();
    if (kind === 'lijstFlat' || (kind === 'lijst' && x < 0.6) || (kind === 'klok' && x < 0.35)) S.wall = r() < 0.12 ? pick(r, PAINTED) : pick(r, PLASTER);
    else { S.wall = pick(r, BRICK); S.g = F_BRICK; S.lintel = r() < 0.5 ? STONE : null; S.arch = kind === 'trap' && r() < 0.4; }
    if (S.g === F_PLAIN && r() < 0.15) S.frame = 0x2f4a3a;
  }
  return S;
}

// --- one plot ----------------------------------------------------------------------

function sashWindow(D, e, c, w, y0, y1, S, rank) {
  const f = 0.08;
  fq(D, e, c - w / 2 - f, c + w / 2 + f, y0 - f, y1 + f, 0.03, S.frame);
  fq(D, e, c - w / 2, c + w / 2, y0, y1, 0.045, GLASS, F_GLASS, pane(e, rank, PANE_HOME, w, y1 - y0));
  if (S.bars) {
    const m = y0 + (y1 - y0) * 0.55;
    fq(D, e, c - w / 2, c + w / 2, m - 0.035, m + 0.035, 0.06, S.frame);
    fq(D, e, c - 0.03, c + 0.03, y0, y1, 0.06, S.frame);
  }
  fbx(D, e, c - w / 2 - f - 0.05, c + w / 2 + f + 0.05, y0 - f - 0.08, y0 - f, 0, 0.12, S.sill, F_PLAIN, FR | TOP);
  if (S.lintel) {
    if (S.arch) {
      // segmental arch: a low stone wedge over the frame
      const a = wp(e, c - w / 2 - f - 0.1, y1 + f, 0.025), b = wp(e, c + w / 2 + f + 0.1, y1 + f, 0.025);
      const m = wp(e, c, y1 + f + 0.38, 0.025), ml = wp(e, c - w / 2 - f - 0.1, y1 + f + 0.22, 0.025), mr = wp(e, c + w / 2 + f + 0.1, y1 + f + 0.22, 0.025);
      D.quadOut(a, b, mr, ml, [e.nx, 0, e.ny], S.lintel);
      D.triOut(ml, mr, m, [e.nx, 0, e.ny], S.lintel);
    } else fq(D, e, c - w / 2 - f - 0.06, c + w / 2 + f + 0.06, y1 + f, y1 + f + 0.2, 0.025, S.lintel);
  }
}

function shopfront(D, e, s0, s1, top, S, r) {
  const span = s1 - s0;
  fbx(D, e, s0, s1, 0, 0.35, 0, 0.06, 0x8f8b84, F_PLAIN, FR | TOP);
  const frameC = r() < 0.5 ? 0x2a2b2d : WHITE;
  fbx(D, e, s0, s1, 0.35, top, 0, 0.025, frameC, F_PLAIN, FR | SIDES);
  const n = Math.max(1, Math.round(span / 2.2));
  const bw = span / n, door = Math.floor(r() * n), rank = r();
  for (let i = 0; i < n; i++) {
    const a = s0 + i * bw + 0.07, b = s0 + (i + 1) * bw - 0.07;
    const y0 = i === door ? 0.06 : 0.42;
    fq(D, e, a, b, y0, top - 0.07, 0.045, GLASS, F_GLASS, pane(e, rank, PANE_SHOP, b - a, top - 0.07 - y0, i));
  }
  const sign = pick(r, SIGNS);
  fbx(D, e, s0, s1, top, top + 0.55, 0, 0.1, sign, F_PLAIN, FR | TOP | BOT | SIDES);
  if (r() < 0.45 && S.kind !== 'postwar') {
    const c = pick(r, AWNINGS);
    const a0 = s0 + 0.1, a1 = s1 - 0.1, ya = top - 0.02, yb = top - 0.65, db = 1.3;
    const up = [e.nx * 0.5, 1, e.ny * 0.5];
    D.quadOut(wp(e, a0, ya, 0.1), wp(e, a1, ya, 0.1), wp(e, a1, yb, db), wp(e, a0, yb, db), up, c);
    const u = 0.03;
    D.quadOut(wp(e, a0, ya - u, 0.1), wp(e, a1, ya - u, 0.1), wp(e, a1, yb - u, db), wp(e, a0, yb - u, db), [-up[0], -1, -up[2]], shade(c, 0.6));
    fq(D, e, a0, a1, yb - 0.25, yb, db, shade(c, 0.9));
  }
}

// Roof parallel to the street behind a cornice (lijstgevel), with a dormer.
function lijstRoof(B, D, e, s0, s1, Ep, Hb, depth, S, r) {
  const dr = Math.max(1.2, Math.min(depth / 2, 4.2)), rise = Math.min(4.6, dr * 1.15);
  const back = Math.min(depth, dr * 2);
  const y1 = Ep + rise;
  const a = 0.25;
  const n = [e.nx, 0, e.ny];
  // hipped (schilddak): the ridge stops short of both ends, tiled hips slope down to them
  const ins = S.hip ? Math.min(dr, (s1 - s0) / 2 - 0.05) : 0;
  B.quadOut(wp(e, s0, Ep, -a), wp(e, s1, Ep, -a), wp(e, s1 - ins, y1, -dr), wp(e, s0 + ins, y1, -dr), [n[0], 1, n[2]], S.tile, F_TILE);
  B.quadOut(wp(e, s0, Ep, -back), wp(e, s1, Ep, -back), wp(e, s1 - ins, y1, -dr), wp(e, s0 + ins, y1, -dr), [-n[0], 1, -n[2]], S.tile, F_TILE);
  for (const s of [s0, s1]) {
    const out = s === s0 ? [-e.tx, 0, -e.ty] : [e.tx, 0, e.ty];
    if (ins) B.triOut(wp(e, s, Ep, -a), wp(e, s, Ep, -back), wp(e, s === s0 ? s0 + ins : s1 - ins, y1, -dr), [out[0], 1, out[2]], S.tile, F_TILE);
    else B.triOut(wp(e, s, Ep, -a), wp(e, s, Ep, -back), wp(e, s, y1, -dr), out, S.wall, S.g);
    if (Ep > Hb + 0.05) B.quadOut(wp(e, s, Hb, 0), wp(e, s, Hb, -back), wp(e, s, Ep, -back), wp(e, s, Ep, 0), out, S.wall, S.g);
  }
  if (Ep > Hb + 0.05) fq(B, e, s0, s1, Hb, Ep, -back, S.wall, S.g);
  const w = s1 - s0;
  if (w >= 3.6 && rise > 2.2) {
    const c = (s0 + s1) / 2, dw = Math.min(1.8, w * 0.32), dy0 = Ep + 0.5, dy1 = dy0 + 1.35, dd = -0.25 - (0.5 / rise) * (dr - 0.25) - 0.3;
    const dorm = r() < 0.6 ? WHITE : 0x3e4449;
    fbx(B, e, c - dw / 2, c + dw / 2, Ep, dy1, -dr + 0.3, dd, dorm, F_PLAIN, FR | SIDES);
    fbx(B, e, c - dw / 2 - 0.1, c + dw / 2 + 0.1, dy1, dy1 + 0.12, -dr + 0.3, dd + 0.12, 0x2e2c2a, F_PLAIN, FR | TOP);
    fq(D, e, c - dw / 2 + 0.2, c + dw / 2 - 0.2, dy0 + 0.1, dy1 - 0.15, dd + 0.02, GLASS, F_GLASS, pane(e, r(), PANE_HOME, dw - 0.4, 1.1));
  }
}

// Ridge at right angles to the street, behind a gable; ends in a plain gable.
function gableRoof(B, e, s0, s1, Ep, Hb, depth, rise, S) {
  const c = (s0 + s1) / 2, a = 0.3, back = Math.max(2, depth);
  const yR = Ep + rise;
  const L0 = wp(e, s0 + 0.05, Ep, -a), R0 = wp(e, s1 - 0.05, Ep, -a), T0 = wp(e, c, yR, -a);
  const L1 = wp(e, s0 + 0.05, Ep, -back), R1 = wp(e, s1 - 0.05, Ep, -back), T1 = wp(e, c, yR, -back);
  B.quadOut(L0, L1, T1, T0, [-e.tx, 1, -e.ty], S.tile, F_TILE);
  B.quadOut(R0, R1, T1, T0, [e.tx, 1, e.ty], S.tile, F_TILE);
  B.triOut(L1, R1, T1, [-e.nx, 0, -e.ny], S.wall, S.g);
  if (Ep > Hb + 0.05) {
    fq(B, e, s0 + 0.05, s1 - 0.05, Hb, Ep, -back, S.wall, S.g);
    for (const s of [s0 + 0.05, s1 - 0.05]) {
      const out = s < c ? [-e.tx, 0, -e.ty] : [e.tx, 0, e.ty];
      B.quadOut(wp(e, s, Hb, 0), wp(e, s, Hb, -back), wp(e, s, Ep, -back), wp(e, s, Ep, 0), out, S.wall, S.g);
    }
  }
}

// Flat block behind a cornice or parapet up to Ep.
function flatTop(B, e, s0, s1, Ep, Hb, depth, S, parapet) {
  const back = Math.max(1.5, depth);
  if (Ep > Hb + 0.05) {
    fq(B, e, s0, s1, Hb, Ep, -back, S.wall, S.g);
    for (const s of [s0, s1]) {
      const out = s === s0 ? [-e.tx, 0, -e.ty] : [e.tx, 0, e.ty];
      B.quadOut(wp(e, s, Hb, 0), wp(e, s, Hb, -back), wp(e, s, Ep, -back), wp(e, s, Ep, 0), out, S.wall, S.g);
    }
  }
  B.quadOut(wp(e, s0, Ep - 0.02, 0), wp(e, s1, Ep - 0.02, 0), wp(e, s1, Ep - 0.02, -back), wp(e, s0, Ep - 0.02, -back), [0, 1, 0], 0x5d5f62);
  if (parapet) fbx(B, e, s0, s1, Ep - 0.02, Ep + parapet, -0.25, 0.02, S.trim, F_PLAIN, FR | TOP | BACK);
}

// Gable silhouettes above Ep, 0.35 m thick, in the wall's own colour.
function gableFront(B, D, e, s0, s1, Ep, S, r) {
  const w = s1 - s0, c = (s0 + s1) / 2, th = 0.35;
  const slab = (a, b, y0, y1, col = S.wall, g = S.g) => fbx(B, e, a, b, y0, y1, -th, 0, col, g, FR | TOP | SIDES | BACK);
  const cope = (a, b, y) => fbx(B, e, a - 0.06, b + 0.06, y, y + 0.14, -th - 0.04, 0.05, S.trim, F_PLAIN, FR | TOP | SIDES);
  let G = 0;
  if (S.kind === 'trap') {
    const n = w > 6.5 ? 4 : 3, sw = w / (2 * n + 1), G0 = Math.min(w * 0.95, 7.2), sh = G0 / (n + 0.6);
    for (let i = 0; i < n; i++) {
      const hw = w / 2 - i * sw, y0 = Ep + i * sh;
      slab(c - hw, c + hw, y0, y0 + sh);
      cope(c - hw, c - hw + sw, y0 + sh);
      cope(c + hw - sw, c + hw, y0 + sh);
    }
    const top = Ep + n * sh;
    slab(c - sw / 2, c + sw / 2, top, top + sh * 0.6);
    cope(c - sw / 2, c + sw / 2, top + sh * 0.6);
    G = n * sh + sh * 0.6;
    if (r() < 0.5) {
      const [x, z] = wpXZ(e, c, -th / 2);
      LM.cone(B, x, top + sh * 0.6 + 0.14, z, 0.12, 0.9, 4, 0x2e2c2a, F_METAL);
    }
  } else if (S.kind === 'klok') {
    const wn = Math.max(1.6, w * 0.42), hs = Math.min(2.2, w * 0.36), hn = Math.min(2.6, w * 0.45);
    const K = 4;
    for (let i = 0; i < K; i++) {
      const t0 = i / K, t1 = (i + 1) / K;
      const hw = wn / 2 + (w / 2 - wn / 2) * Math.cos((t0 + t1) / 2 * Math.PI / 2);
      slab(c - hw, c + hw, Ep + hs * t0, Ep + hs * t1);
    }
    slab(c - wn / 2, c + wn / 2, Ep + hs, Ep + hs + hn);
    // round (bell) top
    const [x, z] = wpXZ(e, c, -th / 2);
    const rot = Math.atan2(e.ty, e.tx);
    B.geo(new THREE.CylinderGeometry(wn / 2 + 0.1, wn / 2 + 0.1, th + 0.08, 8, 1, false, 0, Math.PI), new THREE.Matrix4().makeRotationY(-rot).multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2)).multiply(new THREE.Matrix4().makeRotationY(Math.PI / 2)).setPosition(x, Ep + hs + hn, z), S.trim, F_PLAIN);
    G = hs + hn + wn / 2;
    for (const sg of [-1, 1]) {
      const [vx, vz] = wpXZ(e, c + sg * (wn / 2 + 0.25), 0.02);
      B.box(vx, Ep + hs + 0.2, vz, 0.5, 0.4, 0.5, S.trim, F_PLAIN, 0, -rot, 0);
    }
  } else {
    // tuit / pitched gable: a triangle with a coping
    G = Math.min(w * 0.8, 6.5);
    const a = wp(e, s0, Ep, 0), b = wp(e, s1, Ep, 0), t = wp(e, c, Ep + G, 0);
    const a2 = wp(e, s0, Ep, -th), b2 = wp(e, s1, Ep, -th), t2 = wp(e, c, Ep + G, -th);
    B.triOut(a, b, t, [e.nx, 0, e.ny], S.wall, S.g);
    B.triOut(a2, b2, t2, [-e.nx, 0, -e.ny], S.wall, S.g);
    for (const sg of [-1, 1]) {
      const p0 = wp(e, c + sg * w / 2, Ep, 0.06), p1 = wp(e, c, Ep + G, 0.06), q0 = wp(e, c + sg * w / 2, Ep, -th - 0.06), q1 = wp(e, c, Ep + G, -th - 0.06);
      B.quadOut(p0, p1, q1, q0, [sg * e.tx, 1, sg * e.ty], S.trim);
    }
  }
  // attic window(s) in the gable
  if (G > 2.4) {
    const ww = Math.min(1.0, w * 0.18);
    sashWindow(D, e, c, ww, Ep + 0.55, Ep + Math.min(1.9, G * 0.42), S, r());
  }
  return G;
}
const wpXZ = (e, s, d) => [e.ax + e.tx * s + e.nx * d, e.ay + e.ty * s + e.ny * d];

function buildPlot(B, D, e, s0, s1, Hb, depth, S, r, shop) {
  const w = s1 - s0, kind = S.kind;
  const gabled = GABLED.has(kind);
  const post = kind === 'postwar' || kind === 'postwarGable';
  const nat = kind === 'natalini' || kind === 'nataliniGable';
  let Ep = S.Ep;
  fq(B, e, s0, s1, 0, Ep, 0, S.wall, S.g);
  // storeys
  const gH = shop ? (nat ? 4.6 : 4.0) : 3.4;
  const nUp = Math.max(1, Math.round((Ep - gH - 0.6) / (post ? 3.0 : 3.25)));
  const fh = (Ep - gH - 0.5) / nUp;
  const n = Math.max(1, Math.floor((w - 0.4) / (post ? 2.4 : 1.85)));
  const bw = w / n;
  const ww = post ? Math.min(1.9, bw - 0.5) : Math.min(1.25, bw - 0.6);
  for (let f = 0; f < nUp; f++) {
    const y = gH + f * fh;
    const top = f === nUp - 1;
    const wh = Math.min(post ? 1.6 : 2.3, fh * (post ? 0.52 : top && !gabled ? 0.55 : 0.64));
    const y0 = y + (fh - wh) * 0.55;
    for (let i = 0; i < n; i++) sashWindow(D, e, s0 + (i + 0.5) * bw, ww, y0, y0 + wh, S, r());
    if (post || nat) fq(B, e, s0, s1, y - 0.12, y + 0.12, 0.02, post ? 0xc8c4ba : 0xe2d8c0);
  }
  if (nat) {
    // speklagen and stone corner strips
    for (let f = 0; f < nUp; f++) fq(B, e, s0, s1, gH + f * fh + fh * 0.5 - 0.1 + 1.0, gH + f * fh + fh * 0.5 + 0.1 + 1.0, 0.018, 0xe2d8c0);
    for (const s of [s0, s1 - 0.55]) fq(B, e, s, s + 0.55, gH, Ep, 0.025, 0xe2d8c0);
    fq(B, e, s0, s1, 0, gH, 0.012, 0xcfc3a5);
  }
  if (shop) shopfront(D, e, s0 + 0.15, s1 - 0.15, gH - 0.7, S, r);
  else {
    const dc = s0 + (r() < 0.5 ? 0.5 : n - 0.5) * bw;
    fq(D, e, dc - 0.5, dc + 0.5, 0.1, 2.3, 0.04, 0x2f3a33);
    fq(D, e, dc - 0.6, dc + 0.6, 0.0, 2.45, 0.025, S.frame);
    for (let i = 0; i < n; i++) {
      const c = s0 + (i + 0.5) * bw;
      if (Math.abs(c - dc) > 0.4) sashWindow(D, e, c, Math.min(1.1, ww), 0.9, 2.6, S, r());
    }
  }
  // cornice / top
  if (gabled) {
    fbx(B, e, s0, s1, Ep - 0.3, Ep, 0, 0.12, S.trim, F_PLAIN, FR | TOP | BOT);
    const G = gableFront(B, D, e, s0, s1, Ep, S, r);
    gableRoof(B, e, s0, s1, Ep, Hb, depth, Math.max(1.2, G - 0.7), S);
  } else if (post) {
    flatTop(B, e, s0, s1, Ep, Hb, Math.min(depth, 3), S, 0.25);
  } else if (kind === 'lijstFlat' || kind === 'shop1900' || kind === 'natalini') {
    fbx(B, e, s0, s1, Ep - 0.55, Ep, 0, 0.42, S.trim, F_PLAIN, FR | TOP | BOT | SIDES);
    if (kind === 'lijstFlat') for (let i = 0; i <= n; i++) fbx(B, e, s0 + i * bw - 0.12 + (i === 0 ? 0.2 : i === n ? -0.2 : 0), s0 + i * bw + 0.12 + (i === 0 ? 0.2 : i === n ? -0.2 : 0), Ep - 1.0, Ep - 0.55, 0, 0.3, S.trim, F_PLAIN, FR | SIDES | BOT);
    flatTop(B, e, s0, s1, Ep, Hb, Math.min(depth, 6), S, kind === 'natalini' ? 0 : 0.7);
  } else {
    fbx(B, e, s0, s1, Ep - 0.5, Ep, 0, 0.38, S.trim, F_PLAIN, FR | TOP | BOT | SIDES);
    if (S.pediment) {
      const c = (s0 + s1) / 2, pw = Math.min(w * 0.45, 5);
      B.triOut(wp(e, c - pw / 2, Ep, 0.2), wp(e, c + pw / 2, Ep, 0.2), wp(e, c, Ep + 1.4, 0.2), [e.nx, 0, e.ny], S.trim);
      B.quadOut(wp(e, c - pw / 2, Ep, 0.2), wp(e, c, Ep + 1.4, 0.2), wp(e, c, Ep + 1.4, -1.2), wp(e, c - pw / 2, Ep, -1.2), [-e.tx, 1, -e.ty], S.tile, F_TILE);
      B.quadOut(wp(e, c + pw / 2, Ep, 0.2), wp(e, c, Ep + 1.4, 0.2), wp(e, c, Ep + 1.4, -1.2), wp(e, c + pw / 2, Ep, -1.2), [e.tx, 1, e.ty], S.tile, F_TILE);
    }
    lijstRoof(B, D, e, s0, s1, Ep, Hb, depth, S, r);
  }
  return Ep;
}

// --- per-building overrides (mapextras.json `markt`) -------------------------------

// plot list for an edge: [{ w (fraction), kind, wall?, Ep? }]
const OVERRIDES = {
  // Grote Markt 36: Hotel De Doelen, klokgevel of 1730 over a double plot
  drieGezusters36: { kinds: ['klok'], wall: 0xf0ebdf, frame: 0x2f4a3a, single: true },
  // Grote Markt 37-38: "Groote Griet", straight cornice
  drieGezusters37: { kinds: ['lijst', 'lijst'], wall: 0xe4e1d8 },
  // Grote Markt 39: 18th-c classical front, cornice with pediment, hipped roof
  drieGezusters39: { kinds: ['lijst'], wall: 0xece2c8, pediment: true, hip: true, single: true },
  // Westcord Market Hotel: stepped gables in pale natural stone
  marketHotel: { kinds: ['trap'], wall: 0xd8cfbd, frame: 0x50555a, width: 7.5 },
  // Grand Theatre (1929)
  grandTheatre: { kinds: ['lijstFlat'], wall: 0xe6dcc4, single: true },
};

// --- the facade treatment ----------------------------------------------------------

function buildFacade(b, ring, edges) {
  const [cx, cy] = centroidOf(b);
  const r = rngOf(hash2(cx * 0.913, cy * 1.137));
  const Hb = Math.max(2.4, b.h * LEVEL);
  const ov = b.markt ? OVERRIDES[b.markt] : null;
  const setting = pointInPolygon(cx, cy, NATALINI) ? 'natalini' : pointInPolygon(cx, cy, POSTWAR) ? 'postwar' : 'historic';
  const shopAll = b.type === 'retail' || b.type === 'commercial' || b.type === 'yes' || b.type === 'hotel';
  const B = new GeoBuilder(5), D = new GeoBuilder(5);
  const base = ov && ov.wall ? ov.wall : setting === 'natalini' ? NATALINI_BRICK[0] : setting === 'postwar' ? POSTWAR_BRICK[0] : pick(r, BRICK);
  const baseG = ov && ov.wallG != null ? ov.wallG : ov && ov.wall ? F_PLAIN : F_BRICK;
  // body: walls not treated as street frontage, flat top
  const front = [];
  for (const e of edges) {
    const mx = e.ax + e.tx * e.len / 2, my = e.ay + e.ty * e.len / 2;
    const isFront = !e.party && e.len >= 3 && (ov || squareDist(mx, my) < FRONT_DIST);
    if (isFront) front.push(e);
    else {
      fq(B, e, 0, e.len, 0, Hb, 0, base, baseG);
      if (e.party && e.len >= 3 && e.partyTop < Hb - 2.2) exposedParty(D, e, Hb, r);
      if (!e.party && e.len >= 3) {
        const n = Math.floor(e.len / 3);
        for (let i = 0; i < n; i++) for (let y = 4; y + 1.6 < Hb; y += 3.1) {
          const c = (i + 0.5) * e.len / n;
          fq(D, e, c - 0.6, c + 0.6, y, y + 1.6, 0.03, WHITE);
          fq(D, e, c - 0.5, c + 0.5, y + 0.1, y + 1.5, 0.045, GLASS, F_GLASS, pane(e, r(), PANE_HOME, 1.0, 1.4));
        }
      }
    }
  }
  LM.cap(B, ring, () => Hb, 0x5d5f62, F_PLAIN);
  for (const e of front) {
    let plots;
    const target = ov && ov.width ? ov.width : setting === 'postwar' ? 11 : 6.6;
    if ((ov && ov.single) || e.len < target * 1.45) plots = [e.len];
    else {
      const n = ov && ov.kinds.length > 1 && !ov.width ? ov.kinds.length : Math.max(1, Math.round(e.len / target));
      const ws = Array.from({ length: n }, () => 0.75 + r() * 0.5);
      const tot = ws.reduce((s, x) => s + x, 0);
      plots = ws.map((x) => (x / tot) * e.len);
    }
    let s = 0, prevKind = null;
    plots.forEach((w, i) => {
      let kind = ov ? ov.kinds[i % ov.kinds.length] : mixPick(r, MIX[setting]);
      if (!ov && kind === prevKind && GABLED.has(kind) && r() < 0.6) kind = mixPick(r, MIX[setting]);
      if (GABLED.has(kind) && w > 9.5) kind = setting === 'historic' ? 'lijst' : setting === 'natalini' ? 'natalini' : 'postwar';
      if (kind === 'klok' && w < 4.2) kind = 'tuit';
      prevKind = kind;
      const S = plotStyle(kind, r);
      if (ov) {
        if (ov.wall) { S.wall = ov.wall; S.g = ov.wallG != null ? ov.wallG : F_PLAIN; }
        if (ov.frame) S.frame = ov.frame;
        if (ov.trim) S.trim = ov.trim;
        if (ov.pediment) S.pediment = true;
        if (ov.hip) S.hip = true;
      }
      const post = kind === 'postwar' || kind === 'postwarGable';
      S.Ep = Hb + (post ? 0.3 : 0.4 + r() * 1.5);
      const depth = Math.min(inwardDepth(ring, e, s + w / 2) - 0.3, 12);
      const shop = shopAll ? r() < 0.92 : r() < 0.4;
      buildPlot(B, D, e, s + 0.02, s + w - 0.02, Hb, Math.max(1.5, depth), S, r, shop);
      // a pilaster strip hides the joint between two plots
      if (i > 0) fq(B, e, s - 0.08, s + 0.08, 0, Math.min(S.Ep, Hb), 0.03, shade(S.wall, 0.82), S.g);
      s += w;
    });
  }
  if (b.markt === 'nataliniTower' && front.length) nataliniTower(B, D, front, Hb, r);
  return { shell: B.build(), detail: D.build() };
}

// The part of a party wall that rises above a lower neighbour faces the
// square: sash windows in storey rows above the neighbour's roof, like the
// side fronts of a corner pand.
function exposedParty(D, e, Hb, r) {
  const S = { frame: WHITE, sill: STONE, bars: true, lintel: null };
  const n = Math.floor((e.len - 1.2) / 2.6);
  if (n < 1) return;
  const bw = (e.len - 1.2) / n;
  for (let y = Math.max(e.partyTop + 0.9, 4.2); y + 1.9 < Hb; y += LEVEL) {
    for (let i = 0; i < n; i++) sashWindow(D, e, 0.6 + (i + 0.5) * bw, 1.1, y, y + 1.65, S, r());
  }
}

// Raised corner volume on Natalini's Grote Markt wing (by the Waagstraat).
function nataliniTower(B, D, front, Hb, r) {
  let e = front[0];
  for (const f of front) if (f.len > e.len) e = f;
  const s1 = e.len - 0.3, s0 = s1 - 5.5;
  const S = { wall: 0xa64b3a, g: F_BRICK, frame: WHITE, sill: 0xe2d8c0, lintel: 0xe2d8c0, arch: true, bars: true, trim: 0xe2d8c0, tile: 0x6f9a86 };
  const top = Hb + 7;
  fbx(B, e, s0, s1, Hb, top, -5.5, 0.05, S.wall, S.g, FR | SIDES | BACK);
  for (let y = Hb + 1.2; y < top - 1; y += 2.6) fq(B, e, s0, s1, y, y + 0.25, 0.07, 0xe2d8c0);
  sashWindow(D, e, (s0 + s1) / 2, 1.2, Hb + 2.4, Hb + 4.8, S, r());
  fbx(B, e, s0 - 0.2, s1 + 0.2, top, top + 0.4, -5.7, 0.25, 0xe2d8c0, F_PLAIN, FR | TOP | SIDES | BACK | BOT);
  const [x, z] = wpXZ(e, (s0 + s1) / 2, -2.7);
  LM.prism(B, new THREE.ConeGeometry(4.2, 3.6, 4, 1, true), x, top + 0.4 + 1.8, z, Math.atan2(e.ty, e.tx) + Math.PI / 4, S.tile, F_METAL);
}

// --- Vismarkt 34: Van Gend & Loos (1911-12, P.M.A. Huurman) ------------------------

// Expedition office with a dwelling, neo-Gothic, in the closed south wall of
// the Vismarkt: three storeys and four bays of red-brown brick with stone
// bands; the east (entrance) bay stands a metre proud. Both the entrance bay
// and the main front end in a stepped gable, a shield-bearing lion on the
// first; the gable tops sit on an arched corbel frieze. Shopfront with a
// wooden canopy on consoles, cross windows on the first floor, round-arched
// ones on the second; a saddle roof of black pantiles behind.
function vanGendLoos(B, b, ring, srcEdges) {
  const { G: g } = LM;
  const brick = 0x8a3f2e, stone = 0xddd2b6, tile = 0x2e3034, frame = 0xece6d8;
  const eave = 9.4;
  const edges = LM.edgesOf(ring, LM.partyTester(srcEdges));
  const front = edges.filter((e) => !e.party && e.len >= 2 && squareDist((e.a[0] + e.b[0]) / 2, (e.a[1] + e.b[1]) / 2) < 8);
  if (!front.length) return false;
  front.sort((p, q) => q.len - p.len);
  const main = front[0];
  // the saddle roof: ridge at right angles to the front
  const F = LM.frameFrom(-main.nx, -main.ny, ring);
  const roof = LM.polyGableRoof(B, ring, F, eave, 4.6, 48, tile, brick);
  const rise = roof.ridge - eave;
  for (const e of front) {
    const bay = e !== main;
    const bays = bay ? 1 : Math.max(1, Math.round(e.len / 2.1));
    const bw = e.len / bays;
    // stone bands, shopfront, canopy on consoles
    LM.ebox(B, e, e.len / 2, 0, e.len, 0.5, 0.08, stone, g.PLAIN, 0);
    LM.ebox(B, e, e.len / 2, 4.0, e.len, 0.3, 0.1, stone, g.PLAIN, 0);
    LM.ebox(B, e, e.len / 2, 6.75, e.len, 0.2, 0.08, stone, g.PLAIN, 0);
    if (bay) {
      LM.ebox(B, e, e.len / 2, 0.1, 1.5, 2.9, 0.08, stone, g.PLAIN, 0.02);
      LM.ebox(B, e, e.len / 2, 0.2, 1.1, 2.6, 0.05, 0x5a3b26, g.PLAIN, 0.08);
      LM.ebox(B, e, e.len / 2, 4.6, 1.1, 1.0, 0.05, C.glass, g.GLASS, 0.03);
    } else {
      LM.ebox(B, e, e.len / 2, 0.5, e.len - 0.6, 3.0, 0.05, 0x3a2c22, g.PLAIN, 0.02);
      LM.ebox(B, e, e.len / 2, 0.6, e.len - 0.9, 2.8, 0.05, C.glass, g.GLASS, 0.05);
      LM.ebox(B, e, e.len / 2, 3.45, e.len - 0.9, 0.4, 0.05, 0xb35a3a, g.GLASS, 0.06);
      LM.ebox(B, e, e.len / 2, 3.55, e.len - 0.2, 0.18, 1.1, 0x4a3324, g.PLAIN, 0.05);
      for (const t of [0.4, e.len - 0.4]) LM.ebox(B, e, t, 3.0, 0.25, 0.55, 0.9, stone, g.PLAIN, 0.05);
    }
    for (let i = 0; i < bays; i++) {
      const t = (i + 0.5) * bw;
      if (!bay) {
        // cross window: white frame, mullion and transom
        LM.ebox(B, e, t, 4.45, 1.3, 2.0, 0.05, frame, g.PLAIN, 0.02);
        LM.ebox(B, e, t, 4.55, 1.1, 1.8, 0.05, C.glass, g.GLASS, 0.05);
        LM.ebox(B, e, t, 4.55, 0.08, 1.8, 0.04, frame, g.PLAIN, 0.09);
        LM.ebox(B, e, t, 5.75, 1.1, 0.08, 0.04, frame, g.PLAIN, 0.09);
      }
      LM.archWindow(B, e, t, 7.05, bay ? 0.9 : 1.15, 1.45, { pointed: false, frame: stone });
    }
    // arched corbel frieze under the gable, then the stepped gable
    const half = e.len / 2, top = bay ? eave + rise * 0.55 : eave + rise + 1.4;
    for (let i = 0; i < Math.max(2, Math.round(e.len / 0.8)); i++) {
      const t = (i + 0.5) * e.len / Math.max(2, Math.round(e.len / 0.8));
      LM.ebox(B, e, t, eave - 0.45, 0.16, 0.35, 0.18, stone, g.PLAIN, 0);
    }
    LM.ebox(B, e, e.len / 2, eave - 0.1, e.len + 0.1, 0.22, 0.24, stone, g.PLAIN, 0);
    const steps = bay ? 3 : 5, sh = (top - eave) / steps;
    for (let k = 0; k < steps; k++) {
      const y0 = eave + k * sh;
      const hw = Math.max(0.45, half * (1 - 0.8 * k / steps) + 0.15);
      LM.ebox(B, e, e.len / 2, y0, hw * 2, sh, 0.4, brick, g.BRICK, bay ? 0 : -0.05);
      LM.ebox(B, e, e.len / 2, y0 + sh, hw * 2 + 0.1, 0.14, 0.5, stone, g.PLAIN, bay ? -0.05 : -0.1);
    }
    if (!bay) {
      // the gable's attic window and the stone tracery strip
      LM.archWindow(B, e, e.len / 2, eave + 0.6, 0.8, 1.2, { pointed: false, frame: stone, out: 0.35 });
    } else {
      // the shield-bearing lion on the entrance gable
      const [x, , z] = LM.W(e.a[0] + e.tx * half + e.nx * 0.2, 0, e.a[1] + e.ty * half + e.ny * 0.2);
      LM.obox(B, x, z, top + 0.14, 0.45, 0.7, 0.55, Math.atan2(e.ty, e.tx), stone, g.PLAIN);
      LM.obox(B, x + e.tx * 0.1, z + e.ty * 0.1, top + 0.65, 0.3, 0.3, 0.35, Math.atan2(e.ty, e.tx), stone, g.PLAIN);
      LM.obox(B, x + e.nx * 0.3, z + e.ny * 0.3, top + 0.3, 0.4, 0.08, 0.5, Math.atan2(e.ty, e.tx), 0xc8a24a, g.METAL);
    }
  }
}

// --- Mutua Fides, sociëteit of Vindicat (De Zwarte Hond, 2012-14) ------------------

// The first building of the new oostwand, on the corner with the
// Martinikerkhof: as tall as the envelope allowed, in ochre-yellow brick
// "between the Martinitoren and the Grand Theatre"; it shows and hides the
// city through few, large, deep-set windows, a balcony on the Grote Markt,
// a closed ground floor with three doors (members, staff, goods) and a
// penthouse on a roof terrace on the sixth floor.
function mutuaFides(B, b, ring, srcEdges) {
  const { G: g } = LM;
  const brick = 0xc79a55, frame = 0x4a3e30, stone = 0xe3d6b8;
  const H = Math.max(12, b.h * LEVEL);
  const edges = LM.edgesOf(ring, LM.partyTester(srcEdges));
  LM.walls(B, ring, 0, () => H, brick, g.BRICK);
  LM.cap(B, ring, () => H, 0x6a6660, g.PLAIN);
  let main = null;
  for (const e of edges) {
    if (e.party || e.len < 3) continue;
    const d = squareDist((e.a[0] + e.b[0]) / 2, (e.a[1] + e.b[1]) / 2);
    if (!main || d < main.d) main = { e, d };
  }
  const floors = Math.max(3, Math.round((H - 4.2) / 3.4));
  const fh = (H - 4.2 - 0.8) / floors;
  edges.forEach((e, ei) => {
    if (e.party || e.len < 3) return;
    const isMain = main && e === main.e;
    // the plinth: brick, a stone base course, a door in the middle of the longer walls
    LM.ebox(B, e, e.len / 2, 0, e.len, 0.45, 0.06, stone, g.PLAIN, 0);
    if (e.len > 9) {
      LM.ebox(B, e, e.len * 0.5, 0, 1.6, 2.8, 0.08, frame, g.METAL, 0.02);
      LM.ebox(B, e, e.len * 0.5, 0.1, 1.3, 2.6, 0.05, 0x2c2a28, g.PLAIN, 0.06);
      // an old gevelsteen re-used beside it
      LM.ebox(B, e, e.len * 0.5 + 1.5, 2.2, 0.6, 0.6, 0.05, stone, g.PLAIN, 0.02);
    }
    // big deep-set windows in an uneven rhythm, two columns kept closed per wall
    const n = Math.max(1, Math.floor(e.len / 3.6));
    const bw = e.len / n;
    for (let f = 0; f < floors; f++) {
      const y = 4.2 + f * fh;
      for (let i = 0; i < n; i++) {
        const h = hash2(ei * 13.1 + i * 3.7, f * 5.3);
        if (h < 0.28) continue;
        const wide = h > 0.78 ? 2.6 : 1.5;
        const t = (i + 0.5) * bw + (hash2(i, ei + f) - 0.5) * 0.6;
        LM.ebox(B, e, t, y + 0.3, wide + 0.3, fh - 0.5, 0.06, frame, g.METAL, 0.01);
        LM.ebox(B, e, t, y + 0.42, wide, fh - 0.74, 0.04, C.glass, g.GLASS, 0.04);
        LM.ebox(B, e, t, y + 0.2, wide + 0.5, 0.14, 0.2, stone, g.PLAIN, 0);
      }
    }
    // the balcony on the Grote Markt: a steel slab with a railing on the first floor
    if (isMain && e.len > 8) {
      const t = e.len / 2, y = 4.2;
      LM.ebox(B, e, t, y - 0.25, 7.2, 0.25, 1.5, 0x3b3833, g.METAL, 0);
      LM.ebox(B, e, t, y, 7.2, 1.05, 0.05, 0x2f2c29, g.METAL, 1.45);
      LM.ebox(B, e, t, y + 0.12, 6.4, fh - 0.4, 0.05, frame, g.METAL, 0.01);
      LM.ebox(B, e, t, y + 0.22, 6.0, fh - 0.6, 0.04, C.glass, g.GLASS, 0.05);
    }
    // a soldier course under the roof edge
    LM.ebox(B, e, e.len / 2, H - 0.35, e.len + 0.04, 0.35, 0.05, shade(brick, 0.88), g.BRICK, 0);
  });
  // the penthouse on the sixth floor, set back from the square behind a roof terrace
  const F = LM.minAreaFrame(ring);
  const su = (F.u1 - F.u0) * 0.45, sv = (F.v1 - F.v0) * 0.45;
  let cu = (F.u0 + F.u1) / 2, cv = (F.v0 + F.v1) / 2;
  if (main) {
    const mu = F.U(main.e.nx, main.e.ny), mv = F.V(main.e.nx, main.e.ny);
    cu -= mu * (F.u1 - F.u0) * 0.15; cv -= mv * (F.v1 - F.v0) * 0.15;
  }
  const [px, pz] = F.P(cu, cv);
  if (pointInPolygon(px, pz, ring)) {
    LM.obox(B, px, pz, H, su, sv, 3.0, F.rot, brick, g.BRICK);
    LM.obox(B, px, pz, H + 0.4, su + 0.06, sv + 0.06, 2.1, F.rot, C.glass, g.GLASS);
    LM.obox(B, px, pz, H + 3.0, su + 0.4, sv + 0.4, 0.25, F.rot, 0x5d5f62, g.PLAIN);
  }
  for (const e of edges) if (!e.party && e.len > 1) LM.ebox(B, e, e.len / 2, H, e.len, 1.1, 0.05, 0x2f2c29, g.METAL, -0.3);
}

// --- Merckt (Powerhouse Company, 2016-19), south-east corner -----------------------

// "A classic facade with a plinth, midsection and crown": a public plinth
// opened up by rows of slender concrete arches (the food market, two
// storeys), a midsection of pale brick of Groningen clay with vertical gold
// lines, and a crown of smaller arches under the roof edge.
function merckt(B, b, ring, srcEdges) {
  const { G: g } = LM;
  const brick = 0xdccbaa, concrete = 0xe9e3d4, gold = 0xc9a24a;
  const H = Math.max(14, b.h * LEVEL), P = 8.0, crown = H - 2.9;
  const edges = LM.edgesOf(ring, LM.partyTester(srcEdges));
  LM.walls(B, ring, 0, () => P, concrete, g.PLAIN);
  LM.walls(B, ring, P, () => crown, brick, g.BRICK);
  LM.walls(B, ring, crown, () => H, concrete, g.PLAIN);
  LM.cap(B, ring, () => H, 0x6a6660, g.PLAIN);
  for (const e of edges) {
    if (e.party || e.len < 2.6) continue;
    // plinth arches, two storeys tall
    for (const t of LM.slots(e.len, 2.7, 0.35)) LM.archWindow(B, e, t, 0.05, 1.9, 6.4, { pointed: false, frame: concrete });
    LM.ebox(B, e, e.len / 2, P - 0.4, e.len + 0.06, 0.4, 0.22, concrete, g.PLAIN, 0);
    // midsection: windows per floor, gold lines between the bays
    const pos = LM.slots(e.len, 2.7, 0.35);
    const floors = Math.max(1, Math.round((crown - P) / 3.0)), fh = (crown - P) / floors;
    for (let f = 0; f < floors; f++) {
      for (const t of pos) {
        LM.ebox(B, e, t, P + f * fh + 0.5, 1.6, fh - 0.8, 0.04, C.glass, g.GLASS, 0.02);
        LM.ebox(B, e, t, P + f * fh + 0.38, 1.8, 0.12, 0.16, concrete, g.PLAIN, 0);
      }
    }
    for (let i = 0; i <= pos.length; i++) {
      const t = i === 0 ? 0.35 : i === pos.length ? e.len - 0.35 : (pos[i - 1] + pos[i]) / 2;
      LM.ebox(B, e, t, P, 0.12, crown - P, 0.14, gold, g.METAL, 0.01);
    }
    // the crown: smaller slender arches, a thin cornice
    for (const t of pos) LM.archWindow(B, e, t, crown + 0.25, 1.2, 1.7, { pointed: false, frame: concrete });
    LM.ebox(B, e, e.len / 2, H - 0.3, e.len + 0.2, 0.3, 0.3, concrete, g.PLAIN, 0);
  }
}

// --- Korenbeurs (1862-65, J.G. van Beusekom) ---------------------------------------

// Square front building facing east down the Vismarkt: red brick, stone
// Corinthian portico of four columns under a pediment with Mercurius on top,
// Neptunus and Ceres in niches either side; behind it the long exchange hall
// with a glass roof, ending in a half round towards the A-kerk.
function korenbeurs(B, ring, srcEdges) {
  const { G: g } = LM;
  const F = LM.minAreaFrame(ring);
  // front = the u end nearer the Vismarkt (east)
  const east = F.P(F.u1, (F.v0 + F.v1) / 2)[0] > F.P(F.u0, (F.v0 + F.v1) / 2)[0];
  const uF = east ? F.u1 : F.u0, dir = east ? 1 : -1;
  const vm = (F.v0 + F.v1) / 2, half = (F.v1 - F.v0) / 2;
  const hallEave = 9.5, frontEave = 12.5, frontDepth = 14;
  const brick = 0x9a4634, stone = 0xe0d5bb;
  // hall: walls to the eave, a glazed pitched roof (planar per half)
  const k = Math.min(Math.tan(28 * Math.PI / 180), 4.5 / half);
  const yAt = (p) => hallEave + k * (half - Math.abs(F.V(p[0], p[1]) - vm));
  LM.walls(B, ring, 0, () => hallEave, brick, g.BRICK);
  for (const s of [1, -1]) {
    const h = LM.clipRing(ring, (p) => s * (F.V(p[0], p[1]) - vm));
    if (h.length >= 3) LM.cap(B, h, yAt, C.glassLight, g.GLASS);
  }
  const ridge = hallEave + k * half;
  const [r0x, r0z] = F.P(F.u0 + 1, vm), [r1x, r1z] = F.P(F.u1 - 1, vm);
  LM.obox(B, (r0x + r1x) / 2, (r0z + r1z) / 2, ridge - 0.2, F.u1 - F.u0 - 2, 0.8, 0.45, F.rot, C.lead, g.METAL);
  const edges = LM.edgesOf(ring, LM.partyTester(srcEdges));
  LM.band(B, edges, 0, 1.0, 0.1, stone);
  LM.band(B, edges, hallEave - 0.7, 0.7, 0.2, stone);
  for (const e of edges) {
    if (e.party || e.len < 3.5) continue;
    for (const t of LM.slots(e.len, 4.2, 1.0)) LM.archWindow(B, e, t, 2.0, 1.6, 4.8, { pointed: false, frame: stone, mullion: true });
  }
  // the front building
  const fr = [[uF, F.v0], [uF - dir * frontDepth, F.v0], [uF - dir * frontDepth, F.v1], [uF, F.v1]].map(([u, v]) => F.P(u, v));
  const fe = LM.edgesOf(fr);
  LM.extrude(B, fr, 0, frontEave, brick, g.BRICK, 0x5d5f62, g.PLAIN);
  LM.roofRim(B, fe, frontEave + 0.3, 3.5, 2.2, C.slateDark);
  LM.band(B, fe, 0, 1.2, 0.12, stone);
  LM.band(B, fe, 5.6, 0.35, 0.14, stone);
  LM.band(B, fe, frontEave - 1.0, 1.02, 0.36, stone);
  let main = fe[0];
  for (const e of fe) if (e.nx * dir * F.ux + e.ny * dir * F.uy > main.nx * dir * F.ux + main.ny * dir * F.uy) main = e;
  const t = main.len / 2, pw = Math.min(11, main.len * 0.48);
  for (const e of fe) {
    for (const s of LM.slots(e.len, 3.6, 1.0)) {
      if (e === main && Math.abs(s - t) < pw / 2 + 0.6) continue;
      LM.archWindow(B, e, s, 1.9, 1.4, 3.2, { pointed: false, frame: stone });
      LM.archWindow(B, e, s, 6.7, 1.4, 3.3, { pointed: false, frame: stone });
    }
  }
  // portico: four Corinthian columns on a stepped platform, entablature, pediment
  const rot = Math.atan2(main.ty, main.tx);
  const at = (s, off, y) => LM.W(main.a[0] + main.tx * s - main.nx * off, y, main.a[1] + main.ty * s - main.ny * off);
  for (let i = 0; i < 3; i++) {
    const [x, , z] = at(t, 0.3 + i * 0.35, 0);
    LM.obox(B, x, z, 0, pw + 1.6 - i * 0.4, 0.4, 0.3 * (i + 1), rot, 0xb9b2a2, g.PLAIN);
  }
  ebox2(B, main, t, 0, pw, frontEave - 1.6, 1.6, 0xd2c6a8, -1.57);
  for (let i = 0; i < 4; i++) {
    const s = t - pw / 2 + 1.0 + (pw - 2.0) * i / 3;
    const [x, , z] = at(s, 0.6, 0);
    LM.obox(B, x, z, 0.9, 1.1, 1.1, 0.5, rot, stone, g.PLAIN);
    LM.cyl(B, x, 1.4, z, 0.42, 0.5, frontEave - 3.4, 12, stone, g.PLAIN);
    LM.obox(B, x, z, frontEave - 2.0, 1.15, 1.15, 0.5, rot, 0xe8dfc8, g.PLAIN);
  }
  ebox2(B, main, t, frontEave - 1.6, pw + 0.6, 1.62, 1.4, stone, -0.2);
  // pediment
  const pa = at(t - pw / 2 - 0.3, -0.25, frontEave), pb = at(t + pw / 2 + 0.3, -0.25, frontEave), pc = at(t, -0.25, frontEave + 3.2);
  B.tri(pa, pb, pc, stone, g.PLAIN);
  const qa = at(t - pw / 2 - 0.3, 3.5, frontEave), qb = at(t + pw / 2 + 0.3, 3.5, frontEave), qc = at(t, 3.5, frontEave + 3.2);
  B.quad(pa, qa, qc, pc, C.lead, g.METAL);
  B.quad(qb, pb, pc, qc, C.lead, g.METAL);
  B.tri(qb, qa, qc, brick, g.BRICK);
  // doors behind the columns
  for (const ds of [-2.6, 0, 2.6]) LM.archWindow(B, main, t + ds, 1.0, 1.7, 3.6, { pointed: false, frame: stone, out: -1.6 });
  // zinc statues: Mercurius on the pediment, Neptunus and Ceres in niches
  const zinc = 0x8d9a94;
  const statue = (s, off, y, attr) => {
    const [x, , z] = at(s, off, 0);
    LM.cyl(B, x, y, z, 0.32, 0.42, 1.5, 6, zinc, g.METAL);
    LM.cyl(B, x, y + 1.5, z, 0.3, 0.3, 0.45, 6, zinc, g.METAL);
    LM.prism(B, new THREE.SphereGeometry(0.22, 6, 4), x, y + 2.15, z, 0, zinc, g.METAL);
    if (attr === 'trident') LM.cyl(B, x + main.tx * 0.45, y, z + main.ty * 0.45, 0.04, 0.04, 2.9, 4, zinc, g.METAL);
    if (attr === 'wings') LM.obox(B, x, z, y + 2.2, 0.7, 0.1, 0.25, rot, zinc, g.METAL);
    if (attr === 'sheaf') LM.cyl(B, x - main.tx * 0.42, y + 0.9, z - main.ty * 0.42, 0.18, 0.1, 0.9, 5, 0xb59a52, g.METAL);
  };
  statue(t, 0.4, frontEave + 3.2, 'wings');
  for (const [sg, attr] of [[-1, 'trident'], [1, 'sheaf']]) {
    const s = t + sg * (pw / 2 + 1.7);
    LM.archWindow(B, main, s, 1.4, 1.5, 3.4, { pointed: false, frame: stone, arch: true });
    statue(s, -0.2, 1.4, attr);
  }
}
// Box on an edge (landmarks3d edge format) from `out` (negative: inward).
function ebox2(B, e, t, y0, w, h, d, color, out) {
  const off = out + d / 2;
  const x = e.a[0] + e.tx * t + e.nx * off, z = e.a[1] + e.ty * t + e.ny * off;
  LM.obox(B, x, z, y0, w, d, h, Math.atan2(e.ty, e.tx), color, LM.G.PLAIN);
}

// --- Het Groot Handelshuis (former V&D, 1958; De Zwarte Hond 2021) -----------------

// Closed upper facades of grey mosaic tile with built-in artworks, a few
// panels opened up as windows, a glazed ground floor; the atrium's glass roof.
function grootHandelshuis(B, b, ring, srcEdges) {
  const { G: g } = LM;
  const eave = Math.max(15, b.h * LEVEL), gf = 5;
  const edges = LM.edgesOf(ring, LM.partyTester(srcEdges));
  LM.walls(B, ring, 0, () => eave, 0x8c9195, g.PLAIN);
  LM.cap(B, ring, () => eave, 0x5d5f62, g.PLAIN);
  LM.band(B, edges, eave - 0.6, 0.62, 0.25, 0xc4c2bb);
  LM.band(B, edges, gf, 0.5, 0.3, 0xc4c2bb);
  for (const e of edges) {
    if (e.party || e.len < 4) continue;
    LM.ebox(B, e, e.len / 2, 0, e.len - 0.6, gf - 0.2, 0.06, C.glass, g.GLASS, 0.03);
    for (const t of LM.slots(e.len, 6, 0.3)) LM.ebox(B, e, t - 3, 0, 0.35, gf, 0.12, 0x3a3d40, g.METAL, 0.02);
    const pos = LM.slots(e.len, 3.0, 1.0);
    const floors = Math.max(2, Math.round((eave - gf - 1) / 3.6));
    const fh = (eave - gf - 1) / floors;
    pos.forEach((t, i) => {
      for (let f = 0; f < floors; f++) {
        const y = gf + 0.8 + f * fh;
        const h = hash2(t * 3.1 + e.a[0], f * 7.7 + e.a[1]);
        // mosaic panel tones; every third bay opened up as a window
        if ((i + f) % 3 === 1) LM.ebox(B, e, t, y + 0.3, 1.9, fh - 0.8, 0.06, C.glass, g.GLASS, 0.03);
        else LM.ebox(B, e, t, y + 0.1, 2.7, fh - 0.3, 0.04, h < 0.5 ? 0x7f8589 : h < 0.85 ? 0x969ca0 : 0x6d7377, g.PLAIN, 0.02);
      }
    });
  }
  // two built-in artworks on the longest open front
  let main = null;
  for (const e of edges) if (!e.party && (!main || e.len > main.len)) main = e;
  if (main && main.len > 14) {
    LM.ebox(B, main, main.len * 0.3, gf + 2.2, 3.2, 5, 0.05, 0xc0392b, g.PLAIN, 0.07);
    LM.ebox(B, main, main.len * 0.7, gf + 3.0, 2.6, 4.2, 0.05, 0xd8a32a, g.PLAIN, 0.07);
  }
  // atrium glass roof over the middle of the block
  const F = LM.minAreaFrame(ring);
  const cu = (F.u0 + F.u1) / 2, cv = (F.v0 + F.v1) / 2;
  const [x, z] = F.P(cu, cv);
  if (pointInPolygon(x, z, ring)) {
    const su = Math.min(14, (F.u1 - F.u0) * 0.3), sv = Math.min(8, (F.v1 - F.v0) * 0.3);
    const M = LM.alongU(F);
    LM.roofRect(B, M, cu - su / 2, cu + su / 2, cv - sv / 2, cv + sv / 2, eave + 0.6, 1.8, C.glassLight, g.GLASS, { oh: 0 });
    LM.obox(B, x, z, eave, su, sv, 0.6, F.rot, 0x3a3d40, g.METAL);
  }
}

// --- Calmershuis (c. 1250, Oude Boteringestraat 24) -------------------------------

// Medieval stone house painted black: souterrain, main floor, low upper floor
// and a steep gable roof (timbers of 1543), the gable end to the street.
function calmershuis(B, ring, srcEdges) {
  const { G: g } = LM;
  const F = LM.minAreaFrame(ring);
  const eave = 8.2, black = 0x26272a;
  const edges = LM.edgesOf(ring, LM.partyTester(srcEdges));
  const roof = LM.polyGableRoof(B, ring, F, eave, 7.5, 58, 0x4a4f57, black);
  void roof;
  LM.band(B, edges, 0, 0.8, 0.08, 0x3a3b3e);
  for (const e of edges) {
    if (e.party || e.len < 2.5) continue;
    const long = e.len > 12;
    for (const t of LM.slots(e.len, long ? 3.4 : 2.6, 0.9)) {
      LM.ebox(B, e, t, 0.9, 0.9, 0.8, 0.05, C.glass, g.GLASS, 0.03);
      LM.ebox(B, e, t, 2.3, 1.3, 2.6, 0.06, 0xece8de, g.PLAIN, 0.02);
      LM.ebox(B, e, t, 2.42, 1.06, 2.36, 0.05, C.glass, g.GLASS, 0.06);
      LM.ebox(B, e, t, 5.6, 1.1, 1.6, 0.06, 0xece8de, g.PLAIN, 0.02);
      LM.ebox(B, e, t, 5.7, 0.9, 1.4, 0.05, C.glass, g.GLASS, 0.06);
      if (!long) LM.ebox(B, e, t, eave + 1.2, 0.8, 1.2, 0.05, C.glass, g.GLASS, 0.03);
    }
  }
}

// --- Kiosk Grote Markt ------------------------------------------------------------

// One storey glass box with a flat overhanging roof (newspapers, toilet).
function kiosk(B, ring) {
  const { G: g } = LM;
  const F = LM.minAreaFrame(ring);
  const rect = [[F.u0, F.v0], [F.u1, F.v0], [F.u1, F.v1], [F.u0, F.v1]].map(([u, v]) => F.P(u, v));
  LM.extrude(B, rect, 0, 0.5, 0x6a6e72, g.METAL);
  LM.walls(B, rect, 0.5, () => 3.0, C.glassLight, g.GLASS);
  for (const e of LM.edgesOf(rect)) for (const t of LM.slots(e.len, 1.4, 0)) LM.ebox(B, e, t, 0.5, 0.1, 2.5, 0.08, 0x3a3d40, g.METAL, 0);
  const [x, z] = F.P((F.u0 + F.u1) / 2, (F.v0 + F.v1) / 2);
  LM.obox(B, x, z, 3.0, F.u1 - F.u0 + 0.8, F.v1 - F.v0 + 0.8, 0.35, F.rot, 0x3a3d40, g.METAL);
}

// --- entry point -------------------------------------------------------------------

function buildModel(b, ring, edges) {
  const fn = MODELS[b.name];
  const B = new GeoBuilder(5);
  if (!fn || fn(B, b, ring, edges) === false) return null;
  return B.build();
}

// The building's group, its geometry cached in `parts` (disposed with them).
export function buildMarktGroup(b, parts, ring, edges) {
  lmReady();
  const kind = marktKind(b);
  if (kind === 'model') {
    if (parts.marktModel === undefined) parts.marktModel = buildModel(b, ring, edges);
    if (!parts.marktModel) return null;
    const group = new THREE.Group();
    group.add(new THREE.Mesh(parts.marktModel, LANDMARK_MATERIALS));
    return group;
  }
  if (kind !== 'facade') return null;
  if (!parts.marktShell) {
    const { shell, detail } = buildFacade(b, ring, edges);
    parts.marktShell = shell;
    parts.marktDetail = detail;
  }
  const group = new THREE.Group();
  group.add(new THREE.Mesh(parts.marktShell, MARKT_FACADE_MATERIALS));
  const detail = new THREE.Mesh(parts.marktDetail, MARKT_FACADE_MATERIALS);
  group.add(detail);
  group.userData.facadeDetail = detail;
  return group;
}
