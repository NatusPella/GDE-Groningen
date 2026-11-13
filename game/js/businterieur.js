// De passagiersruimte van een stadsbus (#444, #442, #847): rijen dubbele stoelen met een gangpad, haltestangen, een
// handrail boven het gangpad en plekken waar reizigers zitten of staan. De bestuurdersplek (stuur, dashboard) staat in
// carinterior.js; dit is wat daarachter komt. Puur: alleen maten, geen THREE (businterieur3d.js bouwt de meshes).
// Voertuigcoördinaten: x vooruit, z rechts (de stoepkant met de deuren), y omhoog. Een gelede bus heeft twee eenheden
// (#847): de voorste (tot het draaipunt) en de achterwagen. De achterwagen staat in de coördinaten van de trailer-groep
// in de vehicle-mesh (mesh.userData.busRear, models3d_vehicles.js): x = -JOINT_GAP is de voorkant van de trailer,
// x = -model.trailer de achterkant, en de groep draait mee met setBusRearAngle. Een midibus is één eenheid tot de
// achterwand (#442). Tests: scripts/businterieur_test.mjs.

export const VLOER = 0.46;        // m: bovenkant van de vloer
export const GANG = 0.5;          // m: halve breedte van het gangpad
export const RIJ = 0.86;          // m tussen twee stoelrijen
export const JOINT_GAP = 0.2;     // m: kier tussen de voorste eenheid en de achterwagen (BUS_JOINT_GAP in models3d_vehicles.js)
const ZITHOOGTE = 0.46;           // m boven de vloer
const DEUR_VRIJ = 0.9;            // m aan weerszijden van een deur waar aan de stoepkant geen stoel staat
const JOINT_FRAC = 0.6;           // zoals BUS_JOINT_FRAC in models3d_vehicles.js
const TRAILER_DEUR = 1.4;         // m: de deur van de achterwagen achter het draaipunt (busSection: -BUS_JOINT_GAP - 1.4)
const TRAILER_KOP = 0.9;          // m: vrije ruimte achter de balg voor de eerste rij van de achterwagen
const TRAILER_STAART = 0.8;       // m: vrije ruimte voor de achterwand van de achterwagen

// Deurplekken (x) van de bus: dezelfde als de schuifdeuren in vehicledoors.js (bus: 0,406 en -0,04 van de lengte).
export function deurXs(len) { return [0.406 * len, -0.04 * len]; }

// Deurplekken van de midibus: de voordeur rechts (0,375 van de lengte, DEUR_DEFS.midibus) en de tweede
// deuropening midden in de wagen die busSection in models3d_vehicles.js al tekent.
export const MIDIBUS_DEUR = 0.375;
export function midibusDeurXs(len) { return [MIDIBUS_DEUR * len, 0.2]; }

// Deurplekken van de achterwagen: één deur aan de stoepkant, 1,4 m achter het draaipunt (dezelfde plek als het
// deurblad dat busSection in models3d_vehicles.js tekent). Coördinaten van de trailer-groep.
export const TRAILER_DEURX = -JOINT_GAP - TRAILER_DEUR;
export function trailerDeurXs() { return [TRAILER_DEURX]; }

// Het draaipunt van de bus: bij een gelede bus aan het eind van de voorste eenheid.
export function jointXVan(len, trailer = 0) { return trailer ? -len / 2 : len / 2 - len * JOINT_FRAC; }

const ggd = (a, b) => (b ? ggd(b, a % b) : a);

// De rijen, stangen en staanplaatsen van één eenheid: van xFront (voor) tot xRear (achter), met de deuren waar de
// stoepkant vrij blijft. De maten van de romp (vloer, gangpad, stahoogte) zijn voor beide eenheden gelijk.
function eenheid(wid, doors, xFront, xRear) {
  const hw = wid / 2 - 0.08;
  const seats = [], poles = [], stand = [];
  const celZ = [GANG + 0.24, GANG + 0.7]; // twee stoelen per kant
  for (let x = xFront; x >= xRear; x -= RIJ) {
    const bijDeur = doors.some((d) => Math.abs(x - d) < DEUR_VRIJ);
    for (const z of celZ) {
      if (z > hw) continue;
      seats.push({ x, z: -z, kant: -1, zit: ZITHOOGTE });
      if (!bijDeur) seats.push({ x, z, kant: 1, zit: ZITHOOGTE });
    }
    poles.push({ x: x - RIJ / 2, z: -GANG });
    if (!bijDeur) poles.push({ x: x - RIJ / 2, z: GANG });
  }
  for (const d of doors) { poles.push({ x: d + 0.62, z: GANG + 0.35 }); poles.push({ x: d - 0.62, z: GANG + 0.35 }); }
  // staanplaatsen: in het gangpad en bij de deuren
  let k = 0;
  for (let x = xFront - 0.4; x >= xRear + 0.2; x -= 0.75, k++) stand.push({ x, z: (k % 2 ? 1 : -1) * 0.18 });
  for (const d of doors) stand.push({ x: d, z: GANG + 0.5 });
  const rail = { x0: xFront + 0.4, x1: xRear - 0.2, y: 2.35, z: [-GANG, GANG] };
  return { floor: VLOER, seats, poles, stand, rail, doors };
}

