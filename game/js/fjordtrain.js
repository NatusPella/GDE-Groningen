import { hoofdspeler } from './players.js';
// H16 "Iedereen heeft een rode auto gezien": the goods train to Leeuwarden that Durk and Douwe
// load Tessa's Fjord onto. It waits on the line west of the Hoofdstation;
// the fleeing Fjord drives up onto the last flat (or is already on it when
// the chase clock runs out), the
// train leaves, and the player stops it by standing at the Peizerweg level
// crossing before it gets there (the driver sees the car and brakes). The
// train itself is a railway.js mission train; this module carries the car,
// paces the train (it never runs away from a player who is on the way) and
// reports the outcome to missions.js.
import { addMissionTrain, removeMissionTrain, clearTrackFor, getLevelCrossings, routePoint, placeTrain, railZ, FLAT_DECK_Z } from './railway.js';
import { playCinematic } from './cinematics.js';

const ROUTE = 'Stoptrein Leeuwarden';
const TAIL_S = 520;            // arc length of the train's tail: west of the station, past the rail's climb over the Emmaviaduct
const CROSSING_NEAR = [-1029.4, 1044.83]; // Peizerweg
const LOAD_SPEED = 6;
const RAMP = 5;
const DEPART_AFTER = 2.5;
const VMAX = 12, VMIN = 4.5;
const BLOCK_RADIUS = 10;
const STOP_SHORT = 14;         // the nose stops this far before the crossing

let ft = null;

function nearestS(route, x, y, s0, s1) {
  let best = s0, bd = Infinity;
  for (let s = s0; s <= s1; s += 2) {
    const [px, py] = routePoint(route, s);
    const d = (px - x) ** 2 + (py - y) ** 2;
    if (d < bd) { bd = d; best = s; }
  }
  return best;
}

function audio(world, ev) {
  const q = world.audioEvents || (world.audioEvents = []);
  if (q.length < 64) q.push(ev);
}

// The train, standing; null when the map has no Leeuwarden line.
export function spawnFjordTrain(world) {
  disposeFjordTrain(world);
  const t = addMissionTrain(ROUTE, 'goederen', TAIL_S, 1);
  if (!t) return null;
  t.c = TAIL_S + t.halfLen;
  placeTrain(t);
  let lc = null, bd = Infinity;
  for (const c of getLevelCrossings()) {
    const d = Math.hypot(c.x - CROSSING_NEAR[0], c.y - CROSSING_NEAR[1]);
    if (d < bd) { bd = d; lc = c; }
  }
  const cross = lc && bd < 60 ? { x: lc.x, y: lc.y } : (() => { const [x, y] = routePoint(t.route, 1158); return { x, y }; })();
  cross.s = nearestS(t.route, cross.x, cross.y, 700, 1600);
  clearTrackFor(t, TAIL_S - 20, cross.s + 40, world, 900);
  const [tx, ty] = routePoint(t.route, TAIL_S - 6);
  const road = world.map.nearestRoadPoint(tx, ty, 60, true, true);
  ft = { t, phase: 'wait', fjord: null, cross, blocked: false, load: road ? { x: road.x, y: road.y } : { x: tx, y: ty }, tailTrack: { x: tx, y: ty } };
  return ft;
}

export function fjordTrainState() { return ft; }

// Where the Fjord leaves the road for the ramp at the train's tail.
export function fjordLoadPoint() { return ft && ft.load; }
export function fjordCrossing() { return ft && ft.cross; }

function rearFlat() { return ft.t.cars[ft.t.cars.length - 1]; }

// The Fjord (still driven by Durk) rolls from where it is onto the last flat.
export function loadFjord(world, v) {
  if (!ft || ft.fjord) return false;
  v.onTrain = true;
  v.road = null;
  v.aiOpts = null;
  v.plan = [];
  v.speed = 0;
  v.driftX = 0; v.driftY = 0; v.yawVel = 0;
  v.chaseTarget = false;
  ft.fjord = v;
  ft.phase = 'load';
  ft.lt = 0;
  const car = rearFlat();
  ft.path = [{ x: v.x, y: v.y, z: v.z || 0 }, { x: ft.tailTrack.x, y: ft.tailTrack.y, z: railZ(ft.tailTrack.x, ft.tailTrack.y) }, { x: car.x, y: car.y, z: (car.z || 0) + FLAT_DECK_Z }];
  const L = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);
  ft.pathLen = [L(ft.path[0], ft.path[1]), L(ft.path[1], ft.path[2])];
  return true;
}

