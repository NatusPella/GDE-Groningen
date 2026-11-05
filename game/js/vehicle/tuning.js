// De prestatie-afstelling van de speler (#497), uit vehicle.js gehaald: de
// snelheden, acceleratie, remkracht, rolweerstand en de draaisnelheid per
// voertuigsoort. Pure functies op het voertuig/de modelstaat.
import { MODS } from '../cheatmods.js';
import { MOPED_LEGAL_SPEED } from '../motomodels.js';
import { setSpeedCap } from '../breakables.js';

// Two-wheelers and boats are tuned for the player separately from the AI
// fleet's cruising speeds (m/s): a bike does a brisk 25 km/h (Shift: ~33),
// the step 25, the brommer 45, and the tuned e-fatbike is the fastest of all
// (50, Shift ~58). The city bus is heavy for the player but keeps up with
// town traffic. Cars take the model's accel times PLAYER_CAR_ACCEL.
const BIKE_SPRINT_TOP = 1.3;
const FATBIKE_SPRINT_TOP = 1.15;
const BIKE_SPRINT_ACCEL = 1.8;
const PLAYER_CAR_ACCEL = 0.5;
const BOAT_CANAL_TOP = 14; // m/s: what a fast boat may do in a narrow canal
const MAX_CAR_SPEED = 76; // m/s (~275 km/h): even a turbo-tuned sports car stops here

export function playerTune(v) {
  const m = v.model;
  // v.sailTop: a sailing boat's top speed from the wind (postgame skûtsje-sprint)
  if (v.isBoat && v.sailTop != null) return { top: v.sailTop, accel: m.accel, brake: m.brake };
  // boats: model.playerTop/playerAccel (boattypes.js), scaled by the werf's
  // upgrades; the fast ones only open up where the water is wide (v.openWater)
  if (v.isBoat) {
    const b = v._baseModel || m;
    const up = m.maxSpeed / (b.maxSpeed || m.maxSpeed), upA = m.accel / (b.accel || m.accel);
    let top = (b.playerTop ?? Math.max(b.maxSpeed, 9.5)) * up;
    if (top > BOAT_CANAL_TOP) top = BOAT_CANAL_TOP + (top - BOAT_CANAL_TOP) * (v.openWater ?? 1);
    const rondvaart = m.kind === 'rondvaart';
    return { top, accel: (b.playerAccel ?? Math.max(b.accel, 3.2)) * upA, brake: Math.max(m.brake, rondvaart ? 2.3 : 3.8) * Math.max(1, top / 14) };
  }
  if (v.isBus) return { top: 21, accel: 2.9, brake: 7 };
  // shop upgrades scale the two-wheelers' player tuning too
  const b = v._baseModel;
  const up = b ? m.maxSpeed / b.maxSpeed : 1, upA = b ? m.accel / b.accel : 1;
  if (v.isScooter && m.motorbike) return { top: m.maxSpeed * (b ? up : 1), accel: m.accel * (b ? upA : 1), brake: m.brake };
  if (v.isScooter && m.geared) return { top: MOPED_LEGAL_SPEED * up, accel: m.accel * upA, brake: 8 };
  if (v.isScooter && m.moped) return { top: 12.5 * up, accel: 4.2 * upA, brake: 8 };
  if (v.isScooter) return { top: 7 * up, accel: 4.5 * upA, brake: 6.5 };
  // Shift on a bike: a short sprint of harder pedalling (player.js sprintT)
  const sprint = v.isBike && v.sprintT > 0 ? (m.fat ? FATBIKE_SPRINT_TOP : BIKE_SPRINT_TOP) : 1, sprintA = sprint > 1 ? BIKE_SPRINT_ACCEL : 1;
  if (v._mount === 'horse') return { top: (v.sprintT > 0 ? 13 : 7.5) * up, accel: (v.sprintT > 0 ? 5.5 : 3.4) * upA, brake: 7 };
  if (v.isBike) return m.fat ? { top: 13.9 * up * sprint, accel: 6 * upA * sprintA, brake: 9 } : { top: 7 * up * sprint, accel: 3.6 * upA * sprintA, brake: 8.5 };
  if (MODS.turbo && v.isHeroCar) return { top: Math.min(m.maxSpeed * 1.6, MAX_CAR_SPEED + 12), accel: m.accel * 1.9 * PLAYER_CAR_ACCEL, brake: m.brake * 1.2 };
  return { top: Math.min(m.maxSpeed, MAX_CAR_SPEED), accel: m.accel * PLAYER_CAR_ACCEL, brake: m.brake };
}

