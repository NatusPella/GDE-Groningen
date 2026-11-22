// Big halls get furniture and figurants that fit their function (epic Interieurs, #1150, r8 22-11). A recipe (interiorlayout.js) is written for a
// shop, a counter hall or an office of a normal size; in a hall of 20 m and more most of the floor stayed empty (7 % of the floor under furniture
// where an office has 16 %). After the recipe, fillBigHall lays stamps (a desk with a chair and a typist, a waiting corner, a row of servers, a car lift,
// a pair of benches) on a grid in the free floor of the hall: inside the walls with a margin, never in the entrance zone, never on a partition,
// a stair or an earlier item (Plan.fits with an aisle gap), with an aisle every third column, a hard cap on items and people. Pure and
// deterministic: only the plan's own random stream (seeded from the building) is used, so host and guest build the same hall. No import of
// interiorlayout.js (that module calls this one): the four faces are repeated here.
const F = { DOOR: 0, E: 1, BACK: 2, W: 3 };

export const BIG_HALL = { minArea: 110, minSide: 10, maxItems: 56, maxNpc: 8, aisle: 0.55, margin: 0.7, entry: 3.0 };

// a big hall: large enough that the recipe leaves it half empty
export const isBigHall = (hall) => {
  const w = hall.u1 - hall.u0, d = hall.v1 - hall.v0;
  return w * d >= BIG_HALL.minArea && Math.max(w, d) >= BIG_HALL.minSide && Math.min(w, d) >= 5;
};

