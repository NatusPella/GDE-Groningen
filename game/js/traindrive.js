// Stealing a train: board a stopped train at the cab end (E), drive it along
// its own line with throttle and brake, get off again once it stands still.
// The physics live in railway.js (state 'player'); this file handles the
// boarding, the controls, keeping the (hidden) player in the cab and the
// camera/speedo proxy world.trainCam that scene3d.js and hud_panel.js read.
import { getTrains, routePoint, railZ, isOffMap, hijackTrain, parkTrain } from './railway.js';
import { treinStop } from './cooptrein.js'; // de gasten die als passagier meerijden (#492)
import { isCinematicActive } from './cinematics.js';
import { isShopOpen } from './shopui.js';
import { isInWater } from './util.js';
import { stationPrompt } from './stationtravel.js';
import { updateMachinist, endService, doorsAreOpen, deadmanHit, serviceRunning, getService } from './machinist.js';
import { newCab, stepCab, cabCtl } from './treincabine.js';
import { trainLayout, hasInterior, carPoint, walkMove, driverEye, cabDoorSpot, inCabZone, doorNear, WALK_SPEED } from './treinlayout.js';
import { uitslagUitPunten } from './simdienst.js';
import { currentStation } from './stationlife.js';
import { perronStop, isKaartjesknipper } from './kaartjescontrole.js';

const WALK_YAW_RATE = 1.8;   // rad/s met de pijltjes links en rechts
const MOUSE_YAW = 0.0025;    // rad per pixel, zoals de volgcamera
const DOOR_STAND_V = 0.5;    // m/s: harder dan dit gaat er geen deur open om uit te stappen

const BOARD_RANGE = 6.5;
const EXIT_MAX_SPEED = 2;
const HORN_COOLDOWN = 1.2;
const STEAL_STARS = 2;
// Het paneel van de trein (het kaartje met E) hoort bij de deur, niet hoog boven het dak: prompts.js zet het op
// (x, h, y) in de wereld, dus op deurhoogte boven het spoor, zoals bij een auto (1,2 tot 1,7 m). Stond het op
// cfg.height + 0,6, dan hing het midden op het perron in de lucht (#436).
const PANEEL_H = 1.7;

let hookedWorld = null;
let hornAt = -Infinity;
let cab = newCab(); // de tractiehendel en de waakzaamheid (treincabine.js)
const INTRO_S = 16;
let insideCam = false; // C: de ogen van de machinist in de cabine in plaats van de volgcamera

// Alleen lezen, voor de spelbot en de tests: de hendel en de waakzaamheid van dit moment.
export const getCab = () => cab;

function hook(world) {
  if (hookedWorld === world) return;
  hookedWorld = world;
  world.onRespawn.push((w) => { if (w.trainDriving) stopDriving(w, false); });
}

function cabCar(t) {
  return t.cab > 0 ? t.cars[0] : t.cars[t.cars.length - 1];
}

