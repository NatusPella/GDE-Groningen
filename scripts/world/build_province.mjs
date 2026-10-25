// The whole province through the world builder (docs/PROVINCIE-PLAN.md F2):
// every 1 km tile that touches the province of Groningen, plus a buffer
// strip into Friesland, Drenthe and Germany as far as the extract reaches,
// built from the pack caches of scripts/world/extract_province.py (the
// Geofabrik extract) by the same per-tile code as the proefstrook
// (build_corridor.mjs tileBlob -> worldbuilder.js). Pack by pack, so the
// memory stays that of one 8 x 8 km pack.
//
//   node scripts/world/build_province.mjs [--out game/world] [--city <index.json>] [--src data/cache/province] [--no-fill]
//   --terrain puts the AHN rasters of data/world/ahn (fetch_ahn.py --province) in the tiles (RASTER section; #78), as relief (relief.mjs, #269)
//   (--no-fill leaves out the old Ommeland area's corner past the strip, which fillOldExtent builds from data/ommeland_raw.json.gz)
//
// Out: v<pack>-<hash>.gdp packs and index-provincie.json (tiles; the global
// part: places with their districts, stations, train lines over the track,
// bus lines, the coast and border lines, the province outline, the minimap
// base). The city's own tiles (pack_tiles.mjs) are left alone and win.
// Same input, same bytes.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import * as G from '../../game/js/gdt.js';
import * as WB from '../../game/js/worldbuilder.js';
import { wgsToWorld, worldToWgs } from '../../game/js/rdnew.js';
import { edgeFromOsm } from '../../game/js/worldedge.js';
import { features, tileBlob, railRoute, busLines, writeLayer, ommelandBox, loadSources, boxOutlines, urbanField, clipLine } from './build_corridor.mjs';
import { LINES, packOf } from './corridor.mjs';
import { annotateProvinceWater, annotateCityWater } from '../../game/js/waterlevels.js';
import { encodeRoadNet } from '../../game/js/roadgraph.js';
import { Raster, paint, writePyramid, FINE_M } from './province_map.mjs';
import { bakeCityRoutes, railLines } from './cityroutes.mjs';
import { collectFarNodes, finishFarProps } from './farprops.mjs';
import { loadProvinceBag, bagMatcher } from './bag3d.mjs';
import { deriveFeatures } from './derive_tiles.mjs';
import { waterIndex, wetFraction } from './placement_audit.mjs';
import { snapSignals, junctionsOf } from './junction_tiles.mjs';
import { profileFeats, cutZ, cutZt } from './province_profile.mjs';
import { clearPackTrees } from './tegel_schoon.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const PROVINCE_BUILDER = 1;
export const GID0 = 20_000_000;
// how far past the province border tiles are built (the extract's own margin decides the rest)
export const BUFFER_M = 3000;
export const SRC_DIR = process.env.GDE_PROVINCE_SRC ? path.resolve(process.env.GDE_PROVINCE_SRC) : path.join(ROOT, 'data', 'cache', 'province'); // GDE_PROVINCE_SRC: een extract buiten de werkboom (worktrees)
// tile flags: 1 land, 4 built from OSM by the world builder, 8 the old
// Ommeland layers draw it too, 16 outside the province (the buffer), 32 this layer,
// 64 an overlay: the part of a city tile the city's own data leaves empty (its key is 'o' + the tile's)
// A tile in the old Ommeland area (flag 8) that the extract's strip does not reach is filled from
// data/ommeland_raw.json.gz (fillOldExtent), so that every old cell has a tile.
export const FLAG = { LAND: 1, BUILT: 4, OLD: 8, BUFFER: 16, PROVINCE: 32, OVERLAY: 64 };

const gunzipJson = (f) => JSON.parse(zlib.gunzipSync(fs.readFileSync(f)).toString('utf8'));
const r2 = (v) => Math.round(v * 100) / 100;
const r1 = (v) => Math.round(v * 10) / 10;

export const haveProvince = (dir = SRC_DIR) => fs.existsSync(path.join(dir, 'province.json.gz'));

// The buffer strips next to the province: extracts of the neighbouring
// provinces cut to the strip (extract_province.py --near), in
// data/cache/province-<name>/ next to the province's own.
export function bufferDirs(src = SRC_DIR) {
  const base = path.dirname(src), name = path.basename(src);
  if (!fs.existsSync(base)) return [];
  return fs.readdirSync(base).filter((d) => d.startsWith(name + '-') && haveProvince(path.join(base, d))).sort().map((d) => path.join(base, d));
}

// ------------------------------------------------------------- geometry

// Douglas-Peucker on [[x, y]]
export function simplify(P, tol) {
  if (P.length < 3) return P.slice();
  const n = P.length - 1;
  if (P[0][0] === P[n][0] && P[0][1] === P[n][1] && n > 3) {
    // a closed ring: split at the point farthest from its start
    let m = 1, md = -1;
    for (let i = 1; i < n; i++) { const d = Math.hypot(P[i][0] - P[0][0], P[i][1] - P[0][1]); if (d > md) { md = d; m = i; } }
    return simplify(P.slice(0, m + 1), tol).concat(simplify(P.slice(m), tol).slice(1));
  }
  const keep = new Uint8Array(P.length);
  keep[0] = keep[P.length - 1] = 1;
  const stack = [[0, P.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const [ax, ay] = P[a], [bx, by] = P[b];
    const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1;
    let m = -1, md = tol;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs((P[i][0] - ax) * dy - (P[i][1] - ay) * dx) / L;
      if (d > md) { md = d; m = i; }
    }
    if (m > 0) { keep[m] = 1; stack.push([a, m], [m, b]); }
  }
  return P.filter((_, i) => keep[i]);
}

export function pointInRings(x, y, rings) {
  let inside = false;
  for (const R of rings) {
    for (let i = 0, j = R.length - 1; i < R.length; j = i++) {
      const [xi, yi] = R[i], [xj, yj] = R[j];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
  }
  return inside;
}

function distToRings(x, y, rings) {
  let best = Infinity;
  for (const R of rings) {
    for (let i = 0; i < R.length - 1; i++) {
      const a = R[i], b = R[i + 1];
      const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1;
      const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / L2));
      const d = Math.hypot(x - a[0] - dx * t, y - a[1] - dy * t);
      if (d < best) best = d;
    }
  }
  return best;
}

