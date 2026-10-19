// Bridge railings: one list of 2 m railing sections per bridge way, shared by
// streetclutter.js (which draws each section as a breakable 'bridgerail'
// prop) and the walker collision here, so the drawn railing and its collision
// always match. Cars meet the props themselves (breakables.js): solid below
// their break speed, knocked off the bridge above it. Walkers are also held
// by the joints between sections; a knocked-out section opens the railing
// until the prop respawns. Where another way meets the bridge (steps, a quay
// path, a side street) the railing is left open.
import { closestPointOnSegment } from './util.js';
import { propKey, isPropBroken } from './breakables.js';
import { buildingAt } from './tileplace.js';

const GRID = 24;
const OPENING_PAD = 0.4;
const REACH = 1;
export const RAIL_KIND = 'bridgerail';
export const RAIL_HALF = 1;
const RAIL_H = 1.05;

function railingOffset(r) {
  return r.cat === 'major' || r.cat === 'normal' ? (r.width || 6) / 2 + 1.7 : (r.width || 3) / 2 + 0.08;
}

// Is the railing of bridge `r` at (x, y) interrupted by another way crossing it?
function railingOpening(map, r, x, y) {
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

// ring viaducts and tunnels have their own barriers and walls (elevation.js)
export function hasRailings(r) {
  return !!r.bridge && !r.z && r.pts.length >= 2;
}

// Railing sections of bridge way `r`: { x, y, angle, tx, ty, key, seg, side }.
// Sections inside a building or across another way are left out.
export function railingItems(map, r) {
  if (r._railItems) return r._railItems;
  const out = [];
  if (hasRailings(r)) {
    const off = railingOffset(r);
    for (let i = 0; i < r.pts.length - 1; i++) {
      const a = r.pts[i], b = r.pts[i + 1];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (len < 2) continue;
      const angle = Math.atan2(b[1] - a[1], b[0] - a[0]);
      const tx = (b[0] - a[0]) / len, ty = (b[1] - a[1]) / len;
      const n = Math.floor(len / 2);
      const t0 = (len - n * 2) / 2;
      for (const side of [1, -1]) {
        const nx = -ty * side, ny = tx * side;
        for (let k = 0; k < n; k++) {
          const t = t0 + 1 + k * 2;
          const x = a[0] + tx * t + nx * off, y = a[1] + ty * t + ny * off;
          if (buildingAt(map, x, y) || railingOpening(map, r, x, y)) continue;
          out.push({ x, y, angle, tx, ty, key: propKey(RAIL_KIND, x, y), seg: i, side, k, n, cx: a[0], cy: a[1] });
        }
      }
    }
  }
  r._railItems = out;
  return out;
}

function buildRails(map) {
  const lines = [];
  for (const r of map.roads) {
    if (!hasRailings(r)) continue;
    const items = railingItems(map, r);
    const bySide = { 1: [], '-1': [] };
    for (const it of items) {
      bySide[it.side].push(it);
      lines.push({
        a: [it.x - it.tx * RAIL_HALF, it.y - it.ty * RAIL_HALF], b: [it.x + it.tx * RAIL_HALF, it.y + it.ty * RAIL_HALF],
        k1: it.key, k2: it.key, cx: it.cx, cy: it.cy, r,
      });
    }
    // close the wedge on the outside of a bend between two segments
    for (const side of [1, -1]) {
      const list = bySide[side];
      for (let j = 0; j < list.length - 1; j++) {
        const p = list[j], q = list[j + 1];
        if (q.seg !== p.seg + 1 || p.k !== p.n - 1 || q.k !== 0) continue;
        const pa = [p.x + p.tx * RAIL_HALF, p.y + p.ty * RAIL_HALF], qa = [q.x - q.tx * RAIL_HALF, q.y - q.ty * RAIL_HALF];
        if (Math.hypot(qa[0] - pa[0], qa[1] - pa[1]) > 4) continue;
        lines.push({ a: pa, b: qa, k1: p.key, k2: q.key, cx: q.cx, cy: q.cy, r });
      }
    }
  }
  const grid = new Map();
  for (const s of lines) {
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

// Walkers: an intact railing is a thin wall, the circle stays on its side.
// hop: feet height of a jumping walker; high enough clears the railing.
export function resolveRailings(x, y, radius, map, hop = 0) {
  if (hop > RAIL_H - 0.15) return [x, y];
  const list = railsNear(map, x, y);
  if (!list) return [x, y];
  for (const s of list) {
    if (x < s.minx - radius || x > s.maxx + radius || y < s.miny - radius || y > s.maxy + radius) continue;
    const cp = closestPointOnSegment(x, y, s.a[0], s.a[1], s.b[0], s.b[1]);
    if (cp.dist2 >= radius * radius) continue;
    if (isPropBroken(s.k1) || isPropBroken(s.k2) || (s.r && s.r._open)) continue;
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

// First intact railing a walker at (x, y) heading along unit (dx, dy) meets
// within `reach`: { dist, h } or null. Used for vaulting over it.
export function railingAhead(map, x, y, dx, dy, reach) {
  let best = null;
  for (const [qx, qy] of [[x, y], [x + dx * reach, y + dy * reach]]) {
    const list = railsNear(map, qx, qy);
    if (!list) continue;
    for (const s of list) {
      if (isPropBroken(s.k1) || isPropBroken(s.k2)) continue;
      const ex = s.b[0] - s.a[0], ey = s.b[1] - s.a[1];
      const den = dx * ey - dy * ex;
      if (Math.abs(den) < 1e-6) continue;
      const wx = s.a[0] - x, wy = s.a[1] - y;
      const t = (wx * ey - wy * ex) / den;
      const u = (wx * dy - wy * dx) / den;
      if (t < 0 || t > reach || u < 0 || u > 1) continue;
      if (!best || t < best.dist) best = { dist: t, h: RAIL_H, depth: 0.1 };
    }
  }
  return best;
}
