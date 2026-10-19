// Welk spelobject een cutscene-prop is (#136): voertuigen en dieren in een cutscene komen uit
// dezelfde registers en dezelfde bouwers als de wereld, nooit uit blokjes-placeholders.
// Puur (geen three): cutscript.js valideert ertegen, cutscenehost.js bouwt ermee.
//
//   vehicle: de modelnaam van het voertuigregister (vehicle.js / trafficfleet.js), eventueel met kleur
//   animal:  de dierensoort van de wereld (wildlife.js buildWildlifeMesh3D)
//   decor:   een los voorwerp (geen voertuig, geen dier): mag een eenvoudig blokvormig prop zijn
// Een soort die hier niet staat, of in PLACEHOLDER_KINDS, valt door de validatie.

import { DIEREN } from './dierenregister.js';

export const PROP_SOURCES = {
  auto: { vehicle: 'escort' },                      // de Escapade (HERO_CAR_MODEL)
  bestelbus: { vehicle: 'van', color: '#e8e6e0' },
  bakkie: { vehicle: 'van', color: '#5a6b3a' },     // Berends bakkie: de bestelbus in zijn kleur
  trekker: { vehicle: 'tractor' },
  politie: { vehicle: 'police' },
  fiets: { vehicle: 'bike' },
  // dieren komen uit het dierenregister (#193): elk dier met een cutscene-soort
  ...Object.fromEntries(DIEREN.filter((d) => d.cutscene).map((d) => [d.cutscene, { animal: d.kind, dier: d.id }])),
};

export const DECOR_KINDS = ['doos', 'tas', 'radio', 'bord', 'koffer', 'bal', 'matras', 'automaat', 'duiventil', 'zuil', 'klembord'];

// geen spelobject: er is geen register voor, dus niet in een cutscene
export const PLACEHOLDER_KINDS = ['aanhanger'];

export const VEHICLE_MODEL_NAMES = ['escort', 'van', 'tractor', 'police', 'bike'];
export const ANIMAL_KINDS = DIEREN.filter((d) => d.cutscene).map((d) => d.kind);

export const propSource = (kind) => PROP_SOURCES[kind] || null;
export const isDecor = (kind) => DECOR_KINDS.includes(kind);

// null als de soort mag, anders de foutmelding
export function propKindIssue(kind) {
  if (PLACEHOLDER_KINDS.includes(kind)) return `soort ${kind} bestaat niet in de wereld (placeholder): gebruik een echt voertuig of dier`;
  if (PROP_SOURCES[kind] || isDecor(kind)) return null;
  return `onbekende soort ${kind}`;
}
