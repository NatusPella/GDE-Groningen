// Analog pedals and stick steering for the driver (driving feel, 22-11). Pure rules, Node-safe,
// no DOM and no world: gamepad.js shapes the triggers and the stick with them, player.js turns the
// pedal axis into a throttle. A digital key (axis exactly -1, 0 or 1) comes out unchanged, so the
// keyboard drives exactly as before. No allocations: everything returns a number.
// Test: scripts/pedalfeel_test.mjs.

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

// --- triggers --------------------------------------------------------------------------
export const TRIGGER_DEAD = 0.12; // below this a resting finger does nothing
export const TRIGGER_FULL = 0.95; // a worn trigger that never reaches 1.0 still gives full gas

// Trigger travel (0..1) to pedal (0..1): 0 inside the dead zone, then rising from 0 again.
// The old mapping jumped from nothing to the raw value at the edge of the dead zone.
export function triggerPedal(v) {
  if (!(v > TRIGGER_DEAD)) return 0;
  return clamp((v - TRIGGER_DEAD) / (TRIGGER_FULL - TRIGGER_DEAD), 0, 1);
}

// Pedal axis for input.padAxis[1]: gas is negative (like W), brake positive (like S).
export function pedalAxis(gas, brake) {
  return triggerPedal(brake) - triggerPedal(gas);
}

// --- stick steering ----------------------------------------------------------------------
const STEER_EXPO = 0.45; // share of the cubic part: 0 is linear, 1 is fully cubic

// Expo curve for the steering stick: small deflections steer finer (lane changes at speed
// without sawing), full deflection is still full lock. Odd and monotonic.
export function stickSteerCurve(x, expo = STEER_EXPO) {
  if (!Number.isFinite(x)) return 0;
  const c = clamp(x, -1, 1);
  return c * (1 - expo) + c * c * c * expo;
}

// How fast the steering wheel follows the input (#1288). A digital key jumps from 0 to full lock, so the
// wheel eases after it (vehicle.js PLAYER_STEER_RATE, 5/s). A stick already gives a smooth value: the wheel
// may follow it more directly, otherwise a quick flick of the thumb arrives a quarter of a second late.
export const STICK_STEER_RATE = 10; // 1/s: full lock from the centre in 0.1 s

// Is this steering input analog? A pad stick that is in use (padX not 0), or a value that a key never
// gives (a guest at the wheel sends his stick over the net as a fraction). A key is exactly -1, 0 or 1.
export function isAnalogSteer(ax, padX = 0) {
  if (Number.isFinite(padX) && padX !== 0) return true;
  return Number.isFinite(ax) && ax !== 0 && Math.abs(ax) !== 1;
}

// The follow rate for the wheel: a stick never follows slower than a key.
export function steerFollowRate(analog, digitalRate) {
  const d = Number.isFinite(digitalRate) ? digitalRate : 0;
  return analog ? Math.max(d, STICK_STEER_RATE) : d;
}

// --- feathering the throttle ---------------------------------------------------------------
const FEATHER_BAND = 0.12; // the last part of the cruising speed over which the gas eases off
const FULL_PEDAL = 0.98;   // a pedal that arrives rounded over the net (a guest at the wheel) still counts as full

// Share of the top speed that a partly pressed pedal holds: half a pedal cruises at about 71%.
export function pedalSpeedShare(p) {
  if (!(p > 0)) return 0;
  return p >= 1 ? 1 : Math.sqrt(p);
}

// Pedal axis (input.axis()[1]: negative is gas, positive is brake or reverse) to the throttle for
// applyControls (-1..1). A full pedal or a key gives exactly 1 or -1. A partly pressed pedal gives
// its own share of the engine and eases off towards the cruising speed that belongs to it, so the
// car holds a speed instead of creeping to its top. Against the direction of travel the pedal is a
// brake: the amount goes through unchanged (applyControls brakes proportionally).
// speed: signed m/s; top: forward top speed in m/s; reverseFactor: share of top in reverse.
export function pedalThrottle(ay, speed = 0, top = 0, reverseFactor = 0.25) {
  if (!Number.isFinite(ay) || ay === 0) return 0;
  const dir = ay < 0 ? 1 : -1;
  const p = Math.abs(ay);
  if (p >= FULL_PEDAL) return dir;
  const s = Number.isFinite(speed) ? speed : 0;
  if (s * dir < -0.3 || !(top > 0)) return dir * p; // braking, or no known top speed
  const cruise = (dir > 0 ? top : top * reverseFactor) * pedalSpeedShare(p);
  const room = (cruise - s * dir) / (cruise * FEATHER_BAND);
  return dir * p * clamp(room, 0, 1);
}
