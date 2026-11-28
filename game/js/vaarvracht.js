// Vracht voor het water (#1376, W4): de contracten van De Drie Zusters. Pure regels: geen DOM, geen THREE, geen klok, geen opslag en geen
// Math.random, zodat dezelfde seed altijd hetzelfde aanbod geeft (scripts/vaarvracht_test.mjs). De vorm is die van vrachtmarkt.js (type, tarief per
// km, laad- en lostijd, vaste klanten), maar het is geen hergebruik van opleggers: de lading is een goed uit deliveries.js (bieten, graan, zand,
// kisten), de klant zit aan een kade van binnenvaartrules.js en de brandstof is die van een binnenvaartschip.
//
// Het loon van een contract is afstand x tarief per km + toeslag (contractLoon); de brandstof en het kadegeld gaan er af (nettoLoon). Elke
// levering krijgt een vaste id (leveringId): één levering wordt één keer betaald, ook als het bericht twee keer aankomt (coopbeloning.js).
// Klanten en bedrijven zijn verzonnen (constitution 2); de lading komt van de boer of de groothandel aan de kade en gaat daar ook weer van het schip.
//
// Samen spelen: de dekhulp (een meespelende gast) helpt met E bij het laden en lossen (helpAanKade in binnenvaartrules.js, HELP_STAP_S per druk); elke deelnemer krijgt het volle loon
// van de levering in zijn eigen portemonnee (coopbijbaan.js beloningBijbaan), zonder delen of dubbel.

import { GOODS, isGood } from './deliveries.js';
import { kadeById, overtochten, overtochtById, uitslagVan, THUIS } from './binnenvaartrules.js';
import { DIESEL_PRIJS } from './vrachtkosten.js';

// Wat er aan elke kade klaarligt (`levert`) en wat de klant er aanneemt (`neemt`). Elke combinatie van twee kades heeft minstens één goed dat aan
// de ene kant ligt en aan de andere kant wordt aangenomen (een test bewaakt dat).
export const KADEKLANTEN = Object.freeze({
  west: { klant: 'Pakhuis De Westhoek', levert: ['zand', 'kisten', 'graan'], neemt: ['graan', 'bieten', 'aardappelen', 'kisten'] },
  rustpunt: { klant: 'Loonbedrijf Starkenborgh', levert: ['bieten', 'graan', 'aardappelen'], neemt: ['kisten', 'zand', 'graan'] },
  oost: { klant: 'Suikerhal Oostkade', levert: ['aardappelen', 'kisten', 'uien'], neemt: ['bieten', 'graan', 'aardappelen', 'kisten', 'zand'] },
});

// Per goed: het tarief per km, de toeslag, de laad- en lostijd (s) en de hoeveelheid (ton voor kg-goederen, anders stuks). Lastiger lading betaalt iets meer.
export const GOEDEREN = Object.freeze({
  bieten: { tariefPerKm: 34, toeslag: 60, laad: 12, los: 9, hoeveelheid: [30, 55], woord: 'suikerbieten' },
  graan: { tariefPerKm: 36, toeslag: 62, laad: 11, los: 8, hoeveelheid: [25, 50], woord: 'graan' },
  aardappelen: { tariefPerKm: 35, toeslag: 60, laad: 11, los: 8, hoeveelheid: [20, 45], woord: 'aardappelen' },
  uien: { tariefPerKm: 37, toeslag: 62, laad: 12, los: 9, hoeveelheid: [15, 35], woord: 'uien' },
  zand: { tariefPerKm: 31, toeslag: 56, laad: 9, los: 7, hoeveelheid: [40, 70], woord: 'zand' },
  kisten: { tariefPerKm: 41, toeslag: 66, laad: 14, los: 11, hoeveelheid: [200, 600], woord: 'kisten' },
});
export const AANBOD_AANTAL = 3;
export const TIJD_MAX = 120;      // s: laden of lossen duurt nooit langer dan dit
const KM_MAX = 60;
const ERVAREN_TOESLAG = 0.06;     // per niveau boven 1
export const HELP_STAP_S = 1.5;   // wat één E van de dekhulp van de laad- of lostijd afhaalt

// Brandstof en havengeld voor één overtocht: een spits van 38 m drinkt meer dan een truck, en de kade rekent een vast bedrag.
export const VERBRUIK_L_PER_KM = 2.4;
export const START_LITER = 5;
export const KADEGELD = 6;        // € per overtocht, bij de kade van aankomst

const getal = (v) => (Number.isFinite(v) ? v : 0);
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const niveauVan = (v) => clamp(Math.round(getal(v)), 1, 5);

