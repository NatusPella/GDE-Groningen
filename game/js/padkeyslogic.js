// Pure kant van het schermtoetsenbord voor een controller (#151): indeling,
// cursor over het raster en tekstbewerking. padkeyboard.js tekent het.
// Getest zonder DOM in scripts/padkeys_test.mjs.

const LETTERS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
const DIGITS = '1234567890';

// Elke toets: { t: teken of actienaam, label, kind: 'char'|'act' }
const ch = (c) => ({ t: c, label: c, kind: 'char' });
const act = (t, label) => ({ t, label, kind: 'act' });

export function layout() {
  return [
    [...DIGITS].map(ch),
    [...LETTERS[0]].map(ch),
    [...LETTERS[1]].map(ch),
    [act('shift', '⇧'), ...[...LETTERS[2]].map(ch), act('back', '⌫')],
    [ch('-'), ch('.'), ch("'"), act('left', '◀'), act('space', 'spatie'), act('right', '▶'), act('cancel', 'Annuleer'), act('done', 'Klaar')],
  ];
}

// Cursor { r, c } over een raster met rijen van ongelijke lengte: omhoog en
// omlaag behouden de relatieve plek in de rij, links en rechts lopen rond.
export function moveCursor(rows, cur, dir) {
  let { r, c } = cur;
  const len = (i) => rows[i].length;
  if (dir === 'left') c = (c + len(r) - 1) % len(r);
  else if (dir === 'right') c = (c + 1) % len(r);
  else if (dir === 'up' || dir === 'down') {
    const nr = (r + (dir === 'up' ? rows.length - 1 : 1)) % rows.length;
    const rel = len(r) > 1 ? c / (len(r) - 1) : 0;
    c = Math.round(rel * (len(nr) - 1));
    r = nr;
  }
  return { r, c };
}

// state { text, caret, shift } + toets -> { text, caret, shift, action }
// action: null of 'done'/'cancel' (de aanroeper sluit het toetsenbord).
export function applyKey(state, key, maxLength = 0) {
  let { text, caret, shift } = state;
  caret = Math.max(0, Math.min(text.length, caret));
  let action = null;
  const insert = (s) => {
    if (maxLength > 0 && text.length + s.length > maxLength) return;
    text = text.slice(0, caret) + s + text.slice(caret);
    caret += s.length;
  };
  if (key.kind === 'char') {
    insert(shift ? key.t.toUpperCase() : key.t);
    // na één hoofdletter weer klein, zoals op een telefoon
    shift = false;
  } else if (key.t === 'shift') shift = !shift;
  else if (key.t === 'back') {
    if (caret > 0) { text = text.slice(0, caret - 1) + text.slice(caret); caret--; }
  } else if (key.t === 'space') insert(' ');
  else if (key.t === 'left') caret = Math.max(0, caret - 1);
  else if (key.t === 'right') caret = Math.min(text.length, caret + 1);
  else if (key.t === 'done' || key.t === 'cancel') action = key.t;
  return { text, caret, shift, action };
}
