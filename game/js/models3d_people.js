import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { HABBO_PALETTE, SkinBuilder, loftGeometry, composeMatrix, vcMaterial, markShared, tubeGeometry } from './pixelart3d.js';
import { hash2 } from './rng.js';

// Low-poly humanoid for the on-foot player, every pedestrian, drivers and
// bike/scooter riders: one SkinnedMesh (one draw call, one shared material)
// on an 11-bone rig. Origin at ground level between the feet, facing +X.
// userData.legL/legR/armL/armR are the hip/shoulder bones (rotated about Z
// by callers); knees/elbows follow them automatically unless
// animatePersonWalk or a pose sets them explicitly.


const HIP_Y = 0.93;
const KNEE_Y = 0.49;
const ANKLE_Y = 0.08;
const THIGH_LEN = HIP_Y - KNEE_Y;
const SHIN_LEN = KNEE_Y - ANKLE_Y;
const CHEST_Y = 1.07;
const SHOULDER_Y = 1.4;
const UPPER_ARM = 0.29;
const FOREARM = 0.25;
const ARM_SPLAY = 0.06;
const NECK_Y = 1.49;
const HEAD_Y = 1.655;
const DEFAULT_CAP = 0xc8621e;

const BONE = { pelvis: 0, chest: 1, head: 2, thigh: [3, 5], knee: [4, 6], arm: [7, 9], elbow: [8, 10] };

export const PERSON_RIG = { HIP_Y, KNEE_Y, ANKLE_Y, THIGH_LEN, SHIN_LEN, CHEST_Y, SHOULDER_Y, UPPER_ARM, FOREARM, NECK_Y, HEAD_Y };

export const TAMMO_APPEARANCE = { shirt: 0x3f6ea8, skin: HABBO_PALETTE.woodLight, hair: HABBO_PALETTE.woodDark, variant: 'male', character: 'tammo', cap: DEFAULT_CAP, pants: 0x2f3b52, shoes: 0xd8d4cc, hairStyle: 'short', seed: 11 };
export const ANITA_APPEARANCE = { shirt: 0x9e3027, skin: HABBO_PALETTE.woodMid, hair: 0x1b1716, variant: 'female', character: 'anita', pants: 0x26262a, shoes: 0x2a1d14, hairStyle: 'long', seed: 23 };

const HAIR_COLORS = [0x2a1d14, 0x3b2a1e, 0x5a3d26, 0x7a5636, 0xb08f5c, 0xcdb485, 0x93462a, 0x1b1b1d, 0x2a1d14];
const GREY_HAIR = [0x8a8580, 0xb4afa6, 0xd2cec6, 0x6e6a66];
const PANTS_COLORS = [0x2f3b52, 0x232326, 0x3a3b3f, 0x7f7258, 0x4a3a2a, 0x5b5f63, 0x3b4a3a, 0x6b6250];
const JEANS_COLORS = [0x3a4d6e, 0x2f3f5a, 0x4a5f82, 0x28303f, 0x55657a];
const SKIRT_COLORS = [0x232326, 0x3a3b3f, 0x5c1f1f, 0x2f3b52, 0x6b6250, 0x4a3a54];
const SHOE_COLORS = [0x1e1e1e, 0x3b2a1e, 0xd8d4cc, 0x5a3d26, 0x2a2f38, 0x1e1e1e, 0x8a8478];
const UNDER_COLORS = [0xe3ddd0, 0x2b2f36, 0xb8b2a6, 0x8a8478, 0xc9bfa8, 0x3a3f47];
const BAG_COLORS = [0x232326, 0x3b2a1e, 0x4a5a4a, 0x6b2a24, 0x2f3b52, 0x7a6a4a];
const HAT_COLORS = [0x2b2f36, 0x6b2a24, 0x3f4a3b, 0xb8a27a, 0x1f2a3a, 0x7a2e2e];
const SCARF_COLORS = [0x7a2e2e, 0xc9a227, 0x3f5c8a, 0x8a8478, 0x2f4a3a, 0xb05a3a];
const RAINCOAT_COLORS = [0xc9a227, 0x1f3a52, 0x9e3027, 0x2f4a3a, 0x3a3f47];
const HIJAB_COLORS = [0x2b2f36, 0x5c1f1f, 0x3f5c8a, 0x8a7a6a, 0x4a3a54, 0x1f4a2e];
const UMBRELLA_COLORS = [0x1e1e1e, 0x2f3b52, 0x7a2e2e, 0x3f4a3b];
const COP_BLUE = 0x1c3fae;
const COP_CAR_BLUE = 0x1f3f8f;
const COP_NAVY = 0x1d2433;
const COP_TROUSERS = 0x1b2130;
const REFLECT_YELLOW = 0xd6c43c;
const REFLECT_BLUE = 0x3a5fb8;
const EYE_WHITE = 0xd4cbbd;
const EYE_DARK = 0x19140f;

let rainLevel = 0;
export function setPeopleWeather(intensity) {
  rainLevel = Number.isFinite(intensity) ? intensity : 0;
}

const leashHolders = new Set();
export function setLeashHolder(seed, on) {
  if (seed === undefined) return;
  if (on) leashHolders.add(seed);
  else leashHolders.delete(seed);
}

function shade(hex, f) {
  const r = Math.min(255, Math.round(((hex >> 16) & 0xff) * f));
  const g = Math.min(255, Math.round(((hex >> 8) & 0xff) * f));
  const b = Math.min(255, Math.round((hex & 0xff) * f));
  return (r << 16) | (g << 8) | b;
}

function mix(a, b, t) {
  const ch = (s) => Math.round(((a >> s) & 0xff) * (1 - t) + ((b >> s) & 0xff) * t);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}

function pick(arr, t) {
  return arr[Math.min(arr.length - 1, Math.floor(t * arr.length))];
}

function choose(t, table) {
  let acc = 0;
  for (const [v, p] of table) {
    acc += p;
    if (t < acc) return v;
  }
  return table[table.length - 1][0];
}

let pedSeedCounter = 0;

function resolveLook(shirt, skin, opts) {
  const seed = opts.seed ?? (++pedSeedCounter * 7.31 + hash2(shirt % 997, skin % 991) * 50);
  const r = (k) => hash2(seed * 1.37 + k * 17.13, seed * 0.71 + k * 5.71);
  const character = opts.character || null;
  const cop = !character && (shirt === COP_BLUE || shirt === COP_CAR_BLUE);
  const female = opts.variant ? opts.variant === 'female' : (!cop && r(1) < 0.5);
  const age = character || cop ? 'adult' : choose(r(15), [['young', 0.3], ['adult', 0.52], ['old', 0.18]]);
  const build = character ? 'avg' : choose(r(14), [['slim', 0.3], ['avg', 0.5], ['heavy', 0.2]]);
  const rainy = !character && !cop && rainLevel > 0.35;

  let top;
  if (cop) top = 'police';
  else if (rainy && r(20) < 0.3) top = 'raincoat';
  else if (female) top = choose(r(3), [['tee', 0.13], ['longsleeve', 0.1], ['sweater', 0.12], ['hoodie', 0.1], ['jacket', 0.18], ['coat', 0.23], ['dress', 0.14]]);
  else top = choose(r(3), [['tee', 0.17], ['longsleeve', 0.12], ['sweater', 0.14], ['hoodie', 0.16], ['jacket', 0.22], ['coat', 0.12], ['blazer', 0.07]]);
  if (age === 'old' && top === 'hoodie') top = 'coat';

  let bottom;
  if (cop) bottom = 'trousers';
  else if (top === 'dress') bottom = 'dress';
  else if (female) bottom = choose(r(6), [['jeans', 0.35], ['trousers', 0.27], ['skirt', 0.3], ['shorts', 0.08]]);
  else bottom = choose(r(6), [['jeans', 0.46], ['trousers', 0.44], ['shorts', 0.1]]);
  if (rainy && bottom === 'shorts') bottom = 'jeans';

  let hairStyle = opts.hairStyle;
  const hijab = !character && !cop && female && r(16) < 0.07;
  if (!hairStyle) {
    const t = r(2);
    if (hijab) hairStyle = 'hijab';
    else if (female) hairStyle = age === 'old' ? (t < 0.5 ? 'bob' : t < 0.8 ? 'bun' : 'short') : choose(t, [['long', 0.3], ['ponytail', 0.2], ['bun', 0.14], ['bob', 0.14], ['curly', 0.1], ['afro', 0.05], ['short', 0.07]]);
    else if (cop) hairStyle = 'buzz';
    else hairStyle = age === 'old' ? (t < 0.45 ? 'bald' : t < 0.8 ? 'short' : 'buzz') : choose(t, [['short', 0.42], ['buzz', 0.16], ['bald', 0.08], ['curly', 0.14], ['afro', 0.06], ['long', 0.06], ['bun', 0.04], ['ponytail', 0.04]]);
  }

  const hatRoll = r(4);
  let hat = null;
  if (cop) hat = 'police';
  else if (!character && hairStyle !== 'hijab') {
    if (age === 'old' && !female && hatRoll < 0.3) hat = 'flatcap';
    else if (hatRoll < 0.09) hat = 'beanie';
    else if (hatRoll < 0.14) hat = 'cap';
  }
  const hoodUp = top === 'raincoat' || (rainy && top === 'hoodie' && r(21) < 0.6);
  if (hoodUp) hat = null;

  const facial = female || cop || character ? 'none' : choose(r(17), age === 'old'
    ? [['none', 0.35], ['moustache', 0.3], ['beard', 0.25], ['stubble', 0.1]]
    : [['none', 0.46], ['stubble', 0.2], ['beard', 0.14], ['moustache', 0.08], ['goatee', 0.12]]);

  const hair = opts.hair ?? (age === 'old' ? pick(GREY_HAIR, r(5)) : pick(HAIR_COLORS, r(5)));
  const pants = opts.pants ?? (cop ? COP_TROUSERS : bottom === 'jeans' ? pick(JEANS_COLORS, r(7)) : bottom === 'skirt' ? pick(SKIRT_COLORS, r(7)) : pick(PANTS_COLORS, r(7)));
  const shoeType = cop ? 'boot' : choose(r(18), [['sneaker', 0.45], ['leather', 0.35], ['boot', 0.2]]);
  const heightBase = female ? 0.94 : 1;
  return {
    seed, r, cop, female, age, build, top, bottom, hairStyle, hat, hoodUp, facial, character,
    hair,
    hatColor: pick(HAT_COLORS, r(9)),
    pants,
    shoes: opts.shoes ?? (cop ? 0x151515 : pick(SHOE_COLORS, r(8))),
    shoeType,
    under: cop ? 0x9fb4d8 : pick(UNDER_COLORS, r(10)),
    rolled: r(19) < 0.45,
    tights: r(12) < 0.55 ? 0x26262a : shade(skin, 0.94),
    bag: cop || character ? null : (r(11) < 0.15 ? 'backpack' : r(11) < 0.27 ? 'shoulder' : null),
    bagColor: pick(BAG_COLORS, r(13)),
    glasses: !cop && !character && r(22) < (age === 'old' ? 0.45 : 0.14),
    scarf: !cop && !character && hairStyle !== 'hijab' && top !== 'tee' && r(23) < 0.18,
    scarfColor: pick(SCARF_COLORS, r(24)),
    raincoatColor: pick(RAINCOAT_COLORS, r(25)),
    hijabColor: pick(HIJAB_COLORS, r(26)),
    umbrella: rainy && !hoodUp && r(27) < 0.4 ? pick(UMBRELLA_COLORS, r(28)) : null,
    heightScale: character ? (female ? 0.97 : 1.02) : heightBase * (age === 'old' ? 0.95 : 1) * (0.95 + r(13.5) * 0.1),
    buildScale: character ? 1 : (build === 'slim' ? 0.93 : build === 'heavy' ? 1.08 : 1) * (0.97 + r(14.5) * 0.06),
  };
}

// --- body proportions --------------------------------------------------------

function torsoRings(L) {
  const f = L.female, heavy = L.build === 'heavy', slim = L.build === 'slim';
  const belly = heavy ? 1.32 : L.age === 'old' && !f ? 1.12 : 1;
  const sh = f ? 0.172 : 0.198;
  return [
    { y: 0.83, d: 0.075, w: 0.09 },
    { y: 0.9, d: 0.1, w: f ? 0.168 : 0.158 },
    { y: 1.09, d: f ? 0.086 : 0.098, w: f ? 0.128 : 0.146, front: belly },
    { y: 1.19, d: f ? 0.094 : 0.106, w: f ? 0.14 : 0.16, front: f ? 1.08 : belly > 1 ? 1 + (belly - 1) * 0.6 : 1 },
    { y: 1.28, d: f ? 0.1 : 0.116, w: f ? 0.158 : 0.182, sq: 0.8, front: f ? 1.2 : 1.04 },
    { y: 1.35, d: f ? 0.094 : 0.108, w: sh, sq: 0.7 },
    { y: 1.41, d: f ? 0.085 : 0.095, w: sh, sq: 0.75 },
    { y: 1.455, d: 0.074, w: sh * 0.8, sq: 0.8 },
    { y: 1.485, d: 0.058, w: 0.064 },
  ].map((rg) => (slim ? { ...rg, w: rg.w * 0.95 } : heavy ? { ...rg, w: rg.w * 1.06, d: rg.d * 1.06 } : rg));
}

function ringAt(rings, y) {
  for (let i = 0; i < rings.length - 1; i++) {
    const a = rings[i], b = rings[i + 1];
    if ((y >= a.y && y <= b.y) || (y <= a.y && y >= b.y)) {
      const t = (y - a.y) / (b.y - a.y || 1);
      const lerp = (k, def) => (a[k] ?? def) + ((b[k] ?? def) - (a[k] ?? def)) * t;
      return { y, d: lerp('d', 0), w: lerp('w', 0), x: lerp('x', 0), sq: lerp('sq', 1), front: lerp('front', 1) };
    }
  }
  return { ...rings[y < rings[0].y ? 0 : rings.length - 1], y };
}

// Rings between y0 and y1 (either direction), scaled by k.
function slice(rings, y0, y1, k = 1, dx = 0) {
  const lo = Math.min(y0, y1), hi = Math.max(y0, y1);
  const inner = rings.filter((r) => r.y > lo && r.y < hi);
  const out = [ringAt(rings, y0), ...(y0 < y1 ? inner : inner.reverse()), ringAt(rings, y1)];
  return out.map((r) => ({ ...r, d: r.d * k, w: r.w * k, x: (r.x || 0) + dx }));
}

function loftUp(rings, sides) {
  const sorted = rings[0].y <= rings[rings.length - 1].y ? rings : [...rings].reverse();
  return loftGeometry(sorted, sides, Math.PI / sides);
}

function blend(a, b, y, y0, y1) {
  if (y <= y0) return [a, a, 1];
  if (y >= y1) return [b, b, 1];
  return [a, b, 1 - (y - y0) / (y1 - y0)];
}

