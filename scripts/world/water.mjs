// Water bodies, movable bridges and the waterway audit (docs/PROVINCIE-PLAN.md
// 2.11, "Water").
//
//   node scripts/world/water.mjs           audit the city (stad.json and the OSM layers)
//   node scripts/world/water.mjs --write   annotate the water and the movable bridges, then audit
//   node scripts/world/water.mjs --strict  exit 1 when a navigable waterway is cut off
//
// --write sets per water polygon body, kind, lv (peil), dp (depth) and nav
// (game/js/waterlevels.js annotateWater), per road that OSM tags
// bridge:movable its `movable` kind (matched by OSM id, else by geometry:
// cycle and bus bridges carry no id in the map), and meta.locks: OSM lock
// gates (waterway=lock_gate, lock=yes) and every place where two navigable
// bodies with a different peil touch.
//
// The audit sails every navigable waterway per boat class on a 2 m grid: a
// cell is open to a class where the polygon is wide and deep enough
// (nav, dp) and any bridge over it clears the class's air draft or is
// movable. It reports, per class, the water the boezem's main channel
// reaches, the polygons wide enough for the class that it cannot reach, and
// the fixed bridges that stop it.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import {
  annotateWater, waterBodies, waterGrid, inPolygon, AIR_DRAFT, DRAFT, bridgeClearance, passesUnder, BOEZEM_Y,
} from '../../game/js/waterlevels.js';
import { wgsToWorld } from '../../game/js/rdnew.js';
import { createWaterIndex } from '../../game/js/waterindex.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
// the boat a class is audited with
export const CLASS_BOAT = { 1: 'kano', 2: 'sloep', 3: 'rondvaart', 4: 'binnenvaart' };
// beam (m): boattypes.js widths; a small barge (spits) 5.05 m
const BEAM = { kano: 0.8, sloep: 2.0, rondvaart: 3.3, binnenvaart: 5.1 };

// roads that OSM tags bridge:movable: by OSM id, else by geometry (the way's
// outline within 1.5 m of the road along most of the road's length)
export function matchMovable(roads, elements) {
  const ways = new Map();
  for (const e of elements) {
    const t = e.tags || {};
    if (e.type !== 'way' || !t['bridge:movable'] || !(t.highway || t.railway === 'tram')) continue;
    if (!ways.has(e.id)) ways.set(e.id, e);
  }
  for (const r of roads) if (r) delete r.movable;
  const byOsm = new Map(roads.filter((r) => r && r.osm).map((r) => [r.osm, r]));
  let matched = 0;
  for (const [id, w] of ways) {
    const kind = w.tags['bridge:movable'];
    let r = byOsm.get(id);
    if (!r && w.geometry) {
      const P = w.geometry.map((g) => wgsToWorld(g.lat, g.lon));
      const mx = P.reduce((a, p) => a + p[0], 0) / P.length, my = P.reduce((a, p) => a + p[1], 0) / P.length;
      let best = null, bd = 3;
      for (const q of roads) {
        if (!q.bridge || q.movable) continue;
        const b = q.pts;
        if (Math.abs(b[0][0] - mx) > 200 || Math.abs(b[0][1] - my) > 200) continue;
        // every vertex of the OSM way near the road, and the road no longer than the way + 10 m
        let worst = 0;
        for (const p of P) {
          let dmin = Infinity;
          for (let i = 0; i < b.length - 1; i++) {
            const dx = b[i + 1][0] - b[i][0], dy = b[i + 1][1] - b[i][1], L2 = dx * dx + dy * dy || 1e-9;
            const t = Math.max(0, Math.min(1, ((p[0] - b[i][0]) * dx + (p[1] - b[i][1]) * dy) / L2));
            dmin = Math.min(dmin, Math.hypot(b[i][0] + dx * t - p[0], b[i][1] + dy * t - p[1]));
          }
          worst = Math.max(worst, dmin);
        }
        if (worst < bd) { bd = worst; best = q; }
      }
      r = best;
    }
    if (!r) continue;
    r.movable = kind;
    matched++;
  }
  return { tagged: ways.size, matched };
}

