import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { HABBO_PALETTE, GeoBuilder, vcMaterial, composeMatrix } from './pixelart3d.js';

// Low-poly humanoid for the on-foot player, every pedestrian, and bike/scooter
// riders. Origin sits at ground level between the feet, facing local +X; the
// caller owns group.position/rotation. Five meshes per person (static body +
// four limb pivots userData.legL/legR/armL/armR that animatePersonWalk swings
// about Z), all sharing one per-person vertex-colour material.

function hash2(x, y) {
  const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return h - Math.floor(h);
}

const HIP_Y = 0.93;
const SHOULDER_Y = 1.41;
const HEAD_Y = 1.665;
const DEFAULT_CAP = HABBO_PALETTE.brickOrange;

const WALK_STRIDE_FREQ = 2.2;
const WALK_BLEND_SPEED = 1.5;
const WALK_BLEND_RATE = 8;
const LEG_SWING_AMPLITUDE = 0.55;
const ARM_SWING_AMPLITUDE = 0.35;

export const TAMMO_APPEARANCE = { shirt: 0x3f6ea8, skin: HABBO_PALETTE.woodLight, hair: HABBO_PALETTE.woodDark, variant: 'male', character: 'tammo', cap: DEFAULT_CAP, pants: 0x2f3b52, shoes: 0xd8d4cc, hairStyle: 'short', seed: 11 };
export const ANITA_APPEARANCE = { shirt: HABBO_PALETTE.brickRed, skin: HABBO_PALETTE.woodMid, hair: HABBO_PALETTE.black, variant: 'female', character: 'anita', pants: 0x26262a, shoes: 0x2a1d14, hairStyle: 'long', seed: 23 };

const HAIR_COLORS = [0x2a1d14, 0x3b2a1e, 0x5a3d26, 0x7a5636, 0xb08f5c, 0xcdb485, 0x8a8580, 0x93462a, 0x1b1b1d];
const PANTS_COLORS = [0x2f3b52, 0x44567a, 0x232326, 0x3a3b3f, 0x7f7258, 0x4a3a2a, 0x5b5f63, 0x3b4a3a];
const SHOE_COLORS = [0x1e1e1e, 0x3b2a1e, 0xd8d4cc, 0x5a3d26, 0x2a2f38, 0x1e1e1e];
const COAT_COLORS = [0x2b2f36, 0x3f4a3b, 0x5c4630, 0x1f2a3a, 0x6b2a24, 0x7a6a4a, 0x8a8478, 0x3a3f47];
const BAG_COLORS = [0x232326, 0x3b2a1e, 0x4a5a4a, 0x6b2a24, 0x2f3b52];
const HAT_COLORS = [0x2b2f36, 0x6b2a24, 0x3f4a3b, 0xb8a27a, 0x1f2a3a];
const COP_BLUE = 0x1c3fae;
const COP_NAVY = 0x1d2740;

function shade(hex, f) {
  const r = Math.min(255, Math.round(((hex >> 16) & 0xff) * f));
  const g = Math.min(255, Math.round(((hex >> 8) & 0xff) * f));
  const b = Math.min(255, Math.round((hex & 0xff) * f));
  return (r << 16) | (g << 8) | b;
}

function pick(arr, t) {
  return arr[Math.min(arr.length - 1, Math.floor(t * arr.length))];
}

let pedSeedCounter = 0;

