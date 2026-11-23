// The travel prompt (#97): the choice at a travel beat with the ways of getting to the next step. Thin DOM layer; the text and the keys come
// from reisview.js. askTravel(beat) resolves with 'meerijden' | 'zelf' | 'overslaan'.
// #1216 (hertest 24-11): het paneel tekent dezelfde reiskaart als Reis erheen op de grote kaart (kaartactieui.js reisKaartHtml), met dezelfde
// kop, rijen en knop; eerst was het een eigen keuzepaneel (choicepanel.js) in een andere stijl voor dezelfde keuze.
import { reisKaartModel, pickFromKey, cyclePick, keyAction, TRAVEL_HELP_ID } from './reisview.js';
import { reisKaartHtml, KAART_ACTIE_CSS } from './kaartactieui.js';
import { markSeen, parseSeen } from './hudtext.js';
import { KEYS } from './storagekeys.js';
import { travelOptions } from './reiskeuze.js';
import { padButtonIndex, playerPad } from './glyphs.js';

// de host in de HUD; de stijl is die van de kaart (KAART_ACTIE_CSS), één keer in de pagina
let host = null;
function ensureHost() {
  if (host) return host;
  if (!document.getElementById('reis-kaart-css')) {
    const st = document.createElement('style');
    st.id = 'reis-kaart-css';
    st.textContent = KAART_ACTIE_CSS;
    document.head.appendChild(st);
  }
  host = document.createElement('div');
  host.className = 'reis-hud';
  host.hidden = true;
  (document.getElementById('hud') || document.body).appendChild(host);
  return host;
}
const panel = {
  get root() { return ensureHost(); },
  set(model) { const h = ensureHost(); const sig = JSON.stringify(model); if (h.dataset.sig !== sig) { h.dataset.sig = sig; h.innerHTML = reisKaartHtml(model); } },
  show() { ensureHost().hidden = false; document.body.classList.add('mg-on'); },
  hide() { const h = ensureHost(); h.hidden = true; h.innerHTML = ''; delete h.dataset.sig; document.body.classList.remove('mg-on'); },
};
const ensurePanel = () => panel;

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
  p.set(reisKaartModel(beat, pick, seen));
  noteHelp();
  p.show();
  return new Promise((resolve) => {
    let klaar = false;
    const finish = (id) => {
      if (klaar) return;   // dubbelklik of toets en tik tegelijk: één keuze
      klaar = true;
      document.removeEventListener('keydown', onKey, true);
      cancelAnimationFrame(raf);
      p.root.removeEventListener('pointerdown', onTap);
      p.root.style.pointerEvents = '';
      p.hide();
      open = null;
      resolve(id || travelOptions(beat).def);
    };
    // touch and mouse: tap an option (a phone has no 1/2/3 keys), or the button (the marked option)
    const onTap = (e) => {
      const knop = e.target.closest && e.target.closest('[data-card]');
      if (!knop) return;
      const act = knop.dataset.card;
      const id = act === 'rij' ? pick : act.startsWith('kies:') ? pickFromKey(beat, knop.dataset.key) : null;
      if (id) { e.preventDefault(); finish(id); }
    };
    const onKey = (e) => {
      if (e.repeat) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const a = keyAction(beat, pick, e.key, e.shiftKey);
      if (!a) return;
      e.preventDefault(); e.stopPropagation();
      if (a.markeer) { pick = a.markeer; p.set(reisKaartModel(beat, pick, loadSeen())); }
      else if (a.kies) finish(a.kies);
      else finish(null); // sluit: de standaardkeuze (#92)
    };
    document.addEventListener('keydown', onKey, true);
    // Gamepad: D-pad up/down picks, A confirms, B closes; a button already down on opening does
    // nothing. Dezelfde pad, herbinding en Nintendo-wissel als de rest van het spel (#151):
    // gamepad.js kiest de pad (activePadIndex), controls.js bepaalt welke knop A, B, omhoog of
    // omlaag is. Zo werkt hetzelfde pad als in het spel, ook na het omwisselen van knoppen.
    let raf = 0;
    const held = { up: true, down: true, a: true, b: true };
    const poll = () => {
      raf = requestAnimationFrame(poll);
      const pad = playerPad();
      if (!pad) return;
      const pressed = (slot) => { const b = pad.buttons[padButtonIndex(slot)]; return !!(b && b.pressed); };
      const now = { up: pressed('up') || (pad.axes[1] || 0) < -0.6, down: pressed('down') || (pad.axes[1] || 0) > 0.6, a: pressed('a'), b: pressed('b') };
      if (now.up && !held.up) { pick = cyclePick(beat, pick, -1); p.set(reisKaartModel(beat, pick, loadSeen())); }
      if (now.down && !held.down) { pick = cyclePick(beat, pick, 1); p.set(reisKaartModel(beat, pick, loadSeen())); }
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
