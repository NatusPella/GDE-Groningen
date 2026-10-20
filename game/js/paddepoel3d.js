import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { GeoBuilder, markShared, vcMaterial } from './pixelart3d.js';
import { LANDMARK_MATERIALS } from './landmarkmaterials.js';
import { closestPointOnSegment, pointInPolygon } from './util.js';
import { addStaticCollider } from './breakables.js';
import { P } from './worldframe.js';

// Winkelcentrum Paddepoel, the covered shopping centre across the
// Pleiadenlaan from the House of Groningen (home.js, home3d.js).
//
// What it looks like (sources: nl.wikipedia.org/wiki/Winkelcentrum_Paddepoel;
// paddepoel.nl/revitalisatie; jorritsmabouw.nl "Jumbo draagt het nieuwe
// Paddepoel"; oogtv.nl photos 2016-2025; Wikimedia Commons
// File:Winkelcentrum_Paddepoel.jpg):
// - Opened 1969 as an open-air centre; in 1991/92 its streets got a roof. Low
//   flat-roofed shop blocks (one or two storeys) along an L of covered
//   streets; over the streets a gabled glass roof on steel trusses, white
//   inside, charcoal outside; trees in planters and round white columns.
// - The entrances are tall glass gables on charcoal steel frames with
//   diagonal braces and white "Paddepoel" letters; along the outside a
//   sloping glass luifel on brackets over the shop windows, white posts with
//   globe lamps and flower tubs. Walls in dark grey brick and charcoal
//   panels; on the Eikenlaan aubergine-brown piers and three floors of brick
//   flats with white balconies and teal bands above the shops.
// - The large car park P1 (Dierenriemstraat, at grade) on the east side,
//   P2 on the Pleiadenlaan. 2025-2026: the south block (former H&M and
//   Xenos, Dierenriemstraat 200) was replaced by a supermarket with a gym
//   above it: long aluminium facade panels, large aluminium window frames on
//   a high natural stone plinth, its entrance on the inner square; housing
//   and a covered parking garage are planned on top of it later (not built,
//   not modelled).
//
// Two parts: paddepoelBlock() is the landmark builder for every OSM
// footprint tagged with the mall (landmarks3d.js BUILDERS), so the blocks
// stream, cull and batch like other landmarks; buildPaddepoelRoof() is the
// glass street roof, the entrance porches, the signs and the street
// furniture, built once in place of the building=roof canopy that OSM maps
// over the streets (canopies3d.js). Signs use parody names in the game's
// style; nothing of a real brand.

export const PADDEPOEL = 'Winkelcentrum Paddepoel';

const G_PLAIN = 0, G_BRICK = 1, G_GLASS = 2, G_METAL = 3;

const EAVE = 6.6; // parapet of the shop blocks, foot of the glass roof
const NEW_H = 10.8; // supermarket + gym block (2026)
const FLOOR = 2.9;

const C = {
  brickDark: 0x56575b, aubergine: 0x5d4a50, panel: 0xd8d4cc, fascia: 0xece9e2, coping: 0xb9bab6,
  roof: 0x5a5c5e, glass: 0x2f3d46, roofGlass: 0x8fb3c2, steel: 0x3a3f44, white: 0xe9e7e1,
  stone: 0xcfc6b4, alu: 0xb3b6b6, alu2: 0xa1a5a6, flatBrick: 0x7a5646, teal: 0x2f97a6,
  leaf: 0x3f7a3a, leafDark: 0x2f6430, tub: 0x6f6a64, flower: 0xc8384a, lamp: 0xf4efe0,
};
const SHOP_ACCENTS = [0xb8322a, 0x2f6fb8, 0x3b8f3b, 0xd0652a, 0x7a4fb0, 0x23948a, 0xc98a16, 0xc23f78];

// Covered streets: centre line [x, y] -> [x, y] in map metres, half width.
// Measured on the OSM building=roof footprint over the streets.
const STREETS = [
  { a: [-1463.92, -1229.24], b: [-1421.89, -1108.11], w: 9.5, open: 'a' }, // main street, NW entrance
  { a: [-1451.44, -1201.25], b: [-1345.79, -1236.17], w: 4 }, // Eikenlaan side street
  { a: [-1344.86, -1241.22], b: [-1336.11, -1195.05], w: 3.6, open: 'ab' }, // NE: Eikenlaan corner and P1
  { a: [-1407.57, -1215.04], b: [-1395.97, -1178.99], w: 7, open: 'b' }, // cross street to P1
  { a: [-1498.62, -1081.71], b: [-1423.86, -1106.06], w: 3.5, open: 'a' }, // south street, Zonnelaan
  { a: [-1416.83, -1105.17], b: [-1395.58, -1092.42], w: 4 },
  { a: [-1395.58, -1092.42], b: [-1377.36, -1080.64], w: 3.6, open: 'b' }, // SE entrance, Pleiadenlaan
];
const PLAZA = { x: -1423.89, y: -1108.07, r: 8.5 }; // the inner square (supermarket entrance)

