import { minAfstand } from './coopfoci.js';
import { project as projectOnLine, stepRunner, pointAt as linePointAt } from './busroutes.js';
import { assistDamage } from './assistlive.js';
import { closestPointOnSegment, normalizeAngle, clamp, lerp, pointInPolygon, inMapWater, WATER_Y, keepBoatOffShore } from './util.js';
import { waterClearance } from './waterindex.js';
import { shallowWater, waterPolyAt, BRIDGE_DRY } from './waterlevels.js';
import { trafficSignalsNear, trafficLightPhaseMove } from './trafficlights.js';
import { resolvePropCollisions } from './breakables.js';
import { shardPuncture } from './roadshards.js';
import { CRASH_DAMAGE_SCALE, vehicleContacts, recordContact, reportImpact } from './vehicleimpact.js';
export { CRASH_DAMAGE_SCALE, vehicleContacts, recordContact, reportImpact } from './vehicleimpact.js';
import { markWreckedByPlayer, syncPlayerWrecks, disableVehicle, restWreck } from './vehiclewreck.js';
export { markWreckedByPlayer, syncPlayerWrecks, disableVehicle, restWreck } from './vehiclewreck.js';
// canUseRoad woont bij de verkeers-AI (die beslist welke weg een voertuig mag gebruiken) en wordt
// door de spawnteller hier ook gebruikt; vandaar de import naast de host-wissel.
import { setTrafficHost, canUseRoad } from './vehicle/traffic.js';
import { setBusPopHost, manageBusPopulation, setBusLines, getBusLines, setLiveBussen, busSpawnStats, busSpawnPoint, getLiveBussen } from './vehicle/buspop.js';
export { manageBusPopulation, setBusLines, getBusLines, setLiveBussen, busSpawnStats };
import { playerTune, playerTopSpeed, speedCap, coastDrag, lateralGrip, maxYawRate, maxCurvature } from './vehicle/tuning.js';
export { playerTopSpeed, speedCap, maxYawRate, maxCurvature };
import { pushBusTrail, sampleBusTrail, stepBusTrailerAngle, busTrailerPose, TRAILER_MAX_ANGLE } from './vehicle/trailer.js';
export { sampleBusTrail, stepBusTrailerAngle, busTrailerPose, TRAILER_MAX_ANGLE };
export { updateTrafficAI } from './vehicle/traffic.js';
import { setBoatHost } from './vehicle/boatwater.js';
import { ENTER_REACH, distToVehicleBody, canEnterVehicle, findEnterableVehicle, findNearestVehicle } from './vehicle/enter.js';
export { ENTER_REACH, distToVehicleBody, canEnterVehicle, findEnterableVehicle, findNearestVehicle };
export { spawnBoatOnWater, spawnPoliceBoatOnWater, bargesPerWater, manageBoatPopulation, isShip, setVaarNet, getVaarNet, TOUR_TRIP_MAX, boatInTheWay, BOAT_SWEEP_DIST, updateBoatAI } from './vehicle/boatwater.js';
import { kiesWrakkenVoorOpruimen } from './wrakopruim.js';
import { inPassage } from './collision.js';
import { elevWallContact } from './elevation.js';
import { bridgeSpeedLimit, loweredBridgeBoomsNear } from './movablebridges.js';
import { zebraSpeedLimit, sirenYield } from './trafficyield.js';
import { lockGateStop } from './sluizen.js';
import { countrySurface, countryWeight, edgeDistance } from './countryfield.js';
import { countryWater } from './countryedge.js';
import { pushOutOfPlan, onFarmPaving, planExtraSolids } from './countryplan.js';
import { pushOutOfTrunks } from './countrywalls.js';
import { countryRailsNear, pushOutOfRails } from './countryrails.js';
import { roadPriority, junctionArm } from './junctions.js';
import { pickTrafficCar, carModel, applyFleetFlags, pickBikeVariant, wijkProfileAt, roadCapacityTarget, roadLengthWithin } from './trafficfleet.js';
import { newsVanWanted, distToCentre, hourOf } from './streetlifedata.js';
import { vehicleHooks } from './vehiclehooks.js';
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { MODS } from './cheatmods.js';
import { laneLayout } from './lanes.js';
import { profileFor, createGearbox, stepGearbox } from './gearbox.js';
import { loadTuning, tuningEffects } from './tuningplan.js';
import { KEYS } from './storagekeys.js';
import { slipAngle } from './drift.js';
import { pickMotor, motorRoadAllowed, motorTarget } from './motortraffic.js';
import { FLAGS } from './devflags.js';
import { verkeerOpties } from './simlagen.js';
import { SMOKE_HEALTH, kapRookt } from './vehicledamage.js';
import { rideFiets, rideMotorbike } from './vehicle/twowheeler.js';
import { hoofdspeler } from './players.js';
export { MOTORBIKE_MODELS, GEARED_MOPED_MODEL, MOPED_LEGAL_SPEED } from './motomodels.js';

// every traffic model, for warming their meshes before they first spawn
export const TRAFFIC_MODELS = () => [...MODELS, ...BUS_MODELS, ...SCOOTER_MODELS, ...FATBIKE_MODELS, ...REGULAR_BIKE_MODELS];

const MODELS = [
  // Dutch daily traffic skews heavily toward grey/black/white/silver compacts
  // and hatchbacks, so those are weighted more heavily than the odd flash of
  // color rather than an even split across a bright arcade palette.
  { name: 'hatch', len: 3.8, wid: 1.7, maxSpeed: 42, accel: 9, brake: 23, turnRate: 3.0, color: '#c7c9cc' },
  { name: 'hatch', len: 3.8, wid: 1.7, maxSpeed: 42, accel: 9, brake: 23, turnRate: 3.0, color: '#23262a' },
  { name: 'hatch', len: 3.8, wid: 1.7, maxSpeed: 42, accel: 9, brake: 23, turnRate: 3.0, color: '#e8e6e0' },
  { name: 'sedan', len: 4.3, wid: 1.8, maxSpeed: 50, accel: 10, brake: 24, turnRate: 2.6, color: '#4a4d52' },
  { name: 'sedan', len: 4.3, wid: 1.8, maxSpeed: 50, accel: 10, brake: 24, turnRate: 2.6, color: '#2f3a52' },
  { name: 'sedan', len: 4.3, wid: 1.8, maxSpeed: 50, accel: 10, brake: 24, turnRate: 2.6, color: '#7a1f1f' },
  { name: 'wagon', len: 4.5, wid: 1.8, maxSpeed: 47, accel: 9, brake: 23, turnRate: 2.5, color: '#2e4a34' },
  { name: 'van', len: 5.0, wid: 2.0, maxSpeed: 38, accel: 7, brake: 19, turnRate: 2.0, color: '#d9d9d9' },
  { name: 'van', len: 5.0, wid: 2.0, maxSpeed: 38, accel: 7, brake: 19, turnRate: 2.0, color: '#c9541e' },
  { name: 'sport', len: 4.1, wid: 1.85, maxSpeed: 64, accel: 14, brake: 30, turnRate: 3.2, color: '#8a1414' },
];

// Signature red Ford Escort - the game's hero car, spawned once via
// spawnHeroCarNear rather than picked from MODELS by the regular traffic RNG.
// Ommeland farm vehicles (parkedcars.js farm yards, countrylife.js):
// a tractor (slow, pulls hard off the line) and a quad (nimble off-road)
export const TRACTOR_MODEL = { name: 'tractor', len: 4.3, wid: 2.3, maxSpeed: 11, accel: 6.5, brake: 11, turnRate: 1.9, color: '#3f7d3a', offroad: 0.9 };
export const QUAD_MODEL = { name: 'quad', len: 2.1, wid: 1.2, maxSpeed: 17, accel: 9, brake: 14, turnRate: 3.2, color: '#b8322a', offroad: 1 };
// De machines van de eigen boerderij (#415, machines.js): twee trekkers (zelfde bouw als de bijbaantrekker), de Korenwolf maaidorser en de Laadkabouter.
export const MACHINE_MODELLEN = {
  'trekker-klein': { ...TRACTOR_MODEL, len: 3.9, wid: 2.1, maxSpeed: 9, color: '#c8782a' },
  'trekker-groot': { ...TRACTOR_MODEL, maxSpeed: 11, color: '#2f6fa8' },
  maaidorser: { name: 'maaidorser', len: 7.4, wid: 3.3, maxSpeed: 7, accel: 3.2, brake: 7, turnRate: 1.0, color: '#c43d2b', offroad: 0.9 },
  laadmachine: { name: 'laadmachine', len: 3.4, wid: 1.8, maxSpeed: 7.5, accel: 5, brake: 9, turnRate: 2.2, color: '#e0a92b', offroad: 0.95 },
};
export const POLICE_MODEL ={ name: 'police', len: 4.3, wid: 1.8, maxSpeed: 55, accel: 11, brake: 20, turnRate: 2.8, color: '#1c1c1c' };
export const HERO_CAR_MODEL = { name: 'escort', len: 4.0, wid: 1.65, maxSpeed: 50, accel: 8, brake: 25, turnRate: 3.4, color: '#a11f1f' };

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
// Snorscooter: the parked mopeds of the street clutter, rideable (rideprops.js).
export const MOPED_MODEL = { name: 'scooter', moped: true, len: 1.7, wid: 0.62, maxSpeed: 12.5, accel: 4.6, brake: 7, turnRate: 4.2, color: '#e6e1d6', rider: '#2f5c8a' };

export function makeTwoWheeler(kind, x, y, angle, tint = null, rng = Math.random) {
  const scooter = kind === 'scooter' || kind === 'moped';
  const base = kind === 'moped' ? MOPED_MODEL : scooter ? pickScooterModel(rng) : REGULAR_BIKE_MODELS[Math.floor(rng() * REGULAR_BIKE_MODELS.length)];
  const model = tint == null ? base : { ...base, color: '#' + tint.toString(16).padStart(6, '0') };
  const v = new Vehicle(x, y, angle, model);
  v.isBike = !scooter;
  v.isScooter = scooter;
  return v;
}

