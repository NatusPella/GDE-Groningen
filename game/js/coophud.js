// Samen spelen (#95): de kleine stukjes beeld rond een sessie. Een korte fade als de gast binnenkomt of vertrekt;
// de spelerslijst staat niet permanent in beeld maar bij Tab en in het pauzemenu (coopspelersui.js, #377).
// Niet in beeld bekeken.
import { updateSpelersOverlay } from './coopspelersui.js';
import { uitnodigingTekst } from './coopmeedoen.js';

let fadeEl = null;

// richting: 'in' (zwart naar beeld) of 'uit'
export function fadeFlash(richting = 'in') {
  if (typeof document === 'undefined') return;
  if (!fadeEl) {
    fadeEl = document.createElement('div');
    fadeEl.className = 'cp-fade';
    document.body.appendChild(fadeEl);
  }
  fadeEl.style.opacity = '1';
  setTimeout(() => { if (fadeEl) fadeEl.style.opacity = '0'; }, richting === 'in' ? 450 : 350);
}

// Elke frame vanuit main.js, alleen als er een sessie is: de lijst met spelers zolang Tab wordt ingedrukt.
export function updatePartnerChip(world) { updateSpelersOverlay(world); updateMeedoenChip(world); }

// "Meedoen?" blijft in beeld tot de gast antwoordt of de opdracht voorbij is: geen antwoord is nee (#452)
let meedoenEl = null;
function updateMeedoenChip(world) {
  if (typeof document === 'undefined') return;
  const u = world && world.coopUitnodiging;
  if (!u) { if (meedoenEl) meedoenEl.style.display = 'none'; return; }
  if (!meedoenEl) {
    meedoenEl = document.createElement('div');
    meedoenEl.className = 'cp-meedoen';
    meedoenEl.setAttribute('role', 'status');
    document.body.appendChild(meedoenEl);
  }
  const t = uitnodigingTekst(u);
  if (meedoenEl.textContent !== t) meedoenEl.textContent = t;
  meedoenEl.style.display = 'block';
}
