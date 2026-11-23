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
  // #1121: de snackwagen, de vettankwagen en de trekker-limo zijn echte wereldmodellen, geen bestelbus of trekker als stand-in
  snackwagen: { vehicle: 'foodtruck', model: { name: 'foodtruck', len: 5.4, wid: 2.1, color: 0x2f6fb0 } },
  tankwagen: { vehicle: 'truck', model: { name: 'truck', tank: true, livery: 'usmemvet', len: 8.5, wid: 2.5, color: 0xe6c21a } },
  limo: { vehicle: 'trekkerlimo', model: { name: 'trekkerlimo', len: 5.6, wid: 2.0, color: 0x141414 } },
  // dieren komen uit het dierenregister (#193): elk dier met een cutscene-soort
  ...Object.fromEntries(DIEREN.filter((d) => d.cutscene).map((d) => [d.cutscene, { animal: d.kind, dier: d.id }])),
};


// Wat een personage laag draagt (tas, doos): op heuphoogte in de hand, niet op borsthoogte (cutscript.js en cutscenehost.js)
export const CARRY_LOW = ['tas', 'koffer', 'doos', 'bal', 'krat', 'pan', 'vuurwerk', 'koelbox', 'jas', 'aktetas', 'hesjes', 'klomp'];
export const DECOR_KINDS = [
  'doos', 'tas', 'radio', 'bord', 'koffer', 'bal', 'matras', 'automaat',
  'duiventil', 'zuil', 'klembord', 'briefje', 'botsauto', 'klomp', 'stempel', 'pinpas',
  'map', 'bierviltje', 'fotolijst', 'statief', 'krat', 'pan', 'vuurwerk', 'koelbox',
  'jas', 'aktetas', 'hesjes', 'container', 'scherm', 'prikbord', 'broodtrommel', 'kantoorwagen',
  'frituuraanhanger', 'friteuse', 'deken', 'soepketel', 'mosterdpot', 'kaart', 'hek',
];

// De kwaliteitsnorm voor elk voorwerp in een cutscene (eigenaar, 23-11): nieuwe voorwerpen mogen, maar alleen in de gedeelde bibliotheek
// (storyprops.js DECOR_MAKERS, één register voor spel en scènes) en op het detailniveau van de beste wereldmodellen. De checklist hoort bij
// elke nieuwe bouwer; scripts/cutscene_assets_audit.mjs bewaakt het register, scripts/verhaal_props_audit.mjs de budgetten.
export const PROP_NORM = [
  'Eén bouwer per soort in het register (storyprops.js DECOR_MAKERS); geen losse geometrie in scènecode of montagecode.',
  'Oorsprong op de grond, +x is de voorkant; de afmeting klopt met wat het ding in de wereld is (een doos is geen kubus van een meter).',
  'Een herkenbaar silhouet van dichtbij: een greep, bies, rand, opdruk of scharnier; geen kaal blok of kale cilinder (de camera komt op 1,5 m).',
  'Twee tot zes materialen uit het wereldpalet, laag-poly binnen het budget van DECOR_BUDGET, geen NaN en geen overlappende vlakken.',
  'De soort staat in PROP_KINDS (cutscript.js) én in DECOR_KINDS (hier); voertuigen en dieren komen uit de wereld (PROP_SOURCES), niet uit de bibliotheek.',
  'Een scène heeft het voorwerp nodig voor het verhaal of de grap; de cue (draag, leg neer, wijs) laat het zien, het ligt niet voor de sier in beeld.',
];

// geen spelobject: er is geen register voor, dus niet in een cutscene
export const PLACEHOLDER_KINDS = ['aanhanger'];

// Zitten aan tafel (#859): de keuken van de opening gebruikt deze pose in de host én in
// de intromontage. De armen hangen op schoot/tafel ('lap'); 'wheel' is de stuurhouding
// van de auto en zette Tessa met wijd uitgespreide armen naast de tafel.
export const TABLE_SIT = { recline: 0.02, footX: 0.42, footY: -0.44, arms: 'lap' };

export const VEHICLE_MODEL_NAMES = [
  'escort', 'van', 'tractor', 'police', 'bike', 'foodtruck', 'truck', 'trekkerlimo',
];
export const ANIMAL_KINDS = DIEREN.filter((d) => d.cutscene).map((d) => d.kind);

// De grondafmetingen van een voertuig-prop [lengte, breedte, hoogte] in m, met +x naar voren: een camera blijft eruit (cutscript.js,
// #263: de camera stond in de Escapade, een rode band en een blauwe ruit dwars door het beeld)
export const PROP_FOOT = {
  auto: [4.7, 1.95, 1.75],
  bestelbus: [5.4, 2.1, 2.5],
  bakkie: [5.4, 2.1, 2.5],
  trekker: [4.5, 2.4, 3.0],
  politie: [4.8, 1.95, 1.75],
  fiets: [1.9, 0.7, 1.15],
  frituuraanhanger: [3.9, 1.8, 2.0],
  // hoge losse voorwerpen: op ooghoogte vult een bord of automaat anders het beeld (M01.3: het witte bord vlak voor de lens, #136)
  bord: [0.9, 0.9, 1.7],
  automaat: [0.9, 0.8, 1.6],
  zuil: [0.6, 0.6, 1.4],
  duiventil: [1.6, 1.1, 2.2],
  koe: [2.4, 0.9, 1.5],
  botsauto: [1.7, 1.1, 1.15],
  snackwagen: [5.4, 2.1, 3.3],
  tankwagen: [8.5, 2.5, 3.2],
  limo: [5.6, 2.0, 2.2],
  container: [3.1, 2.5, 2.7],
  scherm: [0.4, 0.9, 1.7],
  statief: [0.6, 0.6, 1.6],
  prikbord: [0.2, 1.0, 1.4],
  kantoorwagen: [5.8, 2.3, 3.0],
};
export const propFoot = (kind) => PROP_FOOT[kind] || null;

export const propSource = (kind) => PROP_SOURCES[kind] || null;
export const isDecor = (kind) => DECOR_KINDS.includes(kind);

// null als de soort mag, anders de foutmelding
export function propKindIssue(kind) {
  if (PLACEHOLDER_KINDS.includes(kind)) return `soort ${kind} bestaat niet in de wereld (placeholder): gebruik een echt voertuig of dier`;
  if (PROP_SOURCES[kind] || isDecor(kind)) return null;
  return `onbekende soort ${kind}`;
}
