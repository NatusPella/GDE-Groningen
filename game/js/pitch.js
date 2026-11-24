// Standplaatsen voor de snackwagen (epic #1095, #1102; ontwerp docs/BEZIT-21-11.md, sectie "Snackwagen en Us Mem Snacks"): de plekken in de provincie waar
// een snackwagen mag staan, met voetgangersdruk, uur- en weekeffect, een vergunning (kosten en geldigheid) en competitie. Puur: geen DOM, geen THREE, geen klok,
// geen opslag en geen Math.random (alles uit de speldag en de plek; scripts/pitch_test.mjs).
//
// De namen van de plekken zijn verzonnen bij echte plaatsen en pleinen (constitution 2): "Hoek van de Grote Markt" bestaat als plek, maar de wagens, de
// vergunningen en de concurrent zijn verzonnen. De ligging komt als lat en lon (WGS84) en wordt met wgsToWorld naar het spel gebracht (rdnew.js).
//
// Een plek heeft: foot (gemiddelde druk, 1 is een gewone drukke dag in een middelgrote plaats), week (maandag tot en met vrijdag en weekend: gemiddeld 1 over de week),
// profile (het uurprofiel), comp (hoeveel concurrentie er al is) en cluster (plekken die elkaars klanten delen). id's zijn 2 tot 12 kleine letters: de oude
// standplaatsen van de frietwagen (markt, station, park, dorp, kust, kermis) blijven bestaan.

import { wgsToWorld } from './rdnew.js';
import { hashUnit, clamp, finite } from './bezithash.js';
import { difficultyFactor } from './bezitprijs.js';

export const SPOTS = [
  { id: 'markt', name: 'Hoek van de Grote Markt', place: 'Groningen', lat: 53.2194, lon: 6.5665, foot: 1.60, week: [0.93, 1.18], profile: 'dag', comp: 0.30, cluster: 'stad', region: 'overig', tier: 5, short: 'Grote Markt' },
  { id: 'martini', name: 'Martinikerkhof, bij de poort', place: 'Groningen', lat: 53.2190, lon: 6.5685, foot: 1.30, week: [0.90, 1.25], profile: 'dag', comp: 0.25, cluster: 'stad', region: 'overig', tier: 4, short: 'Martinikerkhof' },
  { id: 'station', name: 'Stationsplein, kant Hoofdstation', place: 'Groningen', lat: 53.2110, lon: 6.5650, foot: 1.35, week: [1.10, 0.75], profile: 'spits', comp: 0.28, cluster: 'stad', region: 'overig', tier: 4, short: 'Bij het station' },
  { id: 'oosterpoort', name: 'Trap van de Oosterpoort', place: 'Groningen', lat: 53.2160, lon: 6.5745, foot: 1.00, week: [0.95, 1.12], profile: 'avond', comp: 0.15, cluster: 'stad', region: 'overig', tier: 3, short: 'Oosterpoort' },
  { id: 'reitdiep', name: 'Kade van de Reitdiephaven', place: 'Groningen', lat: 53.2368, lon: 6.5330, foot: 0.90, week: [0.80, 1.50], profile: 'haven', comp: 0.10, cluster: 'stad', region: 'overig', tier: 3, short: 'Reitdiephaven' },
  { id: 'park', name: 'Ingang Noorderplantsoen', place: 'Groningen', lat: 53.2247, lon: 6.5590, foot: 0.85, week: [0.75, 1.70], profile: 'haven', comp: 0.08, cluster: 'stad', region: 'overig', tier: 3, short: 'Noorderplantsoen' },
  { id: 'stadion', name: 'Pleintje bij het voetbalstadion', place: 'Groningen', lat: 53.2063, lon: 6.5880, foot: 1.40, week: [0.40, 2.50], profile: 'club', comp: 0.12, cluster: 'stad', region: 'overig', tier: 4, short: 'Voetbalstadion', event: 'wedstrijd' },
  { id: 'kermis', name: 'Kermisterrein bij het Stadspark', place: 'Groningen', lat: 53.2040, lon: 6.5340, foot: 0.74, week: [1.0, 1.0], profile: 'event', comp: 0.15, cluster: 'stad', region: 'overig', tier: 2, short: 'Op de kermis', event: 'kermis' },
  { id: 'haren', name: 'Plein bij de Rijksstraatweg', place: 'Haren', lat: 53.1740, lon: 6.6070, foot: 0.60, week: [0.90, 1.25], profile: 'dag', comp: 0.06, cluster: 'zuid', region: 'overig', tier: 2, short: 'Haren' },
  { id: 'dorp', name: 'Dorpsplein van Winsum', place: 'Winsum', lat: 53.3330, lon: 6.5185, foot: 0.45, week: [0.95, 1.12], profile: 'dag', comp: 0.04, cluster: 'noord', region: 'hunsingo', tier: 1, short: 'Dorpsplein' },
  { id: 'leek', name: 'Markt van Leek', place: 'Leek', lat: 53.1620, lon: 6.3760, foot: 0.50, week: [0.95, 1.12], profile: 'dag', comp: 0.05, cluster: 'west', region: 'westerkwartier', tier: 1, short: 'Leek' },
  { id: 'veendam', name: 'Plein in het centrum van Veendam', place: 'Veendam', lat: 53.1070, lon: 6.8770, foot: 0.65, week: [0.95, 1.12], profile: 'dag', comp: 0.07, cluster: 'oost', region: 'veenkolonien', tier: 2, short: 'Veendam' },
  { id: 'delfzijl', name: 'Havenpromenade van Delfzijl', place: 'Delfzijl', lat: 53.3320, lon: 6.9190, foot: 0.60, week: [0.85, 1.40], profile: 'haven', comp: 0.05, cluster: 'oost', region: 'eemsdelta', tier: 2, short: 'Delfzijl' },
  { id: 'zoutkamp', name: 'Haven van Zoutkamp', place: 'Zoutkamp', lat: 53.3495, lon: 6.2985, foot: 0.60, week: [0.80, 1.50], profile: 'haven', comp: 0.04, cluster: 'noord', region: 'lauwerskust', tier: 2, short: 'Zoutkamp' },
  { id: 'kust', name: 'Kade van Lauwersoog', place: 'Lauwersoog', lat: 53.4010, lon: 6.2210, foot: 0.75, week: [0.70, 1.80], profile: 'haven', comp: 0.05, cluster: 'noord', region: 'lauwerskust', tier: 2, short: 'Aan de kust' },
  { id: 'eemshaven', name: 'Kade van de Eemshaven', place: 'Eemshaven', lat: 53.4415, lon: 6.8330, foot: 0.55, week: [1.15, 0.60], profile: 'spits', comp: 0.03, cluster: 'noord', region: 'eemsdelta', tier: 1, short: 'Eemshaven' },
];
export const SPOT_IDS = SPOTS.map((s) => s.id);
const BY_ID = new Map(SPOTS.map((s) => [s.id, s]));
export const spotDef = (id) => BY_ID.get(id) || null;
export const isSpot = (id) => BY_ID.has(id);
export const CLUSTERS = [...new Set(SPOTS.map((s) => s.cluster))];