// Alle plekken van de binnenruimte. doors: x van de deuren aan de stoepkant (standaard die van de
// gelede bus); xFront/xRear: waar de stoelrijen beginnen en eindigen (standaard achter de bestuurder
// tot het draaipunt; een midibus heeft de hele wagen tot zijn beschikking). Een gelede bus krijgt daarnaast
// rear: dezelfde indeling voor de achterwagen, in de coördinaten van de trailer-groep (x0 = achterkant,
// x1 = voorkant bij de balg), met de trailerdeur en de binnenhuid van de trailer (#847).
export function busInterieur(len, wid, {
  trailer = 0,
  doors = deurXs(len),
  xFront = len / 2 - 2.6,
  xRear = jointXVan(len, trailer) + 0.9,
} = {}) {
  const jointX = jointXVan(len, trailer);
  const voor = eenheid(wid, doors, xFront, xRear);
  let rear = null;
  if (trailer > 0) {
    const tDoors = trailerDeurXs();
    const tx0 = -trailer, tx1 = -JOINT_GAP;                         // de trailerromp in de trailer-groep
    const tFront = tx1 - TRAILER_KOP, tRear = tx0 + TRAILER_STAART; // de rijen binnen die romp
    rear = {
      ...eenheid(wid, tDoors, tFront, tRear),
      len: tx1 - tx0, x0: tx0, x1: tx1, xFront: tFront, xRear: tRear,
      huid: { x0: tx1, x1: tRear },   // de binnenhuid van de trailer: van de balg tot de achterwand
    };
  }
  return { len, wid, ...voor, jointX, trailer, huid: { x0: xFront, x1: xRear }, rear };
}

// De midibus (buurtbus, #442): één ruimte van de voordeur tot de achterwand, met de twee
// deuropeningen die het model al heeft (midibusDeurXs). Korter dan de gelede bus, dus minder
// rijen en een kleiner loopvlak; de maten (vloer, gangpad, stahoogte) blijven gelijk.
export function midibusInterieur(len, wid) {
  return busInterieur(len, wid, {
    doors: midibusDeurXs(len),
    xFront: len / 2 - 2.1, // achter de bestuurder (seating3d.js zet die op hl - 1,0)
    xRear: -len / 2 + 0.9, // tot de achterwand
  });
}

// Wie zit en wie staat bij n reizigers: eerst zitplaatsen (verspreid over de bus), daarna de staanplaatsen.
// Geeft { zit: [indexen in seats], sta: [indexen in stand] }. n boven de capaciteit wordt afgekapt.
// bezet: stoelindexen waar een medespeler zit (coöp, #444): daar zit geen reiziger van het spel.
export function bezetting(layout, n, bezet = []) {
  const weg = new Set(bezet);
  const vrij = layout.seats.map((_, i) => i).filter((i) => !weg.has(i));
  const ns = vrij.length;
  const aantal = Math.max(0, Math.min(Math.round(n), ns + layout.stand.length));
  const stap = [7, 5, 3, 11, 13, 17].find((p) => ggd(p, ns) === 1) || 1; // een vaste, goed verdeelde volgorde
  const zit = [];
  for (let i = 0; i < Math.min(aantal, Math.floor(ns * 0.8)); i++) zit.push(vrij[(i * stap) % ns]);
  const sta = [];
  for (let i = 0; i < aantal - zit.length && i < layout.stand.length; i++) sta.push(i);
  return { zit, sta };
}

// De reizigers verdelen over de voorste eenheid en de achterwagen (#847): naar verhouding van de capaciteit, zodat een
// gelede bus ook achterin bezet is. Zonder achterwagen gaat iedereen naar voren. Geeft { voor, achter } aantallen,
// elk afgekapt op de capaciteit van die eenheid (net als bezetting()); boven de capaciteit valt de rest weg.
export function verdeelReizigers(layout, n) {
  const totaal = Math.max(0, Math.round(n));
  const capVoor = layout.seats.length + layout.stand.length;
  if (!layout.rear) return { voor: Math.min(totaal, capVoor), achter: 0 };
  const capAchter = layout.rear.seats.length + layout.rear.stand.length;
  const nVoor = Math.min(capVoor, Math.round((totaal * capVoor) / (capVoor + capAchter)));
  return { voor: nVoor, achter: Math.min(capAchter, Math.max(0, totaal - nVoor)) };
}

// De plek van een medespeler op stoelnummer 2 en hoger (coopzitten3d.js: 0 bestuurder, 1 bijrijder): eerst de zitplaatsen vooraan,
// daarna de staanplaatsen. Geeft { soort: 'zit' | 'sta', index, x, z, kant } of null als de bus vol is.
export function coopPlek(layout, stoel) {
  const k = Math.max(0, (stoel | 0) - 2);
  const ns = layout.seats.length;
  if (k < ns) { const s = layout.seats[k]; return { soort: 'zit', index: k, x: s.x, z: s.z, kant: s.kant }; }
  const st = layout.stand[k - ns];
  return st ? { soort: 'sta', index: k - ns, x: st.x, z: st.z, kant: st.z >= 0 ? 1 : -1 } : null;
}
// Welke stoelen zijn bezet door medespelers (stoelnummers uit de lijst { stoel }), als stoelindexen in layout.seats.
export const coopBezet = (layout, stoelen) => (stoelen || []).map((s) => coopPlek(layout, s)).filter((p) => p && p.soort === 'zit').map((p) => p.index);

// Hoeveel reizigers zitten er in een bus zonder lopende rit (verdwaalde bus): stabiel per voertuig.
export function ruimteReizigers(id) {
  const s = String(id);
  let h = 11;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return 3 + (h % 18);
}
