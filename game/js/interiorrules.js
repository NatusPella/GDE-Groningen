// From a building to its interior plan (epic Interieurs, #1150): is it enterable, what kind, how
// big is the hall behind the front door, and what is in it. Pure: a building row (b.pts, b.bounds,
// b.type, b.entrance, b.shopFront) in, a plan out; no scene, no map. The same function answers the
// game (interiors.js, when the player comes near) and the coverage audit (scripts/interior_audit.mjs,
// the whole province), so what the audit counts is what the game does.
import { hash2 } from './rng.js';
import { KINDS, SUB_HALL, hallMinOf, kindOfBuilding, fallbackKinds, homeOpen, labelOf } from './interiorkinds.js';
import { frameOf, findHall, synthEntrance, WALL_T } from './interiorframe.js';
import { generateLayout } from './interiorlayout.js';
import { mulberry32 } from './rng.js';
import { hasUpper, makeStairs, generateUpper, MIN_FLOOR_H } from './interiorupper.js';
import { homeLook } from './interiorlook.js';

export const MIN_CEILING = 2.1;   // lower than this is no room to stand in (r7: was 2.3; 526 of 8.328 sampled houses have two storeys of 2.25 m in the facade, ceiling 2.1 m)
export const HOME_UNTYPED_MIN = { w: 3.4, d: 4.5 }; // the smallest hall of a home without an OSM type
export const DOOR_GAP = 1.2;      // the opening cut in the facade (m): a little wider than the leaf
export const DOOR_CLEAR = 0.7;    // r7: the hall reaches at least this far to both sides of the door centre (was 0.9: terraced houses have the door 1.2 m from the corner)
// kinds whose door may come from synthEntrance when the facade builder drew none
export const SYNTH_KINDS = new Set(['kerk', 'publiek', 'garage', 'station']);
// r7: the facade builder drew no door (b.entrance === null, not undefined): every kind gets a made door on the best edge instead of 'nodoor'. A
// bijgebouw may have a short front (a 2.2 m edge), a garage box has its door in the short gable.
export const WHY = {
  none: 'geen gebouw', nodoor: 'geen voordeur in de gevel', type: 'geen betreedbaar soort gebouw', small: 'hal te klein (binnenmaat onder 3 x 3 m)',
  low: 'te laag', layout: 'geen indeling', landmark: 'eigen interieur',
};

// stable seed (0..2^32) of a building: the same on every client and in every session (b.sd is the centre of the
// building in the frame it was first made in, scripts/world/rebase_data.py)
export function interiorSeed(b) {
  const sd = b.sd || (b.bounds ? [(b.bounds[0] + b.bounds[2]) / 2, (b.bounds[1] + b.bounds[3]) / 2] : [0, 0]);
  return Math.floor(hash2(sd[0] * 1.37 + 3.1, sd[1] * 0.91 - 7.7) * 4294967295) >>> 0;
}

// the ceiling of the ground floor: a floor is `floorH` with a slab above; churches and halls are tall
export function ceilingOf(kind, entrance, sub = null) {
  const K = KINDS[kind];
  const fixed = SUB_HALL[kind + ':' + sub];
  if (fixed && fixed.ceil) return fixed.ceil; // a shed or a box has a low ceiling whatever the facade builder drew
  const raw = (entrance.floorH || 3) - 0.15;
  if (kind === 'kerk' || kind === 'station') return Math.min(K.h[1], Math.max(K.h[0], (entrance.depth || 8) * 0.8));
  return Math.min(K.h[1], raw);
}

// opts.spot: the kindOfFacility result of the place in this building; opts.owned: the player owns or rents it
export function planInterior(b, opts = {}) {
  if (!b || !b.pts) return { ok: false, why: 'none' };
  if (b.landmark || b.rooms || b.interior) return { ok: false, why: 'landmark' };
  const ks = kindOfBuilding(b, opts.spot || null);
  if (!ks) return { ok: false, why: 'type' };
  const first = planKind(b, ks, opts);
  if (first.ok || !['small', 'low', 'nodoor'].includes(first.why) || opts.spot) return first;
  // r7: the hall of the main kind is too small: a small building without a fitting kind becomes a shed or a garage box (deterministic from the building)
  for (const fk of fallbackKinds(b, ks)) {
    const alt = planKind(b, fk, opts);
    if (alt.ok) return alt;
  }
  return first;
}

