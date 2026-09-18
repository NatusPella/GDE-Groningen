import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { HABBO_PALETTE, habboMaterial, buildOutline } from './pixelart3d.js';

// Low-poly recognizable vehicle silhouettes. Group origin = vehicle centre at
// ground level (y=0, where wheels touch the road), facing local +X - the
// caller positions/rotates the whole group every frame, nothing here bakes
// in position/rotation. Everything is sized off v.model.len/wid so the mesh
// always matches the vehicle's real collision footprint.
//
// Habbo Hotel restyle pass: every part below is flat/near-flat toon shading
// via pixelart3d.js's habboMaterial() (a hard 2-step gradient, "minimal
// shading") plus a bold black outline on the major body panels/wheels via
// pixelart3d.js's buildOutline() (the shared, never-vehicle-specific
// OUTLINE_MAT - safe to reuse across every vehicle since it is always the
// same flat black, unlike a PAINT color). Every build*Mesh() call below
// still makes its own fresh PAINT/GLASS/CHROME material instances (never a
// shared module-scope material) - critical because scene3d.js's syncActors
// disposes a vehicle's materials on despawn (`mesh.traverse(o =>
// o.material?.dispose())`); a truly shared paint material would get
// disposed out from under every other vehicle still using it. Canvas pixel-
// art textures (createWindowTexture() etc. in pixelart3d.js) are
// deliberately NOT used here: that same dispose path never calls
// `material.map?.dispose()`, so a CanvasTexture attached to a vehicle
// material would leak on every one of the constant traffic spawn/despawn
// cycles - flat palette colors carry the "genuine pixel art" glass look
// safely instead.

function hash2(x, y) {
  const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return h - Math.floor(h);
}

const WHEEL_R = 0.32;
const WHEEL_W = 0.24;
const HERO_LEN = 4.0;
const HERO_WID = 1.65;
// Scene3d's water plane renders at y=0.01 (see syncFlat's water call in
// scene3d.js) - boats share the generic vehicle sync loop that always sets
// mesh.position.y=0, so the hull's float height has to be baked in here.
const WATER_LINE = 0.03;

// Wrecked vehicles have no roughness/metalness channel to dull anymore
// (flat Habbo toon materials don't have one) - color shift is the only
// lever left, so every finish (paint, glass, chrome) grays toward this
// when v.wrecked is set, including bikes/scooters/mirrors that previously
// only got a duller PBR finish and kept their original hue.
const WRECKED_COLOR = 0x4a4a4a;

// Side/rear glazing reads as a darker tinted privacy blue; the windshield
// gets a lighter blue and lower opacity (more see-through) so the two read
// as distinct surfaces instead of one uniform "cabin" block.
const SIDE_GLASS_COLOR = HABBO_PALETTE.roofBlue;
const SIDE_GLASS_OPACITY = 0.85;
const WINDSHIELD_COLOR = HABBO_PALETTE.glassBlue;
const WINDSHIELD_OPACITY = 0.5;

// --- material factories -----------------------------------------------
// Every part below is one of a handful of flat Habbo finishes (paint/glass/
// tire/chrome/plastic/lamp) via the factory functions right after the
// constants - each build*Mesh() call still makes its own fresh material
// instances (never a shared module-scope material), matching scene3d.js's
// syncActors, which disposes a vehicle's materials on despawn; a truly
// shared material would get disposed out from under every other vehicle
// still using it.

function paintMaterial(color, wrecked) {
  return habboMaterial(wrecked ? WRECKED_COLOR : color);
}

function heroPaintMaterial(color, wrecked) {
  return paintMaterial(color, wrecked);
}

function glassMaterial(color, opacity, wrecked) {
  return habboMaterial(wrecked ? HABBO_PALETTE.stoneGrey : color, {
    transparent: true,
    opacity: wrecked ? Math.min(0.98, opacity + 0.12) : opacity,
  });
}

function chromeMaterial(color = HABBO_PALETTE.metalGrey, wrecked) {
  return habboMaterial(wrecked ? HABBO_PALETTE.stoneGrey : color);
}

