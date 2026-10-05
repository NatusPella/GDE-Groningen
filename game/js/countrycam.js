import { countryWeight } from './countryfield.js';
import { pushOutOfPlan } from './countryplan.js';
import { pushOutOfTrunks } from './countrywalls.js';

// The Ommeland's solids (farm and real buildings, silos, village furniture,
// tree trunks: the same queries vehicles and walkers collide with) have no
// meshes in the camera targets, so the ray is sampled for them. Anything
// higher than CAM_COUNTRY_H is above the barns and clear. Distance or Infinity.
const CAM_COUNTRY_H = 8;
const CAM_COUNTRY_STEP = 0.8;
const _countryProbe = { x: 0, y: 0 };
export function countryRayHit(ox, oy, oz, ux, uy, uz, len) {
  if (countryWeight(ox + ux * len * 0.5, oz + uz * len * 0.5) <= 0.5) return Infinity;
  for (let d = CAM_COUNTRY_STEP; d <= len + CAM_COUNTRY_STEP / 2; d += CAM_COUNTRY_STEP) {
    if (oy + uy * d > CAM_COUNTRY_H) continue;
    _countryProbe.x = ox + ux * d; _countryProbe.y = oz + uz * d;
    const a = pushOutOfPlan(_countryProbe, 0.3);
    _countryProbe.x = ox + ux * d; _countryProbe.y = oz + uz * d;
    if (a || pushOutOfTrunks(_countryProbe, 0.3)) return Math.max(0, d - CAM_COUNTRY_STEP);
  }
  return Infinity;
}
