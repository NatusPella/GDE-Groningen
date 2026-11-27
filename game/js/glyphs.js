// Keycaps follow the player's controls. Every on-screen key hint (`.hud-key`,
// `<kbd>`, and prompts.js glyphHtml output, which carries `data-gk`) shows
// the rebound key when the keyboard is in use, and the controller button
// for that key in the current situation when a controller was used last
// (gamepad.js). The original content is kept and put back on the switch,
// so modules that write hints need to know nothing about this. Inside an
// element with `data-pad-ctx` (the Besturing table) that situation is used
// instead of the current one; `data-g-raw` opts a keycap out.
import { PAD_BUTTONS, PAD_LAYOUTS, PAD_MAPS, glyphFaceSlot, padSlotFor, padWheelFor, physicalKey, physicalButton, nintendoSwap, tokenKey, keyName } from './controls.js';
import { getSettings, onSettingsChange } from './settings.js';
import { onPadChange, padState, activePadIndex } from './gamepad.js';
import { escapeHtml } from './htmlescape.js';
import { touchLabelForToken } from './touchlogic.js';
import { getDevice, onDeviceChange } from './inputdevice.js';
import { padSlotGlyph, inkAttr } from './inputglyphs.js';
import { glyphHtml, BRACE_KEY_RE, BRACE_RUN_RE, groupKeyRuns, endKeyRuns, plainKeyText, keyLabelIcon, labelToken } from './keycap.js';

const SEL = '[data-gk], kbd, .hud-key, .m-kc';
const orig = new WeakMap();
let started = false;

const PS_SHAPES = {
  cross: '<path d="M5 5l10 10M15 5L5 15"/>',
  circle: '<circle cx="10" cy="10" r="5.6"/>',
  square: '<rect x="4.8" y="4.8" width="10.4" height="10.4" rx="0.6"/>',
  triangle: '<path d="M10 4.2l6 10.4H4z"/>',
};
const DPAD = (dir) => '<svg class="pad-dpad" viewBox="0 0 20 20" aria-hidden="true">' +
  '<path class="pd-base" d="M7.5 2h5v5.5H18v5h-5.5V18h-5v-5.5H2v-5h5.5z"/>' +
  (dir ? `<path class="pd-on" d="${{ up: 'M7.5 2h5v5.5h-5z', down: 'M7.5 12.5h5V18h-5z', left: 'M2 7.5h5.5v5H2z', right: 'M12.5 7.5H18v5h-5.5z' }[dir]}"/>` : '') + '</svg>';

const SLOT_WORDS = { a: 'onderste knop', b: 'rechter knop', x: 'linker knop', y: 'bovenste knop', lb: 'linker bumper', rb: 'rechter bumper', lt: 'linker trigger', rt: 'rechter trigger', ls: 'linker stick indrukken', rs: 'rechter stick indrukken', lstick: 'linker stick', rstick: 'rechter stick', up: 'D-pad omhoog', down: 'D-pad omlaag', left: 'D-pad links', right: 'D-pad rechts', dpad: 'D-pad', view: 'View-knop', start: 'Menu-knop' };

// De knop die nu op een plek zit (#151): dezelfde herbinding (controls.js physicalButton)
// en dezelfde Nintendo-wissel als gamepad.js, zodat een hint of een scherm dat zelf een
// knop leest precies de knop aanwijst die de speler indrukt.
export function padButton(slot, family = padState().family, binds = getSettings().padBinds) {
  return nintendoSwap(physicalButton(binds, slot), family);
}
// De plek van die knop in Gamepad.buttons (de W3C-standaardvolgorde).
export const padButtonIndex = (slot, family, binds) => PAD_BUTTONS.indexOf(padButton(slot, family, binds));

// De pad van speler 1 (gamepad.js kiest hem, ook met twee spelers). Voor de weinige
// schermen die zelf een knop lezen omdat de padlaag er geen toets voor stuurt: het
// reispanel, de reisscène en de heli-run. Null zolang er geen pad is.
export function playerPad() {
  if (typeof navigator === 'undefined' || !navigator.getGamepads) return null;
  const i = activePadIndex();
  if (i < 0) return null;
  try {
    const pad = navigator.getGamepads()[i];
    return pad && pad.connected ? pad : null;
  } catch (e) { return null; }
}

