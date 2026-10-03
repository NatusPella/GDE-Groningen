import { polygonBounds, closestPointOnSegment, pointInPolygon, pointInStaticPolygon, isInWater } from './util.js';
import { inPassage, clipWaysInBuildings } from './passages.js';
import { attachMuseumPlan } from './museumplan.js';
import { buildElevation, groundHeightAt, roadZAt, ceilingAt, coveredAt, surfaceHalfWidth, offLevelAt } from './elevation.js';

const CELL = 80; // meters per grid cell

class SpatialGrid {
  constructor(cellSize) {
    this.cell = cellSize;
    this.map = new Map();
  }
  key(cx, cy) { return (cx + 32768) * 65536 + cy + 32768; }
  cellRange(minx, miny, maxx, maxy) {
    return {
      cx0: Math.floor(minx / this.cell), cy0: Math.floor(miny / this.cell),
      cx1: Math.floor(maxx / this.cell), cy1: Math.floor(maxy / this.cell),
    };
  }
  insert(item, bounds) {
    const { cx0, cy0, cx1, cy1 } = this.cellRange(...bounds);
    for (let cx = cx0; cx <= cx1; cx++) {
      for (let cy = cy0; cy <= cy1; cy++) {
        const k = this.key(cx, cy);
        let arr = this.map.get(k);
        if (!arr) { arr = []; this.map.set(k, arr); }
        arr.push(item);
      }
    }
  }
  query(minx, miny, maxx, maxy) {
    const { cx0, cy0, cx1, cy1 } = this.cellRange(minx, miny, maxx, maxy);
    // one cell: its list as it is (a copy), no dedupe needed
    if (cx0 === cx1 && cy0 === cy1) {
      const arr = this.map.get(this.key(cx0, cy0));
      return arr ? arr.slice() : [];
    }
    const seen = new Set();
    const out = [];
    for (let cx = cx0; cx <= cx1; cx++) {
      for (let cy = cy0; cy <= cy1; cy++) {
        const arr = this.map.get(this.key(cx, cy));
        if (!arr) continue;
        for (const item of arr) {
          if (!seen.has(item)) { seen.add(item); out.push(item); }
        }
      }
    }
    return out;
  }
}

// OSM sometimes has the same footprint twice (e.g. Forum Groningen). Two
// identical extrusions z-fight over their whole roof, so keep one - the
// landmark-tagged copy if there is one.
function dedupeBuildings(list) {
  const byKey = new Map();
  const out = [];
  for (const b of list) {
    const [minx, miny, maxx, maxy] = polygonBounds(b.pts);
    const key = `${Math.round(minx * 4)},${Math.round(miny * 4)},${Math.round(maxx * 4)},${Math.round(maxy * 4)},${b.pts.length}`;
    const i = byKey.get(key);
    if (i === undefined) { byKey.set(key, out.length); out.push(b); continue; }
    const prev = out[i];
    if (!prev.landmark && b.landmark) out[i] = b;
    else if (!prev.name && b.name) prev.name = b.name;
    out[i].h = Math.max(prev.h, b.h);
  }
  return out;
}

// A footprint sitting inside another of the same height (OSM building parts)
// would share its roof plane and z-fight; lift the inner one 0.4 m so it
// reads as a deliberate roof step. Renderers add b.lift to the wall depth.
function liftNestedRoofs(list, grid) {
  for (const b of list) {
    const P = b.pts;
    let a = 0, cx = 0, cy = 0;
    for (let i = 0, n = P.length; i < n; i++) {
      const [x0, y0] = P[i], [x1, y1] = P[(i + 1) % n];
      const c = x0 * y1 - x1 * y0;
      a += c; cx += (x0 + x1) * c; cy += (y0 + y1) * c;
    }
    if (Math.abs(a) < 1e-6) continue;
    cx /= 3 * a; cy /= 3 * a;
    for (const o of grid.query(cx, cy, cx, cy)) {
      if (o === b || o.lift || Math.abs(o.h - b.h) > 0.05) continue;
      const [minx, miny, maxx, maxy] = o.bounds;
      if (cx <= minx || cx >= maxx || cy <= miny || cy >= maxy) continue;
      if (pointInPolygon(cx, cy, o.pts)) { b.lift = 0.4; break; }
    }
  }
  // footprints that only partly overlap: the smaller one steps up (pairs met
  // in a fine grid, each judged once in the cell holding their overlap's corner)
  const top = (b) => b.h + (b.lift || 0) / 3.1;
  const area = (b) => (b.bounds[2] - b.bounds[0]) * (b.bounds[3] - b.bounds[1]);
  const G = 16, cells = new Map();
  for (const b of list) {
    const [x0, y0, x1, y1] = b.bounds;
    for (let i = Math.floor(x0 / G); i <= Math.floor(x1 / G); i++) {
      for (let j = Math.floor(y0 / G); j <= Math.floor(y1 / G); j++) {
        const k = i * 100003 + j;
        const c = cells.get(k);
        if (c) c.push(b); else cells.set(k, [b]);
      }
    }
  }
  const steps = [];
  for (const [k, c] of cells) {
    for (let p = 0; p < c.length; p++) {
      const b = c[p];
      for (let q = p + 1; q < c.length; q++) {
        const o = c[q];
        if (Math.abs(o.h - b.h) > 0.02 || (o.lift || 0) !== (b.lift || 0)) continue;
        const x0 = Math.max(b.bounds[0], o.bounds[0]), y0 = Math.max(b.bounds[1], o.bounds[1]);
        const x1 = Math.min(b.bounds[2], o.bounds[2]), y1 = Math.min(b.bounds[3], o.bounds[3]);
        if (x1 - x0 < 0.5 || y1 - y0 < 0.5 || Math.floor(x0 / G) * 100003 + Math.floor(y0 / G) !== k) continue;
        const inRect = ([x, y]) => x > x0 && x < x1 && y > y0 && y < y1;
        if (!o.pts.some((v) => inRect(v) && pointInPolygon(v[0], v[1], b.pts)) && !b.pts.some((v) => inRect(v) && pointInPolygon(v[0], v[1], o.pts))) continue;
        let hit = 0;
        for (let x = x0 + 0.25; x < x1 && hit < 4; x += 0.5) {
          for (let y = y0 + 0.25; y < y1 && hit < 4; y += 0.5) if (pointInPolygon(x, y, b.pts) && pointInPolygon(x, y, o.pts)) hit++;
        }
        if (hit >= 4) steps.push(area(b) <= area(o) ? b : o);
      }
    }
  }
  for (const b of new Set(steps)) b.lift = (b.lift || 0) + 0.4;
}

