// Neighbour villages on the maps (#237): the towns and villages just outside
// the province from game/borderplaces.json (scripts/world/fetch_border_places.py,
// OpenStreetMap contributors, ODbL), as dimmed labels. Names and positions
// only; they are not places in the game (nothing to hover or teleport to).
import { wgsToWorld } from './rdnew.js';
import { regionAt, regionVersion } from './regions.js';
import { neighbourPlaces, pickNeighbours } from './mapedge.js';

let rows = null;
let loading = false;
let cache = { version: -1, list: [] };

function load() {
  if (rows || loading) return;
  loading = true;
  fetch(new URL('borderplaces.json', location.href).href)
    .then((r) => (r.ok ? r.json() : null))
    .then((j) => { rows = Array.isArray(j) ? j : []; })
    .catch(() => { rows = []; });
}

function list() {
  if (!rows) { load(); return []; }
  const v = regionVersion();
  if (cache.version !== v) cache = { version: v, list: neighbourPlaces(rows, wgsToWorld, regionAt) };
  return cache.list;
}

// The labels for a window: [{ name, kind, x, y, region }]; `taken` the positions
// of labels that are there already; [] until the file is in.
export function borderPlaceLabels(x0, y0, x1, y1, taken = [], opts = {}) {
  const all = list();
  return all.length ? pickNeighbours(all, [x0, y0, x1, y1], taken, opts) : [];
}
