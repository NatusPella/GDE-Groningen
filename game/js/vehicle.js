import { closestPointOnSegment, normalizeAngle, clamp, lerp, pointInPolygon, inWaterPoly, WATER_Y, keepBoatOffShore, boatDryPoints } from './util.js';
import { waterClearance, waterChannelPoints } from './waterindex.js';
import { trafficSignalsNear, getTrafficLightPhase } from './trafficlights.js';
import { resolvePropCollisions } from './breakables.js';
import { inPassage } from './collision.js';
import { elevWallContact } from './elevation.js';
import { crossingSpeedLimit, loweredBoomsNear, snapBoom } from './railway.js';
import { zebraSpeedLimit } from './pedroutes.js';
import { countrySurface } from './countryfield.js';
import { manageParkedCars, tickParkedCars } from './parkedcars.js';
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const MODELS = [
  // Dutch daily traffic skews heavily toward grey/black/white/silver compacts
  // and hatchbacks, so those are weighted more heavily than the odd flash of
  // color rather than an even split across a bright arcade palette.
  { name: 'hatch', len: 3.8, wid: 1.7, maxSpeed: 30, accel: 8.5, brake: 23, turnRate: 3.0, color: '#c7c9cc' },
  { name: 'hatch', len: 3.8, wid: 1.7, maxSpeed: 30, accel: 8.5, brake: 23, turnRate: 3.0, color: '#23262a' },
  { name: 'hatch', len: 3.8, wid: 1.7, maxSpeed: 30, accel: 8.5, brake: 23, turnRate: 3.0, color: '#e8e6e0' },
  { name: 'sedan', len: 4.3, wid: 1.8, maxSpeed: 33, accel: 9, brake: 24, turnRate: 2.6, color: '#4a4d52' },
  { name: 'sedan', len: 4.3, wid: 1.8, maxSpeed: 33, accel: 9, brake: 24, turnRate: 2.6, color: '#2f3a52' },
  { name: 'sedan', len: 4.3, wid: 1.8, maxSpeed: 33, accel: 9, brake: 24, turnRate: 2.6, color: '#7a1f1f' },
  { name: 'wagon', len: 4.5, wid: 1.8, maxSpeed: 32, accel: 8, brake: 23, turnRate: 2.5, color: '#2e4a34' },
  { name: 'van', len: 5.0, wid: 2.0, maxSpeed: 26, accel: 6.5, brake: 19, turnRate: 2.0, color: '#d9d9d9' },
  { name: 'van', len: 5.0, wid: 2.0, maxSpeed: 26, accel: 6.5, brake: 19, turnRate: 2.0, color: '#c9541e' },
  { name: 'sport', len: 4.1, wid: 1.85, maxSpeed: 42, accel: 12, brake: 27, turnRate: 3.2, color: '#8a1414' },
];

// Signature red Ford Escort - GTE VI's hero car, spawned once via
// spawnHeroCarNear rather than picked from MODELS by the regular traffic RNG.
const HERO_CAR_MODEL = { name: 'escort', len: 4.0, wid: 1.65, maxSpeed: 34, accel: 10, brake: 25, turnRate: 3.4, color: '#a11f1f' };

const BIKE_MODELS = [
  { name: 'bike', len: 1.75, wid: 0.5, maxSpeed: 6.2, accel: 3.2, brake: 6, turnRate: 4.6, color: '#1c1c1c', rider: '#2f5c8a' },
  { name: 'bike', len: 1.75, wid: 0.5, maxSpeed: 6.2, accel: 3.2, brake: 6, turnRate: 4.6, color: '#2b2b2b', rider: '#7a2e2e' },
  { name: 'bike', len: 1.75, wid: 0.5, maxSpeed: 6.8, accel: 3.4, brake: 6, turnRate: 4.8, color: '#333', rider: '#3f6b3f' },
  { name: 'bike', len: 1.9, wid: 0.55, maxSpeed: 5.6, accel: 2.8, brake: 5.5, turnRate: 4.2, color: '#444', rider: '#c9a227' },
  // e-fatbike: chunky tyres and a motor, so it pulls away from the regular
  // bikes - seen around town year-round in Groningen, rarer than normal bikes
  { name: 'bike', fat: true, len: 1.95, wid: 0.62, maxSpeed: 7.8, accel: 4.2, brake: 6, turnRate: 3.8, color: '#20221f', rider: '#8a3a1f' },
];
const FATBIKE_WEIGHT = 0.12; // fraction of bike spawns that should be a fatbike
const REGULAR_BIKE_MODELS = BIKE_MODELS.filter((m) => !m.fat);
const FATBIKE_MODELS = BIKE_MODELS.filter((m) => m.fat);

function pickBikeModel(rng) {
  const pool = rng() < FATBIKE_WEIGHT ? FATBIKE_MODELS : REGULAR_BIKE_MODELS;
  return pool[Math.floor(rng() * pool.length)];
}

// Shared e-scooters (Dott/GO Sharing etc.) - faster and nimbler than a
// regular bike but with noticeably less braking grip (see the lower `brake`
// values vs. BIKE_MODELS).
const SCOOTER_MODELS = [
  { name: 'scooter', len: 1.1, wid: 0.4, maxSpeed: 7.0, accel: 3.6, brake: 4.2, turnRate: 5.2, color: '#1a1a1a', rider: '#2f5c8a' },
  { name: 'scooter', len: 1.1, wid: 0.4, maxSpeed: 6.5, accel: 3.4, brake: 4.0, turnRate: 5.0, color: '#e8e6e0', rider: '#7a2e2e' },
  { name: 'scooter', len: 1.15, wid: 0.42, maxSpeed: 7.5, accel: 3.8, brake: 4.4, turnRate: 5.4, color: '#c94b3a', rider: '#3f6b3f' },
];

function pickScooterModel(rng) {
  return SCOOTER_MODELS[Math.floor(rng() * SCOOTER_MODELS.length)];
}

// A riderless bike/scooter standing at (x, y), e.g. a street-clutter prop
// being taken; tint is the prop's frame colour (0xRRGGBB).
export function makeTwoWheeler(kind, x, y, angle, tint = null, rng = Math.random) {
  const scooter = kind === 'scooter';
  const base = scooter ? pickScooterModel(rng) : REGULAR_BIKE_MODELS[Math.floor(rng() * REGULAR_BIKE_MODELS.length)];
  const model = tint == null ? base : { ...base, color: '#' + tint.toString(16).padStart(6, '0') };
  const v = new Vehicle(x, y, angle, model);
  v.isBike = !scooter;
  v.isScooter = scooter;
  return v;
}

// Boats free-roam water polygons rather than following the road graph - slow
// accel/brake since they're on water, see updateBoatAI/spawnBoatOnWater.
const BOAT_MODELS = [
  { name: 'boat', len: 4, wid: 1.6, maxSpeed: 4.5, accel: 1.6, brake: 2.2, turnRate: 1.3, color: '#e8e6e0', cabin: '#2f3a44' },
  { name: 'boat', len: 4.2, wid: 1.7, maxSpeed: 4.3, accel: 1.5, brake: 2.0, turnRate: 1.2, color: '#c7c9cc', cabin: '#1c1c1c' },
];

// Politie-livery variant for spawnPoliceBoatOnWater - same white-hull family
// as the regular fleet, dark-navy cabin matching the rest of the police
// fleet's accent tone, with enough extra accel/turn to actually run down a
// fleeing player instead of just keeping pace.
const POLICE_BOAT_MODEL = { name: 'boat', len: 4.1, wid: 1.65, maxSpeed: 9.8, accel: 3.2, brake: 3.4, turnRate: 1.8, color: '#e8e6e0', cabin: '#12294f' };

// Regional OV city bus - teal/blue livery, roomier turning circle, only
// spawned on the bigger through-roads (see manageBusPopulation).
// Qbuzz runs the Groningen-Drenthe concession: deep navy body with a cyan
// accent band, not a generic tour-bus livery.
const BUS_MODELS = [
  { name: 'bus', len: 11, wid: 2.35, maxSpeed: 20, accel: 4.5, brake: 12, turnRate: 1.1, color: '#132a44', stripe: '#3fc6d4', accent: '#e8e6de' },
  { name: 'bus', len: 11, wid: 2.35, maxSpeed: 20, accel: 4.5, brake: 12, turnRate: 1.1, color: '#0f3a4a', stripe: '#3fc6d4', accent: '#e8e6de' },
];

let nextId = 1;

export class Vehicle {
  constructor(x, y, angle, model) {
    this.id = nextId++;
    this.x = x;
    this.y = y;
    this.z = 0; // absolute height of the wheels (ring viaducts / sunken sections, elevation.js)
    this.vz = 0;
    this.pitch = 0;
    this.angle = angle;
    this.speed = 0;
    this.steer = 0;
    this.model = model;
    this.health = 100;
    this.wrecked = false;
    this.driver = null; // 'player' | ai-controlled marker | null
    this.passenger = null; // 'companion' | null - the non-driving Tammo/Anita riding along
    this.horn = false;

    // Residual world-space sideways velocity (m/s) left over from a
    // resolveVehicleVehicleCollisions impulse - see applyControls below.
    // Zero outside of a collision's immediate aftermath.
    this.driftX = 0;
    this.driftY = 0;
    this.yawVel = 0; // rad/s of spin from an off-centre impact, decays in applyControls

    // traffic AI path state: current segment runs road.pts[segIdx] ->
    // road.pts[segIdx + dir]; plan holds the upcoming junction choices
    this.road = null;
    this.dir = 1;
    this.segIdx = 0;
    this.plan = [];
    this.isPolice = false;
    this.waitTimer = 0;
  }

  get halfLen() { return this.model.len / 2; }
  get halfWid() { return this.model.wid / 2; }

  bounds(margin = 0) {
    const r = this.halfLen + margin;
    return [this.x - r, this.y - r, this.x + r, this.y + r];
  }

  // Player/AI driving physics shared by both control sources. brakeInput may
  // be a boolean or a 0..1 pedal amount; throttle against the direction of
  // travel brakes first and only then reverses.
  applyControls(dt, throttle, steerInput, brakeInput) {
    const m = this.model;
    const isPlayer = this.driver === 'player';
    const tune = isPlayer ? playerTune(this) : null;
    const top = tune ? tune.top : m.maxSpeed;
    const brakeMax = tune ? tune.brake : m.brake;
    const brake = brakeInput === true ? 1 : brakeInput || 0;
    const absSpeed = Math.abs(this.speed);
    const handbrakeDrift = isPlayer && !this.isBoat && brake > 0 && absSpeed > 9 && Math.abs(steerInput) > 0.3;
    const against = throttle !== 0 && absSpeed > 0.3 && Math.sign(throttle) !== Math.sign(this.speed);
    if (isPlayer) this.pedalT = against ? (this.pedalT || 0) + dt : 0;
    // Braking to a stop with S held pauses a beat before it starts reversing.
    if (isPlayer && this.holdStill > 0) {
      if (Math.sign(throttle) !== this.holdSign) this.holdStill = 0;
      else { this.holdStill -= dt; throttle = 0; }
    }
    let decel = brake * brakeMax * (handbrakeDrift ? 0.32 : 1);
    if (against) {
      // player pedal bites at 60% and builds to full within ~0.25 s
      const pedal = isPlayer ? Math.min(1, 0.6 + this.pedalT * 1.6) : 0.85;
      decel = Math.max(decel, brakeMax * pedal * Math.abs(throttle));
    }
    if (decel > 0) {
      const dec = decel * dt;
      if (isPlayer && against && absSpeed <= dec) { this.holdStill = 0.3; this.holdSign = Math.sign(throttle); }
      this.speed = this.speed > 0 ? Math.max(0, this.speed - dec) : Math.min(0, this.speed + dec);
    } else if (throttle !== 0) {
      const lim = throttle > 0 ? top : top * REVERSE_FACTOR;
      const headroom = clamp(1 - absSpeed / lim, 0, 1);
      this.speed += throttle * (tune ? tune.accel : m.accel) * (0.3 + 0.7 * headroom) * dt;
    } else {
      const drag = coastDrag(this, isPlayer, absSpeed) * dt;
      if (this.speed > 0) this.speed = Math.max(0, this.speed - drag);
      else this.speed = Math.min(0, this.speed + drag);
    }
    this.speed = clamp(this.speed, -top * REVERSE_FACTOR, top);

    const target = clamp(steerInput, -1, 1);
    if (isPlayer) {
      const returning = Math.abs(target) < Math.abs(this.steer) || target * this.steer < 0;
      const rate = (returning ? PLAYER_STEER_RETURN : PLAYER_STEER_RATE) * dt;
      this.steer += clamp(target - this.steer, -rate, rate);
    } else {
      this.steer = target;
    }
    const yaw = this.steer * maxYawRate(this) * (handbrakeDrift ? 1.6 : 1) * (this.speed < 0 ? -1 : 1);
    const oldAngle = this.angle;
    this.angle = normalizeAngle(this.angle + (yaw + this.yawVel) * dt);
    if (this.yawVel) {
      this.yawVel *= Math.exp(-SPIN_DECAY_RATE * dt);
      if (Math.abs(this.yawVel) < 0.02) this.yawVel = 0;
    }

    // Past the grip limit (handbrake, or flat-out with full lock) part of the
    // old velocity carries on sideways - a mild, recoverable slide.
    if (isPlayer) {
      const grip = this.isBoat ? 0.72 : handbrakeDrift ? 0.5 : absSpeed > top * 0.8 && Math.abs(this.steer) > 0.6 ? 0.85 : 1;
      if (grip < 1) {
        const k = (1 - grip) * this.speed;
        this.driftX = clamp(this.driftX + k * (Math.cos(oldAngle) - Math.cos(this.angle)), -MAX_DRIFT_SPEED, MAX_DRIFT_SPEED);
        this.driftY = clamp(this.driftY + k * (Math.sin(oldAngle) - Math.sin(this.angle)), -MAX_DRIFT_SPEED, MAX_DRIFT_SPEED);
      }
    }

    this.x += Math.cos(this.angle) * this.speed * dt;
    this.y += Math.sin(this.angle) * this.speed * dt;

    // Sideways velocity left by a collision impulse or a slide rides along
    // independently of the forward speed/angle model and decays away.
    if (this.driftX || this.driftY) {
      this.x += this.driftX * dt;
      this.y += this.driftY * dt;
      const decay = Math.exp(-(handbrakeDrift ? SLIDE_DECAY_RATE : isPlayer && this.isBoat ? BOAT_SLIDE_DECAY_RATE : DRIFT_DECAY_RATE) * dt);
      this.driftX *= decay;
      this.driftY *= decay;
      if (Math.hypot(this.driftX, this.driftY) < 0.03) { this.driftX = 0; this.driftY = 0; }
    }

    if (this.isBus) pushBusTrail(this);
  }
}

// world.stats.playerWrecks is a monotonic counter (sikkomfeed diffs it), so
// each vehicle may only add to it once. Callers without a world (the
// collision pass) queue the count until the next call that has one.
let pendingPlayerWrecks = 0;

export function markWreckedByPlayer(v, world) {
  if (v.wreckedByPlayer) return;
  v.wreckedByPlayer = true;
  pendingPlayerWrecks++;
  if (world) syncPlayerWrecks(world);
}