// a stamp: bbox (w x d around its centre) and items [type, du, dv, w, d, face, props]; npc { role, du, dv, face, pose }
const DESK = { w: 1.7, d: 1.6, prob: 0.8, items: [['desk', 0, -0.4, 1.5, 0.8, F.DOOR, { h: 0.75 }], ['chair', 0, 0.4, 0.5, 0.5, F.BACK, { h: 0.9 }]], npc: { role: 'medewerker', du: 0, dv: 0.4, face: F.BACK, pose: 'sit', chance: 0.55 } };
const PLANT = { w: 0.7, d: 0.7, prob: 0.5, items: [['plant', 0, 0, 0.6, 0.6, F.DOOR, { h: 1.2 }]] };
const CABINETS = { w: 2.4, d: 0.6, prob: 0.6, items: [['cabinet', -0.6, 0, 1.1, 0.5, F.DOOR, { h: 1.9 }], ['cabinet', 0.6, 0, 1.1, 0.5, F.DOOR, { h: 1.9 }]] };
const PRINTERS = { w: 1.8, d: 0.9, prob: 0.5, items: [['copier', -0.5, 0, 0.8, 0.7, F.DOOR, { h: 1.1 }], ['coffee', 0.6, 0, 0.6, 0.5, F.DOOR, { h: 1.3 }]] };
const SERVERS = { w: 2.8, d: 0.9, prob: 0.9, items: [['machine', -0.9, 0, 0.8, 0.7, F.DOOR, { h: 2.0, color: 0x2a3138 }], ['machine', 0, 0, 0.8, 0.7, F.DOOR, { h: 2.0, color: 0x2a3138 }], ['machine', 0.9, 0, 0.8, 0.7, F.DOOR, { h: 2.0, color: 0x2a3138 }]] };
const WAITING = { w: 2.6, d: 1.8, prob: 0.7, items: [['table', 0, 0, 0.9, 0.6, F.DOOR, { h: 0.5 }], ['sofa', 0, 0.85, 1.8, 0.8, F.DOOR, { h: 0.8 }], ['plant', 1.15, -0.5, 0.5, 0.5, F.DOOR, { h: 1.1 }]], npc: { role: 'bezoeker', du: 0, dv: 0.85, face: F.DOOR, pose: 'sit', chance: 0.5 } };
const BENCHES = { w: 4.4, d: 0.9, prob: 0.7, items: [['bench', -1.1, 0, 1.8, 0.5, F.BACK, { h: 0.45 }], ['bench', 1.1, 0, 1.8, 0.5, F.BACK, { h: 0.45 }]] };
const SHOWCASE = { w: 2.6, d: 1.6, prob: 0.7, items: [['showcase', 0, 0, 1.4, 0.6, F.DOOR, { h: 1.2 }], ['bench', 0, 1.0, 1.4, 0.45, F.BACK, { h: 0.45 }]] };
// (a shop keeps its own recipe: its gondolas already cost 5.000 to 7.000 triangles in a big hall)
const GONDOLA = { w: 3.2, d: 0.9, prob: 0.85, items: [['gondola', 0, 0, 2.4, 0.7, F.DOOR, { h: 1.3, row: 2 }]] };
const RACK = { w: 3.0, d: 0.9, prob: 0.5, items: [['rack', 0, 0, 1.6, 0.5, F.DOOR, { h: 1.6 }]] };
const LIVING = { w: 3.0, d: 2.6, prob: 0.8, items: [['rug', 0, 0.2, 2.4, 1.6, F.DOOR, { h: 0.02, solid: false }], ['tv', 0, -1.0, 1.1, 0.4, F.DOOR, { h: 0.9 }], ['sofa', 0, 1.0, 2.0, 0.9, F.BACK, { h: 0.85 }]], npc: { role: 'bewoner', du: 0, dv: 1.0, face: F.BACK, pose: 'sit', chance: 0.4 } };
const DINING = { w: 2.6, d: 2.4, prob: 0.8, items: [['table', 0, 0, 1.6, 0.9, F.DOOR, { h: 0.75 }], ['chair', -0.5, -0.8, 0.45, 0.45, F.BACK, { h: 0.9 }], ['chair', 0.5, -0.8, 0.45, 0.45, F.BACK, { h: 0.9 }], ['chair', -0.5, 0.8, 0.45, 0.45, F.DOOR, { h: 0.9 }], ['chair', 0.5, 0.8, 0.45, 0.45, F.DOOR, { h: 0.9 }]] };
const BOOKS = { w: 2.4, d: 0.6, prob: 0.5, items: [['bookcase', -0.6, 0, 1.0, 0.35, F.DOOR, { h: 2.0 }], ['bookcase', 0.6, 0, 1.0, 0.35, F.DOOR, { h: 2.0 }]] };
const CARLIFT = { w: 3.6, d: 5.4, prob: 0.8, items: [['carlift', 0, 0, 2.4, 4.4, F.DOOR, { h: 1.6, color: 0xe0e0dc }]], npc: { role: 'monteur', du: 1.7, dv: 0, face: F.W, pose: 'stand', chance: 0.5 } };
const BENCHWORK = { w: 3.4, d: 1.1, prob: 0.7, items: [['workbench', 0, 0, 1.6, 0.7, F.DOOR, { h: 0.95 }], ['tyres', 1.2, 0, 0.8, 0.8, F.DOOR, { h: 0.9 }]] };
const STORAGE = { w: 3.0, d: 1.2, prob: 0.8, items: [['crate', -0.9, 0, 0.6, 0.5, F.DOOR, { h: 0.5, color: 0xb8956a }], ['crate', -0.2, 0, 0.6, 0.5, F.DOOR, { h: 0.5, color: 0xa0825a }], ['barrel', 0.7, 0, 0.55, 0.55, F.DOOR, { h: 0.9, color: 0x2f6a8a }], ['shelf', 0, 0.55, 2.0, 0.4, F.DOOR, { h: 1.9, color: 0x5a6a7a }]] };
const GROW = { w: 3.0, d: 0.9, prob: 0.8, items: [['table', 0, 0, 2.2, 0.7, F.DOOR, { h: 0.8, color: 0xdad6cc }], ['plant', 0, 0, 1.8, 0.5, F.DOOR, { h: 1.2 }]] };
const FITNESS = { w: 2.4, d: 1.8, prob: 0.8, items: [['machine', 0, 0, 0.9, 1.4, F.DOOR, { h: 1.5, color: 0x3a3c3e }]] };
const BEDS = { w: 2.8, d: 2.4, prob: 0.7, items: [['bed', -0.3, 0, 2.0, 0.9, F.W, { h: 0.55 }], ['cabinet', 1.15, 0, 0.5, 0.5, F.DOOR, { h: 0.6 }]] };

