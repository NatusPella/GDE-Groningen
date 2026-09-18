import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

// Low-poly recognizable vehicle silhouettes. Group origin = vehicle centre at
// ground level (y=0, where wheels touch the road), facing local +X - the
// caller positions/rotates the whole group every frame, nothing here bakes
// in position/rotation. Everything is sized off v.model.len/wid so the mesh
// always matches the vehicle's real collision footprint.
//
// Materials pass: every part below is one of a handful of physically-ish
// distinct finishes (paint/glass/tire/chrome/plastic/lamp) via the factory
// functions right after the constants - each build*Mesh() call still makes
// its own fresh material instances (never a shared module-scope material),
// matching scene3d.js's syncActors, which disposes a vehicle's materials on
// despawn; a truly shared material would get disposed out from under every
// other vehicle still using it.

function hash2(x, y) {
  const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return h - Math.floor(h);
}

const WHEEL_R = 0.32;
const WHEEL_W = 0.24;
const ARCH_COLOR = 0x141414;
const HERO_LEN = 4.0;
const HERO_WID = 1.65;
// Scene3d's water plane renders at y=0.01 (see syncFlat's water call in
// scene3d.js) - boats share the generic vehicle sync loop that always sets
// mesh.position.y=0, so the hull's float height has to be baked in here.
const WATER_LINE = 0.03;

// Side/rear glazing reads as darker tinted privacy glass; the windshield
// gets a lighter tint and lower opacity (more see-through) so the two read
// as distinct surfaces instead of one uniform "cabin" block.
const SIDE_GLASS_COLOR = 0x333d47;
const SIDE_GLASS_OPACITY = 0.92;
const WINDSHIELD_COLOR = 0x7c8b98;
const WINDSHIELD_OPACITY = 0.55;

const PAINT_ROUGHNESS = 0.32;
const PAINT_METALNESS = 0.45;
// The hero car's paint is noticeably glossier/more saturated in its
// reflectivity than every generic bodystyle sharing this file.
const HERO_PAINT_ROUGHNESS = 0.16;
const HERO_PAINT_METALNESS = 0.6;
const GLASS_ROUGHNESS = 0.06;
const GLASS_METALNESS = 0.1;
const TIRE_ROUGHNESS = 0.95;
const TIRE_METALNESS = 0;
const CHROME_COLOR = 0xd7dadd;
const CHROME_ROUGHNESS = 0.12;
const CHROME_METALNESS = 1;
const PLASTIC_ROUGHNESS = 0.88;
const PLASTIC_METALNESS = 0;

// --- material factories -----------------------------------------------
// `wrecked` dulls a finish toward a beat-up matte look (paint loses its
// clearcoat, glass fogs/dirties, chrome corrodes) without touching geometry.

function paintMaterial(color, wrecked) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: wrecked ? 0.85 : PAINT_ROUGHNESS,
    metalness: wrecked ? 0.05 : PAINT_METALNESS,
  });
}

function heroPaintMaterial(color, wrecked) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: wrecked ? 0.85 : HERO_PAINT_ROUGHNESS,
    metalness: wrecked ? 0.05 : HERO_PAINT_METALNESS,
  });
}

function glassMaterial(color, opacity, wrecked) {
  return new THREE.MeshStandardMaterial({
    color: wrecked ? 0x4a4a4a : color,
    roughness: wrecked ? 0.5 : GLASS_ROUGHNESS,
    metalness: GLASS_METALNESS,
    transparent: true,
    opacity: wrecked ? Math.min(0.98, opacity + 0.12) : opacity,
  });
}

function chromeMaterial(color = CHROME_COLOR, wrecked) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: wrecked ? 0.55 : CHROME_ROUGHNESS,
    metalness: wrecked ? 0.5 : CHROME_METALNESS,
  });
}

function tireMaterial() {
  return new THREE.MeshStandardMaterial({ color: 0x161616, roughness: TIRE_ROUGHNESS, metalness: TIRE_METALNESS });
}

function plasticMaterial(color) {
  return new THREE.MeshStandardMaterial({ color, roughness: PLASTIC_ROUGHNESS, metalness: PLASTIC_METALNESS });
}

function lampMaterial(color, emissiveIntensity = 0) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.1, emissive: color, emissiveIntensity });
}

function buildLamp(color, w, h, d, emissiveIntensity = 0) {
  return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), lampMaterial(color, emissiveIntensity));
}

function clothMaterial(color) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.82, metalness: 0 });
}

function skinMaterial(color) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0 });
}

