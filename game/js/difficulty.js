// #800 (voorstel, nog niet aangesloten): één bron voor drie moeilijkheidsstanden.
// Puur; de integratie in missies/activiteiten en de opslag volgen later. De
// standaardstand is exact het huidige gedrag, zodat aansluiten niets verandert.
import { assistFactors } from './assist.js';

export const DIFFICULTY_MODES = ['ontspannen', 'standaard', 'uitdagend'];
export const DIFFICULTY_DEFAULT = 'standaard';

// time: vermenigvuldigt elke tijdslimiet/venster.
// target: vermenigvuldigt een medaille-/doeldrempel; bij 'lager is beter' (tijd,
// slagen) betekent groter makkelijker, bij 'hoger is beter' (punten) delen we.
export const DIFFICULTY = {
  ontspannen: { label: 'Ontspannen', time: 1.35, target: 1.25, damage: 0.85 },
  standaard: { label: 'Standaard', time: 1, target: 1, damage: 1 },
  uitdagend: { label: 'Uitdagend', time: 0.85, target: 0.8, damage: 1.1 },
};

export function cleanDifficulty(mode) {
  return DIFFICULTY_MODES.includes(mode) ? mode : DIFFICULTY_DEFAULT;
}

export function difficultyFactors(mode) {
  return { ...DIFFICULTY[cleanDifficulty(mode)] };
}

// Tijdslimiet/venster; null/Infinity/0 (geen limiet) blijven zoals ze zijn.
export function scaleTimeLimit(secs, mode) {
  if (!Number.isFinite(secs) || !(secs > 0)) return secs;
  return Math.round(secs * difficultyFactors(mode).time);
}

// Een medailledrempel of doelwaarde. lowerBetter: tijd, slagen, afstand.
export function scaleTarget(value, mode, lowerBetter = true) {
  if (!Number.isFinite(value)) return value;
  const f = difficultyFactors(mode).target;
  return lowerBetter ? value * f : value / f;
}

// Een record-/medaillesleutel per stand. Standaard houdt de bestaande sleutel,
// zodat bestaande records niet verdwijnen; de andere standen krijgen een prefix.
export function difficultyRecordKey(mode, id) {
  const m = cleanDifficulty(mode);
  return m === DIFFICULTY_DEFAULT ? String(id) : `difficulty:${m}:${id}`;
}

// Hulp (#215) stapelt op de moeilijkheidsstand: meer tijd blijft meer tijd.
export function combinedTimeFactor(mode, settings = {}) {
  return difficultyFactors(mode).time * assistFactors(settings).time;
}
