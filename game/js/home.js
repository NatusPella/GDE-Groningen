// Thuis: Tammo and Anita's flat in the House of Groningen tower at the
// Pleiadenlaan (Paddepoel), with a private garage in its plinth.
//
// - prepareHomeMap(map) (main.js, right after loadMap): the OSM footprint of
//   the tower includes its parking plinth; that part becomes the garage (our
//   own walls, roof and roller door), the parking aisles inside it are taken
//   off the road network and map.reservedAt keeps parked cars and street
//   clutter out of the garage, the bike rack and the kerb the long vehicles
//   use.
// - Every owned vehicle that is "in de garage" (shops.js entry without a
//   world instance, or an instance marked v.homeStored) is a real parked
//   vehicle while the player is within NEAR_M: cars in the bays (the
//   Escapade has its own), long ones (buses, trucks) at the kerb, bikes and
//   steps in the rack by the lobby, boats on the canal behind the tower.
//   Walk up, E, drive off: it is no longer stored until you leave it in the
//   garage (or rack, kerb, mooring) again. More cars than bays: the panel
//   inside the door shows the next ones. Farther than FAR_M the stored
//   instances are packed away again (their damage stays on the entry).
// - The lobby door (E) takes the lift up to the flat on the 11th floor: the
//   tower is hidden and drawn up to that floor instead, the flat is a cutaway
//   on top (walls down). Bed: sleep until morning (or the evening when the
//   next mission needs the dark) and save; fridge: a fried eierbal (health);
//   wardrobe: the outfits you own. The flat's floor is a surface for
//   map.groundHeightAt, so walking, jumping and the camera work as outside.
// - New game and loading a save start outside the lobby with the garage
//   stocked (savegame.js calls applyHomeOnLoad), unless the save was made
//   mid-mission: then the saved spot is kept. "Naar huis" in the pause menu.

import { pointInPolygon, closestPointOnSegment, isInWater } from './util.js';
import { addStaticCollider } from './breakables.js';
import { getScene, setBuildingHidden } from './scene3d.js';
import { getOwnedEntries, spawnOwnedEntry, wardrobeMenu } from './shops.js';
import { openShopMenu, isShopOpen } from './shopui.js';
import { isCinematicActive } from './cinematics.js';
import { respawnFade } from './respawn.js';
import { saveGame } from './savegame.js';
import { isMissionActive, isNight, getMissionDefs } from './missions.js';
import { refreshDayNight } from './daynight.js';
import { recordStat } from './achievements.js';
import { clearDrunk } from './drunk.js';
import { buildHomeExterior3D, setGarageCutaway, setGarageDoor, disposeHomeExterior, buildLowerTower3D, buildFlat3D } from './home3d.js';

const NEAR_M = 200;
const FAR_M = 260;
const STREAM_IN = 230;
const STREAM_OUT = 290;
const SPAWNS_PER_TICK = 2;
const TICK_S = 0.25;
const GARAGE_H = 3.4;
const DOOR_OPEN_M = 14;
const SHORT_CAR_M = 5.8;
const FLAT_LEVEL = 11;
const LEVEL_HEIGHT = 3.1;
const FLOOR_Y = FLAT_LEVEL * LEVEL_HEIGHT + 0.05;
const FLOOR_TOP = FLOOR_Y + 0.02;
const USE_R = 1.5;
const FRIDGE_COOLDOWN = 45;
const MORNING = 7.5;
const EVENING = 21.4;

// OSM (House of Groningen, way 749915414): the tower and its parking plinth.
const TOWER = [[-1282.3, -1104.7], [-1270.4, -1111.1], [-1264.3, -1114.4], [-1251.2, -1090.3], [-1269.4, -1080.5]];
const PLINTH = [[-1298.4, -1096.1], [-1282.3, -1104.7], [-1269.4, -1080.5], [-1271.3, -1079.5], [-1272.4, -1078.9], [-1270.4, -1072.3], [-1270, -1070.9], [-1289.1, -1065.5]];
// Pleiadenlaan kerb in front of the tower (long vehicles), the canal bank behind it (boats)
const KERB = [[-1273, -1125.5], [-1312, -1105], [-1344, -1088]];
const BANK = [[-1194, -1053], [-1247, -1134]];

const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const len = (v) => Math.hypot(v[0], v[1]);
const unit = (v) => { const l = len(v) || 1; return [v[0] / l, v[1] / l]; };

let world = null;
let home = null;
let tickT = 0;
let page = 0;
let exterior = null;
let inside = null; // { flatMesh, lowerMesh } while upstairs
let busy = false;
let fridgeAt = -Infinity;
let lastInVehicle = null;
let doorOpen = 0;
let cutaway = 0;
let introShown = false;

// --- layout ---------------------------------------------------------------------

