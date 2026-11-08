// Stuurinvoer van de speler geschaald door de instelling 'steerSensitivity'
// (#801): puur, zodat scripts/steerscale_test.mjs het kan controleren.
export const STEER_MIN = 0.5;
export const STEER_MAX = 1.5;

export function steerScale(raw, sensitivity = 1) {
  const s = Number.isFinite(sensitivity) ? Math.min(STEER_MAX, Math.max(STEER_MIN, sensitivity)) : 1;
  const r = Number.isFinite(raw) ? raw : 0;
  return Math.max(-1, Math.min(1, r * s));
}
