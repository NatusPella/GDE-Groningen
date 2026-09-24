import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { HABBO_PALETTE, habboMaterial, GeoBuilder, vcMaterial, markShared, composeMatrix, tubeGeometry } from './pixelart3d.js';
import { buildPersonMesh } from './models3d_people.js';

// Low-poly vehicles. Group origin = vehicle centre at ground level (y=0),
// facing local +X, right-hand side on +Z; sized off v.model.len/wid.
// Body geometry is merged per model variant into a few vertex-coloured meshes
// and cached across instances (geometry.userData.shared). Materials are made
// per vehicle so scene3d can dispose them on despawn; police lamps need their
// own anyway since updatePoliceLamps animates them.

function hash2(x, y) {
  const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return h - Math.floor(h);
}

const WHEEL_R = 0.32;
const WHEEL_W = 0.22;
const HERO_LEN = 4.0;
const HERO_WID = 1.65;
const WRECKED_COLOR = 0x4a4a4a;

const G_BODY = 0, G_GLASS = 1, G_LAMP = 2;
const TRIM = 0x1f2022;
const CHROME = 0xb9bcbf;
const GLASS = 0x2b3740;
const HEADLAMP = 0xf2efe4;
const TAIL = 0xa3211b;
const INDICATOR = 0xd9822b;
const PLATE = 0xe3bb1c;
const TIRE = 0x1b1b1c;
const RIM = 0x9ea2a6;

const geoCache = new Map();
function cached(key, build) {
  let g = geoCache.get(key);
  if (!g) {
    g = markShared(build());
    geoCache.set(key, g);
  }
  return g;
}

function toHex(c, fallback) {
  if (typeof c === 'number') return c;
  if (typeof c === 'string') return new THREE.Color(c).getHex();
  return fallback;
}

function vehicleMaterials() {
  return [
    vcMaterial({ roughness: 0.5, metalness: 0.1 }),
    vcMaterial({ roughness: 0.18, metalness: 0.3 }),
    new THREE.MeshBasicMaterial({ vertexColors: true }),
  ];
}

function lampMaterial(color, emissiveIntensity = 0) {
  return habboMaterial(color, { emissive: color, emissiveIntensity });
}

// --- shared wheels ------------------------------------------------------------

function carWheelGeometry(r, w) {
  return cached(`wheel|${r}|${w}`, () => {
    const B = new GeoBuilder(1);
    const axleZ = (geo) => geo.rotateX(Math.PI / 2);
    B.geo(axleZ(new THREE.CylinderGeometry(r, r, w, 12, 1)), null, TIRE);
    B.geo(axleZ(new THREE.CylinderGeometry(r * 0.64, r * 0.64, w + 0.02, 10, 1)), null, RIM);
    B.geo(axleZ(new THREE.CylinderGeometry(r * 0.18, r * 0.18, w + 0.05, 6, 1)), null, 0x6a6d70);
    for (let k = 0; k < 3; k++) B.box(0, 0, 0, r * 1.2, r * 0.12, w + 0.035, 0x6a6d70, 0, 0, 0, (k / 3) * Math.PI);
    return B.build();
  });
}

function bikeWheelGeometry(r, tire, spokes = true) {
  return cached(`bwheel|${r}|${tire}|${spokes}`, () => {
    const B = new GeoBuilder(1);
    B.geo(new THREE.TorusGeometry(r - tire, tire, 4, 16), null, TIRE);
    B.geo(new THREE.TorusGeometry(r - tire * 2 - 0.008, 0.01, 3, 16), null, RIM);
    B.geo(new THREE.CylinderGeometry(0.025, 0.025, 0.1, 6).rotateX(Math.PI / 2), null, RIM);
    if (spokes) {
      for (let k = 0; k < 4; k++) B.box(0, 0, 0, (r - tire * 2) * 2, 0.008, 0.008, 0x8a8e92, 0, 0, 0, (k / 4) * Math.PI);
    } else {
      for (let k = 0; k < 5; k++) B.box(0, 0, 0, (r - tire) * 1.9, 0.03, 0.02, 0x3a3a3c, 0, 0, 0, (k / 5) * Math.PI);
    }
    return B.build();
  });
}

function addWheel(group, geo, mat, x, y, z, wheels) {
  const w = new THREE.Mesh(geo, mat);
  w.position.set(x, y, z);
  group.add(w);
  wheels.push(w);
  return w;
}

// --- generic helpers ------------------------------------------------------------

function extrudeProfile(pts, depth, bevel = 0.04) {
  const shape = new THREE.Shape();
  shape.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i][0], pts[i][1]);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.01, depth - bevel * 2),
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel * 0.8,
    bevelOffset: -bevel * 0.8,
    bevelSegments: 1,
    curveSegments: 1,
  });
  geo.translate(0, 0, -(depth - bevel * 2) / 2);
  return geo;
}