function buildingsOverRails(buildings, rails) {
  return buildingsCrossedBy(buildings, rails.map((r) => r.pts || r), 4);
}

// Low footprints a bridge deck runs through at the waterside are bridge
// machinery / abutments mapped as buildings; extruded they become a solid
// wall straight across the carriageway, so they are dropped.
function bridgeStructures(buildings, roads, water) {
  const crossed = buildingsCrossedBy(buildings, roads.filter((r) => r.bridge).map((r) => r.pts), 1);
  const out = new Set();
  const wet = (x, y) => water.some((w) => {
    const [minx, miny, maxx, maxy] = w.bounds || (w.bounds = polygonBounds(w.pts));
    return x >= minx && x <= maxx && y >= miny && y <= maxy && pointInStaticPolygon(x, y, w.pts);
  });
  for (const b of crossed) {
    if (b.h > 4 || b.name || b.landmark || b.type === 'houseboat') continue;
    if (b.pts.some(([x, y]) => [[0, 0], [3, 0], [-3, 0], [0, 3], [0, -3]].some(([dx, dy]) => wet(x + dx, y + dy)))) out.add(b);
  }
  return out;
}

// Houseboats OSM draws (partly) over the bank: slid the shortest way out onto
// open water, clear of other footprints; one that cannot float is dropped.
function mooredHouseboats(buildings, water) {
  const boats = buildings.filter((b) => b.type === 'houseboat');
  if (!boats.length) return new Set();
  const dropped = new Set();
  const box = new Map();
  const boundsOf = (b) => box.get(b) || box.set(b, polygonBounds(b.pts)).get(b);
  // only the footprints near a boat that is (partly) on the bank: a 64 m grid
  let grid = null;
  const G = 64;
  const near = (x0, y0, x1, y1) => {
    if (!grid) {
      grid = new Map();
      for (const o of buildings) {
        // a boat may still slide up to 8 m
        const ob = boundsOf(o), e = o.type === 'houseboat' ? 8 : 0;
        for (let i = Math.floor((ob[0] - e) / G); i <= Math.floor((ob[2] + e) / G); i++) {
          for (let j = Math.floor((ob[1] - e) / G); j <= Math.floor((ob[3] + e) / G); j++) {
            const k = i * 100003 + j, c = grid.get(k);
            if (c) c.push(o); else grid.set(k, [o]);
          }
        }
      }
    }
    const out = new Set();
    for (let i = Math.floor(x0 / G); i <= Math.floor(x1 / G); i++) {
      for (let j = Math.floor(y0 / G); j <= Math.floor(y1 / G); j++) for (const o of grid.get(i * 100003 + j) || []) out.add(o);
    }
    return out;
  };
  for (const b of boats) {
    const [minx, miny, maxx, maxy] = polygonBounds(b.pts);
    const R = 10;
    const pools = water.filter((w) => {
      const wb = w.bounds || (w.bounds = polygonBounds(w.pts));
      return wb[0] < maxx + R && wb[2] > minx - R && wb[1] < maxy + R && wb[3] > miny - R;
    });
    const wet = (x, y) => pools.some((w) => x >= w.bounds[0] && x <= w.bounds[2] && y >= w.bounds[1] && y <= w.bounds[3] && pointInStaticPolygon(x, y, w.pts));
    const cx = (minx + maxx) / 2, cy = (miny + maxy) / 2;
    const samples = b.pts.map(([x, y]) => {
      const dx = cx - x, dy = cy - y, l = Math.hypot(dx, dy) || 1, k = Math.min(0.3, l / 2) / l;
      return [x + dx * k, y + dy * k];
    });
    for (let x = minx + 0.4; x < maxx; x += 0.8) for (let y = miny + 0.4; y < maxy; y += 0.8) if (pointInPolygon(x, y, b.pts)) samples.push([x, y]);
    const dry = (ox, oy) => samples.reduce((n, [x, y]) => n + (wet(x + ox, y + oy) ? 0 : 1), 0);
    if (dry(0, 0) <= samples.length * 0.03) continue;
    const others = [...near(minx - R, miny - R, maxx + R, maxy + R)].filter((o) => {
      if (o === b || dropped.has(o)) return false;
      const ob = boundsOf(o);
      return ob[0] < maxx + R && ob[2] > minx - R && ob[1] < maxy + R && ob[3] > miny - R;
    });
    const clear = (ox, oy) => !others.some((o) => {
      const ob = boundsOf(o);
      if (ob[0] > maxx + ox || ob[2] < minx + ox || ob[1] > maxy + oy || ob[3] < miny + oy) return false;
      return samples.some(([x, y]) => pointInPolygon(x + ox, y + oy, o.pts)) || o.pts.some(([x, y]) => pointInPolygon(x - ox, y - oy, b.pts));
    });
    let shift = null;
    for (let d = 0.5; d <= 8 && !shift; d += 0.5) {
      for (let a = 0; a < 16 && !shift; a++) {
        const ox = Math.cos(a * Math.PI / 8) * d, oy = Math.sin(a * Math.PI / 8) * d;
        if (dry(ox, oy) === 0 && clear(ox, oy)) shift = [ox, oy];
      }
    }
    if (shift) { b.pts = b.pts.map(([x, y]) => [x + shift[0], y + shift[1]]); box.delete(b); }
    else dropped.add(b);
  }
  return dropped;
}