function buildLayout() {
  // plinth frame: u along the west wall (A -> K), v across towards the door
  const A = PLINTH[0];
  const U = unit(sub(PLINTH[7], A));
  const V = [U[1], -U[0]];
  const pw = (u, v) => [A[0] + U[0] * u + V[0] * v, A[1] + U[1] * u + V[1] * v];
  const angV = Math.atan2(V[1], V[0]);
  const bays = [];
  // west row nose to the aisle, the last one (opposite the door) is the Escapade's
  for (let k = 0; k <= 10; k++) {
    const [x, y] = pw(2.0 + 2.8 * k, 3.15);
    bays.push({ id: 'w' + k, x, y, angle: angV, w: 2.8, d: 5.5, hero: k === 10 });
  }
  for (let k = 0; k <= 7; k++) {
    const [x, y] = pw(2.0 + 2.8 * k, 15.35);
    bays.push({ id: 'e' + k, x, y, angle: angV + Math.PI, w: 2.8, d: 5.5 });
  }
  // walls round the plinth (the tower wall is the tower itself), a gap for the door in H -> I
  const P = PLINTH;
  const H = P[4], I = P[5];
  const HI = unit(sub(I, H));
  const hi = len(sub(I, H));
  const d0 = [H[0] + HI[0] * 0.8, H[1] + HI[1] * 0.8], d1 = [H[0] + HI[0] * (hi - 0.8), H[1] + HI[1] * (hi - 0.8)];
  const walls = [];
  const edge = (a, b) => walls.push([a[0], a[1], b[0], b[1]]);
  edge(P[0], P[1]);
  edge(P[1], P[2]);
  edge(P[2], P[3]); edge(P[3], P[4]);
  edge(H, d0); edge(d1, I);
  edge(P[5], P[6]); edge(P[6], P[7]); edge(P[7], P[0]);
  const door = { x1: d0[0], y1: d0[1], x2: d1[0], y2: d1[1], cx: (d0[0] + d1[0]) / 2, cy: (d0[1] + d1[1]) / 2, nx: V[0], ny: V[1] };
  const [px, py] = pw(31.75, 15.5);
  const panel = { x: px, y: py, angle: Math.atan2(-U[1], -U[0]) };
  const lamps = [];
  for (let u = 4; u < 31; u += 6) { const [x, y] = pw(u, 9.2); lamps.push({ x, y, angle: Math.atan2(U[1], U[0]) }); }

  // tower frame: X along the lobby facade (B -> D), Y inward
  const B = TOWER[0], D = TOWER[2], E = TOWER[3];
  const X = unit(sub(D, B)), Y = unit(sub(E, D));
  const tw = len(sub(D, B)), td = len(sub(E, D));
  const tp = (x, y) => [B[0] + X[0] * x + Y[0] * y, B[1] + X[1] * x + Y[1] * y];
  const out = [-Y[0], -Y[1]];
  const outAng = Math.atan2(out[1], out[0]);
  const [lx, ly] = tp(tw / 2, 0);
  const lobby = { x: lx, y: ly, angle: outAng, use: tp(tw / 2, -1.3), spawn: tp(tw / 2, -2.2) };
  const rack = { slots: [], rails: [] };
  for (const [a, b] of [[2.0, 8.0], [tw / 2 + 2.2, tw / 2 + 8.2]]) {
    const r0 = tp(a - 0.4, -0.35), r1 = tp(b + 0.4, -0.35);
    rack.rails.push({ x1: r0[0], y1: r0[1], x2: r1[0], y2: r1[1] });
    for (let t = a; t <= b + 0.01; t += 1.0) rack.slots.push({ id: 'r' + rack.slots.length, t, at: (l) => tp(t, -0.45 - l / 2), angle: outAng });
  }

  // the flat: 11 x 9 m in the corner of the 11th floor behind the lobby facade
  const W = 11, Dd = 9;
  const flat = {
    ox: B[0], oy: B[1], angle: Math.atan2(X[1], X[0]), floorY: FLOOR_Y, w: W, d: Dd, X, Y,
    tower: { w: tw, d: td },
    rooms: [
      { name: 'woonkamer', x0: 0, x1: 6.8, z0: 0, z1: 5.2, floor: 'laminate' },
      { name: 'keuken', x0: 6.8, x1: W, z0: 0, z1: 5.2, floor: 'tiles' },
      { name: 'slaapkamer', x0: 0, x1: 5.6, z0: 5.2, z1: Dd, floor: 'carpet' },
      { name: 'gang', x0: 5.6, x1: W, z0: 5.2, z1: Dd, floor: 'tiles' },
    ],
    // cutaway walls [x1, z1, x2, z2]: outer walls, living room | bedroom with a doorway, bedroom | hall
    walls: [
      [0, 0, 0, Dd], [W, 0, W, Dd], [0, Dd, W, Dd],
      [0, 5.2, 3.9, 5.2], [4.9, 5.2, 5.6, 5.2],
      [5.6, 5.2, 5.6, 6.3], [5.6, 7.3, 5.6, Dd],
      [8.6, 5.2, W, 5.2],
    ],
    spots: {
      sofa: { x: 3.2, z: 3.9 }, tv: { x: 3.2, z: 1.0 }, table: { x: 8.2, z: 3.4 },
      counter: { x: 9.0, z: 0.55, w: 3.6 }, fryer: { x: 8.4, z: 0.55 }, fridge: { x: 10.5, z: 1.6 },
      bed: { x: 2.4, z: 7.6 }, wardrobe: { x: 4.4, z: 8.6 }, door: { x: 9.2, z: Dd - 0.05 },
      companion: { x: 2.4, z: 3.6 },
    },
  };
  // furniture as solid boxes for walking [x0, z0, x1, z1]
  flat.solids = [
    [1.9, 3.35, 4.5, 4.55], [2.5, 2.1, 3.9, 2.9], [2.3, 0.6, 4.1, 1.35], [0.3, 0.3, 0.9, 0.9],
    [7.1, 0.2, 10.9, 0.9], [10.1, 1.2, 10.9, 2.0], [7.6, 2.9, 8.8, 3.9],
    [1.5, 6.5, 3.3, 8.7], [3.55, 8.25, 5.25, 8.95],
  ];
  const fl = (x, z) => [B[0] + X[0] * x + Y[0] * z, B[1] + X[1] * x + Y[1] * z];
  const spot = (s, face) => { const [x, y] = fl(s.x, s.z); return { x, y, lx: s.x, lz: s.z, face }; };
  flat.use = {
    bed: spot({ x: 3.6, z: 7.4 }), wardrobe: spot({ x: 4.4, z: 7.8 }), fridge: spot({ x: 9.9, z: 1.9 }),
    fryer: spot({ x: 8.4, z: 1.4 }), door: spot({ x: 9.2, z: 8.3 }),
  };
  flat.entry = fl(9.2, 8.2);
  flat.fl = fl;

  const court = polyline(KERB);
  const bank = polyline(BANK);
  const cx = PLINTH.reduce((s, p) => s + p[0], 0) / PLINTH.length, cy = PLINTH.reduce((s, p) => s + p[1], 0) / PLINTH.length;
  return {
    center: { x: cx, y: cy }, icon: { x: lobby.use[0], y: lobby.use[1] },
    garage: { poly: PLINTH, walls, bays, door, panel, lamps, height: GARAGE_H, V, U, pw },
    tower: { pts: TOWER, X, Y, w: tw, d: td }, lobby, rack, flat, court, bank,
  };
}

