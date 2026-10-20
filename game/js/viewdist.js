// Zichtafstand: the view distance (m) per setting and what follows from it.
// Pure, so scripts/gfx_profile_test.mjs and scripts/viewdist_estimate.mjs can
// use it in Node.

export const VIEW_DISTANCES = { kort: 150, normaal: 350, ver: 600, heelver: 900 };
export const DRAW_DISTANCE_LABELS = { kort: 'kort', normaal: 'normaal', ver: 'ver', heelver: 'heel ver' };

// The view distance in use. 'heel ver' drops back to 'ver' while adaptive
// quality has stepped down (render scale under 90% or cpuLevel > 0), so a
// machine that cannot carry it loses the extra distance before more detail.
export function viewDistanceFor(setting, scale = 1, cpuLvl = 0) {
  // cpuLevel 3 (a machine that cannot even carry level 2, scripts/perf/zwak.mjs): the shortest view
  if (cpuLvl >= 3) return VIEW_DISTANCES.kort;
  if (setting === 'heelver' && (scale < 0.9 || cpuLvl > 0)) setting = 'ver';
  return VIEW_DISTANCES[setting] || VIEW_DISTANCES.normaal;
}

// The high-detail radius (scene3d.js DRAW_DIST: full buildings, roads, street
// furniture, walkers) per quality profile. It was one 140 m for everyone; a
// better profile with a view distance of 350 m or more gets a bigger ring.
// The cost grows with the area: DETAIL_DIST[q]^2 / 140^2 times the meshes of
// the ring (hoog 1.84x), which stays inside the Hoog budget (GPU <= 1.2 GB):
// scripts/viewdist_test.mjs keeps that ratio under DETAIL_AREA_MAX.
export const DETAIL_BASE = 140;
export const DETAIL_DIST = { laag: 140, middel: 160, hoog: 190 };
export const DETAIL_AREA_MAX = 2;
// cpuLevel 3 (viewdist.js viewDistanceFor) also shrinks the ring to DETAIL_WEAK m: a third of the meshes
export const DETAIL_WEAK = 100;
export function detailDistanceFor(quality, viewDist, cpuLvl = 0) {
  if (cpuLvl >= 3) return DETAIL_WEAK;
  if (!(viewDist >= 350)) return DETAIL_BASE;
  return DETAIL_DIST[quality] || DETAIL_BASE;
}

// Rails and trains (railway3d.js) are long thin things that show on the
// horizon, so they reach further than the 190 m they were fixed at: the view
// distance times RAIL_VIEW.factor, within [min, max]. Memory: a chunk of
// track is a few hundred KB of geometry, shared materials; RAIL_CHUNK_MB is
// the budget estimate per chunk (scripts/viewdist_test.mjs keeps the worst
// case far under the GPU budget of 1.2 GB on Hoog).
export const RAIL_VIEW = { min: 190, factor: 1.15, max: 800 };
export const RAIL_CHUNK = 250;
export const RAIL_CHUNK_MB = 0.5;
export function railViewDistance(viewDist, cfg = RAIL_VIEW) {
  return Math.min(cfg.max, Math.max(cfg.min, viewDist * cfg.factor));
}
// whether the chunk centred on (cx, cy) is built and shown with the focus at (px, py) and
// a rail reach of `view`: the square of the reach plus the half diagonal of a chunk
// (railway3d.js syncChunks; pure so scripts/rail_lod_test.mjs can check it per distance)
export function railChunkWanted(cx, cy, px, py, view) {
  const reach = view + RAIL_CHUNK * 0.71;
  return Math.abs(cx - px) < reach && Math.abs(cy - py) < reach;
}
// most chunks that can be resident at that reach (every cell of the square full)
export function railChunkCount(view) {
  const n = Math.ceil((2 * (view + RAIL_CHUNK * 0.71)) / RAIL_CHUNK) + 1;
  return n * n;
}

// Ommeland props (countryside.js) stream a little past the fog; beyond 'ver'
// they stop at 95% of the view distance, where the fog has nearly hidden them
// and the skyline belts take over.
export function propRadius(viewDist) {
  return Math.min(Math.max(620, viewDist * 0.95), Math.max(260, viewDist + 60));
}
