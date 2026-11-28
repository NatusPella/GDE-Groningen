// De poort van Bezit (epic #1095, #1099): wanneer welke tak openstaat. Besluit van de eigenaar (21-11): ontgrendelen per akte; akte 2 geeft de
// boerderij (tak Percelen), akte 3 panden en ondernemen (tak Bedrijven). Dit bestand is bewust een dunne interface: de gedeelde ontgrendelpoort
// van de verhaal-epic (data-gedreven, per akte; nieuwe saves dicht, bestaande saves houden alles) sluit erop aan met setUnlockGate. Tot die er is
// geldt de stubpoort: open voor wie al een boerderij of bezit heeft, anders vanaf de akte uit ACT_OF (huidige akte uit currentAct).
// Puur: geen DOM, geen opslag, geen klok (scripts/bezitgate_test.mjs).

// tak -> { feature: id voor de gedeelde poort, act: vanaf welke akte (1 tot 5) }
export const BEZIT_BRANCHES = {
  land: { feature: 'bezit-land', act: 2, label: 'Land' },
  business: { feature: 'bezit-bedrijven', act: 3, label: 'Bedrijven' },
  snack: { feature: 'bezit-snack', act: 5, label: 'Snackwagen' },       // de eindgame: Snackimperium (#1102), pas in de late akte
};
// de akte (storyarc PARTS-sleutel) van elke tak: de speler leest de naam van het hoofdstuk, nooit een aktenummer (#912)
const BRANCH_PART = Object.fromEntries(Object.entries(BEZIT_BRANCHES).map(([k, v]) => [k, PART_ORDER[v.act - 1]]));
export const BEZIT_BRANCH_IDS = Object.keys(BEZIT_BRANCHES);

// Een poort is een functie (featureId) => boolean. De standaard (stub) zegt: open.
let gate = () => true;
export const setUnlockGate = (fn) => { gate = typeof fn === 'function' ? fn : () => true; };
export const resetUnlockGate = () => { gate = () => true; };

// Een poort op basis van de huidige akte (1 tot 5): open vanaf de akte van de tak. legacy() is true voor wie al bezit heeft
// (een bestaand profiel verliest niets).
export const makeActGate = (currentAct, legacy = () => false) => (feature) => {
  const b = Object.values(BEZIT_BRANCHES).find((x) => x.feature === feature);
  if (!b) return true;
  if (legacy() && b.feature !== 'bezit-snack') return true;       // een nieuwe eindgame: een bestaand profiel heeft hem niet al
  const a = Number(currentAct());
  return Number.isFinite(a) && a >= b.act;
};

export const branchOpen = (branch) => { if (branch === 'snack') ensureSnackGate(); return !BEZIT_BRANCHES[branch] || !!gate(BEZIT_BRANCHES[branch].feature); };

// De tekst voor een dichte tak (Nederlands, voor het menu): waarom en wanneer hij opengaat.
export function branchClosedText(branch) {
  const b = BEZIT_BRANCHES[branch];
  if (!b) return '';
  if (branch === 'snack') return `Dit onderdeel gaat open bij "${partName(BRANCH_PART[branch])}" in het verhaal.`;      // de snackwagen verklapt zijn naam niet voor de tijd (#1378)
  return `${b.label} gaat open bij "${partName(BRANCH_PART[branch])}" in het verhaal.`;
}

// Hoeveel takken staan open (het menu laat een dichte tak zien met het slotje en de reden, nooit een leeg scherm).
export const openBranches = () => BEZIT_BRANCH_IDS.filter(branchOpen);

// ---- aansluiting op de gedeelde ontgrendelpoort van de verhaal-epic (unlockgate.js, #1131) ----
// Percelen horen bij de wereld 'farm' (akte 2, Tessa), Bedrijven bij 'bezit' (akte 3, panden en ondernemen). De stand (progress) komt van de host:
// setGateProgress(() => progressFrom({ stepId, ended, gate, begun })). Zonder provider blijft de stubpoort van hierboven (open).
import { worldOpen, gateHint, registerGateWorld, gateWorld, PART_ORDER } from './unlockgate.js';
import { partName } from './storyarc.js';
export const GATE_WORLD = { land: 'farm', business: 'bezit', snack: 'snackwagen' };
// Tessa leidt de snackwagen in; akte 5 ('ontzet'). Bij elke vraag opnieuw gemeld als de registratie door een reset weg is (unlockgate.js resetGateRegistry).
const SNACK_GATE = { id: 'snackwagen', part: 'ontzet', by: 'Tessa', hint: 'Dit onderdeel komt pas laat in je zomer: speel het verhaal verder, dan gaat het vanzelf open.' };
const ensureSnackGate = () => { if (!gateWorld('snackwagen')) registerGateWorld(SNACK_GATE); };
ensureSnackGate();
let progressProvider = null;
export function setGateProgress(fn) {
  progressProvider = typeof fn === 'function' ? fn : null;
  if (!progressProvider) { resetUnlockGate(); return; }
  setUnlockGate((feature) => {
    const b = Object.entries(BEZIT_BRANCHES).find(([, v]) => v.feature === feature);
    return b ? worldOpen(GATE_WORLD[b[0]], progressProvider()) : true;
  });
}
// De zin van het personage dat de wereld inleidt, voor het menu van een dichte tak; anders de gewone tekst.
export function branchHint(branch) {
  const h = progressProvider && GATE_WORLD[branch] ? gateHint(GATE_WORLD[branch], progressProvider()) : null;
  return h || branchClosedText(branch);
}
