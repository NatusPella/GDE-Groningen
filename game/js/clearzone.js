// Clear zones (issue #176): corridors where no pedestrians, traffic or loose
// props belong, such as the kart track at Kardinge. A zone is a polyline of
// world points with a radius; pure geometry, the enforcing is in
// clearzonesweep.js. window-free so scripts/clearzone_test.mjs can run it.
const zones = new Map();

function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
  const t = l2 > 0 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2)) : 0;
  const cx = ax + dx * t, cy = ay + dy * t;
  return { d: Math.hypot(px - cx, py - cy), cx, cy };
}

// pts: [[x, y], ...] in world metres, r: half-width of the corridor, closed: loop back to the first point
export function addClearZone(id, pts, r, closed = true) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  zones.set(id, { id, pts, r, closed, bounds: [x0 - r, y0 - r, x1 + r, y1 + r] });
}
export function removeClearZone(id) { zones.delete(id); }
export function clearZones() { return [...zones.values()]; }

// The nearest zone point to (x, y) and how far inside the corridor it lies:
// { zone, d, cx, cy } with d < zone.r when inside (margin widens the zone), or null.
export function clearZoneAt(x, y, margin = 0) {
  let best = null;
  for (const z of zones.values()) {
    const b = z.bounds;
    if (x < b[0] - margin || x > b[2] + margin || y < b[1] - margin || y > b[3] + margin) continue;
    const n = z.pts.length;
    const segs = z.closed ? n : n - 1;
    for (let i = 0; i < segs; i++) {
      const a = z.pts[i], c = z.pts[(i + 1) % n];
      const s = segDist(x, y, a[0], a[1], c[0], c[1]);
      if (s.d < z.r + margin && (!best || s.d - z.r < best.d - best.zone.r)) best = { zone: z, d: s.d, cx: s.cx, cy: s.cy };
    }
  }
  return best;
}
export const inClearZone = (x, y, margin = 0) => !!clearZoneAt(x, y, margin);

// Where (x, y) ends up when pushed straight out of the corridor (plus a gap);
// unchanged when it is outside.
export function pushOutOfClearZone(x, y, gap = 0.6) {
  const h = clearZoneAt(x, y);
  if (!h) return { x, y };
  let dx = x - h.cx, dy = y - h.cy;
  const l = Math.hypot(dx, dy);
  if (l < 1e-6) { dx = 1; dy = 0; } else { dx /= l; dy /= l; }
  // straight out first; where another stretch of the zone is in the way, turn until clear
  const r = h.zone.r + gap;
  for (let k = 0; k < 12; k++) {
    const a = Math.atan2(dy, dx) + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * (Math.PI / 6);
    const px = h.cx + Math.cos(a) * r, py = h.cy + Math.sin(a) * r;
    if (!clearZoneAt(px, py)) return { x: px, y: py };
  }
  return { x: h.cx + dx * r, y: h.cy + dy * r };
}

// A corridor along a track: every `every`-th sample, mapped to world metres.
export function corridorPoints(track, toW, every = 3) {
  const out = [];
  for (let i = 0; i < track.N; i += every) { const p = toW(track.u[i], track.v[i]); out.push([p.x, p.y]); }
  return out;
}
