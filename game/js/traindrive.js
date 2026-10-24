// Stealing a train: board a stopped train at the cab end (E), drive it along
// its own line with throttle and brake, get off again once it stands still.
// The physics live in railway.js (state 'player'); this file handles the
// boarding, the controls, keeping the (hidden) player in the cab and the
// camera/speedo proxy world.trainCam that scene3d.js and hud_panel.js read.
import { getTrains, routePoint, railZ, isOffMap, hijackTrain, parkTrain } from './railway.js';
import { isCinematicActive } from './cinematics.js';
import { isShopOpen } from './shopui.js';
import { isInWater } from './util.js';
import { stationPrompt } from './stationtravel.js';
import { updateMachinist, endService, doorsAreOpen, deadmanHit } from './machinist.js';
import { newCab, stepCab, cabCtl } from './treincabine.js';

const BOARD_RANGE = 6.5;
const EXIT_MAX_SPEED = 2;
const HORN_COOLDOWN = 1.2;
const STEAL_STARS = 2;

let hookedWorld = null;
let hornAt = -Infinity;
let cab = newCab(); // de tractiehendel en de waakzaamheid (treincabine.js)
const INTRO_S = 16;

function hook(world) {
  if (hookedWorld === world) return;
  hookedWorld = world;
  world.onRespawn.push((w) => { if (w.trainDriving) stopDriving(w, false); });
}

function cabCar(t) {
  return t.cab > 0 ? t.cars[0] : t.cars[t.cars.length - 1];
}

function facingOf(t) {
  const car = cabCar(t);
  return t.cab > 0 ? car.angle : car.angle + Math.PI;
}

// A stopped (or abandoned) train whose cab end the player stands next to.
function boardable(world) {
  const p = world.player;
  if (world.trainDriving || p.inVehicle || p.swimming || p.water || p.ragdoll || world.pigeonMode) return null;
  // at the ticket machine E buys a ticket, not a train
  if (stationPrompt(world)) return null;
  let best = null, bd = BOARD_RANGE;
  for (const t of getTrains()) {
    if (t.state !== 'dwell' && t.state !== 'parked') continue;
    if (t.state === 'dwell' && t.route.stops[t.target].offmap) continue;
    for (const end of [1, -1]) {
      const [x, y] = routePoint(t.route, t.c + end * (t.halfLen - 3));
      if (isOffMap(x, y, -20)) continue;
      if (Math.abs(railZ(x, y) - ((p.gz || 0) + (p.z || 0))) > 2.5) continue;
      const d = Math.hypot(x - p.x, y - p.y);
      if (d < bd) { bd = d; best = { t, cab: end, x, y }; }
    }
  }
  return best;
}

export function trainPrompt(world) {
  const t = world.trainDriving;
  if (t) {
    const car = cabCar(t);
    const slow = t.v < EXIT_MAX_SPEED;
    return {
      id: 'trein-rijden', x: car.x, y: car.y, h: t.cfg.height + 0.8, key: 'E', label: 'Uitstappen',
      sub: slow ? 'W/S hendel, O deuren, G dienst rijden' : 'Eerst stoppen: S remt, Spatie is de noodrem', ring: true, dim: !slow,
    };
  }
  const b = boardable(world);
  if (!b) return null;
  const parked = b.t.state === 'parked';
  return {
    id: 'trein-kapen', x: b.x, y: b.y, h: b.t.cfg.height + 0.6, key: 'E', label: parked ? 'Instappen' : 'Trein kapen',
    sub: parked ? 'Daarna G: de dienst rijden, of rij zelf verder' : `${b.t.cfg.label} stelen (twee sterren). Daarna G: de dienst rijden`, ring: true,
  };
}

// Runs before the other E handlers (main.js).
export function tryTrainInteract(world) {
  const input = world.input;
  if (!input || isShopOpen() || isCinematicActive()) return false;
  if (!(input.wasPressed('e') || input.wasPressed('f'))) return false;
  hook(world);
  if (world.trainDriving) {
    input.consume('e');
    input.consume('f');
    if (world.trainDriving.v < EXIT_MAX_SPEED) stopDriving(world, true);
    else world.addMessage('Eerst stoppen voordat je uitstapt', 2);
    return true;
  }
  const b = boardable(world);
  if (!b) return false;
  input.consume('e');
  input.consume('f');
  board(world, b);
  return true;
}

function board(world, { t, cab: cab_ }) {
  const fresh = t.state !== 'parked';
  hijackTrain(t, cab_);
  world.trainDriving = t;
  cab = newCab();
  cab.introUntil = world.time + INTRO_S;
  const p = world.player;
  p.vx = 0; p.vy = 0; p.moving = false; p.crouching = false; p.vault = null;
  syncRider(world);
  const q = world.audioEvents || (world.audioEvents = []);
  q.push({ kind: 'train_horn', x: p.x, y: p.y });
  if (fresh) {
    world.wanted = Math.max(world.wanted, STEAL_STARS);
    world.wantedDecayTimer = 0;
    world.trainSteal = STEAL_STARS; // G (de dienst rijden) maakt van de dief een machinist (machinist.js, #424)
    world.addMessage('Trein gekaapt! Druk G: dan rijd je de dienst en is het geregeld', 4);
  } else world.addMessage('Weer aan de knoppen', 2);
}

