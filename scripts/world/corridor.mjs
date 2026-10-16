// The F1 proefstrook (docs/PROVINCIE-PLAN.md 5, F1): Stad -> Delfzijl ->
// Eemshaven. Which tiles it is, which places lie on it and which local cache
// has data for each tile. Places come from the facilities cache
// (data/facilities_raw.json.gz, the province's place nodes), so the corridor
// follows the real villages; Eemshaven has no place node and is the mean of
// the cached POIs addressed there.
//   node scripts/world/corridor.mjs            # summary + coverage
//   node scripts/world/corridor.mjs --json     # the tile list
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { wgsToWorld, worldToWgs } from '../../game/js/rdnew.js';
import { TILE_M, tileIndexOf, tileOrigin, tileKey } from '../../game/js/gdt.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// Each line runs through its places in order; `r` is the half width of the
// strip in metres. The rail lines and the roads that carry the trip.
export const LINES = [
  { id: 'spoor-delfzijl', kind: 'rail', name: 'Groningen - Delfzijl', r: 2500,
    via: ['Groningen', 'Bedum', 'Stedum', 'Loppersum', 'Appingedam', 'Delfzijl'] },
  { id: 'spoor-eemshaven', kind: 'rail', name: 'Groningen - Roodeschool - Eemshaven', r: 1800,
    via: ['Groningen', 'Sauwerd', 'Winsum', 'Baflo', 'Warffum', 'Usquert', 'Uithuizen', 'Uithuizermeeden', 'Roodeschool', 'Oudeschip', 'Eemshaven'] },
  { id: 'n360', kind: 'road', name: 'N360 Groningen - Ten Boer - Appingedam - Delfzijl', r: 2000,
    via: ['Groningen', 'Ten Boer', 'Garrelsweer', 'Wirdum', 'Appingedam', 'Delfzijl'] },
  { id: 'a7', kind: 'road', name: 'A7 Groningen - Hoogezand - Zuidbroek', r: 1500,
    via: ['Groningen', 'Hoogezand', 'Sappemeer', 'Zuidbroek'] },
  { id: 'n33', kind: 'road', name: 'N33 Zuidbroek - Appingedam - Eemshaven', r: 1500,
    via: ['Zuidbroek', 'Siddeburen', 'Tjuchem', 'Appingedam', 'Oosterwijtwerd', 'Holwierde', 'Bierum', 'Spijk', 'Eemshaven'] },
  { id: 'n362', kind: 'road', name: 'Delfzijl - Farmsum - Termunterzijl (Eemskust)', r: 1500,
    via: ['Delfzijl', 'Farmsum', 'Weiwerd', 'Borgsweer', 'Termunterzijl'] },
];

// The towns of the trip: a disc of tiles round each, and the places the game
// names (docs: Appingedam, Delfzijl, Winsum, Uithuizen, Eemshaven).
export const TOWNS = [
  { name: 'Appingedam', r: 3000 }, { name: 'Delfzijl', r: 3500 }, { name: 'Winsum', r: 2000 },
  { name: 'Uithuizen', r: 2000 }, { name: 'Eemshaven', r: 3500 },
];

const gunzipJson = (f) => JSON.parse(zlib.gunzipSync(fs.readFileSync(f)).toString('utf8'));

// name -> { x, y, lat, lon, kind } from the cached place nodes
export function loadPlaces(root = ROOT) {
  const raw = gunzipJson(path.join(root, 'data/facilities_raw.json.gz'));
  const out = new Map();
  const ems = [];
  for (const e of raw.elements) {
    const t = e.tags || {};
    if (e.type === 'node' && t.place && t.name && e.lon < 7.15 && e.lat < 53.6 && !out.has(t.name)) {
      const [x, y] = wgsToWorld(e.lat, e.lon);
      out.set(t.name, { name: t.name, kind: t.place, lat: e.lat, lon: e.lon, x, y, pop: +t.population || 0 });
    }
    if (t['addr:city'] === 'Eemshaven') {
      const lat = e.lat !== undefined ? e.lat : e.bounds && (e.bounds.minlat + e.bounds.maxlat) / 2;
      const lon = e.lon !== undefined ? e.lon : e.bounds && (e.bounds.minlon + e.bounds.maxlon) / 2;
      if (lat) ems.push([lat, lon]);
    }
  }
  if (ems.length && !out.has('Eemshaven')) {
    const lat = ems.reduce((a, p) => a + p[0], 0) / ems.length, lon = ems.reduce((a, p) => a + p[1], 0) / ems.length;
    const [x, y] = wgsToWorld(lat, lon);
    out.set('Eemshaven', { name: 'Eemshaven', kind: 'industrial', lat, lon, x, y, pop: 0 });
  }
  return out;
}

function segDist(px, py, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y, L2 = dx * dx + dy * dy;
  const t = L2 ? Math.max(0, Math.min(1, ((px - a.x) * dx + (py - a.y) * dy) / L2)) : 0;
  return Math.hypot(px - a.x - dx * t, py - a.y - dy * t);
}

