// Thuis: Tammo and Tessa's flat in the House of Groningen tower at the
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
//   steps in the rack along the lobby facade, boats on the canal behind the tower.
//   Walk up, E, drive off: it is no longer stored until you leave it in the
//   garage (or rack, kerb, mooring) again. The helicopter (heliflight.js)
//   has the helidek on the tower's roof: "Trap naar het dak" in the flat's
//   hall puts you in its seat, landing on the deck and E parks it there and
//   takes the lift down to the flat. More cars than bays (18): the rest
//   wait in the parking lift; the panel inside the door ("Kies welke auto's in de garage staan") swaps one in, and the Garage menu says where each one stands (homeWhereLabel). Farther than FAR_M the stored
//   instances are packed away again (their damage stays on the entry).
// - The lobby door (E), on the garage side of the tower next to the roller
//   door, is the one way in: the lift up to the flat on the 11th floor. The
//   tower is hidden and drawn up to that floor instead, the flat is a cutaway
//   on top (walls down, the glass facade too while the camera is outside it);
//   from the lift you walk through the hall to the living room behind the
//   glass facing the shopping centre. Bed: sleep until morning (or the
//   evening when the next mission needs the dark) and save; fridge: a fried
//   eierbal (health); wardrobe: the outfits you own. EIKEA pieces
//   (furniture.js) are delivered on the next visit and stand at fixed spots,
//   each with a perk. The whole storey is a surface for map.groundHeightAt,
//   so walking, jumping and the camera work as outside; a safety net puts
//   anyone who still gets off the floor back at the lift, and whatever moves
//   the player off the flat (a respawn, "Vastgelopen", a load) takes it down.
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
import { isMissionActive, isNight, getMissionDefs, setHomePlace } from './missions.js';
import { refreshDayNight } from './daynight.js';
import { recordStat, unlockAchievement } from './achievements.js';
import { clearDrunk } from './drunk.js';
import { buildHomeExterior3D, buildGarageShell, buildHomeDressing, setGarageCutaway, setGarageDoor, disposeHomeExterior, buildLowerTower3D, buildFlat3D, setFlatFacade } from './home3d.js';
import { registerHelipad } from './heliflight.js';
import { isPadelActive } from './padel.js';
import { isVillageMiniActive } from './dorpsuitjes.js';
import { isActivityActive } from './activities.js';
import { buildHelipadMesh } from './heli3d.js';
import { tagPleiadenlaan, tagKorenbloemstraat } from './thuis3d.js';
import { keyWord } from './controls.js';
import { getSettings } from './settings.js';
const downKey = () => keyWord(getSettings().keyBinds, 'control');
import { deliverFurniture, furnitureSkip, attachFurniture3D, leaveFurniture, furnitureSolids, furnitureUses, furnitureFocus, furniturePrompt, useFurniture, updateFurniture, updateFurnitureInside, companionSeat, furnitureSlept, fridgeCooldown, fridgePerk } from './furniture.js';
import { playerBusy } from './busy.js';

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
const LOBBY_X = 4.2; // the lobby door on the back facade, metres from the garage corner
const SPAWN_STEP = 1.8;
const LEVEL_HEIGHT = 3.1;
const FLOOR_Y = FLAT_LEVEL * LEVEL_HEIGHT + 0.05;
const FLOOR_TOP = FLOOR_Y + 0.02;
const USE_R = 1.5;
const SLAB_PAD = 2;
const INTERIOR_CAM = 0.85;
const CAM_ABOVE_FLOOR = 2.4;
const GLASS_CLEAR = 0.35;
const FRIDGE_COOLDOWN = 45;
const MORNING = 7.5;
const EVENING = 21.4;
const PAD_R = 7.5;
const PAD_DECK = 1.2;

// OSM (House of Groningen, way 749915414): the tower and its parking plinth.
const TOWER = [[-1303.66, -1090.58], [-1291.84, -1097.21], [-1285.79, -1100.63], [-1272.27, -1076.59], [-1290.35, -1066.43]];
const PLINTH = [[-1319.65, -1081.66], [-1303.66, -1090.58], [-1290.35, -1066.43], [-1292.23, -1065.4], [-1293.33, -1064.77], [-1291.22, -1058.16], [-1290.79, -1056.76], [-1309.84, -1051.02]];
// Pleiadenlaan kerb in front of the tower (long vehicles), the canal bank behind it (boats)
const KERB = [[-1294.68, -1111.66], [-1333.42, -1090.4], [-1365.2, -1072.78]];
const BANK = [[-1214.36, -1039.97], [-1268.77, -1120.63]];

const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const len = (v) => Math.hypot(v[0], v[1]);
const unit = (v) => { const l = len(v) || 1; return [v[0] / l, v[1] / l]; };

