// The searchlight of the coast guard boat in M11 (docs/verhaal/nieuw 02-akte2, "sluipen langs de kustwacht"):
// where the beam points, who stands in it and how fast someone is noticed. Pure, no imports; the
// scene and the boat are searchlight.js, the stage that uses it is missions.js (`light` on a stage).
//   light { x, y, from, to, speed, range, half, rate, crouchRate, decay }
//     x, y        the boat (world m)
//     from, to    the arc the beam sweeps to and fro (radians, world angle: 0 = +x, y points south)
//     speed       sweep speed (rad/s)
//     range, half length of the beam (m) and its half-width (rad)
//     rate        how much of the "gezien" meter a second in the beam fills when standing (crouching: crouchRate)
//     decay       how much the meter empties a second outside the beam

export const LIGHT_DEFAULTS = { speed: 0.3, range: 480, half: 0.17, rate: 0.75, crouchRate: 0.25, decay: 0.35 };

export function sweepAngle(L, t) {
  const mid = (L.from + L.to) / 2, amp = Math.abs(L.to - L.from) / 2;
  if (amp < 0.01) return mid;
  return mid + amp * Math.sin(t * (L.speed ?? LIGHT_DEFAULTS.speed) / amp);
}

export function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return Math.abs(d);
}

// is (px, py) inside the beam that points at `ang`?
export function inBeam(L, ang, px, py) {
  const dx = px - L.x, dy = py - L.y;
  const d = Math.hypot(dx, dy);
  if (d > (L.range ?? LIGHT_DEFAULTS.range) || d < 4) return false;
  return angleDiff(Math.atan2(dy, dx), ang) <= (L.half ?? LIGHT_DEFAULTS.half);
}

// the "gezien" meter, 0..1: fills in the beam (slower when crouching in the grass), empties outside it
export function stepExposure(m, dt, inside, crouching, L) {
  const up = crouching ? (L.crouchRate ?? LIGHT_DEFAULTS.crouchRate) : (L.rate ?? LIGHT_DEFAULTS.rate);
  const v = inside ? m + dt * up : m - dt * (L.decay ?? LIGHT_DEFAULTS.decay);
  return Math.max(0, Math.min(1, v));
}