// A loaded save ends a train drive where it is (savegame.js).
export function quitTrainDrive(world) {
  if (world.trainDriving) stopDriving(world, false);
}

function stopDriving(world, placeOutside) {
  const t = world.trainDriving;
  world.trainDriving = null;
  world.trainCam = null;
  world.trainSteal = 0;
  endService(world);
  if (!t) return;
  const car = cabCar(t);
  if (t.state === 'player') parkTrain(t);
  if (!placeOutside) return;
  const p = world.player, map = world.map;
  const back = Math.cos(facingOf(t)) * 3, backY = Math.sin(facingOf(t)) * 3;
  let spot = null;
  for (const side of [1, -1]) {
    for (const off of [3.4, 4.5, 6]) {
      const nx = -Math.sin(car.angle) * side * off, ny = Math.cos(car.angle) * side * off;
      const qx = car.x - back + nx, qy = car.y - backY + ny;
      const [sx, sy] = map.escapeBuilding(qx, qy, 0.4);
      if (Math.hypot(sx - qx, sy - qy) > 0.3 || isInWater(map, sx, sy)) continue;
      spot = { x: sx, y: sy, side };
      break;
    }
    if (spot) break;
  }
  if (!spot) spot = { x: car.x - Math.sin(car.angle) * 3.4, y: car.y + Math.cos(car.angle) * 3.4, side: 1 };
  p.x = spot.x; p.y = spot.y;
  p.angle = car.angle + spot.side * Math.PI / 2;
  p.vx = 0; p.vy = 0; p.z = 0; p.vz = 0;
  p.gz = map.elev && map.elev.has ? map.groundHeightAt(p.x, p.y, 0) : 0;
  world.camYaw = facingOf(t);
  const c = world.companion;
  if (c && c.state !== 'dead' && !c.inVehicle) {
    const a = facingOf(t);
    const [cx, cy] = map.escapeBuilding(p.x - Math.cos(a) * 1.1, p.y - Math.sin(a) * 1.1, 0.3);
    c.x = cx; c.y = cy; c.vx = 0; c.vy = 0; c.z = 0; c.vz = 0; c.gz = p.gz; c.angle = p.angle;
  }
  if (world.input) world.input.reset();
}

// Keeps the player (hidden) in the cab and the camera proxy up to date.
function syncRider(world) {
  const t = world.trainDriving;
  const p = world.player;
  const car = cabCar(t);
  const a = facingOf(t);
  p.x = car.x + Math.cos(a) * car.len * 0.2;
  p.y = car.y + Math.sin(a) * car.len * 0.2;
  p.angle = a;
  const [tx, ty] = routePoint(t.route, t.c + 1);
  const [bx, by] = routePoint(t.route, t.c - 1);
  const tl = Math.hypot(tx - bx, ty - by) || 1;
  p.vx = (tx - bx) / tl * (t.pv || 0);
  p.vy = (ty - by) / tl * (t.pv || 0);
  p.z = 0; p.vz = 0;
  p.gz = car.z || 0;
  p.moving = false;
  const c = world.companion;
  if (c && c.state !== 'dead' && !c.inVehicle) { c.x = p.x; c.y = p.y; c.vx = 0; c.vy = 0; }
  const cam = world.trainCam || (world.trainCam = { angle: 0, speed: 0, z: 0, model: { len: 9, wid: 3 } });
  cam.angle = a;
  cam.speed = (t.pv || 0) * t.cab;
  cam.z = (car.z || 0) + t.cfg.height * 0.75;
}

// Replaces player.update while driving; false when not on a train.
export function updateTrainDriving(dt, world) {
  const t = world.trainDriving;
  if (!t) return false;
  if (t.state !== 'player' || world.pendingRespawn || world.health <= 0) {
    stopDriving(world, false);
    return false;
  }
  const input = world.input;
  // tractiehendel: W en S (pijlen, trekker en rem van het pad) schuiven hem een stand; K is de waakzaamheidsknop
  const evs = stepCab(cab, dt, {
    up: input.isDown('w') || input.isDown('arrowup'), down: input.isDown('s') || input.isDown('arrowdown'),
    upP: input.wasPressed('w') || input.wasPressed('arrowup'), downP: input.wasPressed('s') || input.wasPressed('arrowdown'),
    ack: input.wasPressed('k'), doorsOpen: doorsAreOpen(world),
  }, t.v);
  if (input.wasPressed('k')) input.consume('k');
  for (const e of evs) {
    if (e.kind === 'hendel') cab.since = 1;
    else if (e.kind === 'waak-vraag') world.addMessage('Waakzaamheid: druk K', 3);
    else if (e.kind === 'waak-rem') { world.addMessage('Waakzaamheidsrem: de trein remt vanzelf', 3.5); deadmanHit(world); }
  }
  Object.assign(t.ctl, cabCtl(cab, input.isDown(' ')));
  t.ctl.throttle = t.ctl.power > 0;
  t.ctl.brake = t.ctl.brakeF > 0;
  if (input.wasPressed('h') && world.time - hornAt > HORN_COOLDOWN) {
    hornAt = world.time;
    const car = cabCar(t);
    const q = world.audioEvents || (world.audioEvents = []);
    q.push({ kind: 'train_horn', x: car.x, y: car.y });
  }
  updateMachinist(dt, world, t, cab);
  syncRider(world);
  return true;
}