const RING_TYPES = new Set(['motorway', 'motorway_link', 'trunk', 'trunk_link']);
const isRingRoad = (r) => RING_TYPES.has(r.type) || (!!r.z && r.cat === 'major');

// Footprints on a ring carriageway that the road would run into: at street
// level or sunken below it, or a deck too low to clear the roof.
function buildingsOnRing(buildings, roads) {
  const lines = [], zs = [];
  for (const r of roads) {
    if (!isRingRoad(r)) continue;
    const off = Math.max(0, r.width / 2 - 0.8);
    const P = r.pts;
    for (const o of off ? [-off, 0, off] : [0]) {
      const L = [], Z = [];
      for (let i = 0; i < P.length; i++) {
        const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)];
        const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
        L.push([P[i][0] - dy / l * o, P[i][1] + dx / l * o]);
        Z.push(r.z ? r.z[i] : 0);
      }
      lines.push(L);
      zs.push(Z);
    }
  }
  const out = new Set();
  const hit = buildingsCrossedBy(buildings, lines, 1.5, zs);
  for (const [b, z] of hit) {
    if (b.landmark) continue;
    if (z < b.h + 3.5) out.add(b);
  }
  return out;
}

function buildingsCrossedBy(buildings, lines, step, zs = null) {
  // with zs (a height per line vertex): a Map building -> lowest height hit
  const out = zs ? new Map() : new Set();
  if (!lines.length) return out;
  const samples = [];
  lines.forEach((P, li) => {
    const Z = zs && zs[li];
    for (let i = 0; i < P.length - 1; i++) {
      const [ax, ay] = P[i], [bx, by] = P[i + 1];
      const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / step));
      for (let k = 0; k < n; k++) {
        samples.push([ax + ((bx - ax) * k) / n, ay + ((by - ay) * k) / n, Z ? Z[i] + (Z[i + 1] - Z[i]) * k / n : 0]);
      }
    }
  });
  const G = 40, cells = new Map();
  for (const p of samples) {
    const k = Math.floor(p[0] / G) + ',' + Math.floor(p[1] / G);
    if (!cells.has(k)) cells.set(k, []);
    cells.get(k).push(p);
  }
  for (const b of buildings) {
    const [minx, miny, maxx, maxy] = polygonBounds(b.pts);
    search: for (let cx = Math.floor(minx / G); cx <= Math.floor(maxx / G); cx++) {
      for (let cy = Math.floor(miny / G); cy <= Math.floor(maxy / G); cy++) {
        for (const [x, y, z] of cells.get(cx + ',' + cy) || []) {
          if (x <= minx || x >= maxx || y <= miny || y >= maxy) continue;
          if (!pointInPolygon(x, y, b.pts)) continue;
          if (!zs) { out.add(b); break search; }
          if (!out.has(b) || z < out.get(b)) out.set(b, z);
        }
      }
    }
  }
  return out;
}

// Car roads that run through a water polygon without a bridge tag and
// without a height profile are culverts under an embankment: treat them as
// a covered crossing, dry road with a deck, like a bridge - otherwise cars
// sink there. (The Zuidelijke Ringweg's aqueduct under the Winschoterdiep
// has real heights, see elevation.js.)
const DRY_CATS = new Set(['major', 'normal', 'minor', 'service']);
function markDryCrossings(map) {
  let n = 0;
  for (const r of map.roads) {
    // roads with a height profile pass over/under the water for real
    if (r.bridge || r.z || !DRY_CATS.has(r.cat)) continue;
    const pts = r.pts;
    let wet = false;
    for (let i = 0; i < pts.length - 1 && !wet; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
      const steps = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / 2));
      for (let k = 0; k <= steps; k++) {
        const x = ax + ((bx - ax) * k) / steps, y = ay + ((by - ay) * k) / steps;
        for (const w of map.waterNear(x, y, 0.5)) {
          const [minx, miny, maxx, maxy] = w.bounds;
          if (x >= minx && x <= maxx && y >= miny && y <= maxy && pointInStaticPolygon(x, y, w.pts)) { wet = true; break; }
        }
        if (wet) break;
      }
    }
    if (wet) { r.bridge = true; r.dryCrossing = true; n++; }
  }
  map.dryCrossings = n;
}