// The province outline in the world frame, simplified to `tol` metres.
export function outline(prov, tol = 25) {
  return (prov.boundary || []).map((ring) => simplify(ring.map(([la, lo]) => wgsToWorld(la, lo).map(r1)), tol));
}

// Every tile whose square touches the province or lies within `buffer` of
// it: Map key -> { i, j, key, buffer } (buffer: outside the province).
export function provinceTiles(rings, buffer = BUFFER_M) {
  const tiles = new Map();
  if (!rings.length) return tiles;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const R of rings) for (const [x, y] of R) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  const [i0, j0] = G.tileIndexOf(x0 - buffer, y0 - buffer), [i1, j1] = G.tileIndexOf(x1 + buffer, y1 + buffer);
  const half = (G.TILE_M / 2) * Math.SQRT2;
  for (let i = i0; i <= i1; i++) {
    for (let j = j0; j <= j1; j++) {
      const [ox, oy] = G.tileOrigin(i, j);
      const cx = ox + G.TILE_M / 2, cy = oy + G.TILE_M / 2;
      const inside = pointInRings(cx, cy, rings);
      const d = inside ? 0 : distToRings(cx, cy, rings);
      if (!inside && d > buffer + half) continue;
      // a tile whose square may reach over the border counts as the province's
      tiles.set(G.tileKey(i, j), { i, j, key: G.tileKey(i, j), buffer: !inside && d > half });
    }
  }
  return tiles;
}

// The border lines of the outline by the land on the other side (worldedge.js
// border): the sea side is the coast's (natural=coastline) and is left out.
// Rough by position, which is enough for a simple edge: Germany east of the
// Dollard, Friesland in the west, Drenthe in the south.
export function borderLines(prov, buffer = BUFFER_M) {
  const kindOf = (la, lo) => {
    if (la > 53.33 && lo > 6.3) return null; // the Wadden Sea and the Eems mouth
    if (lo > 7.03 && la < 53.3) return 'duitsland';
    if (lo < 6.37 || (la > 53.2 && lo < 6.45)) return 'friesland';
    if (la < 53.22) return 'drenthe';
    return null;
  };
  const out = [];
  for (const ring of prov.boundary || []) {
    // orientation: positive signed area (x east, y south) = clockwise on the map
    const W = ring.map(([la, lo]) => wgsToWorld(la, lo));
    let A = 0;
    for (let i = 0; i < W.length - 1; i++) A += W[i][0] * W[i + 1][1] - W[i + 1][0] * W[i][1];
    let cur = null;
    for (let i = 0; i < ring.length; i++) {
      const k = kindOf(ring[i][0], ring[i][1]);
      if (cur && cur.kind === k) { cur.pts.push(W[i]); continue; }
      if (cur && cur.pts.length > 1) out.push(cur);
      cur = k ? { kind: k, pts: cur && cur.kind ? [cur.pts[cur.pts.length - 1], W[i]] : [W[i]] } : null;
    }
    if (cur && cur.pts.length > 1) out.push(cur);
    // the outside is to the left of the direction when the ring runs clockwise on screen (A > 0 with y south)
    for (const L of out) if (L.out === undefined) L.out = A > 0 ? -1 : 1;
  }
  return out.map((L) => ({ kind: L.kind, out: L.out, bufferM: buffer - 500, pts: simplify(L.pts, 10).map(([x, y]) => [r1(x), r1(y)]) }));
}

// built-up weight (0..1) from the extract's building-density grid (the same
// rule as build_corridor.mjs urbanField: 45 buildings in the 3 x 3 cells)
export function urbanFromGrid(urban) {
  const cell = (urban && urban.cell) || 120;
  const n = new Map();
  for (const [i, j, c] of (urban && urban.cells) || []) n.set(i * 100003 + j, c);
  return (x, y) => {
    let s = 0;
    const cx = Math.floor(x / cell), cy = Math.floor(y / cell);
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) s += n.get((cx + i) * 100003 + cy + j) || 0;
    return Math.min(1, s / 45);
  };
}

// ------------------------------------------------------------- lines

// The station stops of a route relation, in order, by name: each stop node
// to the station within 350 m (repeats dropped).
function relationVia(rel, stations) {
  const names = [];
  for (const m of rel.members || []) {
    if (m.type !== 'node' || !/^stop/.test(m.role || '') || m.lat === undefined) continue;
    const [x, y] = wgsToWorld(m.lat, m.lon);
    let best = null, bd = 350;
    for (const [key, s] of stations) { const d = Math.hypot(s.x - x, s.y - y); if (d < bd) { bd = d; best = key; } }
    if (best && names[names.length - 1] !== best) names.push(best);
  }
  return names;
}

// Every train line OSM has a route for, over the track (railRoute: per leg the
// shortest way over the rail graph), one per station sequence in either
// direction; plus the proefstrook's line ids (corridorrail.js extends the
// Ommeland's routes by them).
export function trainLines(trains, railRows, stations) {
  const out = [], seen = new Set();
  for (const rel of trains) {
    const via = relationVia(rel, stations);
    if (via.length < 2) continue;
    const sig = via.join('>'), rev = via.slice().reverse().join('>');
    if (seen.has(sig) || seen.has(rev)) continue;
    seen.add(sig);
    const t = rel.tags || {};
    const r = railRoute(railRows, stations, via);
    if (r.stops.length < 2) continue;
    out.push({ id: `trein-${rel.id}`, name: t.name || `${via[0]} - ${via[via.length - 1]}`, ref: t.ref || '', via, ...r, pts: simplify(r.pts, 1).map(([x, y]) => [r1(x), r1(y)]) });
  }
  for (const L of LINES.filter((q) => q.kind === 'rail')) {
    // the corridor's via lists name villages without a station (Oudeschip): the stations only
    const via = L.via.filter((v) => stations.has(v));
    const r = railRoute(railRows, stations, via);
    out.push({ id: L.id, name: L.name, via, ...r, pts: simplify(r.pts, 1).map(([x, y]) => [r1(x), r1(y)]), missing: L.via.filter((v) => !stations.has(v)) });
  }
  return out.sort((a, b) => (a.id < b.id ? -1 : 1));
}


