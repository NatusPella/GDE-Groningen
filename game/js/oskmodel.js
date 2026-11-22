// Het model van het schermtoetsenbord (#1011, #495): puur, geen DOM, zodat een test het zonder scherm nakijkt. Een controllerspeler vult
// hiermee elk tekstveld in (onscreenkeyboard.js tekent en bedraadt). Hier staan de indelingen per veldtype, de navigatie over het raster,
// de invoer (cursor, hoofdletters, lagen, maximale lengte, toegestane tekens), de live controle en de suggesties.
//
// Alles is een reductor: een functie krijgt de stand en geeft een nieuwe terug. Een stand is
// { kind, value, caret, layer, shift, r, c, max, check, original, reveal, chips, rand, melding, klaar, label }.
// klaar is null zolang je typt, 'ok' na bevestigen en 'annuleer' na annuleren.

export const OSK_KINDS = Object.freeze(['naam', 'code', 'tekst', 'wachtwoord', 'zoek', 'cijfers']);
export const GDE2_PREFIX = 'GDE2-';

// Verzonnen Groningse bijnamen voor naamvelden (nooit echte personen of merken; elke naam is hoogstens 16 tekens en gaat door
// net/serverlijst.js schoonNaam, zie de test). Een speler kiest er één met A of laat 'Willekeurig' kiezen.
export const BIJNAMEN = Object.freeze([
  'Wadloper', 'Polderpiloot', 'Fietsbel', 'Mosterdkoe', 'Trekkertje', 'Pannenkoek', 'Kruiwagen', 'Klompenman', 'Dijkdokter', 'Zoutkorrel',
  'Meerkoet', 'Boterbloem', 'Snertlepel', 'Brugwachter', 'Turfstekker', 'Eendenkooi', 'Wolkenjager', 'Kikkerdril', 'Zomerbries', 'Boerenkool',
  'Kerkuil', 'Duinroos', 'Weidevogel', 'Stoepkrijt',
]);
// Verzonnen sessienamen (hoogstens 24 tekens, ook door schoonNaam).
export const SESSIENAMEN = Object.freeze(['Zomer in Grunn', 'Rondje Reitdiep', 'Koffie en kruiwagens', 'Dijkdokters', 'Zondagse rit', 'De Wadlopers']);
export const MAANDEN_KORT = Object.freeze(['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec']);
/** Een voorgestelde naam voor een opgeslagen spel: 'Spel van 22 nov'. */
export function saveNameSuggestion(datum = new Date()) { return `Spel van ${datum.getDate()} ${MAANDEN_KORT[datum.getMonth()]}`; }

