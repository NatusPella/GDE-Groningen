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
const HEAD_Y = 1.6;
const HEAD_R = 0.155;
const ARM_LEN = 0.58;
const ARM_R = 0.062;
const HAND_R = 0.075;
const NECK_R = 0.075;
const DEFAULT_HAIR = 0x1c1c1c;
const DEFAULT_CAP = 0x1c2b3d;

const SHOE_H = 0.085;
const SHOE_LEN = LEG_R * 2.6;
const SHOE_WID = LEG_R * 2.1;

const CLOTH_ROUGHNESS = 0.88;
const SKIN_ROUGHNESS = 0.75;
const HAIR_ROUGHNESS = 0.4;
const SHOE_ROUGHNESS = 0.55;
const CAP_ROUGHNESS = 0.55;

// Neck is sized to exactly span torso-top -> head-bottom, whatever those
// constants happen to be, so raising/lowering HEAD_Y or TORSO_H can never
// reopen a gap (or punch an overlap) at the neck seam.
const TORSO_TOP_Y = HIP_Y + TORSO_H;
const HEAD_BOTTOM_Y = HEAD_Y - HEAD_R;
const NECK_H = HEAD_BOTTOM_Y - TORSO_TOP_Y;

// Walk-cycle tuning. Phase advances with distance travelled (speed * dt), not
// wall-clock time, so cadence scales with movement speed instead of ticking
// at a fixed rate while standing still. WALK_BLEND_SPEED is the speed at
// which swing amplitude reaches its full value; below it the swing eases
// down toward 0 instead of snapping, so an idle character settles into the
// rest pose rather than freezing mid-stride or twitching.
const WALK_STRIDE_FREQ = 2.2; // rad of phase per meter travelled
const WALK_BLEND_SPEED = 1.5; // m/s at which swing amplitude saturates
const WALK_BLEND_RATE = 8; // 1/s ease rate for the amplitude blend
const LEG_SWING_AMPLITUDE = 0.55; // rad, hip pivot swing at full blend
const ARM_SWING_AMPLITUDE = 0.35; // rad, shoulder pivot swing at full blend (smaller than legs)

export const TAMMO_APPEARANCE = { shirt: 0x2f5c9e, skin: 0xe0b48a, hair: 0x2b1f14, variant: 'male', character: 'tammo', cap: DEFAULT_CAP };
export const ANITA_APPEARANCE = { shirt: 0xb5483a, skin: 0xc98f66, hair: 0x3c2418, variant: 'female', character: 'anita' };

function cylinderPart(rTop, rBottom, h, mat) {
  return new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBottom, h, 6), mat);
}