// Regional OV city bus - teal/blue livery, roomier turning circle, only
// spawned on the bigger through-roads (see manageBusPopulation).
// Qbuzz runs the Groningen-Drenthe concession: deep navy body with a cyan
// accent band, not a generic tour-bus livery.
// An 18 m gelede bus: len is the 11.2 m front unit (the physics body),
// trailer the 6.8 m rear unit that swings behind it (busTrailerPose).
export const BUS_TRAILER = 6.8;
const BUS_MODELS = [
  { name: 'bus', len: 11.2, wid: 2.55, trailer: BUS_TRAILER, maxSpeed: 20, accel: 4.5, brake: 12, turnRate: 1.1, color: '#132a44', stripe: '#3fc6d4', accent: '#e8e6de' },
  { name: 'bus', len: 11.2, wid: 2.55, trailer: BUS_TRAILER, maxSpeed: 20, accel: 4.5, brake: 12, turnRate: 1.1, color: '#0f3a4a', stripe: '#3fc6d4', accent: '#e8e6de' },
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
    this.passenger = null; // 'companion' | null - the non-driving Tammo/Tessa riding along
    this.horn = false;

    // Residual world-space sideways velocity (m/s) left over from a
    // resolveVehicleVehicleCollisions impulse - see applyControls below.
    // Zero outside of a collision's immediate aftermath.
    this.driftX = 0;
    this.driftY = 0;
    this.roll = 0;
    this.arcadeSlide = false;
    this.slipAngle = 0; // rad between heading and travel direction (player cars, drift.js)
    this.yawVel = 0; // rad/s of spin from an off-centre impact, decays in applyControls

    // traffic AI path state: current segment runs road.pts[segIdx] ->
    // road.pts[segIdx + dir]; plan holds the upcoming junction choices
    this.road = null;
    this.dir = 1;
    this.segIdx = 0;
    this.plan = [];
    this.isPolice = false;
    // een bus herkent zich aan zijn model; spawners en winkel zetten de vlag daarna zelf nog
    this.isBus = !!model && (model.name === 'bus' || model.name === 'midibus');
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
    // een lekke band (v.flat): trager en de auto trekt scheef
    const top = (tune ? tune.top : m.maxSpeed) * (this.flat ? FLAT_TOP_FACTOR : 1);
    // wet road / puddle grip (0..1), set each frame for the player's vehicle
    const grip = isPlayer ? Math.min(1, (this.gripK ?? 1) * (this.tuning ? this.tuning.grip : 1)) : 1;
    const brakeMax = (tune ? tune.brake : m.brake) * (0.4 + 0.6 * grip);
    if (this.disabled) throttle = 0;
    const brake = brakeInput === true ? 1 : brakeInput || 0;
    const absSpeed = Math.abs(this.speed);
    const handbrakeDrift = isPlayer && !this.isBoat && !this.isBus && brake > 0 && absSpeed > 9 && Math.abs(steerInput) > 0.3;
    const against = throttle !== 0 && absSpeed > 0.3 && Math.sign(throttle) !== Math.sign(this.speed);
    if (isPlayer) this.pedalT = against ? (this.pedalT || 0) + dt : 0;
    // Braking to a stop with S held pauses a beat before it starts reversing.
    if (isPlayer && this.holdStill > 0) {
      if (Math.sign(throttle) !== this.holdSign) this.holdStill = 0;
      else { this.holdStill -= dt; throttle = 0; }
    }
    // gearbox (gearbox.js): always tracked for the player's geared vehicles so the HUD and the
    // engine sound agree; only manual modes change the driving (torque curve, limiter, engine braking)
    let gb = null, manual = false;
    if (isPlayer) {
      if (this.gb === undefined) { const pid = profileFor(this); this.gb = pid ? createGearbox(pid) : null; }
      gb = this.gb;
      if (gb) {
        stepGearbox(gb, { speed: this.speed, top, throttle, mode: this.shiftMode || 'auto', clutchIn: !!this.clutchIn }, dt);
        manual = gb.mode !== 'auto';
      }
    }
    let decel = brake * brakeMax * (handbrakeDrift ? 0.32 : 1);
    if (against) {
      // player pedal bites at 60% and builds to full within ~0.25 s (a bus's air brakes take longer)
      const pedal = isPlayer ? Math.min(1, 0.6 + this.pedalT * (this.isBus ? 1.3 : 1.6)) : 0.85;
      decel = Math.max(decel, brakeMax * pedal * Math.abs(throttle));
    }
    if (decel > 0) {
      const dec = decel * dt;
      if (isPlayer && against && absSpeed <= dec) { this.holdStill = 0.3; this.holdSign = Math.sign(throttle); }
      this.speed = this.speed > 0 ? Math.max(0, this.speed - dec) : Math.min(0, this.speed + dec);
    } else if (throttle !== 0 && !(manual && throttle > 0 && gb.torque <= 0)) {
      const lim = throttle > 0 ? top : top * REVERSE_FACTOR;
      const headroom = lim > 0 ? clamp(1 - absSpeed / lim, 0, 1) : 0;
      // player cars pull evenly through the gears (0-100 in ~6-8 s) and only run out of breath near top speed
      const playerCar = isPlayer && !this.isBike && !this.isScooter && !this.isBoat && !this.isBus;
      const floor = playerCar ? 0.2 : isPlayer && this.isBus ? 0.12 : isPlayer && this.sailTop != null ? 0.6 : 0.3;
      this.speed += throttle * (tune ? tune.accel : m.accel) * (floor + (1 - floor) * (playerCar ? Math.sqrt(headroom) : headroom)) * (manual && throttle > 0 ? gb.torque : 1) * dt;
    } else {
      const drag = (coastDrag(this, isPlayer, absSpeed) + (manual ? gb.engineBrake : 0)) * dt;
      if (this.speed > 0) this.speed = Math.max(0, this.speed - drag);
      else this.speed = Math.min(0, this.speed + drag);
    }
    // a sail that loses the wind lets the hull glide on rather than stop dead
    const sailing = isPlayer && this.isBoat && this.sailTop != null;
    this.speed = clamp(this.speed, -top * REVERSE_FACTOR, sailing ? Math.max(top, absSpeed - SAIL_GLIDE_DECEL * dt) : top);

    const pull = isPlayer && this.flat ? FLAT_PULL * (this.id % 2 ? 1 : -1) * Math.min(1, absSpeed / 10) : 0;
    const target = clamp(steerInput + pull, -1, 1);
    if (isPlayer) {
      const returning = Math.abs(target) < Math.abs(this.steer) || target * this.steer < 0;
      const rate = (returning ? PLAYER_STEER_RETURN : PLAYER_STEER_RATE) * (this.isBus ? 0.7 : 1) * dt;
      this.steer += clamp(target - this.steer, -rate, rate);
    } else {
      this.steer = target;
    }
    let yaw = this.steer * maxYawRate(this) * (handbrakeDrift ? 1.6 : 1) * (this.speed < 0 ? -1 : 1);
    // arcade drifting for cars (setting driftAssist), only for a slide started with the full
    // handbrake (Space; an analog brake pedal in tests and AI stays as it was): lifting off or
    // braking in the slide shifts the weight forward and kicks the tail out further; the assist
    // then counter-steers towards where the car is going so the slide stays catchable, and
    // throttle keeps it alive
    let driftKeep = 1;
    const fullHandbrake = handbrakeDrift && brake >= 1;
    if (isPlayer && !this.isBoat && !this.isBus && !this.isBike && !this.isScooter && !this.isHeli && !m.motorbike) {
      const slip = this.speed > 2 ? slipAngle(this.angle, this.speed, this.driftX, this.driftY) : 0;
      this.slipAngle = slip;
      if (fullHandbrake) this.arcadeSlide = true;
      else if (this.arcadeSlide && (Math.abs(slip) < 0.08 || absSpeed < 5)) this.arcadeSlide = false;
      if (this.arcadeSlide && Math.abs(slip) > 0.12 && absSpeed > 8) {
        const assist = this.driftAssist !== false;
        if (this.prevThrottle > 0 && throttle <= 0 && grip >= 0.97) {
          this.yawVel = clamp(this.yawVel - Math.sign(slip) * (assist ? 0.35 : 0.9), -MAX_SPIN, MAX_SPIN);
        }
        if (assist) {
          const over = Math.max(0, Math.abs(slip) - 0.55);
          yaw += clamp(Math.sign(slip) * (Math.abs(slip) * 0.5 + over * 5), -2.5, 2.5) * Math.min(1, absSpeed / 14);
        }
        if (throttle > 0 && grip >= 0.97) driftKeep = (assist ? 0.25 : 0.6) * (this.upgrades && this.upgrades.includes('sperdiff') ? 0.5 : 1);
      }
      this.prevThrottle = throttle;
    }
    const oldAngle = this.angle;
    this.angle = normalizeAngle(this.angle + (yaw + this.yawVel) * dt);
    if (this.yawVel) {
      this.yawVel *= Math.exp(-SPIN_DECAY_RATE * dt);
      if (Math.abs(this.yawVel) < 0.02) this.yawVel = 0;
    }

    // Past the grip limit (handbrake, flat-out with full lock, or a wet road)
    // part of the old velocity carries on sideways - a recoverable slide.
    if (isPlayer) {
      let slip = this.isBoat ? 0.72 : handbrakeDrift ? (fullHandbrake ? (this.driftAssist !== false ? 0.3 : 0.45) : 0.5) : absSpeed > top * 0.8 && Math.abs(this.steer) > 0.6 ? 0.85 : 1;
      // power slide: on the throttle in a slide with the wheel turned, the tail keeps coming round
      if (slip === 1 && this.arcadeSlide && throttle > 0 && absSpeed > 10 && grip >= 0.97 && Math.abs(this.slipAngle) > 0.15 && Math.abs(this.steer) > 0.2) slip = this.driftAssist !== false ? 0.5 : 0.7;
      const hardBrake = brake > 0.5 || against;
      if (grip < 0.97 && !this.isBoat && absSpeed > 7 && (Math.abs(this.steer) > 0.35 || hardBrake)) {
        slip = Math.min(slip, 0.35 + 0.65 * grip);
        // locking up in standing water: the car starts to rotate on its own
        if (hardBrake && grip < 0.8) {
          if (!this.aquaSign) this.aquaSign = Math.sign(this.steer) || (Math.random() < 0.5 ? -1 : 1);
          this.yawVel = clamp(this.yawVel + this.aquaSign * (0.8 - grip) * 2.2 * Math.min(1, absSpeed / 20) * dt, -MAX_SPIN, MAX_SPIN);
        } else this.aquaSign = 0;
      } else this.aquaSign = 0;
      if (slip < 1) {
        const k = (1 - slip) * this.speed;
        this.driftX = clamp(this.driftX + k * (Math.cos(oldAngle) - Math.cos(this.angle)), -MAX_DRIFT_SPEED, MAX_DRIFT_SPEED);
        this.driftY = clamp(this.driftY + k * (Math.sin(oldAngle) - Math.sin(this.angle)), -MAX_DRIFT_SPEED, MAX_DRIFT_SPEED);
      }
    }

    if (isPlayer && this.isBike && !m.motorbike) rideFiets(this, dt, throttle, top, brake, normalizeAngle(this.angle - oldAngle) / (dt || 1));
    if (isPlayer && m.motorbike) rideMotorbike(this, dt, throttle, gb, top, absSpeed, normalizeAngle(this.angle - oldAngle) / (dt || 1));

    this.x += Math.cos(this.angle) * this.speed * dt;
    this.y += Math.sin(this.angle) * this.speed * dt;

    // Sideways velocity left by a collision impulse or a slide rides along
    // independently of the forward speed/angle model and decays away.
    if (this.driftX || this.driftY) {
      this.x += this.driftX * dt;
      this.y += this.driftY * dt;
      const wetSlide = isPlayer && grip < 0.97;
      const rate = (handbrakeDrift || wetSlide ? SLIDE_DECAY_RATE * (wetSlide ? 0.5 + 0.5 * grip : 1) : isPlayer && this.isBoat ? BOAT_SLIDE_DECAY_RATE : DRIFT_DECAY_RATE) * driftKeep;
      const decay = Math.exp(-rate * dt);
      this.driftX *= decay;
      this.driftY *= decay;
      if (Math.hypot(this.driftX, this.driftY) < 0.03) { this.driftX = 0; this.driftY = 0; }
    }

    // de aanhangerhoek loopt mee in hetzelfde ritme als de trail: elke stap
    // waarin de bus beweegt of stilstaat, zodat hij niet uit de pas raakt
    if (this.isBus) { pushBusTrail(this); stepBusTrailerAngle(this, dt); }
    if (groundMap && !this.isBoat && !this.isHeli && !this.sinking && !this.wrecked && !this.countryDrive && dt > 0) offroadDrag(this, dt);
  }
}

// Off the roads out in the Ommeland, for every driver alike: meadow rolls
// slower (gently: at most 2.5 m/s2 of drag down to ~3/4 of top speed; a quad or tractor hardly notices) with a
// little yaw wobble that grows with speed, a maar or other wide water painted
// on the ground is waded through at walking pace, a ditch is a dip that costs
// some speed. Deep water sinks the vehicle (checkVehicleWater).
let groundMap = null;
export function setGroundMap(map) {
  groundMap = map;
}
const GROUND_SAMPLE_M = 0.6;
const GRASS_DRAG = 2.5;
const WADE_DRAG = 9;
const WADE_TOP = 2.5;
function offroadDrag(v, dt) {
  if (v._gx === undefined || Math.abs(v.x - v._gx) + Math.abs(v.y - v._gy) > GROUND_SAMPLE_M) {
    v._gx = v.x; v._gy = v.y;
    const prev = v.ground;
    v.ground = offroadGround(groundMap, v.x, v.y);
    const wet = v.ground === 'wade' || v.ground === 'ditch';
    if (wet && prev !== 'wade' && prev !== 'ditch') {
      if (v.ground === 'ditch') v.speed *= 0.88;
      if (Math.abs(v.speed) > 1.5) v.splashed = true;
    }
  }
  const g = v.ground;
  if (g !== 'gras' && g !== 'wade') return;
  const sp = Math.abs(v.speed);
  const top = v.model.maxSpeed || 30;
  const cap = g === 'wade' ? WADE_TOP : Math.min(top, Math.max(20, top * (0.75 + 0.25 * (v.model.offroad || 0))));
  if (sp > cap) v.speed -= Math.sign(v.speed) * Math.min(sp - cap, (g === 'wade' ? WADE_DRAG : GRASS_DRAG) * dt);
  v._wob = (v._wob || 0) + dt;
  v.angle += Math.sin(v._wob * 13.7 + v.x * 0.9) * Math.sin(v._wob * 5.3 + v.y) * dt * 0.18 * Math.min(1, sp / 15);
}

