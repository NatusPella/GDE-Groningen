// The proefstrook through the world builder (docs/PROVINCIE-PLAN.md F1):
// every corridor tile (scripts/world/corridor.mjs) built from the best local
// OSM cache that covers it, through game/js/worldbuilder.js, into .gdt tiles.
//
//   node scripts/world/build_corridor.mjs [--out game/world] [--city <index.json>]
//
// Sources, per tile: data/world/corridor/c<pack>.json.gz (fetch_corridor.py:
// everything with full geometry) before data/ommeland_raw.json.gz (roads,
// rail, water and places with full geometry; buildings as their boxes and
// wings). A tile with neither stays out of the build and is listed, so the
// owner knows what to fetch. The city's own tiles (pack_tiles.mjs) are left
// alone. Roads, rails and water are cut at the tile edge (the pieces of a way
// share their end points on the edge: the portal nodes), a building lives in
// the tile of its centre. Out: c<pack>-<hash>.gdp packs, index-corridor.json
// (tiles, places, stations, rail routes, bus lines, the sources and what is
// missing) next to the city's index.json. Same input, same bytes.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import * as G from '../../game/js/gdt.js';
import * as WB from '../../game/js/worldbuilder.js';
import { registerBuilderHooks } from '../../game/js/builderhooks.js';
import { RULES } from '../../game/js/junctions.js';

registerBuilderHooks();
import { wgsToWorld, worldToWgs } from '../../game/js/rdnew.js';
import { edgeRows } from '../../game/js/navgraph.js';
import { ribbon } from './derive_tiles.mjs';
import { waterIndex, wetFraction, GREEN_WET_FRAC } from './placement_audit.mjs';
import { edgeFromOsm } from '../../game/js/worldedge.js';
import { LINES, TOWNS, loadPlaces, corridorTiles, tileSources, packOf } from './corridor.mjs';
import { bakeCityRoutes, railLines } from './cityroutes.mjs';
import { collectFarNodes, finishFarProps } from './farprops.mjs';
import { dropDuplicateBridges } from './bridgededupe.mjs';
import { cutZ, cutZt, isFlat } from './province_profile.mjs';
import { segmentStructures, gradeOrder } from '../../game/js/roadprofile.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const CORRIDOR_BUILDER = 1;
// corridor objects get ids far above the city's arrays
export const GID0 = 10_000_000;
const gunzipJson = (f) => JSON.parse(zlib.gunzipSync(fs.readFileSync(f)).toString('utf8'));
const r2 = (v) => Math.round(v * 100) / 100;

// ------------------------------------------------------------- geometry

function clipSeg(a, b, [x0, y0, x1, y1]) {
  let t0 = 0, t1 = 1;
  const dx = b[0] - a[0], dy = b[1] - a[1];
  for (const [p, q] of [[-dx, a[0] - x0], [dx, x1 - a[0]], [-dy, a[1] - y0], [dy, y1 - a[1]]]) {
    if (p === 0) { if (q < 0) return null; continue; }
    const r = q / p;
    if (p < 0) { if (r > t1) return null; if (r > t0) t0 = r; } else { if (r < t0) return null; if (r < t1) t1 = r; }
  }
  return [t0, t1];
}
const lerpP = (a, b, t) => [r2(a[0] + (b[0] - a[0]) * t), r2(a[1] + (b[1] - a[1]) * t)];

// a polyline's pieces inside the box (half-open on the far edges does not
// matter: a piece on the edge has zero length and is dropped)
export function clipLine(P, box) {
  const out = [];
  let cur = null;
  for (let i = 0; i < P.length - 1; i++) {
    const c = clipSeg(P[i], P[i + 1], box);
    if (!c) { if (cur) { out.push(cur); cur = null; } continue; }
    const a = c[0] > 0 ? lerpP(P[i], P[i + 1], c[0]) : P[i], b = c[1] < 1 ? lerpP(P[i], P[i + 1], c[1]) : P[i + 1];
    if (!cur) cur = [a];
    else if (c[0] > 0) { out.push(cur); cur = [a]; }
    cur.push(b);
    if (c[1] < 1) { out.push(cur); cur = null; }
  }
  if (cur) out.push(cur);
  return out.filter((q) => q.length >= 2 && q.some((p, k) => k && Math.hypot(p[0] - q[0][0], p[1] - q[0][1]) > 0.05));
}

// Sutherland-Hodgman against the box; a closed ring in, a closed ring out
export function clipPoly(P, [x0, y0, x1, y1]) {
  let ring = P[0][0] === P[P.length - 1][0] && P[0][1] === P[P.length - 1][1] ? P.slice(0, -1) : P.slice();
  const edges = [[(p) => p[0] >= x0, (a, b) => lerpP(a, b, (x0 - a[0]) / (b[0] - a[0]))], [(p) => p[0] <= x1, (a, b) => lerpP(a, b, (x1 - a[0]) / (b[0] - a[0]))],
    [(p) => p[1] >= y0, (a, b) => lerpP(a, b, (y0 - a[1]) / (b[1] - a[1]))], [(p) => p[1] <= y1, (a, b) => lerpP(a, b, (y1 - a[1]) / (b[1] - a[1]))]];
  for (const [inside, cut] of edges) {
    if (!ring.length) break;
    const out = [];
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i], b = ring[(i + 1) % ring.length];
      const ia = inside(a), ib = inside(b);
      if (ia) out.push(a);
      if (ia !== ib) out.push(cut(a, b));
    }
    ring = out;
  }
  if (ring.length < 3) return null;
  return [...ring, ring[0]];
}