// Bottom edge from rear to front with semicircular arches over each wheel.
function archedSill(x0, x1, sillY, arches) {
  const pts = [[x0, sillY + 0.02]];
  for (const { x, r, cy } of arches) {
    pts.push([x - r, sillY]);
    for (let k = 1; k < 7; k++) {
      const a = Math.PI - (k / 7) * Math.PI;
      pts.push([x + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
    pts.push([x + r, sillY]);
  }
  pts.push([x1, sillY + 0.02]);
  return pts;
}

// Thin slab lying on a side (z = +-), or along a slope, as a box between two
// profile points (x,y) at a given lateral z.
function sideStrip(B, ax, ay, bx, by, z, thick, depth, color, group = G_BODY) {
  const len = Math.hypot(bx - ax, by - ay);
  B.box((ax + bx) / 2, (ay + by) / 2, z, len, thick, depth, color, group, 0, 0, Math.atan2(by - ay, bx - ax));
}

function archLiners(B, arches, W) {
  for (const { x, r, cy } of arches) {
    const geo = new THREE.CylinderGeometry(r - 0.035, r - 0.035, W - 0.16, 8, 1, true, Math.PI / 2, Math.PI);
    geo.rotateX(Math.PI / 2);
    geo.scale(1, 1, -1);
    B.geo(geo, composeMatrix(x, cy, 0), 0x151516);
  }
}

// --- cars -------------------------------------------------------------------------

// Side profile keyed off half-length. y values in metres.
function carProfile(type, hl) {
  switch (type) {
    case 'sedan': return { nose: 0.6, hood: 0.84, belt: 0.95, roof: 1.45, xA: hl - 1.3, xB: hl - 2.0, xC: -hl + 1.35, xD: -hl + 0.8, deck: 0.98, tail: 0.8, fw: hl - 0.85, rw: -hl + 0.95 };
    case 'wagon': return { nose: 0.6, hood: 0.85, belt: 0.95, roof: 1.5, xA: hl - 1.25, xB: hl - 1.95, xC: -hl + 0.3, xD: -hl + 0.1, deck: 0.98, tail: 0.92, fw: hl - 0.9, rw: -hl + 1.0 };
    case 'sport': return { nose: 0.45, hood: 0.7, belt: 0.82, roof: 1.25, xA: hl - 1.5, xB: hl - 2.2, xC: -hl + 1.25, xD: -hl + 0.35, deck: 0.86, tail: 0.74, fw: hl - 0.9, rw: -hl + 0.95 };
    case 'escort': return { nose: 0.7, hood: 0.82, belt: 0.9, roof: 1.38, xA: hl - 1.05, xB: hl - 1.6, xC: -hl + 0.55, xD: -hl + 0.15, deck: 0.94, tail: 0.9, fw: hl - 0.75, rw: -hl + 0.75, boxy: true };
    case 'van': return { nose: 0.85, hood: 1.05, belt: 1.08, roof: 2.08, xA: hl - 0.45, xB: hl - 1.1, xC: -hl + 0.04, xD: -hl + 0.02, deck: 2.08, tail: 2.02, fw: hl - 0.8, rw: -hl + 1.05, van: true };
    default: return { nose: 0.58, hood: 0.82, belt: 0.93, roof: 1.47, xA: hl - 1.0, xB: hl - 1.75, xC: -hl + 0.5, xD: -hl + 0.12, deck: 0.98, tail: 0.94, fw: hl - 0.75, rw: -hl + 0.7 };
  }
}

function buildCarGeometry(type, L, W, paint, opts) {
  const hl = L / 2, hw = W / 2;
  const P = carProfile(type, hl);
  const B = new GeoBuilder(3);
  const r = opts.wheelR;
  const R = r + 0.09;
  const arches = [{ x: P.rw, r: R, cy: r }, { x: P.fw, r: R, cy: r }];
  const sill = 0.3;

  const top = P.van
    ? [[hl, P.nose], [hl - 0.12, P.hood], [P.xA, P.belt], [P.xB, P.roof - 0.12], [P.xB - 0.3, P.roof], [-hl + 0.06, P.roof], [-hl, P.roof - 0.06]]
    : [[hl, P.nose], [hl - (P.boxy ? 0.05 : 0.14), P.hood], [P.xA, P.belt], [P.xD, P.belt], [-hl + (P.boxy ? 0.04 : 0.1), P.deck], [-hl, P.tail]];
  const outline = [...top, [-hl, sill + 0.08], ...archedSill(-hl, hl, sill, arches), [hl, sill + 0.08]];
  B.geo(extrudeProfile(outline, W, P.boxy ? 0.025 : 0.05), null, paint);
  archLiners(B, arches, W);

  if (P.van) {
    sideStrip(B, P.xA + 0.02, P.belt + 0.03, P.xB + 0.02, P.roof - 0.13, 0, 0.02, W * 0.86, GLASS, G_GLASS);
    for (const s of [1, -1]) {
      B.quadOut([P.xA - 0.08, P.belt + 0.08, s * (hw + 0.005)], [P.xB - 0.05, P.roof - 0.2, s * (hw + 0.005)], [P.xB - 0.75, P.roof - 0.2, s * (hw + 0.005)], [P.xB - 0.75, P.belt + 0.08, s * (hw + 0.005)], [0, 0, s], GLASS, G_GLASS);
      sideStrip(B, P.xB - 0.8, P.belt + 0.05, P.xB - 0.8, P.roof - 0.15, s * (hw + 0.006), 0.05, 0.01, TRIM);
      sideStrip(B, -hl + 1.6, 1.0, -hl + 1.6, P.roof - 0.1, s * (hw + 0.004), 0.015, 0.01, shadeHex(paint, 0.7));
    }
    B.box(-hl - 0.004, (P.belt + P.roof) / 2 + 0.2, 0, 0.012, 0.5, W * 0.06, TRIM);
    for (const s of [1, -1]) B.box(-hl - 0.004, P.roof - 0.4, s * hw * 0.5, 0.012, 0.42, hw * 0.75, GLASS, G_GLASS);
  } else {
    const gh = [[P.xA + 0.03, P.belt - 0.03], [P.xB, P.roof - 0.07], [P.xC, P.roof - 0.07], [P.xD + 0.03, P.belt - 0.03]];
    B.geo(extrudeProfile(gh, W * 0.84, 0.03), null, GLASS, G_GLASS);
    const roofPts = [[P.xB + 0.07, P.roof - 0.09], [P.xB - 0.04, P.roof], [P.xC + 0.04, P.roof], [P.xC - 0.07, P.roof - 0.09]];
    B.geo(extrudeProfile(roofPts, W * 0.87, 0.025), null, paint);
    const pz = W * 0.42;
    for (const s of [1, -1]) {
      sideStrip(B, P.xA + 0.02, P.belt - 0.01, P.xB + 0.02, P.roof - 0.05, s * pz, 0.07, 0.05, paint);
      sideStrip(B, P.xC - 0.02, P.roof - 0.05, P.xD, P.belt - 0.01, s * pz, type === 'sedan' || type === 'sport' ? 0.09 : 0.16, 0.05, paint);
      const bx = (P.xB + P.xC) / 2 + 0.15;
      sideStrip(B, bx, P.belt, bx - 0.06, P.roof - 0.06, s * (pz + 0.005), 0.07, 0.04, TRIM);
      sideStrip(B, P.xA + 0.02, P.belt + 0.005, P.xD, P.belt + 0.005, s * (pz + 0.01), 0.025, 0.03, TRIM);
    }
  }

  const bumper = P.boxy ? CHROME : 0x2a2b2d;
  const vcount = () => B.groups[G_BODY].p.length / 3;
  const f0 = vcount();
  B.box(hl + 0.02, 0.38, 0, 0.12, 0.14, W - 0.04, bumper);
  B.box(hl + 0.085, 0.38, 0, 0.012, 0.1, 0.48, PLATE);
  const f1 = vcount();
  B.box(-hl - 0.02, 0.4, 0, 0.12, 0.14, W - 0.04, bumper);
  const r1 = vcount();
  B.box(hl + 0.005, P.nose - 0.12, 0, 0.03, 0.11, W * 0.42, TRIM);
  B.box(-hl - 0.008, P.van ? 0.62 : Math.min(0.6, P.tail - 0.22), 0, 0.012, 0.1, 0.48, PLATE);
  const lampY = P.nose - 0.06;
  for (const s of [1, -1]) {
    B.box(hl + 0.006, lampY, s * (hw - 0.26), 0.03, P.boxy ? 0.14 : 0.1, 0.3, HEADLAMP, G_LAMP);
    B.box(hl + 0.006, lampY - (P.boxy ? 0.1 : 0.09), s * (hw - 0.1), 0.03, 0.05, 0.1, INDICATOR, G_LAMP);
    const tailY = P.van ? 0.95 : P.tail - 0.1;
    B.box(-hl - 0.006, tailY, s * (hw - 0.18), 0.03, P.van ? 0.3 : 0.12, P.van ? 0.14 : 0.3, TAIL, G_LAMP);
    B.box((P.fw + P.rw) / 2, sill + 0.08, s * (hw + 0.005), (P.fw - P.rw) - R * 2 - 0.1, 0.1, 0.02, TRIM);
    const mx = P.van ? P.xA - 0.12 : P.xA - 0.08;
    B.box(mx, P.belt + 0.1, s * (hw + 0.08), 0.1, 0.09, 0.14, paint);
    B.box(mx + 0.02, P.belt + 0.05, s * (hw + 0.02), 0.05, 0.04, 0.06, TRIM);
    if (!P.van) {
      for (const dx of [P.xA - 0.04, (P.xB + P.xC) / 2 + 0.15]) B.box(dx, (sill + P.belt) / 2 + 0.1, s * (hw + 0.003), 0.012, P.belt - sill - 0.25, 0.01, shadeHex(paint, 0.6));
      B.box((P.xB + P.xC) / 2 + 0.05, P.belt - 0.08, s * (hw + 0.006), 0.12, 0.025, 0.012, shadeHex(paint, 0.7));
    }
  }

  if (opts.police) {
    for (const s of [1, -1]) {
      const z = s * (hw + 0.007);
      B.box(0, 0.84, z, L - 0.3, 0.13, 0.012, 0x1f3f8f);
      B.box(0, 0.755, z, L - 0.3, 0.025, 0.012, 0xd9772b);
    }
    B.box((P.xB + P.xC) / 2, P.roof + 0.05, 0, 0.3, 0.07, W * 0.72, TRIM);
  }
  if (type === 'sport') {
    B.box(-hl + 0.12, P.deck + 0.1, 0, 0.18, 0.03, W * 0.84, paint);
    for (const s of [1, -1]) B.box(-hl + 0.14, P.deck + 0.05, s * W * 0.34, 0.06, 0.08, 0.04, TRIM);
  }
  if (type === 'wagon' && !opts.police) {
    for (const s of [1, -1]) B.box((P.xB + P.xC) / 2, P.roof + 0.03, s * W * 0.36, (P.xB - P.xC) * 0.8, 0.04, 0.04, TRIM);
  }
  const geo = B.build();
  geo.userData.parts = {
    hl, hw, hood: P.hood, bumperColor: bumper,
    front: { start: f0, end: f1, y: 0.38, x: hl + 0.02 },
    rear: { start: f1, end: r1, y: 0.4, x: -hl - 0.02 },
  };
  return geo;
}

function shadeHex(hex, f) {
  const r = Math.min(255, Math.round(((hex >> 16) & 0xff) * f));
  const g = Math.min(255, Math.round(((hex >> 8) & 0xff) * f));
  const b = Math.min(255, Math.round((hex & 0xff) * f));
  return (r << 16) | (g << 8) | b;
}

function assembleCar(type, L, W, paint, { police = false, wrecked = false, wheelR = WHEEL_R } = {}) {
  const color = wrecked ? WRECKED_COLOR : paint;
  const geo = cached(`car|${type}|${L}|${W}|${color}|${police}`, () => buildCarGeometry(type, L, W, color, { police, wheelR }));
  const mats = vehicleMaterials();
  const group = new THREE.Group();
  const body = new THREE.Mesh(geo, mats);
  group.add(body);
  group.userData.body = body;
  const P = carProfile(type, L / 2);
  const wgeo = carWheelGeometry(wheelR, WHEEL_W);
  const wheels = [];
  for (const x of [P.fw, P.rw]) for (const s of [1, -1]) addWheel(group, wgeo, mats[0], x, wheelR, s * (W / 2 - WHEEL_W / 2 - 0.04), wheels);
  group.userData.wheels = wheels;
  group.userData.wheelRadius = wheelR;
  if (police) {
    const barY = P.roof + 0.14;
    const lamps = [];
    for (const s of [1, -1]) {
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.1, W * 0.3), lampMaterial(0x2f6bff, 0.25));
      lamp.position.set((P.xB + P.xC) / 2, barY, s * W * 0.2);
      group.add(lamp);
      lamps.push(lamp);
    }
    group.userData.policeLamps = lamps;
  }
  return group;
}

function carType(v) {
  if (v.isPolice) return 'wagon';
  const n = v.model.name;
  return n === 'sedan' || n === 'wagon' || n === 'van' || n === 'sport' ? n : 'hatch';
}

function buildCarMesh(v) {
  const police = !!v.isPolice;
  const paint = police ? 0xeceae4 : toHex(v.model.color, HABBO_PALETTE.metalGrey);
  return assembleCar(carType(v), v.model.len, v.model.wid, paint, { police, wrecked: v.wrecked, wheelR: v.model.name === 'van' ? 0.34 : WHEEL_R });
}

function buildFordEscortGroup(color, len = HERO_LEN, wid = HERO_WID, wrecked = false) {
  return assembleCar('escort', len, wid, toHex(color, HABBO_PALETTE.brickRed), { wrecked, wheelR: 0.3 });
}

export function buildFordEscortMesh(color) {
  return buildFordEscortGroup(color);
}

// --- bike / scooter ----------------------------------------------------------------

function riderFor(v, shirtHex) {
  const skins = [0xe8b48a, 0xcaa06f, 0x8a5a3c, 0x5c3d28, 0xf0c9a0];
  const seed = (v.id || 0) * 3.7 + 1;
  return buildPersonMesh(shirtHex, skins[Math.floor(hash2(seed, 2.1) * skins.length)], { seed });
}

function poseRider(rider, legBase, armAngle, lean) {
  const ud = rider.userData;
  rider.rotation.z = lean;
  ud.armL.rotation.z = armAngle;
  ud.armR.rotation.z = armAngle;
  ud.legL.rotation.z = legBase;
  ud.legR.rotation.z = legBase;
}

function buildBikeGeometry(color, fat, stepThrough) {
  return cached(`bike|${color}|${fat}|${stepThrough}`, () => {
    const B = new GeoBuilder(3);
    const r = fat ? 0.3 : 0.34;
    const wb = fat ? 0.52 : 0.56;
    const t = fat ? 0.028 : 0.018;
    const F = [wb, r, 0], R = [-wb, r, 0];
    const BB = [-0.05, 0.3, 0];
    const S = [-0.24, fat ? 0.72 : 0.84, 0];
    const H1 = [0.4, fat ? 0.82 : 0.93, 0], H0 = [0.45, fat ? 0.66 : 0.72, 0];
    const tube = (a, b, rr = t, c = color) => B.geo(tubeGeometry(a, b, rr, rr, 5), null, c);
    tube(H0, H1, t * 1.3);
    tube(S, BB);
    for (const s of [1, -1]) {
      tube([BB[0], BB[1], s * 0.04], [R[0], R[1], s * 0.05], t * 0.8);
      tube([S[0], S[1], s * 0.02], [R[0], R[1], s * 0.05], t * 0.8);
      tube([H0[0], H0[1], s * 0.04], [F[0], F[1], s * 0.05], t * 0.85);
    }
    if (stepThrough && !fat) {
      tube([0.42, 0.86, 0], [0.05, 0.4, 0]);
      tube([0.05, 0.4, 0], BB);
      tube([0.44, 0.78, 0], [0.12, 0.36, 0], t * 0.8);
      tube([0.12, 0.36, 0], [-0.02, 0.29, 0], t * 0.8);
    } else {
      tube(H1, [S[0] + 0.02, S[1] - 0.02, 0]);
      tube(H0, BB, t * 1.1);
    }
    const saddle = [S[0] - 0.03, S[1] + (fat ? 0.2 : 0.14), 0];
    tube(S, saddle, 0.013, 0x8a8e92);
    B.box(saddle[0] - 0.02, saddle[1] + 0.03, 0, 0.27, 0.06, 0.16, 0x2a1d14);
    const stemTop = [H1[0] - 0.02, H1[1] + 0.14, 0];
    tube(H1, stemTop, 0.014, 0x8a8e92);
    for (const s of [1, -1]) {
      const grip = [stemTop[0] - 0.2, stemTop[1] - 0.02, s * 0.28];
      tube(stemTop, [stemTop[0] - 0.02, stemTop[1], s * 0.12], 0.012, 0x8a8e92);
      tube([stemTop[0] - 0.02, stemTop[1], s * 0.12], grip, 0.012, 0x8a8e92);
      tube(grip, [grip[0] - 0.1, grip[1] - 0.01, grip[2]], 0.018, 0x1b1b1c);
    }
    for (const [x] of [F, R]) {
      const guard = new THREE.TorusGeometry(r + 0.03, fat ? 0.05 : 0.028, 3, 9, Math.PI * 0.85);
      guard.scale(1, 1, fat ? 1.2 : 1);
      B.geo(guard, composeMatrix(x, r, 0, 0, 0, Math.PI * 0.08), color);
    }
    if (!fat) {
      B.box(-0.33, 0.44, 0.075, 0.62, 0.13, 0.03, color, 0, 0, 0, 0.07);
      B.box(-0.5, 0.78, 0, 0.44, 0.02, 0.15, 0x2a2a2b);
      for (const s of [1, -1]) tube([-0.66, 0.78, s * 0.07], [R[0], R[1], s * 0.06], 0.01, 0x2a2a2b);
      B.geo(new THREE.CylinderGeometry(0.045, 0.035, 0.07, 7).rotateZ(Math.PI / 2), composeMatrix(H0[0] + 0.07, H0[1] + 0.04, 0), 0x2a2a2b);
      B.box(H0[0] + 0.11, H0[1] + 0.04, 0, 0.01, 0.06, 0.06, HEADLAMP, G_LAMP);
      B.box(-0.73, 0.76, 0, 0.01, 0.04, 0.06, TAIL, G_LAMP);
    }
    for (const s of [1, -1]) B.box(BB[0], BB[1], s * 0.1, 0.1, 0.02, 0.08, 0x2a2a2b);
    return B.build();
  });
}

function buildBikeMesh(v) {
  const group = new THREE.Group();
  const fat = !!v.model.fat;
  const color = v.wrecked ? WRECKED_COLOR : toHex(v.model.color, HABBO_PALETTE.black);
  const stepThrough = hash2(v.id || 0, 4.2) < 0.5;
  const mats = vehicleMaterials();
  group.add(new THREE.Mesh(buildBikeGeometry(color, fat, stepThrough), mats));
  const r = fat ? 0.3 : 0.34;
  const wb = fat ? 0.52 : 0.56;
  const wgeo = bikeWheelGeometry(r, fat ? 0.07 : 0.022);
  const wheels = [];
  addWheel(group, wgeo, mats[0], wb, r, 0, wheels);
  addWheel(group, wgeo, mats[0], -wb, r, 0, wheels);
  group.userData.wheels = wheels;
  group.userData.wheelRadius = r;

  const rider = riderFor(v, toHex(v.model.rider, HABBO_PALETTE.roofBlue));
  const hipY = fat ? 0.93 : 1.02;
  rider.position.set(fat ? -0.26 : -0.3, hipY - 0.93 * rider.scale.y, 0);
  poseRider(rider, fat ? 0.55 : 0.33, fat ? 0.95 : 0.85, -0.08);
  group.add(rider);
  group.userData.riderLegs = { legs: [rider.userData.legL, rider.userData.legR], base: fat ? 0.55 : 0.33, amp: 0.2 };
  return group;
}

function buildScooterGeometry(color) {
  return cached(`step|${color}`, () => {
    const B = new GeoBuilder(3);
    B.box(-0.05, 0.13, 0, 0.72, 0.045, 0.16, color);
    B.box(-0.05, 0.155, 0, 0.66, 0.008, 0.13, 0x2a2a2b);
    B.geo(tubeGeometry([0.3, 0.13, 0], [0.42, 0.11, 0], 0.02, 0.02, 5), null, color);
    B.geo(tubeGeometry([0.42, 0.11, 0], [0.36, 1.03, 0], 0.024, 0.02, 6), null, color);
    B.geo(tubeGeometry([0.36, 1.03, -0.24], [0.36, 1.03, 0.24], 0.015, 0.015, 5), null, 0x2a2a2b);
    for (const s of [1, -1]) B.geo(tubeGeometry([0.36, 1.03, s * 0.17], [0.36, 1.03, s * 0.25], 0.02, 0.02, 5), null, 0x1b1b1c);
    B.box(0.405, 0.4, 0, 0.03, 0.05, 0.06, HEADLAMP, G_LAMP);
    B.box(-0.42, 0.2, 0, 0.12, 0.02, 0.12, color, 0, 0, 0, 0.3);
    B.box(-0.47, 0.22, 0, 0.012, 0.025, 0.06, TAIL, G_LAMP);
    return B.build();
  });
}

function buildScooterMesh(v) {
  const group = new THREE.Group();
  const color = v.wrecked ? WRECKED_COLOR : toHex(v.model.color, HABBO_PALETTE.black);
  const mats = vehicleMaterials();
  group.add(new THREE.Mesh(buildScooterGeometry(color), mats));
  const r = 0.11;
  const wgeo = bikeWheelGeometry(r, 0.035, false);
  const wheels = [];
  addWheel(group, wgeo, mats[0], 0.42, r, 0, wheels);
  addWheel(group, wgeo, mats[0], -0.42, r, 0, wheels);
  group.userData.wheels = wheels;
  group.userData.wheelRadius = r;
  const rider = riderFor(v, toHex(v.model.rider, HABBO_PALETTE.roofBlue));
  rider.position.set(-0.08, 0.155, 0);
  poseRider(rider, 0, 0.66, -0.03);
  rider.userData.legL.rotation.z = 0.12;
  rider.userData.legR.rotation.z = -0.1;
  group.add(rider);
  return group;
}

// --- bus (articulated "harmonica") ---------------------------------------------
// Front unit is the vehicle's real pose; the rear unit hangs off a pivot at the
// joint (userData.busRear) that scene3d swings from the bus's trail history.

const BUS_JOINT_FRAC = 0.6;
const BUS_JOINT_GAP = 0.2;
const BUS_WHITE = 0xe9e9e4;
const BUS_GREEN = 0x2f7d46;
const BUS_LIME = 0x9cc24a;
const BUS_ROOF = 3.0;
const BUS_SILL = 0.32;
const BUS_WHEEL_R = 0.5;

// One bus section from x0 (rear) to x1 (front); rounded roof edge at whichever
// end is exposed. doorXs: door centre positions on the kerb (+Z) side.
function spansBetween(x0, x1, arches, pad = 0.02) {
  const out = [];
  let a = x0;
  for (const { x, r } of arches) {
    if (x - r - pad > a) out.push([a, x - r - pad]);
    a = Math.max(a, x + r + pad);
  }
  if (x1 > a) out.push([a, x1]);
  return out;
}

function busSection(B, x0, x1, W, { front, rear, wheelXs, doorXs }) {
  const hw = W / 2;
  const R = BUS_WHEEL_R + 0.1;
  const arches = wheelXs.slice().sort((a, b) => a - b).map((x) => ({ x, r: R, cy: BUS_WHEEL_R }));
  const top = [[x1, BUS_SILL + 0.1]];
  if (front) top.push([x1 + 0.03, 1.0], [x1, 2.7], [x1 - 0.25, BUS_ROOF]);
  else top.push([x1, BUS_ROOF]);
  if (rear) top.push([x0 + 0.25, BUS_ROOF], [x0, 2.75], [x0, BUS_SILL + 0.1]);
  else top.push([x0, BUS_ROOF], [x0, BUS_SILL + 0.1]);
  const outline = [...top, ...archedSill(x0, x1, BUS_SILL, arches)];
  B.geo(extrudeProfile(outline, W, 0.06), null, BUS_WHITE);
  archLiners(B, arches, W);

  const zs = hw + 0.006;
  const winY0 = 1.15, winY1 = 2.6;
  const inner0 = x0 + (rear ? 0.35 : 0.1), inner1 = x1 - (front ? 0.3 : 0.1);
  for (const s of [1, -1]) {
    const z = s * zs;
    for (const [a, b] of spansBetween(x0 + 0.03, x1 - 0.03, arches)) {
      B.box((a + b) / 2, 0.55, z, b - a, 0.42, 0.012, BUS_GREEN);
      B.box((a + b) / 2, 0.8, z, b - a, 0.07, 0.012, BUS_LIME);
    }
    B.box((inner0 + inner1) / 2, (winY0 + winY1) / 2, z, inner1 - inner0, winY1 - winY0, 0.012, GLASS, G_GLASS);
    const n = Math.max(2, Math.round((inner1 - inner0) / 1.45));
    for (let i = 0; i <= n; i++) {
      const x = inner0 + ((inner1 - inner0) * i) / n;
      B.box(x, (winY0 + winY1) / 2, s * (zs + 0.004), 0.09, winY1 - winY0 + 0.02, 0.01, TRIM);
    }
    B.box((inner0 + inner1) / 2, winY1 + 0.03, s * (zs + 0.004), inner1 - inner0, 0.05, 0.01, TRIM);
    B.box((inner0 + inner1) / 2, winY0 - 0.02, s * (zs + 0.004), inner1 - inner0, 0.04, 0.01, TRIM);
    if (s === 1) {
      for (const dx of doorXs) {
        B.box(dx, (BUS_SILL + 0.1 + winY1) / 2, s * (zs + 0.008), 1.25, winY1 - BUS_SILL - 0.05, 0.012, 0x3a4550, G_GLASS);
        B.box(dx, (BUS_SILL + 0.1 + winY1) / 2, s * (zs + 0.014), 0.05, winY1 - BUS_SILL - 0.05, 0.01, TRIM);
        for (const e of [-0.64, 0.64]) B.box(dx + e, (BUS_SILL + 0.1 + winY1) / 2, s * (zs + 0.014), 0.06, winY1 - BUS_SILL, 0.012, TRIM);
      }
    }
  }
  if (front) {
    B.box(x1 + 0.035, 1.8, 0, 0.012, 1.55, W - 0.24, GLASS, G_GLASS);
    B.box(x1 + 0.04, 2.8, 0, 0.012, 0.22, W * 0.7, 0x1b1b1c);
    B.box(x1 + 0.046, 2.8, 0, 0.01, 0.13, W * 0.55, 0xf0b33a, G_LAMP);
    B.box(x1 + 0.018, 0.6, 0, 0.012, 0.35, W - 0.1, BUS_GREEN);
    for (const s of [1, -1]) {
      B.box(x1 + 0.03, 0.62, s * (hw - 0.28), 0.02, 0.14, 0.34, HEADLAMP, G_LAMP);
      B.box(x1 - 0.35, 2.35, s * (hw + 0.28), 0.08, 0.34, 0.12, TRIM);
      B.box(x1 - 0.2, 2.55, s * (hw + 0.14), 0.05, 0.04, 0.3, TRIM);
    }
    B.box(x1 + 0.03, 0.47, 0, 0.012, 0.1, 0.48, PLATE);
  }
  if (rear) {
    B.box(x0 - 0.035, 2.1, 0, 0.012, 0.9, W - 0.5, GLASS, G_GLASS);
    B.box(x0 - 0.04, 0.95, 0, 0.012, 0.5, W - 0.6, 0x3a3b3d);
    for (const s of [1, -1]) {
      B.box(x0 - 0.045, 0.75, s * (hw - 0.25), 0.02, 0.35, 0.18, TAIL, G_LAMP);
      B.box(x0 - 0.045, 1.0, s * (hw - 0.25), 0.02, 0.1, 0.18, INDICATOR, G_LAMP);
    }
    B.box(x0 - 0.06, 0.45, 0, 0.012, 0.1, 0.48, PLATE);
  }
  const podLen = Math.min(4, (x1 - x0) * 0.45);
  B.box((x0 + x1) / 2 + (front ? 0.6 : -0.3), BUS_ROOF + 0.14, 0, podLen, 0.28, W * 0.72, 0xd6d6d0);
  B.box((x0 + x1) / 2 + (front ? 0.6 : -0.3), BUS_ROOF + 0.29, 0, podLen - 0.3, 0.03, W * 0.6, 0xa9aaa6);
}

function buildBusMesh(v) {
  const group = new THREE.Group();
  const len = v.model.len, wid = v.model.wid;
  const hl = len / 2;
  const jointX = hl - len * BUS_JOINT_FRAC;
  const frontLen = hl - jointX - BUS_JOINT_GAP;
  const frontX = hl - frontLen / 2;
  const rearLen = jointX + hl - BUS_JOINT_GAP;
  const rearX = -BUS_JOINT_GAP - rearLen / 2;
  const x0f = jointX + BUS_JOINT_GAP;
  const fwX = hl - 2.7, mwX = x0f + 1.0;
  const rwX = -hl * 0.78 - jointX;
  const key = `bus|${len}|${wid}|${!!v.wrecked}`;
  const mats = vehicleMaterials();

  const frontGeo = cached(key + '|f', () => {
    const B = new GeoBuilder(3);
    busSection(B, x0f, hl, wid, { front: true, rear: false, wheelXs: [fwX, mwX], doorXs: [hl - 1.05, (fwX + mwX) / 2] });
    const bel = new THREE.CylinderGeometry(wid / 2 * 0.96, wid / 2 * 0.96, BUS_ROOF - 0.45, 12, 1, true);
    B.geo(bel, composeMatrix(jointX, (BUS_ROOF + 0.45) / 2, 0), 0x2a2a2c);
    for (let i = 0; i < 3; i++) B.geo(new THREE.TorusGeometry(wid / 2 * 0.965, 0.025, 3, 12).rotateX(Math.PI / 2), composeMatrix(jointX, 0.9 + i * 0.75, 0), 0x3a3a3c);
    return B.build();
  });
  group.add(new THREE.Mesh(frontGeo, mats));

  const rear = new THREE.Group();
  rear.position.x = jointX;
  group.add(rear);
  const rearGeo = cached(key + '|r', () => {
    const B = new GeoBuilder(3);
    busSection(B, -BUS_JOINT_GAP - rearLen, -BUS_JOINT_GAP, wid, { front: false, rear: true, wheelXs: [rwX], doorXs: [-BUS_JOINT_GAP - 1.2] });
    return B.build();
  });
  rear.add(new THREE.Mesh(rearGeo, mats));

  const wgeo = carWheelGeometry(BUS_WHEEL_R, 0.3);
  const wheels = [];
  const wz = wid / 2 - 0.2;
  for (const x of [fwX, mwX]) for (const s of [1, -1]) addWheel(group, wgeo, mats[0], x, BUS_WHEEL_R, s * wz, wheels);
  for (const s of [1, -1]) addWheel(rear, wgeo, mats[0], rwX, BUS_WHEEL_R, s * wz, wheels);

  group.userData.wheels = wheels;
  group.userData.wheelRadius = BUS_WHEEL_R;
  group.userData.busRear = rear;
  group.userData.busSections = { frontLen, frontX, rearLen, rearX };

  if (v.isPolice) {
    const lamps = [];
    for (const s of [1, -1]) {
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.14, wid * 0.3), lampMaterial(0x2f6bff, 0.25));
      lamp.position.set(hl - 1, BUS_ROOF + 0.1, s * wid * 0.2);
      group.add(lamp);
      lamps.push(lamp);
    }
    group.userData.policeLamps = lamps;
  }
  return group;
}

