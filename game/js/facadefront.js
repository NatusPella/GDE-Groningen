// Which facade of a building faces the street (AI-tells 23-11, docs/AI-TELLS-BEELD-23-11.md): the front door and the shopfront
// go on the open edge that looks onto a street, not on the longest wall. The longest wall of a terraced house is often the back
// (the garden side) and a door or shop window there reads at once as "a building with its back to the street".
// Pure: only the map's roadsNear and buildingsNear, no three.js. Without a map (an audit, a test) the caller keeps its own choice.

import { pointInPolygon } from './util.js';

// streets a front door can face: car roads and pedestrian streets, not a track, a service alley, a cycle path or a footway
export const isStreet = (r) => !!r && (((r.cat === 'major' || r.cat === 'normal' || r.cat === 'minor') && r.type !== 'track' && r.type !== 'service') || r.type === 'pedestrian') && !r.tunnel;
export const FRONT_MAX_DIST = 32;   // m from the facade to the street's centre line
export const FRONT_MIN_COS = 0.55;  // the street lies in front of the facade (within ~57 degrees of its normal)

// Nearest street point to (x, y) within r: { x, y, d, road } or null.
export function nearestStreet(map, x, y, r = FRONT_MAX_DIST) {
  if (!map || !map.roadsNear) return null;
  let best = null, bd = r * r;
  for (const road of map.roadsNear(x, y, r)) {
    if (!isStreet(road)) continue;
    const P = road.pts;
    for (let i = 0; i < P.length - 1; i++) {
      const ax = P[i][0], ay = P[i][1], dx = P[i + 1][0] - ax, dy = P[i + 1][1] - ay, l2 = dx * dx + dy * dy;
      let t = l2 > 1e-9 ? ((x - ax) * dx + (y - ay) * dy) / l2 : 0;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const cx = ax + dx * t, cy = ay + dy * t, d2 = (x - cx) ** 2 + (y - cy) ** 2;
      if (d2 < bd) { bd = d2; best = { x: cx, y: cy, d: Math.sqrt(d2), road }; }
    }
  }
  return best;
}

// Is the way from (x0, y0) to (x1, y1) blocked by another building than `self`? Sampled every 1.5 m.
function blocked(map, self, x0, y0, x1, y1) {
  if (!map.buildingsNear) return false;
  const len = Math.hypot(x1 - x0, y1 - y0);
  const near = map.buildingsNear((x0 + x1) / 2, (y0 + y1) / 2, len / 2 + 1).filter((o) => o !== self && o.pts && o.bounds);
  if (!near.length) return false;
  const n = Math.max(1, Math.floor(len / 1.5));
  for (let i = 1; i < n; i++) {
    const t = i / n, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t;
    for (const o of near) {
      const bb = o.bounds;
      if (x >= bb[0] && x <= bb[2] && y >= bb[1] && y <= bb[3] && pointInPolygon(x, y, o.pts)) return true;
    }
  }
  return false;
}

// How an edge { ax, ay, len, tx, ty, nx, ny } looks onto the street: { d, cos } of the nearest street point straight in front
// (seen from the middle and the quarter points), or null when no street lies in front within FRONT_MAX_DIST unblocked.
export function edgeStreet(map, self, e) {
  let best = null;
  for (const f of e.len > 6 ? [0.25, 0.5, 0.75] : [0.5]) {
    const mx = e.ax + e.tx * e.len * f + e.nx * 0.4, my = e.ay + e.ty * e.len * f + e.ny * 0.4;
    // look from a point a few metres out, so the street along this facade wins over one round the corner
    const s = nearestStreet(map, mx + e.nx * 4, my + e.ny * 4, FRONT_MAX_DIST);
    if (!s) continue;
    const dx = s.x - mx, dy = s.y - my, d = Math.hypot(dx, dy);
    const cos = d > 1e-6 ? (dx * e.nx + dy * e.ny) / d : 1;
    if (cos < FRONT_MIN_COS || d > FRONT_MAX_DIST) continue;
    if (blocked(map, self, mx, my, s.x, s.y)) continue;
    if (!best || d < best.d) best = { d, cos, road: s.road };
  }
  return best;
}

// Second choice when no facade has a clear view of a street within FRONT_MAX_DIST (a farm down a drive, a house behind a garage
// in the front garden): the open edge that turns most towards the nearest street within `r`, if it turns towards it at all.
export function towardStreetEdge(map, self, open, minLen = 1.6, r = 90) {
  if (!map || !map.roadsNear || !self || !self.bounds || !open || !open.length) return null;
  const cx = (self.bounds[0] + self.bounds[2]) / 2, cy = (self.bounds[1] + self.bounds[3]) / 2;
  const s = nearestStreet(map, cx, cy, r);
  if (!s) return null;
  let best = null, bestCos = 0.3;
  for (const e of open) {
    if (e.len < minLen) continue;
    const mx = e.ax + e.tx * e.len * 0.5, my = e.ay + e.ty * e.len * 0.5, dx = s.x - mx, dy = s.y - my, d = Math.hypot(dx, dy);
    const cos = d > 1e-6 ? (dx * e.nx + dy * e.ny) / d : 0;
    if (cos > bestCos + 1e-9) { bestCos = cos; best = e; }
  }
  return best;
}

// The open edge that faces a street (nearest street first, a named one a little ahead, then the longer wall), or null when none
// does: the caller keeps its own choice then. `open`: the edges that may carry a door (not a party wall, long enough).
export function streetFrontEdge(map, self, open, minLen = 1.6) {
  if (!map || !map.roadsNear || !open || !open.length) return null;
  let best = null, bestScore = Infinity;
  for (const e of open) {
    if (e.len < minLen) continue;
    const s = edgeStreet(map, self, e);
    if (!s) continue;
    // metres: the distance to the street, 3 m less for a named street, 0.15 m less per metre of wall (a wider front wins a tie)
    const score = s.d - (s.road && s.road.name ? 3 : 0) - Math.min(e.len, 20) * 0.15;
    if (score < bestScore) { bestScore = score; best = e; }
  }
  return best;
}
