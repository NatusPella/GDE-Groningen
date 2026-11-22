// CPU-referentie van de interior-mapping-wiskunde van het nepinterieur (game/js/interiorglass.js, igDecode + igInterior), puur
// JS, zonder THREE of GL (#1076). Twee delen:
//   * shader*: een regel-voor-regel port van de GLSL (dezelfde formules, dezelfde epsilons en clamps), met `opts.fixed` om de
//     toestand van vóór en na de reparatie (22-11) naast elkaar te kunnen zetten;
//   * analytic*: een onafhankelijke ray/box-oplossing in de wereldruimte (ruitframe uit een draaimatrix, geen shaderformules),
//     waar de shader mee vergeleken wordt.
// Een ruit: oorsprong O (midden onderkant, wereld), uitwaartse normaal n = (cos phi, 0, sin phi), T = up x n = (n.z, 0, -n.x),
// de kamer ligt achter de ruit (richting -n): kamerframe x = T, y = omhoog, z = -n.

import { paneUV } from '../../game/js/paneuv.js';

export const UP = [0, 1, 0];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const len = (a) => Math.hypot(a[0], a[1], a[2]);
export const norm = (a) => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const fr = (x) => x - Math.floor(x);
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
export const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

// --- ruit coderen en decoderen (igDecode); `f32` emuleert de varying als 32-bit float -----------------------------------------
export function igDecode(wx, wy) {
  const fx = Math.floor(wx);
  const px = (wx - fx - 0.5) * 8;
  const K = Math.floor((fx + 0.5) / 64);
  const w = (fx - K * 64) * 0.1;
  const fy = Math.floor(wy);
  const py = (wy - fy - 0.002) * 4;
  const M = -fy;
  const kind = Math.floor((M - 15.5) / 64);
  const h = (M - 16 - kind * 64) * 0.1;
  const rank = Math.abs(kind - 2) < 0.5 ? (Math.floor(K / 8) + 0.5) / 32 : (K + 0.5) / 256;
  return { p: [px, py], size: [w, h], K, kind, rank };
}

// --- de kamer van een ruit (igInterior, tot en met de box) ---------------------------------------------------------------------
function hashU(x) {
  x >>>= 0;
  x ^= x >>> 16; x = Math.imul(x, 0x7feb352d) >>> 0;
  x ^= x >>> 15; x = Math.imul(x, 0x846ca68b) >>> 0;
  x ^= x >>> 16;
  return x >>> 0;
}
const hash24 = (x) => (hashU(x) >>> 8) / 16777216;

export function roomOf(q, uRoomDepth = 1) {
  const ground = Math.abs(q.kind - 1) < 0.5, shop = Math.abs(q.kind - 2) < 0.5, office = q.kind > 2.5;
  const W = Math.max(q.size[0], 0.05), H = Math.max(q.size[1], 0.05);
  const seed = (Math.floor((q.K * 8 + q.kind) * 977 + 0.5) + Math.floor(W * 10 + 0.5) * 61 + Math.floor(H * 10 + 0.5)) >>> 0;
  const s1 = hash24(seed);
  const s2 = fr(s1 * 13.37 + 0.21), s3 = fr(s1 * 71.93 + 0.47), s4 = fr(s1 * 31.17 + 0.83), s5 = fr(s1 * 5.71 + 0.13);
  const RW = W + (shop ? 2.4 : 1.3);
  const fY = shop ? -0.45 : ground ? -0.55 : -0.85;
  const cY = Math.max(fY + (office ? 2.9 : 2.75), H + 0.3);
  const D = clamp((shop ? 1.7 : 1.1) * uRoomDepth * RW, 2, 5.5);
  return { W, H, RW, fY, cY, D, s1, s2, s3, s4, s5, shop, office, ground, b0: [-RW * 0.5, fY, 0], b1: [RW * 0.5, cY, D] };
}

// --- de kijkstraal in het ruitframe (igInterior, eerste regels) ---------------------------------------------------------------
// V: eenheidsrichting camera -> ruit (wereld); N: de normaal zoals de shader hem krijgt (al genormaliseerd).
// opts.fixed: het frame T komt uit de ongedraaide normaal (de ruit-x van de uv is aan die normaal gebonden); ervoor draaide T mee
// met het omdraaien van N voor achterkant-pixels.
export function shaderRay(V, N, opts = {}) {
  const fixed = opts.fixed !== false;
  let Nf = N;
  if (!fixed) Nf = dot(N, V) > 0 ? mul(N, -1) : N; // de oude toestand: N is al naar de camera gedraaid
  const horiz = Math.hypot(Nf[0], Nf[2]);
  const T = horiz > 1e-3 ? norm([Nf[2], 0, -Nf[0]]) : [1, 0, 0];
  const side = fixed && dot(N, V) > 0 ? -1 : 1; // een achterkant-pixel: de straal gaat naar de andere kant
  const rd = [dot(V, T), V[1], -dot(V, Nf) * (fixed ? side : 1)];
  if (Math.abs(rd[0]) < 1e-4) rd[0] = rd[0] < 0 ? -1e-4 : 1e-4;
  if (Math.abs(rd[1]) < 1e-4) rd[1] = rd[1] < 0 ? -1e-4 : 1e-4;
  rd[2] = Math.max(rd[2], 1e-3);
  const fres = 0.04 + 0.96 * Math.pow(clamp(1 - rd[2], 0, 1), 5);
  return { rd, T, fres };
}