// Islands of a lake cut out of its outline (OSM multipolygon, role inner). The
// water rows have no holes, so each island is joined to the outline by a slit
// of no width (a keyhole polygon): even-odd containment and triangulation see
// the hole, a farm on its terp in the water stands on land. Islands that do not
// lie wholly inside the outline are left out. -> the closed ring
const segX = (a, b, c, d) => {
  const o = (p, q, r) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  return o(a, b, c) * o(a, b, d) < 0 && o(c, d, a) * o(c, d, b) < 0;
};
const ringHas = (x, y, P) => {
  let c = false;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) if ((P[i][1] > y) !== (P[j][1] > y) && x < ((P[j][0] - P[i][0]) * (y - P[i][1])) / (P[j][1] - P[i][1]) + P[i][0]) c = !c;
  return c;
};
export function cutIslands(outer, islands) {
  let ring = outer;
  for (const isl of islands) {
    if (!isl || isl.length < 4 || !isl.every((q) => ringHas(q[0], q[1], ring))) continue;
    const n = ring.length - 1, m = isl.length - 1; // (closed rings: the last point repeats the first)
    const pairs = [];
    for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) pairs.push([Math.hypot(ring[i][0] - isl[j][0], ring[i][1] - isl[j][1]), i, j]);
    pairs.sort((a, b) => a[0] - b[0]);
    for (const [, i, j] of pairs.slice(0, 40)) {
      let crosses = false;
      for (let k = 0; k < n && !crosses; k++) if (k !== i && (k + 1) % n !== i && segX(ring[i], isl[j], ring[k], ring[k + 1])) crosses = true;
      for (let k = 0; k < m && !crosses; k++) if (k !== j && (k + 1) % m !== j && segX(ring[i], isl[j], isl[k], isl[k + 1])) crosses = true;
      if (crosses) continue;
      const hole = [];
      for (let k = 0; k <= m; k++) hole.push(isl[(j + k) % m]);
      ring = [...ring.slice(0, i + 1), ...hole, ring[i], ...ring.slice(i + 1)];
      break;
    }
  }
  return ring;
}

const centroid = (P) => { const n = P.length - (P[0][0] === P[P.length - 1][0] && P[0][1] === P[P.length - 1][1] ? 1 : 0); let x = 0, y = 0; for (let i = 0; i < n; i++) { x += P[i][0]; y += P[i][1]; } return [x / n, y / n]; };

// ------------------------------------------------------------- sources

// fetch_ommeland.py's compact box [lat, lon, w, l, ang, code, lv, fill,
// parts?] as outlines: its box, or its 2-3 wing rectangles (decimetres in the
// box frame), in the world frame. The box frame is x east, y south against
// true north (M_LAT/M_LON of the cache).
const M_LAT = 110574.0, M_LON = 66652.97;
export function boxOutlines(b) {
  const [lat, lon, w, l, ang, code, lv] = b;
  const a = (ang * Math.PI) / 180, ux = Math.cos(a), uy = Math.sin(a);
  const toW = (u, v) => {
    const dx = ux * u - uy * v, dy = uy * u + ux * v;
    const [x, y] = wgsToWorld(lat - dy / M_LAT, lon + dx / M_LON);
    return [r2(x), r2(y)];
  };
  const rect = (cu, cv, rw, rl) => { const P = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([s, t]) => toW(cu + (s * rw) / 2, cv + (t * rl) / 2)); return [...P, P[0]]; };
  const parts = Array.isArray(b[8]) ? b[8].map(([cu, cv, pw, pl]) => rect(cu / 10, cv / 10, pw / 10, pl / 10)) : [rect(0, 0, w, l)];
  return parts.map((pts) => ({ pts, code, levels: lv }));
}

// the elements of each source, as { el, src } with the source's id prefix
export function loadSources(root = ROOT) {
  const om = gunzipJson(path.join(root, 'data/ommeland_raw.json.gz'));
  const omEls = [];
  for (const k of ['roads', 'rail', 'water', 'places']) for (const e of om[k]) omEls.push(e);
  // the cycle layer repeats car roads that carry a lane: only the paths
  for (const e of om.cycle) if (e.tags && e.tags.highway === 'cycleway') omEls.push(e);
  const corridor = new Map();
  const dir = path.join(root, 'data/world/corridor');
  if (fs.existsSync(dir)) {
    for (const f of fs.readdirSync(dir).filter((q) => /^c-?\d+_-?\d+\.json\.gz$/.test(q)).sort()) {
      const m = /^c(-?\d+_-?\d+)/.exec(f);
      corridor.set(m[1], gunzipJson(path.join(dir, f)).elements);
    }
  }
  return { ommeland: { els: omEls, boxes: om.bld }, corridor };
}

