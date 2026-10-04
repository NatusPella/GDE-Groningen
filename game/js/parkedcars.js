import { Vehicle, MODELS, TRACTOR_MODEL, QUAD_MODEL } from './vehicle.js';
import { pointInPolygon, closestPointOnSegment, inWaterPoly } from './util.js';
import { propsInRadius } from './breakables.js';
import { villageKerbs, villageSlotFree } from './countryvillage.js';
import { BLOCK, chash, edgeDistance, urbanWeight, realWater } from './countryfield.js';
import { REAL, RTILE, buildingsInTile, roadsInTile, buildingModel, buildingAt } from './countryreal.js';
import { blockPlan, farmDetail, farmWorld, pushOutOfPlan, FARM_TYPES } from './countryplan.js';
import { roadGap } from './countryedge.js';

// Kerbside parking along residential streets: half a car length up on the
// stoep, clear of the traffic lane. Slots are deterministic per road segment
// (same street, same gaps every visit) and generated lazily per grid cell;
// only the nearest few become real, stealable, pushable vehicles.
//
// A parked car sleeps: it is kept out of world.vehicles (so physics, AI,
// collision pairs and audio never see it) in a small grid of its own, and
// scene3d draws it as a frozen mesh. It wakes into world.vehicles the moment
// something moving overlaps it, the player comes close on foot or aims a gun
// its way, and falls asleep again once left alone.

const CELL = 64;
const SPAWN_R = 135;
const DESPAWN_R = 165;
const MAX_ACTIVE = 60;
const SLOT_GAP = 6.4;
const END_CLEAR = 7; // m kept free at each segment end (junctions, bends)
const ROAD_P = { residential: 0.6, unclassified: 0.4, tertiary: 0.25 };
const FILL = 0.62;
const CACHE_CELLS = 600;
const GRID = 16;
const WAKE_WALK_R = 7; // m: on foot this close, the car is live (enter, push, bump)
const WAKE_AIM_R = 40; // aiming a weapon: cars in range must be hittable
const SLEEP_AFTER = 2; // s left untouched before a woken car sleeps again
const GEN_BUDGET_MS = 0.8;

const states = new WeakMap();

function stateOf(world) {
  let st = states.get(world);
  if (!st) {
    st = { cells: new Map(), active: new Set(), sleeping: new Set(), grid: new Map(), genQueue: [], roadIdx: new Map() };
    world.map.roads.forEach((r, i) => st.roadIdx.set(r, i));
    states.set(world, st);
  }
  return st;
}

function hash(a, b, c) {
  const h = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453;
  return h - Math.floor(h);
}

function parkable(r) {
  return r.cat === 'normal' && ROAD_P[r.type] !== undefined && !r.bridge && !r.z && !r.roundabout && r.pts.length > 1 && (r.width || 0) >= 5.5;
}

function inBuilding(map, x, y) {
  for (const b of map.buildingsNear(x, y, 0.5)) {
    const [minx, miny, maxx, maxy] = b.bounds;
    if (x >= minx && x <= maxx && y >= miny && y <= maxy && pointInPolygon(x, y, b.pts)) return true;
  }
  return false;
}

function onOtherRoad(map, own, x, y) {
  for (const r of map.roadsNear(x, y, 10)) {
    if (r === own) continue;
    const hw = (r.width || 3) / 2 + 0.4;
    for (let i = 0; i < r.pts.length - 1; i++) {
      if (closestPointOnSegment(x, y, r.pts[i][0], r.pts[i][1], r.pts[i + 1][0], r.pts[i + 1][1]).dist2 < hw * hw) return true;
    }
  }
  return false;
}

