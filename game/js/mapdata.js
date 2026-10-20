import { polygonBounds, closestPointOnSegment, pointInPolygon, isInWater } from './util.js';
import { waterPolyAt, waterPolyIn } from './waterlevels.js';
import { inPassage, clipWaysInBuildings } from './passages.js';
import { attachMuseumPlan } from './museumplan.js';
import { attachInteriorPlans } from './interieurplan.js';
import { SpatialGrid } from './spatialgrid.js';
import { deriveBuildings, liftNestedRoofs, isRingRoad } from './derive.js';
import { deckTerrainAt, isDeckRoad } from './deckterrain.js';
import { buildElevation, pickedRibbon, groundHeightAt, surfaceAt, ribbonAt, ribbonZAt, roadZAt, ceilingAt, coveredAt, surfaceHalfWidth, offLevelAt } from './elevation.js';

const CELL = 80; // meters per grid cell

export { SpatialGrid };

// Car roads that run through a water polygon without a bridge tag and
// without a height profile are culverts under an embankment: treat them as
// a covered crossing, dry road with a deck, like a bridge - otherwise cars
// sink there. (The Zuidelijke Ringweg's aqueduct under the Winschoterdiep
// has real heights, see elevation.js.)
const DRY_CATS = new Set(['major', 'normal', 'minor', 'service']);
export function markDryRoad(map, r) {
  // roads with a height profile pass over/under the water for real
  if (r.bridge || r.z || !DRY_CATS.has(r.cat)) return false;
  const pts = r.pts;
  if (!map.waterNear) return false;
  // the water near the whole road, got once: most roads have none, the rest test only these
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of pts) { if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0]; if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; }
  const polys = map.waterGrid.query(x0 - 0.5, y0 - 0.5, x1 + 0.5, y1 + 0.5);
  if (!polys.length) return false;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
    const steps = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / 2));
    for (let k = 0; k <= steps; k++) {
      const x = ax + ((bx - ax) * k) / steps, y = ay + ((by - ay) * k) / steps;
      if (waterPolyIn(polys, x, y)) { r.bridge = true; r.dryCrossing = true; return true; }
    }
  }
  return false;
}
function markDryCrossings(map) {
  let n = 0;
  for (const r of map.roads) if (markDryRoad(map, r)) n++;
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
    const derived = deriveBuildings(data);
    this.canopies = derived.canopies;
    this.buildings = derived.buildings;
    this.water = data.water;
    this.green = data.green;
    this.trees = data.trees || [];
    this.rails = data.rails || [];
    this.stations = data.stations || [];
    this.levelCrossings = data.levelCrossings || [];
    this.railRoutes = data.railRoutes || [];
    this.railLifts = data.railLifts || [];
    // mapped street furniture (scripts/world/furniture.mjs; streetfurniture.js)
    this.furniture = data.furniture || [];
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
    attachInteriorPlans(this.buildings);

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

  // A map from data that has been through the constructor's derivation
  // already (scripts/world/pack_tiles.mjs writes the result into tiles): the
  // arrays are final, so only the lookups and the elevation model are built.
  // parts: meta, roads, buildings, canopies, water, green, trees, rails,
  // stations, levelCrossings, railRoutes, railLifts, passageWays, plus
  // dryCrossings and clippedWays [{ road, building, x, y, len }].
  static fromParts(p) {
    const m = Object.create(this.prototype);
    m.meta = p.meta;
    m.roads = p.roads;
    m.canopies = p.canopies || [];
    m.buildings = p.buildings;
    m.water = p.water;
    m.green = p.green;
    m.trees = p.trees || [];
    m.rails = p.rails || [];
    m.stations = p.stations || [];
    m.levelCrossings = p.levelCrossings || [];
    m.railRoutes = p.railRoutes || [];
    m.railLifts = p.railLifts || [];
    m.furniture = p.furniture || [];
    m.passageWays = (p.passageWays || []).map((q) => ({ ...q, bounds: polygonBounds(q.pts) }));
    m.dryCrossings = p.dryCrossings || 0;
    m.buildingGrid = new SpatialGrid(CELL);
    for (const b of m.buildings) {
      b.bounds = polygonBounds(b.pts);
      m.buildingGrid.insert(b, b.bounds);
    }
    attachMuseumPlan(m.buildings);
    attachInteriorPlans(m.buildings);
    m.roadGrid = new SpatialGrid(CELL);
    for (const r of m.roads) {
      r.bounds = polygonBounds(r.pts);
      m.roadGrid.insert(r, r.bounds);
    }
    m.clippedWays = p.clippedWays || [];
    m.waterGrid = new SpatialGrid(CELL * 2);
    for (const w of m.water) {
      w.bounds = polygonBounds(w.pts);
      m.waterGrid.insert(w, w.bounds);
    }
    m.greenGrid = new SpatialGrid(CELL * 2);
    for (const g of m.green) {
      g.bounds = polygonBounds(g.pts);
      m.greenGrid.insert(g, g.bounds);
    }
    m.elev = buildElevation(m);
    m.treeGrid = new SpatialGrid(CELL * 2);
    for (const t of m.trees) m.treeGrid.insert(t, [t[0], t[1], t[0], t[1]]);
    return m;
  }

  // Height of the surface under (x, y) for something at zHint (absolute m):
  // viaduct decks, trench floors and embankments of the ring roads, street
  // level (0) everywhere else. See elevation.js.
  groundHeightAt(x, y, zHint = 0) {
    if (!this.terrainOn) return groundHeightAt(this.elev, x, y, zHint);
    const t = this.terrainAt(x, y);
    // a bridge or tunnel deck is measured from its own terrain (deckterrain.js): try the
    // decks here first, the ground and the rest after
    const list = this.elev.has ? this.elev.grid.at(x, y) : null;
    if (list) {
      for (const s of list) {
        if (!isDeckRoad(s.r)) continue;
        const dt = this.deckTerrainAt(s.r, x, y, t);
        if (Math.abs(dt - t) < 0.02) continue;
        const z = groundHeightAt(this.elev, x, y, zHint - dt);
        if (pickedRibbon() === s.r) return z + dt;
      }
    }
    const z = groundHeightAt(this.elev, x, y, zHint - t);
    const pr = pickedRibbon();
    return z + (isDeckRoad(pr) ? this.deckTerrainAt(pr, x, y, t) : t);
  }

  // what the profile of ribbon r (null: the ground) is relative to at (x, y), m
  terrainBase(r, x, y) {
    const t = this.terrainAt(x, y);
    return isDeckRoad(r) ? this.deckTerrainAt(r, x, y, t) : t;
  }

  deckTerrainAt(r, x, y, ground) {
    return deckTerrainAt(r, x, y, this.terrain.at, ground, this.terrain.size);
  }

  // The one height query (elevation.js surfaceAt) for whoever keeps `state`
  // = { z, ribbon }: it stays on the road or rail deck it is on. Driving,
  // walking, AI and the paths of cutscenes and races use it.
  // With terrainOn (?terrain, #78) the profiles are relative to the AHN
  // terrain under them (profile.mjs --terrain; bridges and tunnels to the
  // line between their ends, deckterrain.js): the query runs on the
  // relative heights and the terrain is put back on the answer.
  surfaceAt(x, y, state) {
    if (!this.terrainOn) return surfaceAt(this.elev, x, y, state, this._ground || (this._ground = (gx, gy, gz) => this.groundHeightAt(gx, gy, gz)));
    state.z = (state.z || 0) - this.terrainBase(state.ribbon, x, y);
    surfaceAt(this.elev, x, y, state, this._groundRel || (this._groundRel = (gx, gy, gz) => groundHeightAt(this.elev, gx, gy, gz)));
    state.z += this.terrainBase(state.ribbon, x, y);
    return state;
  }

  // Height at (x, y) for something at z on `ribbon` (stateless surfaceAt,
  // for probes around a vehicle or a walker)
  surfaceZ(x, y, z, ribbon) {
    if (ribbon) {
      const t = this.terrainOn ? this.terrainBase(ribbon, x, y) : 0;
      const zr = ribbonZAt(this.elev, ribbon, x, y);
      if (zr !== null && Math.abs(zr + t - z) <= 1.1) return zr + t;
      // past its end: the way that carries on (as surfaceAt), not a
      // carriageway alongside
      const st = this._probe || (this._probe = { z: 0, ribbon: null, kind: 'ground' });
      st.z = z; st.ribbon = ribbon;
      return this.surfaceAt(x, y, st).z;
    }
    return this.groundHeightAt(x, y, z);
  }

  // The ribbon (layer) at (x, y) nearest height z: what something put down
  // there stands on (null at street level)
  ribbonAt(x, y, z) {
    // (with ?terrain the layers are relative to the terrain, #78)
    return ribbonAt(this.elev, x, y, this.terrainOn ? z - this.terrainAt(x, y) : z);
  }

  // Height of road r at (x, y); 0 for flat roads.
  roadZAt(r, x, y) {
    return roadZAt(r, x, y);
  }

  // Height to put a freshly placed car / person at (x, y): the surface there
  // seen from street level (a ramp's foot, not the deck above a street).
  // (It always was: the nearest-road lookup it made had a 25 m radius, under
  // nearestRoadPoint's first 30 m ring, so it never found one.) Whoever must
  // stand on a deck asks for its ribbon: surfaceAt(x, y, { z, ribbon }).
  spawnZ(x, y) {
    return this.spawnState(x, y).z;
  }

  // spawnZ as a surfaceAt state, to keep for whatever is put down there
  spawnState(x, y) {
    if (!this.elev.has) return { z: 0, ribbon: null, kind: 'ground' };
    return this.surfaceAt(x, y, { z: 0.3, ribbon: null });
  }

  ceilingAt(x, y, z) {
    if (!this.terrainOn) return ceilingAt(this.elev, x, y, z);
    const t = this.terrainAt(x, y), c = ceilingAt(this.elev, x, y, z - t);
    return c + t;
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
    return !!waterPolyAt(this, x, y);
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

  // Open ground someone can stand on and walk away from: dry (a bridge is dry for isInWater),
  // outside every footprint except its passages, not a closed-off courtyard.
  isOpenSpot(x, y, reach = 45) {
    if (isInWater(this, x, y)) return false;
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
  // the terrain under (x, y), m relative to street level (terrainraster.js:
  // the AHN field of the tiles; flat until the renderer draws it)
  terrainAt(x, y) {
    return this.terrain ? this.terrain.at(x, y) : 0;
  }

  isOnBridge(x, y) {
    for (const road of this.roadsNear(x, y, 8)) {
      // (a movable bridge that is open: movablebridges.js)
      if (!road.bridge || road._open) continue;
      const pts = road.pts;
      const threshold = road.width / 2 + 1.5;
      for (let i = 0; i < pts.length - 1; i++) {
        const cp = closestPointOnSegment(x, y, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
        if (cp.dist2 <= threshold * threshold) return true;
      }
    }
    return false;
  }

  // withTrees false: the minimap does not draw them
  queryView(minx, miny, maxx, maxy, withTrees = true) {
    return {
      roads: this.roadGrid.query(minx, miny, maxx, maxy),
      buildings: this.buildingGrid.query(minx, miny, maxx, maxy),
      water: this.waterGrid.query(minx, miny, maxx, maxy),
      green: this.greenGrid.query(minx, miny, maxx, maxy),
      trees: withTrees ? this.treeGrid.query(minx, miny, maxx, maxy) : [],
    };
  }
}

// The worker's map only builds road surfaces and shores, so after loading it
// drops what those never read: buildings keep just their bounds in the grid
// (quaywalls.js nearBuilt), canopies and trees go. Measured with
// scripts/perf/mapmem.mjs (docs/PERF-PROFIEL.md).
export function slimWorkerMap(map) {
  const light = new Map();
  for (const arr of map.buildingGrid.map.values()) {
    for (let i = 0; i < arr.length; i++) {
      const b = arr[i];
      let l = light.get(b);
      if (!l) light.set(b, l = { bounds: b.bounds });
      arr[i] = l;
    }
  }
  map.buildings = [];
  map.canopies = [];
  map.clippedWays = [];
  map.trees = [];
  map.treeGrid = null;
  return map;
}

// onProgress(0..1) reports download progress when the size is known.
// game/mapextras.json (scripts/add_map_extras.py): data kept next to
// stad.json and merged here - extra footprints, per-building patches
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
  // roadPatches [{ osm, set }]: fields of the way with that OSM id (the real width of an alley, #284)
  if (ex.roadPatches && ex.roadPatches.length) {
    const by = new Map(ex.roadPatches.map((p) => [p.osm, p.set]));
    for (const r of data.roads) { const set = by.get(r.osm); if (set) Object.assign(r, set); }
  }

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
      ...(br.z && br.z.length === br.pts.length ? { z: br.z.slice() } : {}),
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

// The map from stad.json (the hand layer, docs/ARCHITECTUUR-STAD-NAAR-TEGELS.md): without the layers the OSM tile build
// brings (water, green, trees, buildings other than the hand-made ones), so only for a build without world/ tiles.
export async function loadMap(url = 'stad.json', onProgress = null) {
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
  const ex = await extras;
  for (const l of data.fromOsm || []) if (!data[l]) data[l] = [];
  for (const k of ['format', 'fromOsm', 'tiles', 'cover']) delete data[k];
  // every map file is in the RD New world frame (rdnew.js); a file from an
  // older build would put the whole map tens of metres off
  for (const [name, f] of [['stad.json', data.meta && data.meta.frame], ['mapextras.json', ex ? ex.frame : 'rd-new']]) {
    if (f !== 'rd-new') console.error(`${name} is not in the rd-new frame (scripts/world/rdnew.py)`);
  }
  applyMapExtras(data, ex);
  return new GameMap(data);
}