// the share of a green outline's samples in water from which it is dropped
export const DROWNED_FRAC = 0.8;

// What of a tile's features lies outside the city's data (cityCover.inside):
// buildings, trees, furniture and areas by their middle (and the mean of their corners), roads and rails cut
// into the runs that lie outside (sampled every 10 m).
export function outsideCover(list, inside) {
  const out = [];
  const keep = (x, y) => !inside(x, y);
  for (const f of list) {
    const r = f.row;
    if (f.kind === 'trees') { if (keep(r[0], r[1])) out.push(f); continue; }
    if (f.kind === 'buildings' || f.kind === 'canopies' || f.kind === 'water' || f.kind === 'green' || f.kind === 'parcels') {
      let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity;
      for (const p of r.pts) { if (p[0] < a) a = p[0]; if (p[1] < b) b = p[1]; if (p[0] > c) c = p[0]; if (p[1] > d) d = p[1]; }
      // (the middle of the outline and the mean of its corners: stad_laag.mjs takes a row for the city when either lies in the cover)
      let mx = 0, my = 0;
      for (const p of r.pts) { mx += p[0]; my += p[1]; }
      if (keep((a + c) / 2, (b + d) / 2) && keep(mx / r.pts.length, my / r.pts.length)) out.push(f);
      continue;
    }
    if (f.kind === 'furniture') { if (keep(r.pts[0][0], r.pts[0][1])) out.push(f); continue; }
    // roads, rails
    let run = null;
    const flush = () => { if (run && run.length > 1) out.push({ ...f, row: { ...r, pts: run, ...(r.z ? { z: cutZ(r, run) } : null), ...(r.zt ? { zt: r.zt.length ? cutZt(r, run) : [] } : null) } }); run = null; };
    const P = r.pts;
    for (let i = 0; i < P.length - 1; i++) {
      const [ax, ay] = P[i], [bx, by] = P[i + 1];
      const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / 10));
      for (let t = i === 0 ? 0 : 1; t <= n; t++) {
        const x = ax + ((bx - ax) * t) / n, y = ay + ((by - ay) * t) / n;
        if (keep(x, y)) (run || (run = [])).push(t === n ? P[i + 1] : t === 0 ? P[i] : [Math.round(x * 100) / 100, Math.round(y * 100) / 100]);
        else flush();
      }
    }
    flush();
  }
  return out;
}

// ------------------------------------------------------------- the old extent's gaps

// The tiles of the old Ommeland area (the box of data/ommeland_raw.json.gz)
// that neither the extract's strip nor the city's data reach: Map key -> tile.
export function oldExtentGaps(tiles, cityKeys, root = ROOT) {
  const out = new Map();
  const om = gunzipJson(path.join(root, 'data/ommeland_raw.json.gz')).bbox; // s, w, n, e
  let i0 = Infinity, j0 = Infinity, i1 = -Infinity, j1 = -Infinity;
  for (const [la, lo] of [[om[0], om[1]], [om[0], om[3]], [om[2], om[1]], [om[2], om[3]]]) {
    const [x, y] = wgsToWorld(la, lo);
    const [i, j] = G.tileIndexOf(x, y);
    i0 = Math.min(i0, i - 1); j0 = Math.min(j0, j - 1); i1 = Math.max(i1, i + 1); j1 = Math.max(j1, j + 1);
  }
  // ways that cross the box's edge carry on beyond it (roads, with their points outside): a margin of ~1 km
  const PAD = [0.009, 0.015];
  const inBox = (i, j) => {
    const [ox, oy] = G.tileOrigin(i, j);
    return [[ox, oy], [ox + G.TILE_M, oy], [ox, oy + G.TILE_M], [ox + G.TILE_M, oy + G.TILE_M]].some(([x, y]) => {
      const [la, lo] = worldToWgs(x, y);
      return la >= om[0] - PAD[0] && la <= om[2] + PAD[0] && lo >= om[1] - PAD[1] && lo <= om[3] + PAD[1];
    });
  };
  for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
    const k = G.tileKey(i, j);
    if (tiles.has(k) || cityKeys.has(k) || !inBox(i, j)) continue;
    out.set(k, { i, j, key: k, buffer: true, fill: true });
  }
  return out;
}

