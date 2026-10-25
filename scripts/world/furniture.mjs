// Street furniture: the mapped objects into the map, and the audit of
// every tile's furniture (docs/PROVINCIE-PLAN.md 2.14).
//
//   node scripts/world/furniture.mjs           audit (rules over game/stad.json and the OSM layers)
//   node scripts/world/furniture.mjs --strict  exit 1 when the audit finds a problem
//
// The mapped objects come from the OSM caches in data/ (barrier=guard_rail,
// fence, bollard, wall=noise_barrier, traffic_calming, amenity=bench,
// waste_basket, bicycle_parking, shelter, highway=street_lamp). The caches
// were fetched for other layers and hold few of them; a fresh extract with
// these tags (scripts/osmfetch.py, the Overpass query below) fills them in:
//
//   [out:json][timeout:180];
//   ( nwr["barrier"~"guard_rail|fence|bollard|wall"]({{bbox}});
//     nwr["traffic_calming"]({{bbox}});
//     node["amenity"~"bench|waste_basket|bicycle_parking|shelter"]({{bbox}});
//     node["highway"="street_lamp"]({{bbox}}); );
//   out geom;
//
// The audit generates every tile (streetfurniture.js furnitureForTile with
// the game's options) and checks: nothing solid on a carriageway or cycle
// path (a gantry spans it, a speed bump lies on it), no lamp in a tree, a
// guardrail without holes under 5 m, the same items twice over (determinism).
// (#463) It also generates the layer the game draws itself - the rule lamps
// and the bollards at path mouths - and the post rows a fresh world build
// brings: a bollard on the asphalt must show up in the report, not fall
// silently out of the build.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { furnitureForTile, mappedFromOsm } from '../../game/js/streetfurniture.js';
import { TILE_M, GRID_X0, GRID_Y0, tileIndexOf, tileKey } from '../../game/js/gdt.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
// what the game draws itself: lamps (nightlights3d.js), path bollards (streetclutter.js).
// The bars and posts of the tiles are the rules' own (below); these two layers
// are drawn by the game and were never in the audit at all (#463).
export const GAME_OPTS = { lamps: false, bollards: false, livingBumps: false };
export const DRAWN_OPTS = { lamps: true, bollards: true, livingBumps: false };
// what stands on the ground and may not stand in the asphalt: a gantry spans
// the road and a speed bump lies on it, those two are the exception
export const POST_KINDS = new Set(['lamp', 'bollard', 'hectometer', 'placesign', 'wegwijzer', 'bench', 'bin', 'bikerack', 'shelter']);

// tiles the map's roads touch, each with its roads and mapped rows
export function tilesOf(data) {
  const tiles = new Map();
  const tileOf = (i, j) => { const k = tileKey(i, j); let t = tiles.get(k); if (!t) tiles.set(k, (t = { key: k, i, j, roads: new Set(), mapped: [] })); return t; };
  for (const r of data.roads || []) {
    if (!r) continue;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const p of r.pts) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
    const [i0, j0] = tileIndexOf(x0 - 200, y0 - 200), [i1, j1] = tileIndexOf(x1 + 200, y1 + 200);
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) tileOf(i, j).roads.add(r);
  }
  for (const m of data.furniture || []) {
    const p = m.pts ? m.pts : [[m.x, m.y]];
    const keys = new Set(p.map((q) => tileKey(...tileIndexOf(q[0], q[1]))));
    for (const k of keys) { const [i, j] = k.split('_').map(Number); void i; void j; const t = [...tiles.values()].find((q) => q.key === k); if (t) t.mapped.push(m); }
  }
  return tiles;
}

export function generateAll(data, opts = GAME_OPTS) {
  const out = [];
  for (const t of tilesOf(data).values()) {
    const x0 = GRID_X0 + t.i * TILE_M, y0 = GRID_Y0 + t.j * TILE_M;
    const res = furnitureForTile({ x0, y0, size: TILE_M, roads: [...t.roads], mapped: t.mapped, water: data.water || [], opts });
    out.push({ key: t.key, ...res });
  }
  return out;
}

