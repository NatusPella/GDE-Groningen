import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { seatPose, SEAT_CONTACT, SEAT_CAR, blendSeatPose, standBehindPose, supPose, waveOverlay, carryOverlay, animatePersonWalk, buildPersonMesh, PERSON_RIG } from './models3d_people.js';
import { boatSeats, boatCrewCount, boatKind } from './boattypes.js';
import { busInterieur, midibusInterieur, coopPlek, VLOER } from './businterieur.js';
import { WATER_Y } from './util.js';
import { tractorCab } from './models3d_vehicles.js';
import { hash2 as hash } from './rng.js';
import { deurVoorStoel, instapKant, doorsFor, stapAnimatieAan } from './vehicledoors.js';
import { getSettings } from './settings.js';

// Where people sit in and on vehicles, and the short enter/exit animations
// (walk to the door, sit down; swing a leg over a bike; a carjack yank),
// all purely visual: gameplay has already moved the actor in or out.
// Seats are vehicle-local (+x forward, +z right, y = seat top above the
// vehicle origin); placement goes through the vehicle mesh's own matrix so
// people ride along with the boat swell and the car pitch exactly.

const _v = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _qy = new THREE.Quaternion();
const _qa = new THREE.Quaternion();
const _up = new THREE.Vector3(0, 1, 0);
const _m = new THREE.Matrix4();

function carKind(v) {
  if (v.isBus) return 'bus';
  const n = v.model.name;
  if (n === 'truck') return 'truck';
  if (n === 'trekkerlimo' || n === 'tractor') return 'trekker';
  if (n === 'quad') return 'quad';
  if (v.isAmbulance || n === 'foodtruck' || n === 'cashvan') return 'van';
  if (v.isHeroCar) return 'escort';
  if (v.isPolice) return 'wagon';
  return n === 'sedan' || n === 'wagon' || n === 'van' || n === 'sport' || n === 'suv' ? n : 'hatch';
}

// Cushion height and posture per car body: feet stay above the sill (0.3)
// so no shoe pokes out under the car, heads stay under the roof glass.
// Truck, tractor and bus drivers sit high, on the cab or deck floor behind
// the solid lower panels, with the head in the window band.
const VAN_POSE = { recline: 0.1, footX: 0.5, footY: -0.33, arms: 'lap' };
const CAR_SEATS = {
  hatch: { y: 0.38, pose: SEAT_CAR },
  sport: { y: 0.3, pose: { recline: 0.42, footX: 0.8, footY: -0.02, arms: 'lap' } },
  suv: { y: 0.66, pose: { recline: 0.18, footX: 0.66, footY: -0.18, arms: 'lap' } },
  van: { y: 0.72, pose: VAN_POSE },
  truck: { y: 1.47, pose: VAN_POSE },
  trekker: { y: 1.36, pose: { recline: 0.06, footX: 0.46, footY: -0.4, arms: 'lap' } },
  quad: { y: 0.92, pose: { recline: -0.08, footX: 0.3, footY: -0.5, splay: 0.3, arms: 'lap' } },
  bus: { y: 1.5, pose: { recline: 0.08, footX: 0.45, footY: -0.33, arms: 'lap' } },
};

// the farm tractor's cushion above its cab floor (models3d_vehicles.js tractorCab)
const TRACTOR_SEAT_UP = 0.55;

const seatCache = new WeakMap();

