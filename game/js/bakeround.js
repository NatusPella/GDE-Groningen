// De bakronde van akte 5 (M25 de oefenronde in Oma's keuken, M26 de drie rondes op de Grote Markt):
// Oma's recept is een volgorde. Je drukt de ingrediënten in die volgorde in (1-6); een verkeerd
// ingrediënt telt als mislukte eierbal. Te veel mislukte ballen: opnieuw beginnen, zonder de missie te
// verliezen. Het logica-deel is puur (Node-test: scripts/bakeround_test.mjs); het paneel is een kleine
// DOM-kaart die alleen in de browser bestaat.

import { sfxLinks } from './latehooks.js';
import { maakWidget } from './regelwidget.js'; // #987: het recept en de toetsen als iconen in plaats van een tekstlijst

const INGREDIENTS = [
  { key: '1', id: 'ei', label: 'Gekookt ei' },
  { key: '2', id: 'zout', label: 'Zout' },
  { key: '3', id: 'meel', label: 'Grof meel' },
  { key: '4', id: 'vet', label: 'Heet vet' },
  { key: '5', id: 'mosterd', label: 'Grove mosterd' },
  { key: '6', id: 'bloem', label: 'Fijne bloem' },
];

// Oma's volgorde: de oefenronde gebruikt alle vijf, de wedstrijd vier (de mosterd zit in de saus).
export const RECIPE_PRACTICE = ['ei', 'zout', 'meel', 'vet', 'mosterd'];
export const RECIPE_CONTEST = ['ei', 'zout', 'meel', 'vet'];

export function createBake({ order = RECIPE_CONTEST, rounds = 3, maxMisses = 3 } = {}) {
  // seq telt elke poging: een gast die meedrukt, stuurt het nummer mee van de stand die hij zag (#525),
  // zodat een druk uit een oudere stand niet op een volgende ronde landt.
  return { order: [...order], rounds, maxMisses, round: 0, step: 0, misses: 0, wrongs: 0, redos: 0, done: false, last: '', seq: 1 };
}

// Een ingrediënt toevoegen. Geeft 'ok' (goed ingrediënt), 'round' (een bal klaar), 'done' (alle rondes
// klaar), 'wrong' (verkeerd ingrediënt: mislukte bal, de bal begint opnieuw) of 'redo' (te veel mislukt).
export function bakeAdd(b, id) {
  if (b.done) return 'done';
  b.seq = (Number.isInteger(b.seq) ? b.seq : 1) + 1; // elke poging is een nieuwe paneelstand (#525)
  if (id !== b.order[b.step]) {
    b.misses++;
    b.wrongs++;
    b.step = 0;
    b.last = id === 'bloem' ? 'Fijne bloem? Dat is Fries. Een gladde bal, geen eierbal van hier.' : 'Mis. Dat was de verkeerde volgorde: die bal is mislukt.';
    if (b.misses >= b.maxMisses) {
      b.round = 0; b.misses = 0; b.redos++;
      b.last = 'Te veel mislukte eierballen. Opnieuw bakken, vanaf de eerste.';
      return 'redo';
    }
    return 'wrong';
  }
  b.step++;
  b.last = '';
  if (b.step < b.order.length) return 'ok';
  b.step = 0;
  b.round++;
  if (b.round >= b.rounds) { b.done = true; return 'done'; }
  return 'round';
}

export function bakeProgress(b) {
  return { round: Math.min(b.round + 1, b.rounds), rounds: b.rounds, step: b.step, next: b.done ? null : b.order[b.step], misses: b.misses };
}

// De toets van een ingrediënt (1-6) en de stand die de gastheer naar de gasten stuurt (#525): de gast ziet
// dezelfde ingrediënten en voortgang als de gastheer, en zijn toets telt als de zijne.
const BY_KEY = new Map(INGREDIENTS.map((q) => [q.key, q.id]));
export const bakeKeyId = (key) => (typeof key === 'string' ? BY_KEY.get(key) || null : null);
export function bakePanel(b, title = '') {
  const p = bakeProgress(b);
  return {
    stap: 'bake',
    toetsen: INGREDIENTS.map((q) => q.key),
    tekst: `${title ? title + ' · ' : ''}${INGREDIENTS.map((q) => `${q.key} ${q.label}`).join(' · ')}`.slice(0, 240),
    ronde: `${p.round}/${p.rounds} · ${p.step}/${b.order.length} · mis ${p.misses}/${b.maxMisses}`.slice(0, 24),
    nr: b.seq,
  };
}

// --- het paneel (alleen in de browser) -----------------------------------------
let panel = null;
let rwStappen = null, rwToetsen = null;
let goed = ''; // de melding bij een gelukte bal (de foutmelding staat in b.last)