// ------------------------------------------------------------- features

// Features with world geometry: { kind, row, bounds, c (centre), osm }
export function features(els, ctx) {
  const out = [];
  const seen = new Set();
  for (const el of els) {
    const id = el.type + el.id;
    if (seen.has(id)) continue;
    seen.add(id);
    const t = el.tags || {};
    if (el.type === 'relation' && t.natural === 'water') {
      const islands = (el.members || []).filter((m) => m.role === 'inner' && m.g && m.g.length >= 4).map((m) => m.g.map((q) => wgsToWorld(q[0], q[1]).map(r2)));
      for (const m of el.members || []) {
        if (m.role !== 'outer' || !m.g || m.g.length < 4) continue;
        for (const f of WB.fromOsm({ type: 'way', id: el.id, tags: { natural: 'water', name: t.name }, g: m.g }, ctx)) {
          if (f.kind === 'water' && islands.length) f.row.pts = cutIslands(f.row.pts, islands);
          out.push(f);
        }
      }
      continue;
    }
    // a multipolygon (extract_province.py joins its outer rings): each ring
    // with the relation's tags
    if (el.type === 'relation' && t.type === 'multipolygon') {
      for (const m of el.members || []) {
        if (m.role !== 'outer' || !m.g || m.g.length < 4) continue;
        for (const f of WB.fromOsm({ type: 'way', id: el.id, tags: t, g: m.g }, ctx)) out.push(f);
      }
      continue;
    }
    for (const f of WB.fromOsm(el, ctx)) {
      if (f.kind === 'waterways') { out.push({ kind: 'water', row: { pts: ribbon(f.row.pts, f.row.hw), name: f.row.name }, line: f.row }); continue; }
      out.push(f);
    }
  }
  // a bridge OSM draws twice on one spot is one deck (#235)
  return dropDuplicateBridges(out);
}

// urban weight (0..1) from the density of boxes round a point, 120 m cells
export function urbanField(boxes) {
  const CELL = 120, n = new Map();
  for (const b of boxes) {
    const [x, y] = wgsToWorld(b[0], b[1]);
    const k = `${Math.floor(x / CELL)},${Math.floor(y / CELL)}`;
    n.set(k, (n.get(k) || 0) + 1);
  }
  return (x, y) => {
    let s = 0;
    const cx = Math.floor(x / CELL), cy = Math.floor(y / CELL);
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) s += n.get(`${cx + i},${cy + j}`) || 0;
    return Math.min(1, s / 45);
  };
}

// ------------------------------------------------------------- rail and bus

const nodeKey = (p) => `${Math.round(p[0] * 2)},${Math.round(p[1] * 2)}`;

// a binary min-heap of [key, value]; equal keys pop in push order
class Heap {
  constructor() { this.a = []; this.n = 0; }
  get size() { return this.a.length; }
  less(i, j) { const x = this.a[i], y = this.a[j]; return x[0] < y[0] || (x[0] === y[0] && x[2] < y[2]); }
  swap(i, j) { const t = this.a[i]; this.a[i] = this.a[j]; this.a[j] = t; }
  push(k, v) {
    const a = this.a;
    a.push([k, v, this.n++]);
    for (let i = a.length - 1; i > 0;) { const p = (i - 1) >> 1; if (!this.less(i, p)) break; this.swap(i, p); i = p; }
  }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length) {
      a[0] = last;
      for (let i = 0; ;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < a.length && this.less(l, m)) m = l;
        if (r < a.length && this.less(r, m)) m = r;
        if (m === i) break;
        this.swap(i, m); i = m;
      }
    }
    return [top[0], top[1]];
  }
}