const W_TORSO = (x, y) => blend(BONE.pelvis, BONE.chest, y, 1.0, 1.16);
const W_NECK = (x, y) => blend(BONE.chest, BONE.head, y, 1.47, 1.53);
const W_LEG = (k) => (x, y) => blend(BONE.knee[k], BONE.thigh[k], y, KNEE_Y - 0.04, KNEE_Y + 0.05);
const W_ARM = (k) => (x, y) => blend(BONE.elbow[k], BONE.arm[k], y, SHOULDER_Y - UPPER_ARM - 0.03, SHOULDER_Y - UPPER_ARM + 0.03);
const W_PANEL = (k, maxW) => (x, y) => [BONE.thigh[k], BONE.pelvis, Math.min(1, Math.max(0, (HIP_Y + 0.02 - y) / 0.2)) * maxW];

// Half-shell of a loft (rings as in loftGeometry) on one leg's side (s = +1
// for +z), split along the centre line front and back.
function hemPanel(rings, s, segs = 6) {
  const ring = (r) => {
    const out = [];
    for (let i = 0; i <= segs; i++) {
      const t = (i / segs) * Math.PI, c = Math.cos(t);
      out.push([c * r.d * (c > 0 ? (r.front ?? 1) : 1), r.y, Math.sin(t) * r.w]);
    }
    return out;
  };
  const rs = rings.map(ring), pos = [];
  for (let n = 0; n < rs.length - 1; n++) {
    const A = rs[n], C = rs[n + 1];
    for (let i = 0; i < segs; i++) pos.push(...A[i], ...C[i + 1], ...A[i + 1], ...A[i], ...C[i], ...C[i + 1]);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  return s > 0 ? g : flipWinding(g.scale(1, 1, -1));
}

// Coat tails / skirts as two panels, each carried by its own thigh, so
// running legs swing the cloth instead of poking through it.
function hemPanels(B, rings, maxW, color) {
  const prev = B.bone;
  for (let k = 0; k < 2; k++) {
    B.bone = W_PANEL(k, maxW);
    B.geo(hemPanel(rings, k === 0 ? 1 : -1), null, color);
  }
  B.bone = prev;
}

function flipWinding(g) {
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i += 3) {
    const x = p.getX(i + 1), y = p.getY(i + 1), z = p.getZ(i + 1);
    p.setXYZ(i + 1, p.getX(i + 2), p.getY(i + 2), p.getZ(i + 2));
    p.setXYZ(i + 2, x, y, z);
  }
  return g;
}

function ell(ws, hs, fn, phiStart = 0, phiLen = Math.PI * 2, thStart = 0, thLen = Math.PI) {
  const g = new THREE.SphereGeometry(1, ws, hs, phiStart, phiLen, thStart, thLen);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const [x, y, z] = fn(p.getX(i), p.getY(i), p.getZ(i));
    p.setXYZ(i, x, y, z);
  }
  return g;
}

function headShape(k = 1, dx = 0, dy = 0) {
  return (nx, ny, nz) => {
    let x = nx * 0.097, y = ny * 0.118, z = nz * 0.086;
    if (ny < 0) {
      z *= 1 - 0.3 * Math.pow(-ny, 1.4);
      x *= nx > 0 ? 1 - 0.1 * -ny : 1 - 0.3 * -ny;
    }
    if (nx < 0 && ny > -0.3) x *= 1.07;
    return [x * k + dx, y * k + HEAD_Y + dy, z * k];
  };
}

// Front surface (x) of the head at height dy above HEAD_Y and side offset z,
// so painted-on features sit on the face instead of floating in front of it.
function faceX(dy, z) {
  const ny = Math.max(-0.99, Math.min(0.99, dy / 0.118));
  const zf = ny < 0 ? 1 - 0.3 * Math.pow(-ny, 1.4) : 1;
  const nz = z / (0.086 * zf);
  const nx = Math.sqrt(Math.max(0, 1 - ny * ny - nz * nz));
  return nx * 0.097 * (ny < 0 ? 1 - 0.1 * -ny : 1);
}

// --- builder -----------------------------------------------------------------

function buildHead(B, L, skin) {
  const H = BONE.head;
  B.bone = H;
  B.geo(ell(9, 7, headShape()), null, skin);
  B.bone = W_NECK;
  B.geo(loftGeometry([{ y: 1.44, d: 0.06, w: 0.062 }, { y: 1.52, d: 0.054, w: 0.052 }, { y: HEAD_Y - 0.05, d: 0.05, w: 0.048 }], 6), null, shade(skin, 0.94));
  B.bone = H;

  const nose = new THREE.CylinderGeometry(0.009, 0.016, 0.042, 3).rotateY(Math.PI / 2);
  B.geo(nose, composeMatrix(faceX(-0.014, 0) - 0.004, HEAD_Y - 0.014, 0, 0, 0, 0.22), shade(skin, 0.96));
  for (const s of [1, -1]) {
    const ez = s * 0.033;
    B.box(faceX(0.034, ez) - 0.006, HEAD_Y + 0.034, ez, 0.014, 0.014, 0.036, shade(skin, 0.95), 0, 0, -s * 0.4, 0);
    plate(B, faceX(0.01, ez) + 0.0015, HEAD_Y + 0.01, ez, 0.0085, 0.013, -s * 0.4, EYE_WHITE);
    plate(B, faceX(0.01, ez) + 0.003, HEAD_Y + 0.009, s * 0.032, 0.0075, 0.0065, -s * 0.4, EYE_DARK);
    plate(B, faceX(0.04, ez) + 0.004, HEAD_Y + 0.04, ez, 0.0045, 0.016, -s * 0.4, shade(L.hair, 0.8), s * 0.12);
    B.box(-0.004, HEAD_Y + 0.002, s * 0.084, 0.03, 0.044, 0.016, shade(skin, 0.92));
  }
  plate(B, faceX(-0.052, 0) + 0.0015, HEAD_Y - 0.052, 0, 0.005, 0.017, 0, mix(shade(skin, 0.78), 0x8a3a30, 0.3));

  if (L.glasses) {
    const lens = L.shades ? 0x101214 : mix(shade(skin, 0.7), 0x5d6f7a, 0.6);
    for (const s of [1, -1]) {
      B.box(faceX(0.012, s * 0.034) + 0.007, HEAD_Y + 0.012, s * 0.034, 0.006, 0.03, 0.04, 0x26262a, 0, 0, -s * 0.4, 0);
      B.box(faceX(0.012, s * 0.034) + 0.0105, HEAD_Y + 0.012, s * 0.034, 0.002, 0.022, 0.032, lens, 0, 0, -s * 0.4, 0);
    }
    B.box(faceX(0.02, 0) + 0.006, HEAD_Y + 0.02, 0, 0.006, 0.006, 0.03, 0x26262a);
    for (const s of [1, -1]) {
      const fx = faceX(0.02, s * 0.052) + 0.006;
      B.geo(tubeGeometry([fx, HEAD_Y + 0.018, s * 0.052], [0.05, HEAD_Y + 0.02, s * 0.079], 0.003, 0.003, 3), null, 0x26262a);
      B.geo(tubeGeometry([0.05, HEAD_Y + 0.02, s * 0.079], [-0.01, HEAD_Y + 0.02, s * 0.087], 0.003, 0.003, 3), null, 0x26262a);
    }
  }

  const beardColor = L.facial === 'stubble' ? mix(skin, L.hair, 0.3) : L.hair;
  if (L.facial === 'beard' || L.facial === 'stubble') {
    const k = L.facial === 'beard' ? 1.08 : 1.02;
    B.geo(ell(8, 3, headShape(k, 0.002), Math.PI * 0.5, Math.PI, Math.PI * 0.56, Math.PI * 0.4), null, beardColor);
  }
  if (L.facial === 'moustache' || L.facial === 'beard') B.box(faceX(-0.037, 0) - 0.002, HEAD_Y - 0.037, 0, 0.012, 0.012, 0.046, shade(L.hair, 0.9));
  if (L.facial === 'goatee') {
    B.box(faceX(-0.037, 0) - 0.002, HEAD_Y - 0.037, 0, 0.011, 0.011, 0.042, L.hair);
    B.box(faceX(-0.085, 0) - 0.008, HEAD_Y - 0.085, 0, 0.02, 0.038, 0.034, L.hair);
  }

  buildHair(B, L);
  buildHat(B, L);
}

// Flat quad facing +x (yawed by ry, rolled by rx) for painted-on face details.
function plate(B, x, y, z, h, w, ry, color, rx = 0) {
  const m = composeMatrix(x, y, z, rx, ry, 0);
  const v = (py, pz) => new THREE.Vector3(0, py, pz).applyMatrix4(m).toArray();
  const n = new THREE.Vector3(1, 0, 0).applyEuler(new THREE.Euler(rx, ry, 0)).toArray();
  B.quadOut(v(-h, -w), v(-h, w), v(h, w), v(h, -w), n, color);
}

// Tilt about the head centre (not the ground origin), nudged slightly back.
function headTilt(tilt) {
  return composeMatrix(0, HEAD_Y, 0, 0, 0, tilt).multiply(composeMatrix(-0.006, -HEAD_Y, 0));
}

// Hair/cap shell over the scalp; its lower rim is pulled onto the head so
// the shell never reads as a hat floating above it.
function hairCap(B, L, k, tilt, color, thLen = Math.PI * 0.52) {
  const rimNy = Math.cos(thLen);
  const g = ell(10, 4, (nx, ny, nz) => {
    const t = Math.min(1, Math.max(0, (ny - rimNy) / 0.45));
    return headShape(0.99 + (k - 0.99) * t, -0.006 * t, 0.004 * t)(nx, ny, nz);
  }, 0, Math.PI * 2, 0, thLen);
  B.geo(g, composeMatrix(0, HEAD_Y, 0, 0, 0, tilt).multiply(composeMatrix(0, -HEAD_Y, 0)), color);
}

function lumpyCap(B, k, color, seed, lift = 0) {
  const g = new THREE.IcosahedronGeometry(1, 1);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const j = 1 + (hash2(Math.round(x * 50) + seed, Math.round(y * 50) * 3 + Math.round(z * 50)) - 0.5) * 0.14;
    const [hx, hy, hz] = headShape(k * j, -0.012, lift)(x, Math.max(y, -0.05), z);
    p.setXYZ(i, hx, hy, hz);
  }
  B.geo(g, null, color);
}

function buildHair(B, L) {
  const c = L.hair, style = L.hairStyle;
  const capped = L.hat === 'tammo' || L.hat === 'cap' || L.hat === 'police' || L.hat === 'flatcap' || L.hat === 'beanie' || L.hoodUp;
  switch (style) {
    case 'bald':
      if (L.age === 'old') B.geo(ell(8, 2, headShape(1.03, -0.004), -Math.PI * 0.3, Math.PI * 0.6, Math.PI * 0.42, Math.PI * 0.16), null, c);
      break;
    case 'buzz':
      hairCap(B, L, 1.015, 0.32, capped ? c : mix(c, 0x6a5a4a, 0.15));
      break;
    case 'curly':
      if (capped) hairCap(B, L, 1.06, 0.4, c);
      else lumpyCap(B, 1.14, c, 3);
      break;
    case 'afro':
      if (capped) hairCap(B, L, 1.08, 0.4, c);
      else lumpyCap(B, 1.42, c, 7, 0.03);
      break;
    case 'hijab':
      break;
    default:
      hairCap(B, L, style === 'short' ? 1.04 : 1.055, 0.3, c);
  }
  if (style === 'short' || style === 'buzz') {
    for (const s of [1, -1]) B.box(0.028, HEAD_Y + 0.004, s * 0.084, 0.022, 0.045, 0.01, c);
  }
  if (style === 'long') {
    hairCurtain(B, c, L.character === 'anita' ? 0.29 : 0.26);
  } else if (style === 'bob') {
    const back = new THREE.CylinderGeometry(1, 1, 1, 8, 1, true, Math.PI * 0.62, Math.PI * 1.76);
    const p = back.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const top = p.getY(i) > 0;
      p.setXYZ(i, p.getX(i) * (top ? 0.106 : 0.112) - 0.01, top ? HEAD_Y + 0.03 : HEAD_Y - 0.085, p.getZ(i) * (top ? 0.097 : 0.108));
    }
    B.geo(back, null, c);
  } else if (style === 'ponytail') {
    B.geo(tubeGeometry([-0.1, HEAD_Y + 0.03, 0], [-0.16, HEAD_Y - 0.2, 0], 0.035, 0.018, 5), null, c);
    B.box(-0.105, HEAD_Y + 0.025, 0, 0.03, 0.03, 0.05, shade(c, 0.6));
  } else if (style === 'bun') {
    B.geo(new THREE.SphereGeometry(1, 6, 4), composeMatrix(-0.075, HEAD_Y + 0.1, 0, 0, 0, 0, 0.052, 0.046, 0.052), c);
  } else if (style === 'hijab') {
    const hc = L.hijabColor;
    B.geo(ell(10, 6, headShape(1.13, -0.004), Math.PI + 0.62, Math.PI * 2 - 1.24, 0, Math.PI * 0.8), null, hc);
    B.geo(ell(10, 3, headShape(1.14, -0.004, 0.004), 0, Math.PI * 2, 0, Math.PI * 0.3), null, hc);
    B.bone = BONE.chest;
    B.geo(loftGeometry([{ y: 1.36, d: 0.13, w: 0.19, sq: 0.8 }, { y: 1.46, d: 0.085, w: 0.1 }, { y: 1.55, d: 0.075, w: 0.08 }], 10), null, shade(hc, 0.92));
    B.bone = BONE.head;
  }
}

// Long hair as one closed shell: an outer and a slightly darker inner
// surface joined along the face opening and the tips, hugging the scalp at
// the top and falling straight onto the back and shoulders. Alternate
// columns are shaded a touch so it reads as tidy strands, not a helmet.
function hairCurtain(B, c, len) {
  const COLS = 12, ROWS = 4, T = 0.016;
  const open = 0.34 * Math.PI;
  const inner = shade(c, 0.72);
  const rows = [
    { y: HEAD_Y + 0.05, rx: 0.1, rz: 0.091, dx: -0.014 },
    { y: HEAD_Y - 0.02, rx: 0.108, rz: 0.1, dx: -0.016 },
    { y: HEAD_Y - 0.1, rx: 0.106, rz: 0.106, dx: -0.024 },
    { y: HEAD_Y - 0.19, rx: 0.1, rz: 0.114, dx: -0.036 },
    { y: HEAD_Y - len, rx: 0.092, rz: 0.12, dx: -0.05 },
  ];
  const at = (r, i, off) => {
    const a = open + (i / COLS) * (Math.PI * 2 - open * 2);
    const ca = Math.cos(a), sa = Math.sin(a);
    const front = Math.max(0, ca);
    const rx = r.rx + off, rz = r.rz + off;
    return [ca * rx * (1 - 0.25 * front) + r.dx, r.y, sa * rz];
  };
  for (let k = 0; k < ROWS; k++) {
    const r0 = rows[k], r1 = rows[k + 1];
    for (let i = 0; i < COLS; i++) {
      const col = i % 2 ? shade(c, 0.93) : c;
      const a0 = at(r0, i, 0), a1 = at(r0, i + 1, 0), b0 = at(r1, i, 0), b1 = at(r1, i + 1, 0);
      const mid = (i + 0.5) / COLS * (Math.PI * 2 - open * 2) + open;
      const out = [Math.cos(mid), 0, Math.sin(mid)];
      B.quadOut(a0, a1, b1, b0, out, col);
      const ia0 = at(r0, i, -T), ia1 = at(r0, i + 1, -T), ib0 = at(r1, i, -T), ib1 = at(r1, i + 1, -T);
      B.quadOut(ia0, ia1, ib1, ib0, [-out[0], 0, -out[2]], inner);
    }
    for (const i of [0, COLS]) {
      const s = i === 0 ? 1 : -1;
      const a = open + (i / COLS) * (Math.PI * 2 - open * 2);
      const side = [-Math.sin(a) * s, 0, Math.cos(a) * s];
      B.quadOut(at(r0, i, 0), at(r1, i, 0), at(r1, i, -T), at(r0, i, -T), side, shade(c, 0.85));
    }
  }
  const last = rows[ROWS], first = rows[0];
  for (let i = 0; i < COLS; i++) {
    B.quadOut(at(last, i, 0), at(last, i + 1, 0), at(last, i + 1, -T), at(last, i, -T), [0, -1, 0], shade(c, 0.8));
    B.quadOut(at(first, i, 0), at(first, i + 1, 0), at(first, i + 1, -T), at(first, i, -T), [0, 1, 0], c);
  }
}