// OSM tree points a few metres off end up on the carriageway; the game drew
// them in the middle of the road (the ring race was full of them)
function onCarriageway(map, x, y) {
  for (const r of map.roadsNear(x, y, 14)) {
    if (!DRY_CATS.has(r.cat)) continue;
    // raised and sunken roads: no trees on the verge, slope or in the cutting either
    const hw = r.z ? surfaceHalfWidth(r) + 1 : r.width / 2 - 0.3;
    if (hw <= 0) continue;
    for (let i = 0; i < r.pts.length - 1; i++) {
      const cp = closestPointOnSegment(x, y, r.pts[i][0], r.pts[i][1], r.pts[i + 1][0], r.pts[i + 1][1]);
      if (cp.dist2 < hw * hw) return true;
    }
  }
  return false;
}

const RING_CELL = 32;
const RING_JUNCTION_R = 14;

function buildRingGrid(map) {
  const grid = map.ringGrid = new Map();
  const cellAt = (cx, cy) => {
    const k = cx + ',' + cy;
    let c = grid.get(k);
    if (!c) grid.set(k, c = { segs: [], junctions: [] });
    return c;
  };
  const cover = (x0, y0, x1, y1, fn) => {
    for (let cx = Math.floor(x0 / RING_CELL); cx <= Math.floor(x1 / RING_CELL); cx++) {
      for (let cy = Math.floor(y0 / RING_CELL); cy <= Math.floor(y1 / RING_CELL); cy++) fn(cellAt(cx, cy));
    }
  };
  const key = (p) => Math.round(p[0] * 10) + ',' + Math.round(p[1] * 10);
  const localNodes = new Set();
  for (const r of map.roads) {
    if (isRingRoad(r) || !DRY_CATS.has(r.cat) || r.cat === 'service' || r.z) continue;
    for (const p of r.pts) localNodes.add(key(p));
  }
  for (const r of map.roads) {
    if (!isRingRoad(r)) continue;
    const hw = r.width / 2 + 0.3, P = r.pts;
    for (let i = 0; i < P.length - 1; i++) {
      const s = [P[i][0], P[i][1], P[i + 1][0], P[i + 1][1], hw, r.z ? r.z[i] : 0, r.z ? r.z[i + 1] : 0];
      cover(Math.min(s[0], s[2]) - hw, Math.min(s[1], s[3]) - hw, Math.max(s[0], s[2]) + hw, Math.max(s[1], s[3]) + hw, (c) => c.segs.push(s));
    }
    for (const p of P) {
      if (!localNodes.has(key(p))) continue;
      const R = RING_JUNCTION_R;
      cover(p[0] - R, p[1] - R, p[0] + R, p[1] + R, (c) => c.junctions.push(p));
    }
  }
}

export class GameMap {
  constructor(data) {
    this.meta = data.meta;
    this.roads = data.roads;
    // open canopies (building=roof) are not solid: rendered by canopies3d.js,
    // kept out of the building grid so nothing collides with or spawns in them
    // Footprints a railway runs through are platform roofs / station halls
    // mapped as buildings; they become canopies too so trains pass under.
    const bridgeParts = bridgeStructures(data.buildings, data.roads, data.water);
    const all = dedupeBuildings(data.buildings.filter((b) => !bridgeParts.has(b)));
    const overRails = buildingsOverRails(all, data.rails || []);
    // The covers the sunken Zuidelijke Ringweg runs under and sheds mapped
    // on the ring's carriageways: extruded they are a block across the road,
    // as a canopy a roof floating over the cutting. The tunnel roof and the
    // ground over it are drawn by roadstructures3d / terrain3d.
    const onRing = buildingsOnRing(all, data.roads);
    const isCanopy = (b) => b.type === 'roof' || overRails.has(b);
    this.canopies = all.filter((b) => isCanopy(b) && !onRing.has(b));
    const sunkBoats = mooredHouseboats(all, data.water);
    this.buildings = all.filter((b) => !isCanopy(b) && !onRing.has(b) && !sunkBoats.has(b));
    this.water = data.water;
    this.green = data.green;
    this.trees = data.trees || [];
    this.rails = data.rails || [];
    this.stations = data.stations || [];
    this.levelCrossings = data.levelCrossings || [];
    this.railRoutes = data.railRoutes || [];
    this.railLifts = data.railLifts || [];
    // ways OSM maps through or under a building (passages.js)
    this.passageWays = (data.passageWays || []).map((p) => ({ ...p, bounds: polygonBounds(p.pts) }));

    this.buildingGrid = new SpatialGrid(CELL);
    for (const b of this.buildings) {
      b.bounds = polygonBounds(b.pts);
      this.buildingGrid.insert(b, b.bounds);
    }
    liftNestedRoofs(this.buildings, this.buildingGrid);
    // the Groninger Museum's walkable ground floor
    attachMuseumPlan(this.buildings);

    const indexRoads = () => {
      this.roadGrid = new SpatialGrid(CELL);
      for (const r of this.roads) {
        r.bounds = polygonBounds(r.pts);
        this.roadGrid.insert(r, r.bounds);
      }
    };
    indexRoads();
    // footways and cycleways through a solid block end at its facade (passages.js)
    this.clippedWays = clipWaysInBuildings(this);
    if (this.clippedWays.length) indexRoads();

    this.waterGrid = new SpatialGrid(CELL * 2);
    for (const w of this.water) {
      w.bounds = polygonBounds(w.pts);
      this.waterGrid.insert(w, w.bounds);
    }

    this.greenGrid = new SpatialGrid(CELL * 2);
    for (const g of this.green) {
      g.bounds = polygonBounds(g.pts);
      this.greenGrid.insert(g, g.bounds);
    }

    markDryCrossings(this);
    this.elev = buildElevation(this);
    this.trees = this.trees.filter((t) => !onCarriageway(this, t[0], t[1]) && !this.offStreetLevel(t[0], t[1]));

    this.treeGrid = new SpatialGrid(CELL * 2);
    for (const t of this.trees) {
      this.treeGrid.insert(t, [t[0], t[1], t[0], t[1]]);
    }
  }

