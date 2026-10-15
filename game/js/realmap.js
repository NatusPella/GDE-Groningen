import { GameMap, SpatialGrid } from './mapdata.js';
import { polygonBounds } from './util.js';
import { REAL, RTILE, buildingsInTile, buildingModel, buildingAt } from './countryreal.js';
import { urbanWeight, realWater } from './countryfield.js';

// The real Ommelanden (countryreal.js) as a GameMap the city's generators
// read: the built-up streets as city roads (models3d via roadsurface.js:
// carriageway, kerbs, pavement, markings; nightlights3d.js lamps;
// cityprops.js benches, bins, racks and street clutter) and the houses,
// blocks and sheds as city buildings (models3d_buildings.js, from the
// OSM box: windows, doors, roofs, chimneys, dormers). scene3d.js streams
// both within its detail radius like the city's own; past it the
// countryside's instanced boxes stand in (countryside.js hides the box of
// a building drawn here). Street trees are placed along the built-up
// streets and drawn and made solid like the city's (scene3d.js, treeprops.js). Barns, greenhouses, farmhouses out in the polder
// and churches keep their countryside models. Roads are converted once,
// buildings per 160 m tile on first query.

const URBAN = 0.5;
const SAMPLE = 12;
const MIN_RUN = 10;
// countryreal road kind -> city class
const ROAD_CLASS = {
  3: { cat: 'major', type: 'primary', speed: 14 },
  4: { cat: 'major', type: 'secondary', speed: 14 },
  5: { cat: 'normal', type: 'tertiary', speed: 13 },
  6: { cat: 'normal', type: 'unclassified', speed: 11 },
  7: { cat: 'normal', type: 'residential', speed: 8.5 },
};
const PLACE_CORE = { town: 520, village: 650, hamlet: 900 };

let RM = null;

// where the real Ommeland's streets are city streets
export const builtUp = (x, y) => urbanWeight(x, y) >= URBAN;

// a road's polyline split into its built-up runs (bridges stay the
// countryside's deck)
function urbanRuns(pts, bridge) {
  if (bridge) return [];
  const runs = [];
  let cur = null;
  const isIn = builtUp;
  let inside = isIn(pts[0][0], pts[0][1]);
  if (inside) cur = [pts[0]];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const n = Math.max(1, Math.ceil(len / SAMPLE));
    for (let k = 1; k <= n; k++) {
      const t = k / n;
      const x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t;
      const now = k === n ? isIn(b[0], b[1]) : isIn(x, y);
      if (now === inside) continue;
      // cut half a sample back
      const tc = (k - 0.5) / n;
      const c = [a[0] + (b[0] - a[0]) * tc, a[1] + (b[1] - a[1]) * tc];
      if (inside) { cur.push(c); runs.push(cur); cur = null; } else cur = [c];
      inside = now;
    }
    if (cur) cur.push(b);
  }
  if (cur) runs.push(cur);
  return runs.filter((run) => {
    let L = 0;
    for (let i = 1; i < run.length; i++) L += Math.hypot(run[i][0] - run[i - 1][0], run[i][1] - run[i - 1][1]);
    return run.length >= 2 && L >= MIN_RUN;
  });
}

function convertRoads(map) {
  const out = [];
  for (const r of REAL.roads) {
    const C = ROAD_CLASS[r.kind];
    if (!C) continue;
    const living = r.kind === 7 && r.w < 4.8;
    for (const pts of urbanRuns(r.pts, r.bridge)) {
      out.push({
        pts, cat: living ? 'minor' : C.cat, type: living ? 'living_street' : C.type, width: r.w, speed: C.speed,
        oneway: r.oneway, roundabout: false, name: r.name, bridge: false, layer: 0, net: map, _geoMain: true, real: true,
      });
    }
  }
  for (const c of REAL.cycleways) {
    for (const pts of urbanRuns(c.pts, false)) {
      out.push({ pts, cat: 'cycle', type: 'cycleway', width: Math.max(1.8, c.hw * 2), speed: 5, oneway: false, roundabout: false, name: '', bridge: false, layer: 0, net: map, _geoMain: true, real: true });
    }
  }
  return out;
}

