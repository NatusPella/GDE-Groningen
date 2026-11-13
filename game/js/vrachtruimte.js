// De laadruimte van busjes, vrachtwagens, foodtrucks en de kofferbak van auto's (#847): de pure
// indeling in voertuigcoördinaten (x naar voren, y omhoog, z naar rechts), zodat vrachtruimte3d.js
// er één samengevoegde geometrie van kan bouwen. Geen three.js en geen DOM: scripts/vrachtruimte_test.mjs
// toetst de indeling los van het tekenwerk.
//
// Maten komen uit de bestaande bronnen (read-only):
// - DEUR_DEFS en doorsFor (vehicledoors.js): de laadklep/achterdeur en de schuifdeur met hun
//   onderkant y0 en hoogte h. Die opening bepaalt waar de laadruimte achter begint en hoe hoog hij is.
// - models3d_vehicles.js: carProfile('van') geeft raamlijn 1,08 en dak 2,08 met het laadvolume achter
//   xB-0,8 (xB = hl-1,1); buildTruckMesh bouwt de bak van -hl tot hl-2,1 op y 0,9..3,65 (cabine 2,0 m,
//   chassis 0,74..0,85); buildFoodtruckMesh zet het luik op y 1,05..1,85 langs de rechterflank;
//   assembleCar/buildCarGeometry geven de kofferbak onder de klep (y0 uit DEUR_DEFS) en de achterbank.
// - sidejob_vracht.js: buildTrailerMesh bouwt de oplegger: bak van -len+1,2 tot 1,2 op y 0,75..3,45.
//
// De indeling bestaat uit losse dozen (delen): { id, x, y, z, sx, sy, sz, color, lod, rot }. `lod` is
// het fijnste niveau waarin het deel nog meedoet: 0 = alleen dichtbij (LOD0), 1 = tot het midden
// (LOD0/1), 2 = alle niveaus (ook ver). Zo loopt het aantal driehoeken per niveau strikt af.

import { doorsFor } from './vehicledoors.js';
import { TRAILER_KINDS } from './semitrailer.js';

// De soorten laadruimte die deze module kent. 'oplegger' hoort bij de losse oplegger van
// sidejob_vracht.js (zie opleggerIndeling); de rest komt uit de voertuigmodellen.
export const VRACHTRUIMTE_SOORTEN = Object.freeze([
  'bestelbus', 'cashvan', 'foodtruck', 'ambulance', 'vrachtwagen', 'oplegger', 'kofferbak',
]);

// Stand waarin een open (achter)deur of klep de laadruimte toont. Tussen dicht (0) en de instapdrempel
// DEUR_OPEN_VANAF (0,6, vehicledoors.js): een kier van 20 cm laat de lading al zien.
export const LAADRUIMTE_OPEN_VANAF = 0.35;

// De meeste laadruimtes hebben hun opening in DEUR_DEFS (klep, achterdeur, schuifdeur). Een bakwagen,
// geldbus of oplegger heeft in de modelbouw geen beweegbare achterdeur; die krijgen een denkbeeldige
// 'laaddeur' in dezelfde v.doors-structuur, zodat een wrak of een latere laadmechaniek hem kan openen
// zonder dat dit bestand of vehicledoors.js hoeft te veranderen.
export const VIRTUELE_LAADDEUR = 'laaddeur';

// Kleuren in de donkere interieurtinten van cabin3d.js, met warme ladingkleuren ertussen.
const KLEUR = {
  vloer: 0x2a2c2f, wand: 0x37393d, schot: 0x3f4247, plafond: 0x313337,
  schap: 0x5a5148, metaal: 0x7b7e82, karton: 0x9a7b52, karton2: 0xb09063, krat: 0x6f7f5a,
  kist: 0x7a5a38, hout: 0x8a6440, koffer: 0x4a3a30, geldkoffer: 0x353c44, goud: 0xc9a227,
  doek: 0x6b6f5a, brancard: 0xd8d4c8, zuurstof: 0x3f6b7a, rood: 0x8a3a32, wit: 0xd9d6cc,
  zand: 0xb6a06a, rook: 0x141518, gasfles: 0xb03a2e, friteuse: 0x9a9a94, koel: 0xdfe6ea,
};
const L = KLEUR;