// CylinderGeometry's default axis is Y, so a bare wheel lies flat like a
// coin (round face up). Rotating it about X (not Z) swings that round face
// into the X-Y plane with the thin axle running along Z, which is what
// makes it read as a circle from the side (Z) instead of from the front/
// back (X) - confirmed with a throwaway raycast-silhouette check.
// Two-tone tire+chrome-hub wheel - still just a Group like before, so every
// existing `.position.set`/`.scale.setScalar` call site keeps working.
function wheel() {
  const group = new THREE.Group();
  const tire = new THREE.Mesh(new THREE.CylinderGeometry(WHEEL_R, WHEEL_R, WHEEL_W, 12), tireMaterial());
  tire.rotation.x = Math.PI / 2;
  group.add(tire);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(WHEEL_R * 0.55, WHEEL_R * 0.55, WHEEL_W + 0.03, 10), chromeMaterial());
  hub.rotation.x = Math.PI / 2;
  group.add(hub);
  return group;
}

// Two-tone rim+tire wheel for bikes/scooters - a dark tire cylinder with a
// slightly smaller chrome rim nested inside it, seen edge-on.
function bikeWheel(radius) {
  const group = new THREE.Group();
  const tire = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 0.05, 12), tireMaterial());
  tire.rotation.x = Math.PI / 2;
  group.add(tire);
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.6, radius * 0.6, 0.07, 8), chromeMaterial());
  rim.rotation.x = Math.PI / 2;
  group.add(rim);
  return group;
}

// A thin box stretched and angled between two points in the local X-Y (side
// profile) plane - used to build bike/scooter frame tubes without needing a
// dedicated tube geometry.
function tubeBetween(ax, ay, bx, by, thickness, color, wrecked) {
  const len = Math.hypot(bx - ax, by - ay) || 0.01;
  const m = new THREE.Mesh(new THREE.BoxGeometry(len, thickness, thickness), paintMaterial(color, wrecked));
  m.position.set((ax + bx) / 2, (ay + by) / 2, 0);
  m.rotation.z = Math.atan2(by - ay, bx - ax);
  return m;
}

function wheelArch(x, y, wid) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.26, wid + 0.08), plasticMaterial(ARCH_COLOR));
  m.position.set(x, y, 0);
  return m;
}

// Small side mirror (stalk + head) in local space, pointing outward along
// +/-Z per `side` (1 or -1) - the caller positions the whole group at the
// mount point on the body (roughly the base of the windshield).
function buildMirror(bodyColor, side, wrecked) {
  const group = new THREE.Group();
  const stalk = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.12), plasticMaterial(0x161616));
  stalk.position.set(0, 0, side * 0.06);
  group.add(stalk);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.1, 0.07), paintMaterial(bodyColor, wrecked));
  head.position.set(0.02, 0.01, side * 0.15);
  group.add(head);
  return group;
}

// Crouched/standing rider seen from the side: capsule torso leaned toward
// the front wheel plus a head, deliberately not the full standing
// pedestrian mesh. torsoY is an absolute height (in the vehicle's own local
// space) for the torso centre, so callers can stand the rider on whatever
// surface the vehicle actually offers (bike seat vs. scooter deck) instead
// of always anchoring it to y=0; lean controls the forward crouch (a
// scooter rider stands more upright than a cyclist); sizeMul scales the
// whole rider so it still reads clearly next to a small vehicle.
function buildRiderMesh(shirt, torsoY = 0.62, lean = -0.5, sizeMul = 1) {
  const group = new THREE.Group();
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.2 * sizeMul, 0.42 * sizeMul, 2, 5), clothMaterial(shirt || 0x2f5c8a));
  torso.rotation.z = lean;
  torso.position.set(0.05 * sizeMul, torsoY, 0);
  group.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.15 * sizeMul, 7, 6), skinMaterial(0xe0b48a));
  head.position.set(0.28 * sizeMul, torsoY + 0.3 * sizeMul, 0);
  group.add(head);
  return group;
}

function buildLightBar(wid, y) {
  const group = new THREE.Group();
  const half = wid / 2 - 0.08;
  const blue = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.14, half), new THREE.MeshStandardMaterial({ color: 0x1c1c1c, roughness: 0.5, metalness: 0.1, emissive: 0x2255ff, emissiveIntensity: 0.9 }));
  blue.position.set(0.05, y, -half / 2);
  group.add(blue);
  const red = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.14, half), new THREE.MeshStandardMaterial({ color: 0x1c1c1c, roughness: 0.5, metalness: 0.1, emissive: 0xff2222, emissiveIntensity: 0.9 }));
  red.position.set(0.05, y, half / 2);
  group.add(red);
  return group;
}

// --- regular car ---------------------------------------------------------