  // Height of the surface under (x, y) for something at zHint (absolute m):
  // viaduct decks, trench floors and embankments of the ring roads, street
  // level (0) everywhere else. See elevation.js.
  groundHeightAt(x, y, zHint = 0) {
    return groundHeightAt(this.elev, x, y, zHint);
  }

  // Height of road r at (x, y); 0 for flat roads.
  roadZAt(r, x, y) {
    return roadZAt(r, x, y);
  }

  // Height to put a freshly placed car / person at (x, y): on the nearest
  // drivable road's level (a spot on the ring's viaduct stays on it).
  spawnZ(x, y) {
    if (!this.elev.has) return 0;
    const rp = this.nearestRoadPoint(x, y, 25, true);
    const hint = rp && rp.road.z ? roadZAt(rp.road, x, y) : 0;
    return groundHeightAt(this.elev, x, y, hint + 0.3);
  }

  ceilingAt(x, y, z) {
    return ceilingAt(this.elev, x, y, z);
  }

  // Inside a covered (tunnel) section: the canal above an aqueduct is not
  // water for whoever is down in it.
  coveredAt(x, y) {
    return coveredAt(this.elev, x, y);
  }

  // Is (x, y) on a raised/sunken road, its embankment or cutting (not street
  // level)? `pad` keeps that much clearance from the road edge.
  offStreetLevel(x, y, pad = 0) {
    return offLevelAt(this.elev, x, y, pad);
  }

  // Is (x, y) within `margin` of a car carriageway (kerb to kerb)? Ring roads
  // count with their verge. Used to keep street furniture off the road.
  onCarriageway(x, y, margin = 0, except = null) {
    for (const r of this.roadsNear(x, y, 14)) {
      if (r === except || !DRY_CATS.has(r.cat)) continue;
      const hw = (isRingRoad(r) ? surfaceHalfWidth(r) : r.width / 2) + margin;
      if (hw <= 0) continue;
      const [minx, miny, maxx, maxy] = r.bounds;
      if (x < minx - hw || x > maxx + hw || y < miny - hw || y > maxy + hw) continue;
      const P = r.pts;
      for (let i = 0; i < P.length - 1; i++) {
        if (closestPointOnSegment(x, y, P[i][0], P[i][1], P[i + 1][0], P[i + 1][1]).dist2 < hw * hw) return true;
      }
    }
    return false;
  }

  // Is (x, y) on the carriageway of the ring / a motorway, away from the
  // at-grade junctions where it may be crossed? Pedestrians stay off it.
  // z: height of whoever asks (a street passing under a viaduct is not on it).
  onRingCarriageway(x, y, z = 0) {
    if (!this.ringGrid) buildRingGrid(this);
    const cell = this.ringGrid.get(Math.floor(x / RING_CELL) + ',' + Math.floor(y / RING_CELL));
    if (!cell) return false;
    for (const j of cell.junctions) if ((j[0] - x) ** 2 + (j[1] - y) ** 2 < RING_JUNCTION_R * RING_JUNCTION_R) return false;
    for (const s of cell.segs) {
      const cp = closestPointOnSegment(x, y, s[0], s[1], s[2], s[3]);
      if (cp.dist2 < s[4] * s[4] && Math.abs(s[5] + (s[6] - s[5]) * cp.t - z) < 2) return true;
    }
    return false;
  }

  inWaterRaw(x, y) {
    for (const w of this.waterNear(x, y, 0.5)) {
      const [minx, miny, maxx, maxy] = w.bounds;
      if (x < minx || x > maxx || y < miny || y > maxy) continue;
      if (pointInPolygon(x, y, w.pts)) return true;
    }
    return false;
  }

  buildingsNear(x, y, r) {
    return this.buildingGrid.query(x - r, y - r, x + r, y + r);
  }
  roadsNear(x, y, r) {
    return this.roadGrid.query(x - r, y - r, x + r, y + r);
  }
  waterNear(x, y, r) {
    return this.waterGrid.query(x - r, y - r, x + r, y + r);
  }
  greenNear(x, y, r) {
    return this.greenGrid.query(x - r, y - r, x + r, y + r);
  }
  treesNear(x, y, r) {
    return this.treeGrid.query(x - r, y - r, x + r, y + r);
  }

