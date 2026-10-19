import { isInsideBuilding, isOnRoad, lineOfSight, setPedPose, pushAudioEvent } from './pedgeom.js';
export { isInsideBuilding, isOnRoad, lineOfSight, setPedPose, pushAudioEvent };
import { DEAD_DURATION } from './pedconst.js';
export { DEAD_DURATION };
import { scaledTarget, farAIDist, skipFar, takeDt } from './simload.js';
import { inClearZone } from './clearzone.js';
import { openDriverDoor } from './vehicledoors.js';
import { profileOf } from './signalement.js';
import { createVictim, stepVictim, victimDone, VICTIM, stepOutPlan, stepOutPos } from './carjackvictim.js';
import { dist, pointInPolygon, closestPointOnSegment, isInWater } from './util.js';
import { resolveBuildingCollisions, findExitSpot } from './collision.js';
import { resolveWalker } from './collision.js';
import { requestRespawn } from './world.js';
import { playNpcPhrase } from './audio.js';
import { hasBubbleVoice } from './linevoice.js';
import { pushCircleOutOfVehicle, reportImpact, distToVehicleBody } from './vehicle.js';
import { isRangedWeapon } from './weapons.js';
import { getCombatEffect } from './combateffect.js';
import { registerPoseSource, unregisterPoseSource, prunePoseSources } from './models3d_people.js';
import { knockDown, isKnockedDown } from './ragdoll.js';
import { splatterPed, bleedPed, GIB_SPEED } from './gore3d.js';
import { knockFx } from './knockfx3d.js';
import { walkRoute, processPedPlanQueue, buildPedAvoidGrid, separatePeds, makeCompanion } from './pedroutes.js';
import { reportCrime } from './crime.js';
import { npcBudget, bystanderReaction } from './wantedlevels.js';
import { hash2 } from './rng.js';
import { seatedOf, clearSeated, reactSeated, exitOrder } from './occupants.js';
import { dayState } from './daynight.js';
import { FLAGS } from './devflags.js';
import { voetgangerOpties, stapSlaOver } from './simlagen.js';
import { getSimBridge } from './simbridge.js';
import { wijkProfileAt } from './trafficfleet.js';
import { hourOf } from './streetlifedata.js';
import { buildingAt } from './tileplace.js';

const WANDER_SPEED = 1.3;
const FLEE_SPEED = 3.6;
const FLEE_TRIGGER_RADIUS = 9;
const FLEE_SAFE_RADIUS = 34;
const WAYPOINT_RADIUS = 15;
const VEHICLE_HIT_SPEED = 4;
const KNOCK_DECAY = 3.5;
const SPEECH_DURATION = 3;
const SPEECH_MIN_INTERVAL = 15;
const SPEECH_MAX_INTERVAL = 30;

const COP_CLOTHING = '#1c3fae';
// a jogging cop runs down a walker; a sprinting player (7.5) still gets away
const COP_JOG_SPEED = 3.5;
const COP_SPRINT_SPEED = 6.0; // just under the player's sprint (6.8)
const COP_SPRINT_RADIUS = 8;
const COP_HOLD_DIST = 0.75;
const COP_SEEK_TRIGGER_RADIUS = 18;
const COP_SEEK_GIVEUP_RADIUS = 28;
const COP_BOARD_REACH = 0.9;

const WITNESS_RADIUS = 45;
const CALL_MIN = 7;
const CALL_MAX = 11;

export const CITY_CENTRE = { x: 191.86, y: 138.11, r: 380 };
const NIGHT_HOTSPOTS = [
  { x: 391.97, y: 116.7, r: 90 },
  { x: 398.36, y: 200.15, r: 80 },
  { x: 161.05, y: 93.31, r: 90 },
];

const GRONINGS_PHRASES = [
  'Moi!', 'Hoi, alles goud?', 't Is mooi weer vandoag, nait?',
  'Kom, we goan derhen.', 'Wat bin je aan het doun?', 'Doe mor gewoon.',
  'Lekker bakkie doen?', 'Nou, mag nait klagen, hoor.',
  'Ligt aan die kolde wind, geleuf ik.', 'Tot straks, moi!',
];

const SCREAMS = ['Help!', 'Aaah!', 'Wegwezen!', 'Rennen!', 'Hulp!', 'Nee, nee, nee!'];
const HURT_LINES = ['Au! Bist betoeterd?', 'Au! Wat dust doe?', 'Hé! Rot op, joh!', 'Au! Doe bist nait goed wies!'];
const BUMP_LINES = ['Kiek uut!', 'Rot op, joh!', 'Bist betoeterd?', 'Hé, kiek es uut!', 'Pas toch op, joh!', 'Kiek uut woarst lopst, mien jong!', 'Nait zo dringen, joh!'];
const CAR_BUMP_LINES = ['Kiek uut, joh!', 'Bist betoeterd?', 'Hé! Ik loop hier!'];
const THEFT_LINES = ['Hé, dat is mien auto!', 'Mien auto! Rot op, joh!', 'Hé! Kom terug mit mien auto!'];
const BIKE_THEFT_LINES = ['Hé, mien fiets!', 'Dat is mien fiets, joh!'];
const FILM_LINES = ['Dit gaat op Kiekdoar!', 'Dit gaat op Kiekdoar!', 'Moi, dit wordt viraal!'];
const COP_LINES = ['Staan blijven! Politie!', 'Handen omhoog!', 'Blijf stoan!', 'Blief stoan, mien jong!', 'Kom mor mit noar t bureau.'];
const CALL_LINES = {
  shot: 'Hallo, 112? Hier wordt schoten!',
  boom: '112? Hier ontploft van alles!',
  hit: 'Politie? Een gek slaat hier mensen in elkaar!',
  theft: 'Politie? Der wordt hier een auto jat!',
};

const CLOTHING = [
  '#2b2f36', '#3a3f47', '#54463c', '#1f3a52', '#4a3a54',
  '#5c1f1f', '#1f4a2e', '#c94b3a', '#c9a227', '#3f5c8a', '#6b6b6b', '#e8e6e0',
];
const SKIN_TONES = ['#e8b48a', '#caa06f', '#8a5a3c', '#5c3d28', '#f0c9a0'];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

export class Pedestrian {
  constructor(x, y, angle) {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.speed = 0;
    this.radius = 0.3;
    this.state = 'wander';
    this.health = 30;
    this.isCop = false;
    this.deadUntil = 0;
    this.waypoint = null;
    this.waypointTimer = 0;
    this.clothing = CLOTHING[Math.floor(Math.random() * CLOTHING.length)];
    this.skin = SKIN_TONES[Math.floor(Math.random() * SKIN_TONES.length)];
    this.hasBag = Math.random() < 0.3;
    this.speechTimer = SPEECH_MIN_INTERVAL + Math.random() * (SPEECH_MAX_INTERVAL - SPEECH_MIN_INTERVAL);
    this.speechText = null;
    this.speechUntil = 0;
    this._lookSeed = Math.random() * 1000;
    this.pose = null;
    this.scene = null;
    this.anchor = null;
    this.guard = null;
    this.fleeFrom = null;
    this.stateUntil = 0;
  }
}


let spawnBudget = 45;
let spawnWorld = null;
let lastPlayerX = null, lastPlayerY = null;

const HIDDEN_MIN_DIST = 18;
const HIDDEN_MAX_DIST = 70;
const HIDDEN_FAR_MAX_DIST = 125;

// Whether a new ped at (x, y) would appear out of sight: behind or beside the
// camera, blocked by a building, or deep in the fog. world.pedView is filled
// by scene3d; without it (boot, before the first frame) anything goes.
export function isSpawnHidden(world, x, y) {
  const view = world && world.pedView;
  if (!view || world.time < (world.pedFreeSpawnUntil || 0)) return true;
  if (!view.inView(x, y)) return true;
  return !clearSight(world.map, view.camX, view.camY, x, y);
}

// The last couple of metres are skipped: a ped hugging a facade is still
// visible even though the sight line brushes the building it stands next to.
function clearSight(map, ax, ay, bx, by) {
  const d = Math.hypot(bx - ax, by - ay);
  const steps = Math.floor((d - 2) / 2.5);
  for (let k = 1; k <= steps; k++) {
    const t = k * 2.5 / d;
    if (isInsideBuilding(map, ax + (bx - ax) * t, ay + (by - ay) * t)) return false;
  }
  return true;
}