// --- ray/box (de uitgang van de straal uit de kamer) ---------------------------------------------------------------------------
export function exitBox(ro, rd, b0, b1) {
  const tb = [0, 1, 2].map((i) => ((rd[i] >= 0 ? b1[i] : b0[i]) - ro[i]) / rd[i]);
  const t = Math.min(tb[0], tb[1], tb[2]);
  const face = t === tb[2] ? 'back' : t === tb[1] ? (rd[1] > 0 ? 'ceiling' : 'floor') : (rd[0] > 0 ? 'right' : 'left');
  return { t, face, p: [0, 1, 2].map((i) => ro[i] + rd[i] * t) };
}

// De textuurcoordinaten per wand zoals igInterior ze neemt (achterwand: x, hoogte boven de vloer; zijwand: diepte, hoogte; vloer: x, z).
export function wallUV(face, p, room) {
  if (face === 'back') return [p[0], p[1] - room.fY];
  if (face === 'left' || face === 'right') return [p[2], p[1] - room.fY];
  if (face === 'floor') return [p[0], p[2]];
  return [p[0], p[2]];
}

// De hele schaduwroute: wereldcamera + ruitpunt (varying) + uv-varying + normaalattribuut -> kamerpunt
// in: { cam, P (wereld), uv: [wx, wy], N (attribuutnormaal, niet genormaliseerd), uRoomDepth }
export function shaderHit({ cam, P, uv, N, uRoomDepth = 1 }, opts = {}) {
  const q = igDecode(uv[0], uv[1]);
  const room = roomOf(q, uRoomDepth);
  const Vraw = sub(P, cam);
  const dist = len(Vraw);
  const V = mul(Vraw, 1 / Math.max(dist, 1e-4));
  let Nn = N;
  if (dot(Nn, Nn) < 1e-8) Nn = [0, 0, 1];
  Nn = norm(Nn);
  const sr = shaderRay(V, Nn, opts);
  const ro = [q.p[0], q.p[1], 0];
  const hit = exitBox(ro, sr.rd, room.b0, room.b1);
  return { q, room, dist, ...sr, ro, ...hit, uv: wallUV(hit.face, hit.p, room) };
}

// de afstandsregel: een vlakke kamertoon op afstand, een gladde alfa tussen FAR0 en FAR1 (geen geometrie)
export function farMix(dist, far0 = 100, far1 = 150) { return smoothstep(far0, far1, dist); }

// --- Onafhankelijke oplossing in de wereld ------------------------------------------------------------------------------------
// Draaimatrix (rijen = kamerassen in wereldcoordinaten); de camera en het ruitpunt gaan het kamerframe in, de straal wordt daar
// met de slabmethode gesneden en het uitgangspunt gaat terug naar de wereld.
export function paneFrame(phi) {
  const n = [Math.cos(phi), 0, Math.sin(phi)];
  const T = [n[2], 0, -n[0]];
  return { n, T, rows: [T, UP, mul(n, -1)] };
}
const toRoom = (fr_, O, X) => { const d = sub(X, O); return fr_.rows.map((r) => dot(r, d)); };
export function analyticHit({ cam, O, phi, room, P }) {
  const f = paneFrame(phi);
  const c = toRoom(f, O, cam), p = toRoom(f, O, P);
  const d = sub(p, c);
  // de straal door het ruitpunt p met richting d; de kamer ligt bij z >= 0 (p.z = 0 op de ruit)
  let tFar = Infinity;
  const lo = room.b0, hi = room.b1;
  let tNear = -Infinity;
  for (let i = 0; i < 3; i++) {
    if (Math.abs(d[i]) < 1e-12) continue;
    const a = (lo[i] - p[i]) / d[i], b = (hi[i] - p[i]) / d[i];
    tNear = Math.max(tNear, Math.min(a, b));
    tFar = Math.min(tFar, Math.max(a, b));
  }
  const hit = [0, 1, 2].map((i) => p[i] + d[i] * tFar);
  return { hit, tFar, tNear, local: p, cam: c };
}

// ruitpunt op de ruit (kamerframe) -> wereld
export function paneToWorld(O, phi, x, y) {
  const f = paneFrame(phi);
  return add(add(O, mul(f.T, x)), mul(UP, y));
}

// De uv-varying op het ruitpunt (x, y) vanuit paneUV's vier hoeken, bilineair zoals de rasterizer (affien op een rechthoek).
export function uvAt(rank, kind, w, h, phi, bay, x, y, f32 = false) {
  // de rand van de gevel loopt langs ±T; kies de randrichting willekeurig (zowel +T als -T komen voor)
  const tx = Math.sin(phi) * (bay & 1 ? 1 : -1), tz = -Math.cos(phi) * (bay & 1 ? 1 : -1);
  const n = [Math.cos(phi), Math.sin(phi)];
  const c = paneUV(rank, kind, w, h, tx, tz, n[0], n[1], bay);
  // hoeken: a (x=-along*w/2, y=0), b (+, 0), c (+, h), d (-, h)
  const along = tx * n[1] - tz * n[0] >= 0 ? 1 : -1;
  const sx = (x / (w / 2)) * along; // -1..1 langs de hoeken a -> b
  const u = (sx + 1) / 2, v = y / h;
  const ux = c[0] + (c[2] - c[0]) * u, uy = c[1] + (c[7] - c[1]) * v;
  return f32 ? [Math.fround(ux), Math.fround(uy)] : [ux, uy];
}

// Een Int8-genormaliseerde normaal zoals GeoBuilder.build hem opslaat (round(n * 127)), terug als de shader hem leest
export const int8Normal = (n) => n.map((v) => Math.round(v * 127) / 127);
