// Placement audit (issue #124): buildings that stand in water, and fences and
// hedges that run over a road, a rail or water.
//
//   node scripts/world/placement_audit.mjs                 the city (stad.json and the OSM layers)
//   node scripts/world/placement_audit.mjs --world [dir]   the built tiles (default game/world, the province layer)
//   node scripts/world/placement_audit.mjs --strict        exit 1 above the thresholds
//
// Buildings: a footprint is sampled (its corners pulled 0.3 m inwards, and a
// 1.5 m grid inside it); WET_FRAC of the samples or more in a water polygon is
// a building in water. Houseboats float on purpose and do not count. The
// water rows have no holes, an island is a slit in the outline (build_corridor
// cutIslands), so the even-odd test sees it dry.
//
// Lines (fences, hedges: mapped OSM lines and the pieces the furniture
// generator puts down): sampled every metre; the metres on a carriageway or
// cycle path (a ground-level way), on a rail or in water are added up, and a
// line with LINE_MIN_M or more of it is over the way or the water. Two
// numbers: the lines as OSM maps them (`mapped`, information) and the pieces as
// the game places them (`placed`, which the thresholds hold to zero).
//
// With --world the tiles are read one by one from index-provincie.json:
// water and ways that lie in another tile than the building are not seen. The countryside's props
// (fences, hedges, reeds, banks) are not in the tiles: scripts/world/prop_water_audit.mjs counts those.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export const WET_FRAC = 0.2;
export const LINE_MIN_M = 2;
// What --strict allows. Placed fences and hedges over a way or water: none.
// Buildings in water: the city's OSM has 104 (piers, moorings and boat sheds
// mapped as building=yes on a harbour or river polygon; counted 2026-10-18),
// so 110; for the province 0.1 % of the buildings until the first run over
// the built tiles has given a real baseline (nothing to measure it on here).
// Green outlines (grass, park, forest) that lie nearly wholly in water draw a green strip across
// the open water (issue #185): build_province.mjs drops them (DROWNED_FRAC); the city's map has one.
export const GREEN_WET_FRAC = 0.8;
export const THRESHOLDS = { city: 110, worldRatio: 0.001, placedOver: 0, greenInWater: 1 };

const CELL = 64;
const cellKey = (i, j) => i * 100003 + j;

function bounds(P) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of P) { if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0]; if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; }
  return [x0, y0, x1, y1];
}
function inRing(x, y, P) {
  let c = false;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    if ((P[i][1] > y) !== (P[j][1] > y) && x < ((P[j][0] - P[i][0]) * (y - P[i][1])) / (P[j][1] - P[i][1]) + P[i][0]) c = !c;
  }
  return c;
}

// a grid of items by bounds: query(x, y) -> the items whose box holds the cell of (x, y)
function boxGrid(items, boxOf, pad = 0) {
  const g = new Map();
  for (const it of items) {
    const b = boxOf(it);
    for (let i = Math.floor((b[0] - pad) / CELL); i <= Math.floor((b[2] + pad) / CELL); i++) {
      for (let j = Math.floor((b[1] - pad) / CELL); j <= Math.floor((b[3] + pad) / CELL); j++) {
        const k = cellKey(i, j);
        (g.get(k) || g.set(k, []).get(k)).push(it);
      }
    }
  }
  return (x, y) => g.get(cellKey(Math.floor(x / CELL), Math.floor(y / CELL))) || [];
}

// (x, y) inside a water polygon (islands cut out)
export function waterIndex(water) {
  const rows = water.filter((w) => w && w.pts && w.pts.length >= 4).map((w) => ({ pts: w.pts, b: bounds(w.pts) }));
  const at = boxGrid(rows, (r) => r.b);
  return (x, y) => {
    for (const r of at(x, y)) if (x >= r.b[0] && x <= r.b[2] && y >= r.b[1] && y <= r.b[3] && inRing(x, y, r.pts)) return true;
    return false;
  };
}

