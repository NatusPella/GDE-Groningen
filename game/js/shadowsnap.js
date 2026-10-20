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
// On a machine that keeps up (cpuLevel 0) the shadow map is also left alone
// every other frame while the focus walks and nothing fast moves in the
// shadow area (`calm`): a shadow that is one frame (16 ms) behind is 5 cm off
// at walking pace, about a texel.
const SHADOW_CALM_MAX_SPEED = 3.5; // m/s, just over the default walking pace (3.0)
export function shadowPassSkipped(cpuLvl, frameCounter, focusSpeed, calm = false) {
  if ((frameCounter & 1) !== 1) return false;
  return cpuLvl > 0 ? focusSpeed < SHADOW_SKIP_MAX_SPEED : calm && focusSpeed < SHADOW_CALM_MAX_SPEED;
}

// How far past the screen edge an actor still has to be drawn: its shadow falls
// into view. `dir` is the unit vector towards the sun; a caster of `height` m
// throws its shadow height / tan(elevation) m along the ground, clamped to
// `max`, plus a fixed `pad` for the animation and the body.
export function actorShadowReach(dir, height = 3, pad = 3, max = 30) {
  const horizontal = Math.hypot(dir.x, dir.z);
  const reach = dir.y <= 0.05 ? max : Math.min(max, height * horizontal / dir.y);
  return pad + reach;
}
