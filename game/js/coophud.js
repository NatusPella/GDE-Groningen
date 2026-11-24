// Samen spelen (#95): de kleine stukjes beeld rond een sessie. Een korte fade als de gast binnenkomt of vertrekt;
// de spelerslijst staat niet permanent in beeld maar bij Tab en in het pauzemenu (coopspelersui.js, #377).
// Niet in beeld bekeken.
import { updateSpelersOverlay } from './coopspelersui.js';
import { updatePhrasesRadial } from './multiplayerphrasesradial.js';
import { uitnodigingVorm, MEEDOEN_WACHT } from './coopmeedoen.js';
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
export function updatePartnerChip(world) { updateSpelersOverlay(world); updatePhrasesRadial(world); updateMeedoenChip(world); updateStemKaart(world); updateSamenHints(world); }

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
    meedoenEl.classList.toggle('cp-meedoen--vraag', v.knoppen.length > 0);
    if (v.titel) { const k = document.createElement('div'); k.className = 'cp-meedoen-kop'; k.textContent = v.titel; meedoenEl.appendChild(k); }
    const t = document.createElement('span'); t.className = 'cp-meedoen-tekst'; t.textContent = v.tekst; meedoenEl.appendChild(t);
    if (v.uitleg) { const x = document.createElement('span'); x.className = 'cp-meedoen-uitleg'; x.textContent = v.uitleg; meedoenEl.appendChild(x); }
    if (v.knoppen.length) { // de aftelling: een balk die leegloopt, zodat de speler ziet hoeveel tijd er is (geen antwoord is nee)
      const b = document.createElement('div'); b.className = 'cp-meedoen-tijd'; b.setAttribute('aria-hidden', 'true');
      const i = document.createElement('b'); b.appendChild(i); meedoenEl.appendChild(b);
    }
    const rij = document.createElement('div'); rij.className = 'cp-meedoen-knoppen';
    for (const kn of v.knoppen) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'ds-z-knop cp-meedoen-knop' + (kn.toets === 'n' ? ' ds-z-knop--secundair' : ''); // #1001: één gele knop (Ja), Nee is secundair
      b.dataset.k = kn.toets;
      const toets = document.createElement('span'); toets.className = 'ds-z-toets'; toets.setAttribute('aria-hidden', 'true'); toets.textContent = kn.letter;
      b.append(toets, " " + kn.label); b.setAttribute('aria-keyshortcuts', kn.letter);
      rij.appendChild(b);
    }
    if (v.knoppen.length) meedoenEl.appendChild(rij);
  }
  const balk = meedoenEl.querySelector('.cp-meedoen-tijd b');
  if (balk) balk.style.width = Math.max(0, Math.min(100, (Number(u.rest) / MEEDOEN_WACHT) * 100)) + '%';
  meedoenEl.style.display = ''; // het blad (samenspelen.css) bepaalt de weergave
}

// Samen kiezen (ontwerp 24-11): een gezamenlijke keuze (slapen, de tijd, laden, cheats, stoppen) als dezelfde kaart bij iedereen: wie het voorstelde, een aftelbalk en Ja (J) en Nee (N).
// Geen antwoord is nee. De knoppen sturen dezelfde toets als het toetsenbord (controls.js leest world.coopStem).
let stemEl = null, stemId = null, stemT0 = 0;
function updateStemKaart(world) {
  if (typeof document === 'undefined') return;
  const q = world && world.coopStem;
  if (!q) { if (stemEl) stemEl.style.display = 'none'; stemId = null; return; }
  if (!stemEl) {
    stemEl = document.createElement('div');
    stemEl.className = 'cp-meedoen cp-meedoen--vraag cp-stem';
    stemEl.setAttribute('role', 'status');
    stemEl.addEventListener('click', (e) => {
      const k = e.target.closest && e.target.closest('button[data-k]');
      if (!k) return;
      k.blur(); sendKey('keydown', k.dataset.k, 'touch'); sendKey('keyup', k.dataset.k, 'touch');
    });
    document.body.appendChild(stemEl);
  }
  if (stemId !== q.id) {
    stemId = q.id; stemT0 = Date.now();
    stemEl.textContent = '';
    const kop = document.createElement('div'); kop.className = 'cp-meedoen-kop'; kop.textContent = 'Samen kiezen';
    const tekst = document.createElement('span'); tekst.className = 'cp-meedoen-tekst'; tekst.textContent = q.tekst;
    const uitleg = document.createElement('span'); uitleg.className = 'cp-meedoen-uitleg'; uitleg.textContent = 'Iedereen moet akkoord zijn. Geen antwoord is nee.';
    const bar = document.createElement('div'); bar.className = 'cp-meedoen-tijd'; bar.setAttribute('aria-hidden', 'true'); bar.appendChild(document.createElement('b'));
    const rij = document.createElement('div'); rij.className = 'cp-meedoen-knoppen';
    for (const kn of uitnodigingVorm({ label: '' }).knoppen) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'ds-z-knop cp-meedoen-knop' + (kn.toets === 'n' ? ' ds-z-knop--secundair' : ''); b.dataset.k = kn.toets;
      const toets = document.createElement('span'); toets.className = 'ds-z-toets'; toets.setAttribute('aria-hidden', 'true'); toets.textContent = kn.letter;
      b.append(toets, ' ' + kn.label); b.setAttribute('aria-keyshortcuts', kn.letter); rij.appendChild(b);
    }
    stemEl.append(kop, tekst, uitleg, bar, rij);
  }
  const rest = Number(q.rest) || 10, over = Math.max(0, 1 - (Date.now() - stemT0) / 1000 / rest);
  const balk = stemEl.querySelector('.cp-meedoen-tijd b'); if (balk) balk.style.width = (over * 100) + '%';
  stemEl.style.display = '';
}