function polyline(pts) {
  const segs = [];
  let acc = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const l = len(sub(pts[i + 1], pts[i]));
    segs.push({ a: pts[i], b: pts[i + 1], t0: acc, l, dir: unit(sub(pts[i + 1], pts[i])) });
    acc += l;
  }
  return { segs, total: acc, at(t) {
    const s = segs.find((q) => t <= q.t0 + q.l) || segs[segs.length - 1];
    const k = Math.max(0, Math.min(s.l, t - s.t0));
    return { x: s.a[0] + s.dir[0] * k, y: s.a[1] + s.dir[1] * k, dir: s.dir };
  } };
}

// --- map --------------------------------------------------------------------------

function inPoly(poly, x, y, pad = 0) {
  if (pointInPolygon(x, y, poly)) return true;
  if (!pad) return false;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    if (closestPointOnSegment(x, y, a[0], a[1], b[0], b[1]).dist2 < pad * pad) return true;
  }
  return false;
}

function regrid(grid, item, bounds) {
  for (const arr of grid.map.values()) {
    const i = arr.indexOf(item);
    if (i >= 0) arr.splice(i, 1);
  }
  if (bounds) grid.insert(item, bounds);
}

const boundsOf = (pts) => {
  let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity;
  for (const [x, y] of pts) { a = Math.min(a, x); b = Math.min(b, y); c = Math.max(c, x); d = Math.max(d, y); }
  return [a, b, c, d];
};

export function prepareHomeMap(map) {
  home = buildLayout();
  // the OSM footprint (tower + plinth) becomes the tower only
  const c = home.center;
  const t = map.buildingsNear(-1268, -1096, 20).find((b) => pointInPolygon(-1268, -1096, b.pts) && b.h >= 12);
  if (t) {
    t.pts = TOWER.map((p) => [...p]);
    t.bounds = boundsOf(t.pts);
    t._geo3dParts = null;
    t._ring = null;
    regrid(map.buildingGrid, t, t.bounds);
    home.towerBuilding = t;
  }
  // the parking aisles and the deck ramp inside the plinth are ours now
  for (const r of map.roadsNear(c.x, c.y, 40).slice()) {
    if (!r.pts.every(([x, y]) => inPoly(PLINTH, x, y, 1.2))) continue;
    const i = map.roads.indexOf(r);
    if (i >= 0) map.roads.splice(i, 1);
    regrid(map.roadGrid, r, null);
  }
  const lob = home.lobby, T = home.tower;
  const rackZone = [0, 1, 2, 3].map((k) => {
    const x = [0.5, T.w - 0.5][k === 1 || k === 2 ? 1 : 0], y = k < 2 ? -3.2 : 0.2;
    return [TOWER[0][0] + T.X[0] * x + T.Y[0] * y, TOWER[0][1] + T.X[1] * x + T.Y[1] * y];
  });
  const kerbZone = (p) => {
    const out = [];
    for (let i = 0; i < p.segs.length; i++) {
      const s = p.segs[i];
      const n = [s.dir[1], -s.dir[0]];
      out.push({ a: s.a, b: s.b, n });
    }
    return out;
  };
  const kz = kerbZone(home.court);
  const prev = map.reservedAt;
  map.reservedAt = (x, y) => {
    if (prev && prev(x, y)) return true;
    if (Math.abs(x - c.x) > 120 || Math.abs(y - c.y) > 120) return false;
    if (inPoly(PLINTH, x, y, 1.5) || pointInPolygon(x, y, rackZone)) return true;
    for (const s of kz) if (closestPointOnSegment(x, y, s.a[0], s.a[1], s.b[0], s.b[1]).dist2 < 64) return true;
    return Math.hypot(x - lob.x, y - lob.y) < 3.5;
  };
  // the flat's floor is a surface, for the player (and anything up there)
  const ground = map.groundHeightAt.bind(map);
  map.groundHeightAt = (x, y, z = 0) => (z > FLOOR_TOP - 3 && z < FLOOR_TOP + 6 && inside && pointInPolygon(x, y, TOWER) ? FLOOR_TOP : ground(x, y, z));
}