// Swings the rear unit of a buildBusMesh() group to rearAngle (radians, world
// heading like v.angle), clamped so a trail glitch can never fold it double.
export function setBusRearAngle(mesh, busAngle, rearAngle) {
  const rear = mesh.userData.busRear;
  if (!rear) return;
  let d = (rearAngle - busAngle) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  else if (d < -Math.PI) d += Math.PI * 2;
  rear.rotation.y = -Math.max(-0.75, Math.min(0.75, d));
}

// Dutch police flash blue only: the two bar halves alternate while chasing.
export function updatePoliceLamps(mesh, time, chasing) {
  const lamps = mesh.userData.policeLamps;
  if (!lamps) return;
  if (!chasing) {
    lamps[0].material.emissiveIntensity = 0.25;
    lamps[1].material.emissiveIntensity = 0.25;
    return;
  }
  const phase = (time * 3) % 1;
  const aOn = phase < 0.5 && (phase % 0.25) < 0.16;
  const bOn = phase >= 0.5 && (phase % 0.25) < 0.16;
  lamps[0].material.emissiveIntensity = aOn ? 3 : 0.1;
  lamps[1].material.emissiveIntensity = bOn ? 3 : 0.1;
}

// --- boat ---------------------------------------------------------------------
// Lofted sloep hull: gunwale and chine outlines per station, pointed bow, flat
// transom. The keel sits below y=0 (scene3d parks the group at water level).