const cabIndex = (t) => (t.cab > 0 ? 0 : t.cars.length - 1);

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
  if (t && world.trainWalk) {
    const walk = world.trainWalk, cl = trainLayout(t.cfg)[walk.car], car = t.cars[walk.car];
    const door = doorNear(cl, walk.lx, walk.lz);
    if (door) {
      const ok = t.v < DOOR_STAND_V && t.doorsOpen;
      // bij een open deur op een perron zegt de tip meteen wat je als Kaartjesknipper kunt doen (#437)
      const knip = ok && isKaartjesknipper() && !!perronStop(t, currentStation(), world.time);
      return { id: 'trein-rijden', x: car.x, y: car.y, h: (car.z || 0) + PANEEL_H, key: 'E', label: 'Uitstappen', sub: ok ? (knip ? 'De deuren staan open: controleer de kaartjes op het perron' : 'De deuren staan open') : t.v >= DOOR_STAND_V ? 'Wacht tot de trein stilstaat' : 'De deuren zijn dicht: druk O', ring: true, dim: !ok };
    }
    if (walk.car === cabIndex(t) && Math.abs(walk.lx - cl.bulkhead) < 1.6) return { id: 'trein-cabine', x: car.x, y: car.y, h: (car.z || 0) + PANEEL_H, key: 'T', label: 'Naar de cabine', sub: 'Aan de knoppen', ring: true };
    return null;
  }
  if (t) {
    const car = cabCar(t);
    const slow = t.v < EXIT_MAX_SPEED;
    return {
      id: 'trein-rijden', x: car.x, y: car.y, h: (car.z || 0) + PANEEL_H, key: 'E', label: 'Uitstappen',
      sub: slow ? 'W/S hendel, O deuren, G dienst rijden' : 'Eerst stoppen: S remt, Spatie is de noodrem', ring: true, dim: !slow,
    };
  }
  const b = boardable(world);
  if (!b) return null;
  const parked = b.t.state === 'parked';
  return {
    id: 'trein-kapen', x: b.x, y: b.y, h: railZ(b.x, b.y) + PANEEL_H, key: 'E', label: parked ? 'Instappen' : 'Trein kapen',
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
    const walk = world.trainWalk;
    if (walk) {
      // rondlopend stap je uit bij een deur van de wagen waar je staat, en alleen als de trein stilstaat
      const t = world.trainDriving;
      const door = doorNear(trainLayout(t.cfg)[walk.car], walk.lx, walk.lz);
      if (!door) world.addMessage('Loop naar een deur om uit te stappen', 2);
      else if (t.v >= DOOR_STAND_V || !t.doorsOpen) world.addMessage(t.v >= DOOR_STAND_V ? 'Wacht tot de trein stilstaat' : 'De deuren zijn dicht: druk O', 2);
      else stopDriving(world, true, walk.car, door.side);
    } else if (world.trainDriving.v < EXIT_MAX_SPEED) stopDriving(world, true);
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
  cab.look = { yaw: 0, pitch: 0 };
  insideCam = false;
  world.trainWalk = null;
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

// fromCar: de wagen waaruit de speler stapt (een deur van een andere wagen dan de cabine), met de voorkeurskant.
function stopDriving(world, placeOutside, fromCar = null, prefSide = 1) {
  const t = world.trainDriving;
  // sta je stil bij een perron, dan onthoudt de kaartjescontrole dat: een ronde daar is een conducteursronde met
  // bonus, zo hangt het kaartjes knippen aan het stoppen met de trein (#437)
  const stop = perronStop(t, currentStation(), world.time);
  if (stop) world.perronStop = stop;
  treinStop(world, t); // een gast die als passagier meerijdt staat daarna weer naast zijn wagen (#492)
  world.trainDriving = null;
  world.trainCam = null;
  world.trainWalk = null;
  world.trainSteal = 0;
  endService(world);
  if (!t) return;
  t.doorsOpen = false;
  const car = fromCar != null ? t.cars[fromCar] : cabCar(t);
  if (t.state === 'player') parkTrain(t);
  if (!placeOutside) return;
  const p = world.player, map = world.map;
  const back = fromCar != null ? 0 : Math.cos(facingOf(t)) * 3, backY = fromCar != null ? 0 : Math.sin(facingOf(t)) * 3;
  let spot = null;
  for (const side of [prefSide, -prefSide]) {
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
  const walk = world.trainWalk;
  if (walk) {
    // rondlopen: de speler staat op de vloer van zijn wagen en beweegt mee
    const wc = t.cars[walk.car], pt = carPoint(wc, walk.lx, walk.lz);
    p.x = pt.x; p.y = pt.y;
    p.angle = wc.angle + walk.yaw;
  } else {
    p.x = car.x + Math.cos(a) * car.len * 0.2;
    p.y = car.y + Math.sin(a) * car.len * 0.2;
    p.angle = a;
  }
  const [tx, ty] = routePoint(t.route, t.c + 1);
  const [bx, by] = routePoint(t.route, t.c - 1);
  const tl = Math.hypot(tx - bx, ty - by) || 1;
  p.vx = (tx - bx) / tl * (t.pv || 0);
  p.vy = (ty - by) / tl * (t.pv || 0);
  p.z = 0; p.vz = 0;
  p.gz = car.z || 0;
  p.moving = false;
  const c = world.companion;
  if (c && c.state !== 'dead' && !c.inVehicle && !c.coopTrein) { c.x = p.x; c.y = p.y; c.vx = 0; c.vy = 0; }
  const cam = world.trainCam || (world.trainCam = { angle: 0, speed: 0, z: 0, model: { len: 9, wid: 3 } });
  cam.angle = a;
  cam.speed = (t.pv || 0) * t.cab;
  cam.z = (car.z || 0) + t.cfg.height * 0.75;
  cam.inside = !!(walk || (insideCam && hasInterior(t.cfg)));
  cam.eye = cam.inside ? eyePose(world, t) : null;
}

// De camera binnen (scene3d.js applyCameraOverride): de ogen van de machinist, of van de speler die rondloopt.
function eyePose(world, t) {
  const layout = trainLayout(t.cfg);
  const walk = world.trainWalk;
  let car, local, yaw, pitch;
  if (walk) {
    car = t.cars[walk.car];
    local = { x: walk.lx, y: layout[walk.car].floorY + 1.62, z: walk.lz };
    yaw = walk.yaw; pitch = walk.pitch || 0;
  } else {
    const i = cabIndex(t);
    car = t.cars[i];
    local = driverEye(layout[i]);
    yaw = (t.cab > 0 ? 0 : Math.PI) + cab.look.yaw; pitch = cab.look.pitch;
  }
  const at = carPoint(car, local.x, local.z), h = (car.z || 0) + local.y;
  const hd = car.angle + yaw, cp = Math.cos(pitch);
  return {
    position: { x: at.x, y: at.y, z: h },
    lookAt: { x: at.x + Math.cos(hd) * cp * 10, y: at.y + Math.sin(hd) * cp * 10, z: h + Math.sin(pitch) * 10 },
    fov: 72, cut: true, interior: true,
  };
}

// Rondlopen in de trein (T): de speler staat op, de trein rijdt door. Zonder dienst remt hij zachtjes af.
function startWalk(world, t) {
  if (!hasInterior(t.cfg)) { world.addMessage('In deze trein kun je niet rondlopen', 2); return; }
  const i = cabIndex(t), cl = trainLayout(t.cfg)[i], spot = cabDoorSpot(cl);
  world.trainWalk = { car: i, lx: spot.x, lz: spot.z, yaw: t.cab > 0 ? Math.PI : 0, pitch: 0 };
  cab.dm = 0; cab.warn = false;
  world.addMessage('Je staat op: lopen met WASD, T naar de cabine, E bij open deur', 3.5);
}

function stopWalk(world) {
  world.trainWalk = null;
  cab.dm = 0; cab.warn = false;
  world.addMessage('Weer aan de knoppen', 2);
}

function updateWalk(dt, world, t, input) {
  const walk = world.trainWalk, layout = trainLayout(t.cfg);
  const mouse = input.mouse;
  const looking = input.lookActive ? input.lookActive() : mouse.locked;
  if (looking) {
    walk.yaw += mouse.dx * MOUSE_YAW;
    walk.pitch = Math.max(-0.9, Math.min(0.9, (walk.pitch || 0) + mouse.dy * MOUSE_YAW * 0.8));
  }
  walk.yaw += ((input.isDown('arrowright') ? 1 : 0) - (input.isDown('arrowleft') ? 1 : 0)) * WALK_YAW_RATE * dt;
  const fwd = (input.isDown('w') || input.isDown('arrowup') ? 1 : 0) - (input.isDown('s') || input.isDown('arrowdown') ? 1 : 0);
  const str = (input.isDown('a') ? 1 : 0) - (input.isDown('d') ? 1 : 0); // links is +
  const sp = WALK_SPEED * (fwd && str ? 0.72 : 1) * dt;
  const c = Math.cos(walk.yaw), s = Math.sin(walk.yaw);
  walkMove(layout, walk, (c * fwd - s * str) * sp, (s * fwd + c * str) * sp);
  // zonder dienst remt de trein zachtjes af, zodat je niet op een leeg spoor doorrijdt; met een dienst blijft de hendel staan
  if (!doorsAreOpen(world) && !serviceRunning() && cab.lever > -1) cab.lever = -1;
  cab.look.yaw = 0; cab.look.pitch = 0;
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
  if (input.wasPressed('t')) {
    input.consume('t');
    if (!world.trainWalk) startWalk(world, t);
    else {
      const wc = trainLayout(t.cfg)[world.trainWalk.car];
      if (world.trainWalk.car === cabIndex(t) && Math.abs(world.trainWalk.lx - wc.bulkhead) < 1.6) stopWalk(world);
      else world.addMessage('Loop terug naar de cabinewagen om weer te rijden', 2.5);
    }
  }
  if (input.wasPressed('c') && !world.trainWalk) { input.consume('c'); insideCam = !insideCam; }
  if (world.trainWalk) {
    // de speler loopt rond: de hendel en de waakzaamheid blijven zoals ze waren (zonder dienst remt de trein af)
    updateWalk(dt, world, t, input);
    stepCab(cab, dt, { doorsOpen: doorsAreOpen(world) }, 0);
    Object.assign(t.ctl, cabCtl(cab, false));
    t.ctl.throttle = t.ctl.power > 0;
    t.ctl.brake = t.ctl.brakeF > 0;
    updateMachinist(dt, world, t, cab);
    syncRider(world);
    return true;
  }
  // mouse look in the cab view
  if (insideCam) {
    const looking = input.lookActive ? input.lookActive() : input.mouse.locked;
    if (looking) {
      cab.look.yaw = Math.max(-1.6, Math.min(1.6, cab.look.yaw + input.mouse.dx * MOUSE_YAW));
      cab.look.pitch = Math.max(-0.6, Math.min(0.6, cab.look.pitch + input.mouse.dy * MOUSE_YAW * 0.8));
    } else { cab.look.yaw *= Math.exp(-dt * 1.5); cab.look.pitch *= Math.exp(-dt * 1.5); }
  }
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

// --- de trein in de gedeelde dienstvorm (#444) -------------------------------------------
// De regels (dienstregeling, snelheidsborden, seinen, overwegen, de veiligheid) staan in
// machinistrules.js; dit is dezelfde vorm als bij bus, vliegtuig en schip (simdienst.js), zodat
// de HUD en het loopbaanscherm elke sim gelijk lezen. Alleen lezen, geen nieuw gedrag.
export function treinVoortgang(svc) {
  if (!svc || !svc.plan.length) return svc && svc.finished ? 1 : 0;
  return svc.finished ? 1 : Math.max(0, Math.min(1, svc.i / svc.plan.length));
}

// De uitslag van een dienst (machinistrules.js result) in de gedeelde vorm. De punten zijn de
// score van de dienst; de cijfers voor punctualiteit, comfort en veiligheid gaan mee.
export function treinUitslag(r, abandoned = false) {
  if (!r) return null;
  return uitslagUitPunten('trein', r.score, {
    naam: 'Machinist', gehaald: r.made, totaal: r.stops, punctueel: r.punct, veilig: r.veilig,
    comfort: r.comfort, fouten: r.faults, zonderFouten: !!r.faultless,
    medaille: r.medal, // de medaille van machinistrules.js (eigen drempels) blijft de echte
    klaar: !abandoned, afgebroken: !!abandoned, mislukt: null,
  });
}

// De stand van de dienst van deze trein: null als er geen dienst loopt of net klaar is.
export function treinDienst(world) {
  const svc = getService();
  if (!svc) return null;
  const st = svc.finished ? null : svc.plan[svc.i];
  return {
    vervoer: 'trein', naam: 'Machinist', voortgang: treinVoortgang(svc),
    volgende: st ? st.name : null, gehaald: svc.i, totaal: svc.plan.length,
    vertraging: st && world && Number.isFinite(world.time) ? Math.round(world.time - st.due) : null,
    klaar: !!svc.finished, afgebroken: !!svc.abandoned,
    uitslag: svc.result ? treinUitslag(svc.result, svc.abandoned) : null,
  };
}