// A rail route through stations in order over the rail graph (Dijkstra per
// leg): { pts, stops: [{ name, s }], reached } - as far as the data reaches.
export function railRoute(rails, stations, via) {
  const pos = new Map(), adj = new Map();
  const node = (p) => { const k = nodeKey(p); if (!pos.has(k)) { pos.set(k, p); adj.set(k, []); } return k; };
  for (const r of rails) {
    for (let i = 0; i < r.pts.length - 1; i++) {
      const a = node(r.pts[i]), b = node(r.pts[i + 1]);
      const d = Math.hypot(r.pts[i + 1][0] - r.pts[i][0], r.pts[i + 1][1] - r.pts[i][1]);
      adj.get(a).push([b, d]); adj.get(b).push([a, d]);
    }
  }
  const keys = [...pos.keys()];
  // a station's nodes: every track node within 40 m of the nearest (both
  // tracks of a double line, the loop at a halt), at most maxD away
  const zone = (x, y, maxD) => {
    let bd = maxD;
    for (const k of keys) { const p = pos.get(k); const d = Math.hypot(p[0] - x, p[1] - y); if (d < bd) bd = d; }
    if (bd >= maxD) return [];
    return keys.filter((k) => { const p = pos.get(k); return Math.hypot(p[0] - x, p[1] - y) <= bd + 40; });
  };
  // from any node of one station to the nearest node of the next: no
  // turning back at a crossover because the train came in on the other track
  const dijkstra = (from, to) => {
    const goal = new Set(to);
    const dist = new Map(), prev = new Map(), done = new Set();
    const open = new Heap();
    for (const f of from) { dist.set(f, 0); open.push(0, f); }
    let hit = null;
    while (open.size) {
      const [d, u] = open.pop();
      if (done.has(u)) continue;
      done.add(u);
      if (goal.has(u)) { hit = u; break; }
      for (const [v, w] of adj.get(u)) {
        const nd = d + w;
        if (nd < (dist.has(v) ? dist.get(v) : Infinity)) { dist.set(v, nd); prev.set(v, u); open.push(nd, v); }
      }
    }
    if (!hit) return null;
    const path = [hit];
    while (prev.has(path[0])) path.unshift(prev.get(path[0]));
    return path;
  };
  const pts = [], stops = [];
  let s = 0, last = null;
  for (const name of via) {
    const st = stations.get(name);
    if (!st) break;
    const z = zone(st.x, st.y, 400);
    if (!z.length) break;
    if (last) {
      const leg = dijkstra(last, z);
      if (!leg) break;
      // the leg may leave the station from its other track: a step across
      const p0 = pos.get(leg[0]), q = pts[pts.length - 1];
      if (Math.hypot(p0[0] - q[0], p0[1] - q[1]) > 0.05) { s += Math.hypot(p0[0] - q[0], p0[1] - q[1]); pts.push(p0); }
      for (let i = 1; i < leg.length; i++) { const a = pos.get(leg[i - 1]), b = pos.get(leg[i]); s += Math.hypot(b[0] - a[0], b[1] - a[1]); pts.push(b); }
    } else {
      let best = z[0], bd = Infinity;
      for (const k of z) { const p = pos.get(k); const d = Math.hypot(p[0] - st.x, p[1] - st.y); if (d < bd) { bd = d; best = k; } }
      pts.push(pos.get(best));
    }
    stops.push({ name, s: r2(s) });
    last = z;
  }
  return { pts: pts.map(([x, y]) => [r2(x), r2(y)]), stops, reached: stops.length === via.length };
}

// Bus lines from OSM route relations (members carry their geometry): ref,
// name, the way geometry chained, and the stops in order.
export function busLines(els) {
  const out = [];
  for (const el of els) {
    const t = el.tags || {};
    if (el.type !== 'relation' || t.route !== 'bus') continue;
    const ways = [], stops = [];
    for (const m of el.members || []) {
      if (m.type === 'way' && m.g && !/platform/.test(m.role || '')) ways.push(m.g.map(([la, lo]) => wgsToWorld(la, lo).map(r2)));
      if (m.type === 'node' && /stop|platform/.test(m.role || '') && m.lat !== undefined) { const [x, y] = wgsToWorld(m.lat, m.lon); stops.push({ x: r2(x), y: r2(y), ref: m.ref }); }
    }
    if (!ways.length) continue;
    // chain the ways end to end, flipping where needed
    const pts = ways[0].slice();
    for (let i = 1; i < ways.length; i++) {
      let w = ways[i];
      const e = pts[pts.length - 1];
      const dHead = Math.hypot(w[0][0] - e[0], w[0][1] - e[1]), dTail = Math.hypot(w[w.length - 1][0] - e[0], w[w.length - 1][1] - e[1]);
      if (dTail < dHead) w = w.slice().reverse();
      if (i === 1) {
        const s0 = pts[0], dFlip = Math.min(Math.hypot(w[0][0] - s0[0], w[0][1] - s0[1]), Math.hypot(w[w.length - 1][0] - s0[0], w[w.length - 1][1] - s0[1]));
        if (dFlip < Math.min(dHead, dTail)) pts.reverse();
      }
      for (const p of w) if (Math.hypot(p[0] - pts[pts.length - 1][0], p[1] - pts[pts.length - 1][1]) > 0.05) pts.push(p);
    }
    out.push({ id: el.id, ref: t.ref || '', name: t.name || '', from: t.from || '', to: t.to || '', pts, stops });
  }
  return out.sort((a, b) => (a.ref + a.id < b.ref + b.id ? -1 : 1));
}

// ------------------------------------------------------------- build

// does a tile overlap the box of data/ommeland_raw.json.gz (what the old
// layers draw), whichever cache the tile is built from
let omBox = null;
export function ommelandBox(i, j, root = ROOT) {
  if (!omBox) omBox = gunzipJson(path.join(root, 'data/ommeland_raw.json.gz')).bbox;
  const [ox, oy] = G.tileOrigin(i, j);
  const [s, w, n, e] = omBox;
  return [[ox, oy], [ox + G.TILE_M, oy], [ox, oy + G.TILE_M], [ox + G.TILE_M, oy + G.TILE_M]].some(([x, y]) => { const [la, lo] = worldToWgs(x, y); return la >= s && la <= n && lo >= w && lo <= e; });
}