function tireMaterial() {
  return habboMaterial(HABBO_PALETTE.black);
}

function plasticMaterial(color = HABBO_PALETTE.black) {
  return habboMaterial(color);
}

function lampMaterial(color, emissiveIntensity = 0) {
  return habboMaterial(color, { emissive: color, emissiveIntensity });
}

function buildLamp(color, w, h, d, emissiveIntensity = 0) {
  return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), lampMaterial(color, emissiveIntensity));
}

// Wraps a geometry + already-built material into a Group with the real mesh
// plus a sibling black-outline mesh (via pixelart3d.js's buildOutline(),
// which reuses its one shared, never-disposed OUTLINE_MAT) - the "major
// body panel" look. Callers position/rotate/scale the returned GROUP
// instead of a bare mesh so the outline always inherits the same transform.
function outlinedMesh(geometry, material, outlineThickness = 0.02) {
  const group = new THREE.Group();
  group.add(new THREE.Mesh(geometry, material));
  group.add(buildOutline(geometry, outlineThickness));
  return group;
}

// CylinderGeometry's default axis is Y, so a bare wheel lies flat like a
// coin (round face up). Rotating it about X (not Z) swings that round face
// into the X-Y plane with the thin axle running along Z, which is what
// makes it read as a circle from the side (Z) instead of from the front/
// back (X) - confirmed with a throwaway raycast-silhouette check.
// Two-tone tire+chrome-hub wheel - still just a Group like before, so every
// existing `.position.set`/`.scale.setScalar` call site keeps working. The
// rotation.x that used to sit on the bare tire/hub meshes now sits on their
// outlined wrapper groups instead, so the outline follows the same tilt.
function wheel() {
  const group = new THREE.Group();
  const tire = outlinedMesh(new THREE.CylinderGeometry(WHEEL_R, WHEEL_R, WHEEL_W, 12), tireMaterial(), 0.1);
  tire.rotation.x = Math.PI / 2;
  group.add(tire);
  const hub = outlinedMesh(new THREE.CylinderGeometry(WHEEL_R * 0.55, WHEEL_R * 0.55, WHEEL_W + 0.03, 10), chromeMaterial(), 0.1);
  hub.rotation.x = Math.PI / 2;
  group.add(hub);
  return group;
}

// Two-tone rim+tire wheel for bikes/scooters - a dark tire cylinder with a
// slightly smaller chrome rim nested inside it, seen edge-on.
function bikeWheel(radius) {
  const group = new THREE.Group();
  const tire = outlinedMesh(new THREE.CylinderGeometry(radius, radius, 0.05, 12), tireMaterial(), 0.15);
  tire.rotation.x = Math.PI / 2;
  group.add(tire);
  const rim = outlinedMesh(new THREE.CylinderGeometry(radius * 0.6, radius * 0.6, 0.07, 8), chromeMaterial(), 0.15);
  rim.rotation.x = Math.PI / 2;
  group.add(rim);
  return group;
}

// A thin outlined box stretched and angled between two points in the local
// X-Y (side profile) plane - used to build bike/scooter frame tubes without
// needing a dedicated tube geometry.
function tubeBetween(ax, ay, bx, by, thickness, color, wrecked) {
  const len = Math.hypot(bx - ax, by - ay) || 0.01;
  const group = outlinedMesh(new THREE.BoxGeometry(len, thickness, thickness), paintMaterial(color, wrecked), 0.2);
  group.position.set((ax + bx) / 2, (ay + by) / 2, 0);
  group.rotation.z = Math.atan2(by - ay, bx - ax);
  return group;
}

function wheelArch(x, y, wid) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.26, wid + 0.08), plasticMaterial(HABBO_PALETTE.black));
  m.position.set(x, y, 0);
  return m;
}