  // Nearest point on any road to (x,y) — used to place the player/vehicles
  // on-street instead of risking a spawn inside a building footprint.
  // `drivableOnly` restricts candidates to cat !== 'foot'/'cycle' (car spawns).
  // `streetLevel` skips the ring's raised/sunken roads (spawn points).
  nearestRoadPoint(x, y, searchRadius = 400, drivableOnly = false, streetLevel = false) {
    let r = 30, best = null, bestDist2 = Infinity;
    while (!best && r <= searchRadius) {
      for (const road of this.roadsNear(x, y, r)) {
        if (drivableOnly && (road.cat === 'foot' || road.cat === 'cycle')) continue;
        if (streetLevel && road.z) continue;
        for (let i = 0; i < road.pts.length - 1; i++) {
          const cp = closestPointOnSegment(x, y, road.pts[i][0], road.pts[i][1], road.pts[i + 1][0], road.pts[i + 1][1]);
          if (cp.dist2 < bestDist2) { bestDist2 = cp.dist2; best = { x: cp.x, y: cp.y, road }; }
        }
      }
      r *= 2;
    }
    return best;
  }

  // Some real building footprints are huge (station canopies, market halls)
  // and can fully swallow a nearby road point. If (x,y) is inside one, push
  // straight to its nearest edge + margin, however deep inside it is - the
  // small-radius circle collision in player.js only nudges near an edge, it
  // won't rescue a point that's dozens of meters from the nearest wall.
  // Looped (not a single push) because in a dense block - most of the
  // Binnenstad - escaping building A can land you a few cm inside its direct
  // neighbour building B; one pass alone was reported spawning players
  // inside buildings often enough to notice.
  escapeBuilding(x, y, margin = 0.6) {
    const x0 = x, y0 = y;
    const hitAt = (px, py) => this.buildingsNear(px, py, 1).find((b) => {
      const [minx, miny, maxx, maxy] = b.bounds;
      return px >= minx && px <= maxx && py >= miny && py <= maxy && pointInPolygon(px, py, b.pts);
    });
    for (let iter = 0; iter < 6; iter++) {
      const hit = hitAt(x, y);
      if (!hit) return [x, y];
      const pts = hit.pts;
      let bestDist2 = Infinity, bestX = x, bestY = y;
      for (let i = 0; i < pts.length - 1; i++) {
        const cp = closestPointOnSegment(x, y, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
        if (cp.dist2 < bestDist2) { bestDist2 = cp.dist2; bestX = cp.x; bestY = cp.y; }
      }
      const d = Math.sqrt(bestDist2) || 0.01;
      x += (bestX - x) / d * (d + margin);
      y += (bestY - y) / d * (d + margin);
    }
    if (!hitAt(x, y)) return [x, y];
    // still inside: two footprints kept pushing it back and forth (a block
    // of row houses). Take the nearest spot that is clear by `margin`.
    const clear = (px, py) => !hitAt(px, py) && !hitAt(px + margin, py) && !hitAt(px - margin, py) && !hitAt(px, py + margin) && !hitAt(px, py - margin);
    for (let r = 0.5; r <= 40; r += 0.5) {
      const n = Math.max(8, Math.round(r * 4));
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2;
        const px = x0 + Math.cos(a) * r, py = y0 + Math.sin(a) * r;
        if (clear(px, py)) return [px, py];
      }
    }
    return [x, y];
  }

  // Can someone standing at (x,y) walk at least `reach` metres away? A 1 m
  // flood fill over building footprints: catches courtyards that the
  // footprints close off completely (e.g. behind the Academiegebouw), where a
  // spawn looks fine but you can never leave.
  canWalkOut(x, y, reach = 70, cell = 1, clearance = 0.35) {
    const R = reach + 2;
    const N = Math.ceil((2 * R) / cell) + 1;
    const c0 = Math.floor(N / 2);
    const seen = new Uint8Array(N * N);
    const free = (px, py) => {
      if (isInWater(this, px, py)) return false;
      for (const b of this.buildingsNear(px, py, clearance + 0.5)) {
        const [minx, miny, maxx, maxy] = b.bounds;
        if (px < minx - clearance || px > maxx + clearance || py < miny - clearance || py > maxy + clearance) continue;
        if (pointInPolygon(px, py, b.pts) && !inPassage(this, b, px, py)) return false;
      }
      return true;
    };
    const stack = [c0 * N + c0];
    seen[c0 * N + c0] = 1;
    while (stack.length) {
      const k = stack.pop();
      const i = k % N, j = (k - i) / N;
      const px = x + (i - c0) * cell, py = y + (j - c0) * cell;
      if (Math.hypot(px - x, py - y) >= reach) return true;
      for (const [a, b] of [[i + 1, j], [i - 1, j], [i, j + 1], [i, j - 1]]) {
        if (a < 0 || b < 0 || a >= N || b >= N) continue;
        const kk = b * N + a;
        if (seen[kk]) continue;
        seen[kk] = 1;
        if (free(x + (a - c0) * cell, y + (b - c0) * cell)) stack.push(kk);
      }
    }
    return false;
  }

