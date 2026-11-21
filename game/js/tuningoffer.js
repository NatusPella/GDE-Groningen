// Het aanbod van een pimp-werkplaats (epic Autotuning, #1155): niet elke garage heeft alles en elke dag is er een
// paar keer korting. Pure functies, deterministisch uit de garage-id en de dag, zonder THREE of opslag.
//
// - Een garage heeft een niveau 1 tot en met 3 (de eigen garage thuis altijd 3, een pomp hoogstens 2).
//   Een onderdeel heeft een laag: 0 (basis), 1 (standaard) of 2 (premium), uit zijn prijs. Een onderdeel
//   boven het niveau van de garage is zichtbaar maar vergrendeld ("Alleen bij een grotere garage").
// - Elke dag kiest elke garage drie dagaanbiedingen met 25% korting; daarna staat het weer op de gewone prijs.
// - De streek geeft een kleur aan het aanbod: in de stad (centrum) staan show-onderdelen vooraan, op het
//   platteland (polder, Veenkoloniën) de rally-onderdelen. Alleen volgorde en de dagaanbiedingen, geen prijzen.
import { seedOf, OPTIONS, fieldsFor, fieldPrice } from './vehiclelook.js';

export const DEAL_COUNT = 3;
export const DEAL_DISCOUNT = 0.25;
export const MAX_LEVEL = 3;

// De laag van een prijs: tot 34 basis, 35 tot 59 standaard, vanaf 60 premium.
export const tierOfPrice = (price) => (price >= 60 ? 2 : price >= 35 ? 1 : 0);
export const tierOf = (field, id) => {
  const o = (OPTIONS[field] || []).find((x) => x.id === id);
  return o ? tierOfPrice(o.price) : 0;
};

// Het niveau van een garage. site: { id|name, kind: 'garage'|'pomp'|'thuis'|'werf'|'fietsenmaker'|'tuning' }.
export function garageLevel(site) {
  if (!site) return 1;
  if (site.kind === 'thuis') return MAX_LEVEL;
  const h = seedOf('niveau', site.id ?? site.name ?? '') % 100;
  const base = h < 35 ? 1 : h < 80 ? 2 : 3;
  return site.kind === 'pomp' ? Math.min(2, base) : base;
}

// De streek uit het verkeersprofiel van de wijk (trafficfleet.js wijkProfileAt) en of het buiten de stad ligt.
export const areaFromProfile = (profileKey, country = false) => (country ? 'platteland' : ['centrum', 'student', 'chic'].includes(profileKey) ? 'stad' : 'dorp');

// De streek van een garage voor de kleur van het aanbod: 'stad' | 'dorp' | 'platteland'.
export function areaOf(site) {
  const r = site && site.region;
  return r === 'stad' || r === 'platteland' ? r : 'dorp';
}

// Een lijst van alle (veld, id)-paren die op een dag korting krijgen.
export function dailyDeals(site, dayIndex, kind = 'auto') {
  const pool = [];
  for (const f of fieldsFor(kind)) for (const o of OPTIONS[f] || []) if (o.price > 0) pool.push(`${f}:${o.id}`);
  const out = [];
  let n = 0;
  while (out.length < Math.min(DEAL_COUNT, pool.length) && n < 60) {
    const k = pool[seedOf('deal', site && (site.id ?? site.name) || '', dayIndex | 0, n++) % pool.length];
    if (!out.includes(k)) out.push(k);
  }
  return out.map((s) => { const [field, id] = s.split(':'); return { field, id }; });
}

// De prijs van één optie in deze garage op deze dag, met een vlag of er korting op zit.
export function offerPrice(site, dayIndex, kind, field, value) {
  const base = fieldPrice(field, value);
  if (!base) return { price: 0, base: 0, deal: false };
  const deal = dailyDeals(site, dayIndex, kind).some((d) => d.field === field && d.id === value);
  return { price: deal ? Math.max(1, Math.round(base * (1 - DEAL_DISCOUNT))) : base, base, deal };
}

// Is dit onderdeel hier te koop? Kleurvelden en de standaardwaarde altijd; de rest op laag tegenover niveau.
export function offerState(site, field, value) {
  const level = garageLevel(site);
  if (value == null || (OPTIONS[field] && OPTIONS[field][0].id === value)) return { ok: true, tier: 0, level };
  const tier = OPTIONS[field] ? tierOf(field, value) : 0;
  return tier + 1 <= level ? { ok: true, tier, level } : { ok: false, tier, level, reason: tier >= 2 ? 'Alleen bij een grote garage' : 'Alleen bij een garage met meer gereedschap' };
}

// De volgorde van de opties in een veld: de streek zet zijn favorieten voorop (stabiel, de standaard blijft eerst).
const AREA_FAVOURITES = {
  stad: ['pearl', 'metallic', 'star', 'mesh', 'halo', 'wing', 'lowprofile', 'duo', 'sport'],
  platteland: ['matte', 'offroad', 'rack', 'box', 'rally', 'disc', 'wide', 'hood'],
  dorp: [],
};
export function orderedOptions(site, field) {
  const list = (OPTIONS[field] || []).slice();
  const fav = AREA_FAVOURITES[areaOf(site)] || [];
  const first = list[0];
  const rank = (o) => (fav.includes(o.id) ? fav.indexOf(o.id) : 99);
  const rest = list.slice(1).sort((a, b) => rank(a) - rank(b));
  return first ? [first, ...rest] : rest;
}

// De kaartjes van de dag voor de UI: "Dagaanbieding: Sportkit, 25% korting".
export function dealLines(site, dayIndex, kind, labelOf) {
  return dailyDeals(site, dayIndex, kind).map((d) => ({ ...d, label: labelOf(d.field, d.id), ...offerPrice(site, dayIndex, kind, d.field, d.id) }));
}
