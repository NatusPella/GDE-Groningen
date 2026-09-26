// Which static map categories also appear on the minimap. The full map shows
// everything its legend has ticked; the minimap only shows the categories
// switched on here, and then only the nearest few close to the player.
const STORAGE_KEY = 'gte-minimap-layers';

export const MINIMAP_DEFAULTS = {
  garage: true,
  shops: true,
  shopsVoertuigen: false,
  shopsWapens: true,
  horeca: false,
  duif: false,
  bijbaan: true,
  trein: true,
  flitspaal: true,
  landmark: false,
};

let prefs = null;

function load() {
  prefs = { ...MINIMAP_DEFAULTS };
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    for (const k of Object.keys(MINIMAP_DEFAULTS)) if (typeof raw[k] === 'boolean') prefs[k] = raw[k];
  } catch (e) { /* ignore */ }
}

export function hasMinimapToggle(key) {
  return key in MINIMAP_DEFAULTS;
}

export function minimapShows(key) {
  if (!prefs) load();
  return prefs[key] === true;
}

export function setMinimapShows(key, on) {
  if (!prefs) load();
  if (!hasMinimapToggle(key)) return;
  prefs[key] = !!on;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs)); } catch (e) { /* ignore */ }
}