// Eén doos in de laadruimte. rot is optioneel ({x,y,z} in radialen, zoals GeoBuilder.box).
function box(id, x, y, z, sx, sy, sz, color, lod = 2, rot = null) {
  const p = { id, x, y, z, sx, sy, sz, color, lod };
  if (rot) p.rot = rot;
  return p;
}

// De binnenhuid van een gesloten laadruimte: vloer, twee wanden, een schot naar de cabine en het
// plafond. Die staat op elk detailniveau (je kijkt er door de open deur tegenaan) en houdt de lading
// binnen de romp. m = { x0, x1, floor, ceil, hw } in meters; x0 is de achterkant, x1 het schot.
function schil(m, lod = 2) {
  const cx = (m.x0 + m.x1) / 2, lx = m.x1 - m.x0;
  const cy = (m.floor + m.ceil) / 2, hy = m.ceil - m.floor;
  return [
    box('vloer', cx, m.floor - 0.02, 0, lx, 0.04, m.hw * 2, L.vloer, lod),
    box('wand-l', cx, cy, -m.hw, lx, hy, 0.03, L.wand, lod),
    box('wand-r', cx, cy, m.hw, lx, hy, 0.03, L.wand, lod),
    box('schot', m.x1, cy, 0, 0.04, hy, m.hw * 2, L.schot, lod),
    box('plafond', cx, m.ceil, 0, lx, 0.03, m.hw * 2, L.plafond, lod),
  ];
}

// --- maten per soort ----------------------------------------------------------------------
// De maten zijn in meters en komen uit de modelbouwers hierboven. Ze schalen mee met de echte
// lengte en breedte van het model, zodat een langere bestelbus (sidejobs: 5,4/5,6/7,2 m) ook een
// langere laadruimte krijgt en niets buiten de romp valt.
export function vrachtruimteMaten(v) {
  const soort = vrachtruimteSoort(v);
  if (!soort) return null;
  const len = v.model.len, wid = v.model.wid, hl = len / 2, hw = wid / 2;
  let m;
  if (soort === 'vrachtwagen') {
    // buildTruckMesh: cabine 2,0 m vooraan, bak van -hl tot hl-2,1; box 2,75 hoog op y 0,9
    m = { x0: -hl + 0.12, x1: hl - 2.2, floor: 0.92, ceil: 3.55, hw: hw - 0.1, roof: 3.65 };
  } else if (soort === 'oplegger') {
    // sidejob_vracht.js buildTrailerMesh: bak van -len+1,2 tot 1,2 op y 0,75..3,45; het koel-/zeilmodel
    // is dicht, de kipper heeft lage wanden.
    const kipper = v.model.trailerKind === 'bak' || v.model.name === 'kipper';
    m = { x0: -hl + 1.3, x1: 1.1, floor: 0.85, ceil: kipper ? 2.2 : 3.35, hw: hw - 0.08, roof: kipper ? 2.2 : 3.45 };
  } else if (soort === 'kofferbak') {
    const k = kofferbakSoort(v);
    const t = KOFFERBAK_MATEN[k];
    m = { x0: t.x0 * len, x1: t.x1 * len, floor: t.floor, ceil: t.ceil, hw: t.hw * hw, roof: t.roof };
  } else {
    // bestelbus, cashvan, foodtruck en ambulance: carProfile('van') met xB = hl-1,1 en het laadvolume
    // achter xK = xB-0,8 = hl-1,9. De laadklep (DEUR_DEFS: y0 0,45, h 1,5) opent van 0,45 tot 1,95;
    // de ambulance heeft in het model een verhoogde witte dakkap, maar dezelfde deuropening.
    m = { x0: -hl + 0.1, x1: hl - 2.05, floor: 0.48, ceil: 1.93, hw: hw - 0.1, roof: 2.08 };
  }
  m.len = len; m.wid = wid;
  // de opening achter: de laadklep/achterdeur uit DEUR_DEFS (of de virtuele laaddeur)
  const opening = laadopeningen(v);
  const klep = opening.deuren.filter((id) => id === 'klep' || id === VIRTUELE_LAADDEUR).map((id) => doorDef(v, id))[0];
  m.openingY0 = klep ? klep.y0 : m.floor;
  m.openingH = klep ? klep.h : m.ceil - m.floor;
  m.openingBreedte = klep && klep.w ? Math.min(klep.w, wid - 0.2) : Math.min(1.5, wid - 0.2);
  return m;
}