const NEW_BLOCK = [-1437.43, -1077.66]; // centroid of the 2026 supermarket block
const FLATS_BLOCK = [-1386.08, -1249.61]; // the Eikenlaan block with flats on top
const FLATS_LINE = [[-1461.6, -1241.15], [-1348.96, -1277.69]]; // its Eikenlaan facade
const FLATS_DEPTH = 11;
const FLATS_STOREYS = 3;

// --- small geometry helpers ----------------------------------------------------

function ringArea(r) {
  let a = 0;
  for (let i = 0; i < r.length; i++) { const p = r[i], q = r[(i + 1) % r.length]; a += p[0] * q[1] - q[0] * p[1]; }
  return a / 2;
}
function edgesOf(ring) {
  const sign = ringArea(ring) >= 0 ? 1 : -1;
  const out = [];
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i], b = ring[(i + 1) % ring.length];
    const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy);
    if (len < 0.05) continue;
    out.push({ a, b, len, tx: dx / len, ty: dy / len, nx: sign * dy / len, ny: -sign * dx / len });
  }
  return out;
}
// party walls from the building code's edge list (see landmarks3d.js)
function partyOf(src) {
  const party = (src || []).filter((e) => e.party);
  return (e) => {
    const mx = (e.a[0] + e.b[0]) / 2, my = (e.a[1] + e.b[1]) / 2;
    return party.some((p) => {
      const t = (mx - p.ax) * p.tx + (my - p.ay) * p.ty;
      return t >= -0.5 && t <= p.len + 0.5 && Math.abs((mx - p.ax) * p.nx + (my - p.ay) * p.ny) < 0.6;
    });
  };
}
// Oriented box, bottom face omitted.
function obox(B, cx, cy, y0, sx, sy, h, rot, color, g) {
  const c = Math.cos(rot), s = Math.sin(rot);
  const hx = sx / 2, hy = sy / 2;
  const P = (a, b, y) => [cx + a * c - b * s, y, cy + a * s + b * c];
  const y1 = y0 + h;
  const p = [P(-hx, -hy, y0), P(hx, -hy, y0), P(hx, hy, y0), P(-hx, hy, y0)];
  const q = [P(-hx, -hy, y1), P(hx, -hy, y1), P(hx, hy, y1), P(-hx, hy, y1)];
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    B.quad(p[i], p[j], q[j], q[i], color, g);
  }
  B.quad(q[0], q[1], q[2], q[3], color, g);
}
// Box on an edge's outside: centred t metres along it, `out` proud of the wall.
function ebox(B, e, t, y0, w, h, d, color, g, out = 0) {
  const off = out + d / 2;
  obox(B, e.a[0] + e.tx * t + e.nx * off, e.a[1] + e.ty * t + e.ny * off, y0, w, d, h, Math.atan2(e.ty, e.tx), color, g);
}
// Flat face on an edge's outside, from t0 to t1 along it.
function eface(B, e, t0, t1, y0, y1, color, g, out = 0.01) {
  const P = (t, y) => [e.a[0] + e.tx * t + e.nx * out, y, e.a[1] + e.ty * t + e.ny * out];
  B.quadOut(P(t0, y0), P(t1, y0), P(t1, y1), P(t0, y1), [e.nx, 0, e.ny], color, g);
}
function cap(B, ring, y, color, g) {
  const tris = THREE.ShapeUtils.triangulateShape(ring.map(([x, z]) => new THREE.Vector2(x, z)), []);
  for (const [i, j, k] of tris) B.triOut([ring[i][0], y, ring[i][1]], [ring[j][0], y, ring[j][1]], [ring[k][0], y, ring[k][1]], [0, 1, 0], color, g);
}
const hash = (x, y) => { const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453; return s - Math.floor(s); };
const near = (p, q, r) => Math.hypot(p[0] - q[0], p[1] - q[1]) < r;
const centroid = (ring) => [ring.reduce((s, p) => s + p[0], 0) / ring.length, ring.reduce((s, p) => s + p[1], 0) / ring.length];

