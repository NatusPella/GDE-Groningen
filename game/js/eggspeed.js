// #824: de eierrit van M09. De breekgrens is een echte snelheidslimiet met
// marge: vol gas op de tractor (top ~40 km/u) mag, hard remmen of stoten kost
// eieren. Puur, zodat de HUD en de test dezelfde regel gebruiken.
export const EGG_KMH = 3.6;
export const EGG_SPEED_MARGIN_KMH = 2;

export function eggSpeedKmh(mps) {
  return Number.isFinite(mps) ? Math.max(0, mps) * EGG_KMH : 0;
}

export function eggLimitKmh(def) {
  const s = def && def.eggs && def.eggs.rough && def.eggs.rough.speed;
  return Number.isFinite(s) && s > 0 ? Math.round(s * EGG_KMH) : 0;
}

export function eggSpeedLoss(mps, rough, dt) {
  if (!rough || !Number.isFinite(rough.speed) || !(dt > 0)) return 0;
  return Math.max(0, mps - rough.speed) * (rough.per || 0) * dt;
}

// De waarschuwing komt twee kilometer per uur onder de grens, ruim voordat de
// eieren breken; boven de grens blijft hij staan tot de speler weer zakt.
export function eggSpeedWarning(kmh, limit) {
  return Number.isFinite(kmh) && Number.isFinite(limit) && limit > 0 && kmh >= limit - EGG_SPEED_MARGIN_KMH;
}
