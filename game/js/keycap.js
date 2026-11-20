// One key hint as a keycap: the glyph of a control token (prompts.js, hudcards.js, the
// Besturing table), and the text form {E} / "druk op E" in running text. Pure: no DOM.
// Split out of prompts.js so hudcards.js can use it without pulling in three.js.
import { physicalKey, tokenKey, keyName } from './controls.js';
import { getSettings } from './settings.js';

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
    inner = `<span class="hud-wasd" data-gk="${gk}"><span class="hud-key">${keyCap('w')}</span><span class="hud-key">${keyCap('a')}</span><span class="hud-key">${keyCap('s')}</span><span class="hud-key">${keyCap('d')}</span></span>`;
  } else if (token === 'ARROWS') {
    inner = `<span class="hud-wasd" data-gk="${gk}"><span class="hud-key">↑</span><span class="hud-key">←</span><span class="hud-key">↓</span><span class="hud-key">→</span></span>`;
  } else if (token === 'LMB' || token === 'RMB' || token === 'MOUSE' || token === 'WHEEL') {
    inner = `<span class="hud-mouse-g" data-gk="${gk}">` + MOUSE_SVG({ LMB: 'l', RMB: 'r', MOUSE: 'move', WHEEL: 'w' }[token]) + '</span>';
  } else {
    const canon = tokenKey(token);
    const phys = physicalKey(getSettings().keyBinds, canon);
    const label = phys !== canon ? keyName(phys) : (KEY_LABELS[token] || token);
    inner = `<span class="hud-key" data-gk="${gk}">` + esc(label) + '</span>';
  }
  if (!opts.ring) return inner;
  return '<span class="hud-hold">' + inner +
    '<svg class="hud-hold-ring" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="17" class="r-bg"/><circle cx="20" cy="20" r="17" class="r-fg" pathLength="100"/></svg></span>';
}

function keyCap(k) {
  return esc(keyName(physicalKey(getSettings().keyBinds, k)));
}

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
