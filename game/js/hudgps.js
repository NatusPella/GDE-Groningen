// The GPS card's next turn (zone B): where the route ahead bends by more than
// a lane change, and which way. Pure: route points in, a turn out, so
// scripts/hud_test.mjs can check it. World y points south, so a right turn
// is a clockwise (positive) change of heading.

const MIN_TURN = 0.6; // rad, ~35 degrees
const SHARP = 2.2; // rad, ~125 degrees
const MERGE_M = 14; // bends this close together count as one
const STEP_MIN = 2;

// pts: [[x, y], ...] from the player along the route (getRouteAhead).
// Returns { dist, angle, dir, side, x, y } for the first turn within maxAhead, or null.
export function nextTurn(pts, maxAhead = 400) {
  if (!pts || pts.length < 3) return null;
  // drop zero-length steps
  const p = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const a = p[p.length - 1], b = pts[i];
    if (Math.hypot(b[0] - a[0], b[1] - a[1]) >= STEP_MIN || i === pts.length - 1) p.push(b);
  }
  if (p.length < 3) return null;
  let acc = 0;
  for (let i = 1; i < p.length - 1; i++) {
    const a = p[i - 1], b = p[i];
    acc += Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (acc > maxAhead) return null;
    const h0 = Math.atan2(b[1] - a[1], b[0] - a[0]);
    // the heading after the bend: over the next MERGE_M metres, so a corner
    // drawn as two short kinks reads as one turn
    let j = i + 1, run = 0;
    while (j < p.length - 1 && run + Math.hypot(p[j][0] - p[j - 1][0], p[j][1] - p[j - 1][1]) < MERGE_M) {
      run += Math.hypot(p[j][0] - p[j - 1][0], p[j][1] - p[j - 1][1]);
      j++;
    }
    const c = p[j];
    const h1 = Math.atan2(c[1] - b[1], c[0] - b[0]);
    let d = h1 - h0;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    if (Math.abs(d) < MIN_TURN) continue;
    const side = d > 0 ? 'rechts' : 'links';
    const dir = Math.abs(d) > SHARP ? (d > 0 ? 'scherp rechtsaf' : 'scherp linksaf') : d > 0 ? 'rechtsaf' : 'linksaf';
    return { dist: acc, angle: d, dir, side, x: b[0], y: b[1], after: c };
  }
  return null;
}

// "Over 200 m rechtsaf" / "Nu linksaf": rounded like a navigation voice.
export function turnText(t) {
  if (!t) return '';
  if (t.dist < 25) return `Nu ${t.dir}`;
  const m = t.dist < 100 ? Math.round(t.dist / 10) * 10 : Math.round(t.dist / 50) * 50;
  return `Over ${m} m ${t.dir}`;
}

// Estimated time for the remaining metres: the current speed when moving,
// else a typical speed for the way you travel (mode: walk, bike, drive, boat,
// ov, fly). A train trip counts its own plan: the route's ETA over what is left.
const TYPICAL = { walk: 1.6, bike: 5, drive: 11, boat: 6, ov: 22, fly: 30 };
// Samen spelen (#452): het dichtstbijzijnde doel uit de lijst van de host (coopextra.js gastDoelen), voor de pijl aan de rand van de minimap
export function dichtstbijDoel(doelen, x, y) {
  let best = null, bd = Infinity;
  for (const d of doelen || []) { const a = Math.hypot(d.x - x, d.y - y); if (a < bd) { bd = a; best = d; } }
  return best ? { doel: best, afstand: bd } : null;
}

export function etaText(remaining, speed, mode = 'drive', route = null) {
  if (route && route.etaS && route.length && mode === 'ov') {
    const min = Math.max(1, Math.round(route.etaS * Math.min(1, remaining / route.length) / 60));
    return `± ${min} min`;
  }
  const typical = TYPICAL[mode] || TYPICAL.drive;
  const v = Math.max(typical * 0.6, Math.abs(speed || 0) > 2 ? Math.abs(speed) : typical);
  const min = Math.max(1, Math.round(remaining / v / 60));
  return `± ${min} min`;
}