// ways a fence must not cross: ground-level carriageways and paths (half width), and rails (1.5 m)
function wayIndex(roads, rails) {
  const segs = [];
  for (const r of roads || []) {
    if (!r || !r.pts || r.cat === 'foot' || r.bridge || r.tunnel || r.layer > 0 || r.layer < 0) continue;
    if (r.z && r.z.some((z) => Math.abs(z) > 3)) continue;
    const hw = Math.max(0.5, (r.width || 4) / 2 - 0.2);
    for (let i = 0; i < r.pts.length - 1; i++) segs.push({ a: r.pts[i], b: r.pts[i + 1], hw, what: 'road' });
  }
  for (const r of rails || []) {
    const P = r.pts || r;
    for (let i = 0; i < P.length - 1; i++) segs.push({ a: P[i], b: P[i + 1], hw: 1.5, what: 'rail' });
  }
  const at = boxGrid(segs, (s) => [Math.min(s.a[0], s.b[0]), Math.min(s.a[1], s.b[1]), Math.max(s.a[0], s.b[0]), Math.max(s.a[1], s.b[1])], 4);
  return (x, y) => {
    for (const s of at(x, y)) {
      const dx = s.b[0] - s.a[0], dy = s.b[1] - s.a[1], L2 = dx * dx + dy * dy || 1e-9;
      const t = Math.max(0, Math.min(1, ((x - s.a[0]) * dx + (y - s.a[1]) * dy) / L2));
      if ((s.a[0] + dx * t - x) ** 2 + (s.a[1] + dy * t - y) ** 2 < s.hw * s.hw) return s.what;
    }
    return null;
  };
}

// A jetty or pier mapped as a building: long and narrow (under 4 m wide, over 8 m long). It stands
// in the water on purpose; it must not lie over a road.
export function isLandingStage(P) {
  let L = 0, A = 0;
  for (let i = 0; i < P.length - 1; i++) {
    L = Math.max(L, Math.hypot(P[i + 1][0] - P[i][0], P[i + 1][1] - P[i][1]));
    A += P[i][0] * P[i + 1][1] - P[i + 1][0] * P[i][1];
  }
  return L > 8 && Math.abs(A / 2) / L < 4;
}

// the fraction of a footprint's samples that lie in water
export function wetFraction(pts, wet) {
  const n = pts.length - (pts[0][0] === pts[pts.length - 1][0] && pts[0][1] === pts[pts.length - 1][1] ? 1 : 0);
  if (n < 3) return 0;
  const cx = pts.slice(0, n).reduce((t, p) => t + p[0], 0) / n, cy = pts.slice(0, n).reduce((t, p) => t + p[1], 0) / n;
  let total = 0, w = 0;
  for (let i = 0; i < n; i++) {
    const dx = cx - pts[i][0], dy = cy - pts[i][1], l = Math.hypot(dx, dy) || 1, k = Math.min(0.3, l / 2) / l;
    total++;
    if (wet(pts[i][0] + dx * k, pts[i][1] + dy * k)) w++;
  }
  const b = bounds(pts);
  const step = Math.max(1.5, Math.sqrt(((b[2] - b[0]) * (b[3] - b[1])) / 400));
  for (let x = b[0] + step / 2; x < b[2]; x += step) {
    for (let y = b[1] + step / 2; y < b[3]; y += step) {
      if (!inRing(x, y, pts)) continue;
      total++;
      if (wet(x, y)) w++;
    }
  }
  return total ? w / total : 0;
}

// metres of a line (pts) on a way, a rail or in water, sampled every metre
export function lineOver(pts, wet, way) {
  const over = { road: 0, rail: 0, water: 0 };
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const n = Math.max(1, Math.ceil(L));
    for (let k = 0; k <= n; k++) {
      const x = a[0] + ((b[0] - a[0]) * k) / n, y = a[1] + ((b[1] - a[1]) * k) / n;
      if (wet(x, y)) over.water += L / n;
      const w = way(x, y);
      if (w) over[w] += L / n;
    }
  }
  return over;
}