function hullStations(L, W) {
  const hl = L / 2;
  const ts = [0, 0.14, 0.32, 0.52, 0.68, 0.8, 0.9, 1];
  return ts.map((t) => {
    const f = t < 0.55 ? 0.86 + 0.14 * Math.sin((t / 0.55) * Math.PI / 2) : Math.cos(((t - 0.55) / 0.45) * Math.PI / 2);
    const x = -hl + t * L;
    const hw = (W / 2) * Math.max(0, f);
    const bowRise = Math.max(0, (t - 0.6) / 0.4);
    return {
      x, t, hw,
      top: 0.5 + 0.22 * t * t,
      chineW: hw * 0.72,
      chine: -0.08 + 0.3 * bowRise * bowRise,
      keel: -0.2 + 0.42 * bowRise * bowRise * bowRise,
    };
  });
}

function buildBoatGeometry(L, W, hull, trim, cabin, police) {
  return cached(`boat|${L}|${W}|${hull}|${trim}|${cabin}|${police}`, () => {
    const B = new GeoBuilder(3);
    const st = hullStations(L, W);
    const floorY = 0.14;
    const WOOD = 0x9a7048, DECK = 0xb08658;
    for (let i = 0; i < st.length - 1; i++) {
      const a = st[i], b = st[i + 1];
      for (const s of [1, -1]) {
        const out = [0, 0, s];
        const aT = [a.x, a.top, s * a.hw], bT = [b.x, b.top, s * b.hw];
        const aS = [a.x, a.top - 0.09, s * a.hw * 0.995], bS = [b.x, b.top - 0.09, s * b.hw * 0.995];
        const aC = [a.x, a.chine, s * a.chineW], bC = [b.x, b.chine, s * b.chineW];
        const aK = [a.x, a.keel, 0], bK = [b.x, b.keel, 0];
        B.quadOut(aS, bS, bT, aT, out, trim);
        B.quadOut(aC, bC, bS, aS, out, hull);
        B.quadOut(aK, bK, bC, aC, [0, -1, s * 0.5], 0x5a2a22);
        const aI = [a.x, a.top, s * Math.max(0, a.hw - 0.06)], bI = [b.x, b.top, s * Math.max(0, b.hw - 0.06)];
        B.quadOut(aT, bT, bI, aI, [0, 1, 0], WOOD);
        const aF = [a.x, floorY, s * Math.max(0, a.hw - 0.12)], bF = [b.x, floorY, s * Math.max(0, b.hw - 0.12)];
        B.quadOut(aI, bI, bF, aF, [0, 0, -s], shadeHex(hull, 0.9));
        B.quadOut(aF, bF, [b.x, floorY, 0], [a.x, floorY, 0], [0, 1, 0], DECK);
      }
    }
    const s0 = st[0];
    B.quadOut([s0.x, s0.top, s0.hw], [s0.x, s0.top, -s0.hw], [s0.x, s0.chine, -s0.chineW], [s0.x, s0.chine, s0.chineW], [-1, 0, 0], hull);
    B.triOut([s0.x, s0.chine, s0.chineW], [s0.x, s0.chine, -s0.chineW], [s0.x, s0.keel, 0], [-1, 0, 0], 0x5a2a22);
    B.quadOut([s0.x + 0.001, s0.top, s0.hw - 0.12], [s0.x + 0.001, s0.top, -(s0.hw - 0.12)], [s0.x + 0.001, floorY, -(s0.hw - 0.12)], [s0.x + 0.001, floorY, s0.hw - 0.12], [1, 0, 0], shadeHex(hull, 0.9));

    const hl = L / 2;
    const benchW = W * 0.8;
    B.box(-hl + 0.3, 0.36, 0, 0.36, 0.06, benchW * 0.95, WOOD);
    B.box(-hl + 0.3, 0.25, 0, 0.3, 0.2, benchW * 0.8, shadeHex(hull, 0.85));
    for (const s of [1, -1]) B.box(-hl + 0.9, 0.36, s * (benchW / 2 - 0.12), 1.0, 0.06, 0.24, WOOD);
    B.box(hl * 0.35, 0.36, 0, 0.28, 0.06, W * 0.62, WOOD);

    if (cabin) {
      const cx0 = -hl * 0.35, cx1 = hl * 0.35;
      const cw = W * 0.72;
      const cabinTop = 1.2;
      B.box((cx0 + cx1) / 2, (0.14 + 0.85) / 2, 0, cx1 - cx0, 0.71, cw, police ? 0xeceae4 : shadeHex(hull, 0.95));
      B.box((cx0 + cx1) / 2 - 0.03, 1.02, 0, cx1 - cx0 - 0.08, 0.34, cw - 0.04, GLASS, G_GLASS);
      B.box((cx0 + cx1) / 2, cabinTop + 0.02, 0, cx1 - cx0 + 0.15, 0.07, cw + 0.06, cabin);
      for (const s of [1, -1]) B.box(cx0 + 0.03, 1.02, s * (cw / 2 - 0.03), 0.06, 0.34, 0.06, cabin);
    } else {
      const cx = hl * 0.05;
      B.box(cx, 0.45, W * 0.18, 0.4, 0.62, 0.36, shadeHex(hull, 0.9));
      B.box(cx + 0.19, 0.86, W * 0.18, 0.02, 0.2, 0.4, GLASS, G_GLASS, 0, 0, 0.35);
      B.geo(new THREE.TorusGeometry(0.1, 0.012, 3, 10).rotateY(Math.PI / 2), composeMatrix(cx - 0.24, 0.86, W * 0.18, 0, 0, 0.5), 0x2a2a2b);
    }
    const sx = -hl + 0.05;
    B.geo(tubeGeometry([sx, 0.5, 0], [sx - 0.05, 1.3, 0], 0.012, 0.01, 4), null, 0x6a5038);
    const fc = [0xae1c28, 0xf2f0ea, 0x21468b];
    for (let i = 0; i < 3; i++) B.box(sx - 0.2, 1.24 - i * 0.06, 0, 0.3, 0.06, 0.006, fc[i]);
    B.box(hl - 0.05, st[st.length - 2].top + 0.05, 0, 0.06, 0.04, 0.06, 0xe8e6e0, G_LAMP);
    return B.build();
  });
}

