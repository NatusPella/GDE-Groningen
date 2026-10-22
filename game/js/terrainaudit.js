// Height audit of the road net over the AHN terrain (#78), pure: the script
// scripts/world/terrain_streek_audit.mjs hands it roads and a sampler.
// Per road: how steep the street runs on the terrain (grade), the biggest step
// between two samples (a tear: a tile border, a dyke edge cut off, a hole filled
// wrong) and, for bridges and tunnels, how the deck's reference (deckterrain.js)
// differs from the ground and how smooth it is. Per streek (regioleven.js
// STREKEN) the results are summed.
import { isDeckRoad, deckTerrainAt, deckRefs } from './deckterrain.js';

export const AUDIT = { sample: 10, maxGrade: 0.12, tear: 1.5, deckGrade: 0.08 };

// samples along a polyline every `step` m (the vertices' arc positions are not kept)
export function samplePolyline(pts, step = AUDIT.sample) {
  const out = [];
  let carry = 0;
  if (pts.length) out.push([pts[0][0], pts[0][1], 0]);
  let at = 0;
  for (let i = 0; i + 1 < pts.length; i++) {
    const ax = pts[i][0], ay = pts[i][1], dx = pts[i + 1][0] - ax, dy = pts[i + 1][1] - ay;
    const l = Math.hypot(dx, dy);
    if (l < 1e-6) continue;
    let d = step - carry;
    while (d <= l) { out.push([ax + dx * d / l, ay + dy * d / l, at + d]); d += step; }
    carry = l - (d - step);
    at += l;
  }
  const last = pts[pts.length - 1];
  if (pts.length > 1 && out[out.length - 1][2] < at - 1e-6) out.push([last[0], last[1], at]);
  return out;
}

// { n, len, maxGrade, maxStep, tears: [{x, y, step}], range }
export function auditRoad(road, terrainAt, opt = {}) {
  const o = { ...AUDIT, ...opt };
  const S = samplePolyline(road.pts, o.sample);
  const z = S.map((p) => terrainAt(p[0], p[1]));
  let maxGrade = 0, maxStep = 0;
  const tears = [];
  for (let i = 1; i < S.length; i++) {
    const d = S[i][2] - S[i - 1][2];
    if (d < 1e-6) continue;
    const dz = Math.abs(z[i] - z[i - 1]);
    maxGrade = Math.max(maxGrade, dz / d);
    maxStep = Math.max(maxStep, dz);
    if (dz > o.tear && dz / d > o.maxGrade * 2) tears.push({ x: S[i][0], y: S[i][1], step: dz });
  }
  const out = { n: S.length, len: S.length ? S[S.length - 1][2] : 0, maxGrade, maxStep, tears, range: z.length ? Math.max(...z) - Math.min(...z) : 0, deck: null };
  if (isDeckRoad(road) && S.length > 2) {
    // the reference of the profile: smooth along the deck, and never below the ground it rises with
    const base = z.map((g, i) => deckTerrainAt(road, S[i][0], S[i][1], terrainAt, g, 'audit'));
    let grade = 0, step = 0, below = 0;
    for (let i = 1; i < S.length; i++) {
      const d = S[i][2] - S[i - 1][2];
      if (d < 1e-6) continue;
      grade = Math.max(grade, Math.abs(base[i] - base[i - 1]) / d);
      step = Math.max(step, Math.abs(base[i] - base[i - 1]));
    }
    for (let i = 0; i < S.length; i++) below = Math.max(below, z[i] - base[i]);
    out.deck = { grade, step, below, ends: [base[0] - z[0], base[S.length - 1] - z[S.length - 1]], valley: Math.max(...base.map((b, i) => b - z[i])) };
  }
  return out;
}

export const pct = (a, q) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(q * s.length))]; };

