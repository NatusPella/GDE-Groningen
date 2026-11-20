// One key hint as a keycap: the glyph of a control token (prompts.js, hudcards.js, the
// Besturing table), and the text form {E} / "druk op E" in running text. Pure: no DOM.
// Split out of prompts.js so hudcards.js can use it without pulling in three.js.
import { physicalKey, tokenKey, keyName } from './controls.js';
import { getSettings } from './settings.js';
import { keyGlyph } from './inputglyphs.js';

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

const MOUSE_SVG = (btn) => '<svg class="hud-mouse" data-btn="' + btn + '" viewBox="0 0 14 20" aria-hidden="true">' +
  '<rect x="1" y="1" width="12" height="18" rx="6" class="m-body"/>' +
  '<path d="M7 1v7M1.4 8h11.2" class="m-seam"/>' +
  '<path d="M7 1.2A5.8 5.8 0 0 0 1.2 7v1H7z" class="m-l"/>' +
  '<path d="M7 1.2A5.8 5.8 0 0 1 12.8 7v1H7z" class="m-r"/>' +
  '<rect x="6" y="3" width="2" height="3.4" rx="1" class="m-w"/>' +
  '</svg>';

const KEY_LABELS = { ' ': 'SPATIE', SPACE: 'SPATIE', SHIFT: 'SHIFT', CTRL: 'CTRL', ESC: 'ESC' };

// Glyph for one control token: a keycap, the WASD cluster, or a mouse icon.
// `data-gk` names the token, so glyphs.js can show the controller button
// instead; a rebound key shows the key it is bound to now.
export function glyphHtml(token, opts = {}) {
  let inner;
  const gk = esc(token);
  if (token === 'WASD') {
    inner = `<span class="hud-wasd" data-gk="${gk}"><span class="hud-key is-kbg">${keyInner(physicalKey(getSettings().keyBinds, 'w'))}</span><span class="hud-key is-kbg">${keyInner(physicalKey(getSettings().keyBinds, 'a'))}</span><span class="hud-key is-kbg">${keyInner(physicalKey(getSettings().keyBinds, 's'))}</span><span class="hud-key is-kbg">${keyInner(physicalKey(getSettings().keyBinds, 'd'))}</span></span>`;
  } else if (token === 'ARROWS') {
    inner = `<span class="hud-wasd" data-gk="${gk}"><span class="hud-key is-kbg">${keyInner('arrowup')}</span><span class="hud-key is-kbg">${keyInner('arrowleft')}</span><span class="hud-key is-kbg">${keyInner('arrowdown')}</span><span class="hud-key is-kbg">${keyInner('arrowright')}</span></span>`;
  } else if (token === 'LMB' || token === 'RMB' || token === 'MOUSE' || token === 'WHEEL') {
    inner = `<span class="hud-mouse-g" data-gk="${gk}">` + MOUSE_SVG({ LMB: 'l', RMB: 'r', MOUSE: 'move', WHEEL: 'w' }[token]) + '</span>';
  } else {
    const canon = tokenKey(token);
    const phys = physicalKey(getSettings().keyBinds, canon);
    const gi = keyGlyphInner(phys);
    const label = phys !== canon ? keyName(phys) : (KEY_LABELS[token] || token);
    inner = `<span class="hud-key${gi ? ' is-kbg' : ''}" data-gk="${gk}">` + (gi || esc(label)) + '</span>';
  }
  if (!opts.ring) return inner;
  return '<span class="hud-hold">' + inner +
    '<svg class="hud-hold-ring" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="17" class="r-bg"/><circle cx="20" cy="20" r="17" class="r-fg" pathLength="100"/></svg></span>';
}

function keyCap(k) {
  return esc(keyName(physicalKey(getSettings().keyBinds, k)));
}

