import { pointInPolygon } from './util.js';

// Bullets, thrown things and the aim assist all ask where a line first meets a building; a leaf so
// they need not import combat.js for it (import cycle, #108). combat.js re-exports it.
// First building edge crossed between (x0, y0) and (x1, y1): { t, x, y, nx, ny, b }.
// Buildings the bullet starts inside (fired from a passage) are ignored.
export function wallOnPath(map, x0, y0, x1, y1) {
  const dx = x1 - x0, dy = y1 - y0;
  let best = null;
  for (const bld of map.buildingsNear((x0 + x1) / 2, (y0 + y1) / 2, Math.hypot(dx, dy) / 2 + 1)) {
    const [minx, miny, maxx, maxy] = bld.bounds;
    if (Math.max(x0, x1) < minx || Math.min(x0, x1) > maxx || Math.max(y0, y1) < miny || Math.min(y0, y1) > maxy) continue;
    const pts = bld.pts;
    let hit = null;
    for (let i = 0; i < pts.length - 1; i++) {
      const ax = pts[i][0], ay = pts[i][1], ex = pts[i + 1][0] - ax, ey = pts[i + 1][1] - ay;
      const den = dx * ey - dy * ex;
      if (Math.abs(den) < 1e-9) continue;
      const wx = ax - x0, wy = ay - y0;
      const t = (wx * ey - wy * ex) / den;
      const u = (wx * dy - wy * dx) / den;
      if (t < 0 || t > 1 || u < 0 || u > 1 || (hit && t >= hit.t)) continue;
      const el = Math.hypot(ex, ey) || 1;
      let nx = -ey / el, ny = ex / el;
      if (nx * dx + ny * dy > 0) { nx = -nx; ny = -ny; }
      hit = { t, x: x0 + dx * t, y: y0 + dy * t, nx, ny, b: bld };
    }
    if (!hit || (best && hit.t >= best.t) || pointInPolygon(x0, y0, pts)) continue;
    best = hit;
  }
  return best;
}
