// Small UI motion helpers, one place for the motion spec: the timing tokens
// are CSS custom properties on :root (index.html: --ease-out, --ease-pop,
// --dur-fast/base/slow/bar, keyframes mo-*). Only transform, opacity and bar
// widths animate. "Beweging beperken" (settings reduceMotion) or the OS
// setting put `reduce-motion` on <html>: the tokens go to 0 and these
// helpers jump straight to the end.
import { getSettings, onSettingsChange } from './settings.js';

const COUNT_MS = 400;
const GHOST_HOLD_MS = 250;

let mq = null;

function apply() {
  const on = !!getSettings().reduceMotion || !!(mq && mq.matches);
  document.documentElement.classList.toggle('reduce-motion', on);
}

export function initMotion() {
  if (typeof window === 'undefined') return;
  mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  if (mq && mq.addEventListener) mq.addEventListener('change', apply);
  onSettingsChange((s, key) => { if (key === 'reduceMotion' || !key) apply(); });
  apply();
}

export function reducedMotion() {
  return typeof document !== 'undefined' && document.documentElement.classList.contains('reduce-motion');
}

// Plays a one-shot CSS animation class again (pop, ring, shine).
function replay(el, cls) {
  if (!el || reducedMotion()) return;
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
  el.addEventListener('animationend', () => el.classList.remove(cls), { once: true });
}

export const pop = (el) => replay(el, 'mo-pop');
export const ring = (el) => replay(el, 'mo-ring');
const shine = (el) => replay(el, 'mo-shine');

// Counts a number in el.textContent from its last value to `to` (ease-out).
export function countTo(el, to, fmt = (v) => String(Math.round(v))) {
  if (!el) return;
  const from = Number(el.dataset.moValue);
  el.dataset.moValue = String(to);
  if (!Number.isFinite(from) || from === to || reducedMotion()) { el.textContent = fmt(to); return; }
  const t0 = performance.now();
  const step = (now) => {
    if (el.dataset.moValue !== String(to)) return;
    const k = Math.min(1, (now - t0) / COUNT_MS);
    el.textContent = fmt(from + (to - from) * (1 - (1 - k) ** 3));
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// Bar fills rendered with data-w="0-100": start where they were (or empty)
// and ease to the new width.
export function fillBars(scope, memory) {
  for (const i of scope.querySelectorAll('i[data-w]')) {
    const id = i.dataset.bar || '';
    const w = Number(i.dataset.w) || 0;
    const was = memory && id && memory.has(id) ? memory.get(id) : 0;
    if (memory && id) memory.set(id, w);
    if (reducedMotion() || was === w) { i.style.width = w + '%'; continue; }
    i.style.width = was + '%';
    requestAnimationFrame(() => requestAnimationFrame(() => { i.style.width = w + '%'; }));
  }
}

// A HUD bar with a lighter ghost behind the fill: on a drop the ghost holds
// the old width for a moment, then shrinks, so you see what you lost.
export function setGhostBar(fill, ghost, pct) {
  if (!ghost) { fill.style.width = pct + '%'; return; }
  const prev = Number(ghost.dataset.w);
  fill.style.width = pct + '%';
  ghost.dataset.w = String(pct);
  if (!Number.isFinite(prev) || pct >= prev || reducedMotion()) { ghost.style.transitionDelay = '0ms'; ghost.style.width = pct + '%'; return; }
  ghost.style.transitionDelay = GHOST_HOLD_MS + 'ms';
  ghost.style.width = pct + '%';
}
