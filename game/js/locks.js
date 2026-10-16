// Locks (sluizen) where two water bodies of a different peil meet
// (docs/PROVINCIE-PLAN.md 2.11, "Water"): a chamber with a gate at each end
// and a level that goes from one peil to the other. Pure state: the world
// builder places them (scripts/world/water.mjs findLocks: OSM lock gates, and
// navigable bodies with their own peil that touch); a drawing layer and the
// boats read the state. A fixed cycle a boat can count on:
//
//   ready      the chamber at side `at`'s level, that gate open
//   closing    GATE_S   the open gate swings shut
//   levelling  the level moves at FILL_MS m/s to the other side's peil
//   opening    GATE_S   the other gate opens; then ready at the other side
//
// A boat asks from a side (request(lock, side, boat)); the lock comes to that
// side, the boat sails in (enter(lock, boat)), the lock closes behind it,
// levels and lets it out on the other side.

export const LOCK_TIMING = { GATE_S: 6, FILL_MS: 0.05, MIN_LEVEL_S: 8 };

export function makeLock({ x, y, a = 0, len = 40, width = 8, levels = [-2.3, -2.3], name = '' }) {
  return { x, y, a, len, width, levels: levels.slice(), name, at: 0, state: 'ready', t: 0, level: levels[0], gate: [1, 0], queue: [] };
}

// how long levelling takes between the two peilen (s)
export function levelTime(lock) {
  return Math.max(LOCK_TIMING.MIN_LEVEL_S, Math.abs(lock.levels[1] - lock.levels[0]) / LOCK_TIMING.FILL_MS);
}

// a boat (or anything) waiting at side 0 or 1 wants through
export function request(lock, side, who = null) {
  if (!lock.queue.some((q) => q.side === side && q.who === who)) lock.queue.push({ side, who });
}
// the boat sailed into the chamber: it goes to the other side
export function enter(lock, who = null) {
  const q = lock.queue.find((e) => e.who === who && e.side === lock.at && !e.inside);
  if (q) { q.inside = true; q.side = 1 - lock.at; }
}

// can a boat pass the gate at side s now (into or out of the chamber)?
export const gateOpen = (lock, s) => lock.gate[s] >= 1;

export function stepLock(lock, dt) {
  const T = LOCK_TIMING;
  lock.t += dt;
  switch (lock.state) {
    case 'ready': {
      // somebody waiting on the far side, or a boat inside wanting out there
      const want = lock.queue.find((q) => q.side !== lock.at || q.inside);
      if (want && lock.t >= 4) { lock.state = 'closing'; lock.t = 0; }
      break;
    }
    case 'closing':
      lock.gate[lock.at] = Math.max(0, 1 - lock.t / T.GATE_S);
      if (lock.t >= T.GATE_S) { lock.state = 'levelling'; lock.t = 0; lock.from = lock.level; }
      break;
    case 'levelling': {
      const to = lock.levels[1 - lock.at], dur = levelTime(lock);
      lock.level = lock.from + (to - lock.from) * Math.min(1, lock.t / dur);
      if (lock.t >= dur) { lock.level = to; lock.state = 'opening'; lock.t = 0; }
      break;
    }
    case 'opening': {
      const s = 1 - lock.at;
      lock.gate[s] = Math.min(1, lock.t / T.GATE_S);
      if (lock.t >= T.GATE_S) {
        lock.at = s; lock.state = 'ready'; lock.t = 0;
        // whoever was in the chamber sails out here
        lock.queue = lock.queue.filter((q) => !q.inside);
      }
      break;
    }
  }
}

// the water level at (x, y) inside the chamber (the lock's own), or null
export function chamberLevelAt(lock, x, y) {
  const dx = x - lock.x, dy = y - lock.y, c = Math.cos(lock.a), s = Math.sin(lock.a);
  const u = dx * c + dy * s, v = -dx * s + dy * c;
  return Math.abs(u) <= lock.len / 2 && Math.abs(v) <= lock.width / 2 ? lock.level : null;
}
