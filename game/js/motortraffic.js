// Motorbikes and brommers in the everyday traffic: which ones appear where,
// how fast they may go and where they may not ride. Pure data and picks, no
// DOM: vehicle.js spawns them, trafficlaw.js words the warning,
// scripts/motortraffic_test.mjs checks it.
//
// The rules: a brommer is held to 45 km/h (MOPED_LEGAL_SPEED) unless it is
// tuned ("opgevoerd"), and neither it nor a motorbike uses a cycle path or a
// footway: they keep to the road, like the player has to.
import { MOTORBIKE_MODELS, GEARED_MOPED_MODEL, MOPED_LEGAL_SPEED } from './motomodels.js';

// Per wijk profile (trafficfleet.js): weights of what rides there.
const MIX = {
  standaard: { moped: 3, naked: 1.5, old: 1, sport: 0.6 },
  student: { moped: 5, old: 1.6, naked: 0.8, sport: 0.3 },
  chic: { sport: 2.2, naked: 2, moped: 0.8, old: 0.4 },
  bakfiets: { moped: 2, naked: 1, old: 1, sport: 0.3 },
  industrie: { old: 2.2, naked: 1.4, moped: 1.6, sport: 0.4 },
  centrum: { moped: 4, naked: 1.2, sport: 0.7, old: 0.6 },
};

const COLORS = ['#c9541e', '#2f5a8f', '#1c1c1e', '#8f2f2a', '#e6e1d6', '#2e4a34', '#c9a227', '#6b6e70'];
const RIDERS = ['#2f5c8a', '#7a2e2e', '#3f6b3f', '#2b2b2b', '#c9a227', '#6a2e8a'];

// Traffic motorbikes stay under the city limit of the cars (~35 m/s tops);
// the shop versions stay as they are.
const TRAFFIC_TOP = 34;
export const TUNED_TOP = 17; // m/s, ~61 km/h: an "opgevoerde" brommer
const TUNED_CHANCE = 0.14;

export const isMotorised = (m) => !!(m && (m.motorbike || m.geared || m.moped));

function weighted(rng, table) {
  let sum = 0;
  for (const k in table) sum += table[k];
  let r = rng() * sum;
  for (const k in table) { r -= table[k]; if (r <= 0) return k; }
  return Object.keys(table)[0];
}

// { kind, model, tuned } for a motorised rider spawned in a wijk of this profile
export function pickMotor(profileKey = 'standaard', rng = Math.random) {
  const kind = weighted(rng, MIX[profileKey] || MIX.standaard);
  const color = COLORS[Math.floor(rng() * COLORS.length)];
  const rider = RIDERS[Math.floor(rng() * RIDERS.length)];
  if (kind === 'moped') {
    const tuned = rng() < TUNED_CHANCE;
    return { kind, tuned, model: { ...GEARED_MOPED_MODEL, color, rider, maxSpeed: tuned ? TUNED_TOP : MOPED_LEGAL_SPEED } };
  }
  const base = MOTORBIKE_MODELS[kind];
  return { kind, tuned: false, model: { ...base, color, rider, maxSpeed: Math.min(base.maxSpeed, TRAFFIC_TOP) } };
}

// the speed an AI rider may cruise at: a legal brommer never beats 45 km/h
export function motorCruiseTop(model, tuned = false) {
  if (!model) return 0;
  if (model.geared || model.moped) return tuned ? Math.min(model.maxSpeed, TUNED_TOP) : Math.min(model.maxSpeed, MOPED_LEGAL_SPEED);
  return Math.min(model.maxSpeed, TRAFFIC_TOP);
}

// The cycle-path rule: motorised two-wheelers keep off cycle paths and footways.
export function motorRoadAllowed(model, road) {
  if (!road) return false;
  if (road.cat === 'foot' || road.cat === 'cycle') return false;
  const t = road.type || '';
  if (t === 'cycleway' || t === 'footway' || t === 'path' || t === 'steps' || t === 'pedestrian') return false;
  return true;
}

// How many to keep around: a few by day, hardly any at night, more in the
// student wijken (base 4 of the whole population).
export function motorTarget(profileKey, hour, base = 4) {
  const h = ((hour % 24) + 24) % 24;
  const day = h >= 7 && h < 22 ? 1 : 0.25;
  const wijk = profileKey === 'student' || profileKey === 'centrum' ? 1.5 : profileKey === 'industrie' ? 0.8 : 1;
  return Math.max(0, Math.round(base * day * wijk));
}