// De klep-/deurdefinitie van dit voertuig (of null). De virtuele laaddeur staat niet in DEUR_DEFS;
// daar leiden we de opening af uit de bak zelf (zie vrachtruimteMaten).
function doorDef(v, id) {
  if (id === VIRTUELE_LAADDEUR) {
    const soort = vrachtruimteSoort(v);
    const hl = v.model.len / 2;
    if (soort === 'vrachtwagen') return { id, side: 0, x: -0.5, w: v.model.wid - 0.2, y0: 0.92, h: 2.6, soort: 'achterdeur' };
    if (soort === 'oplegger') return { id, side: 0, x: -0.5, w: v.model.wid - 0.2, y0: 0.85, h: 2.4, soort: 'achterdeur' };
    return { id, side: 0, x: -0.49, w: v.model.wid - 0.2, y0: 0.48, h: 1.45, soort: 'achterdeur' };
  }
  for (const d of doorsFor(v)) if (d.id === id) return d;
  return null;
}

// De kofferbakmaten per modelnaam, als fractie van de lengte (x0 achterkant, x1 schot) en van de
// halve breedte (hw); floor/ceil in meters. Uit carProfile (models3d_vehicles.js, read-only) en
// DEUR_DEFS.klep/laadklep; taxi is een sedan, politie een wagon (carType in models3d_vehicles.js).
const KOFFERBAK_MATEN = {
  hatch: { x0: -0.487, x1: -0.342, floor: 0.40, ceil: 0.90, hw: 0.42, roof: 1.47 },
  sedan: { x0: -0.477, x1: -0.214, floor: 0.40, ceil: 0.94, hw: 0.44, roof: 1.45 },
  wagon: { x0: -0.478, x1: -0.167, floor: 0.42, ceil: 1.40, hw: 0.44, roof: 1.50 },
  suv: { x0: -0.479, x1: -0.149, floor: 0.50, ceil: 1.52, hw: 0.44, roof: 1.74 },
  sport: { x0: -0.488, x1: -0.146, floor: 0.36, ceil: 0.82, hw: 0.42, roof: 1.25 },
  escort: { x0: -0.480, x1: -0.125, floor: 0.36, ceil: 0.90, hw: 0.42, roof: 1.38 },
  taxi: { x0: -0.477, x1: -0.214, floor: 0.40, ceil: 0.94, hw: 0.44, roof: 1.45 },
  police: { x0: -0.460, x1: -0.140, floor: 0.42, ceil: 1.38, hw: 0.44, roof: 1.50 },
};

function kofferbakSoort(v) {
  const n = (v.model && v.model.name) || '';
  if (n === 'police' || (v.isPolice && !v._commandeered)) return 'police'; // carType politie = wagon
  if (n === 'taxi' || v.isTaxi) return 'taxi';                            // taxi = sedan
  return KOFFERBAK_MATEN[n] ? n : 'hatch';
}

// --- welk soort voertuig heeft welke laadruimte --------------------------------------------
export function vrachtruimteSoort(v) {
  if (!v || !v.model) return null;
  const n = v.model.name;
  if (v.isAmbulance || n === 'ambulance') return 'ambulance';
  if (n === 'cashvan') return 'cashvan';
  if (n === 'foodtruck') return 'foodtruck';
  if (n === 'truck') return 'vrachtwagen';
  if (n === 'oplegger') return 'oplegger';
  if (n === 'van') return 'bestelbus';
  if (n === 'hatch' || n === 'sedan' || n === 'taxi' || n === 'wagon' || n === 'suv' ||
    n === 'sport' || n === 'escort' || n === 'police') return 'kofferbak';
  return null; // fiets, bus, trein, boot, helikopter, vliegtuig, machines: geen laadruimte
}

