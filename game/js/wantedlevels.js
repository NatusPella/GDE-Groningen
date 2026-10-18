// Wanted per star level (#43), pure data and rules. police.js reads the
// search area, the cooldown and the units from here, so the five levels feel
// different without scattering numbers over the chase code.
//
//   levelOf(stars)           -> the row for 1..5 (clamped)
//   chaseLayers(stars)       -> which unit kinds are in the chase
//   npcBudget(stars, ...)    -> how many reacting bystanders we afford (#52)
//   bystanderReaction(...)   -> what a civilian does near a passing chase

// searchRadius: start of the search circle (m); shrink: m/s; loseAfter: s out
// of sight before the search begins; cooldown: s inside the circle for one
// star to drop (outside the circle it runs twice as fast).
const LEVELS = [
  { searchRadius: 70, shrink: 1.4, loseAfter: 4, cooldown: 10, roadblockEvery: 0, roadblockLife: 0, copPeds: 1 },
  { searchRadius: 85, shrink: 1.3, loseAfter: 4.5, cooldown: 12, roadblockEvery: 0, roadblockLife: 0, copPeds: 2 },
  { searchRadius: 100, shrink: 1.2, loseAfter: 5, cooldown: 14, roadblockEvery: 22, roadblockLife: 45, copPeds: 3 },
  { searchRadius: 115, shrink: 1.1, loseAfter: 6, cooldown: 17, roadblockEvery: 18, roadblockLife: 50, copPeds: 5 },
  { searchRadius: 130, shrink: 1.0, loseAfter: 7, cooldown: 20, roadblockEvery: 14, roadblockLife: 55, copPeds: 5 },
];

export function levelOf(stars) {
  const n = Math.max(1, Math.min(5, Math.floor(stars) || 1));
  return LEVELS[n - 1];
}

// A layered chase: every layer joins at its star level and stays.
const LAYERS = [['foot', 1], ['patrol', 1], ['boat', 2], ['roadblock', 3], ['motor', 4], ['mount', 4], ['heli', 4]];

export function chaseLayers(stars) {
  return LAYERS.filter(([, from]) => stars >= from).map(([kind]) => kind);
}

// Reacting civilians (filming, cowering, gawking) cost animation and
// pathing. The cap follows the load: a busy frame or a big chase gets fewer.
const REACT_BASE = 8;
export function npcBudget(stars, frameMs = 8) {
  let n = REACT_BASE - Math.floor(Math.max(0, stars) / 2);
  if (frameMs > 20) n = Math.floor(n / 2);
  else if (frameMs > 14) n -= 2;
  return Math.max(1, n);
}

// Near a chasing patrol car at speed civilians step back and look, never
// block the road (no panic: nobody is hurt). Returns 'gawk' | 'flee' | null.
export function bystanderReaction({ dist, unitSpeed, onRoad, seated = false, roll = 0.5 }) {
  if (unitSpeed < 8 || dist > 22) return null;
  if (onRoad && dist < 9) return 'flee';
  if (seated || roll > 0.6) return null;
  return 'gawk';
}
