// Impacten en schade aan voertuigen (#934): alle drempels en factoren op één plek.
// Puur, geen THREE en geen DOM (scripts/impactbalance_test.mjs); vehicle.js en
// breakables.js rekenen ermee. De algemene demper CRASH_DAMAGE_SCALE blijft in
// vehicleimpact.js staan.
//
// De klacht uit de playtest: auto's gingen veel te snel kapot en de impact van
// straatmeubilair en lage snelheden was veel te heftig. Daarom doet een tik onder
// de aanrijdrempel niets, is de schade per m/s ongeveer gehalveerd en doet licht
// straatmeubilair bijna niets. Een echte harde klap (auto tegen auto, een muur op
// snelheid) blijft wel voelen: anders wordt schade rijden vrijblijvend.
//
// De waarden zijn "ruwe" schade vóór CRASH_DAMAGE_SCALE (0,32): een kop-staart-
// botsing van 30 km/u (8,3 m/s) geeft (8,3 - 5) * 2 = 6,6 ruw, dus ~2,1
// gezondheidspunt. Een frontale klap van 72 km/u (20 m/s) raakt het plafond van
// 16 en kost ~5,1 punt. Een muur doet pas vanaf 9 m/s iets.

const IMPACT = {
  hardSpeed: 5,        // m/s: hieronder telt een klap niet als schade
  perMps: 2.0,         // ruwe schade per m/s boven hardSpeed
  max: 16,             // plafond per klap (auto tegen auto)
  wallSpeed: 9,        // m/s: hieronder doet een muur of gebouw niets
  wallPerMps: 1.5,
  wallMax: 12,
  landSpeed: 9,        // m/s neerwaartse klap bij een landing
  landPerMps: 4,
  landMax: 35,
  propSpeed: 6,        // m/s: hieronder doet straatmeubilair niets
  propPerMps: 1.6,
  propMax: 14,
  treeFactor: 1.1,     // een boom is harder dan een bankje of paaltje
  breakPerKg: 0.0018,  // breekbare prop: ruwe schade per m/s per kg
  breakMax: 14,
  flatMin: 6,          // vanaf deze ruwe klap kan een band lek (alleen de speler)
};
export { IMPACT };

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

// Auto tegen auto: closing is de relatieve snelheid langs de botsnormaal, massFactor
// weegt de massa's (0,25..1,6 in vehicle.js).
export function vehicleImpactDamage(closing, massFactor = 1) {
  if (!(closing > IMPACT.hardSpeed)) return 0;
  return clamp((closing - IMPACT.hardSpeed) * IMPACT.perMps * massFactor, 0, IMPACT.max);
}

// Een muur, gebouw, rond vast prop of een aanhanger tegen een stilstaand lichaam:
// alleen de normaalsnelheid telt.
export function wallImpactDamage(closing) {
  if (!(closing > IMPACT.wallSpeed)) return 0;
  return clamp((closing - IMPACT.wallSpeed) * IMPACT.wallPerMps, 0, IMPACT.wallMax);
}

// Neerkomen na een sprong of van een rand: de neerwaartse snelheid op het moment
// van de landing.
export function landingImpactDamage(hit) {
  if (!(hit > IMPACT.landSpeed)) return 0;
  return clamp((hit - IMPACT.landSpeed) * IMPACT.landPerMps, 0, IMPACT.landMax);
}

// Langs een vast prop schrapen of er frontaal tegenaan: een boom telt zwaarder.
export function propImpactDamage(closing, { tree = false } = {}) {
  if (!(closing > IMPACT.propSpeed)) return 0;
  return clamp((closing - IMPACT.propSpeed) * IMPACT.propPerMps * (tree ? IMPACT.treeFactor : 1), 0, IMPACT.propMax);
}

// Een prop die bezwijkt (paaltje, heg, hek): de auto voelt de massa van het ding.
export function propBreakDamage(closing, propMass) {
  if (!(closing > 0) || !(propMass > 0)) return 0;
  return clamp(closing * propMass * IMPACT.breakPerKg, 0, IMPACT.breakMax);
}

// Mag deze klap een band lek slaan? (Alleen de speler, zie vehicle.js.)
export const flatTirePossible = (rawDamage) => rawDamage >= IMPACT.flatMin;
