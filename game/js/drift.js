// Drift scoring with combos. Pure maths, no DOM: driftzone.js feeds it the
// player car's slip angle and speed every frame.
//
// A drift counts while the car slides past MIN_SLIP at MIN_SPEED. Points come
// per second from speed and slip angle, times a multiplier that climbs the
// longer the chain lasts and with every change of direction (a transition).
// A short pause (GRACE) keeps the chain alive; after that the points are
// banked. A crash throws the unbanked points away.

export const DRIFT = {
  minSlip: 0.2, // rad (~11 degrees)
  minSpeed: 9, // m/s
  grace: 0.8, // s a chain survives without drifting
  step: 2.5, // s of drifting per +1 multiplier
  maxMult: 5,
  rate: 9, // points per second per (m/s * rad)
  slipCap: 1.2, // rad: more angle than this adds nothing
};

export function createDrift() {
  return { active: false, t: 0, gap: 0, mult: 1, cur: 0, total: 0, best: 0, sign: 0, flips: 0, chain: false, drifts: 0, crashes: 0 };
}

// d: state; in: { slip (rad, signed), speed (m/s), dt, crashed }.
// Returns { banked, crashed, started, ended } for this step.
export function stepDrift(d, inp) {
  const out = { banked: 0, crashed: false, started: false, ended: false };
  const { dt } = inp;
  if (inp.crashed) {
    if (d.cur > 0 || d.chain) { out.crashed = true; d.crashes++; }
    d.cur = 0; d.mult = 1; d.chain = false; d.active = false; d.t = 0; d.gap = 0; d.flips = 0; d.sign = 0;
    return out;
  }
  const slide = Math.abs(inp.slip) >= DRIFT.minSlip && inp.speed >= DRIFT.minSpeed;
  if (slide) {
    if (!d.active) {
      d.active = true;
      d.drifts++;
      if (!d.chain) { d.chain = true; d.mult = 1; d.t = 0; d.flips = 0; out.started = true; }
    }
    d.gap = 0;
    d.t += dt;
    const sign = Math.sign(inp.slip);
    if (d.sign && sign !== d.sign) d.flips++;
    d.sign = sign;
    d.mult = Math.min(DRIFT.maxMult, 1 + Math.floor(d.t / DRIFT.step) + d.flips);
    d.cur += inp.speed * Math.min(Math.abs(inp.slip), DRIFT.slipCap) * DRIFT.rate * d.mult * dt;
  } else {
    d.active = false;
    if (d.chain) {
      d.gap += dt;
      if (d.gap >= DRIFT.grace) {
        const pts = Math.round(d.cur);
        d.total += pts;
        if (pts > d.best) d.best = pts;
        out.banked = pts;
        out.ended = true;
        d.cur = 0; d.chain = false; d.mult = 1; d.t = 0; d.flips = 0; d.sign = 0; d.gap = 0;
      }
    }
  }
  return out;
}

// Medal 0..3 for a zone score.
export function driftMedal(score, at) {
  let m = 0;
  for (let i = 0; i < at.length; i++) if (score >= at[i]) m = i + 1;
  return m;
}

// Signed angle between a car's heading and the direction it moves in
// (rad): positive when the velocity points to the car's left (heading
// angles run counter-clockwise on the map), zero below a crawl or in reverse.
export function slipAngle(angle, speed, driftX, driftY) {
  const vx = Math.cos(angle) * speed + driftX, vy = Math.sin(angle) * speed + driftY;
  const fwd = Math.cos(angle) * vx + Math.sin(angle) * vy;
  const lat = -Math.sin(angle) * vx + Math.cos(angle) * vy;
  if (fwd < 1) return 0;
  return Math.atan2(lat, fwd);
}
