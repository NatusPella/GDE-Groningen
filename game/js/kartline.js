// The ideal line of a kart track for the map (#180). Pure: a closed loop of
// points in, the same number of points out, each moved sideways toward the
// inside of the bend it is in (the apex), never further than `maxShare` of the
// half width. A straight stays on the middle. It is a hint for the map, not
// what the kart AI drives.

// smoothing window in points on each side: wider than one bend's kink, so the
// line swings smoothly into and out of the apex
const WINDOW = 3;

export function racingLine(pts, width, { maxShare = 0.6, bendAt = 0.08 } = {}) {
  const n = pts.length;
  if (n < 4 || !(width > 0)) return pts.map((p) => [p[0], p[1]]);
  const at = (i) => pts[((i % n) + n) % n];
  // signed turn per point: positive = left (counter-clockwise in a y-up frame)
  const turn = pts.map((_, i) => {
    const a = at(i - 1), b = at(i), c = at(i + 1);
    const t0 = Math.atan2(b[1] - a[1], b[0] - a[0]);
    const t1 = Math.atan2(c[1] - b[1], c[0] - b[0]);
    let d = t1 - t0;
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    return d;
  });
  const smooth = turn.map((_, i) => {
    let s = 0;
    for (let k = -WINDOW; k <= WINDOW; k++) s += turn[((i + k) % n + n) % n];
    return s / (2 * WINDOW + 1);
  });
  const max = (width / 2) * maxShare;
  return pts.map((p, i) => {
    const a = at(i - 1), c = at(i + 1);
    let tx = c[0] - a[0], ty = c[1] - a[1];
    const L = Math.hypot(tx, ty) || 1;
    tx /= L; ty /= L;
    // left normal; a left bend (positive) moves the line left, to the inside
    const share = Math.max(-1, Math.min(1, smooth[i] / bendAt));
    return [p[0] - ty * share * max, p[1] + tx * share * max];
  });
}
