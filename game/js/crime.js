// Small offences build up "heat" before they cost a wanted star: one bump
// into a patrol car or one pedestrian knocked over out of sight of the
// police is forgiven (a witness may still phone it in, pedestrians.js).
// Seen by a unit, the same offence counts double. Heat cools down again.
//
//   reportCrime(world, kind, { seen }) -> true when it was serious enough to
//   count as a crime for witnesses (a star is given here only when the police
//   saw it, or when the heat piles up far past the limit)

import { noteWantedWhy, WANTED_OWN_CARD } from './wantedwhy.js';

const STAR_HEAT = 100;
const RAMPAGE_HEAT = 220;
const COOL_PER_S = 7;
const SEVERITY = { pedHit: 45, pedKill: 100, copBump: 60, copHit: 100, drunkDriving: 40, tunedMoped: 30, cashVanBlown: 120, cashVanLoot: 60 };

let heat = 0;
let heatAt = 0;

function policeSees(world) {
  const p = world.player;
  for (const v of world.vehicles) {
    if (!v.isPolice || v.hijacked || v.wrecked || v.disabled || v.driver === 'player') continue;
    if (v._sees && Math.hypot(v.x - p.x, v.y - p.y) < 55) return true;
  }
  for (const c of world.pedestrians) {
    if (c.isCop && c.state !== 'dead' && c._sees && Math.hypot(c.x - p.x, c.y - p.y) < 32) return true;
  }
  return false;
}

export function reportCrime(world, kind, opts = {}) {
  const now = world.time || 0;
  heat = Math.max(0, heat - (now - heatAt) * COOL_PER_S);
  heatAt = now;
  const seen = opts.seen ?? policeSees(world);
  heat += (SEVERITY[kind] || 50) * (seen ? 2 : 1);
  const serious = heat >= STAR_HEAT;
  if ((seen && serious) || heat >= RAMPAGE_HEAT) {
    world.wanted = Math.min(5, (world.wanted || 0) + 1);
    world.wantedDecayTimer = 0;
    // the cause on the card (#391): what the police saw, or the pile of small offences that was never seen
    if (!WANTED_OWN_CARD.has(kind)) noteWantedWhy(world, seen ? kind : 'overlast');
    heat = seen ? STAR_HEAT * 0.4 : 0;
  }
  return serious;
}

