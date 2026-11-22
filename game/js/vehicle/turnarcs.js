// Voorafberekende bochtbogen voor AI-auto's op kruispunten (#1049, #1047). Pure meetkunde, geen DOM, geen three.
//
// Het AI-pad was een polyline van rijstrookpunten: de laatste punt op de oude weg, het knooppunt op de nieuwe weg en dan
// de volgende punt. Pure pursuit mikt een stuk vooruit op dat pad en snijdt de hoek (een lange auto raakt dan een
// gevelhoek). Hier wordt die hoek vervangen door een cirkelboog die raakt aan beide rijstrooklijnen, met een straal van
// minstens de draaicirkel van de auto. Is de gevelafstand op de boog te klein, dan wordt de straal ruimer (de auto haalt
// verder uit) tot de boog vrij ligt. De boog wordt een keer per bocht berekend (bij het bouwen van het pad voor een
// afslag, bewaard bij de afslag in `plan`), niet elk frame, en de snelheid in de bocht volgt uit de kromming van het
// pad (curveSpeedLimit).
//
//   turnArc(A, J, O, B, opts)  -> { pts: [x0, y0, ... x4, y4], R, T, theta, clear } of null (bijna rechtdoor, keren of geen ruimte)
//     A = rijstrookpunt voor het knooppunt op de oude weg, J = het knooppunt op de oude weg, O = het knooppunt op de nieuwe weg,
//     B = het volgende rijstrookpunt op de nieuwe weg; opts: { R0, margin, clearance(x, y) -> afstand tot de dichtstbijzijnde gevel }

export const ARC_PTS = 5;           // E, tussenpunt, apex (het kruispuntpunt), tussenpunt, X
const MIN_TURN = 0.2;               // rad: minder is rechtdoor
const MAX_TURN = 2.5;               // rad: meer is keren
const R_STEPS = [1, 1.5, 2.2, 3.2, 4.5];
const SAMPLES = 8;

function sampleArc(cx, cy, R, phi0, dphi, out) {
  for (let k = 0; k < ARC_PTS; k++) {
    const a = phi0 + dphi * (k / (ARC_PTS - 1));
    out[2 * k] = cx + R * Math.cos(a); out[2 * k + 1] = cy + R * Math.sin(a);
  }
}

export function turnArc(A, J, O, B, opts) {
  let dix = J[0] - A[0], diy = J[1] - A[1];
  let dox = B[0] - O[0], doy = B[1] - O[1];
  const li = Math.hypot(dix, diy), lo = Math.hypot(dox, doy);
  if (li < 0.5 || lo < 0.5) return null;
  dix /= li; diy /= li; dox /= lo; doy /= lo;
  const cross = dix * doy - diy * dox, dot = dix * dox + diy * doy;
  const theta = Math.atan2(Math.abs(cross), dot);
  if (theta < MIN_TURN || theta > MAX_TURN) return null;
  // C: snijpunt van de twee rijstrooklijnen
  const u = ((O[0] - J[0]) * doy - (O[1] - J[1]) * dox) / cross;
  if (!Number.isFinite(u) || Math.abs(u) > 10) return null;
  const cx = J[0] + dix * u, cy = J[1] + diy * u;
  const lin = (cx - A[0]) * dix + (cy - A[1]) * diy, lout = (B[0] - cx) * dox + (B[1] - cy) * doy;
  if (lin < 1 || lout < 1) return null;
  const Tmax = 0.85 * Math.min(lin, lout), tanH = Math.tan(theta / 2);
  const left = cross > 0;
  const nx = left ? -diy : diy, ny = left ? dix : -dix;
  const clearance = opts.clearance, margin = opts.margin;
  let best = null;
  const buf = new Array(2 * ARC_PTS);
  for (let s = 0; s < R_STEPS.length; s++) {
    let R = opts.R0 * R_STEPS[s], T = R * tanH, last = false;
    if (T > Tmax) { T = Tmax; R = T / tanH; last = true; }
    const ex = cx - dix * T, ey = cy - diy * T;
    const ox = ex + nx * R, oy = ey + ny * R;
    const phi0 = Math.atan2(ey - oy, ex - ox);
    const dphi = left ? theta : -theta;
    sampleArc(ox, oy, R, phi0, dphi, buf);
    let clear = Infinity;
    if (clearance) {
      for (let k = 0; k <= SAMPLES; k++) {
        const a = phi0 + dphi * (k / SAMPLES);
        const c = clearance(ox + R * Math.cos(a), oy + R * Math.sin(a));
        if (c < clear) clear = c;
      }
    }
    if (!best || clear > best.clear + 1e-6) best = { pts: buf.slice(), R, T, theta, clear };
    if (clear >= margin || last) break;
  }
  return best;
}

// Afstand van (x, y) tot de dichtstbijzijnde gevel (voetafdrukrand) in `buildings`; Infinity zonder gebouw.
export function facadeClearance(buildings, x, y) {
  let best = Infinity;
  for (let bi = 0; bi < buildings.length; bi++) {
    const P = buildings[bi].pts;
    for (let i = 0; i < P.length - 1; i++) {
      const ax = P[i][0], ay = P[i][1], ex = P[i + 1][0] - ax, ey = P[i + 1][1] - ay, L2 = ex * ex + ey * ey || 1;
      const t = Math.max(0, Math.min(1, ((x - ax) * ex + (y - ay) * ey) / L2));
      const d = Math.hypot(ax + ex * t - x, ay + ey * t - y);
      if (d < best) best = d;
    }
  }
  return best;
}

// Het punt op de boogpolyline het dichtst bij (x, y): { i, t, d, x, y } (segment i tussen punt i en i+1).
export function nearestOnArc(pts, x, y, out) {
  let bi = 0, bt = 0, bd2 = Infinity, bx = pts[0], by = pts[1];
  for (let i = 0; i < ARC_PTS - 1; i++) {
    const ax = pts[2 * i], ay = pts[2 * i + 1], ex = pts[2 * i + 2] - ax, ey = pts[2 * i + 3] - ay, L2 = ex * ex + ey * ey || 1;
    const t = Math.max(0, Math.min(1, ((x - ax) * ex + (y - ay) * ey) / L2));
    const px = ax + ex * t, py = ay + ey * t, d2 = (px - x) ** 2 + (py - y) ** 2;
    if (d2 < bd2) { bd2 = d2; bi = i; bt = t; bx = px; by = py; }
  }
  out.i = bi; out.t = bt; out.d = Math.sqrt(bd2); out.x = bx; out.y = by;
  return out;
}
