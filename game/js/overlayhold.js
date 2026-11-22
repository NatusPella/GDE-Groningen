// De DOM-kant van overlayrules.js (#239): kijkt welke overlays in beeld zijn en houdt de rest
// tegen (class ov-hold, onzichtbaar maar niet weg). Wie een overlay laat verschijnen kan ook
// isOverlayHeld(naam) vragen en dan wachten (prestaties, personagenaam).
import { heldOverlays, mayStartOverlay } from './overlayrules.js';
import { isPauseMenuOpen, isMapOpen } from './pausestate.js';

// hoe elke overlay in de DOM te herkennen is (zichtbaar = aanwezig)
const SELECTORS = {
  resultaat: '#cine .cine-banner:not([hidden])',
  keuze: '#hud .cw-panel:not([hidden])',
  duelbalk: '#hud .mg-board:not([hidden])',
  naamkaart: '#name-card.on',
  wijkkaart: '#wijk-card.on',
  prestatie: '#hud .ach-toast.on',
  locatie: '#hud .hud-place.on',
};
// wat we kunnen verbergen
const HIDE = { naamkaart: '#name-card', wijkkaart: '#wijk-card', duelbalk: '#hud .mg-board', prestatie: '#hud .ach-toast', locatie: '#hud .hud-place' };

// een schermvullend scherm is open: het pauzemenu, de kaart of de tuningwerkplaats
const SCHERM_SELECTOR = '#tune-menu.visible';
export const schermOpen = (doc) => !!(isPauseMenuOpen() || isMapOpen() || (doc && doc.querySelector(SCHERM_SELECTOR)));

function activeOverlays(doc = typeof document !== 'undefined' ? document : null) {
  if (!doc) return [];
  const out = Object.keys(SELECTORS).filter((k) => !!doc.querySelector(SELECTORS[k]));
  if (schermOpen(doc)) out.push('scherm');
  return out;
}

// Een overlay die nog niet in beeld is telt als actief voor wat hij zou tegenhouden: de vraag is of de
// ándere overlays hem nu laten beginnen.
export function isOverlayHeld(name) {
  const others = activeOverlays().filter((a) => a !== name);
  return !mayStartOverlay(name, others);
}

let started = false;
function startOverlayHold() {
  if (started || typeof document === 'undefined') return;
  started = true;
  const style = document.createElement('style');
  style.textContent = '.ov-hold { visibility: hidden !important; }';
  document.head.appendChild(style);
  const tick = setInterval(() => {
    const held = heldOverlays(activeOverlays());
    for (const [name, sel] of Object.entries(HIDE)) {
      const el = document.querySelector(sel);
      if (el) el.classList.toggle('ov-hold', held.has(name));
    }
  }, 150);
  if (tick && tick.unref) tick.unref(); // onder Node (de tests met node3d.mjs) houdt de timer het proces niet open
}
startOverlayHold();
