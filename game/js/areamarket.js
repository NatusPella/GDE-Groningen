// De streekmarkt van Bezit (epic #1095, #1103; ontwerp docs/BEZIT-21-11.md 5.7): een dynamische prijs per streek per dag,
//   prijs = basis x (1 + 0,2 x (vraag - aanbod) / referentie), begrensd op 0,7 tot 1,4,
// met een vraag uit een deterministische hash van streek, dag en product (geen Math.random), een aanbod dat bestaat uit wat spelers die dag in die streek
// leveren, en een verzadiging van 3% per 1.000 kg die je levert en een herstel van 25% per dag. Dat dwingt tot spreiden over streken.
// De dag komt uit de gedeelde spelkalender (calendar.js, het dagnummer van de wereld), niet uit de boerderijuren (gewasmarkt.js houdt de eigen
// basisprijzen): medespelers zien daardoor dezelfde prijs. Puur: geen DOM, geen THREE, geen klok, geen opslag (scripts/areamarket_test.mjs).

import { PRIJS_KG as PRICE_KG } from './gewasmarkt.js';
import { STREKEN } from './regioleven.js';
import { hashUnit, clamp, finite } from './bezithash.js';

export const DISTRICT_IDS = [...STREKEN.map((s) => s.id), 'overig'];
export const PRICE_MIN = 0.7, PRICE_MAX = 1.4;       // grenzen van de marktfactor (de bestaande dagmarkt zit op 0,8 tot 1,2)
export const SENSITIVITY = 0.2;                       // 0,2 x (vraag - aanbod) / referentie
export const SATURATION_PER_TONNE = 0.03;             // elke 1.000 kg die je levert drukt de prijs 3%
export const REBOUND_PER_DAY = 0.25;                 // de verzadiging herstelt 25% per dag
export const MAX_DEPRESSION = 0.6;                    // de verzadiging drukt hoogstens zestig procent
export const MAX_EVENT_MULT = 1.25;                   // de veilingdag (+25% op één product) is de grootste eventfactor; die komt bovenop de begrensde marktfactor

// Basisprijs per kilo (gewassen uit gewasmarkt.js, de rest nieuw) en de referentiehoeveelheid per streek per dag (kg): wat de streek
// op een gewone dag opneemt. De achtergrondvraag en het achtergrondaanbod zijn deze referentie (de NPC-boeren).
export const BASE_PRICE = { ...PRICE_KG, melk: 0.45, kaas: 4.5, friet: 0.9, meel: 0.3, brood: 1.6, eieren: 1.6, hooi: 0.12 };
export const REFERENCE = { aardappelen: 12000, bieten: 20000, graan: 10000, gras: 15000, uien: 6000, fruit: 3000, melk: 8000, kaas: 800, friet: 3000, meel: 2500, brood: 2500, eieren: 1200, hooi: 5000 };
export const PRODUCTS = Object.keys(BASE_PRICE);
export const districtOf = (r) => (DISTRICT_IDS.includes(r) ? r : 'overig');

// De marktdag uit het dagnummer van de spelkalender (1 = vrijdag 14 augustus, ook ná het zomerseizoen doortellend): altijd een geheel getal van minstens 1.
export const marketDay = (calendarDay) => Math.max(1, Math.floor(finite(calendarDay, 1)));

// ---- vraag en aanbod ----
// De vraag van die dag in kilo: 0,3 tot 2,2 maal de referentie, vast uit de hash.
export const demandKg = (region, product, day) => Math.round((REFERENCE[product] || 5000) * (0.3 + 1.9 * hashUnit('vraag', districtOf(region), product, marketDay(day))));
// Het achtergrondaanbod van de streek: precies de referentie.
export const backgroundSupplyKg = (product) => REFERENCE[product] || 5000;

export const newMarket = () => ({ day: 0, today: {}, depression: {} });
const key = (region, product) => `${districtOf(region)}:${product}`;

// Naar een nieuwe dag: de verzadiging herstelt 25% per verstreken dag en het aanbod van gisteren is weg. Past de invoer niet aan.
export function advanceMarket(m, day) {
  const d = marketDay(day);
  if (d <= m.day) return m;
  const dep = {};
  const f = Math.pow(1 - REBOUND_PER_DAY, d - m.day);
  for (const k of Object.keys(m.depression)) { const v = m.depression[k] * f; if (v > 0.0005) dep[k] = Math.round(v * 10000) / 10000; }
  return { day: d, today: {}, depression: dep };
}

// Het aanbod van die dag in kilo: de achtergrond plus wat spelers die dag in de streek leverden (alleen voor de lopende dag).
export function supplyKg(m, region, product, day) {
  const d = marketDay(day);
  return backgroundSupplyKg(product) + (d === m.day ? finite(m.today[key(region, product)], 0) : 0);
}

