// Ships against bridges (#9): pure rules, no scene and no world. A boat that
// does not fit under a bridge that is shut (a low fixed bridge, a movable
// bridge that is closed) and arrives with enough mass AND speed damages the
// deck. The deck cracks, sags and, when hit hard, closes to road traffic for a
// while, then heals step by step. The hull gets a comic dent, never a
// casualty: nobody is hurt, nothing is shown that bleeds, and the boat is
// pushed back out of the span (no invisible wall for walkers, only a deck
// that is closed for vehicles).
//
// Severity: 0 nothing, 1 barsten, 2 scheef (dek zakt, verkeer gestremd),
// 3 zwaar (langer dicht). Damage is kept per session, not in the save.

// tonnes per boat kind (waterlevels.boatModelKind); a kano hurts no bridge
export const BOAT_MASS_T = {
  kano: 0.1, kajak: 0.1, sup: 0.1, waterfiets: 0.2, sloep: 1.2, sloepCabin: 1.8, rubberboot: 0.6, dinghy: 0.4,
  skiff: 0.3, acht: 0.8, rondvaart: 22, skutsje: 18, binnenvaart: 280,
};
// below this a boat is a nuisance, not a ram
export const MIN_MASS_T = 8;
export const MIN_SPEED = 1.5; // m/s
// kinetic energy (kJ, 0.5 m v^2 with m in tonnes) per severity
export const ENERGY_STEPS = [40, 250, 700];

// game seconds a deck stays damaged per severity, and how long it is shut to
// vehicles (severity 1 is just cracks: open)
export const REPAIR_S = [0, 90, 180, 300];
export const CLOSED_S = [0, 0, 120, 240];
// so one slow scrape does not count twice
export const HIT_COOLDOWN_S = 4;

export const massOf = (kind) => BOAT_MASS_T[kind] ?? 1;
export const energyKJ = (massT, speed) => 0.5 * massT * speed * speed;

// Does a boat of this air draft pass under a deck with this clearance
// (same rule as waterlevels.passesUnder, kept here so the module has no imports).
export const fitsUnder = (air, clearance) => clearance >= air + 0.05;

// null when nothing happens, else { severity, energy }.
// open: the bridge is open (movable, leaf up): no deck, no hit.
export function shipImpact({ air, clearance, massT, speed, open = false }) {
  if (open || !Number.isFinite(clearance)) return null;
  if (fitsUnder(air, clearance)) return null;
  const s = Math.abs(speed);
  if (massT < MIN_MASS_T || s < MIN_SPEED) return null;
  const energy = energyKJ(massT, s);
  let severity = 0;
  for (let i = 0; i < ENERGY_STEPS.length; i++) if (energy >= ENERGY_STEPS[i]) severity = i + 1;
  return severity ? { severity, energy } : null;
}

export function newDeckDamage() {
  return { level: 0, repair: 0, closed: 0, crack: 0, skew: 0, cool: 0, hits: 0 };
}

// A hit never lowers the level; a harder one restarts the repair clock.
export function hitDeck(d, severity) {
  if (severity < 1) return d;
  d.level = Math.max(d.level, severity);
  d.repair = Math.max(d.repair, REPAIR_S[severity]);
  d.closed = Math.max(d.closed, CLOSED_S[severity]);
  d.cool = HIT_COOLDOWN_S;
  d.hits++;
  syncLook(d);
  return d;
}

// crack 0..1 (decals), skew 0..1 (the deck sags: metres = skew * 0.6)
function syncLook(d) {
  const f = d.level ? Math.min(1, d.repair / REPAIR_S[d.level]) : 0;
  d.crack = d.level ? Math.min(1, 0.25 + 0.25 * d.level) * (0.4 + 0.6 * f) : 0;
  d.skew = d.level >= 2 ? (d.level === 2 ? 0.5 : 1) * f : 0;
}

// The deck heals: the level drops once the repair clock is below the lower
// level's duration; the sag shrinks with it.
export function stepDeckDamage(d, dt) {
  if (d.cool > 0) d.cool = Math.max(0, d.cool - dt);
  if (!d.level) return d;
  d.repair = Math.max(0, d.repair - dt);
  d.closed = Math.max(0, d.closed - dt);
  while (d.level > 0 && d.repair <= REPAIR_S[d.level - 1]) d.level--;
  if (!d.level) { d.repair = 0; d.closed = 0; }
  syncLook(d);
  return d;
}

export const deckClosedToTraffic = (d) => !!d && d.closed > 0;
export const canBeHit = (d) => !d || d.cool <= 0;

export const BRIDGE_HIT_LINES = [
  null,
  'Boem! Een paar barsten in de brug en een deuk in de romp. Niemand deert het.',
  'Het brugdek zakt scheef. Het verkeer wordt omgeleid en de brugwachter bijt op zijn broodje.',
  'Dat was geen aanleg, dat was een aanvaring. De brug is voorlopig dicht voor het verkeer.',
];

// Hull side: a dent, a bump and a Dutch one-liner. Never below HULL_FLOOR
// health (the boat does not sink or wreck); speedKeep[severity] is the share
// of its speed the boat keeps.
export const HULL_FLOOR = 10;
export function hullHit(severity, health) {
  const loss = [0, 6, 15, 30][severity] || 0;
  return {
    health: Math.max(HULL_FLOOR, health - loss),
    speedKeep: [1, 0.25, 0.1, 0],
    line: BRIDGE_HIT_LINES[severity] || null,
  };
}

// Where a boat is pushed back to: along the water's direction (perpendicular
// to the deck axis), on the side it came from.
export function pushBackDir(b, x, y) {
  const nx = -b.uy, ny = b.ux;
  const side = ((x - b.x) * nx + (y - b.y) * ny) >= 0 ? 1 : -1;
  return [nx * side, ny * side];
}