// What a real building is in the city's terms, or null when it keeps its
// countryside model.
function cityType(i, m) {
  if (REAL.code[i] === 7) return null;
  const urban = urbanWeight(REAL.bx[i], REAL.by[i]);
  if (m.kind === 'house') {
    if (REAL.code[i] === 3 && urban < 0.35) return null;
    if (m.hip && urban < 0.35 && !m.row) return null;
    return m.row ? 'terrace' : 'house';
  }
  if (m.kind === 'block') {
    const c = REAL.code[i];
    if (c === 2 || REAL.lv[i] >= 3) return 'apartments';
    if (c === 9) return 'school';
    return 'yes';
  }
  if (m.kind === 'shed') return REAL.code[i] === 6 ? 'industrial' : 'garage';
  return null;
}

function makeBuilding(map, i) {
  const x = REAL.bx[i], y = REAL.by[i];
  if (REAL.code[i] === 7 && REAL.churchNear && REAL.churchNear(x, y)) return null;
  const m = buildingModel(i);
  const type = cityType(i, m);
  if (!type) return null;
  const ux = Math.cos(m.angle), uy = Math.sin(m.angle);
  const hl = m.long / 2, hs = m.short / 2;
  const pts = [[-hl, -hs], [hl, -hs], [hl, hs], [-hl, hs]].map(([u, v]) => [x + ux * u - uy * v, y + uy * u + ux * v]);
  // storeys: the countryside wall height in the city's 3.1 m levels
  const levels = type === 'garage' || type === 'industrial' ? Math.max(1, Math.round(m.wall / 3.6)) : Math.max(1, Math.round(m.wall / 3.1));
  const b = {
    pts, h: type === 'yes' ? Math.min(4, levels) : levels, type, name: '', realId: i, map, tint: m.color, roofTint: m.roofColor,
    passages: [], _doors: [], _foundation: null,
  };
  b.bounds = polygonBounds(pts);
  return b;
}

function ensureTile(map, tx, ty) {
  const k = tx * 100003 + ty;
  if (map.tilesDone.has(k)) return;
  map.tilesDone.add(k);
  for (const i of buildingsInTile(tx, ty) || []) {
    const b = makeBuilding(map, i);
    if (!b) continue;
    map.buildings.push(b);
    map.buildingGrid.insert(b, b.bounds);
  }
}

// Street trees along the built-up streets (OSM has none here): in the verge
// past the pavement, a side per stretch, where there is room between the
// front gardens' houses, the roads and the water. Per tile, on first query.
const TREE_STEP = 13;
function treeHash(a, b) {
  const h = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return h - Math.floor(h);
}
function ensureTreeTile(map, tx, ty) {
  const k = tx * 100003 + ty;
  if (map.treeTiles.has(k)) return;
  map.treeTiles.add(k);
  const x0 = tx * RTILE, y0 = ty * RTILE;
  for (const r of map.roadGrid.query(x0, y0, x0 + RTILE, y0 + RTILE)) {
    if (r.cat !== 'normal' && r.cat !== 'minor') continue;
    const seed = treeHash(r.pts[0][0], r.pts[0][1]);
    // a third of the streets have no trees, the rest a side or both
    if (seed < 0.33) continue;
    const sides = seed < 0.75 ? [seed < 0.54 ? 1 : -1] : [1, -1];
    const off = r.width / 2 + 1.8 + 1.4;
    let along = 0;
    for (let i = 0; i < r.pts.length - 1; i++) {
      const a = r.pts[i], b = r.pts[i + 1];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (len < 1e-3) continue;
      const ux = (b[0] - a[0]) / len, uy = (b[1] - a[1]) / len;
      const first = Math.ceil((along + 5) / TREE_STEP) * TREE_STEP - along;
      for (let t = first; t < len - 4; t += TREE_STEP) {
        for (const side of sides) {
          const x = a[0] + ux * t - uy * off * side, y = a[1] + uy * t + ux * off * side;
          if (x < x0 || x >= x0 + RTILE || y < y0 || y >= y0 + RTILE) continue;
          if (treeHash(Math.round(x * 3), Math.round(y * 3)) < 0.18) continue;
          if (!builtUp(x, y) || realWater(x, y) > -2.5 || buildingAt(x, y, 2.2) >= 0) continue;
          if (map.onCarriageway(x, y, 1.6)) continue;
          if (map.treeGrid.query(x - 6, y - 6, x + 6, y + 6).some((q) => Math.hypot(q[0] - x, q[1] - y) < 6)) continue;
          const tr = [x, y];
          map.trees.push(tr);
          map.treeGrid.insert(tr, [x, y, x, y]);
        }
      }
      along += len;
    }
  }
}