// OSM lock gates and the touch points of bodies with a different peil
export function findLocks(water, elements) {
  const out = [];
  for (const e of elements) {
    const t = e.tags || {};
    if (!(t.waterway === 'lock_gate' || t.lock === 'yes')) continue;
    const p = e.type === 'node' ? wgsToWorld(e.lat, e.lon) : e.geometry ? wgsToWorld(e.geometry[0].lat, e.geometry[0].lon) : null;
    if (p) out.push({ x: Math.round(p[0] * 100) / 100, y: Math.round(p[1] * 100) / 100, name: t.name || t['lock_name'] || '', src: 'osm' });
  }
  // A lock splits the water: the world builder gives each side its body and
  // peil (game/js/locks.js makeLock takes the levels of both). Touching
  // polygons are one body here (annotateWater), so the city map, whose
  // caches hold no lock tags, has none; OSM's lock gates are where they come
  // from (the Overpass query of furniture.mjs plus waterway=lock_gate, lock=yes)
  void water;
  return out;
}

// ------------------------------------------------------------------ audit

export function audit(data, { cell = 2.5 } = {}) {
  const water = data.water || [];
  const roads = data.roads || [];
  const bodies = new Map();
  water.forEach((w, i) => { const b = w.body ?? 0; (bodies.get(b) || bodies.set(b, []).get(b)).push(i); });
  const bridges = roads.filter((r) => r && r.bridge);
  const rep = { classes: {}, bridges: [], movable: roads.filter((r) => r && r.movable).length, polygons: water.length, bodies: bodies.size };
  // the boezem: the body with the most area
  const area = (i) => { const P = water[i].pts; let a = 0; for (let k = 0, j = P.length - 1; k < P.length; j = k++) a += P[j][0] * P[k][1] - P[k][0] * P[j][1]; return Math.abs(a / 2); };
  let boezem = null, bestA = -1;
  for (const [b, list] of bodies) { const a = list.reduce((s, i) => s + area(i), 0); if (a > bestA) { bestA = a; boezem = b; } }
  const polys = bodies.get(boezem) || [];
  const g = waterGrid(water, polys, cell);
  const { W, H, x0, y0 } = g;
  // the grid's distance is a cell coarse: near a class's limit the exact
  // distance to the shore (edges shared by two polygons are no shore)
  const idx = createWaterIndex(water);
  const exact = new Map();
  const shoreDist = (k, need) => {
    if (g.dist[k] >= need + cell) return g.dist[k];
    if (exact.has(k)) return exact.get(k);
    const cx = k % W, cy = (k - cx) / W;
    const d = idx.nearestShore(x0 + (cx + 0.5) * cell, y0 + (cy + 0.5) * cell, need + 2 * cell).d;
    exact.set(k, d);
    return d;
  };
  const polyOf = g.poly;
  const clear = new Float32Array(W * H).fill(Infinity);
  const movableOver = new Uint8Array(W * H);
  const bridgeOf = new Int32Array(W * H).fill(-1);
  bridges.forEach((r, bi) => {
    const half = (r.width || 4) / 2 + 1.5, P = r.pts;
    for (let i = 0; i < P.length - 1; i++) {
      const ax = P[i][0], ay = P[i][1], dx = P[i + 1][0] - ax, dy = P[i + 1][1] - ay, L = Math.hypot(dx, dy);
      if (L < 0.05) continue;
      for (let s = 0; s <= L; s += cell / 2) {
        for (let o = -half; o <= half; o += cell / 2) {
          const x = ax + (dx * s - dy * o) / L, y = ay + (dy * s + dx * o) / L;
          const gx = Math.floor((x - x0) / cell), gy = Math.floor((y - y0) / cell);
          if (gx < 0 || gx >= W || gy < 0 || gy >= H || !polyOf[gy * W + gx]) continue;
          const z = r.z ? r.z[i] + (r.z[i + 1] - r.z[i]) * s / L : 0;
          const c = bridgeClearance(r, z, water[polyOf[gy * W + gx] - 1].lv ?? BOEZEM_Y);
          const k = gy * W + gx;
          if (c < clear[k]) { clear[k] = c; bridgeOf[k] = bi; movableOver[k] = r.movable ? 1 : 0; }
        }
      }
    }
  });
  const label = (r) => `${r.name || r.type}${r.movable ? ` (${r.movable})` : ''}`;
  for (const cls of [1, 2, 3, 4]) {
    const kind = CLASS_BOAT[cls], air = AIR_DRAFT[kind], draft = DRAFT[kind];
    const open = new Uint8Array(W * H);
    const stops = new Map();
    for (let k = 0; k < W * H; k++) {
      const pi = polyOf[k] - 1;
      if (pi < 0) continue;
      const w = water[pi];
      // room for the beam (half of it plus half a metre either side) and the draft
      if (shoreDist(k, BEAM[kind] / 2 + 0.5) < BEAM[kind] / 2 + 0.5 || (w.dp ?? 2.4) < draft + 0.3) continue;
      if (clear[k] < Infinity && !movableOver[k] && !passesUnder(air, clear[k])) {
        const r = bridges[bridgeOf[k]];
        stops.set(r, Math.min(stops.get(r) ?? Infinity, clear[k]));
        continue;
      }
      open[k] = 1;
    }
    // components: the largest is the main channel for this class
    const comp = new Int32Array(W * H).fill(-1);
    const sizes = [];
    const stack = [];
    for (let k = 0; k < W * H; k++) {
      if (!open[k] || comp[k] >= 0) continue;
      const id = sizes.length;
      let n = 0;
      comp[k] = id; stack.push(k);
      while (stack.length) {
        const c = stack.pop(); n++;
        const cx = c % W, cy = (c - cx) / W;
        for (const [ex, ey] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = cx + ex, ny = cy + ey;
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          const q = ny * W + nx;
          if (open[q] && comp[q] < 0) { comp[q] = id; stack.push(q); }
        }
      }
      sizes.push(n);
    }
    let main = 0;
    for (let i = 1; i < sizes.length; i++) if (sizes[i] > sizes[main]) main = i;
    // polygons wide enough for the class that the main channel does not reach
    const cut = [];
    const reached = new Set(), wide = new Set();
    for (let k = 0; k < W * H; k++) {
      if (!open[k]) continue;
      const pi = polyOf[k] - 1;
      wide.add(pi);
      if (comp[k] === main) reached.add(pi);
    }
    for (const pi of wide) if (!reached.has(pi)) cut.push(pi);
    const areaOf = (pi) => Math.round(area(pi));
    rep.classes[cls] = {
      boat: kind, air, draft,
      mainKm2: Math.round((sizes[main] || 0) * cell * cell) / 1e6,
      reached: reached.size, wide: wide.size,
      cutOff: cut.map((pi) => ({ poly: pi, name: water[pi].name || '', area: areaOf(pi), at: water[pi].pts[0].map(Math.round) })).sort((a, b) => b.area - a.area),
      stops: [...stops].map(([r, c]) => ({ bridge: label(r), clearance: Math.round(c * 100) / 100, at: r.pts[0].map(Math.round) })).sort((a, b) => a.clearance - b.clearance),
    };
  }
  // every bridge over the boezem: clearance and who fits
  const seen = new Set();
  for (let k = 0; k < W * H; k++) {
    if (bridgeOf[k] < 0 || seen.has(bridgeOf[k])) continue;
    seen.add(bridgeOf[k]);
    const r = bridges[bridgeOf[k]];
    rep.bridges.push({ bridge: label(r), clearance: Math.round(clear[k] * 100) / 100, movable: r.movable || null });
  }
  return rep;
}

