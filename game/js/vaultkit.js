// On-foot jump, vault and climb rules, kept DOM- and three-free so
// node scripts/vault_test.mjs can check them.

export const VAULT_MIN_H = 0.6; // lower than this a plain jump clears it
export const VAULT_MAX_H = 1.3; // fence, hedge, low wall, bollard, a parked bike
export const CLIMB_MAX_H = 1.95; // a car or estate roof; vans, buses and walls stay blocking
export const MAX_DROP = 2.5; // m: a vault never lands you further down than this (viaduct edge, cutting)
export const PERCH_SLIP_SPEED = 6; // m/s: a car going faster than this throws you off its roof

// Roof height of a vehicle above its wheels, metres. `model.h` overrides.
const ROOF_H = {
  bike: 1.05, scooter: 1.15, hatch: 1.45, sedan: 1.45, sport: 1.25, taxi: 1.5, police: 1.5, escort: 1.5,
  wagon: 1.5, suv: 1.75, van: 2.1, cashvan: 2.2, ambulance: 2.7, foodtruck: 2.8, truck: 3.6, bus: 3.1,
  midibus: 2.9, trekkerlimo: 2.6, horse: 1.7, heli: 3.5, boat: 1.2, sloep: 1.0,
  // (#463) de machines van het land en de trekker: een quad is laag, een
  // maaidorser hoog, en de volgcam moet van allebei het echte dak kennen
  tractor: 2.9, quad: 1.2, maaidorser: 3.5, laadmachine: 2.1,
};

export function vehicleHeight(v) {
  const m = (v && v.model) || {};
  if (Number.isFinite(m.h)) return m.h;
  if (m.moped) return 1.15;
  return ROOF_H[m.name] ?? 3;
}

// What SPACE does against an obstacle `h` metres tall right ahead:
//   'hop'   - a plain jump clears it (or nothing there)
//   'vault' - swing over it and land on the far side
//   'climb' - climb onto its top (car roofs) and stand there
//   'block' - too tall: just a jump on the spot
// o.top: it has a top you can stand on (a vehicle roof)
// o.landing: where a vault would come down - { blocked, water, drop }
// o.deliberate: a fresh SPACE press standing at it, not a run-up or a
//   jump that happened to meet it - only that may go over into the water
export function vaultDecision(h, o = {}) {
  if (!(h > 0) || h < VAULT_MIN_H) return 'hop';
  const L = o.landing || {};
  const landOk = !L.blocked && !(L.drop > MAX_DROP) && (!L.water || (o.deliberate && !o.sprint));
  if (h <= VAULT_MAX_H) {
    if (landOk) return 'vault';
    return o.top ? 'climb' : 'block';
  }
  if (o.top && h <= CLIMB_MAX_H) return 'climb';
  return 'block';
}

// Point on a vehicle's roof to land on after climbing up from (x, y): a bit
// in from the edge you came from, in the car's local frame (lx along the
// nose, ly to the left), kept inside the roof.
export function roofSpot(v, x, y) {
  const c = Math.cos(v.angle), s = Math.sin(v.angle);
  const dx = x - v.x, dy = y - v.y;
  const hl = Math.max(0.1, v.model.len / 2 - 0.45), hw = Math.max(0.05, v.model.wid / 2 - 0.35);
  const lx = Math.max(-hl, Math.min(hl, (dx * c + dy * s) * 0.5));
  const ly = Math.max(-hw, Math.min(hw, (-dx * s + dy * c) * 0.3));
  return { lx, ly };
}

// Still standing on the roof at local (lx, ly)? A small margin past the edge
// before you step off.
export function onRoof(v, lx, ly) {
  return Math.abs(lx) <= v.model.len / 2 - 0.1 && Math.abs(ly) <= v.model.wid / 2 - 0.05;
}

// Has a roof you can stand on: cars, vans, buses - not two-wheelers, boats,
// horses or helicopters.
const NO_ROOF = new Set(['bike', 'scooter', 'boat', 'sloep', 'horse', 'heli']);
export function standable(v) {
  return !!v && !v.isBike && !v.isScooter && !v.isBoat && !v._mount && !(v.model && (v.model.moped || NO_ROOF.has(v.model.name)));
}

export function localToWorld(v, lx, ly) {
  const c = Math.cos(v.angle), s = Math.sin(v.angle);
  return [v.x + lx * c - ly * s, v.y + lx * s + ly * c];
}

export function worldToLocal(v, x, y) {
  const c = Math.cos(v.angle), s = Math.sin(v.angle);
  const dx = x - v.x, dy = y - v.y;
  return [dx * c + dy * s, -dx * s + dy * c];
}

// Is there a bridge within r metres of (x, y)? Rings of samples round the point.
export function bridgeWithin(map, x, y, r) {
  if (!(r > 0)) return false;
  if (map.isOnBridge(x, y)) return true;
  for (let d = 4; d <= r + 1e-6; d += 4) {
    const n = Math.max(8, Math.round(d * 0.8));
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2;
      if (map.isOnBridge(x + Math.cos(a) * d, y + Math.sin(a) * d)) return true;
    }
  }
  return false;
}
