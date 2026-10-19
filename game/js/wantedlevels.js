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
  { searchRadius: 70, shrink: 1.4, loseAfter: 4, cooldown: 10, roadblockEvery: 0, roadblockLife: 0, copPeds: 1, spikes: false },
  { searchRadius: 85, shrink: 1.3, loseAfter: 4.5, cooldown: 12, roadblockEvery: 0, roadblockLife: 0, copPeds: 2, spikes: false },
  { searchRadius: 100, shrink: 1.2, loseAfter: 5, cooldown: 14, roadblockEvery: 22, roadblockLife: 45, copPeds: 3, spikes: false },
  { searchRadius: 115, shrink: 1.1, loseAfter: 6, cooldown: 17, roadblockEvery: 18, roadblockLife: 50, copPeds: 5, spikes: true },
  { searchRadius: 130, shrink: 1.0, loseAfter: 7, cooldown: 20, roadblockEvery: 14, roadblockLife: 55, copPeds: 5, spikes: true },
];

export function levelOf(stars) {
  const n = Math.max(1, Math.min(5, Math.floor(stars) || 1));
  return LEVELS[n - 1];
}

// A layered chase: every layer joins at its star level and stays.
const LAYERS = [['foot', 1], ['patrol', 1], ['boat', 2], ['roadblock', 3], ['interceptor', 3], ['motor', 4], ['mount', 4], ['heli', 4]];

// Interceptors (#204): from three stars every third patrol car is a faster one (the same
// car, a stronger engine). slot: how many patrol cars are already out when this one spawns.
export const INTERCEPTOR = { from: 3, every: 3, boost: 1.12 };
export const isInterceptorSlot = (stars, slot) => stars >= INTERCEPTOR.from && slot % INTERCEPTOR.every === INTERCEPTOR.every - 1;

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

// --- the search and the cooldown (#43), the pure core of police.js updateSearch ---------
// pol: world.police { searching, searchCenter, searchRadius, lastSeen, seenRecently, unseenFor };
// w: the world's { wanted, wantedDecayTimer }. Pure, so the headless pursuit
// simulation (scripts/pursuit_sim_test.mjs) steps the real rules.
export const SEARCH_MIN_RADIUS = 25;

// A unit sees the player (or the escalation still holds): the chase is on.
export function markSeen(pol, w, px, py) {
  pol.lastSeen = { x: px, y: py };
  pol.unseenFor = 0;
  pol.seenRecently = true;
  pol.searching = false;
  w.wantedDecayTimer = 0;
}

// Nobody sees the player for dt more seconds. decay: signalement.js factor
// (a changed vehicle or colour cools down faster). Returns true when the last
// star just dropped.
export function stepUnseen(pol, w, dt, px, py, decay = 1) {
  pol.unseenFor += dt;
  const lvl = levelOf(w.wanted);
  if (pol.unseenFor < lvl.loseAfter && !pol.searching) {
    pol.seenRecently = true;
    return false;
  }
  pol.seenRecently = false;
  if (!pol.searching) {
    pol.searching = true;
    pol.searchCenter = pol.lastSeen ? { ...pol.lastSeen } : { x: px, y: py };
    pol.searchRadius = lvl.searchRadius;
    w.wantedDecayTimer = 0;
  }
  pol.searchRadius = Math.max(SEARCH_MIN_RADIUS, pol.searchRadius - lvl.shrink * dt);
  const outside = Math.hypot(px - pol.searchCenter.x, py - pol.searchCenter.y) > pol.searchRadius;
  w.wantedDecayTimer += dt * (outside ? 2 : 1) * decay;
  if (w.wantedDecayTimer >= lvl.cooldown) {
    w.wanted = Math.max(0, w.wanted - 1);
    w.wantedDecayTimer = 0;
    return w.wanted === 0;
  }
  return false;
}