// per kind (and variant) a list of passes: stamps tried on a grid, in order. `wall`: stamps against a wall instead of in the room
const KITS = {
  kantoor: { passes: [{ stamp: SERVERS, wall: 'left', skip: 0 }, { stamp: PRINTERS, wall: 'right' }, { stamp: CABINETS, wall: 'right' }, { stamp: DESK, pu: 2.4, pv: 2.6 }, { stamp: PLANT, wall: 'right' }] },
  'publiek:gemeente': { passes: [{ stamp: CABINETS, wall: 'right' }, { stamp: PRINTERS, wall: 'left' }, { stamp: DESK, pu: 2.6, pv: 2.8 }, { stamp: WAITING, pu: 3.4, pv: 3.0 }, { stamp: PLANT, wall: 'right' }] },
  'publiek:politie': { passes: [{ stamp: CABINETS, wall: 'right' }, { stamp: PRINTERS, wall: 'left' }, { stamp: DESK, pu: 2.6, pv: 2.8 }, { stamp: PLANT, wall: 'right' }] },
  'publiek:apotheek': { passes: [{ stamp: GONDOLA, pu: 3.6, pv: 2.8 }, { stamp: WAITING, pu: 3.4, pv: 3.2 }, { stamp: PLANT, wall: 'right' }] },
  'publiek:hotel': { passes: [{ stamp: WAITING, pu: 3.4, pv: 3.0 }, { stamp: PLANT, wall: 'right' }, { stamp: SHOWCASE, pu: 3.2, pv: 3.2 }] },
  'publiek:ziekenhuis': { passes: [{ stamp: BEDS, pu: 3.2, pv: 3.0 }, { stamp: WAITING, pu: 3.4, pv: 3.2 }, { stamp: PLANT, wall: 'right' }] },
  'publiek:museum': { passes: [{ stamp: SHOWCASE, pu: 3.2, pv: 3.2 }, { stamp: PLANT, wall: 'right' }] },
  'publiek:sportschool': { passes: [{ stamp: FITNESS, pu: 2.8, pv: 2.4 }, { stamp: PLANT, wall: 'right' }] },
  woning: { passes: [{ stamp: BOOKS, wall: 'right' }, { stamp: LIVING, pu: 3.6, pv: 3.4 }, { stamp: DINING, pu: 3.2, pv: 3.2 }, { stamp: PLANT, wall: 'left' }] },
  'woning:appartement': { passes: [{ stamp: LIVING, pu: 3.6, pv: 3.4 }, { stamp: DINING, pu: 3.2, pv: 3.2 }, { stamp: PLANT, wall: 'left' }] },
  'kerk:gebedshuis': { passes: [{ stamp: BENCHES, pu: 5.0, pv: 1.6 }] },
  station: { passes: [{ stamp: BENCHES, pu: 5.0, pv: 3.0 }, { stamp: PLANT, wall: 'right' }] },
  'garage:werkplaats': { passes: [{ stamp: CARLIFT, pu: 4.2, pv: 6.0 }, { stamp: BENCHWORK, wall: 'right' }, { stamp: STORAGE, wall: 'left' }] },
  'garage:schuur': { passes: [{ stamp: STORAGE, pu: 3.6, pv: 3.0 }] },
  'garage:box': { passes: [{ stamp: STORAGE, pu: 3.6, pv: 3.0 }, { stamp: BENCHWORK, wall: 'right' }] },
  'garage:stal': { passes: [{ stamp: STORAGE, pu: 3.6, pv: 3.2 }] },
  'garage:kas': { passes: [{ stamp: GROW, pu: 3.4, pv: 1.6 }] },
};
export const FILL_KINDS = Object.keys(KITS);
const kitOf = (kind, sub) => KITS[kind + ':' + sub] || KITS[kind] || null;