  // Where to put the player near (x,y): the nearest road point, pushed out of
  // buildings, that you can actually walk away from. Falls back to further
  // road points (proper streets first) and finally to the plain nearest one.
  findOpenSpawn(x, y, searchRadius = 400, drivableOnly = false) {
    const first = this.nearestRoadPoint(x, y, searchRadius, drivableOnly, true);
    const tryPoint = (p) => {
      if (!p) return null;
      const [sx, sy] = this.escapeBuilding(p.x, p.y);
      return this.canWalkOut(sx, sy) ? { x: sx, y: sy, road: p.road || null } : null;
    };
    const ok = tryPoint(first);
    if (ok) return ok;
    const cands = [];
    for (const road of this.roadsNear(x, y, 160)) {
      if (road.z || (drivableOnly && (road.cat === 'foot' || road.cat === 'cycle'))) continue;
      const pts = road.pts;
      for (let i = 0; i < pts.length - 1; i++) {
        const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
        const n = Math.max(1, Math.round(Math.hypot(bx - ax, by - ay) / 8));
        for (let k = 0; k <= n; k++) {
          const px = ax + ((bx - ax) * k) / n, py = ay + ((by - ay) * k) / n;
          const pref = road.cat === 'foot' || road.cat === 'cycle' ? 25 : 0;
          cands.push({ x: px, y: py, road, score: Math.hypot(px - x, py - y) + pref });
        }
      }
    }
    cands.sort((a, b) => a.score - b.score);
    for (let i = 0; i < cands.length && i < 60; i += 3) {
      const hit = tryPoint(cands[i]);
      if (hit) return hit;
    }
    if (!first) return null;
    const [sx, sy] = this.escapeBuilding(first.x, first.y);
    return { x: sx, y: sy, road: first.road || null };
  }

  // Open ground someone can stand on and walk away from: dry (or a bridge),
  // outside every footprint except its passages, not a closed-off courtyard.
  isOpenSpot(x, y, reach = 45) {
    if (isInWater(this, x, y) && !this.isOnBridge(x, y)) return false;
    for (const b of this.buildingsNear(x, y, 0.5)) {
      const [minx, miny, maxx, maxy] = b.bounds;
      if (x >= minx && x <= maxx && y >= miny && y <= maxy && pointInPolygon(x, y, b.pts) && !inPassage(this, b, x, y)) return false;
    }
    return this.canWalkOut(x, y, reach);
  }

  // (x, y) when that is open ground, else the nearest open spot a few metres
  // around it, else the nearest reachable street (findOpenSpawn).
  openSpotNear(x, y, drivableOnly = false) {
    if (this.isOpenSpot(x, y)) return { x, y };
    for (let r = 1.5; r <= 9; r += 1.5) {
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2, px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
        if (this.isOpenSpot(px, py)) return { x: px, y: py };
      }
    }
    const o = this.findOpenSpawn(x, y, 250, drivableOnly);
    return o ? { x: o.x, y: o.y, road: o.road } : { x, y };
  }

  // A vehicle's (x,y) can fall inside a water polygon that a bridge actually
  // spans above - checkVehicleWater in vehicle.js calls this first so it
  // doesn't "drown" cars safely crossing on a bridge deck.
  isOnBridge(x, y) {
    for (const road of this.roadsNear(x, y, 8)) {
      if (!road.bridge) continue;
      const pts = road.pts;
      const threshold = road.width / 2 + 1.5;
      for (let i = 0; i < pts.length - 1; i++) {
        const cp = closestPointOnSegment(x, y, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
        if (cp.dist2 <= threshold * threshold) return true;
      }
    }
    return false;
  }

  queryView(minx, miny, maxx, maxy) {
    return {
      roads: this.roadGrid.query(minx, miny, maxx, maxy),
      buildings: this.buildingGrid.query(minx, miny, maxx, maxy),
      water: this.waterGrid.query(minx, miny, maxx, maxy),
      green: this.greenGrid.query(minx, miny, maxx, maxy),
      trees: this.treeGrid.query(minx, miny, maxx, maxy),
    };
  }
}

// onProgress(0..1) reports download progress when the size is known.
// game/mapextras.json (scripts/add_map_extras.py): data kept next to
// citymap.json and merged here - extra footprints, per-building patches
// (heights, names, landmark models), bus-only roads and bus lanes.
async function fetchExtras(url) {
  try {
    const res = await fetch(url.replace(/[^/]*$/, 'mapextras.json'));
    return res.ok ? await res.json() : null;
  } catch (e) {
    return null;
  }
}

// a vertex to the decimetre as one number (|x|, |y| < 100 km)
const exKey = (p) => (Math.round(p[0] * 10) + 1048576) * 2097152 + Math.round(p[1] * 10) + 1048576;

function polyArea(pts) {
  let a = 0;
  for (let i = 0, n = pts.length; i < n; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % n];
    a += x0 * y1 - x1 * y0;
  }
  return Math.abs(a / 2);
}