// canopies (derive_tiles.mjs: platform roofs, open roofs) only come with the province's derivation
const PER_TILE = ['buildings', 'roads', 'water', 'green', 'trees', 'rails', 'canopies', 'parcels'];
const SECTION_OF = { buildings: G.SECTION.BUILDINGS, roads: G.SECTION.ROADS, water: G.SECTION.WATER, green: G.SECTION.GREEN, trees: G.SECTION.TREES, rails: G.SECTION.RAILS, parcels: G.SECTION.PARCELS, canopies: G.SECTION.CANOPIES };

// One tile out of the world builder's features that touch it: lines and
// areas cut at the tile edge (a piece of a way per tile, sharing its end
// point on the edge with the next: the portal), buildings, trees and mapped
// furniture by their own point. gid: the running ids per kind (advanced);
// stats: totals (advanced). extras.junctions: the junction model's nodes of the
// pack (junction_tiles.mjs; arms name road rows), written as the tile's
// JUNCTIONS rows for the nodes inside it. null when nothing lands in the tile.
export function tileBlob(i, j, list, gid, flags, builder, stats = null, extras = null) {
  const [ox, oy] = G.tileOrigin(i, j);
  const box = [ox, oy, ox + G.TILE_M, oy + G.TILE_M];
  const rows = Object.fromEntries(PER_TILE.map((q) => [q, []]));
  const mapped = [], heights = [];
  const pieces = extras && extras.junctions ? new Map() : null;
  for (const f of list) {
    // mapped furniture: in every tile one of its points lies in, one id for it
    if (f.kind === 'furniture') {
      if (!f.row.pts.some((p) => p[0] >= box[0] && p[0] < box[2] && p[1] >= box[1] && p[1] < box[3])) continue;
      if (f.gid === undefined) f.gid = gid.furniture++;
      mapped.push({ gid: f.gid, ...f.row });
      continue;
    }
    if (f.kind === 'buildings' || f.kind === 'trees' || f.kind === 'canopies') { rows[f.kind].push({ gid: gid[f.kind]++, ...f.row }); continue; }
    if (f.kind === 'water' || f.kind === 'green' || f.kind === 'parcels') {
      const P = clipPoly(f.row.pts, box);
      if (P && P.length >= 4) rows[f.kind].push({ gid: gid[f.kind]++, ...f.row, pts: P });
      continue;
    }
    for (const piece of clipLine(f.row.pts, box)) {
      // a road's height profile (province_profile.mjs) goes into the heights section, cut to the piece
      const { z: wayZ, zt: wayZt, ...flatRow } = f.row;
      const r = { gid: gid[f.kind]++, ...flatRow, pts: piece };
      rows[f.kind].push(r);
      if ((wayZ || wayZt) && f.kind === 'roads') {
        const z = wayZ ? cutZ(f.row, piece) : null, o = gradeOrder(r);
        // the terrain profile of the piece (#269): zt and its structures, or zf for a piece flat over the terrain
        const zt = wayZt && wayZt.length ? cutZt(f.row, piece) : null;
        const row = { gid: r.gid };
        if (z && !isFlat(z)) { const st = segmentStructures({ ...r, z }); Object.assign(row, { pnet: 0, z, st, ly: st.map(() => o) }); }
        if (zt && (!isFlat(zt) || (f.row.bridge && !f.row.tunnel))) { const stt = segmentStructures({ ...r, z: zt }); Object.assign(row, { zt, stt }); if (!row.z) Object.assign(row, { pnet: -1, ly: stt.map(() => o) }); }
        else if (wayZt && row.z) row.zf = 1;
        if (row.z || row.zt || row.zf) heights.push(row);
      }
      if (pieces && f.kind === 'roads') (pieces.get(f.row) || pieces.set(f.row, []).get(f.row)).push(r);
    }
  }
  // a grass, park or forest outline cut at the tile edge can end up wholly in the water of this tile
  // (the whole outline was not): drawn, it is a green strip across the open water (issue #185)
  if (rows.green.length && rows.water.length) {
    const wet = waterIndex(rows.water);
    rows.green = rows.green.filter((g) => g.pts.length < 4 || wetFraction(g.pts, wet) < GREEN_WET_FRAC);
  }
  // the junction model: a node in this tile, its arms by the road pieces of this tile that hold the node
  const junctions = [];
  if (pieces) {
    for (const J of extras.junctions) {
      if (!(J.x >= box[0] && J.x < box[2] && J.y >= box[1] && J.y < box[3])) continue;
      const a = [];
      for (const arm of J.arms) {
        const v = arm.road.pts[arm.idx];
        for (const pc of pieces.get(arm.road) || []) {
          const q = pc.pts.findIndex((u) => u[0] === v[0] && u[1] === v[1]);
          if (q >= 0) { a.push([pc.gid, q, arm.d, RULES.indexOf(arm.rule), r2(arm.stop), arm.enter ? 1 : 0]); break; }
        }
      }
      if (a.length >= 2) junctions.push({ k: J.key, p: [[J.x, J.y]], c: J.control, a });
    }
    junctions.sort((p, q) => (p.k < q.k ? -1 : p.k > q.k ? 1 : 0));
  }
  // what OSM maps, then the tile's own hooks (furniture, greenery: builderhooks.js); they see the tile's box
  rows.tile = { i, j, x0: ox, y0: oy, size: G.TILE_M };
  const extra = mapped.concat(WB.runHooks('furniture', rows), WB.runHooks('greenery', rows));
  const nav = edgeRows(rows.roads, (r) => r.gid).map(({ a, b, ...rest }) => ({ ...rest, p: [a, b] }));
  const sections = PER_TILE.filter((q) => rows[q].length).map((q) => ({
    // a tree: its point, and species, height (dm) and flags (greenery.js)
    type: SECTION_OF[q], rows: q === 'trees' ? rows[q].map((r) => ({ g: r.gid, p: [[r[0], r[1]]], ...(r[2] !== undefined ? { s: r[2], h: r[3], ...(r[4] ? { f: r[4] } : null) } : null) })) : rows[q].map(cleanRow),
  }));
  if (heights.length) sections.push({ type: G.SECTION.HEIGHTS, rows: heights });
  if (junctions.length) sections.push({ type: G.SECTION.JUNCTIONS, rows: junctions });
  if (nav.length) sections.push({ type: G.SECTION.NAV, rows: nav });
  if (extra.length) sections.push({ type: G.SECTION.FURNITURE, rows: extra });
  if (!sections.length) return null;
  // the AHN terrain of the tile (build_province.mjs --terrain; #78)
  if (extras && extras.terrain) sections.push({ type: G.SECTION.RASTER, raster: extras.terrain });
  const n = Object.fromEntries(PER_TILE.filter((q) => rows[q].length).map((q) => [q, rows[q].length]));
  if (mapped.length) n.furniture = mapped.length;
  if (junctions.length) n.junctions = junctions.length;
  if (stats) {
    for (const q of PER_TILE) if (rows[q].length || q !== 'canopies') stats[q] = (stats[q] || 0) + rows[q].length;
    if (mapped.length) stats.furniture = (stats.furniture || 0) + mapped.length;
    if (junctions.length) stats.junctions = (stats.junctions || 0) + junctions.length;
    if (heights.length) stats.heights = (stats.heights || 0) + heights.length;
    for (const b of rows.buildings) stats.hsrc[b.hsrc] = (stats.hsrc[b.hsrc] || 0) + 1;
    stats.tiles++;
  }
  let maxH = 0;
  for (const b of rows.buildings) if ((b.h || 0) > maxH) maxH = b.h;
  return { i, j, flags, bytes: G.encodeBlob({ i, j, flags, builder, sections }), n, maxH };
}