// Seat for the driver (driver = true) or the passenger of v.
export function vehicleSeat(v, driver) {
  let c = seatCache.get(v);
  const key = (v.model.kind || v.model.name) + '|' + v.model.len;
  if (!c || c.key !== key) {
    c = { key, driver: null, passenger: null };
    seatCache.set(v, c);
  }
  const slot = driver ? 'driver' : 'passenger';
  if (c[slot]) return c[slot];
  let seat;
  if (v.isBoat) {
    const s = boatSeats(v);
    seat = driver ? s[0] : s[1] || { ...s[0], x: s[0].x + 0.6 };
  } else if (v.isBike || v.isScooter) {
    seat = driver ? bikeRiderSeat(v) : bikeBuddySeat(v);
  } else if (v.isHeli) {
    // the pilot on the right, like in a real helicopter
    seat = { x: 0.62, z: driver ? 0.4 : -0.4, y: 0.98, face: 0, pose: driver ? { ...SEAT_CAR, arms: 'wheel' } : SEAT_CAR };
  } else {
    const hl = v.model.len / 2, hw = v.model.wid / 2;
    const k = carKind(v);
    const spec = CAR_SEATS[k] || CAR_SEATS.hatch;
    let x = -hl * 0.06, y = spec.y, z = (driver ? -1 : 1) * hw * 0.34;
    if (k === 'bus') { x = driver ? hl - 1.0 : hl - 1.9; z = driver ? -hw * 0.45 : hw * 0.3; }
    else if (k === 'van') x = hl - 1.45;
    else if (k === 'truck') { x = hl - 1.0; z = (driver ? -1 : 1) * hw * 0.45; }
    else if (k === 'trekker') {
      // one tractor seat in the middle of the cab, a buddy seat beside it
      if (v.model.name === 'tractor') {
        const cab = tractorCab(v.model.len);
        x = (cab.x0 + cab.x1) / 2 + (driver ? -0.05 : 0.2);
        y = cab.floor + TRACTOR_SEAT_UP;
      } else x = driver ? hl - 1.78 : hl - 1.55;
      z = driver ? -0.1 : 0.5;
      if (!driver) y -= 0.12;
    } else if (k === 'quad') {
      // astride the saddle; a passenger on the rear rack behind
      x = driver ? -0.2 : -0.62;
      z = 0;
      if (!driver) y += 0.02;
    }
    seat = { x, z, y, face: 0, pose: driver ? { ...spec.pose, arms: 'wheel' } : spec.pose };
  }
  // de rol van de stoel: de deur die erbij hoort (vehicledoors.js deurVoorStoel, #459)
  if (!seat.role) seat.role = driver ? 'bestuurder' : 'bijrijder';
  c[slot] = seat;
  return seat;
}

// De bank achter de voorstoelen van een auto, busje of vrachtwagen (#434): `achter` is hoe ver de zitruimte
// naar achteren doorloopt (vanaf het midden), `stap` de afstand achter de voorstoel. Zo blijft een passagier
// binnen de carrosserie: geen hoofd door het dak en geen knie door de achterklep.
const ACHTERBANK = {
  hatch: { achter: 1.0 }, sedan: { achter: 1.25 }, wagon: { achter: 0.8 }, sport: { achter: 1.05 },
  suv: { achter: 1.0 }, escort: { achter: 0.95 }, van: { achter: 1.9, stap: 0.5 }, truck: { achter: 1.9, stap: 0.75 },
  quad: { achter: 0.45, stap: 0.7 }, trekker: { achter: 0.9 },
};

