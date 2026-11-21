// The look of the rooms behind the windows, as plain numbers (epic Interieurs, #1150). A player who
// looks through a window sees the fake room of interiorglass.js; walking in he must find the SAME
// room: the same wall colour, the same floor, the same piece of furniture. The window picks its
// room from the pane key (K, kind, width and height in decimetres) with a hash; this file is that
// hash and the palettes in JS, so the interior generator reads the room of the pane next to the door.
//
// The hash is an integer hash (exact in JS and in the shader, unlike sin()-based hashes, whose
// float rounding differs per GPU). interiorglass.js uses the same function (igHash24) for the
// palette choice; interior_look_test.mjs keeps the two texts equal.
//
// Shops need no hash: the window of a shop shows the winkelkit table of its type, and so does the
// inside (interiorlayout.js reads the same WINKEL rows).
import { WINKEL } from './winkelkit.js';

export const PANE = { HOME: 0, GROUND: 1, SHOP: 2, OFFICE: 3 };

// the palettes of the window shader (linear-looking sRGB values 0..1, as in the GLSL)
export const IG_WALL = [[0.93, 0.90, 0.84], [0.90, 0.85, 0.72], [0.95, 0.94, 0.90], [0.64, 0.72, 0.60], [0.62, 0.72, 0.80], [0.86, 0.74, 0.68], [0.32, 0.44, 0.36], [0.26, 0.32, 0.44]];
export const IG_FABRIC = [[0.55, 0.14, 0.12], [0.30, 0.40, 0.24], [0.80, 0.72, 0.58], [0.20, 0.25, 0.40], [0.78, 0.58, 0.26], [0.50, 0.50, 0.52], [0.62, 0.36, 0.30], [0.24, 0.42, 0.42]];
export const IG_WOOD = [[0.62, 0.44, 0.26], [0.42, 0.28, 0.17], [0.74, 0.60, 0.42], [0.30, 0.20, 0.13]];
export const OFFICE_WALL = [0.88, 0.89, 0.9], OFFICE_FLOOR = [0.22, 0.24, 0.26];

export const hex = (c) => (Math.round(c[0] * 255) << 16) | (Math.round(c[1] * 255) << 8) | Math.round(c[2] * 255);
const f = Math.fround;
const frac = (x) => x - Math.floor(x);

// Integer hash to [0, 1) with 24 bits: the same code as igHash24 in interiorglass.js.
export function hashU(x) {
  x >>>= 0;
  x ^= x >>> 16; x = Math.imul(x, 0x7feb352d) >>> 0;
  x ^= x >>> 15; x = Math.imul(x, 0x846ca68b) >>> 0;
  x ^= x >>> 16;
  return x >>> 0;
}
export const hash24 = (x) => (hashU(x) >>> 8) / 16777216;

// pane key from a pane (rank 0..1, kind, size in metres): the same quantisation as paneUV (interiorglass.js)
export function paneKey(rank, kind, w, h) {
  const r = Math.min(0.999, Math.max(0, rank));
  const K = kind === PANE.SHOP ? (Math.floor(r * 32) << 3) : Math.floor(r * 256);
  return { K, kind, wd: Math.min(63, Math.max(1, Math.round(w * 10))), hd: Math.min(63, Math.max(1, Math.round(h * 10))) };
}

// s1 of the shader: the seed of a room
export const paneSeed = (k) => hash24(((k.K * 8 + k.kind) * 977 + k.wd * 61 + k.hd) >>> 0);

// The room behind a home pane: wall, furniture piece (0 sofa, 1 bookcase, 2 table, 3 bed), floor and rug,
// the same picks as igInterior (ground floor: a bed becomes a sofa).
export function paneRoom(k) {
  const s1 = paneSeed(k);
  const s2 = frac(f(f(s1 * 13.37) + 0.21)), s3 = frac(f(f(s1 * 71.93) + 0.47)), s4 = frac(f(f(s1 * 31.17) + 0.83)), s5 = frac(f(f(s1 * 5.71) + 0.13));
  const ground = k.kind === PANE.GROUND;
  const office = k.kind === PANE.OFFICE;
  let ft = Math.floor(s2 * 4.99);
  if (ft === 3 && ground) ft = 0;
  const carpet = s3 < 0.22;
  return {
    wall: office ? hex(OFFICE_WALL) : hex(IG_WALL[Math.floor(s1 * 7.99)]),
    furniture: ft,
    fabric: hex(IG_FABRIC[Math.floor(s4 * 7.99)]),
    wood: hex(IG_WOOD[Math.floor(s5 * 3.99)]),
    floor: office ? hex(OFFICE_FLOOR) : carpet ? hex(IG_FABRIC[Math.floor(s2 * 7.99)].map((v) => v * 0.8)) : hex(IG_WOOD[Math.floor(s3 * 3.99)]),
    carpet,
    rug: s4 > 0.45 ? hex(IG_FABRIC[Math.floor(s4 * 7.99)]) : null,
    seed: s1,
  };
}

// look for the generator (homes and offices): from the pane next to the door (entrance.look), or by seed
export function homeLook(look, seed01 = 0.5) {
  const k = look && Number.isFinite(look.K) ? look : paneKey(seed01, PANE.GROUND, 1.2, 1.3);
  const r = paneRoom(k);
  return { wall: r.wall, floor: r.floor, accent: r.fabric, fabric: r.fabric, furniture: r.furniture, rug: r.rug, carpet: r.carpet, wood: r.wood };
}

// shop palette = the table of the window
export function shopLook(sub) {
  const T = WINKEL[sub] || WINKEL.tweedehands;
  return { wall: T.wall, floor: T.floor, floorPattern: T.floorPattern, accent: T.accent };
}