export function getHome() {
  return home;
}

// For the map, minimap and search.
export function getHomeForRender() {
  return home ? [{ x: home.icon.x, y: home.icon.y, name: 'Thuis', sub: 'Garage, bed, koelkast en kledingkast' }] : [];
}

// The private garage's own map icon, at its roller door.
export function getHomeGarageForRender() {
  if (!home) return [];
  const d = home.garage.door;
  return [{ x: d.cx + d.nx * 2, y: d.cy + d.ny * 2, name: 'Jouw garage', sub: 'Al je voertuigen staan hier klaar' }];
}

// Start and target points for spotcheck.js: the lobby, the garage door, the
// Escapade's bay and the first mooring.
export function getHomeSpots(w) {
  if (!home) return [];
  const d = home.garage.door;
  const hero = home.garage.bays.find((b) => b.hero);
  const out = [
    { name: 'lobby', x: home.lobby.spawn[0], y: home.lobby.spawn[1], mode: 'walk' },
    { name: 'garagedeur', x: d.cx + d.nx * 3, y: d.cy + d.ny * 3, mode: 'drive' },
    { name: 'Escapade-plek', x: hero.x, y: hero.y, mode: 'drive' },
  ];
  const side = bankSide(w);
  const p = home.bank.at(40);
  out.push({ name: 'steiger', x: p.x + p.dir[1] * side * 2, y: p.y - p.dir[0] * side * 2, mode: 'boat' });
  return out;
}

export function isInsideHome() {
  return !!inside;
}

// --- init ----------------------------------------------------------------------

export function initHome(w) {
  world = w;
  if (!home) return;
  // walls: short collider pieces (props are looked up by their centre)
  for (const [x1, y1, x2, y2] of home.garage.walls) {
    const l = Math.hypot(x2 - x1, y2 - y1);
    const n = Math.max(1, Math.ceil(l / 3));
    const a = Math.atan2(y2 - y1, x2 - x1);
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      addStaticCollider('garagewall', x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, 0.18, l / n / 2, a);
    }
  }
  for (const r of home.rack.rails) addStaticCollider('rail', (r.x1 + r.x2) / 2, (r.y1 + r.y2) / 2, 0.06, Math.hypot(r.x2 - r.x1, r.y2 - r.y1) / 2, Math.atan2(r.y2 - r.y1, r.x2 - r.x1));
  w.homeActions = { goHome: () => goHome(w), canGoHome: () => canGoHome(w) === '' };
  window.__home = { home, goHome: () => goHome(w), enter: () => enterFlat(w), leave: () => leaveFlat(w), stockNow: () => stockNow(w), state: homeDebug, nextPage: () => nextPage(w) };
}

// New game: start outside the lobby, the Escapade in its bay.
export function homeSpawnPoint() {
  const s = home ? home.lobby.spawn : [0, 0];
  return { x: s[0], y: s[1], angle: home ? home.lobby.angle : 0 };
}

export function parkHeroAtHome(w) {
  const hero = w.vehicles.find((v) => v.isHeroCar && !v.wrecked);
  const bay = home && home.garage.bays.find((b) => b.hero);
  if (!hero || !bay || hero.driver === 'player') return;
  park(w, hero, bay.x, bay.y, bay.angle);
  hero.homeStored = true;
  hero.homeSlot = bay.id;
}

function park(w, v, x, y, angle) {
  v.x = x; v.y = y; v.angle = angle;
  v.speed = 0; v.throttle = 0; v.steer = 0; v.driftX = 0; v.driftY = 0; v.yawVel = 0;
  v.road = null; v.parked = false; v.driver = null; v.horn = false;
  if (!v.isBoat) v.z = 0;
  if (!w.vehicles.includes(v)) w.vehicles.push(v);
}

// --- vehicles --------------------------------------------------------------------

const lenOf = (spec) => (spec.model && spec.model.len) || 4;
const kindOf = (spec) => (spec.kind === 'boat' ? 'boat' : spec.kind === 'car' ? (lenOf(spec) > SHORT_CAR_M ? 'long' : 'car') : 'bike');

function stash(w, o) {
  const v = o.v;
  if (!v || v.driver === 'player') return;
  if ((v.health ?? 100) < 100) o.health = v.health;
  if (v.dentLog && v.dentLog.length) o.dents = v.dentLog.slice(0, 12);
  o.upgrades = [...(v.upgrades || o.upgrades || [])];
  const i = w.vehicles.indexOf(v);
  if (i >= 0) w.vehicles.splice(i, 1);
  o.v = null;
}

function occupied(w, x, y, r, ignore) {
  for (const v of w.vehicles) {
    if (v === ignore || v.wrecked) continue;
    if (Math.abs(v.x - x) > r + 6 || Math.abs(v.y - y) > r + 6) continue;
    if (Math.hypot(v.x - x, v.y - y) < r) return true;
  }
  return false;
}