// Those tiles from the old data (roads, rail, water and places with full
// geometry, buildings as their boxes and wings), through the same builder as
// the rest: so nothing in the old area needs the old layers. Advances `gid`
// and `stats`; adds the tiles to `blobs`, their roads to `roadNet`.
// -> { waterBodies, places: [{ name, kind, x, y, pop }] }
function fillOldExtent({ root, fill, gid, stats, blobs, roadNet, roadSeen, railRows, raster, waterBodies }) {
  const src = loadSources(root).ommeland;
  const urbanAt = urbanField(src.boxes);
  const ctx = { urbanAt, village: (x, y) => urbanAt(x, y) >= 0.5 };
  const feats = features(src.els, ctx);
  const inFill = (x, y) => { const [i, j] = G.tileIndexOf(x, y); return fill.has(G.tileKey(i, j)); };
  for (const b of src.boxes) {
    for (const o of boxOutlines(b)) {
      let x = 0, y = 0;
      const n = o.pts.length - 1;
      for (let q = 0; q < n; q++) { x += o.pts[q][0]; y += o.pts[q][1]; }
      x /= n; y /= n;
      if (!inFill(x, y)) continue;
      const row = WB.buildBuilding({ pts: o.pts, code: o.code, levels: o.levels, urban: urbanAt(x, y) });
      if (row) feats.push({ kind: 'buildings', row });
    }
  }
  WB.applyDuals(feats.filter((f) => f.kind === 'roads').map((f) => f.row));
  const idx = new Map();
  for (const f of feats) {
    let bb;
    if (f.kind === 'buildings') { let x = 0, y = 0; const P = f.row.pts, n = P.length - 1; for (let q = 0; q < n; q++) { x += P[q][0]; y += P[q][1]; } bb = [x / n, y / n, x / n, y / n]; }
    else { let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity; for (const p of f.row.pts) { if (p[0] < a) a = p[0]; if (p[1] < b) b = p[1]; if (p[0] > c) c = p[0]; if (p[1] > d) d = p[1]; } bb = [a, b, c, d]; }
    const [i0, j0] = G.tileIndexOf(bb[0], bb[1]), [i1, j1] = G.tileIndexOf(bb[2], bb[3]);
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
      const k = G.tileKey(i, j);
      if (fill.has(k)) (idx.get(k) || idx.set(k, []).get(k)).push(f);
    }
  }
  // the water: annotated like the extract's (waterlevels.js), flat for the far LOD
  const wr = annotateProvinceWater(feats.filter((f) => f.kind === 'water').map((f) => { f.row.flat = true; return f.row; }), { base: waterBodies, village: ctx.village, locks: [] });
  waterBodies += wr.bodies;
  // Het spoor van de oude data geldt alleen voor de tegels die eruit gevuld worden (#506). Het oude bestand
  // beslaat het hele oude Ommeland, dus zonder deze knip kwam het verse spoor er een tweede keer bij te
  // liggen — 0,16 m ernaast, wat op het spoor zichtbaar is als twee rails over elkaar.
  {
    const fb = [Infinity, Infinity, -Infinity, -Infinity];
    for (const t of fill.values()) {
      const [ox, oy] = G.tileOrigin(t.i, t.j);
      fb[0] = Math.min(fb[0], ox); fb[1] = Math.min(fb[1], oy);
      fb[2] = Math.max(fb[2], ox + G.TILE_M); fb[3] = Math.max(fb[3], oy + G.TILE_M);
    }
    if (fb[0] < Infinity) {
      const inBox = (P) => P.some(([x, y]) => x >= fb[0] && x <= fb[2] && y >= fb[1] && y <= fb[3]);
      for (const f of feats) {
        if (f.kind !== 'rails' || !inBox(f.row.pts)) continue;
        for (const piece of clipLine(f.row.pts, fb)) if (piece.length > 1) railRows.push({ ...f.row, pts: piece });
      }
    }
  }
  for (const k of [...fill.keys()].sort()) {
    const t = fill.get(k), [ox, oy] = G.tileOrigin(t.i, t.j), box = [ox, oy, ox + G.TILE_M, oy + G.TILE_M];
    const list = idx.get(k) || [];
    // the route graph's road net: the pieces inside the filled tiles only (the rest is the extract's)
    for (const f of list) {
      if (f.kind !== 'roads') continue;
      for (const piece of clipLine(f.row.pts, box)) {
        const key = f.row.osm === undefined ? null : `${f.row.osm}:${piece[0][0]},${piece[0][1]}`;
        if (key && roadSeen.has(key)) continue;
        if (key) roadSeen.add(key);
        roadNet.push({ ...f.row, pts: piece });
      }
    }
    const tb = tileBlob(t.i, t.j, list, gid, FLAG.LAND | FLAG.BUILT | FLAG.PROVINCE | FLAG.BUFFER | FLAG.OLD, PROVINCE_BUILDER, stats);
    if (tb) blobs.set(k, { ...tb, src: 'ommeland' });
    if (raster) paint(raster, list, box);
  }
  const places = [];
  for (const e of src.els) {
    const t = e.tags || {};
    if (e.type !== 'node' || !t.name || !['town', 'village', 'hamlet', 'suburb', 'quarter', 'neighbourhood'].includes(t.place)) continue;
    const [x, y] = wgsToWorld(e.lat, e.lon);
    if (inFill(x, y)) places.push({ name: t.name, kind: t.place, x: r2(x), y: r2(y), pop: 0 });
  }
  return { waterBodies, places };
}

// ------------------------------------------------------------- build

