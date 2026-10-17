// The choice "Verhaal" in Instellingen and on the title screen: Klassiek (the released story,
// default) or Nieuw (proefversie, the five-act story, only act 1 playable). The choice is the
// setting `verhaal` (settings.js, in 'gde-settings'). The story arc is fixed per page load
// (storyflag.js), so choosing the other one saves the game and starts it again; a save always
// keeps its own arc (savegame.js, a separate save per arc), so the old saves stay untouched.
// The environment (GDE_NIEUW_VERHAAL) and ?nieuwverhaal still force the new arc: then the setting
// does nothing.
import { getSettings, setSetting, onSettingsChange } from './settings.js';
import { ARC_ID, arcForced } from './storyflag.js';

export const ARC_NAMES = { oud: 'Klassiek', nieuw: 'Nieuw (proefversie)' };
export const arcName = (arc) => ARC_NAMES[arc] || ARC_NAMES.oud;
export const ARC_NOTE = 'Nieuw verhaal is nog in aanbouw: alleen akte 1 speelbaar; je oude saves blijven onaangeraakt';

// the arc a new game plays: the one this page was loaded with
export const activeArc = () => ARC_ID;
// the arc the setting asks for (differs from activeArc until the game has started again)
export const chosenArc = () => (arcForced() ? ARC_ID : getSettings().verhaal === 'nieuw' ? 'nieuw' : 'oud');
export const otherArc = () => (ARC_ID === 'nieuw' ? 'oud' : 'nieuw');

export function chooseArc(arc) {
  if (arcForced()) return false;
  setSetting('verhaal', arc === 'nieuw' ? 'nieuw' : 'oud');
  return true;
}

let reloading = false;
function restart() {
  if (reloading || typeof location === 'undefined') return;
  reloading = true;
  // keep what was played: the save of this arc is written before the page starts again
  import('./savegame.js').then((m) => { try { m.saveGame(undefined, { toast: false }); } catch (e) { /* nothing to save yet */ } }).catch(() => {});
  setTimeout(() => location.reload(), 350);
}

onSettingsChange((s, key) => {
  if (key === 'verhaal' && !arcForced() && (s.verhaal === 'nieuw' ? 'nieuw' : 'oud') !== ARC_ID) restart();
});
