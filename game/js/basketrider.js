// Where somebody who rides in a hot-air balloon's basket stands (#167). Pure
// maths, no THREE: the rider is placed relative to the basket (its floor
// height b.z, its heading b.yaw, its swing), never with the helicopter's
// offsets. skyprops3d.js draws the basket on the mesh at (b.x, b.z, b.y) with
// rotation.y = b.yaw, a box of 1.4 x 1.2 m, rim at 1.12 m.

export const BASKET = { floor: 0.1, rim: 1.12, halfX: 0.7, halfZ: 0.6, margin: 0.22 };

// Places in the basket, in the mesh's local frame (x = its nose, z = its side).
export const SLOTS = [{ lx: -0.12, lz: 0.28 }, { lx: 0.12, lz: -0.28 }];

// The swing of a basket under its balloon: a slow pendulum, a little more when
// the burner fires. Radians, about 0.04 at most.
export function basketSway(age, burn = 0, seed = 0) {
  return (Math.sin(age * 0.9 + seed) * 0.022 + Math.sin(age * 1.7 + seed * 2.3) * 0.008) * (1 + 0.5 * burn);
}

// mesh-local (lx, lz) -> game (x, y), the way THREE's rotation.y = yaw maps them
// onto the world (game y is three's z).
export function localToWorld(b, lx, lz) {
  const c = Math.cos(b.yaw || 0), s = Math.sin(b.yaw || 0);
  return { x: b.x + lx * c + lz * s, y: b.y - lx * s + lz * c };
}

// The game heading of the basket's nose.
export const basketHeading = (b) => -(b.yaw || 0);

// The pose of the rider in `slot`: feet position (x, y, z), the sway angle and
// the direction (game heading) they face. `look` is where they look (a game
// heading, default the basket's nose); the body follows it, the rider keeps
// inside the rim.
export function basketRiderPose(b, slot = 0, look = null) {
  const sl = SLOTS[slot % SLOTS.length];
  const lx = Math.max(-BASKET.halfX + BASKET.margin, Math.min(BASKET.halfX - BASKET.margin, sl.lx));
  const lz = Math.max(-BASKET.halfZ + BASKET.margin, Math.min(BASKET.halfZ - BASKET.margin, sl.lz));
  const sway = basketSway(b.age || 0, b.burn || 0, b.seed || 0);
  const p = localToWorld(b, lx, lz);
  return { x: p.x, y: p.y, z: b.z + BASKET.floor, sway, heading: look == null ? basketHeading(b) : look };
}

// The signed angle in (-PI, PI] from heading a to heading b.
export function turnTo(a, b) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d <= -Math.PI) d += Math.PI * 2;
  return d;
}