function resolveLook(shirt, skin, opts) {
  const seed = opts.seed ?? (++pedSeedCounter * 7.31 + hash2(shirt % 997, skin % 991) * 50);
  const r = (k) => hash2(seed * 1.37 + k * 17.13, seed * 0.71 + k * 5.71);
  const cop = shirt === COP_BLUE && !opts.character;
  const female = opts.variant ? opts.variant === 'female' : (!cop && r(1) < 0.5);
  let hairStyle = opts.hairStyle;
  if (!hairStyle) {
    const t = r(2);
    hairStyle = female
      ? (t < 0.35 ? 'long' : t < 0.6 ? 'ponytail' : t < 0.78 ? 'bun' : t < 0.9 ? 'bob' : 'curly')
      : (t < 0.55 ? 'short' : t < 0.7 ? 'buzz' : t < 0.82 ? 'bald' : 'curly');
  }
  const outer = r(3);
  const coat = cop ? 'jacket' : (female && outer < 0.22 ? 'skirt' : outer < 0.45 ? 'coat' : outer < 0.75 ? 'jacket' : 'none');
  const hatRoll = r(4);
  return {
    seed, r, cop, female, hairStyle, coat,
    hair: opts.hair ?? pick(HAIR_COLORS, r(5)),
    pants: opts.pants ?? (cop ? COP_NAVY : pick(PANTS_COLORS, r(6))),
    shoes: opts.shoes ?? (cop ? 0x1a1a1a : pick(SHOE_COLORS, r(7))),
    under: cop ? 0x9fb4d8 : shade(shirt, r(8) < 0.5 ? 1.35 : 0.7),
    hat: cop ? 'police' : opts.character ? null : (hatRoll < 0.1 ? 'beanie' : hatRoll < 0.15 ? 'cap' : null),
    hatColor: pick(HAT_COLORS, r(9)),
    bag: cop || opts.character ? null : (r(10) < 0.16 ? 'backpack' : r(10) < 0.28 ? 'shoulder' : null),
    bagColor: pick(BAG_COLORS, r(11)),
    tights: r(12) < 0.5 ? 0x26262a : shade(skin, 0.95),
    heightScale: opts.character ? 1 : (female ? 0.94 : 1) * (0.96 + r(13) * 0.09),
    buildScale: opts.character ? 1 : 0.94 + r(14) * 0.12,
  };
}

// Elliptic, tapered ring section between y0 and y1 (radius x = depth, z = width).
function taper(B, y0, y1, d0, w0, d1, w1, color, sides = 8, x = 0) {
  const geo = new THREE.CylinderGeometry(1, 1, 1, sides, 1, false);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const top = pos.getY(i) > 0;
    pos.setXYZ(i, pos.getX(i) * (top ? d1 : d0) + x, top ? y1 : y0, pos.getZ(i) * (top ? w1 : w0));
  }
  B.geo(geo, null, color);
}

function addHead(B, L, skin, hairColor) {
  B.geo(new THREE.SphereGeometry(1, 8, 6), composeMatrix(0, HEAD_Y, 0, 0, 0, 0, 0.1, 0.122, 0.088), skin);
  B.box(0.098, HEAD_Y - 0.01, 0, 0.035, 0.045, 0.03, shade(skin, 0.9));
  for (const s of [1, -1]) B.box(0.0, HEAD_Y, s * 0.087, 0.035, 0.05, 0.02, shade(skin, 0.92));
  const capGeo = () => new THREE.SphereGeometry(1, 8, 4, 0, Math.PI * 2, 0, Math.PI * 0.55);
  const style = L.hairStyle;
  if (style !== 'bald') {
    const k = style === 'buzz' ? 1.02 : style === 'curly' ? 1.18 : 1.07;
    B.geo(capGeo(), composeMatrix(-0.012, HEAD_Y + 0.012, 0, 0, 0, 0.42, 0.1 * k, 0.124 * k, 0.09 * k), hairColor);
  }
  if (style === 'long') {
    B.box(-0.075, HEAD_Y - 0.1, 0, 0.07, 0.3, 0.18, hairColor);
    for (const s of [1, -1]) B.box(-0.01, HEAD_Y - 0.08, s * 0.085, 0.1, 0.22, 0.03, hairColor);
  } else if (style === 'bob') {
    B.box(-0.05, HEAD_Y - 0.05, 0, 0.11, 0.17, 0.2, hairColor);
  } else if (style === 'ponytail') {
    B.geo(new THREE.SphereGeometry(1, 5, 4), composeMatrix(-0.125, HEAD_Y - 0.05, 0, 0, 0, -0.3, 0.045, 0.1, 0.045), hairColor);
  } else if (style === 'bun') {
    B.geo(new THREE.SphereGeometry(1, 6, 4), composeMatrix(-0.07, HEAD_Y + 0.115, 0, 0, 0, 0, 0.055, 0.05, 0.055), hairColor);
  }

  if (L.hat === 'beanie') {
    B.geo(capGeo(), composeMatrix(-0.008, HEAD_Y + 0.03, 0, 0, 0, 0.25, 0.115, 0.13, 0.102), L.hatColor);
  } else if (L.hat === 'cap' || L.hat === 'tammo') {
    const c = L.hat === 'tammo' ? L.capColor : L.hatColor;
    B.geo(capGeo(), composeMatrix(-0.01, HEAD_Y + 0.035, 0, 0, 0, 0.12, 0.112, 0.11, 0.1), c);
    B.box(0.12, HEAD_Y + 0.045, 0, 0.1, 0.018, 0.16, shade(c, 0.85), 0, 0, 0, -0.12);
  } else if (L.hat === 'police') {
    taper(B, HEAD_Y + 0.05, HEAD_Y + 0.13, 0.1, 0.092, 0.118, 0.108, COP_NAVY, 8);
    B.box(0.11, HEAD_Y + 0.055, 0, 0.08, 0.015, 0.15, 0x111111, 0, 0, 0, -0.2);
    taper(B, HEAD_Y + 0.05, HEAD_Y + 0.075, 0.102, 0.094, 0.104, 0.096, 0xd8d4cc, 8);
  }
}

