// A ditch is a trap for a car, not a line it can skip (owner: "sommige sloten kan de auto soms overheen
// rijden"). A ditch is 1.6 to 2.4 m wide; a car at 30 m/s covers 0.5 m a frame and the ground was only
// sampled at the car's centre every 0.6 m, so a fast car could be over it between two samples, and once
// in it the car lost 12% of its speed once. Now the ground is sampled along the whole stretch the car
// travelled (a swept test, step DITCH.step, under half the narrowest ditch), at the centre and both
// sides of the body, and a ditch crossed (not just stood in) costs a hard brake and holds the car at a
// crawl while it is in the water. Deterministic and pure (no THREE, no DOM): the same for every player
// and AI (scripts/ditchsweep_test.mjs); vehicle.js offroadDrag gives it the ground lookup.

export const DITCH = {
  step: 0.4,        // m: sweep step, under half the width of the narrowest ditch (drain: 1.6 m)
  side: 0.8,        // fraction of the half width of the body probed to either side of the centre
  top: 3,           // m/s: what a car may do in a ditch
  keep: 0.2,        // share of its speed a car keeps when it crosses a ditch (never below top)
  drag: 16,         // m/s2: braking while the wheels are in a ditch
};

// Sample offroadGround-like `groundAt(x, y)` from (x0, y0) to (x1, y1) with the body of half width
// `halfWid` and heading `angle` (the car's own; a drift moves it sideways, the probes follow the
// path normal). Returns { end, ditch, wade }: the ground at the end point (the centre), and whether the
// swept body met a ditch / wade ground anywhere on the way.
export function sweepGround(x0, y0, x1, y1, halfWid, groundAt, step = DITCH.step) {
  const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy);
  const n = Math.max(1, Math.ceil(len / step));
  // side normal of the path (of the heading when the car has hardly moved)
  const nx = len > 1e-6 ? -dy / len : 0, ny = len > 1e-6 ? dx / len : 1;
  const off = halfWid * DITCH.side;
  let ditch = false, wade = false;
  const probe = (x, y) => {
    const g = groundAt(x, y);
    if (g === 'ditch') ditch = true; else if (g === 'wade') wade = true;
    return g;
  };
  for (let i = 1; i <= n; i++) {
    const t = i / n, x = x0 + dx * t, y = y0 + dy * t;
    if (i < n) probe(x, y);
    if (off > 0) { probe(x + nx * off, y + ny * off); probe(x - nx * off, y - ny * off); }
  }
  const end = groundAt(x1, y1);
  if (end === 'ditch') ditch = true; else if (end === 'wade') wade = true;
  return { end, ditch, wade };
}

// The speed (signed) a car keeps when it crosses into a ditch: slow ones are left alone.
export function ditchEntrySpeed(speed) {
  const a = Math.abs(speed);
  if (a <= DITCH.top) return speed;
  return Math.sign(speed) * Math.max(DITCH.top, a * DITCH.keep);
}

// One frame of braking in a ditch: toward DITCH.top, never past it.
export function ditchDragSpeed(speed, dt) {
  const a = Math.abs(speed);
  if (a <= DITCH.top) return speed;
  return Math.sign(speed) * Math.max(DITCH.top, a - DITCH.drag * dt);
}