// Footprint (plus a walkway behind it) free of facades, water, other roads
// and trees.
export function slotFits(map, road, x, y, angle, m, outX, outY) {
  // kept free by home.js (garage, bike rack, the kerb for their long vehicles)
  if (map.reservedAt && map.reservedAt(x, y)) return false;
  const c = Math.cos(angle), s = Math.sin(angle);
  const hl = m.len / 2 + 0.3, hw = m.wid / 2 + 0.2;
  for (const [lx, ly] of [[hl, hw], [hl, -hw], [-hl, hw], [-hl, -hw], [0, 0]]) {
    const px = x + lx * c - ly * s, py = y + lx * s + ly * c;
    if (inBuilding(map, px, py) || inWaterPoly(map, px, py) || onOtherRoad(map, road, px, py)) return false;
  }
  for (const k of [-0.4, 0, 0.4]) {
    const px = x + c * m.len * k + outX * (m.wid / 2 + 0.9), py = y + s * m.len * k + outY * (m.wid / 2 + 0.9);
    if (inBuilding(map, px, py)) return false;
  }
  for (const t of map.treesNear(x, y, m.len)) {
    const cp = closestPointOnSegment(t[0], t[1], x - c * m.len / 2, y - s * m.len / 2, x + c * m.len / 2, y + s * m.len / 2);
    if (cp.dist2 < (m.wid / 2 + 0.6) ** 2) return false;
  }
  return !map.isOnBridge(x, y);
}

// Yields after every footprint test (the expensive part), so a cell can be
// spread over several frames; returns the cell's slots.
function* genCell(world, st, gx, gy) {
  const { map } = world;
  const x0 = gx * CELL, y0 = gy * CELL;
  const slots = [];
  for (const r of map.roadsNear(x0 + CELL / 2, y0 + CELL / 2, CELL * 0.75)) {
    if (!parkable(r)) continue;
    const ri = st.roadIdx.get(r) ?? 0;
    const pts = r.pts;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (len < END_CLEAR * 2 + 4) continue;
      const tx = (b[0] - a[0]) / len, ty = (b[1] - a[1]) / len;
      for (const side of [1, -1]) {
        if (hash(ri, i, side) > ROAD_P[r.type]) continue;
        // right of travel is (-ty, tx); side -1 parks facing the other way
        const nx = -ty * side, ny = tx * side;
        const angle = Math.atan2(ty, tx) + (side < 0 ? Math.PI : 0);
        for (let k = 0, t = END_CLEAR + hash(ri, i, 5 + side) * 3; t < len - END_CLEAR; k++, t += SLOT_GAP) {
          const h = hash(ri, i * 131 + k, side * 7);
          if (h > FILL) continue;
          const m = MODELS[Math.floor(hash(ri, k, i + side) * MODELS.length)];
          const off = r.width / 2 + m.wid / 2 + 0.45;
          const x = a[0] + tx * t + nx * off, y = a[1] + ty * t + ny * off;
          if (x < x0 || x >= x0 + CELL || y < y0 || y >= y0 + CELL) continue;
          const fits = slotFits(map, r, x, y, angle, m, nx, ny);
          yield;
          if (fits) slots.push({ x, y, angle, model: m, v: null, taken: false });
        }
      }
    }
  }
  if (edgeDistance(x0 + CELL / 2, y0 + CELL / 2) > -CELL) yield* countrySlots(x0, y0, slots);
  // the streets round an Ommelanden village centre (countryvillage.js)
  for (const k of villageKerbs(x0, y0, CELL)) {
    for (const side of [1, -1]) {
      if (hash(k.id, 3, side) > 0.55) continue;
      const nx = -k.uy * side, ny = k.ux * side;
      const angle = Math.atan2(k.uy, k.ux) + (side < 0 ? Math.PI : 0);
      for (let n = 0, t = END_CLEAR + hash(k.id, 5, side) * 3; t < k.len - END_CLEAR; n++, t += SLOT_GAP) {
        if (hash(k.id * 7 + n, 9, side) > 0.5) continue;
        const m = MODELS[Math.floor(hash(k.id, n, side + 4) * MODELS.length)];
        const off = k.hw + m.wid / 2 + 0.4;
        const x = k.ax + k.ux * t + nx * off, y = k.ay + k.uy * t + ny * off;
        if (x < x0 || x >= x0 + CELL || y < y0 || y >= y0 + CELL) continue;
        const fits = villageSlotFree(x, y, angle, m.len + 0.6, m.wid + 0.4);
        yield;
        if (fits) slots.push({ x, y, angle, model: m, v: null, taken: false });
      }
    }
  }
  return slots;
}

