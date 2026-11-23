// Deurnaden in de carrosserie (#225, uitbreiding 23-11): één gedeelde regel voor alle voertuigen met openende
// deuren. De carrosserie is een dichte extrusie; zonder naad leek een open deur een los paneel op een gesloten
// zijkant. Hier staat de pure berekening (geen THREE): welke dunne donkere stroken en welk handvat bij een deur
// horen, vanuit dezelfde DEUR_DEFS die vehicledoors3d.js gebruikt om de deur te laten scharnieren. De stroken gaan
// bij het bouwen in de gedeelde, gecachete romp (models3d_vehicles.js addDoorCuts): nul extra drawcalls en geen
// werk per frame. Voertuigen met eigen deurbladen in het model (bus, tram, trein) vallen er bewust buiten.
import { DEUR_DEFS } from './vehicledoors.js';

export const NAAD_DIKTE = 0.012;   // m: breedte van de donkere naad rond het paneel
export const NAAD_UIT = 0.004;     // m: de naad ligt zo ver voor het plaatwerk
export const HANDVAT = { len: 0.13, dik: 0.022, uit: 0.016 };

// Modellen waarvan de romp deurnaden krijgt. De rest (bus, midibus, tram, trein) tekent zijn deuren zelf.
export const NADEN_MODELLEN = ['hatch', 'sedan', 'taxi', 'wagon', 'suv', 'sport', 'escort', 'police', 'van', 'cashvan', 'ambulance', 'truck', 'foodtruck', 'tractor', 'trekkerlimo'];

const ZIJDEUR = new Set(['scharnier', 'achterscharnier', 'schuif']);

// Alle stroken van één deur in voertuigcoördinaten: { x, y, z, sx, sy, sz, soort: 'naad' | 'handvat' }.
// len en hw zijn de lengte en de halve breedte van de romp; x is de deurhartlijn (fractie van len).
export function deurNaden(d, len, hw, { dikte = NAAD_DIKTE, uit = NAAD_UIT } = {}) {
  const lijst = [];
  const cx = d.x * len;
  if (ZIJDEUR.has(d.soort)) {
    const hwd = d.zij ? d.zij * 2 * hw : hw; // een cabine of limousine die smaller is dan de romp (d.zij: halve breedte als fractie van wid)
    const uitD = d.soort === 'schuif' ? uit + 0.004 : uit; // de schuifdeur ligt in de bestelbus vlak langs andere platen
    const z = d.side * (hwd + uitD);
    const y1 = d.y0 + d.h;
    lijst.push({ x: cx, y: d.y0, z, sx: d.w, sy: dikte, sz: 0.01, soort: 'naad' });
    lijst.push({ x: cx, y: y1, z, sx: d.w, sy: dikte, sz: 0.01, soort: 'naad' });
    lijst.push({ x: cx - d.w / 2, y: d.y0 + d.h / 2, z, sx: dikte, sy: d.h, sz: 0.01, soort: 'naad' });
    lijst.push({ x: cx + d.w / 2, y: d.y0 + d.h / 2, z, sx: dikte, sy: d.h, sz: 0.01, soort: 'naad' });
    // het handvat zit aan de kant van de slotzijde: tegenover het scharnier (voor = +x)
    const naarAchter = d.soort === 'scharnier';
    const hx = cx + (naarAchter ? -1 : 1) * d.w * 0.36;
    if (d.soort !== 'schuif') lijst.push({ x: hx, y: d.y0 + d.h - Math.min(0.12, d.h * 0.2), z: d.side * (hwd + HANDVAT.uit * 0.5 + uit), sx: HANDVAT.len, sy: HANDVAT.dik, sz: HANDVAT.uit, soort: 'handvat' });
  } else if (d.soort === 'achterdeur') {
    // laadklep of achterdeuren: een omlijsting op de achterkant (x = -len/2), met een middennaad bij een dubbele deur
    const x = -len / 2 - uit;
    const y1 = d.y0 + d.h;
    lijst.push({ x, y: d.y0, z: 0, sx: 0.01, sy: dikte, sz: d.w, soort: 'naad' });
    lijst.push({ x, y: y1, z: 0, sx: 0.01, sy: dikte, sz: d.w, soort: 'naad' });
    for (const s of [-1, 1]) lijst.push({ x, y: d.y0 + d.h / 2, z: s * d.w / 2, sx: 0.01, sy: d.h, sz: dikte, soort: 'naad' });
    lijst.push({ x, y: d.y0 + d.h / 2, z: 0, sx: 0.01, sy: d.h, sz: dikte, soort: 'naad' });
  }
  return lijst;
}

// De stroken voor een modelnaam; lege lijst voor een model zonder naden.
export function naadStroken(naam, len, hw, opts) {
  if (!NADEN_MODELLEN.includes(naam)) return [];
  const defs = DEUR_DEFS[naam];
  if (!defs) return [];
  const uit = [];
  for (const d of defs) for (const s of deurNaden(d, len, hw, opts)) uit.push(s);
  return uit;
}