// Small side mirror (stalk + head) in local space, pointing outward along
// +/-Z per `side` (1 or -1) - the caller positions the whole group at the
// mount point on the body (roughly the base of the windshield).
function buildMirror(bodyColor, side, wrecked) {
  const group = new THREE.Group();
  const stalk = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.12), plasticMaterial(HABBO_PALETTE.black));
  stalk.position.set(0, 0, side * 0.06);
  group.add(stalk);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.1, 0.07), paintMaterial(bodyColor, wrecked));
  head.position.set(0.02, 0.01, side * 0.15);
  group.add(head);
  return group;
}

// Crouched/standing rider seen from the side: outlined capsule torso leaned
// toward the front wheel plus an outlined head, deliberately not the full
// standing pedestrian mesh. torsoY is an absolute height (in the vehicle's
// own local space) for the torso centre, so callers can stand the rider on
// whatever surface the vehicle actually offers (bike seat vs. scooter deck)
// instead of always anchoring it to y=0; lean controls the forward crouch (a
// scooter rider stands more upright than a cyclist); sizeMul scales the
// whole rider so it still reads clearly next to a small vehicle.
function buildRiderMesh(shirt, torsoY = 0.62, lean = -0.5, sizeMul = 1) {
  const group = new THREE.Group();
  const torso = outlinedMesh(new THREE.CapsuleGeometry(0.2 * sizeMul, 0.42 * sizeMul, 2, 5), habboMaterial(shirt || HABBO_PALETTE.roofBlue), 0.06);
  torso.rotation.z = lean;
  torso.position.set(0.05 * sizeMul, torsoY, 0);
  group.add(torso);
  const head = outlinedMesh(new THREE.SphereGeometry(0.15 * sizeMul, 7, 6), habboMaterial(HABBO_PALETTE.woodLight), 0.08);
  head.position.set(0.28 * sizeMul, torsoY + 0.3 * sizeMul, 0);
  group.add(head);
  return group;
}

function buildLightBar(wid, y) {
  const group = new THREE.Group();
  const half = wid / 2 - 0.08;
  const blue = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.14, half), lampMaterial(HABBO_PALETTE.roofBlue, 0.9));
  blue.position.set(0.05, y, -half / 2);
  group.add(blue);
  const red = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.14, half), lampMaterial(HABBO_PALETTE.brickRed, 0.9));
  red.position.set(0.05, y, half / 2);
  group.add(red);
  return group;
}

// --- regular car ---------------------------------------------------------

