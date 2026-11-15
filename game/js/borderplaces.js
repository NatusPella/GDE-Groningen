// Neighbour villages on the maps (#237): the towns and villages just outside
// the province from game/borderplaces.json (scripts/world/fetch_border_places.py,
// OpenStreetMap contributors, ODbL), as dimmed labels. Names and positions
// only; they are not places in the game (nothing to hover or teleport to).
//
// #887: ze zijn wél aanwijsbaar. De hover op een buurdorp of een Waddeneiland
// noemt het object zelf in plaats van het dichtstbijzijnde Groningse dorp.
import { wgsToWorld } from './rdnew.js';
import { regionAt, regionVersion, landRegionAt } from './regions.js';
import { neighbourPlaces, pickNeighbours } from './mapedge.js';

let rows = null;
let loading = false;
let cache = { version: -1, list: [] };
let allCache = { version: -1, list: [] };

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

// Alle buurplaatsen met hun landstreek (ook de eilanden, die op de kaart land
// zijn maar buiten de provinciegrens liggen), voor de hover (#887).
function everyPlace() {
  if (!rows) { load(); return []; }
  const v = regionVersion();
  if (allCache.version !== v) {
    const out = [];
    for (const row of rows) {
      if (!Array.isArray(row) || row.length < 4 || typeof row[0] !== 'string') continue;
      const [x, y] = wgsToWorld(row[2], row[3]);
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      const land = landRegionAt(x, y);
      if (!land || land === 'groningen') continue;
      out.push({ name: row[0], kind: row[1], x, y, region: land });
    }
    allCache = { version: v, list: out };
  }
  return allCache.list;
}

// De buurplaats bij de cursor, of null: het object dat je aanwijst (#887).
export function borderPlaceAt(x, y, radiusM = 800) {
  if (!Number.isFinite(x) || !Number.isFinite(y) || !(radiusM > 0)) return null;
  let best = null, bd = radiusM;
  for (const p of everyPlace()) {
    const d = Math.hypot(p.x - x, p.y - y);
    if (d < bd) { bd = d; best = p; }
  }
  return best;
}
