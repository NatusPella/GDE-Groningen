// One key hint as a keycap: the glyph of a control token (prompts.js, hudcards.js, the
// Besturing table), and the text form {E} / "druk op E" in running text. Pure: no DOM.
// Split out of prompts.js so hudcards.js can use it without pulling in three.js.
import { physicalKey, tokenKey, keyName } from './controls.js';
import { getSettings } from './settings.js';
import { keyGlyph, mouseGlyph, MOUSE_TOKENS, inkAttr } from './inputglyphs.js';
import { escapeHtml as esc } from './htmlescape.js';


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
  } else if (MOUSE_TOKENS.includes(token)) {
    // the Kenney mouse icons (same set and look as the keys); the drawn mouse stays as the fallback when the font has no glyph
    const mg = mouseGlyph(token);
    inner = `<span class="hud-mouse-g" data-gk="${gk}">` + (mg ? `<span class="pad-g pad-kn pad-key pad-mouse" data-set="keys"${inkAttr('keys', mg.char)} role="img" aria-label="${mg.word}">${mg.char}</span>` : MOUSE_SVG({ LMB: 'l', RMB: 'r', MOUSE: 'move', WHEEL: 'w', MMB: 'w', DRAG: 'move' }[token])) + '</span>';
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
function keyGlyphInner(phys) {
  const k = String(phys);
  const g = keyGlyph(k === ' ' ? 'space' : k === 'control' ? 'ctrl' : k);
  if (!g) return null;
  return '<span class="pad-g pad-kn pad-key" data-set="keys"' + inkAttr('keys', g.char) + ' role="img" aria-label="' + esc(KEY_LABEL[k] || k.toUpperCase()) + '">' + g.char + '</span>';
}
// A key as it is written on a hint label ('Enter', 'Esc', 'Spatie', 'Tab', 'Q', '↑', 'F8'): its glyph, or null (a word like 'Muis' keeps its text).
const LABEL_KEYS = { enter: 'enter', esc: 'escape', spatie: ' ', tab: 'tab', shift: 'shift', ctrl: 'control', alt: 'alt', backspace: 'backspace', del: 'delete', delete: 'delete', '↑': 'arrowup', '↓': 'arrowdown', '←': 'arrowleft', '→': 'arrowright' };
export function keyLabelGlyph(label) {
  const l = String(label).trim();
  const k = (Object.prototype.hasOwnProperty.call(LABEL_KEYS, l.toLowerCase()) && LABEL_KEYS[l.toLowerCase()]) || (/^[A-Za-z0-9]$/.test(l) || /^F([1-9]|1[0-2])$/i.test(l) ? l.toLowerCase() : null);
  return k ? keyGlyphInner(k) : null;
}
// Labels of a hint row that name a token (a mouse button, the wheel, the arrow cluster): shown as that icon, never as a word.
const LABEL_TOKENS = { klik: 'LMB', linkerklik: 'LMB', linkermuisknop: 'LMB', rechtsklik: 'RMB', rechtermuisknop: 'RMB', middelklik: 'MMB', slepen: 'DRAG', scroll: 'WHEEL', scrollwiel: 'WHEEL', muiswiel: 'WHEEL', muis: 'MOUSE', pijltjes: 'ARROWS', pijltoetsen: 'ARROWS', wasd: 'WASD' };
// One hint-row key label as markup, one path for every footer, table and card: a glyph or mouse icon, or a neat text keycap
// (`.hud-key` + data-gk) for a key without a glyph ('[', ']'). The glyph carries its own aria-label.
export const labelToken = (label) => { const k = String(label).trim().toLowerCase(); return Object.prototype.hasOwnProperty.call(LABEL_TOKENS, k) ? LABEL_TOKENS[k] : null; };
// Icon markup for one hint-row key label, or null when there is no icon (a word, a symbol like '[').
export function keyLabelIcon(label) {
  const l = String(label).trim();
  const t = labelToken(l);
  return t ? glyphHtml(t) : keyLabelGlyph(l);
}
export function keyLabelHtml(label) {
  const l = String(label).trim();
  const g = keyLabelIcon(l);
  if (g) return labelToken(l) ? g : `<span class="hud-key is-kbg" data-gk="${esc(l.toUpperCase())}">${g}</span>`;
  return `<span class="hud-key" data-gk="${esc(l.toUpperCase())}">${esc(l)}</span>`;
}
// #1258: one keycap for every footer hint bar (pause menu, shops): the glyph in a filled cap, or the neat text cap.
export function hintCapHtml(label) {
  const kg = keyLabelGlyph(label);
  return `<span class="m-kc is-kbg">${kg || keyLabelHtml(label)}</span>`;
}
const keyInner = (phys) => keyGlyphInner(phys) || esc(keyName(phys));

// Running text (already HTML-escaped) with keys as keycaps: {E}, {SPACE}, {LMB}, [E], (E), and the
// spoken forms "druk (op) E", "houd E". New texts use {TOKEN}: it follows rebinding and the pad.
const WORD_KEYS = 'Spatie|Enter|Tab|Shift|Ctrl|Backspace|Esc';
const KEYS = 'A|D|W|S|E|F|R|T|O|K|Q|Z|M|G|H|L|N|P|X|C|U|I|' + WORD_KEYS;
export const TEXT_KEY_RE = new RegExp(String.raw`\{([A-Z0-9]+)\}|\[(${KEYS}|[1-4])\]|\((${KEYS})\)|(\b(?:[Dd]ruk|[Hh]oud|[Dd]an) (?:op )?)(${KEYS})\b(?!-)`, 'g');
// A group of keys that reads as one unit ('A / D', 'Shift + {LMB}', '{W}{A}{S}{D}') or a word with its key ('om te praten {E}') never breaks
// across a line: it is wrapped in .ds-kc-eenheid (white-space: nowrap, ds-keycap.css). Markers keep the replace passes apart.
const RUN_SEP = String.raw`(?:\s?[/+]\s?|\s(?:en|of)\s)?`;
const runRe = (item) => new RegExp(String.raw`(?:([^\s<>]{1,14}) )?((?:${item})(?:${RUN_SEP}(?:${item}))*)`, 'g');
const KEY_ITEM = String.raw`\{[A-Z0-9]+\}|\[(?:${KEYS}|[1-4])\]|\((?:${KEYS})\)`;
const RUN_RE = runRe(KEY_ITEM);
const RUN_OPEN = '\u0001';
const RUN_CLOSE = '\u0002';
// a lone key without a word before it needs no wrapper: a glyph is nowrap by itself
export const groupKeyRuns = (text, re = RUN_RE) => String(text).replace(re, (m, word, run) => (!word && (run.match(/[{[(]/g) || []).length === 1 ? m : RUN_OPEN + m + RUN_CLOSE));
export const endKeyRuns = (html) => html.split(RUN_OPEN).join('<span class="ds-kc-eenheid">').split(RUN_CLOSE).join('</span>');
export function keyTextHtml(html) {
  const grouped = groupKeyRuns(html);
  return endKeyRuns(grouped.replace(TEXT_KEY_RE, (m, tok, a, b, pre, c) => {
    const k = tok || a || b || c;
    const g = glyphHtml(k === 'Spatie' ? 'SPACE' : k === 'Ctrl' ? 'CTRL' : k === 'Esc' ? 'ESC' : k.toUpperCase());
    return pre ? RUN_OPEN + pre + g + RUN_CLOSE : g;
  }));
}
// Brace tokens only ({N}, {SHIFT}+{N}) in already-escaped text: [E], (E) and "druk op E" stay text, so a label or note may hold those.
export const braceKeysHtml = (html) => endKeyRuns(groupKeyRuns(String(html ?? ''), BRACE_RUN_RE).replace(BRACE_KEY_RE, (m, k) => glyphHtml(k)));
export const hasKeyText = (text) => { TEXT_KEY_RE.lastIndex = 0; return TEXT_KEY_RE.test(String(text)); };

// Brace tokens of known keys only ({E}, {SPACE}, {ESC}, {WASD}, ...): a placeholder like {NAME} is never a key.
export const BRACE_KEY_RE = /\{(SPATIE|SPACE|ESC|ENTER|SHIFT|CTRL|ALT|TAB|BACKSPACE|DELETE|WASD|ARROWS|ARROWUP|ARROWDOWN|ARROWLEFT|ARROWRIGHT|LMB|RMB|MMB|MOUSE|WHEEL|DRAG|F(?:[1-9]|1[0-2])|[A-Z0-9])\}/g;
export const BRACE_RUN_RE = runRe(BRACE_KEY_RE.source);

// The same text for a place that cannot show a glyph (aria-label, title, document.title, a canvas, a log): the key name, never braces.
const PLAIN_NAMES = { WASD: 'WASD', ARROWS: 'pijltjes', MMB: 'middelste muisknop', DRAG: 'muis slepen', ARROWUP: 'pijl omhoog', ARROWDOWN: 'pijl omlaag', ARROWLEFT: 'pijl links', ARROWRIGHT: 'pijl rechts', ALT: 'Alt', LMB: 'linkermuisknop', RMB: 'rechtermuisknop', MOUSE: 'muis', WHEEL: 'muiswiel', DELETE: 'Delete' };
// Spoken lines and their subtitles keep the words of the clip ("Spatie omhoog, W vooruit, A en D draaien"; ADR 0041), so the text
// itself cannot hold {TOKEN}s. What the player SEES can: this turns the unambiguous key mentions of such a line into {TOKEN}s
// (rendered by keyTextHtml/sweepTokens). Conservative: only the game's control letters, after "met/tik/druk/houd", in a pair
// (W/S, A en D) or before a verb of control (W vooruit, S remt, E koppelt). Compass letters, "Plan B", "Loket C", "U" stay text.
const SPOKEN_LETTERS = 'WASDEFQRGKXCVZHOIT';
const SP_BEHIND = String.raw`(?<![\w{[(/.\-'’"+#])`;
const SP_WORD = new RegExp(SP_BEHIND + String.raw`(Spatiebalk|Spatie|Shift|Ctrl|Esc|Enter|Backspace)(?![\w}\]'’-])`, 'g');
const SP_PAIR = new RegExp(SP_BEHIND + String.raw`([WASDQEFZX])( en | of | ?/ ?|, )([WASDQEFZX])(?![\w}\]/.'’-])`, 'g');
const SP_WITH = new RegExp(String.raw`\b(met|Met|tik|Tik|via|Druk op|druk op|Druk|druk|Houd|houd|Laat|laat|rem met|duw met) ([${SPOKEN_LETTERS}])(?![\w{}'’-])(?!\. [A-Z][a-z])`, 'g');
const SP_VERB = new RegExp(SP_BEHIND + String.raw`([${SPOKEN_LETTERS}])(?= (?:vooruit|achteruit|remt|rem|gas|los|is gas|is rem|is de fluit|stuurt|hendel|deuren|dienst|omhoog|omlaag|hoger|lager|koppelt|lost|laat|zet|tankt|gooit)\b)`, 'g');
const SP_TOKEN = { Spatie: 'SPACE', Spatiebalk: 'SPACE', Shift: 'SHIFT', Ctrl: 'CTRL', Esc: 'ESC', Enter: 'ENTER', Backspace: 'BACKSPACE' };
export function spokenKeyTokens(text) {
  const t = String(text ?? '');
  if (!t) return t;
  return t
    .replace(SP_PAIR, (m, a, mid, b) => (a === b && mid.trim() !== ',' ? m : `{${a}}${mid}{${b}}`))
    .replace(SP_WITH, (m, p, k) => `${p} {${k}}`)
    .replace(SP_VERB, (m, k) => `{${k}}`)
    .replace(SP_WORD, (m, w) => `{${SP_TOKEN[w]}}`);
}

export function plainKeyText(text) {
  return String(text).replace(BRACE_KEY_RE, (m, k) => PLAIN_NAMES[k] || keyName(physicalKey(getSettings().keyBinds || {}, tokenKey(k))));
}
