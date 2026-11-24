// Samen spelen (#95): de kleine stukjes beeld rond een sessie. Een korte fade als de gast binnenkomt of vertrekt;
// de spelerslijst staat niet permanent in beeld maar bij Tab en in het pauzemenu (coopspelersui.js, #377).
// Niet in beeld bekeken.
import { updateSpelersOverlay } from './coopspelersui.js';
import { updatePhrasesRadial } from './multiplayerphrasesradial.js';
import { uitnodigingVorm } from './coopmeedoen.js';
import { sendKey } from './input.js';
import { updateSamenHints } from './contexthints.js';

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
export function updatePartnerChip(world) { updateSpelersOverlay(world); updatePhrasesRadial(world); updateMeedoenChip(world); updateSamenHints(world); }

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
    // de knoppen sturen dezelfde toets als het toetsenbord (J of N), zodat touch en muis ook kunnen antwoorden
    meedoenEl.addEventListener('click', (e) => {
      const k = e.target.closest && e.target.closest('button[data-k]');
      if (!k) return;
      k.blur(); sendKey('keydown', k.dataset.k, 'touch'); sendKey('keyup', k.dataset.k, 'touch');
    });
    document.body.appendChild(meedoenEl);
  }
  const v = uitnodigingVorm(u);
  const sig = JSON.stringify(v);
  if (meedoenEl.dataset.sig !== sig) {
    meedoenEl.dataset.sig = sig;
    meedoenEl.textContent = '';
    const t = document.createElement('span'); t.className = 'cp-meedoen-tekst'; t.textContent = v.tekst; meedoenEl.appendChild(t);
    for (const kn of v.knoppen) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'ds-z-knop cp-meedoen-knop' + (kn.toets === 'n' ? ' ds-z-knop--secundair' : ''); // #1001: één gele knop (Ja), Nee is secundair b.dataset.k = kn.toets;
      const toets = document.createElement('span'); toets.className = 'ds-z-toets'; toets.setAttribute('aria-hidden', 'true'); toets.textContent = kn.letter;
      b.append(toets, ` ${kn.label}`); b.setAttribute('aria-keyshortcuts', kn.letter);
      meedoenEl.appendChild(b);
    }
  }
  meedoenEl.style.display = ''; // het blad (samenspelen.css) bepaalt de weergave
}