function streetDist(x, y) {
  let best = Infinity;
  for (const s of STREETS) {
    const cp = closestPointOnSegment(x, y, s.a[0], s.a[1], s.b[0], s.b[1]);
    best = Math.min(best, Math.sqrt(cp.dist2) - s.w);
  }
  return Math.min(best, Math.hypot(x - PLAZA.x, y - PLAZA.y) - PLAZA.r);
}
// a wall whose outside is under the glass roof: a shop front on the street
function facesStreet(e) {
  let hits = 0;
  for (const t of [0.25, 0.5, 0.75]) {
    if (streetDist(e.a[0] + e.tx * e.len * t + e.nx * 1.5, e.a[1] + e.ty * e.len * t + e.ny * 1.5) < 0.8) hits++;
  }
  return hits >= 2;
}

// --- the shop blocks (one landmark model per OSM footprint) ----------------------

function shopFront(B, e, top) {
  eface(B, e, 0, e.len, 0, top, C.panel, G_PLAIN);
  if (e.len < 2.5) return;
  ebox(B, e, e.len / 2, 0.15, e.len - 0.8, 3.45, 0.06, C.glass, G_GLASS, 0.02);
  for (let t = 0.4; t <= e.len - 0.3; t += 3.2) ebox(B, e, t, 0, 0.14, 3.7, 0.1, C.steel, G_METAL, 0.02);
  // the sign zone: a white fascia with a coloured board per shop unit
  ebox(B, e, e.len / 2, 3.7, e.len, 0.9, 0.16, C.fascia, G_PLAIN, 0.02);
  const units = Math.max(1, Math.round(e.len / 9));
  for (let k = 0; k < units; k++) {
    const t = (k + 0.5) * e.len / units;
    const col = SHOP_ACCENTS[Math.floor(hash(e.a[0] + t, e.a[1]) * SHOP_ACCENTS.length)];
    ebox(B, e, t, 3.82, Math.min(3.4, e.len / units - 0.6), 0.66, 0.04, col, G_PLAIN, 0.18);
  }
}

function outerWall(B, e, top, { piers = C.aubergine, luifel = true } = {}) {
  eface(B, e, 0, e.len, 0, 4.2, C.brickDark, G_BRICK);
  eface(B, e, 0, e.len, 4.2, top, C.aubergine, G_PLAIN);
  if (e.len < 9) return;
  // shop windows between piers, a glass luifel on brackets above them
  const n = Math.max(1, Math.round(e.len / 6.5));
  const step = e.len / n;
  for (let k = 0; k < n; k++) ebox(B, e, (k + 0.5) * step, 0.35, step - 1.1, 2.9, 0.05, C.glass, G_GLASS, 0.02);
  for (let k = 0; k <= n; k++) ebox(B, e, Math.min(e.len - 0.35, Math.max(0.35, k * step)), 0, 0.7, top - 0.2, 0.2, piers, G_PLAIN, 0.01);
  if (!luifel) return;
  const P = (t, out, y) => [e.a[0] + e.tx * t + e.nx * out, y, e.a[1] + e.ty * t + e.ny * out];
  B.quadOut(P(0.4, 0.2, 4.0), P(e.len - 0.4, 0.2, 4.0), P(e.len - 0.4, 2.4, 3.55), P(0.4, 2.4, 3.55), [0, 1, 0], C.roofGlass, G_GLASS);
  B.quadOut(P(0.4, 2.4, 3.55), P(e.len - 0.4, 2.4, 3.55), P(e.len - 0.4, 2.45, 3.4), P(0.4, 2.45, 3.4), [e.nx, 0, e.ny], C.steel, G_METAL);
  for (let t = 0.6; t < e.len - 0.3; t += 3.6) {
    B.quadOut(P(t - 0.05, 0.2, 4.05), P(t - 0.05, 2.4, 3.6), P(t - 0.05, 2.4, 3.4), P(t - 0.05, 0.2, 3.7), [e.tx, 0, e.ty], C.steel, G_METAL);
  }
}

function roofTop(B, ring, edges, top) {
  cap(B, ring, top, C.roof, G_PLAIN);
  for (const e of edges) ebox(B, e, e.len / 2, top, e.len + 0.1, 0.3, 0.3, C.coping, G_PLAIN, -0.3);
  // plant on the roof
  const [cx, cy] = centroid(ring);
  for (let k = 0; k < 3; k++) {
    const x = cx + (hash(cx + k, cy) - 0.5) * 16, y = cy + (hash(cy, cx - k) - 0.5) * 16;
    if (!pointInPolygon(x, y, ring) || streetDist(x, y) < 3) continue;
    obox(B, x, y, top, 2.2 + k * 0.6, 1.6, 1.1, hash(x, y) * 3, C.coping, G_METAL);
  }
}