function buildCarMesh(v) {
  const group = new THREE.Group();
  const len = v.model.len, wid = v.model.wid;
  const hl = len / 2, hw = wid / 2;
  const bodyColor = v.wrecked ? WRECKED_COLOR : (v.model.color || HABBO_PALETTE.metalGrey);

  const chassisH = 0.7;
  const chassisY = WHEEL_R * 0.55 + chassisH / 2;
  const chassis = outlinedMesh(new THREE.BoxGeometry(len * 0.94, chassisH, wid), paintMaterial(bodyColor, v.wrecked));
  chassis.position.y = chassisY;
  group.add(chassis);

  group.add(wheelArch(hl * 0.55, chassisY - chassisH / 2, wid));
  group.add(wheelArch(-hl * 0.6, chassisY - chassisH / 2, wid));

  const cabinLen = len * 0.48, cabinH = 0.6;
  const cabinTopY = chassisY + chassisH / 2 + cabinH - 0.06;
  const cabinX = hl * 0.02;
  const cabinY = cabinTopY - cabinH / 2;
  const cabin = outlinedMesh(new THREE.BoxGeometry(cabinLen, cabinH, wid * 0.88), glassMaterial(SIDE_GLASS_COLOR, SIDE_GLASS_OPACITY, v.wrecked));
  cabin.position.set(cabinX, cabinY, 0);
  group.add(cabin);

  // windshield: a lighter, more see-through slab set into the very front of
  // the cabin box - the cheap way to read "clear windshield" vs "tinted
  // side glass" without modelling an actual angled A-pillar
  const wsLen = cabinLen * 0.24;
  const windshield = outlinedMesh(new THREE.BoxGeometry(wsLen, cabinH * 0.94, wid * 0.86), glassMaterial(WINDSHIELD_COLOR, WINDSHIELD_OPACITY, v.wrecked));
  windshield.position.set(cabinX + cabinLen / 2 - wsLen / 2 + 0.01, cabinY, 0);
  group.add(windshield);

  const wheels = [];
  for (const ax of [hl * 0.62, -hl * 0.62]) {
    for (const sz of [hw - 0.05, -(hw - 0.05)]) {
      const w = wheel();
      w.position.set(ax, WHEEL_R, sz);
      group.add(w);
      wheels.push(w);
    }
  }
  group.userData.wheels = wheels;
  group.userData.wheelRadius = WHEEL_R;

  const lit = v.wrecked ? 0 : 0.3;
  for (const sz of [hw - 0.15, -(hw - 0.15)]) {
    const inboardZ = sz > 0 ? sz - 0.09 : sz + 0.09;
    const front = buildLamp(HABBO_PALETTE.white, 0.06, 0.14, 0.22, lit);
    front.position.set(hl * 0.97, chassisY, sz);
    group.add(front);
    const frontAccent = buildLamp(HABBO_PALETTE.wallYellow, 0.05, 0.08, 0.08, lit * 0.8);
    frontAccent.position.set(hl * 0.97, chassisY - 0.02, inboardZ);
    group.add(frontAccent);

    const rear = buildLamp(HABBO_PALETTE.brickRed, 0.05, 0.12, 0.16, lit * 0.7);
    rear.position.set(-hl * 0.97, chassisY, sz);
    group.add(rear);
    const rearAccent = buildLamp(HABBO_PALETTE.brickOrange, 0.045, 0.09, 0.06, lit * 0.8);
    rearAccent.position.set(-hl * 0.97, chassisY, inboardZ);
    group.add(rearAccent);
  }

  // Sport model gets a small rear spoiler - the one detail that reads at a
  // glance without adding real geometry cost.
  if (v.model.name === 'sport') {
    const spoiler = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, wid * 0.8), paintMaterial(bodyColor, v.wrecked));
    spoiler.position.set(-hl * 0.88, cabinTopY + 0.03, 0);
    group.add(spoiler);
  }

  // side mirrors at the base of the windshield - cheap 2-piece detail every
  // hatch/sedan/wagon/van silhouette was otherwise missing entirely
  for (const side of [1, -1]) {
    const mirror = buildMirror(bodyColor, side, v.wrecked);
    mirror.position.set(cabinX + cabinLen * 0.28, cabinY + cabinH * 0.1, side * (hw + 0.02));
    group.add(mirror);
  }

  if (v.isPolice) group.add(buildLightBar(wid, cabinTopY + 0.08));

  return group;
}

// --- Ford Escort hero car -------------------------------------------------