// Waar de zoveelste zitter in een voertuig zit (#434): 0 de bestuurder, 1 de bijrijder, 2 en hoger de
// passagiers. Elke plek komt uit de indeling die het spel al heeft: de stoelen van boattypes.js (met de pose
// van die plek, zodat een roeier roeit en een SUP'er peddelt), de passagiersruimte van de stadsbus en de
// midibus (businterieur.js), en anders de bank achter de voorstoelen, binnen de carrosserie.
export function vehicleSeatAt(v, stoel = 0) {
  const n = Math.max(0, stoel | 0);
  if (n <= 1) return vehicleSeat(v, n === 0);
  if (v.isBoat) { // de echte stoelen van deze boot, met de houding die erbij hoort (peddelen, roeien, tiller)
    const s = boatSeats(v), p = s[Math.min(n, s.length - 1)] || s[0];
    return { ...p, role: 'achter' };
  }
  if (v.isBus && v.model) { // in de passagiersruimte, op een stoel of een staanplaats (businterieur.js)
    const layout = v.model.name === 'midibus' ? midibusInterieur(v.model.len, v.model.wid) : busInterieur(v.model.len, v.model.wid, { trailer: v.model.trailer || 0 });
    const p = coopPlek(layout, n), s = vehicleSeat(v, false);
    if (p) return p.soort === 'zit' ? { ...s, x: p.x, y: VLOER + 0.31, z: p.z, stand: false, role: 'achter' } : { ...s, x: p.x, y: VLOER, z: p.z, stand: true, pose: undefined, role: 'achter' };
    return { ...s, role: 'achter' }; // een volle bus: naast de bijrijder
  }
  const basis = vehicleSeat(v, false);
  if (v.isBike || v.isScooter || v._mount === 'horse') return { ...basis, role: 'achter' }; // één plek: achterop
  if (v.isHeli) { // in de cabine achter de piloot en de bijrijder
    const k = n - 2, hl = (v.model.len || 4) / 2;
    return { x: Math.max(-hl + 0.6, -0.15 - 0.55 * Math.floor(k / 2)), z: (k % 2 ? -1 : 1) * 0.45, y: 0.98, face: 0, pose: SEAT_CAR, role: 'achter' };
  }
  const hl = (v.model.len || 4) / 2, hw = (v.model.wid || 1.7) / 2, k = carKind(v), m = ACHTERBANK[k] || {};
  const xMin = k === 'trekker' && v.model.name === 'tractor' ? tractorCab(v.model.len).x0 + 0.3 : -hl + (m.achter ?? 1.0);
  const x = Math.max(xMin, basis.x - (m.stap ?? 0.85));
  // twee of drie naast elkaar, al naar de breedte; meer passagiers dan dat schuiven op dezelfde bank op
  const zs = hw >= 0.95 ? [-0.62 * hw, 0, 0.62 * hw] : [-0.55 * hw, 0.55 * hw];
  const i = n - 2, ronde = Math.floor(i / zs.length), z = Math.max(-hw + 0.2, Math.min(hw - 0.2, zs[i % zs.length]));
  return { ...basis, x: Math.max(xMin, x - 0.05 * ronde), z, role: 'achter' };
}

// Zoals placeSeated, maar voor een zitter die al een kind van het voertuigmodel is (coopzitten3d.js, #434):
// dezelfde stoel, houding en hoogte, alleen in de coördinaten van het voertuig zelf. Een staande SUP'er
// peddelt (supPose), een roeier roeit en een passagier van de waterfiets trapt mee (t).
export function placeSeatedLocal(person, seat, t = 0) {
  const sy = person.scale.y || 1;
  person.position.set(seat.x, seat.stand ? seat.y : seat.y - SEAT_CONTACT * sy, seat.z);
  person.rotation.set(0, seat.face || 0, 0);
  if (seat.stand && seat.pose && seat.pose.arms === 'sup') supPose(person, t);
  else if (seat.stand) standBehindPose(person);
  else seatPose(person, seat.pose, t);
}

// De stoel die bij de deur hoort waar de instapper staat: links voor de bestuurder,
// rechts voor de bijrijder (#459). Alleen bij een voertuig met een echte bijrijdersdeur
// (en als die plek vrij is); een fiets, step, boot, quad of paard heeft één zitplaats,
// en een piloot zit rechts maar stapt niet via een portier in.
export function instapStoel(v, kant) {
  const twee = !v.isBike && !v.isScooter && !v.isBoat && !v.isHeli && !v.isPlane && v._mount !== 'horse' && !v.passenger;
  if (kant > 0 && twee && doorsFor(v).some((d) => d.seat === 'bijrijder')) return vehicleSeat(v, false);
  return vehicleSeat(v, true);
}

