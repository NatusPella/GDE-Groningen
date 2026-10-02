// Map layer visibility: one switch per legend category, shared by the full
// map and the minimap (the minimap only draws the nearest few of each).
// Player, the goal, the route, the story's mission and police are always
// drawn and have no switch. Klussen (passed missions) start switched off:
// missions outside the story only show once they are the player's goal.
const STORAGE_KEY = 'gte-map-layers';
const OLD_MINIMAP_KEY = 'gte-minimap-layers';
const ALWAYS_ON = new Set(['route', 'userWaypoint', 'police', 'mission']);
const DEFAULT_OFF = new Set(['klussen']);

let layers = null;

function load() {
  layers = {};
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    if (raw && typeof raw === 'object') {
      for (const [k, v] of Object.entries(raw)) if (typeof v === 'boolean' && !ALWAYS_ON.has(k)) layers[k] = v;
    }
  } catch (e) { /* ignore */ }
  // the separate minimap switches are gone: what showed on the big map now shows on both
  try { localStorage.removeItem(OLD_MINIMAP_KEY); } catch (e) { /* ignore */ }
}

export function layerOn(key) {
  if (!layers) load();
  if (ALWAYS_ON.has(key)) return true;
  return DEFAULT_OFF.has(key) ? layers[key] === true : layers[key] !== false;
}

export function setLayer(key, on) {
  if (!layers) load();
  if (ALWAYS_ON.has(key)) return;
  layers[key] = !!on;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(layers)); } catch (e) { /* ignore */ }
}

export const minimapShows = layerOn;
