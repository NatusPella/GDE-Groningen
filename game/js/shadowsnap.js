// Pure maths for the sun's shadow frustum (scene3d.js updateSunAndSky).
// Vectors are plain {x,y,z}; right/up/dir are unit light-space axes.

// Snap a frustum centre to whole shadow-map texels along the light's right
// and up axes; the depth along dir is left alone (it does not move the map).
export function snapShadowCenter(c, right, up, dir, texel) {
  const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
  const r = Math.round(dot(c, right) / texel) * texel;
  const u = Math.round(dot(c, up) / texel) * texel;
  const d = dot(c, dir);
  return {
    x: right.x * r + up.x * u + dir.x * d,
    y: right.y * r + up.y * u + dir.y * d,
    z: right.z * r + up.z * u + dir.z * d,
  };
}

// A busy CPU (cpuLevel 1+) renders the shadow map every other frame. A fast
// mover (the player's car) would then trail its shadow by a frame on every
// skipped frame and the shadow visibly hops, so skipping is only allowed
// while the focus is nearly still.
const SHADOW_SKIP_MAX_SPEED = 2.5; // m/s
export function shadowPassSkipped(cpuLvl, frameCounter, focusSpeed) {
  return cpuLvl > 0 && focusSpeed < SHADOW_SKIP_MAX_SPEED && (frameCounter & 1) === 1;
}
