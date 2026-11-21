// Input glyphs (keyboard, mouse, controller, touch) from the Kenney Input Prompts fonts (CC0, game/fonts/input).
// A glyph is one character of the matching font; the table is generated (scripts/input_glyph_map.mjs).
// Pure functions: no DOM, no storage. The keycap itself is the white .ds-z-toets plate with the glyph inside.
import { INPUT_GLYPHS } from './inputglyphs_data.js';
import { GLYPH_INK } from './inputglyphs_ink.js';

/** ` data-ink="573"` voor een glyph waarvan de inkt lager of hoger is dan de standaard 983/2048 (Spatie, Shift, Tab, schouderknoppen, muis), anders ''. ds-keycap.css schaalt daarmee de INKT naar dezelfde hoogte (#1075). */
export function inkAttr(set, char) {
  const v = GLYPH_INK[set] && GLYPH_INK[set][String(char).codePointAt(0).toString(16)];
  return v ? ` data-ink="${v}"` : '';
}

// font families of game/fonts/fonts.css, per glyph set
export const GLYPH_FAMILY = Object.freeze({
  keys: 'GDE Toetsen', xbox: 'GDE Knoppen A', ps: 'GDE Knoppen B', deck: 'GDE Knoppen Deck', generic: 'GDE Knoppen Algemeen', touch: 'GDE Aanraking',
});

// KeyboardEvent.code (or a short name) -> glyph name in the keys set
const KEY_ALIAS = Object.freeze({
  escape: 'escape', esc: 'escape', enter: 'enter', return: 'enter', numpadenter: 'enter', space: 'space', tab: 'tab', backspace: 'backspace',
  shiftleft: 'shift', shiftright: 'shift', shift: 'shift', controlleft: 'ctrl', controlright: 'ctrl', ctrl: 'ctrl', altleft: 'alt', altright: 'alt', alt: 'alt',
  arrowup: 'arrow_up', arrowdown: 'arrow_down', arrowleft: 'arrow_left', arrowright: 'arrow_right', capslock: 'capslock', delete: 'delete', insert: 'insert',
  home: 'home', end: 'end', pageup: 'page_up', pagedown: 'page_down',
});

/** Glyph name of a keyboard key, or null. 'KeyW' / 'w' -> 'keyboard_w', 'Digit1' -> 'keyboard_1', 'Escape' -> 'keyboard_escape'. */
export function keyGlyphName(code) {
  const c = String(code || '').trim();
  if (!c) return null;
  const low = c.toLowerCase();
  let name = KEY_ALIAS[low];
  if (!name) {
    const m = /^(?:key|digit)([a-z0-9])$/.exec(low) || /^([a-z0-9])$/.exec(low);
    if (m) name = m[1];
    else if (/^f([1-9]|1[0-2])$/.test(low)) name = low;
  }
  const full = name ? `keyboard_${name}` : null;
  return full && INPUT_GLYPHS.keys[full] != null ? full : null;
}

// Standard-mapping controller buttons (gamepad.buttons index) -> glyph suffix per set
const PAD_BUTTONS = Object.freeze(['a', 'b', 'x', 'y', 'lb', 'rb', 'lt', 'rt', 'view', 'menu', 'stick_l_press', 'stick_r_press', 'dpad_up', 'dpad_down', 'dpad_left', 'dpad_right']);
const PS_NAMES = Object.freeze({ a: 'cross', b: 'circle', x: 'square', y: 'triangle' });

/** Glyph for a controller button of a set ('xbox' | 'ps' | 'deck'): button 0..15 or a name like 'a', 'lt', 'dpad_up'. Returns { set, name, char } or null. */
export function padGlyph(set, button) {
  if (!INPUT_GLYPHS[set]) return null;
  const b = typeof button === 'number' ? PAD_BUTTONS[button] : String(button || '').toLowerCase();
  if (!b) return null;
  const candidates = set === 'ps'
    ? [PS_NAMES[b] ? `playstation_button_${PS_NAMES[b]}` : `playstation_trigger_${b}`, `playstation_${b}`]
    : [`${set === 'deck' ? 'steamdeck' : 'xbox'}_button_${b}`, `${set === 'deck' ? 'steamdeck' : 'xbox'}_${b}`];
  for (const name of candidates) if (INPUT_GLYPHS[set][name] != null) return glyph(set, name);
  return null;
}