// Alles wat de instapanimatie van deze plek af nodig heeft: aan welke kant de speler
// staat, welke stoel daarbij hoort en de deur van die stoel (null zonder logische deur).
export function instapVoor(v, x, y) {
  const kant = instapKant(v, x, y);
  const stoel = instapStoel(v, kant);
  return { kant, rol: stoel.role, stoel, deur: deurVoorStoel(v, stoel) };
}

// Astride a (police) horse: the saddle top of models3d_vehicles' horse,
// thighs splayed round the barrel, lower legs hanging along its flanks.
const HORSE_SADDLE_TOP = 1.72;
const HORSE_POSE = { recline: -0.06, footX: 0.12, footY: -0.74, splay: 0.55, arms: 'helm' };
const HORSE_BUDDY_POSE = { recline: -0.1, footX: 0.08, footY: -0.72, splay: 0.6, arms: 'hug' };

// The rider's own figure: origin (feet) height, not a seat top.
function bikeRiderSeat(v) {
  if (v._mount === 'horse') return { x: -0.08, z: 0, y: HORSE_SADDLE_TOP, face: 0, pose: HORSE_POSE, horse: true };
  if (v.isScooter && v.model.motorbike) return { x: -0.3, z: 0, y: 0.82 - PERSON_RIG.HIP_Y, face: 0, stand: true, rider: true };
  if (v.isScooter && v.model.moped) return { x: -0.22, z: 0, y: 0.8 - PERSON_RIG.HIP_Y, face: 0, stand: true, rider: true };
  if (v.isScooter) return { x: -0.08, z: 0, y: 0.155, face: 0, stand: true };
  const fat = !!v.model.fat;
  return { x: fat ? -0.26 : -0.3, z: 0, y: (fat ? 0.93 : 1.02) - PERSON_RIG.HIP_Y, face: 0, stand: true, rider: true };
}

// Tammo/Tessa riding along: side-saddle on the rack ("achterop"), astride
// behind the rider on a fatbike's long saddle, or standing behind on a step.
function bikeBuddySeat(v) {
  if (v._mount === 'horse') return { x: -0.56, z: 0, y: HORSE_SADDLE_TOP - 0.02, face: 0, pose: HORSE_BUDDY_POSE, horse: true };
  if (v.isScooter && (v.model.moped || v.model.motorbike)) return { x: v.model.motorbike ? -0.62 : -0.6, z: 0, y: 0.86, face: 0, pose: { recline: -0.1, footX: 0.2, footY: -0.5, splay: 0.25, arms: 'hug' } };
  if (v.isScooter) return { x: -0.34, z: 0, y: 0.155, face: 0, stand: true };
  if (v.model.fat) return { x: -0.62, z: 0, y: 0.95, face: 0, pose: { recline: -0.14, footX: 0.14, footY: -0.52, splay: 0.3, arms: 'hug' } };
  return { x: -0.56, z: 0, y: 0.8, face: -Math.PI / 2, pose: { recline: 0.04, footX: 0.26, footY: -0.55, arms: 'rail' } };
}

function baseY(v) {
  return v.isBoat ? WATER_Y : v.sinking ? v.sinking.z : v.z || 0;
}

// World pose of a vehicle-local point (y absolute in the local frame).
function localToWorld(vehMesh, v, x, y, z, out) {
  if (vehMesh) {
    vehMesh.updateMatrix();
    return out.set(x, y, z).applyMatrix4(vehMesh.matrix);
  }
  const c = Math.cos(v.angle), s = Math.sin(v.angle);
  return out.set(v.x + c * x - s * z, baseY(v) + y, v.y + s * x + c * z);
}

function vehicleQuat(vehMesh, v, out) {
  if (vehMesh) return out.copy(vehMesh.quaternion);
  return out.setFromAxisAngle(_up, -v.angle);
}

