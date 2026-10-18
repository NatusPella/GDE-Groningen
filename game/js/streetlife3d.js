// Models for the street life (streetlifedata.js): what walkers carry (a sofa,
// a mattress, a plant, a bundle of De Reep), Bernhard's cart and the crate and
// cup of someone sitting on the pavement. Small boxy low-poly pieces in the
// game's style; geometry and material are shared.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { GeoBuilder, vcMaterial, markShared, composeMatrix } from './pixelart3d.js';

let mat = null;
const geos = new Map();

function shared(key, build) {
  let g = geos.get(key);
  if (!g) {
    const B = new GeoBuilder(1);
    build(B);
    g = markShared(B.build());
    geos.set(key, g);
  }
  return g;
}

function material() {
  if (!mat) mat = markShared(vcMaterial({ roughness: 0.9 }));
  return mat;
}

// Person-local frame: +x is forward, y up, the origin between the feet.
const CARRY = {
  sofa: {
    pos: [0.62, 0.78, 0], arms: 'front',
    build(B) {
      const fab = 0xb5654a, dark = 0x8a4a38;
      B.box(0, 0, 0, 0.62, 0.26, 1.15, fab);
      B.box(-0.26, 0.3, 0, 0.14, 0.46, 1.15, dark);
      for (const s of [1, -1]) B.box(0, 0.16, s * 0.6, 0.62, 0.34, 0.12, dark);
      B.box(0.05, 0.16, 0, 0.4, 0.07, 0.9, 0xc77a5e);
    },
  },
  matras: {
    pos: [0, 2.0, 0], arms: 'up',
    build(B) {
      B.box(0, 0, 0, 1.9, 0.16, 0.9, 0xe8e4da);
      B.box(0, 0.002, 0, 0.12, 0.17, 0.92, 0x4a6fa8);
      B.box(-0.55, 0.002, 0, 0.12, 0.17, 0.92, 0x4a6fa8);
      B.box(0.55, 0.002, 0, 0.12, 0.17, 0.92, 0x4a6fa8);
    },
  },
  plant: {
    pos: [0.42, 0.78, 0], arms: 'front',
    build(B) {
      B.geo(new THREE.CylinderGeometry(0.2, 0.15, 0.34, 8), composeMatrix(0, 0, 0), 0xb5654a);
      B.geo(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 5), composeMatrix(0, 0.35, 0), 0x6a4a2a);
      B.geo(new THREE.IcosahedronGeometry(0.42, 0), composeMatrix(0, 0.85, 0, 0, 0, 0, 1, 1.15, 1), 0x3f8a3c);
      B.geo(new THREE.IcosahedronGeometry(0.28, 0), composeMatrix(0.12, 0.6, 0.18), 0x4f9a46);
    },
  },
  eend: {
    pos: [0.4, 0.86, 0], arms: 'front',
    build(B) {
      B.box(0, 0, 0, 0.3, 0.2, 0.2, 0xf2ead0);
      B.box(0.14, 0.18, 0, 0.12, 0.16, 0.12, 0xf2ead0);
      B.box(0.23, 0.2, 0, 0.1, 0.05, 0.08, 0xe0922a);
      B.box(-0.17, 0.08, 0, 0.08, 0.1, 0.1, 0xe3dcc0);
    },
  },
  skateboard: {
    pos: [0, 0.07, 0], arms: null,
    build(B) {
      B.box(0, 0.04, 0, 0.82, 0.03, 0.2, 0xd8b04a);
      B.box(0.42, 0.065, 0, 0.1, 0.02, 0.18, 0xd8b04a);
      B.box(-0.42, 0.065, 0, 0.1, 0.02, 0.18, 0xd8b04a);
      B.box(0, 0.015, 0, 0.82, 0.012, 0.19, 0x2a2a2b);
      for (const x of [-0.27, 0.27]) for (const s of [1, -1]) B.box(x, -0.01, s * 0.1, 0.07, 0.07, 0.04, 0xe8e4da);
    },
  },
  paper: {
    pos: [0.28, 0.92, 0.22], arms: null,
    build(B) {
      B.box(0, 0, 0, 0.26, 0.2, 0.34, 0xe8e2d0);
      B.box(0, 0.105, 0, 0.27, 0.025, 0.35, 0xc9382b);
      B.box(0.14, 0.02, 0, 0.012, 0.14, 0.3, 0x2a2a2b);
    },
  },
};