export function buildCorridor({ root = ROOT, cityKeys = new Set(), sources = loadSources(root), places = loadPlaces(root) } = {}) {
  const { keys, tiles } = corridorTiles(places);
  const srcOf = tileSources(root);
  const oldCover = (i, j) => { const s = srcOf(i, j); return s === 'ommeland' || s === 'ommeland-part' || ommelandBox(i, j); };
  const want = new Map(); // key -> 'ommeland' | 'corridor'
  const missing = [], city = [];
  for (const k of keys) {
    const t = tiles.get(k);
    const s = srcOf(t.i, t.j, cityKeys);
    if (s === 'city') city.push(k);
    else if (s === 'corridor') want.set(k, 'corridor');
    else if (s === 'ommeland') want.set(k, 'ommeland');
    else missing.push(k); // no cache, or only part of the tile in the Ommeland box
  }
  // features per source
  const urbanAt = urbanField(sources.ommeland.boxes);
  const village = (x, y) => urbanAt(x, y) >= 0.5;
  const ctx = { urbanAt, village };
  const feats = { ommeland: features(sources.ommeland.els, ctx), corridor: new Map() };
  for (const b of sources.ommeland.boxes) {
    for (const o of boxOutlines(b)) {
      const c = centroid(o.pts);
      const row = WB.buildBuilding({ pts: o.pts, code: o.code, levels: o.levels, urban: urbanAt(c[0], c[1]) });
      if (row) feats.ommeland.push({ kind: 'buildings', row });
    }
  }
  for (const [pk, els] of sources.corridor) feats.corridor.set(pk, features(els, ctx));
  for (const list of [feats.ommeland, ...feats.corridor.values()]) {
    WB.applyDuals(list.filter((f) => f.kind === 'roads').map((f) => f.row));
  }
  // spatial index of each feature list by tile
  const index = (list) => {
    const m = new Map();
    for (const f of list) {
      let bb;
      if (f.kind === 'trees') bb = [f.row[0], f.row[1], f.row[0], f.row[1]];
      else if (f.kind === 'buildings') { const c = centroid(f.row.pts); bb = [c[0], c[1], c[0], c[1]]; }
      else { const xs = f.row.pts.map((p) => p[0]), ys = f.row.pts.map((p) => p[1]); bb = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]; }
      const [i0, j0] = G.tileIndexOf(bb[0], bb[1]), [i1, j1] = G.tileIndexOf(bb[2], bb[3]);
      for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) { const k = G.tileKey(i, j); (m.get(k) || m.set(k, []).get(k)).push(f); }
    }
    return m;
  };
  const idx = { ommeland: index(feats.ommeland), corridor: new Map([...feats.corridor].map(([k, v]) => [k, index(v)])) };
  const gid = Object.fromEntries([...PER_TILE, 'furniture'].map((k) => [k, GID0]));
  const blobs = new Map();
  const stats = { tiles: 0, buildings: 0, roads: 0, water: 0, rails: 0, green: 0, trees: 0, hsrc: {} };
  for (const k of [...want.keys()].sort()) {
    const t = tiles.get(k);
    const list = want.get(k) === 'corridor' ? (idx.corridor.get(packOf(t.i, t.j)) || new Map()).get(k) || [] : idx.ommeland.get(k) || [];
    // flags: 1 land, 4 corridor, 8 inside the old Ommeland box (data/ommeland_raw.json.gz)
    const tb = tileBlob(t.i, t.j, list, gid, 1 | 4 | (oldCover(t.i, t.j) ? 8 : 0), CORRIDOR_BUILDER, stats);
    if (!tb) continue;
    blobs.set(k, { ...tb, src: want.get(k) });
  }
  // the global corridor layer: places, stations, rail routes, bus lines
  const inCorridor = (x, y) => { const [i, j] = G.tileIndexOf(x, y); return tiles.has(G.tileKey(i, j)); };
  const allEls = [...sources.ommeland.els, ...[...sources.corridor.values()].flat()];
  const stations = new Map();
  for (const el of allEls) {
    const t = el.tags || {};
    if (el.type === 'node' && (t.railway === 'station' || t.railway === 'halt') && t.name && !stations.has(t.name)) {
      const [x, y] = wgsToWorld(el.lat, el.lon);
      stations.set(t.name.replace(/^Station\s+/, ''), { name: t.name, x: r2(x), y: r2(y) });
    }
  }
  if (stations.has('Groningen') && !stations.has('Groningen Hoofdstation')) stations.set('Groningen Hoofdstation', stations.get('Groningen'));
  const railRows = [...feats.ommeland, ...[...feats.corridor.values()].flat()].filter((f) => f.kind === 'rails').map((f) => f.row);
  const routes = LINES.filter((L) => L.kind === 'rail').map((L) => {
    const r = railRoute(railRows, stations, L.via.map((v) => (v === 'Groningen' ? 'Groningen' : v)));
    return { id: L.id, name: L.name, via: L.via, ...r, missing: L.via.filter((v) => !stations.has(v)) };
  });
  const placeList = [...places.values()].filter((p) => inCorridor(p.x, p.y)).map((p) => ({ name: p.name, kind: p.kind, x: r2(p.x), y: r2(p.y), pop: p.pop }));
  // a suburb or neighbourhood belongs to the nearest town or village within 3 km
  const seats = placeList.filter((p) => ['city', 'town', 'village'].includes(p.kind));
  for (const p of placeList) {
    if (!['suburb', 'quarter', 'neighbourhood'].includes(p.kind)) continue;
    let best = null, bd = 3000;
    for (const s of seats) { const d = Math.hypot(s.x - p.x, s.y - p.y); if (d < bd) { bd = d; best = s; } }
    if (best) p.of = best.name;
  }
  const bus = busLines([...sources.corridor.values()].flat());
  const global = {
    builder: CORRIDOR_BUILDER, towns: TOWNS.map((T) => T.name), places: placeList,
    stations: [...stations.entries()].filter(([, s]) => inCorridor(s.x, s.y)).map(([key, s]) => ({ key, ...s })).sort((a, b) => (a.key < b.key ? -1 : 1)),
    routes, bus, lines: LINES.map(({ id, kind, name, via }) => ({ id, kind, name, via })),
    // the Wadden coast and borders (worldedge.js), from the corridor cache
    edge: edgeFromOsm([...sources.corridor.values()].flat(), (la, lo) => wgsToWorld(la, lo).map(r2)),
    missing: missing.sort(), city: city.sort(),
  };
  // the city's routes run on over the proefstrook's track, and the track outside the city's tiles (cityroutes.mjs)
  const inCity = (x, y) => { const [i, j] = G.tileIndexOf(x, y); return cityKeys.has(G.tileKey(i, j)); };
  const rail = { ...bakeCityRoutes(global, { root }), rails: railLines(railRows, inCity), ...finishFarProps(collectFarNodes(allEls)) };
  return { blobs, global, stats, keys, want, missing, rail };
}

