import { polygonBounds, closestPointOnSegment, pointInPolygon } from './util.js';

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

export class GameMap {
  constructor(data) {
    this.meta = data.meta;
    this.roads = data.roads;
    this.buildings = data.buildings;
    this.water = data.water;
    this.green = data.green;
    this.trees = data.trees || [];

    this.buildingGrid = new SpatialGrid(CELL);
    for (const b of this.buildings) {
      b.bounds = polygonBounds(b.pts);
      this.buildingGrid.insert(b, b.bounds);
    }

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

export async function loadMap(url = 'map.json') {
  const res = await fetch(url);
  if (!res.ok) throw new Error('failed to load map data: ' + res.status);
  const data = await res.json();
  return new GameMap(data);
}