// Stored entries in a fixed order, cars paged over the bays.
function storedEntries() {
  const out = { car: [], long: [], bike: [], boat: [] };
  for (const o of getOwnedEntries()) {
    if (o.lost) continue;
    const v = o.v;
    if (v && !v.homeStored) continue;
    out[kindOf(o.spec)].push(o);
  }
  return out;
}

function carBays() {
  return home.garage.bays.filter((b) => !b.hero);
}

function pageCount(n) {
  return Math.max(1, Math.ceil(n / carBays().length));
}

// Slots for the long vehicles and boats: laid out one after another.
function lineSlots(list, line, offset, from, to) {
  const out = new Map();
  let t = from;
  for (const o of list) {
    const l = lenOf(o.spec);
    if (t + l > to) break;
    const p = line.at(t + l / 2);
    const n = offset(o.spec);
    const nx = p.dir[1] * n.side, ny = -p.dir[0] * n.side;
    out.set(o, { x: p.x + nx * n.d, y: p.y + ny * n.d, angle: Math.atan2(p.dir[1], p.dir[0]) + (n.flip ? Math.PI : 0) });
    t += l + 1.4;
  }
  return out;
}

function bankSide(w) {
  if (home._bankSide) return home._bankSide;
  const p = home.bank.at(home.bank.total / 2);
  home._bankSide = isInWater(w.map, p.x + p.dir[1] * 3, p.y - p.dir[0] * 3) ? 1 : -1;
  return home._bankSide;
}

function wantedSlots(w, stored) {
  const want = new Map();
  const bays = carBays();
  const pages = pageCount(stored.car.length);
  page = ((page % pages) + pages) % pages;
  stored.car.slice(page * bays.length, (page + 1) * bays.length).forEach((o, i) => { const b = bays[i]; want.set(o, { x: b.x, y: b.y, angle: b.angle, id: b.id }); });
  const court = lineSlots(stored.long, home.court, (sp) => ({ side: 1, d: 4.5 + sp.model.wid / 2 + 0.5 }), 24, home.court.total - 2);
  for (const [o, s] of court) want.set(o, { ...s, id: 'k-' + o.key });
  const side = bankSide(w);
  const boats = lineSlots(stored.boat, home.bank, (sp) => ({ side, d: sp.model.wid / 2 + 1.1 }), 30, home.bank.total - 8);
  for (const [o, s] of boats) want.set(o, { ...s, id: 'b-' + o.key });
  home.rack.slots.forEach((r, i) => {
    const o = stored.bike[i];
    if (!o) return;
    const [x, y] = r.at(lenOf(o.spec));
    want.set(o, { x, y, angle: r.angle, id: r.id });
  });
  return want;
}

function near(w, r) {
  const p = w.player;
  return Math.hypot(p.x - home.center.x, p.y - home.center.y) < r;
}

// Is the (still) vehicle where a stored one of its kind belongs?
function inStoreZone(w, v, spec) {
  const k = spec ? kindOf(spec) : 'car';
  if (v.isBoat) {
    const p = closestOnLine(home.bank, v.x, v.y);
    return p < 12;
  }
  if (inPoly(PLINTH, v.x, v.y)) return true;
  if (k === 'long') return closestOnLine(home.court, v.x, v.y) < 6;
  if (k === 'bike') return home.rack.slots.some((s) => { const [x, y] = s.at(1.8); return Math.hypot(v.x - x, v.y - y) < 2.4; });
  return false;
}

function closestOnLine(line, x, y) {
  let best = Infinity;
  for (const s of line.segs) best = Math.min(best, Math.sqrt(closestPointOnSegment(x, y, s.a[0], s.a[1], s.b[0], s.b[1]).dist2));
  return best;
}

function updateVehicles(w) {
  const p = w.player;
  const pv = p.inVehicle;
  const entries = getOwnedEntries();
  const specOf = new Map(entries.filter((o) => o.v).map((o) => [o.v, o.spec]));
  const hero = w.vehicles.find((v) => v.isHeroCar && !v.wrecked);
  // just got out of an own vehicle: stored if it stands where it belongs
  if (lastInVehicle && lastInVehicle !== pv) {
    const v = lastInVehicle;
    const own = v === hero || specOf.has(v);
    if (own && !v.wrecked && w.vehicles.includes(v) && inStoreZone(w, v, specOf.get(v))) {
      v.homeStored = true;
      v.homeSlot = null;
      v._homeX = v.x; v._homeY = v.y;
      const name = v === hero ? 'Escapade' : specOf.get(v).label;
      w.addMessage(v.isBoat ? `${name} ligt weer thuis aan de steiger` : `${name} staat weer thuis`, 3, { kind: 'tip' });
    }
  }
  lastInVehicle = pv;
  // stored ones that were driven, towed or delivered away are out again
  for (const v of [hero, ...entries.map((o) => o.v)]) {
    if (!v || !v.homeStored) continue;
    // (police-flagged ones are swept from world.vehicles now and then; shops.js puts them back)
    if (v === pv) { v.homeStored = false; v.homeSlot = null; continue; }
    if (!w.vehicles.includes(v)) continue;
    if (Math.abs(v.speed || 0) < 0.3 && !inStoreZone(w, v, specOf.get(v)) && Math.hypot(v.x - (v._homeX ?? v.x), v.y - (v._homeY ?? v.y)) > 3) { v.homeStored = false; v.homeSlot = null; }
  }
  const isNear = near(w, NEAR_M);
  const isFar = !near(w, FAR_M);
  const stored = storedEntries();
  if (isFar) {
    for (const o of entries) if (o.v && o.v.homeStored && o.v !== pv) stash(w, o);
    return;
  }
  if (!isNear) return;
  const want = wantedSlots(w, stored);
  // the other page's cars go back behind the panel
  for (const o of stored.car) if (o.v && o.v.homeSlot && !want.has(o)) stash(w, o);
  let n = 0;
  for (const [o, s] of want) {
    if (o.v || n >= SPAWNS_PER_TICK) continue;
    if (occupied(w, s.x, s.y, o.spec.kind === 'car' ? 1.3 : o.spec.kind === 'boat' ? 2 : 0.45)) continue;
    const v = spawnOwnedEntry(w, o, s.x, s.y, s.angle);
    if (!v) continue;
    v.x = s.x; v.y = s.y; v.angle = s.angle; v.speed = 0; v.road = null;
    v.homeStored = true;
    v.homeSlot = s.id;
    v._homeX = s.x; v._homeY = s.y;
    n++;
  }
  for (const v of w.vehicles) if (v.homeStored && v._homeX === undefined) { v._homeX = v.x; v._homeY = v.y; }
}