// De plek in het spel (wereldmeters, eenmaal berekend).
const XY = new Map();
export function spotXY(id) {
  const s = BY_ID.get(id);
  if (!s) return null;
  let p = XY.get(id);
  if (!p) { const [x, y] = wgsToWorld(s.lat, s.lon); p = { x: Math.round(x), y: Math.round(y) }; XY.set(id, p); }
  return p;
}
// De dichtstbijzijnde plek bij een punt, hoogstens max meter ver; null als er geen is.
export function nearestSpot(x, y, max = 150) {
  let best = null, bd = max;
  for (const s of SPOTS) { const p = spotXY(s.id), d = Math.hypot(p.x - x, p.y - y); if (d <= bd) { bd = d; best = s.id; } }
  return best;
}

// ---- het uurprofiel: waar de klanten per uur van de dag zijn (24 gewichten, uur 0 tot 23) ----
export const PROFILES = {
  dag: [0, 0, 0, 0, 0, 0, 0.05, 0.2, 0.4, 0.6, 0.9, 1.2, 1.5, 1.4, 1.0, 0.9, 1.0, 1.2, 1.3, 1.0, 0.7, 0.5, 0.25, 0.05],
  spits: [0, 0, 0, 0, 0, 0.1, 0.5, 1.3, 1.5, 0.9, 0.5, 0.5, 0.8, 0.9, 0.6, 0.6, 1.0, 1.5, 1.4, 0.9, 0.5, 0.3, 0.15, 0.05],
  avond: [0, 0, 0, 0, 0, 0, 0, 0, 0.1, 0.2, 0.3, 0.5, 0.7, 0.7, 0.6, 0.6, 0.7, 0.9, 1.3, 1.6, 1.7, 1.5, 1.0, 0.4],
  haven: [0, 0, 0, 0, 0, 0, 0, 0.1, 0.2, 0.4, 0.7, 1.0, 1.3, 1.5, 1.5, 1.4, 1.3, 1.2, 1.1, 0.9, 0.6, 0.3, 0.1, 0],
  club: [0, 0, 0, 0, 0, 0, 0, 0, 0.1, 0.2, 0.4, 0.8, 1.2, 1.6, 1.8, 1.8, 1.4, 0.8, 0.4, 0.2, 0.1, 0, 0, 0],
  event: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.2, 0.5, 0.9, 1.2, 1.4, 1.5, 1.5, 1.6, 1.7, 1.7, 1.5, 1.2, 0.8, 0.3],
};
const TOTAL = Object.fromEntries(Object.entries(PROFILES).map(([k, v]) => [k, v.reduce((a, b) => a + b, 0)]));
// Het aandeel van de dagdruk dat een wagen vangt die om `from` uur opent en `hours` uur openblijft (0 tot 1). Een venster over middernacht telt door.
export function openingShare(profile, from, hours) {
  const p = PROFILES[profile] || PROFILES.dag;
  const f = Math.floor(clamp(finite(from, 11), 0, 23)), h = Math.floor(clamp(finite(hours, 10), 0, 18));
  let s = 0;
  for (let i = 0; i < h; i++) s += p[(f + i) % 24];
  return Math.round((s / TOTAL[profile || 'dag']) * 1000) / 1000;
}
// Het beste venster van h uur voor dit profiel: { from, fraction }.
export function bestOpening(profile, hours) {
  let best = { from: 0, fraction: -1 };
  for (let f = 0; f < 24; f++) { const fr = openingShare(profile, f, hours); if (fr > best.fraction) best = { from: f, fraction: fr }; }
  return best;
}