// Welke openingen horen bij de laadruimte van dit voertuig? De cabineportieren tellen niet mee (daar
// kijk je de cabine in, niet de lading), de laadklep/achterdeur en de schuifdeur wel; een bakwagen,
// geldbus of oplegger heeft de virtuele laaddeur, en het luik van de foodtruck staat altijd open.
export function laadopeningen(v) {
  const soort = vrachtruimteSoort(v);
  if (!soort) return { deuren: [], vasteOpening: false };
  if (soort === 'foodtruck') return { deuren: [], vasteOpening: true }; // het luik is een vaste opening in het model
  if (soort === 'vrachtwagen' || soort === 'oplegger' || soort === 'cashvan') return { deuren: [VIRTUELE_LAADDEUR], vasteOpening: false };
  const deuren = [];
  for (const d of doorsFor(v)) {
    const laaddeur = d.id === 'klep' || d.soort === 'achterdeur' || d.soort === 'schuif';
    if (laaddeur) deuren.push(d.id);
  }
  return { deuren, vasteOpening: false };
}

// De zichtbaarheidsregel (#847): de laadruimte is zichtbaar als een bijbehorende deur/klep open staat,
// los of ontbrekend is, of als het voertuig een wrak is; anders verborgen. De afstand (LOD) regelt
// vrachtruimte3d.js, niet deze regel.
export function vrachtruimteZichtbaar(v) {
  if (!v || !v.model) return false;
  const soort = vrachtruimteSoort(v);
  if (!soort) return false;
  if (v.wrecked) return true;
  if (soort === 'foodtruck') return true; // het luik is een vaste opening in het model
  const st = v.doors;
  if (!st) return false;
  if (soort === 'vrachtwagen' || soort === 'oplegger' || soort === 'cashvan') {
    return !!((st.loose && st.loose[VIRTUELE_LAADDEUR]) || (st.open && (st.open[VIRTUELE_LAADDEUR] || 0) > LAADRUIMTE_OPEN_VANAF));
  }
  for (const d of doorsFor(v)) {
    if (!(d.id === 'klep' || d.soort === 'achterdeur' || d.soort === 'schuif')) continue;
    if (st.loose && st.loose[d.id]) return true;
    if (st.open && (st.open[d.id] || 0) > LAADRUIMTE_OPEN_VANAF) return true;
  }
  return false;
}

// --- de lading per soort -------------------------------------------------------------------
// Elke bouwer krijgt de maten en geeft de losse dozen van de laadruimte terug. De volgorde is niet
// belangrijk; vrachtruimteDelen filtert op detailniveau en de kapot-variant past de lading aan.

function ladingBestelbus(m) {
  const xr = m.x0, xf = m.x1, f = m.floor, hw = m.hw;
  return [
    ...schil(m),
    // pakketten en kratten achterin, zoals een pakketbusje ze heeft staan
    box('pakket-a', xr + 0.35, f + 0.19, -hw * 0.35, 0.5, 0.38, 0.45, L.karton, 0),
    box('pakket-b', xr + 0.55, f + 0.19, hw * 0.3, 0.44, 0.38, 0.4, L.karton2, 0),
    box('pakket-c', xr + 0.36, f + 0.55, -hw * 0.3, 0.4, 0.34, 0.4, L.karton, 0),
    box('krat', xf - 0.9, f + 0.16, hw * 0.2, 0.5, 0.32, 0.36, L.krat, 0),
    box('doos-groot', xr + 0.9, f + 0.28, 0, 0.62, 0.56, 1.3, L.karton2, 2),
    // schappen en spanbanden langs de wanden
    box('schap-l', (xr + xf) / 2 - 0.25, 1.12, -hw + 0.17, Math.min(1.3, xf - xr - 0.3), 0.035, 0.32, L.schap, 0),
    box('schap-r', (xr + xf) / 2 + 0.35, 0.94, hw - 0.17, Math.min(1.0, xf - xr - 0.6), 0.035, 0.32, L.schap, 1),
    box('spanband-l', -0.35, 1.3, -hw + 0.03, 0.05, 1.1, 0.02, L.metaal, 0),
    box('spanband-r', 0.3, 1.3, hw - 0.03, 0.05, 1.1, 0.02, L.metaal, 0),
    box('gereedschap', xf - 0.3, f + 0.12, -hw + 0.28, 0.36, 0.2, 0.22, L.metaal, 0),
  ];
}