// data: { buildings, roads, water, rails?, mapped?: [{ k, pts }], placed?: [{ k, pts }] }
export function auditPlacement(data) {
  const wet = waterIndex(data.water || []);
  const way = wayIndex(data.roads, data.rails);
  const rep = { buildings: (data.buildings || []).length, buildingsInWater: [], greenInWater: [], stagesOnRoad: [], mapped: { lines: 0, over: [] }, placed: { lines: 0, over: [] } };
  for (const b of data.buildings || []) {
    if (!b.pts || b.pts.length < 4 || b.type === 'houseboat') continue;
    const bb = bounds(b.pts);
    // a landing stage (long, narrow, partly in water) over a carriageway: a metre grid over its footprint
    if (isLandingStage(b.pts) && wetFraction(b.pts, wet) >= 0.1) {
      let onRoad = 0;
      for (let x = bb[0]; x <= bb[2]; x++) for (let y = bb[1]; y <= bb[3]; y++) if (inRing(x, y, b.pts) && way(x, y) === 'road') onRoad++;
      if (onRoad >= 3) rep.stagesOnRoad.push({ at: [Math.round((bb[0] + bb[2]) / 2), Math.round((bb[1] + bb[3]) / 2)], m2: onRoad, name: b.name || '' });
    }
    const f = wetFraction(b.pts, wet);
    if (f >= WET_FRAC) rep.buildingsInWater.push({ at: [Math.round((bb[0] + bb[2]) / 2), Math.round((bb[1] + bb[3]) / 2)], frac: Math.round(f * 100) / 100, type: b.type || '', name: b.name || '' });
  }
  rep.buildingsInWater.sort((a, b) => b.frac - a.frac);
  for (const g of data.green || []) {
    if (!g.pts || g.pts.length < 4) continue;
    const f = wetFraction(g.pts, wet);
    if (f >= GREEN_WET_FRAC) { const bb = bounds(g.pts); rep.greenInWater.push({ at: [Math.round((bb[0] + bb[2]) / 2), Math.round((bb[1] + bb[3]) / 2)], frac: Math.round(f * 100) / 100, kind: g.kind || '' }); }
  }
  for (const [name, lines] of [['mapped', data.mapped || []], ['placed', data.placed || []]]) {
    for (const l of lines) {
      if (!l.pts || l.pts.length < 2) continue;
      rep[name].lines++;
      const o = lineOver(l.pts, wet, way);
      const m = o.road + o.rail + o.water;
      if (m >= LINE_MIN_M) rep[name].over.push({ k: l.k, at: [Math.round(l.pts[0][0]), Math.round(l.pts[0][1])], road: Math.round(o.road), rail: Math.round(o.rail), water: Math.round(o.water) });
    }
  }
  return rep;
}

export const problems = (rep, world = false) => {
  const max = world ? Math.floor(rep.buildings * THRESHOLDS.worldRatio) : THRESHOLDS.city;
  return rep.stagesOnRoad.length + Math.max(0, rep.buildingsInWater.length - max) + Math.max(0, rep.placed.over.length - THRESHOLDS.placedOver) + Math.max(0, rep.greenInWater.length - THRESHOLDS.greenInWater);
};

export function printAudit(rep, limit = 8) {
  console.log(`buildings in water (>= ${Math.round(WET_FRAC * 100)} % of the footprint): ${rep.buildingsInWater.length} of ${rep.buildings}`);
  for (const q of rep.buildingsInWater.slice(0, limit)) console.log(`  ${q.type || 'building'}${q.name ? ' ' + q.name : ''} ${Math.round(q.frac * 100)} % at ${q.at}`);
  console.log(`green outlines in open water (>= ${Math.round(GREEN_WET_FRAC * 100)} %): ${rep.greenInWater.length}`);
  for (const q of rep.greenInWater.slice(0, limit)) console.log(`  ${q.kind || 'green'} ${Math.round(q.frac * 100)} % at ${q.at}`);
  console.log(`landing stages (long narrow buildings) over a carriageway: ${rep.stagesOnRoad.length}`);
  for (const q of rep.stagesOnRoad.slice(0, limit)) console.log(`  ${q.name || 'stage'} ${q.m2} m2 on a road at ${q.at}`);
  for (const name of ['mapped', 'placed']) {
    const r = rep[name];
    console.log(`${name} fences and hedges over a way or water (>= ${LINE_MIN_M} m): ${r.over.length} of ${r.lines}${name === 'mapped' ? ' (as OSM draws them)' : ''}`);
    for (const q of r.over.slice(0, limit)) console.log(`  ${q.k} at ${q.at}: road ${q.road} m, rail ${q.rail} m, water ${q.water} m`);
  }
}

