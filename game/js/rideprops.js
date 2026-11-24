import { propsInRadius, claimProp } from './breakables.js';
import { makeTwoWheeler } from './vehicle.js';
import { insideBuilding } from './buildinghit.js';

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

// Een rekfiets staat vaak tegen een gevel: staat het middelpunt binnen een gebouw, dan zat de speler na het pakken
// vast in de muur (#1018). Schuif de nieuwe fiets naar de dichtstbijzijnde vrije plek.
export function vrijeStart(map, x, y) {
  if (!map || typeof map.escapeBuilding !== 'function') return { x, y };
  const [sx, sy] = map.escapeBuilding(x, y, 0.8);
  return Number.isFinite(sx) && Number.isFinite(sy) ? { x: sx, y: sy } : { x, y };
}

// Een rekfiets staat met zijn voorwiel naar de gevel: wie opstapt en vooruit trapt, staat tegen de muur en lijkt vast te zitten
// (beeldcheck 24-11, #1018). Staat er recht voor de fiets een gevel en achter niet, dan draait hij om, met het voorwiel naar de straat.
export function vrijeKoers(map, x, y, a) {
  if (!map || (!map.buildingGrid && typeof map.buildingsNear !== 'function')) return a;
  const muur = (d) => insideBuilding(map, x + Math.cos(a) * d, y + Math.sin(a) * d);
  if (!(muur(0.9) || muur(1.5))) return a;
  return muur(-0.9) || muur(-1.5) ? a : a + Math.PI;
}

export function rideProp(world, p) {
  if (!claimProp(p)) return null;
  const map = world && world.map;
  const spot = vrijeStart(map, p.x, p.y);
  const v = makeTwoWheeler(p.kind === 'scooter' ? 'moped' : p.kind, spot.x, spot.y, vrijeKoers(map, spot.x, spot.y, p.face ?? p.angle ?? 0), p.tint);
  // an unlocked bike against a wall is fair game in Groningen; a cracked lock is theft
  v.petty = !p.locked;
  world.vehicles.push(v);
  return v;
}

// De volgorde waarin een speler op (x, y) een rekfiets probeert: de dichtstbijzijnde eerst. Een fiets die niet
// te claimen is (zelfde sleutel al in gebruik) valt af; dan volgt de volgende (#1018).
export function rideCandidates(x, y, reach = PROP_REACH) {
  return propsInRadius(x, y, reach, KINDS)
    .map((p) => ({ prop: p, dist: Math.hypot(p.x - x, p.y - y) }))
    .sort((a, b) => a.dist - b.dist);
}

// Pak de gekozen fiets, of anders de volgende vrije. null als er niets te pakken valt.
export function rideFirstFree(world, prop, x, y) {
  const first = rideProp(world, prop);
  if (first) return first;
  for (const c of rideCandidates(x, y)) {
    if (c.prop === prop) continue;
    const v = rideProp(world, c.prop);
    if (v) return v;
  }
  return null;
}