// Out in the Ommelanden: the farm tractors (the countryplan farmsteads and
// the barns of the real data, drawn nowhere else), a quad at some farms and
// cars at the kerb of the village streets. All real, stealable vehicles.
let countryCars = null;
const COUNTRY_CARS = () => countryCars || (countryCars = MODELS.filter((m) => m.name !== 'sport'));
const hexColor = (c) => (typeof c === 'number' ? '#' + c.toString(16).padStart(6, '0') : c);
function countryFree(x, y, angle, m) {
  const c = Math.cos(angle), s = Math.sin(angle);
  for (const k of [-0.5, 0, 0.5]) {
    const px = x + c * m.len * k, py = y + s * m.len * k;
    if (edgeDistance(px, py) < 0 || realWater(px, py) > -1.5 || buildingAt(px, py, m.wid / 2 + 0.2) >= 0) return false;
    if (roadGap(px, py, 2) < m.wid / 2 + 0.2) return false;
    if (pushOutOfPlan({ x: px, y: py }, m.wid / 2 + 0.2)) return false;
  }
  return true;
}
// Farm tractors and quads, as countryside.js draws no tractor props any more.
export function farmVehicleSpots(bx, by) {
  const out = [];
  for (const f of blockPlan(bx, by).farms) {
    const fd = farmDetail(f);
    for (const it of fd.items) {
      if (it.kind !== 'tractor') continue;
      out.push({ x: it.x, y: it.y, angle: f.angle - it.rot, model: { ...TRACTOR_MODEL, color: hexColor(it.color) } });
    }
    if (chash(Math.round(f.x) + 11, Math.round(f.y) - 7) < 0.4) {
      const T = FARM_TYPES[f.type], lz = (T.drive[0] + T.drive[1]) / 2;
      for (const lx of [T.depth * 0.45, T.depth * 0.3, -3]) {
        const [qx, qy] = farmWorld(f, lx, lz);
        if (!countryFree(qx, qy, f.angle, QUAD_MODEL)) continue;
        out.push({ x: qx, y: qy, angle: f.angle + Math.PI / 2, model: { ...QUAD_MODEL, color: ['#b8322a', '#2f5fa8', '#3f7d3a', '#c9a227'][Math.floor(chash(f.x | 0, 5) * 4)] } });
        break;
      }
    }
  }
  return out;
}
// The yard tractor by a real barn (as countryside.js genReal placed it).
export function barnTractorSpot(i) {
  const x = REAL.bx[i], y = REAL.by[i];
  const m = buildingModel(i);
  if (m.kind !== 'barn' || urbanWeight(x, y) >= 0.3) return null;
  const h = chash(Math.round(x) + 3, Math.round(y) - 5);
  if (h <= 0.6) return null;
  const ca = Math.cos(m.angle), sa = Math.sin(m.angle);
  const col = [0x3f7d3a, 0xb8322a, 0x2f5fa8, 0x3f7d3a][Math.floor(h * 40) % 4];
  return { x: x - sa * (m.short / 2 + 4), y: y + ca * (m.short / 2 + 4), angle: m.angle, model: { ...TRACTOR_MODEL, color: hexColor(col) } };
}
function* countrySlots(x0, y0, slots) {
  const inCell = (x, y) => x >= x0 && x < x0 + CELL && y >= y0 && y < y0 + CELL;
  const take = (q) => { if (q && inCell(q.x, q.y)) slots.push({ x: q.x, y: q.y, angle: q.angle, model: q.model, v: null, taken: false }); };
  const seen = new Set();
  for (const [cx, cy] of [[x0, y0], [x0 + CELL - 1, y0], [x0, y0 + CELL - 1], [x0 + CELL - 1, y0 + CELL - 1]]) {
    const bx = Math.floor(cx / BLOCK), by = Math.floor(cy / BLOCK);
    if (seen.has(bx * 100003 + by)) continue;
    seen.add(bx * 100003 + by);
    for (const q of farmVehicleSpots(bx, by)) take(q);
  }
  if (!REAL.ready) return;
  const tx = Math.floor(x0 / RTILE), ty = Math.floor(y0 / RTILE);
  for (const i of buildingsInTile(tx, ty) || []) {
    if (REAL.code[i] !== 4 && REAL.code[i] !== 0) continue;
    const q = barnTractorSpot(i);
    if (q && inCell(q.x, q.y) && countryFree(q.x, q.y, q.angle, q.model)) take(q);
  }
  yield;
  // kerbside on the village streets (residential / living / unclassified)
  const R = roadsInTile(tx, ty);
  if (!R) return;
  for (let k = 0; k < R.length; k += 2) {
    const ri = R[k], si = R[k + 1], r = REAL.roads[ri];
    if ((r.kind !== 7 && r.kind !== 6) || r.bridge) continue;
    const a = r.pts[si], b = r.pts[si + 1];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (len < END_CLEAR * 2 + 4) continue;
    if (urbanWeight((a[0] + b[0]) / 2, (a[1] + b[1]) / 2) < 0.12) continue;
    const ux = (b[0] - a[0]) / len, uy = (b[1] - a[1]) / len;
    for (const side of [1, -1]) {
      if (hash(ri, si, side + 20) > 0.45) continue;
      const nx = -uy * side, ny = ux * side;
      const angle = Math.atan2(uy, ux) + (side < 0 ? Math.PI : 0);
      for (let n = 0, t = END_CLEAR + hash(ri, si, side + 30) * 4; t < len - END_CLEAR; n++, t += SLOT_GAP * 1.4) {
        if (hash(ri, si * 131 + n, side + 40) > 0.35) continue;
        const m = COUNTRY_CARS()[Math.floor(hash(ri, n, si + side) * COUNTRY_CARS().length)];
        const off = r.w / 2 + m.wid / 2 + 0.45;
        const x = a[0] + ux * t + nx * off, y = a[1] + uy * t + ny * off;
        if (!inCell(x, y)) continue;
        const ok = countryFree(x, y, angle, m) && villageSlotFree(x, y, angle, m.len + 0.6, m.wid + 0.4);
        yield;
        if (ok) slots.push({ x, y, angle, model: m, v: null, taken: false });
      }
    }
  }
}

