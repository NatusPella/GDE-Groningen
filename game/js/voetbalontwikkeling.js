// Ontwikkeling van de speler in de voetbalcarrière (#1109, epic #1106, docs/VOETBAL-CARRIERE-21-11.md hoofdstuk 5): puur, geen DOM (scripts/voetbal_ontwikkeling_test.mjs).
// Ervaring uit wedstrijden en training voedt de vijf vaardigheden; de winst neemt af naar het plafond (potentieel), hooguit 4 punten per vaardigheid per seizoensfase. Vorm (0,92 tot 1,08),
// vermoeidheid (0 tot 100) en blessures horen erbij. Blessures zijn nooit getoond (geen beeld, geen woord als "gebroken"), uit te zetten en nooit blijvend: hooguit 3 speldagen rust.
import { ATTRS, attrCap, clampAttr } from './voetbalspelers.js';
import { hashSeed } from './voetbalspelers.js';
import { makeRng } from './minigamekit.js';

export const PHASE_CAP = 4;                 // hooguit 4 punten per vaardigheid per seizoensfase (een seizoen heeft er twee)
export const SIM_XP = 0.6;                  // een uitgerekende wedstrijd geeft 60% van de ervaring
export const MATE_RATE = 0.6;               // de computerteamgenoot groeit op 60% van de snelheid van de speler
export const FATIGUE = { match: 35, training: 15, perDay: 35, tiredAt: 75, riskAt: 80, max: 100 };
export const FORM_MIN = 0.92, FORM_MAX = 1.08;
export const MAX_INJURY_DAYS = 3;
export const TRAIN_FOCI = ATTRS.slice();
export const FOCUS_NAMES = { pace: 'Sprintparcours', shot: 'Schieten op doel', pass: 'Passen door hoepels', stamina: 'Conditieloop', defend: 'Een tegen een dekken' };
const RATE = 0.9;                           // punten per ervaringspunt bij een vlak begin

const empty = () => ({ pace: 0, shot: 0, pass: 0, stamina: 0, defend: 0 });
// De ervaring van een wedstrijd uit de statistiek van de speler: doelpunt en schot voeden schot, assists en passes pass, tackles verdedigen, minuten uithouding, sprints tempo.
export function matchXp({ goals = 0, shots = 0, assists = 0, passes = 0, tackles = 0, minutes = 0, sprints = 0 } = {}, simulated = false) {
  const x = empty();
  x.shot = goals * 1.2 + shots * 0.35;
  x.pass = assists * 1.0 + passes * 0.06;
  x.defend = tackles * 0.5;
  x.stamina = Math.min(2.5, minutes / 4);
  x.pace = Math.min(2, sprints * 0.1);
  const f = simulated ? SIM_XP : 1;
  for (const k of ATTRS) x[k] = Math.round(x[k] * f * 100) / 100;
  return x;
}
// Een uitgerekende wedstrijd heeft geen statistiek: een vaste, kleine ervaring naar rol en uitslag.
export function simulatedXp(role, result) {
  const w = result === 'winst' ? 1 : result === 'gelijk' ? 0.8 : 0.6;
  const base = { pace: 0.6, shot: role === 'aanvaller' ? 1.4 : 0.5, pass: role === 'middenvelder' ? 1.4 : 0.7, stamina: 1.6, defend: role === 'verdediger' || role === 'keeper' ? 1.4 : 0.5 };
  const o = empty();
  for (const k of ATTRS) o[k] = Math.round(base[k] * w * SIM_XP * 100) / 100;
  return o;
}
// De ervaring toepassen: `prog` (kommagetallen per vaardigheid) bouwt op tot hele punten; `phase` telt wat deze fase al groeide (het plafond van 4). Het resultaat is een nieuwe speler en nieuwe tellers.
export function applyXp(player, xp, prog = empty(), phase = empty(), mult = 1) {
  const p = JSON.parse(JSON.stringify(player));
  const np = { ...empty(), ...prog }, nf = { ...empty(), ...phase };
  const gains = [];
  for (const k of ATTRS) {
    const cap = attrCap(p, k);
    const have = p.attrs[k];
    if (have >= cap) continue;
    const slow = Math.max(0.15, 1 - (have / cap) ** 3);          // dicht bij het plafond groei je zelden
    np[k] += (xp[k] || 0) * RATE * mult * slow * 0.2;
    while (np[k] >= 1 && p.attrs[k] < cap && nf[k] < PHASE_CAP) { np[k] -= 1; nf[k] += 1; p.attrs[k] = clampAttr(p.attrs[k] + 1); gains.push(k); }
    if (nf[k] >= PHASE_CAP) np[k] = Math.min(np[k], 0.99);        // het plafond van de fase: de rest vervalt
  }
  return { player: p, prog: np, phase: nf, gains };
}
export const resetPhase = () => empty();