export function buildProvince({ root = ROOT, src = SRC_DIR, extra = bufferDirs(src), cityKeys = new Set(), buffer = BUFFER_M, onPack = null, map = true, cityCover = null, fillOld = false, bag = loadProvinceBag(), derive = true, junctions = true, terrain = null, only = null, profile = null, viaducts = false, collect = null } = {}) {
  const prov = gunzipJson(path.join(src, 'province.json.gz'));
  // the neighbours' strips: their places, stations and built-up cells join the province's
  const dirs = [src, ...extra];
  for (const d of extra) {
    const q = gunzipJson(path.join(d, 'province.json.gz'));
    const ids = new Set(prov.places.map((p) => p.id));
    for (const p of q.places) if (!ids.has(p.id)) prov.places.push(p);
    const sid = new Set(prov.stations.map((p) => p.id));
    for (const p of q.stations) if (!sid.has(p.id)) prov.stations.push(p);
    if (q.urban && prov.urban) prov.urban.cells = prov.urban.cells.concat(q.urban.cells);
  }
  const rings = outline(prov);
  const tiles = provinceTiles(rings, buffer);
  // the old Ommeland area past the strip: built from the old data, so no cell needs the old layers
  const fill = fillOld ? oldExtentGaps(tiles, cityKeys, root) : new Map();
  for (const [k, t] of fill) tiles.set(k, t);
  const keys = [...tiles.keys()].sort();
  // urban cells of several extracts add up where they overlap; that only
  // makes a border cell count as built-up a little sooner
  const urbanAt = urbanFromGrid(prov.urban);
  // 3D BAG heights and roofs (bag3d.mjs): the same OSM buildings, measured where the BAG has them
  const bag3d = bag.length ? bagMatcher(bag) : null;
  const ctx = { urbanAt, village: (x, y) => urbanAt(x, y) >= 0.5, bag3d, signs: true };
  // tiles per pack
  const byPack = new Map();
  const city = [];
  const overlays = [];
  for (const k of keys) {
    const t = tiles.get(k);
    if (t.fill) continue;
    if (only && !only.has(k)) continue; // a shadow build of some tiles (city_diff.mjs)
    if (cityKeys.has(k)) {
      city.push(k);
      // a city tile the city's data leaves partly empty gets an overlay for the rest
      if (!cityCover || cityCover.tileShare(t.i, t.j) >= 1) continue;
      overlays.push(k);
    }
    const p = packOf(t.i, t.j);
    (byPack.get(p) || byPack.set(p, []).get(p)).push(k);
  }
  // the base map (province_map.mjs), painted pack by pack over the tile set
  let raster = null;
  if (map && keys.length) {
    let i0 = Infinity, j0 = Infinity, i1 = -Infinity, j1 = -Infinity;
    for (const t of tiles.values()) { i0 = Math.min(i0, t.i); j0 = Math.min(j0, t.j); i1 = Math.max(i1, t.i); j1 = Math.max(j1, t.j); }
    const [x0, y0] = G.tileOrigin(i0, j0);
    raster = new Raster(x0, y0, Math.ceil(((i1 - i0 + 1) * G.TILE_M) / FINE_M), Math.ceil(((j1 - j0 + 1) * G.TILE_M) / FINE_M), FINE_M);
  }
  const gid = { buildings: GID0, roads: GID0, water: GID0, green: GID0, trees: GID0, rails: GID0, canopies: GID0, furniture: GID0, parcels: GID0 };
  const stats = { tiles: 0, buildings: 0, roads: 0, water: 0, rails: 0, green: 0, trees: 0, furniture: 0, junctions: 0, signals: 0, autoSignals: 0, hsrc: {}, packs: 0, sourceMB: 0, bag: bag3d ? bag3d.stats : null, derived: { moved: 0, merged: 0, canopies: 0, lifted: 0, clipped: 0, trimmed: 0, afloat: 0, ditchCut: 0, ditchJoined: 0, ditchDropped: 0, drowned: 0, treesMoved: 0, treesRemoved: 0 } };
  const blobs = new Map();
  const empty = [], noPack = [];
  const railRows = [];
  const farAcc = { turbines: new Map(), towers: new Map() };
  const roadNet = [], roadSeen = new Set();
  const coast = new Map();
  const locks = new Map();
  let waterBodies = 0;
  const packKey = (k) => { const [a, b] = k.split('_').map(Number); return a * 1000 + b; };
  const locksOf = (els) => {
    const out = [];
    for (const el of els) {
      const t = el.tags || {};
      if (el.type === 'way' && el.g && el.g.length > 1 && (t.waterway === 'lock_gate' || t.lock === 'yes')) {
        const m = el.g[Math.floor(el.g.length / 2)], [x, y] = wgsToWorld(m[0], m[1]);
        out.push({ x: r1(x), y: r1(y), name: t.name || '', w: parseFloat(t.maxwidth) || 0, id: el.id });
      }
    }
    return out;
  };
  // The city profile (#90): the water of all the packs with tiles of the city is classified at once, as the city map
  // did (one boezem; a canal that runs from one pack into the next is still a kanaal). Pack by pack, the part of a canal
  // beyond the pack's edge was a pond or a ditch (Schuitendiep, Turfsingel). The same rows come again in the pack loop
  // (features() is deterministic), where the fields found here are put on them.
  const cityWater = new Map();
  if (profile) {
    const cityPacks = [...byPack.keys()].filter((pk) => byPack.get(pk).some((k) => profile.has(k))).sort((a, b) => packKey(a) - packKey(b));
    const rowsOf = new Map(), lockOf = new Map(), all = [], roadRows = [];
    for (const pk of cityPacks) {
      const els = [];
      for (const d of dirs) { const f = path.join(d, `c${pk}.json.gz`); if (fs.existsSync(f)) for (const el of gunzipJson(f).elements) els.push(el); }
      for (const k of locksOf(els)) lockOf.set(k.id, k);
      const rows = features(els.filter((el) => el.type === 'relation' || (el.tags && (el.tags.natural === 'water' || el.tags.waterway))), ctx).filter((f) => f.kind === 'water').map((f) => f.row);
      rowsOf.set(pk, rows);
      // the roads of the city (a small pond beside a road or under a bridge keeps the canal's level, #327)
      for (const f of features(els.filter((el) => el.type === 'way' && el.tags && el.tags.highway), ctx)) if (f.kind === 'roads') roadRows.push(f.row);
      all.push(...rows);
    }
    const wr = annotateCityWater(all, { base: waterBodies, village: ctx.village, locks: [...lockOf.values()], focus: (x, y) => profile.has(G.tileKey(...G.tileIndexOf(x, y))), roads: roadRows });
    waterBodies += wr.bodies;
    for (const [pk, rows] of rowsOf) cityWater.set(pk, rows.map((r) => { const o = { body: r.body, kind: r.kind, lv: r.lv, dp: r.dp, nav: r.nav, bank: r.bank }; if (r.lock) o.lock = true; return o; }));
  }
  for (const pk of [...byPack.keys()].sort((a, b) => packKey(a) - packKey(b))) {
    const files = dirs.map((d) => path.join(d, `c${pk}.json.gz`)).filter((f) => fs.existsSync(f));
    const want = byPack.get(pk);
    if (!files.length) { noPack.push(...want); continue; }
    stats.packs++;
    // the province's pack first: a way both extracts hold is the same OSM way (features() keeps the first)
    const els = [];
    for (const f of files) { stats.sourceMB += fs.statSync(f).size / 1e6; for (const el of gunzipJson(f).elements) els.push(el); }
    for (const el of els) if (el.tags && el.tags.natural === 'coastline' && el.g && !coast.has(el.id)) coast.set(el.id, el);
    collectFarNodes(els, farAcc);
    let feats = features(els, ctx);
    // the water keeps `flat` (the far LOD draws it so) and gets the city
    // water's kind, lv, dp and nav: tileworld.js puts annotated rows in the
    // water grid, so boats, swimmers and waterAt see them
    const packLocks = locksOf(els);
    // a lock splits the water bodies (waterlevels.js annotateProvinceWater)
    const waterRows = feats.filter((f) => f.kind === 'water').map((f) => { f.row.flat = true; return f.row; });
    const found = cityWater.get(pk);
    if (found && found.length === waterRows.length) waterRows.forEach((r, i) => Object.assign(r, found[i]));
    else {
      if (found) console.log(`  waarschuwing: pak ${pk} heeft ${waterRows.length} waterrijen, de stadsclassificatie zag er ${found.length}`);
      // (a pack the city profile did not see: classified on its own, the city's way when it has tiles of the profile)
      const annotate = profile && want.some((k) => profile.has(k)) ? annotateCityWater : annotateProvinceWater;
      const wr = annotate(waterRows, { base: waterBodies, village: ctx.village, locks: packLocks, focus: (x, y) => profile && profile.has(G.tileKey(...G.tileIndexOf(x, y))) });
      waterBodies += wr.bodies;
    }
    for (const k of packLocks) if (!locks.has(k.id)) locks.set(k.id, { x: k.x, y: k.y, name: k.name, w: k.w });
    WB.applyDuals(feats.filter((f) => f.kind === 'roads').map((f) => f.row));
    // what the city's map derives (derive_tiles.mjs): footprints clear of the roads, canopies, roof steps, ways cut at a wall
    if (derive) {
      const d = deriveFeatures(feats);
      feats = d.feats;
      for (const k of Object.keys(stats.derived)) stats.derived[k] += d.stats[k];
    }
    // a grass, park or forest outline that lies (nearly) wholly in water is a mapped bank that the
    // water polygon covers: drawn, it is a green strip across the open water (issue #185)
    {
      const wet = waterIndex(feats.filter((f) => f.kind === 'water').map((f) => f.row));
      const dry = feats.filter((f) => f.kind !== 'green' || f.row.pts.length < 4 || wetFraction(f.row.pts, wet) < DROWNED_FRAC);
      stats.derived.drowned += feats.length - dry.length;
      feats = dry;
    }
    // the height profiles of the bridges and viaducts (province_profile.mjs, #235): in by default since the game
    // carries them into its elevation model (tileworld.js, #300); --flat leaves them out
    if (viaducts) {
      const pr = profileFeats(feats);
      stats.viaducts = stats.viaducts || { packs: 0, profiled: 0, densified: 0, clearanceBefore: 0, clearanceAfter: 0 };
      const v = stats.viaducts;
      v.packs++; v.profiled += pr.profiled; v.densified += pr.densified; v.clearanceBefore += pr.before.clearance; v.clearanceAfter += pr.after.clearance;
    }
    // the traffic lights snapped onto their roads, the city's junction model over the pack's roads
    // (junction_tiles.mjs: the nodes by the tile they lie in)
    const nodesIn = new Map();
    let lights = [];
    if (junctions) {
      const sn = snapSignals(feats);
      const jm = junctionsOf(sn.feats, sn.lights);
      feats = sn.feats.concat(jm.auto);
      lights = sn.lights;
      stats.signals += sn.lights.length;
      stats.autoSignals += jm.auto.length;
      for (const J of jm.nodes) {
        const k = G.tileKey(...G.tileIndexOf(J.x, J.y));
        (nodesIn.get(k) || nodesIn.set(k, []).get(k)).push(J);
      }
    }
    // the whole ways of the pack for a caller that wants them uncut (stad_laag.mjs: roads and rails of the city, #90)
    if (collect) collect(feats, { pack: pk, want, els, lights });
    // trees on or against a carriageway go beside it (treeclear.js, #324): the city's tiles do it at load, the streamed ones here
    const ts = { moved: 0, removed: 0 };
    feats = clearPackTrees(feats, ts);
    stats.derived.treesMoved += ts.moved; stats.derived.treesRemoved += ts.removed;
    // features by tile, only for this pack's tiles
    const mine = new Set(want);
    const idx = new Map();
    for (const f of feats) {
      if (f.kind === 'rails') railRows.push(f.row);
      let bb;
      if (f.kind === 'trees') bb = [f.row[0], f.row[1], f.row[0], f.row[1]];
      else if (f.kind === 'buildings' || f.kind === 'canopies') { let x = 0, y = 0; const P = f.row.pts, n = P.length - 1; for (let q = 0; q < n; q++) { x += P[q][0]; y += P[q][1]; } bb = [x / n, y / n, x / n, y / n]; }
      else { let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity; for (const p of f.row.pts) { if (p[0] < a) a = p[0]; if (p[1] < b) b = p[1]; if (p[0] > c) c = p[0]; if (p[1] > d) d = p[1]; } bb = [a, b, c, d]; }
      const [i0, j0] = G.tileIndexOf(bb[0], bb[1]), [i1, j1] = G.tileIndexOf(bb[2], bb[3]);
      for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
        const k = G.tileKey(i, j);
        if (!mine.has(k)) continue;
        (idx.get(k) || idx.set(k, []).get(k)).push(f);
      }
      // the route graph's road net (roadgraph.js): every road piece of the packs, also under the
      // city's tiles and in the gaps beside them, where the old Ommeland roads used to join the city streets
      if (f.kind === 'roads') {
        const key = f.row.osm === undefined ? null : `${f.row.osm}:${f.row.pts[0][0]},${f.row.pts[0][1]}`;
        if (!key || !roadSeen.has(key)) { if (key) roadSeen.add(key); roadNet.push(f.row); }
      }
    }
    if (raster) {
      const [pi, pj] = pk.split('_').map(Number);
      const [bx, by] = G.tileOrigin(pi * 8, pj * 8);
      paint(raster, feats, [bx, by, bx + 8 * G.TILE_M, by + 8 * G.TILE_M]);
    }
    for (const k of want) {
      const t = tiles.get(k);
      if (cityKeys.has(k)) {
        const list = outsideCover(idx.get(k) || [], cityCover.inside);
        const tb = list.length ? tileBlob(t.i, t.j, list, gid, FLAG.LAND | FLAG.BUILT | FLAG.PROVINCE | FLAG.OVERLAY | (ommelandBox(t.i, t.j, root) ? FLAG.OLD : 0), PROVINCE_BUILDER, stats) : null;
        if (tb) blobs.set('o' + k, { ...tb, src: 'pbf', ov: true });
        continue;
      }
      const flags = FLAG.LAND | FLAG.BUILT | FLAG.PROVINCE | (t.buffer ? FLAG.BUFFER : 0) | (ommelandBox(t.i, t.j, root) ? FLAG.OLD : 0);
      const tb = tileBlob(t.i, t.j, idx.get(k) || [], gid, flags, PROVINCE_BUILDER, stats, junctions || (terrain && terrain.has(k)) ? { junctions: junctions ? nodesIn.get(k) || [] : null, terrain: terrain ? terrain.get(k) : null } : null);
      if (!tb) { empty.push(k); continue; }
      blobs.set(k, { ...tb, src: 'pbf' });
    }
    if (onPack) onPack(pk, stats);
  }
  let fillPlaces = [];
  if (fill.size) {
    const f = fillOldExtent({ root, fill, gid, stats, blobs, roadNet, roadSeen, railRows, raster, waterBodies });
    waterBodies = f.waterBodies;
    fillPlaces = f.places;
    for (const k of fill.keys()) if (!blobs.has(k)) empty.push(k);
  }
  // the global layer
  const inSet = (x, y) => { const [i, j] = G.tileIndexOf(x, y); return tiles.has(G.tileKey(i, j)); };
  const places = prov.places.filter((p) => inSet(p.x, p.y)).map((p) => ({ name: p.name, kind: p.kind, x: p.x, y: p.y, pop: p.pop || 0 }));
  for (const p of fillPlaces) if (!places.some((q) => q.name === p.name && Math.hypot(q.x - p.x, q.y - p.y) < 400)) places.push(p);
  // a suburb or neighbourhood belongs to the nearest town or village within 3 km
  const seats = places.filter((p) => ['city', 'town', 'village'].includes(p.kind));
  for (const p of places) {
    if (!['suburb', 'quarter', 'neighbourhood'].includes(p.kind)) continue;
    let best = null, bd = 3000;
    for (const s of seats) { const d = Math.hypot(s.x - p.x, s.y - p.y); if (d < bd) { bd = d; best = s; } }
    if (best) p.of = best.name;
  }
  // Eemshaven has no place node: the harbour's own name at its centre (as the corridor)
  if (!places.some((p) => p.name === 'Eemshaven')) {
    const [x, y] = wgsToWorld(53.4417, 6.8333);
    places.push({ name: 'Eemshaven', kind: 'industrial', x: r2(x), y: r2(y), pop: 0 });
  }
  places.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : a.x - b.x));
  const stations = new Map();
  for (const s of prov.stations) {
    if (!inSet(s.x, s.y)) continue;
    const key = s.name.replace(/^Station\s+/, '');
    if (!stations.has(key)) stations.set(key, { name: s.name, x: s.x, y: s.y });
  }
  if (stations.has('Groningen') && !stations.has('Groningen Hoofdstation')) stations.set('Groningen Hoofdstation', stations.get('Groningen'));
  const routes = trainLines(prov.trains || [], railRows, stations);
  const bus = busLines(prov.bus || []).map((b) => ({ ...b, pts: simplify(b.pts, 2).map(([x, y]) => [r1(x), r1(y)]) }));
  const edge = edgeFromOsm([...coast.values()], (la, lo) => wgsToWorld(la, lo).map(r1));
  edge.coast = edge.coast.map((c) => ({ ...c, pts: simplify(c.pts, 5) }));
  edge.border = borderLines(prov, buffer);
  // the city's routes run on over the province's track, and the track outside the city's data (cityroutes.mjs)
  const stationList = [...stations.entries()].map(([key, s]) => ({ key, ...s })).sort((a, b) => (a.key < b.key ? -1 : 1));
  const far = finishFarProps(farAcc);
  const rail = { ...bakeCityRoutes({ stations: stationList, routes }, { province: true, root }), rails: railLines(railRows, cityCover ? cityCover.inside : () => false, cityCover ? cityCover.rails : []), ...far };
  const global = {
    builder: PROVINCE_BUILDER, source: prov.source, places,
    // the tiles carry the real ditches (worldbuilder.js fromOsm waterway=ditch|drain|stream): the game turns its painted ones off (countryfield.js)
    osmDitches: true,
    // the tiles carry the land use of OSM landuse (PARCELS): the countryside's fences and herds follow it (countryedge.js landUseAt)
    osmParcels: true,
    stations: [...stations.entries()].map(([key, s]) => ({ key, ...s })).sort((a, b) => (a.key < b.key ? -1 : 1)),
    routes, bus: bus.map(({ id, ref, name, from, to, pts, stops }) => ({ id, ref, name, from, to, pts, stops })),
    edge, outline: rings.map((R) => simplify(R, 60).map(([x, y]) => [Math.round(x), Math.round(y)])),
    locks: [...locks.values()].sort((a, b) => a.x - b.x || a.y - b.y), waterBodies,
    buffer, empty: empty.sort(), city: city.sort(), overlays: overlays.filter((k) => blobs.has('o' + k)).sort(), missing: noPack.sort(),
  };
  return { blobs, global, stats, keys, tiles, empty, missing: noPack, raster, roadNet, rail };
}

