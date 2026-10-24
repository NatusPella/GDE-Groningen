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
    fadeEl.style.cssText = 'position:fixed;inset:0;z-index:8000;background:#000;opacity:0;pointer-events:none;transition:opacity 0.35s;';
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
    meedoenEl.setAttribute('role', 'status');
    meedoenEl.style.cssText = 'position:fixed;left:50%;bottom:96px;transform:translateX(-50%);z-index:7000;max-width:min(560px,92vw);padding:8px 14px;border-radius:10px;background:rgba(20,24,32,0.88);color:#fff;font:600 14px/1.35 system-ui,sans-serif;text-align:center;pointer-events:none;';
    document.body.appendChild(meedoenEl);
  }
  const t = uitnodigingTekst(u);
  if (meedoenEl.textContent !== t) meedoenEl.textContent = t;
  meedoenEl.style.display = 'block';
}
