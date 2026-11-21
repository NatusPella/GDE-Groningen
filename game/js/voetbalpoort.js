// De dunne poort van de voetbalcarrière (#1112, epic #1106): vraagt de gedeelde ontgrendelpoort (unlockgate.js, #1131 van de verhaal-epic, branch epic-verhaal-21-11) of de wereld 'voetbal' open is.
// Besluit eigenaar 21-11: ontgrendelen per akte (akte 2 boerderij, 3 panden, 4 voetbal en regio); de voetbalcarrière start dus in akte 4. De bestaande Euroborg-wedstrijd en de
// penaltyserie blijven altijd los speelbaar; alleen de carrière wacht. Tot unlockgate.js op deze tak is gemerged, geldt hieronder een stub met DEZELFDE vorm (worldOpen(id, progress), gateHint(id, progress)):
// bij de merge vervangt `zetPoort({ worldOpen, gateHint })` (of een import) de stub en vervalt de stub. Puur: geen DOM, geen wereld (scripts/voetbal_beats_test.mjs).
export const VOETBAL_WORLD = 'voetbal';
export const PART_ORDER = ['kop', 'romp', 'staart', 'zuid', 'ontzet', 'nazomer'];
const NEEDS_PART = 'zuid';                       // akte 4

const stubOpen = (id, progress = {}) => {
  if (id !== VOETBAL_WORLD) return true;
  if (progress.dev) return true;
  const g = progress.gate;
  if (!g || typeof g !== 'object' || g.v !== 1 || !Array.isArray(g.open) || g.legacy === true) return true;     // een bestaande save houdt alles
  if (progress.ended) return true;
  if (g.open.includes(id)) return true;
  if (typeof progress.begun === 'function' && progress.begun(id)) return true;
  return !!progress.partNow && PART_ORDER.indexOf(progress.partNow) >= PART_ORDER.indexOf(NEEDS_PART);
};
const stubHint = (id, progress = {}) => (stubOpen(id, progress) ? null : 'In Veendam speelt Tessa met het dorpsteam. Daar begint de voetbalcarrière.');

let gate = { worldOpen: stubOpen, gateHint: stubHint };
// Bij de merge: zetPoort({ worldOpen, gateHint }) uit unlockgate.js.
export function zetPoort(p) { gate = p && typeof p.worldOpen === 'function' ? { worldOpen: p.worldOpen, gateHint: p.gateHint || stubHint } : { worldOpen: stubOpen, gateHint: stubHint }; }
export const voetbalOpen = (progress = {}) => !!gate.worldOpen(VOETBAL_WORLD, progress);
export const voetbalHint = (progress = {}) => gate.gateHint(VOETBAL_WORLD, progress);
