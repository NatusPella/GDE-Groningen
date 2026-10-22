// Botsmeldingen en het contactlogboek van voertuigen: leaf-module, zodat breakables.js geen
// cyclus met vehicle.js vormt (#108). vehicle.js exporteert alles opnieuw.
import { clamp } from './util.js';

// Cars should survive a fair amount of reckless driving: every collision
// (cars, walls, props) does this fraction of its raw damage.
export const CRASH_DAMAGE_SCALE = 0.4;
// Fixed ring of recent contacts for effects/audio; readers keep their own
// cursor against `head` and skip what has been overwritten.
const CONTACT_CAP = 64;
export const vehicleContacts = {
  head: 0,
  cap: CONTACT_CAP,
  list: Array.from({ length: CONTACT_CAP }, () => ({ a: null, b: null, x: 0, y: 0, nx: 0, ny: 0, impact: 0, slide: 0 })),
};

export function recordContact(a, b, x, y, nx, ny, impact, slide) {
  const c = vehicleContacts.list[vehicleContacts.head % CONTACT_CAP];
  vehicleContacts.head++;
  c.a = a; c.b = b; c.x = x; c.y = y; c.nx = nx; c.ny = ny; c.impact = impact; c.slide = slide;
}

// Feedback hook: an 'impact' particle for effects, and world.lastImpact for
// camera shake when the player is involved. strength is 0..1.
export function reportImpact(world, x, y, closingSpeed, playerInvolved, other = null) {
  if (!world) return;
  const strength = clamp(closingSpeed / 14, 0, 1);
  world.particles.push({ kind: 'impact', x, y, strength, until: world.time + 0.4 });
  // other: the vehicle that was hit (a car against a car), so that pedestrians.js knows whether it was a police car (#391)
  if (playerInvolved) world.lastImpact = { strength, time: world.time, x, y, other };
}

