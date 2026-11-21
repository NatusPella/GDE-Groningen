// From a building to its interior plan (epic Interieurs, #1150): is it enterable, what kind, how
// big is the hall behind the front door, and what is in it. Pure: a building row (b.pts, b.bounds,
// b.type, b.entrance, b.shopFront) in, a plan out; no scene, no map. The same function answers the
// game (interiors.js, when the player comes near) and the coverage audit (scripts/interior_audit.mjs,
// the whole province), so what the audit counts is what the game does.
import { hash2 } from './rng.js';
import { KINDS, kindOfBuilding, isOpen, opensAt, homeOpen, labelOf } from './interiorkinds.js';
import { frameOf, findHall, WALL_T } from './interiorframe.js';
import { generateLayout } from './interiorlayout.js';
import { homeLook } from './interiorlook.js';

export const MIN_CEILING = 2.3;   // lower than this is no room to stand in
export const DOOR_GAP = 1.2;      // the opening cut in the facade (m): a little wider than the leaf
export const WHY = {
  none: 'geen gebouw', nodoor: 'geen voordeur in de gevel', type: 'geen betreedbaar soort gebouw', small: 'hal te klein',
  low: 'te laag', layout: 'geen indeling', landmark: 'eigen interieur',
};

// stable seed (0..2^32) of a building: the same on every client and in every session (b.sd is the centre of the
// building in the frame it was first made in, scripts/world/rebase_data.py)
export function interiorSeed(b) {
  const sd = b.sd || (b.bounds ? [(b.bounds[0] + b.bounds[2]) / 2, (b.bounds[1] + b.bounds[3]) / 2] : [0, 0]);
  return Math.floor(hash2(sd[0] * 1.37 + 3.1, sd[1] * 0.91 - 7.7) * 4294967295) >>> 0;
}

// the ceiling of the ground floor: a floor is `floorH` with a slab above; churches and halls are tall
export function ceilingOf(kind, entrance) {
  const K = KINDS[kind];
  const raw = (entrance.floorH || 3) - 0.15;
  if (kind === 'kerk' || kind === 'station') return Math.min(K.h[1], Math.max(K.h[0], (entrance.depth || 8) * 0.8));
  return Math.min(K.h[1], raw);
}

// opts.spot: the kindOfFacility result of the place in this building; opts.owned: the player owns or rents it
export function planInterior(b, opts = {}) {
  if (!b || !b.pts) return { ok: false, why: 'none' };
  if (b.landmark || b.rooms || b.interior) return { ok: false, why: 'landmark' };
  const en = b.entrance;
  if (!en) return { ok: false, why: 'nodoor' };
  const ks = kindOfBuilding(b, opts.spot || null);
  if (!ks) return { ok: false, why: 'type' };
  const K = KINDS[ks.kind];
  const ceiling = ceilingOf(ks.kind, en);
  if (ceiling < MIN_CEILING) return { ok: false, why: 'low', kind: ks.kind };
  const frame = frameOf(en, en.c);
  const hall = findHall(b.pts, frame, { minW: K.minW, minD: K.minD });
  if (!hall) return { ok: false, why: 'small', kind: ks.kind };
  const seed = interiorSeed(b);
  const door = { w: Math.max(DOOR_GAP, en.w + 0.2), h: Math.min(en.h, ceiling - 0.15) };
  const look = ks.kind === 'woning' || ks.kind === 'kantoor' ? homeLook(en.look, seed / 4294967296) : null;
  const layout = generateLayout({ kind: ks.kind, sub: ks.sub, seed, hall, door, height: ceiling, look });
  if (!layout) return { ok: false, why: 'layout', kind: ks.kind };
  return { ok: true, kind: ks.kind, sub: ks.sub, seed, frame, hall, door, height: ceiling, layout, label: labelOf(ks.kind, ks.sub), shop: en.shop };
}

// Is the door open for the player? hour 0..24; private homes follow the "open house" share, owned ones always.
export function doorState(plan, hour, owned = false) {
  if (plan.kind === 'woning') {
    const open = homeOpen((plan.seed % 1000) / 1000, owned);
    return { open, why: open ? '' : 'slot' };
  }
  const open = isOpen(plan.kind, plan.sub, hour);
  return { open, why: open ? '' : 'gesloten', opensAt: open ? null : opensAt(plan.kind, plan.sub) };
}

export { WALL_T };
