// Smooth day-night keyframes (22-11, audit 20-11 point 6): the nine sun-height keys of daynight.js were blended
// linearly, which leaves a kink in every colour and number at each key (most visible around 6 and 1 degrees, where
// glow and exposure change fast). This module replaces the straight line by a monotone cubic (Fritsch-Carlson):
// - the curve still passes exactly through every key, so every tuned key looks as it did;
// - between two keys a value never leaves the range of those two keys (no overshoot, no new colours);
// - the slope is continuous across a key, so dawn and dusk glide instead of changing pace.
// Pure numbers, no THREE. The tangents are computed once; evaluating costs a handful of multiplications and
// allocates nothing.

// Tangents (dy/dx) per key for a strictly monotone x (rising or falling) and its values.
export function monotoneTangents(xs, ys, out = new Array(xs.length)) {
  const n = xs.length;
  if (n < 2) { out[0] = 0; return out; }
  let dPrev = (ys[1] - ys[0]) / (xs[1] - xs[0]);
  out[0] = dPrev; // the end keys keep the slope of their own segment
  for (let i = 1; i < n - 1; i++) {
    const h0 = xs[i] - xs[i - 1], h1 = xs[i + 1] - xs[i];
    const d1 = (ys[i + 1] - ys[i]) / h1;
    // a local top or a flat stretch keeps a flat tangent: that is what stops overshoot
    if (dPrev * d1 <= 0) out[i] = 0;
    else out[i] = 3 * (h0 + h1) / ((2 * h1 + h0) / dPrev + (h1 + 2 * h0) / d1);
    dPrev = d1;
  }
  out[n - 1] = dPrev;
  return out;
}

// Value on a segment at t = 0..1; h is the width of the segment in x, m0 and m1 the tangents at its two keys.
export function hermite(y0, y1, m0, m1, h, t) {
  const t2 = t * t, t3 = t2 * t;
  return (2 * t3 - 3 * t2 + 1) * y0 + (t3 - 2 * t2 + t) * h * m0 + (-2 * t3 + 3 * t2) * y1 + (t3 - t2) * h * m1;
}

// A ready curve through (xs, ys). at(i, t) reads segment i; value(x) finds the segment itself (tests and tools).
export function buildCurve(xs, ys) {
  const m = monotoneTangents(xs, ys);
  const at = (i, t) => hermite(ys[i], ys[i + 1], m[i], m[i + 1], xs[i + 1] - xs[i], t);
  const up = xs[xs.length - 1] > xs[0];
  const value = (x) => {
    let i = 0;
    while (i < xs.length - 2 && (up ? x > xs[i + 1] : x < xs[i + 1])) i++;
    const t = Math.max(0, Math.min(1, (x - xs[i]) / (xs[i + 1] - xs[i])));
    return at(i, t);
  };
  return { xs, ys, m, at, value };
}

// The straight-line blend this replaces (tests measure the kink against it).
export function linearValue(xs, ys, x) {
  const up = xs[xs.length - 1] > xs[0];
  let i = 0;
  while (i < xs.length - 2 && (up ? x > xs[i + 1] : x < xs[i + 1])) i++;
  const t = Math.max(0, Math.min(1, (x - xs[i]) / (xs[i + 1] - xs[i])));
  return ys[i] + (ys[i + 1] - ys[i]) * t;
}

// The largest jump in slope at an inner key (per unit of x): about 0 for a smooth curve, the kink of a straight-line blend.
export function maxKink(xs, value, eps = 1e-3) {
  let worst = 0;
  for (let i = 1; i < xs.length - 1; i++) {
    const s = Math.sign(xs[i + 1] - xs[i]) || 1;
    const left = (value(xs[i]) - value(xs[i] - s * eps)) / (s * eps);
    const right = (value(xs[i] + s * eps) - value(xs[i])) / (s * eps);
    worst = Math.max(worst, Math.abs(right - left));
  }
  return worst;
}