export function applyMapExtras(data, ex) {
  if (!ex) return;
  data.passageWays = ex.passages || [];
  for (const b of ex.buildings || []) data.buildings.push({ ...b });
  // every footprint's bounds once (patches never move a footprint)
  const B = data.buildings, bb = new Float64Array(B.length * 4);
  B.forEach((b, i) => {
    let minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
    for (const q of b.pts) { if (q[0] < minx) minx = q[0]; if (q[0] > maxx) maxx = q[0]; if (q[1] < miny) miny = q[1]; if (q[1] > maxy) maxy = q[1]; }
    bb[i * 4] = minx; bb[i * 4 + 1] = miny; bb[i * 4 + 2] = maxx; bb[i * 4 + 3] = maxy;
  });
  for (const p of ex.buildingPatches || []) {
    // `bounds`: the footprint with these bounds (to the metre), not a landmark
    if (p.bounds) {
      const [p0, p1, p2, p3] = p.bounds;
      for (let i = 0; i < B.length; i++) {
        const b = B[i];
        if (b.landmark || b.pts.length < 3) continue;
        if (Math.abs(bb[i * 4] - p0) < 0.6 && Math.abs(bb[i * 4 + 1] - p1) < 0.6 && Math.abs(bb[i * 4 + 2] - p2) < 0.6 && Math.abs(bb[i * 4 + 3] - p3) < 0.6) Object.assign(b, p.set);
      }
      continue;
    }
    // `landmark`: every footprint of that landmark
    if (p.landmark) {
      for (const b of data.buildings) if (b.landmark === p.landmark) Object.assign(b, p.set);
      continue;
    }
    const [x, y] = p.at;
    let best = null, ba = Infinity;
    for (let i = 0; i < B.length; i++) {
      const P = B[i].pts;
      if (P.length < 3 || x < bb[i * 4] || x > bb[i * 4 + 2] || y < bb[i * 4 + 1] || y > bb[i * 4 + 3] || !pointInPolygon(x, y, P)) continue;
      const a = polyArea(P);
      if (a < ba) { ba = a; best = B[i]; }
    }
    if (best) Object.assign(best, p.set);
  }
  data.buildings = data.buildings.filter((b) => !b.remove);

  const at = new Map();
  for (const r of data.roads) {
    r.pts.forEach((q, i) => {
      const k = exKey(q);
      let a = at.get(k);
      if (!a) at.set(k, a = []);
      a.push(r, i);
    });
  }
  // height fixes on profiled ways (scripts/add_map_extras.py ROAD_Z):
  // every road with a height profile through that vertex takes z there
  for (const p of ex.roadZ || []) {
    const a = at.get(exKey(p.at));
    if (a) for (let i = 0; i < a.length; i += 2) if (a[i].z) a[i].z[a[i + 1]] = p.z;
  }
  // roads sharing the consecutive vertices a -> b: [{ road, same }]
  const along = (a, b) => {
    const out = [];
    const la = at.get(exKey(a)), kb = exKey(b);
    if (!la) return out;
    for (let i = 0; i < la.length; i += 2) {
      const r = la[i], j = la[i + 1];
      if (r.pts[j + 1] && exKey(r.pts[j + 1]) === kb) out.push({ road: r, same: true });
      else if (r.pts[j - 1] && exKey(r.pts[j - 1]) === kb) out.push({ road: r, same: false });
    }
    return out;
  };

  for (const br of ex.busRoads || []) {
    const hits = new Set();
    for (let i = 0; i < br.pts.length - 1; i++) for (const h of along(br.pts[i], br.pts[i + 1])) if (h.road.cat !== 'foot' && h.road.cat !== 'cycle') hits.add(h.road);
    if (hits.size) {
      for (const r of hits) r.busOnly = true;
      continue;
    }
    data.roads.push({
      pts: br.pts.map((q) => q.slice()), type: 'busway', cat: 'normal', width: br.width || 6.5, speed: 11,
      oneway: !!br.oneway, roundabout: false, name: br.name || '', bridge: !!br.bridge, busOnly: true,
    });
  }
  for (const bl of ex.busLanes || []) {
    for (let i = 0; i < bl.pts.length - 1; i++) {
      for (const h of along(bl.pts[i], bl.pts[i + 1])) {
        const r = h.road;
        if (r.cat === 'foot' || r.cat === 'cycle') continue;
        const L = r.busLane || (r.busLane = { fwd: false, bwd: false });
        if (bl.fwd) L[h.same ? 'fwd' : 'bwd'] = true;
        if (bl.bwd) L[h.same ? 'bwd' : 'fwd'] = true;
        if (bl.contra) r.busContra = true;
        if (!L.fwd && !L.bwd) delete r.busLane;
      }
    }
  }
  data.meta.fuel = ex.fuel || [];
  data.meta.padel = ex.padel || [];
  const eikea = data.buildings.find((b) => b.landmark === 'EIKEA');
  if (eikea && !(data.meta.landmarks || []).some((l) => l.name === 'EIKEA')) {
    const n = eikea.pts.length;
    data.meta.landmarks.push({ name: 'EIKEA', x: eikea.pts.reduce((a, q) => a + q[0], 0) / n, y: eikea.pts.reduce((a, q) => a + q[1], 0) / n, kind: 'store', buildingMatched: true });
  }
}

export async function loadMap(url = 'map.json', onProgress = null) {
  const extras = fetchExtras(url);
  const res = await fetch(url);
  if (!res.ok) throw new Error('failed to load map data: ' + res.status);
  const total = +res.headers.get('content-length') || 0;
  let data;
  if (onProgress && total && res.body && res.body.getReader) {
    const reader = res.body.getReader();
    const chunks = [];
    let got = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      got += value.length;
      onProgress(Math.min(1, got / total));
    }
    const buf = new Uint8Array(got);
    let o = 0;
    for (const c of chunks) { buf.set(c, o); o += c.length; }
    data = JSON.parse(new TextDecoder().decode(buf));
  } else {
    data = await res.json();
  }
  applyMapExtras(data, await extras);
  return new GameMap(data);
}
