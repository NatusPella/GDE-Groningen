import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { HABBO_PALETTE, habboMaterial, buildOutline } from './pixelart3d.js';

// Low-poly humanoid for the on-foot player, every pedestrian, and bike/scooter
// riders. Origin (0,0,0) sits at ground level between the feet, facing local
// +X (mirrors the old snowman placeholder's convention) - the caller sets
// group.position/rotation.y every frame, this module never touches either.
//
// Habbo Hotel look: flat HABBO_PALETTE colors via habboMaterial (2-step toon
// shading), bold black outlines on every major silhouette part, and a big
// round head - the single most recognizable Habbo trait. HEAD_Y stays fixed
// (scene3d.js positions/animates this rig but never reads HEAD_Y itself, so
// nothing outside this file depends on it - still, the brief asks to keep it
// put rather than move the head, so only HEAD_R grew here); the shorter torso
// below closes the neck gap that a bigger head would otherwise open up.

function hash2(x, y) {
  const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return h - Math.floor(h);
}

const LEG_LEN = 0.82;
const LEG_R = 0.115;
const HIP_Y = LEG_LEN;
const TORSO_H = 0.44;
const TORSO_THICK = 0.3;
const SHOULDER_W = 0.44;
const HEAD_Y = 1.6;
const HEAD_R = 0.3;
const ARM_LEN = 0.48;
const ARM_R = 0.078;
const HAND_R = 0.095;
const NECK_R = 0.09;
const DEFAULT_HAIR = HABBO_PALETTE.black;
const DEFAULT_CAP = HABBO_PALETTE.brickOrange;

const SHOE_H = 0.11;
const SHOE_LEN = LEG_R * 2.6;
const SHOE_WID = LEG_R * 2.1;

// Neck is sized to exactly span torso-top -> head-bottom, whatever those
// constants happen to be, so raising/lowering HEAD_Y or TORSO_H can never
// reopen a gap (or punch an overlap) at the neck seam. Clamped to a small
// positive minimum since a big Habbo head can otherwise push HEAD_BOTTOM_Y
// below TORSO_TOP_Y (a slight head/torso overlap - harmless, hidden by the
// outlines - rather than a degenerate/negative-height neck cylinder).
const TORSO_TOP_Y = HIP_Y + TORSO_H;
const HEAD_BOTTOM_Y = HEAD_Y - HEAD_R;
const NECK_H = Math.max(0.02, HEAD_BOTTOM_Y - TORSO_TOP_Y);

// Bold black outline as a sibling of a part that has its own position/
// rotation/scale (pixelart3d.js's buildOutline only builds the mesh; siblings
// with a non-identity transform need that transform copied on manually).
function addOutline(parent, mesh, thickness = 0.08) {
  const outline = buildOutline(mesh.geometry, thickness);
  outline.position.copy(mesh.position);
  outline.rotation.copy(mesh.rotation);
  outline.scale.copy(mesh.scale).multiplyScalar(1 + thickness);
  parent.add(outline);
  return outline;
}

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

export const TAMMO_APPEARANCE = { shirt: 0x3f6ea8, skin: HABBO_PALETTE.woodLight, hair: HABBO_PALETTE.woodDark, variant: 'male', character: 'tammo', cap: DEFAULT_CAP };
export const ANITA_APPEARANCE = { shirt: HABBO_PALETTE.brickRed, skin: HABBO_PALETTE.woodMid, hair: HABBO_PALETTE.black, variant: 'female', character: 'anita' };

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

  const clothMat = habboMaterial(shirt);
  const pantsMat = habboMaterial(pants);
  const skinMat = habboMaterial(skin);
  const hairMat = habboMaterial(hair);
  const shoeMat = habboMaterial(shoes);

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
    addOutline(legPivot, leg, 0.14);

    const shoe = new THREE.Mesh(new THREE.BoxGeometry(SHOE_LEN, SHOE_H, SHOE_WID), shoeMat);
    shoe.position.set(LEG_R * 0.55, SHOE_H / 2 - HIP_Y, 0);
    legPivot.add(shoe);
    addOutline(legPivot, shoe, 0.12);

    if (side === 1) group.userData.legL = legPivot;
    else group.userData.legR = legPivot;
  }

  const torso = new THREE.Mesh(
    new THREE.BoxGeometry(TORSO_THICK, TORSO_H, shoulderW),
    clothMat
  );
  torso.position.y = HIP_Y + TORSO_H / 2;
  group.add(torso);
  addOutline(group, torso, 0.05);

  const neck = cylinderPart(NECK_R, NECK_R * 1.15, NECK_H, skinMat);
  neck.position.y = TORSO_TOP_Y + NECK_H / 2;
  group.add(neck);
  addOutline(group, neck, 0.15);

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
    addOutline(arm, hand, 0.12);
    armPivot.add(arm);
    addOutline(armPivot, arm, 0.16);

    if (side === 1) group.userData.armL = armPivot;
    else group.userData.armR = armPivot;
  }

  const head = new THREE.Mesh(new THREE.SphereGeometry(HEAD_R, 10, 8), skinMat);
  head.position.y = HEAD_Y;
  group.add(head);
  addOutline(group, head, 0.05);

  if (isFemale) {
    const ponytail = new THREE.Mesh(new THREE.SphereGeometry(HEAD_R * 0.48, 6, 5), hairMat);
    ponytail.scale.set(1, 1.9, 1);
    ponytail.position.set(-HEAD_R * 0.95, HEAD_Y - HEAD_R * 0.3, 0);
    group.add(ponytail);
    addOutline(group, ponytail, 0.08);
  } else {
    // radius is well under HEAD_R and it sits high on the crown, so most of
    // the head sphere stays visible/skin-colored instead of being englobed
    const hairCap = new THREE.Mesh(new THREE.SphereGeometry(HEAD_R * 0.72, 7, 5), hairMat);
    hairCap.scale.set(1, 0.6, 1);
    hairCap.position.set(-HEAD_R * 0.12, HEAD_Y + HEAD_R * 0.55, 0);
    group.add(hairCap);
    addOutline(group, hairCap, 0.08);
  }

  // Tammo/Anita need to read as "the same two specific people" everywhere
  // they appear (player, companion, passenger), so each gets exactly one
  // extra silhouette primitive on top of the generic variant look above.
  if (opts.character === 'tammo') {
    const capMat = habboMaterial(opts.cap ?? DEFAULT_CAP);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(HEAD_R * 0.75, HEAD_R * 1.05, HEAD_R * 0.58, 8), capMat);
    cap.position.set(-HEAD_R * 0.08, HEAD_Y + HEAD_R * 0.9, 0);
    group.add(cap);
    addOutline(group, cap, 0.08);
  } else if (opts.character === 'anita') {
    const fringe = new THREE.Mesh(new THREE.BoxGeometry(HEAD_R * 0.5, HEAD_R * 0.85, HEAD_R * 1.5), hairMat);
    fringe.position.set(HEAD_R * 0.62, HEAD_Y + HEAD_R * 0.05, 0);
    fringe.rotation.z = 0.15;
    group.add(fringe);
    addOutline(group, fringe, 0.08);
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