function newBlock(B, ring, edges, party) {
  const top = NEW_H;
  for (const e of edges) {
    if (party(e)) { eface(B, e, 0, e.len, EAVE, top, C.alu, G_PLAIN); continue; }
    if (facesStreet(e)) shopFront(B, e, EAVE);
    else {
      // high natural stone plinth with big aluminium-framed windows
      eface(B, e, 0, e.len, 0, 5.2, C.stone, G_PLAIN);
      const n = Math.max(1, Math.round(e.len / 7.5)), step = e.len / n;
      for (let k = 0; k < n; k++) {
        ebox(B, e, (k + 0.5) * step, 0.5, step - 1.4, 4.0, 0.05, C.glass, G_GLASS, 0.02);
        ebox(B, e, (k + 0.5) * step, 0.42, step - 1.2, 0.12, 0.1, C.alu, G_METAL, 0.02);
        ebox(B, e, (k + 0.5) * step, 4.5, step - 1.2, 0.12, 0.1, C.alu, G_METAL, 0.02);
      }
    }
    // the gym upstairs: long vertical aluminium panels, a band of windows
    const n = Math.max(1, Math.round(e.len / 0.9));
    const lo = facesStreet(e) ? EAVE : 5.2;
    for (let k = 0; k < n; k++) eface(B, e, k * e.len / n, (k + 1) * e.len / n, lo, top, k % 2 ? C.alu : C.alu2, G_PLAIN);
    if (e.len > 8) ebox(B, e, e.len / 2, 7.0, e.len - 3, 2.2, 0.05, C.glass, G_GLASS, 0.03);
  }
  roofTop(B, ring, edges, top);
}

function flatsOnTop(B) {
  const [p, q] = FLATS_LINE;
  const L = Math.hypot(q[0] - p[0], q[1] - p[1]);
  const ux = (q[0] - p[0]) / L, uy = (q[1] - p[1]) / L;
  // inward (south, away from the Eikenlaan)
  const vx = -uy, vy = ux;
  const y0 = EAVE, y1 = EAVE + FLATS_STOREYS * FLOOR;
  const ring = [p, q, [q[0] + vx * FLATS_DEPTH, q[1] + vy * FLATS_DEPTH], [p[0] + vx * FLATS_DEPTH, p[1] + vy * FLATS_DEPTH]];
  const edges = edgesOf(ring);
  for (const e of edges) {
    eface(B, e, 0, e.len, y0, y1, C.flatBrick, G_BRICK, 0.025);
    if (e.len < 15) continue;
    for (let f = 0; f < FLATS_STOREYS; f++) {
      const fy = y0 + f * FLOOR;
      for (let t = 2.5; t < e.len - 2; t += 5.4) {
        ebox(B, e, t, fy + 0.9, 2.6, 1.5, 0.07, C.glass, G_GLASS, 0);
        // balcony: white slab, teal front
        ebox(B, e, t + 2.2, fy + 0.02, 2.4, 0.2, 1.4, C.white, G_PLAIN, 0);
        ebox(B, e, t + 2.2, fy + 0.22, 2.4, 1.0, 0.06, C.teal, G_PLAIN, 1.36);
      }
    }
  }
  cap(B, ring, y1, C.roof, G_PLAIN);
  for (const e of edges) ebox(B, e, e.len / 2, y1 - 0.4, e.len + 0.2, 0.7, 0.14, C.teal, G_PLAIN, 0);
}

// Landmark builder (landmarks3d.js BUILDERS) for one footprint of the mall.
export function paddepoelBlock(B, b, ring, srcEdges) {
  const edges = edgesOf(ring);
  const party = partyOf(srcEdges);
  const c = centroid(ring);
  if (near(c, NEW_BLOCK, 14)) { newBlock(B, ring, edges, party); return; }
  for (const e of edges) {
    if (party(e)) { eface(B, e, 0, e.len, 0, EAVE, C.brickDark, G_BRICK); continue; }
    if (facesStreet(e)) shopFront(B, e, EAVE);
    else outerWall(B, e, EAVE);
  }
  roofTop(B, ring, edges, EAVE);
  if (near(c, FLATS_BLOCK, 16)) flatsOnTop(B);
}

// --- glass street roof, porches, signs, furniture (built once) -------------------