function ladingCashvan(m) {
  const xr = m.x0, xf = m.x1, f = m.floor, hw = m.hw;
  return [
    ...schil(m),
    // geldkoffers, een rek met zakken en de kluis achter het schot
    box('geldkoffer-a', xr + 0.45, f + 0.14, -hw * 0.3, 0.5, 0.26, 0.36, L.geldkoffer, 0),
    box('geldkoffer-b', xr + 0.45, f + 0.4, -hw * 0.3, 0.5, 0.26, 0.36, L.geldkoffer, 0),
    box('geldkoffer-c', xr + 0.2, f + 0.14, hw * 0.3, 0.46, 0.26, 0.34, L.geldkoffer, 1),
    box('geldklep-a', xr + 0.45, f + 0.3, -hw * 0.3, 0.28, 0.02, 0.03, L.goud, 0),
    box('rek', (xr + xf) / 2, 1.05, hw - 0.2, Math.min(1.6, xf - xr - 0.4), 0.04, 0.34, L.metaal, 0),
    box('geldzakken', (xr + xf) / 2, f + 0.16, hw * 0.25, 0.7, 0.3, 0.44, L.doek, 1),
    box('kluis', xf - 0.35, f + 0.3, 0, 0.5, 0.6, 0.8, 0x2f3438, 2),
  ];
}

function ladingFoodtruck(m) {
  const xr = m.x0, xf = m.x1, f = m.floor, hw = m.hw, zr = hw - 0.35;
  // Het luik zit aan de rechterflank (buildFoodtruckMesh: y 1,05..1,85, x -hl+0,55 tot hl-1,45),
  // dus de werkbank staat langs de rechterwand en de voorraad links.
  return [
    ...schil(m),
    box('werkbank', (xr + xf) / 2, 1.0, zr, Math.min(3.0, xf - xr - 0.2), 0.08, 0.6, L.hout, 0),
    box('werkbank-poot-a', xr + 0.4, 0.74, zr, 0.07, 0.5, 0.07, L.metaal, 1),
    box('werkbank-poot-b', xf - 0.4, 0.74, zr, 0.07, 0.5, 0.07, L.metaal, 1),
    box('friteuse', xf - 1.0, 1.1, zr, 0.5, 0.26, 0.5, L.friteuse, 0),
    box('friteuse-olie', xf - 1.0, 1.24, zr, 0.36, 0.03, 0.36, 0x8a6a2a, 0),
    box('gasfles', xr + 0.35, f + 0.3, -hw + 0.3, 0.3, 0.6, 0.3, L.gasfles, 0),
    box('voorraad', xr + 1.0, f + 0.2, -hw + 0.4, 0.8, 0.4, 0.6, L.karton, 0),
    box('voorraad-rek', (xr + xf) / 2, 1.2, -hw + 0.22, Math.min(2.2, xf - xr - 0.5), 0.04, 0.3, L.metaal, 1),
    // boven de toonbank, in de strook die door het luik te zien is (het luik opent op 1,05..1,85)
    box('voorraad-boven', (xr + xf) / 2, 1.6, hw - 0.55, Math.min(1.8, xf - xr - 0.5), 0.28, 0.4, L.karton, 0),
    box('bordenrek', (xr + xf) / 2, 1.45, -hw + 0.3, Math.min(1.6, xf - xr - 0.8), 0.05, 0.25, L.hout, 1),
    box('bestekbak', xf - 0.35, 1.12, zr - 0.25, 0.3, 0.16, 0.26, L.wit, 0),
    box('koelkast', xr + 0.7, f + 0.45, zr + 0.05, 0.55, 0.9, 0.55, L.wit, 2),
  ];
}

