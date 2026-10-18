// Where the tile streamer looks (main.js frameBody -> map.follow).
//
// Contract: tileFocus(player, override, state, dt) returns { x, y, opts }.
//  - no camera override: the player; opts carries the speed and heading
//    (vx, vy m/s, capped at MAX_SPEED) for the prefetch.
//  - a camera override ({ position, lookAt } in map coordinates, as the
//    cutscenes and the title screen set them): the point the camera looks at,
//    at most LOOK_MAX from the eye (the same point scene3d.js streamFocus uses),
//    so tiles load round what is on screen, not round the hidden player.
//  - a jump (a cut, or the override starting or ending: more than CUT_M in one
//    frame) is not a speed: opts is {}, no heading prefetch from it.
// `state` is the caller's own { x, y } of last frame; it is updated here.
// A non-finite pose falls back to the player.

export const LOOK_MAX = 50;
export const MAX_SPEED = 80;
export const CUT_M = 150;

export function cameraFocus(o) {
  if (!o || !o.position || !o.lookAt) return null;
  const ex = o.position.x, ey = o.position.y, dx = o.lookAt.x - ex, dy = o.lookAt.y - ey;
  const d = Math.hypot(dx, dy), k = d > LOOK_MAX ? LOOK_MAX / d : 1;
  const x = ex + dx * k, y = ey + dy * k;
  return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
}

export function tileFocus(player, override, state, dt) {
  const f = cameraFocus(override) || player;
  if (!f || f.x === undefined || f.y === undefined || !Number.isFinite(f.x) || !Number.isFinite(f.y)) return null;
  const dtp = Math.max(dt, 1e-3);
  const vx = state.x !== undefined ? (f.x - state.x) / dtp : 0;
  const vy = state.y !== undefined ? (f.y - state.y) / dtp : 0;
  state.x = f.x; state.y = f.y;
  const cut = Math.hypot(vx, vy) * dtp > CUT_M;
  const c = (v) => Math.min(MAX_SPEED, Math.max(-MAX_SPEED, v));
  return { x: f.x, y: f.y, opts: cut ? {} : { vx: c(vx), vy: c(vy) } };
}
