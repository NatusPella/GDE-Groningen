// Small offences build up "heat" before they cost a wanted star: one bump
// into a patrol car or one pedestrian knocked over out of sight of the
// police is forgiven (a witness may still phone it in, pedestrians.js).
// Seen by a unit, the same offence counts double. Heat cools down again.
//
//   reportCrime(world, kind, { seen }) -> true when it was serious enough to
//   count as a crime for witnesses (a star is given here only when the police
//   saw it, or when the heat piles up far past the limit)

import { noteWantedWhy, WANTED_OWN_CARD } from './wantedwhy.js';
import { plekVan, wantedVan, zetWantedVan, getuigeDichtbij } from './coopgezocht.js';

const STAR_HEAT = 100;
const RAMPAGE_HEAT = 220;
const COOL_PER_S = 7;
const SEVERITY = { pedHit: 45, pedKill: 100, copBump: 60, copHit: 100, drunkDriving: 40, tunedMoped: 30, cashVanBlown: 120, cashVanLoot: 60, autoDiefstal: 100 };

let heat = 0;
let heatAt = 0;

function policeSees(world, slot = 0) {
  const p = (slot > 0 && plekVan(world, slot)) || world.player;
  for (const v of world.vehicles) {
    if (!v.isPolice || v.hijacked || v.wrecked || v.disabled || v.driver === 'player') continue;
    if (v._sees && Math.hypot(v.x - p.x, v.y - p.y) < 55) return true;
  }
  for (const c of world.pedestrians) {
    if (c.isCop && c.state !== 'dead' && c._sees && Math.hypot(c.x - p.x, c.y - p.y) < 32) return true;
  }
  return false;
}

// Samen spelen (#434): de dader is de gast die het voertuig bestuurt (opts.vehicle.coopBestuurder) of opts.dader; zijn misdaden tellen op bij zijn eigen
// gezocht-niveau (world.coopWanted) met zijn eigen warmte. Een voetganger dichtbij is zijn getuige (de host heeft daar de telefoontjes van pedestrians.js voor).
function gastMisdaad(world, slot, kind, opts) {
  const now = world.time || 0, heten = world.coopHeat || (world.coopHeat = {}), h = heten[slot] || (heten[slot] = { heat: 0, at: now });
  h.heat = Math.max(0, h.heat - (now - h.at) * COOL_PER_S);
  h.at = now;
  const seen = opts.seen ?? policeSees(world, slot);
  h.heat += (SEVERITY[kind] || 50) * (seen ? 2 : 1);
  const serious = h.heat >= STAR_HEAT;
  const q = plekVan(world, slot);
  const getuige = !seen && serious && q && getuigeDichtbij(world, q.x, q.y);
  if ((serious && (seen || getuige)) || h.heat >= RAMPAGE_HEAT) {
    zetWantedVan(world, slot, wantedVan(world, slot) + 1);
    h.heat = seen ? STAR_HEAT * 0.4 : 0;
  }
  return serious;
}

export function reportCrime(world, kind, opts = {}) {
  const dader = opts.dader ?? (opts.vehicle && opts.vehicle.coopBestuurder) ?? 0;
  if (dader > 0) return gastMisdaad(world, dader, kind, opts);
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