export function syncPlayerWrecks(world) {
  if (!pendingPlayerWrecks) return;
  world.stats.playerWrecks = (world.stats.playerWrecks || 0) + pendingPlayerWrecks;
  pendingPlayerWrecks = 0;
}

// Half-life of ~0.15s - a collision's lateral shove is felt for a beat and
// then fades, rather than permanently steering the vehicle off its facing.
const DRIFT_DECAY_RATE = 4.5;
const SLIDE_DECAY_RATE = 2.2; // while handbrake-drifting the slide lingers longer
const SPIN_DECAY_RATE = 2.5;
const MAX_DRIFT_SPEED = 8; // m/s, safety clamp against pathological multi-hit stacking in one frame
const MAX_SPIN = 3.5; // rad/s

const BOAT_SLIDE_DECAY_RATE = 1.3; // a player boat carries its sideways momentum on the water
const REVERSE_FACTOR = 0.25; // top speed in reverse, as a fraction of maxSpeed
const PLAYER_STEER_RATE = 5; // 1/s: how fast the wheel follows a digital key
const PLAYER_STEER_RETURN = 9;

// Two-wheelers and boats are tuned for the player separately from the AI
// fleet's realistic cruising speeds (m/s): a bike is clearly quicker than
// running (7.5), an e-fatbike quicker still, a scooter quickest.
function playerTune(v) {
  const m = v.model;
  if (v.isBoat) return { top: Math.max(m.maxSpeed, 9.5), accel: Math.max(m.accel, 3.2), brake: Math.max(m.brake, 3.8) };
  if (v.isScooter) return { top: 17, accel: 6.8, brake: 9.5 };
  if (v.isBike) return m.fat ? { top: 14.5, accel: 6.2, brake: 9 } : { top: 11.5, accel: 4.6, brake: 8.5 };
  return null;
}

export function speedCap(v) {
  const t = v.driver === 'player' ? playerTune(v) : null;
  return t ? t.top : v.model.maxSpeed;
}

// Rolling resistance + engine braking off the throttle (m/s^2). The AI's
// flat value is what its speed controller was tuned against.
function coastDrag(v, isPlayer, s) {
  if (!isPlayer) return 3.2;
  if (v.isBoat) return 0.45 + 0.05 * s;
  if (v.isBike || v.isScooter) return 0.8 + 0.06 * s;
  return 1.6 + 0.09 * s;
}

function minTurnRadius(m) {
  if (m.name === 'bus') return 9;
  if (m.name === 'bike' || m.name === 'scooter') return 1.8;
  return m.len * 1.25;
}

// Sideways acceleration the tyres hold before the turn rate is capped -
// this is what makes steering speed-dependent (tight at walking pace, wide
// arcs at speed) instead of a constant rad/s at every speed.
function lateralGrip(m, player = false) {
  if (m.name === 'bus') return player ? 6.5 : 4.5;
  if (m.name === 'bike' || m.name === 'scooter') return player ? 11 : 5;
  if (m.name === 'boat') return player ? 5.5 : 2.5;
  return player ? 23 : 16;
}

// tightTurn: AI turning round at a dead end or hairpin gets a shorter
// radius instead of a multi-point turn - at walking pace nobody notices.
export function maxYawRate(v, speed = v.speed) {
  const s = Math.abs(speed);
  if (s < 1e-3) return 0;
  const radius = minTurnRadius(v.model) * (v.tightTurn && v.driver !== 'player' ? 0.45 : 1);
  return Math.min(s / radius, v.model.turnRate, lateralGrip(v.model, v.driver === 'player') / s);
}

export function maxCurvature(v) {
  const s = Math.abs(v.speed);
  return s > 0.5 ? maxYawRate(v) / s : 1 / (minTurnRadius(v.model) * (v.tightTurn && v.driver !== 'player' ? 0.45 : 1));
}

// Rolling history of a bus's own pose, sampled by distance travelled (not
// frame count) so the trailing "harmonica" unit tracks correctly regardless
// of framerate or speed. Runs off applyControls so it keeps working whether
// the bus is AI-driven or the player is at the wheel.
function pushBusTrail(v) {
  if (!v.trailHistory) {
    v.trailHistory = [{ x: v.x, y: v.y, angle: v.angle, dist: 0 }];
    v.trailDist = 0;
    return;
  }
  const last = v.trailHistory[v.trailHistory.length - 1];
  const d = Math.hypot(v.x - last.x, v.y - last.y);
  if (d < 0.01) return;
  v.trailDist += d;
  v.trailHistory.push({ x: v.x, y: v.y, angle: v.angle, dist: v.trailDist });
  const keepFrom = v.trailDist - v.model.len * 1.6;
  while (v.trailHistory.length > 2 && v.trailHistory[1].dist < keepFrom) v.trailHistory.shift();
}

export function sampleBusTrail(v, backDist) {
  const hist = v.trailHistory;
  if (!hist || hist.length < 2) return { x: v.x, y: v.y, angle: v.angle };
  const targetDist = v.trailDist - backDist;
  if (targetDist <= hist[0].dist) return { x: hist[0].x, y: hist[0].y, angle: hist[0].angle };
  for (let i = hist.length - 1; i > 0; i--) {
    if (hist[i - 1].dist <= targetDist) {
      const a = hist[i - 1], b = hist[i];
      const span = b.dist - a.dist;
      const t = span > 1e-6 ? clamp((targetDist - a.dist) / span, 0, 1) : 0;
      return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), angle: a.angle + normalizeAngle(b.angle - a.angle) * t };
    }
  }
  return { x: hist[0].x, y: hist[0].y, angle: hist[0].angle };
}

// Right-hand-traffic offset from the road centerline (to the right of the
// direction of travel), used both at spawn and for the driving path.
function laneOffset(road, v, half = road.width / 2) {
  const halfWid = v.model.wid / 2;
  if (v.isBike || v.isScooter) {
    if (road.cat === 'cycle') return road.oneway ? 0 : Math.min(0.6, half / 2);
    return Math.max(0.3, half - 0.7);
  }
  if (road.oneway) return clamp(half - halfWid - 1.2, 0, 1);
  return clamp(half / 2, 0.3, Math.max(0.3, half - halfWid - 0.25));
}

function pointInAnyBuilding(buildings, x, y) {
  for (const b of buildings) {
    const [minx, miny, maxx, maxy] = b.bounds;
    if (x >= minx && x <= maxx && y >= miny && y <= maxy && pointInPolygon(x, y, b.pts)) return true;
  }
  return false;
}

// OSM widths are per road class, so a 'normal' street squeezed between
// facades is often narrower than its nominal width: measure the free space
// to the nearest building on either side at every point (lazily, cached).
function roadHalfWidths(map, road) {
  if (road._half) return road._half;
  const nrm = roadNormals(road);
  road._half = road.pts.map((p, i) => {
    const nominal = road.width / 2;
    const near = map.buildingsNear(p[0], p[1], nominal + 1);
    if (!near.length || pointInAnyBuilding(near, p[0], p[1])) return nominal;
    const L = Math.hypot(nrm[i][0], nrm[i][1]) || 1;
    const ux = nrm[i][0] / L, uy = nrm[i][1] / L;
    let half = nominal;
    for (const side of [1, -1]) {
      for (let d = 0.75; d < half; d += 0.5) {
        if (pointInAnyBuilding(near, p[0] + ux * d * side, p[1] + uy * d * side)) { half = Math.max(1.2, d - 0.3); break; }
      }
    }
    return half;
  });
  return road._half;
}

// Per-point right-hand normal of the road's own direction, mitred at
// corners so an offset lane stays parallel to the centerline.
function roadNormals(road) {
  if (road._nrm) return road._nrm;
  const p = road.pts, n = p.length;
  const segN = [];
  for (let i = 0; i < n - 1; i++) {
    const dx = p[i + 1][0] - p[i][0], dy = p[i + 1][1] - p[i][1];
    const L = Math.hypot(dx, dy);
    segN.push(L > 1e-6 ? [-dy / L, dx / L] : null);
  }
  const out = new Array(n);
  for (let i = 0; i < n; i++) {
    const a = segN[i - 1] || segN[i] || [0, 0];
    const b = segN[i] || segN[i - 1] || [0, 0];
    let sx = a[0] + b[0], sy = a[1] + b[1];
    const L = Math.hypot(sx, sy);
    if (L < 1e-6) { out[i] = a; continue; }
    sx /= L; sy /= L;
    const miter = 1 / Math.max(0.55, sx * a[0] + sy * a[1]);
    out[i] = [sx * miter, sy * miter];
  }
  road._nrm = out;
  return out;
}

// laneMode 'squeeze': hug the right verge so oncoming traffic fits past on a
// narrow two-way street; 'pass': swing out left around a stopped obstacle.
function lanePoint(map, road, i, dir, v) {
  const half = roadHalfWidths(map, road)[i];
  let lane = laneOffset(road, v, half);
  if (v.laneMode === 'squeeze' && !road.oneway) lane = Math.max(lane, half - v.halfWid + 0.4);
  else if (v.laneMode === 'pass') lane = road.oneway || half < 3.5 ? -Math.max(0.5, half - v.halfWid + 0.6) : -half / 2;
  const p = road.pts[i], nrm = roadNormals(road)[i];
  return [p[0] + nrm[0] * lane * dir, p[1] + nrm[1] * lane * dir];
}

export function spawnVehicleOnRoad(map, road, isPolice = false, rng = Math.random, isBike = false, isBus = false, atPoint = null, isScooter = false) {
  const pts = road.pts;
  let i, a, b, t;
  if (atPoint) {
    // place it at the road segment nearest the requested point (e.g. a
    // mission marker) instead of a random spot anywhere along the whole
    // road, which could be hundreds of meters from where the player is
    let bestDist2 = Infinity;
    i = 0;
    for (let k = 0; k < pts.length - 1; k++) {
      const cp = closestPointOnSegment(atPoint.x, atPoint.y, pts[k][0], pts[k][1], pts[k + 1][0], pts[k + 1][1]);
      if (cp.dist2 < bestDist2) { bestDist2 = cp.dist2; i = k; t = cp.t; }
    }
    a = pts[i]; b = pts[i + 1];
  } else {
    i = Math.floor(rng() * (pts.length - 1));
    a = pts[i]; b = pts[i + 1];
    t = rng();
  }
  const x = a[0] + (b[0] - a[0]) * t;
  const y = a[1] + (b[1] - a[1]) * t;
  let angle = Math.atan2(b[1] - a[1], b[0] - a[0]);
  const dir = road.oneway ? 1 : (rng() < 0.5 ? 1 : -1);
  if (dir < 0) angle = normalizeAngle(angle + Math.PI);
  const model = isPolice
    ? { name: 'police', len: 4.3, wid: 1.8, maxSpeed: 34, accel: 9.5, brake: 18, turnRate: 2.8, color: '#1c1c1c' }
    : isBike
    ? pickBikeModel(rng)
    : isScooter
    ? pickScooterModel(rng)
    : isBus
    ? BUS_MODELS[Math.floor(rng() * BUS_MODELS.length)]
    : MODELS[Math.floor(rng() * MODELS.length)];
  const v = new Vehicle(x, y, angle, model);
  v.isPolice = isPolice;
  v.isBike = isBike;
  v.isBus = isBus;
  v.isScooter = isScooter;
  // right of travel is (-sin, cos) of the travel heading
  const halves = roadHalfWidths(map, road);
  const lane = laneOffset(road, v, Math.min(halves[i], halves[i + 1]));
  v.x += -Math.sin(angle) * lane;
  v.y += Math.cos(angle) * lane;
  v.road = road;
  v.dir = dir;
  v.segIdx = dir > 0 ? i : i + 1;
  v.cruiseScale = 0.9 + rng() * 0.2;
  if (road.z) {
    v.z = road.z[i] + (road.z[i + 1] - road.z[i]) * t;
    v.pitch = Math.atan2((road.z[i + 1] - road.z[i]) * dir, Math.hypot(b[0] - a[0], b[1] - a[1]) || 1);
  }
  return v;
}

// Put a vehicle that has been driving freely (police pursuit) back on the
// road graph, without moving it: the path follower steers it into lane.
export function attachToNearestRoad(v, map) {
  const rp = map.nearestRoadPoint(v.x, v.y, 150, true);
  if (!rp) return false;
  const pts = rp.road.pts;
  let bestI = 0, bestDist2 = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const cp = closestPointOnSegment(v.x, v.y, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
    if (cp.dist2 < bestDist2) { bestDist2 = cp.dist2; bestI = i; }
  }
  const segAngle = Math.atan2(pts[bestI + 1][1] - pts[bestI][1], pts[bestI + 1][0] - pts[bestI][0]);
  let dir = Math.cos(v.angle - segAngle) >= 0 ? 1 : -1;
  if (rp.road.oneway) dir = 1;
  v.road = rp.road;
  v.dir = dir;
  v.segIdx = dir > 0 ? bestI : bestI + 1;
  v.plan = [];
  v.waitTimer = 0;
  return true;
}

function spawnSpotFree(vehicles, v, clearance = 9) {
  for (const o of vehicles) {
    if (Math.hypot(o.x - v.x, o.y - v.y) < clearance + o.halfLen) return false;
  }
  return true;
}

// The one-off hero car for GTE VI: same placement machinery as a regular
// traffic spawn (spawnVehicleOnRoad with atPoint), but forces the Escort
// model regardless of the RNG pick and flags it so it's never swept up by
// the ambient traffic population manager.
export function spawnHeroCarNear(map, x, y, rng = Math.random) {
  const point = map.nearestRoadPoint(x, y, 200, true, true);
  if (!point) return null;
  const v = spawnVehicleOnRoad(map, point.road, false, rng, false, false, point);
  v.model = HERO_CAR_MODEL;
  v.isHeroCar = true;
  // parked at the kerb, waiting for the player - not driving off as traffic
  const kerb = Math.max(0, (point.road.width || 6) / 2 - HERO_CAR_MODEL.wid / 2 - 0.3);
  v.x += -Math.sin(v.angle) * kerb;
  v.y += Math.cos(v.angle) * kerb;
  v.road = null;
  v.speed = 0;
  return v;
}

// Keep a believable amount of traffic around the player without simulating
// the whole city: despawn cars that have drifted far away, spawn fresh ones
// on roads just outside the view so they appear to already be driving by
// the time they're on screen.
// Wrecks stay where they died (smoking) until the player is far away; only
// when too many pile up does the farthest one go, so the scene stays light.
const MAX_WRECKS = 12;
function pruneWrecks(world) {
  const { player, vehicles } = world;
  const wrecks = vehicles.filter((v) => v.wrecked && !v.sinking && v.driver !== 'player' && !v.missionCar);
  if (wrecks.length <= MAX_WRECKS) return;
  const d = (v) => Math.hypot(v.x - player.x, v.y - player.y);
  wrecks.sort((a, b) => d(b) - d(a));
  for (const v of wrecks.slice(0, wrecks.length - MAX_WRECKS)) vehicles.splice(vehicles.indexOf(v), 1);
}

