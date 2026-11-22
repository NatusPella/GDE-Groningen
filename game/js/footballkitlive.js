// Het clubtenue aan en uit rond een wedstrijd, training of penaltyserie (22-11, docs/VOETBALKLEDING-22-11.md). De live-laag: leest het carrièreprofiel (voetbalcarrierelive.js)
// en zet de tijdelijke override uit footballkit.js. De eigen outfit blijft onaangeraakt; kitOff() is veilig om altijd aan te roepen (ook bij een gestopte of gecrashte wedstrijd).
// Zonder carrière (kennismaking, straatvoetbal) krijgt de speler een neutrale trainingsset.
import * as CL from './voetbalcarrierelive.js';
import * as VK from './footballkit.js';
import { storyLookKey } from './clothing.js';

let on = false, introAan = false;
export const kitIsActive = () => on;
export const gateKitOn = () => introAan;

// mode: 'wedstrijd' | 'training' | 'intro'; kind: 'league' | 'cup' | 'europe' (de Waddenbeker is topniveau)
export function kitOn(w, { mode = 'wedstrijd', kind = 'league', neutraal = false } = {}) {
  try {
    const c = !neutraal && CL.hasCareer() ? CL.getCareer() : null;
    if (c) CL.kitSync(w);   // het niveau van nu: promotie of degradatie geeft de stukken in de kast
    const club = c ? CL.getClub(c.club) : null;
    VK.applyKit(c ? CL.getCareer() : null, club, { mode, kind });
    on = true;
    introAan = mode === 'intro';
    return true;
  } catch (e) { return false; }   // een tenue mag een wedstrijd nooit stoppen
}
export function kitOff() {
  on = false; introAan = false;
  try { return VK.clearKit(); } catch (e) { return false; }
}

// Bij de poort van het sportpark (voetbal.js): het trainingspak van je club zolang je er rondloopt; weg bij de poort, weer terug in je eigen kleren.
// Niet als het verhaal je kleding bepaalt en niet tijdens een wedstrijd of training (dan is on al waar zonder intro).
export function gateKit(w, nearGate, busy = false) {
  if (!VK.kitIsOn()) { on = false; introAan = false; }   // een save laden midden in een wedstrijd haalt het tenue weg (resetClothing): de vlaggen volgen de echte stand
  if (nearGate && !busy && !storyLookKey() && CL.hasCareer()) { if (!on) kitOn(w, { mode: 'intro' }); return introAan; }
  if (introAan) kitOff();
  return false;
}