function buildBoatMesh(v) {
  const group = new THREE.Group();
  const len = v.model.len, wid = v.model.wid;
  const police = !!v.isPolice;
  const hull = v.wrecked ? WRECKED_COLOR : toHex(v.model.color, 0xe8e6e0);
  const cabinColor = toHex(v.model.cabin, 0x2f3a44);
  const withCabin = police || hash2(v.id || 0, 5.3) < 0.4;
  const trim = police ? 0x1f3f8f : [0x21468b, 0x2f4a3a, 0x6b2a24, 0x9a7048][Math.floor(hash2(v.id || 0, 8.1) * 4)];
  group.add(new THREE.Mesh(buildBoatGeometry(len, wid, hull, trim, withCabin ? cabinColor : 0, police), vehicleMaterials()));
  if (police) {
    const lamps = [];
    for (const s of [1, -1]) {
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.1, 0.24), lampMaterial(0x2f6bff, 0.25));
      lamp.position.set(0, 1.3, s * 0.18);
      group.add(lamp);
      lamps.push(lamp);
    }
    group.userData.policeLamps = lamps;
  }
  return group;
}

// --- wheel spin ---------------------------------------------------------------

// Rolls every wheel by the distance travelled this frame; bike riders pedal
// in step. No-op for meshes without userData.wheels (boats).
export function updateVehicleWheelSpin(mesh, speed, dt) {
  const ud = mesh.userData;
  const wheels = ud.wheels;
  if (!wheels || !wheels.length) return;
  const delta = (speed / ud.wheelRadius) * dt;
  for (const w of wheels) w.rotation.z -= delta;
  const rl = ud.riderLegs;
  if (rl) {
    ud.pedalPhase = ((ud.pedalPhase || 0) + delta * 0.45) % (Math.PI * 2);
    const moving = Math.min(1, Math.abs(speed) / 1.5);
    const sw = Math.sin(ud.pedalPhase) * rl.amp * moving;
    rl.legs[0].rotation.z = rl.base + sw;
    rl.legs[1].rotation.z = rl.base - sw;
  }
}

