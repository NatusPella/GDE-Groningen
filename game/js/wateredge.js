// #936/#949: de rand van het water. Een auto die rustig tegen een graskade of
// kade aan rijdt hoort te worden tegengehouden, niet door het gras het water in
// te schuiven. Rijdt hij hard, dan gaat hij er met echte physics overheen (zie
// vehicle.js checkVehicleWater/startVehicleFall: vallen, plons, drijven, zinken).
// Puur, geen THREE en geen DOM (scripts/waterkant_test.mjs); vehicle.js geeft de
// watertoets en de kaart mee.

export const EDGE = {
  minSpeed: 0.6,      // m/s: hieronder staat de auto (bijna) stil en gebeurt er niets
  stopSpeed: 9,       // m/s (32 km/u): hierboven rijd je de wal over, met physics en plons
  pad: 0.6,           // m: zover voor de neus kijken we (de auto stopt met de bumper bij de wal)
  extra: 2,           // m: marge achter de neus voor de zoektocht naar de rand
  backOff: 0.06,      // m: hoeveel we de auto van de rand terugzetten
  keep: 0.12,         // deel van de snelheid dat na de tik overblijft
  steps: 6,           // halveringen in de zoektocht naar het laatste droge punt
};

// Mag deze beweging de wal niet over? (puur)
export function shoreBlocks({ speed, onLand, aheadWet, onBridge = false, airborne = false, boat = false, heli = false }) {
  if (boat || heli || airborne || onBridge) return false;
  if (!onLand || !aheadWet) return false;
  return speed >= EDGE.minSpeed && speed < EDGE.stopSpeed;
}

// Zoekt vanaf `from` langs (dx, dy) het laatste droge punt vóór het water.
// wet(x, y) zegt of dat punt water is. Geeft de afstand vanaf `from`, of null als
// er binnen `reach` geen water is. Eerst in stappen (een smalle sloot mag niet
// gemist worden), daarna met een paar halveringen nauwkeurig.
export function lastDryDistance(from, dx, dy, reach, wet, step = 0.5) {
  if (!(reach > 0)) return null;
  const at = (d) => [from.x + dx * d, from.y + dy * d];
  let prev = 0;
  for (let d = Math.min(step, reach); ; d = Math.min(d + step, reach)) {
    const [x, y] = at(d);
    if (wet(x, y)) {
      let lo = prev, hi = d;
      for (let i = 0; i < EDGE.steps; i++) {
        const mid = (lo + hi) / 2;
        const [mx, my] = at(mid);
        if (wet(mx, my)) hi = mid; else lo = mid;
      }
      return lo;
    }
    prev = d;
    if (d >= reach) break;
  }
  return null;
}

// Hoeveel moet de auto terug? De neus (halfLen + pad) hoort op het laatste droge
// punt te staan. Geeft de afstand in meters, of 0 als hij al vrij staat.
export function edgeBackOff(lastDry, halfLen, pad = EDGE.pad) {
  const nose = halfLen + pad;
  const over = Math.max(0, nose - (Number.isFinite(lastDry) ? lastDry : nose));
  return over > 0 ? over + EDGE.backOff : 0;
}
