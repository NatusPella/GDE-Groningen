// De positieve hefbomen van de snackwagen (epic #1095, #1102): waarmee je het opneemt tegen Jelle's trucs met bureaucratie, omkoping, prijsdrukken en sabotage (rival.js).
// Tammo en Tessa winnen met oprechte interesse, behulpzaamheid en liefde: klanttevredenheid (uit menu, voorraad en wachttijd), vaste klanten per standplaats, hulp aan de buurt
// (een gratis portie voor het buurthuis, een schoonmaakdag, een buurtavond), goodwill en bondgenoten (buurten en dorpen die je eerder hielpen en je steunen bij een vergunningsgeschil).
// Puur: geen DOM, geen klok, geen opslag, geen Math.random (scripts/goodwill_test.mjs). De toestand (gw) zit in snackvan.js S.gw, dus in bezit.x.snack: per speler (#429).

import { clamp, finite } from './bezithash.js';
import { spotDef } from './pitch.js';

export const NATURAL_LOYAL_CAP = 40;           // zonder hulp aan de buurt worden vaste klanten nooit meer dan 40 punten
export const LOYAL_PER_HELP = 10;              // elke hulpactie op een plek tilt het plafond van de vaste klanten daar 10 punten
export const GOODWILL_DECAY = 0.4;             // goodwill zakt 0,4 per speldag: de buurt vergeet het als je ophoudt
export const ALLY_AFTER = 3;                   // na drie hulpacties in een gebied is dat gebied een bondgenoot

// De hulpacties: wat ze kosten, wat ze opleveren (goodwill, vaste klanten op die plek), hoeveel dagen rust er tussen twee keer op dezelfde plek zit.
export const HELP = {
  buurthuis: { label: 'Gratis portie voor het buurthuis', cost: 250, goodwill: 6, loyal: 8, cd: 5, text: 'Het buurthuis eet gratis friet. De buurt praat er een week over.' },
  schoonmaak: { label: 'Schoonmaakdag op het plein', cost: 150, goodwill: 4, loyal: 4, cd: 4, text: 'Je ruimt samen met de buurt het plein op. Handen vol, hart vol.' },
  avond: { label: 'Buurtavond met muziek', cost: 600, goodwill: 10, loyal: 10, cd: 10, text: 'Een avond met muziek en snacks voor iedereen. De buurt is je dankbaar.' },
};
export const HELP_IDS = Object.keys(HELP);
// Bondgenoten per gebied (verzonnen verenigingen, nooit een echte persoon of instantie).
export const ALLY_NAMES = { stad: 'Buurtvereniging Binnenstad', noord: 'Dorpsbelang Hogeland en Lauwerskust', west: 'Dorpsbelang Westerkwartier', oost: 'Ondernemersclub Oost-Groningen', zuid: 'Buurthuis Haren' };

export const newGw = () => ({ sat: 60, goodwill: 0, loyal: {}, helped: {}, helps: {}, allies: [], cd: {}, work: {}, disputes: { won: 0, lost: 0, bribesFailed: 0 } });
export function normalizeGw(raw) {
  const g = newGw();
  if (!raw || typeof raw !== 'object') return g;
  g.sat = Math.round(clamp(finite(raw.sat, 60), 0, 100) * 10) / 10;
  g.goodwill = Math.round(clamp(finite(raw.goodwill, 0), 0, 100) * 10) / 10;
  const per = (src, lo, hi, into, ok) => { for (const k of Object.keys(src && typeof src === 'object' ? src : {}).slice(0, 40)) if (ok(k)) into[k] = Math.round(clamp(finite(src[k], 0), lo, hi) * 10) / 10; };
  per(raw.loyal, 0, 100, g.loyal, (k) => !!spotDef(k));
  per(raw.helped, 0, 50, g.helped, (k) => !!spotDef(k));
  per(raw.helps, 0, 50, g.helps, (k) => k in ALLY_NAMES);
  per(raw.cd, 0, 1e7, g.cd, (k) => /^[a-z]{3,12}:[a-z]{2,12}$/.test(k));
  per(raw.work, 0, 1e7, g.work, (k) => !!spotDef(k));
  g.allies = [...new Set((Array.isArray(raw.allies) ? raw.allies : []).filter((a) => a in ALLY_NAMES))];
  const d = raw.disputes && typeof raw.disputes === 'object' ? raw.disputes : {};
  for (const k of ['won', 'lost', 'bribesFailed']) g.disputes[k] = Math.round(clamp(finite(d[k], 0), 0, 1e6));
  return g;
}