let world = null;
let home = null;
let tickT = 0;
let front = []; // car keys picked at the garage panel, first = most recent (saved as thuis.front)
let exterior = null;
let garageShell = null;
let inside = null; // { flatMesh, lowerMesh, facade } while upstairs
let busy = false;
let fridgeAt = -Infinity;
let lastInVehicle = null;
let doorOpen = 0;
let cutaway = 0;
let introShown = false;
let fadeGen = 0;
let camLocal = null; // the follow camera in the flat's frame (homeCamera)

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

  // tower frame: X along the facade facing the shopping centre (B -> D), Y inward
  const B = TOWER[0], D = TOWER[2], E = TOWER[3];
  const X = unit(sub(D, B)), Y = unit(sub(E, D));
  const tw = len(sub(D, B)), td = len(sub(E, D));
  const tp = (x, y) => [B[0] + X[0] * x + Y[0] * y, B[1] + X[1] * x + Y[1] * y];
  // the lobby is on the garage side: the back facade (F -> E), a few steps from the roller door
  const outAng = Math.atan2(Y[1], Y[0]);
  const [lx, ly] = tp(LOBBY_X, td);
  const [sx, sy] = tp(LOBBY_X, td + 2.2);
  const lobby = { x: lx, y: ly, angle: outAng, use: tp(LOBBY_X, td + 1.3), spawn: [sx, sy] };
  const front = [door.cx + door.nx * 3, door.cy + door.ny * 3];
  lobby.spawnAngle = Math.atan2(front[1] - sy, front[0] - sx);
  const rack = { slots: [], rails: [] };
  for (const [a, b] of [[6.8, 12.8], [13.8, 19.8]]) {
    const r0 = tp(a - 0.4, td + 0.35), r1 = tp(b + 0.4, td + 0.35);
    rack.rails.push({ x1: r0[0], y1: r0[1], x2: r1[0], y2: r1[1] });
    for (let t = a; t <= b + 0.01; t += 1.0) rack.slots.push({ id: 'r' + rack.slots.length, t, at: (l) => tp(t, td + 0.45 + l / 2), angle: outAng });
  }

  // the flat: 11 x 9 m in the corner of the 11th floor. The lift and the hall
  // are on the garage side (x = 0, the back wall), the living room and the
  // kitchen behind the glass facade (z = 0) that looks out on the shopping
  // centre. Its frame is square (the tower's corners are not quite right
  // angles): toFlat has to undo fl exactly, or everyone upstairs drifts.
  // Two small bedrooms at the back, one each ("als huisgenoten"): Tammo's off
  // the hall, Tessa's off the kitchen.
  const W = 11, Dd = 9, HALL = 3.4, MID = 5.2, SPLIT = 7.2;
  const FY = [-X[1], X[0]];
  const flat = {
    ox: B[0], oy: B[1], angle: Math.atan2(X[1], X[0]), floorY: FLOOR_Y, w: W, d: Dd, X, Y: FY,
    tower: { w: tw, d: td },
    rooms: [
      { name: 'woonkamer', x0: 0, x1: 6.8, z0: 0, z1: MID, floor: 'laminate' },
      { name: 'keuken', x0: 6.8, x1: W, z0: 0, z1: MID, floor: 'tiles' },
      { name: 'gang', x0: 0, x1: HALL, z0: MID, z1: Dd, floor: 'tiles' },
      { name: 'kamer Tammo', x0: HALL, x1: SPLIT, z0: MID, z1: Dd, floor: 'carpet' },
      { name: 'kamer Tessa', x0: SPLIT, x1: W, z0: MID, z1: Dd, floor: 'carpet' },
    ],
    // cutaway walls [x1, z1, x2, z2]: outer walls, hall | living room (doorway in line
    // with the lift), hall | Tammo's room (doorway), the bedrooms | living room and
    // kitchen (a doorway from the kitchen into Tessa's room), Tammo's | Tessa's room
    walls: [
      [0, 0, 0, Dd], [W, 0, W, Dd], [0, Dd, W, Dd],
      [0, MID, 1.0, MID], [2.4, MID, HALL, MID],
      [HALL, MID, HALL, 6.2], [HALL, 7.4, HALL, Dd],
      [HALL, MID, 9.0, MID], [10.2, MID, W, MID],
      [SPLIT, MID, SPLIT, Dd],
    ],
    spots: {
      sofa: { x: 3.7, z: 3.9 }, tv: { x: 3.7, z: 1.0 }, table: { x: 8.2, z: 3.4 },
      counter: { x: 9.0, z: 0.55, w: 3.6 }, fryer: { x: 8.4, z: 0.55 }, fridge: { x: 10.5, z: 1.6 },
      // single beds, head to the back wall: bed is Tammo's, bed2 Tessa's
      bed: { x: 6.6, z: 7.95 }, bed2: { x: 7.8, z: 7.95 },
      wardrobe: { x: 4.7, z: 8.6 }, wardrobe2: { x: 10.65, z: 6.2, rot: true },
      door: { x: 1.7, z: Dd - 0.05 }, roof: { x: 0.08, z: 6.6 },
      companion: { x: 3.15, z: 3.98, seat: 0.46 },
    },
  };
  // furniture as solid boxes for walking [x0, z0, x1, z1]
  flat.solids = [
    [2.4, 3.35, 5.0, 4.55], [3.0, 2.1, 4.4, 2.9], [0.2, 0.2, 0.9, 0.9],
    [7.1, 0.2, 10.9, 0.9], [10.1, 1.2, 10.9, 2.0], [7.6, 2.9, 8.8, 3.9],
    [6.1, 6.9, 7.1, 8.95], [7.3, 6.9, 8.3, 8.95], [3.85, 8.25, 5.55, 8.95], [10.3, 5.35, 10.95, 7.05],
  ];
  const fl = (x, z) => [B[0] + X[0] * x + FY[0] * z, B[1] + X[1] * x + FY[1] * z];
  const spot = (s, face) => { const [x, y] = fl(s.x, s.z); return { x, y, lx: s.x, lz: s.z, face }; };
  flat.use = {
    bed: spot({ x: 5.65, z: 7.3 }), bed2: spot({ x: 8.75, z: 7.3 }),
    wardrobe: spot({ x: 4.7, z: 7.8 }), wardrobe2: spot({ x: 9.85, z: 6.2 }), fridge: spot({ x: 9.7, z: 1.9 }),
    fryer: spot({ x: 8.4, z: 1.4 }), door: spot({ x: 1.7, z: 8.4 }), dak: spot({ x: 0.75, z: 6.6 }),
  };
  flat.entry = fl(1.7, 7.9);
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
  const [hx, hy] = [-1289.19, -1082.05];
  const t = map.buildingsNear(hx, hy, 20).find((b) => pointInPolygon(hx, hy, b.pts) && b.h >= 12);
  if (t) {
    t.pts = TOWER.map((p) => [...p]);
    t.bounds = boundsOf(t.pts);
    t._geo3dParts = null;
    t._ring = null;
    regrid(map.buildingGrid, t, t.bounds);
    home.towerBuilding = t;
    tagPleiadenlaan(map, { tower: t, frame: [TOWER[0], TOWER[2], TOWER[3], TOWER[4]], plinth: PLINTH, lobby: [home.lobby.x, home.lobby.y] });
    // the helidek in the middle of the roof, along the long side
    const top = Math.max(2.4, (t.h || 3) * LEVEL_HEIGHT) + (t.lift || 0);
    const T = home.tower;
    const cx = TOWER[0][0] + T.X[0] * T.w / 2 + T.Y[0] * T.d / 2, cy = TOWER[0][1] + T.X[1] * T.w / 2 + T.Y[1] * T.d / 2;
    home.pad = { id: 'home', x: cx, y: cy, r: PAD_R, z: top + PAD_DECK, roof: top, angle: Math.atan2(T.Y[1], T.Y[0]), name: 'Jouw helidek', exit: false, label: 'Jouw helidek · E: parkeren' };
    registerHelipad(home.pad);
  }
  // the opening's street (intromontage.js) gets its real houses too
  tagKorenbloemstraat(map);
  // the parking aisles and the deck ramp inside the plinth are ours now
  for (const r of map.roadsNear(c.x, c.y, 40).slice()) {
    if (!r.pts.every(([x, y]) => inPoly(PLINTH, x, y, 1.2))) continue;
    const i = map.roads.indexOf(r);
    if (i >= 0) map.roads.splice(i, 1);
    regrid(map.roadGrid, r, null);
  }
  // the garage itself, for traffic and police spawns (vehicle.js, police.js)
  map.homeGarageAt = (x, y, pad = 0) => Math.abs(x - c.x) < 120 && Math.abs(y - c.y) < 120 && inPoly(PLINTH, x, y, pad);
  const lob = home.lobby, T = home.tower;
  const rackZone = [0, 1, 2, 3].map((k) => {
    const x = [0.5, T.w - 0.5][k === 1 || k === 2 ? 1 : 0], y = k < 2 ? T.d + 3.2 : T.d - 0.2;
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
  // the flat's floor is a surface, for the player (and anything up there): the
  // whole storey plus a margin, so a step past an edge never finds the street
  const ground = map.groundHeightAt.bind(map);
  map.groundHeightAt = (x, y, z = 0) => (inside && z > FLOOR_TOP - 3 && onSlab(x, y, SLAB_PAD) ? FLOOR_TOP : ground(x, y, z));
}

// Is (x, y) on the flat's storey (the tower's footprint, pad metres wider)?
function onSlab(x, y, pad = 0) {
  const t = home.tower, dx = x - TOWER[0][0], dy = y - TOWER[0][1];
  const u = dx * t.X[0] + dy * t.X[1], v = dx * t.Y[0] + dy * t.Y[1];
  return u > -pad && u < t.w + pad && v > -pad && v < t.d + pad;
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

// "Jouw steiger": where the boats lie behind the tower.
function mooringPoint(w) {
  const side = bankSide(w);
  const p = home.bank.at(40);
  return { x: p.x + p.dir[1] * side * 2, y: p.y - p.dir[0] * side * 2 };
}

export function getHomeMooringForRender(w) {
  if (!home || !w) return [];
  return [{ ...mooringPoint(w), name: 'Jouw steiger', sub: 'Hier liggen je boten. Laten afleveren brengt ze hierheen' }];
}

// "Jouw helidek" on the roof, once there is a helicopter to park on it.
export function getHomeHelipadForRender() {
  if (!home || !home.pad || !getOwnedEntries().some((o) => o.spec.kind === 'heli')) return [];
  return [{ x: home.pad.x, y: home.pad.y, name: 'Jouw helidek', sub: 'Op het dak: land hier en druk E. Vanuit de flat: trap naar het dak' }];
}

export function getHomePad() {
  return home ? home.pad || null : null;
}

// Start and target points for spotcheck.js: the new-game spawn and the front
// door on the garage side, the garage door, the Escapade's bay and the first mooring.
export function getHomeSpots(w) {
  if (!home) return [];
  const d = home.garage.door;
  const hero = home.garage.bays.find((b) => b.hero);
  const out = [
    { name: 'lobby', x: home.lobby.spawn[0], y: home.lobby.spawn[1], mode: 'walk' },
    { name: 'nieuw spel', ...homeSpawnPoint(), mode: 'walk' },
    { name: 'voordeur', x: home.lobby.use[0], y: home.lobby.use[1], mode: 'walk' },
    { name: 'garagedeur', x: d.cx + d.nx * 3, y: d.cy + d.ny * 3, mode: 'drive' },
    { name: 'Escapade-plek', x: hero.x, y: hero.y, mode: 'drive' },
  ];
  out.push({ name: 'steiger', ...mooringPoint(w), mode: 'boat' });
  if (home.pad) out.push({ name: 'helidek', x: home.pad.x, y: home.pad.y, mode: 'air' });
  return out;
}

export function isInsideHome() {
  return !!inside;
}

// --- outdoor dressing ------------------------------------------------------------

// What stands round the towers (wijzigingsplan Atlas en Pleione: the trees
// along the water kept and new ones planted, a public green zone along the
// water, indoor bike parking, the entrance "with allure"): trees and hedges
// in the green strip between the towers and the canal, benches facing the
// water, park lamps along it, a planter by the lobby. Every spot stays clear
// of buildings, roads, water, the moorings and the garage, lobby and rack.
function dressingSpots(map) {
  const out = [];
  const door = home.garage.door, L = home.lobby;
  const doorFront = [door.cx + door.nx * 4, door.cy + door.ny * 4];
  const near = (pts, x, y) => {
    let best = Infinity;
    for (let i = 0; i < pts.length - 1; i++) best = Math.min(best, Math.sqrt(closestPointOnSegment(x, y, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]).dist2));
    return best;
  };
  const clear = (x, y, r) => {
    if (inPoly(PLINTH, x, y, r + 1) || isInWater(map, x, y)) return false;
    for (const b of map.buildingsNear(x, y, r + 8)) {
      if (pointInPolygon(x, y, b.pts)) return false;
      const P = b.pts;
      for (let i = 0; i < P.length; i++) {
        const a = P[i], c = P[(i + 1) % P.length];
        if (closestPointOnSegment(x, y, a[0], a[1], c[0], c[1]).dist2 < (r + 0.8) ** 2) return false;
      }
    }
    for (const rd of map.roadsNear(x, y, 14)) {
      const w = (rd.cat === 'foot' || rd.cat === 'cycle' ? 1.1 : (rd.width || 5) / 2) + r + 0.4;
      if (near(rd.pts, x, y) < w) return false;
    }
    if (Math.hypot(x - doorFront[0], y - doorFront[1]) < 9 || Math.hypot(x - L.use[0], y - L.use[1]) < 3.5 || Math.hypot(x - L.spawn[0], y - L.spawn[1]) < 3.5) return false;
    for (const rl of home.rack.rails) if (near([[rl.x1, rl.y1], [rl.x2, rl.y2]], x, y) < r + 2) return false;
    return near(BANK, x, y) > r + 2.5 && near(KERB, x, y) > r + 3;
  };
  const add = (p, r) => { if (clear(p.x, p.y, r)) out.push(p); };
  // the green strip along the canal: offsets from the bank towards the towers
  const [b0, b1] = BANK;
  const bl = Math.hypot(b1[0] - b0[0], b1[1] - b0[1]);
  const tx = (b1[0] - b0[0]) / bl, ty = (b1[1] - b0[1]) / bl;
  let nx = -ty, ny = tx;
  if ((home.center.x - b0[0]) * nx + (home.center.y - b0[1]) * ny < 0) { nx = -nx; ny = -ny; }
  const at = (t, o) => [b0[0] + tx * t + nx * o, b0[1] + ty * t + ny * o];
  // a bench's back (local -z) faces away from the water
  const benchA = Math.atan2(ty, tx) + ((-Math.sin(Math.atan2(ty, tx))) * nx + Math.cos(Math.atan2(ty, tx)) * ny > 0 ? 0 : Math.PI);
  for (let t = 4; t < bl - 3; t += 9) {
    const [x, y] = at(t, 7.5);
    add({ kind: 'tree', x, y, s: 0.9 + ((t * 7) % 5) / 10 }, 1.2);
    if (Math.round(t / 9) % 2) { const [x2, y2] = at(t + 4.5, 13); add({ kind: 'tree', x: x2, y: y2, s: 1.15 }, 1.2); }
  }
  for (let t = 10; t < bl - 6; t += 22) {
    const [x, y] = at(t, 3.8);
    add({ kind: 'bench', x, y, angle: benchA }, 1.0);
    const [hx, hy] = at(t + 9, 4.6);
    add({ kind: 'hedge', x: hx, y: hy, l: 5, angle: Math.atan2(ty, tx) }, 2.6);
  }
  for (let t = 2; t < bl; t += 17) { const [x, y] = at(t, 5.2); add({ kind: 'lamp', x, y }, 0.4); }
  // the forecourt on the Pleiadenlaan side: young trees in brick planters
  // along the plinth's blind west wall, lamps and benches along the kerb side
  const A = PLINTH[0], Hh = PLINTH[7];
  const wl = Math.hypot(Hh[0] - A[0], Hh[1] - A[1]), wx = (Hh[0] - A[0]) / wl, wy = (Hh[1] - A[1]) / wl;
  let ox = -wy, oy = wx;
  if ((home.center.x - A[0]) * ox + (home.center.y - A[1]) * oy > 0) { ox = -ox; oy = -oy; }
  for (let t = 4; t < wl - 2; t += 8) add({ kind: 'planter', x: A[0] + wx * t + ox * 2.4, y: A[1] + wy * t + oy * 2.4, angle: Math.atan2(wy, wx) }, 1.0);
  for (let t = 8; t < wl - 2; t += 8) add({ kind: 'tree', x: A[0] + wx * (t - 4) + ox * 6.5, y: A[1] + wy * (t - 4) + oy * 6.5, s: 0.85 }, 1.0);
  for (let i = 0; i < KERB.length - 1; i++) {
    const [k0, k1] = [KERB[i], KERB[i + 1]];
    const kl = Math.hypot(k1[0] - k0[0], k1[1] - k0[1]), kx = (k1[0] - k0[0]) / kl, ky = (k1[1] - k0[1]) / kl;
    let qx = -ky, qy = kx;
    if ((home.center.x - k0[0]) * qx + (home.center.y - k0[1]) * qy < 0) { qx = -qx; qy = -qy; }
    for (let t = 6; t < kl - 3; t += 12) {
      add({ kind: 'lamp', x: k0[0] + kx * t + qx * 4.5, y: k0[1] + ky * t + qy * 4.5 }, 0.4);
      add({ kind: 'tree', x: k0[0] + kx * (t + 6) + qx * 6, y: k0[1] + ky * (t + 6) + qy * 6, s: 1.0 }, 1.1);
    }
  }
  // a planter on the other side of the lobby from the rack
  const T = home.tower;
  const tp = (u, v) => [T.pts[0][0] + T.X[0] * u + T.Y[0] * v, T.pts[0][1] + T.X[1] * u + T.Y[1] * v];
  const [px, py] = tp(LOBBY_X - 2.6, T.d + 1.3);
  if (!inPoly(PLINTH, px, py, 0.8)) out.push({ kind: 'planter', x: px, y: py, angle: Math.atan2(T.X[1], T.X[0]) });
  return out;
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
  home.dressing = dressingSpots(w.map);
  for (const d of home.dressing) {
    if (d.kind === 'bench') addStaticCollider('post', d.x, d.y, 0.3, 0.9, d.angle, false, 0.9);
    else if (d.kind === 'hedge') addStaticCollider('post', d.x, d.y, 0.45, d.l / 2, d.angle, false, 0.95);
    else addStaticCollider('post', d.x, d.y, d.kind === 'planter' ? 0.7 : d.kind === 'tree' ? 0.3 : 0.15);
  }
  for (const r of home.rack.rails) addStaticCollider('rail', (r.x1 + r.x2) / 2, (r.y1 + r.y2) / 2, 0.06, Math.hypot(r.x2 - r.x1, r.y2 - r.y1) / 2, Math.atan2(r.y2 - r.y1, r.x2 - r.x1));
  w.homeActions = { goHome: () => goHome(w), canGoHome: () => canGoHome(w) === '' };
  setHomePlace(() => ({ x: home.icon.x, y: home.icon.y, name: 'Thuis' }));
  // a respawn (or anything else that moves the player off the flat) takes the flat down
  w.onRespawn.push(() => { if (inside) dropFlat(w); });
  w.camAdjust = homeCamera;
  window.__home = { home, goHome: () => goHome(w), enter: () => enterFlat(w), leave: () => leaveFlat(w), stockNow: () => stockNow(w), state: homeDebug, liftMenu: () => liftMenu(w), toFlat, onSlab };
}

// New game: start outside the lobby looking at the garage door, the Escapade in its bay.
// A step off the lobby door, so the first E prompt of a new game is the car, not the lift.
export function homeSpawnPoint() {
  if (!home) return { x: 0, y: 0, angle: 0 };
  const [sx, sy] = home.lobby.spawn, a = home.lobby.spawnAngle;
  return { x: sx + Math.cos(a) * SPAWN_STEP, y: sy + Math.sin(a) * SPAWN_STEP, angle: a };
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
  if (!v.isBoat && !v.isHeli) v.z = 0;
  if (!w.vehicles.includes(v)) w.vehicles.push(v);
}

// --- vehicles --------------------------------------------------------------------

const lenOf = (spec) => ((spec.model && spec.model.len) || 4) + 2 * ((spec.model && spec.model.trailer) || 0);
const kindOf = (spec) => (spec.kind === 'boat' ? 'boat' : spec.kind === 'heli' ? 'heli' : spec.kind === 'car' ? (lenOf(spec) > SHORT_CAR_M ? 'long' : 'car') : 'bike');

function stash(w, o) {
  const v = o.v;
  if (!v || v.driver === 'player') return;
  if ((v.health ?? 100) < 100) o.health = v.health;
  o.flat = !!v.flat;
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

// Stored entries in a fixed order.
function storedEntries() {
  const out = { car: [], long: [], bike: [], boat: [], heli: [] };
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

// Cars in bay order: the ones picked at the panel first, then the ones that
// already stand in the garage, then the rest in the order they were bought.
function carOrder(cars) {
  const rank = (o) => {
    const i = front.indexOf(o.key);
    return i >= 0 ? i : front.length + (o.v ? 0 : 1000);
  };
  return cars.map((o, i) => [o, rank(o) * 10000 + i]).sort((a, b) => a[1] - b[1]).map(([o]) => o);
}

// Something else stands in this bay: a stranger's car, or one of ours left there by hand.
function bayBlocked(w, b) {
  for (const v of w.vehicles) {
    if (v.wrecked || v.homeSlot === b.id) continue;
    if (Math.abs(v.x - b.x) > 3 || Math.abs(v.y - b.y) > 3) continue;
    if (Math.hypot(v.x - b.x, v.y - b.y) < 1.6) return true;
  }
  return false;
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

// Where every stored entry belongs: want (entry -> the slot to spawn it at)
// and where (key -> { at, bay }) for the Garage menu. at: 'bay', 'garage'
// (driven in and left anywhere inside), 'lift' (more cars than bays: in the
// parking lift behind the panel), 'kerb', 'rack', 'mooring' or 'pad'.
// Cars already in a bay keep it; a pick at the panel frees one.
function homeLayout(w, stored) {
  const want = new Map(), where = new Map();
  const bays = carBays();
  const cars = carOrder(stored.car);
  const loose = cars.filter((o) => o.v && !o.v.homeSlot);
  for (const o of loose) where.set(o.key, { at: 'garage' });
  const shown = cars.filter((o) => !loose.includes(o)).slice(0, Math.max(0, bays.length - loose.length));
  const taken = new Set();
  for (const o of shown) {
    const k = o.v && o.v.homeSlot ? bays.findIndex((b) => b.id === o.v.homeSlot) : -1;
    if (k >= 0) { taken.add(bays[k].id); where.set(o.key, { at: 'bay', bay: k + 1 }); }
  }
  const free = bays.filter((b) => !taken.has(b.id) && !bayBlocked(w, b));
  for (const o of shown) {
    if (where.has(o.key)) continue;
    const b = free.shift();
    if (!b) break;
    want.set(o, { x: b.x, y: b.y, angle: b.angle, id: b.id });
    where.set(o.key, { at: 'bay', bay: bays.indexOf(b) + 1 });
  }
  for (const o of cars) if (!where.has(o.key)) where.set(o.key, { at: 'lift' });
  const court = lineSlots(stored.long, home.court, (sp) => ({ side: 1, d: 4.5 + sp.model.wid / 2 + 0.5 }), 24, home.court.total - 2);
  for (const [o, s] of court) want.set(o, { ...s, id: 'k-' + o.key });
  for (const o of stored.long) where.set(o.key, { at: 'kerb' });
  const side = bankSide(w);
  const boats = lineSlots(stored.boat, home.bank, (sp) => ({ side, d: sp.model.wid / 2 + 1.1 }), 30, home.bank.total - 8);
  for (const [o, s] of boats) want.set(o, { ...s, id: 'b-' + o.key });
  for (const o of stored.boat) where.set(o.key, { at: 'mooring' });
  home.rack.slots.forEach((r, i) => {
    const o = stored.bike[i];
    if (!o) return;
    const [x, y] = r.at(lenOf(o.spec));
    want.set(o, { x, y, angle: r.angle, id: r.id });
  });
  for (const o of stored.bike) where.set(o.key, { at: 'rack' });
  // one helicopter on the roof (not while the flat below it is open)
  const pad = home.pad;
  if (pad && stored.heli[0] && !inside) want.set(stored.heli[0], { x: pad.x, y: pad.y, angle: pad.angle, id: 'pad', z: pad.z });
  for (const o of stored.heli) where.set(o.key, { at: 'pad' });
  return { want, where };
}

const WHERE_LABEL = {
  bay: (s) => `Thuis in de garage, vak ${s.bay}`,
  garage: () => 'Thuis in de garage',
  lift: () => 'Thuis in de parkeerlift: haal hem naar voren bij het paneel in de garage',
  kerb: () => 'Thuis langs de stoep voor de garage',
  rack: () => 'Thuis in het fietsenrek bij de voordeur',
  mooring: () => 'Thuis aan jullie steiger achter de flat',
  pad: () => 'Thuis op het helidek',
};

// Where an owned vehicle that is home stands (ownedvehicles.js, the Garage menu).
export function homeWhereLabel(key) {
  if (!home || !world) return '';
  if (key === 'hero') return 'Thuis in de garage, in zijn eigen vak achterin';
  const s = homeLayout(world, storedEntries()).where.get(key);
  return s ? WHERE_LABEL[s.at](s) : '';
}

export function getHomeSave() {
  return { front: front.slice(0, 40) };
}

// The panel by the garage door: every car at home, and which ones stand in the bays.
function liftMenu(w) {
  const label = (o) => o.spec.label;
  const preview = (o) => ({ kind: o.spec.kind, model: o.spec.model, color: o.color, nameIdx: o.spec.nameIdx, flags: o.spec.flags || null });
  const pick = (o) => {
    front = [o.key, ...front.filter((k) => k !== o.key)];
    const { where } = homeLayout(w, storedEntries());
    const s = where.get(o.key);
    tickT = 0;
    return s && s.at === 'bay' ? `${label(o)} komt naar vak ${s.bay}` : `${label(o)} staat vooraan in de rij`;
  };
  return {
    name: 'Parkeerlift', type: 'auto', color: '#1e9e56', tagline: 'Achttien vakken, en een lift voor de rest',
    sections: () => {
      const stored = storedEntries();
      const { where } = homeLayout(w, stored);
      const cars = carOrder(stored.car);
      const inBay = cars.filter((o) => where.get(o.key).at !== 'lift');
      const inLift = cars.filter((o) => where.get(o.key).at === 'lift');
      const out = [{
        title: `In de garage (${inBay.length} van ${carBays().length} vakken)`,
        note: inLift.length ? 'Kies er een uit de lift: die ruilt met de achterste auto in de rij' : 'Alles past. Meer auto\'s dan vakken? Die wachten in de lift',
        items: inBay.map((o) => ({ id: 'bay-' + o.key, label: label(o), desc: WHERE_LABEL[where.get(o.key).at](where.get(o.key)), price: 0, verb: 'Vooraan houden', keepFocus: true, preview: preview(o), tag: front.includes(o.key) ? 'Gekozen' : '', buy: () => pick(o) })),
      }];
      if (inLift.length) out.push({ title: `In de parkeerlift (${inLift.length})`, items: inLift.map((o) => ({ id: 'lift-' + o.key, label: label(o), desc: 'Wacht in de lift', price: 0, verb: 'Naar een vak', keepFocus: true, preview: preview(o), buy: () => pick(o) })) });
      const other = [...stored.long, ...stored.bike, ...stored.boat, ...stored.heli];
      if (other.length) out.push({ title: 'Verder thuis', items: other.map((o) => ({ id: 'home-' + o.key, label: label(o), desc: WHERE_LABEL[where.get(o.key).at](where.get(o.key)), price: 0, disabled: 'Staat al klaar', preview: preview(o) })) });
      return out;
    },
  };
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
  if (v.isHeli) return !!home.pad && !!v.onGround && Math.hypot(v.x - home.pad.x, v.y - home.pad.y) < PAD_R + 0.5 && Math.abs(v.z - home.pad.z) < 1;
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
      w.addMessage(v.isBoat ? `${name} ligt weer thuis aan de steiger` : v.isHeli ? `${name} staat weer op het helidek` : `${name} staat weer thuis`, 3, { kind: 'tip' });
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
  const { want, where } = homeLayout(w, stored);
  // a car that lost its bay to a pick at the panel goes into the parking lift
  for (const o of stored.car) if (o.v && o.v.homeSlot && where.get(o.key).at === 'lift') stash(w, o);
  let n = 0;
  for (const [o, s] of want) {
    if (o.v || n >= SPAWNS_PER_TICK) continue;
    if (occupied(w, s.x, s.y, o.spec.kind === 'car' ? 1.3 : o.spec.kind === 'boat' ? 2 : 0.45)) continue;
    const v = spawnOwnedEntry(w, o, s.x, s.y, s.angle);
    if (!v) continue;
    v.x = s.x; v.y = s.y; v.angle = s.angle; v.speed = 0; v.road = null;
    if (v.isHeli) { v.z = s.z; v.groundZ = s.z; v.onGround = true; v.landKind = 'pad'; v.landPad = home.pad; }
    v.homeStored = true;
    v.homeSlot = s.id;
    v._homeX = s.x; v._homeY = s.y;
    n++;
  }
  for (const v of w.vehicles) if (v.homeStored && v._homeX === undefined) { v._homeX = v.x; v._homeY = v.y; }
}

// Loading a save / "Naar huis": everything that isn't lost is home again.
function stockNow(w) {
  for (const o of getOwnedEntries()) if (o.v && !o.lost) stash(w, o);
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
  const box = () => {
    lx = Math.max(r + 0.1, Math.min(f.w - r - 0.1, lx));
    lz = Math.max(r + 0.2, Math.min(f.d - r - 0.1, lz));
  };
  box();
  for (const [x1, z1, x2, z2] of f.walls) {
    const c = closestPointOnSegment(lx, lz, x1, z1, x2, z2);
    if (c.dist2 >= (r + 0.07) ** 2) continue;
    const d = Math.sqrt(c.dist2) || 1e-4;
    const k = (r + 0.07 - d) / d;
    lx += (lx - c.x) * k; lz += (lz - c.y) * k;
  }
  for (const [x0, z0, x1, z1] of [...f.solids, ...furnitureSolids()]) {
    const cx = Math.max(x0, Math.min(x1, lx)), cz = Math.max(z0, Math.min(z1, lz));
    const dx = lx - cx, dz = lz - cz;
    const d = Math.hypot(dx, dz);
    if (d >= r) continue;
    if (d < 1e-4) {
      const opts = [[lx - x0, -1, 0], [x1 - lx, 1, 0], [lz - z0, 0, -1], [z1 - lz, 0, 1]].sort((a, b) => a[0] - b[0])[0];
      lx += opts[1] * (opts[0] + r); lz += opts[2] * (opts[0] + r);
    } else { lx += dx / d * (r - d); lz += dz / d * (r - d); }
  }
  // furniture by the glass never pushes anyone through it
  box();
  const [x, y] = f.fl(lx, lz);
  p.x = x; p.y = y;
}

function canEnter(w) {
  const p = w.player;
  if (p.inVehicle || p.swimming) return 'Eerst uitstappen';
  if (w.wanted > 0) return 'Met de politie op je hielen ga je niet naar huis. Eerst ze kwijt!';
  if (playerBusy(w, ['mission', 'sideJob', 'challenge']).busy) return 'Eerst je klus afmaken';
  if (w.pigeonMode || w.heliRun || w.pendingRespawn || isCinematicActive() || isPadelActive() || isVillageMiniActive() || isActivityActive()) return 'Nu even niet';
  return '';
}

// A fade to black, fn in the dark, fade back. A load in between cancels fn.
function fadeThen(fn, hold = 380) {
  if (busy) return false;
  busy = true;
  const gen = fadeGen;
  respawnFade(1, 320);
  setTimeout(() => {
    if (gen === fadeGen) {
      try { fn(); } catch (e) { console.error('home', e); }
    }
    setTimeout(() => { respawnFade(0, 420); busy = false; }, 120);
  }, hold);
  return true;
}

function enterFlat(w) {
  if (inside || !home) return false;
  return fadeThen(() => {
    // got into a car, died or became a pigeon during the fade: stay outside
    if (canEnter(w)) return;
    const scene = getScene();
    const f = home.flat;
    deliverFurniture(w);
    inside = { flatMesh: buildFlat3D(f, furnitureSkip()), lowerMesh: home.towerBuilding ? buildLowerTower3D(home.towerBuilding, FLAT_LEVEL - 1) : null, facade: 0 };
    attachFurniture3D(inside.flatMesh, f);
    if (scene) {
      scene.add(inside.flatMesh);
      if (inside.lowerMesh) scene.add(inside.lowerMesh);
    }
    if (home.towerBuilding) setBuildingHidden(home.towerBuilding, true);
    stashRoofHeli(w);
    toEntry(w);
    placeCompanion(w);
    if (!introShown) {
      introShown = true;
      w.addMessage('Jullie nieuwe flat! Bed: slapen en opslaan. Koelkast: eierbal. Kast: je kleren', 6, { kind: 'tip' });
    }
  });
}

// Just out of the lift, facing the hall and the living room behind it.
function toEntry(w) {
  const p = w.player, f = home.flat;
  resetWalker(p, f.entry[0], f.entry[1], FLOOR_TOP);
  p.angle = Math.atan2(-f.Y[1], -f.Y[0]);
  w.camYaw = p.angle;
}

function resetWalker(p, x, y, gz) {
  if (p.water && p.leaveWater) p.leaveWater();
  p.x = x; p.y = y; p.vx = 0; p.vy = 0; p.z = 0; p.vz = 0; p.gz = gz;
  p.vault = null; p.climb = null; p.sofaSeat = null;
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
  leaveFurniture(w);
  const scene = getScene();
  if (scene) {
    scene.remove(inside.flatMesh);
    if (inside.lowerMesh) scene.remove(inside.lowerMesh);
  }
  disposeHomeExterior(inside.flatMesh);
  inside = null;
  if (home.towerBuilding) setBuildingHidden(home.towerBuilding, false);
}

// The player left the flat without the lift (a respawn, "Vastgelopen", a
// scene, a vehicle): the flat goes, and nobody is left inside the tower.
function dropFlat(w) {
  exitFlatNow(w);
  const p = w.player;
  const v = p.inVehicle;
  if (!inPoly(TOWER, v ? v.x : p.x, v ? v.y : p.y, 1)) return;
  if (v) { v.driver = null; v.speed = 0; p.inVehicle = null; }
  placeAtLobby(w);
}

function placeAtLobby(w) {
  const p = w.player;
  const [x, y] = home.lobby.spawn;
  resetWalker(p, x, y, 0);
  p.angle = home.lobby.angle;
  w.camYaw = p.angle;
  const c = w.companion;
  if (c && !c.inVehicle && c.state !== 'dead') {
    c.x = x - home.tower.X[0] * 1.1; c.y = y - home.tower.X[1] * 1.1;
    c.vx = 0; c.vy = 0; c.gz = 0; c.sofaSeat = null;
    c.angle = p.angle;
  }
}

// The one you don't play waits on the sofa (the Zitmoi when there is one).
function placeCompanion(w) {
  const c = w.companion;
  if (!c || c.inVehicle || c.state === 'dead') return;
  const s = companionSeat() || home.flat.spots.companion;
  const [x, y] = home.flat.fl(s.x, s.z);
  c.x = x; c.y = y; c.vx = 0; c.vy = 0; c.gz = FLOOR_TOP;
  c.sofaSeat = s.seat;
  c.angle = Math.atan2(-home.flat.Y[1], -home.flat.Y[0]);
}

// wake: a chosen hour (the Sloapstee's menu) with its message, else morning
// or the evening when the next mission needs the dark.
function sleep(w, wake = null, wakeMsg = '') {
  return fadeThen(() => {
    if (!inside) return;
    const m = w.mission;
    const def = m && m.phase === 'idle' ? getMissionDefs()[m.index] : null;
    const needNight = !!def && [].concat(def.requires || []).includes('night');
    const hour = ((w.clock % 24) + 24) % 24;
    w.clock = wake != null ? wake : needNight && !isNight(w) ? EVENING : MORNING;
    refreshDayNight(w);
    w.health = 100;
    furnitureSlept(w, hour, w.clock);
    clearDrunk(w);
    recordStat(w, 'slept');
    saveGame(w, { toast: true });
    if (wakeMsg) w.addMessage(wakeMsg, 4, { kind: 'tip' });
    else w.addMessage(needNight && !isNight(w) ? 'Uitgeslapen tot de avond. Tijd voor actie' : hour > MORNING && hour < 20 ? 'Middagdutje tot de volgende ochtend. Goeiemorgen, Grunn!' : 'Goeiemorgen, Grunn! Uitgeslapen en opgeslagen', 4, { kind: 'tip' });
  }, 900);
}

function eatEierbal(w) {
  if (w.time - fridgeAt < fridgeCooldown(FRIDGE_COOLDOWN)) { w.addMessage('Nog vol van de vorige eierbal. Even laten zakken', 3); return; }
  fridgeAt = w.time;
  w.health = 100;
  if (fridgePerk(w)) w.addMessage('Eierbal door de Vetpot: gezondheid vol en een knapperig pantser erbij', 3.5, { kind: 'tip' });
  else w.addMessage('Eierbal uit de vriezer, drie minuten in de frituur: helemaal opgeladen', 3.5, { kind: 'tip' });
}

// --- "Naar huis" ---------------------------------------------------------------

function canGoHome(w) {
  if (!home || w.pendingRespawn || isCinematicActive()) return 'Nu even niet';
  if (inside) return 'Je bent al thuis';
  if (w.player.inVehicle && w.player.inVehicle.isBoat) return 'Eerst van het water af';
  return canEnter({ ...w, player: { ...w.player, inVehicle: null, swimming: false } });
}

function goHome(w) {
  const why = canGoHome(w);
  if (why) { w.addMessage(why, 3); return false; }
  if (near(w, 25)) return true;
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
  const t = d && d.thuis;
  front = t && Array.isArray(t.front) ? t.front.filter((k) => typeof k === 'string').slice(0, 40) : [];
  fadeGen++;
  exitFlatNow(w);
  const busySave = d && d.ctx === 'busy';
  if (busySave) {
    // a mid-mission save made upstairs: back on the street, not inside the tower
    if (inPoly(TOWER, w.player.x, w.player.y, 1)) placeAtLobby(w);
    return;
  }
  stockNow(w);
  placeAtLobby(w);
}

export function homeSaveContext(w) {
  if (playerBusy(w, ['mission', 'sideJob', 'challenge']).busy) return 'busy';
  return near(w, 40) ? 'home' : 'free';
}

// --- prompts and E --------------------------------------------------------------

function flatUse(w) {
  const p = w.player;
  let best = furnitureFocus(w), bd = USE_R;
  if (best) return best;
  const consider = (k, s) => {
    const d = Math.hypot(s.x - p.x, s.y - p.y);
    if (d < bd) { bd = d; best = { k, s }; }
  };
  for (const [k, s] of Object.entries(home.flat.use)) consider(k, s);
  for (const u of furnitureUses()) consider(u.k, u);
  return best;
}

// Whose bed is whose: you only sleep in your own room.
const BED_OF = { bed: 'Tammo', bed2: 'Tessa' };
const ownBed = (w) => (w.player.character === 'anita' ? 'bed2' : 'bed');

const FLAT_PROMPTS = {
  bed: ['Slapen', 'In je eigen bed tot de ochtend, en het spel wordt opgeslagen'],
  wardrobe: ['Kledingkast', 'Trek iets anders aan'],
  fridge: ['Eierbal pakken', 'Uit de vriezer, even door de frituur: gezondheid vol'],
  fryer: ['Eierbal pakken', 'De frituurpan staat al warm'],
  door: ['Met de lift naar beneden', 'Naar de straat en de garage'],
  dak: ['Trap naar het dak', 'Naar het helidek: je heli staat klaar'],
};

// The helicopter's entry in the collection, if there is one.
function heliEntry() {
  return getOwnedEntries().find((o) => o.spec.kind === 'heli') || null;
}

// Why the roof stairs lead nowhere right now ('' = the heli waits up there).
function roofBlock() {
  const o = heliEntry();
  if (!o) return 'Het dak is leeg. Een heli koop je bij Rotor Roelf op Eelde';
  if (o.lost) return 'Je heli is afgeschreven. Regel een nieuwe via je telefoon (Esc)';
  if (o.v && !o.v.homeStored) return 'Je heli staat niet op het dak. Laat hem afleveren via je telefoon (Esc, Garage)';
  return '';
}

function onHomePad(w) {
  const v = w.player.inVehicle;
  return !!(v && v.isHeli && home.pad && v.onGround && !v.wrecked && v.landPad === home.pad);
}

export function homePrompt(w) {
  if (!home || busy) return null;
  const p = w.player;
  if (onHomePad(w)) {
    const why = canPark(w);
    return { id: 'home-pad', x: home.pad.x, y: home.pad.y, h: home.pad.z + 3.4, key: 'E', label: 'Naar binnen', sub: why || 'Met de lift naar jullie flat', ring: true };
  }
  if (p.inVehicle) return null;
  if (inside) {
    const u = flatUse(w);
    if (!u) return null;
    if (u.k === 'dak') {
      const why = roofBlock();
      return { id: 'home-dak', x: u.s.x, y: u.s.y, h: FLOOR_TOP + 1.3, key: 'E', label: FLAT_PROMPTS.dak[0], sub: why || FLAT_PROMPTS.dak[1], ring: true, dim: !!why };
    }
    if (BED_OF[u.k] && u.k !== ownBed(w)) {
      return { id: 'home-otherbed', x: u.s.x, y: u.s.y, h: FLOOR_TOP + 1.3, key: 'E', label: `Bed van ${BED_OF[u.k]}`, sub: `Niet jouw kamer. Jouw bed staat ${u.k === 'bed' ? 'achter de keuken' : 'naast de gang'}`, ring: true, dim: true };
    }
    const k = BED_OF[u.k] ? 'bed' : u.k === 'wardrobe2' ? 'wardrobe' : u.k;
    const [label, sub] = furniturePrompt(k, w) || FLAT_PROMPTS[k];
    return { id: 'home-' + k, x: u.s.x, y: u.s.y, h: FLOOR_TOP + 1.3, key: 'E', label, sub, ring: true };
  }
  const L = home.lobby;
  if (Math.hypot(p.x - L.use[0], p.y - L.use[1]) < 1.8) {
    const why = canEnter(w);
    return { id: 'home-lobby', x: L.x, y: L.y, h: 2.4, key: 'E', label: 'Naar binnen', sub: why || 'Met de lift naar jullie flat', ring: true, dim: !!why };
  }
  const pn = home.garage.panel;
  if (Math.hypot(p.x - pn.x, p.y - pn.y) < 1.6) {
    const lift = [...homeLayout(w, storedEntries()).where.values()].filter((s) => s.at === 'lift').length;
    return { id: 'home-panel', x: pn.x, y: pn.y, h: 1.9, key: 'E', label: 'Auto\'s kiezen', sub: lift ? `${lift} in de parkeerlift` : 'Alle auto\'s staan er al', ring: true };
  }
  return null;
}

export function homeSecondary(w) {
  if (!home || inside || w.player.inVehicle) return [];
  const p = w.player;
  const d = home.garage.door, L = home.lobby;
  if (Math.abs(d.cx - p.x) > 30 || Math.abs(d.cy - p.y) > 30) return [];
  const out = [{ id: 'home-garage', x: d.cx, y: d.cy, h: 4.2, label: 'Jullie garage', sub: 'Loop naar een voertuig en druk E', kind: 'place' }];
  // the front door, until you stand at it (then "Naar binnen" takes over)
  if (Math.hypot(L.x - p.x, L.y - p.y) > 4) out.push({ id: 'home-front', x: L.x, y: L.y, h: 3.3, label: 'Voordeur', sub: 'Met de lift naar jullie flat', kind: 'place' });
  return out;
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
  } else if (pr.id === 'home-panel') openShopMenu(w, liftMenu(w));
  else if (pr.id === 'home-otherbed') w.addMessage(w.player.character === 'anita' ? 'Dat is het bed van Tammo. Daar slaap jij niet' : 'Dat is het bed van Tessa. Daar slaap jij niet', 3);
  else if (useFurniture(w, pr.id.slice(5), { sleep: (hour, msg) => sleep(w, hour, msg) })) {
    // an EIKEA piece (furniture.js)
  } else if (pr.id === 'home-bed') sleep(w);
  else if (pr.id === 'home-wardrobe') openShopMenu(w, wardrobeMenu(w));
  else if (pr.id === 'home-fridge' || pr.id === 'home-fryer') eatEierbal(w);
  else if (pr.id === 'home-door') leaveFlat(w);
  else if (pr.id === 'home-dak') {
    const why = roofBlock();
    if (why) w.addMessage(why, 3.5, { kind: 'tip' });
    else toRoof(w);
  } else if (pr.id === 'home-pad') parkOnPad(w);
  return true;
}

// --- the helidek ------------------------------------------------------------------

// Nobody in the flat sees the roof: the heli waits unspawned meanwhile.
function stashRoofHeli(w) {
  const o = heliEntry();
  if (o && o.v && o.v.homeStored && o.v.driver !== 'player') stash(w, o);
}

// The flat's roof stairs: out of the flat and straight into the pilot's seat.
function toRoof(w) {
  fadeThen(() => {
    if (!inside || roofBlock()) return;
    const o = heliEntry();
    exitFlatNow(w);
    const pad = home.pad;
    let v = o.v && w.vehicles.includes(o.v) ? o.v : spawnOwnedEntry(w, o, pad.x, pad.y, pad.angle);
    if (!v) { placeAtLobby(w); w.addMessage('De heli wil niet. Probeer het straks nog eens', 3); return; }
    v.x = pad.x; v.y = pad.y; v.angle = pad.angle; v.z = pad.z;
    v.groundZ = pad.z; v.onGround = true; v.landKind = 'pad'; v.landPad = pad;
    v.speed = 0; v.driftX = 0; v.driftY = 0; v.vx = 0; v.vy = 0; v.vz = 0;
    v.homeStored = true; v.homeSlot = 'pad'; v._homeX = pad.x; v._homeY = pad.y;
    const p = w.player;
    resetWalker(p, pad.x, pad.y, pad.z);
    p.enterVehicle(v, w);
    p.angle = v.angle;
    w.camYaw = v.angle;
    const c = w.companion;
    if (c && c.state !== 'dead' && !c.inVehicle) {
      c.sofaSeat = null;
      c.x = pad.x; c.y = pad.y; c.gz = pad.z; c.vx = 0; c.vy = 0;
      c.inVehicle = v;
      v.passenger = 'companion';
    }
    w.addMessage(`Op het dak. Spatie: opstijgen, ${downKey()}: omlaag`, 5, { kind: 'tip' });
  }, 520);
}

function canPark(w) {
  if (w.wanted > 0) return 'Met de politie op je hielen: eerst ze kwijt, dan naar binnen';
  if (playerBusy(w, ['mission', 'sideJob', 'challenge']).busy) return 'Eerst je klus afmaken';
  return '';
}

// Landed on the helidek, E: the heli stays up here, the lift takes you both down.
function parkOnPad(w) {
  const why = canPark(w);
  if (why) { w.addMessage(why, 3); return; }
  fadeThen(() => {
    const p = w.player;
    const v = p.inVehicle;
    if (!v || !v.isHeli || !onHomePad(w)) return;
    const c = w.companion;
    if (c && c.inVehicle === v) { c.inVehicle = null; v.passenger = null; }
    v.driver = null; v.horn = false; v.throttle = 0;
    v.speed = 0; v.driftX = 0; v.driftY = 0; v.vx = 0; v.vy = 0; v.vz = 0;
    p.inVehicle = null;
    v.homeStored = true; v.homeSlot = 'pad'; v._homeX = v.x; v._homeY = v.y;
    lastInVehicle = null;
    recordStat(w, 'heliParked');
    unlockAchievement(w, 'helidak');
    if (canEnter(w)) { placeAtLobby(w); return; }
    const scene = getScene();
    const f = home.flat;
    deliverFurniture(w);
    inside = { flatMesh: buildFlat3D(f, furnitureSkip()), lowerMesh: home.towerBuilding ? buildLowerTower3D(home.towerBuilding, FLAT_LEVEL - 1) : null, facade: 0 };
    attachFurniture3D(inside.flatMesh, f);
    if (scene) {
      scene.add(inside.flatMesh);
      if (inside.lowerMesh) scene.add(inside.lowerMesh);
    }
    if (home.towerBuilding) setBuildingHidden(home.towerBuilding, true);
    stashRoofHeli(w);
    toEntry(w);
    placeCompanion(w);
    w.addMessage('Heli geparkeerd op het dak. Thuis!', 3, { kind: 'tip' });
  }, 520);
}

// --- frame -------------------------------------------------------------------------

// Every frame whatever the player is doing (flying the heli home, a pigeon,
// padel, an activity): the garage streams in near, its merged shell stands
// in for it further away.
export function updateHomeExterior(dt, w) {
  if (!home) return;
  world = w;
  const scene = getScene();
  if (!scene) return;
  if (!garageShell) {
    garageShell = buildGarageShell(home);
    scene.add(garageShell);
    if (home.dressing && home.dressing.length) scene.add(buildHomeDressing(home.dressing));
  }
  streamExterior(w, dt, scene);
  garageShell.visible = !exterior;
}

function streamExterior(w, dt, scene) {
  const p = w.player;
  const d = Math.hypot(p.x - home.center.x, p.y - home.center.y);
  if (!exterior && d < STREAM_IN) {
    exterior = buildHomeExterior3D(home);
    if (home.pad) {
      const pad = buildHelipadMesh(PAD_R, PAD_DECK);
      pad.position.set(home.pad.x, home.pad.roof, home.pad.y);
      pad.rotation.y = -home.pad.angle;
      exterior.add(pad);
      exterior.userData.pad = pad;
    }
    scene.add(exterior);
  } else if (exterior && d > STREAM_OUT) {
    scene.remove(exterior);
    disposeHomeExterior(exterior);
    exterior = null;
  }
  if (!exterior) return;
  if (exterior.userData.pad) exterior.userData.pad.visible = !inside;
  const who = p.inVehicle || p;
  const dd = home.garage.door;
  const want = Math.hypot(who.x - dd.cx, who.y - dd.cy) < DOOR_OPEN_M || inPoly(PLINTH, who.x, who.y) ? 1 : 0;
  doorOpen += Math.max(-dt * 0.8, Math.min(dt * 0.8, want - doorOpen));
  setGarageDoor(exterior, doorOpen, GARAGE_H);
  // walls down only once you are really inside (through the roller door)
  const cut = !inside && inPoly(PLINTH, who.x, who.y) ? 1 : 0;
  cutaway += Math.max(-dt * 3, Math.min(dt * 3, cut - cutaway));
  setGarageCutaway(exterior, cutaway);
}

// true while the player is upstairs in the flat (player.js skips building collision)
export function inHomeFlat() {
  return !!inside;
}

// Where a cutscene in the flat is staged (cutscenehost.js playScript, #149): the middle of the living room, along the
// flat's long axis, and the space it may use: people stay inside the outer walls, the camera too and above the cutaway
// (the same height the follow camera keeps). null when the player is not upstairs.
export function flatStage() {
  if (!inside || !home) return null;
  const f = home.flat;
  const [ax, ay] = f.fl(Math.min(3.4, f.w / 2), Math.min(2.8, f.d / 2));
  const clamp = (x, y, z, kind) => {
    const { lx, lz } = toFlat(x, y);
    const m = kind === 'camera' ? 0.45 : 0.6;
    const [cx, cy] = f.fl(Math.max(m, Math.min(f.w - m, lx)), Math.max(m, Math.min(f.d - m, lz)));
    return { x: cx, y: cy, z: kind === 'camera' ? Math.max(z, FLOOR_TOP + CAM_ABOVE_FLOOR) : z };
  };
  return { anchor: { x: ax, y: ay, facing: Math.atan2(f.X[1], f.X[0]), z: FLOOR_TOP }, env: { clamp } };
}

// Every frame upstairs: walls and furniture, the floor, the companion on the sofa.
function keepInFlat(dt, w) {
  const p = w.player;
  if (!updateFurnitureInside(dt, w)) clampToFlat(p);
  // safety net: whatever happens, nobody drops through the floor (or flies off it)
  if (!Number.isFinite(p.x + p.y + p.gz + p.z) || p.gz < FLOOR_TOP - 0.3 || p.z > 6) {
    console.warn('[home] off the flat floor, back at the lift', { gz: p.gz, z: p.z });
    toEntry(w);
  }
  p.gz = FLOOR_TOP;
  placeCompanion(w);
  // the glass facade drops to the cutaway height while the camera is outside it
  const want = camLocal && camLocal.lz < 0.4 ? 1 : 0;
  inside.facade += Math.max(-dt * 4, Math.min(dt * 4, want - inside.facade));
  setFlatFacade(inside.flatMesh, inside.facade);
}

// scene3d's follow camera (world.camAdjust, three.js axes: y is up). In the
// flat a little closer and always above the cutaway walls; outside, never
// behind the garage's walls while they are up.
function homeCamera(x, y, z, ex, ey, ez) {
  if (!home) return null;
  if (inside) {
    let t = INTERIOR_CAM;
    // stay on this side of the glass: in along the ray, and higher the closer it gets
    const c = toFlat(ex + (x - ex) * t, ez + (z - ez) * t), e = toFlat(ex, ez);
    if (c.lz < GLASS_CLEAR && e.lz > c.lz) t *= Math.max(0, (e.lz - GLASS_CLEAR) / (e.lz - c.lz));
    const nx = ex + (x - ex) * t, nz = ez + (z - ez) * t;
    const close = Math.max(0, 1.6 - Math.hypot(nx - ex, nz - ez));
    camLocal = toFlat(nx, nz);
    return [nx, Math.max(ey + (y - ey) * t, FLOOR_TOP + CAM_ABOVE_FLOOR + close * 0.6), nz];
  }
  camLocal = null;
  if (!exterior || cutaway > 0.5 || y > GARAGE_H + 0.6) return null;
  if (Math.abs(x - home.center.x) > 40 || Math.abs(z - home.center.y) > 40) return null;
  if (!pointInPolygon(x, z, PLINTH) || pointInPolygon(ex, ez, PLINTH)) return null;
  let t = 1;
  for (let i = 0; i < PLINTH.length; i++) {
    const a = PLINTH[i], b = PLINTH[(i + 1) % PLINTH.length];
    const s = crossAt(ex, ez, x, z, a[0], a[1], b[0], b[1]);
    if (s !== null && s < t) t = s;
  }
  const dist = Math.hypot(x - ex, z - ez) || 1;
  t = Math.max(0, t - 0.45 / dist);
  // in front of the wall, looking down more steeply the closer it has to come
  const close = Math.max(0, 1.6 - dist * t);
  return [ex + (x - ex) * t, Math.max(ey + (y - ey) * t, ey + (close > 0 ? 0.4 + close * 1.2 : 0)), ez + (z - ez) * t];
}

// Where along p0 -> p1 (0..1) it crosses the segment a -> b, or null.
function crossAt(x0, y0, x1, y1, ax, ay, bx, by) {
  const dx = x1 - x0, dy = y1 - y0, ex = bx - ax, ey = by - ay;
  const den = dx * ey - dy * ex;
  if (Math.abs(den) < 1e-9) return null;
  const t = ((ax - x0) * ey - (ay - y0) * ex) / den;
  const u = ((ax - x0) * dy - (ay - y0) * dx) / den;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? t : null;
}

export function updateHome(dt, w) {
  world = w;
  if (!home) return;
  updateFurniture(dt, w);
  if (inside) {
    const p = w.player;
    const who = p.inVehicle || p;
    const { lx, lz } = toFlat(who.x, who.y);
    const f = home.flat;
    // moved off the flat by something else than the lift (a teleport, a vehicle)
    const away = lx < -1.5 || lx > f.w + 1.5 || lz < -1.5 || lz > f.d + 1.5;
    if (p.inVehicle || w.pigeonMode || away) dropFlat(w);
    else keepInFlat(dt, w);
  }
  tickT -= dt;
  if (tickT > 0) return;
  tickT = TICK_S;
  updateVehicles(w);
}

function homeDebug() {
  const st = storedEntries();
  return {
    inside: !!inside, front: [...front], where: Object.fromEntries(homeLayout(world, st).where),
    stored: Object.fromEntries(Object.entries(st).map(([k, l]) => [k, l.map((o) => o.key + (o.v ? '@' + (o.v.homeSlot || 'free') : ''))])),
    heroStored: !!(world && world.vehicles.find((v) => v.isHeroCar && v.homeStored)),
  };
}
