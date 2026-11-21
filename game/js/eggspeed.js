// #824: de eierrit van M09. De breekgrens is een echte snelheidslimiet met
// marge: vol gas op de tractor (top ~40 km/u) mag, hard remmen of stoten kost
// eieren. Puur, zodat de HUD en de test dezelfde regel gebruiken.
export const EGG_KMH = 3.6;
const EGG_SPEED_MARGIN_KMH = 2;

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

// De foutmelding als de eieren te veel stuk zijn. failAt is een percentage van de meter, geen aantal eieren:
// bij 60 eieren en failAt 38 faalt de rit met 22 of 23 heel (dus ruim 60% stuk), niet "meer dan de helft".
// Met een eierental noemt de tekst het echte aantal, zonder die telling de vaste tekst van de opdracht.
export function eggFailText(def, eggsPct) {
  const e = def && def.eggs;
  if (!e) return '';
  if (!(e.count > 0) || !Number.isFinite(eggsPct)) return e.fail || '';
  const heel = Math.max(0, Math.min(e.count, Math.round(eggsPct / 100 * e.count)));
  return `te veel eieren zijn stuk: nog maar ${heel} van de ${e.count} heel. Laad opnieuw`;
}