// The bus lines (~1 MB) go in a file of their own, read when needed; the
// index (read at start for the place names) stays small.
export function writeProvince(out, built) {
  const { bus, ...global } = built.global;
  // the base map's pyramid (province_map.mjs) next to the packs
  const pm = built.raster ? writePyramid(built.raster, out) : null;
  if (pm) { global.map = pm.meta; built.stats.mapMB = +(pm.bytes / 1e6).toFixed(2); }
  const r = writeLayer(out, { ...built, global: { ...global, busFile: 'provincie-bus.json', landFile: 'provincie-land.json', ...(built.roadNet ? { roadsFile: 'provincie-roads.json.gz' } : {}) } }, { prefix: 'v', file: 'index-provincie.json', layer: 'provincie', builder: PROVINCE_BUILDER });
  fs.writeFileSync(path.join(out, 'provincie-bus.json'), JSON.stringify({ builder: PROVINCE_BUILDER, bus }));
  fs.writeFileSync(path.join(out, 'provincie-land.json'), JSON.stringify({ builder: PROVINCE_BUILDER, ...built.rail }));
  // the car roads of the tiles for the GPS and the police (roadgraph.js); mtime 0: the same bytes every build
  if (built.roadNet) {
    const gz = zlib.gzipSync(JSON.stringify(encodeRoadNet(built.roadNet)), { level: 9 });
    gz.writeUInt32LE(0, 4);
    fs.writeFileSync(path.join(out, 'provincie-roads.json.gz'), gz);
  }
  return r;
}

