// Accessibility settings that only change how things look: the subtitle
// size and its background box, and the colour-blind palettes. Puts classes
// on <html> (`sub-<size>`, `sub-box`, `cb-<mode>`) and `--sub-scale`, which
// a11y.css uses; canvas and 3D code read markerColors() and redraw on
// onPaletteChange. Node-safe: no DOM at import time.
import { getSettings, onSettingsChange, SUBTITLE_SIZES } from './settings.js';

// Semantic marker colours. The default is the design system; the others
// follow the Okabe-Ito palette, which stays apart for all three kinds of
// colour blindness. Shapes and patterns tell them apart as well (hud_panel.js).
export const PALETTES = {
  uit: { ok: '#3fc97a', danger: '#d93f3f', mission: '#e8c93a', missionActive: '#3fd0ff', user: '#c068ff', job: '#ff9a3c', care: '#ff5fb4', police: '#3f6fd9' },
  deuteranopie: { ok: '#56b4e9', danger: '#d55e00', mission: '#f0e442', missionActive: '#ffffff', user: '#cc79a7', job: '#e69f00', care: '#f0ede4', police: '#0072b2' },
  protanopie: { ok: '#56b4e9', danger: '#ff7f0e', mission: '#f0e442', missionActive: '#ffffff', user: '#cc79a7', job: '#e69f00', care: '#f0ede4', police: '#0072b2' },
  tritanopie: { ok: '#009e73', danger: '#d55e00', mission: '#f0ede4', missionActive: '#ff5fb4', user: '#cc79a7', job: '#e69f00', care: '#56b4e9', police: '#0072b2' },
};

export function markerColors() {
  return PALETTES[getSettings().colorBlind] || PALETTES.uit;
}

export function colorBlindOn() {
  return getSettings().colorBlind !== 'uit';
}

const listeners = new Set();
export function onPaletteChange(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

let cssLoaded = false;
function apply(s, key) {
  if (typeof document === 'undefined') return;
  const html = document.documentElement;
  if (!cssLoaded) {
    cssLoaded = true;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = new URL('./a11y.css', import.meta.url).href;
    document.head.appendChild(link);
  }
  for (const size of Object.keys(SUBTITLE_SIZES)) html.classList.toggle('sub-' + size, s.subtitleSize === size);
  html.style.setProperty('--sub-scale', String(SUBTITLE_SIZES[s.subtitleSize] || 1));
  html.classList.toggle('sub-box', !!s.subtitleBox);
  for (const m of Object.keys(PALETTES)) html.classList.toggle('cb-' + m, s.colorBlind === m && m !== 'uit');
  const p = markerColors();
  for (const [k, v] of Object.entries(p)) html.style.setProperty('--mk-' + k, v);
  if (!key || key === 'colorBlind') for (const cb of listeners) cb(p);
}

export function initA11y() {
  onSettingsChange(apply);
}