export function manageTrafficPopulation(world, { target = 30, spawnMin = 70, spawnMax = 170, despawnDist = 260 } = {}) {
  const { map, player, vehicles } = world;
  pruneWrecks(world);
  manageParkedCars(world);
  for (let i = vehicles.length - 1; i >= 0; i--) {
    const v = vehicles[i];
    if (v.driver === 'player' || v.isPolice || v.isHeroCar || v.missionCar || v.isBike || v.isBus || v.parked) continue;
    // Wrecked cars have speed=0 forever and would otherwise almost never
    // reach the distance despawn, silently eating the traffic quota. A
    // vehicle stuck bouncing off the same dead end (isolated stub with no
    // real connection) is cleared the same way rather than left oscillating.
    if ((!v.wrecked && ((v.deadEndBounces || 0) > 2 || (v.stuckFor || 0) > 25 || ((v.waitFor || 0) > 45 && Math.hypot(v.x - player.x, v.y - player.y) > 70))) || Math.hypot(v.x - player.x, v.y - player.y) > despawnDist) vehicles.splice(i, 1);
  }

  let count = 0;
  for (const v of vehicles) if (!v.wrecked && !v.isPolice && !v.isHeroCar && !v.isBike && !v.isBus && !v.isScooter && !v.isBoat && !v.parked && v.driver !== 'player') count++;

  const candidates = map.roadsNear(player.x, player.y, spawnMax).filter((r) => r.cat !== 'foot' && r.cat !== 'cycle' && r.width >= 3);
  let guard = 0;
  while (count < target && candidates.length && guard++ < target * 4) {
    const road = candidates[Math.floor(Math.random() * candidates.length)];
    const v = spawnVehicleOnRoad(map, road, false, Math.random);
    const d = Math.hypot(v.x - player.x, v.y - player.y);
    if (d < spawnMin || d > spawnMax || !spawnSpotFree(vehicles, v)) continue;
    vehicles.push(v);
    count++;
  }
}

// Same idea as manageTrafficPopulation but for cyclists - fietsers are the
// single most Groningen-defining detail of the streetscape, so they get
// their own population target, favoring dedicated cycleways when present.
export function manageBikePopulation(world, { target = 16, spawnMin = 40, spawnMax = 140, despawnDist = 220 } = {}) {
  const { map, player, vehicles } = world;
  for (let i = vehicles.length - 1; i >= 0; i--) {
    const v = vehicles[i];
    if (!v.isBike || v.driver === 'player') continue;
    if ((!v.wrecked && ((v.deadEndBounces || 0) > 2 || (v.stuckFor || 0) > 25 || ((v.waitFor || 0) > 45 && Math.hypot(v.x - player.x, v.y - player.y) > 70))) || Math.hypot(v.x - player.x, v.y - player.y) > despawnDist) vehicles.splice(i, 1);
  }

  let count = 0;
  for (const v of vehicles) if (v.isBike && !v.wrecked && v.driver !== 'player' && v.road) count++;

  const candidates = map.roadsNear(player.x, player.y, spawnMax)
    .filter((r) => r.cat === 'cycle' || r.cat === 'normal' || r.cat === 'minor');
  let guard = 0;
  while (count < target && candidates.length && guard++ < target * 4) {
    const road = candidates[Math.floor(Math.random() * candidates.length)];
    const v = spawnVehicleOnRoad(map, road, false, Math.random, true);
    const d = Math.hypot(v.x - player.x, v.y - player.y);
    if (d < spawnMin || d > spawnMax || !spawnSpotFree(vehicles, v)) continue;
    vehicles.push(v);
    count++;
  }
}

// Deelscooters follow the same lane/road-preference rules as bikes (cycle
// lanes, or normal/minor streets when there's no dedicated cycleway).
export function manageScooterPopulation(world, { target = 10, spawnMin = 40, spawnMax = 140, despawnDist = 220 } = {}) {
  const { map, player, vehicles } = world;
  for (let i = vehicles.length - 1; i >= 0; i--) {
    const v = vehicles[i];
    if (!v.isScooter || v.driver === 'player') continue;
    if ((!v.wrecked && ((v.deadEndBounces || 0) > 2 || (v.stuckFor || 0) > 25 || ((v.waitFor || 0) > 45 && Math.hypot(v.x - player.x, v.y - player.y) > 70))) || Math.hypot(v.x - player.x, v.y - player.y) > despawnDist) vehicles.splice(i, 1);
  }

  let count = 0;
  for (const v of vehicles) if (v.isScooter && !v.wrecked && v.driver !== 'player' && v.road) count++;

  const candidates = map.roadsNear(player.x, player.y, spawnMax)
    .filter((r) => r.cat === 'cycle' || r.cat === 'normal' || r.cat === 'minor');
  let guard = 0;
  while (count < target && candidates.length && guard++ < target * 4) {
    const road = candidates[Math.floor(Math.random() * candidates.length)];
    const v = spawnVehicleOnRoad(map, road, false, Math.random, false, false, null, true);
    const d = Math.hypot(v.x - player.x, v.y - player.y);
    if (d < spawnMin || d > spawnMax || !spawnSpotFree(vehicles, v)) continue;
    vehicles.push(v);
    count++;
  }
}

// A handful of regional buses on the bigger through-roads only - real bus
// frequency is much lower than car/bike density.
export function manageBusPopulation(world, { target = 4, spawnMin = 90, spawnMax = 220, despawnDist = 300 } = {}) {
  const { map, player, vehicles } = world;
  for (let i = vehicles.length - 1; i >= 0; i--) {
    const v = vehicles[i];
    if (!v.isBus || v.driver === 'player') continue;
    if ((!v.wrecked && ((v.deadEndBounces || 0) > 2 || (v.stuckFor || 0) > 25 || ((v.waitFor || 0) > 45 && Math.hypot(v.x - player.x, v.y - player.y) > 70))) || Math.hypot(v.x - player.x, v.y - player.y) > despawnDist) vehicles.splice(i, 1);
  }

  let count = 0;
  for (const v of vehicles) if (v.isBus && !v.wrecked && v.driver !== 'player') count++;

  const candidates = map.roadsNear(player.x, player.y, spawnMax).filter((r) => r.cat === 'major' || r.cat === 'normal');
  let guard = 0;
  while (count < target && candidates.length && guard++ < target * 6) {
    const road = candidates[Math.floor(Math.random() * candidates.length)];
    const v = spawnVehicleOnRoad(map, road, false, Math.random, false, true);
    const d = Math.hypot(v.x - player.x, v.y - player.y);
    if (d < spawnMin || d > spawnMax || !spawnSpotFree(vehicles, v)) continue;
    vehicles.push(v);
    count++;
  }
}

// Boats don't follow the road graph at all - they free-roam a water polygon,
// so spawning one just needs a point that is actually inside it rather than
// a road/lane placement.
// Spots come from the polygon's cached channel points (waterindex.js), so a
// boat starts with room around it, heading along the channel. opts: model,
// near [x, y] with min/max distance, budget (ms of channel scanning this
// frame; the default finishes the scan). Returns null when no spot fits yet.
export function spawnBoatOnWater(map, waterPoly, rng = Math.random, opts = {}) {
  const model = opts.model || BOAT_MODELS[Math.floor(rng() * BOAT_MODELS.length)];
  const ch = waterChannelPoints(map, waterPoly, opts.budget ?? Infinity);
  let pts = ch.pts;
  if (opts.near) {
    const [nx, ny] = opts.near, lo = (opts.min || 0) ** 2, hi = (opts.max ?? Infinity) ** 2;
    pts = pts.filter((q) => { const d2 = (q.x - nx) ** 2 + (q.y - ny) ** 2; return d2 >= lo && d2 <= hi; });
  }
  if (!pts.length) return null;
  const probe = { model };
  for (let attempt = 0; attempt < 12; attempt++) {
    const q = pts[Math.floor(rng() * pts.length)];
    if (map.isOnBridge(q.x, q.y)) continue;
    const flip = rng() < 0.5 ? 0 : Math.PI;
    for (const turn of [0, Math.PI, 0.3, -0.3]) {
      const angle = normalizeAngle(q.a + flip + turn);
      if (boatDryPoints(map, probe, q.x, q.y, angle) > 0) continue;
      const v = new Vehicle(q.x, q.y, angle, model);
      v.isBoat = true;
      v.waterPoly = waterPoly;
      return v;
    }
  }
  return null;
}

// Same placement as spawnBoatOnWater, forced into the police livery/model
// and flagged isPolice so updateBoatAI's chase branch (below) and the
// regular vehicle render/sync path both treat it like any other cop unit.
export function spawnPoliceBoatOnWater(map, waterPoly, rng = Math.random, opts = {}) {
  const v = spawnBoatOnWater(map, waterPoly, rng, { ...opts, model: POLICE_BOAT_MODEL });
  if (!v) return null;
  v.isPolice = true;
  return v;
}

// Mirrors manageBikePopulation's despawn/spawn-quota shape, but candidates
// are water bodies near the player instead of roads. Police boats are
// excluded here exactly like manageTrafficPopulation excludes police cars -
// police.js owns their spawn/despawn lifecycle on its own wanted-driven
// schedule, not the ambient civilian quota.
export function manageBoatPopulation(world, { target = 4, spawnMin = 20, spawnMax = 180, despawnDist = 260 } = {}) {
  const { map, player, vehicles } = world;
  for (let i = vehicles.length - 1; i >= 0; i--) {
    const v = vehicles[i];
    if (!v.isBoat || v.isPolice || v.driver === 'player') continue;
    if (Math.hypot(v.x - player.x, v.y - player.y) > despawnDist) vehicles.splice(i, 1);
  }

  let count = 0;
  for (const v of vehicles) if (v.isBoat && !v.wrecked && !v.isPolice && v.driver !== 'player') count++;

  const candidates = map.waterNear(player.x, player.y, spawnMax);
  let guard = 0;
  while (count < target && candidates.length && guard++ < target * 6) {
    const poly = candidates[Math.floor(Math.random() * candidates.length)];
    const v = spawnBoatOnWater(map, poly, Math.random, { near: [player.x, player.y], min: spawnMin, max: spawnMax, budget: 3 });
    if (!v || !spawnSpotFree(vehicles, v)) continue;
    vehicles.push(v);
    count++;
  }
}

// A wander target with room around it that the boat can reach in a straight
// line through open water (sampled every 3 m), so the route doesn't cut
// across a bend in the canal; falls back to any spot with some room.
function pickBoatWaypoint(v, rng, map) {
  const pts = waterChannelPoints(map, v.waterPoly, 2).pts;
  let fallback = null;
  for (let attempt = 0; attempt < 14 && pts.length; attempt++) {
    const q = pts[Math.floor(rng() * pts.length)];
    const x = q.x, y = q.y;
    const d = Math.hypot(x - v.x, y - v.y);
    if (d < 6) continue;
    let clear = q.d >= 3;
    for (let t = 3; t < d && clear; t += 3) {
      if (waterClearance(map, v.x + (x - v.x) * t / d, v.y + (y - v.y) * t / d, 3) < 1.8) clear = false;
    }
    if (clear) return [x, y];
    if (!fallback) fallback = [x, y];
  }
  return fallback || [v.x, v.y];
}

const BOAT_WAYPOINT_MIN = 4;
const BOAT_WAYPOINT_MAX = 9;

// Simple wander/patrol confined to the water body the boat spawned in
// (v.waterPoly, set by spawnBoatOnWater) - no road graph involved, so this
// stands entirely apart from updateTrafficAI.
export function updateBoatAI(v, dt, map, world, rng = Math.random) {
  if (v.wrecked || v.scripted) return; // scripted: a mission module steers this boat itself
  if (!v.waterPoly) { v.applyControls(dt, 0, 0, true); return; }

  // Police pursuit: the waypoint is simply the player's live position.
  const chasing = v.isPolice && !v.hijacked && world.wanted > 0;
  if (chasing) {
    v.waypoint = [world.player.x, world.player.y];
  } else {
    v.waypointTimer = (v.waypointTimer || 0) - dt;
    if (!v.waypoint || v.waypointTimer <= 0 || Math.hypot(v.waypoint[0] - v.x, v.waypoint[1] - v.y) < 4) {
      v.waypoint = pickBoatWaypoint(v, rng, map);
      v.waypointTimer = BOAT_WAYPOINT_MIN + rng() * (BOAT_WAYPOINT_MAX - BOAT_WAYPOINT_MIN);
    }
  }

  const dx = v.waypoint[0] - v.x, dy = v.waypoint[1] - v.y;
  let steer = clamp(normalizeAngle(Math.atan2(dy, dx) - v.angle) * 1.2, -1, 1);
  let throttle = 1, brake = false;

  // three feelers ahead of the bow: ease off and turn toward the side with
  // more open water well before the hull reaches a quay, bank or houseboat
  const reach = v.model.len * 0.5 + 2 + Math.abs(v.speed) * 0.9;
  const feel = (a) => waterClearance(map, v.x + Math.cos(v.angle + a) * reach, v.y + Math.sin(v.angle + a) * reach, 5);
  const cF = feel(0);
  if (cF < 3) {
    const cL = feel(0.5), cR = feel(-0.5);
    const away = cL >= cR ? 1 : -1;
    const urgency = clamp((3 - cF) / 2.5, 0, 1);
    steer = clamp(steer * (1 - urgency) + away * urgency, -1, 1);
    throttle = cF < 1.2 ? 0.2 : 1 - urgency * 0.6;
    brake = cF < 0.5 && Math.abs(v.speed) > 1;
    if (!chasing && cF < 1.5) { v.waypoint = pickBoatWaypoint(v, rng, map); v.waypointTimer = BOAT_WAYPOINT_MIN; }
  }

  const px = v.x, py = v.y, pa = v.angle;
  v.applyControls(dt, throttle, steer, brake);
  if (!keepBoatOffShore(map, v, px, py, pa)) {
    v.speed *= -0.3;
    v.driftX = 0; v.driftY = 0;
    if (!chasing) { v.waypoint = pickBoatWaypoint(v, rng, map); v.waypointTimer = BOAT_WAYPOINT_MIN; }
  }
}

// What the tyres are on: 'asfalt' | 'fietspad' | 'klinkers' | 'gras'. The
// ground between mapped roads is rendered as klinker paving.
export function surfaceUnder(map, x, y) {
  let best = null;
  for (const r of map.roadsNear(x, y, 8)) {
    const half = r.width / 2 + 0.3;
    const pts = r.pts;
    for (let i = 0; i < pts.length - 1; i++) {
      const ax = pts[i][0], ay = pts[i][1], bx = pts[i + 1][0], by = pts[i + 1][1];
      const abx = bx - ax, aby = by - ay, l2 = abx * abx + aby * aby;
      const t = l2 > 1e-9 ? clamp(((x - ax) * abx + (y - ay) * aby) / l2, 0, 1) : 0;
      const dx = ax + abx * t - x, dy = ay + aby * t - y;
      if (dx * dx + dy * dy > half * half) continue;
      if (r.cat === 'foot') best = best || 'klinkers';
      else if (r.cat === 'cycle') { if (best !== 'asfalt') best = 'fietspad'; }
      else return 'asfalt';
      break;
    }
  }
  if (best) return best;
  for (const g of map.greenNear(x, y, 1)) {
    const [minx, miny, maxx, maxy] = g.bounds;
    if (x >= minx && x <= maxx && y >= miny && y <= maxy && pointInPolygon(x, y, g.pts)) return 'gras';
  }
  const country = countrySurface(x, y);
  if (country) return country === 'weg' ? 'asfalt' : 'gras';
  return 'klinkers';
}