// roads: [{pts, bridge?, tunnel?}]; keyOf(x, y) -> streek id (or null); returns { [id]: summary }
export function auditStreken(roads, terrainAt, keyOf, opt = {}) {
  const o = { ...AUDIT, ...opt };
  const by = {};
  for (const r of roads) {
    if (!r.pts || r.pts.length < 2) continue;
    const m = r.pts[Math.floor(r.pts.length / 2)];
    const id = keyOf(m[0], m[1]) || 'overig';
    const B = by[id] || (by[id] = { roads: 0, km: 0, grades: [], tears: [], decks: 0, deckBad: [], steep: 0, range: 0 });
    const a = auditRoad(r, terrainAt, o);
    B.roads++; B.km += a.len / 1000; B.grades.push(a.maxGrade); B.range = Math.max(B.range, a.range);
    if (a.maxGrade > o.maxGrade) B.steep++;
    for (const t of a.tears) B.tears.push(t);
    if (a.deck) {
      B.decks++;
      if (a.deck.grade > o.deckGrade) B.deckBad.push({ x: r.pts[0][0], y: r.pts[0][1], grade: a.deck.grade });
    }
  }
  const out = {};
  for (const [id, B] of Object.entries(by)) out[id] = { roads: B.roads, km: +B.km.toFixed(1), p95Grade: pct(B.grades, 0.95), maxGrade: Math.max(...B.grades), steep: B.steep, tears: B.tears.length, tearList: B.tears, decks: B.decks, deckBad: B.deckBad.length, deckBadList: B.deckBad, maxRange: B.range };
  return out;
}

// ------------------------------------------------------------------ the roads' own heights (#269)
// What ?terrain makes of the profiles: the surface height of a road piece (its terrain profile over its base), the jumps in it,
// the joints between pieces, the grades a vehicle meets and the decks over water. Pure: scripts/world/terrain_hoogte_audit.mjs
// hands it the pieces of the built tiles and the terrain.

export const SURFACE = {
  jump: 0.8,        // m: a step this high between two vertices that lie jumpLen m or less apart
  jumpLen: 12,
  joint: 0.1,       // m: two pieces that share a vertex differ this much there
  win: 8,           // m: the grade of a vehicle's climb is read over this length
  carGrade: 0.18,   // car roads steeper than this over a window are listed
  hardGrade: 0.35,  // ... and this is a failure
  wetStep: 4,       // m between the samples of a road over water
  deckClear: 0.3,   // m a deck over shipping water may stand under the required height
};

// absolute surface height at every vertex of a piece: its profile (the terrain one, as the game reads it) over its base
export function surfaceHeights(road, terrainAt) {
  const P = road.pts;
  const base = isDeckRoad(road) ? deckRefs(P, terrainAt) : P.map((p) => terrainAt(p[0], p[1]));
  return P.map((p, i) => base[i] + (road.z ? road.z[i] : 0));
}

const arcs = (P) => { const c = [0]; for (let i = 1; i < P.length; i++) c.push(c[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1])); return c; };
const key = (p) => `${Math.round(p[0] * 100)},${Math.round(p[1] * 100)}`;
const label = (r) => `${r.ref || ''} ${r.name || r.type || r.cat || ''}`.trim();
const CARCAT = new Set(['major', 'normal', 'minor']);

