import { propsInRadius, claimProp } from './breakables.js';
import { makeTwoWheeler } from './vehicle.js';

// The parked bikes and scooters of the street clutter are static props in a
// merged cell mesh; taking one swaps that prop for a real, rideable vehicle
// with the same look at the same spot (the prop comes back with the usual
// breakables respawn once you are long gone).

const KINDS = ['bike', 'scooter'];
const PROP_REACH = 1.6;

export function findRideableProp(x, y, reach = PROP_REACH) {
  let best = null, bestD = reach;
  for (const p of propsInRadius(x, y, reach, KINDS)) {
    const d = Math.hypot(p.x - x, p.y - y);
    if (d < bestD) { bestD = d; best = p; }
  }
  return best ? { prop: best, dist: bestD } : null;
}

export function rideProp(world, p) {
  if (!claimProp(p)) return null;
  const v = makeTwoWheeler(p.kind === 'scooter' ? 'moped' : p.kind, p.x, p.y, p.face ?? p.angle ?? 0, p.tint);
  // an unlocked bike against a wall is fair game in Groningen; a cracked lock is theft
  v.petty = !p.locked;
  world.vehicles.push(v);
  return v;
}