const rectOfBox = (cu, cv, w, d) => ({ u0: cu - w / 2, u1: cu + w / 2, v0: cv - d / 2, v1: cv + d / 2 });

// Lay a stamp at (cu, cv) when the whole bbox fits with an aisle around it; false when not.
function stampAt(p, S, cu, cv, area, fills) {
  const box = rectOfBox(cu, cv, S.w, S.d);
  if (!p.fits(box, area, BIG_HALL.aisle)) return false;
  const placed = [];
  for (const [type, du, dv, w, d, face, props] of S.items) {
    const it = p.add(type, cu + du, cv + dv, w, d, face, props || {}, area);
    if (!it) { for (const q of placed) p.items.splice(p.items.indexOf(q), 1); return false; }
    placed.push(it);
  }
  fills.items += placed.length;
  const n = S.npc;
  if (n && p.npc.length < BIG_HALL.maxNpc && p.rnd() < n.chance) { p.npcAt(n.role, cu + n.du, cv + n.dv, n.face, n.pose, n.pose === 'sit' ? { seat: p.npc.length } : {}); fills.npc++; }
  return true;
}

// Fill a big hall (after the recipe, before the decoration). Returns { items, npc } added; { items: 0, npc: 0 } for a hall that is not big or a kind without a kit.
export function fillBigHall(p, kind, sub) {
  const fills = { items: 0, npc: 0 };
  const kit = kitOf(kind, sub);
  if (!kit || !isBigHall(p.hall) || p.density <= 0) return fills;
  const H = p.hall, m = BIG_HALL.margin;
  const area = { u0: H.u0 + m, u1: H.u1 - m, v0: H.v0 + BIG_HALL.entry, v1: H.v1 - m };
  if (area.u1 - area.u0 < 3 || area.v1 - area.v0 < 3) return fills;
  for (const pass of kit.passes) {
    const S = pass.stamp;
    if (pass.wall) {
      // along a side wall (left: u0, right: u1) from the entrance zone to the back
      const cu = pass.wall === 'left' ? area.u0 + S.d / 2 : area.u1 - S.d / 2;
      const rot = pass.wall === 'left' ? F.E : F.W;
      // turn the stamp a quarter: the offset along the wall is du, the depth (away from the front) dv; the item sizes stay (an odd face swaps them itself)
      const sgn = pass.wall === 'left' ? -1 : 1;
      const rotated = { ...S, w: S.d, d: S.w, items: S.items.map(([t, du, dv, w, d, f, pr]) => [t, sgn * dv, du, w, d, f === F.DOOR ? rot : f, pr]) };
      for (let v = area.v0 + S.w / 2; v <= area.v1 - S.w / 2 + 1e-6; v += S.w + 0.5) {
        if (fills.items >= BIG_HALL.maxItems) return fills;
        if (p.rnd() > S.prob * p.density) continue;
        stampAt(p, rotated, cu, v, area, fills);
      }
      continue;
    }
    const pu = pass.pu || S.w + 0.8, pv = pass.pv || S.d + 0.8;
    let col = 0;
    for (let v = area.v0 + S.d / 2; v <= area.v1 - S.d / 2 + 1e-6; v += pv) {
      col = 0;
      for (let u = area.u0 + S.w / 2; u <= area.u1 - S.w / 2 + 1e-6; u += pu, col++) {
        if (col % 3 === 2) continue; // an aisle every third column
        if (fills.items >= BIG_HALL.maxItems) return fills;
        if (p.rnd() > S.prob * p.density) continue;
        stampAt(p, S, u, v, area, fills);
      }
    }
  }
  return fills;
}