function carry(v, car) {
  v.x = car.x; v.y = car.y;
  v.z = (car.z || 0) + FLAT_DECK_Z;
  v.angle = car.angle;
  v.pitch = car.pitch || 0; v.roll = 0;
  v.speed = 0; v.vz = 0; v.vzG = 0; v.airborne = false;
  v.driftX = 0; v.driftY = 0; v.yawVel = 0;
}

function release(world, v, spot) {
  v.onTrain = false;
  if (spot) {
    v.x = spot.x; v.y = spot.y; v.z = 0; v.pitch = 0; v.roll = 0;
    if (spot.angle != null) v.angle = spot.angle;
  }
}

// A drivable street spot by the crossing, on the player's side of the track.
function unloadSpot(world) {
  const p = hoofdspeler(world), c = ft.cross;
  const t = ft.t;
  const [ax, ay] = routePoint(t.route, c.s - 3), [bx, by] = routePoint(t.route, c.s + 3);
  const ux = (bx - ax) / 6, uy = (by - ay) / 6;
  const side = Math.sign((p.x - c.x) * -uy + (p.y - c.y) * ux) || 1;
  const want = { x: c.x - uy * side * 16 - ux * 4, y: c.y + ux * side * 16 - uy * 4 };
  const r = world.map.nearestRoadPoint(want.x, want.y, 60, true, true);
  const at = r || want;
  let angle = Math.atan2(c.y - at.y, c.x - at.x) + Math.PI;
  if (r && r.road) {
    const P = r.road.pts;
    let bi = 0, bd2 = Infinity;
    for (let i = 0; i < P.length - 1; i++) {
      const mx = (P[i][0] + P[i + 1][0]) / 2, my = (P[i][1] + P[i + 1][1]) / 2;
      const d2 = (mx - at.x) ** 2 + (my - at.y) ** 2;
      if (d2 < bd2) { bd2 = d2; bi = i; }
    }
    const ra = Math.atan2(P[bi + 1][1] - P[bi][1], P[bi + 1][0] - P[bi][0]);
    angle = Math.cos(ra - angle) >= 0 ? ra : ra + Math.PI;
  }
  // not on top of the player's own car
  const pv = p.inVehicle;
  if (pv && Math.hypot(pv.x - at.x, pv.y - at.y) < 7) return { x: at.x + Math.cos(angle) * 9, y: at.y + Math.sin(angle) * 9, angle };
  return { x: at.x, y: at.y, angle };
}

function stopShot(world) {
  const t = ft.t, c = ft.cross;
  const nose = t.cars[0];
  const dx = c.x - nose.x, dy = c.y - nose.y, d = Math.hypot(dx, dy) || 1;
  const nx = -dy / d, ny = dx / d;
  const side = Math.sign((hoofdspeler(world).x - c.x) * nx + (hoofdspeler(world).y - c.y) * ny) || 1;
  return (u) => ({
    position: { x: nose.x + dx * 0.5 + nx * side * (15 - u * 3), y: nose.y + dy * 0.5 + ny * side * (15 - u * 3), z: 4.5 - u * 1.2 },
    lookAt: { x: nose.x - (dx / d) * 18, y: nose.y - (dy / d) * 18, z: 2 },
    fov: 48,
  });
}

// The Fjord rolls from the road over the track and up the ramp onto the flat.
function stepLoad(dt) {
  const v = ft.fjord;
  ft.lt += dt;
  const d = ft.lt * LOAD_SPEED;
  const [l0, l1] = ft.pathLen;
  const [a, b, c] = ft.path;
  let x, y, z, ang;
  if (d < l0) { const k = d / (l0 || 1); x = a.x + (b.x - a.x) * k; y = a.y + (b.y - a.y) * k; z = a.z + (b.z - a.z) * k; ang = Math.atan2(b.y - a.y, b.x - a.x); }
  else { const e = Math.min(l1, d - l0), k = e / (l1 || 1); x = b.x + (c.x - b.x) * k; y = b.y + (c.y - b.y) * k; z = b.z + (c.z - b.z) * Math.min(1, e / RAMP); ang = Math.atan2(c.y - b.y, c.x - b.x); }
  v.x = x; v.y = y; v.z = z; v.angle = ang; v.pitch = d >= l0 && d - l0 < RAMP ? Math.atan2(FLAT_DECK_Z, RAMP) : 0;
  v.speed = 0; v.airborne = false; v.vz = 0;
  if (d >= l0 + l1) { ft.phase = 'ride'; ft.rt = 0; carry(v, rearFlat()); }
}

