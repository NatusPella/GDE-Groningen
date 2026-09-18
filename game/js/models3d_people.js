import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

// Low-poly humanoid for the on-foot player, every pedestrian, and bike/scooter
// riders. Origin (0,0,0) sits at ground level between the feet, facing local
// +X (mirrors the old snowman placeholder's convention) - the caller sets
// group.position/rotation.y every frame, this module never touches either.

function hash2(x, y) {
  const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return h - Math.floor(h);
}

const LEG_LEN = 0.82;
const LEG_R = 0.095;
const HIP_Y = LEG_LEN;
const TORSO_H = 0.55;
const TORSO_THICK = 0.24;
const SHOULDER_W = 0.46;
const HEAD_Y = 1.55;
const HEAD_R = 0.155;
const ARM_LEN = 0.58;
const ARM_R = 0.062;
const HAND_R = 0.075;
const DEFAULT_HAIR = 0x1c1c1c;

export const TAMMO_APPEARANCE = { shirt: 0x2f5c9e, skin: 0xe0b48a, hair: 0x2b1f14, variant: 'male' };
export const ANITA_APPEARANCE = { shirt: 0xb5483a, skin: 0xc98f66, hair: 0x3c2418, variant: 'female' };

function cylinderPart(rTop, rBottom, h, mat) {
  return new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBottom, h, 6), mat);
}

export function buildPersonMesh(shirt, skin, opts = {}) {
  const isFemale = opts.variant === 'female';
  const hair = opts.hair ?? DEFAULT_HAIR;
  const shoulderW = isFemale ? SHOULDER_W * 0.86 : SHOULDER_W;

  // No (x,y) is passed into this function, so the color pair stands in for
  // "position" - keeps every ped sharing a palette entry from being an exact
  // clone while staying deterministic frame to frame like the rest of scene3d.
  const heightScale = 0.93 + hash2(shirt, skin) * 0.14;
  const buildScale = 0.94 + hash2(skin, shirt) * 0.12;

  const clothMat = new THREE.MeshLambertMaterial({ color: shirt });
  const skinMat = new THREE.MeshLambertMaterial({ color: skin });
  const hairMat = new THREE.MeshLambertMaterial({ color: hair });

  const group = new THREE.Group();

  for (const side of [1, -1]) {
    const leg = cylinderPart(LEG_R, LEG_R * 0.78, LEG_LEN, clothMat);
    leg.position.set(0, LEG_LEN / 2, side * (LEG_R + 0.02));
    group.add(leg);
  }

  const torso = new THREE.Mesh(
    new THREE.BoxGeometry(TORSO_THICK, TORSO_H, shoulderW),
    clothMat
  );
  torso.position.y = HIP_Y + TORSO_H / 2;
  group.add(torso);

  const shoulderY = HIP_Y + TORSO_H - 0.04;
  for (const side of [1, -1]) {
    const arm = cylinderPart(ARM_R * 0.9, ARM_R * 0.7, ARM_LEN, clothMat);
    arm.position.set(0, shoulderY - ARM_LEN / 2, side * (shoulderW / 2 + ARM_R + 0.02));
    arm.rotation.x = side * -0.12;
    const hand = new THREE.Mesh(new THREE.SphereGeometry(HAND_R, 6, 5), skinMat);
    hand.position.set(0, -ARM_LEN / 2, 0);
    arm.add(hand);
    group.add(arm);
  }

  const head = new THREE.Mesh(new THREE.SphereGeometry(HEAD_R, 8, 6), skinMat);
  head.position.y = HEAD_Y;
  group.add(head);

  if (isFemale) {
    const ponytail = new THREE.Mesh(new THREE.SphereGeometry(HEAD_R * 0.48, 6, 5), hairMat);
    ponytail.scale.set(1, 1.9, 1);
    ponytail.position.set(-HEAD_R * 0.95, HEAD_Y - HEAD_R * 0.3, 0);
    group.add(ponytail);
  } else {
    const hairCap = new THREE.Mesh(new THREE.SphereGeometry(HEAD_R * 0.94, 7, 5), hairMat);
    hairCap.scale.set(1, 0.55, 1.02);
    hairCap.position.set(-HEAD_R * 0.15, HEAD_Y + HEAD_R * 0.35, 0);
    group.add(hairCap);
  }

  group.scale.set(buildScale, heightScale, buildScale);
  return group;
}
