// The output levels of the mix, in one place: the saved volume settings turned
// into the gains that audio.js (world, music, voices) and theme.js (the theme
// song, its own media element outside the Web Audio graph) use.
//
// The saved volume has to hold from the very first sound (#461): the title
// screen, a new game and a slider change all come through here, and a value
// from a settings file can never make the game louder than the slider says.
// Node-safe, no DOM.
export const MASTER_VOLUME = 0.55;   // base of the whole mix
export const MENU_LEVEL = 0.55;      // title screen: the city quieter, no music
export const GMUSIC_VOLUME = 0.85;   // the music bus under the master gain

// the four sliders of Instellingen > Geluid, in menu order
export const VOLUME_KEYS = ['masterVolume', 'musicVolume', 'sfxVolume', 'voiceVolume'];

// 0..1. A numeric string (an old or hand-edited settings file, a preset from
// the address bar) counts as its number instead of silently falling back to
// the default, which used to turn a saved 10% into 100%. Anything unusable
// (empty, NaN, a word) and anything out of range is brought back to the
// default or to the nearest end, so a gain can never leave 0..1.
export function volumeValue(v, fallback = 1) {
  const def = volumeValueOf(fallback);
  if (typeof v === 'string') {
    const t = v.trim();
    if (t === '') return def;
    v = Number(t);
  }
  if (typeof v !== 'number' || !Number.isFinite(v)) return def;
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function volumeValueOf(fallback) {
  const n = typeof fallback === 'number' && Number.isFinite(fallback) ? fallback : 1;
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

// the four volumes of a stored (or half-broken) settings object, with the
// defaults of settings.js for whatever is missing or unusable
export function normalizeVolumes(raw, defaults = {}) {
  const out = {};
  for (const k of VOLUME_KEYS) out[k] = volumeValue(raw ? raw[k] : undefined, defaults[k]);
  return out;
}

// the master gain of the whole output (mute included); `menu` is the quieter
// title screen
export function masterGain(st, { menu = false, muted = false } = {}) {
  if (muted) return 0;
  return MASTER_VOLUME * volumeValue(st && st.masterVolume) * (menu ? MENU_LEVEL : 1);
}

export function musicVolume(st) {
  return volumeValue(st && st.musicVolume);
}

// the music bus (G-Music, scenario loops, bike speakers): its own level times
// the music slider, e.g. musicState.gain in audio.js
export function musicBusGain(st, level = GMUSIC_VOLUME) {
  const l = Number.isFinite(level) ? level : GMUSIC_VOLUME;
  return l * musicVolume(st);
}

// the theme song's media element: the same level as G-Music (master x music)
export const THEME_LEVEL = MASTER_VOLUME * GMUSIC_VOLUME;

export function themeGain(st, { muted = false, ducked = false } = {}) {
  if (muted) return 0;
  return Math.min(1, THEME_LEVEL * volumeValue(st && st.masterVolume) * musicVolume(st) * (ducked ? 0.4 : 1));
}
