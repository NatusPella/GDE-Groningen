// The travel prompt (#97): the choice panel in the mission style with the three
// ways of getting to the next step. Thin DOM layer; the text and the keys come
// from reisview.js. askTravel(beat) resolves with 'meerijden' | 'zelf' | 'overslaan'.
import { createChoicePanel } from './choicepanel.js';
import { panelState, pickFromKey, TRAVEL_HELP_ID } from './reisview.js';
import { markSeen, parseSeen } from './hudtext.js';
import { KEYS } from './storagekeys.js';
import { travelOptions } from './reiskeuze.js';

let panel = null;
const ensurePanel = () => panel || (panel = createChoicePanel('#5fb4d9'));

let open = null;

function loadSeen() {
  try { return parseSeen(localStorage.getItem(KEYS.hudSeen)); } catch (e) { return {}; }
}
// the help line is a first-time explanation: count it once per prompt
function noteHelp() {
  try { localStorage.setItem(KEYS.hudSeen, JSON.stringify(markSeen(loadSeen(), TRAVEL_HELP_ID))); } catch (e) { /* ignore */ }
}

export function askTravel(beat) {
  if (typeof document === 'undefined') return Promise.resolve(travelOptions(beat).def);
  if (open) open.finish(null);
  const p = ensurePanel();
  let pick = travelOptions(beat).def;
  const seen = loadSeen();
  p.set(panelState(beat, pick, seen));
  noteHelp();
  p.show();
  return new Promise((resolve) => {
    const finish = (id) => {
      document.removeEventListener('keydown', onKey, true);
      p.root.removeEventListener('pointerdown', onTap);
      p.root.style.pointerEvents = '';
      p.hide();
      open = null;
      resolve(id || travelOptions(beat).def);
    };
    // touch and mouse: tap an option (a phone has no 1/2/3 keys)
    const onTap = (e) => {
      const row = e.target.closest && e.target.closest('.cw-opt[data-key]');
      const id = row && pickFromKey(beat, row.dataset.key);
      if (id) { e.preventDefault(); finish(id); }
    };
    const onKey = (e) => {
      if (e.repeat) return;
      const id = pickFromKey(beat, e.key);
      if (id) { e.preventDefault(); e.stopPropagation(); finish(id); }
      else if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); finish(pick); }
    };
    document.addEventListener('keydown', onKey, true);
    p.root.style.pointerEvents = 'auto';
    p.root.addEventListener('pointerdown', onTap);
    open = { finish };
  });
}

export const travelPromptOpen = () => !!open;
