import { polygonBounds, closestPointOnSegment, pointInPolygon, isInWater } from './util.js';

const CELL = 80; // meters per grid cell

class SpatialGrid {
  constructor(cellSize) {
    this.cell = cellSize;
    this.map = new Map();
  }
  key(cx, cy) { return cx + ',' + cy; }
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
    return x >= minx && x <= maxx && y >= miny && y <= maxy && pointInPolygon(x, y, w.pts);
  });
  for (const b of crossed) {
    if (b.h > 4 || b.name || b.landmark || b.type === 'houseboat') continue;
    if (b.pts.some(([x, y]) => [[0, 0], [3, 0], [-3, 0], [0, 3], [0, -3]].some(([dx, dy]) => wet(x + dx, y + dy)))) out.add(b);
  }
  return out;
}

function buildingsCrossedBy(buildings, lines, step) {
  const out = new Set();
  if (!lines.length) return out;
  const samples = [];
  for (const P of lines) {
    for (let i = 0; i < P.length - 1; i++) {
      const [ax, ay] = P[i], [bx, by] = P[i + 1];
      const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / step));
      for (let k = 0; k < n; k++) samples.push([ax + ((bx - ax) * k) / n, ay + ((by - ay) * k) / n]);
    }
  }
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
        for (const [x, y] of cells.get(cx + ',' + cy) || []) {
          if (x <= minx || x >= maxx || y <= miny || y >= maxy) continue;
          if (pointInPolygon(x, y, b.pts)) { out.add(b); break search; }
        }
      }
    }
  }
  return out;
}

// Car roads that run through a water polygon without a bridge tag are
// aqueducts (the Zuidelijke Ringweg dives under the Winschoterdiep at
// Europaplein) or culverts under an embankment. The map has no tunnel data
// and roads are all drawn at street level, so treat them as a covered
// crossing: dry road with a deck, like a bridge - otherwise cars sink there.
const DRY_CATS = new Set(['major', 'normal', 'minor', 'service']);
function markDryCrossings(map) {
  let n = 0;
  for (const r of map.roads) {
    if (r.bridge || !DRY_CATS.has(r.cat)) continue;
    const pts = r.pts;
    let wet = false;
    for (let i = 0; i < pts.length - 1 && !wet; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
      const steps = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / 2));
      for (let k = 0; k <= steps; k++) {
        const x = ax + ((bx - ax) * k) / steps, y = ay + ((by - ay) * k) / steps;
        for (const w of map.waterNear(x, y, 0.5)) {
          const [minx, miny, maxx, maxy] = w.bounds;
          if (x >= minx && x <= maxx && y >= miny && y <= maxy && pointInPolygon(x, y, w.pts)) { wet = true; break; }
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
    const hw = r.width / 2 - 0.3;
    if (hw <= 0) continue;
    for (let i = 0; i < r.pts.length - 1; i++) {
      const cp = closestPointOnSegment(x, y, r.pts[i][0], r.pts[i][1], r.pts[i + 1][0], r.pts[i + 1][1]);
      if (cp.dist2 < hw * hw) return true;
    }
  }
  return false;
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
    // Same for the covers/overpasses the ring road runs under (the sunken
    // Zuidelijke Ringweg): extruded they are a block across the carriageway.
    const overRing = buildingsCrossedBy(all, data.roads.filter((r) => r.type === 'trunk' && !r.bridge).map((r) => r.pts), 2);
    const isCanopy = (b) => b.type === 'roof' || overRails.has(b) || overRing.has(b);
    this.canopies = all.filter(isCanopy);
    this.buildings = all.filter((b) => !isCanopy(b));
    this.water = data.water;
    this.green = data.green;
    this.trees = data.trees || [];
    this.rails = data.rails || [];
    this.stations = data.stations || [];
    this.levelCrossings = data.levelCrossings || [];
    this.railRoutes = data.railRoutes || [];
    this.railLifts = data.railLifts || [];

    this.buildingGrid = new SpatialGrid(CELL);
    for (const b of this.buildings) {
      b.bounds = polygonBounds(b.pts);
      this.buildingGrid.insert(b, b.bounds);
    }
    liftNestedRoofs(this.buildings, this.buildingGrid);

    this.roadGrid = new SpatialGrid(CELL);
    for (const r of this.roads) {
      r.bounds = polygonBounds(r.pts);
      this.roadGrid.insert(r, r.bounds);
    }

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
    this.trees = this.trees.filter((t) => !onCarriageway(this, t[0], t[1]));

    this.treeGrid = new SpatialGrid(CELL * 2);
    for (const t of this.trees) {
      this.treeGrid.insert(t, [t[0], t[1], t[0], t[1]]);
    }
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
  nearestRoadPoint(x, y, searchRadius = 400, drivableOnly = false) {
    let r = 30, best = null, bestDist2 = Infinity;
    while (!best && r <= searchRadius) {
      for (const road of this.roadsNear(x, y, r)) {
        if (drivableOnly && (road.cat === 'foot' || road.cat === 'cycle')) continue;
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
    for (let iter = 0; iter < 6; iter++) {
      const hit = this.buildingsNear(x, y, 1).find((b) => {
        const [minx, miny, maxx, maxy] = b.bounds;
        return x >= minx && x <= maxx && y >= miny && y <= maxy && pointInPolygon(x, y, b.pts);
      });
      if (!hit) break;
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
        if (pointInPolygon(px, py, b.pts)) return false;
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
  findOpenSpawn(x, y, searchRadius = 400) {
    const first = this.nearestRoadPoint(x, y, searchRadius);
    const tryPoint = (p) => {
      if (!p) return null;
      const [sx, sy] = this.escapeBuilding(p.x, p.y);
      return this.canWalkOut(sx, sy) ? { x: sx, y: sy, road: p.road || null } : null;
    };
    const ok = tryPoint(first);
    if (ok) return ok;
    const cands = [];
    for (const road of this.roadsNear(x, y, 160)) {
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
export async function loadMap(url = 'map.json', onProgress = null) {
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
  return new GameMap(data);
}