// --- dispatch -------------------------------------------------------------------

function buildVehicleMeshFor(v) {
  if (v.isBike) return buildBikeMesh(v);
  if (v.isScooter) return buildScooterMesh(v);
  if (v.isBus) return buildBusMesh(v);
  if (v.isBoat) return buildBoatMesh(v);
  if (v.isHeroCar) return buildFordEscortGroup(v.model.color, v.model.len, v.model.wid, v.wrecked);
  return buildCarMesh(v);
}

// vehicle id -> the live mesh built for it; entries go stale once scene3d
// drops the mesh (parent null) and are pruned by pruneVehicleMeshes().
const meshRegistry = new Map();

export function buildVehicleMesh(v) {
  const group = buildVehicleMeshFor(v);
  group.userData.vehicleId = v.id;
  group.userData.builtAt = performance.now();
  meshRegistry.set(v.id, group);
  if (v.damage) restoreDamage(group, v);
  return group;
}

export function getVehicleMesh(id) {
  const m = meshRegistry.get(id);
  return m && m.parent ? m : null;
}

export function pruneVehicleMeshes() {
  const now = performance.now();
  for (const [id, m] of meshRegistry) if (!m.parent && now - m.userData.builtAt > 2000) meshRegistry.delete(id);
}

// --- damage ---------------------------------------------------------------------
// The body geometry is cached and shared, so the first dent swaps in a private
// copy. Each impact first refines the mesh around the hit (so the dent has
// vertices to move), then pushes them in. v.damage keeps the arrays so a mesh
// rebuilt after streaming back in looks the same.