function buildFordEscortGroup(color, len = HERO_LEN, wid = HERO_WID, wrecked = false) {
  const group = new THREE.Group();
  const hl = len / 2, hw = wid / 2;
  const bodyColor = wrecked ? WRECKED_COLOR : (color ?? HABBO_PALETTE.brickRed);

  const chassisH = 0.82;
  const chassisY = WHEEL_R * 0.6 + chassisH / 2;
  const chassis = outlinedMesh(new THREE.BoxGeometry(len * 0.98, chassisH, wid), heroPaintMaterial(bodyColor, wrecked));
  chassis.position.y = chassisY;
  group.add(chassis);

  group.add(wheelArch(hl * 0.62, chassisY - chassisH / 2, wid));
  group.add(wheelArch(-hl * 0.66, chassisY - chassisH / 2, wid));

  // Boxier, more upright greenhouse than the generic car, and it eats up
  // more of the total length - shorter front/rear overhangs, per the brief.
  // Width is closer to the full chassis (0.94 vs. the generic car's 0.88)
  // so the slab-sided retro silhouette reads clearly even though this
  // model is itself narrower than every generic car variant.
  const cabinLen = len * 0.62, cabinH = 0.58;
  const cabinY = chassisY + chassisH / 2 + cabinH / 2 - 0.05;
  const cabin = outlinedMesh(new THREE.BoxGeometry(cabinLen, cabinH, wid * 0.94), glassMaterial(SIDE_GLASS_COLOR, SIDE_GLASS_OPACITY, wrecked));
  cabin.position.set(0, cabinY, 0);
  group.add(cabin);

  const wsLen = cabinLen * 0.26;
  const windshield = outlinedMesh(new THREE.BoxGeometry(wsLen, cabinH * 0.94, wid * 0.9), glassMaterial(WINDSHIELD_COLOR, WINDSHIELD_OPACITY, wrecked));
  windshield.position.set(cabinLen / 2 - wsLen / 2 + 0.01, cabinY, 0);
  group.add(windshield);

  const wheels = [];
  for (const ax of [hl * 0.62, -hl * 0.62]) {
    for (const sz of [hw - 0.05, -(hw - 0.05)]) {
      const w = wheel();
      w.position.set(ax, WHEEL_R, sz);
      group.add(w);
      wheels.push(w);
    }
  }
  group.userData.wheels = wheels;
  group.userData.wheelRadius = WHEEL_R;

  const lit = wrecked ? 0 : 0.35;
  for (const sz of [hw * 0.55, -hw * 0.55]) {
    const headlight = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.06, 10), lampMaterial(HABBO_PALETTE.white, lit));
    headlight.rotation.z = Math.PI / 2;
    headlight.position.set(hl * 0.99, chassisY + 0.02, sz);
    group.add(headlight);

    // chrome bezel ring, set slightly back from the lens so the lamp itself
    // still reads as the frontmost surface
    const bezel = new THREE.Mesh(new THREE.CylinderGeometry(0.145, 0.145, 0.03, 12), chromeMaterial(HABBO_PALETTE.metalGrey, wrecked));
    bezel.rotation.z = Math.PI / 2;
    bezel.position.set(hl * 0.965, chassisY + 0.02, sz);
    group.add(bezel);
  }

  const taillightL = buildLamp(HABBO_PALETTE.brickRed, 0.05, 0.14, wid * 0.34, lit * 0.7);
  taillightL.position.set(-hl * 0.99, chassisY + 0.05, hw * 0.42);
  group.add(taillightL);
  const taillightR = buildLamp(HABBO_PALETTE.brickRed, 0.05, 0.14, wid * 0.34, lit * 0.7);
  taillightR.position.set(-hl * 0.99, chassisY + 0.05, -hw * 0.42);
  group.add(taillightR);
  const turnSignal = buildLamp(HABBO_PALETTE.brickOrange, 0.045, 0.1, wid * 0.16, lit * 0.8);
  turnSignal.position.set(-hl * 0.99, chassisY + 0.05, 0);
  group.add(turnSignal);

  // Chrome front/rear bumpers - the single most recognisable period detail
  // that separates this silhouette from every generic bodystyle in the file.
  const bumperY = chassisY - chassisH * 0.34;
  const frontBumper = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.13, wid * 0.92), chromeMaterial(HABBO_PALETTE.metalGrey, wrecked));
  frontBumper.position.set(hl * 0.98, bumperY, 0);
  group.add(frontBumper);
  const rearBumper = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.13, wid * 0.92), chromeMaterial(HABBO_PALETTE.metalGrey, wrecked));
  rearBumper.position.set(-hl * 0.98, bumperY, 0);
  group.add(rearBumper);

  for (const side of [1, -1]) {
    const mirror = buildMirror(bodyColor, side, wrecked);
    mirror.position.set(cabinLen * 0.34, cabinY + cabinH * 0.05, side * (hw + 0.02));
    group.add(mirror);
  }

  return group;
}

export function buildFordEscortMesh(color) {
  return buildFordEscortGroup(color);
}

// --- bike / scooter --------------------------------------------------------