function buildHat(B, L) {
  const hat = L.hat;
  if (!hat) {
    if (L.hoodUp) {
      const c = L.top === 'raincoat' ? L.raincoatColor : L.topColor;
      B.geo(ell(10, 5, headShape(1.2, -0.012, 0.006), Math.PI + 0.72, Math.PI * 2 - 1.44, 0, Math.PI * 0.7), null, c);
      B.geo(ell(10, 2, headShape(1.21, -0.012, 0.008), 0, Math.PI * 2, 0, Math.PI * 0.24), null, c);
    }
    return;
  }
  if (hat === 'beanie') {
    hairCap(B, L, 1.14, 0.22, L.hatColor, Math.PI * 0.5);
    B.geo(loftGeometry([{ y: HEAD_Y + 0.02, d: 0.113, w: 0.1 }, { y: HEAD_Y + 0.055, d: 0.114, w: 0.101 }], 10), headTilt(0.12), shade(L.hatColor, 0.85));
  } else if (hat === 'cap' || hat === 'tammo') {
    const c = hat === 'tammo' ? L.capColor : L.hatColor;
    hairCap(B, L, 1.12, 0.12, c, Math.PI * 0.5);
    const brim = new THREE.CylinderGeometry(1, 1, 0.014, 8, 1, false, 0, Math.PI);
    B.geo(brim, composeMatrix(0.075, HEAD_Y + 0.045, 0, 0, 0, -0.16, 0.095, 1, 0.098), shade(c, 0.82));
    B.geo(new THREE.SphereGeometry(1, 5, 2, 0, Math.PI * 2, 0, Math.PI / 2), composeMatrix(-0.01, HEAD_Y + 0.13, 0, 0, 0, 0.12, 0.014, 0.01, 0.014), shade(c, 0.8));
    if (hat === 'tammo') {
      B.geo(loftGeometry([{ y: HEAD_Y + 0.03, d: 0.108, w: 0.098 }, { y: HEAD_Y + 0.05, d: 0.109, w: 0.099 }], 10), headTilt(0.12), shade(c, 0.7));
      B.box(0.094, HEAD_Y + 0.078, 0, 0.01, 0.032, 0.044, 0xe6e1d6, 0, 0, 0, -0.5);
    }
  } else if (hat === 'flatcap') {
    hairCap(B, L, 1.1, 0.25, L.hatColor, Math.PI * 0.42);
    B.box(0.075, HEAD_Y + 0.058, 0, 0.1, 0.018, 0.18, shade(L.hatColor, 0.9), 0, 0, 0, -0.28);
  } else if (hat === 'police') {
    const crown = loftGeometry([
      { y: HEAD_Y + 0.035, d: 0.104, w: 0.094 },
      { y: HEAD_Y + 0.075, d: 0.106, w: 0.096 },
      { y: HEAD_Y + 0.12, d: 0.124, w: 0.112 },
      { y: HEAD_Y + 0.13, d: 0.118, w: 0.106 },
    ], 10);
    B.geo(crown, headTilt(0.05), COP_NAVY);
    B.geo(new THREE.CircleGeometry(1, 10).rotateX(-Math.PI / 2), composeMatrix(-0.006, HEAD_Y + 0.13, 0, 0, 0, 0.05, 0.118, 1, 0.106), shade(COP_NAVY, 1.15));
    B.geo(loftGeometry([{ y: HEAD_Y + 0.045, d: 0.107, w: 0.097 }, { y: HEAD_Y + 0.07, d: 0.108, w: 0.098 }], 10), headTilt(0.05), 0xc8ccd0);
    const brim = new THREE.CylinderGeometry(1, 1, 0.012, 8, 1, false, 0, Math.PI);
    B.geo(brim, composeMatrix(0.07, HEAD_Y + 0.04, 0, 0, 0, -0.3, 0.08, 1, 0.09), 0x111214);
    B.box(0.112, HEAD_Y + 0.1, 0, 0.01, 0.028, 0.022, 0xb8a060);
  } else if (hat === 'krans') {
    // een bloemenkrans (vrijgezellenfeest, vrijgezellen.js): een groen bandje met kleine bloemen eromheen
    B.geo(loftGeometry([{ y: HEAD_Y + 0.06, d: 0.109, w: 0.099 }, { y: HEAD_Y + 0.085, d: 0.111, w: 0.101 }], 10), headTilt(0.05), 0x3f8a3c);
    const bloem = [L.hatColor, 0xf2c400, 0xffffff, 0xff8a3c];
    for (let k = 0; k < 9; k++) {
      const a = (k / 9) * Math.PI * 2;
      B.box(Math.cos(a) * 0.113, HEAD_Y + 0.082 + (k % 2) * 0.012, Math.sin(a) * 0.103, 0.036, 0.036, 0.036, bloem[k % 4], 0, a * 0.5, 0.3, a);
    }
  } else if (hat === 'konijn') {
    // een bandje met twee lange konijnenoren, roze van binnen
    B.geo(loftGeometry([{ y: HEAD_Y + 0.06, d: 0.108, w: 0.098 }, { y: HEAD_Y + 0.072, d: 0.109, w: 0.099 }], 10), headTilt(0.05), shade(L.hatColor, 0.8));
    for (const s of [1, -1]) {
      B.box(-0.015, HEAD_Y + 0.22, s * 0.055, 0.034, 0.2, 0.05, L.hatColor, 0, 0.18 * s, 0, 0.15);
      B.box(0.003, HEAD_Y + 0.22, s * 0.058, 0.012, 0.15, 0.03, 0xf2a6c0, 0, 0.18 * s, 0, 0.15);
    }
  } else if (hat === 'sluier') {
    // de sluier van de bruid: een kransje en een lichte sluier tot op de schouders
    B.geo(loftGeometry([{ y: HEAD_Y + 0.06, d: 0.108, w: 0.098 }, { y: HEAD_Y + 0.07, d: 0.109, w: 0.099 }], 10), headTilt(0.05), 0xf2efe6);
    B.box(-0.125, HEAD_Y - 0.06, 0, 0.012, 0.34, 0.21, 0xf8f6f0, 0, 0, 0, 0.06);
    for (const s of [1, -1]) B.box(0.02, HEAD_Y + 0.085, s * 0.075, 0.03, 0.03, 0.03, 0xf4d3de);
  } else if (hat === 'tiara') {
    // een gouden kroontje met vijf puntjes
    B.geo(loftGeometry([{ y: HEAD_Y + 0.07, d: 0.107, w: 0.097 }, { y: HEAD_Y + 0.085, d: 0.108, w: 0.098 }], 10), headTilt(0.05), L.hatColor);
    for (let k = -2; k <= 2; k++) {
      const a = k * 0.5;
      B.box(Math.cos(a) * 0.112, HEAD_Y + 0.112 - Math.abs(k) * 0.008, Math.sin(a) * 0.1, 0.014, 0.034 - Math.abs(k) * 0.006, 0.014, L.hatColor, 0, 0, 0, 0);
    }
  }
}

// Swimwear: suit colour from the crotch up to the cut (trunks at the waist,
// a bikini low on the hips, a swimsuit up to the chest), bare skin above; a
// bikini adds a band round the chest.
function buildSwimTorso(B, L, skin, rings) {
  const c = L.pants;
  const cut = L.swim === 'swimsuit' ? 1.4 : L.swim === 'bikini' ? 0.93 : 1.0;
  B.bone = W_TORSO;
  B.geo(loftUp(slice(rings, 0.83, cut), 10), null, c);
  B.geo(new THREE.CircleGeometry(1, 10).rotateX(Math.PI / 2), composeMatrix(0, 0.83, 0, 0, 0, 0, 0.075, 1, 0.09), c);
  B.geo(loftUp(slice(rings, cut, 1.485, 1), 10), null, skin);
  if (L.swim === 'bikini') B.geo(loftGeometry(slice(rings, 1.22, 1.32, 1.035), 10, Math.PI / 10), null, c);
  else if (L.swim === 'trunks') B.geo(loftGeometry(slice(rings, 0.975, 1.005, 1.03), 10, Math.PI / 10), null, shade(c, 0.8));
  else B.geo(loftGeometry(slice(rings, 1.37, 1.4, 1.02), 10, Math.PI / 10), null, shade(c, 0.85));
}

function buildTorso(B, L, skin) {
  const rings = torsoRings(L);
  if (L.top === 'swim') { buildSwimTorso(B, L, skin, rings); return; }
  const top = L.topColor, pants = L.bottom === 'skirt' ? L.skirtColor : L.pants;
  const long = L.top === 'coat' || L.top === 'raincoat';
  const tucked = L.top === 'blazer' || L.top === 'police' || (L.top === 'longsleeve' && !L.female);
  const hem = L.top === 'dress' ? 0.84 : long ? 0.95 : tucked ? 1.0 : L.top === 'jacket' || L.top === 'hoodie' ? 0.92 : 0.95;
  B.bone = W_TORSO;
  B.geo(loftUp(slice(rings, 0.83, hem), 10), null, L.top === 'dress' ? top : pants);
  B.geo(new THREE.CircleGeometry(1, 10).rotateX(Math.PI / 2), composeMatrix(0, 0.83, 0, 0, 0, 0, 0.075, 1, 0.09), L.top === 'dress' ? top : pants);
  const layer = tucked ? 1.0 : 1.035;
  const topRings = slice(rings, hem, 1.485, 1);
  topRings[0] = { ...topRings[0], d: topRings[0].d * layer, w: topRings[0].w * layer };
  B.geo(loftUp(topRings, 10), null, top);

  const front = (y) => { const rg = ringAt(rings, y); return rg.d * (rg.front ?? 1); };
  if (tucked || L.top === 'tee' || L.bottom === 'skirt') {
    const bc = L.top === 'police' ? 0x121212 : shade(L.pants, 0.55);
    B.geo(loftGeometry(slice(rings, 0.985, 1.025, 1.045), 10, Math.PI / 10), null, bc);
    if (L.top !== 'police') B.box(front(1.005) * 1.04 + 0.004, 1.005, 0, 0.01, 0.034, 0.04, 0xb8a060);
  }

  const collarRing = (c, k = 1.12, h = 0.035) => B.geo(loftGeometry([{ y: 1.445, d: 0.075 * k, w: 0.12 * k, sq: 0.8 }, { y: 1.45 + h, d: 0.062 * k, w: 0.07 * k }], 10), null, c);
  switch (L.top) {
    case 'tee':
      collarRing(shade(top, 0.85), 1.02, 0.02);
      break;
    case 'longsleeve':
      B.box(front(1.4) + 0.012, 1.42, 0, 0.02, 0.04, 0.12, shade(top, 1.1), 0, 0, 0, -0.5);
      for (let i = 0; i < 3; i++) B.box(front(1.33 - i * 0.1) + 0.004, 1.33 - i * 0.1, 0, 0.006, 0.012, 0.012, 0xd8d4cc);
      break;
    case 'sweater':
      collarRing(shade(top, 0.8), 1.05, 0.04);
      B.geo(loftGeometry(slice(rings, hem, hem + 0.05, 1.07), 10, Math.PI / 10), null, shade(top, 0.8));
      break;
    case 'hoodie':
      B.box(front(1.06) * 1.02 + 0.01, 1.06, 0, 0.018, 0.1, 0.2, shade(top, 0.9));
      for (const s of [1, -1]) B.box(front(1.33) + 0.01, 1.29, s * 0.03, 0.006, 0.12, 0.008, 0xd8d4cc);
      if (!L.hoodUp) {
        B.bone = BONE.chest;
        B.geo(ell(8, 4, (x, y, z) => [x * 0.11 - 0.1, y * 0.09 + 1.47, z * 0.13], Math.PI * 1.5, Math.PI, 0, Math.PI * 0.62), null, shade(top, 0.9));
        B.bone = W_TORSO;
      }
      collarRing(shade(top, 0.95), 1.1, 0.045);
      break;
    case 'jacket':
    case 'blazer': {
      const open = L.top === 'blazer' || L.forceOpen || L.r(30) < 0.6;
      if (open) {
        B.box(front(1.25) * 1.02, 1.22, 0, 0.012, 0.36, 0.08, L.under);
        for (const s of [1, -1]) B.box(front(1.34) + 0.006, 1.34, s * 0.05, 0.014, 0.16, 0.035, shade(top, 0.85), 0, s * 0.3, s * 0.35, 0);
      } else {
        B.box(front(1.2) * 1.02 + 0.005, 1.2, 0, 0.008, 0.48, 0.008, 0xb8b4ac);
      }
      for (const s of [1, -1]) B.box(front(1.02) * 1.05, 1.02, s * 0.085, 0.012, 0.018, 0.06, shade(top, 0.75));
      if (L.hood) {
        B.bone = BONE.chest;
        B.geo(ell(8, 4, (x, y, z) => [x * 0.11 - 0.1, y * 0.09 + 1.47, z * 0.13], Math.PI * 1.5, Math.PI, 0, Math.PI * 0.62), null, shade(top, 0.9));
        B.bone = W_TORSO;
      }
      collarRing(shade(top, 0.9), 1.12, 0.05);
      break;
    }
    case 'coat':
    case 'raincoat': {
      const c = L.top === 'raincoat' ? L.raincoatColor : top;
      const hemRings = [
        L.shortCoat ? { y: 0.66, d: 0.19, w: 0.25, front: 0.85 } : { y: 0.56, d: 0.2, w: 0.27, front: 0.8 },
        { y: 0.8, d: 0.14, w: 0.2 },
        { y: 0.99, d: 0.112, w: 0.172 },
      ];
      hemPanels(B, hemRings, 0.9, c);
      for (let i = 0; i < 3; i++) B.box(front(1.28 - i * 0.12) + 0.008, 1.28 - i * 0.12, 0.03, 0.01, 0.018, 0.018, L.top === 'raincoat' ? 0xe0ddd4 : 0x2a2622);
      if (L.top === 'coat') {
        B.geo(loftGeometry(slice(rings, 1.04, 1.08, 1.07), 10, Math.PI / 10), null, shade(c, 0.75));
        for (const s of [1, -1]) B.box(front(1.38) + 0.01, 1.38, s * 0.06, 0.016, 0.12, 0.05, shade(c, 0.88), 0, s * 0.35, s * 0.4, 0);
      }
      collarRing(shade(c, 0.88), 1.15, 0.06);
      break;
    }
    case 'dress':
      hemPanels(B, [{ y: 0.52, d: 0.17, w: 0.23, front: 0.82 }, { y: 0.84, d: 0.11, w: 0.18 }, { y: 0.99, d: 0.1, w: 0.165 }], 0.9, top);
      collarRing(shade(top, 0.9), 1.0, 0.015);
      break;
    case 'police': {
      B.geo(loftGeometry(slice(rings, 1.15, 1.2, 1.035), 10, Math.PI / 10), null, REFLECT_YELLOW);
      B.geo(loftGeometry(slice(rings, 1.2, 1.225, 1.035), 10, Math.PI / 10), null, REFLECT_BLUE);
      B.geo(loftGeometry(slice(rings, 1.125, 1.15, 1.035), 10, Math.PI / 10), null, REFLECT_BLUE);
      B.box(front(1.2) + 0.01, 1.22, 0, 0.006, 0.44, 0.006, 0x3a4050);
      B.box(front(1.33) + 0.012, 1.33, -0.075, 0.022, 0.07, 0.04, 0x141414);
      B.box(front(1.33) + 0.02, 1.36, -0.075, 0.008, 0.04, 0.008, 0x222222);
      collarRing(shade(COP_NAVY, 1.2), 1.12, 0.05);
      B.bone = BONE.pelvis;
      B.box(0.0, 0.99, -0.165, 0.09, 0.14, 0.05, 0x121212);
      B.box(0.075, 0.99, 0.14, 0.05, 0.08, 0.05, 0x1a1a1a);
      B.bone = W_TORSO;
      break;
    }
  }

  if (L.bottom === 'skirt') {
    hemPanels(B, [{ y: 0.58, d: 0.155, w: 0.21, front: 0.85 }, { y: 0.9, d: 0.112, w: 0.176 }, { y: 1.0, d: 0.1, w: 0.162 }], 0.9, L.skirtColor);
  }

  if (L.scarf) {
    B.bone = BONE.chest;
    B.geo(loftGeometry([{ y: 1.41, d: 0.1, w: 0.12 }, { y: 1.47, d: 0.078, w: 0.085 }, { y: 1.52, d: 0.062, w: 0.066 }], 8), null, L.scarfColor);
    B.box(front(1.33) + 0.02, 1.32, 0.04, 0.02, 0.2, 0.055, shade(L.scarfColor, 0.9), 0, 0, 0.1, -0.08);
    B.bone = W_TORSO;
  }

  if (L.bag === 'backpack') {
    B.bone = BONE.chest;
    const bx = -ringAt(rings, 1.22).d - 0.07;
    B.box(bx, 1.2, 0, 0.13, 0.34, 0.27, L.bagColor);
    B.geo(new THREE.CylinderGeometry(1, 1, 0.27, 6, 1, false, 0, Math.PI).rotateX(Math.PI / 2).rotateZ(Math.PI / 2), composeMatrix(bx, 1.37, 0, 0, 0, 0, 0.065, 0.065, 1), L.bagColor);
    B.box(bx - 0.075, 1.12, 0, 0.03, 0.14, 0.2, shade(L.bagColor, 0.8));
    for (const s of [1, -1]) B.box(0.01, 1.3, s * 0.1, ringAt(rings, 1.3).d * 2.1, 0.035, 0.035, shade(L.bagColor, 0.65), 0, 0, 0, 0);
    B.bone = W_TORSO;
  } else if (L.bag === 'shoulder') {
    B.bone = BONE.pelvis;
    const hw = ringAt(rings, 0.95).w;
    B.box(0.02, 0.93, hw + 0.05, 0.25, 0.19, 0.07, L.bagColor);
    B.box(0.02, 1.0, hw + 0.087, 0.2, 0.06, 0.008, shade(L.bagColor, 0.8));
    B.bone = BONE.chest;
    B.geo(tubeGeometry([0.1, 1.42, -0.1], [0.07, 1.0, hw + 0.05], 0.012, 0.012, 4), null, shade(L.bagColor, 0.65));
    B.geo(tubeGeometry([-0.1, 1.42, -0.1], [-0.03, 1.0, hw + 0.05], 0.012, 0.012, 4), null, shade(L.bagColor, 0.65));
    B.bone = W_TORSO;
  }
}

