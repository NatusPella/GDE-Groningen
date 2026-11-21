// De poort van Bezit (epic #1095, #1099): wanneer welke tak openstaat. Besluit van de eigenaar (21-11): ontgrendelen per akte; akte 2 geeft de
// boerderij (tak Percelen), akte 3 panden en ondernemen (tak Bedrijven). Dit bestand is bewust een dunne interface: de gedeelde ontgrendelpoort
// van de verhaal-epic (data-gedreven, per akte; nieuwe saves dicht, bestaande saves houden alles) sluit erop aan met setUnlockGate. Tot die er is
// geldt de stubpoort: open voor wie al een boerderij of bezit heeft, anders vanaf de akte uit ACT_OF (huidige akte uit currentAct).
// Puur: geen DOM, geen opslag, geen klok (scripts/bezitgate_test.mjs).

// tak -> { feature: id voor de gedeelde poort, act: vanaf welke akte (1 tot 5) }
export const BEZIT_BRANCHES = {
  land: { feature: 'bezit-land', act: 2, label: 'Land' },
  business: { feature: 'bezit-bedrijven', act: 3, label: 'Bedrijven' },
};
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
  if (legacy()) return true;
  const a = Number(currentAct());
  return Number.isFinite(a) && a >= b.act;
};

export const branchOpen = (branch) => !BEZIT_BRANCHES[branch] || !!gate(BEZIT_BRANCHES[branch].feature);

// De tekst voor een dichte tak (Nederlands, voor het menu): waarom en wanneer hij opengaat.
export function branchClosedText(branch) {
  const b = BEZIT_BRANCHES[branch];
  if (!b) return '';
  return `${b.label} gaat open in akte ${b.act} van het verhaal.`;
}

// Hoeveel takken staan open (het menu laat een dichte tak zien met het slotje en de reden, nooit een leeg scherm).
export const openBranches = () => BEZIT_BRANCH_IDS.filter(branchOpen);