const RISE = 0.55; // ridge height per metre of half width

// The roof glass: one translucent shared material that casts no shadow, so
// the covered streets get daylight and the sky shows through from below.
// One extra draw call for the whole roof; the steel frames keep theirs.
const roofGlassMat = markShared(vcMaterial({ side: THREE.DoubleSide, transparent: true, opacity: 0.5, depthWrite: false, roughness: 0.12, metalness: 0.2 }));
let glassB = null;

function gable(B, a, b, w, y0, rise, { frames = 3.6, ends = true } = {}) {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const ux = (b[0] - a[0]) / L, uy = (b[1] - a[1]) / L, nx = -uy, ny = ux;
  const P = (t, s, y) => [a[0] + ux * t + nx * s, y, a[1] + uy * t + ny * s];
  const yr = y0 + rise;
  const Gl = glassB || B;
  for (const s of [-1, 1]) {
    Gl.quadOut(P(0, s * w, y0), P(L, s * w, y0), P(L, 0, yr), P(0, 0, yr), [0, 1, 0], C.roofGlass, glassB ? 0 : G_GLASS);
    // eave beam
    B.quadOut(P(0, s * (w + 0.15), y0 + 0.35), P(L, s * (w + 0.15), y0 + 0.35), P(L, s * (w + 0.15), y0 - 0.2), P(0, s * (w + 0.15), y0 - 0.2), [s * nx, 0, s * ny], C.steel, G_METAL);
  }
  B.quadOut(P(0, -0.12, yr + 0.18), P(L, -0.12, yr + 0.18), P(L, 0.12, yr + 0.18), P(0, 0.12, yr + 0.18), [0, 1, 0], C.steel, G_METAL);
  // glazing bars along the slopes: from below the panes read as glass, not as open air
  for (const s of [-1, 1]) {
    for (const f of [0.25, 0.5, 0.75]) {
      const sv = s * w * f, yv = y0 + rise * (1 - f) - 0.03;
      B.quad(P(0, sv - 0.06, yv), P(L, sv - 0.06, yv), P(L, sv + 0.06, yv), P(0, sv + 0.06, yv), C.white, G_PLAIN);
    }
  }
  const n = Math.max(1, Math.round(L / frames));
  for (let k = 0; k <= n; k++) {
    const t = Math.min(L - 0.05, Math.max(0.05, k * L / n));
    for (const s of [-1, 1]) B.quad(P(t, s * w, y0 + 0.02), P(t, 0, yr + 0.02), P(t, 0, yr + 0.2), P(t, s * w, y0 + 0.2), C.steel, G_METAL);
    // white tie beam under the glass, seen from the street
    if (k % 2 === 0) B.quadOut(P(t - 0.15, -w, y0 - 0.25), P(t + 0.15, -w, y0 - 0.25), P(t + 0.15, w, y0 - 0.25), P(t - 0.15, w, y0 - 0.25), [0, -1, 0], C.white, G_PLAIN);
  }
  if (ends) for (const t of [0, L]) Gl.tri(P(t, -w, y0), P(t, w, y0), P(t, 0, yr), C.roofGlass, glassB ? 0 : G_GLASS);
  return { L, ux, uy, nx, ny, P };
}

function lantern(B, x, y, r, y0, h, rot) {
  const c = Math.cos(rot), s = Math.sin(rot);
  const P = (u, v, yy) => [x + u * c - v * s, yy, y + u * s + v * c];
  const k = [P(-r, -r, y0), P(r, -r, y0), P(r, r, y0), P(-r, r, y0)];
  const top = P(0, 0, y0 + h);
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    (glassB || B).triOut(k[i], k[j], top, [0, 1, 0], C.roofGlass, glassB ? 0 : G_GLASS);
    const m = [(k[i][0] + k[j][0]) / 2, y0, (k[i][2] + k[j][2]) / 2];
    B.quad(k[i], k[j], [k[j][0], y0 - 0.5, k[j][2]], [k[i][0], y0 - 0.5, k[i][2]], C.steel, G_METAL);
    B.quad(m, top, [top[0], top[1] + 0.2, top[2]], [m[0], m[1] + 0.2, m[2]], C.steel, G_METAL);
    B.quad(k[i], top, [top[0], top[1] + 0.2, top[2]], [k[i][0], k[i][1] + 0.2, k[i][2]], C.steel, G_METAL);
  }
}

// --- signs: one canvas atlas, one shared material ---------------------------------