// Inner HTML of a controller glyph for a slot ('a', 'rt', 'lstick', 'up', ...).
// `slot` is de knop zelf: de aanroeper geeft wat de speler moet indrukken (de hint via
// physicalButton, de herbindlijst de opgeslagen knop).
export function padGlyphInner(slot, family = padState().family) {
  const L = PAD_LAYOUTS[family] || PAD_LAYOUTS.xbox;
  const label = SLOT_WORDS[slot] || slot;
  // the glyph font (Kenney Input Prompts, game/fonts/input) draws the same button per controller family; slots it lacks keep the cap below
  const kn = padSlotGlyph(slot, family, ['a', 'b', 'x', 'y'].includes(slot) ? L[glyphFaceSlot(slot, family)] : '');
  if (kn) {
    const kind = ['a', 'b', 'x', 'y'].includes(slot) ? 'pad-face' : ['up', 'down', 'left', 'right', 'dpad'].includes(slot) ? 'pad-dp' : /^[lr]?s(tick)?$/.test(slot) ? 'pad-stick' : 'pad-sh';
    const word = SLOT_WORDS[['a', 'b', 'x', 'y'].includes(slot) ? glyphFaceSlot(slot, family) : slot] || label;
    return `<span class="pad-g pad-kn ${kind}" data-set="${kn.set}"${inkAttr(kn.set, kn.char)} data-slot="${slot}" role="img" aria-label="${word}">${kn.char}</span>`;
  }
  if (['a', 'b', 'x', 'y'].includes(slot)) {
    const t = L[glyphFaceSlot(slot, family)];
    const inner = PS_SHAPES[t] ? `<svg viewBox="0 0 20 20" aria-hidden="true">${PS_SHAPES[t]}</svg>` : t;
    return `<span class="pad-g pad-face" data-slot="${slot}" role="img" aria-label="${SLOT_WORDS[glyphFaceSlot(slot, family)]}">${inner}</span>`;
  }
  if (['up', 'down', 'left', 'right', 'dpad'].includes(slot)) return `<span class="pad-g pad-dp" role="img" aria-label="${label}">${DPAD(slot === 'dpad' ? '' : slot)}</span>`;
  if (slot === 'lstick' || slot === 'rstick' || slot === 'ls' || slot === 'rs') {
    const t = slot === 'ls' || slot === 'rs' ? L[slot] : L[slot];
    return `<span class="pad-g pad-stick${slot === 'ls' || slot === 'rs' ? ' press' : ''}" role="img" aria-label="${label}">${t}</span>`;
  }
  return `<span class="pad-g pad-sh" role="img" aria-label="${label}">${L[slot] || slot}</span>`;
}


function tokenOf(el) {
  if (el.dataset.gk) return el.dataset.gk;
  const t = (orig.get(el) ?? el.textContent).trim();
  return t ? t.replace(/<[^>]*>/g, '') : '';
}

function ctxOf(el) {
  const host = el.closest('[data-pad-ctx]');
  return host ? host.dataset.padCtx : padState().ctx;
}

function render(el) {
  if (el.closest('[data-g-raw]') || el.closest('.pad-g')) return;
  // a glyph inside a glyphHtml wrapper is handled by its wrapper
  if (!el.dataset.gk && el.parentElement && el.parentElement.closest('[data-gk]')) return;
  if (el.__gHtml !== undefined && el.innerHTML !== el.__gHtml) orig.delete(el); // someone rewrote it
  if (!orig.has(el)) orig.set(el, el.innerHTML);
  const base = orig.get(el);
  const token = el.dataset.gk || labelToken(stripTags(base)) || stripTags(base).trim();
  const pad = padState();
  let html = base;
  let hide = false;
  let slot = '';
  let glyphed = false;
  let wheel = false;
  if (token && document.documentElement.classList.contains('touch-play') && !pad.active && getDevice() !== 'kb') {
    // touch: say which on-screen button does it (no label: no button, hide)
    const label = touchLabelForToken(token, document.documentElement.dataset.touchCtx || 'foot');
    if (label) { html = label; slot = ''; } else hide = true;
  } else if (pad.active && token) {
    const ctx = ctxOf(el);
    slot = padSlotFor(token, ctx) || '';
    // de knop die de speler moet indrukken: na het omwisselen van A en B ligt de actie
    // van 'a' op de andere knop, en de hint wijst die aan (#151)
    if (slot) html = padGlyphInner(physicalButton(getSettings().padBinds, slot), pad.family);
    else if (padWheelFor(token, ctx)) {
      // geen eigen knop in deze situatie, wel een plek in het acties-wiel: de glyph van Overzicht met "houd" erbij (ds-keycap.css .is-wiel)
      slot = 'view'; wheel = true;
      html = padGlyphInner(physicalButton(getSettings().padBinds, 'view'), pad.family);
    } else hide = true;
    // driving: WASD is the triggers plus the stick
    if (token === 'WASD' && PAD_MAPS[ctx] && PAD_MAPS[ctx].stick === 'steer') html = ['rt', 'lt', 'lstick'].map((s) => padGlyphInner(physicalButton(getSettings().padBinds, s), pad.family)).join('');
  } else if (token) {
    // keyboard: a rebound key shows the key it is on now; a plain text label ('Esc', 'Klik', '←') becomes its icon
    let label = null;
    if (!el.dataset.gk) {
      const canon = tokenKey(token);
      const phys = physicalKey(getSettings().keyBinds, canon);
      if (phys !== canon) { label = keyName(phys); html = label; }
    }
    if (!/</.test(base)) {
      const g = keyLabelIcon(label !== null ? label : stripTags(base));
      if (g) { html = g; glyphed = true; }
    }
  }
  if (el.innerHTML !== html) el.innerHTML = html;
  el.__gHtml = el.innerHTML;
  if (glyphed) el.classList.add('is-kbg'); else if (el.__kbg) el.classList.remove('is-kbg');
  el.__kbg = glyphed;
  el.classList.toggle('is-pad', !!slot);
  el.classList.toggle('is-wiel', wheel);
  el.classList.toggle('pad-none', hide);
  el.dataset.gslot = wheel ? 'wiel' : slot;
  const prev = el.previousElementSibling && el.previousElementSibling.matches('.pm-k-sep') ? el.previousElementSibling.previousElementSibling : el.previousElementSibling;
  if (slot && prev && prev.dataset && prev.dataset.gslot === (wheel ? 'wiel' : slot)) el.classList.add('pad-none');
}