// A keyboard key as an icon of the Kenney Input Prompts set (game/fonts/input, CC0): the glyph draws its own key
// (arrow, Enter, Esc, space bar, letter), so the plate around it steps back (.is-kbg in a11y.css). A key without a glyph keeps its word.
const KEY_LABEL = { ' ': 'Spatie', shift: 'Shift', control: 'Ctrl', tab: 'Tab', backspace: 'Backspace', escape: 'Esc', enter: 'Enter', arrowup: 'Pijl omhoog', arrowdown: 'Pijl omlaag', arrowleft: 'Pijl links', arrowright: 'Pijl rechts' };
export function keyGlyphInner(phys) {
  const k = String(phys);
  const g = keyGlyph(k === ' ' ? 'space' : k === 'control' ? 'ctrl' : k);
  if (!g) return null;
  return '<span class="pad-g pad-kn pad-key" data-set="keys" role="img" aria-label="' + esc(KEY_LABEL[k] || k.toUpperCase()) + '">' + g.char + '</span>';
}
// A key as it is written on a hint label ('Enter', 'Esc', 'Spatie', 'Tab', 'Q', '↑'): its glyph, or null (a word like 'Muis' keeps its text).
const LABEL_KEYS = { enter: 'enter', esc: 'escape', spatie: ' ', tab: 'tab', shift: 'shift', ctrl: 'control', backspace: 'backspace', '↑': 'arrowup', '↓': 'arrowdown', '←': 'arrowleft', '→': 'arrowright' };
export function keyLabelGlyph(label) {
  const l = String(label).trim();
  const k = LABEL_KEYS[l.toLowerCase()] || (/^[A-Za-z0-9]$/.test(l) ? l.toLowerCase() : null);
  return k ? keyGlyphInner(k) : null;
}
const keyInner = (phys) => keyGlyphInner(phys) || esc(keyName(phys));

// Running text (already HTML-escaped) with keys as keycaps: {E}, {SPACE}, {LMB}, [E], (E), and the
// spoken forms "druk (op) E", "houd E". New texts use {TOKEN}: it follows rebinding and the pad.
const WORD_KEYS = 'Spatie|Enter|Tab|Shift|Ctrl|Backspace|Esc';
const KEYS = 'A|D|W|S|E|F|R|T|O|K|Q|Z|M|G|H|L|N|P|X|C|U|I|' + WORD_KEYS;
export const TEXT_KEY_RE = new RegExp(String.raw`\{([A-Z0-9]+)\}|\[(${KEYS}|[1-4])\]|\((${KEYS})\)|(\b(?:[Dd]ruk|[Hh]oud) (?:op )?)(${KEYS})\b`, 'g');
export function keyTextHtml(html) {
  return String(html).replace(TEXT_KEY_RE, (m, tok, a, b, pre, c) => {
    const k = tok || a || b || c;
    return (pre || '') + glyphHtml(k === 'Spatie' ? 'SPACE' : k === 'Ctrl' ? 'CTRL' : k === 'Esc' ? 'ESC' : k.toUpperCase());
  });
}
export const hasKeyText = (text) => { TEXT_KEY_RE.lastIndex = 0; return TEXT_KEY_RE.test(String(text)); };

// Brace tokens of known keys only ({E}, {SPACE}, {ESC}, {WASD}, ...): a placeholder like {NAME} is never a key.
export const BRACE_KEY_RE = /\{(SPATIE|SPACE|ESC|ENTER|SHIFT|CTRL|TAB|BACKSPACE|DELETE|WASD|ARROWS|LMB|RMB|MOUSE|WHEEL|[A-Z0-9])\}/g;

// The same text for a place that cannot show a glyph (aria-label, title, document.title, a canvas, a log): the key name, never braces.
const PLAIN_NAMES = { WASD: 'WASD', ARROWS: 'pijltjes', LMB: 'linkermuisknop', RMB: 'rechtermuisknop', MOUSE: 'muis', WHEEL: 'muiswiel', DELETE: 'Delete' };
export function plainKeyText(text) {
  return String(text).replace(BRACE_KEY_RE, (m, k) => PLAIN_NAMES[k] || keyName(physicalKey(getSettings().keyBinds || {}, tokenKey(k))));
}