const SIGNS = {
  paddepoel: { text: 'Paddepoel', bg: '#4a3f42', fg: '#ffffff', aspect: 6 },
  albert: { text: 'Albert Hijgt', bg: '#2d5c9e', fg: '#ffffff', aspect: 6 },
  dumbo: { text: 'DUMBO', bg: '#e9a419', fg: '#222222', aspect: 4 },
  gym: { text: 'Zweet & Zwoeg', bg: '#202426', fg: '#ff6a1a', aspect: 7 },
  wiebel: { text: 'Wiebel', bg: '#c43a5a', fg: '#ffffff', aspect: 2.2 },
  kruidvet: { text: 'Kruidvet', bg: '#a83a8c', fg: '#ffffff', aspect: 4 },
  blokkie: { text: 'Blokkie', bg: '#b84a26', fg: '#ffffff', aspect: 4 },
  akzie: { text: 'AKZIE', bg: '#ffffff', fg: '#1d4fa3', aspect: 4 },
  bakker: { text: 'Bakker Bert', bg: '#f4e6c8', fg: '#7a3b12', aspect: 5 },
  stads: { text: 'Stoer & Stads', bg: '#7a4fb0', fg: '#ffffff', aspect: 6 },
};
let signMat = null;
const signUV = {};

function signMaterial() {
  if (signMat) return signMat;
  const W = 1024, ROW = 96;
  const c = document.createElement('canvas');
  c.width = W; c.height = ROW * Object.keys(SIGNS).length;
  const g = c.getContext('2d');
  let r = 0;
  for (const [key, s] of Object.entries(SIGNS)) {
    const w = Math.min(W, Math.round(ROW * s.aspect));
    g.fillStyle = s.bg;
    g.fillRect(0, r * ROW, w, ROW);
    let size = 66;
    g.font = `bold ${size}px 'Arial Narrow', Arial, sans-serif`;
    while (g.measureText(s.text).width > w - 30 && size > 20) { size -= 2; g.font = `bold ${size}px 'Arial Narrow', Arial, sans-serif`; }
    g.fillStyle = s.fg;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(s.text, w / 2, r * ROW + ROW / 2 + 2);
    signUV[key] = [0, 1 - (r + 1) * ROW / c.height, w / W, 1 - r * ROW / c.height];
    r++;
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  signMat = markShared(new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0, roughness: 0.6, side: THREE.DoubleSide }));
  return signMat;
}

// Night: the signs light up a little (landmarks3d setLandmarkNight).
export function setPaddepoelNight(glow) {
  if (signMat) signMat.emissiveIntensity = Math.min(0.6, glow * 0.3);
}

// Sign board centred at (x, y) on a wall facing (nx, ny), `h` metres high.
function sign(S, key, x, y, nx, ny, yb, h, out = 0.2) {
  const s = SIGNS[key], [u0, v0, u1, v1] = signUV[key];
  const w = h * s.aspect / 2;
  const tx = ny, ty = -nx; // left to right seen from the front
  const P = (k, yy) => [x + nx * out + tx * k, yy, y + ny * out + ty * k];
  S.quad(P(-w, yb), P(w, yb), P(w, yb + h), P(-w, yb + h), 0xffffff, 0, [u0, v0, u1, v0, u1, v1, u0, v1]);
}

// Wall sign on footprint edge a -> b (outside = the side `side` points to), t in 0..1.
function wallSign(S, key, a, b, side, t, yb, h, out) {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
  let nx = (b[1] - a[1]) / L, ny = -(b[0] - a[0]) / L;
  if (nx * side[0] + ny * side[1] < 0) { nx = -nx; ny = -ny; }
  sign(S, key, a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, nx, ny, yb, h, out);
}

function clearOfRoads(map, x, y, r) {
  for (const road of map.roadsNear(x, y, 12)) {
    const P = road.pts;
    const rr = (road.cat === 'foot' || road.cat === 'cycle' ? 1.2 : (road.width || 5) / 2) + r;
    for (let i = 0; i < P.length - 1; i++) {
      if (closestPointOnSegment(x, y, P[i][0], P[i][1], P[i + 1][0], P[i + 1][1]).dist2 < rr * rr) return false;
    }
  }
  return true;
}
const inBuilding = (map, x, y) => map.buildingsNear(x, y, 2).some((b) => pointInPolygon(x, y, b.pts));