function hash32(n) {
  let h = Math.floor(getal(n)) | 0;
  h = Math.imul(h ^ 0x9e3779b9, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
}

// Welke goederen van kade `van` naar kade `naar` kunnen (levert aan de ene, neemt aan de andere kant); altijd een bekend goed uit deliveries.js.
export function goederenTussen(van, naar) {
  const a = KADEKLANTEN[van], b = KADEKLANTEN[naar];
  if (!a || !b || van === naar) return [];
  return a.levert.filter((g) => b.neemt.includes(g) && isGood(g) && GOEDEREN[g]);
}

// De id van één levering: dezelfde seed, kade en goed geven dezelfde id, zodat een bericht dat twee keer aankomt één keer telt.
export const leveringId = (seed, van, naar, good) => `vaar:${hash32(seed).toString(36)}:${van}:${naar}:${good}`;

// Drie aanbiedingen vanaf een kade, met verschillende bestemmingen of goederen. Zonder bruikbare kade of met een rare invoer: [].
export function maakAanbod(seed, van = THUIS, niveau = 1) {
  if (!kadeById(van)) return [];
  const lvl = niveauVan(niveau);
  const s = hash32(seed);
  const ritten = overtochten().filter((o) => o.van === van && goederenTussen(o.van, o.naar).length);
  if (!ritten.length) return [];
  const uit = [];
  for (let i = 0; i < AANBOD_AANTAL; i++) {
    const rit = ritten[(s + i + lvl - 1) % ritten.length];
    const goederen = goederenTussen(rit.van, rit.naar);
    const good = goederen[(s >>> (i * 4 + 3)) % goederen.length];
    const g = GOEDEREN[good];
    const [lo, hi] = g.hoeveelheid;
    const aantal = lo + (hash32(s + i * 977) % (hi - lo + 1));   // ton voor kg-goederen, anders stuks
    const hoeveelheid = GOODS[good].unit === 'kg' ? aantal * 1000 : aantal;
    const km = Math.round(clamp(getal(rit.lengte) / 1000, 0, KM_MAX) * 100) / 100;
    uit.push({
      id: leveringId(seed, rit.van, rit.naar, good),
      overtocht: rit.id, van: rit.van, naar: rit.naar,
      good, hoeveelheid, eenheid: GOODS[good].unit,
      klantVan: KADEKLANTEN[rit.van].klant, klantNaar: KADEKLANTEN[rit.naar].klant,
      afstandKm: km, tariefPerKm: g.tariefPerKm,
      toeslag: Math.round(g.toeslag * (1 + ERVAREN_TOESLAG * (lvl - 1))),
      laadSeconden: g.laad, losSeconden: g.los,
    });
  }
  return uit;
}

// Het bruto loon van een contract: afstand x tarief + toeslag, afgerond en nooit negatief. Rare invoer geeft 0 of een begrensd bedrag.
export function contractLoon(c) {
  if (!c || typeof c !== 'object') return 0;
  const km = clamp(getal(c.afstandKm), 0, KM_MAX);
  return Math.max(0, Math.round(km * Math.max(0, getal(c.tariefPerKm)) + Math.max(0, getal(c.toeslag))));
}

// De kosten van één overtocht: brandstof en kadegeld, in hele euro's en nooit negatief.
export function overtochtKosten(afstandKm) {
  const km = clamp(getal(afstandKm), 0, KM_MAX);
  const brandstof = Math.max(0, Math.round((START_LITER + km * VERBRUIK_L_PER_KM) * DIESEL_PRIJS));
  return { brandstof, kadegeld: KADEGELD, totaal: brandstof + KADEGELD };
}

// Wat er na de kosten overblijft (nooit onder nul).
export function nettoLoon(c) {
  return Math.max(0, contractLoon(c) - overtochtKosten(c && c.afstandKm).totaal);
}

const tijd = (v) => clamp(Math.round(getal(v)), 0, TIJD_MAX);
export const laadTijd = (c) => tijd(c && c.laadSeconden);
export const losTijd = (c) => tijd(c && c.losSeconden);

// Een contract uit een onbekende bron (een bericht, een oude save): een bekend contract of null. Alles wat de regels nodig hebben wordt gecontroleerd.
export function leesContract(raw) {
  if (!raw || typeof raw !== 'object') return null;
  if (!kadeById(raw.van) || !kadeById(raw.naar) || raw.van === raw.naar || !isGood(raw.good) || !GOEDEREN[raw.good]) return null;
  if (!overtochtById(`${raw.van}-${raw.naar}`)) return null;
  const hoeveelheid = Math.max(1, Math.min(1e6, Math.floor(getal(raw.hoeveelheid))));
  return {
    id: typeof raw.id === 'string' ? raw.id.slice(0, 60) : leveringId(0, raw.van, raw.naar, raw.good),
    overtocht: `${raw.van}-${raw.naar}`, van: raw.van, naar: raw.naar, good: raw.good, hoeveelheid, eenheid: GOODS[raw.good].unit,
    klantVan: KADEKLANTEN[raw.van].klant, klantNaar: KADEKLANTEN[raw.naar].klant,
    afstandKm: clamp(getal(raw.afstandKm), 0, KM_MAX), tariefPerKm: Math.max(0, getal(raw.tariefPerKm)), toeslag: Math.max(0, getal(raw.toeslag)),
    laadSeconden: tijd(raw.laadSeconden), losSeconden: tijd(raw.losSeconden),
  };
}

// De korte tekst voor het scherm: wat er geladen wordt, voor wie en tegen welk tarief.
export function contractTekst(c) {
  if (!c) return '';
  const g = GOEDEREN[c.good];
  const aantal = c.eenheid === 'kg' ? `${Math.round(c.hoeveelheid / 1000)} ton` : `${c.hoeveelheid}`;
  return `${aantal} ${g ? g.woord : c.good} voor ${c.klantNaar}, €${c.tariefPerKm} per km`;
}

// De uitslag van een overtocht met contract: het loon is het netto contractloon (afstand x tarief + toeslag - brandstof en kadegeld) plus een kleine
// premie voor tijd over en min wat er aan de kade te hard ging; de fooi, de tekst en het mislukken komen uit binnenvaartrules.js. Zonder contract
// blijft het de gewone uitslag van de overtocht.
export const TIJDPREMIE_MAX = 30;
export function leveringUitslag(contract, s) {
  const r = uitslagVan(s);
  if (r.failed || !contract) return r;
  const opTijd = Math.max(0, 1 - s.t / Math.max(1, s.budget));
  const base = Math.max(0, nettoLoon(contract) + Math.round(opTijd * TIJDPREMIE_MAX) - Math.round(s.tehard * 4));
  return { ...r, base, kosten: overtochtKosten(contract.afstandKm), bruto: contractLoon(contract), text: `${r.text} ${contractTekst(contract)}.` };
}