// A short pedestrian street picked as often as a long road fills up: no more
// than PED_CROWD people within PED_CROWD_R metres of a new spawn.
const PED_CROWD = 3;
const PED_CROWD_R = 6;
function crowdedAt(x, y, fresh) {
  let n = 0;
  const r2 = PED_CROWD_R * PED_CROWD_R;
  for (const p of fresh) if ((p.x - x) ** 2 + (p.y - y) ** 2 < r2 && ++n >= PED_CROWD) return true;
  const all = spawnWorld && spawnWorld.pedestrians;
  if (all) for (const p of all) if ((p.x - x) ** 2 + (p.y - y) ** 2 < r2 && p.state !== 'dead' && ++n >= PED_CROWD) return true;
  return false;
}

function spawnPedsRaw(map, x, y, count, rng, minDist = 0, hidden = true) {
  const peds = [];
  const view = hidden && spawnWorld && spawnWorld.pedView && spawnWorld.time >= (spawnWorld.pedFreeSpawnUntil || 0);
  const pv = spawnWorld && spawnWorld.player && spawnWorld.player.inVehicle;
  const maxDist = !view ? 60 : pv && Math.abs(pv.speed) > 8 ? HIDDEN_FAR_MAX_DIST : HIDDEN_MAX_DIST;
  if (view) minDist = Math.max(minDist, HIDDEN_MIN_DIST);
  const roads = map.roadsNear(x, y, maxDist).filter((r) => r.pts.length >= 2);
  if (!roads.length) return peds;

  let attempts = 0;
  while (peds.length < count && attempts < count * 25) {
    attempts++;
    const road = roads[Math.floor(rng() * roads.length)];
    if (road.z || road.type === 'trunk' || road.type === 'trunk_link' || road.type === 'motorway' || road.type === 'motorway_link') continue; // nobody strolls along the ring
    const pts = road.pts;
    const i = Math.floor(rng() * (pts.length - 1));
    const a = pts[i], b = pts[i + 1];
    const t = rng();
    const px = a[0] + (b[0] - a[0]) * t;
    const py = a[1] + (b[1] - a[1]) * t;
    const segAngle = Math.atan2(b[1] - a[1], b[0] - a[0]);
    const nx = -Math.sin(segAngle), ny = Math.cos(segAngle);
    const side = rng() < 0.5 ? 1 : -1;
    const offset = (road.width || 4) / 2 + 1 + rng() * 2;
    const fx = px + nx * offset * side;
    const fy = py + ny * offset * side;

    const d = dist(fx, fy, x, y);
    if (d > maxDist || d < minDist) continue;
    if (isInsideBuilding(map, fx, fy) || isInWater(map, fx, fy)) continue;
    if (map.offStreetLevel && map.offStreetLevel(fx, fy)) continue;
    if (map.onRingCarriageway && map.onRingCarriageway(fx, fy)) continue;
    if (view && !isSpawnHidden(spawnWorld, fx, fy)) continue;
    if (crowdedAt(fx, fy, peds)) continue;
    if (inClearZone(fx, fy, 1)) continue;

    peds.push(new Pedestrian(fx, fy, segAngle + (rng() < 0.5 ? 0 : Math.PI)));
  }
  return peds;
}

// Civilian spawns honour a budget set by the population manager below, so
// main.js's fixed top-up can't undo the night-time thinning.
export function spawnPedestriansNear(map, x, y, count, rng = Math.random) {
  const n = Math.max(0, Math.min(count, Math.floor(spawnBudget)));
  spawnBudget -= n;
  return n ? addCompanions(map, spawnPedsRaw(map, x, y, n, rng), n) : [];
}

const COMPANION_CHANCE = 0.18;

// Some walkers get a companion at their side; companions take the place of
// solo walkers so the head count stays within budget.
function addCompanions(map, peds, max) {
  const out = [];
  for (const p of peds) {
    if (out.length >= max) break;
    out.push(p);
    if (out.length >= max || Math.random() >= COMPANION_CHANCE) continue;
    const s = Math.random() < 0.5 ? 1 : -1;
    const cx = p.x - Math.sin(p.angle) * 0.85 * s, cy = p.y + Math.cos(p.angle) * 0.85 * s;
    if (isInsideBuilding(map, cx, cy) || isInWater(map, cx, cy)) continue;
    const c = new Pedestrian(cx, cy, p.angle);
    makeCompanion(c, p);
    c.pairSide = s;
    out.push(c);
  }
  return out;
}

export function spawnCopPedestriansNear(map, x, y, count, rng = Math.random, hidden = true, minDist = 0) {
  const cops = spawnPedsRaw(map, x, y, count, rng, minDist, hidden);
  for (const cop of cops) {
    cop.isCop = true;
    cop.clothing = COP_CLOTHING;
    cop.hasBag = false;
  }
  return cops;
}

// An officer appearing right next to their car, bike or horse (in view, so no
// fade-in). lookSeed matches the rider figure built on a police bike/horse.
export function makeCopPedestrian(x, y, angle, lookSeed = null) {
  const cop = new Pedestrian(x, y, angle);
  cop.isCop = true;
  cop.clothing = COP_CLOTHING;
  cop.hasBag = false;
  cop.noFade = true;
  if (lookSeed !== null) {
    cop._lookSeed = lookSeed;
    cop.skin = SKIN_TONES[Math.floor(hash2(lookSeed, 2.1) * SKIN_TONES.length)];
  }
  return cop;
}





let lastShoutAt = -Infinity;
function say(ped, world, text, duration = 2.6, audio = 'shout', strength = 0.7) {
  ped.speechText = text;
  ped.speechUntil = world.time + duration;
  // a recorded line is spoken by the bubble itself (scene3d), no synth shout on top
  if (audio && world.time - lastShoutAt > 0.6 && !hasBubbleVoice(text)) {
    lastShoutAt = world.time;
    pushAudioEvent(world, { kind: audio, x: ped.x, y: ped.y, strength, text });
  }
}

function pickWaypoint(map, x, y, radius = WAYPOINT_RADIUS, cx = x, cy = y) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const ang = Math.random() * Math.PI * 2;
    const r = Math.min(4, radius * 0.3) + Math.random() * radius;
    const wx = cx + Math.cos(ang) * r, wy = cy + Math.sin(ang) * r;
    if (!isOnRoad(map, wx, wy) && !isInsideBuilding(map, wx, wy) && !isInWater(map, wx, wy)) return [wx, wy];
  }
  return [x, y];
}

function setState(ped, state, until = 0, pose = null) {
  ped.state = state;
  ped.stateUntil = until;
  setPedPose(ped, pose);
  if (state === 'wander') { ped.waypoint = null; ped.waypointTimer = 0; }
}

export function releaseFromScene(ped) {
  if (!ped.scene) return;
  ped.scene.released = true;
  ped.scene = null;
  setPedPose(ped, null);
}

function startFlee(ped, world, x, y, followPlayer = false) {
  releaseFromScene(ped);
  setState(ped, 'flee', world.time + 6 + Math.random() * 4);
  ped.fleeFrom = followPlayer ? null : { x, y };
  ped.fleeJitter = (Math.random() - 0.5) * 0.9;
  ped.fleeSpeed = FLEE_SPEED * (0.85 + Math.random() * 0.35);
}

// --- world events (gunfire, explosions, crashes, assaults, theft) ---------

let lastFx = null;
let lastShotEventAt = -Infinity;
let lastPoliceShotAt = -Infinity;
let lastCopCrashAt = -Infinity;
let lastPlayerAttackAt = -Infinity;
let prevInVehicle = null;
let eventSeq = 0;
let screamsThisEvent = 0;
let filmLineAt = -Infinity;
let activeCall = null;
const seenWrecks = new WeakSet();
const seenParticles = new WeakSet();
const seenBullets = new WeakSet();
const ownedVehicles = new WeakSet();
const aiDrivenAt = new WeakMap();