// Arm pose to hold the load (set after the walk cycle, every frame).
export function carryPose(mesh, kind) {
  const spec = CARRY[kind];
  const ud = mesh.userData;
  if (!spec || !spec.arms || !ud.armL) return;
  if (spec.arms === 'up') {
    ud.armL.rotation.set(-0.15, 0, 2.75);
    ud.armR.rotation.set(0.15, 0, 2.75);
    if (ud.elbowL) ud.elbowL.rotation.z = 0.35;
    if (ud.elbowR) ud.elbowR.rotation.z = 0.35;
  } else {
    ud.armL.rotation.set(0.1, 0, 0.8);
    ud.armR.rotation.set(-0.1, 0, 0.8);
    if (ud.elbowL) ud.elbowL.rotation.z = 1.1;
    if (ud.elbowR) ud.elbowR.rotation.z = 1.1;
  }
}

export const CARRY_KINDS = Object.keys(CARRY);
export const carryHoldsArms = (kind) => !!(CARRY[kind] && CARRY[kind].arms);

// Adds the carried thing to a pedestrian's mesh (once).
export function attachCarry(mesh, kind) {
  const spec = CARRY[kind];
  if (!spec || mesh.userData.carryMesh) return;
  const m = new THREE.Mesh(shared('carry-' + kind, spec.build), material());
  m.position.set(spec.pos[0], spec.pos[1], spec.pos[2]);
  m.castShadow = false;
  mesh.add(m);
  mesh.userData.carryMesh = m;
}

// --- static pieces for the cell meshes (cityprops.js) ---------------------------------

function fresh(build) {
  const B = new GeoBuilder(1);
  build(B);
  return B.build();
}

// (fresh geometry each call: cityprops.js caches it and maps it onto its atlas)
export function crateGeometry() {
  return fresh((B) => {
    B.box(0, 0.2, 0, 0.5, 0.4, 0.6, 0xa9855a);
    B.box(0, 0.4, 0, 0.52, 0.02, 0.62, 0x7a5a38);
    B.box(0.32, 0.03, 0.12, 0.1, 0.06, 0.1, 0xe8e4da);
    B.geo(new THREE.CylinderGeometry(0.045, 0.04, 0.09, 7), composeMatrix(0.62, 0.045, 0.1), 0xe8e4da);
  });
}

// Bernhard's cart: a wire-style trolley piled with bags and a rolled blanket.
export function cartGeometry() {
  return fresh((B) => {
    const steel = 0x8a8e92;
    B.box(0, 0.2, 0, 0.9, 0.04, 0.55, steel);
    for (const s of [1, -1]) B.box(0, 0.45, s * 0.28, 0.9, 0.5, 0.025, steel);
    B.box(-0.45, 0.45, 0, 0.025, 0.5, 0.55, steel);
    B.box(-0.47, 0.72, 0, 0.06, 0.04, 0.6, 0x2a2a2b);
    for (const x of [-0.35, 0.35]) for (const s of [1, -1]) {
      B.geo(new THREE.CylinderGeometry(0.09, 0.09, 0.04, 8).rotateX(Math.PI / 2), composeMatrix(x, 0.09, s * 0.26), 0x1c1c1e);
      B.box(x, 0.15, s * 0.26, 0.03, 0.1, 0.03, steel);
    }
    B.box(0.05, 0.5, 0.05, 0.5, 0.36, 0.4, 0x5a6a7a);
    B.box(-0.18, 0.66, -0.1, 0.34, 0.28, 0.3, 0xb5654a);
    B.box(0.2, 0.72, -0.05, 0.4, 0.14, 0.14, 0x7a2f2a);
    B.box(0.42, 0.85, 0.1, 0.02, 0.4, 0.02, 0x6a5038);
    B.box(0.42, 1.02, 0.2, 0.02, 0.16, 0.28, 0xc9382b);
  });
}
