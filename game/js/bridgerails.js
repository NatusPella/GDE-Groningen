// Bridge railings as solid line segments, matching the green railings
// streetclutter.js draws along every bridge way: walkers and cars can no
// longer walk or drive off a bridge into the canal. Where another way meets
// the bridge (steps, a quay path, a side street) the railing is left open.
import { closestPointOnSegment, pointInPolygon, inWaterPoly } from './util.js';

const PIECE = 0.5;
const GRID = 24;
const OPENING_PAD = 0.4;
// widest query radius (vehicle band) - segments are filed in every cell it reaches
const REACH = 1.6;

export function railingOffset(r) {
  return r.cat === 'major' || r.cat === 'normal' ? (r.width || 6) / 2 + 1.7 : (r.width || 3) / 2 + 0.08;
}

function insideBuilding(map, x, y) {
  for (const b of map.buildingsNear(x, y, 0.5)) {
    const [minx, miny, maxx, maxy] = b.bounds;
    if (x >= minx && x <= maxx && y >= miny && y <= maxy && pointInPolygon(x, y, b.pts)) return true;
  }
  return false;
}

// Is the railing of bridge `r` at (x, y) interrupted by another way crossing it?
export function railingOpening(map, r, x, y) {
  for (const o of map.roadsNear(x, y, 8)) {
    if (o === r) continue;
    const t = (o.width || 3) / 2 + OPENING_PAD;
    const P = o.pts;
    for (let i = 0; i < P.length - 1; i++) {
      if (closestPointOnSegment(x, y, P[i][0], P[i][1], P[i + 1][0], P[i + 1][1]).dist2 < t * t) return true;
    }
  }
  return false;
}

function buildRails(map) {
  const segs = [];
  for (const r of map.roads) {
    // ring viaducts and tunnels have their own barriers and walls (elevation.js)
    if (!r.bridge || r.z || r.pts.length < 2) continue;
    const off = railingOffset(r);
    for (const side of [1, -1]) {
      let prevEnd = null;
      for (let i = 0; i < r.pts.length - 1; i++) {
        const a = r.pts[i], b = r.pts[i + 1];
        const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (len < 2) { prevEnd = null; continue; }
        const tx = (b[0] - a[0]) / len, ty = (b[1] - a[1]) / len;
        const nx = -ty * side, ny = tx * side;
        const t0 = (len - Math.floor(len / 2) * 2) / 2;
        const at = (t) => [a[0] + tx * t + nx * off, a[1] + ty * t + ny * off];
        const n = Math.max(1, Math.round((len - 2 * t0) / PIECE));
        const items = Math.floor(len / 2);
        const itemSolid = [];
        for (let j = 0; j < items; j++) {
          const q = at(t0 + 1 + j * 2);
          itemSolid.push(!railingOpening(map, r, q[0], q[1]) && !insideBuilding(map, q[0], q[1]));
        }
        let runStart = null, last = null;
        const flush = () => { if (runStart && last) segs.push({ a: runStart, b: last, cx: a[0], cy: a[1], r }); runStart = null; };
        for (let k = 0; k <= n; k++) {
          const p = at(t0 + ((len - 2 * t0) * k) / n);
          const u = ((len - 2 * t0) * Math.min(k + 0.5, n - 0.5)) / n;
          const solid = itemSolid[Math.min(items - 1, Math.floor(u / 2))];
          if (solid) {
            if (!runStart) {
              runStart = p;
              if (k === 0 && prevEnd) segs.push({ a: prevEnd, b: p, cx: a[0], cy: a[1], r });
            }
            last = p;
          } else {
            if (runStart) last = p;
            flush();
          }
        }
        const end = at(len - t0);
        prevEnd = runStart ? end : null;
        flush();
      }
    }
  }
  const grid = new Map();
  for (const s of segs) {
    s.minx = Math.min(s.a[0], s.b[0]); s.maxx = Math.max(s.a[0], s.b[0]);
    s.miny = Math.min(s.a[1], s.b[1]); s.maxy = Math.max(s.a[1], s.b[1]);
    for (let gx = Math.floor((s.minx - REACH) / GRID); gx <= Math.floor((s.maxx + REACH) / GRID); gx++) {
      for (let gy = Math.floor((s.miny - REACH) / GRID); gy <= Math.floor((s.maxy + REACH) / GRID); gy++) {
        const k = gx + ',' + gy;
        if (!grid.has(k)) grid.set(k, []);
        grid.get(k).push(s);
      }
    }
  }
  return grid;
}

function railsNear(map, x, y) {
  if (!map._bridgeRails) map._bridgeRails = buildRails(map);
  return map._bridgeRails.get(Math.floor(x / GRID) + ',' + Math.floor(y / GRID));
}

// Walkers: a railing is a thin wall, the circle stays on whichever side it is.
export function resolveRailings(x, y, radius, map) {
  const list = railsNear(map, x, y);
  if (!list) return [x, y];
  for (const s of list) {
    if (x < s.minx - radius || x > s.maxx + radius || y < s.miny - radius || y > s.maxy + radius) continue;
    const cp = closestPointOnSegment(x, y, s.a[0], s.a[1], s.b[0], s.b[1]);
    if (cp.dist2 >= radius * radius) continue;
    const d = Math.sqrt(cp.dist2);
    let ox, oy;
    if (d > 1e-6) { ox = (x - cp.x) / d; oy = (y - cp.y) / d; } else {
      const ex = s.b[0] - s.a[0], ey = s.b[1] - s.a[1], el = Math.hypot(ex, ey) || 1;
      ox = -ey / el; oy = ex / el;
      if ((s.cx - cp.x) * ox + (s.cy - cp.y) * oy < 0) { ox = -ox; oy = -oy; }
    }
    x = cp.x + ox * radius;
    y = cp.y + oy * radius;
  }
  return [x, y];
}

// Vehicles move fast enough to cross a thin line in one frame, so for them the
// railing is one-sided: a point up to `band` m past it over open water is
// pushed back onto the deck. Returns { x, y, nx, ny, depth } or null.
export function railingContact(map, x, y, band = 1.4) {
  const list = railsNear(map, x, y);
  if (!list) return null;
  let best = null;
  for (const s of list) {
    if (x < s.minx - band || x > s.maxx + band || y < s.miny - band || y > s.maxy + band) continue;
    const ex = s.b[0] - s.a[0], ey = s.b[1] - s.a[1], el = Math.hypot(ex, ey);
    if (el < 1e-6) continue;
    let nx = -ey / el, ny = ex / el;
    const mx = (s.a[0] + s.b[0]) / 2, my = (s.a[1] + s.b[1]) / 2;
    if ((s.cx - mx) * nx + (s.cy - my) * ny < 0) { nx = -nx; ny = -ny; }
    const cp = closestPointOnSegment(x, y, s.a[0], s.a[1], s.b[0], s.b[1]);
    const along = (x - s.a[0]) * ex / el + (y - s.a[1]) * ey / el;
    if (along < 0 || along > el) continue;
    const signed = (x - cp.x) * nx + (y - cp.y) * ny;
    if (signed > 0 || signed < -band) continue;
    if (!inWaterPoly(map, cp.x - nx * 0.6, cp.y - ny * 0.6)) continue;
    const depth = -signed + 0.05;
    if (!best || depth > best.depth) best = { x: cp.x, y: cp.y, nx, ny, depth };
  }
  return best;
}