function gatherEvents(world) {
  const { player } = world;
  const events = [];
  const fx = getCombatEffect();
  if (fx && fx !== lastFx) {
    lastFx = fx;
    lastPlayerAttackAt = world.time;
    if (fx.type === 'muzzle' && world.time - lastShotEventAt > 0.5) {
      lastShotEventAt = world.time;
      events.push({ kind: 'shot', x: player.x, y: player.y, r: 42, crime: true });
    }
  }
  for (const b of world.bullets) {
    if (b.owner !== 'police' || seenBullets.has(b)) continue;
    seenBullets.add(b);
    if (world.time - lastPoliceShotAt > 1) {
      lastPoliceShotAt = world.time;
      events.push({ kind: 'shot', x: b.x, y: b.y, r: 30, crime: false });
    }
  }
  for (const v of world.vehicles) {
    if (v.bailPending) {
      // the driver of a burning car jumps out and runs for it
      v.bailPending = false;
      if (dist(v.x, v.y, player.x, player.y) < 120) {
        const ped = ejectDriver(world, { vehicle: v });
        if (ped) startFlee(ped, world, v.x, v.y);
      }
    }
    if (v.wrecked && !seenWrecks.has(v)) {
      seenWrecks.add(v);
      if (!v.sinking && !v.isBike && !v.isScooter) blastAt(world, v);
      if (dist(v.x, v.y, player.x, player.y) < 150) events.push({ kind: 'boom', x: v.x, y: v.y, r: 50, crime: !!v.wreckedByPlayer });
    }
    if (!v.wrecked && v.driver !== 'player' && (v.road || v.countryDrive) && Math.abs(v.x - player.x) < v.halfLen + 6 && Math.abs(v.y - player.y) < v.halfLen + 6) aiDrivenAt.set(v, world.time);
  }
  for (const pt of world.particles) {
    if (pt.kind !== 'impact' || seenParticles.has(pt)) continue;
    seenParticles.add(pt);
    if (pt.strength < 0.3) continue;
    events.push({ kind: 'crash', x: pt.x, y: pt.y, r: 10 + pt.strength * 25, crime: false });
  }
  const li = world.lastImpact;
  if (li && li.time === world.time && player.inVehicle && world.time - lastCopCrashAt > 2) {
    const cop = world.vehicles.find((v) => v.isPolice && !v.hijacked && v !== player.inVehicle && !v.wrecked &&
      dist(v.x, v.y, li.x, li.y) < v.halfLen + 3);
    if (cop) {
      lastCopCrashAt = world.time;
      reportCrime(world, 'copBump', { seen: true });
      events.push({ kind: 'crash', x: li.x, y: li.y, r: 25, crime: false });
    }
  }
  for (const ped of world.pedestrians) {
    if (ped._hp !== undefined && ped.health < ped._hp && world.time - lastPlayerAttackAt < 1.2) {
      if (ped.isCop) { if (world.wanted === 0) world.wanted = 1; }
      else events.push({ kind: 'hit', x: ped.x, y: ped.y, r: 25, crime: !ped.rager, victim: ped }); // hitting a road-rager is self-defence
    }
    ped._hp = ped.health;
  }
  const v = player.inVehicle;
  if (v && v !== prevInVehicle) {
    // the job's own car/boat/bike is handed to you, never stolen
    if (!v.isHeroCar && !v.missionCar && !v.playerOwned && !ownedVehicles.has(v)) {
      const hadDriver = !!v.carjacked || world.time - (aiDrivenAt.get(v) ?? -Infinity) < 1.5 || seatedOf(v).driver === 'waiting';
      events.push({ kind: 'theft', x: v.x, y: v.y, r: 30, crime: hadDriver || !v.petty, vehicle: v, hadDriver });
    }
    ownedVehicles.add(v);
  }
  prevInVehicle = v || null;
  return events;
}

// Bijrijders (occupants.js) stappen na een autodiefstal aan de andere kant uit en rennen weg;
// ze komen met een kleine vertraging, de bestuurder is al uit de auto.
export function ejectPassengers(world, ev) {
  const v = ev.vehicle;
  if (v.isBoat || v._mount) return [];
  const occ = seatedOf(v);
  const plan = exitOrder(reactSeated(occ, { kind: 'theft' })).filter((e) => e.who !== 'driver');
  const out = [];
  for (const e of plan) {
    const [x, y] = findExitSpot(v, 0.3, world.map, [1, -1]);
    const ped = new Pedestrian(x, y, Math.atan2(v.y - y, v.x - x));
    const seed = (v.id || 0) * 7.1 + (e.who === 'front' ? 3 : 8);
    ped._lookSeed = seed;
    ped.clothing = '#7a6a8a';
    ped.skin = SKIN_TONES[Math.floor(hash2(seed, 2.1) * SKIN_TONES.length)];
    ped.hasBag = false;
    ped.health = 40;
    ped.noFade = true;
    ped.passengerOf = v.id;
    ped.x += (e.who === 'rear' ? 0.5 : 0); // achterin stapt iets verder naar achteren uit
    world.pedestrians.push(ped);
    startFlee(ped, world, v.x, v.y);
    out.push(ped);
  }
  clearSeated(v, { driver: false });
  return out;
}

export function ejectDriver(world, ev) {
  const v = ev.vehicle;
  if (v.isBoat || v._mount) return null;
  const [x, y] = findExitSpot(v, 0.3, world.map, [-1, 1]);
  const ped = new Pedestrian(x, y, Math.atan2(v.y - y, v.x - x));
  // the same person that sat in it (scene3d's driver figure / the bike's
  // built-in rider), not a random passer-by appearing out of nowhere
  const two = v.isBike || v.isScooter;
  const seed = two ? (v.id || 0) * 3.7 + 1 : (v.id || 0) * 5.3 + 11;
  ped._lookSeed = seed;
  if (two) {
    if (v.model.rider) ped.clothing = v.model.rider;
    ped.skin = SKIN_TONES[Math.floor(hash2(seed, 2.1) * SKIN_TONES.length)];
  } else {
    ped.clothing = v.isPolice ? '#1f3f8f' : '#5a6470';
    ped.skin = '#d9aa82';
  }
  ped.hasBag = false;
  ped.health = 40;
  ped.noFade = true;
  world.pedestrians.push(ped);
  openDriverDoor(v); // the driver's door swings open (vehicledoors3d.js draws it)
  if (ev.calm) {
    // he slides out of the seat through the door to his spot (carjackvictim.js stepOutPlan)
    ped.stepOut = stepOutPlan(v, { x, y });
    ped.x = ped.stepOut.fx; ped.y = ped.stepOut.fy;
    return ped;
  } // roadrage.js: he steps out on his own, nobody pulled him
  const ox = x - v.x, oy = y - v.y, ol = Math.hypot(ox, oy) || 1;
  if (Math.abs(v.speed) > 2.5) {
    // yanked out of a moving car: tumbles along the road for a bit
    knockDown(ped, world, { kind: 'hit', startPose: 'ride', vx: Math.cos(v.angle) * v.speed * 0.6 + (ox / ol) * 2.5, vy: Math.sin(v.angle) * v.speed * 0.6 + (oy / ol) * 2.5, vz: 1.2, lieFor: 1.2 });
  } else {
    // pulled out of the seat: stumbles backwards onto the street, gets up angry
    knockDown(ped, world, { kind: 'hit', startPose: 'ride', vx: (ox / ol) * 2.2, vy: (oy / ol) * 2.2, vz: 0.7, lieFor: 0.5 });
  }
  return ped;
}

const stuntSafeAt = (world, ped) => { const z = world.stuntSafe; return !!z && Math.hypot(ped.x - z.x, ped.y - z.y) < z.r; };

// H3's stunt evening keeps hitting people non-lethal (stuntavond.js): a puff
// of dust and comic stars (knockfx3d.js) while they lie there and get up groggy.
function stuntKnock(ped, world, vx, vy) {
  ped.koUntil = world.time + 2.5;
  ped.groggyUntil = world.time + 5;
  knockFx(world, ped.x, ped.y, { k: 0.6, gz: ped.gz, vx, vy });
}

function killPed(ped, world) {
  releaseFromScene(ped);
  setPedPose(ped, null);
  ped.state = 'dead';
  ped.health = 0;
  ped._hp = 0;
  ped.speed = 0;
  ped.deadUntil = world.time + DEAD_DURATION;
}

// --- explosions and cyclists knocked off their bikes ------------------------

const BLAST_RADIUS = 7;
const BLAST_KILL = 3;
const PLAYER_BLAST_RADIUS = 5.5;

