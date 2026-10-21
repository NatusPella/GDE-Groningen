// Samen spelen (#95): de kleine stukjes beeld rond een sessie. Een korte fade als de gast binnenkomt of vertrekt;
// de spelerslijst staat niet permanent in beeld maar bij Tab en in het pauzemenu (coopspelersui.js, #377).
// Niet in beeld bekeken.
import { updateSpelersOverlay } from './coopspelersui.js';

let fadeEl = null;

// richting: 'in' (zwart naar beeld) of 'uit'
export function fadeFlash(richting = 'in') {
  if (typeof document === 'undefined') return;
  if (!fadeEl) {
    fadeEl = document.createElement('div');
    fadeEl.style.cssText = 'position:fixed;inset:0;z-index:8000;background:#000;opacity:0;pointer-events:none;transition:opacity 0.35s;';
    document.body.appendChild(fadeEl);
  }
  fadeEl.style.opacity = '1';
  setTimeout(() => { if (fadeEl) fadeEl.style.opacity = '0'; }, richting === 'in' ? 450 : 350);
}

// Elke frame vanuit main.js, alleen als er een sessie is: de lijst met spelers zolang Tab wordt ingedrukt.
export function updatePartnerChip(world) { updateSpelersOverlay(world); }