// The top speed the player gets out of a model (garage and shop bars):
// base is the stock model when `model` carries upgrades.
export function playerTopSpeed(model, base = model) {
  const n = model.name;
  const v = { model, _baseModel: base, isBike: n === 'bike', isScooter: n === 'scooter', isBoat: n === 'boat', isBus: n === 'bus' || n === 'midibus', sprintT: 0 };
  return playerTune(v).top;
}

export function speedCap(v) {
  const t = v.driver === 'player' ? playerTune(v) : null;
  return t ? t.top : v.model.maxSpeed;
}
setSpeedCap(speedCap);

// Rolling resistance + engine braking off the throttle (m/s^2). The AI's
// flat value is what its speed controller was tuned against.
export function coastDrag(v, isPlayer, s) {
  // a burnt-out engine or a car bailed out of rolls on for a good while
  if (!isPlayer) return v.rollingFree || v.disabled ? 0.9 + 0.05 * s : 3.2;
  if (v.isBoat) return 0.45 + 0.05 * s;
  if (v.isBike || v.isScooter) return 0.8 + 0.06 * s;
  if (v.isBus) return 1.1 + 0.05 * s;
  if (v.disabled) return 0.8 + 0.04 * s;
  return 1.6 + 0.09 * s;
}

function minTurnRadius(m, player = false) {
  // a 12 m bus turns on about a 21 m circle kerb to kerb, a midibus tighter
  if (m.name === 'bus') return player ? 10.5 : 9;
  if (m.name === 'midibus' && player) return 8.5;
  if (m.name === 'bike' || m.name === 'scooter') return 1.8;
  if (m.name === 'motor') return 3.2;
  // a long tour boat or barge turns on its own length or so (rudder and bow thruster)
  if (m.name === 'boat') return m.len > 10 ? Math.max(11.5, m.len * 0.78) : Math.min(m.len * 1.25, 5.5);
  return m.len * 1.25;
}

// Sideways acceleration the tyres hold before the turn rate is capped -
// this is what makes steering speed-dependent (tight at walking pace, wide
// arcs at speed) instead of a constant rad/s at every speed.
export function lateralGrip(m, player = false) {
  // a bus tips past about 0.4 g; the player's stays just under it
  if (m.name === 'bus') return player ? 3.9 : 4.5;
  if (m.name === 'midibus' && player) return 3.9;
  if (m.name === 'bike' || m.name === 'scooter') return player ? 11 : 5;
  if (m.name === 'motor') return player ? 17 : 8;
  if (m.name === 'boat') return player ? 5.5 : 2.5;
  return player ? 23 : 16;
}

// tightTurn: AI turning round at a dead end or hairpin gets a shorter
// radius instead of a multi-point turn - at walking pace nobody notices.
export function maxYawRate(v, speed = v.speed) {
  const s = Math.abs(speed);
  if (s < 1e-3) return 0;
  const player = v.driver === 'player';
  const radius = minTurnRadius(v.model, player) * (v.tightTurn && !player ? 0.45 : 1);
  const grip = lateralGrip(v.model, player) * (player ? 0.45 + 0.55 * (v.gripK ?? 1) : 1) * (player && v.model.motorbike && v.bikeAssist === false ? 0.78 : 1);
  return Math.min(s / radius, v.model.turnRate, grip / s);
}

export function maxCurvature(v) {
  const s = Math.abs(v.speed);
  return s > 0.5 ? maxYawRate(v) / s : 1 / (minTurnRadius(v.model, v.driver === 'player') * (v.tightTurn && v.driver !== 'player' ? 0.45 : 1));
}