function centreDist(x, y) {
  let best = Infinity;
  for (const p of REAL.places) {
    const core = PLACE_CORE[p.k];
    if (core === undefined) continue;
    const d = Math.hypot(p.x - x, p.y - y);
    if (d > p.r * 2 + 400) continue;
    best = Math.min(best, core + d * (p.k === 'town' ? 0.8 : 1));
  }
  return best;
}

function create() {
  const t0 = performance.now();
  const map = Object.create(GameMap.prototype);
  Object.assign(map, {
    real: true,
    meta: { horeca: [], trafficLights: [], landmarks: [], shops: [] },
    buildings: [], canopies: [], water: [], green: [], trees: [], rails: [], stations: [], levelCrossings: [], railRoutes: [], railLifts: [],
    passageWays: [], clippedWays: [],
    buildingGrid: new SpatialGrid(80), roadGrid: new SpatialGrid(80), waterGrid: new SpatialGrid(160), greenGrid: new SpatialGrid(160), treeGrid: new SpatialGrid(160),
    elev: { has: false },
    tilesDone: new Set(), treeTiles: new Set(),
    centreDist,
  });
  map.roads = convertRoads(map);
  for (const r of map.roads) {
    r.bounds = polygonBounds(r.pts);
    map.roadGrid.insert(r, r.bounds);
  }
  map.buildingsNear = function (x, y, r) {
    // a box reaches at most ~40 m from the tile it is filed under
    const m = r + 40;
    for (let tx = Math.floor((x - m) / RTILE); tx <= Math.floor((x + m) / RTILE); tx++) {
      for (let ty = Math.floor((y - m) / RTILE); ty <= Math.floor((y + m) / RTILE); ty++) ensureTile(map, tx, ty);
    }
    return this.buildingGrid.query(x - r, y - r, x + r, y + r);
  };
  map.treesNear = function (x, y, r) {
    for (let tx = Math.floor((x - r) / RTILE); tx <= Math.floor((x + r) / RTILE); tx++) {
      for (let ty = Math.floor((y - r) / RTILE); ty <= Math.floor((y + r) / RTILE); ty++) ensureTreeTile(map, tx, ty);
    }
    return this.treeGrid.query(x - r, y - r, x + r, y + r);
  };
  map.inWaterRaw = () => false;
  map.isOnBridge = () => false;
  map.ms = Math.round(performance.now() - t0);
  return map;
}

// The real Ommeland's map, or null until its data is in.
export function getRealMap() {
  if (RM) return RM;
  if (!REAL.ready || !REAL.n) return null;
  RM = create();
  window.__realMap = RM;
  return RM;
}

export function realMapStats() {
  if (!RM) return null;
  return { roads: RM.roads.length, buildings: RM.buildings.length, trees: RM.trees.length, tiles: RM.tilesDone.size, ms: RM.ms };
}
