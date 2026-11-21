// De regels van de penaltyserie in de Euroborg (#981, Voetbal Sim Light): puur, geen DOM en geen THREE (scripts/penalty_test.mjs).
// Vijf penalty's op het doel van de verzonnen club FC Grunn-achtig. Je richt in het vlak van het doel (u: -1 is de linkerpaal, 1 de rechterpaal; v: 0 is de grasmat,
// 1 de lat), houdt Spatie voor kracht en laat los. De keeper kiest een hoek en duikt; een keeper die de goede hoek raadt, houdt de bal meestal tegen. Wat telt is het aantal
// doelpunten van vijf. Geen geld in het spel zelf: de medaille en het record zijn de beloning, in Samen spelen betaalt de host per plek (multiplayerwedstrijd.js).
import { cleanDifficulty, scaleTarget } from './difficulty.js';

export const SCHOTEN = 5;                 // een serie
export const DOEL_BREEDTE = 7.32;         // m, tussen de palen
export const DOEL_HOOGTE = 2.44;          // m, de lat
export const PENALTY_AFSTAND = 11;        // m van de doellijn
export const U_MAX = 1.45;                // het richtkruis mag iets buiten de palen (dan mis je)
export const V_MAX = 1.35;                // en iets boven de lat
export const KRACHT_DOEL = 0.78;          // de kracht waarmee je het zuiverst schiet
export const LAAD_S = 1.15;               // zoveel seconden houd je Spatie voor volle kracht
const MEDAILLE_BIJ = [2, 3, 5];   // doelpunten voor brons, zilver, goud (bij Standaard)

// De uitkomsten van een schot en hun tekst; elke uitkomst heeft een woord, nooit alleen een kleur.
export const UITKOMSTEN = {
  goal: { tekst: 'GOAL!', goed: true },
  redding: { tekst: 'Gered door de keeper', goed: false },
  paal: { tekst: 'Tegen de paal', goed: false },
  lat: { tekst: 'Op de lat', goed: false },
  naast: { tekst: 'Naast', goed: false },
  over: { tekst: 'Over', goed: false },
};

// Per stand: hoe ver je schot kan afwijken en hoe vaak de keeper in jouw richting kijkt.
const STAND = {
  ontspannen: { spreiding: 0.07, leest: 0.15 },
  standaard: { spreiding: 0.12, leest: 0.28 },
  uitdagend: { spreiding: 0.18, leest: 0.42 },
};

const klem = (x, a, b) => Math.max(a, Math.min(b, x));

// De duikrichting van de keeper: -1 links, 0 blijft staan, 1 rechts (gezien vanaf de schutter). Met kans `leest` ziet hij waar je op richt, anders gokt hij
// (de bal in het midden gokt hij zelden, zoals een echte keeper). rng() geeft 0..1.
export function keeperKeuze(u, rng = Math.random, stand = 'standaard') {
  const s = STAND[cleanDifficulty(stand)];
  if (rng() < s.leest && Math.abs(u) > 0.18) return u < 0 ? -1 : 1;
  const r = rng();
  return r < 0.4 ? -1 : r < 0.8 ? 1 : 0;
}

// Hoe ver de keeper reikt op de hoogte v als hij in een hoek duikt of blijft staan (in dezelfde eenheid als u).
// Laag is zijn sterke kant; in de bovenhoek reikt hij maar half zover; een slap schot is makkelijk te houden.
export function keeperBereik(duik, v, kracht) {
  let reik = duik === 0 ? 0.5 : 0.56;
  if (v > 0.72) reik *= duik === 0 ? 0.65 : 0.55;
  if (kracht < 0.4) reik += 0.3;
  return reik;
}
export const keeperPlek = (duik) => duik * 0.62;

// Het schot: u en v zijn waar je op richtte, kracht (0..1) hoe hard. Geeft de uitkomst en waar de bal het vlak van het doel raakt.
// Te slap of te hard geeft meer spreiding; een schot buiten de palen of boven de lat is mis; de paal en de lat zijn raak maar tellen niet.
export function schiet({ u = 0, v = 0.5, kracht = KRACHT_DOEL, stand = 'standaard', rng = Math.random, duik = null } = {}) {
  const s = STAND[cleanDifficulty(stand)];
  const k = klem(kracht, 0, 1);
  const spreiding = s.spreiding + Math.abs(k - KRACHT_DOEL) * 0.9 + (k < 0.2 ? 0.2 : 0);
  const ru = klem(u, -U_MAX, U_MAX) + (rng() * 2 - 1) * spreiding;
  const rv = Math.max(0.02, klem(v, 0, V_MAX) + (rng() * 2 - 1) * spreiding * 0.8);
  const kd = duik == null ? keeperKeuze(u, rng, stand) : duik;
  const uit = { u: ru, v: rv, duik: kd, kracht: k };
  const paal = Math.abs(Math.abs(ru) - 1) < 0.045 && rv <= 1.04;
  const lat = Math.abs(rv - 1) < 0.045 && Math.abs(ru) <= 1;
  if (paal) return { ...uit, uitkomst: 'paal' };
  if (lat) return { ...uit, uitkomst: 'lat' };
  if (Math.abs(ru) > 1) return { ...uit, uitkomst: 'naast' };
  if (rv > 1) return { ...uit, uitkomst: 'over' };
  if (Math.abs(ru - keeperPlek(kd)) <= keeperBereik(kd, rv, k)) return { ...uit, uitkomst: 'redding' };
  return { ...uit, uitkomst: 'goal' };
}

// De stand van een serie: elk schot een uitkomst of null (nog niet genomen).
export const nieuweSerie = () => ({ schoten: Array(SCHOTEN).fill(null) });
export function noteer(serie, uitkomst) {
  const i = serie.schoten.indexOf(null);
  if (i < 0) return false;
  serie.schoten[i] = uitkomst;
  return true;
}
export const doelpunten = (serie) => serie.schoten.filter((x) => x === 'goal').length;
export const genomen = (serie) => serie.schoten.filter((x) => x != null).length;
export const klaar = (serie) => genomen(serie) >= SCHOTEN;
// Zonder kans op een hoger aantal is een serie al beslist (voor de medaille is dat niet nodig; voor de HUD wel handig: nog zoveel te halen).
export const nogTeHalen = (serie) => doelpunten(serie) + (SCHOTEN - genomen(serie));

// Medaille: 0 geen, 1 brons, 2 zilver, 3 goud. De drempel schaalt met de stand (ruimer bij Ontspannen, strenger bij Uitdagend) en is nooit hoger dan het aantal schoten.
export const medailleBij = (stand = 'standaard') => MEDAILLE_BIJ.map((v) => klem(Math.round(scaleTarget(v, stand, false)), 1, SCHOTEN));
export function penaltyMedaille(goals, stand = 'standaard') {
  const at = medailleBij(stand);
  return goals >= at[2] ? 3 : goals >= at[1] ? 2 : goals >= at[0] ? 1 : 0;
}

export const goalsTekst = (n) => `${n} van ${SCHOTEN}`;
