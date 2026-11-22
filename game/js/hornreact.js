// How the street answers a human driver: traffic ahead of a honking car makes way (or honks back),
// walkers in its path hurry aside, and a car that skims past a walker gets a fist shaken at it.
// Leaf module (no imports), pure geometry on plain fields, so vehicle/traffic.js and pedestrians.js
// can both read it and node can test it without a world (scripts/hornreact_test.mjs).
//
// Multiplayer: every vehicle with driver === 'player' counts, the host's and a guest's alike
// (coopbestuur.js puts a guest behind the wheel of a host vehicle). The host simulates the answer,
// guests see it through the normal entity snapshot (FL_HORN and positions).

// Traffic: how far ahead of the bumper a horn still reaches a driver, and how far sideways (same lane).
export const HORN_CAR_REACH = 26;
export const HORN_CAR_LAT = 3.2;
// A driver who makes way keeps rolling at this share of his cruise speed (never below HORN_ASIDE_MIN):
// slower than the honker, but not the near standstill of a siren yield.
export const HORN_ASIDE_SCALE = 0.65;
export const HORN_ASIDE_MIN = 5;
export const HORN_ASIDE_HOLD = 2.5;   // s the kerb-hugging lasts after the last honk
export const HORN_BACK_DELAY = 0.45;  // s before the stubborn driver answers
export const HORN_BACK_LEN = 0.5;     // s his answer lasts
export const HORN_BACK_COOLDOWN = 5;  // s before he answers again
// Walkers: reach ahead of the bumper and margin beside the body.
export const HORN_PED_REACH = 16;
export const HORN_PED_MARGIN = 1.7;
export const HORN_PED_SPEED = 3.4;
export const HORN_PED_SAY = 0.4;      // chance a walker who is honked aside says something about it
export const HORN_PED_COOLDOWN = 6;   // s between two remarks of the same walker
// Near miss: a car at this speed or more passing this close beside a walker startles him.
export const SKIM_SPEED = 9;
export const SKIM_GAP = 1.3;
export const SKIM_LOOK = 1.6;         // s he stands and looks after the car

const driven = [];
const honking = [];
let cacheT = NaN, cacheWorld = null;

function refresh(world) {
  if (cacheT === world.time && cacheWorld === world) return;
  cacheT = world.time; cacheWorld = world;
  driven.length = 0; honking.length = 0;
  const vs = world.vehicles;
  for (let i = 0; i < vs.length; i++) {
    const v = vs[i];
    if (v.driver !== 'player' || v.wrecked || v.sinking || v.isBoat) continue;
    driven.push(v);
    if (v.horn) honking.push(v);
  }
}

// Road vehicles a human drives right now (host and guests). Reused array: do not keep it.
export function drivenVehicles(world) { refresh(world); return driven; }
// The ones of those that honk (or ring a bell) this frame. Reused array: do not keep it.
export function hornSources(world) { refresh(world); return honking; }

// Three kinds of driver, fixed per vehicle so the same car answers the same way twice:
// most make way, some honk back and stay put, a few do not care.
export function hornTemper(id) {
  const k = ((id | 0) % 10 + 10) % 10;
  return k < 7 ? 'aside' : k < 9 ? 'honk' : null;
}

// What AI vehicle v does about honker src: 'aside' | 'honk' | null.
// Only a car right behind in the same lane, driving the same way, is meant; a bicycle bell moves no car.
export function hornCarResponse(v, src) {
  if (v === src || src.isBike || v.isPolice || v.sirenOn || v.isBus) return null;
  const dx = src.x - v.x, dy = src.y - v.y;
  const far = HORN_CAR_REACH + 10;
  if (dx * dx + dy * dy > far * far) return null;
  if (Math.abs((src.z || 0) - (v.z || 0)) > 3) return null;
  const fx = Math.cos(v.angle), fy = Math.sin(v.angle);
  const fwd = dx * fx + dy * fy, lat = Math.abs(dy * fx - dx * fy);
  if (fwd >= 0 || -fwd > HORN_CAR_REACH + (v.halfLen || 2) + (src.halfLen || 2) || lat > HORN_CAR_LAT) return null;
  if (Math.cos(src.angle - v.angle) < 0.5) return null;
  return hornTemper(v.id);
}

export function hornYield(v, world) {
  const list = hornSources(world);
  for (let i = 0; i < list.length; i++) {
    const r = hornCarResponse(v, list[i]);
    if (r) return r;
  }
  return null;
}

// Speed cap for a driver who makes way for a horn.
export function hornAsideSpeed(cruise) {
  return Math.max(HORN_ASIDE_MIN, cruise * HORN_ASIDE_SCALE);
}

// Heading (rad) a walker at (px, py) steps to, to get out of the path of vehicle v, or null when he
// is not in it. reach = metres ahead of the bumper, margin = metres beside the body.
export function pathDodgeHeading(px, py, v, reach, margin) {
  const fx = Math.cos(v.angle), fy = Math.sin(v.angle);
  const dx = px - v.x, dy = py - v.y;
  const fwd = dx * fx + dy * fy, lat = dy * fx - dx * fy;
  if (fwd < 0 || fwd > v.halfLen + reach || Math.abs(lat) > v.halfWid + margin) return null;
  const side = lat >= 0 ? 1 : -1;
  return Math.atan2(fx * side, -fy * side);
}

// Heading for a walker who hears a horn or bell coming up on his path, or null.
// A bell reaches half as far: a bicycle is slower and quieter.
export function hornPedDodge(px, py, src) {
  return pathDodgeHeading(px, py, src, src.isBike ? HORN_PED_REACH * 0.5 : HORN_PED_REACH, HORN_PED_MARGIN);
}

// True when vehicle v skims past a walker at (px, py): alongside the body, within SKIM_GAP of its flank,
// at SKIM_SPEED or more. A hit is not a skim (that is checkVehicleImpact's business): the gap starts at the flank.
export function skimsPast(px, py, v) {
  if (Math.abs(v.speed || 0) < SKIM_SPEED) return false;
  const dx = px - v.x, dy = py - v.y;
  const reach = v.halfLen + 1;
  if (Math.abs(dx) > reach + 2 || Math.abs(dy) > reach + 2) return false;
  const fx = Math.cos(v.angle), fy = Math.sin(v.angle);
  const fwd = dx * fx + dy * fy, lat = Math.abs(dy * fx - dx * fy);
  return Math.abs(fwd) <= reach && lat > v.halfWid + 0.25 && lat <= v.halfWid + SKIM_GAP;
}