// Distance from a point to the vehicle's body outline (its oriented box),
// 0 when inside - so a long bus is as easy to reach at the back as a hatch.
export function distToVehicleBody(v, x, y) {
  const c = Math.cos(v.angle), s = Math.sin(v.angle);
  const dx = x - v.x, dy = y - v.y;
  const lx = Math.abs(dx * c + dy * s) - v.halfLen, ly = Math.abs(dy * c - dx * s) - v.halfWid;
  return Math.hypot(Math.max(0, lx), Math.max(0, ly));
}

export const ENTER_REACH = 1.8;

// The free vehicle (no driver of any kind) whose body is nearest, within
// reach of its outline; moving traffic gets a little extra slack.
export function findEnterableVehicle(x, y, vehicles, reach = ENTER_REACH) {
  let best = null, bestScore = Infinity;
  for (const v of vehicles) {
    if (v.wrecked || v.sinking || v.driver) continue;
    const pad = v.halfLen + reach + 1.5;
    if (Math.abs(v.x - x) > pad || Math.abs(v.y - y) > pad) continue;
    const r = (v.isBike || v.isScooter ? reach * 0.7 : reach) + Math.min(1, Math.abs(v.speed) * 0.1);
    const d = distToVehicleBody(v, x, y);
    if (d > r || d / r >= bestScore) continue;
    bestScore = d / r;
    best = v;
  }
  return best;
}

export function findNearestVehicle(x, y, vehicles, maxDist = 2.5) {
  let best = null, bestD = maxDist;
  for (const v of vehicles) {
    if (v.wrecked) continue;
    const d = Math.hypot(v.x - x, v.y - y);
    if (d < bestD) { bestD = d; best = v; }
  }
  return best;
}

// --- traffic AI: pure-pursuit path following over a junction graph built
// from shared OSM nodes (road ends as well as mid-road crossings). ---

const graphCache = new WeakMap();
const nodeKey = (p) => Math.round(p[0] * 10) + ',' + Math.round(p[1] * 10);

function roadGraph(map) {
  let g = graphCache.get(map);
  if (g) return g;
  const nodes = new Map();
  const nodeOf = new Map();
  const drivable = map.roads.filter((r) => r.cat !== 'foot' && r.pts.length > 1);
  for (const r of drivable) {
    nodeOf.set(r, r.pts.map((p, idx) => {
      const k = nodeKey(p);
      let n = nodes.get(k);
      if (!n) { n = []; nodes.set(k, n); }
      n.push({ road: r, idx });
      return n;
    }));
  }
  // OSM ways that should meet sometimes stop a metre or two short
  for (const r of drivable) {
    const arr = nodeOf.get(r);
    for (const idx of [0, r.pts.length - 1]) {
      if (arr[idx].length > 1) continue;
      const p = r.pts[idx];
      let best = null, bestD2 = 16;
      for (const o of map.roadsNear(p[0], p[1], 4)) {
        const on = nodeOf.get(o);
        if (o === r || !on) continue;
        o.pts.forEach((q, j) => {
          const d2 = (q[0] - p[0]) ** 2 + (q[1] - p[1]) ** 2;
          if (d2 < bestD2) { bestD2 = d2; best = on[j]; }
        });
      }
      if (best) { best.push({ road: r, idx }); arr[idx] = best; }
    }
  }
  g = { nodeOf };
  graphCache.set(map, g);
  return g;
}

function roadNode(map, road, i) {
  const arr = roadGraph(map).nodeOf.get(road);
  return arr ? arr[i] : null;
}

function isJunction(map, road, i) {
  if (i === 0 || i === road.pts.length - 1) return true;
  const node = roadNode(map, road, i);
  return !!node && node.length > 1;
}

function canUseRoad(v, r) {
  if (r.cat === 'foot') return false;
  const small = v.isBike || v.isScooter;
  if (r.cat === 'cycle' && !small) return false;
  return small || r.width >= v.model.wid + 1.1;
}

function segHeading(road, i, j) {
  const a = road.pts[i], b = road.pts[j];
  return Math.atan2(b[1] - a[1], b[0] - a[0]);
}

function chooseTurn(v, map, road, at, dir, rng, goal) {
  const node = roadNode(map, road, at) || [{ road, idx: at }];
  const inHeading = segHeading(road, at - dir, at);
  const opts = [];
  for (const e of node) {
    if (e.road !== road && !canUseRoad(v, e.road)) continue;
    for (const d of [1, -1]) {
      const j = e.idx + d;
      if (j < 0 || j >= e.road.pts.length) continue;
      if (e.road.oneway && d < 0) continue;
      if (e.road === road && e.idx === at && d === -dir) continue;
      opts.push({ road: e.road, dir: d, idx: e.idx, turn: normalizeAngle(segHeading(e.road, e.idx, j) - inHeading) });
    }
  }
  let pool = opts.filter((o) => Math.abs(o.turn) < 2);
  if (!pool.length) pool = opts.filter((o) => Math.abs(o.turn) < 2.6);
  if (!pool.length) pool = opts;
  if (!pool.length) return { road, dir: -dir, idx: at, uturn: true, from: road, at };

  let pick = pool[pool.length - 1];
  if (goal) {
    const p = road.pts[at];
    const gx = goal.x - p[0], gy = goal.y - p[1], gl = Math.hypot(gx, gy) || 1;
    let best = -Infinity;
    for (const o of pool) {
      const h = segHeading(o.road, o.idx, o.idx + o.dir);
      const score = (Math.cos(h) * gx + Math.sin(h) * gy) / gl + rng() * 0.15;
      if (score > best) { best = score; pick = o; }
    }
    if (best < -0.4 && !road.oneway) pick = { road, dir: -dir, idx: at, uturn: true };
  } else {
    const small = v.isBike || v.isScooter;
    const weights = pool.map((o) => {
      let w = Math.abs(o.turn) < 0.45 ? 3 : 1;
      if (v.isBus && (o.road.cat === 'major' || o.road.cat === 'normal')) w *= 3;
      if (small && o.road.cat === 'cycle') w *= 2;
      return w;
    });
    let r = rng() * weights.reduce((a, b) => a + b, 0);
    for (let k = 0; k < pool.length; k++) {
      r -= weights[k];
      if (r <= 0) { pick = pool[k]; break; }
    }
  }
  return { road: pick.road, dir: pick.dir, idx: pick.idx, uturn: !!pick.uturn, from: road, at };
}

function nextTurn(v, map, rng, goal, k, road, at, dir) {
  let t = v.plan[k];
  if (!t || t.from !== road || t.at !== at) {
    t = chooseTurn(v, map, road, at, dir, rng, goal);
    v.plan.length = k;
    v.plan.push(t);
  }
  return t;
}

// A* over the junction graph to the drivable point nearest (gx, gy); the
// result replaces v.plan with one entry per junction along the route.
const ROUTE_MAX_EXPANSIONS = 6000;

function findRoute(v, map, gx, gy) {
  const target = map.nearestRoadPoint(gx, gy, 300, true);
  if (!target || !canUseRoad(v, target.road)) return false;
  const tp = target.road.pts;
  let ti = 0, tBest = Infinity;
  tp.forEach((p, i) => { const d = Math.hypot(p[0] - target.x, p[1] - target.y); if (d < tBest) { tBest = d; ti = i; } });
  const goalNode = roadNode(map, target.road, ti);
  const { nodeOf } = roadGraph(map);
  const stateKey = (road, idx, dir) => (isJunction(map, road, idx) ? nodeOf.get(road)[idx] : road.pts[idx][0] + ',' + road.pts[idx][1] + ',' + dir);
  const b = v.segIdx + v.dir;
  const start = { road: v.road, idx: b, dir: v.dir, g: Math.hypot(v.road.pts[b][0] - v.x, v.road.pts[b][1] - v.y), prev: null };
  const h = (p) => Math.hypot(p[0] - tp[ti][0], p[1] - tp[ti][1]);
  start.f = start.g + h(v.road.pts[b]);
  const open = [start];
  const push = (x) => {
    open.push(x);
    for (let i = open.length - 1; i > 0;) {
      const p = (i - 1) >> 1;
      if (open[p].f <= open[i].f) break;
      [open[p], open[i]] = [open[i], open[p]];
      i = p;
    }
  };
  const pop = () => {
    const top = open[0], last = open.pop();
    if (open.length) {
      open[0] = last;
      for (let i = 0; ;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < open.length && open[l].f < open[m].f) m = l;
        if (r < open.length && open[r].f < open[m].f) m = r;
        if (m === i) break;
        [open[m], open[i]] = [open[i], open[m]];
        i = m;
      }
    }
    return top;
  };
  const best = new Map([[stateKey(v.road, b, v.dir), start.g]]);
  let found = null;
  for (let n = 0; n < ROUTE_MAX_EXPANSIONS && open.length; n++) {
    const cur = pop();
    const node = nodeOf.get(cur.road)[cur.idx];
    if (node === goalNode) { found = cur; break; }
    const exits = isJunction(map, cur.road, cur.idx) ? node : [{ road: cur.road, idx: cur.idx }];
    for (const e of exits) {
      if (!canUseRoad(v, e.road)) continue;
      for (const d of [1, -1]) {
        if (!isJunction(map, cur.road, cur.idx) && d !== cur.dir) continue;
        const j = e.idx + d;
        if (j < 0 || j >= e.road.pts.length) continue;
        // a pursuing police car may take a one-way street the wrong way
        const wrongWay = e.road.oneway && d < 0;
        if (wrongWay && !v.isPolice) continue;
        const a = e.road.pts[e.idx], q = e.road.pts[j];
        const g = cur.g + Math.hypot(q[0] - a[0], q[1] - a[1]) * (wrongWay ? 1.6 : 1) + (e.road === cur.road && d === -cur.dir ? 25 : 0);
        const key = stateKey(e.road, j, d);
        if (g >= (best.get(key) ?? Infinity)) continue;
        best.set(key, g);
        push({ road: e.road, idx: j, dir: d, g, f: g + h(q), prev: cur, exitIdx: e.idx });
      }
    }
  }
  if (!found) return false;
  const steps = [];
  for (let s = found; s.prev; s = s.prev) steps.push(s);
  steps.reverse();
  const plan = [];
  let arrRoad = v.road, arrIdx = b;
  for (const st of steps) {
    if (isJunction(map, arrRoad, arrIdx)) {
      plan.push({ road: st.road, dir: st.dir, idx: st.exitIdx, uturn: false, from: arrRoad, at: arrIdx });
    }
    arrRoad = st.road; arrIdx = st.idx;
  }
  v.plan = plan;
  v.routeEnd = { road: target.road, idx: ti };
  return true;
}

// Move segIdx forward once the vehicle has passed the end of its segment, or
// is already closer to the next one (a corner that got cut).
function advanceAlongRoad(v, map, rng, goal) {
  for (let k = 0; k < 6; k++) {
    const road = v.road, b = v.segIdx + v.dir;
    const A = lanePoint(map, road, v.segIdx, v.dir, v), B = lanePoint(map, road, b, v.dir, v);
    const cur = closestPointOnSegment(v.x, v.y, A[0], A[1], B[0], B[1]);
    let t = null, nRoad = road, nDir = v.dir, nIdx = b;
    if (isJunction(map, road, b)) {
      t = nextTurn(v, map, rng, goal, 0, road, b, v.dir);
      nRoad = t.road; nDir = t.dir; nIdx = t.idx;
    }
    const C = lanePoint(map, nRoad, nIdx, nDir, v), D = lanePoint(map, nRoad, nIdx + nDir, nDir, v);
    const nxt = closestPointOnSegment(v.x, v.y, C[0], C[1], D[0], D[1]);
    if (cur.t < 1 && !(nxt.t > 0 && nxt.dist2 < cur.dist2)) break;
    if (t) {
      v.plan.shift();
      v.deadEndBounces = t.uturn ? (v.deadEndBounces || 0) + 1 : 0;
    }
    v.road = nRoad; v.dir = nDir; v.segIdx = nIdx;
  }
}

const PATH_LEN = 45;
const PLAN_DEPTH = 4;

// Lane-offset polyline ahead of the vehicle, following its planned turns.
// Points flagged j are junction nodes.
function buildPath(v, map, rng, goal) {
  let road = v.road, dir = v.dir, idx = v.segIdx + dir;
  const A = lanePoint(map, road, v.segIdx, dir, v), B = lanePoint(map, road, idx, dir, v);
  const start = closestPointOnSegment(v.x, v.y, A[0], A[1], B[0], B[1]);
  const path = [{ x: start.x, y: start.y, s: 0, j: false }];
  let px = start.x, py = start.y, s = 0, k = 0;
  const push = (q, j) => {
    s += Math.hypot(q[0] - px, q[1] - py);
    px = q[0]; py = q[1];
    path.push({ x: px, y: py, s, j, r: road, i: idx });
  };
  for (let guard = 0; guard < 120 && s < PATH_LEN; guard++) {
    const junction = isJunction(map, road, idx);
    push(lanePoint(map, road, idx, dir, v), junction);
    if (junction) {
      const jp = path[path.length - 1];
      jp.node = roadNode(map, road, idx);
      jp.from = road;
      jp.fromDir = dir;
      if (k >= PLAN_DEPTH) break;
      const t = nextTurn(v, map, rng, goal, k++, road, idx, dir);
      road = t.road; dir = t.dir; idx = t.idx;
      push(lanePoint(map, road, idx, dir, v), false);
    }
    idx += dir;
  }
  return path;
}

function pointAlong(path, s) {
  for (let i = 1; i < path.length; i++) {
    if (path[i].s < s) continue;
    const a = path[i - 1], b = path[i];
    const span = b.s - a.s;
    const t = span > 1e-6 ? (s - a.s) / span : 0;
    return [lerp(a.x, b.x, t), lerp(a.y, b.y, t)];
  }
  const last = path[path.length - 1];
  return [last.x, last.y];
}

function projectOnPath(path, x, y) {
  let best = null, bestD2 = Infinity;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], b = path[i];
    if (b.s - a.s < 0.05) continue;
    const cp = closestPointOnSegment(x, y, a.x, a.y, b.x, b.y);
    if (cp.dist2 < bestD2) { bestD2 = cp.dist2; best = { i, t: cp.t }; }
  }
  if (!best) return null;
  const a = path[best.i - 1], b = path[best.i];
  const L = b.s - a.s;
  return { s: a.s + L * best.t, lat: Math.sqrt(bestD2), tx: (b.x - a.x) / L, ty: (b.y - a.y) / L };
}

