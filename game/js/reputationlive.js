// De haken van de lichte reputatie (reputation.js, #1135) naar het spel: lezen en schrijven op de eigen opslag van deze speler.
// Per speler en per apparaat (een gast schrijft in zijn eigen spel, nooit in dat van de host), nooit in een savegame en nooit over het net.
// Een kapotte of ontbrekende opslag is geen fout: de reputatie blijft dan op nul.
import { loadReputation, saveReputation, noteService, noteHelp, reputationView } from './reputation.js';

let override = null;
export const setReputationStorage = (s) => { override = s; };           // voor tests
const store = () => {
  if (override) return override;
  try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch (e) { return null; }
};

export const currentReputation = () => loadReputation(store());
export const reputationNow = (spot = null) => reputationView(currentReputation(), spot);
export function recordService(info) { const st = store(); return saveReputation(st, noteService(loadReputation(st), info)); }
export function recordHelp(spot, size = 1) { const st = store(); return saveReputation(st, noteHelp(loadReputation(st), spot, size)); }