// Puts `person` on `seat` of v and poses it (t drives paddling/pedalling).
export function placeSeated(person, vehMesh, v, seat, t = 0) {
  const sy = person.scale.y || 1;
  localToWorld(vehMesh, v, seat.x, seat.stand ? seat.y : seat.y - SEAT_CONTACT * sy, seat.z, person.position);
  vehicleQuat(vehMesh, v, person.quaternion);
  if (seat.face) person.quaternion.multiply(_qy.setFromAxisAngle(_up, seat.face));
  if (seat.stand && seat.pose && seat.pose.arms === 'sup') supPose(person, t);
  else if (seat.stand) standBehindPose(person);
  else seatPose(person, seat.pose, t);
}

// --- enter / exit transitions ------------------------------------------------

export function makeSeatTracker() {
  return { v: null, anim: null, foot: null };
}

const MAX_WALK = 6;

function doorLocal(v, seat) {
  // de deur die bij deze stoel hoort (vehicledoors.js): links voor de bestuurder,
  // rechts voor de bijrijder, de voordeur voor een buspassagier (#459)
  const deur = deurVoorStoel(v, seat);
  if (deur) return deur;
  const hw = v.model.wid / 2;
  if (v._mount === 'horse') return { x: -0.1, z: -(hw + 0.55) };
  if (v.isBike || v.isScooter) return { x: -0.15, z: -(hw + 0.35) };
  if (v.isBus) return { x: v.model.len / 2 - 0.9, z: hw + 0.45 };
  const side = seat.z < 0 ? -1 : 1;
  return { x: seat.x + 0.15, z: side * (hw + 0.42) };
}

// Call once per frame per actor (player or companion) before drawing it.
// Returns the running transition or null. `isPlayer` marks carjacks.
export function trackSeat(tr, actor, dt, isPlayer) {
  const v = actor.inVehicle || null;
  if (v !== tr.v) {
    const prev = tr.v;
    tr.anim = null;
    // de animatie is uit te zetten in Instellingen (Toegankelijkheid, #459): dan
    // staat de speler meteen op zijn stoel en blijft de deur dicht
    const animatie = stapAnimatieAan(getSettings());
    if (animatie && v && !prev && tr.foot && !actor.ragdoll) {
      // instappen gebeurt bij de deur waar de speler staat: links de bestuurdersstoel,
      // rechts de bijrijdersstoel (#459). Wie zelf rijdt schuift daarna achter het stuur.
      const doel = vehicleSeat(v, isPlayer);
      const instap = isPlayer ? instapVoor(v, tr.foot.x, tr.foot.y) : { kant: doel.z < 0 ? -1 : 1, rol: doel.role, stoel: doel, deur: deurVoorStoel(v, doel) };
      // een korte slide als de stoel van de deur niet de stoel is waar de speler eindigt
      const slideT = instap.stoel !== doel && instap.deur ? 0.18 : 0;
      tr.anim = { kind: 'enter', v, t: 0, from: tr.foot, instap, slideT, jack: isPlayer && !!v.carjacked && !v.isBike && !v.isScooter && !v.isBoat, walkT: 0, sitT: 0, init: false };
    } else if (animatie && !v && prev && !prev.sinking && !actor.water && !actor.ragdoll) {
      tr.anim = { kind: 'exit', v: prev, t: 0, walkT: 0.2, sitT: prev.isBike || prev.isScooter ? 0.3 : 0.36, init: false };
    }
    tr.v = v;
  }
  const a = tr.anim;
  if (a) {
    a.t += dt;
    const done = a.init && a.t >= a.walkT + (a.jack ? 0.25 : 0) + a.sitT + (a.slideT || 0);
    const skip = a.kind === 'enter'
      ? Math.abs(a.v.speed) > 0.8 || a.v.wrecked || actor.inVehicle !== a.v
      : Math.hypot(actor.vx || 0, actor.vy || 0) > 0.3 || !!actor.water || !!actor.ragdoll || !!actor.inVehicle;
    if (done || skip) tr.anim = null;
  }
  if (!v && !tr.anim) {
    const f = tr.foot || (tr.foot = { x: 0, y: 0, z: 0, angle: 0 });
    f.x = actor.x; f.y = actor.y; f.z = (actor.gz || 0) + Math.max(0, actor.z || 0); f.angle = actor.angle;
  }
  return tr.anim;
}

