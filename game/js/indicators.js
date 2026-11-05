import { hoofdspeler } from './players.js';
// Turn signals and hazard lights. The player taps [ or ] (D-pad left/right) for
// a turn signal and P (D-pad up) for the hazards; a signal switches itself off
// after the turn. Other cars blink for a bend or a turn at a junction (read
// from how fast they swing). v.indicator is 'left', 'right' or 'hazard'; the
// lamps themselves are drawn by models3d_vehicles.js updateIndicatorLamps.

// the swing (radians) that counts as "the turn is done"
const TURN_DONE = 0.9;
// back to straight wheels after that, or a huge swing, or this long
const TURN_MAX = 1.6;
const TIMEOUT_S = 25;
// AI: a swing faster than this blinks, and keeps blinking a moment after it
const AI_RATE = 0.22;
const AI_HOLD_S = 1.6;
const AI_MIN_SPEED = 1.5;
const AI_RANGE = 130;

const norm = (a) => Math.atan2(Math.sin(a), Math.cos(a));

function canBlink(v) {
  return !!v && !v.isBoat && !v.isHeli && !v.isTrain && !v.wrecked && !v.sinking;
}

function setIndicator(v, kind) {
  v.indicator = kind || null;
  v.indTurned = 0;
  v.indAge = 0;
  v.indAngle = v.angle;
}

export function toggleIndicator(v, kind) {
  if (!canBlink(v)) return false;
  setIndicator(v, v.indicator === kind ? null : kind);
  return true;
}

// the player's own signals: taps, the swing counted, the switch-off
export function tickPlayerIndicator(v, dt, taps = {}) {
  if (!canBlink(v)) return;
  if (taps.left) toggleIndicator(v, 'left');
  else if (taps.right) toggleIndicator(v, 'right');
  else if (taps.hazard) toggleIndicator(v, 'hazard');
  if (v.indicator !== 'left' && v.indicator !== 'right') return;
  const sign = v.indicator === 'right' ? 1 : -1;
  v.indAge += dt;
  const d = norm(v.angle - (v.indAngle ?? v.angle));
  v.indAngle = v.angle;
  v.indTurned = Math.max(0, (v.indTurned || 0) + d * sign);
  const straight = Math.abs(v.steer || 0) < 0.12;
  if ((v.indTurned >= TURN_DONE && straight) || v.indTurned >= TURN_MAX || v.indAge > TIMEOUT_S) setIndicator(v, null);
}

// other cars: blink while swinging, a moment longer after it
function tickAiIndicator(v, dt) {
  const last = v.indAngle ?? v.angle;
  v.indAngle = v.angle;
  if (v.indicator === 'hazard') return;
  const rate = dt > 0 ? norm(v.angle - last) / dt : 0;
  if (Math.abs(v.speed || 0) > AI_MIN_SPEED && Math.abs(rate) > AI_RATE) {
    v.indicator = rate > 0 ? 'right' : 'left';
    v.indHold = AI_HOLD_S;
  } else if (v.indicator) {
    v.indHold = (v.indHold || 0) - dt;
    if (v.indHold <= 0) v.indicator = null;
  }
}

export function updateIndicators(dt, world) {
  const p = hoofdspeler(world);
  const pv = p && p.inVehicle;
  const input = world.input;
  if (pv && pv.driver === 'player' && canBlink(pv)) {
    const live = input && !world.paused && !world.uiPaused;
    tickPlayerIndicator(pv, dt, live ? {
      left: input.wasPressed('['), right: input.wasPressed(']'), hazard: input.wasPressed('p'),
    } : {});
  }
  for (const v of world.vehicles) {
    if (v === pv || !canBlink(v)) continue;
    if (Math.abs(v.x - p.x) + Math.abs(v.y - p.y) > AI_RANGE * 1.5) { if (v.indicator && v.indicator !== 'hazard') v.indicator = null; continue; }
    if (v.driver === 'player') continue;
    tickAiIndicator(v, dt);
  }
}