const MAX_DENT = 0.42;
const MAX_DAMAGE_VERTS = 9000;
const CRAZED_GLASS = [0.62, 0.66, 0.68];
const BROKEN_LAMP = [0.05, 0.05, 0.05];
const DENT_Y = 0.55;

function posHash(x, y, z) {
  const h = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return h - Math.floor(h);
}

// Per corner: x y z (current), bx by bz (undamaged), r g b, u v.
const ST = 11;

// Red-green refinement: an edge is split iff it is long and its undamaged
// midpoint lies near the impact - both triangles sharing it agree, so the
// mesh stays crack-free.
function refine(tris, maxLen, px, pz, reach) {
  const L2 = maxLen * maxLen, R2 = reach * reach;
  const split = (t, a, b) => {
    const i = a * ST, j = b * ST;
    const dx = t[i + 3] - t[j + 3], dy = t[i + 4] - t[j + 4], dz = t[i + 5] - t[j + 5];
    if (dx * dx + dy * dy + dz * dz <= L2) return false;
    const mx = (t[i + 3] + t[j + 3]) * 0.5 - px, my = ((t[i + 4] + t[j + 4]) * 0.5 - DENT_Y) * 0.7, mz = (t[i + 5] + t[j + 5]) * 0.5 - pz;
    return mx * mx + my * my + mz * mz < R2;
  };
  const corner = (t, a) => t.slice(a * ST, a * ST + ST);
  const mid = (A, B) => {
    const m = new Array(ST);
    for (let k = 0; k < ST; k++) m[k] = (A[k] + B[k]) * 0.5;
    return m;
  };
  for (let iter = 0; iter < 4; iter++) {
    const out = [];
    let changed = false;
    for (const t of tris) {
      const e0 = split(t, 0, 1), e1 = split(t, 1, 2), e2 = split(t, 2, 0);
      const n = e0 + e1 + e2;
      if (!n) { out.push(t); continue; }
      changed = true;
      const r = n === 1 ? (e0 ? 0 : e1 ? 1 : 2) : n === 2 ? (!e2 ? 0 : !e0 ? 1 : 2) : 0;
      const A = corner(t, r), B = corner(t, (r + 1) % 3), C = corner(t, (r + 2) % 3);
      const mAB = mid(A, B), mBC = mid(B, C), mCA = mid(C, A);
      if (n === 1) out.push([...A, ...mAB, ...C], [...mAB, ...B, ...C]);
      else if (n === 2) out.push([...A, ...mAB, ...mBC], [...mAB, ...B, ...mBC], [...A, ...mBC, ...C]);
      else out.push([...A, ...mAB, ...mCA], [...mAB, ...B, ...mBC], [...mCA, ...mBC, ...C], [...mAB, ...mBC, ...mCA]);
    }
    tris = out;
    if (!changed) break;
  }
  return tris;
}

function readTris(g, start, end) {
  const pos = g.attributes.position.array, col = g.attributes.color.array, uv = g.attributes.uv.array;
  const base = g.userData.base || pos;
  const tris = [];
  for (let v = start; v < end; v += 3) {
    const t = new Array(ST * 3);
    for (let k = 0; k < 3; k++) {
      const i = v + k, o = k * ST;
      t[o] = pos[i * 3]; t[o + 1] = pos[i * 3 + 1]; t[o + 2] = pos[i * 3 + 2];
      t[o + 3] = base[i * 3]; t[o + 4] = base[i * 3 + 1]; t[o + 5] = base[i * 3 + 2];
      t[o + 6] = col[i * 3]; t[o + 7] = col[i * 3 + 1]; t[o + 8] = col[i * 3 + 2];
      t[o + 9] = uv[i * 2]; t[o + 10] = uv[i * 2 + 1];
    }
    tris.push(t);
  }
  return tris;
}

function buildDamagedGeometry(lists, parts) {
  let total = 0;
  for (const l of lists) total += l.tris.length * 3;
  const pos = new Float32Array(total * 3), base = new Float32Array(total * 3), col = new Uint8Array(total * 3), uv = new Float32Array(total * 2);
  const g = new THREE.BufferGeometry();
  let v = 0;
  for (const l of lists) {
    const start = v;
    for (const t of l.tris) {
      for (let k = 0; k < 3; k++, v++) {
        const o = k * ST;
        pos[v * 3] = t[o]; pos[v * 3 + 1] = t[o + 1]; pos[v * 3 + 2] = t[o + 2];
        base[v * 3] = t[o + 3]; base[v * 3 + 1] = t[o + 4]; base[v * 3 + 2] = t[o + 5];
        col[v * 3] = t[o + 6]; col[v * 3 + 1] = t[o + 7]; col[v * 3 + 2] = t[o + 8];
        uv[v * 2] = t[o + 9]; uv[v * 2 + 1] = t[o + 10];
      }
    }
    g.addGroup(start, v - start, l.mi);
  }
  return fromArrays(pos, base, col, uv, groupsOf(g), parts);
}

function groupsOf(g) {
  return g.groups.map((q) => ({ start: q.start, count: q.count, materialIndex: q.materialIndex }));
}

function fromArrays(pos, base, col, uv, groups, parts) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(new Int8Array(pos.length), 3, true));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3, true));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  for (const q of groups) g.addGroup(q.start, q.count, q.materialIndex);
  g.userData = { damaged: true, parts, base };
  recomputeFlatNormals(g);
  return g;
}

// Refines the body around (px, pz) and swaps the result into the mesh. The
// bumper ranges stay verbatim at the front of the body group.
function refineBodyAround(mesh, px, pz, reach) {
  const body = mesh.userData.body;
  const g = body.geometry;
  const parts = g.userData.parts;
  if (g.userData.damaged && g.attributes.position.count > MAX_DAMAGE_VERTS) return g;
  const lists = [];
  for (const grp of groupsOf(g).sort((a, b) => a.start - b.start)) {
    const s0 = grp.start, s1 = grp.start + grp.count;
    if (grp.materialIndex === G_BODY) {
      const keep = readTris(g, parts.front.start, parts.rear.end);
      const rest = readTris(g, s0, parts.front.start).concat(readTris(g, parts.rear.end, s1));
      lists.push({ mi: grp.materialIndex, tris: keep.concat(refine(rest, 0.3, px, pz, reach)) });
    } else if (grp.materialIndex === G_GLASS) {
      lists.push({ mi: grp.materialIndex, tris: refine(readTris(g, s0, s1), 0.4, px, pz, reach * 1.5) });
    } else {
      lists.push({ mi: grp.materialIndex, tris: readTris(g, s0, s1) });
    }
  }
  const fLen = parts.front.end - parts.front.start, rLen = parts.rear.end - parts.rear.start;
  const newParts = { ...parts, front: { ...parts.front, start: 0, end: fLen }, rear: { ...parts.rear, start: fLen, end: fLen + rLen } };
  const out = buildDamagedGeometry(lists, newParts);
  if (g.userData.damaged) g.dispose();
  body.geometry = out;
  return out;
}

function recomputeFlatNormals(g) {
  const pos = g.attributes.position.array, nor = g.attributes.normal.array;
  for (let i = 0; i < pos.length; i += 9) {
    const ux = pos[i + 3] - pos[i], uy = pos[i + 4] - pos[i + 1], uz = pos[i + 5] - pos[i + 2];
    const vx = pos[i + 6] - pos[i], vy = pos[i + 7] - pos[i + 1], vz = pos[i + 8] - pos[i + 2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz) || 1;
    nx = Math.round((nx / l) * 127); ny = Math.round((ny / l) * 127); nz = Math.round((nz / l) * 127);
    for (let k = 0; k < 9; k += 3) { nor[i + k] = nx; nor[i + k + 1] = ny; nor[i + k + 2] = nz; }
  }
  g.attributes.normal.needsUpdate = true;
}