// De marktfactor van een streek en product op een dag: (1 + 0,2 x (vraag - aanbod) / referentie) maal (1 - verzadiging), begrensd op 0,7 tot 1,4.
// Daarbovenop een eventfactor (veilingdag), die niet begrensd wordt door 1,4 maar nooit boven MAX_EVENT_MULT komt.
export function priceFactor(m, region, product, day, eventMult = 1) {
  const d = marketDay(day), ref = REFERENCE[product] || 5000;
  const pressure = (demandKg(region, product, d) - supplyKg(m, region, product, d)) / ref;
  const dep = clamp(finite(m.depression[key(region, product)], 0), 0, MAX_DEPRESSION) * (d >= m.day ? 1 : 0);
  const core = clamp((1 + SENSITIVITY * pressure) * (1 - dep), PRICE_MIN, PRICE_MAX);
  const ev = clamp(finite(eventMult, 1), 0.5, MAX_EVENT_MULT);
  return Math.round(core * ev * 10000) / 10000;
}
export const pricePerKg = (m, region, product, day, eventMult = 1) => {
  const base = BASE_PRICE[product];
  return base > 0 ? Math.max(0.01, Math.round(base * priceFactor(m, region, product, day, eventMult) * 100) / 100) : 0;
};

// De trend ten opzichte van gisteren (zonder gisteren aanbod en verzadiging): 'op', 'neer' of 'gelijk' voor het markt-tabblad.
export function trend(m, region, product, day) {
  const d = marketDay(day), now = priceFactorPure(region, product, d), prev = priceFactorPure(region, product, Math.max(1, d - 1));
  return now > prev + 0.005 ? 'op' : now < prev - 0.005 ? 'neer' : 'gelijk';
}
const priceFactorPure = (region, product, d) => clamp(1 + SENSITIVITY * (demandKg(region, product, d) - backgroundSupplyKg(product)) / (REFERENCE[product] || 5000), PRICE_MIN, PRICE_MAX);

// ---- leveren ----
// Een levering van kg kilo: de prijs zakt tijdens het leveren (3% per 1.000 kg), zodat één grote levering nooit meer oplevert dan dezelfde kilo's in porties.
// Geeft { revenue, avgPrice, factorAfter } en de nieuwe markttoestand; past de invoer niet aan. De opbrengst telt het aanbod van vandaag (alle spelers) mee.
export function deliver(m0, region, product, kg, day, eventMult = 1) {
  const m = advanceMarket(m0, day);
  const d = marketDay(day), k = key(region, product);
  const amount = Math.max(0, finite(kg, 0));
  if (!(BASE_PRICE[product] > 0) || amount === 0) return { market: m, revenue: 0, avgPrice: 0, kg: 0, factorAfter: priceFactor(m, region, product, d, eventMult) };
  let dep = clamp(finite(m.depression[k], 0), 0, MAX_DEPRESSION);
  let today = finite(m.today[k], 0), revenue = 0, left = amount;
  const STEP = 250;
  while (left > 0) {
    const part = Math.min(STEP, left);
    const tmp = { ...m, today: { ...m.today, [k]: today }, depression: { ...m.depression, [k]: dep } };
    revenue += part * pricePerKg(tmp, region, product, d, eventMult);
    today += part; dep = Math.min(MAX_DEPRESSION, dep + (part / 1000) * SATURATION_PER_TONNE);
    left -= part;
  }
  const market = { day: m.day, today: { ...m.today, [k]: today }, depression: { ...m.depression, [k]: Math.round(dep * 10000) / 10000 } };
  return { market, revenue: Math.round(revenue * 100) / 100, avgPrice: Math.round((revenue / amount) * 1000) / 1000, kg: amount, factorAfter: priceFactor(market, region, product, d, eventMult) };
}
// De levering van een medespeler (EXTRA-bericht): telt voor het aanbod en de verzadiging, zonder opbrengst voor de ontvanger.
export const recordRemoteDelivery = (m, region, product, kg, day) => deliver(m, region, product, kg, day).market;

// ---- opslag ----
export function normalizeMarket(raw) {
  const m = newMarket();
  if (!raw || typeof raw !== 'object') return m;
  m.day = Math.max(0, Math.floor(finite(raw.day, 0)));
  const ok = (k) => { const [r, p] = String(k).split(':'); return DISTRICT_IDS.includes(r) && BASE_PRICE[p] > 0; };
  for (const k of Object.keys(raw.today || {}).filter(ok).slice(0, 200)) m.today[k] = clamp(finite(raw.today[k], 0), 0, 1e9);
  for (const k of Object.keys(raw.depression || {}).filter(ok).slice(0, 200)) m.depression[k] = clamp(finite(raw.depression[k], 0), 0, MAX_DEPRESSION);
  return m;
}

// Het tabblad Markt: per product de prijs in elke streek vandaag, met de beste streek (om naartoe te leveren). rows: [{ region, factor, price }].
export function marketBoard(m, product, day, eventMult = 1) {
  const rows = DISTRICT_IDS.filter((r) => r !== 'overig').map((r) => ({ region: r, factor: priceFactor(m, r, product, day, eventMult), price: pricePerKg(m, r, product, day, eventMult), trend: trend(m, r, product, day) }));
  rows.sort((a, b) => b.factor - a.factor || a.region.localeCompare(b.region));
  return { product, best: rows[0] || null, rows };
}