function buildBikeMesh(v) {
  const group = new THREE.Group();
  const hl = v.model.len / 2;
  const wheelR = v.model.fat ? hl * 0.34 : hl * 0.22;
  const seatY = wheelR + 0.42;
  const barY = wheelR + 0.38;
  const bbX = -hl * 0.15, bbY = wheelR;
  const color = v.model.color || HABBO_PALETTE.black;

  // diamond frame: down tube, seat tube, top tube
  group.add(tubeBetween(bbX, bbY, hl * 0.55, barY, 0.05, color, v.wrecked));
  group.add(tubeBetween(bbX, bbY, -hl * 0.55, seatY, 0.05, color, v.wrecked));
  group.add(tubeBetween(-hl * 0.55, seatY, hl * 0.55, barY, 0.05, color, v.wrecked));

  const wheels = [];
  for (const sx of [hl * 0.85, -hl * 0.85]) {
    const w = bikeWheel(wheelR);
    w.position.set(sx, wheelR, 0);
    group.add(w);
    wheels.push(w);
  }
  group.userData.wheels = wheels;
  group.userData.wheelRadius = wheelR;

  const rider = buildRiderMesh(v.model.rider, seatY);
  rider.position.set(-hl * 0.2, 0, 0);
  group.add(rider);

  return group;
}

function buildScooterMesh(v) {
  const group = new THREE.Group();
  const hl = v.model.len / 2;
  const wheelR = hl * 0.28;
  const deckY = wheelR + 0.05;
  const colX = hl * 0.5;
  const barY = wheelR + 0.55;
  const color = v.model.color || HABBO_PALETTE.black;

  group.add(tubeBetween(-hl * 0.75, wheelR, colX, deckY, 0.045, color, v.wrecked));
  group.add(tubeBetween(colX, deckY, colX, barY, 0.05, color, v.wrecked));
  group.add(tubeBetween(-hl * 0.2, deckY, colX, barY * 0.72, 0.03, color, v.wrecked));

  const wheels = [];
  for (const sx of [hl * 0.75, -hl * 0.75]) {
    const w = bikeWheel(wheelR);
    w.position.set(sx, wheelR, 0);
    group.add(w);
    wheels.push(w);
  }
  group.userData.wheels = wheels;
  group.userData.wheelRadius = wheelR;

  // Standing scooter rider: raised so their feet land on the deck (not
  // sunk to y=0 the way a bike-style torsoY of ~0.62 would leave them,
  // since the deck itself sits well above ground here) and scaled up
  // rather than down so a full-size adult clearly reads next to the small
  // deck/frame instead of blending into it.
  const rider = buildRiderMesh(v.model.rider, deckY + 0.56, -0.22, 1.15);
  rider.position.set(colX - 0.2, 0, 0);
  group.add(rider);

  return group;
}

// --- bus (articulated "harmonica" livery) --------------------------------

const BUS_JOINT_FRAC = 0.6;

function busWindowRow(len, hw, bodyH, jointX, bodyY, wrecked) {
  const group = new THREE.Group();
  const winY = bodyY + bodyH * 0.15;
  const winH = bodyH * 0.34;
  const segments = [[-len / 2 + 0.5, jointX - 0.35], [jointX + 0.35, len / 2 - 0.5]];
  for (const side of [hw + 0.01, -(hw + 0.01)]) {
    for (const [x0, x1] of segments) {
      const span = x1 - x0;
      if (span < 0.6) continue;
      const count = Math.max(2, Math.round(span / 1.3));
      const step = span / count;
      for (let i = 0; i < count; i++) {
        const win = outlinedMesh(new THREE.BoxGeometry(step * 0.72, winH, 0.04), glassMaterial(SIDE_GLASS_COLOR, SIDE_GLASS_OPACITY, wrecked), 0.05);
        win.position.set(x0 + step * (i + 0.5), winY, side);
        group.add(win);
      }
    }
  }
  return group;
}