function blastAt(world, v, scale = 1) {
  const byPlayer = !!v.wreckedByPlayer;
  let hurt = 0;
  const push = (x, y, reach) => {
    reach *= scale;
    const dx = x - v.x, dy = y - v.y, d = Math.hypot(dx, dy);
    if (d > reach) return null;
    const k = 1 - d / reach, nx = d > 0.01 ? dx / d : 1, ny = d > 0.01 ? dy / d : 0;
    return { d, k, vx: nx * (3 + 9 * k), vy: ny * (3 + 9 * k), vz: 2 + 5 * k };
  };
  for (const ped of world.pedestrians) {
    const b = push(ped.x, ped.y, BLAST_RADIUS);
    if (!b || (ped.state === 'dead' && !ped.ragdoll)) continue;
    const wasDead = ped.state === 'dead';
    if (!wasDead) { ped.health -= b.d < BLAST_KILL * scale ? 999 : 25 * b.k; hurt++; }
    const dead = ped.health <= 0;
    releaseFromScene(ped);
    setPedPose(ped, null);
    const gib = dead && b.d < BLAST_KILL && splatterPed(ped, world, { vx: b.vx, vy: b.vy, vz: b.vz + 2, blast: true });
    if (!gib) knockDown(ped, world, { kind: 'blast', dead, vx: b.vx, vy: b.vy, vz: b.vz });
    if (!dead || wasDead) continue;
    killPed(ped, world);
    if (gib) ped.deadUntil = world.time + 1.5;
    else bleedPed(ped, world);
    if (byPlayer) {
      world.stats.kills++;
      if (ped.isCop) world.stats.copKills++;
      else world.stats.pedKills++;
      if (v.reportKills) {
        if (ped.isCop) world.wanted = Math.min(5, world.wanted + 2);
        else reportCrime(world, 'pedKill');
      }
    }
  }
  const p = world.player;
  const bp = !p.inVehicle && v.driver !== 'player' && push(p.x, p.y, PLAYER_BLAST_RADIUS);
  if (bp) {
    let dmg = Math.round(30 * bp.k);
    if (world.armor > 0) { const a = Math.min(world.armor, dmg); world.armor -= a; dmg -= a; }
    world.health = Math.max(0, world.health - dmg);
    knockDown(p, world, { kind: 'blast', dead: world.health <= 0, vx: bp.vx, vy: bp.vy, vz: bp.vz });
    if (world.health <= 0) requestRespawn(world);
  }
  const c = world.companion;
  const bc = c && !c.inVehicle && c.state !== 'dead' && push(c.x, c.y, PLAYER_BLAST_RADIUS);
  if (bc) {
    c.health = Math.max(0, c.health - Math.round(30 * bc.k));
    if (c.health <= 0) { c.state = 'dead'; c.deadUntil = world.time + 5; }
    knockDown(c, world, { kind: 'blast', dead: c.health <= 0, vx: bc.vx, vy: bc.vy, vz: bc.vz });
  }
  return hurt;
}

// A thrown carbidbus or a firework rocket going off (throwables.js): people
// thrown about like by a car blast, everyone around startled. The bang alone
// is Groningen tradition, not a crime; hurting someone is.
export function blastPeople(world, x, y, scale = 1, byPlayer = true) {
  const hurt = blastAt(world, { x, y, wreckedByPlayer: byPlayer, driver: null, reportKills: true }, scale);
  pendingEvents.push({ kind: 'boom', x, y, r: 20 + 35 * scale, crime: byPlayer && hurt > 0 });
  return hurt;
}

const SOAK_LINES = ['Hé! Kletsnat!', 'Mien jas!', 'Bist mal?', 'Hou op, joh!', 'Het regent al genoeg in Grunn!', 'Nait spuiten!'];
const COP_SOAK_LINES = ['Dat is belediging van een ambtenaar!', 'Hé! Wapen neer!', 'Dat gaat je geld kosten!'];

// Hit by the water pistol: no damage, but a shriek and a run for it; a cop
// takes it personally.
export function soakPed(ped, world, fromX, fromY) {
  if (ped.state === 'dead' || ped.scripted) return;
  const again = world.time - (ped._soakedAt ?? -Infinity) < 2.5;
  ped._soakedAt = world.time;
  if (again) return;
  if (ped.isCop) {
    say(ped, world, pick(COP_SOAK_LINES), 2.2, 'shout', 0.8);
    reportCrime(world, 'copBump', { seen: true });
    return;
  }
  say(ped, world, pick(Math.random() < 0.4 ? SCREAMS : SOAK_LINES), 2, 'shout', 0.8);
  startFlee(ped, world, fromX, fromY);
}

const RIDER_CLOSING = 3.5;
const RIDER_CLOSING_AMBIENT = 6;


// A bike or scooter hit hard enough loses its rider: the built-in rider on
// the bike mesh is hidden (ragdoll.syncBikeRider) and an identical-looking
// pedestrian - or the player - is launched from the saddle.
function knockOffRiders(world) {
  for (const b of world.vehicles) {
    if (!(b.isBike || b.isScooter) || b.wrecked || b.sinking || b.riderOff || b._riderAway || b._mount === 'horse') continue;
    const byPlayerBike = b.driver === 'player';
    if (!byPlayerBike && !b.road) continue;
    const bvx = Math.cos(b.angle) * b.speed, bvy = Math.sin(b.angle) * b.speed;
    for (const u of world.vehicles) {
      // no vehicle is longer than 2 * (FAR_REACH - 1.5): most pairs end here
      if (Math.abs(u.x - b.x) > FAR_REACH || Math.abs(u.y - b.y) > FAR_REACH) continue;
      if (u === b || u.isBoat || u.sinking || (u.isHeli && !u.onGround)) continue;
      if (Math.abs(u.x - b.x) > u.halfLen + 1.5 || Math.abs(u.y - b.y) > u.halfLen + 1.5) continue;
      const push = pushCircleOutOfVehicle(b.x, b.y, 0.55, u);
      if (!push) continue;
      const rvx = Math.cos(u.angle) * u.speed + (u.driftX || 0) - bvx;
      const rvy = Math.sin(u.angle) * u.speed + (u.driftY || 0) - bvy;
      const closing = rvx * push.nx + rvy * push.ny;
      // race rivals on bikes jostle; it takes a real crash to unseat anyone
      const playerInvolved = (byPlayerBike && !(u.racer && u.isBike)) || u.driver === 'player';
      if (closing < (playerInvolved ? RIDER_CLOSING : RIDER_CLOSING_AMBIENT)) continue;
      throwRider(world, b, u, bvx * 0.8 + rvx * 0.6, bvy * 0.8 + rvy * 0.6, closing, push);
      break;
    }
  }
}

function throwRider(world, b, u, vx, vy, closing, push) {
  const vz = 1.8 + closing * 0.2;
  b.riderOff = true;
  b.riderOffAt = world.time;
  b.riderOffSide = (push.nx * -Math.sin(b.angle) + push.ny * Math.cos(b.angle)) > 0 ? -1 : 1;
  b.road = null;
  b.throttle = 0;
  const bx = b.x, by = b.y;
  if (b.driver === 'player') {
    const p = world.player;
    if (p.inVehicle !== b) return;
    p.exitVehicle(world.map, world, true);
    p.x = bx; p.y = by;
    b.riderOff = true;
    let dmg = Math.round((closing - 2) * 3);
    if (world.armor > 0) { const a = Math.min(world.armor, dmg); world.armor -= a; dmg -= a; }
    world.health = Math.max(0, world.health - dmg);
    knockDown(p, world, { kind: 'hit', startPose: 'ride', dead: world.health <= 0, vx, vy, vz, lieFor: 1.6 });
    if (world.health <= 0) requestRespawn(world);
    return;
  }
  b.speed = 0;
  const seed = (b.id || 0) * 3.7 + 1;
  const ped = new Pedestrian(bx, by, b.angle);
  ped._lookSeed = seed;
  if (b.model.rider) ped.clothing = b.model.rider;
  ped.skin = SKIN_TONES[Math.floor(hash2(seed, 2.1) * SKIN_TONES.length)];
  ped.hasBag = false;
  ped.noFade = true;
  if (b.isPolice && !b.hijacked) {
    ped.isCop = true;
    b._thrownCop = ped;
  }
  ped.health -= 6 + closing * 2.5;
  if (stuntSafeAt(world, ped)) { ped.health = Math.max(1, ped.health); stuntKnock(ped, world, vx, vy); }
  const dead = ped.health <= 0;
  world.pedestrians.push(ped);
  knockDown(ped, world, { kind: 'hit', startPose: 'ride', dead, vx, vy, vz });
  if (dead) { killPed(ped, world); bleedPed(ped, world, { vehicle: u }); }
  if (u.driver === 'player') {
    world.lastPedHitAt = world.time;
    const serious = reportCrime(world, dead ? 'pedKill' : 'pedHit');
    if (dead) { world.stats.kills++; world.stats[ped.isCop ? 'copKills' : 'pedKills']++; }
    pendingEvents.push({ kind: 'hit', x: bx, y: by, r: 30, crime: serious });
  }
}