// Een training: de focus is een vaardigheid; `score` (0,5 tot 1,5) komt uit de minigame, zonder minigame is de winst een kleine vaste (score 0,8). Eén training per speldag; een wedstrijd telt als de training van die dag.
export function trainingXp(focus, score = 0.8) {
  const o = empty();
  if (!ATTRS.includes(focus)) return o;
  const s = Math.min(1.5, Math.max(0.5, Number.isFinite(score) ? score : 0.8));
  o[focus] = Math.round(5 * s * 100) / 100;
  return o;
}
export const canTrain = (c, relDay) => (c.trainedDay | 0) !== relDay && !c.injury && (c.matchDay | 0) !== relDay;

// Vorm: het gemiddelde van de laatste vijf wedstrijden (uitslag 60%, eigen prestatie 40%) naar 0,92 tot 1,08. Een lege lijst is neutraal.
export function formFactor(history) {
  const h = (Array.isArray(history) ? history : []).slice(-5);
  if (!h.length) return 1;
  const s = h.reduce((a, x) => a + (x.r === 'W' ? 1 : x.r === 'D' ? 0.5 : 0) * 0.6 + Math.min(1, Math.max(0, Number(x.perf) || 0)) * 0.4, 0) / h.length;
  return Math.round((FORM_MIN + s * (FORM_MAX - FORM_MIN)) * 1000) / 1000;
}
export const formArrow = (f) => (f >= 1.04 ? 'stijgend' : f <= 0.96 ? 'dalend' : 'stabiel');
export const formIcon = (f) => (f >= 1.04 ? '↑' : f <= 0.96 ? '↓' : '→');
export const pushHistory = (history, entry) => [...(Array.isArray(history) ? history : []), { r: entry.r, perf: Math.round(Math.min(1, Math.max(0, entry.perf)) * 100) / 100 }].slice(-5);
// De prestatie van een speler in een wedstrijd (0 tot 1): doelpunten en assists tellen mee, een wedstrijd zonder bijdrage is middelmatig.
export const performance = ({ goals = 0, assists = 0, tackles = 0, saves = 0 } = {}) => Math.min(1, 0.35 + goals * 0.25 + assists * 0.15 + tackles * 0.05 + saves * 0.05);

// Vermoeidheid: een wedstrijd 35, een training 15, herstel 35 per speldag. Onder energie 25 (vermoeidheid 75 en hoger) speel je op 90% tempo en uithouding.
export const addFatigue = (f, amount) => Math.min(FATIGUE.max, Math.max(0, (Number(f) || 0) + amount));
export const reduceFatigue = (f, days = 1) => Math.max(0, (Number(f) || 0) - FATIGUE.perDay * Math.max(0, days));
export const isTired = (f) => f >= FATIGUE.tiredAt;
export const energy = (f) => Math.max(0, 100 - f);

// Blessures, met zorg: alleen een rustige melding en alleen kans bij overbelasting (vermoeidheid 80+) terwijl je toch speelt. Deterministisch uit het zaad; de fysio van de club vermindert de kans.
// Nooit getoond (geen beeld, geen animatie), nooit blijvend (hooguit 3 speldagen), uit te zetten in Instellingen > Spel (`enabled`).
export const INJURY_TEXTS = ['Je kuit is moe', 'Je enkel wil rust', 'Je bovenbeen is stijf', 'Je rug is moe'];
export function rollInjury({ seed = 1, day = 0, fatigue = 0, enabled = true, physio = false } = {}) {
  if (!enabled || fatigue < FATIGUE.riskAt) return null;
  const rng = makeRng(hashSeed('injury', seed, day));
  const chance = (0.12 + (fatigue - FATIGUE.riskAt) * 0.01) * (physio ? 0.5 : 1);
  if (rng() >= chance) return null;
  const days = 1 + Math.floor(rng() * MAX_INJURY_DAYS);
  const text = INJURY_TEXTS[Math.floor(rng() * INJURY_TEXTS.length)];
  return { days, text: `${text}; rust ${days} speldag${days === 1 ? '' : 'en'}` };
}
// Een speldag verder voor een blessure: null zodra hij voorbij is.
export const tickInjury = (inj, days = 1) => (inj && inj.days - days > 0 ? { ...inj, days: inj.days - days } : null);
export const FORBIDDEN_INJURY_WORDS = ['gebroken', 'breuk', 'bloed', 'scheur', 'kruisband', 'ziekenhuis', 'operatie', 'pijn'];