function ladingAmbulance(m) {
  const xr = m.x0, xf = m.x1, f = m.floor, hw = m.hw;
  return [
    ...schil(m),
    // brancard op de vloer, kastjes langs de rechterwand, zuurstof en de monitor
    box('brancard', (xr + xf) / 2 - 0.1, f + 0.28, -hw * 0.25, Math.min(2.0, xf - xr - 0.5), 0.08, 0.6, L.brancard, 0),
    box('brancard-poot-a', (xr + xf) / 2 - 0.9, f + 0.13, -hw * 0.25, 0.06, 0.26, 0.06, L.metaal, 1),
    box('brancard-poot-b', (xr + xf) / 2 + 0.7, f + 0.13, -hw * 0.25, 0.06, 0.26, 0.06, L.metaal, 1),
    box('kastjes', (xr + xf) / 2, 1.25, hw - 0.14, Math.min(1.4, xf - xr - 0.6), 1.0, 0.24, L.wit, 0),
    box('zuurstof-a', xf - 0.45, f + 0.4, hw - 0.3, 0.22, 0.8, 0.22, L.zuurstof, 0),
    box('zuurstof-b', xf - 0.45, f + 0.4, hw - 0.55, 0.22, 0.8, 0.22, L.zuurstof, 1),
    box('monitor', xr + 0.35, 1.25, -hw + 0.2, 0.3, 0.26, 0.24, 0x2f3438, 0),
    box('brancard-doek', (xr + xf) / 2 - 0.6, f + 0.34, -hw * 0.25, 0.5, 0.05, 0.5, L.rood, 0),
    box('apparatuur', xr + 0.9, 1.1, -hw + 0.05, 0.5, 0.5, 0.3, L.metaal, 2),
  ];
}

function ladingVrachtwagen(m) {
  const xr = m.x0, xf = m.x1, f = m.floor, hw = m.hw;
  // De laadboom loopt onder het dak, de pallets en kisten staan op de vloer.
  return [
    ...schil(m),
    box('pallet-a', xr + 0.55, f + 0.08, -hw * 0.4, 1.0, 0.16, 0.8, L.hout, 2),
    box('pallet-b', xr + 0.55, f + 0.08, hw * 0.4, 1.0, 0.16, 0.8, L.hout, 1),
    box('kist-a', xr + 0.55, f + 0.42, -hw * 0.4, 0.8, 0.5, 0.7, L.kist, 0),
    box('kist-b', xr + 1.5, f + 0.35, hw * 0.35, 0.9, 0.36, 0.7, L.kist, 0),
    box('kist-c', xr + 1.5, f + 0.8, hw * 0.35, 0.7, 0.4, 0.6, L.karton, 0),
    box('laadboom', (xr + xf) / 2, m.ceil - 0.22, 0, xf - xr - 0.2, 0.1, 0.14, L.metaal, 1),
    box('spanband-a', xr + 1.1, f + 0.5, -hw + 0.03, 0.06, 0.9, 0.02, L.metaal, 0),
    box('spanband-b', xr + 1.1, f + 0.5, hw - 0.03, 0.06, 0.9, 0.02, L.metaal, 0),
    box('gereedschapskist', xf - 0.4, f + 0.2, -hw + 0.3, 0.5, 0.32, 0.3, L.metaal, 0),
  ];
}

function ladingOplegger(m, kind) {
  const xr = m.x0, xf = m.x1, f = m.floor, hw = m.hw;
  if (kind === 'bak') {
    // kipper: lage wanden en een hoop zand/grind, met de kiepcilinder achter de cabine
    return [
      ...schil(m),
      box('zand', (xr + xf) / 2, f + 0.35, 0, xf - xr - 0.6, 0.7, hw * 1.6, L.zand, 2),
      box('zand-top', (xr + xf) / 2, f + 0.72, 0, (xf - xr) * 0.55, 0.18, hw * 0.9, 0xb9a670, 1),
      box('kiepcilinder', xf - 0.35, f + 0.3, 0, 0.2, 0.5, 0.2, L.metaal, 0),
    ];
  }
  const koel = kind === 'koel';
  return [
    ...schil(m),
    box('pallet-a', xr + 1.0, f + 0.08, -hw * 0.4, 1.2, 0.16, 0.9, L.hout, 2),
    box('pallet-b', xr + 1.0, f + 0.08, hw * 0.4, 1.2, 0.16, 0.9, L.hout, 1),
    box('container-a', xr + 1.0, f + 0.95, -hw * 0.4, 1.5, 1.5, 1.0, koel ? L.koel : 0x3e6f9e, 0),
    box('container-b', xr + 1.0, f + 0.95, hw * 0.4, 1.5, 1.5, 1.0, koel ? L.koel : 0x3e6f9e, 0),
    box('container-deur', xr + 1.75, f + 0.95, -hw * 0.4, 0.03, 1.3, 0.9, 0x2f3a42, 0),
    box('lading-klein', xr + 2.3, f + 0.3, 0, 0.9, 0.5, 0.8, L.karton, 1),
    koel ? box('koelaggregaat', xf - 0.25, 1.35, 0, 0.4, 0.8, 2.0, L.metaal, 0) : box('zeil', (xr + xf) / 2, 2.6, -hw + 0.03, xf - xr - 0.2, 1.2, 0.03, L.doek, 0),
    box('laadboom', (xr + xf) / 2, m.ceil - 0.22, 0, xf - xr - 0.2, 0.08, 0.12, L.metaal, 1),
  ];
}

