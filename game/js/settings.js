// Player settings, persisted per browser. Modules read getSettings() and
// subscribe with onSettingsChange() to apply changes live.

const STORAGE_KEY = 'gte-settings';
const SETTINGS_VERSION = 5;

export const QUALITY_PRESETS = {
  laag: { pixelRatio: 1, shadows: true, shadowMapSize: 1024 },
  middel: { pixelRatio: 1.5, shadows: true, shadowMapSize: 1024 },
  hoog: { pixelRatio: 2, shadows: true, shadowMapSize: 2048 },
};

const DEFAULTS = {
  masterVolume: 1,
  musicVolume: 1,
  sfxVolume: 0.75,
  voiceVolume: 1,
  brightness: 1,
  uiScale: 1,
  quality: 'hoog',
  shadows: true,
  fov: 64,
  cameraDistance: 1,
  showMinimap: true,
  showHints: true,
  reduceMotion: false,
  showFog: true,
  cinematicMoments: true,
  drawDistance: 'ver',
  // render scale (1 = full); autoResolution lowers it and some detail while
  // frames are slow (gfxprofile.js)
  resolution: 1,
  autoResolution: true,
  mouseSensitivity: 1,
  invertY: false,
  autoAim: true,
  drunkFx: 'aan',
  // unused since the attract intro plays at every launch; kept so old
  // settings files load unchanged
  attractSeen: false,
};
const KEEP_ON_RESET = new Set(['attractSeen']);

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    const out = { ...DEFAULTS };
    for (const k of Object.keys(DEFAULTS)) {
      if (typeof raw[k] === typeof DEFAULTS[k]) out[k] = raw[k];
    }
    if (!QUALITY_PRESETS[out.quality]) out.quality = DEFAULTS.quality;
    if (!(out.resolution >= 0.5 && out.resolution <= 1)) out.resolution = DEFAULTS.resolution;
    // v2 made the long view distance the default; older saves stored the
    // previous default without the player ever choosing it
    if ((raw.v || 0) < 2) out.drawDistance = DEFAULTS.drawDistance;
    // v3 split off voices and turned effects down so the music carries;
    // an untouched old 100% effects slider moves to the new default
    if ((raw.v || 0) < 3 && out.sfxVolume === 1) out.sfxVolume = DEFAULTS.sfxVolume;
    // up to v3 'laag' had no shadows whatever the switch said
    if ((raw.v || 0) < 4 && out.quality === 'laag') out.shadows = false;
    // v5 removed the blood-and-limbs switch along with the gore itself:
    // drop the stored value so it does not linger in the settings file
    if ((raw.v || 0) < 5 && 'gore' in raw) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...out, v: SETTINGS_VERSION })); } catch (e) { /* ignore */ }
    }
    return out;
  } catch (e) {
    return { ...DEFAULTS };
  }
}

// ?preset=quality:laag,drawDistance:kort (desktop --preset=...): settings for
// this run only, for perf runs on a throwaway profile
function urlOverrides(out) {
  const m = typeof location !== 'undefined' && /[?&]preset=([^&]+)/.exec(location.search);
  if (!m) return out;
  for (const pair of decodeURIComponent(m[1]).split(',')) {
    const [k, v] = pair.split(':');
    if (!(k in DEFAULTS) || v === undefined) continue;
    const t = typeof DEFAULTS[k];
    out[k] = t === 'number' ? Number(v) : t === 'boolean' ? v === 'true' : v;
  }
  return out;
}

const settings = urlOverrides(load());
const listeners = new Set();

export function getSettings() {
  return settings;
}

export function setSetting(key, value) {
  if (typeof DEFAULTS[key] === 'number' && typeof value === 'string') value = Number(value);
  if (!(key in DEFAULTS) || settings[key] === value) return;
  settings[key] = value;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...settings, v: SETTINGS_VERSION })); } catch (e) { /* ignore */ }
  applyHudClasses();
  for (const cb of listeners) cb(settings, key);
}

// Values for a moment (the benchmark tries the presets), not saved; the
// returned function puts the previous values back.
export function withTempSettings(values) {
  const prev = {};
  const put = (vals) => {
    for (const [k, v] of Object.entries(vals)) {
      if (!(k in DEFAULTS) || settings[k] === v) continue;
      settings[k] = v;
      for (const cb of listeners) cb(settings, k);
    }
  };
  for (const k of Object.keys(values)) prev[k] = settings[k];
  put(values);
  return () => put(prev);
}

export function resetSettings() {
  for (const k of Object.keys(DEFAULTS)) if (!KEEP_ON_RESET.has(k)) setSetting(k, DEFAULTS[k]);
}

export function onSettingsChange(cb) {
  listeners.add(cb);
  cb(settings, null);
  return () => listeners.delete(cb);
}

function applyHudClasses() {
  if (typeof document === 'undefined' || !document.body) return;
  document.body.classList.toggle('hide-minimap', !settings.showMinimap);
  document.body.classList.toggle('hide-hints', !settings.showHints);
}

if (typeof document !== 'undefined') {
  if (document.body) applyHudClasses();
  else document.addEventListener('DOMContentLoaded', applyHudClasses, { once: true });
}