// Fastest speed now that still lets the vehicle take every upcoming bend at
// a comfortable sideways acceleration, braking at `decel`.
function curveSpeedLimit(v, path, aLat, decel) {
  let vmax = Infinity;
  const end = path[path.length - 1].s;
  for (let s = 3; s < end - 3; s += 2) {
    const p0 = pointAlong(path, s - 3), p1 = pointAlong(path, s), p2 = pointAlong(path, s + 3);
    const h1 = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]);
    const h2 = Math.atan2(p2[1] - p1[1], p2[0] - p1[0]);
    const turn = Math.abs(normalizeAngle(h2 - h1));
    if (turn < 0.08) continue;
    const vc = Math.max(2.5, Math.sqrt(aLat * 3 / turn));
    vmax = Math.min(vmax, Math.sqrt(vc * vc + 2 * decel * Math.max(0, s - v.halfLen)));
  }
  return vmax;
}

// Planned (comfortable) deceleration for AI speed profiles; the brake pedal
// itself can still use the model's full m.brake when something jumps out.
function aiComfortDecel(v) {
  const m = v.model;
  return v.isBike || v.isScooter ? m.brake * 0.4 : Math.min(7, m.brake * 0.3);
}

// The player (or companion) on foot in the lane ahead: traffic tries to stop
// in front of them, which is what makes carjacking possible at all.
function walkerAheadLimit(v, path, world, decel) {
  let vmax = Infinity;
  const fx = Math.cos(v.angle), fy = Math.sin(v.angle);
  for (const w of [world.player, world.companion]) {
    if (!w || w.inVehicle || w.state === 'dead' || w.swimming) continue;
    const dx = w.x - v.x, dy = w.y - v.y;
    const fwd = dx * fx + dy * fy;
    if (fwd < v.halfLen - 0.5 || fwd > 32 || Math.abs(dy * fx - dx * fy) > 6) continue;
    const pr = projectOnPath(path, w.x, w.y);
    if (!pr || pr.lat > v.halfWid + 0.9) continue;
    const stopS = pr.s - v.halfLen - 1.4;
    vmax = Math.min(vmax, Math.sqrt(2 * decel * Math.max(0, stopS)));
  }
  return vmax;
}

// Car-following: keep a stopping distance plus a time gap to whatever sits
// on our path ahead - same-direction traffic, crossing traffic at a
// junction, or something oncoming in our own lane.
function followSpeedLimit(v, path, world, decel, chase) {
  let vmax = Infinity, leader = null, leaderS = Infinity;
  const ignoring = world.time < (v.ignoreUntil || 0) ? v.ignoreId : -1;
  const fx = Math.cos(v.angle), fy = Math.sin(v.angle);
  const stopGap = chase ? 1 : v.isBike || v.isScooter ? 0.8 : 1.8;
  const timeGap = chase ? 0.35 : 0.9;
  const corridor = v.halfLen + 3 + Math.abs(v.speed) * 0.8;
  const creeping = world.time < (v.creepUntil || 0);
  for (const o of world.vehicles) {
    if (o === v || o.isBoat || o.sinking || o.id === ignoring) continue;
    const dx = o.x - v.x, dy = o.y - v.y;
    if (dx * dx + dy * dy > (PATH_LEN + 5) ** 2) continue;
    const rel = Math.cos(o.angle - v.angle);
    if (creeping && rel < 0.5 && !o.wrecked) continue;
    // same-direction traffic alongside or behind is never our leader (two
    // vehicles side by side must not both wait for each other)
    if (rel > 0.8 && dx * Math.cos(v.angle) + dy * Math.sin(v.angle) < 0) continue;
    const ofx = Math.cos(o.angle), ofy = Math.sin(o.angle);
    const reach = v.halfWid + o.halfWid + (rel < -0.5 ? 0.1 : 0.3);
    const passing = v.laneMode === 'pass' && o.id === v.passId;
    let hit = null;
    for (const k of [0, 0.8, -0.8]) {
      const qx = o.x + ofx * o.halfLen * k, qy = o.y + ofy * o.halfLen * k;
      const fwd = (qx - v.x) * fx + (qy - v.y) * fy;
      if (fwd < 0.3) continue;
      const pr = projectOnPath(path, qx, qy);
      if (pr && pr.lat < reach && (!hit || pr.s < hit.s)) hit = pr;
      // right in front of the bumper counts even where the path bends away
      const side = Math.abs((qy - v.y) * fx - (qx - v.x) * fy);
      if (!passing && fwd < corridor && side < reach - 0.2 && (!hit || fwd < hit.s)) hit = { s: fwd, lat: side, tx: fx, ty: fy };
    }
    if (!hit) continue;
    let along = (ofx * o.speed + o.driftX) * hit.tx + (ofy * o.speed + o.driftY) * hit.ty;
    if (along < -1) {
      const pc = projectOnPath(path, o.x, o.y);
      if (!pc || pc.lat > v.halfWid + o.halfWid - 0.1) continue;
      along = 0;
    }
    const lead = Math.max(0, along);
    const gap = hit.s - v.halfLen - Math.max(o.halfWid, o.halfLen * 0.2);
    const vf = Math.max(0, Math.min(
      lead + 0.5 * (gap - stopGap - timeGap * Math.max(0, v.speed)),
      Math.sqrt(Math.max(0, 2 * decel * (gap - stopGap))) + lead * 0.7,
    ));
    if (vf < vmax) { vmax = vf; leader = o; leaderS = hit.s; }
  }
  return { vmax, leader, leaderS };
}

// Speed that brings the vehicle to a halt at the stop line of a red (or a
// still-stoppable amber) signal on its path. Each signal head controls one
// approach direction; once past a stop line on green the rest of that
// junction's heads are not ours to stop for.
function trafficLightLimit(v, path, world) {
  const near = trafficSignalsNear(v.x, v.y);
  if (!near.length) return Infinity;
  const small = v.isBike || v.isScooter;
  const decel = aiComfortDecel(v) * 1.1;
  const reach = Math.max(3.5, laneOffset(v.road, v) + 2);
  const since = world.time - (v.clearedAt || -99);
  const cc = v.clearedCtrl;
  const cleared = cc && (since < 12 || (since < 40 && Math.hypot(v.x - cc.x, v.y - cc.y) < 40)) ? cc : null;
  let vmax = Infinity;
  for (const A of near) {
    if (A.broken || (A.bike && !small) || A.ctrl === cleared) continue;
    const dx = A.x - v.x, dy = A.y - v.y;
    if (dx * dx + dy * dy > 55 * 55) continue;
    const pr = projectOnPath(path, A.x, A.y);
    if (!pr || pr.lat > reach) continue;
    // tangent over a few metres: lane joins at way ends leave tiny kinks
    const [ax, ay] = pointAlong(path, Math.max(0, pr.s - 2)), [bx, by] = pointAlong(path, pr.s + 2);
    if ((bx - ax) * A.hx + (by - ay) * A.hy < 0.6 * Math.hypot(bx - ax, by - ay)) continue;
    const stopS = pr.s - v.halfLen - 1.2;
    const phase = getTrafficLightPhase(A);
    const go = phase === 'green' || stopS < -1 ||
      (phase === 'yellow' && (v.speed * v.speed) / (2 * aiComfortDecel(v) * 1.75) > stopS);
    if (go) {
      if (stopS < 3) { v.clearedCtrl = A.ctrl; v.clearedAt = world.time; }
      continue;
    }
    vmax = Math.min(vmax, Math.sqrt(2 * decel * Math.max(0, stopS)));
  }
  return vmax;
}

// Unsignalled junction priority, Dutch rules: the higher road class goes
// first (roundabout > major > normal > minor > service), between equals
// traffic from the right goes first, a left turn yields to oncoming traffic,
// otherwise whoever arrives first (ties by id). Vehicles held by a light or
// a queue don't claim, so they can't block traffic that actually can go.
// If everyone we yield to is itself stuck waiting (rechts-voor-gaat on all
// four arms), the lowest id among them goes.
function roadRank(r) {
  if (!r) return 0;
  if (r.roundabout) return 5;
  if (r.type === 'service' || r.type === 'track') return 0;
  return r.cat === 'major' ? 3 : r.cat === 'normal' ? 2 : 1;
}

function realJunction(node) {
  let n = 0;
  for (const e of node) n += (e.idx > 0 ? 1 : 0) + (e.idx < e.road.pts.length - 1 ? 1 : 0);
  return n >= 3;
}

function firstJunction(path) {
  for (const p of path) if (p.j && p.s > 0.5 && p.node && realJunction(p.node)) return p;
  return null;
}

function junctionYieldLimit(v, path, world, decel, claim) {
  const first = firstJunction(path);
  if (!first || first.s > 18) return Infinity;
  const claims = first.node.claims || (first.node.claims = new Map());
  const eta = first.s / Math.max(Math.abs(v.speed), 1.5);
  const [ax, ay] = pointAlong(path, Math.max(0, first.s - 3));
  const [bx, by] = pointAlong(path, first.s + 4);
  const la = Math.hypot(first.x - ax, first.y - ay) || 1, lb = Math.hypot(bx - first.x, by - first.y) || 1;
  const hx = (first.x - ax) / la, hy = (first.y - ay) / la;
  const turnLeft = hx * (by - first.y) / lb - hy * (bx - first.x) / lb < -0.4;
  const rank = roadRank(first.from);
  if (claim) claims.set(v.id, { eta, time: world.time, from: first.from, fromDir: first.fromDir, rank, hx, hy, turnLeft, still: v.stillFor || 0 });
  else claims.delete(v.id);
  let yieldTo = false, othersWaiting = true, minId = v.id;
  for (const [id, c] of claims) {
    if (id === v.id) continue;
    if (world.time - c.time > 0.25) { claims.delete(id); continue; }
    if (c.from === first.from && c.fromDir === first.fromDir) continue;
    let must;
    if (c.eta < 0.8 && c.eta < eta) must = true;
    else if (c.rank !== rank) must = c.rank > rank && c.eta < 6;
    else {
      const cross = hx * c.hy - hy * c.hx;
      const dot = hx * c.hx + hy * c.hy;
      if (cross < -0.35) must = c.eta < eta + 3;
      else if (cross > 0.35) must = c.eta < eta - 2;
      else if (dot < -0.7 && turnLeft !== c.turnLeft) must = turnLeft && c.eta < eta + 2.5;
      else must = c.eta < eta - 0.25 || (Math.abs(c.eta - eta) <= 0.25 && id < v.id);
    }
    if (!must) continue;
    yieldTo = true;
    if (c.still < 1.5) othersWaiting = false;
    if (id < minId) minId = id;
  }
  if (!yieldTo) return Infinity;
  const waited = v.yieldWait || 0;
  if ((waited > 2.5 && othersWaiting && v.id <= minId) || waited > 8 + (v.id % 5)) return Infinity;
  const stopS = first.s - 4 - v.halfLen;
  return stopS < -0.5 ? Infinity : Math.sqrt(2 * decel * Math.max(0, stopS));
}

// Don't drive into a junction whose exit is still blocked by the queue in
// front: wait at the entry so crossing traffic keeps flowing.
function junctionBoxLimit(v, path, follow, decel) {
  const o = follow.leader;
  if (!o || Math.abs(o.speed) > 1 || follow.leaderS === Infinity) return Infinity;
  const j = firstJunction(path);
  if (!j || j.s > 14 || follow.leaderS < j.s) return Infinity;
  if (follow.leaderS - j.s > v.model.len + 4) return Infinity;
  const stopS = j.s - 4 - v.halfLen;
  return stopS < 1 ? Infinity : Math.sqrt(2 * decel * stopS);
}

function queuedAtLight(v) {
  let r = v, n = 0;
  while (r && n++ < 30) { if (r._atLight) return true; r = r._leader; }
  return false;
}

// Deadlock breakers, run after the speed limits are known:
// - a waiting cycle (A waits for B waits for ... A): the lowest id in the
//   cycle ignores its leader for a moment and goes first;
// - an oncoming vehicle close ahead on a narrow two-way street: both hug the
//   right verge so they fit past each other;
// - a stopped obstacle (wreck, abandoned car, broken-down queue head) in the
//   lane: swing out and pass it when the other side is clear.
function resolveDeadlocks(v, dt, world, follow, lightV) {
  const o = follow.leader;
  const held = o && follow.vmax < 0.5 && Math.abs(v.speed) < 0.5 && lightV > 1;
  v._leader = held ? o : null;
  v._atLight = lightV < 0.5;
  if (held) {
    let r = o, minId = v.id, n = 0;
    while (r && r !== v && n++ < 10) { if (r.id < minId) minId = r.id; r = r._leader; }
    if (r === v && minId === v.id) { v.ignoreId = o.id; v.ignoreUntil = world.time + 2.5; }
  }

  const now = world.time;
  if (v.laneMode && now > v.laneModeUntil) v.laneMode = null;
  const fx = Math.cos(v.angle), fy = Math.sin(v.angle);
  // the vehicle in our way is pinned trying to manoeuvre: back off a little
  if (held && (o.stuckFor || 0) > 1 && Math.cos(o.angle - v.angle) < 0.5 && now - (v.backOffAt || -99) > 6 &&
    !world.vehicles.some((q) => q !== v && Math.hypot(q.x - v.x + fx * v.halfLen, q.y - v.y + fy * v.halfLen) < v.halfLen + 2.5)) {
    v.backOffAt = now;
  }
  const half = (v.road.width || 6) / 2;
  if (o && !o.wrecked && o.road && !v.road.oneway && half < 3.6 && Math.cos(o.angle - v.angle) < -0.5 && follow.vmax < 4) {
    v.laneMode = 'squeeze'; v.laneModeUntil = now + 3;
  }
  if (!held || v.laneMode === 'squeeze') return;
  const obstacle = o.wrecked || !o.road || (o.driver === 'player' && Math.abs(o.speed) < 0.3) || (o.stuckFor || 0) > 3;
  if (!obstacle || Math.cos(o.angle - v.angle) < -0.5 && !o.wrecked) return;
  for (const q of world.vehicles) {
    if (q === v || q === o || q.isBoat) continue;
    const dx = q.x - v.x, dy = q.y - v.y;
    const fwd = dx * fx + dy * fy, lat = dy * fx - dx * fy;
    if (fwd > v.halfLen && fwd < 30 && lat < 0.5 && lat > -half - 3 && Math.cos(q.angle - v.angle) < 0.3) return;
  }
  v.laneMode = 'pass'; v.laneModeUntil = now + 4; v.passId = o.id;
  v.ignoreId = -1;
}

