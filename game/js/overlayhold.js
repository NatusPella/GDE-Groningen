// De DOM-kant van overlayrules.js (#239): kijkt welke overlays in beeld zijn en houdt de rest
// tegen (class ov-hold, onzichtbaar maar niet weg). Wie een overlay laat verschijnen kan ook
// isOverlayHeld(naam) vragen en dan wachten (prestaties, personagenaam).
import { heldOverlays, mayStartOverlay } from './overlayrules.js';
import { setVisibleInterval } from './visibletimer.js';
import { isPauseMenuOpen, isMapOpen } from './pausestate.js';
import { registerNoticeHold } from './notifyqueue.js';
import { SUBTITLE_LAYERS, SUBTITLE_SELECTORS, hiddenSubtitles } from './subtitlegate.js';

// hoe elke overlay in de DOM te herkennen is (zichtbaar = aanwezig)
const SELECTORS = {
  resultaat: '#cine .cine-banner:not([hidden])',
  keuze: '#hud .cw-panel:not([hidden])',
  duelbalk: '#hud .mg-board:not([hidden])',
  naamkaart: '#name-card.on',
  // #1182: de plaatsstempel (bigmoment.js, vorm plaats) vervangt de wijkkaart en telt als dezelfde overlay
  wijkkaart: '#wijk-card.on, .bm.bm-v-plaats',
  prestatie: '#hud .ach-toast.on',
  locatie: '#hud .hud-place.on',
};
// wat we kunnen verbergen
const HIDE = { naamkaart: '#name-card', wijkkaart: '#wijk-card, .bm.bm-v-plaats', duelbalk: '#hud .mg-board', prestatie: '#hud .ach-toast', locatie: '#hud .hud-place' };

// een schermvullend scherm is open: het pauzemenu, de kaart of de tuningwerkplaats
const SCHERM_SELECTOR = '#tune-menu.visible';
export const schermOpen = (doc) => !!(isPauseMenuOpen() || isMapOpen() || (doc && doc.querySelector(SCHERM_SELECTOR)));

registerNoticeHold('screen', () => schermOpen(typeof document !== 'undefined' ? document : null)); // meldingenpoort (22-11)
// de resultaatkaart van een missie (einde): meldingen wachten, alleen de missiemeldingen zelf negeren dit (notifyqueue.js)
registerNoticeHold('mission', () => typeof document !== 'undefined' && !!document.querySelector(SELECTORS.resultaat));

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

// Ondertitels en meldingen: één ondertitel tegelijk, geen ondertitel over een menu, geen kaart of ondertitel over het laadscherm.
const SUBTITLE_EL = SUBTITLE_SELECTORS; // de lagen van het ene ondertitelcomponent (subtitleui.js)
const LAAD_HIDE = ['#hud .hud-cards', '#hud .hud-cards-e', '#hud .hud-count', '#menu-meldingen'];
const toonbaar = (el) => !!el && el.style.opacity !== '0' && el.style.display !== 'none' && (el.id === '' || el.style.opacity === '1');
function tickSubtitles() {
  const laadt = !!document.querySelector('#load-screen:not(.out)');
  const zichtbaar = SUBTITLE_LAYERS.filter((id) => toonbaar(document.querySelector(SUBTITLE_EL[id])));
  // de eindkaart (bigmoment.js zet body.bm-eindkaart) telt als een open kaart: geen ondertitel van een regel die nog doorloopt
  // tegelijk met de uitslag (23-11, M03: de loketbediende praatte onder de kaart door)
  const eindkaart = !!(document.body && document.body.classList.contains('bm-eindkaart')); // onder Node (de tests met een kale document-stub) is er geen body
  const weg = hiddenSubtitles(zichtbaar, schermOpen(document) || laadt || eindkaart);
  for (const id of SUBTITLE_LAYERS) {
    const el = document.querySelector(SUBTITLE_EL[id]);
    if (el) el.classList.toggle('ov-hold', weg.has(id));
  }
  for (const sel of LAAD_HIDE) { const el = document.querySelector(sel); if (el) el.classList.toggle('ov-hold', laadt); }
}

let started = false;
function startOverlayHold() {
  if (started || typeof document === 'undefined') return;
  started = true;
  const style = document.createElement('style');
  style.textContent = '.ov-hold { visibility: hidden !important; }';
  document.head.appendChild(style);
  const tick = setVisibleInterval(() => {
    const held = heldOverlays(activeOverlays());
    for (const [name, sel] of Object.entries(HIDE)) {
      for (const el of document.querySelectorAll(sel)) el.classList.toggle('ov-hold', held.has(name)); // #1182: een stempel die er al stond, wijkt als de kaart of de werkplaats opent
    }
    tickSubtitles();
  }, 150);
  if (tick && tick.unref) tick.unref(); // onder Node (de tests met node3d.mjs) houdt de timer het proces niet open
}
startOverlayHold();
