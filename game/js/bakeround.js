// De bakronde van akte 5 (M25 de oefenronde in Oma's keuken, M26 de drie rondes op de Grote Markt):
// Oma's recept is een volgorde. Je drukt de ingrediënten in die volgorde in (1-6); een verkeerd
// ingrediënt telt als mislukte eierbal. Te veel mislukte ballen: opnieuw beginnen, zonder de missie te
// verliezen. Het logica-deel is puur (Node-test: scripts/bakeround_test.mjs); het paneel is een kleine
// DOM-kaart die alleen in de browser bestaat.

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

function ensurePanel() {
  if (panel || typeof document === 'undefined') return panel;
  panel = document.createElement('div');
  panel.id = 'bakeround';
  panel.style.cssText = 'position:fixed;left:50%;bottom:18%;transform:translateX(-50%);z-index:30;background:rgba(32,24,16,.88);color:#fdf3dc;border:2px solid #e9b44c;border-radius:10px;padding:10px 16px;font:15px/1.4 Arial Narrow, Arial, sans-serif;text-align:center;pointer-events:none;min-width:280px';
  panel.innerHTML = '<div class="bk-kop"></div><div class="bk-ronde"></div><div class="bk-regel"></div><div class="bk-toetsen"></div><div class="bk-mis"></div>';
  document.body.appendChild(panel);
  // #987: de stappen van het recept (gedaan met icoon, de rest alleen genummerd, zodat Oma's volgorde niet wordt verklapt)
  // en de zes ingrediënten met hun toets als legenda
  const q = (s) => panel.querySelector(s);
  q('.bk-kop').style.fontWeight = '700';
  q('.bk-mis').style.cssText = 'color:#ffb199;margin-top:4px';
  q('.bk-regel').style.margin = q('.bk-toetsen').style.margin = '6px 0 0';
  rwStappen = maakWidget('stappen', q('.bk-regel'), { label: 'Recept' });
  rwToetsen = maakWidget('stappen', q('.bk-toetsen'), { modus: 'legenda', label: 'Ingrediënten' });
  if (rwToetsen) rwToetsen.inv.stappen = INGREDIENTS.map((i) => ({ icoon: i.id, label: i.label, waarde: i.key }));
  return panel;
}

function render(b, title) {
  const el = ensurePanel();
  if (!el) return;
  const q = (s) => el.querySelector(s);
  const set = (sel, t) => { const n = q(sel); if (n.textContent !== t) n.textContent = t; };
  set('.bk-kop', title);
  set('.bk-ronde', `Eierbal ${Math.min(b.round + 1, b.rounds)} van ${b.rounds} · mislukt ${b.misses}/${b.maxMisses}`);
  set('.bk-mis', b.last || '');
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
  panel = null; rwStappen = null; rwToetsen = null;
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
  }
  if (res) render(b, title);
  return res;
}