function porch(B, S, map, s, end) {
  const a = end === 'a' ? s.b : s.a, b = end === 'a' ? s.a : s.b; // a -> b points outward
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const ux = (b[0] - a[0]) / L, uy = (b[1] - a[1]) / L, nx = -uy, ny = ux;
  const w = Math.max(4, Math.min(s.w, 6.5));
  const DEPTH = 4.5, y0 = 8.0, rise = w * 0.75;
  const p0 = [b[0] - ux * 3, b[1] - uy * 3], p1 = [b[0] + ux * DEPTH, b[1] + uy * DEPTH];
  const F = gable(B, p0, p1, w + 0.5, y0, rise, { frames: 2.5 });
  // charcoal frame: corner columns, diagonal braces and the fascia under the gable
  const Lp = F.L;
  for (const sd of [-1, 1]) {
    const [cx, , cz] = F.P(Lp - 0.3, sd * (w + 0.2), 0);
    if (!inBuilding(map, cx, cz) && clearOfRoads(map, cx, cz, 0.6)) {
      obox(B, cx, cz, 0, 0.4, 0.4, y0, Math.atan2(uy, ux), C.steel, G_METAL);
      addStaticCollider('post', cx, cz, 0.3);
    }
    B.quad(F.P(Lp - 0.25, sd * (w + 0.3), y0 - 2.2), F.P(Lp - 0.25, sd * 0.6, y0 + rise * 0.85), F.P(Lp - 0.25, sd * 0.6, y0 + rise * 0.85 - 0.35), F.P(Lp - 0.25, sd * (w + 0.3), y0 - 2.55), C.steel, G_METAL);
  }
  B.quadOut(F.P(Lp - 0.2, -(w + 0.5), y0 - 2.1), F.P(Lp - 0.2, w + 0.5, y0 - 2.1), F.P(Lp - 0.2, w + 0.5, y0), F.P(Lp - 0.2, -(w + 0.5), y0), [ux, 0, uy], C.aubergine, G_PLAIN);
  // glass between the shop roofs and the porch eave
  (glassB || B).quadOut(F.P(0.2, -(w + 0.5), EAVE), F.P(0.2, w + 0.5, EAVE), F.P(0.2, w + 0.5, y0), F.P(0.2, -(w + 0.5), y0), [ux, 0, uy], C.roofGlass, glassB ? 0 : G_GLASS);
  const [sx, , sz] = F.P(Lp - 0.2, 0, 0);
  sign(S, 'paddepoel', sx, sz, ux, uy, y0 - 1.75, 1.2, 0.08);
}

function globeLamp(B, x, y) {
  obox(B, x, y, 0, 0.16, 0.16, 3.6, 0, C.white, G_PLAIN);
  B.geo(new THREE.IcosahedronGeometry(0.3, 1), new THREE.Matrix4().makeTranslation(x, 3.85, y), C.lamp, G_GLASS);
  addStaticCollider('post', x, y, 0.15);
}
function planterTree(B, x, y, big) {
  obox(B, x, y, 0, 1.4, 1.4, 0.7, 0.3, C.tub, G_PLAIN);
  if (big) {
    obox(B, x, y, 0.7, 0.14, 0.14, 2.2, 0, 0x5b4632, G_PLAIN);
    B.geo(new THREE.IcosahedronGeometry(1.5, 0), new THREE.Matrix4().makeTranslation(x, 3.6, y), C.leaf, G_PLAIN);
  } else {
    // flower tub: a low mound of green with red on top
    obox(B, x, y, 0.7, 1.2, 1.2, 0.25, 0.3, C.leafDark, G_PLAIN);
    obox(B, x, y, 0.95, 0.9, 0.9, 0.18, 1.0, C.flower, G_PLAIN);
  }
  addStaticCollider('post', x, y, 0.8);
}

// true for the OSM building=roof footprint over the shopping streets
export function isPaddepoelRoof(c) {
  if (!c.pts || c.pts.length < 20) return false;
  const [x, y] = centroid(c.pts);
  const [px, py] = [-1386.55, -1153.97];
  return Math.hypot(x - px, y - py) < 25;
}