/** { set, name, char, family, outline } for a glyph name (outline by default; { filled: true } for the solid key), or null when the set or the name is unknown. */
export function glyph(set, name, { filled = false } = {}) {
  const table = INPUT_GLYPHS[set];
  if (!table) return null;
  // The outline variant is the default: an ink outline with a clear inside, so on the white plate it reads as a white key.
  const key = !filled && table[`${name}_outline`] != null ? `${name}_outline` : name;
  const cp = table[key];
  return cp == null ? null : { set, name, char: String.fromCodePoint(cp), family: GLYPH_FAMILY[set], outline: key !== name };
}

/** Glyph of a keyboard key by code or name, or null. */
export function keyGlyph(code) {
  const n = keyGlyphName(code);
  return n ? glyph('keys', n) : null;
}

// Mouse tokens -> glyph of the Kenney mouse set (it lives in the 'keys' font): left, right and middle button, wheel, movement, side-to-side drag.
const MOUSE_GLYPHS = Object.freeze({ LMB: ['mouse_left', 'linkermuisknop'], RMB: ['mouse_right', 'rechtermuisknop'], MMB: ['mouse_scroll', 'middelste muisknop'], WHEEL: ['mouse_scroll_vertical', 'muiswiel'], MOUSE: ['mouse_move', 'muis'], DRAG: ['mouse_horizontal', 'muis slepen'] });
/** { set, name, char, family, outline, word } of a mouse token (LMB, RMB, MMB, WHEEL, MOUSE, DRAG), or null. */
export function mouseGlyph(token) {
  const m = MOUSE_GLYPHS[String(token).toUpperCase()];
  const g = m ? glyph('keys', m[0]) : null;
  return g ? { ...g, word: m[1] } : null;
}
export const MOUSE_TOKENS = Object.freeze(Object.keys(MOUSE_GLYPHS));

/** Glyph names of a set, for the gallery and the tests. */
export function glyphNames(set) { return INPUT_GLYPHS[set] ? Object.keys(INPUT_GLYPHS[set]).filter((k) => !k.endsWith('_outline')) : []; }

// ---- controller slots (the slot names of controls.js PAD_LAYOUTS) -> glyph ----
const PAD_SET = Object.freeze({ xbox: 'xbox', ps: 'ps', deck: 'deck', switch: 'xbox' });
const PAD_PREFIX = Object.freeze({ xbox: 'xbox', ps: 'playstation', deck: 'steamdeck' });
const SHOULDER = Object.freeze({ lb: 'l1', rb: 'r1', lt: 'l2', rt: 'r2' });

/**
 * Glyph of a controller slot ('a', 'lb', 'rt', 'up', 'lstick', 'ls', 'view', 'start') for a controller family
 * ('xbox' | 'ps' | 'switch' | 'deck'). `face` is the label of a face button in that family ('B', 'cross'), because on a Switch
 * the bottom button is B. Returns { set, name, char, family, outline } or null when the family has no such glyph (the caller keeps its own cap).
 */
export function padSlotGlyph(slot, family = 'xbox', face = '') {
  const set = PAD_SET[family];
  if (!set) return null;
  const pre = PAD_PREFIX[set];
  let name = null;
  if (['a', 'b', 'x', 'y'].includes(slot)) {
    const t = String(face || slot).toLowerCase();
    name = set === 'ps' ? `playstation_button_${t}` : `${pre}_button_${t}`;
  } else if (SHOULDER[slot]) {
    if (family === 'switch') return null;
    name = set === 'ps' ? `playstation_trigger_${SHOULDER[slot]}` : set === 'deck' ? `steamdeck_button_${SHOULDER[slot]}` : `xbox_${slot}`;
  } else if (['up', 'down', 'left', 'right'].includes(slot)) name = `${pre}_dpad_${slot}`;
  else if (slot === 'lstick' || slot === 'rstick') name = `${pre}_stick_${slot[0]}`;
  else if (slot === 'ls' || slot === 'rs') name = `${pre}_stick_${slot[0]}_press`;
  else if (slot === 'dpad') name = `${pre}_dpad`;
  else if (slot === 'view' && set !== 'ps') name = set === 'deck' ? 'steamdeck_button_view' : 'xbox_button_view';
  else if (slot === 'start' && set !== 'ps') name = set === 'deck' ? 'steamdeck_button_options' : 'xbox_button_menu';
  return name ? glyph(set, name) : null;
}
