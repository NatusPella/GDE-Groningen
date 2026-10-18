import { GeoBuilder } from './pixelart3d.js';

// Het Pannenkoekenschip (issue #23): a moored restaurant boat, the kind that
// lies along a Groninger canal. Pure geometry from plain parameters, no scene
// and no map: the caller picks a quay spot and places the result (long axis
// along +x, bow at +x, origin at the waterline in the middle of the hull).
// Groups: 0 body, 1 glow (window strip, lantern; lit at night), 2 glass.
// The name on the hull is a made-up one, see shipName().

const HULL = 0x2f4a5c, DECK = 0x8a6a48, CABIN = 0xe9e2d2, ROOF = 0xb5442f, STRIPE = 0xe8b84a, GLASS = 0x33424c, GLOW = 0xffd98a;

export const SHIP_NAMES = ['Het Pannenkoekenschip', 'De Stroopwaaf', 'De Gouden Pannenkoek'];
export function shipName(seed = 0) {
  return SHIP_NAMES[Math.abs(Math.floor(seed)) % SHIP_NAMES.length];
}

// p: { len (14..40 m), wid (4..8 m), seed }
export function pannenkoekenschipGeometry(p = {}) {
  const len = Math.max(14, Math.min(40, p.len || 26));
  const wid = Math.max(4, Math.min(8, p.wid || 6));
  const B = new GeoBuilder(3);
  const freeboard = 1.1, draught = 0.5;
  // hull: a box with a pointed bow
  B.box(-1, freeboard / 2 - draught / 2, 0, len - 3, freeboard + draught, wid, HULL, 0);
  const bowL = 3;
  for (const s of [-1, 1]) {
    B.box(len / 2 - 1.5 - bowL / 2 + 1.2, freeboard / 2 - draught / 2, s * wid * 0.3, bowL * 0.9, freeboard + draught, wid * 0.4, HULL, 0, 0, s * 0.45, 0);
  }
  B.box(0, freeboard + 0.03, 0, len - 2.4, 0.08, wid - 0.5, DECK, 0);
  B.box(0, freeboard * 0.75, 0, len - 3, 0.18, wid + 0.05, STRIPE, 0);
  // cabin with a glass strip, a flat red roof and a wheelhouse
  const cl = len * 0.6, cw = wid - 1.4, ch = 2.5;
  B.box(-1.5, freeboard + ch / 2, 0, cl, ch, cw, CABIN, 0);
  for (const s of [-1, 1]) {
    B.box(-1.5, freeboard + 1.4, s * (cw / 2 + 0.02), cl - 1.2, 1.0, 0.05, GLASS, 2);
    B.box(-1.5, freeboard + 1.4, s * (cw / 2 + 0.03), cl - 1.2, 0.12, 0.05, GLOW, 1);
  }
  B.box(-1.5, freeboard + ch + 0.12, 0, cl + 0.8, 0.24, cw + 0.8, ROOF, 0);
  B.box(len * 0.2, freeboard + ch + 0.24 + 0.9, 0, 3, 1.8, cw * 0.7, CABIN, 0);
  B.box(len * 0.2, freeboard + ch + 0.24 + 1.9, 0, 3.4, 0.2, cw * 0.7 + 0.4, ROOF, 0);
  // chimney with a stroopwafel-coloured band, a mooring lantern at the bow
  B.box(-len * 0.28, freeboard + ch + 1.2, 0, 0.5, 1.9, 0.5, HULL, 0);
  B.box(-len * 0.28, freeboard + ch + 1.6, 0, 0.56, 0.2, 0.56, STRIPE, 0);
  B.box(len / 2 - 0.8, freeboard + 0.7, 0, 0.2, 0.4, 0.2, GLOW, 1);
  // a pancake sign on the roof: a stack of discs as thin boxes
  for (let i = 0; i < 3; i++) B.box(-len * 0.1, freeboard + ch + 0.24 + 0.12 + i * 0.16, 0, 1.4 - i * 0.1, 0.14, 1.4 - i * 0.1, DECK, 0);
  return B.build();
}
