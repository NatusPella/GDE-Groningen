// HUD scale. The HUD is laid out in CSS px for a 1440x900 window; on bigger
// windows (1080p, 1440p, 4K at 100% OS scaling) it grows with the window so
// text keeps the same share of the screen, times the player's
// "Grootte interface" setting. Exposed as --ui on <html>; the HUD roots use
// it as CSS zoom, so inside them vw/vh lengths must be divided by var(--ui).
// OS/retina scaling already shrinks innerHeight, so devicePixelRatio only
// matters for canvas backing stores (hudPixelRatio).
import { getSettings, onSettingsChange } from './settings.js';
import { uiScaleFor } from './hudlook.js';

let scale = 0;
const listeners = new Set();

export function getUiScale() {
  return scale || 1;
}

// Device pixels per HUD px, for crisp canvases inside the zoomed HUD.
export function hudPixelRatio() {
  return (window.devicePixelRatio || 1) * getUiScale();
}

// Gives a square canvas a px x px backing store. Both sides are checked: a
// fresh canvas is 300x150, so at px 300 (250 HUD px at 1.2x) a width-only
// check kept it 300x150, stretched 2x tall in its square box.
export function sizeSquareCanvas(canvas, px) {
  if (canvas.width === px && canvas.height === px) return false;
  canvas.width = px;
  canvas.height = px;
  return true;
}

export function onUiScaleChange(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function compute() {
  return uiScaleFor(window.innerWidth, window.innerHeight, getSettings().uiScale, document.documentElement.classList.contains('touch-device'));
}

// The pause card (about 600 px tall) must fit between the top and the
// zoomed footer, whatever the interface size: --ui-fit caps its zoom.
const CARD_H = 600;
const FOOT_H = 45;

function apply() {
  const s = compute();
  const fit = Math.max(0.6, (window.innerHeight - FOOT_H * s - 40) / CARD_H);
  document.documentElement.style.setProperty('--ui-fit', fit.toFixed(3));
  if (s === scale) return;
  scale = s;
  document.documentElement.style.setProperty('--ui', String(s));
  for (const cb of listeners) cb(s);
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  apply();
  window.addEventListener('resize', apply);
  // touch.js adds html.touch-device once the game has started: a phone gets a smaller HUD
  window.addEventListener('touchmode', apply);
  onSettingsChange((st, key) => { if (key === 'uiScale') apply(); });
}