function buildBusMesh(v) {
  const group = new THREE.Group();
  const len = v.model.len, wid = v.model.wid;
  const hl = len / 2, hw = wid / 2;
  const wheelR = 0.42;
  const bodyH = 2.6;
  const bodyY = wheelR * 0.5 + bodyH / 2;
  const jointX = hl - len * BUS_JOINT_FRAC;
  const bodyColor = v.wrecked ? WRECKED_COLOR : v.model.color;

  const body = outlinedMesh(new THREE.BoxGeometry(len, bodyH, wid), paintMaterial(bodyColor, v.wrecked));
  body.position.y = bodyY;
  group.add(body);

  // cosmetic accordion-joint cue at ~60% of the body length from the front -
  // real hinge is not simulated, this is a static livery band
  const joint = new THREE.Mesh(new THREE.BoxGeometry(0.4, bodyH + 0.04, wid + 0.02), plasticMaterial(HABBO_PALETTE.black));
  joint.position.set(jointX, bodyY, 0);
  group.add(joint);

  const stripe = new THREE.Mesh(new THREE.BoxGeometry(len + 0.02, bodyH * 0.18, wid + 0.02), paintMaterial(v.model.stripe || HABBO_PALETTE.wallMint, v.wrecked));
  stripe.position.set(0, bodyY - bodyH * 0.23, 0);
  group.add(stripe);

  const sign = new THREE.Mesh(new THREE.BoxGeometry(0.06, bodyH * 0.16, wid * 0.6), lampMaterial(v.model.accent || HABBO_PALETTE.white, v.wrecked ? 0 : 0.25));
  sign.position.set(hl - 0.05, bodyY + bodyH * 0.34, 0);
  group.add(sign);

  group.add(busWindowRow(len, hw, bodyH, jointX, bodyY, v.wrecked));

  // front windshield: a wider, lighter/clearer panel across the very front
  // face - distinguishes "the driver can see through this" from the tinted
  // side glazing busWindowRow builds
  const windshield = outlinedMesh(new THREE.BoxGeometry(0.05, bodyH * 0.38, wid * 0.82), glassMaterial(WINDSHIELD_COLOR, WINDSHIELD_OPACITY, v.wrecked));
  windshield.position.set(hl - 0.02, bodyY + bodyH * 0.14, 0);
  group.add(windshield);

  const wheels = [];
  for (const ax of [hl * 0.72, jointX, -hl * 0.78]) {
    for (const sz of [hw - 0.1, -(hw - 0.1)]) {
      const w = wheel();
      w.scale.setScalar(wheelR / WHEEL_R);
      w.position.set(ax, wheelR, sz);
      group.add(w);
      wheels.push(w);
    }
  }
  group.userData.wheels = wheels;
  group.userData.wheelRadius = wheelR;

  const lit = v.wrecked ? 0 : 0.3;
  for (const sz of [hw - 0.25, -(hw - 0.25)]) {
    const front = buildLamp(HABBO_PALETTE.white, 0.06, 0.22, 0.3, lit);
    front.position.set(hl * 0.99, bodyY - bodyH * 0.32, sz);
    group.add(front);

    const rear = buildLamp(HABBO_PALETTE.brickRed, 0.06, 0.24, 0.3, lit * 0.7);
    rear.position.set(-hl * 0.99, bodyY - bodyH * 0.32, sz);
    group.add(rear);
    const rearAccent = buildLamp(HABBO_PALETTE.brickOrange, 0.05, 0.14, 0.12, lit * 0.8);
    rearAccent.position.set(-hl * 0.99, bodyY - bodyH * 0.32, sz > 0 ? sz - 0.2 : sz + 0.2);
    group.add(rearAccent);
  }

  for (const side of [1, -1]) {
    const mirror = buildMirror(bodyColor, side, v.wrecked);
    mirror.scale.setScalar(1.6);
    mirror.position.set(hl - 1.3, bodyY + bodyH * 0.22, side * (hw + 0.04));
    group.add(mirror);
  }

  if (v.isPolice) group.add(buildLightBar(wid, bodyY + bodyH / 2 + 0.08));

  return group;
}

