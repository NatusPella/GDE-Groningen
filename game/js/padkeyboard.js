// Schermtoetsenbord voor een controller (#151): A op een tekstveld opent het,
// zodat naam, code en zoekveld zonder toetsenbord in te vullen zijn. Het pad
// stuurt pijlen/Enter/Escape (gamepad.js); hier worden die, alleen als ze van
// het pad komen (e.__gde === 'pad'), onderschept zolang het toetsenbord open is.
import { layout, moveCursor, applyKey } from './padkeyslogic.js';

let root = null;
let field = null;
let rows = null;
let cur = { r: 0, c: 0 };
let shift = false;
let before = '';

const isText = (t) => !!(t && ((t.tagName === 'INPUT' && ['text', 'search', 'tel', 'url', 'email', ''].includes(t.type)) || t.tagName === 'TEXTAREA'));
export function isPadKeyboardOpen() { return !!root; }

function draw() {
  root.querySelector('.pk-val').textContent = field.value || ' ';
  root.querySelectorAll('.pk-row').forEach((rowEl, r) => {
    rowEl.querySelectorAll('button').forEach((b, c) => {
      b.classList.toggle('on', r === cur.r && c === cur.c);
      const k = rows[r][c];
      b.textContent = k.kind === 'char' && shift ? k.t.toUpperCase() : k.label;
      b.classList.toggle('shift-on', k.t === 'shift' && shift);
    });
  });
}

function typeKey(key) {
  const caret = field.selectionStart == null ? field.value.length : field.selectionStart;
  const res = applyKey({ text: field.value, caret, shift }, key, field.maxLength > 0 ? field.maxLength : 0);
  shift = res.shift;
  if (res.text !== field.value) {
    field.value = res.text;
    field.dispatchEvent(new Event('input', { bubbles: true }));
  }
  try { field.setSelectionRange(res.caret, res.caret); } catch (e) { /* type zonder selectie */ }
  if (res.action === 'cancel') {
    field.value = before;
    field.dispatchEvent(new Event('input', { bubbles: true }));
    close();
  } else if (res.action === 'done') {
    const f = field;
    close();
    const ev = new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true, cancelable: true });
    ev.__gde = 'osk';
    f.dispatchEvent(ev);
    f.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', bubbles: true }));
  } else draw();
}

const DIRS = { arrowup: 'up', arrowdown: 'down', arrowleft: 'left', arrowright: 'right' };

function onKey(e) {
  if (e.__gde !== 'pad') return;
  const k = String(e.key).toLowerCase();
  e.preventDefault();
  e.stopImmediatePropagation();
  if (e.type !== 'keydown') return;
  if (DIRS[k]) { cur = moveCursor(rows, cur, DIRS[k]); draw(); }
  else if (k === 'enter') typeKey(rows[cur.r][cur.c]);
  else if (k === 'escape') close();
  else if (k === 'delete') typeKey({ t: 'back', kind: 'act' });
  else if (k === ' ') typeKey({ t: 'space', kind: 'act' });
  else if (k === 'q') typeKey({ t: 'left', kind: 'act' });
  else if (k === 'e') typeKey({ t: 'right', kind: 'act' });
}

function openPadKeyboard(el) {
  if (root || !isText(el)) return false;
  field = el;
  before = el.value;
  rows = layout();
  cur = { r: 1, c: 0 };
  shift = el.value === '';
  root = document.createElement('div');
  root.id = 'padkeyboard';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-label', 'Schermtoetsenbord');
  root.innerHTML = '<div class="pk-box"><div class="pk-val" aria-live="polite"></div>' +
    rows.map(() => '<div class="pk-row"></div>').join('') +
    '<p class="pk-help">Pijlen kiezen · onderste knop typt · linker knop wist · bovenste knop spatie · LB/RB cursor · rechter knop sluit</p></div>';
  root.querySelectorAll('.pk-row').forEach((rowEl, r) => {
    rows[r].forEach((k, c) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.tabIndex = -1;
      if (k.kind === 'act') b.className = 'act ' + k.t;
      b.addEventListener('mousedown', (ev) => ev.preventDefault());
      b.addEventListener('click', () => { cur = { r, c }; typeKey(k); });
      rowEl.appendChild(b);
    });
  });
  document.body.appendChild(root);
  window.addEventListener('keydown', onKey, true);
  window.addEventListener('keyup', onKey, true);
  draw();
  return true;
}

export function closePadKeyboard() { close(); }

function close() {
  if (!root) return;
  window.removeEventListener('keydown', onKey, true);
  window.removeEventListener('keyup', onKey, true);
  root.remove();
  root = null;
  field = null;
}

// A (Enter van het pad) op een tekstveld opent het toetsenbord in plaats van het veld te bevestigen.
// De luisteraar staat vóór die van het toetsenbord zelf, dus een tweede A (als het open is) typt.
export function initPadKeyboard() {
  window.addEventListener('keydown', (e) => {
    if (root || e.__gde !== 'pad' || e.key !== 'Enter') return;
    if (!isText(document.activeElement)) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    openPadKeyboard(document.activeElement);
  }, true);
}
