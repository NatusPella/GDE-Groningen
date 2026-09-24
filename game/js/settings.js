// Player settings, persisted per browser. Modules read getSettings() and
// subscribe with onSettingsChange() to apply changes live.

const STORAGE_KEY = 'gte-settings';
const SETTINGS_VERSION = 2;

export const QUALITY_PRESETS = {
  laag: { pixelRatio: 1, shadows: false, shadowMapSize: 1024 },
  middel: { pixelRatio: 1.5, shadows: true, shadowMapSize: 1024 },
  hoog: { pixelRatio: 2, shadows: true, shadowMapSize: 2048 },
};

const DEFAULTS = {
  masterVolume: 1,
  musicVolume: 1,
  sfxVolume: 1,
  quality: 'hoog',
  shadows: true,
  fov: 64,
  cameraDistance: 1,
  showMinimap: true,
  showHints: true,
  showFog: true,
  cinematicMoments: true,
  drawDistance: 'ver',
  mouseSensitivity: 1,
  invertY: false,
};

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    const out = { ...DEFAULTS };
    for (const k of Object.keys(DEFAULTS)) {
      if (typeof raw[k] === typeof DEFAULTS[k]) out[k] = raw[k];
    }
    if (!QUALITY_PRESETS[out.quality]) out.quality = DEFAULTS.quality;
    // v2 made the long view distance the default; older saves stored the
    // previous default without the player ever choosing it
    if (raw.v !== SETTINGS_VERSION) out.drawDistance = DEFAULTS.drawDistance;
    return out;
  } catch (e) {
    return { ...DEFAULTS };
  }
}

const settings = load();
const listeners = new Set();

export function getSettings() {
  return settings;
}

export function setSetting(key, value) {
  if (!(key in DEFAULTS) || settings[key] === value) return;
  settings[key] = value;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...settings, v: SETTINGS_VERSION })); } catch (e) { /* ignore */ }
  applyHudClasses();
  for (const cb of listeners) cb(settings, key);
}

export function resetSettings() {
  for (const k of Object.keys(DEFAULTS)) setSetting(k, DEFAULTS[k]);
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
