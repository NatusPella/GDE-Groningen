// De bakronde van akte 5 (M25 de oefenronde in Oma's keuken, M26 de drie rondes op de Grote Markt):
// Oma's recept is een volgorde. Je drukt de ingrediënten in die volgorde in (1-6); een verkeerd
// ingrediënt telt als mislukte eierbal. Te veel mislukte ballen: opnieuw beginnen, zonder de missie te
// verliezen. Het logica-deel is puur (Node-test: scripts/bakeround_test.mjs); het paneel is een kleine
// DOM-kaart die alleen in de browser bestaat.

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
  return { order: [...order], rounds, maxMisses, round: 0, step: 0, misses: 0, wrongs: 0, redos: 0, done: false, last: '' };
}

// Een ingrediënt toevoegen. Geeft 'ok' (goed ingrediënt), 'round' (een bal klaar), 'done' (alle rondes
// klaar), 'wrong' (verkeerd ingrediënt: mislukte bal, de bal begint opnieuw) of 'redo' (te veel mislukt).
export function bakeAdd(b, id) {
  if (b.done) return 'done';
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

// --- het paneel (alleen in de browser) -----------------------------------------
let panel = null;

function ensurePanel() {
  if (panel || typeof document === 'undefined') return panel;
  panel = document.createElement('div');
  panel.id = 'bakeround';
  panel.style.cssText = 'position:fixed;left:50%;bottom:18%;transform:translateX(-50%);z-index:30;background:rgba(32,24,16,.88);color:#fdf3dc;border:2px solid #e9b44c;border-radius:10px;padding:10px 16px;font:15px/1.4 system-ui,sans-serif;text-align:center;pointer-events:none;min-width:280px';
  document.body.appendChild(panel);
  return panel;
}

function render(b, title) {
  const el = ensurePanel();
  if (!el) return;
  const have = b.order.slice(0, b.step).map((id) => INGREDIENTS.find((q) => q.id === id).label);
  const keys = INGREDIENTS.map((q) => `<b>${q.key}</b> ${q.label}`).join(' · ');
  el.innerHTML = `<div style="font-weight:700">${title}</div><div>Eierbal ${Math.min(b.round + 1, b.rounds)} van ${b.rounds} · mislukt ${b.misses}/${b.maxMisses}</div>`
    + `<div style="margin:4px 0">${have.length ? have.join(' → ') : 'Begin met het eerste ingrediënt'}</div><div style="font-size:12px;opacity:.85">${keys}</div>`
    + (b.last ? `<div style="color:#ffb199;margin-top:4px">${b.last}</div>` : '');
}

export function showBake(b, title = 'Oma\'s recept') {
  render(b, title);
}

export function hideBake() {
  if (panel && panel.parentNode) panel.parentNode.removeChild(panel);
  panel = null;
}

// Per beeld: leest de toetsen 1-6. Geeft het resultaat van de laatste toevoeging, of null.
export function updateBake(b, input, title) {
  let res = null;
  for (const q of INGREDIENTS) {
    if (input && input.wasPressed && input.wasPressed(q.key)) {
      if (input.consume) input.consume(q.key);
      res = bakeAdd(b, q.id);
    }
  }
  if (res) render(b, title);
  return res;
}
