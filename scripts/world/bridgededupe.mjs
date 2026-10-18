// Dubbele bruggen (#235): OSM tekent een brug soms twee keer op dezelfde plek
// (drie `Waardbrug`-wegen op elkaar, een slip en de hoofdrijbaan die samen over
// de Westpoortboulevard lopen, een voetpad en een trap). Twee dekken op gelijke
// hoogte in hetzelfde vlak flikkeren (z-fighting), en een beweegbare brug krijgt
// twee bladen die samen draaien. Hier gaat de zwakste van zo'n paar weg.
//   dropDuplicateBridges(feats) -> feats zonder de dubbele bruggen (nieuwe lijst)
import { Grid } from './bridge_audit.mjs';

export const DUP = { DIST: 1.5, FRAC: 0.6, PARALLEL: 0.8 };
const RANK = { major: 5, normal: 4, minor: 3, cycle: 2, foot: 1 };
const isBridgeRow = (r) => !!r.bridge && !r.tunnel && r.pts && r.pts.length >= 2;

function pointOn(P, x, y) {
  let best = Infinity, ux = 1, uy = 0;
  for (let i = 0; i + 1 < P.length; i++) {
    const ax = P[i][0], ay = P[i][1], dx = P[i + 1][0] - ax, dy = P[i + 1][1] - ay, l2 = dx * dx + dy * dy;
    const t = l2 > 1e-9 ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l2)) : 0;
    const d = Math.hypot(x - ax - dx * t, y - ay - dy * t);
    if (d < best) { best = d; const l = Math.sqrt(l2) || 1; ux = dx / l; uy = dy / l; }
  }
  return { d: best, ux, uy };
}
function samplesOf(P, step) {
  const out = [];
  for (let i = 0; i + 1 < P.length; i++) {
    const L = Math.hypot(P[i + 1][0] - P[i][0], P[i + 1][1] - P[i][1]);
    if (L < 1e-6) continue;
    const ux = (P[i + 1][0] - P[i][0]) / L, uy = (P[i + 1][1] - P[i][1]) / L;
    for (let s = 0; s < L; s += step) out.push({ x: P[i][0] + ux * s, y: P[i][1] + uy * s, ux, uy });
  }
  return out;
}
// does a lie (mostly) on b, running the same way?
export function liesOn(a, b) {
  const S = samplesOf(a.pts, 1.5);
  let close = 0, par = 0;
  for (const s of S) {
    const n = pointOn(b.pts, s.x, s.y);
    if (n.d <= DUP.DIST) { close++; if (Math.abs(n.ux * s.ux + n.uy * s.uy) > 0.9) par++; }
  }
  return S.length > 0 && close / S.length > DUP.FRAC && par / close > DUP.PARALLEL;
}
// the stronger of two duplicates: higher class, then wider, then the one seen first
const stronger = (a, b) => ((RANK[a.cat] || 0) - (RANK[b.cat] || 0)) || ((a.width || 0) - (b.width || 0));

export function dropDuplicateBridges(feats) {
  const idx = [];
  feats.forEach((f, i) => { if (f.kind === 'roads' && isBridgeRow(f.row)) idx.push(i); });
  const grid = new Grid(64);
  for (const i of idx) {
    const P = feats[i].row.pts;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const p of P) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
    grid.add(i, x0, y0, x1, y1);
  }
  const drop = new Set();
  for (const i of idx) {
    const a = feats[i].row;
    for (const j of grid.near((a.pts[0][0] + a.pts[a.pts.length - 1][0]) / 2, (a.pts[0][1] + a.pts[a.pts.length - 1][1]) / 2, 60)) {
      if (j <= i || drop.has(i) || drop.has(j)) continue;
      const b = feats[j].row;
      if (!(liesOn(a, b) && liesOn(b, a))) continue;
      const [keep, out] = stronger(b, a) > 0 ? [b, a] : [a, b];
      if (out.movable && !keep.movable) keep.movable = out.movable;
      drop.add(out === a ? i : j);
    }
  }
  return drop.size ? feats.filter((_, i) => !drop.has(i)) : feats;
}
