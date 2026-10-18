// Static world data for the simulation worker (#58, step 2): drivable roads
// as flat Float32Arrays, sent once with the init message. The road id is the
// index in map.roads, so the main thread can map a snapshot's road back to
// the real road object when it takes an agent over.

const CAR_CATS = new Set(['major', 'normal', 'minor']);

// kinds: 'car' (drivable roads) or 'ped' (footways and paths).
export function buildSimRoads(map, kind = 'car', { minLen = 20 } = {}) {
  const out = [];
  const roads = (map && map.roads) || [];
  for (let id = 0; id < roads.length; id++) {
    const r = roads[id];
    if (!r || !r.pts || r.pts.length < 2) continue;
    const isFoot = r.cat === 'foot';
    if (kind === 'car' ? !CAR_CATS.has(r.cat) || r.z : !isFoot) continue; // bridges and tunnels (z) stay on the main thread
    let len = 0;
    for (let i = 1; i < r.pts.length; i++) len += Math.hypot(r.pts[i][0] - r.pts[i - 1][0], r.pts[i][1] - r.pts[i - 1][1]);
    if (len < minLen) continue;
    const pts = new Float32Array(r.pts.length * 2);
    for (let i = 0; i < r.pts.length; i++) { pts[2 * i] = r.pts[i][0]; pts[2 * i + 1] = r.pts[i][1]; }
    out.push({ id, pts });
  }
  return out;
}

// Stop lines for the kernel from the map's signal heads: { road, s } needs
// the head's position projected on its road; heads without a road are skipped.
export function projectOnRoad(pts, x, y) {
  let best = null, cum = 0;
  for (let i = 0; i + 1 < pts.length / 2; i++) {
    const ax = pts[2 * i], ay = pts[2 * i + 1], bx = pts[2 * i + 2], by = pts[2 * i + 3];
    const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy, l = Math.sqrt(l2);
    const t = l2 > 0 ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l2)) : 0;
    const d = Math.hypot(ax + dx * t - x, ay + dy * t - y);
    if (!best || d < best.d) best = { d, s: cum + t * l, ang: Math.atan2(dy, dx), cx: ax + dx * t, cy: ay + dy * t };
    cum += l;
  }
  if (best) best.len = cum;
  return best;
}