// The chase ran out (or the Fjord got away): out of sight, Durk has driven
// it up the ramp already (the city around the train is not drawn from afar,
// so there is no cut to it).
export function loadFjordNow(world, v) {
  if (!ft || ft.fjord) return false;
  v.x = ft.load.x; v.y = ft.load.y; v.z = 0;
  if (!loadFjord(world, v)) return false;
  stepLoad(1e3);
  return true;
}

// Per frame while the mission runs. Returns 'caught' (the train stood still
// for the player; the Fjord is back on the street), 'taken' (the player got
// into the Fjord on the train), 'lost' (it went over the crossing) or null.
export function updateFjordTrain(dt, world) {
  if (!ft) return null;
  const t = ft.t, v = ft.fjord, p = hoofdspeler(world);
  if (v && v.onTrain && p.inVehicle === v) {
    // Tessa got in up there: down off the flat, beside the train
    const car = rearFlat();
    const nx = -Math.sin(car.angle), ny = Math.cos(car.angle);
    const side = Math.sign((p.x - car.x) * nx + (p.y - car.y) * ny) || 1;
    release(world, v, { x: car.x + nx * side * 4, y: car.y + ny * side * 4 });
    ft.phase = 'gone';
    return 'taken';
  }
  if (ft.phase === 'load') { stepLoad(dt); return null; }
  if (v && v.onTrain) carry(v, rearFlat());
  if (ft.phase === 'ride') {
    ft.rt += dt;
    if (ft.rt >= DEPART_AFTER) {
      ft.phase = 'go';
      audio(world, { kind: 'train_horn', x: t.cars[0].x, y: t.cars[0].y });
    }
    return null;
  }
  if (ft.phase !== 'go' && ft.phase !== 'braking') return null;
  const c = ft.cross;
  const nose = t.c + t.halfLen;
  const toCross = c.s - nose;
  if (!ft.blocked) {
    // it never runs away from a player on the way: the pace leaves time to get there
    const pd = Math.hypot(p.x - c.x, p.y - c.y);
    const eta = pd / 15 + 6;
    t.ctl.vWant = Math.max(VMIN, Math.min(VMAX, (toCross - STOP_SHORT) / eta));
    const pv = p.inVehicle;
    const still = pv ? Math.abs(pv.speed) < 3 : true;
    if (pd < BLOCK_RADIUS && still && toCross > 2) {
      ft.blocked = true;
      ft.phase = 'braking';
      const room = Math.max(1, toCross - 5);
      t.ctl.stopAt = c.s - Math.min(STOP_SHORT, room - 1);
      t.ctl.brake = Math.max(2.2, (t.v * t.v) / (2 * room));
      audio(world, { kind: 'train_horn', x: t.cars[0].x, y: t.cars[0].y });
      world.addMessage('De machinist ziet je staan en gaat vol in de remmen!', 3.5);
    }
    if (toCross < -4) return 'lost';
    return null;
  }
  if (t.v > 0.05) return null;
  // stood still: Durk and Douwe leg it, the Fjord goes back on the street
  if (v && v.onTrain) release(world, v, unloadSpot(world));
  ft.phase = 'stopped';
  playCinematic({ id: 'fjord-train', priority: 3, duration: 3.2, pause: true, letterbox: true, skippable: true, hideHud: true, shot: stopShot(world) });
  return 'caught';
}

// The empty train goes on to Leeuwarden when the Fjord never got on it.
export function sendFjordTrainAway() {
  if (!ft || ft.fjord) return;
  ft.phase = 'away';
  ft.t.ctl.vWant = VMAX;
  ft.t.ctl.stopAt = null;
}

// Test/skip hook: the train stops here and now, the Fjord is back on the street.
export function catchFjordTrainNow(world) {
  if (!ft) return null;
  const v = ft.fjord;
  ft.t.v = 0;
  ft.t.ctl.vWant = 0;
  ft.blocked = true;
  ft.phase = 'stopped';
  if (v && v.onTrain) release(world, v, unloadSpot(world));
  return v;
}

export function disposeFjordTrain(world) {
  if (!ft) return;
  const v = ft.fjord;
  if (v && v.onTrain) {
    const r = world && world.map.nearestRoadPoint(v.x, v.y, 80, true, true);
    release(world, v, r ? { x: r.x, y: r.y } : { x: v.x, y: v.y });
  }
  removeMissionTrain(ft.t);
  ft = null;
}