function nextPage(w) {
  const stored = storedEntries();
  const pages = pageCount(stored.car.length);
  if (pages <= 1) return false;
  page = (page + 1) % pages;
  for (const o of stored.car) if (o.v && o.v.homeSlot) stash(w, o);
  tickT = 0;
  return true;
}

// Loading a save / "Naar huis": everything that isn't lost is home again.
function stockNow(w) {
  for (const o of getOwnedEntries()) if (o.v && !o.lost) stash(w, o);
  page = 0;
  parkHeroAtHome(w);
  tickT = 0;
}

// --- flat --------------------------------------------------------------------------

function toFlat(x, y) {
  const f = home.flat;
  const dx = x - f.ox, dy = y - f.oy;
  return { lx: dx * f.X[0] + dy * f.X[1], lz: dx * f.Y[0] + dy * f.Y[1] };
}

function clampToFlat(p) {
  const f = home.flat;
  const r = 0.32;
  let { lx, lz } = toFlat(p.x, p.y);
  lx = Math.max(r + 0.1, Math.min(f.w - r - 0.1, lx));
  lz = Math.max(r + 0.2, Math.min(f.d - r - 0.1, lz));
  for (const [x1, z1, x2, z2] of f.walls) {
    const c = closestPointOnSegment(lx, lz, x1, z1, x2, z2);
    if (c.dist2 >= (r + 0.07) ** 2) continue;
    const d = Math.sqrt(c.dist2) || 1e-4;
    const k = (r + 0.07 - d) / d;
    lx += (lx - c.x) * k; lz += (lz - c.y) * k;
  }
  for (const [x0, z0, x1, z1] of f.solids) {
    const cx = Math.max(x0, Math.min(x1, lx)), cz = Math.max(z0, Math.min(z1, lz));
    const dx = lx - cx, dz = lz - cz;
    const d = Math.hypot(dx, dz);
    if (d >= r) continue;
    if (d < 1e-4) {
      const opts = [[lx - x0, -1, 0], [x1 - lx, 1, 0], [lz - z0, 0, -1], [z1 - lz, 0, 1]].sort((a, b) => a[0] - b[0])[0];
      lx += opts[1] * (opts[0] + r); lz += opts[2] * (opts[0] + r);
    } else { lx += dx / d * (r - d); lz += dz / d * (r - d); }
  }
  const [x, y] = f.fl(lx, lz);
  p.x = x; p.y = y;
}

function canEnter(w) {
  const p = w.player;
  if (p.inVehicle || p.swimming) return 'Eerst uitstappen';
  if (w.wanted > 0) return 'Met de politie op je hielen ga je niet naar huis. Eerst ze kwijt!';
  if (isMissionActive() || (w.sideJob && w.sideJob.active) || w.challenge) return 'Eerst je klus afmaken';
  if (w.pigeonMode || w.heliRun) return 'Nu even niet';
  return '';
}

function fadeThen(fn, hold = 380) {
  if (busy) return false;
  busy = true;
  respawnFade(1, 320);
  setTimeout(() => {
    try { fn(); } catch (e) { console.error('home', e); }
    setTimeout(() => { respawnFade(0, 420); busy = false; }, 120);
  }, hold);
  return true;
}

function enterFlat(w) {
  if (inside || !home) return false;
  return fadeThen(() => {
    const scene = getScene();
    const f = home.flat;
    inside = { flatMesh: buildFlat3D(f), lowerMesh: home.towerBuilding ? buildLowerTower3D(home.towerBuilding, FLAT_LEVEL - 1) : null };
    if (scene) {
      scene.add(inside.flatMesh);
      if (inside.lowerMesh) scene.add(inside.lowerMesh);
    }
    if (home.towerBuilding) setBuildingHidden(home.towerBuilding, true);
    const p = w.player;
    p.x = f.entry[0]; p.y = f.entry[1];
    p.vx = 0; p.vy = 0; p.z = 0; p.vz = 0;
    p.gz = FLOOR_TOP;
    p.angle = Math.atan2(-f.Y[1], -f.Y[0]);
    w.camYaw = p.angle;
    placeCompanion(w);
    if (!introShown) {
      introShown = true;
      w.addMessage('Thuis! Bed: slapen en opslaan. Koelkast: eierbal. Kast: je kleren', 6, { kind: 'tip' });
    }
  });
}