function buildLegs(B, L, skin) {
  const f = L.female;
  const legRings = [
    { y: 0.98, d: 0.074, w: 0.064 },
    { y: 0.8, d: f ? 0.08 : 0.078, w: f ? 0.078 : 0.074 },
    { y: 0.57, d: 0.056, w: 0.054 },
    { y: 0.49, d: 0.054, w: 0.05 },
    { y: 0.37, d: 0.058, w: 0.05, x: -0.008 },
    { y: 0.13, d: 0.036, w: 0.034 },
  ].map((r) => (L.build === 'heavy' ? { ...r, d: r.d * 1.1, w: r.w * 1.1 } : L.build === 'slim' ? { ...r, d: r.d * 0.93, w: r.w * 0.93 } : r));
  const bare = L.bottom === 'skirt' || L.bottom === 'dress';
  const legColor = bare ? L.tights : L.pants;
  const hemY = L.bottom === 'swim' ? (L.swim === 'trunks' ? 0.7 : 0.9) : L.bottom === 'shorts' ? 0.6 : bare ? 0.13 : 0.12;
  const hipZ = f ? 0.084 : 0.088;
  for (let k = 0; k < 2; k++) {
    const s = k === 0 ? 1 : -1;
    const M = composeMatrix(0, 0, s * hipZ);
    B.bone = W_LEG(k);
    const flare = L.bottom === 'jeans' || L.bottom === 'trousers' ? 1.12 : 1;
    const upper = slice(legRings, hemY, 0.98).map((r, i) => (i === 0 ? { ...r, d: r.d * flare, w: r.w * flare } : r));
    B.geo(loftUp(upper, 7), M, legColor);
    if (hemY > 0.13) {
      B.geo(loftUp(slice(legRings, 0.1, hemY), 7), M, skin);
      B.geo(loftGeometry(slice(legRings, hemY - 0.005, hemY + 0.03, 1.12), 7, Math.PI / 7), M, shade(L.pants, 0.85));
    }
    B.bone = BONE.pelvis;
    const top = upper[upper.length - 1];
    B.geo(new THREE.SphereGeometry(Math.max(top.d, top.w) * 0.85, 8, 6), composeMatrix(0, HIP_Y, s * hipZ), legColor);
    B.bone = BONE.knee[k];
    if (L.bottom === 'swim') buildFoot(B, M, skin);
    else buildShoe(B, L, M, skin);
  }
}

function buildFoot(B, M, skin) {
  B.geo(new THREE.BoxGeometry(0.22, 0.05, 0.08), M.clone().multiply(composeMatrix(0.05, 0.035, 0)), skin);
  B.geo(new THREE.SphereGeometry(1, 6, 2, 0, Math.PI * 2, 0, Math.PI / 2), M.clone().multiply(composeMatrix(0.13, 0.03, 0, 0, 0, 0, 0.05, 0.035, 0.04)), skin);
}