export function printAudit(rep, limit = 6) {
  console.log(`${rep.polygons} water polygons in ${rep.bodies} bodies; ${rep.bridges.length} bridges over the boezem, ${rep.movable} movable`);
  for (const cls of Object.keys(rep.classes)) {
    const c = rep.classes[cls];
    console.log(`class ${cls} (${c.boat}, air ${c.air} m, draft ${c.draft} m): main channel ${c.mainKm2} km2, ${c.reached}/${c.wide} polygons wide enough reached; ${c.stops.length} fixed bridges too low`);
    for (const q of c.cutOff.slice(0, limit)) console.log(`  cut off: ${q.name || 'polygon ' + q.poly} (${q.area} m2) at ${q.at}`);
    for (const q of c.stops.slice(0, limit)) console.log(`  too low: ${q.bridge} ${q.clearance} m at ${q.at}`);
  }
}

// polygons wide enough for the boats that sail the city (classes 1-3) but cut off from the main channel
export const problems = (rep) => [1, 2, 3].reduce((s, c) => s + rep.classes[c].cutOff.filter((q) => q.area > 400).length, 0);

async function main() {
  const args = process.argv.slice(2);
  const { loadCityData } = await import('../lib/loadworld.mjs');
  const data = await loadCityData({ extras: false });
  if (args.includes('--write')) {
    // het water van de stad komt uit de OSM-tegelbouw (stad_laag.mjs) met zijn eigen soort en peil; er is niets meer om weg te schrijven
    console.log('--write bestaat niet meer: de lagen van de stad komen uit de OSM-tegelbouw (game/stad.json heeft alleen de handlaag)');
    process.exit(1);
  }
  const rep = audit(data);
  printAudit(rep);
  if (args.includes('--strict') && problems(rep)) process.exit(1);
}

void waterBodies; void inPolygon;
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) await main();
