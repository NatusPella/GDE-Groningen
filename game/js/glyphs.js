// Keycaps follow the player's controls. Every on-screen key hint (`.hud-key`,
// `<kbd>`, and prompts.js glyphHtml output, which carries `data-gk`) shows
// the rebound key when the keyboard is in use, and the controller button
// for that key in the current situation when a controller was used last
// (gamepad.js). The original content is kept and put back on the switch,
// so modules that write hints need to know nothing about this. Inside an
// element with `data-pad-ctx` (the Besturing table) that situation is used
// instead of the current one; `data-g-raw` opts a keycap out.
import { PAD_LAYOUTS, PAD_MAPS, glyphFaceSlot, padSlotFor, physicalKey, tokenKey, keyName } from './controls.js';
import { getSettings, onSettingsChange } from './settings.js';
import { onPadChange, padState } from './gamepad.js';
import { touchLabelForToken } from './touchlogic.js';
import { getDevice, onDeviceChange } from './inputdevice.js';

const SEL = '[data-gk], kbd, .hud-key';
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

// Inner HTML of a controller glyph for a slot ('a', 'rt', 'lstick', 'up', ...).
export function padGlyphInner(slot, family = padState().family) {
  const L = PAD_LAYOUTS[family] || PAD_LAYOUTS.xbox;
  const label = SLOT_WORDS[slot] || slot;
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
  const token = el.dataset.gk || stripTags(base).trim();
  const pad = padState();
  let html = base;
  let hide = false;
  let slot = '';
  if (token && document.documentElement.classList.contains('touch-play') && !pad.active && getDevice() !== 'kb') {
    // touch: say which on-screen button does it (no label: no button, hide)
    const label = touchLabelForToken(token, document.documentElement.dataset.touchCtx || 'foot');
    if (label) { html = label; slot = ''; } else hide = true;
  } else if (pad.active && token) {
    const ctx = ctxOf(el);
    slot = padSlotFor(token, ctx) || '';
    if (slot) html = padGlyphInner(slot, pad.family);
    else hide = true;
    // driving: WASD is the triggers plus the stick
    if (token === 'WASD' && PAD_MAPS[ctx] && PAD_MAPS[ctx].stick === 'steer') html = ['rt', 'lt', 'lstick'].map((s) => padGlyphInner(s, pad.family)).join('');
  } else if (token && !el.dataset.gk) {
    const canon = tokenKey(token);
    const phys = physicalKey(getSettings().keyBinds, canon);
    if (phys !== canon) html = keyName(phys);
  }
  if (el.innerHTML !== html) el.innerHTML = html;
  el.__gHtml = el.innerHTML;
  el.classList.toggle('is-pad', !!slot);
  el.classList.toggle('pad-none', hide);
  el.dataset.gslot = slot;
  const prev = el.previousElementSibling && el.previousElementSibling.matches('.pm-k-sep') ? el.previousElementSibling.previousElementSibling : el.previousElementSibling;
  if (slot && prev && prev.dataset && prev.dataset.gslot === slot) el.classList.add('pad-none');
}

function stripTags(s) {
  return String(s).replace(/<[^>]*>/g, '');
}

export function refreshGlyphs(scope = document) {
  if (typeof document === 'undefined') return;
  for (const el of scope.querySelectorAll(SEL)) render(el);
}

export function initGlyphs() {
  if (started || typeof document === 'undefined') return;
  started = true;
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
  onPadChange(() => refreshGlyphs());
  onDeviceChange(() => refreshGlyphs());
  onSettingsChange((s, key) => { if (key === 'keyBinds') refreshGlyphs(); });
}