function reactToEvent(ped, ev, world, d) {
  if (ped === ev.victim) {
    say(ped, world, pick(HURT_LINES));
    startFlee(ped, world, world.player.x, world.player.y, true);
    return;
  }
  if (ped.state === 'call' || ped.state === 'film') return;
  if (ped.passengerOf && ev.kind === 'theft') return; // already running away (ejectPassengers)
  if (ped._vic && !victimDone(ped._vic)) return; // the pulled-out driver follows his own script, not the crash he just caused
  const seated = !!ped.scene;
  const roll = Math.random();
  if (ev.kind === 'crash') {
    if (d < ev.r * 0.4 || roll < 0.35) startFlee(ped, world, ev.x, ev.y);
    else if (!seated) {
      setState(ped, 'gawk', world.time + 2 + Math.random() * 3);
      ped.fleeFrom = { x: ev.x, y: ev.y };
    }
    return;
  }
  if (ev.kind === 'theft') {
    if (d < 12 && roll < 0.5 && !seated) {
      setState(ped, 'angry', world.time + 2.2, 'angry');
      if (Math.random() < 0.5) say(ped, world, pick(BUMP_LINES));
    }
    return;
  }
  const filming = world.pedestrians.reduce((n, p) => n + (p.state === 'film' ? 1 : 0), 0);
  if (roll < 0.2 && d > 10 && filming < 3 && !ped.isCop) {
    releaseFromScene(ped);
    setState(ped, 'film', world.time + 6 + Math.random() * 5, 'phone');
    if (world.time - filmLineAt > 4) {
      filmLineAt = world.time;
      say(ped, world, pick(FILM_LINES), 3, 'shout', 0.4);
    }
  } else if (roll < 0.42 && d < 28) {
    releaseFromScene(ped);
    setState(ped, 'cower', world.time + 2.5 + Math.random() * 3.5, 'crouch');
    ped.fleeFrom = { x: ev.x, y: ev.y };
    if (screamsThisEvent < 2) { screamsThisEvent++; say(ped, world, pick(SCREAMS), 2, 'shout', 0.9); }
  } else {
    startFlee(ped, world, ev.x, ev.y);
    if (d < 30 && screamsThisEvent < 3) { screamsThisEvent++; say(ped, world, pick(SCREAMS), 2, 'shout', 0.9); }
  }
}

function startWitnessCall(world, ev) {
  if (activeCall || world.wanted > 0) return;
  let best = null, bestD = Infinity;
  for (const p of world.pedestrians) {
    if (p.isCop || p.state === 'dead' || p === ev.victim || p.state === 'film' || p._vic) continue;
    const d = dist(p.x, p.y, ev.x, ev.y);
    if (d > WITNESS_RADIUS || d < 4 || d >= bestD) continue;
    if (!lineOfSight(world.map, p.x, p.y, ev.x, ev.y)) continue;
    best = p; bestD = d;
  }
  if (!best && ev.witness && !ev.witness._vic) best = ev.witness;
  if (!best) return;
  releaseFromScene(best);
  setState(best, 'call', world.time + CALL_MIN + Math.random() * (CALL_MAX - CALL_MIN), 'call');
  best.fleeFrom = { x: ev.x, y: ev.y };
  say(best, world, CALL_LINES[ev.kind] || CALL_LINES.shot, 3.5, null);
  activeCall = { ped: best, x: ev.x, y: ev.y, kind: ev.kind };
}

function updateWitnessCall(world) {
  if (!activeCall) return;
  const { ped } = activeCall;
  if (ped.state === 'dead' || !world.pedestrians.includes(ped) || world.wanted > 0) { activeCall = null; return; }
  if (ped.state !== 'call') { activeCall = null; return; }
  if (world.time < ped.stateUntil) return;
  world.wanted = 1;
  world.policeTip = { x: activeCall.x, y: activeCall.y, time: world.time };
  world.wantedProfile = profileOf(world);
  world.addMessage('Een getuige heeft de politie gebeld!', 3);
  say(ped, world, 'Ze komen der aan!', 2.2, null);
  startFlee(ped, world, world.player.x, world.player.y, true);
  activeCall = null;
}

// the nearest police unit (on foot or in a car) that can see the ped, or null
function copInSight(world, ped) {
  for (const c of world.pedestrians) {
    if (c.isCop && c.state !== 'dead' && dist(c.x, c.y, ped.x, ped.y) < VICTIM.agentNear && lineOfSight(world.map, c.x, c.y, ped.x, ped.y)) return c;
  }
  for (const v of world.vehicles) {
    if (v.isPolice && !v.hijacked && !v.wrecked && dist(v.x, v.y, ped.x, ped.y) < VICTIM.agentNear) return v;
  }
  return null;
}

// the stolen car is known: the police get its description (signalement.js)
function reportCarTheft(world, ped, car) {
  if (world.wanted > 0 || world.player.inVehicle !== car) return;
  world.wanted = 1;
  world.policeTip = { x: ped.x, y: ped.y, time: world.time };
  world.wantedProfile = profileOf(world);
  world.addMessage('De bestuurder heeft de diefstal gemeld!', 3);
}

function processEvents(world, events) {
  for (const ev of events) {
    ev.id = ++eventSeq;
    screamsThisEvent = 0;
    if (ev.kind === 'theft') {
      let victim = null;
      if (ev.hadDriver) { victim = ejectDriver(world, ev); ejectPassengers(world, ev); clearSeated(ev.vehicle); }
      if (!victim) {
        let bestD = 14;
        for (const p of world.pedestrians) {
          if (p.isCop || p.state === 'dead') continue;
          const d = dist(p.x, p.y, ev.x, ev.y);
          if (d < bestD) { bestD = d; victim = p; }
        }
      }
      if (victim) {
        releaseFromScene(victim);
        setState(victim, 'angry', world.time + 2.5, 'angry');
        say(victim, world, pick(ev.vehicle.isBike ? BIKE_THEFT_LINES : THEFT_LINES), 3, 'shout', 1);
        ev.witness = victim;
        ev.victimPed = victim;
        // the driver pulled out of his car follows his own script (carjackvictim.js)
        if (ev.hadDriver && victim.noFade) { victim._vic = createVictim(ev.vehicle.id || 1, { isBike: !!(ev.vehicle.isBike || ev.vehicle.isScooter) }); victim._vicCar = ev.vehicle; }
      }
    }
    for (const ped of world.pedestrians) {
      if (ped.isCop || ped.state === 'dead' || ped === ev.victimPed) continue;
      const d = dist(ped.x, ped.y, ev.x, ev.y);
      if (d > ev.r && ped !== ev.victim) continue;
      reactToEvent(ped, ev, world, d);
    }
    if (ev.crime) startWitnessCall(world, ev);
  }
}

// --- waving at the player sailing past -----------------------------------
// People on the quays wave (scene3d draws the arm from ped.greetUntil) and
// now and then call out when the player's boat goes by.

const GREET_LINES = ['Moi!', 'Ahoi!', 'Mooi bootje!', 'Goeie vaart!', 'Moi, schipper!', 'Hoi hoi!', 'Moi! Hou dij goud!', 'Kiek, doar is n bootje!'];
let greetScanAt = 0;

function greetPassingBoat(world) {
  const pv = world.player.inVehicle;
  if (!pv || !pv.isBoat || Math.abs(pv.speed) < 0.8 || world.time < greetScanAt) return;
  greetScanAt = world.time + 0.4;
  let shouted = false;
  for (const p of world.pedestrians) {
    if (p.isCop || p.scene || p.state !== 'wander' || p.ragdoll || p.pose) continue;
    if (world.time < (p._greetedAt ?? -99) + 25) continue;
    const d = dist(p.x, p.y, pv.x, pv.y);
    if (d > 16 || d < 2) continue;
    p._greetedAt = world.time;
    if (Math.random() > 0.45) continue;
    p.greetUntil = world.time + 2.4;
    if (!shouted && Math.random() < 0.35) {
      say(p, world, pick(GREET_LINES), 2.2, null);
      shouted = true;
    }
  }
}

// --- cyclists' bells ----------------------------------------------------

function updateBikeBells(world) {
  const p = world.player;
  const pv = p.inVehicle;
  if (pv && Math.abs(pv.speed) > 3) return;
  for (const v of world.vehicles) {
    if (!v.isBike || v._mount === 'horse' || v.driver === 'player' || v.wrecked || v === pv) continue;
    if (Math.abs(v.speed) < 1.5) continue;
    const dx = p.x - v.x, dy = p.y - v.y;
    if (dx * dx + dy * dy > 81) continue;
    const fx = Math.cos(v.angle), fy = Math.sin(v.angle);
    const fwd = dx * fx + dy * fy, lat = Math.abs(dy * fx - dx * fy);
    if (fwd < 0.6 || fwd > 8 || lat > (pv ? pv.halfWid + 0.9 : 1.3)) continue;
    if (world.time < (v._bellAt || 0)) continue;
    v._bellAt = world.time + 2.5 + Math.random() * 2;
    pushAudioEvent(world, { kind: 'bell', x: v.x, y: v.y, strength: 1 });
  }
}

// --- population: fewer walkers at night, busy centre nightlife -----------

const POP_DAY = 36;
const POP_NIGHT_OUT = 20;
const POP_NIGHT_CENTRE = 30;
const NIGHTLIFE_EXTRA = 18;
let popTimer = 0;

function hotspotNear(x, y) {
  return NIGHT_HOTSPOTS.find((h) => dist(x, y, h.x, h.y) < h.r + 60) || null;
}

