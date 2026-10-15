// Lanes across a road's carriageway (docs/PROVINCIE-PLAN.md 2.12), shared by
// the markings (roadsurface.js) and the traffic AI (vehicle.js). Pure.
//
// laneLayout(r) -> { n, lw, divider, lines, lanes }: the lane width, the
// offset of the line between the directions (null on a one-way road), the
// offsets of the lane lines within a direction, and per lane { off, dir, k }
// (its middle; dir 1 along pts, -1 against; k counts from the inside). From
// the lane model (scripts/world/lanes.py: lanesFwd/lanesBwd/laneW) when the
// road has it, else round(width / 3.3) as before. Offsets are right of
// travel along pts. NL: forward lanes right of the divider.
export function laneLayout(r) {
  const f = r.lanesFwd, b = r.lanesBwd;
  if (f == null) {
    const n = Math.max(1, Math.round(r.width / 3.3));
    const lw = r.width / n;
    if (r.oneway) return { n, lw, divider: null, lines: Array.from({ length: n - 1 }, (_, k) => -r.width / 2 + lw * (k + 1)), lanes: Array.from({ length: n }, (_, k) => ({ off: -r.width / 2 + lw * (k + 0.5), dir: 1, k })) };
    return { n, lw, divider: 0, lines: [], lanes: [{ off: r.width / 4, dir: 1, k: 0 }, { off: -r.width / 4, dir: -1, k: 0 }] };
  }
  const n = f + b + (r.lanesBoth || 0);
  const lw = Math.min(r.laneW || 3, (r.width - 0.4) / Math.max(1, n));
  const lanes = [], lines = [];
  if (!b) {
    for (let k = 0; k < f; k++) lanes.push({ off: -f * lw / 2 + lw * (k + 0.5), dir: 1, k });
    for (let k = 1; k < f; k++) lines.push(-f * lw / 2 + lw * k);
    return { n, lw, divider: null, lines, lanes };
  }
  // two-way: the backward lanes left of the divider, the forward ones right
  const divider = (b - f) / 2 * lw;
  for (let k = 0; k < f; k++) lanes.push({ off: divider + lw * (k + 0.5), dir: 1, k });
  for (let k = 0; k < b; k++) lanes.push({ off: divider - lw * (k + 0.5), dir: -1, k });
  for (let k = 1; k < f; k++) lines.push(divider + lw * k);
  for (let k = 1; k < b; k++) lines.push(divider - lw * k);
  return { n, lw, divider, lines, lanes };
}