function buildShoe(B, L, M, skin) {
  const sole = L.shoeType === 'sneaker' ? (L.shoes > 0xa00000 ? 0xa8a49c : 0xe0dcd2) : 0x1a1512;
  const c = L.shoes;
  const m = (x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => M.clone().multiply(composeMatrix(x, y, z, rx, ry, rz, sx, sy, sz));
  B.geo(new THREE.BoxGeometry(0.27, 0.028, 0.098), m(0.055, 0.014, 0), sole);
  const bootH = L.shoeType === 'boot' ? 0.17 : 0.1;
  B.geo(new THREE.BoxGeometry(0.15, bootH - 0.028, 0.088), m(-0.005, 0.028 + (bootH - 0.028) / 2, 0), c);
  B.geo(new THREE.SphereGeometry(1, 6, 2, 0, Math.PI * 2, 0, Math.PI / 2), m(0.1, 0.028, 0, 0, 0, 0, 0.09, 0.058, 0.046), c);
  if (L.shoeType === 'sneaker') B.geo(new THREE.BoxGeometry(0.06, 0.012, 0.05), m(0.09, 0.075, 0, 0, 0, -0.45), shade(c, c > 0xa00000 ? 0.8 : 1.5));
}

function buildArms(B, L, skin, shZ) {
  const heavy = L.build === 'heavy', slim = L.build === 'slim';
  const g = heavy ? 1.12 : slim ? 0.92 : 1;
  const armRings = [
    { y: 0.01, d: 0.046, w: 0.046 },
    { y: -0.06, d: 0.054 * g, w: 0.052 * g },
    { y: -0.255, d: 0.043 * g, w: 0.042 * g },
    { y: -0.325, d: 0.04 * g, w: 0.039 * g },
    { y: -0.53, d: 0.031, w: 0.028 },
  ];
  const sleeveColor = L.top === 'raincoat' ? L.raincoatColor : L.topColor;
  let sleeveEnd;
  if (L.top === 'swim') sleeveEnd = -0.04;
  else if (L.top === 'tee' || L.top === 'dress') sleeveEnd = -0.14;
  else if (L.top === 'longsleeve' && L.rolled) sleeveEnd = -0.3;
  else sleeveEnd = -0.5;
  const cuffK = L.top === 'coat' || L.top === 'raincoat' || L.top === 'jacket' || L.top === 'police' || L.top === 'blazer' ? 1.22 : 1.1;

  for (let k = 0; k < 2; k++) {
    const s = k === 0 ? 1 : -1;
    const M = composeMatrix(0, SHOULDER_Y, s * shZ, -s * ARM_SPLAY, 0, 0);
    const m = (x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => M.clone().multiply(composeMatrix(x, y, z, rx, ry, rz, sx, sy, sz));
    B.bone = W_ARM(k);
    const sleeve = slice(armRings, sleeveEnd, 0.01, 1.04);
    if (L.top !== 'tee' && L.top !== 'dress' && L.top !== 'swim' && !(L.top === 'longsleeve' && L.rolled)) sleeve[0] = { ...sleeve[0], d: sleeve[0].d * 1.12, w: sleeve[0].w * 1.12 };
    B.geo(loftUp(sleeve, 6), M, sleeveColor);
    // round cap around the shoulder pivot so no gap opens in any arm pose
    const capR = sleeve[sleeve.length - 2].d * 1.08;
    B.part(new THREE.SphereGeometry(capR, 10, 6), composeMatrix(0, SHOULDER_Y - 0.012, s * (shZ - 0.024), 0, 0, 0, 1.02, 0.88, 1.12), sleeveColor, BONE.chest);
    B.geo(loftUp(slice(armRings, -0.53, sleeveEnd), 6), M, skin);
    if (L.top !== 'swim') B.geo(loftGeometry(slice(armRings, sleeveEnd - 0.03, sleeveEnd + 0.005, cuffK), 6), M, shade(sleeveColor, 0.82));
    if (L.cop) B.geo(loftGeometry(slice(armRings, -0.14, -0.1, 1.09), 6), M, REFLECT_YELLOW);

    B.bone = BONE.elbow[k];
    const hy = -0.575;
    B.geo(new THREE.BoxGeometry(0.068, 0.11, 0.028), m(0.008, hy - 0.015, 0, 0, 0, 0.12), skin);
    B.geo(new THREE.BoxGeometry(0.02, 0.045, 0.02), m(0.04, hy - 0.012, -s * 0.012, 0, 0, 0.35), shade(skin, 0.95));
  }
}

// Shared by every person: vertex colours carry all the per-person variation.
const PERSON_MAT = markShared(vcMaterial({ roughness: 0.82 }));
const BOUNDS = new THREE.Sphere(new THREE.Vector3(0, 0.9, 0), 1.5);

function autoKnee(z) {
  return z > 0 ? -z * 1.05 : z * 0.35;
}

function autoElbow(z) {
  return 0.12 + Math.max(0, z) * 0.35;
}

function linkJoint(parent, child, fn, override = null) {
  const rot = parent.rotation, q = parent.quaternion;
  let busy = false;
  rot._onChange(() => {
    q.setFromEuler(rot, false);
    if (busy) return;
    busy = true;
    if (!override || !override()) child.rotation.z = fn(rot.z);
    busy = false;
  });
}

const BIKE_BB = { x: -0.05, y: 0.3 };
const CRANK = 0.17;

// Bike riders (models3d_vehicles poses only the hip bones): put each foot
// on its pedal, following the bike's crank phase.
function pedalIK(group, k) {
  const bike = group.parent && group.parent.userData;
  if (!bike || !bike.riderLegs) return false;
  const ud = group.userData;
  const ph = (bike.pedalPhase || 0) + (k === 0 ? 0 : Math.PI);
  const sx = group.scale.x || 1, sy = group.scale.y || 1, lean = group.rotation.z;
  const px = BIKE_BB.x + Math.cos(ph) * CRANK - group.position.x;
  const py = BIKE_BB.y + Math.sin(ph) * CRANK + 0.07 - group.position.y - HIP_Y * sy;
  const c = Math.cos(-lean), s = Math.sin(-lean);
  legIK(k === 0 ? ud.legL : ud.legR, k === 0 ? ud.kneeL : ud.kneeR, (px * c - py * s) / sx, (px * s + py * c) / sy);
  return true;
}

function buildRig(L, shZ) {
  const bone = (x, y, z, parent) => {
    const b = new THREE.Bone();
    b.position.set(x, y, z);
    if (parent) parent.add(b);
    return b;
  };
  const pelvis = bone(0, HIP_Y, 0);
  const chest = bone(0, CHEST_Y - HIP_Y, 0, pelvis);
  const head = bone(0, NECK_Y - CHEST_Y, 0, chest);
  const bones = [pelvis, chest, head];
  const hipZ = L.female ? 0.084 : 0.088;
  const limbs = {};
  for (let k = 0; k < 2; k++) {
    const s = k === 0 ? 1 : -1;
    const thigh = bone(0, 0, s * hipZ, pelvis);
    const knee = bone(0, KNEE_Y - HIP_Y, 0, thigh);
    bones[BONE.thigh[k]] = thigh;
    bones[BONE.knee[k]] = knee;
    const arm = bone(0, SHOULDER_Y - CHEST_Y, s * shZ, chest);
    const elbow = bone(0, -UPPER_ARM * Math.cos(ARM_SPLAY), s * UPPER_ARM * Math.sin(ARM_SPLAY), arm);
    bones[BONE.arm[k]] = arm;
    bones[BONE.elbow[k]] = elbow;
    limbs[k] = { thigh, knee, arm, elbow };
  }
  return { bones, pelvis, chest, head, limbs };
}

// Main colours of the look buildPersonMesh(shirt, skin, { seed }) produces.
// Grote koppen (cheats.js): every head bone, held weakly, so a switch
// reaches the people already in the city.
let headScale = 1;
const heads = new Set();
function trackHead(bone) {
  if (typeof WeakRef === 'undefined') return;
  if (heads.size > 1500) for (const r of heads) if (!r.deref()) heads.delete(r);
  heads.add(new WeakRef(bone));
}
export function setHeadScale(k) {
  if (k === headScale) return;
  headScale = k;
  for (const r of heads) {
    const b = r.deref();
    if (b) b.scale.setScalar(k);
    else heads.delete(r);
  }
}

export function personPalette(shirt, skin, seed) {
  const L = resolveLook(shirt, skin, { seed });
  return {
    top: L.cop ? COP_NAVY : L.top === 'raincoat' ? L.raincoatColor : shirt,
    pants: L.pants, shoes: L.shoes, skin,
    hair: L.hairStyle === 'bald' ? null : L.hairStyle === 'hijab' ? L.hijabColor : L.hair,
    hat: L.hat === 'police' ? COP_NAVY : L.hat ? L.hatColor : null,
    cop: L.cop,
  };
}

export function buildPersonMesh(shirt, skin, opts = {}) {
  const L = resolveLook(shirt, skin, opts);
  L.topColor = L.cop ? COP_NAVY : shirt;
  L.skirtColor = L.pants;
  if (L.character === 'tammo') {
    Object.assign(L, { hat: 'tammo', capColor: opts.cap ?? DEFAULT_CAP, top: 'jacket', forceOpen: true, hood: true, under: 0xe3ddd0, bottom: 'jeans', shoeType: 'sneaker', facial: 'stubble', hoodUp: false });
  } else if (L.character === 'anita') {
    Object.assign(L, { top: 'coat', shortCoat: true, bottom: 'jeans', shoeType: 'boot', scarf: false });
  }
  // story characters (missionstory.js NPC looks): fixed clothes, hat, build
  if (opts.look) Object.assign(L, opts.look);
  // swimwear (swimmers3d.js): 'trunks', 'swimsuit' or 'bikini' in opts.swimColor, barefoot
  if (opts.swim) {
    Object.assign(L, { top: 'swim', bottom: 'swim', swim: opts.swim, pants: opts.swimColor ?? L.pants, topColor: skin, shoes: skin,
      hat: null, hoodUp: false, scarf: false, bag: null, umbrella: null, glasses: false, facial: L.facial === 'beard' ? 'stubble' : L.facial });
    if (L.hairStyle === 'hijab') L.hairStyle = 'bun';
  }

  const shZ = (L.female ? 0.172 : 0.198) * (L.build === 'heavy' ? 1.06 : L.build === 'slim' ? 0.95 : 1) + 0.03;
  const B = new SkinBuilder(1);
  buildTorso(B, L, skin);
  buildHead(B, L, skin);
  buildLegs(B, L, skin);
  buildArms(B, L, skin, shZ);
  const geometry = B.build();

  const group = new THREE.Group();
  const rig = buildRig(L, shZ);
  group.add(rig.pelvis);
  const mesh = new THREE.SkinnedMesh(geometry, PERSON_MAT);
  mesh.boundingSphere = BOUNDS.clone();
  group.add(mesh);
  group.updateMatrixWorld(true);
  mesh.bind(new THREE.Skeleton(rig.bones));

  if (headScale !== 1) rig.head.scale.setScalar(headScale);
  trackHead(rig.head);
  const ud = group.userData;
  ud.pelvis = rig.pelvis;
  ud.chest = rig.chest;
  ud.head = rig.head;
  ud.legL = rig.limbs[0].thigh;
  ud.legR = rig.limbs[1].thigh;
  ud.kneeL = rig.limbs[0].knee;
  ud.kneeR = rig.limbs[1].knee;
  ud.armL = rig.limbs[0].arm;
  ud.armR = rig.limbs[1].arm;
  ud.elbowL = rig.limbs[0].elbow;
  ud.elbowR = rig.limbs[1].elbow;
  ud.body = mesh;
  ud.stoop = L.age === 'old' ? 0.12 : 0;
  ud.gait = L.age === 'old' ? 0.8 : L.female ? 1.05 : 1;
  ud.female = L.female;
  ud.animOffset = hash2(L.seed, 9.1) * 100;
  for (const k of [0, 1]) {
    linkJoint(rig.limbs[k].thigh, rig.limbs[k].knee, autoKnee, () => pedalIK(group, k));
    linkJoint(rig.limbs[k].arm, rig.limbs[k].elbow, autoElbow);
    rig.limbs[k].thigh.rotation.z = 0;
    rig.limbs[k].arm.rotation.z = 0;
  }
  if (L.umbrella !== null && L.umbrella !== undefined) attachUmbrella(ud, L.umbrella);

  group.scale.set(L.buildScale, L.heightScale, L.buildScale);
  if (opts.seed !== undefined) ud.lookSeed = opts.seed;
  return group;
}

const umbrellaGeos = new Map();
const UMBRELLA_CANOPY = [{ y: 0.52, d: 0.5, w: 0.5 }, { y: 0.63, d: 0.41, w: 0.41 }, { y: 0.73, d: 0.24, w: 0.24 }, { y: 0.78, d: 0.02, w: 0.02 }];

// Origin at the grip, shaft along +Y: 1 m canopy about 0.75 m above the hand.
function umbrellaGeometry(color) {
  let g = umbrellaGeos.get(color);
  if (!g) {
    const B = new SkinBuilder(1);
    B.geo(new THREE.CylinderGeometry(0.008, 0.008, 0.9, 4), composeMatrix(0, 0.33, 0), 0x2a2a2a);
    B.geo(tubeGeometry([0, -0.12, 0], [0.035, -0.165, 0], 0.012, 0.012, 4), null, 0x4a3222);
    B.geo(tubeGeometry([0.035, -0.165, 0], [0.065, -0.125, 0], 0.012, 0.012, 4), null, 0x4a3222);
    B.geo(loftGeometry(UMBRELLA_CANOPY, 8), null, color);
    B.geo(flipWinding(loftGeometry(UMBRELLA_CANOPY.map((r) => ({ ...r, y: r.y - 0.006 })), 8)), null, shade(color, 0.6));
    B.geo(new THREE.CylinderGeometry(0.005, 0.009, 0.06, 4), composeMatrix(0, 0.8, 0), 0x2a2a2a);
    g = markShared(B.build());
    g.deleteAttribute('skinIndex');
    g.deleteAttribute('skinWeight');
    umbrellaGeos.set(color, g);
  }
  return g;
}

function attachUmbrella(ud, color) {
  const m = new THREE.Mesh(umbrellaGeometry(color), PERSON_MAT);
  m.position.set(0, -0.27, 0.015);
  ud.elbowL.add(m);
  ud.umbrella = m;
}

// Seated poses. SEAT_CONTACT is the mesh-local height of the underside of
// the thighs/seat in a seated pose, so a person sits ON a surface at height
// h when the mesh origin is at seatedY(mesh, h). A spec gives the recline
// (chest tipped back), the ankle target relative to the hip joint (footX
// forward, footY up; mesh-local, unscaled) and what the arms do.
export const SEAT_CONTACT = HIP_Y - 0.09;
export const SEAT_CAR = { recline: 0.26, footX: 0.74, footY: -0.07, arms: 'lap' };

export function seatedY(mesh, seatTop) {
  return seatTop - SEAT_CONTACT * (mesh.scale.y || 1);
}

export function seatPose(mesh, spec = SEAT_CAR, t = 0) {
  const ud = mesh.userData;
  if (!ud.pelvis) return;
  resetSpine(ud);
  const rec = spec.recline || 0;
  ud.chest.rotation.set(0, 0, rec);
  ud.head.rotation.set(0, 0, -rec * 0.7);
  let fx = spec.footX ?? 0.74, fy = spec.footY ?? -0.07;
  let fx2 = fx, fy2 = fy;
  if (spec.pedal) {
    const ph = t * 5.5;
    fx = spec.footX + Math.cos(ph) * 0.1; fy = spec.footY + Math.sin(ph) * 0.1;
    fx2 = spec.footX - Math.cos(ph) * 0.1; fy2 = spec.footY - Math.sin(ph) * 0.1;
  }
  legIK(ud.legL, ud.kneeL, fx, fy);
  legIK(ud.legR, ud.kneeR, fx2 - 0.03, fy2 + 0.01);
  if (spec.splay) { ud.legL.rotation.x = -spec.splay; ud.legR.rotation.x = spec.splay; }
  const lean = rec;
  switch (spec.arms) {
    case 'wheel':
      setArm(ud.armL, ud.elbowL, 0.95 + lean * 0.8, 0.55, -0.1);
      setArm(ud.armR, ud.elbowR, 0.95 + lean * 0.8, 0.55, 0.1);
      break;
    case 'helm':
      setArm(ud.armL, ud.elbowL, 0.62 + lean * 0.6, 0.75, -0.08);
      setArm(ud.armR, ud.elbowR, 0.62 + lean * 0.6, 0.75, 0.08);
      break;
    case 'tiller':
      setArm(ud.armL, ud.elbowL, 0.3 + lean, 1.0);
      setArm(ud.armR, ud.elbowR, 0.55 + lean, 0.35, 0.35);
      break;
    case 'paddle': {
      const s = Math.sin(t * 2.6);
      setArm(ud.armL, ud.elbowL, 0.95 + 0.2 * s + lean, 0.75 - 0.25 * s, -0.25);
      setArm(ud.armR, ud.elbowR, 0.95 - 0.2 * s + lean, 0.75 + 0.25 * s, 0.25);
      ud.chest.rotation.y = 0.18 * s;
      if (!ud.paddleProp) {
        ud.paddleProp = new THREE.Mesh(PADDLE_GEO, ROD_MAT);
        ud.chest.add(ud.paddleProp);
      }
      ud.paddleProp.visible = true;
      ud.paddleProp.position.set(0.4, 0.1, 0);
      ud.paddleProp.rotation.set(0.3 * s, 0, 0);
      break;
    }
    case 'row': {
      // rowing, facing aft: k 0 = the catch (arms out, knees up, leaning in),
      // 1 = the finish (hands to the chest, legs flat, leaning back)
      const k = (1 + Math.sin(t * 2.1)) / 2;
      ud.chest.rotation.z = -0.32 + 0.66 * k;
      ud.head.rotation.z = 0.2 - 0.3 * k;
      setArm(ud.armL, ud.elbowL, 1.42 - 0.62 * k, 0.12 + 1.5 * k, -0.18);
      setArm(ud.armR, ud.elbowR, 1.42 - 0.62 * k, 0.12 + 1.5 * k, 0.18);
      legIK(ud.legL, ud.kneeL, fx * (0.62 + 0.38 * k), fy + 0.12 * (1 - k));
      legIK(ud.legR, ud.kneeR, fx * (0.62 + 0.38 * k) - 0.03, fy + 0.12 * (1 - k) + 0.01);
      break;
    }
    case 'hug':
      setArm(ud.armL, ud.elbowL, 1.05 + lean, 1.2, 0.15);
      setArm(ud.armR, ud.elbowR, 1.05 + lean, 1.2, -0.15);
      break;
    case 'behind':
      // leaning back on the hands, palms on the ground behind the hips
      setArm(ud.armL, ud.elbowL, -0.5 - lean * 0.4, 0.08, -0.22);
      setArm(ud.armR, ud.elbowR, -0.5 - lean * 0.4, 0.08, 0.22);
      break;
    case 'rail':
      setArm(ud.armL, ud.elbowL, 0.25 + lean, 0.9, -0.45);
      setArm(ud.armR, ud.elbowR, 0.35 + lean, 1.05);
      break;
    default:
      setArm(ud.armL, ud.elbowL, 0.35 + lean, 1.05);
      setArm(ud.armR, ud.elbowR, 0.35 + lean, 1.05);
  }
  if (ud.umbrella) ud.umbrella.visible = false;
  setPropVisible(ud, 'phoneProp', false);
  setPropVisible(ud, 'rodProp', false);
  if (spec.arms !== 'paddle') setPropVisible(ud, 'paddleProp', false);
  setPropVisible(ud, 'supPaddle', false);
  ud.seated = true;
}

// Legacy entry point: the car pose, hands on the wheel when driving.
export function seatPerson(mesh, driving = false, spec = SEAT_CAR) {
  seatPose(mesh, driving ? { ...spec, arms: 'wheel' } : spec);
}

// Standing on a step deck behind the rider, holding on.
export function standBehindPose(mesh) {
  const ud = mesh.userData;
  if (!ud.pelvis) return;
  resetSpine(ud);
  ud.chest.rotation.set(0, 0, -0.12);
  ud.legL.rotation.set(0, 0, 0.08);
  ud.legR.rotation.set(0, 0, -0.1);
  ud.kneeL.rotation.z = -0.12;
  ud.kneeR.rotation.z = -0.1;
  setArm(ud.armL, ud.elbowL, 0.9, 1.1, 0.12);
  setArm(ud.armR, ud.elbowR, 0.9, 1.1, -0.12);
  if (ud.umbrella) ud.umbrella.visible = false;
}

// Standing on a paddle board with a long single-blade paddle (held by the
// chest, so it swings with the body): knees soft, a slow stroke on one side,
// switching sides every few strokes. Hands stay below the head.
const SUP_PADDLE_GEO = markShared((() => {
  const parts = [new THREE.CylinderGeometry(0.014, 0.014, 2.0, 5).translate(0, -1.0, 0), new THREE.BoxGeometry(0.05, 0.03, 0.12).translate(0, 0, 0),
    new THREE.BoxGeometry(0.02, 0.42, 0.19).translate(0, -1.86, 0)];
  const pos = [];
  for (const g of parts) pos.push(...(g.index ? g.toNonIndexed() : g).attributes.position.array);
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.computeVertexNormals();
  return out;
})());

export function supPose(mesh, t = 0) {
  const ud = mesh.userData;
  if (!ud.pelvis) return;
  resetSpine(ud);
  const ph = t * 1.5;
  const s = Math.sin(ph);
  const side = Math.sin(ph / 8) >= 0 ? 1 : -1;
  ud.chest.rotation.set(0, side * (0.15 + 0.1 * s), -0.12 - 0.1 * Math.max(0, s));
  ud.legL.rotation.set(-0.09, 0, 0.12);
  ud.legR.rotation.set(0.09, 0, 0.12);
  ud.kneeL.rotation.z = ud.kneeR.rotation.z = -0.22;
  // top hand at chin height, the other lower down the shaft on the stroke side
  const top = side > 0 ? [ud.armL, ud.elbowL, -1] : [ud.armR, ud.elbowR, 1];
  const low = side > 0 ? [ud.armR, ud.elbowR, 1] : [ud.armL, ud.elbowL, -1];
  setArm(top[0], top[1], 1.25 + 0.2 * s, 1.15, top[2] * 0.2);
  setArm(low[0], low[1], 0.75 + 0.35 * s, 0.35, low[2] * 0.15);
  ud.head.rotation.set(0, 0, 0.1);
  let p = ud.supPaddle;
  if (!p) {
    p = ud.supPaddle = new THREE.Mesh(SUP_PADDLE_GEO, ROD_MAT);
    ud.chest.add(p);
  }
  p.visible = true;
  p.position.set(0.34, 0.42, side * 0.2);
  p.rotation.set(-side * 0.12, 0, 0.15 + 0.4 * s);
  if (ud.umbrella) ud.umbrella.visible = false;
}

// Blend from whatever pose the bones hold now (a walk frame) towards a
// seated spec by k (0..1): enter/exit animations.
const _blend = new Float32Array(40);
export function blendSeatPose(mesh, spec, k, t = 0) {
  const ud = mesh.userData;
  if (!ud.pelvis) return;
  if (k >= 1) { seatPose(mesh, spec, t); return; }
  const bones = [ud.pelvis, ud.chest, ud.head, ud.legL, ud.kneeL, ud.legR, ud.kneeR, ud.armL, ud.elbowL, ud.armR, ud.elbowR];
  let i = 0;
  for (const b of bones) { _blend[i++] = b.rotation.x; _blend[i++] = b.rotation.y; _blend[i++] = b.rotation.z; }
  const py = ud.pelvis.position.y, pz = ud.pelvis.position.z;
  seatPose(mesh, spec, t);
  i = 0;
  for (const b of bones) {
    const x = _blend[i++], y = _blend[i++], z = _blend[i++];
    b.rotation.set(x + (b.rotation.x - x) * k, y + (b.rotation.y - y) * k, z + (b.rotation.z - z) * k);
  }
  ud.pelvis.position.y = py + (HIP_Y - py) * k;
  ud.pelvis.position.z = pz * (1 - k);
}

// Right arm raised, hand swaying: a wave/greeting over whatever pose the
// body has (seated, swimming, walking). k fades it in and out.
export function waveOverlay(mesh, t, k = 1) {
  const ud = mesh.userData;
  if (!ud.armR || k <= 0) return;
  const sway = Math.sin(t * 9);
  const z = ud.armR.rotation.z + (2.75 - ud.armR.rotation.z) * k;
  const x = ud.armR.rotation.x + (0.3 + 0.28 * sway - ud.armR.rotation.x) * k;
  setArm(ud.armR, ud.elbowR, z, (ud.elbowR ? ud.elbowR.rotation.z : 0) * (1 - k) + (0.45 + 0.2 * sway) * k, x);
  if (ud.head) ud.head.rotation.z += 0.12 * k;
}

// Juichen (vrijgezellenfeest, vrijgezellen.js): beide armen om en om de lucht in, een beetje op en neer. k 0..1.
export function juichOverlay(mesh, t, links, rechts, spring, k = 1) {
  const ud = mesh.userData;
  if (!ud.armR || !ud.armL || k <= 0) return;
  setArm(ud.armL, ud.elbowL, ud.armL.rotation.z + (links - ud.armL.rotation.z) * k, (ud.elbowL ? ud.elbowL.rotation.z : 0) * (1 - k) + 0.3 * k, 0.15 * k);
  setArm(ud.armR, ud.elbowR, ud.armR.rotation.z + (rechts - ud.armR.rotation.z) * k, (ud.elbowR ? ud.elbowR.rotation.z : 0) * (1 - k) + 0.3 * k, -0.15 * k);
  if (ud.head) ud.head.rotation.z += 0.1 * Math.sin(t * 6) * k;
  mesh.position.y += spring;
}

// Arms forward under a load (side-job boxes).
export function carryOverlay(mesh) {
  const ud = mesh.userData;
  if (!ud.armL) return;
  setArm(ud.armL, ud.elbowL, 0.75, 1.15, 0.12);
  setArm(ud.armR, ud.elbowR, 0.75, 1.15, -0.12);
}

// Treading water / breaststroke for ambient swimmers: the caller tilts and
// lowers the mesh like the player's swim (swimDepth in player.js). The
// stroke stays in front of the chest and under the surface: hands over the
// head would read as someone in trouble.
export function swimPose(mesh, t, moving) {
  const ud = mesh.userData;
  if (!ud.pelvis) return;
  resetSpine(ud);
  const s = Math.sin(t * (moving ? 2.6 : 1.6));
  const c = Math.cos(t * (moving ? 2.6 : 1.6));
  if (moving) {
    // breaststroke: reach forward, sweep out and round, elbows in, glide
    const out = Math.max(0, -s);
    setArm(ud.armL, ud.elbowL, 2.05 + 0.5 * s, 0.25 + 0.7 * Math.max(0, c) * out, -0.35 - 0.45 * out);
    setArm(ud.armR, ud.elbowR, 2.05 + 0.5 * s, 0.25 + 0.7 * Math.max(0, c) * out, 0.35 + 0.45 * out);
    ud.legL.rotation.set(-0.15 - 0.25 * Math.max(0, c), 0, -0.1 + 0.3 * Math.max(0, s));
    ud.legR.rotation.set(0.15 + 0.25 * Math.max(0, c), 0, -0.1 + 0.3 * Math.max(0, s));
    ud.kneeL.rotation.z = ud.kneeR.rotation.z = -0.15 - 0.9 * Math.max(0, s);
  } else {
    // calm treading water: hands sculling low at the sides, a slow bicycle kick
    setArm(ud.armL, ud.elbowL, 0.7 + 0.18 * s, 0.55, -0.75 - 0.15 * c);
    setArm(ud.armR, ud.elbowR, 0.7 + 0.18 * s, 0.55, 0.75 + 0.15 * c);
    ud.legL.rotation.set(0, 0, 0.3 + 0.25 * s);
    ud.legR.rotation.set(0, 0, 0.3 - 0.25 * s);
    ud.kneeL.rotation.z = -0.55 - 0.3 * s;
    ud.kneeR.rotation.z = -0.55 + 0.3 * s;
  }
  ud.head.rotation.set(0, 0, moving ? 0.7 : 0.15);
  if (ud.umbrella) ud.umbrella.visible = false;
}

// Floating on the back (the caller lays the mesh flat, face up): arms out to
// the sides, legs a little apart, hands sculling gently.
export function floatPose(mesh, t) {
  const ud = mesh.userData;
  if (!ud.pelvis) return;
  resetSpine(ud);
  const s = Math.sin(t * 1.3);
  setArm(ud.armL, ud.elbowL, -0.2 + 0.06 * s, 0.1, -1.2 - 0.08 * s);
  setArm(ud.armR, ud.elbowR, -0.2 + 0.06 * s, 0.1, 1.2 + 0.08 * s);
  ud.legL.rotation.set(-0.14, 0, 0.06);
  ud.legR.rotation.set(0.14, 0, 0.06);
  ud.kneeL.rotation.z = -0.12;
  ud.kneeR.rotation.z = -0.18;
  ud.head.rotation.set(0, 0, -0.2);
  if (ud.umbrella) ud.umbrella.visible = false;
}

function resetSpine(ud) {
  if (!ud.pelvis) return;
  ud.pelvis.position.set(0, HIP_Y, 0);
  ud.pelvis.rotation.set(0, 0, 0);
  ud.chest.position.set(0, CHEST_Y - HIP_Y, 0);
  ud.chest.rotation.set(0, 0, 0);
  ud.head.rotation.set(0, 0, 0);
}

// Pose hook: gameplay code registers the object (a Pedestrian) whose `pose`
// field should drive the mesh built with the same appearance seed.
const poseSources = new Map();
export function registerPoseSource(seed, src) { poseSources.set(seed, src); }
export function unregisterPoseSource(seed) { poseSources.delete(seed); }
export function prunePoseSources(alive) {
  for (const [seed, src] of poseSources) if (!alive.has(src)) poseSources.delete(seed);
}

// the folded Pixie Vouw 11: narrow, tall and a bit thick
const PHONE_GEO = markShared(new THREE.BoxGeometry(0.068, 0.145, 0.019));
const PHONE_MAT = markShared(new THREE.MeshStandardMaterial({ color: 0x1a1a1c, roughness: 0.4, emissive: 0x33506a, emissiveIntensity: 0.6 }));
const ROD_GEO = markShared((() => {
  const g = new THREE.CylinderGeometry(0.008, 0.016, 2.4, 4);
  g.translate(0, 1.2, 0);
  return g;
})());
const ROD_MAT = markShared(new THREE.MeshStandardMaterial({ color: 0x3a2c1f, roughness: 0.8 }));
// double-bladed paddle across the body, shaft along z
const PADDLE_GEO = markShared((() => {
  const shaft = new THREE.CylinderGeometry(0.016, 0.016, 2.0, 5).rotateX(Math.PI / 2);
  const parts = [shaft];
  for (const s of [1, -1]) parts.push(new THREE.BoxGeometry(0.16, 0.02, 0.4).translate(0, 0, s * 1.08));
  const pos = [];
  for (const g of parts) {
    const ng = g.index ? g.toNonIndexed() : g;
    pos.push(...ng.attributes.position.array);
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.computeVertexNormals();
  return out;
})());

function propOn(ud, key, geo, mat, build) {
  let m = ud[key];
  if (!m) {
    m = new THREE.Mesh(geo, mat);
    build(m);
    (ud.elbowR || ud.armR).add(m);
    ud[key] = m;
  }
  m.visible = true;
  return m;
}

// Phone in the right hand while riding (NPC cyclists): the arm stays on the bar side, the forearm lifts.
export function holdPhoneRiding(person) {
  const ud = person.userData;
  propOn(ud, 'phoneProp', PHONE_GEO, PHONE_MAT, (m) => m.position.set(0.045, -0.3, 0.0));
  ud.phoneProp.rotation.set(0, 0, 0);
  ud.head.rotation.set(0, 0, -0.35);
  setArm(ud.armR, ud.elbowR, 0.85, 1.4, -0.1);
}

function setPropVisible(ud, key, on) {
  if (ud[key]) ud[key].visible = on;
}

// Two-bone leg IK in the sagittal plane: puts the ankle at (fx, fy) relative
// to the hip joint (mesh-local, unscaled; +x forward, +y up).
function legIK(thigh, knee, fx, fy) {
  const d = Math.min(THIGH_LEN + SHIN_LEN - 1e-3, Math.max(0.05, Math.hypot(fx, fy)));
  const aim = Math.atan2(fx, -fy);
  const cosA = (THIGH_LEN * THIGH_LEN + d * d - SHIN_LEN * SHIN_LEN) / (2 * THIGH_LEN * d);
  const cosK = (THIGH_LEN * THIGH_LEN + SHIN_LEN * SHIN_LEN - d * d) / (2 * THIGH_LEN * SHIN_LEN);
  thigh.rotation.set(0, 0, aim + Math.acos(Math.max(-1, Math.min(1, cosA))));
  if (knee) knee.rotation.z = -(Math.PI - Math.acos(Math.max(-1, Math.min(1, cosK))));
}

function setArm(arm, elbow, z, e, x = 0) {
  arm.rotation.set(x, 0, z);
  if (elbow) elbow.rotation.z = e;
}

// Guns in the right hand. Built along the forearm bone: -y runs down the
// forearm towards the fingers (forward once the arm is raised), +x is the
// back of the hand (up when aiming). userData.muzzle marks the barrel tip.
const GUN_MAT = markShared(new THREE.MeshStandardMaterial({ color: 0x1b1c1f, roughness: 0.45, metalness: 0.6 }));
const GUN_WOOD = markShared(new THREE.MeshStandardMaterial({ color: 0x5a3a22, roughness: 0.7 }));
const HAND_Y = -0.575;
const heldMat = (color, roughness = 0.7, metalness = 0) => markShared(new THREE.MeshStandardMaterial({ color, roughness, metalness }));
const BAT_WOOD = heldMat(0xc9a36a, 0.6);
const POLE_WOOD = heldMat(0x8a6a3e, 0.75);
const STICK_BLACK = heldMat(0x202226, 0.5);
const TAPE_WHITE = heldMat(0xe8e6e0, 0.8);
const BRISTLE = heldMat(0x9c7a3c, 0.95);
const PUMP_METAL = heldMat(0xb8bec4, 0.35, 0.8);
const KLOMP_YELLOW = heldMat(0xe0b640, 0.7);
const TOY_GREEN = heldMat(0x2fb56a, 0.4);
const TOY_ORANGE = heldMat(0xf0892a, 0.4);
const CHURN_GREY = heldMat(0x9aa2a8, 0.4, 0.7);
const ROCKET_RED = heldMat(0xc8261e, 0.6);
// parts: [x, thickness along x, length down the hand (-y), width (z), y, material, 'c' = round].
// rest: tilt forward while carried (rad); two: second hand on it when aimed.
const GUN_SPECS = {
  pistol: { parts: [[0.035, 0.03, 0.2, 0.03, -0.075, GUN_MAT], [-0.02, 0.08, 0.035, 0.028, 0, GUN_MAT]], tip: 0.19 },
  uzi: { parts: [[0.03, 0.055, 0.27, 0.045, -0.1, GUN_MAT], [-0.03, 0.09, 0.035, 0.03, 0.01, GUN_MAT], [-0.055, 0.12, 0.03, 0.025, -0.1, GUN_MAT]], tip: 0.25, two: true },
  shotgun: { parts: [[0.03, 0.04, 0.62, 0.04, -0.2, GUN_MAT], [0.0, 0.05, 0.26, 0.05, -0.12, GUN_WOOD], [-0.01, 0.07, 0.3, 0.05, 0.2, GUN_WOOD]], tip: 0.52, two: true },
  jachtgeweer: { parts: [[0.03, 0.03, 0.9, 0.03, -0.32, GUN_MAT], [0.0, 0.055, 0.3, 0.045, -0.1, GUN_WOOD], [-0.01, 0.075, 0.34, 0.05, 0.25, GUN_WOOD], [0.085, 0.045, 0.26, 0.045, -0.1, GUN_MAT, 'c']], tip: 0.95, two: true },
  waterpistool: { parts: [[0.035, 0.06, 0.22, 0.05, -0.06, TOY_GREEN], [0.1, 0.08, 0.11, 0.07, -0.03, TOY_ORANGE, 'c'], [-0.025, 0.08, 0.045, 0.035, 0, TOY_GREEN]], tip: 0.2 },
  knuppel: { parts: [[0, 0.035, 0.34, 0.035, 0.1, BAT_WOOD, 'c'], [0, 0.07, 0.5, 0.07, -0.24, BAT_WOOD, 'c']], tip: 0.7, rest: 2.5, melee: true },
  hockeystick: { parts: [[0, 0.03, 0.95, 0.03, 0.16, STICK_BLACK, 'c'], [-0.07, 0.2, 0.06, 0.03, -0.72, TAPE_WHITE]], tip: 0.75, rest: 0.55, melee: true },
  bezem: { parts: [[0, 0.03, 1.2, 0.03, 0.34, POLE_WOOD, 'c'], [0, 0.07, 0.12, 0.34, -0.8, BRISTLE]], tip: 0.95, rest: 0.35, melee: true },
  fietspomp: { parts: [[0, 0.045, 0.44, 0.045, -0.02, PUMP_METAL, 'c'], [0, 0.03, 0.03, 0.16, 0.08, STICK_BLACK]], tip: 0.42, rest: 0.9, melee: true },
  klomp: { parts: [[0.02, 0.13, 0.28, 0.11, 0.02, KLOMP_YELLOW], [-0.01, 0.09, 0.08, 0.1, -0.26, KLOMP_YELLOW]], tip: 0.34, rest: 1.5, melee: true },
  polsstok: { parts: [[0, 0.05, 3.4, 0.05, 1.1, POLE_WOOD, 'c']], tip: 2.3, rest: 1.35, melee: true, two: true },
  carbidbus: { parts: [[0, 0.3, 0.38, 0.3, 0.02, CHURN_GREY, 'c'], [0, 0.2, 0.06, 0.2, -0.34, CHURN_GREY, 'c']], tip: 0.3, rest: 0 },
  vuurwerk: { parts: [[0, 0.07, 0.24, 0.07, -0.02, ROCKET_RED, 'c'], [0.04, 0.012, 0.6, 0.012, 0.4, BAT_WOOD]], tip: 0.2, rest: 2.8 },
};
const gunGeos = {};
function gunGeometry(key) {
  if (gunGeos[key]) return gunGeos[key];
  const parts = GUN_SPECS[key].parts.map(([x, h, len, w, y, , shape]) => (shape === 'c' ? new THREE.CylinderGeometry(w / 2, w / 2, len, 10) : new THREE.BoxGeometry(h, len, w)).translate(x, y - len * 0.5 + 0.06, 0));
  const g = { geos: parts.map((pg) => markShared(pg)) };
  gunGeos[key] = g;
  return g;
}

// A loose weapon for the shop preview: length along +x, back of the hand up.
export function buildWeaponMesh(key) {
  const spec = GUN_SPECS[key];
  if (!spec) return null;
  const geo = gunGeometry(key);
  const inner = new THREE.Group();
  spec.parts.forEach((pt, i) => inner.add(new THREE.Mesh(geo.geos[i], pt[5])));
  // the hand normally hides the gap between barrel and grip
  if (!spec.melee && spec.parts.length > 1 && spec.parts[0][2] < 0.4) {
    const [x, h, , w, , m] = spec.parts[0];
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(h, 0.09, w), m);
    bridge.position.set(x, 0.02, 0);
    inner.add(bridge);
  }
  inner.rotation.z = key === 'carbidbus' ? Math.PI : Math.PI / 2;
  const g = new THREE.Group();
  g.add(inner);
  return g;
}

// Shows the held weapon (null / 'fists' hides it).
export function setHeldWeapon(mesh, weapon) {
  const ud = mesh && mesh.userData;
  if (!ud || !ud.elbowR) return;
  const key = GUN_SPECS[weapon] ? weapon : null;
  if (ud.gunKey === key) return;
  ud.gunKey = key;
  if (!ud.guns) ud.guns = {};
  for (const k in ud.guns) ud.guns[k].visible = false;
  ud.muzzle = null;
  if (!key) return;
  let g = ud.guns[key];
  if (!g) {
    g = new THREE.Group();
    const spec = GUN_SPECS[key];
    const geo = gunGeometry(key);
    spec.parts.forEach((pt, i) => { const m = new THREE.Mesh(geo.geos[i], pt[5]); m.castShadow = true; g.add(m); });
    // pivot in the palm, so the gun can tilt forward while the arm hangs
    g.position.set(0.01, HAND_Y, 0);
    const tip = new THREE.Object3D();
    tip.position.set(0.035, -spec.tip, 0);
    g.add(tip);
    g.userData.tip = tip;
    ud.elbowR.add(g);
    ud.guns[key] = g;
  }
  g.visible = true;
  ud.muzzle = g.userData.tip;
}

// Attack overlay on top of the walk cycle: an alternating jab for fists, an
// aimed arm with a recoil kick for guns (two-handed for uzi/shotgun) that
// stays up while `aiming`. fx is combat.js's last effect {type, start, side,
// weapon}; now = world.time.
const PUNCH_S = 0.32;
const AIM_HOLD_S = 0.7;
const RECOIL = { pistol: [0.34, 0.5, 0.12], uzi: [0.16, 0.25, 0.06], shotgun: [0.62, 0.8, 0.22], jachtgeweer: [0.7, 0.7, 0.26], waterpistool: [0.05, 0.08, 0.01] };

// Melee swings, u = 0..1 over SWING_S[swing]; w = wind-up share. The curve
// runs 0 -> -1 (cocked back) -> +1 (the hit) -> 0.
const SWING_S = { bat: 0.55, slap: 0.45, sweep: 0.5, stab: 0.3, overhead: 0.55, thrust: 0.9, throw: 0.45 };
const SWING_W = { bat: 0.26, slap: 0.26, sweep: 0.2, stab: 0.2, overhead: 0.33, thrust: 0.38, throw: 0.3 };
function swingCurve(u, w) {
  if (u < w) return -smoothstep(0, w, u);
  if (u < w + 0.14) return -1 + 2 * smoothstep(w, w + 0.14, u);
  return 1 - smoothstep(w + 0.14, 1, u);
}

function swingPose(ud, swing, u, gun) {
  const f = swingCurve(u, SWING_W[swing]);
  const back = Math.max(0, -f), hit = Math.max(0, f);
  const blend = u < 0.12 ? u / 0.12 : u > 0.85 ? (1 - u) / 0.15 : 1;
  const chest = ud.chest;
  switch (swing) {
    case 'bat': // two-handed, a flat swing through the chest twist
      setArm(ud.armR, ud.elbowR, 1.05 + back * 0.5, 0.9 - hit * 0.6, -0.3 * back);
      setArm(ud.armL, ud.elbowL, 1.05 + back * 0.4, 1.1 - hit * 0.5, 0.3);
      if (chest) chest.rotation.y = (-0.9 * back + 1.1 * hit) * blend;
      if (gun) gun.rotation.z = 1.9 - hit * 0.5;
      break;
    case 'slap': // hockey: low, stick raised behind, slapped through
      setArm(ud.armR, ud.elbowR, 0.4 + back * 1.3 + hit * 0.4, 0.4, 0);
      setArm(ud.armL, ud.elbowL, 0.6 + back * 0.8, 0.9, 0.2);
      if (chest) chest.rotation.y = (-0.6 * back + 0.7 * hit) * blend;
      if (gun) gun.rotation.z = 0.5 - back * 0.3;
      break;
    case 'sweep': { // the broom: low side-to-side, like chasing the cat off the stoep
      const s = Math.sin(u * Math.PI * 2) * blend;
      setArm(ud.armR, ud.elbowR, 0.6 + hit * 0.3, 0.6, s * 0.35);
      setArm(ud.armL, ud.elbowL, 0.75, 1.1, 0.25);
      if (chest) chest.rotation.y = s * 0.55;
      if (gun) gun.rotation.z = 0.5 + hit * 0.4;
      break;
    }
    case 'stab': // the pump jabbed forward like a lance
      setArm(ud.armR, ud.elbowR, 0.7 + 0.85 * hit + back * 0.1, 1.7 - 1.6 * hit, 0);
      setArm(ud.armL, ud.elbowL, 0.95, 2.1);
      if (chest) chest.rotation.y = -0.25 * hit * blend;
      if (gun) gun.rotation.z = 0.15;
      break;
    case 'overhead': // the klomp brought down from above the head
      setArm(ud.armR, ud.elbowR, 1.5 + back * 1.4 - hit * 0.7, 0.3 + back * 1.1, 0);
      setArm(ud.armL, ud.elbowL, 0.9, 1.6);
      if (chest) { chest.rotation.z += (back * 0.25 - hit * 0.35) * blend; chest.rotation.y = -0.2 * hit * blend; }
      if (gun) gun.rotation.z = 1.5 + back * 0.4;
      break;
    case 'thrust': // the polsstok: drawn back, then driven forward with both hands
      setArm(ud.armR, ud.elbowR, 1.15 - back * 0.45 + hit * 0.35, 0.3 + back * 1.3 - hit * 0.25, 0);
      setArm(ud.armL, ud.elbowL, 1.3 - back * 0.3 + hit * 0.2, 0.9 + back * 0.8 - hit * 0.6, 0.15);
      if (chest) chest.rotation.y = (0.25 * back - 0.15 * hit) * blend;
      if (gun) gun.rotation.z = 1.35 - (1 - back) * 1.2 * blend;
      break;
    case 'throw': // overhand lob
      setArm(ud.armR, ud.elbowR, 1.5 + back * 1.2 - hit * 0.4, 0.4 + back * 1.2, 0);
      setArm(ud.armL, ud.elbowL, 1.1 * (1 - hit), 0.6);
      if (chest) chest.rotation.y = (0.35 * back - 0.4 * hit) * blend;
      if (gun) gun.rotation.z = 0.2;
      break;
    default:
      break;
  }
}

export function applyAttackPose(mesh, fx, now, aiming = null) {
  const ud = mesh && mesh.userData;
  if (!ud || !ud.armR || !ud.armL) return;
  const spec = ud.gunKey ? GUN_SPECS[ud.gunKey] : null;
  const gun = spec && ud.guns ? ud.guns[ud.gunKey] : null;
  const shot = fx && (fx.type === 'muzzle' || fx.type === 'squirt');
  if (gun) {
    const firing = shot && now - fx.start < AIM_HOLD_S;
    gun.rotation.z = (aiming || firing) && !spec.melee ? 0 : spec.rest ?? 0.95;
  }
  const swing = fx && fx.start !== undefined && (fx.type === 'throw' ? 'throw' : fx.type === 'melee' && fx.swing !== 'jab' ? fx.swing : null);
  if (swing && SWING_S[swing]) {
    const u = (now - fx.start) / SWING_S[swing];
    if (u >= 0 && u < 1) { swingPose(ud, swing, u, gun); return; }
  }
  if (aiming && (!shot || now - fx.start >= AIM_HOLD_S - 0.2)) {
    // raised, steady aim between shots
    setArm(ud.armR, ud.elbowR, 1.55, 0.06);
    if (spec && spec.two) setArm(ud.armL, ud.elbowL, 1.4, 0.55, 0);
    return;
  }
  if (spec && spec.two && spec.melee) setArm(ud.armL, ud.elbowL, 0.7, 1.2, 0.2);
  if (!fx || fx.start === undefined) return;
  const dt = now - fx.start;
  if (fx.type === 'melee') {
    if (dt < 0 || dt >= PUNCH_S || (fx.swing && fx.swing !== 'jab')) return;
    const u = dt / PUNCH_S;
    const ext = u < 0.3 ? smoothstep(0, 0.3, u) : 1 - smoothstep(0.3, 1, u);
    const right = fx.side > 0;
    const [pa, pe] = right ? [ud.armR, ud.elbowR] : [ud.armL, ud.elbowL];
    const [ga, ge] = right ? [ud.armL, ud.elbowL] : [ud.armR, ud.elbowR];
    setArm(pa, pe, 0.5 + 1.05 * ext, 1.9 - 1.82 * ext);
    setArm(ga, ge, 0.95, 2.1);
    if (ud.chest) ud.chest.rotation.y = (right ? -1 : 1) * 0.28 * ext;
    return;
  }
  if (shot) {
    if (dt < 0 || (dt >= AIM_HOLD_S && !aiming)) return;
    const hold = aiming ? 1 : 1 - smoothstep(AIM_HOLD_S - 0.2, AIM_HOLD_S, dt);
    const [armK, elbowK, chestK] = RECOIL[fx.weapon] || RECOIL.pistol;
    // sharp snap up, slower settle
    const kick = dt < 0.03 ? dt / 0.03 : Math.exp(-(dt - 0.03) * 14);
    const z = ud.armR.rotation.z + (1.55 + armK * kick - ud.armR.rotation.z) * hold;
    const e = (ud.elbowR ? ud.elbowR.rotation.z : 0) * (1 - hold) + (0.06 + elbowK * kick) * hold;
    setArm(ud.armR, ud.elbowR, z, e);
    if (spec && spec.two) {
      const zl = ud.armL.rotation.z + (1.4 + armK * 0.7 * kick - ud.armL.rotation.z) * hold;
      setArm(ud.armL, ud.elbowL, zl, (0.55 + elbowK * 0.5 * kick) * hold, 0);
    }
    if (ud.chest) ud.chest.rotation.z += chestK * kick * hold;
    if (ud.head) ud.head.rotation.z += chestK * 0.6 * kick * hold;
  }
}

// Hit reaction for someone shot but still standing: the torso snaps away
// from the bullet, the head whips and the arms flinch, easing out in ~0.45 s.
// react = { t, dx, dy, k } (dx, dy: bullet direction), angle = body facing.
const REACT_S = 0.45;
export function applyHitReaction(mesh, react, now, angle) {
  const ud = mesh && mesh.userData;
  if (!ud || !react || !ud.chest) return;
  const dt = now - react.t;
  if (dt < 0 || dt >= REACT_S) return;
  const env = (dt < 0.05 ? dt / 0.05 : 1 - smoothstep(0.05, REACT_S, dt)) * (react.k || 1);
  const c = Math.cos(angle), sn = Math.sin(angle);
  const fwd = react.dx * c + react.dy * sn;
  const side = -react.dx * sn + react.dy * c;
  ud.chest.rotation.z += -fwd * 0.55 * env;
  ud.chest.rotation.x += side * 0.45 * env;
  ud.head.rotation.z += -fwd * 0.5 * env;
  ud.head.rotation.x += side * 0.35 * env;
  ud.armL.rotation.z += 0.7 * env;
  ud.armR.rotation.z += 0.55 * env;
  if (ud.elbowL) ud.elbowL.rotation.z += 0.8 * env;
  if (ud.elbowR) ud.elbowR.rotation.z += 0.8 * env;
}

const POSE_DROP = { crouch: 0.42, sit: 0.46, fish: 0.5 };

function applyPose(mesh, pose, t) {
  const ud = mesh.userData;
  const drop = POSE_DROP[pose] || 0;
  mesh.position.y -= drop;
  if (ud.shadow) {
    if (ud.shadowBaseY === undefined) ud.shadowBaseY = ud.shadow.position.y;
    ud.shadow.position.y = ud.shadowBaseY + drop / (mesh.scale.y || 1);
  }
  mesh.rotation.z = 0;
  const sy = mesh.scale.y || 1;
  const hipH = HIP_Y - drop / sy;
  setPropVisible(ud, 'phoneProp', pose === 'phone' || pose === 'call');
  setPropVisible(ud, 'rodProp', pose === 'fish');
  if (ud.umbrella) ud.umbrella.visible = !pose;
  if (pose === 'crouch' || pose === 'sit' || pose === 'fish' || pose === 'haul') {
    ud.pelvis.position.set(0, HIP_Y, 0);
    ud.pelvis.rotation.set(0, 0, 0);
  }
  switch (pose) {
    case 'crouch': {
      const shake = Math.sin(t * 23) * 0.03;
      ud.chest.rotation.set(0, 0, -0.75 + shake);
      ud.head.rotation.set(0, 0, 0.3);
      legIK(ud.legL, ud.kneeL, 0.3, ANKLE_Y - hipH);
      legIK(ud.legR, ud.kneeR, 0.22, ANKLE_Y - hipH);
      setArm(ud.armL, ud.elbowL, 2.3, 1.9, -0.25);
      setArm(ud.armR, ud.elbowR, 2.3, 1.9, 0.25);
      break;
    }
    case 'phone':
      propOn(ud, 'phoneProp', PHONE_GEO, PHONE_MAT, (m) => m.position.set(0.045, -0.3, 0.0));
      ud.phoneProp.rotation.set(0, 0, 0);
      ud.head.rotation.set(0, 0, -0.35);
      setArm(ud.armR, ud.elbowR, 0.3, 1.35, -0.2);
      setArm(ud.armL, ud.elbowL, 0.25, 1.2, 0.15);
      break;
    case 'call':
      propOn(ud, 'phoneProp', PHONE_GEO, PHONE_MAT, (m) => m.position.set(0.045, -0.3, 0.0));
      ud.phoneProp.rotation.set(0, 0, 0);
      ud.head.rotation.set(0.12, 0, 0);
      setArm(ud.armR, ud.elbowR, 1.3, 2.4, 0.12);
      setArm(ud.armL, ud.elbowL, 0.1, 0.3);
      break;
    case 'sit':
      ud.chest.rotation.set(0, 0, 0.05);
      legIK(ud.legL, ud.kneeL, 0.44, ANKLE_Y - hipH);
      legIK(ud.legR, ud.kneeR, 0.38, ANKLE_Y - hipH + 0.01);
      setArm(ud.armL, ud.elbowL, 0.35 + Math.sin(t * 0.7) * 0.06, 0.9);
      setArm(ud.armR, ud.elbowR, 0.4 + Math.sin(t * 1.3 + 1) * 0.12, 1.0 + Math.sin(t * 1.3 + 1) * 0.2);
      break;
    case 'fish': {
      propOn(ud, 'rodProp', ROD_GEO, ROD_MAT, (m) => { m.position.set(0.02, -0.3, 0); m.rotation.z = -1.8; });
      legIK(ud.legL, ud.kneeL, 0.3, -0.75);
      legIK(ud.legR, ud.kneeR, 0.34, -0.72);
      ud.chest.rotation.set(0, 0, -0.1);
      const bob = Math.sin(t * 0.9) * 0.05;
      setArm(ud.armL, ud.elbowL, 0.55 + bob, 0.9);
      setArm(ud.armR, ud.elbowR, 0.65 + bob, 0.95);
      break;
    }
    case 'haul': {
      const pull = (Math.sin(t * 2.2) + 1) * 0.5;
      mesh.rotation.z = 0.15 + pull * 0.2;
      setArm(ud.armL, ud.elbowL, 1.1 + pull * 0.5, 0.3 + (1 - pull) * 0.4);
      setArm(ud.armR, ud.elbowR, 1.1 + pull * 0.5, 0.3 + (1 - pull) * 0.4);
      ud.legL.rotation.set(0, 0, 0.35);
      ud.legR.rotation.set(0, 0, -0.25);
      break;
    }
    case 'angry':
      setArm(ud.armR, ud.elbowR, 2.6 + Math.sin(t * 14) * 0.2, 0.9 + Math.sin(t * 14) * 0.3);
      setArm(ud.armL, ud.elbowL, 0.25, 1.9, -0.35);
      ud.head.rotation.set(0, 0, 0.1);
      break;
    case 'vendor':
      setArm(ud.armL, ud.elbowL, 0.4 + Math.sin(t * 1.1) * 0.25, 0.9 + Math.sin(t * 1.1) * 0.3);
      setArm(ud.armR, ud.elbowR, 0.4 + Math.sin(t * 1.7 + 2) * 0.35, 1.0 + Math.sin(t * 1.7 + 2) * 0.35);
      break;
  }
}

function updatePose(mesh) {
  const ud = mesh.userData;
  const src = ud.lookSeed !== undefined ? poseSources.get(ud.lookSeed) : null;
  const pose = src && src.state !== 'dead' ? src.pose : null;
  if (pose) {
    ud.posed = true;
    applyPose(mesh, pose, performance.now() / 1000);
  } else if (ud.posed) {
    ud.posed = false;
    if (!src || src.state !== 'dead') mesh.rotation.z = 0;
    if (ud.shadow && ud.shadowBaseY !== undefined) ud.shadow.position.y = ud.shadowBaseY;
    setPropVisible(ud, 'phoneProp', false);
    setPropVisible(ud, 'rodProp', false);
    if (ud.umbrella) ud.umbrella.visible = true;
  }
}

function smoothstep(a, b, x) {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

const TAU = Math.PI * 2;
const _uq = new THREE.Quaternion();
// Shaft leans back and in so the canopy centres over the head.
const UMBRELLA_TILT = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.06, 0, 0.17));

// Walk/run cycle plus idle life (breathing, weight shift, glancing around)
// for a mesh built by buildPersonMesh(). Phase advances with distance;
// walk/run weights ease in and out so starts and stops blend smoothly.
export function animatePersonWalk(mesh, speed, dt) {
  const ud = mesh && mesh.userData;
  if (!ud || !ud.legL || !ud.legR || !ud.armL || !ud.armR) return;

  const s = Number.isFinite(speed) ? Math.max(0, speed) : 0;
  const step = Number.isFinite(dt) ? Math.max(0, Math.min(0.1, dt)) : 0;
  if (ud.umbrella && !ud.posed) ud.umbrella.visible = true;
  if (ud.paddleProp) ud.paddleProp.visible = false;
  if (!ud.pelvis) {
    const sw = Math.sin((ud.walkPhase = ((ud.walkPhase || 0) + s * 2.2 * step) % TAU)) * Math.min(1, s / 1.5);
    ud.legL.rotation.z = sw * 0.55; ud.legR.rotation.z = -sw * 0.55;
    ud.armL.rotation.z = -sw * 0.35; ud.armR.rotation.z = sw * 0.35;
    updatePose(mesh);
    return;
  }

  ud.animT = (ud.animT || 0) + step;
  const t = ud.animT + ud.animOffset;
  const gait = ud.gait || 1;
  const cb = ud.crouchBlend = approach(ud.crouchBlend || 0, ud.crouch ? 1 : 0, step / CROUCH_BLEND_TIME);
  const crouch = cb * cb * (3 - 2 * cb);
  const cadence = Math.min(2.1, (0.42 + 0.3 * s) * gait) * (1 - crouch) + Math.min(1.6, 0.35 + s / 1.1) * crouch;
  const moving = Math.min(1, s / 0.25);
  const phase = ((ud.walkPhase || 0) + TAU * cadence * step * moving) % TAU;
  ud.walkPhase = phase;

  const ease = Math.min(1, step * 8);
  const w = (ud.walkBlend || 0) + (Math.min(1, s / 1.0) - (ud.walkBlend || 0)) * ease;
  const r = (ud.runBlend || 0) + (smoothstep(2.0, 5.6, s) - (ud.runBlend || 0)) * ease;
  ud.walkBlend = w;
  ud.runBlend = r;
  const idle = 1 - w;
  const dead = Math.abs(mesh.rotation.z) > 1;

  const thighAmp = (0.42 + 0.43 * r) * w;
  const thighBias = 0.1 * r;
  const kneeSwing = (0.95 + 0.95 * r) * w;
  const kneeStance = (0.08 + 0.25 * r) * w;
  const armAmp = (0.3 + 0.45 * r) * w * (ud.stoop ? 0.6 : 1);
  const elbowBase = 0.12 + (0.14 + 1.25 * r) * w;

  const breath = Math.sin(t * 1.7);
  const shift = Math.sin(t * 0.33) * idle;
  const look = dead ? 0 : Math.sin(t * 0.23) * Math.sin(t * 0.37 + 1.3) * 0.55;

  const pelvis = ud.pelvis, chest = ud.chest, head = ud.head;
  const bob = (0.018 + 0.03 * r) * w;
  pelvis.position.set(0, HIP_Y - 0.035 * r * w + bob * Math.cos(2 * phase), 0.022 * shift);
  pelvis.rotation.set(0.035 * shift, 0.1 * w * Math.sin(phase), 0);
  const lean = -(ud.stoop || 0) - 0.03 * w - 0.2 * r * w;
  chest.position.set(0, CHEST_Y - HIP_Y + 0.004 * breath * idle, 0);
  chest.rotation.set(-0.03 * shift, -0.2 * w * Math.sin(phase), lean - 0.012 * breath * idle);
  head.rotation.set(0.02 * shift, look * (1 - 0.6 * w) - chest.rotation.y - pelvis.rotation.y, -lean * 0.6 + 0.02 * w * Math.cos(2 * phase));

  const legRoll = -pelvis.rotation.x + pelvis.position.z / (HIP_Y - ANKLE_Y);
  const legs = [[ud.legL, ud.kneeL, phase, 1], [ud.legR, ud.kneeR, phase + Math.PI, -1]];
  for (const [leg, knee, ph, side] of legs) {
    leg.rotation.set(legRoll, 0, thighBias + thighAmp * Math.sin(ph));
    const c = Math.max(0, Math.cos(ph + 0.5));
    const relax = 0.03 + 0.14 * Math.max(0, -side * Math.sin(t * 0.33));
    knee.rotation.z = -(kneeStance + kneeSwing * Math.pow(c, 1.5)) - relax * idle;
  }

  const leash = leashHolders.has(ud.lookSeed);
  const arms = [[ud.armL, ud.elbowL, phase, 1], [ud.armR, ud.elbowR, phase + Math.PI, -1]];
  for (const [arm, elbow, ph, side] of arms) {
    if (side === 1 && ud.umbrella && !ud.posed) {
      arm.rotation.set(-0.05, 0.7, 0.3 + 0.03 * Math.sin(ph) * w);
      elbow.rotation.z = 2.0;
      _uq.copy(pelvis.quaternion).multiply(chest.quaternion).multiply(arm.quaternion).multiply(elbow.quaternion);
      ud.umbrella.quaternion.copy(_uq.invert()).multiply(UMBRELLA_TILT);
      continue;
    }
    if (side === -1 && leash) {
      arm.rotation.set(0.12, 0, 0.3 + 0.05 * Math.sin(ph) * w);
      elbow.rotation.z = 0.45;
      continue;
    }
    const swing = -armAmp * Math.sin(ph);
    arm.rotation.set(-side * (0.03 + 0.1 * r * w), 0, swing + 0.08 * r * w + 0.02 * breath * idle);
    elbow.rotation.z = elbowBase + 0.35 * w * Math.max(0, Math.sin(-ph)) * (1 - r) + 0.06 * idle;
  }
  if (crouch > 0) applyCrouch(ud, crouch, phase, w, s, cadence);
  const air = ud.airBlend = approach(ud.airBlend || 0, Math.max(0, Math.min(1, ud.air || 0)), step / 0.08);
  if (air > 0) applyAirPose(ud, air);
  updatePose(mesh);
}

// Jump / vault tuck: knees pulled up, arms reaching forward and down onto
// whatever is being vaulted.
function applyAirPose(ud, a) {
  for (const [leg, knee, k] of [[ud.legL, ud.kneeL, 1], [ud.legR, ud.kneeR, 0.7]]) {
    leg.rotation.z += (0.95 * k - leg.rotation.z) * a;
    knee.rotation.z += (-1.5 * k - knee.rotation.z) * a;
  }
  for (const [arm, elbow] of [[ud.armL, ud.elbowL], [ud.armR, ud.elbowR]]) {
    if (arm === ud.armL && ud.umbrella && !ud.posed) continue;
    arm.rotation.z += (0.9 - arm.rotation.z) * a;
    elbow.rotation.z += (0.25 - elbow.rotation.z) * a;
  }
  ud.chest.rotation.z -= 0.25 * a;
}

const CROUCH_BLEND_TIME = 0.2;
const CROUCH_DROP = 0.36;

function approach(v, target, maxStep) {
  return v < target ? Math.min(target, v + maxStep) : Math.max(target, v - maxStep);
}

// Thigh/knee angles that put the ankle at (fx, fy) from the hip (see legIK).
function legAngles(fx, fy) {
  const d = Math.min(THIGH_LEN + SHIN_LEN - 1e-3, Math.max(0.05, Math.hypot(fx, fy)));
  const cosA = (THIGH_LEN * THIGH_LEN + d * d - SHIN_LEN * SHIN_LEN) / (2 * THIGH_LEN * d);
  const cosK = (THIGH_LEN * THIGH_LEN + SHIN_LEN * SHIN_LEN - d * d) / (2 * THIGH_LEN * SHIN_LEN);
  return [Math.atan2(fx, -fy) + Math.acos(Math.max(-1, Math.min(1, cosA))), -(Math.PI - Math.acos(Math.max(-1, Math.min(1, cosK))))];
}

// Crouched stance blended over the walk cycle: pelvis dropped and tipped
// forward, feet kept on the ground by leg IK, with short sneaking steps whose
// length matches the ground speed so the planted foot doesn't slide.
function applyCrouch(ud, c, phase, w, s, cadence) {
  const pelvis = ud.pelvis, chest = ud.chest, head = ud.head;
  const pitch = -0.2 * c;
  const hipY = pelvis.position.y + (HIP_Y - CROUCH_DROP + 0.012 * w * Math.cos(2 * phase) - pelvis.position.y) * c;
  pelvis.position.set(-0.05 * c, hipY, pelvis.position.z * (1 - c));
  pelvis.rotation.z = pitch;
  const lean = -0.3 * c;
  chest.rotation.z += lean;
  head.rotation.z -= (pitch + lean) * 0.8;

  const stride = cadence > 0 ? Math.min(0.3, s / (4 * cadence)) : 0;
  const cp = Math.cos(-pitch), sp = Math.sin(-pitch);
  const legs = [[ud.legL, ud.kneeL, phase, 0.1], [ud.legR, ud.kneeR, phase + Math.PI, -0.04]];
  for (const [leg, knee, ph, stagger] of legs) {
    const fx = stride * Math.sin(ph) * w + stagger * (1 - w) + 0.05 * c;
    const fy = ANKLE_Y + 0.07 * w * Math.max(0, Math.cos(ph)) - hipY;
    const [tz, kz] = legAngles(fx * cp - fy * sp, fx * sp + fy * cp);
    const k0 = knee.rotation.z;
    leg.rotation.z += (tz - leg.rotation.z) * c;
    knee.rotation.z = k0 + (kz - k0) * c;
  }
  for (const [arm, elbow] of [[ud.armL, ud.elbowL], [ud.armR, ud.elbowR]]) {
    if (arm === ud.armL && ud.umbrella && !ud.posed) continue;
    const e0 = elbow.rotation.z;
    arm.rotation.z = arm.rotation.z * (1 - 0.5 * c) + 0.45 * c;
    elbow.rotation.z = e0 + (0.9 - e0) * c;
  }
}
