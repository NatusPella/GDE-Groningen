import { dist, pointInPolygon, closestPointOnSegment, isInWater } from './util.js';
import { resolveBuildingCollisions, findExitSpot } from './player.js';
import { requestRespawn } from './world.js';
import { playNpcPhrase } from './audio.js';
import { pushCircleOutOfVehicle, reportImpact } from './vehicle.js';
import { getCombatEffect } from './combat.js';
import { registerPoseSource, unregisterPoseSource, prunePoseSources } from './models3d_people.js';

const WANDER_SPEED = 1.3;
const FLEE_SPEED = 3.6;
const FLEE_TRIGGER_RADIUS = 9;
const FLEE_SAFE_RADIUS = 34;
export const DEAD_DURATION = 2.5;
const WAYPOINT_RADIUS = 15;
const VEHICLE_HIT_SPEED = 4;
const KNOCK_DECAY = 3.5;
const SPEECH_DURATION = 3;
const SPEECH_MIN_INTERVAL = 15;
const SPEECH_MAX_INTERVAL = 30;

const COP_CLOTHING = '#1c3fae';
const COP_SEEK_SPEED = 3.1;
const COP_SEEK_TRIGGER_RADIUS = 18;
const COP_SEEK_GIVEUP_RADIUS = 28;
const COP_BUST_FAST_SPEED = 9;
const COP_BUST_CONTACT_MARGIN = 0.1;

const WITNESS_RADIUS = 45;
const CALL_MIN = 5;
const CALL_MAX = 8.5;

export const CITY_CENTRE = { x: 190, y: 140, r: 380 };
const NIGHT_HOTSPOTS = [
  { x: 390, y: 122, r: 90 },
  { x: 395, y: 205, r: 80 },
  { x: 160, y: 95, r: 90 },
];

const GRONINGS_PHRASES = [
  'Moi!', 'Hoi, alles goud?', 't Is mooi weer vandoag, net?',
  'Kom, we goan derhen.', 'Wat bin je aan het doun?', 'Doe mor gewoon.',
  'Lekker bakkie doen?', 'Nou, mag ik der wel weer over klagen.',
  'Ligt aan die kolde wind, geleuf ik.', 'Tot straks, moi!',
];

