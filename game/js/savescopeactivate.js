// Boot: de werksleutels van de voortgang gaan naar de save die opent (savescope.js). Draait vóór elke module die
// zijn opslag leest (main.js importeert dit direct na storagekeys.js). Alleen in een browser met localStorage.
import './oudmigratie.js'; // de eerste-versie-migratie schrijft de save voordat we de lijst lezen
import { pickLatest, listSlots } from './saveslots.js';
import { activateScope, readOwner } from './savescope.js';

try {
  if (typeof localStorage !== 'undefined') {
    const want = pickLatest(null);
    if (want >= 1) {
      // de gedeelde inhoud van voor deze wijziging hoort bij de laatst bewaarde save, ook als het nieuwe spel er nu naast komt
      let legacy = 0;
      if (readOwner(localStorage) == null) {
        const best = listSlots(null).filter((x) => x.summary).sort((a, b) => b.summary.savedAt - a.summary.savedAt)[0];
        legacy = best ? best.n : want; // geen save: het nieuwe spel neemt de gedeelde inhoud over (niets blijft onder 0 liggen)
      }
      const wissel = activateScope(localStorage, want, legacy);
      if (wissel && wissel.failed) console.warn('save-voortgang: wisselen is niet gelukt (opslag vol of geblokkeerd); de bewaarde voortgang blijft zoals hij was');
    }
  }
} catch (e) { console.warn('save-voortgang: wisselen mislukt', e); }