function spawnNightGroup(world) {
  const { map, player } = world;
  const horeca = (map.meta.horeca || []).filter((h) => {
    const d = dist(h.x, h.y, player.x, player.y);
    return d > 25 && d < 95 && NIGHT_HOTSPOTS.some((s) => dist(h.x, h.y, s.x, s.y) < s.r);
  });
  if (!horeca.length) return 0;
  const h = pick(horeca);
  for (let attempt = 0; attempt < 12; attempt++) {
    const a = Math.random() * Math.PI * 2, r = 3 + Math.random() * 6;
    const cx = h.x + Math.cos(a) * r, cy = h.y + Math.sin(a) * r;
    if (isInsideBuilding(map, cx, cy) || isInWater(map, cx, cy) || isOnRoad(map, cx, cy, 0.5)) continue;
    if (!isSpawnHidden(world, cx, cy)) continue;
    const n = 2 + Math.floor(Math.random() * 3);
    for (let k = 0; k < n; k++) {
      const ang = (k / n) * Math.PI * 2;
      const px = cx + Math.cos(ang) * 0.8, py = cy + Math.sin(ang) * 0.8;
      const ped = new Pedestrian(px, py, ang + Math.PI);
      ped.anchor = { x: cx, y: cy, r: 2.5 };
      ped.nightlife = true;
      world.pedestrians.push(ped);
    }
    return n;
  }
  return 0;
}

function managePopulation(world) {
  const { player } = world;
  const night = dayState(world).isNight;
  const inCentre = dist(player.x, player.y, CITY_CENTRE.x, CITY_CENTRE.y) < CITY_CENTRE.r;
  const hot = night && hotspotNear(player.x, player.y);
  let walkers = 0, nightlife = 0;
  for (const p of world.pedestrians) {
    if (p.isCop || p.scene || p.state === 'dead') continue;
    if (dist(p.x, p.y, player.x, player.y) > 150) continue;
    if (p.nightlife) nightlife++;
    else walkers++;
  }
  // simlagen (issue #18): doel per streek en tijd van de dag uit simlagen.js
  const desired = scaledTarget(FLAGS.simlagen ? voetgangerOpties(wijkProfileAt(world.map, player.x, player.y).key, hourOf(world)).target : !night ? POP_DAY : inCentre ? POP_NIGHT_CENTRE : POP_NIGHT_OUT);
  spawnBudget = Math.max(0, desired - walkers);

  if (walkers > desired + 3) {
    let excess = walkers - desired;
    for (let i = world.pedestrians.length - 1; i >= 0 && excess > 0; i--) {
      const p = world.pedestrians[i];
      if (p.isCop || p.scene || p.nightlife || p.leader || p.state !== 'wander') continue;
      if (dist(p.x, p.y, player.x, player.y) < 55 || !isSpawnHidden(world, p.x, p.y)) continue;
      world.pedestrians.splice(i, 1);
      excess--;
    }
  } else if (walkers < desired - 4) {
    const n = Math.min(12, desired - walkers);
    const add = addCompanions(world.map, spawnPedsRaw(world.map, player.x, player.y, n, Math.random, 30), n);
    world.pedestrians.push(...add);
  }

  if (hot && nightlife < NIGHTLIFE_EXTRA) spawnNightGroup(world);
  if (!night && nightlife > 0) {
    for (const p of world.pedestrians) {
      if (p.nightlife && dist(p.x, p.y, player.x, player.y) > 60) { p.nightlife = false; p.anchor = null; }
    }
  }
}

// --- per-ped physics ------------------------------------------------------

const PED_OPTS = { ped: true, kick: false };
const PED_SEAT_OPTS = { ped: true, kick: false, skipSeats: true };

const FAR_REACH = 14;

function checkVehicleImpact(ped, world) {
  for (const v of world.vehicles) {
    if (Math.abs(v.x - ped.x) > FAR_REACH || Math.abs(v.y - ped.y) > FAR_REACH) continue;
    if (v.isBoat || v.sinking) continue;
    if (Math.abs(v.x - ped.x) > v.halfLen + 1 || Math.abs(v.y - ped.y) > v.halfLen + 1) continue;
    if (Math.abs((v.z || 0) - (ped.gz || 0)) > 2) continue;
    const push = pushCircleOutOfVehicle(ped.x, ped.y, ped.radius, v);
    if (!push) continue;
    if (v.wrecked || Math.abs(v.speed) < VEHICLE_HIT_SPEED) {
      if (ped.ragdoll) continue;
      [ped.x, ped.y] = resolveBuildingCollisions(push.x, push.y, ped.radius, world.map);
      if (v.wrecked) continue;
      if (v.driver === 'player' && !v.shiftParked && !ped.isCop && world.time > (ped._bumpCd || 0)) {
        ped._bumpCd = world.time + 5;
        say(ped, world, pick(CAR_BUMP_LINES));
        if (!ped.scene) {
          setState(ped, 'angry', world.time + 1.8, 'angry');
        }
      }
      continue;
    }
    if (ped.ragdoll && world.time - ped.ragdoll.hitAt < 0.6) continue;
    const speed = Math.abs(v.speed);
    const light = v.isBike || v.isScooter;
    const vx = Math.cos(v.angle) * v.speed, vy = Math.sin(v.angle) * v.speed;
    const away = speed * 0.35;
    ped.knockVX = vx * 0.85 + push.nx * away;
    ped.knockVY = vy * 0.85 + push.ny * away;
    ped.angle = Math.atan2(-ped.knockVY, -ped.knockVX);
    ped.x = push.x;
    ped.y = push.y;
    v.speed *= light ? 0.6 : 0.94;
    reportImpact(world, ped.x, ped.y, Math.abs(v.speed) * 0.5, v.driver === 'player');
    releaseFromScene(ped);
    setPedPose(ped, null);
    // slow cars and bikes floor you, fast cars kill
    ped.health -= light ? 8 + speed * 2 : speed < 7 ? 10 + speed * 2.5 : 999;
    // H3's stunt evening (stuntavond.js): a knock, never a casualty
    if (stuntSafeAt(world, ped)) { ped.health = Math.max(1, ped.health); stuntKnock(ped, world, ped.knockVX, ped.knockVY); }
    const dead = ped.health <= 0;
    // fast enough to kill outright: Carmageddon-style burst (falls back to the ragdoll with gore off)
    const gib = dead && !light && speed >= GIB_SPEED && splatterPed(ped, world, { vx: ped.knockVX, vy: ped.knockVY, vz: 3 + speed * 0.15, vehicle: v });
    if (!gib) knockDown(ped, world, { kind: 'hit', dead, vx: ped.knockVX, vy: ped.knockVY, vz: (light ? 0.8 : 1.2) + speed * 0.22 });
    if (dead) {
      killPed(ped, world);
      if (gib) ped.deadUntil = world.time + 1.5;
      else bleedPed(ped, world, { vehicle: light ? null : v, spray: { dx: ped.knockVX, dy: ped.knockVY, k: Math.min(1, speed / GIB_SPEED) } });
    } else ped.speed = 0;
    if (v.driver === 'player') {
      // knocking someone over on a bike or scooter is a scene, not a crime
      const crime = dead || !light || ped.isCop;
      world.lastPedHitAt = world.time;
      const serious = crime && (ped.isCop ? reportCrime(world, dead ? 'pedKill' : 'copHit', { seen: true }) : reportCrime(world, dead ? 'pedKill' : 'pedHit'));
      if (dead) { world.stats.kills++; world.stats[ped.isCop ? 'copKills' : 'pedKills']++; }
      pendingEvents.push({ kind: 'hit', x: ped.x, y: ped.y, r: 30, crime: serious });
    }
    return;
  }
}

const pendingEvents = [];

function checkBump(ped, world) {
  const p = world.player;
  if (p.inVehicle || ped.isCop) return;
  const min = ped.radius + (p.radius || 0.35) + 0.15;
  if (Math.abs(ped.x - p.x) > min || Math.abs(ped.y - p.y) > min) return;
  if (dist(ped.x, ped.y, p.x, p.y) > min || world.time < (ped._bumpCd || 0)) return;
  ped._bumpCd = world.time + 6;
  if (Math.random() < 0.35) return;
  say(ped, world, pick(BUMP_LINES));
  if (!ped.scene && (ped.state === 'wander' || ped.state === 'gawk')) setState(ped, 'angry', world.time + 1.6, 'angry');
}

function steerClear(map, ped, angle) {
  const probe = 1.6;
  for (const off of [0, 0.7, -0.7, 1.4, -1.4, 2.2, -2.2]) {
    const a = angle + off;
    const x = ped.x + Math.cos(a) * probe, y = ped.y + Math.sin(a) * probe;
    if (!isInsideBuilding(map, x, y) && !isInWater(map, x, y)) return a;
  }
  return angle;
}