// Is (x, y) on the surface of a mapped road for cars (not a foot or cycle way,
// not the span of a movable bridge that is up)? Same width test as surfaceUnder.
export function carRoadAt(map, x, y) {
  if (!map || !map.roadsNear) return false;
  for (const r of map.roadsNear(x, y, 8)) {
    if (r.cat === 'foot' || r.cat === 'cycle' || (r.bridge && r._open)) continue;
    const half = r.width / 2 + 0.3, pts = r.pts;
    for (let i = 0; i < pts.length - 1; i++) {
      const ax = pts[i][0], ay = pts[i][1], abx = pts[i + 1][0] - ax, aby = pts[i + 1][1] - ay, l2 = abx * abx + aby * aby;
      const t = l2 > 1e-9 ? clamp(((x - ax) * abx + (y - ay) * aby) / l2, 0, 1) : 0;
      const dx = ax + abx * t - x, dy = ay + aby * t - y;
      if (dx * dx + dy * dy <= half * half) return true;
    }
  }
  return false;
}

// 'gras', 'wade', 'ditch' (the tiles' shallow water, else countryedge.js countryWater) or null where the
// tyres are on a road, farm yard paving or the city's own surfaces.
export function offroadGround(map, x, y) {
  // a road lies over whatever the land use or the water polygons under it say
  // (#165): a meadow, a ditch or the countryside's grass never makes a car on
  // a mapped road wade or drag
  if (carRoadAt(map, x, y)) return null;
  const sw = shallowWater(map, x, y);
  if (sw) return sw.kind === 'sloot' ? 'ditch' : 'wade';
  if (edgeDistance(x, y) < -80) return null;
  const cs = countrySurface(x, y);
  if (!cs) return countryWater(x, y) === 'wade' ? 'wade' : null;
  if (cs === 'weg') return null;
  if (countryWeight(x, y) > 0.99 && onFarmPaving(x, y)) return null;
  if (edgeDistance(x, y) <= 0) return surfaceUnder(map, x, y) === 'gras' ? 'gras' : null;
  if (cs === 'sloot') return countryWater(x, y) === 'ditch' ? 'ditch' : 'wade';
  return 'gras';
}

// Half-life of ~0.15s - a collision's lateral shove is felt for a beat and
// then fades, rather than permanently steering the vehicle off its facing.
const DRIFT_DECAY_RATE = 4.5;
const SLIDE_DECAY_RATE = 2.2; // while handbrake-drifting the slide lingers longer
const SPIN_DECAY_RATE = 2.5;
const MAX_DRIFT_SPEED = 8; // m/s, safety clamp against pathological multi-hit stacking in one frame
const MAX_SPIN = 3.5; // rad/s

const BOAT_SLIDE_DECAY_RATE = 1.3; // a player boat carries its sideways momentum on the water
const REVERSE_FACTOR = 0.25;
const BOAT_CANAL_TOP = 14; // m/s: what a fast boat may do in a narrow canal
const SAIL_GLIDE_DECEL = 0.7; // m/s2: a sailing boat above its wind speed slows this gently // top speed in reverse, as a fraction of maxSpeed
const PLAYER_STEER_RATE = 5; // 1/s: how fast the wheel follows a digital key
const PLAYER_STEER_RETURN = 9;

// The player's boat for one frame (player.js; the boat sims drive it the same
// way): substeps short enough that a fast boat can't skip a bank, each one
// kept off the shore. Bow, stern, both beams and the centre stay on the water;
// a move is only refused when it puts MORE of the hull on land, so a boat that
// already touches a quay can still turn and sail off.
const BOAT_SUBSTEP = 0.6;
export function drivePlayerBoat(v, map, dt, throttle, steer, brake) {
  updateOpenWater(v, map, dt);
  const n = Math.min(8, Math.max(1, Math.ceil(Math.abs(v.speed) * dt / BOAT_SUBSTEP)));
  for (let i = 0; i < n; i++) {
    const sx = v.x, sy = v.y, sa = v.angle;
    v.applyControls(dt / n, throttle, steer, brake);
    resolveVehicleBuildingCollision(v, map, dt / n);
    if (!keepBoatOffShore(map, v, sx, sy, sa)) {
      v.speed *= -0.25;
      v.driftX = 0; v.driftY = 0;
      return false;
    }
    // a lock gate that is shut or swinging is a wall (sluizen.js)
    if (lockGateStop(v, sx, sy, sa)) {
      v.x = sx; v.y = sy; v.angle = sa;
      v.speed *= -0.15;
      v.driftX = 0; v.driftY = 0;
      return false;
    }
  }
  return true;
}

// 0 in a narrow canal .. 1 on wide water: how far a fast boat may open up
// (playerTune). Sampled a few times a second, looking ahead too, eased.
function updateOpenWater(v, map, dt) {
  v._owT = (v._owT || 0) - dt;
  if (v._owT <= 0) {
    v._owT = 0.25;
    const c = Math.cos(v.angle), s = Math.sin(v.angle);
    let room = waterClearance(map, v.x, v.y, 12);
    for (const d of [10, 20]) room = Math.min(room, waterClearance(map, v.x + c * d, v.y + s * d, 12) + 1);
    v._owWant = clamp((room - 4) / 7, 0, 1);
  }
  const want = v._owWant ?? 1;
  v.openWater = v.openWater == null ? want : v.openWater + (want - v.openWater) * Math.min(1, dt * (want < v.openWater ? 3 : 0.8));
}

// Right-hand-traffic offset from the road centerline (to the right of the
// direction of travel), used both at spawn and for the driving path.
function laneOffset(road, v, half = road.width / 2, dir = 1) {
  const halfWid = v.model.wid / 2;
  if (v.isBike || v.isScooter) {
    if (road.cat === 'cycle') return road.oneway ? 0 : Math.min(0.6, half / 2);
    return Math.max(0.3, half - 0.7);
  }
  // the lane model (roadsurface.js laneLayout): the middle of the right lane
  const m = modelLane(road, dir, 'right');
  if (m !== null) return clamp(m, 0, Math.max(0, half - halfWid - 0.2));
  if (road.oneway) return clamp(half - halfWid - 1.2, 0, 1);
  return clamp(half / 2, 0.3, Math.max(0.3, half - halfWid - 0.25));
}

// The middle of the rightmost or leftmost lane for traffic going `dir` along
// a road with the lane model (lanesFwd/lanesBwd), as an offset right of the
// direction of travel; null without the model or with a single lane there
// and 'left' asked.
// #652: het lane-model (road._lanes) wordt per weg al gecachet; de filter-array
// per aanroep was de laatste allocatie in het rijpad. De uitkomst per richting en
// kant ligt daarom op de weg zelf (vier vakjes), met een teller voor de meting.
const LANE_STATS = { calls: 0, hits: 0 };
export function laneCacheStats() { return { ...LANE_STATS }; }