function buildBody(L, top, skin) {
  const B = new GeoBuilder(1);
  const f = L.female;
  const shW = f ? 0.175 : 0.205, waistW = f ? 0.13 : 0.155, hipW = f ? 0.165 : 0.155;
  const dep = f ? 0.1 : 0.115;
  const legColor = L.coat === 'skirt' ? L.tights : L.pants;

  taper(B, HIP_Y - 0.1, HIP_Y + 0.08, dep * 0.95, hipW, dep, waistW, legColor);
  taper(B, HIP_Y + 0.06, SHOULDER_Y - 0.03, dep, waistW, dep * 1.08, shW, top);
  taper(B, SHOULDER_Y - 0.03, SHOULDER_Y + 0.05, dep * 1.08, shW, 0.06, 0.07, top);
  taper(B, SHOULDER_Y + 0.02, HEAD_Y - 0.09, 0.045, 0.045, 0.042, 0.042, skin, 6);

  if (L.coat === 'coat') {
    taper(B, HIP_Y - 0.3, HIP_Y + 0.1, dep * 1.25, hipW * 1.18, dep * 1.08, waistW * 1.06, top);
    B.box(0.06, SHOULDER_Y - 0.02, 0, 0.1, 0.07, shW * 0.9, shade(top, 0.8));
  } else if (L.coat === 'jacket') {
    taper(B, HIP_Y - 0.08, HIP_Y + 0.1, dep * 1.1, hipW * 1.08, dep * 1.06, waistW * 1.06, top);
    B.box(dep * 1.03, SHOULDER_Y - 0.2, 0, 0.03, 0.36, 0.07, L.under);
  } else if (L.coat === 'skirt') {
    taper(B, HIP_Y - 0.36, HIP_Y + 0.08, dep * 1.7, hipW * 1.35, dep, waistW, L.pants === legColor ? 0x3a3b3f : L.pants);
  } else {
    B.box(dep * 0.98, SHOULDER_Y - 0.035, 0, 0.02, 0.05, 0.1, L.under);
  }
  if (L.cop) {
    taper(B, HIP_Y + 0.04, HIP_Y + 0.1, dep * 1.12, waistW * 1.1, dep * 1.12, waistW * 1.1, 0x111111);
    B.box(0.02, SHOULDER_Y - 0.12, 0, dep * 2.25, 0.04, shW * 2.02, 0xc8ccd0);
  }

  if (L.bag === 'backpack') {
    B.box(-dep - 0.07, SHOULDER_Y - 0.2, 0, 0.14, 0.36, 0.27, L.bagColor);
    B.box(-dep - 0.14, SHOULDER_Y - 0.28, 0, 0.03, 0.16, 0.2, shade(L.bagColor, 0.8));
    for (const s of [1, -1]) B.box(0.0, SHOULDER_Y - 0.02, s * shW * 0.55, dep * 2.1, 0.03, 0.04, shade(L.bagColor, 0.7));
  } else if (L.bag === 'shoulder') {
    B.box(0.02, HIP_Y + 0.02, hipW + 0.07, 0.24, 0.2, 0.08, L.bagColor);
    B.box(0.0, (HIP_Y + SHOULDER_Y) / 2 + 0.08, 0, dep * 2.15, 0.035, 0.035, shade(L.bagColor, 0.7), 0, 0, 0.9, 0);
  }

  addHead(B, L, skin, L.hair);
  return B.build();
}

function buildLeg(L) {
  const B = new GeoBuilder(1);
  const bare = L.coat === 'skirt';
  const c = bare ? L.tights : L.pants;
  const thigh = L.female ? 0.075 : 0.08;
  taper(B, -0.46, 0, 0.06, 0.06, thigh, thigh, c, 6);
  taper(B, -0.86, -0.44, 0.045, 0.045, 0.058, 0.058, c, 6);
  B.box(0.045, 0.045 - HIP_Y, 0, 0.26, 0.09, 0.1, L.shoes);
  B.box(0.045, 0.012 - HIP_Y, 0, 0.27, 0.024, 0.108, shade(L.shoes, L.shoes > 0xa00000 ? 0.75 : 1.6));
  return B.build();
}

