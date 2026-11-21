// Prijsmodel, bodem en namen van percelen voor Bezit (epic #1095, #1097; ontwerp docs/BEZIT-21-11.md 4.3 en 4.5). Puur: geen DOM, geen
// THREE, geen klok, geen opslag (scripts/bezit_prijs_test.mjs). Alle namen zijn verzonnen: nooit een echte eigenaar, kadasternummer of
// persoonsnaam (constitution 2 en 4); echte plaatsen mogen als ligging.

import { bodemFactor, VERKOOP_FACTOR } from './percelen.js';

export { bodemFactor, VERKOOP_FACTOR };

// 48 bit uit het ID ('p' + 12 hex) als twee getallen, voor vaste ruis en vaste keuzes per perceel (nooit Math.random).
export function idNumbers(id) {
  const h = String(id || '').replace(/^p/, '').padEnd(12, '0');
  return [parseInt(h.slice(0, 6), 16) || 0, parseInt(h.slice(6, 12), 16) || 0];
}
const idUnit = (id, k = 0) => ((idNumbers(id)[k & 1] >>> ((k >> 1) * 3)) % 1000) / 1000;   // 0..1 vast per perceel

export const GROUND_PER_HA = { w: 1500, a: 2300, b: 3200 };       // weide, akker, boomgaard; weide en akker staan al zo in percelen.js
export const MIN_PRICE = 2400;                                     // het goedkoopste perceel (de Sauwerd-weide van percelen.js): na ongeveer twee uur werk te betalen (1.100 per uur)
export const REGION_FACTOR = { hogeland: 1.15, hunsingo: 1.15, oldambt: 1.15, eemsdelta: 1.10, lauwerskust: 1.0, westerkwartier: 0.90, veenkolonien: 0.85, westerwolde: 0.80, overig: 1.0 };
export const REGION_SOIL = { hogeland: 0.85, hunsingo: 0.85, oldambt: 0.90, eemsdelta: 0.80, lauwerskust: 0.70, westerkwartier: 0.55, veenkolonien: 0.50, westerwolde: 0.45, overig: 0.60 };
export const ACCESS_FACTOR = { weg: 1, pad: 0.92, wegNabij: 0.85, padNabij: 0.78 };
export const SCALE_CAP = 200;                                       // zoveel eigen percelen en panden tellen mee voor de schaalprijs (max x3)

export const isForSale = (p) => !!p && ACCESS_FACTOR[p.access] !== undefined;     // 'geen' toegang is niet te koop
export const regionId = (r) => (r && REGION_FACTOR[r.id || r] !== undefined ? (r.id || r) : 'overig');

// Bodem 0..1: streekgemiddelde plus een vaste ruis van plus of min 0,1 uit het ID.
export const soilQuality = (id, region) => Math.round(Math.max(0, Math.min(1, REGION_SOIL[regionId(region)] + (idUnit(id, 0) - 0.5) * 0.2)) * 100) / 100;

export const sizeFactor = (ha) => (ha <= 5 ? 1 : ha <= 20 ? 0.95 : 0.85);
export const scaleFactor = (owned) => 1 + Math.min(Math.max(0, owned | 0), SCALE_CAP) / 100;

// Basisprijs zonder schaalprijs, op 50 afgerond, ten minste MIN_PRICE. Niet te koop: 0.
export function basePrice(p, region) {
  if (!isForSale(p)) return 0;
  const soil = soilQuality(p.id, region);
  const raw = p.ha * GROUND_PER_HA[p.kind] * REGION_FACTOR[regionId(region)] * (0.7 + 0.6 * soil) * ACCESS_FACTOR[p.access] * sizeFactor(p.ha);
  return Math.max(MIN_PRICE, Math.round(raw / 50) * 50);
}
// De prijs voor deze speler nu: de basisprijs maal de schaalprijs (wie veel heeft, betaalt voor het volgende tot driemaal zoveel).
export const parcelPrice = (p, region, owned = 0) => { const b = basePrice(p, region); return b ? Math.round((b * scaleFactor(owned)) / 50) * 50 : 0; };
// Verkopen levert een deel van wat je betaalde (VERKOOP_FACTOR): kopen en direct verkopen kost 25%.
export const sellValue = (paid) => Math.round((Math.max(0, paid) * VERKOOP_FACTOR) / 5) * 5;
// Pacht per speldag: 0,9% van de koopprijs; lager dan wat een huurder vraagt (1,2%), zodat huren en verpachten nooit een lus is.
export const LEASE_OUT_RATE = 0.009;
export const leaseOutPerDay = (paid) => Math.round((Math.max(0, paid) * LEASE_OUT_RATE) / 5) * 5;

// ---- namen (ontwerp 4.5) ----
const WORDS = {
  w: ['Wei', 'Dijkweide', 'Polderwei', 'Terpweide'],
  a: ['Kleistuk', 'Zandkamp', 'Dalgrondakker', 'Wierdeakker'],
  b: ['Bongerd', 'Fruitkamp'],
};
const SELLER_KIND = ['Maatschap', 'Veehouderij', 'Akkerbouwbedrijf', 'Familiebedrijf', 'Landbouwbedrijf'];
const LANDSCAPE = ['Hoek', 'Kamp', 'Wierde', 'Klei', 'Polder', 'Dijk', 'Zand', 'Horn', 'Zijl', 'Meer'];
export const KIND_NAME = { w: 'weide', a: 'akker', b: 'boomgaard' };
const pick = (arr, id, k) => arr[Math.floor(idUnit(id, k) * arr.length) % arr.length];

// "Wierdeakker bij Winsum (K482)": soortwoord uit een lijst per soort, plaats = de dichtstbijzijnde woonplaats, nummer uit het ID.
export function parcelName(p, place = 'het Hogeland') {
  const n = (idNumbers(p.id)[1] % 10000);
  return `${pick(WORDS[p.kind] || WORDS.a, p.id, 1)} bij ${place} (K${String(n).padStart(4, '0')})`;
}
// De verzonnen verkoper: geen achternamen, geen persoonsnamen.
export const sellerName = (p) => `${pick(SELLER_KIND, p.id, 2)} ${pick(LANDSCAPE, p.id, 3)}`;
export const SELLER_WORDS = [...SELLER_KIND, ...LANDSCAPE];
export const NAME_WORDS = Object.values(WORDS).flat();

// Verwachte opbrengst voor de perceelkaart: kg per jaar-ish is te groot; de kaart toont de bestaande verwachtingskern: ha x bodemfactor x gewas.
export const soilWord = (q) => (q < 0.45 ? 'zwak' : q < 0.65 ? 'matig' : q < 0.85 ? 'goed' : 'uitstekend');
export const soilYieldFactor = (q) => bodemFactor(q);

// ---- de rem op passief inkomen (balans, #1105) ----
// Wat je zonder werk verdient (pacht, personeel, winkels) loopt per speldag (24 minuten) en wordt zacht afgevlakt naar een plafond van drie keer wat actief werk per
// speldag oplevert (1.100 per uur x 0,4 uur x 3): bij weinig bezit nauwelijks merkbaar, bij duizend percelen nooit meer dan een factor 3 van de actieve speler.
export const ACTIVE_PER_DAY = 440;
export const PASSIVE_CAP_DAY = ACTIVE_PER_DAY * 3;
export const compressPassive = (perDay) => (perDay > 0 ? Math.round(PASSIVE_CAP_DAY * (1 - Math.exp(-perDay / PASSIVE_CAP_DAY))) : perDay);