function modelLane(road, dir, which) {
  if (road.lanesFwd == null) return null;
  const slot = (road.oneway ? 2 : dir > 0 ? 0 : 1) + (which === 'left' ? 1 : 0);
  const set = road._laneMidSet || 0;
  if (set & (1 << slot)) { LANE_STATS.hits++; return road._laneMid[slot]; }
  let lay = road._lanes;
  if (!lay) road._lanes = lay = laneLayout(road);
  // geen filter-array per aanroep (#652): loop in één keer naar de uiterste baan
  const wantDir = road.oneway ? 1 : dir;
  let best = null, n = 0;
  for (const q of lay.lanes) {
    if (q.dir !== wantDir) continue;
    n++;
    const o = q.off * wantDir;
    if (best === null || (which === 'right' ? o > best : o < best)) best = o;
  }
  const out = !n || (which === 'left' && n < 2) ? null : best;
  (road._laneMid || (road._laneMid = [null, null, null, null]))[slot] = out;
  road._laneMidSet = set | (1 << slot);
  LANE_STATS.calls++;
  return out;
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
// to the nearest building on either side at every point and along each
// segment (a facade can jut in between two far-apart points), lazily, cached.
function freeHalfWidth(near, x, y, ux, uy, nominal) {
  if (!near.length || pointInAnyBuilding(near, x, y)) return nominal;
  let half = nominal;
  for (const side of [1, -1]) {
    for (let d = 0.75; d < half; d += 0.5) {
      if (pointInAnyBuilding(near, x + ux * d * side, y + uy * d * side)) { half = Math.max(1.2, d - 0.3); break; }
    }
  }
  return half;
}

const HALF_SAMPLE = 2.5;
function roadHalfWidths(map, road) {
  if (road._half) return road._half;
  const nrm = roadNormals(road);
  const P = road.pts, nominal = road.width / 2;
  const segHalf = [];
  for (let i = 0; i < P.length - 1; i++) {
    const [ax, ay] = P[i], [bx, by] = P[i + 1];
    const L = Math.hypot(bx - ax, by - ay);
    let half = nominal;
    if (L > 2 * HALF_SAMPLE) {
      const ux = -(by - ay) / L, uy = (bx - ax) / L;
      const near = map.buildingsNear((ax + bx) / 2, (ay + by) / 2, L / 2 + nominal + 1);
      for (let d = HALF_SAMPLE; d < L - HALF_SAMPLE + 1e-6 && near.length; d += HALF_SAMPLE) {
        half = Math.min(half, freeHalfWidth(near, ax + (bx - ax) * d / L, ay + (by - ay) * d / L, ux, uy, nominal));
      }
    }
    segHalf.push(half);
  }
  road._half = P.map((p, i) => {
    const L = Math.hypot(nrm[i][0], nrm[i][1]) || 1;
    const near = map.buildingsNear(p[0], p[1], nominal + 1);
    let half = freeHalfWidth(near, p[0], p[1], nrm[i][0] / L, nrm[i][1] / L, nominal);
    if (i > 0) half = Math.min(half, segHalf[i - 1]);
    if (i < segHalf.length) half = Math.min(half, segHalf[i]);
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
// Bus/taxi/emergency traffic may use bus lanes and busways.
function busLaneUser(v) {
  return !!(v.isBus || v.isTaxi || v.isAmbulance || v.isPolice || v.sirenOn);
}

function lanePoint(map, road, i, dir, v, out = null) {
  const half = roadHalfWidths(map, road)[i];
  let lane = laneOffset(road, v, half, dir);
  const small = v.isBike || v.isScooter;
  const bl = road.busLane && !small && (dir > 0 ? road.busLane.fwd : road.busLane.bwd);
  if (bl && half >= 3) {
    // the kerb lane is the bus lane: buses and taxis in it, the rest left of it
    const laneW = Math.min(3.2, road.oneway ? half : half * 0.9);
    lane = busLaneUser(v) && v.laneMode !== 'left'
      ? Math.max(0.3, half - laneW / 2)
      : road.oneway ? Math.min(lane, half - laneW - v.halfWid - 0.2) : clamp(half - laneW - v.halfWid - 0.3, 0.3, half);
  }
  const leftLane = v.laneMode === 'left' && !small ? modelLane(road, dir, 'left') : null;
  if (v.laneMode === 'yield' && !small) lane = Math.max(lane, half - v.halfWid - 0.05);
  else if (leftLane !== null) lane = clamp(leftLane, -(half - v.halfWid - 0.2), half);
  else if (v.laneMode === 'left' && !small && half >= 4.5) lane = road.oneway ? -Math.max(0.3, Math.min(1.8, half - v.halfWid - 1.4)) : Math.min(lane, Math.max(v.halfWid + 0.25, half * 0.28));
  else if (v.laneMode === 'squeeze' && !road.oneway) lane = Math.max(lane, half - v.halfWid + 0.4);
  else if (v.laneMode === 'pass') lane = road.oneway || half < 3.5 ? -Math.max(0.5, half - v.halfWid + 0.6) : -half / 2;
  const p = road.pts[i], nrm = roadNormals(road)[i];
  const x = p[0] + nrm[0] * lane * dir, y = p[1] + nrm[1] * lane * dir;
  // out: hergebruik een bestaand [x, y] (de verkeers-AI, #652); anders zoals voorheen
  if (out) { out[0] = x; out[1] = y; return out; }
  return [x, y];
}

export function spawnVehicleOnRoad(map, road, isPolice = false, rng = Math.random, isBike = false, isBus = false, atPoint = null, isScooter = false, forcedModel = null, wantAngle = null) {
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
  // wantAngle: de richting die de beller eist (een live bus komt uit de feed met een eigen koers). Zonder
  // deze regel koos de dobbelsteen hier de helft van de tijd de verkeerde kant op, en dan werd de live bus
  // terecht afgekeurd (#332, livebussen).
  const dir = road.oneway ? 1 : (wantAngle != null
    ? (Math.abs(normalizeAngle(angle - wantAngle)) > Math.PI / 2 ? -1 : 1)
    : (rng() < 0.5 ? 1 : -1));
  if (dir < 0) angle = normalizeAngle(angle + Math.PI);
  const model = forcedModel || (isPolice
    ? POLICE_MODEL
    : isBike
    ? pickBikeModel(rng)
    : isScooter
    ? pickScooterModel(rng)
    : isBus
    ? BUS_MODELS[Math.floor(rng() * BUS_MODELS.length)]
    : MODELS[Math.floor(rng() * MODELS.length)]);
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

// A fresh spawn must not pop into view: never on the stretch just ahead of
// the player's vehicle, and not inside the camera frustum (world.pedView,
// filled by scene3d) with a clear line of sight - behind a building or deep
// in the fog is fine.
function spawnWouldPop(world, v) {
  const p = hoofdspeler(world);
  const dx = v.x - p.x, dy = v.y - p.y;
  const pv = p.inVehicle;
  if (pv) {
    const ca = Math.cos(pv.angle), sa = Math.sin(pv.angle);
    const fwd = dx * ca + dy * sa, lat = Math.abs(dy * ca - dx * sa);
    if (fwd > -5 && fwd < 70 + Math.abs(pv.speed) * 8 && lat < 14 + fwd * 0.3) return true;
  }
  const view = world.pedView;
  if (!view || world.time < (world.pedFreeSpawnUntil || 0) || !view.inView(v.x, v.y)) return false;
  return lineOfSight(world.map, view.camX, view.camY, v.x, v.y);
}

function lineOfSight(map, ax, ay, bx, by) {
  const d = Math.hypot(bx - ax, by - ay);
  const n = Math.min(40, Math.floor((d - 3) / 4));
  for (let k = 1; k <= n; k++) {
    const t = (k * 4) / d, x = ax + (bx - ax) * t, y = ay + (by - ay) * t;
    for (const b of map.buildingsNear(x, y, 0.5)) {
      const [minx, miny, maxx, maxy] = b.bounds;
      if (x > minx && x < maxx && y > miny && y < maxy && pointInPolygon(x, y, b.pts)) return false;
    }
  }
  return true;
}

// Tammo and Tessa's private garage (home.js sets map.homeGarageAt): no traffic
// spawns in it and none stays in it, whichever road still runs into the plinth.
const inPrivateGarage = (map, x, y, pad = 0) => !!(map.homeGarageAt && map.homeGarageAt(x, y, pad));

function spawnSpotFree(vehicles, v, clearance = 9) {
  const own = v.model.trailer || 0;
  for (const o of vehicles) {
    if (Math.hypot(o.x - v.x, o.y - v.y) < clearance + own + o.halfLen + (o.model.trailer || 0)) return false;
  }
  return true;
}

// The one-off hero car of the game: same placement machinery as a regular
// traffic spawn (spawnVehicleOnRoad with atPoint), but forces the Escort
// model regardless of the RNG pick and flags it so it's never swept up by
// the ambient traffic population manager.
export function spawnHeroCarNear(map, x, y, rng = Math.random) {
  const point = map.nearestRoadPoint(x, y, 200, true, true);
  if (!point) return null;
  const v = spawnVehicleOnRoad(map, point.road, false, rng, false, false, point);
  v.model = HERO_CAR_MODEL;
  v.isHeroCar = true;
  // de onderdelen van de Escapade uit de garage (#196)
  try {
    const all = loadTuning(typeof localStorage !== 'undefined' ? localStorage : null, KEYS.tuning);
    if (all.hero) v.tuning = tuningEffects(all.hero);
  } catch (e) { /* zonder opslag geen onderdelen */ }
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
// samen spelen, spelers uit elkaar (#429): met meer dan een focus (world.coopFoci, coopfoci.js) ruimt een voertuig pas op als het bij geen enkele focus
// in de buurt is, en telt elke focus zijn eigen voertuigen voor zijn doelaantal
const meerFoci = (world) => !!(world.coopFoci && world.coopFoci.length > 1);
const focusAfstand = (world, v, player) => (meerFoci(world) ? minAfstand(world.coopFoci, v.x, v.y) : Math.hypot(v.x - player.x, v.y - player.y));
const lokaalTelt = (world, v, player, dist) => !meerFoci(world) || Math.hypot(v.x - player.x, v.y - player.y) <= dist;
const MAX_WRECKS = 12;
// Welke wrakken weg mogen is de pure regel van wrakopruim.js: de verste van elke speler eerst (#436).
function pruneWrecks(world) {
  const { player, vehicles } = world;
  const foci = meerFoci(world) ? world.coopFoci : [player];
  for (const v of kiesWrakkenVoorOpruimen(vehicles, foci, MAX_WRECKS)) {
    const i = vehicles.indexOf(v);
    if (i >= 0) vehicles.splice(i, 1);
  }
}

// A vehicle in the list twice, or two identical ones stacked on one spot (a mission
// started twice spawns its van twice; a crash then shoves them apart as "three vans",
// #211): the later copy goes. The player's own vehicle and anything with another
// model, label or heading is left alone. Returns how many were removed.
export function dedupeVehicles(vehicles) {
  let removed = 0;
  for (let i = vehicles.length - 1; i >= 0; i--) {
    const v = vehicles[i];
    if (vehicles.indexOf(v) < i) { vehicles.splice(i, 1); removed++; continue; }
    if (v.driver === 'player' || v.wrecked || v.isBoat) continue;
    for (let j = 0; j < i; j++) {
      const o = vehicles[j];
      if (o.driver === 'player' || o.wrecked || o.isBoat) continue;
      if (Math.abs(o.x - v.x) > 0.6 || Math.abs(o.y - v.y) > 0.6 || (o.model && v.model && o.model.name !== v.model.name) || o.label !== v.label) continue;
      if (Math.abs(Math.atan2(Math.sin(o.angle - v.angle), Math.cos(o.angle - v.angle))) > 0.3) continue;
      vehicles.splice(i, 1); removed++;
      break;
    }
  }
  return removed;
}

const BUS_VERDWAALD_M = 200; // m van zijn lijn: de bus is de weg kwijt
export function manageTrafficPopulation(world, opts = {}) {
  const { map, vehicles } = world;
  const player = opts.focus || (world.cameraOverride && world.streamFocus ? world.streamFocus : hoofdspeler(world)); // in a cutscene the traffic fills round the camera's view (#157)
  if (!opts.focus) dedupeVehicles(vehicles);
  // ?simlagen (issue #18): doelaantal en afstanden per streek uit simlagen.js
  const lagen = FLAGS.simlagen ? verkeerOpties(wijkProfileAt(map, player.x, player.y).key, hourOf(world)) : null;
  const { target: targetOpt = lagen ? lagen.target : 30, spawnMin = lagen ? lagen.spawnMin : 70, spawnMax = lagen ? lagen.spawnMax : 170, despawnDist = lagen ? lagen.despawnDist : 260 } = opts;
  if (!opts.focus) { pruneWrecks(world); vehicleHooks.manageParkedCars(world); }
  for (let i = vehicles.length - 1; i >= 0; i--) {
    const v = vehicles[i];
    if (v.road && !v.homeStored && v.driver !== 'player' && !v.missionCar && !v.isBoat && inPrivateGarage(map, v.x, v.y)) { vehicles.splice(i, 1); continue; }
    if (v.driver === 'player' || v.isPolice || v.isHeroCar || v.missionCar || v.isBike || v.isBus || v.parked || v.homeStored || (v.isBoat && v.playerOwned)) continue;
    // Wrecked cars have speed=0 forever and would otherwise almost never
    // reach the distance despawn, silently eating the traffic quota. A
    // vehicle stuck bouncing off the same dead end (isolated stub with no
    // real connection) is cleared the same way rather than left oscillating.
    // een bus die ver van zijn lijn is geraakt (een omweg zonder einde) verdwijnt als niemand kijkt (#322)
    const verdwaald = !!v.busRun && Math.hypot(v.x - player.x, v.y - player.y) > 60 && projectOnLine(v.busRun.line, v.x, v.y).d > BUS_VERDWAALD_M;
    if ((!v.wrecked && ((v.deadEndBounces || 0) > 2 || (v.stuckFor || 0) > 25 || ((v.waitFor || 0) > 45 && Math.hypot(v.x - player.x, v.y - player.y) > 70))) || verdwaald || focusAfstand(world, v, player) > despawnDist) vehicles.splice(i, 1);
  }

  let count = 0;
  for (const v of vehicles) if (!v.wrecked && !v.isPolice && !v.isHeroCar && !v.isBike && !v.isBus && !v.isScooter && !v.isBoat && !v.parked && v.driver !== 'player' && lokaalTelt(world, v, player, despawnDist)) count++;

  const candidates = map.roadsNear(player.x, player.y, spawnMax).filter((r) => r.cat !== 'foot' && r.cat !== 'cycle' && r.width >= 3 && !r.busOnly);
  // a hamlet with two short roads takes fewer cars than a city street grid (#265): the target follows the road length in range
  const target = opts.target !== undefined ? targetOpt : roadCapacityTarget(roadLengthWithin(candidates, player.x, player.y, spawnMax), targetOpt);
  // ambulances, taxis and a cash-transport van are part of the everyday
  // traffic, not one-offs: keep a few of them around
  const have = { ambulance: 0, taxi: 0, cashvan: 0, newsvan: 0 };
  for (const v of vehicles) if (v.fleetKind in have && !v.wrecked && v.driver !== 'player') have[v.fleetKind]++;
  const want = { ambulance: 1, taxi: 2, cashvan: 1, newsvan: newsVanWanted(hourOf(world), distToCentre(player.x, player.y)) ? 1 : 0 };
  let guard = 0;
  while (count < target && candidates.length && guard++ < target * 4) {
    const road = candidates[Math.floor(Math.random() * candidates.length)];
    const mid = road.pts[Math.floor(road.pts.length / 2)];
    let pick = pickTrafficCar(map, mid[0], mid[1], Math.random, { hour: hourOf(world) });
    for (const k of ['ambulance', 'taxi', 'cashvan', 'newsvan']) {
      if (have[k] < want[k] && Math.random() < (k === 'cashvan' ? 0.08 : k === 'newsvan' ? 0.1 : 0.25)) { pick = { kind: k, model: carModel(k) }; break; }
    }
    if (!canUseRoad({ model: pick.model }, road)) continue;
    const v = spawnVehicleOnRoad(map, road, false, Math.random, false, false, null, false, pick.model);
    const d = Math.hypot(v.x - player.x, v.y - player.y);
    if (d < spawnMin || d > spawnMax || !spawnSpotFree(vehicles, v) || inPrivateGarage(map, v.x, v.y, 2) || spawnWouldPop(world, v)) continue;
    applyFleetFlags(v, pick.kind);
    if (pick.kind in have) have[pick.kind]++;
    vehicles.push(v);
    count++;
  }
}

// Same idea as manageTrafficPopulation but for cyclists - fietsers are the
// single most Groningen-defining detail of the streetscape, so they get
// their own population target, favoring dedicated cycleways when present.
export function manageBikePopulation(world, { target = 16, spawnMin = 40, spawnMax = 140, despawnDist = 220, focus = null } = {}) {
  const { map, vehicles } = world;
  const player = focus || (world.cameraOverride && world.streamFocus ? world.streamFocus : hoofdspeler(world)); // in a cutscene the traffic fills round the camera's view (#157)
  for (let i = vehicles.length - 1; i >= 0; i--) {
    const v = vehicles[i];
    if (!v.isBike || v.driver === 'player') continue;
    if ((!v.wrecked && ((v.deadEndBounces || 0) > 2 || (v.stuckFor || 0) > 25 || ((v.waitFor || 0) > 45 && Math.hypot(v.x - player.x, v.y - player.y) > 70))) || focusAfstand(world, v, player) > despawnDist) vehicles.splice(i, 1);
  }

  let count = 0;
  for (const v of vehicles) if (v.isBike && !v.wrecked && v.driver !== 'player' && v.road && lokaalTelt(world, v, player, despawnDist)) count++;

  const candidates = map.roadsNear(player.x, player.y, spawnMax)
    .filter((r) => r.cat === 'cycle' || r.cat === 'normal' || r.cat === 'minor');
  let guard = 0;
  while (count < target && candidates.length && guard++ < target * 4) {
    const road = candidates[Math.floor(Math.random() * candidates.length)];
    const mid = road.pts[Math.floor(road.pts.length / 2)];
    const variant = pickBikeVariant(map, mid[0], mid[1], Math.random, { hour: hourOf(world) });
    if (variant && variant.cargo && road.cat === 'minor' && road.width < 3) continue;
    const v = spawnVehicleOnRoad(map, road, false, Math.random, true, false, null, false, variant);
    const d = Math.hypot(v.x - player.x, v.y - player.y);
    if (d < spawnMin || d > spawnMax || !spawnSpotFree(vehicles, v) || inPrivateGarage(map, v.x, v.y, 2) || spawnWouldPop(world, v)) continue;
    vehicles.push(v);
    count++;
  }
}

// Deelscooters follow the same lane/road-preference rules as bikes (cycle
// lanes, or normal/minor streets when there's no dedicated cycleway).
export function manageScooterPopulation(world, { target = 10, spawnMin = 40, spawnMax = 140, despawnDist = 220, focus = null } = {}) {
  const { map, vehicles } = world;
  const player = focus || hoofdspeler(world);
  for (let i = vehicles.length - 1; i >= 0; i--) {
    const v = vehicles[i];
    if (!v.isScooter || v.isMotor || v.driver === 'player') continue;
    if ((!v.wrecked && ((v.deadEndBounces || 0) > 2 || (v.stuckFor || 0) > 25 || ((v.waitFor || 0) > 45 && Math.hypot(v.x - player.x, v.y - player.y) > 70))) || focusAfstand(world, v, player) > despawnDist) vehicles.splice(i, 1);
  }

  let count = 0;
  for (const v of vehicles) if (v.isScooter && !v.isMotor && !v.wrecked && v.driver !== 'player' && v.road && lokaalTelt(world, v, player, despawnDist)) count++;

  const candidates = map.roadsNear(player.x, player.y, spawnMax)
    .filter((r) => r.cat === 'cycle' || r.cat === 'normal' || r.cat === 'minor');
  let guard = 0;
  while (count < target && candidates.length && guard++ < target * 4) {
    const road = candidates[Math.floor(Math.random() * candidates.length)];
    const v = spawnVehicleOnRoad(map, road, false, Math.random, false, false, null, true);
    const d = Math.hypot(v.x - player.x, v.y - player.y);
    if (d < spawnMin || d > spawnMax || !spawnSpotFree(vehicles, v) || inPrivateGarage(map, v.x, v.y, 2) || spawnWouldPop(world, v)) continue;
    vehicles.push(v);
    count++;
  }
}

// Brommers and motorbikes in the everyday traffic (motortraffic.js): they ride
// the normal roads only, never the fietspad, and a legal brommer stays at 45.
export function manageMotorPopulation(world, { target = null, spawnMin = 50, spawnMax = 150, despawnDist = 230, focus = null } = {}) {
  const { map, vehicles } = world;
  const player = focus || hoofdspeler(world);
  for (let i = vehicles.length - 1; i >= 0; i--) {
    const v = vehicles[i];
    if (!v.isMotor || v.driver === 'player') continue;
    if ((!v.wrecked && ((v.deadEndBounces || 0) > 2 || (v.stuckFor || 0) > 25 || ((v.waitFor || 0) > 45 && Math.hypot(v.x - player.x, v.y - player.y) > 70))) || focusAfstand(world, v, player) > despawnDist) vehicles.splice(i, 1);
  }
  const prof = wijkProfileAt(map, player.x, player.y).key;
  const want = target ?? motorTarget(prof, hourOf(world));
  let count = 0;
  for (const v of vehicles) if (v.isMotor && !v.wrecked && v.driver !== 'player' && v.road && lokaalTelt(world, v, player, despawnDist)) count++;
  const candidates = map.roadsNear(player.x, player.y, spawnMax).filter((r) => (r.cat === 'normal' || r.cat === 'minor') && r.width >= 3 && !r.busOnly);
  let guard = 0;
  while (count < want && candidates.length && guard++ < want * 5) {
    const road = candidates[Math.floor(Math.random() * candidates.length)];
    const mid = road.pts[Math.floor(road.pts.length / 2)];
    const pick = pickMotor(wijkProfileAt(map, mid[0], mid[1]).key);
    const v = spawnVehicleOnRoad(map, road, false, Math.random, false, false, null, true, pick.model);
    v.isMotor = true;
    v.tunedMoped = pick.tuned;
    const d = Math.hypot(v.x - player.x, v.y - player.y);
    if (d < spawnMin || d > spawnMax || !spawnSpotFree(vehicles, v) || spawnWouldPop(world, v)) continue;
    vehicles.push(v);
    count++;
  }
}

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
  // a farm yard's paving is hard ground for the drag in countryside.js too
  if (country) return country === 'weg' || (countryWeight(x, y) > 0.99 && onFarmPaving(x, y)) ? 'asfalt' : 'gras';
  return 'klinkers';
}

// De verkeers-AI staat in vehicle/traffic.js (#497). Die module importeert niets uit dit bestand;
// hier krijgt hij wat hij ervan nodig heeft. liveBussen is laat gebonden (main.js zet hem tijdens
// het spelen via setLiveBussen), dus die gaat als getter mee en niet als momentopname.
// De boten staan in vehicle/boatwater.js (#497). Die module importeert niets uit dit bestand;
// hier krijgt hij wat hij ervan nodig heeft. De namen komen bovenaan al binnen als her-export.
setBoatHost({ Vehicle, spawnSpotFree, spawnWouldPop, inPrivateGarage });

// What the tyres are on: 'asfalt' | 'fietspad' | 'klinkers' | 'gras'. The
// ground between mapped roads is rendered as klinker paving.

// de buspopulatie woont in vehicle/buspop.js (#497); ze krijgt hier de spawn- en
// plaatsingshulpen van dit bestand.
setBusPopHost({ spawnVehicleOnRoad, spawnSpotFree, spawnWouldPop, inPrivateGarage, focusAfstand });
setTrafficHost({
  busLaneUser, busSpawnPoint, lanePoint, laneOffset, maxCurvature, lateralGrip,
  get liveBussen() { return getLiveBussen(); },
});

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
  // two bodies that cross each other (two cars through the same junction): the endpoint
  // distances below say "a metre apart" and push them along a made-up normal, so they stayed
  // stuck in each other; crossing segments are at distance zero, the caller then pushes them
  // apart along the line between the centres (#265)
  const d1x = s1.bx - s1.ax, d1y = s1.by - s1.ay, d2x = s2.bx - s2.ax, d2y = s2.by - s2.ay;
  const den = d1x * d2y - d1y * d2x;
  if (Math.abs(den) > 1e-6) {
    const t = ((s2.ax - s1.ax) * d2y - (s2.ay - s1.ay) * d2x) / den;
    const u = ((s2.ax - s1.ax) * d1y - (s2.ay - s1.ay) * d1x) / den;
    if (t > 0 && t < 1 && u > 0 && u < 1) {
      const x = s1.ax + d1x * t, y = s1.ay + d1y * t;
      return { p1x: x, p1y: y, p2x: x, p2y: y, dist2: 0 };
    }
  }
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
const FLAT_MIN_DAMAGE = 8; // een klap van minstens zoveel schade kan een band lek slaan
const FLAT_MAX_CHANCE = 0.5;
const FLAT_TOP_FACTOR = 0.7; // lekke band: topsnelheid
const FLAT_PULL = 0.12; // lekke band: de auto trekt scheef (stuurbias)
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

function tangentialSpeed(a, b, nx, ny) {
  let vx = Math.cos(a.angle) * a.speed + a.driftX, vy = Math.sin(a.angle) * a.speed + a.driftY;
  if (b) { vx -= Math.cos(b.angle) * b.speed + b.driftX; vy -= Math.sin(b.angle) * b.speed + b.driftY; }
  return Math.abs(-vx * ny + vy * nx);
}

// Een politiepaard (#331) gaat niet kapot en blijft ook niet staan: een klap van deze schade (een auto
// van ~5 m/s tegen het paard) gooit de ruiter eraf en het paard slaat op hol. Dat doet policemounts.js
// maybeBolt zodra de gezondheid onder HORSE_BOLT_HEALTH (40) komt; hier komt hij er in één klap onder.
const HORSE_KNOCK_DAMAGE = 10;
const HORSE_KNOCKED_HEALTH = 30;
const HORSE_SOFT = 0.35; // een paard is zacht: de auto die het raakt krijgt zoveel van de schade
const isMountHorse = (v) => v._mount === 'horse' && v.driver !== 'player';

function applyImpactDamage(v, dmg, playerInvolved, world) {
  if (dmg <= 0 || v.wrecked) return;
  if (v.disabled) { v.burnLeft -= dmg * 0.06; return; }
  if (isMountHorse(v)) {
    v.health = Math.max(1, v.health - dmg * CRASH_DAMAGE_SCALE);
    if (dmg >= HORSE_KNOCK_DAMAGE) v.health = Math.min(v.health, HORSE_KNOCKED_HEALTH);
    return;
  }
  if (v.driver === 'player') dmg = assistDamage(dmg);
  // een politicauto op vijf sterren heeft een pantser (#436): hij houdt meer
  // klappen voordat de speler hem stuk rijdt
  if (v.isPolice && v.driver !== 'player' && v.armor) dmg *= v.armor;
  v.health = Math.max(0, v.health - dmg * CRASH_DAMAGE_SCALE);
  if (playerInvolved && v.driver === 'player' && !v.flat && !v.isBoat && !v.isHeli && !v.isBus && dmg >= FLAT_MIN_DAMAGE && v.health > 0 && Math.random() < Math.min(FLAT_MAX_CHANCE, dmg / 60)) v.flat = true;
  if (v.health <= 0) disableVehicle(v, playerInvolved, world);
}

// --- dying cars ----------------------------------------------------------------
// A car crashed or shot to zero health doesn't blow up on the spot: the
// engine dies and it catches fire (v.disabled). Whoever sits in it can still
// get out; after a while it explodes (explodeVehicle), which is when it
// becomes a wreck. Two-wheelers and boats still wreck straight away.
const BLAST_REACH = 9;

export function tickBurningVehicles(world, dt) {
  for (const v of world.vehicles) {
    if (world.shards && v.driver === 'player' && shardPuncture(world.shards, v, world.time || 0)) {
      v.flat = true;
      world.addMessage(world.shards.lastKind === 'spijkers' ? 'Spijkermat van de politie! Lekke band' : 'Door de glasscherven! Lekke band', 3);
    }
    if (v.flat && !v.flatWarned && v.driver === 'player') {
      v.flatWarned = true;
      world.addMessage(v.isBike || v.isScooter ? 'Lekke band! Naar de fietsenmaker of de garage' : 'Lekke band! Je auto trekt scheef. Naar de garage', 4);
    } else if (!v.flat && v.flatWarned) v.flatWarned = false;
    if (!v.disabled || v.wrecked) continue;
    if (v.sinking) { v.disabled = false; continue; }
    if (v.driver === 'player' && !v.fireWarned) {
      v.fireWarned = true;
      world.addMessage('Je auto staat in brand! Stap uit (E) voor hij ontploft', 3.5);
    }
    v.burnLeft -= dt;
    if (v.burnLeft <= 0) explodeVehicle(v, world);
  }
}

// The fireball: the car becomes a (black) wreck and hops, nearby cars are
// shoved and damaged (a chain reaction is possible) and the camera shakes.
// People are handled by pedestrians.js (blastAt), the driver by player.js.
export function explodeVehicle(v, world) {
  v.disabled = false;
  v.wrecked = true;
  v.blewUp = true;
  restWreck(v);
  v.yawVel = (Math.random() - 0.5) * 1.2;
  if (!v.airborne) { v.airborne = true; v.vz = 3.2 + Math.random() * 1.2; }
  for (const o of world.vehicles) {
    if (o === v || o.isBoat || o.sinking || Math.abs((o.z || 0) - (v.z || 0)) > 3) continue;
    const dx = o.x - v.x, dy = o.y - v.y, d = Math.hypot(dx, dy);
    if (d > BLAST_REACH) continue;
    const k = 1 - d / BLAST_REACH, nx = d > 0.01 ? dx / d : 1, ny = d > 0.01 ? dy / d : 0;
    if (!o.wrecked) {
      const push = 7 * k * clamp(8 / vehicleMass(o), 0.25, 2.5);
      const [ox, oy] = velocityOf(o);
      setVelocity(o, ox + nx * push, oy + ny * push);
      o.yawVel = clamp(o.yawVel + (Math.random() - 0.5) * 3 * k, -MAX_SPIN, MAX_SPIN);
      applyImpactDamage(o, 85 * k, !!v.wreckedByPlayer, world);
    }
  }
  const p = hoofdspeler(world);
  const pd = Math.hypot(v.x - p.x, v.y - p.y);
  if (pd < 60) world.lastImpact = { strength: clamp(1.25 - pd / 45, 0.15, 1), time: world.time, x: v.x, y: v.y, blast: true, own: !!v.wreckedByPlayer || v.driver === 'player' || v === p.inVehicle || !!v.playerOwned };
  world.lastBlast = { x: v.x, y: v.y, z: v.z || 0, time: world.time };
}

// Something soft but heavy under the bumper (an animal): scrubs off speed
// (keep = fraction kept), a thump for the camera, a dent for the big ones.
export function vehicleHitBody(v, x, y, keep, dmg, world) {
  const before = Math.abs(v.speed);
  v.speed *= keep;
  v.driftX *= keep; v.driftY *= keep;
  const lost = before * (1 - keep);
  if (lost > IMPACT_EVENT_SPEED) reportImpact(world, x, y, lost, v.driver === 'player');
  if (dmg > 0) applyImpactDamage(v, dmg, false, world);
}

// Also the single place that flags v.hitThisFrame/hitX/hitY/hitImpactSpeed
// for the 3D spark effect (reset per call, read by scene3d's render pass),
// including hits queued by resolveVehicleBuildingCollision earlier this frame.
export function resolveVehicleVehicleCollisions(vehicles, world = null) {
  if (world) vehicleHooks.tickParkedCars(world);
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
      // two far cars the simulation worker drives keep their own gaps (simbridge.js)
      if (a._wid && b._wid) continue;
      // a helicopter in the air passes over everything
      if ((a.isHeli && !a.onGround) || (b.isHeli && !b.onGround)) continue;
      // one on the viaduct, the other on the street below (or in the cutting)
      if (Math.abs((a.z || 0) - (b.z || 0)) > 2.5) continue;
      // a waiting cycle being broken: the chosen vehicle slips past its partner
      // (maar een wesp of fiets glipt nooit door een bus heen: de bus is zo lang dat het zichtbaar door elkaar heen rijden was, #436)
      if (world && !((a.isBus && (b.isScooter || b.isBike)) || (b.isBus && (a.isScooter || a.isBike))) && ((a.ignoreId === b.id && world.time < a.ignoreUntil) || (b.ignoreId === a.id && world.time < b.ignoreUntil))) continue;
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
      for (const w of [a, b]) if (w.wrecked) restWreck(w);
      if (relN >= IMPACT_EVENT_SPEED || slide > SCRAPE_SPEED) recordContact(a, b, hx, hy, nx, ny, relN, slide);
      if (relN < IMPACT_EVENT_SPEED) continue;
      // Only the player's own driving should ever count as a player wreck.
      const playerInvolved = a.driver === 'player' || b.driver === 'player';
      reportImpact(world, hx, hy, relN, playerInvolved, a.driver === 'player' ? b : a);
      if (relN > HARD_HIT_CLOSING_SPEED) {
        const base = (relN - HARD_HIT_CLOSING_SPEED) * IMPACT_DAMAGE_PER_MPS;
        applyImpactDamage(a, clamp(base * clamp(2 * mB / (mA + mB), 0.25, 1.6), 0, MAX_IMPACT_DAMAGE) * (isMountHorse(b) ? HORSE_SOFT : 1), playerInvolved, world);
        applyImpactDamage(b, clamp(base * clamp(2 * mA / (mA + mB), 0.25, 1.6), 0, MAX_IMPACT_DAMAGE) * (isMountHorse(a) ? HORSE_SOFT : 1), playerInvolved, world);
        a.hitThisFrame = true; a.hitX = hx; a.hitY = hy; a.hitImpactSpeed = relN;
        b.hitThisFrame = true; b.hitX = hx; b.hitY = hy; b.hitImpactSpeed = relN;
      }
    }
  }
  for (const a of vehicles) if (a.model.trailer && !a.sinking) resolveTrailerContacts(a, vehicles, world);
  if (world) resolvePropCollisions(vehicles, world);
}

// The gelede bus's rear unit against the other vehicles: as heavy as a wall
// to them (it is dragged by its front unit, not pushed about itself).
function resolveTrailerContacts(a, vehicles, world) {
  const t = busTrailerPose(a);
  const cap = t.cap;
  const mx = (cap.ax + cap.bx) / 2, my = (cap.ay + cap.by) / 2, reach0 = Math.hypot(cap.bx - cap.ax, cap.by - cap.ay) / 2 + cap.r;
  for (const b of vehicles) {
    if (b === a || b.sinking || b.isBoat || (b.isHeli && !b.onGround) || Math.abs((a.z || 0) - (b.z || 0)) > 2.5) continue;
    const reach = reach0 + b.halfLen + 0.2;
    if ((b.x - mx) * (b.x - mx) + (b.y - my) * (b.y - my) > reach * reach) continue;
    const capB = vehicleCapsule(b);
    const { p1x, p1y, p2x, p2y, dist2: d2 } = closestPointsBetweenSegments(cap, capB);
    const minDist = cap.r + capB.r;
    let dist = Math.sqrt(d2);
    if (dist >= minDist) continue;
    let nx, ny;
    if (dist < 1e-4) { dist = 1e-4; nx = -Math.sin(t.angle); ny = Math.cos(t.angle); if ((b.x - mx) * nx + (b.y - my) * ny < 0) { nx = -nx; ny = -ny; } }
    else { nx = (p2x - p1x) / dist; ny = (p2y - p1y) / dist; }
    const corr = Math.max(0, minDist - dist - 0.01);
    b.x += nx * corr; b.y += ny * corr;
    const hx = (p1x + p2x) / 2, hy = (p1y + p2y) / 2;
    const relN = contactImpulse(b, null, hx, hy, -nx, -ny, CONTACT_FRICTION);
    // een wrak is een dood voorwerp: de duw van de aanhanger zet hem niet in beweging (#436)
    if (b.wrecked) restWreck(b);
    if (relN < IMPACT_EVENT_SPEED) continue;
    recordContact(b, a, hx, hy, -nx, -ny, relN, 0);
    const playerInvolved = a.driver === 'player' || b.driver === 'player';
    reportImpact(world, hx, hy, relN, playerInvolved);
    if (relN > HARD_HIT_CLOSING_SPEED) {
      const base = (relN - HARD_HIT_CLOSING_SPEED) * IMPACT_DAMAGE_PER_MPS;
      applyImpactDamage(b, clamp(base, 0, MAX_IMPACT_DAMAGE), playerInvolved, world);
      applyImpactDamage(a, clamp(base * 0.5, 0, MAX_IMPACT_DAMAGE), playerInvolved, world);
      b.hitThisFrame = true; b.hitX = hx; b.hitY = hy; b.hitImpactSpeed = relN;
    }
  }
}

// The probes of a body in order: the four corners, and for a long one (a bus, a truck) the sides' middle as well.
// Multiples of (halfLen, halfWid); probe k is worked out on its own, from where the car is now.
const PROBES_LONG = [[1, 1], [1, -1], [0, -1], [-1, -1], [-1, 1], [0, 1]];
const PROBES_SHORT = [[1, 1], [1, -1], [-1, -1], [-1, 1]];
const probeCount = (v) => (v.halfLen > 3 ? 6 : 4);
function collisionProbe(v, k) {
  const m = (v.halfLen > 3 ? PROBES_LONG : PROBES_SHORT)[k];
  const lx = m[0] * v.halfLen, ly = m[1] * v.halfWid;
  const cos = Math.cos(v.angle), sin = Math.sin(v.angle);
  return [v.x + lx * cos - ly * sin, v.y + lx * sin + ly * cos];
}

const FALL_G = 9.8;
const LAND_DAMAGE_SPEED = 7;
// m/s the road must fall away from the car's own vertical motion before the
// wheels leave it (a 5% crest at ~160 km/h and up)
const CREST_VZ = 2.2;
const CREST_MIN_SPEED = 20;
const SLOPE_SAMPLE_MAX = 0.6; // m: a probe further off than this fell over a deck edge, ignore it

// Keep the wheels on the surface under the car (map.groundHeightAt): up and
// down the ring's ramps, over viaducts, through the cuttings. Driving off an
// edge, or over a crest faster than gravity can pull the car down onto the
// falling road, goes ballistic until it lands; a hard landing damages the
// car. Pitch and roll follow the surface under the wheels, and a light
// spring-damper "suspension" adds nose dive, squat, body roll and a bounce
// on landing (v.susPitch/susRoll/susHeave, drawn on the body only).
export function settleVehicleHeight(v, map, dt) {
  if (v.isBoat || v.isHeli || v.sinking || !dt) return;
  updateSuspension(v, dt);
  if (!map.groundHeightAt) return;
  const z = v.z || 0;
  // the car's layer (map.surfaceAt): it keeps to the deck or ramp it is on
  let g0;
  if (map.surfaceAt) {
    const st = v.surf || (v.surf = { z, ribbon: null, kind: 'ground' });
    st.z = z;
    g0 = map.surfaceAt(v.x, v.y, st).z;
  } else g0 = map.groundHeightAt(v.x, v.y, z);
  const g = v.airborne ? g0 : wheelbaseGround(v, map, g0, z);
  if (v.airborne) {
    v.vz -= FALL_G * (v.driver === 'player' ? MODS.grav : 1) * dt;
    v.z = z + v.vz * dt;
    if (v.z <= g && MODS.bounce && v.driver === 'player' && v.vz < -2.5) {
      v.z = g;
      v.vz = -v.vz * 0.7;
    } else if (v.z <= g) {
      const hit = -v.vz;
      v.z = g;
      // touching down on a falling road keeps falling with it, no re-launch
      v.vzG = Math.max(v.vz, -Math.abs(v.speed) * 0.12);
      v.vz = 0;
      v.airborne = false;
      v.susHeaveV = (v.susHeaveV || 0) - Math.min(2.5, hit * 0.35);
      v.susPitchV = (v.susPitchV || 0) - Math.min(1.2, hit * 0.12);
      if (hit > LAND_DAMAGE_SPEED) {
        applyImpactDamage(v, Math.min(60, (hit - LAND_DAMAGE_SPEED) * 7), v.driver === 'player', null);
        v.pendingImpact = { x: v.x, y: v.y, speed: hit * 1.5 };
      }
    }
  } else if (z - g0 > 0.6 + Math.abs(v.speed) * dt * 0.2) {
    // off the edge: keep the vertical speed the slope gave it
    v.airborne = true;
    v.vz = Math.max(v.vzG || 0, Math.sin(v.pitch || 0) * v.speed);
  } else {
    // vertical speed from following the surface, smoothed: the road
    // polylines have small kinks that must not read as launch ramps
    const slopeV = Math.abs(v.speed) * 0.12;
    const vzPrev = clamp(v.vzG || 0, -slopeV, slopeV);
    const ballistic = z + vzPrev * dt - 0.5 * FALL_G * dt * dt;
    if (Math.abs(v.speed) > CREST_MIN_SPEED && (ballistic - g) / dt > CREST_VZ && !v.isBike && !v.isScooter) {
      // over the crest: the road drops away faster than the car can follow
      v.airborne = true;
      v.vz = vzPrev - FALL_G * dt;
      v.z = ballistic;
    } else {
      v.vzG = (v.vzG || 0) + (clamp((g - z) / dt, -12, 12) - (v.vzG || 0)) * Math.min(1, dt * 10);
      v.z = g;
    }
  }
  if (!g && !z && !v.pitch && !v.roll) return;
  const h = Math.min(v.halfLen * 0.75, 2.4);
  const c = Math.cos(v.angle), s = Math.sin(v.angle);
  const zc = v.z;
  const rib = v.surf && v.surf.ribbon;
  const probe = (x, y) => {
    const q = rib && map.surfaceZ ? map.surfaceZ(x, y, zc, rib) : map.groundHeightAt(x, y, zc);
    return Math.abs(q - zc) > SLOPE_SAMPLE_MAX ? zc : q;
  };
  let targetPitch = (v.pitch || 0) * 0.98, targetRoll = v.isBike && v.driver === 'player' ? (v.roll || 0) : (v.roll || 0) * 0.95;
  if (!v.airborne) {
    const zf = probe(v.x + c * h, v.y + s * h), zr = probe(v.x - c * h, v.y - s * h);
    targetPitch = Math.atan2(zf - zr, 2 * h);
    if (!v.isBike && !v.isScooter) {
      const w = v.halfWid * 0.9;
      const zR = probe(v.x - s * w, v.y + c * w), zL = probe(v.x + s * w, v.y - c * w);
      // three rotation.x > 0 lowers the right (+z) side
      targetRoll = -Math.atan2(zR - zL, 2 * w);
    }
  }
  const k = Math.min(1, dt * 10);
  v.pitch = (v.pitch || 0) + (clamp(targetPitch, -0.35, 0.35) - (v.pitch || 0)) * k;
  v.roll = (v.roll || 0) + (clamp(targetRoll, -0.15, 0.15) - (v.roll || 0)) * k;
  if (Math.abs(v.roll) < 1e-4) v.roll = 0;
}

// The road height the wheels ride on: the surface averaged along the
// wheelbase, so the kinks where ramp polylines meet read as short vertical
// curves instead of launch ramps. Samples on another surface (a deck edge,
// the street beside a ramp) fade out instead of falling out.
//
// #519: the average must not depend on HOW MANY samples count. De oude
// sum/n liet de teller verspringen zodra één monsterpunt net over de rand van
// een busbaan of verhoogd fietspad viel, en dan sprong de gemiddelde hoogte in
// één beeld een decimeter (de hobbel van de bus). Daarom een vaste set punten
// met vaste gewichten, symmetrisch van het midden naar de uiteinden: een punt
// dat binnenkomt of wegvalt verschuift het gemiddelde met zijn eigen gewicht —
// hooguit ~1 cm — en niet met 1/n. De gewichten zijn symmetrisch, dus een
// echte helling geeft nog steeds de hoogte onder het midden (de auto loopt
// niet achter) en een viaductrand wordt met alle punten tegelijk gevolgd.
// Er zit geen temporele demping op v.z: de hoogte volgt de weg direct (#519,
// een begrensde hoogtevolging liet de auto op de N370 achterlopen en daarna
// met een sprong inhalen).
const WB_OFFS = [-1, -0.75, -0.5, -0.25, 0.25, 0.5, 0.75, 1];
// lineair aflopend van het midden naar de uiteinden; geen punt in het midden:
// een wielbasis heeft daar geen wiel, en zo telt het middelpunt (waar de
// surfaceAt-stand vandaan komt) niet dubbel
const WB_W = [0.10, 0.115, 0.13, 0.145, 0.145, 0.13, 0.115, 0.10];
function wheelbaseGround(v, map, g, z) {
  if (!g && !z) return g;
  const h = Math.min(v.halfLen * 0.85, 2.6);
  const c = Math.cos(v.angle), s = Math.sin(v.angle);
  // één bron per rijstrook: heeft de auto een ribbon (dek, busbaan, verhoogd
  // fietspad), dan wint die ribbon voor de hele wielbasis; anders het wegdek.
  // Niet per punt van bron wisselen en die twee in één gemiddelde mengen.
  const rib = v.surf && v.surf.ribbon;
  // Vaste gewichten en een GLADDE drempel. De oude harde drempel liet het
  // AANTAL meegetelde punten verspringen zodra één monsterpunt net over de rand
  // van een busbaan of verhoogd fietspad viel, en dan sprong de gemiddelde
  // hoogte in één beeld 9-12 cm (#519: de hobbel van de bus). Nu loopt de
  // weging van dat punt glad naar nul, zodat het hoogstens met zijn eigen
  // gewicht meeschuift (ongeveer een centimeter). Geen demping op v.z: de
  // hoogte volgt de weg direct, anders loopt de auto op een helling achter en
  // haalt hij die later met een sprong in (dat zag drive_audit op de N370).
  let sum = 0, tot = 0;
  for (let i = 0; i < WB_OFFS.length; i++) {
    const d = WB_OFFS[i] * h;
    const q = rib && map.surfaceZ ? map.surfaceZ(v.x + c * d, v.y + s * d, z, rib) : map.groundHeightAt(v.x + c * d, v.y + s * d, z);
    // de oude tolerantie: een punt verder van het midden mag meer afwijken
    // (een helling), maar een punt op een andere bron valt erbuiten
    const tol = Math.abs(d) * 0.12 + 0.02;
    const t = Math.min(1, Math.abs(q - g) / tol);
    const w = WB_W[i] * (1 - t * t * (3 - 2 * t)); // smoothstep: 1 bij de weg, 0 op de drempel
    if (w <= 0) continue;
    sum += q * w;
    tot += w;
  }
  return tot > 1e-4 ? sum / tot : g;
}

// Body motion on its springs, driven by the car's own accelerations:
// braking dips the nose, pulling away squats the tail, cornering rolls the
// body towards the outside of the bend. Two-wheelers and boats skip it.
const SUS_K = 95;
const SUS_DAMP = 9;
function updateSuspension(v, dt) {
  if (v.isBike || v.isScooter || v.isBoat) return;
  const sp = v.speed;
  const prev = v._susSpeed ?? sp;
  const prevA = v._susAngle ?? v.angle;
  v._susSpeed = sp;
  v._susAngle = v.angle;
  if (v.parked && !sp && !v.susPitch && !v.susRoll && !v.susHeave) return;
  const aLong = clamp((sp - prev) / dt, -28, 28);
  const aLat = clamp(sp * normalizeAngle(v.angle - prevA) / dt, -22, 22);
  const soft = v.isBus ? 1.7 : v.model.name === 'van' ? 1.35 : v.model.name === 'sport' ? 0.6 : 1;
  const air = v.airborne ? 0 : 1;
  const tPitch = clamp(aLong * 0.0042 * soft, -0.065, 0.05) * air;
  const tRoll = clamp(-aLat * 0.0048 * soft, -0.085, 0.085) * air;
  const k = SUS_K / soft, c = SUS_DAMP / Math.sqrt(soft);
  v.susPitchV = (v.susPitchV || 0) + ((tPitch - (v.susPitch || 0)) * k - (v.susPitchV || 0) * c) * dt;
  v.susRollV = (v.susRollV || 0) + ((tRoll - (v.susRoll || 0)) * k - (v.susRollV || 0) * c) * dt;
  v.susHeaveV = (v.susHeaveV || 0) + (-(v.susHeave || 0) * k - (v.susHeaveV || 0) * c) * dt;
  v.susPitch = clamp((v.susPitch || 0) + v.susPitchV * dt, -0.12, 0.12);
  v.susRoll = clamp((v.susRoll || 0) + v.susRollV * dt, -0.14, 0.14);
  v.susHeave = clamp((v.susHeave || 0) + v.susHeaveV * dt, -0.14, 0.08);
  if (Math.abs(v.susPitch) + Math.abs(v.susRoll) + Math.abs(v.susHeave) < 1e-4 && Math.abs(v.susPitchV) + Math.abs(v.susRollV) + Math.abs(v.susHeaveV) < 1e-3) {
    v.susPitch = v.susRoll = v.susHeave = v.susPitchV = v.susRollV = v.susHeaveV = 0;
  }
}

// The buildings round a body, asked for with 3 m to spare and kept while the car stays within 1.5 m of where it
// was asked: the probes lie within halfLen + 0.5 of the centre, and a push-out moves the car by centimetres. A car
// asked the grid every frame (a list of arrays per car, ~250 queries a frame in a busy street).
const BODY_NEAR_SLACK = 3;
const BODY_NEAR_MOVE = 1.5;
let bodyNearMap = null, bodyNearEpoch = 0;
function buildingsAroundBody(v, map) {
  if (map !== bodyNearMap) { bodyNearMap = map; bodyNearEpoch++; }
  const c = v._bodyNear;
  if (c && c.epoch === bodyNearEpoch && c.r === v.halfLen && Math.abs(v.x - c.x) < BODY_NEAR_MOVE && Math.abs(v.y - c.y) < BODY_NEAR_MOVE) return c.list;
  const list = map.buildingsNear(v.x, v.y, v.halfLen + BODY_NEAR_SLACK);
  v._bodyNear = { epoch: bodyNearEpoch, x: v.x, y: v.y, r: v.halfLen, list };
  return list;
}

// A body corner that has penetrated a footprint is pushed out along the
// nearest wall's normal; the impulse removes only the into-wall velocity
// (plus friction), so a glancing scrape slides along while a head-on stops
// dead, and an off-centre hit swings the car round. dt is unused but kept
// for callers.
const _cp = { x: 0, y: 0 };
export function resolveVehicleBuildingCollision(v, map, dt) {
  // a helicopter keeps its own height and walls (heliflight.js)
  if (v.isHeli || (v.parked && !v.speed && !v.driftX && !v.driftY && !v.yawVel)) return false;
  settleVehicleHeight(v, map, dt);
  let hit = false, worst = 0, hx = 0, hy = 0;
  const light = v.isBike || v.isScooter;
  const count = probeCount(v);
  // up on a viaduct or down in the cutting nothing at street level is in the way
  const offLevel = (v.z || 0) > 4 || (v.z || 0) < -3.5;
  const near = offLevel ? null : buildingsAroundBody(v, map);
  // Ommeland solids (barns, real buildings, silos, village furniture, trunks):
  // one circle round the whole body first: the corner tests only run beside one
  let country = false, rails = false;
  if (!offLevel && !v.isBoat && countryWeight(v.x, v.y) > 0.5) {
    const reach = v.halfLen + 0.6;
    _cp.x = v.x; _cp.y = v.y;
    country = pushOutOfPlan(_cp, reach);
    if (!country) { _cp.x = v.x; _cp.y = v.y; country = pushOutOfTrunks(_cp, reach); }
    rails = countryRailsNear(v.x, v.y, reach + 1).length > 0;
  }
  for (let k = 0; k < count; k++) {
    const c = collisionProbe(v, k);
    if (rails) {
      // a bridge railing: the corner stays on the deck side, where the body's centre is
      _cp.x = c[0]; _cp.y = c[1];
      const rh = pushOutOfRails(_cp, 0.05, v.x, v.y);
      if (rh) {
        const ddx = _cp.x - c[0], ddy = _cp.y - c[1], d = Math.hypot(ddx, ddy);
        v.x += ddx + rh.nx * 0.03;
        v.y += ddy + rh.ny * 0.03;
        const slide = tangentialSpeed(v, null, rh.nx, rh.ny);
        const vn = contactImpulse(v, null, c[0], c[1], -rh.nx, -rh.ny, WALL_FRICTION);
        if (vn >= IMPACT_EVENT_SPEED || slide > SCRAPE_SPEED) recordContact(v, null, rh.x, rh.y, -rh.nx, -rh.ny, vn, slide);
        if (vn > worst) { worst = vn; hx = rh.x; hy = rh.y; }
        if (d > 0) hit = true;
      }
    }
    if (country) {
      _cp.x = c[0]; _cp.y = c[1];
      const inPlan = pushOutOfPlan(_cp, 0.05), onTrunk = pushOutOfTrunks(_cp, 0.05);
      if (inPlan || onTrunk) {
        const ddx = _cp.x - c[0], ddy = _cp.y - c[1], d = Math.hypot(ddx, ddy) || 0.01;
        const nx = ddx / d, ny = ddy / d;
        v.x += nx * (d + 0.03);
        v.y += ny * (d + 0.03);
        const slide = tangentialSpeed(v, null, nx, ny);
        const vn = contactImpulse(v, null, c[0], c[1], -nx, -ny, WALL_FRICTION);
        if (vn >= IMPACT_EVENT_SPEED || slide > SCRAPE_SPEED) recordContact(v, null, _cp.x, _cp.y, -nx, -ny, vn, slide);
        if (vn > worst) { worst = vn; hx = _cp.x; hy = _cp.y; }
        hit = true;
      }
    }
    for (const b of near || []) {
      const [minx, miny, maxx, maxy] = b.bounds;
      if (c[0] < minx || c[0] > maxx || c[1] < miny || c[1] > maxy) continue;
      // building passages (passages.js) are open, the rest of the footprint is wall
      if (!pointInPolygon(c[0], c[1], b.pts) || inPassage(map, b, c[0], c[1], light ? 0 : 0.35, light ? 'bike' : 'car')) continue;
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
    const rc = v.isBoat || v.sinking ? null : (map.elev ? (map.terrainOn ? map.wallContact(c[0], c[1], v.z || 0, 1.4, v.driver === 'player') : elevWallContact(map.elev, c[0], c[1], v.z || 0, 1.4, v.driver === 'player')) : null);
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
  // the round props of the wereldeinden and dorpsuitjes against the whole
  // body box, so a post between the headlights stops the car too
  if (!offLevel && !v.isBoat) {
    const xs = planExtraSolids();
    if (xs.length) {
      const c = Math.cos(v.angle), sn = Math.sin(v.angle);
      for (const q of xs) {
        const dx = q.x - v.x, dy = q.y - v.y, reach = v.halfLen + q.r;
        if (Math.abs(dx) > reach || Math.abs(dy) > reach) continue;
        const lu = dx * c + dy * sn, lv = -dx * sn + dy * c;
        const cu = clamp(lu, -v.halfLen, v.halfLen), cv = clamp(lv, -v.halfWid, v.halfWid);
        let eu = lu - cu, ev = lv - cv, d = Math.hypot(eu, ev), pen;
        if (d > 1e-4) { pen = q.r - d; eu /= d; ev /= d; } else {
          // centre inside the box: out through the nearest side
          const o = [[v.halfLen - lu, 1, 0], [lu + v.halfLen, -1, 0], [v.halfWid - lv, 0, 1], [lv + v.halfWid, 0, -1]].sort((a, b) => a[0] - b[0])[0];
          eu = o[1]; ev = o[2]; pen = q.r + o[0];
        }
        if (pen <= 0) continue;
        // n: from the prop towards the car
        const nx = -(eu * c - ev * sn), ny = -(eu * sn + ev * c);
        v.x += nx * (pen + 0.02);
        v.y += ny * (pen + 0.02);
        const px = q.x - nx * q.r, py = q.y - ny * q.r;
        const slide = tangentialSpeed(v, null, nx, ny);
        const vn = contactImpulse(v, null, px, py, -nx, -ny, WALL_FRICTION);
        if (vn >= IMPACT_EVENT_SPEED || slide > SCRAPE_SPEED) recordContact(v, null, px, py, -nx, -ny, vn, slide);
        if (vn > worst) { worst = vn; hx = px; hy = py; }
        hit = true;
      }
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
  const booms = vehicleHooks.loweredBoomsNear(v.x, v.y, v.halfLen + 8).concat(loweredBridgeBoomsNear(v.x, v.y, v.halfLen + 8));
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
      vehicleHooks.snapBoom(b);
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
  const out = pushCircleOutOfCapsule(x, y, radius, v, vehicleCapsule(v));
  if (out || !v.model.trailer) return out;
  return pushCircleOutOfCapsule(x, y, radius, v, busTrailerPose(v).cap);
}

function pushCircleOutOfCapsule(x, y, radius, v, cap) {
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

const SPARK_CHIP_GEO = new THREE.BoxGeometry(0.05, 0.05, 0.05);
const SPARK_DEBRIS_GEO = new THREE.BoxGeometry(0.08, 0.08, 0.08);
SPARK_CHIP_GEO.userData.shared = SPARK_DEBRIS_GEO.userData.shared = true;
export function buildVehicleImpactSparkMesh3D() {
  const group = new THREE.Group();
  const chips = [];
  const n = 7;
  // every chip of a burst fades alike: one material per colour per burst
  const mats = [new THREE.MeshBasicMaterial({ color: 0xffb347, transparent: true }), new THREE.MeshBasicMaterial({ color: 0x2b2b2b, transparent: true })];
  for (let i = 0; i < n; i++) {
    const fiery = i % 2 === 0;
    const chip = new THREE.Mesh(fiery ? SPARK_CHIP_GEO : SPARK_DEBRIS_GEO, mats[fiery ? 0 : 1]);
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
  mesh.userData.chips[0].material.opacity = mesh.userData.chips[1].material.opacity = 1 - t;
  for (const chip of mesh.userData.chips) {
    chip.position.x += chip.userData.vx * dt;
    chip.position.z += chip.userData.vz * dt;
    chip.userData.vy -= 9 * dt;
    chip.position.y = Math.max(0, chip.position.y + chip.userData.vy * dt);
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
  if (v.health <= VEHICLE_FIRE_HEALTH_THRESHOLD) return true;
  return smokes(v);
}

// Damaged but not yet burning (vehicledamage.js, #205): only the smoke of the effect, no flames.
const smokes = (v) => !v.isBike && !v.isScooter && !v.isBoat && !v.isHeli && !v.sinking && (v.health <= SMOKE_HEALTH || kapRookt(v, v.model.len, v.model.wid));
export function vehicleSmokeOnly(v) {
  return !v.wrecked && !v.disabled && v.health > VEHICLE_FIRE_HEALTH_THRESHOLD && smokes(v);
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
  const tongues = [];
  for (const [x, z, s] of [[0.16, 0.1, 0.7], [-0.12, -0.14, 0.8], [0.02, 0.2, 0.55]]) {
    const t = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.42, 5), new THREE.MeshBasicMaterial({ color: 0xffb030, transparent: true, opacity: 0.8 }));
    t.position.set(x, 0.2, z);
    t.scale.setScalar(s);
    t.userData.base = s;
    t.userData.phase = x * 17 + z * 5;
    group.add(t);
    tongues.push(t);
  }
  group.userData.tongues = tongues;

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
  for (const tg of mesh.userData.tongues || []) {
    const b = tg.userData.base, ph = tg.userData.phase;
    tg.scale.set(b * (0.85 + Math.sin(t * 15 + ph) * 0.15), b * (0.8 + Math.sin(t * 19 + ph * 1.7) * 0.3), b);
  }

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

// Fireball: a white flash, a cluster of additive fire blobs that swell,
// rise and cool from yellow to deep red, a ground shockwave ring and a few
// burning chunks. The smoke column, debris and sparks come from fx3d's pools
// (spawnExplosionFx), the camera shake from world.lastImpact.
const EXPLOSION_LIFETIME = 1.6;
const FIRE_BLOBS = 7;
const _fireCol = new THREE.Color();
const FIRE_HOT = new THREE.Color(0xffe07a), FIRE_MID = new THREE.Color(0xff6a12), FIRE_COOL = new THREE.Color(0x3a1c14);

function additive(color, opacity) {
  return new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, fog: true });
}

export function buildVehicleExplosionMesh3D(scale = 1) {
  const group = new THREE.Group();
  group.scale.setScalar(scale);

  const flash = new THREE.Mesh(new THREE.SphereGeometry(1.4, 12, 8), additive(0xfff6d8, 1));
  flash.position.y = 0.8;
  group.add(flash);
  group.userData.flash = flash;

  const blobGeo = new THREE.IcosahedronGeometry(1, 1);
  const blobs = [];
  for (let i = 0; i < FIRE_BLOBS; i++) {
    // solid, saturated blobs (additive ones wash out to white in daylight)
    const b = new THREE.Mesh(blobGeo, new THREE.MeshBasicMaterial({ color: 0xffc060, transparent: true, opacity: 0.92, depthWrite: false, fog: true }));
    b.renderOrder = 4;
    const a = (i / FIRE_BLOBS) * Math.PI * 2 + Math.random() * 0.8;
    const r = i === 0 ? 0 : 0.5 + Math.random() * 0.9;
    b.userData.dx = Math.cos(a) * r;
    b.userData.dz = Math.sin(a) * r;
    b.userData.rise = 1.4 + Math.random() * 2.2;
    b.userData.size = (i === 0 ? 1.9 : 1.0 + Math.random() * 0.9);
    b.userData.delay = i === 0 ? 0 : Math.random() * 0.12;
    b.position.set(b.userData.dx * 0.3, 0.7, b.userData.dz * 0.3);
    b.scale.setScalar(0.01);
    group.add(b);
    blobs.push(b);
  }
  group.userData.blobs = blobs;

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.85, 1, 40),
    new THREE.MeshBasicMaterial({ color: 0xfff0d0, transparent: true, opacity: 0.7, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -16 }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = -0.12;
  group.add(ring);
  group.userData.ring = ring;

  const chips = [];
  const n = 12;
  for (let i = 0; i < n; i++) {
    const fiery = i % 3 === 0;
    const mat = new THREE.MeshBasicMaterial({ color: fiery ? 0xff6a1a : 0x1a1a1a, transparent: true });
    const chip = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.16), mat);
    const a = (i / n) * Math.PI * 2 + Math.random() * 0.4;
    const elevation = 0.8 + Math.random() * 1.1;
    const speed = 4 + Math.random() * 5;
    chip.userData.vx = Math.cos(a) * speed;
    chip.userData.vz = Math.sin(a) * speed;
    chip.userData.vy = elevation * speed;
    chip.position.y = 0.6;
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
  const age = mesh.userData.age;
  const t = age / EXPLOSION_LIFETIME;
  if (t >= 1) return false;

  const flash = mesh.userData.flash;
  flash.material.opacity = Math.max(0, 1 - age / 0.12);
  flash.scale.setScalar(1 + age * 7);
  flash.visible = flash.material.opacity > 0;

  for (const b of mesh.userData.blobs) {
    const u = b.userData;
    const k = clamp((age - u.delay) / (EXPLOSION_LIFETIME - u.delay), 0, 1);
    if (k <= 0) continue;
    const grow = 1 - Math.pow(1 - Math.min(1, k * 3.2), 3);
    b.scale.setScalar(u.size * (0.25 + 0.95 * grow) * (1 + k * 0.4));
    b.position.set(u.dx * (0.3 + grow * 0.9), 0.7 + u.rise * k * k * 2.2 + grow * 0.6, u.dz * (0.3 + grow * 0.9));
    if (k < 0.25) _fireCol.copy(FIRE_HOT).lerp(FIRE_MID, k / 0.25);
    else _fireCol.copy(FIRE_MID).lerp(FIRE_COOL, (k - 0.25) / 0.75);
    b.material.color.copy(_fireCol);
    b.material.opacity = 0.92 * Math.min(1, (1 - k) * 1.6);
  }

  const ring = mesh.userData.ring;
  const rk = Math.min(1, age / 0.5);
  ring.scale.setScalar(1 + rk * 13);
  ring.material.opacity = 0.7 * (1 - rk);
  ring.visible = rk < 1;

  for (const chip of mesh.userData.chips) {
    chip.position.x += chip.userData.vx * dt;
    chip.position.z += chip.userData.vz * dt;
    chip.userData.vy -= 10 * dt;
    chip.position.y = Math.max(-0.15, chip.position.y + chip.userData.vy * dt);
    if (chip.position.y <= -0.15) { chip.userData.vx *= 0.8; chip.userData.vz *= 0.8; chip.userData.vy = 0; }
    chip.rotation.x += dt * 9; chip.rotation.z += dt * 7;
    chip.material.opacity = 1 - t * t;
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
  // a helicopter only goes in once it is down on the canal
  if (v.isHeli && (v.z || 0) > 0.2) return false;
  if (v.airborne || !overOpenWater(map, v.x, v.y, v.z || 0)) return false;
  startVehicleFall(v, world);
  return true;
}

// Would something at (x, y, z) on the ground drop into the water here?
function onCarRoad(map, x, y) {
  for (const r of map.roadsNear(x, y, 8)) {
    if (r.cat === 'foot' || r.cat === 'cycle' || r.z) continue;
    for (let i = 0; i < r.pts.length - 1; i++) {
      const cp = closestPointOnSegment(x, y, r.pts[i][0], r.pts[i][1], r.pts[i + 1][0], r.pts[i + 1][1]);
      if (cp.dist2 <= (r.width / 2) ** 2 && !inMapWater(map, cp.x, cp.y)) return true;
    }
  }
  return false;
}

export function overOpenWater(map, x, y, z) {
  // the water rule with its walker/car vetoes: dry on a bridge, over the canal on a viaduct,
  // or under it through the aqueduct (waterlevels.js waterPolyAt)
  if (!waterPolyAt(map, x, y, z, BRIDGE_DRY)) return false;
  // water reaching over the edge of a dry road (a polygon's corner, the countryside's water field) is its embankment
  if (onCarRoad(map, x, y)) return false;
  // a ditch or shallows with a peil of their own are driven through, not sunk in
  return !shallowWater(map, x, y);
}

function startVehicleFall(v, world) {
  const pv = hoofdspeler(world).inVehicle;
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
  if (inMapWater(map, nx, ny)) { v.x = nx; v.y = ny; } else { s.vx = 0; s.vy = 0; }
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
    restWreck(v);
    if (s.byPlayer) markWreckedByPlayer(v, world);
    const fx = Math.cos(v.angle) * (v.halfLen || 1) * 0.6, fy = Math.sin(v.angle) * (v.halfLen || 1) * 0.6;
    world.particles.push({ kind: 'splash', x: v.x, y: v.y, until: world.time + SPLASH_LIFETIME });
    if (!s.small) world.particles.push({ kind: 'splash', x: v.x + fx, y: v.y + fy, until: world.time + SPLASH_LIFETIME });
    if (v.driver === 'player') {
      if (s.small) { hoofdspeler(world).ejectIntoWater(v, world); world.addMessage('Nat geworden!', 3); }
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
    hoofdspeler(world).ejectIntoWater(v, world);
    world.addMessage('Je auto is gezonken!', 3);
  }
  if (k < 1) return;
  sinkingVehicles.delete(v);
  v.sinking = null;
  v.sunk = true;
  if (v.driver === 'player') hoofdspeler(world).ejectIntoWater(v, world);
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






