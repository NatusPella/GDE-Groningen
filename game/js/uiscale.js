// HUD scale. The HUD is laid out in CSS px for a 1440x900 window; on bigger
// windows (1080p, 1440p, 4K at 100% OS scaling) it grows with the window so
// text keeps the same share of the screen, times the player's
// "Grootte interface" setting. Exposed as --ui on <html>; the HUD roots use
// it as CSS zoom, so inside them vw/vh lengths must be divided by var(--ui).
// OS/retina scaling already shrinks innerHeight, so devicePixelRatio only
// matters for canvas backing stores (hudPixelRatio).
import { getSettings, onSettingsChange } from './settings.js';

const BASE_W = 1440;
const BASE_H = 900;

let scale = 0;
const listeners = new Set();

export function getUiScale() {
  return scale || 1;
}

// Device pixels per HUD px, for crisp canvases inside the zoomed HUD.
export function hudPixelRatio() {
  return (window.devicePixelRatio || 1) * getUiScale();
}

export function onUiScaleChange(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function compute() {
  const auto = Math.max(1, Math.min(window.innerHeight / BASE_H, window.innerWidth / BASE_W));
  const user = Number(getSettings().uiScale) || 1;
  return Math.round(Math.min(4, Math.max(0.8, auto * user)) * 1000) / 1000;
}

function apply() {
  const s = compute();
  if (s === scale) return;
  scale = s;
  document.documentElement.style.setProperty('--ui', String(s));
  for (const cb of listeners) cb(s);
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  apply();
  window.addEventListener('resize', apply);
  onSettingsChange((st, key) => { if (key === 'uiScale') apply(); });
}