// The corridor's tiles: every tile whose square comes within a line's strip
// or a town's disc. { keys: sorted keys, tiles: Map key -> { i, j, why } }
export function corridorTiles(places = loadPlaces()) {
  const tiles = new Map();
  const missing = [];
  const add = (i, j, why) => { const k = tileKey(i, j); const t = tiles.get(k) || { i, j, key: k, why: new Set() }; t.why.add(why); tiles.set(k, t); };
  // distance from a point to the tile square, conservatively by its centre + half diagonal
  const half = TILE_M * Math.SQRT1_2;
  const scan = (x0, y0, x1, y1, test, why) => {
    const [i0, j0] = tileIndexOf(x0, y0), [i1, j1] = tileIndexOf(x1, y1);
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
      const [ox, oy] = tileOrigin(i, j);
      if (test(ox + TILE_M / 2, oy + TILE_M / 2)) add(i, j, why);
    }
  };
  for (const L of LINES) {
    const P = L.via.map((n) => places.get(n) || (missing.push(n), null)).filter(Boolean);
    for (let k = 0; k < P.length - 1; k++) {
      const a = P[k], b = P[k + 1];
      scan(Math.min(a.x, b.x) - L.r - TILE_M, Math.min(a.y, b.y) - L.r - TILE_M, Math.max(a.x, b.x) + L.r + TILE_M, Math.max(a.y, b.y) + L.r + TILE_M,
        (cx, cy) => segDist(cx, cy, a, b) <= L.r + half * 0.5, L.id);
    }
  }
  for (const T of TOWNS) {
    const p = places.get(T.name);
    if (!p) { missing.push(T.name); continue; }
    scan(p.x - T.r - TILE_M, p.y - T.r - TILE_M, p.x + T.r + TILE_M, p.y + T.r + TILE_M, (cx, cy) => Math.hypot(cx - p.x, cy - p.y) <= T.r + half * 0.5, 'town:' + T.name);
  }
  const keys = [...tiles.keys()].sort();
  return { keys, tiles, missing: [...new Set(missing)] };
}

// Which local source has data for a tile: 'city' (the packed city tiles),
// 'ommeland' (data/ommeland_raw.json.gz: roads, rail, water, places with full
// geometry, buildings as boxes), 'corridor' (data/world/corridor/*.json.gz,
// scripts/world/fetch_corridor.py: everything with full geometry) or null.
export function tileSources(root = ROOT) {
  const om = gunzipJson(path.join(root, 'data/ommeland_raw.json.gz')).bbox; // s, w, n, e
  const corDir = path.join(root, 'data/world/corridor');
  const cor = fs.existsSync(corDir) ? fs.readdirSync(corDir).filter((f) => f.endsWith('.json.gz')).map((f) => {
    const m = /^c(-?\d+)_(-?\d+)/.exec(f);
    return m ? `${m[1]}_${m[2]}` : null;
  }).filter(Boolean) : [];
  const corPacks = new Set(cor);
  const inBox = (lat, lon, [s, w, n, e]) => lat >= s && lat <= n && lon >= w && lon <= e;
  return (i, j, cityKeys = new Set()) => {
    const k = tileKey(i, j);
    if (cityKeys.has(k)) return 'city';
    if (corPacks.has(packOf(i, j))) return 'corridor';
    const [ox, oy] = tileOrigin(i, j);
    const corners = [[ox, oy], [ox + TILE_M, oy], [ox, oy + TILE_M], [ox + TILE_M, oy + TILE_M]].map(([x, y]) => worldToWgs(x, y));
    if (corners.every(([la, lo]) => inBox(la, lo, om))) return 'ommeland';
    if (corners.some(([la, lo]) => inBox(la, lo, om))) return 'ommeland-part';
    return null;
  };
}

// fetch_corridor.py writes one cache file per 8 x 8 km pack: c<pi>_<pj>.json.gz
export const packOf = (i, j) => `${Math.floor(i / 8)}_${Math.floor(j / 8)}`;

// The lat/lon box of each pack's corridor tiles, for the fetch.
export function fetchBoxes(keys, tiles) {
  const packs = new Map();
  for (const k of keys) {
    const t = tiles.get(k);
    const p = packOf(t.i, t.j);
    const [ox, oy] = tileOrigin(t.i, t.j);
    const ll = [[ox, oy], [ox + TILE_M, oy + TILE_M], [ox, oy + TILE_M], [ox + TILE_M, oy]].map(([x, y]) => worldToWgs(x, y));
    const b = packs.get(p) || { pack: p, s: 90, w: 180, n: -90, e: -180, tiles: [] };
    for (const [la, lo] of ll) { b.s = Math.min(b.s, la); b.n = Math.max(b.n, la); b.w = Math.min(b.w, lo); b.e = Math.max(b.e, lo); }
    b.tiles.push(k);
    packs.set(p, b);
  }
  return [...packs.values()].sort((a, b) => (a.pack < b.pack ? -1 : 1)).map((b) => ({ ...b, s: +b.s.toFixed(5), w: +b.w.toFixed(5), n: +b.n.toFixed(5), e: +b.e.toFixed(5) }));
}

async function main() {
  const places = loadPlaces();
  const { keys, tiles, missing } = corridorTiles(places);
  if (process.argv.includes('--json')) {
    const boxes = fetchBoxes(keys, tiles);
    console.log(JSON.stringify({ tiles: keys, packs: boxes }));
    return;
  }
  const src = tileSources();
  let city = new Set();
  const idx = path.join(ROOT, 'game/world/index.json');
  if (fs.existsSync(idx)) city = new Set(Object.keys(JSON.parse(fs.readFileSync(idx, 'utf8')).tiles));
  const by = {};
  for (const k of keys) { const t = tiles.get(k); const s = src(t.i, t.j, city) || 'none'; by[s] = (by[s] || 0) + 1; }
  console.log(`corridor: ${keys.length} tiles (${(keys.length / 3000 * 100).toFixed(0)} % of the province's ~3,000 land tiles), ${fetchBoxes(keys, tiles).length} packs`);
  console.log(`sources: ${Object.entries(by).map(([k, v]) => `${k} ${v}`).join(', ')}`);
  if (missing.length) console.log(`places not in the cache: ${missing.join(', ')}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) await main();
