// The travel prompt (#97): the choice panel in the mission style with the three
// ways of getting to the next step. Thin DOM layer; the text and the keys come
// from reisview.js. askTravel(beat) resolves with 'meerijden' | 'zelf' | 'overslaan'.
import { createChoicePanel } from './choicepanel.js';
import { panelState, pickFromKey, cyclePick, TRAVEL_HELP_ID } from './reisview.js';
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
      cancelAnimationFrame(raf);
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
      else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); finish(null); } // sluit: de standaardkeuze (#92)
    };
    document.addEventListener('keydown', onKey, true);
    // gamepad: d-pad up/down picks, A confirms (a button already down on opening does nothing)
    let raf = 0;
    const held = { up: true, down: true, a: true, b: true };
    const poll = () => {
      raf = requestAnimationFrame(poll);
      let pad = null;
      try { pad = (navigator.getGamepads ? [...navigator.getGamepads()] : []).find((g) => g && g.connected); } catch (e) { /* none */ }
      if (!pad) return;
      const nint = document.documentElement.dataset.pad === 'switch'; // Nintendo-indeling: bevestigen rechts
      const now = { up: pad.buttons[12]?.pressed || (pad.axes[1] || 0) < -0.6, down: pad.buttons[13]?.pressed || (pad.axes[1] || 0) > 0.6, a: pad.buttons[nint ? 1 : 0]?.pressed, b: pad.buttons[nint ? 0 : 1]?.pressed };
      if (now.up && !held.up) { pick = cyclePick(beat, pick, -1); p.set(panelState(beat, pick, loadSeen())); }
      if (now.down && !held.down) { pick = cyclePick(beat, pick, 1); p.set(panelState(beat, pick, loadSeen())); }
      if (now.a && !held.a) { finish(pick); return; }
      if (now.b && !held.b) { finish(null); return; }
      held.up = !!now.up; held.down = !!now.down; held.a = !!now.a; held.b = !!now.b;
    };
    raf = requestAnimationFrame(poll);
    p.root.style.pointerEvents = 'auto';
    p.root.addEventListener('pointerdown', onTap);
    open = { finish };
  });
}

export const travelPromptOpen = () => !!open;
