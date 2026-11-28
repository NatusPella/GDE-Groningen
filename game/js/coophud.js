// Samen spelen (#95): de kleine stukjes beeld rond een sessie. Een korte fade als de gast binnenkomt of vertrekt;
// de spelerslijst staat niet permanent in beeld maar bij Tab en in het pauzemenu (coopspelersui.js, #377).
// Niet in beeld bekeken.
import { updateSpelersOverlay } from './coopspelersui.js';
import { updatePhrasesRadial } from './multiplayerphrasesradial.js';
import { uitnodigingVorm, MEEDOEN_WACHT } from './coopmeedoen.js';
import { beloningHtml } from './samenbeloning.js';
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
export function updatePartnerChip(world) { updateSpelersOverlay(world); updatePhrasesRadial(world); updateMeedoenChip(world); updateStemKaart(world); updateWachtKaart(world); updateSamenHints(world); }

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

// De beloningskaart na een gezamenlijke activiteit (samenbeloning.js): één kaart, Doorgaan (Enter) of Esc sluit hem. Alleen een weergave; de betaling is al gebeurd.
let beloningEl = null, beloningSluit = null, beloningTimer = null;
export function toonBeloningKaart(gegevens) {
  if (typeof document === 'undefined' || !gegevens) return false;
  if (beloningSluit) beloningSluit();
  const el = document.createElement('div');
  beloningEl = el;
  el.className = 'sb-scherm';
  el.innerHTML = beloningHtml(gegevens);
  const toets = (e) => { if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); sluit(); } };
  const sluit = () => {
    if (beloningEl !== el) return;
    clearTimeout(beloningTimer); beloningTimer = null;
    el.remove(); beloningEl = null; beloningSluit = null;
    document.removeEventListener('keydown', toets, true);
  };
  el.addEventListener('click', (e) => { if (e.target.closest && e.target.closest('[data-beloning-door]')) sluit(); });
  document.addEventListener('keydown', toets, true);
  document.body.appendChild(el);
  const b = el.querySelector('[data-beloning-door]'); if (b && b.focus) b.focus({ preventScroll: true });
  beloningSluit = sluit;
  beloningTimer = setTimeout(sluit, 20000);
  return true;
}

// Wachten op een weggevallen speler (ontwerp 24-11): elke speler ziet het en kan zeggen "nu zonder hem verder". Geen verwijdering: de speler houdt zijn plek en kan terugkomen.
let wachtEl = null, wachtSlot = null;
function updateWachtKaart(world) {
  if (typeof document === 'undefined') return;
  const w = world && world.coopWachtOp;
  if (!w) { if (wachtEl) wachtEl.style.display = 'none'; wachtSlot = null; return; }
  if (!wachtEl) {
    wachtEl = document.createElement('div');
    wachtEl.className = 'cp-meedoen cp-meedoen--vraag cp-wacht';
    wachtEl.setAttribute('role', 'status');
    wachtEl.addEventListener('click', (e) => { if (e.target.closest && e.target.closest('[data-wacht-verder]') && world.coopWachtVerder) { world.coopWachtVerder(); wachtEl.style.display = 'none'; } });
    document.body.appendChild(wachtEl);
  }
  if (wachtSlot !== w.slot) {
    wachtSlot = w.slot;
    wachtEl.textContent = '';
    const kop = document.createElement('div'); kop.className = 'cp-meedoen-kop'; kop.textContent = `Wachten op ${w.naam}`;
    const t = document.createElement('span'); t.className = 'cp-meedoen-tekst'; t.textContent = `${w.naam} is weggevallen. Het spel wacht even tot de verbinding terug is.`;
    const u = document.createElement('span'); u.className = 'cp-meedoen-uitleg'; u.textContent = `${w.naam} blijft in de sessie en kan terugkomen. Niemand wordt verwijderd.`;
    const rij = document.createElement('div'); rij.className = 'cp-meedoen-knoppen';
    const b = document.createElement('button'); b.type = 'button'; b.className = 'ds-z-knop ds-z-knop--secundair cp-meedoen-knop'; b.dataset.wachtVerder = '1'; b.textContent = `Nu zonder ${w.naam} verder`; rij.appendChild(b);
    wachtEl.append(kop, t, u, rij);
  }
  wachtEl.style.display = '';
}

// Het hervatvenster (ontwerp 24-11): je bent weer verbonden. Hoe lang je weg was, dat je eigen spel niet veranderde, en de gele Verder spelen.
let hervatEl = null, hervatSluit = null, hervatTimer = null;
export function toonHervatKaart({ seconden = 0, naam = 'de ander' } = {}) {
  if (typeof document === 'undefined') return false;
  if (hervatSluit) hervatSluit();
  const min = Math.floor(seconden / 60), sec = Math.round(seconden % 60);
  const duur = min > 0 ? `${min} minuut en ${sec} seconden` : `${sec} seconden`;
  const el = document.createElement('div');
  hervatEl = el;
  el.className = 'sb-scherm';
  el.innerHTML = `<section class="sb-kaart" role="dialog" aria-modal="true" aria-label="Je bent weer verbonden"><div class="sb-kop">Je bent weer verbonden</div><div class="sb-kol" style="margin:0 var(--ds-s-5)"><h3 class="ds-z-tussenkop">Welkom terug in het spel van ${naam.replace(/[<>&"]/g, '')}</h3><p>Je was ${duur} weg. Je eigen spel is niet veranderd: je geld en je voortgang zijn bewaard. Wat de anderen deden, heb je gemist; waar je niet bij hoefde te zijn, kostte je niets.</p></div><div class="sb-acties"><button type="button" class="ds-z-knop" data-hervat-door>Verder spelen</button></div></section>`;
  const toets = (e) => { if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); sluit(); } };
  const sluit = () => {
    if (hervatEl !== el) return;
    clearTimeout(hervatTimer); hervatTimer = null;
    el.remove(); hervatEl = null; hervatSluit = null;
    document.removeEventListener('keydown', toets, true);
  };
  el.addEventListener('click', (e) => { if (e.target.closest && e.target.closest('[data-hervat-door]')) sluit(); });
  document.addEventListener('keydown', toets, true);
  document.body.appendChild(el);
  const b = el.querySelector('[data-hervat-door]'); if (b && b.focus) b.focus({ preventScroll: true });
  hervatSluit = sluit;
  hervatTimer = setTimeout(sluit, 15000);
  return true;
}