// Where the asphalt is, in blocks of 32 m: (x, y) -> the way there or null.
// (a deck overhead or a sunken road below is no carriageway here: the items
// stand at street level)
export function carriagewayTest(data) {
  const roads = (data.roads || []).filter((r) => r && r.cat !== 'foot');
  const G = 32, grid = new Map();
  for (const r of roads) {
    const P = r.pts;
    for (let i = 0; i < P.length - 1; i++) {
      for (let gx = Math.floor((Math.min(P[i][0], P[i + 1][0]) - 8) / G); gx <= Math.floor((Math.max(P[i][0], P[i + 1][0]) + 8) / G); gx++)
        for (let gy = Math.floor((Math.min(P[i][1], P[i + 1][1]) - 8) / G); gy <= Math.floor((Math.max(P[i][1], P[i + 1][1]) + 8) / G); gy++)
          (grid.get(gx * 65536 + gy) || grid.set(gx * 65536 + gy, []).get(gx * 65536 + gy)).push([r, i]);
    }
  }
  return (x, y) => {
    for (const [r, i] of grid.get(Math.floor(x / G) * 65536 + Math.floor(y / G)) || []) {
      const P = r.pts, dx = P[i + 1][0] - P[i][0], dy = P[i + 1][1] - P[i][1], L2 = dx * dx + dy * dy || 1e-9;
      const t = Math.max(0, Math.min(1, ((x - P[i][0]) * dx + (y - P[i][1]) * dy) / L2));
      if (r.z && Math.abs(r.z[i] + (r.z[i + 1] - r.z[i]) * t) > 3) continue;
      if (Math.hypot(P[i][0] + dx * t - x, P[i][1] + dy * t - y) < r.width / 2 - 0.1) return r;
    }
    return null;
  };
}

// The items that stand on the asphalt: a gantry spans the road, a speed bump
// lies on it, everything else there is a fault (#463).
export function onRoadItems(items, onCarriageway) {
  const out = [];
  for (const it of items) {
    if (it.k === 'gantry' || it.k === 'speedbump') continue;
    const r = onCarriageway(it.x, it.y);
    if (r) out.push({ k: it.k, road: r.name || r.type, at: [Math.round(it.x), Math.round(it.y)] });
  }
  return out;
}

// The posts a fresh world build puts on the asphalt (OSM maps a bollard or a
// street lamp on the carriageway now and then). The build leaves them out
// (streetfurniture.js freeSpot), but the audit must still find them: else a
// fault in the source data disappears from the report at the next build (#463).
export function mappedOnRoad(data, onCarriageway) {
  const out = [];
  for (const m of data.furniture || []) {
    if (!m.pts || m.pts.length !== 1 || !POST_KINDS.has(m.k)) continue;
    const [x, y] = m.pts[0];
    const r = onCarriageway(x, y);
    if (r) out.push({ k: m.k, road: r.name || r.type, at: [Math.round(x), Math.round(y)], osm: m.osm });
  }
  return out;
}