// opts.goal ({x, y}) steers junction choices toward a target; opts.chase
// drives faster, tighter and ignores traffic lights (police pursuit).
export function updateTrafficAI(v, dt, map, world, rng = Math.random, opts = null) {
  if (v.wrecked) return;
  if (!v.road) {
    // parked or abandoned: a shove from a collision rolls out against the handbrake
    if (!v.driver && !v.sinking && (v.speed || v.driftX || v.driftY || v.yawVel)) v.applyControls(dt, 0, 0, 0.35);
    return;
  }
  if (!v.plan) v.plan = [];
  const goal = (opts && opts.goal) || null;
  const chase = !!(opts && opts.chase);
  if (goal && world.time - (v.planAt || 0) > 1.5) {
    v.planAt = world.time;
    if (!findRoute(v, map, goal.x, goal.y)) { v.plan.length = Math.min(v.plan.length, 1); v.routeEnd = null; }
  }

  advanceAlongRoad(v, map, rng, goal);
  const path = buildPath(v, map, rng, goal);
  const m = v.model;
  const small = v.isBike || v.isScooter;

  const lookahead = clamp(2 + Math.abs(v.speed) * 0.55, small ? 2.5 : 3.2, 15) + (v.isBus ? 3 : 0);
  const [tx, ty] = pointAlong(path, lookahead);
  const fx = Math.cos(v.angle), fy = Math.sin(v.angle);
  const dx = tx - v.x, dy = ty - v.y;
  const fwd = dx * fx + dy * fy, lat = dy * fx - dx * fy;
  const alpha = Math.atan2(lat, fwd);
  v.tightTurn = Math.abs(alpha) > 1.1 && Math.abs(v.speed) < 5;
  const curvature = 2 * lat / Math.max(1, dx * dx + dy * dy);
  const steer = Math.abs(alpha) > Math.PI / 2 ? Math.sign(alpha) : clamp(curvature / maxCurvature(v), -1, 1);

  const decel = chase ? m.brake * 0.7 : aiComfortDecel(v);
  const aLat = chase ? lateralGrip(m) * 0.6 : small ? 2.2 : v.isBus ? 1.6 : 3;
  let cruise = (v.road.speed || (small ? m.maxSpeed : 8)) * (v.cruiseScale || 1);
  if (chase) cruise = opts.cruise || Math.max(cruise * 1.5, 16);
  cruise = Math.min(cruise, m.maxSpeed * (small ? 0.9 : 0.95));

  let vTarget = Math.min(cruise, curveSpeedLimit(v, path, aLat, decel));
  const follow = followSpeedLimit(v, path, world, decel, chase);
  const lightV = chase ? Infinity : Math.min(trafficLightLimit(v, path, world), crossingSpeedLimit(v, path, projectOnPath),
    small ? Infinity : zebraSpeedLimit(v, path, projectOnPath, world.time));
  vTarget = Math.min(vTarget, follow.vmax, lightV);
  const walkerV = chase ? Infinity : walkerAheadLimit(v, path, world, decel);
  vTarget = Math.min(vTarget, walkerV);
  const creeping = world.time < (v.creepUntil || 0);
  let yieldV = Infinity;
  if (!chase && !creeping) {
    const boxV = junctionBoxLimit(v, path, follow, decel);
    yieldV = junctionYieldLimit(v, path, world, decel, Math.min(follow.vmax, lightV, boxV) > 1);
    vTarget = Math.min(vTarget, boxV, yieldV);
  }
  v.stillFor = Math.abs(v.speed) < 0.5 ? (v.stillFor || 0) + dt : 0;
  if (yieldV < 0.5 && v.stillFor > 0) v.yieldWait = (v.yieldWait || 0) + dt;
  else if (Math.abs(v.speed) > 2) v.yieldWait = 0;
  if (!chase) resolveDeadlocks(v, dt, world, follow, lightV);
  if (Math.abs(alpha) > 1) vTarget = Math.min(vTarget, 3.5);
  if (v.waitTimer > 0) { v.waitTimer -= dt; vTarget = 0; }
  if (goal && v.routeEnd) {
    const end = path.find((p) => p.r === v.routeEnd.road && p.i === v.routeEnd.idx);
    if (end) vTarget = Math.min(vTarget, Math.sqrt(2 * decel * Math.max(0, end.s - 3)));
  }
  if (creeping) vTarget = Math.min(vTarget, 2.5);
  if (v.laneMode === 'pass') vTarget = Math.min(vTarget, 4);

  // Gridlock (junction standoff, head-on in a narrow street, an abandoned
  // car in the lane): after a while stop yielding to cross/oncoming traffic
  // and creep through at walking pace. Queues behind a light are left alone.
  const o = follow.leader;
  const standoff = o && follow.vmax < 0.5 && Math.abs(v.speed) < 0.5 && lightV > 1 && o.driver !== 'player' &&
    (!o.road || (o.blockedFor || 0) > 0 || (o.stuckFor || 0) > 6 || Math.cos(o.angle - v.angle) < 0.5);
  v.blockedFor = standoff ? (v.blockedFor || 0) + dt : Math.max(0, (v.blockedFor || 0) - dt * 0.5);
  if (v.blockedFor > 3 + (v.id % 5) * 0.6) {
    v.creepUntil = world.time + 3;
    v.blockedFor = 0;
  }
  const blockedByPlayer = (walkerV < 0.5 || (!!o && o.driver === 'player' && follow.vmax < 0.5)) && Math.abs(v.speed) < 0.5;
  v.hornFor = blockedByPlayer ? (v.hornFor || 0) + dt : 0;
  v.horn = v.hornFor > 1.5 && v.hornFor < 2.2;
  v.stuckFor = Math.abs(v.speed) < 0.6 && vTarget > 2 ? (v.stuckFor || 0) + dt : 0;
  // held (not by a light) for a long time: turn around and find another way
  v.waitFor = Math.abs(v.speed) < 0.5 && vTarget < 0.5 && lightV > 1 ? (v.waitFor || 0) + dt : 0;
  if (!chase && v.waitFor > 35 + (v.id % 10) && !v.road.oneway && !goal && !queuedAtLight(v)) {
    v.waitFor = 0;
    v.segIdx += v.dir;
    v.dir = -v.dir;
    v.plan.length = 0;
  }

  if (world.time - (v.backOffAt || -99) < 1.2) {
    v.applyControls(dt, -0.4, 0, 0);
    return;
  }
  // pinned against a wall: back off with opposite lock, then try again
  if (v.stuckFor > 1.5 && world.time - (v.reverseAt || -99) > 4) v.reverseAt = world.time;
  if (world.time - (v.reverseAt || -99) < 1.2) {
    v.applyControls(dt, -0.6, -steer, 0);
    return;
  }
  const err = vTarget - v.speed;
  let throttle = 0, brake = 0;
  if (err > 0.25) throttle = clamp(err * 0.6, 0.2, 1);
  else if (err < -0.5) brake = clamp(-err * (walkerV < v.speed ? 0.6 : 0.3), 0.1, 1);
  if (vTarget < 0.3 && Math.abs(v.speed) < 1.2) brake = 1;
  v.applyControls(dt, throttle, steer, brake);
}

// --- collisions ------------------------------------------------------------
// Each vehicle is a capsule: an axis segment (front-to-rear, shrunk by its
// half-width so the rounded caps land on the bumpers) plus a half-width
// radius, so nose-to-tail contact is caught as well as side-by-side.
function vehicleCapsule(v) {
  const segHalf = Math.max(0, v.halfLen - v.halfWid);
  const dx = Math.cos(v.angle) * segHalf, dy = Math.sin(v.angle) * segHalf;
  return { ax: v.x - dx, ay: v.y - dy, bx: v.x + dx, by: v.y + dy, r: v.halfWid + 0.05 };
}

// Approximate min distance/closest-point-pair between two segments by
// checking each segment's two endpoints against the other segment - exact
// when the segments don't cross, and a good approximation for the shallow
// crossing angles two cars on a road actually produce.
function closestPointsBetweenSegments(s1, s2) {
  let p1x = s1.ax, p1y = s1.ay, p2x = s2.ax, p2y = s2.ay;
  let bestD2 = Infinity;
  let c = closestPointOnSegment(s1.ax, s1.ay, s2.ax, s2.ay, s2.bx, s2.by);
  if (c.dist2 < bestD2) { bestD2 = c.dist2; p1x = s1.ax; p1y = s1.ay; p2x = c.x; p2y = c.y; }
  c = closestPointOnSegment(s1.bx, s1.by, s2.ax, s2.ay, s2.bx, s2.by);
  if (c.dist2 < bestD2) { bestD2 = c.dist2; p1x = s1.bx; p1y = s1.by; p2x = c.x; p2y = c.y; }
  c = closestPointOnSegment(s2.ax, s2.ay, s1.ax, s1.ay, s1.bx, s1.by);
  if (c.dist2 < bestD2) { bestD2 = c.dist2; p2x = s2.ax; p2y = s2.ay; p1x = c.x; p1y = c.y; }
  c = closestPointOnSegment(s2.bx, s2.by, s1.ax, s1.ay, s1.bx, s1.by);
  if (c.dist2 < bestD2) { bestD2 = c.dist2; p2x = s2.bx; p2y = s2.by; p1x = c.x; p1y = c.y; }
  return { p1x, p1y, p2x, p2y, dist2: bestD2 };
}

// Footprint area as a mass proxy: a bus barely budges for a bike while the
// bike gets thrown clear.
function vehicleMass(v) {
  return Math.max(0.3, v.model.len * v.model.wid);
}

function inverseInertia(v) {
  return 12 / (vehicleMass(v) * (v.model.len ** 2 + v.model.wid ** 2));
}

const COLLISION_RESTITUTION = 0.3;
const RESTING_SPEED = 1; // closing speed below which contacts don't bounce at all (no ping-pong)
const CRUNCH_SPEED = 9; // above this, hits absorb most of their energy instead of bouncing
const CONTACT_FRICTION = 0.35;
const WALL_FRICTION = 0.25;
const IMPACT_EVENT_SPEED = 1.5;
const HARD_HIT_CLOSING_SPEED = 3; // m/s of closing speed before a hit counts as "hard" (sparks/damage)
const IMPACT_DAMAGE_PER_MPS = 3.5;
const MAX_IMPACT_DAMAGE = 30;
// Cars should survive a fair amount of GTA-style driving: every collision
// (cars, walls, props) does this fraction of its raw damage.
export const CRASH_DAMAGE_SCALE = 0.4;
const WALL_DAMAGE_SPEED = 7;
const MAX_WALL_DAMAGE = 20;
const SCRAPE_SPEED = 3;

function velocityOf(v) {
  return [Math.cos(v.angle) * v.speed + v.driftX, Math.sin(v.angle) * v.speed + v.driftY];
}

// Forward part becomes v.speed, the sideways rest becomes drift (decays in
// applyControls) - the facing angle only changes through yawVel.
function setVelocity(v, vx, vy) {
  const fx = Math.cos(v.angle), fy = Math.sin(v.angle);
  const cap = speedCap(v);
  v.speed = clamp(vx * fx + vy * fy, -cap, cap);
  const lat = vy * fx - vx * fy;
  v.driftX = clamp(-fy * lat, -MAX_DRIFT_SPEED, MAX_DRIFT_SPEED);
  v.driftY = clamp(fx * lat, -MAX_DRIFT_SPEED, MAX_DRIFT_SPEED);
}

// Rigid-body impulse at contact point (cx, cy) with normal n pointing from a
// into b (b null: an immovable wall). Restitution + Coulomb friction, and
// off-centre hits spin the vehicle. Returns the closing speed resolved.
function contactImpulse(a, b, cx, cy, nx, ny, friction) {
  const [vax, vay] = velocityOf(a);
  const rax = cx - a.x, ray = cy - a.y;
  let vbx = 0, vby = 0, rbx = 0, rby = 0, pbx = 0, pby = 0;
  if (b) {
    [vbx, vby] = velocityOf(b);
    rbx = cx - b.x; rby = cy - b.y;
    pbx = vbx - b.yawVel * rby; pby = vby + b.yawVel * rbx;
  }
  const rvx = vax - a.yawVel * ray - pbx, rvy = vay + a.yawVel * rax - pby;
  const vn = rvx * nx + rvy * ny;
  if (vn <= 0) return 0;
  const ima = 1 / vehicleMass(a), imb = b ? 1 / vehicleMass(b) : 0;
  let iia = inverseInertia(a), iib = b ? inverseInertia(b) : 0;
  const raN = rax * ny - ray * nx, rbN = rbx * ny - rby * nx;
  const resting = vn < RESTING_SPEED;
  // resting contacts don't spin anything, so bodies pressed together sit still
  if (resting) { iia = 0; iib = 0; }
  const e = resting ? 0 : vn > CRUNCH_SPEED ? 0.12 : COLLISION_RESTITUTION;
  const jn = (1 + e) * vn / (ima + imb + raN * raN * iia + rbN * rbN * iib);
  const tx = -ny, ty = nx;
  const vt = rvx * tx + rvy * ty;
  const raT = rax * ty - ray * tx, rbT = rbx * ty - rby * tx;
  const jt = clamp(-vt / (ima + imb + raT * raT * iia + rbT * rbT * iib), -friction * jn, friction * jn);
  const jx = -jn * nx + jt * tx, jy = -jn * ny + jt * ty;
  setVelocity(a, vax + jx * ima, vay + jy * ima);
  a.yawVel = clamp(a.yawVel + (rax * jy - ray * jx) * iia, -MAX_SPIN, MAX_SPIN);
  if (b) {
    setVelocity(b, vbx - jx * imb, vby - jy * imb);
    b.yawVel = clamp(b.yawVel - (rbx * jy - rby * jx) * iib, -MAX_SPIN, MAX_SPIN);
  }
  return vn;
}

// Fixed ring of recent contacts for effects/audio; readers keep their own
// cursor against `head` and skip what has been overwritten.
const CONTACT_CAP = 64;
export const vehicleContacts = {
  head: 0,
  cap: CONTACT_CAP,
  list: Array.from({ length: CONTACT_CAP }, () => ({ a: null, b: null, x: 0, y: 0, nx: 0, ny: 0, impact: 0, slide: 0 })),
};

function recordContact(a, b, x, y, nx, ny, impact, slide) {
  const c = vehicleContacts.list[vehicleContacts.head % CONTACT_CAP];
  vehicleContacts.head++;
  c.a = a; c.b = b; c.x = x; c.y = y; c.nx = nx; c.ny = ny; c.impact = impact; c.slide = slide;
}

function tangentialSpeed(a, b, nx, ny) {
  let vx = Math.cos(a.angle) * a.speed + a.driftX, vy = Math.sin(a.angle) * a.speed + a.driftY;
  if (b) { vx -= Math.cos(b.angle) * b.speed + b.driftX; vy -= Math.sin(b.angle) * b.speed + b.driftY; }
  return Math.abs(-vx * ny + vy * nx);
}

function applyImpactDamage(v, dmg, playerInvolved, world) {
  if (dmg <= 0 || v.wrecked) return;
  v.health = Math.max(0, v.health - dmg * CRASH_DAMAGE_SCALE);
  if (v.health <= 0) {
    v.wrecked = true;
    v.speed = 0;
    if (playerInvolved) markWreckedByPlayer(v, world);
  }
}

// Feedback hook: an 'impact' particle for effects, and world.lastImpact for
// camera shake when the player is involved. strength is 0..1.
export function reportImpact(world, x, y, closingSpeed, playerInvolved) {
  if (!world) return;
  const strength = clamp(closingSpeed / 14, 0, 1);
  world.particles.push({ kind: 'impact', x, y, strength, until: world.time + 0.4 });
  if (playerInvolved) world.lastImpact = { strength, time: world.time, x, y };
}