const DROP = new Set(['bounds', 'zt']);
export function cleanRow(o) {
  const out = {};
  for (const k in o) if (!DROP.has(k) && k[0] !== '_' && o[k] !== undefined) out[k] = o[k];
  return out;
}

const deflate = (b) => new Uint8Array(zlib.deflateRawSync(b, { level: 9 }));

// c<pack>-<hash>.gdp + index-corridor.json; leaves the city's files alone
export function writeCorridor(out, built) {
  const r = writeLayer(out, { ...built, global: { ...built.global, landFile: 'corridor-land.json' } }, { prefix: 'c', file: 'index-corridor.json', layer: 'corridor', builder: CORRIDOR_BUILDER });
  fs.writeFileSync(path.join(out, 'corridor-land.json'), JSON.stringify({ builder: CORRIDOR_BUILDER, ...built.rail }));
  return r;
}

// A tile layer next to the city's: <prefix><pack>-<hash>.gdp packs and its
// index file (tiles, packs, the layer's global part); replaces the layer's
// earlier files in `out` and leaves everything else alone.
export function writeLayer(out, { blobs, global, stats }, { prefix, file: indexFile, layer, builder }) {
  fs.mkdirSync(out, { recursive: true });
  const mine = new RegExp(`^${prefix}-?\\d+_-?\\d+-[0-9a-f]+\\.gdp$`);
  for (const f of fs.readdirSync(out)) if (mine.test(f) || f === indexFile) fs.rmSync(path.join(out, f));
  const packs = new Map();
  for (const [key, b] of blobs) { const pk = prefix + packOf(b.i, b.j); (packs.get(pk) || packs.set(pk, []).get(pk)).push([key, b]); }
  const index = { format: G.GDT_FORMAT, builder, frame: 'rd-new', tileM: G.TILE_M, layer, packs: {}, tiles: {}, global, stats };
  let size = 0;
  for (const name of [...packs.keys()].sort()) {
    const entries = packs.get(name).sort((a, b) => (a[0] < b[0] ? -1 : 1));
    const parts = [];
    let off = 0;
    const meta = [];
    for (const [key, b] of entries) {
      const z = deflate(b.bytes);
      parts.push(z);
      meta.push([key, { off, len: z.length, raw: b.bytes.length, hash: G.hash64(b.bytes), b }]);
      off += z.length;
    }
    const all = new Uint8Array(off);
    let o = 0;
    for (const p of parts) { all.set(p, o); o += p.length; }
    const file = `${name}-${G.hash64(all).slice(0, 12)}.gdp`;
    fs.writeFileSync(path.join(out, file), all);
    index.packs[name] = { file, size: all.length };
    size += all.length;
    for (const [key, m] of meta) index.tiles[key] = { i: m.b.i, j: m.b.j, pack: name, off: m.off, len: m.len, raw: m.raw, hash: m.hash, flags: m.b.flags, n: m.b.n, maxH: m.b.maxH, src: m.b.src, ...(m.b.ov ? { ov: 1 } : null) };
  }
  fs.writeFileSync(path.join(out, indexFile), JSON.stringify(index));
  return { index, size };
}

