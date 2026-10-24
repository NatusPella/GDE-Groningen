import { getSettings, onSettingsChange } from './settings.js';
import { KEYS } from './storagekeys.js';
import { FLAGS } from './devflags.js';
import { themeGain } from './sfx/volume.js';

// The GDE theme song: silent on the title screen (that one sounds like the
// city, audio.js setMenuAudio), starts with Doorgaan / Nieuw spel, plays once
// into the game and then hands over to G-Music, which waits for
// isThemeActive() to end. The benchmark trailer plays it too and rewinds it
// for the real start (stopTheme).

const SRC = './audio/theme/miles_past_the_city_square.mp3';
const MUTE_STORAGE_KEY = KEYS.muted;
const SILENT_MODE = FLAGS.stil;

let el = null;
let state = 'idle'; // idle -> playing -> done
let fadeTimer = null;

function mutedNow() {
  try { return localStorage.getItem(MUTE_STORAGE_KEY) === '1'; } catch (e) { return false; }
}

// ducked under spoken dialogue (the opening montage)
let ducked = false;
export function setThemeDuck(on) {
  ducked = !!on;
  if (el && state === 'playing') el.volume = targetVolume();
}

// The element's volume comes from the same place as the mix (sfx/volume.js):
// master 0.55 x music 0.85, then the saved sliders (#461).
function targetVolume() {
  return themeGain(getSettings(), { muted: mutedNow(), ducked });
}

// Mute (U) lives in audio.js and the persisted flag is polled below; this lets
// audio.js apply it the moment the key is pressed.
export function refreshThemeVolume() {
  if (el) el.volume = targetVolume();
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

// Starts the song from the top: the trailer's soundtrack, and the start of
// play (Doorgaan / Nieuw spel). Called from a click or key, so browsers allow
// it; a blocked start retries on the next gesture.
let wanted = false;
export function kickTheme() {
  if (!el || state === 'done' || SILENT_MODE) return;
  wanted = true;
  if (state === 'idle') { try { el.currentTime = 0; } catch (e) { /* not loaded yet */ } }
  tryStart();
}
export const startTheme = kickTheme;

// Back to silent and rewound: after the benchmark on the title screen.
export function stopTheme() {
  if (!el || state === 'done') return;
  wanted = false;
  el.pause();
  try { el.currentTime = 0; } catch (e) { /* ignore */ }
  state = 'idle';
}

// The opening montage restarts the song so its cuts land on the beat; after
// that the song plays out once into the game. False when it is already over.
export function cueTheme(at = 0) {
  if (!el || state === 'done' || SILENT_MODE) return false;
  try { el.currentTime = at; } catch (e) { return false; }
  el.loop = false;
  wanted = true;
  tryStart();
  return true;
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
  el.loop = false;
  el.addEventListener('ended', finish);
  el.addEventListener('error', finish);
  const onGesture = () => { if (wanted) tryStart(); };
  window.addEventListener('pointerdown', onGesture, true);
  window.addEventListener('keydown', onGesture, true);
  document.addEventListener('visibilitychange', () => {
    if (!el || state !== 'playing') return;
    if (document.hidden) el.pause();
    else el.play().catch(() => {});
  });
  onSettingsChange(() => { if (el) el.volume = targetVolume(); });
  // mute (U) lives in audio.js; poll its persisted flag instead of coupling
  fadeTimer = setInterval(() => {
    if (!el) return;
    if (state === 'playing') el.volume = targetVolume();
  }, 250);
}
