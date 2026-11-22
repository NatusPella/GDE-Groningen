// On-foot weight: the walker eases into and out of its pace instead of switching between
// standing still and full speed in one frame. Pure rules, Node-safe, no THREE or world;
// player.js calls stepWalkVelocity every on-foot frame. The gait animation reads the real
// speed (scene3d.js animatePersonWalk with hypot(vx, vy)), so the stride shortens with the
// body while it speeds up or slows down and the feet do not slide.

export const WALK_ACCEL_RATE = 14; // 1/s: 90% of the pace after ~0.16 s
export const WALK_STOP_RATE = 20;  // 1/s: stopping is quicker than starting, so it never feels like ice
export const WALK_STOP_EPS = 0.12; // m/s: below this a stopping walker simply stands still

// Moves body.vx/vy toward the wanted velocity (tx, ty); pass 0, 0 for "no input".
// Writes in place and returns the new speed; never overshoots, and a broken dt or
// velocity (NaN) falls back to the wanted velocity so a walker can not get stuck.
export function stepWalkVelocity(body, tx, ty, dt) {
  const stopping = tx === 0 && ty === 0;
  if (!(dt > 0) || !Number.isFinite(body.vx) || !Number.isFinite(body.vy)) {
    body.vx = tx; body.vy = ty;
    return Math.hypot(tx, ty);
  }
  const k = 1 - Math.exp(-(stopping ? WALK_STOP_RATE : WALK_ACCEL_RATE) * dt);
  let vx = body.vx + (tx - body.vx) * k, vy = body.vy + (ty - body.vy) * k;
  if (stopping && vx * vx + vy * vy < WALK_STOP_EPS * WALK_STOP_EPS) { vx = 0; vy = 0; }
  body.vx = vx; body.vy = vy;
  return Math.hypot(vx, vy);
}

// Distance still covered after letting go at this speed (the integral of the decay): for tests and tuning.
export const stopDistance = (speed) => Math.abs(speed) / WALK_STOP_RATE;
