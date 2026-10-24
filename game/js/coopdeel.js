// Samen spelen (#448): verrekening. Wat iemand verdient, gaat meteen naar zijn eigen save: een gast via de gewone
// schrijfweg van savegame.js (saveGuestEarnings, elke frame met iets te bewaren) en de gastheer via een seintje aan
// de autosave, zodat een sessie die wegvalt of crasht nooit een uitbetaling kost. Bij het einde van de sessie volgt
// de laatste verrekening; mislukt dat schrijven, dan blijft het bedrag staan en telt het bij de volgende opslagbeurt
// alsnog mee. Alleen een seintje en een schrijfbeurt: geen eigen opslag, geen netwerk, geen DOM.
import { saveGame, markDirty } from './savehook.js';

// Na een uitbetaling: de autosave van deze speler is over een paar seconden aan de beurt (savegame.js, SAVE_DEBOUNCE),
// niet pas bij het checkpoint van een minuut. Ook zonder gasten: de gastheer verdient in zijn eigen wereld en wil dat
// net zo goed veilig hebben. Geeft true als er een seintje gegeven is.
export function verrekenBeloning(world, bedrag = 0) {
  if (!world || !world.coopRole) return false;
  if (!(Math.floor(Number(bedrag)) > 0)) return false;
  markDirty();
  return true;
}

// Het einde van de sessie: nog een laatste keer de eigen save, met de beloningen en hun ids erin. Geeft terug wat de
// schrijfweg zegt (false als er niets te bewaren was of als het schrijven mislukte); de vorige save staat er dan nog.
export function verrekenEinde(world) {
  if (!world || !world.coopRole) return false;
  try { return saveGame(world, { toast: false }) === true; } catch (e) { return false; }
}