function buildArm(L, sleeve, skin, side) {
  const B = new GeoBuilder(1);
  const lean = side * 0.07;
  const m = (y) => [0, y * Math.cos(lean), -y * Math.sin(lean)];
  const len = L.female ? 0.54 : 0.58;
  const [x0, y0, z0] = m(0.02);
  const [x1, y1, z1] = m(-len * 0.5);
  const [x2, y2, z2] = m(-len);
  const seg = (a, b, r0, r1, c) => {
    const geo = new THREE.CylinderGeometry(r1, r0, 1, 6, 1, true);
    const dir = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    const l = dir.length();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    B.geo(geo, new THREE.Matrix4().compose(new THREE.Vector3((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2), q, new THREE.Vector3(1, l, 1)), c);
  };
  seg([x0, y0, z0], [x1, y1, z1], 0.052, 0.045, sleeve);
  seg([x1, y1, z1], [x2, y2, z2], 0.045, 0.036, sleeve);
  B.geo(new THREE.SphereGeometry(1, 5, 3), composeMatrix(x2 + 0.01, y2 - 0.055, z2, 0, 0, 0, 0.04, 0.065, 0.028), skin);
  return B.build();
}

export function buildPersonMesh(shirt, skin, opts = {}) {
  const L = resolveLook(shirt, skin, opts);
  if (opts.character === 'tammo') { L.hat = 'tammo'; L.capColor = opts.cap ?? DEFAULT_CAP; L.coat = 'jacket'; L.under = 0xd8d4cc; }
  if (opts.character === 'anita') { L.coat = 'coat'; }
  const top = L.cop ? COP_BLUE : shirt;
  const mat = vcMaterial({ roughness: 0.9 });
  const group = new THREE.Group();
  group.add(new THREE.Mesh(buildBody(L, top, skin), mat));

  const legGeo = buildLeg(L);
  const hipZ = L.female ? 0.085 : 0.09;
  for (const side of [1, -1]) {
    const pivot = new THREE.Group();
    pivot.position.set(0, HIP_Y, side * hipZ);
    pivot.add(new THREE.Mesh(legGeo, mat));
    group.add(pivot);
    if (side === 1) group.userData.legL = pivot;
    else group.userData.legR = pivot;
  }

  const shW = L.female ? 0.175 : 0.205;
  for (const side of [1, -1]) {
    const pivot = new THREE.Group();
    pivot.position.set(0, SHOULDER_Y - 0.01, side * (shW + 0.03));
    pivot.add(new THREE.Mesh(buildArm(L, top, skin, side), mat));
    group.add(pivot);
    if (side === 1) group.userData.armL = pivot;
    else group.userData.armR = pivot;
  }

  group.scale.set(L.buildScale, L.heightScale, L.buildScale);
  return group;
}

// Drives the walk cycle for a mesh built by buildPersonMesh(). Phase advances
// with distance travelled; amplitude eases toward 0 when standing still.
export function animatePersonWalk(mesh, speed, dt) {
  const ud = mesh && mesh.userData;
  if (!ud || !ud.legL || !ud.legR || !ud.armL || !ud.armR) return;

  const s = Number.isFinite(speed) ? Math.max(0, speed) : 0;
  const step = Number.isFinite(dt) ? Math.max(0, dt) : 0;

  const phase = (ud.walkPhase || 0) + s * WALK_STRIDE_FREQ * step;
  ud.walkPhase = phase % (Math.PI * 2);

  const targetBlend = Math.min(1, s / WALK_BLEND_SPEED);
  const prevBlend = ud.walkBlend || 0;
  const blend = prevBlend + (targetBlend - prevBlend) * Math.min(1, step * WALK_BLEND_RATE);
  ud.walkBlend = blend;

  const swing = Math.sin(phase) * blend;
  const legSwing = swing * LEG_SWING_AMPLITUDE;
  const armSwing = swing * ARM_SWING_AMPLITUDE;

  ud.legL.rotation.z = legSwing;
  ud.legR.rotation.z = -legSwing;
  ud.armL.rotation.z = -armSwing;
  ud.armR.rotation.z = armSwing;
}