// Walkers in the path of the player's vehicle while it moves off or creeps
// along step aside, so pulling away from a stop doesn't mow down whoever
// strolls past the bumper. Returns the heading to step to, or null.
function dodgePlayerVehicle(ped, v) {
  const fx = Math.cos(v.angle), fy = Math.sin(v.angle);
  const dx = ped.x - v.x, dy = ped.y - v.y;
  const fwd = dx * fx + dy * fy, lat = dy * fx - dx * fy;
  const reach = v.halfLen + 2.5 + Math.max(0, v.speed) * 1.1;
  if (fwd < 0 || fwd > reach || Math.abs(lat) > v.halfWid + 1.2) return null;
  const side = lat >= 0 ? 1 : -1;
  return Math.atan2(fx * side, -fy * side);
}

function faceToward(ped, x, y) {
  ped.angle = Math.atan2(y - ped.y, x - ped.x);
}

function updateCop(ped, world, dPlayer, dt) {
  const { player } = world;
  ped._losT = (ped._losT || 0) - dt;
  if (ped._losT <= 0) {
    ped._losT = 0.3;
    ped._sees = dPlayer < COP_SEEK_GIVEUP_RADIUS && lineOfSight(world.map, ped.x, ped.y, player.x, player.y);
  }
  const canSee = ped._sees;
  // police.js recalls officers to their car/mount (or one to commandeer)
  if (ped._recall && ped._unit) {
    if (ped.state !== 'return') setState(ped, 'return');
    return;
  }
  if (ped.state === 'return') setState(ped, 'wander');
  if (world.wanted === 0) {
    if (ped.state !== 'wander') setState(ped, 'wander');
    ped.guard = null;
  } else if (ped.state !== 'seek' && canSee && dPlayer < COP_SEEK_TRIGGER_RADIUS + (ped.guard ? 6 : 0)) {
    setState(ped, 'seek');
    ped.guard = null;
    if (Math.random() < 0.6) say(ped, world, pick(COP_LINES), 2, 'shout', 0.9);
  } else if (ped.state === 'seek' && (dPlayer > COP_SEEK_GIVEUP_RADIUS || (!canSee && dPlayer > 8))) {
    setState(ped, 'wander');
  }
}

