// De twee-wielerfysica van vehicle.js (#497): de motor leunt en doet wheelies/stoppies,
// de gewone fiets doet dat via bewegingsrules.js. Pure functies op het voertuig,
// zodat vehicle.js alleen glue blijft en deze regels los te testen zijn.
import { clamp } from '../util.js';
import { createWheelie, stepWheelie, HOP } from '../bewegingrules.js';

// Motorbike feel (player only): the bike leans into a turn (v.roll, drawn by scene3d.js) and the
// front wheel comes up on a wheelie or goes down on a stoppie while the trick key (Shift) is
// held. With the assist (setting bikeAssist) the lean is capped and a wheelie levels off; without
// it a wheelie held too long loops out, a lean past the limit is a low-side, and both throw the
// rider (v.crashed, handled in player.js).
export function rideMotorbike(v, dt, throttle, gb, top, absSpeed, yawRate) {
  const assist = v.bikeAssist !== false;
  const limit = assist ? 0.8 : 1.15;
  const lean = clamp(Math.atan2(yawRate * absSpeed * Math.sign(v.speed || 1), 9.81), -1.4, 1.4);
  v.roll += (clamp(lean, -limit, limit) - v.roll) * Math.min(1, dt * 7);
  let want = 0;
  const trick = !!v.trick && !v.disabled;
  if (trick && throttle > 0 && absSpeed > 2.5 && absSpeed < top * 0.6) {
    const gear = gb ? gb.gear : 1;
    const k = gb && gb.p.wheelie ? gb.p.wheelie * (gear === 1 ? 1 : gear === 2 ? 0.7 : gear === 3 ? 0.35 : 0) : 0;
    want = 0.62 * k;
  } else if (trick && throttle < 0 && absSpeed > 9) want = -0.3;
  const catchUp = Math.min(1, dt * (want > 0 ? 3.2 : 4));
  if (want > 0 && !assist) {
    v.wheelieT = (v.wheelieT || 0) + dt;
    v.pitch += (want * (1 + Math.max(0, v.wheelieT - 0.8) * 1.4) - v.pitch) * catchUp;
  } else {
    v.wheelieT = 0;
    v.pitch += (want - v.pitch) * catchUp;
  }
  if (!assist && (v.pitch > 1.3 || Math.abs(v.roll) >= limit - 0.001 && absSpeed > 8 && Math.abs(lean) > limit + 0.1)) v.crashed = true;
  v.wheelie = v.pitch > 0.2;
}

// Pedal bike (player only): Ctrl held while pedalling lifts the front wheel (bewegingrules.js, #207).
export function rideFiets(v, dt, throttle, top, brake = 0) {
  const w = v.wheelieState || (v.wheelieState = createWheelie());
  stepWheelie(w, { trick: !!v.trick && !v.disabled, throttle, brake, speed: v.speed, top, dt, airborne: !!v.airborne, steer: v.steer });
  if (w.hop && !v.airborne) { v.airborne = true; v.vz = HOP.vz; } // sprongetje (#207)
  v.pitch = w.pitch;
  v.wheelie = w.up;
  if (w.up) v.speed *= w.slow;
}