function paintTriangles(g, groupIdx, px, py, pz, r, rgb, chance) {
  const grp = g.groups.find((q) => q.materialIndex === groupIdx);
  if (!grp) return;
  const pos = g.attributes.position.array, col = g.attributes.color.array;
  const r2 = r * r;
  for (let v = grp.start; v < grp.start + grp.count; v += 3) {
    const i = v * 3;
    const cx = (pos[i] + pos[i + 3] + pos[i + 6]) / 3, cy = (pos[i + 1] + pos[i + 4] + pos[i + 7]) / 3, cz = (pos[i + 2] + pos[i + 5] + pos[i + 8]) / 3;
    const dx = cx - px, dy = cy - py, dz = cz - pz;
    if (dx * dx + dy * dy + dz * dz > r2) continue;
    const h = posHash(cx, cy, cz);
    if (h > chance) continue;
    const shade = 0.85 + h * 0.3;
    for (let k = 0; k < 9; k += 3) {
      col[i + k] = Math.min(255, rgb[0] * shade * 255);
      col[i + k + 1] = Math.min(255, rgb[1] * shade * 255);
      col[i + k + 2] = Math.min(255, rgb[2] * shade * 255);
    }
  }
  g.attributes.color.needsUpdate = true;
}

function transformPart(g, part, fn) {
  const pos = g.attributes.position.array, base = g.userData.base;
  for (let v = part.start; v < part.end; v++) {
    const i = v * 3;
    fn(base[i], base[i + 1], base[i + 2], pos, i);
  }
  g.attributes.position.needsUpdate = true;
}

function hangBumper(g, part, side) {
  const hw = g.userData.parts.hw, pz = side * hw, py = part.y;
  const th = 0.38, c = Math.cos(th), s = Math.sin(th);
  transformPart(g, part, (x, y, z, pos, i) => {
    const ry = y - py, rz = z - pz;
    pos[i] = x + Math.sign(part.x) * 0.05;
    pos[i + 1] = Math.max(0.03, py + ry * c + side * rz * s);
    pos[i + 2] = pz + rz * c - side * ry * s;
  });
}

function dropBumper(g, part) {
  const inX = part.x * 0.8;
  transformPart(g, part, (x, y, z, pos, i) => { pos[i] = inX; pos[i + 1] = 0.4; pos[i + 2] = 0; });
}

function applyBumperState(g, v) {
  const parts = g.userData.parts, d = v.damage;
  for (const end of ['front', 'rear']) {
    const st = d[end + 'State'];
    if (st === 1) hangBumper(g, parts[end], d[end + 'Side']);
    else if (st === 2) dropBumper(g, parts[end]);
  }
}

function syncDamageMaterials(mesh, v) {
  const mats = mesh.userData.body && mesh.userData.body.material;
  if (!Array.isArray(mats)) return;
  const k = Math.min(1, v.damage.glass);
  mats[1].color.setScalar(1 - k * 0.3);
  mats[1].roughness = 0.18 + k * 0.5;
  mats[0].roughness = 0.5 + Math.min(1, v.damage.total / 3) * 0.25;
}

function storeDamage(v, g) {
  const d = v.damage;
  d.pos = g.attributes.position.array;
  d.base = g.userData.base;
  d.col = g.attributes.color.array;
  d.uv = g.attributes.uv.array;
  d.groups = groupsOf(g);
  d.parts = g.userData.parts;
}

function restoreDamage(mesh, v) {
  const body = mesh.userData.body, d = v.damage;
  if (!body || !d.pos) return;
  const g = fromArrays(d.pos, d.base, d.col, d.uv, d.groups, d.parts);
  body.geometry = g;
  storeDamage(v, g);
  syncDamageMaterials(mesh, v);
}

// Local-space impact (lx forward, lz right, metres from the centre), strength
// 0..1. Returns 'front'/'rear' when that bumper just fell off, else null.
export function applyVehicleDamage(mesh, v, lx, lz, strength) {
  const body = mesh.userData.body;
  if (!body || !body.geometry.userData.parts) return null;
  const parts0 = body.geometry.userData.parts;
  const hl = parts0.hl, hw = parts0.hw;
  const px = Math.max(-hl - 0.05, Math.min(hl + 0.05, lx));
  const pz = Math.max(-hw - 0.05, Math.min(hw + 0.05, lz));
  const R = 0.5 + strength * 0.6;
  const g = refineBodyAround(mesh, px, pz, R);
  if (!v.damage) v.damage = { total: 0, glass: 0, front: 0, rear: 0, frontState: 0, rearState: 0, frontSide: 1, rearSide: 1 };
  const d = v.damage;
  const endness = Math.abs(px) / hl, sideness = Math.abs(pz) / hw;
  let ix = endness > 0.55 ? -Math.sign(px) * endness : 0;
  let iz = sideness > 0.45 ? -Math.sign(pz) * sideness : 0;
  if (!ix && !iz) ix = -Math.sign(px || 1);
  const il = Math.hypot(ix, iz);
  ix /= il; iz /= il;
  const depth = 0.06 + strength * 0.28;
  const pos = g.attributes.position.array, base = g.userData.base;
  const R2 = R * R;
  const skipFrom = g.userData.parts.front.start, skipTo = g.userData.parts.rear.end;
  for (let i = 0; i < pos.length; i += 3) {
    const vi = i / 3;
    if (vi >= skipFrom && vi < skipTo) continue;
    const bx = base[i], by = base[i + 1], bz = base[i + 2];
    const dx = bx - px, dy = (by - DENT_Y) * 0.7, dz = bz - pz;
    const dd = dx * dx + dy * dy + dz * dz;
    if (dd > R2) continue;
    const f = 1 - Math.sqrt(dd) / R;
    const n = posHash(bx, by, bz) - 0.5;
    const m = depth * f * f * (1 + n * 1.1);
    const buckle = Math.sin(bx * 11 + bz * 7 + by * 5) * 0.35 - 0.25 * Math.max(0, by - 0.3);
    let x = pos[i] + ix * m, y = pos[i + 1] + m * buckle, z = pos[i + 2] + iz * m;
    const ox = x - bx, oy = y - by, oz = z - bz;
    const ol = Math.hypot(ox, oy, oz);
    if (ol > MAX_DENT) { const k = MAX_DENT / ol; x = bx + ox * k; y = by + oy * k; z = bz + oz * k; }
    pos[i] = x; pos[i + 1] = Math.max(0.02, y); pos[i + 2] = z;
  }
  g.attributes.position.needsUpdate = true;
  d.total += strength;
  if (strength > 0.25) {
    paintTriangles(g, G_GLASS, px, 1.05, pz, R * 1.9, CRAZED_GLASS, 0.35 + strength * 0.6);
    d.glass += strength * 0.6;
  }
  paintTriangles(g, G_LAMP, px, 0.6, pz, R * 0.9, BROKEN_LAMP, strength * 1.4);

  let dropped = null;
  const end = px > hl * 0.5 ? 'front' : px < -hl * 0.5 ? 'rear' : null;
  if (end) {
    d[end] += strength;
    const prevState = d[end + 'State'];
    if (prevState < 2 && d[end] > 1.3) { d[end + 'State'] = 2; dropped = end; }
    else if (prevState < 1 && d[end] > 0.45) { d[end + 'State'] = 1; d[end + 'Side'] = pz > 0 ? -1 : 1; }
    if (d[end + 'State'] !== prevState) applyBumperState(g, v);
  }
  recomputeFlatNormals(g);
  storeDamage(v, g);
  syncDamageMaterials(mesh, v);
  return dropped;
}

export function vehicleDamageParts(mesh) {
  const body = mesh.userData.body;
  return body ? body.geometry.userData.parts : null;
}