// the city's tile keys: from a packed index, else by packing the city
async function cityKeysOf(arg) {
  if (arg && fs.existsSync(arg)) return new Set(Object.keys(JSON.parse(fs.readFileSync(arg, 'utf8')).tiles));
  await import('../node3d.mjs');
  const P = await import('./pack_tiles.mjs');
  const built = P.build(await P.loadSourcesLaag());
  return new Set(built.blobs.keys());
}

async function main() {
  const args = process.argv.slice(2);
  const opt = (k) => (args.includes(k) ? args[args.indexOf(k) + 1] : null);
  const out = path.resolve(ROOT, opt('--out') || 'game/world');
  const t0 = performance.now();
  const cityKeys = await cityKeysOf(opt('--city') || path.join(out, 'index.json'));
  const t1 = performance.now();
  const built = buildCorridor({ cityKeys });
  const t2 = performance.now();
  const { index, size } = writeCorridor(out, built);
  const raw = Object.values(index.tiles).reduce((a, t) => a + t.raw, 0);
  const s = built.stats;
  console.log(`corridor: ${built.keys.length} tiles, ${s.tiles} built (${Object.keys(index.packs).length} packs, ${(size / 1e6).toFixed(2)} MB, ${(raw / 1e6).toFixed(2)} MB raw), ${built.global.city.length} are the city's, ${built.missing.length} without a local cache`);
  console.log(`  ${s.buildings} buildings (height ${Object.entries(s.hsrc).map(([k, v]) => `${k} ${v}`).join(', ')}), ${s.roads} road pieces, ${s.water} water, ${s.rails} rail pieces`);
  console.log(`  ${built.global.places.length} places, ${built.global.stations.length} stations, bus lines ${built.global.bus.length}; routes: ${built.global.routes.map((r) => `${r.id} ${r.stops.map((q) => q.name).join('>')}${r.reached ? '' : ' (data stops there)'}`).join('; ')}`);
  console.log(`  city keys ${((t1 - t0) / 1000).toFixed(1)} s, build ${((t2 - t1) / 1000).toFixed(1)} s -> ${path.relative(ROOT, out)}`);
  if (built.missing.length) console.log(`  missing tiles need: python3 scripts/world/fetch_corridor.py (then run this again)`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) await main();
