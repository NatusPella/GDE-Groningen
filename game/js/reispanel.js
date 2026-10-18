// The travel prompt (#97): the choice panel in the mission style with the three
// ways of getting to the next step. Thin DOM layer; the text and the keys come
// from reisview.js. askTravel(beat) resolves with 'meerijden' | 'zelf' | 'overslaan'.
import { createChoicePanel } from './choicepanel.js';
import { panelState, pickFromKey } from './reisview.js';
import { travelOptions } from './reiskeuze.js';

let panel = null;
const ensurePanel = () => panel || (panel = createChoicePanel('#5fb4d9'));

let open = null;

export function askTravel(beat) {
  if (typeof document === 'undefined') return Promise.resolve(travelOptions(beat).def);
  if (open) open.finish(null);
  const p = ensurePanel();
  let pick = travelOptions(beat).def;
  p.set(panelState(beat, pick));
  p.show();
  return new Promise((resolve) => {
    const finish = (id) => {
      document.removeEventListener('keydown', onKey, true);
      p.hide();
      open = null;
      resolve(id || travelOptions(beat).def);
    };
    const onKey = (e) => {
      if (e.repeat) return;
      const id = pickFromKey(beat, e.key);
      if (id) { e.preventDefault(); e.stopPropagation(); finish(id); }
      else if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); finish(pick); }
    };
    document.addEventListener('keydown', onKey, true);
    open = { finish };
  });
}

export const travelPromptOpen = () => !!open;
