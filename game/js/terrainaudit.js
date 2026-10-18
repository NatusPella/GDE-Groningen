// Height audit of the road net over the AHN terrain (#78), pure: the script
// scripts/world/terrain_streek_audit.mjs hands it roads and a sampler.
// Per road: how steep the street runs on the terrain (grade), the biggest step
// between two samples (a tear: a tile border, a dyke edge cut off, a hole filled
// wrong) and, for bridges and tunnels, how the deck's reference (deckterrain.js)
// differs from the ground and how smooth it is. Per streek (regioleven.js
// STREKEN) the results are summed.
import { isDeckRoad, deckTerrainAt } from './deckterrain.js';

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