function smooth(u) {
  const k = Math.max(0, Math.min(1, u));
  return k * k * (3 - 2 * k);
}

const _door = new THREE.Vector3();
const _seat = new THREE.Vector3();
const _seat2 = new THREE.Vector3();
const _qs = new THREE.Quaternion();

// Draws `mesh` for a running transition. seat: the vehicle seat (for a bike
// driver the rider figure spot). Returns true when the mesh should be shown.
export function drawTransition(a, mesh, vehMesh, actor, seat, dt, time) {
  const v = a.v;
  const sy = mesh.scale.y || 1;
  // instappen aan de kant waar de speler stond: die stoel en die deur horen bij elkaar
  // (#459); de animatie eindigt altijd op `seat` (de bestuurder als hij zelf rijdt)
  const inStoel = a.kind === 'enter' && a.instap ? a.instap.stoel : seat;
  const dl = a.kind === 'enter' && a.instap && a.instap.deur ? a.instap.deur : doorLocal(v, inStoel);
  const ground = a.kind === 'enter' ? a.from.z : (actor.gz || 0);
  localToWorld(vehMesh, v, dl.x, 0, dl.z, _door);
  _door.y = v.isBoat ? ground : baseY(v);
  localToWorld(vehMesh, v, inStoel.x, inStoel.stand ? inStoel.y : inStoel.y - SEAT_CONTACT * sy, inStoel.z, _seat);
  vehicleQuat(vehMesh, v, _qs);
  if (seat.face) _qs.multiply(_qy.setFromAxisAngle(_up, seat.face));
  const hop = v.isBoat || v.isBike || v.isScooter;
  if (!a.init) {
    a.init = true;
    if (a.kind === 'enter') {
      const d = Math.hypot(_door.x - a.from.x, _door.z - a.from.y);
      a.walkT = hop && v.isBoat ? 0 : d > MAX_WALK ? 0 : Math.min(0.4, Math.max(0.1, d / 4.5));
      a.sitT = v.isBoat ? 0.5 : v.isBike || v.isScooter ? 0.34 : 0.42;
      if (d > 12) { a.walkT = 0; a.sitT = 0.01; a.jack = false; a.slideT = 0; }
      if (v.isBoat || a.walkT === 0) { _door.set(a.from.x, a.from.z, a.from.y); a.doorFixed = { x: a.from.x, y: a.from.z, z: a.from.y }; }
      if (inStoel === seat) a.slideT = 0;
    }
  }
  if (a.doorFixed) _door.set(a.doorFixed.x, a.doorFixed.y, a.doorFixed.z);
  const yank = a.jack ? 0.25 : 0;
  mesh.visible = true;
  if (mesh.userData.shadow) mesh.userData.shadow.visible = false;
  let u;
  if (a.kind === 'enter') {
    if (a.t < a.walkT) {
      const k = a.t / a.walkT;
      const fx = a.from.x, fy = a.from.y;
      mesh.position.set(fx + (_door.x - fx) * k, a.from.z + (_door.y - a.from.z) * k, fy + (_door.z - fy) * k);
      const ang = Math.atan2(_door.z - fy, _door.x - fx);
      mesh.quaternion.setFromAxisAngle(_up, -ang);
      animatePersonWalk(mesh, Math.hypot(_door.x - fx, _door.z - fy) / a.walkT, dt);
      return true;
    }
    if (a.t < a.walkT + yank) {
      // carjack: grab through the door and yank
      const k = (a.t - a.walkT) / yank;
      mesh.position.copy(_door);
      mesh.quaternion.copy(_qs).multiply(_qa.setFromAxisAngle(_up, inStoel.z < 0 ? -Math.PI / 2 : Math.PI / 2));
      animatePersonWalk(mesh, 0, dt);
      carryOverlay(mesh);
      mesh.userData.chest.rotation.z += 0.35 * Math.sin(k * Math.PI);
      return true;
    }
    u = smooth((a.t - a.walkT - yank) / a.sitT);
    if (a.slideT && a.t >= a.walkT + yank + a.sitT) {
      // aan de bijrijderskant ingestapt: één been over en achter het stuur schuiven,
      // want de speler rijdt altijd zelf (#459)
      const k = smooth((a.t - a.walkT - yank - a.sitT) / a.slideT);
      localToWorld(vehMesh, v, seat.x, seat.stand ? seat.y : seat.y - SEAT_CONTACT * sy, seat.z, _seat2);
      mesh.position.lerpVectors(_seat, _seat2, k);
      mesh.quaternion.copy(_qs);
      animatePersonWalk(mesh, 0, dt);
      blendSeatPose(mesh, seat.pose, k, time);
      return true;
    }
  } else {
    u = 1 - smooth(a.t / a.sitT);
    if (a.t >= a.sitT) {
      const k = Math.min(1, (a.t - a.sitT) / a.walkT);
      mesh.position.set(_door.x + (actor.x - _door.x) * k, ground, _door.z + (actor.y - _door.z) * k);
      mesh.quaternion.setFromAxisAngle(_up, -actor.angle);
      animatePersonWalk(mesh, 1.6, dt);
      return true;
    }
  }
  // door -> seat: slide in and sit down (or hop over the gunwale / swing a leg over the saddle)
  mesh.position.lerpVectors(_door, _seat, u);
  if (hop) mesh.position.y += Math.sin(u * Math.PI) * (v.isBoat ? 0.28 : v._mount === 'horse' ? 0.35 : 0.12);
  const startQ = _qa.setFromAxisAngle(_up, a.kind === 'enter' ? -Math.atan2(_seat.z - _door.z, _seat.x - _door.x) : -actor.angle);
  mesh.quaternion.slerpQuaternions(startQ, _qs, a.kind === 'enter' ? Math.min(1, u * 1.6) : u);
  animatePersonWalk(mesh, 0, dt);
  if (inStoel.stand) {
    if (inStoel.rider || v.isBike) {
      // leg swing over the saddle: the bike-side leg lifts out and over
      const s = Math.sin(u * Math.PI);
      const ud = mesh.userData;
      ud.legL.rotation.x = -1.25 * s;
      ud.legL.rotation.z = 0.5 * s;
      ud.kneeL.rotation.z = -0.9 * s;
    }
  } else blendSeatPose(mesh, inStoel.pose, u, time);
  return true;
}