function leaveFlat(w, after = null) {
  if (!inside) return false;
  return fadeThen(() => {
    exitFlatNow(w);
    placeAtLobby(w);
    if (after) after();
  });
}

function exitFlatNow(w) {
  if (!inside) return;
  const scene = getScene();
  if (scene) {
    scene.remove(inside.flatMesh);
    if (inside.lowerMesh) scene.remove(inside.lowerMesh);
  }
  disposeHomeExterior(inside.flatMesh);
  inside = null;
  if (home.towerBuilding) setBuildingHidden(home.towerBuilding, false);
}

function placeAtLobby(w) {
  const p = w.player;
  const [x, y] = home.lobby.spawn;
  p.x = x; p.y = y; p.vx = 0; p.vy = 0; p.z = 0; p.vz = 0; p.gz = 0;
  p.angle = home.lobby.angle;
  w.camYaw = p.angle;
  const c = w.companion;
  if (c && !c.inVehicle && c.state !== 'dead') {
    c.x = x + Math.cos(p.angle + Math.PI / 2) * 1.1; c.y = y + Math.sin(p.angle + Math.PI / 2) * 1.1;
    c.vx = 0; c.vy = 0; c.gz = 0;
  }
}

function placeCompanion(w) {
  const c = w.companion;
  if (!c || c.inVehicle || c.state === 'dead') return;
  const s = home.flat.spots.companion;
  const [x, y] = home.flat.fl(s.x, s.z);
  c.x = x; c.y = y; c.vx = 0; c.vy = 0; c.gz = FLOOR_TOP;
  c.angle = Math.atan2(-home.flat.Y[1], -home.flat.Y[0]);
}

function sleep(w) {
  return fadeThen(() => {
    const m = w.mission;
    const def = m && m.phase === 'idle' ? getMissionDefs()[m.index] : null;
    const needNight = !!def && [].concat(def.requires || []).includes('night');
    const hour = ((w.clock % 24) + 24) % 24;
    w.clock = needNight && !isNight(w) ? EVENING : MORNING;
    refreshDayNight(w);
    w.health = 100;
    clearDrunk(w);
    recordStat(w, 'slept');
    saveGame(w, { toast: true });
    w.addMessage(needNight && !isNight(w) ? 'Uitgeslapen tot de avond. Tijd voor actie' : hour > MORNING && hour < 20 ? 'Middagdutje tot de volgende ochtend. Goeiemorgen, Grunn!' : 'Goeiemorgen, Grunn! Uitgeslapen en opgeslagen', 4, { kind: 'tip' });
  }, 900);
}

function eatEierbal(w) {
  if (w.time - fridgeAt < FRIDGE_COOLDOWN) { w.addMessage('Nog vol van de vorige eierbal. Even laten zakken', 3); return; }
  fridgeAt = w.time;
  w.health = 100;
  w.addMessage('Eierbal uit de vriezer, drie minuten in de frituur: helemaal opgeladen', 3.5, { kind: 'tip' });
}

// --- "Naar huis" ---------------------------------------------------------------

function canGoHome(w) {
  if (!home || w.pendingRespawn || isCinematicActive()) return 'Nu even niet';
  if (w.player.inVehicle && w.player.inVehicle.isBoat) return 'Eerst van het water af';
  return canEnter({ ...w, player: { ...w.player, inVehicle: null, swimming: false } });
}

function goHome(w) {
  const why = canGoHome(w);
  if (why) { w.addMessage(why, 3); return false; }
  if (near(w, 25) && !inside) return true;
  return fadeThen(() => {
    const p = w.player;
    if (p.inVehicle) {
      const v = p.inVehicle;
      v.driver = null; v.speed = 0;
      p.inVehicle = null;
    }
    const c = w.companion;
    if (c && c.inVehicle) { c.inVehicle.passenger = null; c.inVehicle = null; }
    exitFlatNow(w);
    stockNow(w);
    placeAtLobby(w);
  }, 450);
}

// Called by savegame.js after a save is applied.
export function applyHomeOnLoad(w, d) {
  if (!home) return;
  exitFlatNow(w);
  const busySave = d && d.ctx === 'busy';
  if (busySave) return;
  stockNow(w);
  placeAtLobby(w);
}

export function homeSaveContext(w) {
  if (isMissionActive() || (w.sideJob && w.sideJob.active) || w.challenge) return 'busy';
  return near(w, 40) ? 'home' : 'free';
}

// --- prompts and E --------------------------------------------------------------

function flatUse(w) {
  const p = w.player;
  let best = null, bd = USE_R;
  for (const [k, s] of Object.entries(home.flat.use)) {
    const d = Math.hypot(s.x - p.x, s.y - p.y);
    if (d < bd) { bd = d; best = { k, s }; }
  }
  return best;
}

const FLAT_PROMPTS = {
  bed: ['Slapen', 'Tot de ochtend, en het spel wordt opgeslagen'],
  wardrobe: ['Kledingkast', 'Trek iets anders aan'],
  fridge: ['Eierbal pakken', 'Uit de vriezer, even door de frituur: gezondheid vol'],
  fryer: ['Eierbal pakken', 'De frituurpan staat al warm'],
  door: ['Met de lift naar beneden', 'Naar de straat en de garage'],
};