export function buildPaddepoelRoof(map) {
  const B = new GeoBuilder(5);
  const S = new GeoBuilder(1);
  glassB = new GeoBuilder(1);
  signMaterial();
  for (const s of STREETS) gable(B, s.a, s.b, s.w + 0.4, EAVE, (s.w + 0.4) * RISE, { ends: !s.open });
  lantern(B, PLAZA.x, PLAZA.y, PLAZA.r, EAVE + 0.4, 6.5, Math.atan2(STREETS[0].b[1] - STREETS[0].a[1], STREETS[0].b[0] - STREETS[0].a[0]));
  for (const s of STREETS) for (const end of s.open || '') porch(B, S, map, s, end);

  // anchors and shop names on the outside walls
  wallSign(S, 'albert', [-1404.91, -1173.81], [-1384.9, -1113.73], [1, 0], 0.55, 4.5, 1.5, 0.25);
  wallSign(S, 'dumbo', [-1459.05, -1051.14], [-1404.23, -1069.13], [0, 1], 0.5, 3.6, 1.5, 0.1);
  wallSign(S, 'gym', [-1459.05, -1051.14], [-1404.23, -1069.13], [0, 1], 0.5, 8.9, 1.2, 0.1);
  wallSign(S, 'dumbo', [-1404.23, -1069.13], [-1415.81, -1104.18], [1, 0], 0.45, 3.6, 1.4, 0.1);
  wallSign(S, 'gym', [-1404.23, -1069.13], [-1415.81, -1104.18], [1, 0], 0.5, 8.9, 1.0, 0.1);
  wallSign(S, 'kruidvet', [-1512.31, -1185.17], [-1487.04, -1109.07], [1, 0], 0.5, 4.6, 1.2, 0.1);
  wallSign(S, 'akzie', [-1531.26, -1179.84], [-1512.31, -1185.17], [0, -1], 0.5, 4.6, 1.3, 0.1);
  wallSign(S, 'blokkie', [-1507.06, -1107.75], [-1522.84, -1154.8], [-1, 0], 0.5, 4.6, 1.2, 0.1);
  wallSign(S, 'bakker', [-1340.16, -1198], [-1386.95, -1179.13], [0, 1], 0.6, 4.6, 1.1, 0.1);
  wallSign(S, 'stads', [-1340.16, -1198], [-1386.95, -1179.13], [0, 1], 0.2, 4.6, 1.0, 0.1);
  // the Eikenlaan row: red textile-discount squares under the luifel, 'Paddepoel' in the middle
  const [p, q] = FLATS_LINE;
  for (let t = 0.08; t < 0.95; t += 0.07) {
    if (Math.abs(t - 0.5) < 0.05) continue;
    wallSign(S, 'wiebel', p, q, [0, -1], t, 2.6, 0.8, 2.2);
  }
  wallSign(S, 'paddepoel', p, q, [0, -1], 0.5, 4.4, 1.4, 0.3);

  // globe lamps and flower tubs at the entrances, trees in tubs on the main street
  for (const s of STREETS) {
    for (const end of s.open || '') {
      const a = end === 'a' ? s.b : s.a, b = end === 'a' ? s.a : s.b;
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / L, uy = (b[1] - a[1]) / L;
      for (const sd of [-1, 1]) {
        const x = b[0] + ux * 7 - uy * sd * (s.w + 1.5), y = b[1] + uy * 7 + ux * sd * (s.w + 1.5);
        if (!inBuilding(map, x, y) && clearOfRoads(map, x, y, 0.5)) globeLamp(B, x, y);
        const fx = b[0] + ux * 5.5 - uy * sd * Math.max(2, s.w - 1), fy = b[1] + uy * 5.5 + ux * sd * Math.max(2, s.w - 1);
        if (!inBuilding(map, fx, fy) && clearOfRoads(map, fx, fy, 0.8)) planterTree(B, fx, fy, false);
      }
    }
  }
  const M = STREETS[0];
  for (let t = 0.15; t < 0.9; t += 0.14) {
    for (const sd of [-1, 1]) {
      const x = M.a[0] + (M.b[0] - M.a[0]) * t, y = M.a[1] + (M.b[1] - M.a[1]) * t;
      const L = Math.hypot(M.b[0] - M.a[0], M.b[1] - M.a[1]);
      const tx = x - (M.b[1] - M.a[1]) / L * sd * 4.5, ty = y + (M.b[0] - M.a[0]) / L * sd * 4.5;
      if (!inBuilding(map, tx, ty) && clearOfRoads(map, tx, ty, 1)) planterTree(B, tx, ty, true);
    }
  }

  const group = new THREE.Group();
  group.name = 'paddepoel';
  const roof = new THREE.Mesh(B.build(), LANDMARK_MATERIALS);
  roof.castShadow = true;
  roof.receiveShadow = true;
  group.add(roof);
  const glass = new THREE.Mesh(glassB.build(), roofGlassMat);
  glass.name = 'paddepoelGlass';
  glass.renderOrder = 2;
  glassB = null;
  group.add(glass);
  const signs = new THREE.Mesh(S.build(), signMat);
  group.add(signs);
  return group;
}