const SCREAMS = ['Help!', 'Aaah!', 'Wegwezen!', 'Rennen!', 'Hulp!', 'Nee, nee, nee!'];
const HURT_LINES = ['Au! Bist betoeterd?', 'Au! Wat dust doe?', 'Hé! Rot op, joh!'];
const BUMP_LINES = ['Kiek uut!', 'Rot op, joh!', 'Bist betoeterd?', 'Hé, kiek es uut!', 'Pas toch op, joh!'];
const CAR_BUMP_LINES = ['Kiek uut, joh!', 'Bist betoeterd?', 'Hé! Ik loop hier!'];
const THEFT_LINES = ['Hé, dat is mien auto!', 'Mien auto! Rot op, joh!', 'Hé! Kom terug mit mien auto!'];
const BIKE_THEFT_LINES = ['Hé, mien fiets!', 'Dat is mien fiets, joh!'];
const FILM_LINES = ['Dit gaat op Sikkom!', 'Dit gaat op Sikkom!', 'Moi, dit wordt viraal!'];
const COP_LINES = ['Staan blijven! Politie!', 'Handen omhoog!', 'Blijf stoan!'];
const CALL_LINES = {
  shot: 'Hallo, 112? Hier wordt schoten!',
  boom: '112? Hier ontploft van alles!',
  hit: 'Politie? Hier slaat een gek mensen!',
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

export function setPedPose(ped, pose) {
  if (ped.pose === pose) return;
  ped.pose = pose;
  if (pose) registerPoseSource(ped._lookSeed, ped);
  else unregisterPoseSource(ped._lookSeed);
}

let spawnBudget = 45;

function spawnPedsRaw(map, x, y, count, rng, minDist = 0) {
  const peds = [];
  const roads = map.roadsNear(x, y, 60).filter((r) => r.pts.length >= 2);
  if (!roads.length) return peds;

  let attempts = 0;
  while (peds.length < count && attempts < count * 25) {
    attempts++;
    const road = roads[Math.floor(rng() * roads.length)];
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
    if (d > 60 || d < minDist) continue;
    if (isInsideBuilding(map, fx, fy) || isInWater(map, fx, fy)) continue;

    peds.push(new Pedestrian(fx, fy, rng() * Math.PI * 2 - Math.PI));
  }
  return peds;
}

// Civilian spawns honour a budget set by the population manager below, so
// main.js's fixed top-up can't undo the night-time thinning.
export function spawnPedestriansNear(map, x, y, count, rng = Math.random) {
  const n = Math.max(0, Math.min(count, Math.floor(spawnBudget)));
  spawnBudget -= n;
  return n ? spawnPedsRaw(map, x, y, n, rng) : [];
}

export function spawnCopPedestriansNear(map, x, y, count, rng = Math.random) {
  const cops = spawnPedsRaw(map, x, y, count, rng);
  for (const cop of cops) {
    cop.isCop = true;
    cop.clothing = COP_CLOTHING;
    cop.hasBag = false;
  }
  return cops;
}

export function isInsideBuilding(map, x, y) {
  for (const b of map.buildingsNear(x, y, 0.5)) {
    const [minx, miny, maxx, maxy] = b.bounds;
    if (x < minx || x > maxx || y < miny || y > maxy) continue;
    if (pointInPolygon(x, y, b.pts)) return true;
  }
  return false;
}

export function isOnRoad(map, x, y, margin = 0, cats = null) {
  for (const r of map.roadsNear(x, y, 2 + margin)) {
    if (cats ? !cats.includes(r.cat) : r.cat === 'foot') continue;
    const pts = r.pts;
    const halfW = (r.width || 5) / 2 + margin;
    const [minx, miny, maxx, maxy] = r.bounds;
    if (x < minx - halfW || x > maxx + halfW || y < miny - halfW || y > maxy + halfW) continue;
    for (let i = 0; i < pts.length - 1; i++) {
      const cp = closestPointOnSegment(x, y, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
      if (cp.dist2 < halfW * halfW) return true;
    }
  }
  return false;
}

export function lineOfSight(map, ax, ay, bx, by) {
  const d = Math.hypot(bx - ax, by - ay);
  const steps = Math.ceil(d / 3);
  for (let k = 1; k < steps; k++) {
    const x = ax + (bx - ax) * k / steps, y = ay + (by - ay) * k / steps;
    if (isInsideBuilding(map, x, y)) return false;
  }
  return true;
}

export function pushAudioEvent(world, ev) {
  if (!world.audioEvents) world.audioEvents = [];
  if (world.audioEvents.length < 64) world.audioEvents.push(ev);
}

let lastShoutAt = -Infinity;
function say(ped, world, text, duration = 2.6, audio = 'shout', strength = 0.7) {
  ped.speechText = text;
  ped.speechUntil = world.time + duration;
  if (audio && world.time - lastShoutAt > 0.6) {
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
    if (v.wrecked && !seenWrecks.has(v)) {
      seenWrecks.add(v);
      if (dist(v.x, v.y, player.x, player.y) < 150) events.push({ kind: 'boom', x: v.x, y: v.y, r: 50, crime: !!v.wreckedByPlayer });
    }
    if (!v.wrecked && v.driver !== 'player' && v.road && Math.abs(v.x - player.x) < 8 && Math.abs(v.y - player.y) < 8) aiDrivenAt.set(v, world.time);
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
      if (world.wanted === 0) world.wanted = 1;
      events.push({ kind: 'crash', x: li.x, y: li.y, r: 25, crime: false });
    }
  }
  for (const ped of world.pedestrians) {
    if (ped._hp !== undefined && ped.health < ped._hp && world.time - lastPlayerAttackAt < 1.2) {
      if (ped.isCop) { if (world.wanted === 0) world.wanted = 1; }
      else events.push({ kind: 'hit', x: ped.x, y: ped.y, r: 25, crime: true, victim: ped });
    }
    ped._hp = ped.health;
  }
  const v = player.inVehicle;
  if (v && v !== prevInVehicle) {
    if (!v.isHeroCar && !ownedVehicles.has(v)) {
      const hadDriver = world.time - (aiDrivenAt.get(v) ?? -Infinity) < 1.5;
      events.push({ kind: 'theft', x: v.x, y: v.y, r: 30, crime: true, vehicle: v, hadDriver });
    }
    ownedVehicles.add(v);
  }
  prevInVehicle = v || null;
  return events;
}

function ejectDriver(world, ev) {
  const v = ev.vehicle;
  if (v.isBoat) return null;
  const [x, y] = findExitSpot(v, 0.3, world.map, [-1, 1]);
  const ped = new Pedestrian(x, y, Math.atan2(v.y - y, v.x - x));
  ped.health = 40;
  world.pedestrians.push(ped);
  return ped;
}

function reactToEvent(ped, ev, world, d) {
  if (ped === ev.victim) {
    say(ped, world, pick(HURT_LINES));
    startFlee(ped, world, world.player.x, world.player.y, true);
    return;
  }
  if (ped.state === 'call' || ped.state === 'film') return;
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
    if (p.isCop || p.state === 'dead' || p === ev.victim || p.state === 'film') continue;
    const d = dist(p.x, p.y, ev.x, ev.y);
    if (d > WITNESS_RADIUS || d < 4 || d >= bestD) continue;
    if (!lineOfSight(world.map, p.x, p.y, ev.x, ev.y)) continue;
    best = p; bestD = d;
  }
  if (!best && ev.witness) best = ev.witness;
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
  world.addMessage('Een getuige heeft de politie gebeld!', 3);
  say(ped, world, 'Ze komen der aan!', 2.2, null);
  startFlee(ped, world, world.player.x, world.player.y, true);
  activeCall = null;
}

