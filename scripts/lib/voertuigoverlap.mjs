// Overlap van twee voertuiglichamen (lengte x breedte, 25% kleiner) met de scheidende-assen-toets; gedeeld door de verkeerstests.
const corners = (v, shrink) => {
  const c = Math.cos(v.angle), s = Math.sin(v.angle), hl = v.halfLen * shrink, hw = ((v.model && v.model.wid) || 1.8) / 2 * shrink;
  return [[hl, hw], [hl, -hw], [-hl, -hw], [-hl, hw]].map(([a, b]) => [v.x + a * c - b * s, v.y + a * s + b * c]);
};
export function pureOverlap(a, b, shrink = 0.75) {
  if (Math.abs(a.x - b.x) > 8 || Math.abs(a.y - b.y) > 8) return false;
  const A = corners(a, shrink), B = corners(b, shrink);
  for (const P of [A, B]) for (let i = 0; i < 2; i++) {
    const ex = P[i + 1][0] - P[i][0], ey = P[i + 1][1] - P[i][1];
    const pr = (Q) => Q.map(([x, y]) => x * ey - y * ex);
    const pa = pr(A), pb = pr(B);
    if (Math.max(...pa) < Math.min(...pb) || Math.max(...pb) < Math.min(...pa)) return false;
  }
  return true;
}
