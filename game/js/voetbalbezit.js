// Dunne adapter tussen de voetbalcarrière en Bezit (#1179, epic #1106; ontwerp docs/VOETBAL-CARRIERE-21-11.md hoofdstukken 7 en 8): puur, geen DOM (scripts/voetbal_bezit_test.mjs).
// Bezit (bezit.js, parcelindex.js) wordt hier alleen GELEZEN: de pandindex (createBuildingIndex) en `ownsBuilding`. Er verandert niets in Bezit zelf; een sponsorpand is een gewoon bedrijfspand dat de speler
// ook gewoon kan kopen. De adapter levert (1) de `pandIndex` die voetbalsponsors.js `accept` verwacht, (2) de vraag of de speler het sponsorpand bezit (voor `ownerBonus`, hooguit +10% op thuisdagen),
// (3) de gevelnamen voor shopsigns3d (osm-id naar de verzonnen sponsornaam). Clubaandelen blijven in het carrièreprofiel (voetbalclub_bezit.js): Bezit kent de sleutel `club` nog niet in EXT_KEYS.
import { ownsBuilding } from './bezit.js';
import { ownerBonus } from './voetbalsponsors.js';

// Pandtypen uit de Bezit-pandindex (bezit-panden.json) die een bedrijf kunnen zijn, in volgorde van voorkeur per sponsorsoort. Winkels zijn 'retail', kantoren 'commercial', werkplaatsen 'industrial'.
export const SPONSOR_BUILDING_TYPES = {
  dairy: ['industrial', 'retail'], bakery: ['retail', 'commercial'], doityourself: ['retail', 'industrial'], car: ['industrial', 'retail'], fast_food: ['retail', 'commercial'],
  bank: ['commercial', 'retail'], supermarket: ['retail', 'commercial'], bicycle: ['retail', 'industrial'], energy: ['commercial', 'industrial'],
};
export const DEFAULT_BUILDING_TYPES = ['retail', 'commercial', 'industrial'];
export const SEARCH_RADII = [400, 1500, 4000];       // eerst bij de club, daarna in de wijde omgeving

// `buildings` is een createBuildingIndex uit parcelindex.js (of iets met dezelfde `near(x, y, r)`). De uitkomst is de interface van voetbalsponsors.js: find(pandtype, { x, y }) geeft een osm-id of null.
// Deterministisch: de voorkeursvolgorde van de typen, dan de grootste oppervlakte, dan het laagste id; nooit een monument (landmark).
export function makeSponsorPandIndex(buildings, { exclude = [] } = {}) {
  const skip = new Set(exclude);
  return {
    find(pandType, plaats) {
      if (!buildings || typeof buildings.near !== 'function' || !plaats || !Number.isFinite(plaats.x) || !Number.isFinite(plaats.y)) return null;
      const prefs = SPONSOR_BUILDING_TYPES[pandType] || DEFAULT_BUILDING_TYPES;
      for (const r of SEARCH_RADII) {
        const near = buildings.near(plaats.x, plaats.y, r).filter((b) => !b.landmark && !skip.has(b.osm) && prefs.includes(b.type));
        if (!near.length) continue;
        near.sort((a, b) => prefs.indexOf(a.type) - prefs.indexOf(b.type) || b.m2 - a.m2 || a.osm - b.osm);
        return near[0].osm;
      }
      return null;
    },
  };
}
// Het sponsorpand van een geaccepteerde sleuf bezit de speler als Bezit het pand kent.
export const ownsSponsorPand = (bezit, slot) => !!(bezit && slot && slot.accepted && Number.isSafeInteger(slot.osm) && ownsBuilding(bezit, slot.osm));
// De klantenbonus van de geaccepteerde sleuven samen: één bonus als een van de panden van jou is, nooit opgeteld (hooguit +10%) en nooit een tweede uitbetaling.
export function sponsorBonus(sponsors, bezit, { isHomeDay = false, form = 1 } = {}) {
  const owned = ((sponsors && sponsors.slots) || []).some((s) => ownsSponsorPand(bezit, s));
  return ownerBonus({ isHomeDay, ownsPand: owned, form });
}
// De gevelnamen: welk pand krijgt welke verzonnen sponsornaam op de gevel (osm-id naar naam). Alleen voor geaccepteerde sleuven met een pand.
export function facadeNames(sponsors) {
  const m = {};
  for (const s of (sponsors && sponsors.slots) || []) if (s.accepted && Number.isSafeInteger(s.osm)) m[s.osm] = s.naam;
  return m;
}