// --- crews on ambient boats ----------------------------------------------------

const CREW_SHIRTS = [0xe0473c, 0xf2c230, 0x3a8fd9, 0x2f7d46, 0xd8d4cc, 0x6b2a24, 0x1d3557, 0xe07aa0, 0x8a5a3c, 0x3f6ea8];
const CREW_SKINS = [0xe8b48a, 0xcaa06f, 0x8a5a3c, 0x5c3d28, 0xf0c9a0, 0xd9aa82];
const CREW_DIST = 95;
const CREW_ANIM_DIST = 45;
const GREET_DIST = 16;
const GREET_LINES = ['Moi!', 'Ahoi!', 'Hoi hoi!', 'Goeie vaart!', 'Mooi weer, hè!', 'Moi, schipper!', 'Goeiemiddag!'];
const GREET_FAST = ['Rustig an, jong!', 'Hé! Golven!', 'Kiek uut!'];


// Skipper and passengers as children of the boat mesh (they bob and roll
// with it for free). Built one person per call within `deadline` since a
// person mesh takes a few ms; hidden while the player drives the boat.
// ctx: { dist, deadline, time, prep(mesh), world, playerBoat, playerOnWater, speakers }
export function syncBoatCrew(mesh, v, ctx) {
  const ud = mesh.userData;
  if (!ud.crew) {
    if (v.wrecked || v.driver === 'player' || v.scripted || v.missionCar || v.playerOwned) return;
    if (ctx.dist > CREW_DIST || performance.now() > ctx.deadline) return;
    const seats = boatSeats(v);
    const n = v.isPolice ? 1 : Math.min(seats.length, boatCrewCount(v));
    ud.crew = [];
    ud.crewSeats = seats;
    ud.crewWanted = n;
  }
  if (ud.crew.length < ud.crewWanted && ctx.dist < CREW_DIST && performance.now() <= ctx.deadline) {
    const k = ud.crew.length;
    const seed = (v.id || 0) * 7.13 + k * 3.1 + 5;
    const shirt = v.isPolice ? 0x1f3f8f : CREW_SHIRTS[Math.floor(hash(seed, 1.3) * CREW_SHIRTS.length)];
    const skin = CREW_SKINS[Math.floor(hash(seed, 2.9) * CREW_SKINS.length)];
    const p = buildPersonMesh(shirt, skin, { seed });
    poseCrew(p, ud.crewSeats[k], 0);
    placeLocal(p, ud.crewSeats[k]);
    mesh.add(p);
    ctx.prep(p, mesh);
    ud.crew.push({ mesh: p, seat: ud.crewSeats[k], greetUntil: 0 });
  }
  const show = !v.wrecked && v.driver !== 'player' && !v.sinking;
  const near = ctx.dist < CREW_ANIM_DIST;
  for (const c of ud.crew) {
    c.mesh.visible = show;
    if (!show) continue;
    const moving = Math.abs(v.speed) > 0.3;
    const animated = c.seat.pose && (c.seat.pose.arms === 'paddle' || c.seat.pose.arms === 'row' || c.seat.pose.arms === 'sup' || c.seat.pose.pedal);
    if (near && (animated || c.greetUntil > ctx.time || c.waved)) {
      poseCrew(c.mesh, c.seat, moving ? ctx.time + (c.seat.pose && c.seat.pose.arms === 'row' ? 0 : c.seat.x) : 0);
      c.waved = false;
      if (c.greetUntil > ctx.time) {
        const left = c.greetUntil - ctx.time;
        waveOverlay(c.mesh, ctx.time, Math.min(1, left / 0.3, (2.4 - left) / 0.3));
        c.waved = true;
      }
    }
  }
  if (show && near && ctx.playerOnWater && ud.crew.length && ctx.time > (ud.greetReadyAt || 0)) {
    const pb = ctx.playerBoat;
    const dx = pb.x - v.x, dy = pb.y - v.y;
    if (dx * dx + dy * dy < GREET_DIST * GREET_DIST) {
      ud.greetReadyAt = ctx.time + 12 + Math.random() * 10;
      const fast = Math.abs(pb.speed) > 5;
      for (const c of ud.crew) {
        if (c === ud.crew[0] && ud.crew.length > 1 && !fast) continue; // the skipper keeps steering
        if (Math.random() < (fast ? 0.35 : 0.7)) c.greetUntil = ctx.time + 2.4;
      }
      if (Math.random() < 0.55 && ctx.speakers) {
        ctx.speakers.push({ x: v.x, y: v.y, h: 2.2, speechText: fast ? GREET_FAST[Math.floor(Math.random() * GREET_FAST.length)] : GREET_LINES[Math.floor(Math.random() * GREET_LINES.length)], speechUntil: ctx.time + 2.2, follow: v });
      }
    }
  }
}

function poseCrew(p, seat, t) {
  if (seat.stand) supPose(p, t);
  else seatPose(p, seat.pose, t);
}

function placeLocal(p, seat) {
  const sy = p.scale.y || 1;
  p.position.set(seat.x, seat.stand ? seat.y : seat.y - SEAT_CONTACT * sy, seat.z);
  p.rotation.set(0, seat.face || 0, 0);
}

export function crewCount(mesh) {
  return mesh.userData.crew ? mesh.userData.crew.length : 0;
}

export { boatKind };
