// De dunne poort van de voetbalcarrière (#1112, epic #1106): vraagt de gedeelde ontgrendelpoort (unlockgate.js, #1131) of de wereld 'voetbal' open is.
// Besluit eigenaar 21-11: ontgrendelen per akte (akte 2 boerderij, 3 panden, 4 voetbal en regio); de voetbalcarrière start dus in akte 4. De bestaande Euroborg-wedstrijd en de
// penaltyserie blijven altijd los speelbaar; alleen de carrière wacht. Puur: geen DOM, geen wereld (scripts/voetbal_beats_test.mjs). `zetPoort` blijft voor tests.
import { worldOpen as gateWorldOpen, gateHint as gateGateHint, progressFrom as gateProgressFrom } from './unlockgate.js';

const VOETBAL_WORLD = 'voetbal';
export { PART_ORDER } from './unlockgate.js';

const defaultGate = { worldOpen: gateWorldOpen, gateHint: gateGateHint };
let gate = defaultGate;
export function zetPoort(p) { gate = p && typeof p.worldOpen === 'function' ? { worldOpen: p.worldOpen, gateHint: p.gateHint || gateGateHint } : defaultGate; }
export const voetbalOpen = (progress = {}) => !!gate.worldOpen(VOETBAL_WORLD, progress);
export const voetbalHint = (progress = {}) => gate.gateHint(VOETBAL_WORLD, progress);

// De stand die de poort nodig heeft (zelfde vorm als in unlockgate.js): de akte van de huidige stap, of het verhaal uit is, en het gate-veld van de wereld.
export const progressFrom = gateProgressFrom;
