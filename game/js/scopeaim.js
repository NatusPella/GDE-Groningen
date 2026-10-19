// The jachtgeweer's scope: scene3d.js puts the camera here and combat.js
// fires from here, along the same heading and level, so the shot lands
// exactly under the crosshair (no hand offset, spread or aim assist).
const SCOPE_EYE_H = 1.35; // above the player's feet
const SCOPE_EYE_FWD = 0.35; // just in front of the face

export function scopeEye(p, yaw, base) {
  return { x: p.x + Math.cos(yaw) * SCOPE_EYE_FWD, y: p.y + Math.sin(yaw) * SCOPE_EYE_FWD, z: base + SCOPE_EYE_H };
}

// Start and velocity of a scoped bullet (world x/y, height z).
export function scopeShot(p, yaw, base, speed) {
  const e = scopeEye(p, yaw, base);
  return { x: e.x, y: e.y, z: e.z, vx: Math.cos(yaw) * speed, vy: Math.sin(yaw) * speed };
}
