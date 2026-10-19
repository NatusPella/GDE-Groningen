import { normalizeKeyBinds, normalizePadBinds } from './controls.js';
import { migrateSettings, SETTINGS_VERSION } from './savemigrate.js';
import { VIEW_DISTANCES } from './viewdist.js';
import { KEYS } from './storagekeys.js';
import { FLAGS } from './devflags.js';
import { RAGE_CHOICES } from './roadragerules.js';
import { SUBTITLE_CONTRASTS, TEXT_SIZES } from './a11ylogic.js';
import { cleanHelpSetting } from './assist.js';

// Player settings, persisted per browser. Modules read getSettings() and
// subscribe with onSettingsChange() to apply changes live.

const STORAGE_KEY = KEYS.settings;

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
  // which glyphs every hint shows: 'auto' (what you used last), 'keys' or 'pad'
  hintSource: 'auto',
  // touch buttons: 'auto' (on a touch device), 'aan' or 'uit' (touchlogic.js)
  touchControls: 'auto',
  // HUD: 'slim' (default: only what matters now), 'alles', 'minimaal' (hudrules.js)
  hudMode: 'slim',
  // minimap: zoom factor and north-up ('nooit', 'lucht' only flying, 'altijd')
  minimapZoom: 1,
  minimapNorth: 'lucht',
  // short tip cards for new players (onboarding.js)
  onboardingTips: true,
  reduceMotion: false,
  showFog: true,
  cinematicMoments: true,
  // a new wijk: false = a name card with a spoken line, true = the full flyover
  wijkFilm: false,
  gore: true,
  // Zichtafstand (viewdist.js): 'ver', not Hoog's 'heelver', so a first
  // launch on an iGPU laptop stays at 600 m
  drawDistance: 'ver',
  // render scale (1 = full); autoResolution lowers it and some detail while
  // frames are slow (gfxprofile.js)
  resolution: 1,
  autoResolution: true,
  // zuinige modus (framecap.js): 30 beelden per seconde, voor batterij en warmte
  zuinig: false,
  mouseSensitivity: 1,
  invertY: false,
  autoAim: true,
  drunkFx: 'aan',
  // verkeersruzie (roadrage.js): hoe vaak boze bestuurders uitstappen; 'uit', 'weinig', 'normaal' of 'veel'
  ruzie: 'normaal',
  // driving (gearbox.js, drift.js): 'auto' | 'manual' | 'clutch'; the arcade helps are on by default
  shiftMode: 'auto',
  driftAssist: true,
  bikeAssist: true,
  // controls (controls.js): rebound keyboard keys and controller buttons,
  // only the changed ones; the rest of the controller and accessibility
  keyBinds: {},
  padBinds: {},
  padLayout: 'auto',
  padLookSensitivity: 1,
  rumble: true,
  subtitleSize: 'normaal',
  subtitleBox: false,
  // ondertitels op wit-op-zwart met een zwaardere letter ('normaal' | 'hoog'), kaart- en meldingstekst ('normaal' | 'groot' | 'extragroot') en geen schermflitsen (a11y.js)
  subtitleContrast: 'normaal',
  textSize: 'normaal',
  reduceFlash: false,
  // hulp (assist.js, #215): meer tijd, minder voertuigschade, ruimere vliegpoorten, en het aanbod na twee mislukkingen
  helpTime: 'uit',
  helpDamage: 'normaal',
  helpGates: 'normaal',
  helpOffer: true,
  colorBlind: 'uit',
  // unused since the attract intro plays at every launch; kept so old
  // settings files load unchanged
  attractSeen: false,
};
// the Besturing screen has its own "Standaard herstellen" for the bindings
const KEEP_ON_RESET = new Set(['attractSeen', 'keyBinds', 'padBinds']);
export const SHIFT_CHOICES = ['auto', 'manual', 'clutch'];
export const SUBTITLE_SIZES = { klein: 0.85, normaal: 1, groot: 1.25, extragroot: 1.5 };
export const COLOR_BLIND_MODES = ['uit', 'deuteranopie', 'protanopie', 'tritanopie'];
const PAD_LAYOUT_CHOICES = ['auto', 'xbox', 'ps', 'switch', 'deck'];
const HINT_SOURCE_CHOICES = ['auto', 'keys', 'pad'];
const TOUCH_CONTROLS_CHOICES = ['auto', 'aan', 'uit'];

function load() {
  if (typeof localStorage === 'undefined') return { ...DEFAULTS };
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    // older files run through the migrations (savemigrate.js) and are written
    // back once; a file from a newer game is read as it is
    const mig = migrateSettings(JSON.parse(stored || '{}'));
    const raw = mig ? mig.data : JSON.parse(stored);
    const out = { ...DEFAULTS };
    for (const k of Object.keys(DEFAULTS)) {
      if (typeof raw[k] === typeof DEFAULTS[k]) out[k] = raw[k];
    }
    if (!QUALITY_PRESETS[out.quality]) out.quality = DEFAULTS.quality;
    if (!(out.drawDistance in VIEW_DISTANCES)) out.drawDistance = DEFAULTS.drawDistance;
    if (!(out.resolution >= 0.5 && out.resolution <= 1)) out.resolution = DEFAULTS.resolution;
    out.keyBinds = normalizeKeyBinds(out.keyBinds);
    out.padBinds = normalizePadBinds(out.padBinds);
    if (!SUBTITLE_CONTRASTS.includes(out.subtitleContrast)) out.subtitleContrast = DEFAULTS.subtitleContrast;
    if (!(out.textSize in TEXT_SIZES)) out.textSize = DEFAULTS.textSize;
    if (!(out.subtitleSize in SUBTITLE_SIZES)) out.subtitleSize = DEFAULTS.subtitleSize;
    if (!['slim', 'alles', 'minimaal'].includes(out.hudMode)) out.hudMode = DEFAULTS.hudMode;
    if (!['nooit', 'lucht', 'altijd'].includes(out.minimapNorth)) out.minimapNorth = DEFAULTS.minimapNorth;
    if (!(out.minimapZoom >= 0.6 && out.minimapZoom <= 1.6)) out.minimapZoom = DEFAULTS.minimapZoom;
    if (!SHIFT_CHOICES.includes(out.shiftMode)) out.shiftMode = DEFAULTS.shiftMode;
    if (!RAGE_CHOICES.includes(out.ruzie)) out.ruzie = DEFAULTS.ruzie;
    for (const k of ['helpTime', 'helpDamage', 'helpGates']) out[k] = cleanHelpSetting(k, out[k]);
    if (!COLOR_BLIND_MODES.includes(out.colorBlind)) out.colorBlind = DEFAULTS.colorBlind;
    if (!PAD_LAYOUT_CHOICES.includes(out.padLayout)) out.padLayout = DEFAULTS.padLayout;
    if (!HINT_SOURCE_CHOICES.includes(out.hintSource)) out.hintSource = DEFAULTS.hintSource;
    if (!TOUCH_CONTROLS_CHOICES.includes(out.touchControls)) out.touchControls = DEFAULTS.touchControls;
    if (!(out.padLookSensitivity >= 0.3 && out.padLookSensitivity <= 2.5)) out.padLookSensitivity = DEFAULTS.padLookSensitivity;
    if (stored && mig && mig.from < SETTINGS_VERSION) {
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
  if (!FLAGS.preset) return out;
  for (const pair of FLAGS.preset.split(',')) {
    const [k, v] = pair.split(':');
    if (!(k in DEFAULTS) || v === undefined) continue;
    const t = typeof DEFAULTS[k];
    if (t === 'object') continue;
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