// Welke tekens horen bij welk veldtype. Een toets met een ander teken is gedimd en zegt waarom als je hem toch indrukt.
const TOEGESTAAN = {
  'naam': /^[\p{L}\p{N} .,'!?&()+-]$/u,
  code: /^[A-Za-z0-9.:_-]$/,
  tekst: /^[^\u0000-\u001f\u007f<>]$/u,
  wachtwoord: /^[^\u0000-\u001f\u007f]$/u,
  zoek: /^[^\u0000-\u001f\u007f<>]$/u,
  cijfers: /^[0-9]$/,
};
export function toegestaan(kind, ch) { return (TOEGESTAAN[kind] || TOEGESTAAN.tekst).test(ch); }

// ---------------------------------------------------------------- de indelingen
const RIJEN_LETTERS = ['qwertyuiop', 'asdfghjkl\'', 'zxcvbnm-.,'];
const RIJEN_CIJFERS = ['1234567890', '-_.,:;!?\'"', '()&+=/@#%*'];
const RIJEN_ACCENT = ['áàâäãåæçßñ', 'éèêëíìîïĳœ', 'óòôöõøúùûü'];
const RIJEN_CODE = ['1234567890', 'qwertyuiop', 'asdfghjkl-', 'zxcvbnm._:'];
const RIJEN_CIJFERPAD = ['123', '456', '789'];
const LAGEN = ['letters', 'cijfers', 'accent'];
export const LAYER_LABEL = Object.freeze({ letters: 'abc', cijfers: '123', accent: 'éè' });

const teken = (ch, shift) => {
  if (!shift) return ch;
  const up = ch.toLocaleUpperCase('nl-NL');
  return up.length === 1 ? up : ch; // ß wordt geen SS en ĳ geen IJ
};

// Eén toets: { t: soort, ch?, label, w: breedte in eenheden, token?: toets-in-de-knop, uit?, act?, tekst? }
const char = (ch, shift) => ({ t: 'char', ch: teken(ch, shift), label: teken(ch, shift), w: 1 });
const actie = (t, label, w, token = '', extra = {}) => ({ t, label, w, token, ...extra });

/** Het raster van rijen toetsen voor een stand. Rij 0 is de chips-rij als er suggesties zijn. Toetsen met een niet toegestaan teken krijgen uit:true. */
export function buildGrid(st) {
  const rows = [];
  const hoofd = st.shift !== 'off';
  const chips = chipRij(st);
  if (chips.length) rows.push(chips);
  if (st.kind === 'cijfers') {
    for (const r of RIJEN_CIJFERPAD) rows.push([...r].map((c) => char(c, false)));
    rows.push([actie('wis', 'Wis', 1.5, 'BACKSPACE'), char('0', false), actie('ok', st.okLabel || 'Klaar', 1.5, 'F10')]);
  } else if (st.kind === 'code') {
    for (const r of RIJEN_CODE) rows.push([...r].map((c) => char(c, hoofd)));
    rows.push([actie('shift', st.shift === 'off' ? 'abc' : 'ABC', 1.5, 'SHIFT'), actie('prefix', GDE2_PREFIX, 2, ''), actie('wis', 'Wis', 1.5, 'BACKSPACE'), actie('ok', st.okLabel || 'Klaar', 1.5, 'F10')]);
  } else {
    const layerId = st.layer;
    const source = layerId === 'cijfers' ? RIJEN_CIJFERS : layerId === 'accent' ? RIJEN_ACCENT : RIJEN_LETTERS;
    for (const r of source) rows.push([...r].map((c) => char(c, layerId !== 'cijfers' && hoofd)));
    const nextLayer = LAGEN[(LAGEN.indexOf(layerId) + 1) % LAGEN.length];
    rows.push([
      actie('shift', st.shift === 'lock' ? 'ABC' : st.shift === 'once' ? 'Abc' : 'abc', 1.5, 'SHIFT', { actief: st.shift !== 'off' }),
      actie('laag', LAYER_LABEL[nextLayer], 1.5, ']', { naar: nextLayer }),
      actie('spatie', 'Spatie', 3, 'SPACE'),
      actie('wis', 'Wis', 1.5, 'BACKSPACE'),
      actie('ok', st.okLabel || 'Klaar', 1.5, 'F10'),
    ]);
  }
  // onderste rij: cursor, tonen en annuleren
  const bottomRow = [actie('links', '◀', 1, 'PAGEUP'), actie('rechts', '▶', 1, 'PAGEDOWN')];
  if (st.kind === 'wachtwoord') bottomRow.push(actie('toon', st.reveal ? 'Verberg' : 'Toon', 2));
  bottomRow.push(actie('annuleer', 'Annuleren', 2, 'ESC'));
  rows.push(bottomRow);
  for (const r of rows) for (const k of r) if (k.t === 'char' && !toegestaan(st.kind, k.ch)) k.uit = true;
  return rows;
}

// De suggesties van een stand: ten hoogste zes chips op één rij.
function chipRij(st) {
  const items = Array.isArray(st.chips) ? st.chips.slice(0, 6) : [];
  return items.map((c) => ({ t: 'chip', label: c.label, tekst: c.tekst != null ? c.tekst : '', act: c.act || '', w: Math.max(1.5, Math.min(3, c.label.length / 4 + 0.8)) }));
}

// ---------------------------------------------------------------- de stand
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

export function createState({ kind = 'tekst', value = '', max = 0, check = null, label = '', chips = null, rand = Math.random, okLabel = '', leegMag = true } = {}) {
  const k = OSK_KINDS.includes(kind) ? kind : 'tekst';
  const v = String(value ?? '');
  const st = {
    kind: k, value: max > 0 ? v.slice(0, max) : v, caret: 0, layer: 'letters', shift: 'off', r: 0, c: 0, max: max > 0 ? max : 0,
    check, original: v, reveal: false, chips: chips || null, rand, message: '', klaar: null, label, okLabel: okLabel || (k === 'zoek' ? 'Zoek' : 'Klaar'), leegMag,
  };
  st.caret = st.value.length;
  st.shift = k === 'code' ? 'lock' : (k === 'naam' || k === 'tekst' || k === 'zoek') && !st.value ? 'once' : 'off';
  // begin op de eerste toets van het toetsenblok (niet op de chips)
  const g = buildGrid(st);
  st.r = g.length > 1 && g[0][0] && g[0][0].t === 'chip' ? 1 : 0;
  return st;
}

const met = (st, o) => ({ ...st, ...o });

/** De toets onder de focus (of null). */
export function focusKey(st) {
  const g = buildGrid(st);
  const row = g[clamp(st.r, 0, g.length - 1)];
  return row ? row[clamp(st.c, 0, row.length - 1)] : null;
}

// Het midden van een toets op de rij, 0 tot 1 (voor omhoog en omlaag naar de dichtstbijzijnde toets).
function midden(row, c) {
  const tot = row.reduce((a, k) => a + k.w, 0);
  let x = 0;
  for (let i = 0; i < c; i++) x += row[i].w;
  return (x + row[c].w / 2) / tot;
}

/** Beweeg de focus: 'left', 'right', 'up', 'down'. Rondom (geen dode einden): links van de eerste toets is de laatste, boven de bovenste rij is de onderste. */
export function moveFocus(st, dir) {
  const g = buildGrid(st);
  let r = clamp(st.r, 0, g.length - 1);
  let c = clamp(st.c, 0, g[r].length - 1);
  if (dir === 'left') c = (c - 1 + g[r].length) % g[r].length;
  else if (dir === 'right') c = (c + 1) % g[r].length;
  else if (dir === 'up' || dir === 'down') {
    const x = midden(g[r], c);
    r = (r + (dir === 'down' ? 1 : -1) + g.length) % g.length;
    let beste = 0, afstand = Infinity;
    for (let i = 0; i < g[r].length; i++) { const d = Math.abs(midden(g[r], i) - x); if (d < afstand - 1e-9) { afstand = d; beste = i; } }
    c = beste;
  } else return st;
  return met(st, { r, c });
}

/** Zet de focus op een bepaalde plek (een klik of tik op een toets). */
export function focusAt(st, r, c) {
  const g = buildGrid(st);
  if (!g[r] || !g[r][c]) return st;
  return met(st, { r, c });
}

// ---------------------------------------------------------------- invoer
/** Voeg tekst in op de cursor. Niet-toegestane tekens vallen weg met een melding; boven het maximum wordt afgekapt met een melding. */
export function insertText(st, tekst) {
  let ins = '';
  let afgekeurd = false;
  for (const ch of String(tekst)) { if (toegestaan(st.kind, ch)) ins += ch; else afgekeurd = true; }
  let message = afgekeurd ? 'Dat teken kan hier niet.' : '';
  if (st.max > 0) {
    const ruimte = Math.max(0, st.max - st.value.length);
    if ([...ins].length > ruimte) { ins = [...ins].slice(0, ruimte).join(''); message = `Hoogstens ${st.max} tekens.`; }
  }
  if (!ins) return met(st, { message: message || st.message });
  const value = st.value.slice(0, st.caret) + ins + st.value.slice(st.caret);
  const s = met(st, { value, caret: st.caret + ins.length, message, shift: st.shift === 'once' ? 'off' : st.shift });
  return s;
}

export function backspace(st) {
  if (st.caret <= 0) return met(st, { message: '' });
  const value = st.value.slice(0, st.caret - 1) + st.value.slice(st.caret);
  // na het wissen van de hele naam begint de volgende letter weer met een hoofdletter
  const shift = !value && (st.kind === 'naam' || st.kind === 'tekst' || st.kind === 'zoek') && st.shift === 'off' ? 'once' : st.shift;
  return met(st, { value, caret: st.caret - 1, message: '', shift });
}

export const cursor = (st, d) => met(st, { caret: clamp(st.caret + d, 0, st.value.length) });
export const clearAll = (st) => met(st, { value: '', caret: 0, message: '' });

/** Hoofdletter: uit, één letter, of vast (twee keer snel achter elkaar). */
export function wisselShift(st) {
  if (st.kind === 'cijfers') return st;
  const nextLayer = st.shift === 'off' ? 'once' : st.shift === 'once' ? 'lock' : 'off';
  return met(st, { shift: st.kind === 'code' ? (st.shift === 'lock' ? 'off' : 'lock') : nextLayer });
}

export function setLayer(st, layerId) { return LAGEN.includes(layerId) && st.kind !== 'code' && st.kind !== 'cijfers' ? met(st, { layer: layerId }) : st; }
/** LT en RT: de vorige of volgende laag (letters, cijfers en leestekens, accenten). */
export function shiftLayer(st, d) {
  if (st.kind === 'code' || st.kind === 'cijfers') return st;
  return met(st, { layer: LAGEN[(LAGEN.indexOf(st.layer) + d + LAGEN.length) % LAGEN.length] });
}

// ---------------------------------------------------------------- controle en suggesties
/** Live: { ok, reason, teller }. De teller is "5/16" (alleen met een maximum), reason komt van de controle van het veld. */
export function status(st) {
  const teller = st.max > 0 ? `${[...st.value].length}/${st.max}` : `${[...st.value].length}`;
  if (!st.value && st.leegMag) return { ok: true, reason: '', teller };
  if (!st.value) return { ok: false, reason: 'Vul eerst iets in.', teller };
  if (typeof st.check === 'function') {
    let r;
    try { r = st.check(st.value); } catch (e) { r = { ok: true }; }
    if (r && r.ok === false) return { ok: false, reason: r.reason || 'Dit kan niet.', teller };
  }
  return { ok: true, reason: '', teller };
}

/** Wat het veld te zien krijgt: een wachtwoord als bolletjes tenzij Toon aan staat. */
export function displayText(st) { return st.kind === 'wachtwoord' && !st.reveal ? '•'.repeat([...st.value].length) : st.value; }

/** Kies een suggestie: een tekst vervangt de invoer; Willekeurig en Plakken lopen via de aanroeper (willekeurig is puur, plakken is async). */
export function pickChip(st, chip) {
  if (!chip) return st;
  if (chip.act === 'willekeurig') return setValue(st, randomName(st));
  if (chip.act === 'plakken') return st; // de aanroeper leest het klembord en roept insertText aan
  return setValue(st, chip.tekst);
}

/** Vervang de hele invoer (een chip) binnen de regels van het veld. */
export function setValue(st, tekst) {
  const leeg = met(st, { value: '', caret: 0, message: '' });
  const s = insertText(leeg, tekst);
  return met(s, { shift: 'off' });
}

/** Een willekeurige naam uit de eigen lijst (nooit twee keer dezelfde achter elkaar als er een keuze is). */
export function randomName(st, items = BIJNAMEN) {
  const i = Math.floor(st.rand() * items.length) % items.length;
  const name = items[i];
  return name === st.value ? items[(i + 1) % items.length] : name;
}

/** De standaard-chips per veldtype. Een veld kan zijn eigen lijst meegeven (zoekopdrachten, recente codes, voorgestelde opslagnamen). */
export function defaultChips(kind, { sessie = false, recent = [] } = {}) {
  if (kind === 'naam') {
    const basis = sessie ? SESSIENAMEN.slice(0, 3).map((t) => ({ label: t, tekst: t })) : BIJNAMEN.slice(0, 4).map((t) => ({ label: t, tekst: t }));
    return sessie ? basis : [...basis, { label: 'Willekeurig', act: 'willekeurig' }];
  }
  if (kind === 'code') return [{ label: 'Plakken', act: 'plakken' }, ...recent.slice(0, 3).map((t) => ({ label: t.length > 14 ? t.slice(0, 13) + '…' : t, tekst: t }))];
  return [];
}

/** Bevestig: de controle beslist. Mislukt hij, dan blijft het toetsenbord open met de reden. */
export function bevestig(st) {
  const s = status(st);
  if (!s.ok) return met(st, { message: s.reason });
  return met(st, { klaar: 'ok', message: '' });
}
/** Annuleren geeft de oude waarde terug. */
export function annuleer(st) { return met(st, { value: st.original, caret: st.original.length, klaar: 'annuleer', message: '' }); }

/**
 * Eén toets indrukken (A, een klik of een tik). Geeft de nieuwe stand; de aanroeper kijkt naar klaar en naar st.vraag ('plakken').
 */
export function pressKey(st, key) {
  if (!key) return st;
  const schoon = { ...st, vraag: null };
  switch (key.t) {
    case 'char': { if (key.uit) return met(schoon, { message: 'Dat teken kan hier niet.' }); return insertText(schoon, key.ch); }
    case 'spatie': return insertText(schoon, ' ');
    case 'wis': return backspace(schoon);
    case 'shift': return wisselShift(schoon);
    case 'laag': return setLayer(schoon, key.naar);
    case 'links': return cursor(schoon, -1);
    case 'rechts': return cursor(schoon, 1);
    case 'toon': return met(schoon, { reveal: !st.reveal });
    case 'prefix': return st.value.startsWith(GDE2_PREFIX) ? met(schoon, { message: '' }) : insertText(met(schoon, { caret: 0 }), GDE2_PREFIX);
    case 'annuleer': return annuleer(schoon);
    case 'ok': return bevestig(schoon);
    case 'chip': return key.act === 'plakken' ? met(schoon, { vraag: 'plakken' }) : pickChip(schoon, key);
    default: return schoon;
  }
}

/**
 * Een toets van het toetsenbord of de controller (e.key, het pad stuurt dezelfde via controls.js PAD_MAPS.osk): de pijlen lopen over het raster,
 * Enter typt de toets, Backspace wist, Spatie typt een spatie (X), Shift wisselt hoofdletter (Y), PageUp en PageDown zetten de cursor (LB en RB),
 * [ en ] wisselen van laag (LT en RT), F10 bevestigt (Start), Escape annuleert (Overzicht). Geeft null voor een toets die het niet kent.
 */
export function handleKey(st, key) {
  const k = String(key);
  const low = k.toLowerCase();
  if (low === 'arrowleft') return moveFocus(st, 'left');
  if (low === 'arrowright') return moveFocus(st, 'right');
  if (low === 'arrowup') return moveFocus(st, 'up');
  if (low === 'arrowdown') return moveFocus(st, 'down');
  if (low === 'enter') return pressKey(st, focusKey(st));
  if (low === 'backspace') return backspace({ ...st, vraag: null });
  if (low === ' ' || low === 'spacebar') return pressKey(st, { t: 'spatie' });
  if (low === 'shift') return wisselShift(st);
  if (low === 'pageup') return cursor(st, -1);
  if (low === 'pagedown') return cursor(st, 1);
  if (low === '[') return shiftLayer(st, -1);
  if (low === ']') return shiftLayer(st, 1);
  if (low === 'f10') return bevestig(st);
  if (low === 'escape') return annuleer(st);
  return null;
}

/** Alle plekken [r, c] die je vanuit [r, c] in één stap bereikt (voor de test op dode einden). */
export function buren(st, r, c) {
  const s = met(st, { r, c });
  return ['left', 'right', 'up', 'down'].map((d) => { const n = moveFocus(s, d); return `${n.r},${n.c}`; });
}