// ---- klanttevredenheid ----
// Per wagen en dag (0 tot 100) uit wat de klant merkt: voorraad (zonder voorraad zwaar slecht), wachttijd (gemiste klanten door een lange rij), het menu (variatie, koeling, eigen keten)
// en de prijs (te hoog kost, wat lager helpt een beetje). r: { stocked, demand, unserved }, o: { menuLen, koeling, localAppeal, pr }.
export function satisfactionOf(r, o = {}) {
  let s = 72;
  if (!r.stocked) s -= 40;
  const wait = r.demand > 0 ? finite(r.unserved, 0) / r.demand : 0;
  s -= Math.min(30, wait * 80);
  s += Math.min(8, Math.max(0, finite(o.menuLen, 4) - 4) * 3) + (o.koeling ? 4 : 0) + (finite(o.localAppeal, 1) > 1 ? 4 : 0);
  const pr = finite(o.pr, 1);
  s += pr > 1 ? -(pr - 1) * 50 : (1 - pr) * 20;
  return Math.round(clamp(s, 0, 100));
}
export const satFactor = (sat) => Math.round((0.9 + 0.2 * clamp(finite(sat, 60), 0, 100) / 100) * 1000) / 1000;          // 0,9 tot 1,1 op de vraag
export const loyalFactor = (loyal) => Math.round((1 + 0.15 * clamp(finite(loyal, 0), 0, 100) / 100) * 1000) / 1000;      // tot 15% extra vraag op die plek
export const loyalCap = (gw, spot) => Math.min(100, NATURAL_LOYAL_CAP + LOYAL_PER_HELP * finite(gw.helped[spot], 0));
// Wat vaste klanten doen tegen prijsdrukken: het verlies door een prijzenoorlog schaalt met 1 min 60% van je vaste klanten op die plek (zie snackvan.warEffect).
export const warShield = (loyal) => Math.round((1 - 0.6 * clamp(finite(loyal, 0), 0, 100) / 100) * 1000) / 1000;

// Een dag: results [{ spot, sat, closed }] van de wagens die gedraaid hebben. De tevredenheid is een lopend gemiddelde (10% per dag), de vaste klanten groeien 1,2 per dag bij
// tevredenheid vanaf 60 (anders zakken ze 0,6) tot hun plafond, goodwill zakt 0,4 per dag. Past gw aan en geeft hem terug.
export function stepGw(gw, results) {
  const ran = (results || []).filter((r) => r && !r.closed);
  if (ran.length) gw.sat = Math.round((0.9 * gw.sat + 0.1 * (ran.reduce((a, r) => a + r.sat, 0) / ran.length)) * 10) / 10;
  for (const r of ran) {
    const cap = loyalCap(gw, r.spot), l = finite(gw.loyal[r.spot], 0);
    gw.loyal[r.spot] = Math.round(clamp(r.sat >= 60 ? Math.min(cap, l + 1.2) : l - 0.6, 0, 100) * 10) / 10;
  }
  gw.goodwill = Math.round(Math.max(0, gw.goodwill - GOODWILL_DECAY) * 10) / 10;
  return gw;
}

// Hulp aan de buurt op een plek waar je wagen staat of een vergunning geldt. cluster: het gebied van de plek (pitch.js). Geeft { ok, cost, text, ally? } of { ok: false, why }.
// Verandert gw alleen bij ok. Per soort en plek is er rust (cd dagen); de derde keer in een gebied maakt dat gebied een bondgenoot.
export function helpNeighbourhood(gw, spot, cluster, kind, day, money) {
  const h = HELP[kind], d = Math.floor(finite(day, 0));
  if (!h || !spotDef(spot)) return { ok: false, why: 'onbekend' };
  const key = `${kind}:${spot}`;
  if (d - finite(gw.cd[key], -1e9) < h.cd) return { ok: false, why: 'te-snel', wait: Math.ceil(h.cd - (d - gw.cd[key])) };
  if (!(finite(money, 0) >= h.cost)) return { ok: false, why: 'te-weinig-geld', tekort: Math.round(h.cost - finite(money, 0)) };
  gw.cd[key] = d;
  gw.goodwill = Math.round(clamp(gw.goodwill + h.goodwill, 0, 100) * 10) / 10;
  gw.helped[spot] = finite(gw.helped[spot], 0) + 1;
  gw.loyal[spot] = Math.round(clamp(finite(gw.loyal[spot], 0) + h.loyal, 0, loyalCap(gw, spot)) * 10) / 10;
  gw.helps[cluster] = finite(gw.helps[cluster], 0) + 1;
  let ally = null;
  if (cluster in ALLY_NAMES && gw.helps[cluster] >= ALLY_AFTER && !gw.allies.includes(cluster)) { gw.allies.push(cluster); ally = ALLY_NAMES[cluster]; }
  return { ok: true, cost: h.cost, text: h.text + (ally ? ` ${ally} staat voortaan achter je.` : ''), ally };
}