// Street clutter (bike racks, lamp posts, bins...) streams in with its own
// cells, so this is checked at spawn and again while the car stands there.
export function propBlocked(x, y, angle, m) {
  const c = Math.cos(angle), s = Math.sin(angle);
  for (const p of propsInRadius(x, y, m.len / 2 + 0.8)) {
    const dx = p.x - x, dy = p.y - y;
    const lx = Math.abs(dx * c + dy * s) - m.len / 2, ly = Math.abs(dy * c - dx * s) - m.wid / 2;
    if (Math.hypot(Math.max(0, lx), Math.max(0, ly)) < (p.r || 0.3) + 0.15) return true;
  }
  return false;
}

function vehicleInTheWay(world, x, y, m) {
  for (const o of world.vehicles) {
    if (Math.abs(o.x - x) < o.halfLen + m.len / 2 + 0.5 && Math.abs(o.y - y) < o.halfLen + m.len / 2 + 0.5 &&
      Math.hypot(o.x - x, o.y - y) < o.halfLen + m.len / 2 + 0.3) return true;
  }
  return false;
}

const gridKey = (x, y) => Math.floor(x / GRID) + ',' + Math.floor(y / GRID);

function gridAdd(st, v) {
  const k = gridKey(v.x, v.y);
  let list = st.grid.get(k);
  if (!list) st.grid.set(k, list = []);
  list.push(v);
  v._gridKey = k;
}

function gridRemove(st, v) {
  const list = st.grid.get(v._gridKey);
  if (list) {
    const i = list.indexOf(v);
    if (i >= 0) list.splice(i, 1);
    if (!list.length) st.grid.delete(v._gridKey);
  }
  v._gridKey = null;
}

