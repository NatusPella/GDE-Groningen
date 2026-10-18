// Hoe een lekke band eruitziet (#41), puur: welk wiel de lekke is en hoe ver de band is ingezakt.
// vehicle.js laat de auto naar de kant van de lekke band trekken (id-even: links, oneven: rechts);
// models3d_vehicles.js past het gekozen wiel aan (applyFlatTire). scripts/flatlook_test.mjs.

export const FLAT_SCALE = 0.84; // straal van de lekke band ten opzichte van een gezonde

// De trekrichting uit vehicle.js: oneven id trekt +1 (rechts, z > 0), even -1.
export const flatSide = (id) => (id % 2 ? 1 : -1);

// wheels: [{ x, z }] in voertuigcoördinaten (x voor positief, z rechts positief).
// Geeft de index van het voorste wiel aan de lekke kant, of -1 als er geen wielen zijn.
export function flatWheelIndex(wheels, id) {
  const s = flatSide(id);
  let best = -1;
  for (let i = 0; i < (wheels || []).length; i++) {
    const w = wheels[i];
    if (!Number.isFinite(w.x) || !Number.isFinite(w.z) || Math.sign(w.z) !== s) continue;
    if (best < 0 || w.x > wheels[best].x) best = i;
  }
  return best;
}

// Straal en hoogte van het wielmiddelpunt van het lekke wiel (het wiel blijft de grond raken).
export const flatRadius = (r) => r * FLAT_SCALE;
