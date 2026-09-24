import { getSettings, onSettingsChange } from './settings.js';

// The GTE VI theme song: starts on the first interaction in the title screen
// (browsers block audio before a user gesture), keeps playing into the game
// and then hands over to G-Music, which waits for isThemePlaying() to end.

const SRC = './audio/theme/miles_past_the_city_square.mp3';
const BASE_VOLUME = 0.55 * 0.5; // same level as G-Music: master 0.55 x music 0.5
const MUTE_STORAGE_KEY = 'gte-muted';
const SILENT_MODE = typeof location !== 'undefined' && new URLSearchParams(location.search).has('stil');

let el = null;
let state = 'idle'; // idle -> playing -> done
let fadeTimer = null;

function mutedNow() {
  try { return localStorage.getItem(MUTE_STORAGE_KEY) === '1'; } catch (e) { return false; }
}

function targetVolume() {
  const st = getSettings();
  return mutedNow() ? 0 : Math.min(1, BASE_VOLUME * st.masterVolume * st.musicVolume);
}

function finish() {
  if (state === 'done') return;
  state = 'done';
  clearInterval(fadeTimer);
  if (el) { el.pause(); el.src = ''; el = null; }
}

function tryStart() {
  if (state !== 'idle' || !el) return;
  el.volume = targetVolume();
  const p = el.play();
  if (p && p.then) {
    p.then(() => { state = 'playing'; }).catch(() => { /* retried on the next gesture */ });
  } else {
    state = 'playing';
  }
}

export function isThemePlaying() {
  return state !== 'done' && !SILENT_MODE && !!el && (state === 'playing' || !el.paused);
}

// Has the theme claimed the music slot? True from load until it ends, so
// G-Music never starts on top of it while the first gesture is pending.
export function isThemeActive() {
  return state !== 'done' && !SILENT_MODE && !!el;
}

export function initTheme() {
  if (SILENT_MODE || el) return;
  el = new Audio(SRC);
  el.preload = 'auto';
  el.addEventListener('ended', finish);
  el.addEventListener('error', finish);
  const onGesture = () => {
    tryStart();
    if (state !== 'idle') {
      window.removeEventListener('pointerdown', onGesture, true);
      window.removeEventListener('keydown', onGesture, true);
    }
  };
  window.addEventListener('pointerdown', onGesture, true);
  window.addEventListener('keydown', onGesture, true);
  document.addEventListener('visibilitychange', () => {
    if (!el || state !== 'playing') return;
    if (document.hidden) el.pause();
    else el.play().catch(() => {});
  });
  onSettingsChange(() => { if (el) el.volume = targetVolume(); });
  // mute (U) lives in audio.js; poll its persisted flag instead of coupling
  fadeTimer = setInterval(() => { if (el && state === 'playing') el.volume = targetVolume(); }, 250);
}