function planKind(b, ks, opts) {
  // no door from the facade builder (churches, schools, halls with a roller door): the best edge gets one
  const sub = ks.sub || null, bij = ks.kind === 'garage' && SUB_HALL['garage:' + sub];
  const en = b.entrance || (SYNTH_KINDS.has(ks.kind) || b.entrance === null ? synthEntrance(b, ks.kind === 'kerk', bij ? 2.2 : undefined) : null);
  if (!en) return { ok: false, why: 'nodoor' };
  const K = KINDS[ks.kind];
  const ceiling = ceilingOf(ks.kind, en, sub);
  if (ceiling < MIN_CEILING) return { ok: false, why: 'low', kind: ks.kind };
  const frame = frameOf(en, en.c);
  // r6: a house of a known type may be small (2.6 x 3.2 m); an untyped building ('yes') is mostly a shed or a garden house and keeps the old size (3.4 x 4.5 m)
  const small = ks.kind === 'woning' && (b.type || 'yes') === 'yes';
  const min = hallMinOf(ks.kind, sub);
  const hall = findHall(b.pts, frame, { minW: small ? HOME_UNTYPED_MIN.w : min.w, minD: small ? HOME_UNTYPED_MIN.d : min.d, doorClear: DOOR_CLEAR });
  if (!hall) return { ok: false, why: 'small', kind: ks.kind };
  const seed = interiorSeed(b);
  const door = { w: Math.max(DOOR_GAP, en.w + 0.2), h: Math.min(en.h, ceiling - 0.15) };
  let look = ks.kind === 'woning' || ks.kind === 'kantoor' ? homeLook(en.look, seed / 4294967296) : null;
  if (look && opts.style) look = { ...look, ...opts.style, accent: opts.style.accent ?? opts.style.fabric ?? look.accent }; // Homebase: the colours of a home you live in
  // a second floor where the building has one and the kind can use it (woningen, kantoren, hotels, winkels met een etage)
  let stairs = null, upper = null, layout = null, height2 = 0;
  const floors = en.floors || 1, floorH = en.floorH || 3;
  if (opts.upper !== false && floors >= 2 && hasUpper(ks.kind, ks.sub) && floorH >= MIN_FLOOR_H) {
    stairs = makeStairs(hall, door, mulberry32(seed ^ 0x2545f491), floorH);
    if (stairs) {
      layout = generateLayout({ kind: ks.kind, sub: ks.sub, seed, hall, door, height: ceiling, look, stairs });
      height2 = Math.max(2.3, Math.min(floorH - 0.15, (en.depth || floorH * 2) - floorH - 0.15));
      upper = layout ? generateUpper({ kind: ks.kind, sub: ks.sub, seed, hall, door, height2, look }, layout, stairs) : null;
      if (!upper) { stairs = null; layout = null; }
    }
  }
  if (!layout) layout = generateLayout({ kind: ks.kind, sub: ks.sub, seed, hall, door, height: ceiling, look });
  if (!layout) return { ok: false, why: 'layout', kind: ks.kind, sub: ks.sub, hall, door, height: ceiling };
  layout.upper = upper;
  return {
    ok: true, kind: ks.kind, sub: ks.sub, seed, frame, hall, door, height: ceiling, layout, label: labelOf(ks.kind, ks.sub), shop: en.shop,
    doorC: en.c, windows: en.windows || [], doorColor: en.doorColor, frameColor: en.frameColor,
    levels: upper ? 2 : 1, stairs, floorH, height2, topY: upper ? floorH + height2 : ceiling,
  };
}

// Is the door open for the player? Businesses always; homes of others only the "open house" share (the rest is not enterable), owned ones always.
export function doorState(plan, hour, owned = false) {
  if (plan.kind === 'woning') {
    const open = homeOpen((plan.seed % 1000) / 1000, owned);
    return { open, why: open ? '' : 'slot' };
  }
  return { open: true, why: '' }; // businesses are always open (owner decision 21-11)
}

export { WALL_T };

// can this building be planned already? (its facade has been drawn and decided on a door, or a door can be made)
// (r7: a shed, box, barn or greenhouse waits for its facade too: a real door beats a made one)
export const planReady = (b) => {
  if (b.entrance !== undefined) return true;
  const k = kindOfBuilding(b);
  return !!k && SYNTH_KINDS.has(k.kind) && !SUB_HALL[k.kind + ':' + k.sub];
};