export function homePrompt(w) {
  if (!home || busy) return null;
  const p = w.player;
  if (p.inVehicle) return null;
  if (inside) {
    const u = flatUse(w);
    if (!u) return null;
    const [label, sub] = FLAT_PROMPTS[u.k];
    return { id: 'home-' + u.k, x: u.s.x, y: u.s.y, h: FLOOR_TOP + 1.3, key: 'E', label, sub, ring: true };
  }
  const L = home.lobby;
  if (Math.hypot(p.x - L.use[0], p.y - L.use[1]) < 1.8) {
    const why = canEnter(w);
    return { id: 'home-lobby', x: L.x, y: L.y, h: 2.4, key: 'E', label: 'Naar binnen', sub: why || 'Met de lift naar jullie flat', ring: true, dim: !!why };
  }
  const pn = home.garage.panel;
  if (Math.hypot(p.x - pn.x, p.y - pn.y) < 1.6) {
    const pages = pageCount(storedEntries().car.length);
    return { id: 'home-panel', x: pn.x, y: pn.y, h: 1.9, key: 'E', label: 'Volgende voertuigen', sub: pages > 1 ? `Rij ${page + 1} van ${pages}` : 'Alle auto\'s staan er al', ring: true, dim: pages <= 1 };
  }
  return null;
}

export function homeSecondary(w) {
  if (!home || inside || w.player.inVehicle) return [];
  const p = w.player;
  const d = home.garage.door;
  if (Math.abs(d.cx - p.x) > 30 || Math.abs(d.cy - p.y) > 30) return [];
  return [{ id: 'home-garage', x: d.cx, y: d.cy, h: 4.2, label: 'Jullie garage', sub: 'Loop naar een voertuig en druk E', kind: 'place' }];
}

export function tryHomeInteract(w) {
  const input = w.input;
  if (!home || !input || busy || isShopOpen() || isCinematicActive()) return false;
  if (!(input.wasPressed('e') || input.wasPressed('f'))) return false;
  const pr = homePrompt(w);
  if (!pr) return false;
  input.consume('e');
  input.consume('f');
  if (pr.id === 'home-lobby') {
    const why = canEnter(w);
    if (why) { w.addMessage(why, 3); return true; }
    enterFlat(w);
  } else if (pr.id === 'home-panel') {
    if (!nextPage(w)) w.addMessage('Alle auto\'s staan er al', 2.5);
    else w.addMessage('De parkeerlift draait: de volgende rij staat klaar', 3, { kind: 'tip' });
  } else if (pr.id === 'home-bed') sleep(w);
  else if (pr.id === 'home-wardrobe') openShopMenu(w, wardrobeMenu(w));
  else if (pr.id === 'home-fridge' || pr.id === 'home-fryer') eatEierbal(w);
  else if (pr.id === 'home-door') leaveFlat(w);
  return true;
}

// --- frame -------------------------------------------------------------------------

function streamExterior(w, dt) {
  const scene = getScene();
  if (!scene) return;
  const p = w.player;
  const d = Math.hypot(p.x - home.center.x, p.y - home.center.y);
  if (!exterior && d < STREAM_IN) {
    exterior = buildHomeExterior3D(home);
    scene.add(exterior);
  } else if (exterior && d > STREAM_OUT) {
    scene.remove(exterior);
    disposeHomeExterior(exterior);
    exterior = null;
  }
  if (!exterior) return;
  const who = p.inVehicle || p;
  const dd = home.garage.door;
  const want = Math.hypot(who.x - dd.cx, who.y - dd.cy) < DOOR_OPEN_M || inPoly(PLINTH, who.x, who.y) ? 1 : 0;
  doorOpen += Math.max(-dt * 0.8, Math.min(dt * 0.8, want - doorOpen));
  setGarageDoor(exterior, doorOpen, GARAGE_H);
  const cut = !inside && inPoly(PLINTH, who.x, who.y, 0.6) ? 1 : 0;
  cutaway += Math.max(-dt * 3, Math.min(dt * 3, cut - cutaway));
  setGarageCutaway(exterior, cutaway);
}

// true while the player is upstairs in the flat (player.js skips building collision)
export function inHomeFlat() {
  return !!inside;
}

export function updateHome(dt, w) {
  world = w;
  if (!home) return;
  streamExterior(w, dt);
  if (inside) {
    const p = w.player;
    if (p.inVehicle || w.pendingRespawn || w.pigeonMode) exitFlatNow(w);
    else {
      clampToFlat(p);
      if (p.z < 0.01) p.gz = FLOOR_TOP;
      placeCompanion(w);
    }
  }
  tickT -= dt;
  if (tickT > 0) return;
  tickT = TICK_S;
  updateVehicles(w);
}

function homeDebug() {
  const st = storedEntries();
  return {
    inside: !!inside, page, pages: pageCount(st.car.length),
    stored: Object.fromEntries(Object.entries(st).map(([k, l]) => [k, l.map((o) => o.key + (o.v ? '@' + (o.v.homeSlot || 'free') : ''))])),
    heroStored: !!(world && world.vehicles.find((v) => v.isHeroCar && v.homeStored)),
  };
}