function ladingKofferbak(m, k) {
  const xr = m.x0, xf = m.x1, f = m.floor, hw = m.hw;
  const cx = (xr + xf) / 2;
  // het plafond van de kofferbak valt op het middenniveau weg: het is alleen dichtbij te zien
  const shell = schil(m);
  for (const d of shell) if (d.id === 'plafond') d.lod = 1;
  return [
    ...shell,
    // het reservewiel ligt onder de vloer van de kofferbak, de koffer en de boodschappen erboven
    box('reservewiel', cx, f + 0.07, 0, 0.62, 0.14, 0.62, 0x232323, 0),
    box('koffer', cx - 0.05, f + 0.28, 0, Math.min(0.5, (xf - xr) * 0.7), 0.4, hw * 0.8, L.koffer, 0),
    box('koffer-band', cx - 0.05, f + 0.28, 0, Math.min(0.52, (xf - xr) * 0.72), 0.06, hw * 0.16, 0x2f3438, 0),
    box('boodschappen', cx + 0.25, f + 0.2, hw * 0.35, Math.min(0.4, (xf - xr) * 0.5), 0.32, hw * 0.5, L.doek, 0),
    box('gevarendriehoek', cx + 0.15, f + 0.09, -hw * 0.55, 0.3, 0.1, 0.22, L.rood, 0),
    box('lading', cx, f + 0.3, 0, Math.min(0.7, (xf - xr) * 0.8), 0.5, hw * 1.2, L.koffer, 2),
    // bij een wagon/suv past er ook een doos naast
    k === 'wagon' || k === 'suv' ? box('doos', cx - 0.1, f + 0.5, -hw * 0.4, 0.4, 0.32, 0.4, L.karton2, 1) : box('doek', cx, f + 0.12, 0, (xf - xr) * 0.8, 0.04, hw * 1.4, L.doek, 1),
  ];
}

// De kapot-variant (#847): omgevallen lading, een scheef schap en rooksporen, voor een wrak. De
// normale lading blijft staan (zo leest het als hetzelfde busje) maar zakt, kantelt of schuift.
function kapotMaken(m, delen) {
  const out = delen.map((d) => ({ ...d }));
  const rook = [];
  const rookL = (x, y, z, sx, sy, sz) => rook.push(box('rookspoor', x, y, z, sx, sy, sz, L.rook, 1));
  // roet langs het plafond en de bovenkant van de wanden
  rookL((m.x0 + m.x1) / 2, m.ceil - 0.04, 0, (m.x1 - m.x0) * 0.8, 0.03, Math.min(m.hw * 1.7, m.hw * 2 - 0.06));
  rookL((m.x0 + m.x1) / 2, m.ceil * 0.72, -m.hw + 0.03, (m.x1 - m.x0) * 0.55, 0.3, 0.03);
  for (const d of out) {
    if (d.id.startsWith('pakket') || d.id.startsWith('kist') || d.id === 'krat' || d.id === 'doos-groot' || d.id === 'koffer') {
      // omgevallen: op zijn kant op de vloer
      d.rot = { z: 0.55 };
      d.y = m.floor + 0.24;
      d.sx = Math.max(0.3, d.sx * 0.9);
      d.sy = Math.max(0.24, d.sy * 0.9);
    } else if (d.id.startsWith('schap')) {
      d.rot = { z: -0.32 }; // scheef gezakt schap
    } else if (d.id === 'gereedschap') {
      d.y = m.floor + 0.1;
      d.rot = { z: 0.4 };
    }
  }
  const lx = Math.max(0.24, m.x1 - m.x0), klein = Math.min(1, lx / 2.4);
  out.push(box('omgevallen-lading', m.x0 + lx * 0.3, m.floor + 0.2, 0.1, 0.7 * klein, 0.4 * klein, 0.5 * klein, L.kist, 0, { z: 0.7 }));
  out.push(box('losse-plank', m.x0 + lx * 0.6, m.floor + 0.04, 0.1, Math.min(0.9, lx * 0.7), 0.04, 0.2, L.hout, 0, { z: 0.3 }));
  return out.concat(rook);
}