// Het paneel (#985): een ds-kaart in dezelfde plek en taal als de strook van de light sims (sim.css, alleen ds-tokens, klassen bk-), met een balk voor de
// eierballen, het recept als stappen (Oma's volgorde blijft verborgen) en de zes toetsen als legenda. Het element heet nog steeds #bakeround (de speelbot zoekt het).
function ensurePanel() {
  if (panel || typeof document === 'undefined') return panel;
  panel = document.createElement('div');
  panel.id = 'bakeround';
  panel.className = 'sh-hud bk-paneel ds-kaart';
  panel.setAttribute('aria-label', "Oma's recept");
  panel.innerHTML = '<header class="sh-kop"><span class="sh-titel ds-t-subkop bk-kop"></span><span class="ds-chip bk-ronde"></span></header>' +
    '<div class="ds-streep bk-balk" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-label="Eierballen klaar"><span class="ds-streep__baan"><span class="ds-streep__vul"></span></span><span class="ds-streep__label bk-balklabel"></span></div>' +
    '<div class="bk-regel"></div><div class="bk-toetsen"></div><p class="ds-t-hulp sh-nu bk-mis" aria-live="polite"></p>';
  document.body.appendChild(panel);
  // #987: de stappen van het recept (gedaan met icoon, de rest alleen genummerd, zodat Oma's volgorde niet wordt verklapt)
  // en de zes ingrediënten met hun toets als legenda
  const q = (sel) => panel.querySelector(sel);
  rwStappen = maakWidget('stappen', q('.bk-regel'), { label: 'Recept' });
  rwToetsen = maakWidget('stappen', q('.bk-toetsen'), { modus: 'legenda', label: 'Ingrediënten' });
  if (rwToetsen) rwToetsen.inv.stappen = INGREDIENTS.map((i) => ({ icoon: i.id, label: i.label, waarde: i.key }));
  return panel;
}

// De teksten en maten van het paneel uit een bakstand: puur, zodat de test ze zonder DOM kan nakijken.
export function bakeHudModel(b, title = '', goedTekst = '') {
  const p = bakeProgress(b);
  const klaar = Math.min(b.round, b.rounds);
  return {
    kop: title, ronde: `Eierbal ${p.round} van ${p.rounds}`, pct: Math.round((klaar / Math.max(1, b.rounds)) * 100), balkLabel: `${klaar} van ${b.rounds} klaar`,
    mislukt: `Mislukt ${b.misses}/${b.maxMisses}`,
    melding: b.last || goedTekst || (b.step === 0 ? "Druk de ingrediënten in Oma's volgorde (1 tot 6)" : `Stap ${b.step + 1} van ${b.order.length}`), fout: !!b.last,
  };
}

function render(b, title) {
  const el = ensurePanel();
  if (!el) return;
  const m = bakeHudModel(b, title, goed);
  const q = (sel) => el.querySelector(sel);
  const set = (sel, t) => { const n = q(sel); if (n.textContent !== t) n.textContent = t; };
  set('.bk-kop', m.kop);
  set('.bk-ronde', `${m.ronde} · ${m.mislukt}`);
  set('.bk-balklabel', m.balkLabel);
  const balk = q('.bk-balk');
  balk.setAttribute('aria-valuenow', String(m.pct));
  balk.style.setProperty('--ds-streep-w', m.pct + '%');
  set('.bk-mis', m.melding);
  q('.bk-mis').classList.toggle('sh-nu--slecht', m.fout);
  if (rwStappen) {
    rwStappen.inv.stappen = b.order.map((id, k) => (k < b.step ? { icoon: id, label: INGREDIENTS.find((x) => x.id === id).label } : { icoon: '', label: '?' }));
    rwStappen.inv.klaar = b.step;
    rwStappen.ververs();
  }
  if (rwToetsen) rwToetsen.ververs();
}

export function showBake(b, title = 'Oma\'s recept') {
  render(b, title);
}

export function hideBake() {
  if (panel && panel.parentNode) panel.parentNode.removeChild(panel);
  panel = null; rwStappen = null; rwToetsen = null; goed = '';
}

// Per beeld: leest de toetsen 1-6. Geeft het resultaat van de laatste toevoeging, of null.
// `extraKey` is de toets van een gast die meedrukt (#525); de eigen toets van de gastheer gaat voor.
export function updateBake(b, input, title, extraKey = null) {
  let res = null, key = null;
  for (const q of INGREDIENTS) {
    if (input && input.wasPressed && input.wasPressed(q.key)) { key = q.key; break; }
  }
  if (!key && bakeKeyId(extraKey)) key = extraKey;
  if (key && bakeKeyId(key)) {
    if (input && input.wasPressed && input.wasPressed(key) && input.consume) input.consume(key);
    res = bakeAdd(b, bakeKeyId(key));
    goed = res === 'round' ? 'Eierbal klaar! De volgende.' : res === 'done' ? 'Alle eierballen klaar!' : '';
    if (res === 'round' || res === 'done') { try { sfxLinks.uiFx('ui_verzameld'); } catch (e) { /* geen geluid is geen ramp */ } }
  }
  if (res) render(b, title);
  return res;
}

