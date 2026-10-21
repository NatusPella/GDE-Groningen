// The terrain a bridge or tunnel is measured from (#78, ?terrain). AHN has no
// data under a viaduct or a canal: what the field holds there is filled in
// from the surroundings, so the valley or the water bed. A deck whose profile
// (road.z) is relative to that would sink into the valley. Instead the deck
// keeps to the straight line between the terrain at its two ends, and only
// rises with the ground when that stands above the line (a dyke or a hill
// under the deck, a tunnel through it). The ends are the terrain itself, so
// deck and street join without a step. Pure: the sampler is passed in.

export const DECK_DEADBAND = 0.3; // m the ground may stand above the line before the deck follows it

export const isDeckRoad = (r) => !!r && (!!r.bridge || !!r.tunnel) && !!r.pts && r.pts.length >= 2;

// { cum: arc length per vertex, len, a, b: terrain at the two ends }
export function deckProfile(pts, terrainAt) {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const p0 = pts[0], p1 = pts[pts.length - 1];
  return { cum, len: cum[cum.length - 1], a: terrainAt(p0[0], p0[1]), b: terrainAt(p1[0], p1[1]) };
}

// arc position of the point on the polyline nearest to (x, y), clamped to the ends
export function arcPosition(pts, cum, x, y) {
  let best = Infinity, pos = 0;
  for (let i = 0; i + 1 < pts.length; i++) {
    const ax = pts[i][0], ay = pts[i][1], dx = pts[i + 1][0] - ax, dy = pts[i + 1][1] - ay;
    const l2 = dx * dx + dy * dy;
    const t = l2 > 1e-9 ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l2)) : 0;
    const d = Math.hypot(x - ax - dx * t, y - ay - dy * t);
    if (d < best) { best = d; pos = cum[i] + t * Math.sqrt(l2); }
  }
  return pos;
}

// Terrain height the profile of deck road r is relative to at (x, y). `ground` = terrain at
// (x, y) itself. The ends are cached on the road (`_deck`); `ver` (the number of rasters loaded)
// renews them when tiles stream in, as an end may lie on a tile that was not there yet.
export function deckTerrainAt(r, x, y, terrainAt, ground = terrainAt(x, y), ver = 0) {
  let p = r._deck;
  if (!p || p.src !== terrainAt || p.ver !== ver) { p = r._deck = deckProfile(r.pts, terrainAt); p.src = terrainAt; p.ver = ver; }
  const s = p.len > 0 ? arcPosition(r.pts, p.cum, x, y) / p.len : 0;
  const line = p.a + (p.b - p.a) * s;
  return line + Math.max(0, ground - line - DECK_DEADBAND);
}

// The terrain a road or rail that is no deck is measured from (#269): the terrain at its vertices, straight
// in between, clamped to its ends. `ver` renews the vertex heights when rasters stream in, like deckTerrainAt.
export function roadTerrainAt(r, x, y, terrainAt, ver = 0) {
  let v = r._tv;
  if (!v || v.src !== terrainAt || v.ver !== ver) {
    v = r._tv = { h: r.pts.map((p) => terrainAt(p[0], p[1])), src: terrainAt, ver };
  }
  const P = r.pts;
  let best = Infinity, out = v.h[0];
  for (let i = 0; i + 1 < P.length; i++) {
    const ax = P[i][0], ay = P[i][1], dx = P[i + 1][0] - ax, dy = P[i + 1][1] - ay;
    const l2 = dx * dx + dy * dy;
    const t = l2 > 1e-9 ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l2)) : 0;
    const d = Math.hypot(x - ax - dx * t, y - ay - dy * t);
    if (d < best) { best = d; out = v.h[i] + (v.h[i + 1] - v.h[i]) * t; }
  }
  return out;
}