// ---- de vraag: klanten per dag ----
export const BASE_DEMAND = 250;                  // klanten per dag als je de héle dagdruk vangt bij druk 1 (een venster van tien uur vangt ruim 80% ervan)
export const weekMult = (spot, weekend) => (spot.week ? spot.week[weekend ? 1 : 0] : 1);
// Gebeurtenissen: de kermis telt alleen op een kermisdag (ctx.kermis), de wedstrijd op een thuiswedstrijd (ctx.matchDay, zie matchDay); anders weinig.
export const MATCH_PERIOD = 14;                  // elke veertien speldagen een thuiswedstrijd, altijd op een zaterdag
export function matchDay(calendarDay) {
  const d = Math.floor(finite(calendarDay, 0));
  return d >= 2 && d % MATCH_PERIOD === 2;       // dag 1 is een vrijdag (zie bezitlive weekendDay), dus dag 2 is de eerste zaterdag
}
export function eventMult(spot, ctx = {}) {
  if (spot.event === 'kermis') return ctx.kermis ? 3.2 : 0.3;
  if (spot.event === 'wedstrijd') return ctx.matchDay ? 1.0 : 0.55;
  return 1;
}
// Winkeldichtheid: het aantal winkelplekken (shopspots.js) binnen 350 m van de plek maakt het drukker (hoogstens +25%, minstens -10% als er niets is).
export const densityFactor = (n) => Math.round(clamp(0.9 + 0.025 * Math.max(0, finite(n, 0)), 0.9, 1.25) * 1000) / 1000;
export function shopsNear(id, shops, radius = 350) {
  const p = spotXY(id);
  if (!p || !Array.isArray(shops)) return 0;
  let n = 0;
  for (const s of shops) if (s && Math.hypot(s.x - p.x, s.y - p.y) <= radius) n++;
  return n;
}
// De klanten per dag op een plek bij een venster. ctx: { day, weekend, kermis, matchDay, from, hours, shops (aantal in de buurt) }.
// Geeft { demand, parts } met de factoren.
export function demandAt(id, ctx = {}) {
  const s = BY_ID.get(id);
  if (!s) return { demand: 0, parts: {} };
  const weekend = !!ctx.weekend;
  const ev = eventMult(s, ctx);
  const win = openingShare(s.profile, finite(ctx.from, 11), finite(ctx.hours, 10));
  const dens = ctx.shops === undefined ? 1 : densityFactor(ctx.shops);
  const wk = weekMult(s, weekend);
  const day = 0.94 + 0.12 * hashUnit('standdag', id, Math.floor(finite(ctx.day, 0)));         // vaste ruis per plek en dag: 0,94 tot 1,06
  const parts = { druk: s.foot, week: wk, gebeurtenis: ev, venster: win, winkels: dens, dag: Math.round(day * 1000) / 1000 };
  return { demand: BASE_DEMAND * s.foot * wk * ev * win * dens * day, parts };
}

// ---- concurrentie op de plek ----
// Een plek heeft een vaste concurrentie (comp: de andere snack- en frietkramen, de horeca); een goede naam drukt dat (reputatie 0 tot 100: bij 100 een derde minder).
// Elke standplaats van de concurrent in hetzelfde cluster kost nog eens 3% (hoogstens 15%).
export function competitionFactor(id, { rep = 50, rivalSpots = [] } = {}) {
  const s = BY_ID.get(id);
  if (!s) return 1;
  const base = s.comp * (1 - (clamp(finite(rep, 50), 0, 100) / 100) / 3);
  const near = rivalSpots.filter((r) => r !== id && BY_ID.get(r) && BY_ID.get(r).cluster === s.cluster).length;
  return Math.round((1 - base - Math.min(0.15, 0.03 * near)) * 1000) / 1000;
}