function sleepersNear(st, x, y, r, out) {
  const x0 = Math.floor((x - r) / GRID), x1 = Math.floor((x + r) / GRID);
  const y0 = Math.floor((y - r) / GRID), y1 = Math.floor((y + r) / GRID);
  for (let gx = x0; gx <= x1; gx++) {
    for (let gy = y0; gy <= y1; gy++) {
      const list = st.grid.get(gx + ',' + gy);
      if (list) for (const v of list) out.push(v);
    }
  }
  return out;
}

function wake(world, st, v) {
  if (!st.sleeping.delete(v)) return;
  gridRemove(st, v);
  world.vehicles.push(v);
  v._wokeAt = world.time;
  v._quietFor = 0;
}

function putToSleep(world, st, v) {
  const i = world.vehicles.indexOf(v);
  if (i >= 0) world.vehicles.splice(i, 1);
  v.speed = 0; v.driftX = 0; v.driftY = 0; v.yawVel = 0; v.steer = 0; v.horn = false;
  st.sleeping.add(v);
  gridAdd(st, v);
}

function dropCar(world, st, v) {
  st.active.delete(v);
  if (st.sleeping.delete(v)) gridRemove(st, v);
  else {
    const i = world.vehicles.indexOf(v);
    if (i >= 0) world.vehicles.splice(i, 1);
  }
  v.parkSlot.v = null;
}

// For scene3d: the parked cars it should draw as frozen meshes.
export function sleepingParkedCars(world) {
  const st = states.get(world);
  return st ? st.sleeping : EMPTY;
}
const EMPTY = new Set();

const _near = [];

// Every frame (from the collision pass): wake whatever is being touched,
// generate a little of the slot queue, and spawn into free slots.
export function tickParkedCars(world) {
  const st = states.get(world);
  if (!st) return;
  const p = world.player;
  if (st.sleeping.size) {
    const pv = p.inVehicle;
    if (!pv) {
      const input = world.input;
      const aiming = input && input.mouse && (input.mouse.down || input.mouse.rightDown) && world.weapon && world.weapon !== 'fists';
      const r = aiming ? WAKE_AIM_R : WAKE_WALK_R;
      _near.length = 0;
      for (const v of sleepersNear(st, p.x, p.y, r + 3, _near)) {
        if (Math.hypot(v.x - p.x, v.y - p.y) < r + v.halfLen) wake(world, st, v);
      }
    }
    for (const o of world.vehicles) {
      if (o.parked || (Math.abs(o.speed) < 0.2 && !o.driftX && !o.driftY)) continue;
      const reach = o.halfLen + 3;
      _near.length = 0;
      for (const v of sleepersNear(st, o.x, o.y, reach, _near)) {
        if (Math.hypot(v.x - o.x, v.y - o.y) < o.halfLen + v.halfLen + 0.8 + Math.abs(o.speed) * 0.05) wake(world, st, v);
      }
    }
    for (const b of world.bullets || []) {
      _near.length = 0;
      for (const v of sleepersNear(st, b.x, b.y, 4, _near)) wake(world, st, v);
    }
  }

  // woken cars nobody is touching go back to sleep
  for (const v of st.active) {
    if (st.sleeping.has(v) || !v.parked || v.driver || v.damage) continue;
    const still = !v.speed && !v.driftX && !v.driftY && !v.yawVel;
    v._quietFor = still ? (v._quietFor || 0) + (world.time - (v._tickAt ?? world.time)) : 0;
    v._tickAt = world.time;
    if (v._quietFor > SLEEP_AFTER && (p.inVehicle || Math.hypot(v.x - p.x, v.y - p.y) > WAKE_WALK_R + v.halfLen + 2)) putToSleep(world, st, v);
  }

  if (st.gen || st.genQueue.length) {
    const until = performance.now() + GEN_BUDGET_MS;
    while (performance.now() < until) {
      if (!st.gen) {
        const key = st.genQueue.shift();
        if (key === undefined) break;
        if (st.cells.has(key)) continue;
        const [gx, gy] = key.split(',').map(Number);
        st.gen = { key, it: genCell(world, st, gx, gy) };
      }
      const step = st.gen.it.next();
      if (step.done) {
        st.cells.set(st.gen.key, step.value);
        st.gen = null;
        st.dirty = true;
      }
    }
  }
  if (st.dirty) { st.dirty = false; spawnInto(world, st); }
}