function shadeColor(hex, factor) {
  const r = Math.min(255, Math.round(((hex >> 16) & 0xff) * factor));
  const g = Math.min(255, Math.round(((hex >> 8) & 0xff) * factor));
  const b = Math.min(255, Math.round((hex & 0xff) * factor));
  return (r << 16) | (g << 8) | b;
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

  // Pants/shoes are derived from the shirt color rather than added as new
  // required opts fields, so every existing call site (which only ever
  // passes shirt+skin, or the two named-character opts) keeps working
  // unchanged while still getting a two-tone body instead of one flat color.
  const pants = opts.pants ?? shadeColor(shirt, 0.55);
  const shoes = opts.shoes ?? shadeColor(pants, 0.5);

  const clothMat = new THREE.MeshStandardMaterial({ color: shirt, roughness: CLOTH_ROUGHNESS, metalness: 0 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: pants, roughness: CLOTH_ROUGHNESS, metalness: 0 });
  const skinMat = new THREE.MeshStandardMaterial({ color: skin, roughness: SKIN_ROUGHNESS, metalness: 0 });
  const hairMat = new THREE.MeshStandardMaterial({ color: hair, roughness: HAIR_ROUGHNESS, metalness: 0 });
  const shoeMat = new THREE.MeshStandardMaterial({ color: shoes, roughness: SHOE_ROUGHNESS, metalness: 0 });

  const group = new THREE.Group();

  // Each leg is its own Group pivoted at the hip (y = HIP_Y) instead of a
  // bare mesh positioned by its own center, so animatePersonWalk() below can
  // rotate the whole leg (cylinder + shoe) around that hip. The leg/shoe
  // meshes are offset DOWN from the pivot by exactly the amount the pivot
  // itself moved up, so at rest (pivot rotation 0) they land at the exact
  // same world position/points as the original ungrouped version - this is
  // a pure rest-pose refactor, not a visual change.
  for (const side of [1, -1]) {
    const legPivot = new THREE.Group();
    legPivot.position.set(0, HIP_Y, side * (LEG_R + 0.02));
    group.add(legPivot);

    const leg = cylinderPart(LEG_R, LEG_R * 0.78, LEG_LEN, pantsMat);
    leg.position.set(0, -LEG_LEN / 2, 0);
    legPivot.add(leg);

    const shoe = new THREE.Mesh(new THREE.BoxGeometry(SHOE_LEN, SHOE_H, SHOE_WID), shoeMat);
    shoe.position.set(LEG_R * 0.55, SHOE_H / 2 - HIP_Y, 0);
    legPivot.add(shoe);

    if (side === 1) group.userData.legL = legPivot;
    else group.userData.legR = legPivot;
  }

  const torso = new THREE.Mesh(
    new THREE.BoxGeometry(TORSO_THICK, TORSO_H, shoulderW),
    clothMat
  );
  torso.position.y = HIP_Y + TORSO_H / 2;
  group.add(torso);

  const neck = cylinderPart(NECK_R, NECK_R * 1.15, NECK_H, skinMat);
  neck.position.y = TORSO_TOP_Y + NECK_H / 2;
  group.add(neck);

  // Same pivot-group treatment as the legs above, this time at the shoulder,
  // so animatePersonWalk() can swing each arm. The arm keeps its own slight
  // rotation.x "embed" tilt (unrelated to walking) exactly as before; the
  // pivot only ever adds a rotation.z swing on top of that, defaulting to 0.
  const shoulderY = HIP_Y + TORSO_H - 0.04;
  for (const side of [1, -1]) {
    const armPivot = new THREE.Group();
    // offset is a slight embed (not a gap) so the arm visually attaches to
    // the torso's side face instead of floating next to it
    armPivot.position.set(0, shoulderY, side * (shoulderW / 2 + ARM_R * 0.15));
    group.add(armPivot);

    const arm = cylinderPart(ARM_R * 0.9, ARM_R * 0.7, ARM_LEN, clothMat);
    arm.position.set(0, -ARM_LEN / 2, 0);
    arm.rotation.x = side * -0.12;
    const hand = new THREE.Mesh(new THREE.SphereGeometry(HAND_R, 6, 5), skinMat);
    hand.position.set(0, -ARM_LEN / 2, 0);
    arm.add(hand);
    armPivot.add(arm);

    if (side === 1) group.userData.armL = armPivot;
    else group.userData.armR = armPivot;
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
    // radius is well under HEAD_R and it sits high on the crown, so most of
    // the head sphere stays visible/skin-colored instead of being englobed
    const hairCap = new THREE.Mesh(new THREE.SphereGeometry(HEAD_R * 0.72, 7, 5), hairMat);
    hairCap.scale.set(1, 0.6, 1);
    hairCap.position.set(-HEAD_R * 0.12, HEAD_Y + HEAD_R * 0.55, 0);
    group.add(hairCap);
  }

  // Tammo/Anita need to read as "the same two specific people" everywhere
  // they appear (player, companion, passenger), so each gets exactly one
  // extra silhouette primitive on top of the generic variant look above.
  if (opts.character === 'tammo') {
    const capMat = new THREE.MeshStandardMaterial({ color: opts.cap ?? DEFAULT_CAP, roughness: CAP_ROUGHNESS, metalness: 0 });
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(HEAD_R * 0.75, HEAD_R * 1.05, HEAD_R * 0.58, 8), capMat);
    cap.position.set(-HEAD_R * 0.08, HEAD_Y + HEAD_R * 0.9, 0);
    group.add(cap);
  } else if (opts.character === 'anita') {
    const fringe = new THREE.Mesh(new THREE.BoxGeometry(HEAD_R * 0.5, HEAD_R * 0.85, HEAD_R * 1.5), hairMat);
    fringe.position.set(HEAD_R * 0.62, HEAD_Y + HEAD_R * 0.05, 0);
    fringe.rotation.z = 0.15;
    group.add(fringe);
  }

  group.scale.set(buildScale, heightScale, buildScale);
  return group;
}

// Drives the walk cycle for a mesh built by buildPersonMesh(). Call once per
// frame per character (player, companion, every pedestrian) with that
// character's current ground speed in m/s; safe to call for a mesh that
// isn't a person (e.g. missing the pivot groups) since it just no-ops.
//
// Rotates each leg/arm pivot around local Z only - these figures face local
// +X and stand as vertical cylinders, so a Z rotation of the pivot tips the
// leg/arm forward/backward along X, which is the sagittal swing plane a real
// stride moves in. Opposite-side legs swing in opposite phase; each arm
// swings in the same phase as the opposite-side leg (natural counter-swing),
// at a smaller amplitude. Never touches mesh.scale - that's reserved for
// per-character build/height (buildPersonMesh) and crouch (the integrator).
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