// Also the single place that flags v.hitThisFrame/hitX/hitY/hitImpactSpeed
// for the 3D spark effect (reset per call, read by scene3d's render pass),
// including hits queued by resolveVehicleBuildingCollision earlier this frame.
export function resolveVehicleVehicleCollisions(vehicles, world = null) {
  if (world) tickParkedCars(world);
  for (const v of vehicles) {
    v.hitThisFrame = false;
    const p = v.pendingImpact;
    if (!p) continue;
    v.pendingImpact = null;
    reportImpact(world, p.x, p.y, p.speed, v.driver === 'player');
    if (p.speed > HARD_HIT_CLOSING_SPEED) {
      v.hitThisFrame = true; v.hitX = p.x; v.hitY = p.y; v.hitImpactSpeed = p.speed;
    }
  }

  for (let i = 0; i < vehicles.length; i++) {
    const a = vehicles[i];
    if (a.sinking) continue;
    const capA = vehicleCapsule(a);
    for (let j = i + 1; j < vehicles.length; j++) {
      const b = vehicles[j];
      // wrecks are solid, heavy obstacles; two wrecks never interact
      // a boat and a car only ever share x/y with a bridge deck between them
      if (b.sinking || (a.wrecked && b.wrecked) || !a.isBoat !== !b.isBoat) continue;
      // one on the viaduct, the other on the street below (or in the cutting)
      if (Math.abs((a.z || 0) - (b.z || 0)) > 2.5) continue;
      // a waiting cycle being broken: the chosen vehicle slips past its partner
      if (world && ((a.ignoreId === b.id && world.time < a.ignoreUntil) || (b.ignoreId === a.id && world.time < b.ignoreUntil))) continue;
      const reach = a.halfLen + b.halfLen + 0.2;
      const cdx = b.x - a.x, cdy = b.y - a.y;
      if (cdx * cdx + cdy * cdy > reach * reach) continue;
      const capB = vehicleCapsule(b);
      const { p1x, p1y, p2x, p2y, dist2: d2 } = closestPointsBetweenSegments(capA, capB);
      let dist = Math.sqrt(d2);
      const minDist = capA.r + capB.r;
      if (dist >= minDist) continue;
      let nx, ny;
      if (dist < 1e-4) {
        dist = 1e-4;
        const ccLen = Math.hypot(cdx, cdy);
        if (ccLen > 1e-4) { nx = cdx / ccLen; ny = cdy / ccLen; }
        else { nx = 1; ny = 0; }
      } else {
        nx = (p2x - p1x) / dist; ny = (p2y - p1y) / dist;
      }
      const mA = vehicleMass(a) * (a.wrecked ? 3 : 1), mB = vehicleMass(b) * (b.wrecked ? 3 : 1);
      const corr = Math.max(0, minDist - dist - 0.01);
      const shareA = mB / (mA + mB);
      a.x -= nx * corr * shareA; a.y -= ny * corr * shareA;
      b.x += nx * corr * (1 - shareA); b.y += ny * corr * (1 - shareA);

      const hx = (p1x + p2x) / 2, hy = (p1y + p2y) / 2;
      const slide = tangentialSpeed(a, b, nx, ny);
      const relN = contactImpulse(a, b, hx, hy, nx, ny, CONTACT_FRICTION);
      for (const w of [a, b]) if (w.wrecked) { w.speed = 0; w.driftX = 0; w.driftY = 0; }
      if (relN >= IMPACT_EVENT_SPEED || slide > SCRAPE_SPEED) recordContact(a, b, hx, hy, nx, ny, relN, slide);
      if (relN < IMPACT_EVENT_SPEED) continue;
      // Only the player's own driving should ever count as a player wreck.
      const playerInvolved = a.driver === 'player' || b.driver === 'player';
      reportImpact(world, hx, hy, relN, playerInvolved);
      if (relN > HARD_HIT_CLOSING_SPEED) {
        const base = (relN - HARD_HIT_CLOSING_SPEED) * IMPACT_DAMAGE_PER_MPS;
        applyImpactDamage(a, clamp(base * clamp(2 * mB / (mA + mB), 0.25, 1.6), 0, MAX_IMPACT_DAMAGE), playerInvolved, world);
        applyImpactDamage(b, clamp(base * clamp(2 * mA / (mA + mB), 0.25, 1.6), 0, MAX_IMPACT_DAMAGE), playerInvolved, world);
        a.hitThisFrame = true; a.hitX = hx; a.hitY = hy; a.hitImpactSpeed = relN;
        b.hitThisFrame = true; b.hitX = hx; b.hitY = hy; b.hitImpactSpeed = relN;
      }
    }
  }
  if (world) resolvePropCollisions(vehicles, world);
}

// OSM routes some streets and cycleways under station canopies, market
// halls and building passages: where the road's own centerline runs inside
// the footprint, that part of it is not a wall.
function onRoadThroughBuilding(map, x, y, building) {
  for (const r of map.roadsNear(x, y, 6)) {
    if (r.cat === 'foot') continue;
    const half = r.width / 2 - 0.2;
    for (let i = 0; i < r.pts.length - 1; i++) {
      const cp = closestPointOnSegment(x, y, r.pts[i][0], r.pts[i][1], r.pts[i + 1][0], r.pts[i + 1][1]);
      if (cp.dist2 < half * half && pointInPolygon(cp.x, cp.y, building.pts)) return true;
    }
  }
  return false;
}

function collisionProbes(v) {
  const pts = v.halfLen > 3 ? [[v.halfLen, v.halfWid], [v.halfLen, -v.halfWid], [0, -v.halfWid], [-v.halfLen, -v.halfWid], [-v.halfLen, v.halfWid], [0, v.halfWid]] : null;
  if (!pts) return vehicleCorners(v);
  const cos = Math.cos(v.angle), sin = Math.sin(v.angle);
  return pts.map(([lx, ly]) => [v.x + lx * cos - ly * sin, v.y + lx * sin + ly * cos]);
}

const FALL_G = 9.8;
const LAND_DAMAGE_SPEED = 7;

// Keep the wheels on the surface under the car (map.groundHeightAt): up and
// down the ring's ramps, over viaducts, through the cuttings. Driving off an
// edge (or over a crest too fast) goes ballistic until it lands; a hard
// landing damages the car. Pitch follows the surface under the axles.
export function settleVehicleHeight(v, map, dt) {
  if (v.isBoat || v.sinking || !map.groundHeightAt || !dt) return;
  const z = v.z || 0;
  const g = map.groundHeightAt(v.x, v.y, z);
  if (v.airborne) {
    v.vz -= FALL_G * dt;
    v.z = z + v.vz * dt;
    if (v.z <= g) {
      const hit = -v.vz;
      v.z = g;
      v.vz = 0;
      v.airborne = false;
      if (hit > LAND_DAMAGE_SPEED) {
        applyImpactDamage(v, Math.min(60, (hit - LAND_DAMAGE_SPEED) * 7), v.driver === 'player', null);
        v.pendingImpact = { x: v.x, y: v.y, speed: hit * 1.5 };
      }
    }
  } else if (z - g > 0.6 + Math.abs(v.speed) * dt * 0.2) {
    // off the edge: keep the vertical speed the slope gave it
    v.airborne = true;
    v.vz = Math.sin(v.pitch || 0) * v.speed;
  } else {
    v.z = g;
  }
  if (!g && !z && !v.pitch) return;
  const h = Math.min(v.halfLen * 0.75, 2.4);
  const c = Math.cos(v.angle) * h, s = Math.sin(v.angle) * h;
  const zf = map.groundHeightAt(v.x + c, v.y + s, v.z), zr = map.groundHeightAt(v.x - c, v.y - s, v.z);
  const target = v.airborne ? (v.pitch || 0) * 0.98 : Math.atan2(zf - zr, 2 * h);
  v.pitch = (v.pitch || 0) + (Math.max(-0.35, Math.min(0.35, target)) - (v.pitch || 0)) * Math.min(1, dt * 10);
}

// A body corner that has penetrated a footprint is pushed out along the
// nearest wall's normal; the impulse removes only the into-wall velocity
// (plus friction), so a glancing scrape slides along while a head-on stops
// dead, and an off-centre hit swings the car round. dt is unused but kept
// for callers.
export function resolveVehicleBuildingCollision(v, map, dt) {
  if (v.parked && !v.speed && !v.driftX && !v.driftY && !v.yawVel) return false;
  settleVehicleHeight(v, map, dt);
  let hit = false, worst = 0, hx = 0, hy = 0;
  const light = v.isBike || v.isScooter;
  const count = collisionProbes(v).length;
  // up on a viaduct or down in the cutting nothing at street level is in the way
  const offLevel = (v.z || 0) > 4 || (v.z || 0) < -3.5;
  for (let k = 0; k < count; k++) {
    const c = collisionProbes(v)[k];
    for (const b of offLevel ? [] : map.buildingsNear(c[0], c[1], 1)) {
      const [minx, miny, maxx, maxy] = b.bounds;
      if (c[0] < minx || c[0] > maxx || c[1] < miny || c[1] > maxy) continue;
      if (!pointInPolygon(c[0], c[1], b.pts) || onRoadThroughBuilding(map, c[0], c[1], b) || (light && inPassage(map, b, c[0], c[1]))) continue;
      const pts = b.pts;
      let bestDist2 = Infinity, bestX = 0, bestY = 0;
      for (let i = 0; i < pts.length - 1; i++) {
        const cp = closestPointOnSegment(c[0], c[1], pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
        if (cp.dist2 < bestDist2) { bestDist2 = cp.dist2; bestX = cp.x; bestY = cp.y; }
      }
      const d = Math.sqrt(bestDist2) || 0.01;
      const nx = (bestX - c[0]) / d, ny = (bestY - c[1]) / d;
      v.x += nx * (d + 0.03);
      v.y += ny * (d + 0.03);
      const slide = tangentialSpeed(v, null, nx, ny);
      const vn = contactImpulse(v, null, c[0], c[1], -nx, -ny, WALL_FRICTION);
      if (vn >= IMPACT_EVENT_SPEED || slide > SCRAPE_SPEED) recordContact(v, null, bestX, bestY, -nx, -ny, vn, slide);
      if (vn > worst) { worst = vn; hx = bestX; hy = bestY; }
      hit = true;
      break;
    }
    const rc = v.isBoat || v.sinking ? null : (map.elev ? elevWallContact(map.elev, c[0], c[1], v.z || 0) : null);
    if (rc) {
      v.x += rc.nx * rc.depth;
      v.y += rc.ny * rc.depth;
      const slide = tangentialSpeed(v, null, rc.nx, rc.ny);
      const vn = contactImpulse(v, null, c[0], c[1], -rc.nx, -rc.ny, WALL_FRICTION);
      if (vn >= IMPACT_EVENT_SPEED || slide > SCRAPE_SPEED) recordContact(v, null, rc.x, rc.y, -rc.nx, -rc.ny, vn, slide);
      if (vn > worst) { worst = vn; hx = rc.x; hy = rc.y; }
      hit = true;
    }
  }
  if (worst > IMPACT_EVENT_SPEED && worst > ((v.pendingImpact && v.pendingImpact.speed) || 0)) {
    v.pendingImpact = { x: hx, y: hy, speed: worst };
  }
  if (worst > WALL_DAMAGE_SPEED) {
    applyImpactDamage(v, Math.min(MAX_WALL_DAMAGE, (worst - WALL_DAMAGE_SPEED) * 2.5), v.driver === 'player', null);
  }
  return hit;
}

// Lowered level-crossing half barriers are solid for the player's vehicle; a
// hard enough hit snaps the arm off instead (the train is never involved).
const BOOM_SNAP_SPEED = 11;
export function resolveBoomCollisions(v, world) {
  if (v.isBoat || v.sinking || v.wrecked) return;
  const booms = loweredBoomsNear(v.x, v.y, v.halfLen + 8);
  if (!booms.length) return;
  for (const b of booms) {
    const cap = vehicleCapsule(v);
    const q = closestPointsBetweenSegments(cap, { ax: b.ax, ay: b.ay, bx: b.bx, by: b.by });
    const min = cap.r + 0.05;
    if (q.dist2 >= min * min) continue;
    let d = Math.sqrt(q.dist2), nx, ny;
    if (d > 1e-4) { nx = (q.p2x - q.p1x) / d; ny = (q.p2y - q.p1y) / d; }
    else {
      const ex = b.bx - b.ax, ey = b.by - b.ay, el = Math.hypot(ex, ey) || 1;
      nx = -ey / el; ny = ex / el;
      if ((q.p2x - v.x) * nx + (q.p2y - v.y) * ny < 0) { nx = -nx; ny = -ny; }
      d = 0;
    }
    const [vx, vy] = velocityOf(v);
    const closing = vx * nx + vy * ny;
    if (closing > BOOM_SNAP_SPEED) {
      snapBoom(b);
      v.speed *= 0.85;
      applyImpactDamage(v, 6, v.driver === 'player', world);
      reportImpact(world, q.p2x, q.p2y, closing, v.driver === 'player');
      const q2 = world.audioEvents || (world.audioEvents = []);
      q2.push({ kind: 'prop_hit', x: q.p2x, y: q.p2y, strength: 1, material: 'wood' });
      continue;
    }
    v.x -= nx * (min - d);
    v.y -= ny * (min - d);
    const vn = contactImpulse(v, null, q.p2x, q.p2y, nx, ny, WALL_FRICTION);
    if (vn >= IMPACT_EVENT_SPEED) reportImpact(world, q.p2x, q.p2y, vn, v.driver === 'player');
  }
}

// Push a circle (pedestrian, player on foot) out of a vehicle's capsule.
// Returns the corrected position and the push normal, or null if clear.
export function pushCircleOutOfVehicle(x, y, radius, v) {
  const cap = vehicleCapsule(v);
  const cp = closestPointOnSegment(x, y, cap.ax, cap.ay, cap.bx, cap.by);
  const min = cap.r + radius;
  if (cp.dist2 >= min * min) return null;
  const d = Math.sqrt(cp.dist2);
  let nx, ny;
  if (d < 1e-4) { nx = -Math.sin(v.angle); ny = Math.cos(v.angle); }
  else { nx = (x - cp.x) / d; ny = (y - cp.y) / d; }
  return { x: cp.x + nx * min, y: cp.y + ny * min, nx, ny };
}

export function vehicleCorners(v) {
  const hl = v.halfLen, hw = v.halfWid;
  const cos = Math.cos(v.angle), sin = Math.sin(v.angle);
  const pts = [[hl, hw], [hl, -hw], [-hl, -hw], [-hl, hw]];
  return pts.map(([lx, ly]) => [v.x + lx * cos - ly * sin, v.y + lx * sin + ly * cos]);
}


// --- vehicle damage effects (3D) ---------------------------------------
// Three.js particle/billboard effects for report 2 ("meer aandacht voor
// schade"). Local +X/+Z/+Y follow the same convention as combat.js's
// buildSparkBurstMesh3D etc - the integrator (scene3d.js) sets
// mesh.position/rotation every frame, nothing here bakes those in, and
// every mesh below is built fresh per call (own geometries/materials, never
// module-scope-shared) so it's always safe for scene3d.js's usual
// `mesh.traverse(o => o.material && o.material.dispose())` cleanup.

// 1) One-shot spark/debris burst - triggered from v.hitThisFrame (set by
// resolveVehicleVehicleCollisions above) on a hard vehicle-vehicle impact.
const IMPACT_SPARK_LIFETIME = 0.35;

export function buildVehicleImpactSparkMesh3D() {
  const group = new THREE.Group();
  const chips = [];
  const n = 7;
  for (let i = 0; i < n; i++) {
    const fiery = i % 2 === 0;
    const mat = new THREE.MeshBasicMaterial({ color: fiery ? 0xffb347 : 0x2b2b2b, transparent: true });
    const size = fiery ? 0.05 : 0.08;
    const chip = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), mat);
    const a = (i / n) * Math.PI * 2 + Math.random() * 0.6;
    const speed = 1.4 + Math.random() * 1.8;
    chip.userData.vx = Math.cos(a) * speed;
    chip.userData.vz = Math.sin(a) * speed;
    chip.userData.vy = 1.2 + Math.random() * 1.6;
    chip.position.set(0, 0.3, 0);
    group.add(chip);
    chips.push(chip);
  }
  group.userData.chips = chips;
  group.userData.age = 0;
  return group;
}