export function audit(data, opts = GAME_OPTS) {
  const tiles = generateAll(data, opts);
  const items = tiles.flatMap((t) => t.items);
  const counts = {};
  for (const it of items) counts[it.k] = (counts[it.k] || 0) + 1;
  const rep = { tiles: tiles.length, counts, onRoad: [], drawnOnRoad: [], mappedOnRoad: [], gaps: [], dup: 0, determinism: true };
  // nothing solid on a carriageway or cycle path
  const onCarriageway = carriagewayTest(data);
  rep.onRoad = onRoadItems(items, onCarriageway);
  // (#463) the layer the game draws itself: its lamps and path bollards go
  // through the same test, so a new world build cannot put a post in the lane
  const drawn = generateAll(data, DRAWN_OPTS).flatMap((t) => t.items).filter((it) => POST_KINDS.has(it.k));
  rep.drawnOnRoad = onRoadItems(drawn, onCarriageway);
  // ... and the rows of the build itself
  rep.mappedOnRoad = mappedOnRoad(data, onCarriageway);
  const allWays = (data.roads || []).filter((r) => r);
  const WG = new Map();
  for (const r of allWays) for (let i = 0; i < r.pts.length - 1; i++) {
    const k = `${Math.floor(r.pts[i][0] / 32)},${Math.floor(r.pts[i][1] / 32)}`;
    (WG.get(k) || WG.set(k, []).get(k)).push([r, i]);
  }
  // a way across the rail's line (not along it) near (x, y)
  const wayThrough = (x, y, a) => {
    for (let gx = -2; gx <= 2; gx++) for (let gy = -2; gy <= 2; gy++) for (const [r, i] of WG.get(`${Math.floor(x / 32) + gx},${Math.floor(y / 32) + gy}`) || []) {
      const P = r.pts, dx = P[i + 1][0] - P[i][0], dy = P[i + 1][1] - P[i][1], L2 = dx * dx + dy * dy || 1e-9;
      const t = Math.max(0, Math.min(1, ((x - P[i][0]) * dx + (y - P[i][1]) * dy) / L2));
      if (Math.abs(Math.sin(Math.atan2(dy, dx) - a)) < 0.5) continue;
      if (Math.hypot(P[i][0] + dx * t - x, P[i][1] + dy * t - y) < r.width / 2 + 2.5) return true;
    }
    return false;
  };
  // guardrail holes under 5 m between pieces of one run
  const rails = items.filter((it) => it.k === 'guardrail').sort((a, b) => a.key.localeCompare(b.key));
  const RG = new Map();
  for (const it of rails) (RG.get(`${Math.floor(it.x / 20)},${Math.floor(it.y / 20)}`) || RG.set(`${Math.floor(it.x / 20)},${Math.floor(it.y / 20)}`, []).get(`${Math.floor(it.x / 20)},${Math.floor(it.y / 20)}`)).push(it);
  for (const it of rails) {
    const ex = it.x + Math.cos(it.a) * it.s / 2, ey = it.y + Math.sin(it.a) * it.s / 2;
    let bd = Infinity;
    for (let gx = -1; gx <= 1; gx++) for (let gy = -1; gy <= 1; gy++) for (const o of RG.get(`${Math.floor(ex / 20) + gx},${Math.floor(ey / 20) + gy}`) || []) {
      if (o === it) continue;
      const sx = o.x - Math.cos(o.a) * o.s / 2, sy = o.y - Math.sin(o.a) * o.s / 2;
      bd = Math.min(bd, Math.hypot(sx - ex, sy - ey));
    }
    // (an opening for a way across it is no hole)
    if (bd > 0.6 && bd < 5 && !wayThrough(ex, ey, it.a)) rep.gaps.push({ at: [Math.round(ex), Math.round(ey)], gap: Math.round(bd * 10) / 10 });
  }
  // one item per key, and the same items again
  rep.dup = items.length - new Set(items.map((it) => it.key)).size;
  const again = generateAll(data, opts).flatMap((t) => t.items);
  rep.determinism = again.length === items.length && again.every((it, i) => it.key === items[i].key && it.a === items[i].a);
  return rep;
}

export function printAudit(rep) {
  console.log(`${rep.tiles} tiles: ${Object.entries(rep.counts).map(([k, v]) => `${k} ${v}`).join(', ')}`);
  const road = [...(rep.onRoad || []), ...(rep.drawnOnRoad || [])];
  console.log(`rule items on a carriageway: ${road.length} (${(rep.drawnOnRoad || []).length} of the drawn lamps and bollards)`);
  for (const q of road.slice(0, 8)) console.log(`  ${q.k} on ${q.road} at ${q.at}`);
  console.log(`mapped posts on a carriageway (left out by the build): ${(rep.mappedOnRoad || []).length}`);
  for (const q of (rep.mappedOnRoad || []).slice(0, 8)) console.log(`  ${q.k} on ${q.road} at ${q.at}`);
  console.log(`guardrail holes under 5 m: ${rep.gaps.length}`);
  for (const q of rep.gaps.slice(0, 8)) console.log(`  ${q.gap} m at ${q.at}`);
  console.log(`duplicate keys: ${rep.dup}; same items twice: ${rep.determinism ? 'yes' : 'NO'}`);
}

// (the rows a build puts on the asphalt are left out by the build itself: they
// are reported above, but they are no fault in the placement (#463))
export const problems = (rep) => rep.onRoad.length + (rep.drawnOnRoad || []).length + rep.dup + (rep.determinism ? 0 : 1);

async function main() {
  const args = process.argv.slice(2);
  const { loadCityData } = await import('../lib/loadworld.mjs');
  const data = await loadCityData({ extras: false });
  // --write is gone: the OSM caches (data/*_raw.json) it read are removed; the 12 mapped rows are in stad.json (furniture), edit them there
  if (args.includes('--write')) { console.log('--write bestaat niet meer: het gemapte meubilair staat in game/stad.json (furniture)'); process.exit(1); }
  const t0 = performance.now();
  const rep = audit(data);
  printAudit(rep);
  console.log(`(${((performance.now() - t0) / 1000).toFixed(1)} s for two passes)`);
  if (args.includes('--strict') && problems(rep)) process.exit(1);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) await main();