function processEvents(world, events) {
  for (const ev of events) {
    ev.id = ++eventSeq;
    screamsThisEvent = 0;
    if (ev.kind === 'theft') {
      let victim = null;
      if (ev.hadDriver) victim = ejectDriver(world, ev);
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

// --- cyclists' bells ----------------------------------------------------

function updateBikeBells(world) {
  const p = world.player;
  const pv = p.inVehicle;
  if (pv && Math.abs(pv.speed) > 3) return;
  for (const v of world.vehicles) {
    if (!v.isBike || v.driver === 'player' || v.wrecked || v === pv) continue;
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

function nightFactor(world) {
  return world.dayNight?.night ?? 0;
}

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
  const night = nightFactor(world) > 0.5;
  const inCentre = dist(player.x, player.y, CITY_CENTRE.x, CITY_CENTRE.y) < CITY_CENTRE.r;
  const hot = night && hotspotNear(player.x, player.y);
  let walkers = 0, nightlife = 0;
  for (const p of world.pedestrians) {
    if (p.isCop || p.scene || p.state === 'dead') continue;
    if (dist(p.x, p.y, player.x, player.y) > 150) continue;
    if (p.nightlife) nightlife++;
    else walkers++;
  }
  const desired = !night ? POP_DAY : inCentre ? POP_NIGHT_CENTRE : POP_NIGHT_OUT;
  spawnBudget = Math.max(0, desired - walkers);

  if (walkers > desired + 3) {
    let excess = walkers - desired;
    for (let i = world.pedestrians.length - 1; i >= 0 && excess > 0; i--) {
      const p = world.pedestrians[i];
      if (p.isCop || p.scene || p.nightlife || p.state !== 'wander') continue;
      if (dist(p.x, p.y, player.x, player.y) < 55) continue;
      world.pedestrians.splice(i, 1);
      excess--;
    }
  } else if (walkers < desired - 4) {
    const add = spawnPedsRaw(world.map, player.x, player.y, Math.min(12, desired - walkers), Math.random, 30);
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

function checkVehicleImpact(ped, world) {
  for (const v of world.vehicles) {
    if (v.wrecked || v.isBoat) continue;
    if (Math.abs(v.x - ped.x) > v.halfLen + 1 || Math.abs(v.y - ped.y) > v.halfLen + 1) continue;
    const push = pushCircleOutOfVehicle(ped.x, ped.y, ped.radius, v);
    if (!push) continue;
    if (Math.abs(v.speed) < VEHICLE_HIT_SPEED) {
      ped.x = push.x;
      ped.y = push.y;
      if (v.driver === 'player' && !ped.isCop && world.time > (ped._bumpCd || 0)) {
        ped._bumpCd = world.time + 5;
        say(ped, world, pick(CAR_BUMP_LINES));
        if (!ped.scene) {
          setState(ped, 'angry', world.time + 1.8, 'angry');
        }
      }
      continue;
    }
    const vx = Math.cos(v.angle) * v.speed, vy = Math.sin(v.angle) * v.speed;
    const away = Math.abs(v.speed) * 0.35;
    ped.knockVX = vx * 0.85 + push.nx * away;
    ped.knockVY = vy * 0.85 + push.ny * away;
    ped.angle = Math.atan2(-ped.knockVY, -ped.knockVX);
    ped.x = push.x;
    ped.y = push.y;
    v.speed *= v.isBike || v.isScooter ? 0.6 : 0.94;
    reportImpact(world, ped.x, ped.y, Math.abs(v.speed) * 0.5, v.driver === 'player');
    releaseFromScene(ped);
    setPedPose(ped, null);
    ped.state = 'dead';
    ped.health = 0;
    ped._hp = 0;
    ped.speed = 0;
    ped.deadUntil = world.time + DEAD_DURATION;
    if (v.driver === 'player') {
      world.wanted = Math.min(5, world.wanted + 1);
      world.stats.pedKills++;
      pendingEvents.push({ kind: 'hit', x: ped.x, y: ped.y, r: 30, crime: true });
    }
    return;
  }
}

const pendingEvents = [];

function checkCopBust(ped, world) {
  const player = world.player;
  if (player.inVehicle && Math.abs(player.inVehicle.speed) > COP_BUST_FAST_SPEED) return;
  const contact = ped.radius + (player.radius || 0.35) + COP_BUST_CONTACT_MARGIN;
  if (dist(ped.x, ped.y, player.x, player.y) <= contact) {
    requestRespawn(world, { busted: true, moneyPenalty: world.wanted * 150 });
  }
}

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
  const aiming = world.weapon !== 'fists' && world.input.mouse.down;

  const events = gatherEvents(world);
  if (pendingEvents.length) events.push(...pendingEvents.splice(0));
  if (events.length) processEvents(world, events);
  updateWitnessCall(world);
  updateBikeBells(world);

  popTimer -= dt;
  if (popTimer <= 0) {
    popTimer = 2;
    managePopulation(world);
    prunePoseSources(new Set(peds));
  }

  let filming = 0;
  for (let i = peds.length - 1; i >= 0; i--) {
    const ped = peds[i];

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

    const dPlayer = dist(ped.x, ped.y, player.x, player.y);
    if (ped.isCop) updateCop(ped, world, dPlayer, dt);
    else if (aiming && dPlayer < FLEE_TRIGGER_RADIUS && ped.state !== 'flee' && ped.state !== 'cower') {
      startFlee(ped, world, player.x, player.y, true);
      if (Math.random() < 0.3) say(ped, world, pick(SCREAMS), 2, 'shout', 0.8);
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
        ped.angle = steerClear(map, ped, ped.angle);
        ped.speed = COP_SEEK_SPEED;
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
          ped.speed = ped.anchor ? WANDER_SPEED * 0.6 : WANDER_SPEED;
        } else if (ped.anchor) {
          moving = false;
        } else {
          ped.speed = WANDER_SPEED;
        }
      }
    }

    if (!moving) {
      ped.speed = 0;
    } else {
      let nx = ped.x + Math.cos(ped.angle) * ped.speed * dt;
      let ny = ped.y + Math.sin(ped.angle) * ped.speed * dt;
      [nx, ny] = resolveBuildingCollisions(nx, ny, ped.radius, map);
      if (!isInWater(map, ped.x, ped.y) && isInWater(map, nx, ny)) {
        if (!isInWater(map, nx, ped.y)) ny = ped.y;
        else if (!isInWater(map, ped.x, ny)) nx = ped.x;
        else { nx = ped.x; ny = ped.y; }
      }
      ped.x = nx;
      ped.y = ny;
    }

    if (ped.state === 'seek') checkCopBust(ped, world);
    checkBump(ped, world);
    checkVehicleImpact(ped, world);
  }
  world.pedFilming = filming;
}