export function updatePedestrians(dt, world) {
  const { map, player } = world;
  const peds = world.pedestrians;
  const aiming = isRangedWeapon(world.weapon) && world.input.mouse.down;

  const events = gatherEvents(world);
  if (pendingEvents.length) events.push(...pendingEvents.splice(0));
  if (events.length) processEvents(world, events);
  updateWitnessCall(world);
  updateBikeBells(world);
  greetPassingBoat(world);
  knockOffRiders(world);
  processPedPlanQueue(world);
  buildPedAvoidGrid(peds);

  spawnWorld = world;
  // after a teleport the new surroundings are empty and the view has just cut,
  // so filling them in plain sight is fine for a moment
  if (lastPlayerX !== null && dist(player.x, player.y, lastPlayerX, lastPlayerY) > 60) {
    world.pedFreeSpawnUntil = world.time + 0.3;
    popTimer = 0;
  }
  lastPlayerX = player.x;
  lastPlayerY = player.y;

  popTimer -= dt;
  if (popTimer <= 0) {
    popTimer = 2;
    managePopulation(world);
    prunePoseSources(new Set(peds));
  }

  // civilians beside a racing police car step back and look (#52); the cap
  // on lookers follows the stars and the frame time
  const chaseCars = world.wanted > 0 ? world.vehicles.filter((v) => v.isPolice && !v.isBoat && !v.wrecked && Math.abs(v.speed) > 8) : [];
  let lookers = 0;
  const lookerCap = chaseCars.length ? npcBudget(world.wanted, dt * 1000) : 0;
  let filming = 0;
  const pv = player.inVehicle;
  const dodgeVehicle = pv && !pv.isBoat && pv.speed > -0.5 ? pv : null;
  const frameDt = dt;
  const farAI = farAIDist();
  // ver weg lopende wandelaars worden door de simulatieworker gestuurd (simbridge.js, #58)
  const simBridge = FLAGS.simworker && map.roads ? getSimBridge(map) : null;
  if (simBridge) simBridge.update(dt, player, peds, world.time);
  for (let i = peds.length - 1; i >= 0; i--) {
    const ped = peds[i];
    if (ped.scripted) continue; // posed by its owner (fierljep.js)
    if (ped.stepOut) {
      // stepping out of a car (ejectDriver calm): slide seat -> door, nothing else thinks meanwhile
      ped.stepOut.t += frameDt;
      const so = stepOutPos(ped.stepOut, ped.stepOut.t);
      ped.x = so.x; ped.y = so.y; ped.speed = so.done ? 0 : 1.4;
      if (so.done) ped.stepOut = null;
      continue;
    }
    if (simBridge && simBridge.drive(ped)) continue;
    // far plain walkers think less often on a CPU-bound machine (simload.js)
    if (farAI < Infinity && ped.state === 'wander' && !ped.isCop && !ped.scene && !ped.ragdoll && !ped.missionCrowd && !ped.jobPed &&
      skipFar(ped, i, Math.abs(ped.x - player.x) + Math.abs(ped.y - player.y), frameDt)) continue;
    // vereenvoudigde laag: gewone wandelaars op middenafstand denken om de paar frames
    if (FLAGS.simlagen && ped.state === 'wander' && !ped.isCop && !ped.scene && !ped.ragdoll && !ped.missionCrowd && !ped.jobPed) {
      const dd = Math.abs(ped.x - player.x) + Math.abs(ped.y - player.y);
      if (dd > 70 && stapSlaOver('voetganger', dd * 0.75, i, Math.floor(world.time * 60))) { ped._simDt = (ped._simDt || 0) + frameDt; continue; }
    }
    const dt = takeDt(ped, frameDt);

    if (ped.state === 'dead') {
      if (ped.pose) setPedPose(ped, null);
      ped.speechUntil = 0;
      if (ped.knockVX || ped.knockVY) {
        [ped.x, ped.y] = resolveBuildingCollisions(ped.x + ped.knockVX * dt, ped.y + ped.knockVY * dt, ped.radius, map);
        const decay = Math.exp(-KNOCK_DECAY * dt);
        ped.knockVX *= decay;
        ped.knockVY *= decay;
        if (Math.hypot(ped.knockVX, ped.knockVY) < 0.1) { ped.knockVX = 0; ped.knockVY = 0; }
        if (isInWater(map, ped.x, ped.y)) {
          world.particles.push({ kind: 'splash', x: ped.x, y: ped.y, until: world.time + 1.1 });
          peds.splice(i, 1);
          continue;
        }
      }
      if (world.time >= ped.deadUntil) peds.splice(i, 1);
      continue;
    }
    if (ped.ragdoll && ped.ragdoll.dead) { killPed(ped, world); continue; }
    if (isKnockedDown(ped, world)) {
      ped.speed = 0;
      if (ped.pose) setPedPose(ped, null);
      checkVehicleImpact(ped, world);
      continue;
    }
    if (ped.gotUpAt) {
      ped.gotUpAt = 0;
      if (ped._vic && !victimDone(ped._vic)) setState(ped, 'jackvic');
      else if (!ped.isCop) startFlee(ped, world, player.x, player.y, true);
    }

    const dPlayer = dist(ped.x, ped.y, player.x, player.y);
    if (ped.isCop) updateCop(ped, world, dPlayer, dt);
    else if (aiming && dPlayer < FLEE_TRIGGER_RADIUS && ped.state !== 'flee' && ped.state !== 'cower') {
      startFlee(ped, world, player.x, player.y, true);
      if (Math.random() < 0.3) say(ped, world, pick(SCREAMS), 2, 'shout', 0.8);
    }

    if (chaseCars.length && !ped.isCop && ped.state === 'wander' && lookers < lookerCap && !(ped._chaseLookAt > world.time)) {
      ped._chaseLookAt = world.time + 1.5 + Math.random();
      for (const cv of chaseCars) {
        const dv = dist(ped.x, ped.y, cv.x, cv.y);
        if (dv > 22) continue;
        const react = bystanderReaction({ dist: dv, unitSpeed: Math.abs(cv.speed), onRoad: isOnRoad(map, ped.x, ped.y, 1), seated: !!ped.scene, roll: Math.random() });
        if (react === 'flee') startFlee(ped, world, cv.x, cv.y);
        else if (react === 'gawk') { setState(ped, 'gawk', world.time + 2 + Math.random() * 2); ped.fleeFrom = { x: cv.x, y: cv.y }; lookers++; }
        if (react) break;
      }
    }

    const t = world.time;
    let moving = true;
    switch (ped.state) {
      case 'flee': {
        const src = ped.fleeFrom || player;
        const dSrc = dist(ped.x, ped.y, src.x, src.y);
        if (t > ped.stateUntil && dSrc > FLEE_SAFE_RADIUS) { setState(ped, 'wander'); break; }
        const away = Math.atan2(ped.y - src.y, ped.x - src.x) + (ped.fleeJitter || 0);
        ped.angle = steerClear(map, ped, away);
        ped.speed = ped.fleeSpeed || FLEE_SPEED;
        break;
      }
      case 'cower':
        moving = false;
        if (t > ped.stateUntil) {
          const src = ped.fleeFrom || player;
          startFlee(ped, world, src.x, src.y);
        }
        break;
      case 'film':
        moving = false;
        filming++;
        faceToward(ped, player.x, player.y);
        if (dPlayer < 5) startFlee(ped, world, player.x, player.y, true);
        else if (t > ped.stateUntil) setState(ped, 'wander');
        break;
      case 'jackvic': {
        moving = false;
        const car = ped._vicCar;
        const o = stepVictim(ped._vic, dt, {
          dCar: car ? dist(ped.x, ped.y, car.x, car.y) : 99, carSpeed: car ? car.speed : 0,
          copNear: copInSight(world, ped),
        });
        setPedPose(ped, o.pose);
        if (o.say) say(ped, world, o.say, 2.6, null);
        if (o.report) reportCarTheft(world, ped, car);
        if (o.move === 'chase' && car) { faceToward(ped, car.x, car.y); ped.speed = VICTIM.chaseSpeed; moving = true; }
        else if (o.move === 'away') { const a = Math.atan2(ped.y - (car ? car.y : player.y), ped.x - (car ? car.x : player.x)); ped.angle = steerClear(map, ped, a); ped.speed = WANDER_SPEED * 1.4; moving = true; }
        else if (o.face === 'cop') { const c = copInSight(world, ped); if (c) faceToward(ped, c.x, c.y); }
        else if (car) faceToward(ped, car.x, car.y);
        if (victimDone(ped._vic)) { ped._vic = null; ped._vicCar = null; setState(ped, 'wander'); }
        break;
      }
      case 'call':
        moving = false;
        if (ped.fleeFrom) faceToward(ped, ped.fleeFrom.x, ped.fleeFrom.y);
        if (dPlayer < 4) startFlee(ped, world, player.x, player.y, true);
        break;
      case 'gawk':
        moving = false;
        if (ped.fleeFrom) faceToward(ped, ped.fleeFrom.x, ped.fleeFrom.y);
        if (t > ped.stateUntil) setState(ped, 'wander');
        break;
      case 'angry':
        moving = false;
        faceToward(ped, player.x, player.y);
        if (t > ped.stateUntil) setState(ped, ped.scene ? 'idle' : 'wander', 0, ped.scene ? ped.scene.pose : null);
        break;
      case 'idle':
        moving = false;
        if (ped.scene) {
          ped.x = ped.scene.x; ped.y = ped.scene.y; ped.angle = ped.scene.angle;
          if (ped.pose !== ped.scene.pose) setPedPose(ped, ped.scene.pose);
        } else setState(ped, 'wander');
        break;
      case 'guard':
        moving = false;
        if (ped.guard) { ped.x = ped.guard.x; ped.y = ped.guard.y; ped.angle = ped.guard.angle; }
        break;
      case 'seek': {
        faceToward(ped, player.x, player.y);
        if (dPlayer < COP_HOLD_DIST) { moving = false; break; }
        ped.angle = steerClear(map, ped, ped.angle);
        ped.speed = dPlayer < COP_SPRINT_RADIUS ? COP_SPRINT_SPEED : COP_JOG_SPEED;
        break;
      }
      case 'return': {
        const u = ped._unit;
        if (!u) { setState(ped, 'wander'); break; }
        if (ped._boarded || distToVehicleBody(u, ped.x, ped.y) < COP_BOARD_REACH) { ped._boarded = true; moving = false; break; }
        faceToward(ped, u.x, u.y);
        ped.angle = steerClear(map, ped, ped.angle);
        ped.speed = dist(ped.x, ped.y, u.x, u.y) > 8 ? COP_JOG_SPEED : WANDER_SPEED * 1.6;
        break;
      }
      default: {
        if (ped.state !== 'wander') setState(ped, 'wander');
        if (!ped.isCop) {
          ped.speechTimer -= dt;
          if (ped.speechTimer <= 0) {
            ped.speechTimer = SPEECH_MIN_INTERVAL + Math.random() * (SPEECH_MAX_INTERVAL - SPEECH_MIN_INTERVAL);
            // bubble only together with real audio, and deliberately rare
            if (Math.random() < 0.12) {
              const phraseIdx = Math.floor(Math.random() * GRONINGS_PHRASES.length);
              if (playNpcPhrase(phraseIdx, ped.x, ped.y)) {
                ped.speechText = GRONINGS_PHRASES[phraseIdx];
                ped.speechUntil = world.time + SPEECH_DURATION;
              }
            }
          }
        }
        if (!ped.anchor && !(ped.isCop && world.police?.searching)) {
          const walk = walkRoute(ped, world, dt, dPlayer);
          if (walk === 'enter') { peds.splice(i, 1); continue; }
          moving = walk;
          break;
        }
        if (!ped.waypoint || dist(ped.x, ped.y, ped.waypoint[0], ped.waypoint[1]) < 1.5) {
          ped.waypointTimer -= dt;
          if (ped.waypointTimer <= 0) {
            const search = ped.isCop && world.police?.searching && world.police.searchCenter;
            if (ped.anchor) ped.waypoint = pickWaypoint(map, ped.x, ped.y, ped.anchor.r, ped.anchor.x, ped.anchor.y);
            else if (search) {
              const a = Math.random() * Math.PI * 2, r = Math.random() * world.police.searchRadius * 0.7;
              ped.waypoint = pickWaypoint(map, ped.x, ped.y, 6, search.x + Math.cos(a) * r, search.y + Math.sin(a) * r);
            } else ped.waypoint = pickWaypoint(map, ped.x, ped.y);
            ped.waypointTimer = ped.anchor ? 4 + Math.random() * 8 : 3 + Math.random() * 4;
          }
        }
        if (ped.waypoint && dist(ped.x, ped.y, ped.waypoint[0], ped.waypoint[1]) >= 1.5) {
          ped.angle = Math.atan2(ped.waypoint[1] - ped.y, ped.waypoint[0] - ped.x);
          ped.speed = ped.anchor ? WANDER_SPEED * 0.6 : WANDER_SPEED * (ped.paceMul || 1);
        } else if (ped.anchor) {
          moving = false;
        } else {
          ped.speed = WANDER_SPEED * (ped.paceMul || 1);
        }
      }
    }

    const dodge = dodgeVehicle && !ped.isCop && !ped.scene && ped.state !== 'guard' ? dodgePlayerVehicle(ped, dodgeVehicle) : null;
    if (dodge !== null) {
      ped.angle = dodge;
      ped.speed = Math.max(ped.speed || 0, 3.2);
      moving = true;
    }
    if (!moving) {
      ped.speed = 0;
    } else {
      const vx = Math.cos(ped.angle) * ped.speed, vy = Math.sin(ped.angle) * ped.speed;
      let nx = ped.x + vx * dt;
      let ny = ped.y + vy * dt;
      [nx, ny] = resolveWalker(nx, ny, ped.radius, map, vx, vy, ped.nav && ped.nav.sit ? PED_SEAT_OPTS : PED_OPTS, ped.gz || 0);
      if (!isInWater(map, ped.x, ped.y) && isInWater(map, nx, ny)) {
        if (!isInWater(map, nx, ped.y)) ny = ped.y;
        else if (!isInWater(map, ped.x, ny)) nx = ped.x;
        else { nx = ped.x; ny = ped.y; }
      }
      // the ring has no crossings: never step onto its carriageway
      const gz = ped.gz || 0;
      if ((nx !== ped.x || ny !== ped.y) && map.onRingCarriageway(nx, ny, gz) && !map.onRingCarriageway(ped.x, ped.y, gz)) {
        if (!map.onRingCarriageway(nx, ped.y, gz)) ny = ped.y;
        else if (!map.onRingCarriageway(ped.x, ny, gz)) nx = ped.x;
        else { nx = ped.x; ny = ped.y; }
      }
      ped.x = nx;
      ped.y = ny;
      if (map.elev && map.elev.has) {
        const st = ped.surf || (ped.surf = { z: 0, ribbon: null, kind: 'ground' });
        st.z = ped.gz || 0;
        ped.gz = map.surfaceAt(nx, ny, st).z;
      }
    }

    checkBump(ped, world);
    checkVehicleImpact(ped, world);
  }
  separatePeds(peds, map);
  world.pedFilming = filming;
}