// Returns true while still alive, false once its lifetime has elapsed - the
// integrator's cue to scene.remove() + dispose + drop it from its cache.
export function updateVehicleImpactSparkMesh3D(mesh, dt) {
  mesh.userData.age += dt;
  const t = mesh.userData.age / IMPACT_SPARK_LIFETIME;
  if (t >= 1) return false;
  for (const chip of mesh.userData.chips) {
    chip.position.x += chip.userData.vx * dt;
    chip.position.z += chip.userData.vz * dt;
    chip.userData.vy -= 9 * dt;
    chip.position.y = Math.max(0, chip.position.y + chip.userData.vy * dt);
    chip.material.opacity = 1 - t;
    chip.scale.setScalar(1 - t * 0.4);
  }
  return true;
}

// 2) Fire+smoke that stays attached to a damaged-but-not-wrecked vehicle.
// Not self-expiring (loops for as long as the integrator keeps calling
// update) - vehicleNeedsFireEffect below is the health-threshold check that
// decides when to attach/detach it.
export const VEHICLE_FIRE_HEALTH_THRESHOLD = 30;

// Wrecks keep burning for a while after the explosion, then only smoke.
export const WRECK_FIRE_S = 25;

export function vehicleNeedsFireEffect(v, time = 0) {
  if (v.wrecked) return !v.isBike && !v.isBoat && !v.sinking && v.wreckedAt !== undefined && time - v.wreckedAt < WRECK_FIRE_S;
  return v.health <= VEHICLE_FIRE_HEALTH_THRESHOLD;
}

export function buildVehicleFireMesh3D() {
  const group = new THREE.Group();

  const flame = new THREE.Mesh(
    new THREE.ConeGeometry(0.18, 0.55, 6),
    new THREE.MeshBasicMaterial({ color: 0xff7020, transparent: true, opacity: 0.85 })
  );
  flame.position.y = 0.28;
  group.add(flame);
  group.userData.flame = flame;

  const smokePuffs = [];
  for (let i = 0; i < 4; i++) {
    const puff = new THREE.Mesh(
      new THREE.SphereGeometry(0.16 + i * 0.03, 6, 5),
      new THREE.MeshBasicMaterial({ color: 0x3a3a3a, transparent: true, opacity: 0.5 })
    );
    puff.userData.riseSpeed = 0.55 + i * 0.12;
    puff.userData.phase = i * 0.6;
    group.add(puff);
    smokePuffs.push(puff);
  }
  group.userData.smokePuffs = smokePuffs;
  group.userData.age = 0;
  return group;
}

export function updateVehicleFireMesh3D(mesh, dt) {
  mesh.userData.age += dt;
  const t = mesh.userData.age;

  const flame = mesh.userData.flame;
  const flick = 0.85 + Math.sin(t * 18) * 0.1 + Math.random() * 0.05;
  flame.scale.set(flick, 0.9 + Math.sin(t * 22) * 0.15, flick);

  const cycle = 1.6;
  for (const puff of mesh.userData.smokePuffs) {
    const local = (t + puff.userData.phase) % cycle;
    const p = local / cycle;
    puff.position.y = 0.3 + p * 1.8 * puff.userData.riseSpeed;
    puff.position.x = Math.sin(t * 1.3 + puff.userData.phase) * 0.08;
    puff.material.opacity = 0.5 * (1 - p);
    puff.scale.setScalar(0.6 + p * 0.9);
  }
}

// 3) One-shot explosion (particle burst + brief bright flash) - fired
// exactly once per vehicle the first frame v.wrecked flips true.
// vehicleJustWrecked owns the "exactly once" guard via v._exploded, since
// nothing else on the vehicle tracks that transition.
export function vehicleJustWrecked(v) {
  if (v.wrecked && !v._exploded) {
    v._exploded = true;
    return true;
  }
  return false;
}

const EXPLOSION_LIFETIME = 0.65;

export function buildVehicleExplosionMesh3D() {
  const group = new THREE.Group();

  const flash = new THREE.Mesh(
    new THREE.SphereGeometry(0.9, 10, 8),
    new THREE.MeshBasicMaterial({ color: 0xfff2c0, transparent: true, opacity: 1 })
  );
  group.add(flash);
  group.userData.flash = flash;

  const chips = [];
  const n = 14;
  for (let i = 0; i < n; i++) {
    const fiery = i % 2 === 0;
    const mat = new THREE.MeshBasicMaterial({ color: fiery ? 0xff6a1a : 0x2a2a2a, transparent: true });
    const chip = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 0.14), mat);
    const a = (i / n) * Math.PI * 2 + Math.random() * 0.4;
    const elevation = 0.6 + Math.random() * 0.8;
    const speed = 3 + Math.random() * 3.5;
    chip.userData.vx = Math.cos(a) * speed;
    chip.userData.vz = Math.sin(a) * speed;
    chip.userData.vy = elevation * speed;
    group.add(chip);
    chips.push(chip);
  }
  group.userData.chips = chips;
  group.userData.age = 0;
  return group;
}

// Returns true while still alive, false once its lifetime has elapsed - same
// "done" contract as updateVehicleImpactSparkMesh3D.
export function updateVehicleExplosionMesh3D(mesh, dt) {
  mesh.userData.age += dt;
  const t = mesh.userData.age / EXPLOSION_LIFETIME;
  if (t >= 1) return false;

  const flash = mesh.userData.flash;
  flash.material.opacity = Math.max(0, 1 - t * 3.2);
  flash.scale.setScalar(1 + t * 1.8);

  for (const chip of mesh.userData.chips) {
    chip.position.x += chip.userData.vx * dt;
    chip.position.z += chip.userData.vz * dt;
    chip.userData.vy -= 10 * dt;
    chip.position.y = Math.max(0, chip.position.y + chip.userData.vy * dt);
    chip.material.opacity = 1 - t;
  }
  return true;
}

// A vehicle whose centre leaves the quay over open water flies on with its
// momentum, drops to the surface (wrecked on impact), floats a moment and
// sinks. v.sinking = { phase, z, pitch, roll, ... } drives the 3D mesh.
const SINK_GRAVITY = 9.8;
const FLOAT_TIME = 1.6;
const SINK_TIME = 3.6;
const SUNK_Z = WATER_Y - 2.8;
const sinkingVehicles = new Set();
let sinkTickAt = -1;

export function checkVehicleWater(v, map, world) {
  tickSinkingVehicles(world);
  if (v.sinking && !v.wrecked) { v.x = v.sinking.x; v.y = v.sinking.y; v.speed = 0; return false; }
  if (v.isBoat || v.wrecked || v.sinking || (v.parked && !v.speed)) return false;
  if (!inWaterPoly(map, v.x, v.y) || map.isOnBridge(v.x, v.y)) return false;
  // over the canal on a viaduct, or under it through the aqueduct
  const z = v.z || 0;
  if (v.airborne || z > 1.5 || (z < -3 && map.coveredAt && map.coveredAt(v.x, v.y))) return false;
  startVehicleFall(v, world);
  return true;
}

function startVehicleFall(v, world) {
  const pv = world.player.inVehicle;
  const byPlayer = v.driver === 'player' || (pv && pv !== v && Math.hypot(pv.x - v.x, pv.y - v.y) < 7 && Math.abs(pv.speed) > 3);
  v.sinking = {
    phase: 'fall', t: 0, x: v.x, y: v.y, z: 0, vz: 0, pitch: 0, roll: 0,
    vx: Math.cos(v.angle) * v.speed + v.driftX,
    vy: Math.sin(v.angle) * v.speed + v.driftY,
    dir: v.speed < 0 ? 1 : -1,
    small: !!(v.isBike || v.isScooter),
    byPlayer, bubbleAt: 0, seed: Math.random() * 6,
  };
  v.speed = 0; v.driftX = 0; v.driftY = 0; v.yawVel = 0;
  v.road = null; v.throttle = 0; v.horn = false; v.handbrake = false;
  sinkingVehicles.add(v);
}

// Runs once per game frame (deduped on world.time) from player.update and
// checkVehicleWater, since main.js stops calling the latter once wrecked.
export function tickSinkingVehicles(world) {
  if (sinkTickAt === world.time) return;
  const dt = sinkTickAt < 0 ? 0 : clamp(world.time - sinkTickAt, 0, 0.1);
  sinkTickAt = world.time;
  if (!dt || !sinkingVehicles.size) return;
  for (const v of sinkingVehicles) {
    if (!world.vehicles.includes(v)) { sinkingVehicles.delete(v); v.sinking = null; continue; }
    updateSinking(v, dt, world);
  }
}

function driftOnWater(v, s, dt, map) {
  const nx = v.x + s.vx * dt, ny = v.y + s.vy * dt;
  if (inWaterPoly(map, nx, ny)) { v.x = nx; v.y = ny; } else { s.vx = 0; s.vy = 0; }
}

function updateSinking(v, dt, world) {
  const s = v.sinking;
  const map = world.map;
  s.t += dt;
  v.speed = 0;
  const floatZ = WATER_Y - (s.small ? 0.35 : 0.55);

  if (s.phase === 'fall') {
    s.vz -= SINK_GRAVITY * dt;
    s.z += s.vz * dt;
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    v.x = s.x; v.y = s.y;
    s.pitch = clamp(s.pitch + s.dir * dt * 1.8, -0.6, 0.6);
    if (s.z > floatZ) return;
    s.z = floatZ;
    s.phase = 'float';
    s.t = 0;
    s.vx *= 0.45; s.vy *= 0.45;
    v.wrecked = true;
    v._exploded = true;
    v.health = 0;
    if (s.byPlayer) markWreckedByPlayer(v, world);
    const fx = Math.cos(v.angle) * (v.halfLen || 1) * 0.6, fy = Math.sin(v.angle) * (v.halfLen || 1) * 0.6;
    world.particles.push({ kind: 'splash', x: v.x, y: v.y, until: world.time + SPLASH_LIFETIME });
    if (!s.small) world.particles.push({ kind: 'splash', x: v.x + fx, y: v.y + fy, until: world.time + SPLASH_LIFETIME });
    if (v.driver === 'player') {
      if (s.small) { world.player.ejectIntoWater(v, world); world.addMessage('Nat geworden!', 3); }
      else world.addMessage('Plons! Je auto zinkt - E om uit te stappen', 3.5);
      world.health = Math.max(0, world.health - (s.small ? 5 : 10));
    }
    return;
  }

  s.vx *= Math.exp(-2.2 * dt);
  s.vy *= Math.exp(-2.2 * dt);
  driftOnWater(v, s, dt, map);
  const bob = Math.sin(s.t * 2.6 + s.seed) * 0.05;

  if (s.phase === 'float') {
    const k = Math.min(1, s.t / FLOAT_TIME);
    s.z = floatZ + bob - k * 0.15;
    s.pitch += ((s.dir * 0.12) - s.pitch) * Math.min(1, dt * 3);
    s.roll = Math.sin(s.t * 1.9 + s.seed) * 0.05;
    if (s.t >= FLOAT_TIME) { s.phase = 'sink'; s.t = 0; s.startZ = s.z; }
    return;
  }

  const k = Math.min(1, s.t / (s.small ? SINK_TIME * 0.5 : SINK_TIME));
  s.z = s.startZ + (SUNK_Z - s.startZ) * k * k + bob * (1 - k);
  s.pitch += ((s.dir * 0.45) - s.pitch) * Math.min(1, dt * 1.5);
  s.roll = Math.sin(s.t * 1.3 + s.seed) * 0.08 * (1 - k);
  if (world.time >= s.bubbleAt && k < 0.9) {
    s.bubbleAt = world.time + 0.9 + Math.random() * 0.5;
    world.particles.push({ kind: 'splash', x: v.x + (Math.random() - 0.5), y: v.y + (Math.random() - 0.5), until: world.time + SPLASH_LIFETIME });
  }
  if (v.driver === 'player' && s.z < WATER_Y - 1.4) {
    world.player.ejectIntoWater(v, world);
    world.addMessage('Je auto is gezonken!', 3);
  }
  if (k < 1) return;
  sinkingVehicles.delete(v);
  v.sinking = null;
  v.sunk = true;
  if (v.driver === 'player') world.player.ejectIntoWater(v, world);
  if (!v.isHeroCar && !v.missionCar) {
    const i = world.vehicles.indexOf(v);
    if (i >= 0) world.vehicles.splice(i, 1);
  }
}

// Splash for the 'splash' particles checkVehicleWater pushes (expired by
// combat.js's particle prune): an expanding ring on the water plus a few
// ballistic droplets. The caller sets the group's position at water level.
export const SPLASH_LIFETIME = 1.1;
const SPLASH_DROPS = 7;
const SPLASH_WATER_COLOR = 0xd2e2ea;

export function buildSplashMesh3D() {
  const group = new THREE.Group();
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.82, 1, 28),
    new THREE.MeshBasicMaterial({
      color: SPLASH_WATER_COLOR, transparent: true, opacity: 0.8, depthWrite: false, side: THREE.DoubleSide,
      polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -16,
    }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.03;
  group.add(ring);
  const dropGeo = new THREE.IcosahedronGeometry(0.09, 0);
  const dropMat = new THREE.MeshStandardMaterial({ color: SPLASH_WATER_COLOR, roughness: 0.3, flatShading: true, transparent: true });
  const drops = [];
  for (let i = 0; i < SPLASH_DROPS; i++) {
    const drop = new THREE.Mesh(dropGeo, dropMat);
    const a = (i / SPLASH_DROPS) * Math.PI * 2 + Math.random() * 0.6;
    const out = 1.2 + Math.random() * 1.4;
    drop.userData.vx = Math.cos(a) * out;
    drop.userData.vz = Math.sin(a) * out;
    drop.userData.vy = 3.2 + Math.random() * 2.2;
    group.add(drop);
    drops.push(drop);
  }
  group.userData.ring = ring;
  group.userData.drops = drops;
  return group;
}

export function updateSplashMesh3D(mesh, age) {
  const t = clamp(age / SPLASH_LIFETIME, 0, 1);
  const ring = mesh.userData.ring;
  ring.scale.setScalar(lerp(0.3, 2.3, 1 - (1 - t) * (1 - t)));
  ring.material.opacity = 0.8 * (1 - t);
  for (const d of mesh.userData.drops) {
    d.position.set(d.userData.vx * age, Math.max(0, d.userData.vy * age - 4.9 * age * age), d.userData.vz * age);
    d.visible = d.position.y > 0 || age < 0.1;
  }
  mesh.userData.drops[0].material.opacity = 1 - t * 0.6;
}

export { MODELS };