// { jumps, joints, steep, stats } over road pieces { pts, z?, bridge?, tunnel?, cat, name?, ref? }
export function auditSurface(roads, terrainAt, opt = {}) {
  const o = { ...SURFACE, ...opt };
  const jumps = [], joints = [], steep = [], grades = [];
  const nodes = new Map();
  let km = 0, n = 0;
  for (const r of roads) {
    if (!r.pts || r.pts.length < 2) continue;
    n++;
    const H = surfaceHeights(r, terrainAt), C = arcs(r.pts);
    km += C[C.length - 1] / 1000;
    for (let i = 0; i < H.length; i++) {
      const k = key(r.pts[i]);
      const e = nodes.get(k);
      if (e) e.push([r, H[i]]); else nodes.set(k, [[r, H[i]]]);
    }
    for (let i = 0; i + 1 < H.length; i++) {
      const dz = Math.abs(H[i + 1] - H[i]), L = C[i + 1] - C[i];
      if (dz >= o.jump && L <= o.jumpLen) jumps.push({ road: label(r), dz, len: L, x: r.pts[i][0], y: r.pts[i][1], prof: !!r.z });
    }
    // the grade a vehicle meets: read over o.win metres
    if (CARCAT.has(r.cat) && C[C.length - 1] >= o.win) {
      const at = (s) => { let i = 0; while (i < C.length - 2 && C[i + 1] < s) i++; const t = (s - C[i]) / (C[i + 1] - C[i] || 1); return H[i] + (H[i + 1] - H[i]) * Math.max(0, Math.min(1, t)); };
      let worst = 0, wx = 0, wy = 0;
      for (let s = 0; s + o.win <= C[C.length - 1] + 1e-6; s += o.win / 2) {
        const g = Math.abs(at(s + o.win) - at(s)) / o.win;
        if (g > worst) { worst = g; const t = s + o.win / 2; let i = 0; while (i < C.length - 2 && C[i + 1] < t) i++; wx = r.pts[i][0]; wy = r.pts[i][1]; }
      }
      grades.push(worst);
      if (worst > o.carGrade) steep.push({ road: label(r), grade: worst, x: wx, y: wy, prof: !!r.z });
    }
  }
  for (const [k, list] of nodes) {
    if (list.length < 2) continue;
    let lo = Infinity, hi = -Infinity;
    for (const [, h] of list) { lo = Math.min(lo, h); hi = Math.max(hi, h); }
    if (hi - lo > o.joint) joints.push({ d: hi - lo, at: k.split(',').map((q) => Math.round(Number(q)) / 100), roads: [...new Set(list.map(([r]) => label(r)))].join(' / '), prof: list.some(([r]) => !!r.z) });
  }
  jumps.sort((a, b) => b.dz - a.dz); joints.sort((a, b) => b.d - a.d); steep.sort((a, b) => b.grade - a.grade);
  return { jumps, joints, steep, stats: { pieces: n, km, p95Grade: pct(grades, 0.95), maxGrade: grades.length ? Math.max(...grades) : 0 } };
}

// Decks over water and roads through it: wetAt(x, y) -> the water row or null. `shippingMin` is the height a fixed bridge over
// shipping water (nav 4) stands at over the terrain (province_profile.mjs SHIPPING_DECK_Z).
export function auditWaterLevels(roads, terrainAt, wetAt, { shippingMin = 0, step = SURFACE.wetStep, clear = SURFACE.deckClear } = {}) {
  const low = [], dry = [];
  let decks = 0;
  for (const r of roads) {
    if (!r.pts || r.pts.length < 2 || !CARCAT.has(r.cat)) continue;
    const H = surfaceHeights(r, terrainAt), C = arcs(r.pts);
    let wetLen = 0, minH = Infinity, nav = 0, at = null;
    for (let s = 0; s <= C[C.length - 1]; s += step) {
      let i = 0; while (i < C.length - 2 && C[i + 1] < s) i++;
      const t = (s - C[i]) / (C[i + 1] - C[i] || 1);
      const x = r.pts[i][0] + (r.pts[i + 1][0] - r.pts[i][0]) * t, y = r.pts[i][1] + (r.pts[i + 1][1] - r.pts[i][1]) * t;
      const w = wetAt(x, y);
      if (!w) continue;
      wetLen += step;
      const h = H[i] + (H[i + 1] - H[i]) * t;
      if (h < minH) { minH = h; at = [x, y]; }
      nav = Math.max(nav, w.nav || 0);
    }
    if (wetLen < step) continue;
    if (r.bridge && !r.dryCrossing) {
      decks++;
      if (nav >= 4 && !r.movable && minH < shippingMin - clear) low.push({ road: label(r), h: minH, need: shippingMin, x: at[0], y: at[1] });
    } else if (!r.tunnel && !r.dryCrossing && !r.ford && wetLen >= 3 * step) dry.push({ road: label(r), wet: wetLen, x: at[0], y: at[1] });
  }
  low.sort((a, b) => a.h - b.h); dry.sort((a, b) => b.wet - a.wet);
  return { decks, low, dry };
}