// ---- de vergunning ----
export const PERMIT_BASE = 6000;                 // de prijs van een plek met druk 1
export const PERMIT_DAYS = 40;                   // zoveel speldagen is een vergunning geldig
export const PERMIT_RENEW = 0.25;                // verlengen kost een kwart van de prijs
export const PERMIT_SCALE_STEP = 0.15;           // elke vergunning die je al hebt maakt de volgende 15% duurder (hoogstens x3)
export const permitScale = (held) => 1 + Math.min(clamp(Math.floor(finite(held, 0)), 0, 40) * PERMIT_SCALE_STEP, 2);
// De prijs van de vergunning op een plek bij `held` vergunningen die je al hebt; op 50 afgerond. 0 als de plek niet bestaat.
export function permitPrice(id, held = 0) {
  const s = BY_ID.get(id);
  if (!s) return 0;
  return Math.round((PERMIT_BASE * Math.pow(s.foot, 1.6) * permitScale(held) * difficultyFactor('price')) / 50) * 50;
}
export const renewalCost = (id, held = 0) => Math.round((permitPrice(id, Math.max(0, held - 1)) * PERMIT_RENEW) / 5) * 5;
// Opslag: { [id]: { until, paid } } (until = laatste speldag dat hij geldig is).
export const permitHeld = (permits, id, day) => !!(permits && permits[id] && finite(permits[id].until, 0) >= Math.floor(finite(day, 0)));
export const permitDaysLeft = (permits, id, day) => (permitHeld(permits, id, day) ? Math.floor(permits[id].until - day) + 1 : 0);
export const heldIds = (permits, day) => Object.keys(permits || {}).filter((id) => BY_ID.has(id) && permitHeld(permits, id, day));
// Een vergunning kopen: geeft { ok, cost, permits } of { ok: false, why }. taken(id) is waar als een ander (de concurrent of een medespeler) de plek heeft.
export function buyPermit(permits, id, day, money, { taken = () => false } = {}) {
  if (!BY_ID.has(id)) return { ok: false, why: 'onbekend' };
  const d = Math.floor(finite(day, 0));
  if (permitHeld(permits, id, d)) return { ok: false, why: 'al-van-jou' };
  if (taken(id)) return { ok: false, why: 'bezet' };
  const cost = permitPrice(id, heldIds(permits, d).length);
  if (!(finite(money, 0) >= cost)) return { ok: false, why: 'te-weinig-geld', tekort: Math.round(cost - finite(money, 0)) };
  return { ok: true, cost, permits: { ...permits, [id]: { until: d + PERMIT_DAYS - 1, paid: cost } } };
}
// Elke dag: een vergunning die vandaag verloopt wordt verlengd als er geld is (het geld gaat via de aanroeper), anders vervalt de plek.
// Geeft { permits, spent, renewed: [id], lapsed: [id] }. Een vergunning die al verlopen is, wordt weggehaald.
export function settlePermits(permits, day, money) {
  const d = Math.floor(finite(day, 0));
  const next = {}, renewed = [], lapsed = [];
  let left = finite(money, 0), spent = 0;
  const live = Object.keys(permits || {}).filter((id) => BY_ID.has(id)).sort();
  for (const id of live) {
    const p = permits[id];
    if (finite(p.until, 0) >= d) { next[id] = p; continue; }
    const cost = renewalCost(id, live.length);
    if (left >= cost) { left -= cost; spent += cost; renewed.push(id); next[id] = { until: d + PERMIT_DAYS - 1, paid: finite(p.paid, 0) }; }
    else lapsed.push(id);
  }
  return { permits: next, spent, renewed, lapsed };
}
export function normalizePermits(raw) {
  const out = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const id of Object.keys(raw).slice(0, 40)) {
    if (!BY_ID.has(id) || !raw[id] || typeof raw[id] !== 'object') continue;
    out[id] = { until: Math.round(clamp(finite(raw[id].until, 0), 0, 1e7)), paid: Math.round(clamp(finite(raw[id].paid, 0), 0, 1e9)) };
  }
  return out;
}

// Het sleutelwoord voor Samen spelen: een claim op een plek heet 'sp:<id>' (bezitcoop.js).
export const claimKey = (id) => `sp:${id}`;
export const spotOfClaim = (key) => (typeof key === 'string' && key.startsWith('sp:') && BY_ID.has(key.slice(3)) ? key.slice(3) : null);