function spawnInto(world, st) {
  const p = world.player;
  if (st.active.size >= MAX_ACTIVE) return;
  const cand = [];
  const gx0 = Math.floor((p.x - SPAWN_R) / CELL), gx1 = Math.floor((p.x + SPAWN_R) / CELL);
  const gy0 = Math.floor((p.y - SPAWN_R) / CELL), gy1 = Math.floor((p.y + SPAWN_R) / CELL);
  for (let gx = gx0; gx <= gx1; gx++) {
    for (let gy = gy0; gy <= gy1; gy++) {
      const slots = st.cells.get(gx + ',' + gy);
      if (!slots) continue;
      for (const s of slots) {
        if (s.v || s.taken || s.blocked) continue;
        const d = Math.hypot(s.x - p.x, s.y - p.y);
        if (d < SPAWN_R) cand.push([d, s]);
      }
    }
  }
  if (!cand.length) return;
  cand.sort((a, b) => a[0] - b[0]);
  for (const [, s] of cand) {
    if (st.active.size >= MAX_ACTIVE) break;
    if (propBlocked(s.x, s.y, s.angle, s.model)) { s.blocked = true; continue; }
    if (vehicleInTheWay(world, s.x, s.y, s.model)) continue;
    const v = new Vehicle(s.x, s.y, s.angle, s.model);
    v.parked = true;
    v.parkSlot = s;
    s.v = v;
    st.active.add(v);
    putToSleep(world, st, v);
  }
}

// Every ~1.5 s from manageTrafficPopulation: retire stolen/moved/far cars and
// queue the slot cells around the player (generated by tickParkedCars).
export function manageParkedCars(world) {
  const { player } = world;
  if (!world.map || !world.map.roads) return;
  const st = stateOf(world);
  const inWorld = new Set(world.vehicles);

  for (const v of st.active) {
    const slot = v.parkSlot;
    const asleep = st.sleeping.has(v);
    const gone = !asleep && !inWorld.has(v);
    if (!asleep && (gone || !v.parked || v.wrecked || Math.hypot(v.x - slot.x, v.y - slot.y) > 1.2)) {
      // stolen, shoved out of its spot or blown up: an ordinary car from now on
      st.active.delete(v);
      v.parked = false;
      slot.v = null;
      if (!gone) slot.taken = true;
      continue;
    }
    const blocked = v.health >= 100 && propBlocked(slot.x, slot.y, slot.angle, slot.model);
    if (blocked || Math.hypot(v.x - player.x, v.y - player.y) > DESPAWN_R) {
      dropCar(world, st, v);
      if (blocked) slot.blocked = true;
    }
  }

  const gx0 = Math.floor((player.x - SPAWN_R) / CELL), gx1 = Math.floor((player.x + SPAWN_R) / CELL);
  const gy0 = Math.floor((player.y - SPAWN_R) / CELL), gy1 = Math.floor((player.y + SPAWN_R) / CELL);
  const want = [];
  for (let gx = gx0; gx <= gx1; gx++) {
    for (let gy = gy0; gy <= gy1; gy++) {
      const key = gx + ',' + gy;
      if (!st.cells.has(key) && !(st.gen && st.gen.key === key)) want.push([Math.hypot((gx + 0.5) * CELL - player.x, (gy + 0.5) * CELL - player.y), key]);
    }
  }
  want.sort((a, b) => a[0] - b[0]);
  st.genQueue = want.map((w) => w[1]);
  if (st.cells.size > CACHE_CELLS) {
    for (const [key, slots] of st.cells) {
      if (slots.some((s) => s.v)) continue;
      const [gx, gy] = key.split(',').map(Number);
      if (Math.hypot((gx + 0.5) * CELL - player.x, (gy + 0.5) * CELL - player.y) > DESPAWN_R * 2) st.cells.delete(key);
    }
  }
  st.dirty = true;
}