// --- boat ------------------------------------------------------------------

// Small gantry/radar-arch alternative to the mast, picked per-vehicle via
// hash2(v.id, ...) so the fleet has variety without storing extra state.
function buildRadarArch(hw) {
  const group = new THREE.Group();
  const postH = 0.75;
  for (const sz of [hw * 0.4, -hw * 0.4]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.04, postH, 0.04), plasticMaterial(HABBO_PALETTE.black));
    post.position.set(0, postH / 2, sz);
    group.add(post);
  }
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, hw * 0.8 + 0.06), plasticMaterial(HABBO_PALETTE.black));
  bar.position.set(0, postH, 0);
  group.add(bar);
  return group;
}

function buildBoatMesh(v) {
  const group = new THREE.Group();
  const len = v.model.len, wid = v.model.wid;
  const hl = len / 2, hw = wid / 2;
  const hullH = 0.5;
  const bowLen = len * 0.34;
  const hullLen = len - bowLen;
  const hullColor = v.wrecked ? WRECKED_COLOR : v.model.color;

  const hull = outlinedMesh(new THREE.BoxGeometry(hullLen, hullH, wid), paintMaterial(hullColor, v.wrecked));
  hull.position.set(hl - bowLen - hullLen / 2, hullH / 2 + WATER_LINE, 0);
  group.add(hull);

  // bow wedge: a cone laid on its side and flattened vertically so it tapers
  // to a point in the horizontal plane like a real hull, not a spike
  const bow = outlinedMesh(new THREE.ConeGeometry(hw, bowLen, 6), paintMaterial(hullColor, v.wrecked));
  bow.rotation.z = -Math.PI / 2;
  bow.scale.x = hullH / (hw * 2);
  bow.position.set(hl - bowLen / 2, hullH / 2 + WATER_LINE, 0);
  group.add(bow);

  const cabin = outlinedMesh(new THREE.BoxGeometry(len * 0.32, 0.5, wid * 0.78), glassMaterial(v.model.cabin || HABBO_PALETTE.roofBlue, 0.85, v.wrecked));
  cabin.position.set(-hl * 0.05, hullH + 0.25 + WATER_LINE, 0);
  group.add(cabin);

  if (hash2(v.id, 5.3) < 0.5) {
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.1, 6), plasticMaterial(HABBO_PALETTE.black));
    mast.position.set(-hl * 0.05, hullH + 0.5 + 0.55 + WATER_LINE, 0);
    group.add(mast);
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 5), lampMaterial(HABBO_PALETTE.brickRed, v.wrecked ? 0 : 0.5));
    beacon.position.set(-hl * 0.05, hullH + 0.5 + 1.1 + WATER_LINE, 0);
    group.add(beacon);
  } else {
    const arch = buildRadarArch(hw);
    arch.position.set(-hl * 0.05, hullH + 0.5 + WATER_LINE, 0);
    group.add(arch);
  }

  return group;
}

// --- wheel spin ---------------------------------------------------------

// Rolls every wheel group of a vehicle mesh built above by the distance it
// travelled this frame (arc length = speed*dt, angle = arc/radius). No-op
// for meshes that never set userData.wheels (boats, or any future vehicle
// type that doesn't call a wheel builder).
export function updateVehicleWheelSpin(mesh, speed, dt) {
  const wheels = mesh.userData.wheels;
  if (!wheels || !wheels.length) return;
  const delta = (speed / mesh.userData.wheelRadius) * dt;
  for (const w of wheels) w.rotation.z += delta;
}

// --- dispatch ---------------------------------------------------------------

export function buildVehicleMesh(v) {
  if (v.isBike) return buildBikeMesh(v);
  if (v.isScooter) return buildScooterMesh(v);
  if (v.isBus) return buildBusMesh(v);
  if (v.isBoat) return buildBoatMesh(v);
  if (v.isHeroCar) return buildFordEscortGroup(v.model.color, v.model.len, v.model.wid, v.wrecked);
  return buildCarMesh(v);
}
