// Zichtafstand: the view distance (m) per setting and what follows from it.
// Pure, so scripts/gfx_profile_test.mjs and scripts/viewdist_estimate.mjs can
// use it in Node.

export const VIEW_DISTANCES = { kort: 150, normaal: 350, ver: 600, heelver: 900 };
export const DRAW_DISTANCE_LABELS = { kort: 'kort', normaal: 'normaal', ver: 'ver', heelver: 'heel ver' };

// The view distance in use. 'heel ver' drops back to 'ver' while adaptive
// quality has stepped down (render scale under 90% or cpuLevel > 0), so a
// machine that cannot carry it loses the extra distance before more detail.
export function viewDistanceFor(setting, scale = 1, cpuLvl = 0) {
  if (setting === 'heelver' && (scale < 0.9 || cpuLvl > 0)) setting = 'ver';
  return VIEW_DISTANCES[setting] || VIEW_DISTANCES.normaal;
}

// Ommeland props (countryside.js) stream a little past the fog; beyond 'ver'
// they stop at 95% of the view distance, where the fog has nearly hidden them
// and the skyline belts take over.
export function propRadius(viewDist) {
  return Math.min(Math.max(620, viewDist * 0.95), Math.max(260, viewDist + 60));
}