function stripTags(s) {
  return String(s).replace(/<[^>]*>/g, '');
}

// Safety net: a {TOKEN} that reaches the screen through textContent, aria-label or title still becomes a key icon (text) or the key name (attribute).
// What goes through keyTextHtml has no braces left; this catches the rest and leaves code, inputs and [data-g-raw] alone.
const SKIP_TAG = /^(SCRIPT|STYLE|TEXTAREA|INPUT|CODE|PRE|SELECT|OPTION)$/;
const HAS_BRACE = /\{[A-Z0-9]+\}/;
function sweepTokens(root) {
  if (typeof document === 'undefined' || !root || root.nodeType === undefined) return 0;
  let n = 0;
  const base = root.nodeType === 1 ? root : root.parentElement;
  if (base && (SKIP_TAG.test(base.tagName) || (base.closest && base.closest('[data-g-raw]')))) return 0;
  if (root.nodeType === 3) return sweepText(root);
  if (root.nodeType !== 1) return 0;
  const w = document.createTreeWalker(root, 4, { acceptNode: (t) => (HAS_BRACE.test(t.nodeValue) && t.parentElement && !SKIP_TAG.test(t.parentElement.tagName) && !t.parentElement.closest('[data-g-raw]') ? 1 : 2) });
  const list = [];
  while (w.nextNode()) list.push(w.currentNode);
  for (const t of list) n += sweepText(t);
  for (const el of [root, ...root.querySelectorAll('[aria-label],[title]')]) {
    for (const a of ['aria-label', 'title']) {
      const v = el.getAttribute && el.getAttribute(a);
      if (v && HAS_BRACE.test(v)) { const p = plainKeyText(v); if (p !== v) { el.setAttribute(a, p); n++; } }
    }
  }
  return n;
}
function sweepText(t) {
  const v = t.nodeValue;
  BRACE_KEY_RE.lastIndex = 0;
  if (!BRACE_KEY_RE.test(v)) return 0;
  BRACE_KEY_RE.lastIndex = 0;
  const span = document.createElement('span');
  const esc = escapeHtml(v);
  span.innerHTML = endKeyRuns(groupKeyRuns(esc, BRACE_RUN_RE).replace(BRACE_KEY_RE, (m, k) => glyphHtml(k)));
  t.replaceWith(...span.childNodes);
  return 1;
}

export function refreshGlyphs(scope = document) {
  if (typeof document === 'undefined') return;
  for (const el of scope.querySelectorAll(SEL)) render(el);
}

export function initGlyphs() {
  if (started || typeof document === 'undefined') return;
  started = true;
  // Het glyph-font laden vóór de eerste weergave en daarna elk glyph opnieuw tekenen: een toets is nooit een leeg of zwart vakje (font-display: block in fonts.css).
  if (document.fonts && document.fonts.load) {
    Promise.all(['GDE Toetsen', 'GDE Knoppen A', 'GDE Knoppen B', 'GDE Knoppen Deck', 'GDE Knoppen Algemeen', 'GDE Aanraking'].map((f) => document.fonts.load('24px "' + f + '"').catch(() => null)))
      .then(() => { document.documentElement.classList.add('glyph-font-ready'); refreshGlyphs(); }).catch(() => {});
  }
  let queued = new Set();
  let timer = 0;
  const flush = () => {
    timer = 0;
    const list = queued;
    queued = new Set();
    for (const el of list) if (el.isConnected) render(el);
  };
  const mo = new MutationObserver((recs) => {
    for (const r of recs) {
      if (r.type === 'characterData') sweepTokens(r.target); else for (const n of r.addedNodes) sweepTokens(n);
      const t = r.target.nodeType === 1 ? r.target : r.target.parentElement;
      if (t) {
        const own = t.closest(SEL);
        if (own && own.__gHtml !== own.innerHTML) queued.add(own);
      }
      for (const n of r.addedNodes) {
        if (n.nodeType !== 1) continue;
        if (n.matches(SEL)) queued.add(n);
        if (n.firstElementChild) for (const el of n.querySelectorAll(SEL)) queued.add(el);
      }
    }
    if (queued.size && !timer) timer = requestAnimationFrame(flush);
  });
  mo.observe(document.body, { childList: true, subtree: true, characterData: true });
  sweepTokens(document.body);
  if (document.title) document.title = plainKeyText(document.title);
  onPadChange(() => refreshGlyphs());
  onDeviceChange(() => refreshGlyphs());
  onSettingsChange((s, key) => { if (key === 'keyBinds') refreshGlyphs(); });
}