function buildCarMesh(v) {
  const group = new THREE.Group();
  const len = v.model.len, wid = v.model.wid;
  const hl = len / 2, hw = wid / 2;
  const bodyColor = v.wrecked ? 0x3a3a3a : (v.model.color || 0x888888);

  const chassisH = 0.7;
  const chassisY = WHEEL_R * 0.55 + chassisH / 2;
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(len * 0.94, chassisH, wid), paintMaterial(bodyColor, v.wrecked));
  chassis.position.y = chassisY;
  group.add(chassis);

  group.add(wheelArch(hl * 0.55, chassisY - chassisH / 2, wid));
  group.add(wheelArch(-hl * 0.6, chassisY - chassisH / 2, wid));

  const cabinLen = len * 0.48, cabinH = 0.6;
  const cabinTopY = chassisY + chassisH / 2 + cabinH - 0.06;
  const cabinX = hl * 0.02;
  const cabinY = cabinTopY - cabinH / 2;
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(cabinLen, cabinH, wid * 0.88), glassMaterial(SIDE_GLASS_COLOR, SIDE_GLASS_OPACITY, v.wrecked));
  cabin.position.set(cabinX, cabinY, 0);
  group.add(cabin);

  // windshield: a lighter, more see-through slab set into the very front of
  // the cabin box - the cheap way to read "clear windshield" vs "tinted
  // side glass" without modelling an actual angled A-pillar
  const wsLen = cabinLen * 0.24;
  const windshield = new THREE.Mesh(new THREE.BoxGeometry(wsLen, cabinH * 0.94, wid * 0.86), glassMaterial(WINDSHIELD_COLOR, WINDSHIELD_OPACITY, v.wrecked));
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
    const front = buildLamp(0xfff2d0, 0.06, 0.14, 0.22, lit);
    front.position.set(hl * 0.97, chassisY, sz);
    group.add(front);
    const frontAccent = buildLamp(0xffc233, 0.05, 0.08, 0.08, lit * 0.8);
    frontAccent.position.set(hl * 0.97, chassisY - 0.02, inboardZ);
    group.add(frontAccent);

    const rear = buildLamp(0x9a1a1a, 0.05, 0.12, 0.16, lit * 0.7);
    rear.position.set(-hl * 0.97, chassisY, sz);
    group.add(rear);
    const rearAccent = buildLamp(0xffa020, 0.045, 0.09, 0.06, lit * 0.8);
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
  const bodyColor = wrecked ? 0x3a3a3a : (color ?? 0x8a1414);

  const chassisH = 0.82;
  const chassisY = WHEEL_R * 0.6 + chassisH / 2;
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(len * 0.98, chassisH, wid), heroPaintMaterial(bodyColor, wrecked));
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
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(cabinLen, cabinH, wid * 0.94), glassMaterial(SIDE_GLASS_COLOR, SIDE_GLASS_OPACITY, wrecked));
  cabin.position.set(0, cabinY, 0);
  group.add(cabin);

  const wsLen = cabinLen * 0.26;
  const windshield = new THREE.Mesh(new THREE.BoxGeometry(wsLen, cabinH * 0.94, wid * 0.9), glassMaterial(WINDSHIELD_COLOR, WINDSHIELD_OPACITY, wrecked));
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
    const headlight = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.06, 10), lampMaterial(0xf2eede, lit));
    headlight.rotation.z = Math.PI / 2;
    headlight.position.set(hl * 0.99, chassisY + 0.02, sz);
    group.add(headlight);

    // chrome bezel ring, set slightly back from the lens so the lamp itself
    // still reads as the frontmost surface
    const bezel = new THREE.Mesh(new THREE.CylinderGeometry(0.145, 0.145, 0.03, 12), chromeMaterial(CHROME_COLOR, wrecked));
    bezel.rotation.z = Math.PI / 2;
    bezel.position.set(hl * 0.965, chassisY + 0.02, sz);
    group.add(bezel);
  }

  const taillightL = buildLamp(0x9a1a1a, 0.05, 0.14, wid * 0.34, lit * 0.7);
  taillightL.position.set(-hl * 0.99, chassisY + 0.05, hw * 0.42);
  group.add(taillightL);
  const taillightR = buildLamp(0x9a1a1a, 0.05, 0.14, wid * 0.34, lit * 0.7);
  taillightR.position.set(-hl * 0.99, chassisY + 0.05, -hw * 0.42);
  group.add(taillightR);
  const turnSignal = buildLamp(0xffa020, 0.045, 0.1, wid * 0.16, lit * 0.8);
  turnSignal.position.set(-hl * 0.99, chassisY + 0.05, 0);
  group.add(turnSignal);

  // Chrome front/rear bumpers - the single most recognisable period detail
  // that separates this silhouette from every generic bodystyle in the file.
  const bumperY = chassisY - chassisH * 0.34;
  const frontBumper = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.13, wid * 0.92), chromeMaterial(CHROME_COLOR, wrecked));
  frontBumper.position.set(hl * 0.98, bumperY, 0);
  group.add(frontBumper);
  const rearBumper = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.13, wid * 0.92), chromeMaterial(CHROME_COLOR, wrecked));
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
  const color = v.model.color || 0x222222;

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
  const color = v.model.color || 0x1a1a1a;

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
  const mat = glassMaterial(SIDE_GLASS_COLOR, SIDE_GLASS_OPACITY, wrecked);
  const segments = [[-len / 2 + 0.5, jointX - 0.35], [jointX + 0.35, len / 2 - 0.5]];
  for (const side of [hw + 0.01, -(hw + 0.01)]) {
    for (const [x0, x1] of segments) {
      const span = x1 - x0;
      if (span < 0.6) continue;
      const count = Math.max(2, Math.round(span / 1.3));
      const step = span / count;
      for (let i = 0; i < count; i++) {
        const win = new THREE.Mesh(new THREE.BoxGeometry(step * 0.72, winH, 0.04), mat);
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
  const bodyColor = v.wrecked ? 0x3a3a3a : v.model.color;

  const body = new THREE.Mesh(new THREE.BoxGeometry(len, bodyH, wid), paintMaterial(bodyColor, v.wrecked));
  body.position.y = bodyY;
  group.add(body);

  // cosmetic accordion-joint cue at ~60% of the body length from the front -
  // real hinge is not simulated, this is a static livery band
  const joint = new THREE.Mesh(new THREE.BoxGeometry(0.4, bodyH + 0.04, wid + 0.02), plasticMaterial(0x1a1a1a));
  joint.position.set(jointX, bodyY, 0);
  group.add(joint);

  const stripe = new THREE.Mesh(new THREE.BoxGeometry(len + 0.02, bodyH * 0.18, wid + 0.02), paintMaterial(v.model.stripe || 0x3fc6d4, v.wrecked));
  stripe.position.set(0, bodyY - bodyH * 0.23, 0);
  group.add(stripe);

  const sign = new THREE.Mesh(new THREE.BoxGeometry(0.06, bodyH * 0.16, wid * 0.6), lampMaterial(v.model.accent || 0xe8e6de, v.wrecked ? 0 : 0.25));
  sign.position.set(hl - 0.05, bodyY + bodyH * 0.34, 0);
  group.add(sign);

  group.add(busWindowRow(len, hw, bodyH, jointX, bodyY, v.wrecked));

  // front windshield: a wider, lighter/clearer panel across the very front
  // face - distinguishes "the driver can see through this" from the tinted
  // side glazing busWindowRow builds
  const windshield = new THREE.Mesh(new THREE.BoxGeometry(0.05, bodyH * 0.38, wid * 0.82), glassMaterial(WINDSHIELD_COLOR, WINDSHIELD_OPACITY, v.wrecked));
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
    const front = buildLamp(0xfff2d0, 0.06, 0.22, 0.3, lit);
    front.position.set(hl * 0.99, bodyY - bodyH * 0.32, sz);
    group.add(front);

    const rear = buildLamp(0x9a1a1a, 0.06, 0.24, 0.3, lit * 0.7);
    rear.position.set(-hl * 0.99, bodyY - bodyH * 0.32, sz);
    group.add(rear);
    const rearAccent = buildLamp(0xffa020, 0.05, 0.14, 0.12, lit * 0.8);
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
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.04, postH, 0.04), plasticMaterial(0x1c1c1c));
    post.position.set(0, postH / 2, sz);
    group.add(post);
  }
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, hw * 0.8 + 0.06), plasticMaterial(0x1c1c1c));
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
  const hullColor = v.wrecked ? 0x3a3a3a : v.model.color;

  const hull = new THREE.Mesh(new THREE.BoxGeometry(hullLen, hullH, wid), paintMaterial(hullColor, v.wrecked));
  hull.position.set(hl - bowLen - hullLen / 2, hullH / 2 + WATER_LINE, 0);
  group.add(hull);

  // bow wedge: a cone laid on its side and flattened vertically so it tapers
  // to a point in the horizontal plane like a real hull, not a spike
  const bow = new THREE.Mesh(new THREE.ConeGeometry(hw, bowLen, 6), paintMaterial(hullColor, v.wrecked));
  bow.rotation.z = -Math.PI / 2;
  bow.scale.x = hullH / (hw * 2);
  bow.position.set(hl - bowLen / 2, hullH / 2 + WATER_LINE, 0);
  group.add(bow);

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(len * 0.32, 0.5, wid * 0.78), glassMaterial(v.model.cabin || 0x2f3a44, 0.85, v.wrecked));
  cabin.position.set(-hl * 0.05, hullH + 0.25 + WATER_LINE, 0);
  group.add(cabin);

  if (hash2(v.id, 5.3) < 0.5) {
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.1, 6), plasticMaterial(0x1c1c1c));
    mast.position.set(-hl * 0.05, hullH + 0.5 + 0.55 + WATER_LINE, 0);
    group.add(mast);
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 5), lampMaterial(0xdd2222, v.wrecked ? 0 : 0.5));
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