// --- de indeling ---------------------------------------------------------------------------
// layout = { soort, kofferbak, kapot, maten, romp, delen }. `romp` is de ruimte waarbinnen alles moet
// blijven (voor de test): de halve lengte en breedte van het model en de hoogte van het dak/de bak.
function bouwDelen(soort, m, kb, trailerKind) {
  if (soort === 'bestelbus') return ladingBestelbus(m);
  if (soort === 'cashvan') return ladingCashvan(m);
  if (soort === 'foodtruck') return ladingFoodtruck(m);
  if (soort === 'ambulance') return ladingAmbulance(m);
  if (soort === 'vrachtwagen') return ladingVrachtwagen(m);
  if (soort === 'oplegger') return ladingOplegger(m, trailerKind || 'koel');
  return ladingKofferbak(m, kb);
}

export function vrachtruimteIndeling(v) {
  const soort = vrachtruimteSoort(v);
  if (!soort) return null;
  const m = vrachtruimteMaten(v);
  const kb = soort === 'kofferbak' ? kofferbakSoort(v) : '';
  const opening = laadopeningen(v);
  const kapot = !!v.wrecked;
  let delen = bouwDelen(soort, m, kb, v.model.trailerKind);
  if (kapot) delen = kapotMaken(m, delen);
  return {
    soort, kofferbak: kb || null, kapot,
    deuren: opening.deuren, vasteOpening: opening.vasteOpening,
    maten: m,
    romp: { halveLengte: m.len / 2, halveBreedte: m.wid / 2, hoogte: m.roof },
    delen,
  };
}

// De losse oplegger van sidejob_vracht.js (geen Vehicle): dezelfde lading als een oplegger, maar in de
// coördinaten van de opleggermesh zelf (buildTrailerMesh: bak van -len+1,2 tot 1,2, het hulpstuk voor).
// De 3D tekenlaag hangt hem nog niet aan de mesh (de oplegger is geen world.vehicles-lid en
// sidejob_vracht.js valt buiten deze schrijfscoop); dit is de pure kant.
export function opleggerIndeling(kind, len, wid) {
  const k = TRAILER_KINDS[kind] ? kind : 'koel';
  const t = TRAILER_KINDS[k];
  const L2 = len ?? t.len, W2 = wid ?? t.wid, hw = W2 / 2 - 0.08;
  const kipper = k === 'bak';
  const m = {
    len: L2, wid: W2, floor: 0.85, ceil: kipper ? 2.2 : 3.35, hw,
    x0: -L2 + 1.35, x1: 1.05, roof: kipper ? 2.2 : 3.45,
    openingY0: 0.85, openingH: 2.4, openingBreedte: Math.min(W2 - 0.2, 2.4),
  };
  return {
    soort: 'oplegger', kofferbak: null, kapot: false,
    deuren: [VIRTUELE_LAADDEUR], vasteOpening: false,
    maten: m,
    romp: { halveLengte: L2, halveBreedte: W2 / 2, hoogte: m.roof },
    delen: ladingOplegger(m, k),
  };
}

// De delen voor één detailniveau (0 dichtbij, 1 midden, 2 ver). Kapot standaard volgt het wrak van het
// voertuig; de test en de beeldronde kunnen hem forceren.
export function vrachtruimteDelen(v, { lod = 0, kapot = null } = {}) {
  const bron = kapot === null || !!kapot === !!v.wrecked ? v : { ...v, wrecked: !!kapot };
  const indeling = vrachtruimteIndeling(bron);
  if (!indeling) return [];
  return indeling.delen.filter((d) => (d.lod ?? 2) >= lod);
}