async function cityKeysOf(arg) {
  if (arg && fs.existsSync(arg)) return new Set(Object.keys(JSON.parse(fs.readFileSync(arg, 'utf8')).tiles));
  await import('../node3d.mjs');
  const P = await import('./pack_tiles.mjs');
  return new Set(P.build(await P.loadSourcesLaag()).blobs.keys());
}

// the city map's data cover (citycover.mjs, the mask in stad.json), for the overlay tiles
async function cityCoverOf() {
  await import('../node3d.mjs');
  const P = await import('./pack_tiles.mjs');
  const { cityCoverFromMask } = await import('./citycover.mjs');
  const { data, mask } = P.readStad();
  // De stadse rails komen sinds #90 uit de OSM-laag en niet meer uit stad.json: zonder deze regel kreeg
  // railLines (cityroutes.mjs) een lege lijst en werd het spoor van de provincie nergens op de stadse
  // track geknipt, zodat het in en om de stad dubbel werd getekend (#506).
  const stad = await P.loadCityDataLaag();
  return { ...cityCoverFromMask(mask), rails: (stad.data.rails || []).map((r) => r.pts || r) };
}

async function main() {
  const args = process.argv.slice(2);
  const opt = (k) => (args.includes(k) ? args[args.indexOf(k) + 1] : null);
  const out = path.resolve(ROOT, opt('--out') || 'game/world');
  const src = path.resolve(ROOT, opt('--src') || SRC_DIR);
  if (!haveProvince(src)) { console.log(`no province extract in ${path.relative(ROOT, src)}: run scripts/world/extract_province.py first`); return; }
  const t0 = performance.now();
  const cityKeys = await cityKeysOf(opt('--city') || path.join(out, 'index.json'));
  const t1 = performance.now();
  const cityCover = args.includes('--no-overlay') ? null : await cityCoverOf();
  const built = buildProvince({ src, cityKeys, cityCover, fillOld: !args.includes('--no-fill'), viaducts: !args.includes('--flat'), terrain: args.includes('--terrain') ? (await import('./terrain.mjs')).loadReliefRasters() : null, onPack: args.includes('--verbose') ? (pk, s) => console.log(`  pack ${pk}: ${s.tiles} tiles so far`) : null });
  const t2 = performance.now();
  const { index, size } = writeProvince(out, built);
  // the overlays of the city's tiles go into their tiles (#314): the loader takes them from there
  const merged = (await import('./merge_overlays.mjs')).mergeOverlays(out);
  if (merged.merged) console.log(`  ${merged.merged} overlays merged into the city's tiles (${(merged.provinceBytes / 1e6).toFixed(2)} MB out of the province packs)`);
  const raw = Object.values(index.tiles).reduce((a, t) => a + t.raw, 0);
  const s = built.stats;
  const g = built.global;
  const buf = Object.values(index.tiles).filter((t) => t.flags & FLAG.BUFFER).length;
  const old = Object.values(index.tiles).filter((t) => t.flags & FLAG.OLD).length;
  const ovl = Object.values(index.tiles).filter((t) => t.ov).length;
  const filled = Object.values(index.tiles).filter((t) => t.src === 'ommeland').length;
  const idxSize = fs.statSync(path.join(out, 'index-provincie.json')).size;
  console.log(`provincie: ${built.keys.length} tiles in the set, ${s.tiles} built (${buf} in the buffer strip, ${old} in the old Ommeland area, ${filled} of them filled from the old data), ${g.city.length} are the city's (${ovl} of them with an overlay for the part its data leaves empty), ${built.empty.length} empty (sea, no data), ${built.missing.length} without a pack`);
  console.log(`  ${Object.keys(index.packs).length} packs ${(size / 1e6).toFixed(1)} MB (${(raw / 1e6).toFixed(1)} MB raw, ${Math.round(size / Math.max(1, s.tiles))} B/tile), index ${(idxSize / 1e6).toFixed(2)} MB; source ${s.sourceMB.toFixed(1)} MB gzip in ${s.packs} packs`);
  console.log(`  ${s.buildings} buildings (height ${Object.entries(s.hsrc).map(([k, v]) => `${k} ${v}`).join(', ')}), ${s.roads} road pieces, ${s.water} water, ${s.green} green, ${s.rails} rail pieces, ${s.trees} trees, ${s.furniture} furniture`);
  if (s.junctions) console.log(`  junction model: ${s.junctions} junction rows, ${s.signals} traffic lights from OSM snapped onto their road, ${s.autoSignals} more by the city's rule for busy crossings`);
  if (s.derived) console.log(`  derived like the city: ${s.derived.moved} footprints pushed 1.5 m off a road, ${s.derived.merged} doubled or bridge-part footprints dropped, ${s.derived.canopies} canopies, ${s.derived.lifted} roof steps, ${s.derived.clipped} ways cut at a wall, ${s.derived.trimmed} waterways of guessed width narrowed at a footprint, ${s.derived.ditchCut} ditch crossings of the track or a road cut (${s.derived.ditchDropped} short pieces dropped), ${s.derived.ditchJoined} ditch ends joined to water, ${s.derived.drowned} green outlines in open water dropped`);
  if (s.bag) console.log(`  3D BAG: ${s.bag.id} buildings by BAG id, ${s.bag.centre} by centre and area, ${s.bag.none} without a match; ${((100 * (s.hsrc['3dbag'] || 0)) / Math.max(1, s.buildings)).toFixed(1)} % of the buildings have a measured height`);
  console.log(`  ${g.places.length} places, ${g.stations.length} stations, ${g.routes.length} train lines (${g.routes.filter((r) => r.reached).length} complete), ${g.bus.length} bus lines, ${g.edge.coast.length} coast pieces, ${g.edge.border.length} border lines`);
  if (s.mapMB !== undefined) console.log(`  base map: ${g.map ? '' : ''}${s.mapMB} MB of PNG tiles (z0-z3, ${index.global.map.levels.map((L) => `${L.m} m/px ${L.tiles.length}`).join(', ')})`);
  console.log(`  city keys ${((t1 - t0) / 1000).toFixed(1)} s, build ${((t2 - t1) / 1000).toFixed(1)} s -> ${path.relative(ROOT, out)}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) await main();
