// De passagiersruimte van een stadsbus (#444, #442): rijen dubbele stoelen met een gangpad, haltestangen, een handrail
// boven het gangpad en plekken waar reizigers zitten of staan. De bestuurdersplek (stuur, dashboard) staat in
// carinterior.js; dit is wat daarachter komt. Puur: alleen maten, geen THREE (businterieur3d.js bouwt de meshes).
// Voertuigcoördinaten: x vooruit, z rechts (de stoepkant met de deuren), y omhoog. De ruimte beslaat de voorste
// eenheid (bij een gelede bus tot het draaipunt). Tests: scripts/businterieur_test.mjs.

export const VLOER = 0.46;        // m: bovenkant van de vloer
export const GANG = 0.5;          // m: halve breedte van het gangpad
export const RIJ = 0.86;          // m tussen twee stoelrijen
const ZITHOOGTE = 0.46;           // m boven de vloer
const DEUR_VRIJ = 0.9;            // m aan weerszijden van een deur waar aan de stoepkant geen stoel staat
const JOINT_FRAC = 0.6;           // zoals BUS_JOINT_FRAC in models3d_vehicles.js

// Deurplekken (x) van de bus: dezelfde als de schuifdeuren in vehicledoors.js (bus: 0,406 en -0,04 van de lengte).
export function deurXs(len) { return [0.406 * len, -0.04 * len]; }

// Het draaipunt van de bus: bij een gelede bus aan het eind van de voorste eenheid.
export function jointXVan(len, trailer = 0) { return trailer ? -len / 2 : len / 2 - len * JOINT_FRAC; }

const ggd = (a, b) => (b ? ggd(b, a % b) : a);

// Alle plekken van de binnenruimte.
export function busInterieur(len, wid, { trailer = 0 } = {}) {
  const hl = len / 2, hw = wid / 2 - 0.08;
  const doors = deurXs(len);
  const jointX = jointXVan(len, trailer);
  const xFront = hl - 2.6;                                // achter de bestuurder en de voordeur
  const xRear = jointX + 0.9;
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
  return { len, wid, floor: VLOER, seats, poles, stand, rail, doors, jointX };
}

// Wie zit en wie staat bij n reizigers: eerst zitplaatsen (verspreid over de bus), daarna de staanplaatsen.
// Geeft { zit: [indexen in seats], sta: [indexen in stand] }. n boven de capaciteit wordt afgekapt.
export function bezetting(layout, n) {
  const ns = layout.seats.length;
  const aantal = Math.max(0, Math.min(Math.round(n), ns + layout.stand.length));
  const stap = [7, 5, 3, 11, 13, 17].find((p) => ggd(p, ns) === 1) || 1; // een vaste, goed verdeelde volgorde
  const zit = [];
  for (let i = 0; i < Math.min(aantal, Math.floor(ns * 0.8)); i++) zit.push((i * stap) % ns);
  const sta = [];
  for (let i = 0; i < aantal - zit.length && i < layout.stand.length; i++) sta.push(i);
  return { zit, sta };
}

// Hoeveel reizigers zitten er in een bus zonder lopende rit (verdwaalde bus): stabiel per voertuig.
export function ruimteReizigers(id) {
  const s = String(id);
  let h = 11;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return 3 + (h % 18);
}