// ------------------------------------------------------------------ sources

// the pieces the furniture generator puts down, as short lines (fence, hedge)
async function cityLines(data) {
  const F = await import('./furniture.mjs');
  const placed = [];
  for (const t of F.generateAll(data)) {
    for (const it of t.items) {
      if (it.k !== 'fence' && it.k !== 'hedge') continue;
      const hx = Math.cos(it.a) * it.s / 2, hy = Math.sin(it.a) * it.s / 2;
      placed.push({ k: it.k, pts: [[it.x - hx, it.y - hy], [it.x + hx, it.y + hy]] });
    }
  }
  const mapped = (data.furniture || []).filter((m) => (m.k === 'fence' || m.k === 'hedge') && m.pts && m.pts.length > 1).map((m) => ({ k: m.k, pts: m.pts }));
  return { mapped, placed };
}

// every tile of the built province layer, its rows in one list each
async function worldData(out) {
  await import('../node3d.mjs');
  const G = await import('../../game/js/gdt.js');
  const file = path.join(out, 'index-provincie.json');
  if (!fs.existsSync(file)) return null;
  const index = JSON.parse(fs.readFileSync(file, 'utf8'));
  const fds = new Map();
  const data = { buildings: [], roads: [], water: [], rails: [], green: [], mapped: [], placed: [] };
  for (const t of Object.values(index.tiles)) {
    const f = index.packs[t.pack].file;
    if (!fds.has(f)) fds.set(f, fs.openSync(path.join(out, f), 'r'));
    const buf = Buffer.alloc(t.len);
    fs.readSync(fds.get(f), buf, 0, t.len, t.off);
    const blob = G.decodeBlob(new Uint8Array(zlib.inflateRawSync(buf)));
    const rows = (type) => (blob.sections.find((s) => s.type === type) || { rows: [] }).rows;
    for (const b of rows(G.SECTION.BUILDINGS)) data.buildings.push(b);
    for (const r of rows(G.SECTION.ROADS)) data.roads.push(r);
    for (const w of rows(G.SECTION.WATER)) data.water.push(w);
    for (const r of rows(G.SECTION.RAILS)) data.rails.push(r);
    for (const r of rows(G.SECTION.GREEN)) data.green.push(r);
  }
  for (const fd of fds.values()) fs.closeSync(fd);
  return data;
}

async function main() {
  const args = process.argv.slice(2);
  let data;
  if (args.includes('--world')) {
    const dir = args[args.indexOf('--world') + 1];
    const out = path.resolve(ROOT, dir && !dir.startsWith('--') ? dir : 'game/world');
    data = await worldData(out);
    if (!data) { console.log(`no province layer in ${path.relative(ROOT, out)}: run scripts/world/build_province.mjs (or cd desktop && npm run stage)`); return; }
    console.log(`${data.buildings.length} buildings, ${data.water.length} water rows, ${data.roads.length} roads in the tiles (fences and hedges of the tiles are the countryside's: see countryside.js)`);
  } else {
    const { loadCityData } = await import('../lib/loadworld.mjs');
    const city = await loadCityData({ extras: false });
    data = { buildings: city.buildings, roads: city.roads, water: city.water, rails: city.rails, green: city.green, ...(await cityLines(city)) };
  }
  const t0 = performance.now();
  const rep = auditPlacement(data);
  printAudit(rep);
  console.log(`(${((performance.now() - t0) / 1000).toFixed(1)} s)`);
  if (args.includes('--strict') && problems(rep, args.includes('--world'))) process.exit(1);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) await main();
