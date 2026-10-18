// De afstandsregels van de colonne (puur, geen imports: scripts/convoy_test.mjs). convoy.js doet de voertuigen.

export const CONVOY = {
  trailStep: 8,      // m between the trail points of the leader
  warnGap: 90,       // m behind: "wacht even"
  maxGap: 170,       // m behind for lagSecs: the column falls apart
  lagSecs: 12,
  spacing: 2,        // trail points between two members
  cutRange: 7,       // m: the limo touches a member
  cutEvery: 5,       // s between two cuts of the limo
};

// Add the position to the leader's trail when it moved a trailStep.
export function pushTrail(trail, x, y, step = CONVOY.trailStep) {
  const last = trail[trail.length - 1];
  if (!last || Math.hypot(x - last.x, y - last.y) >= step) { trail.push({ x, y }); if (trail.length > 400) trail.shift(); }
  return trail;
}

// The trail point member i heads for: `spacing` points behind the leader per place in the line.
export function trailGoal(trail, i, spacing = CONVOY.spacing) {
  if (!trail.length) return null;
  return trail[Math.max(0, trail.length - 1 - (i + 1) * spacing)];
}

// Lag bookkeeping: seconds a member has been further than maxGap behind, and the warnings on the way.
export function lagStep(m, gap, dt) {
  m.lagT = gap > CONVOY.maxGap ? (m.lagT || 0) + dt : Math.max(0, (m.lagT || 0) - dt * 2);
  const warn = gap > CONVOY.warnGap && !m.warned;
  if (gap <= CONVOY.warnGap * 0.7) m.warned = false;
  if (warn) m.warned = true;
  return { warn, split: m.lagT > CONVOY.lagSecs };
}
