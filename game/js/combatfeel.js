// Shooting feel: how steady a shot is for the stance of the shooter, and the short hit
// confirmation over what a bullet of the player behind this screen touched. Pure rules,
// Node-safe, no THREE or world; combat.js feeds them and aimassist.js draws the marker.

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

// --- steadiness ------------------------------------------------------------------
// Factor on the random spread of a shot and on the camera kick. Crouched and still is
// the steadiest, a sprint the wildest; from a vehicle nothing changes (1).
export const STEADY = { crouch: 0.5, still: 0.75, walk: 1, sprint: 1.7 };
const STILL_SPEED = 0.5, WALK_SPEED = 3.2, SPRINT_SPEED = 6.4; // m/s, around the paces of player.js

export function steadiness(speed = 0, crouching = false, inVehicle = false) {
  if (inVehicle) return 1;
  const s = Math.abs(speed);
  if (!(s > STILL_SPEED)) return crouching ? STEADY.crouch : STEADY.still; // also NaN: treat as still
  if (crouching) return STEADY.still; // creeping along
  if (s <= WALK_SPEED) return STEADY.still + (STEADY.walk - STEADY.still) * (s - STILL_SPEED) / (WALK_SPEED - STILL_SPEED);
  return STEADY.walk + (STEADY.sprint - STEADY.walk) * clamp((s - WALK_SPEED) / (SPRINT_SPEED - WALK_SPEED), 0, 1);
}

// The kick follows the stance less strongly than the spread: a sprint must not throw the view away.
export const kickFactor = (steady) => clamp(0.4 + 0.6 * steady, 0.7, 1.25);

// --- hit marker --------------------------------------------------------------------
export const HIT_MARK_S = 0.22;   // total time on screen
const HIT_POP_S = 0.07;           // the ticks start a little wide and close in
const HIT_POP_SCALE = 1.35;

export function makeHitMark() { return { at: -99, x: 0, y: 0, z: 0, kind: '' }; }

// kind: 'doel' (a person or another player) or 'voertuig'. Reuses the state object: no allocation per bullet.
export function markHit(m, now, x, y, z, kind = 'doel') {
  m.at = now; m.x = x; m.y = y; m.z = z; m.kind = kind;
  return m;
}

// #1290: a guest's bullets live on the host, so the host tells the shooter where his bullet hit (message 'raak',
// coopnet.js). Pure: the message body for the net, and the check on the guest's side. At most one per HIT_NET_GAP s
// per shooter (an uzi would otherwise send a message per bullet); a mark only shows for a person or a vehicle.
export const HIT_NET_GAP = 0.08;
const HIT_KINDS = ['doel', 'voertuig'];
export function hitNetBody(x, y, z, kind) {
  if (![x, y, z].every(Number.isFinite) || !HIT_KINDS.includes(kind)) return null;
  const r = (v) => Math.round(v * 10) / 10;
  return { k: 'raak', x: r(x), y: r(y), z: r(z), soort: kind };
}
export function hitFromNet(body) {
  if (!body || ![body.x, body.y, body.z].every(Number.isFinite) || !HIT_KINDS.includes(body.soort)) return null;
  return { x: body.x, y: body.y, z: body.z, kind: body.soort };
}
export function hitNetDue(lastAt, now) {
  return !Number.isFinite(lastAt) || now - lastAt >= HIT_NET_GAP || now < lastAt;
}

export const hitMarkActive = (m, now) => !!m && now >= m.at && now - m.at < HIT_MARK_S;

// Opacity 0..1: full during the pop, then a straight fade.
export function hitMarkOpacity(m, now) {
  if (!hitMarkActive(m, now)) return 0;
  const t = now - m.at;
  return t <= HIT_POP_S ? 1 : clamp(1 - (t - HIT_POP_S) / (HIT_MARK_S - HIT_POP_S), 0, 1);
}

// Scale of the ticks; still = reduced motion: no movement, only the fade.
export function hitMarkScale(m, now, still = false) {
  if (still || !hitMarkActive(m, now)) return 1;
  const t = now - m.at;
  return t >= HIT_POP_S ? 1 : HIT_POP_SCALE - (HIT_POP_SCALE - 1) * (t / HIT_POP_S);
}
