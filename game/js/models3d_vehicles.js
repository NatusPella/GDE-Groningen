import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

// Low-poly recognizable vehicle silhouettes. Group origin = vehicle centre at
// ground level (y=0, where wheels touch the road), facing local +X - the
// caller positions/rotates the whole group every frame, nothing here bakes
// in position/rotation. Everything is sized off v.model.len/wid so the mesh
// always matches the vehicle's real collision footprint.

function hash2(x, y) {
  const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return h - Math.floor(h);
}

const WHEEL_R = 0.32;
const WHEEL_W = 0.24;
const ARCH_COLOR = 0x141414;
const GLASS_COLOR = 0x3f4650;
const HERO_LEN = 4.0;
const HERO_WID = 1.65;
// Scene3d's water plane renders at y=0.01 (see syncFlat's water call in
// scene3d.js) - boats share the generic vehicle sync loop that always sets
// mesh.position.y=0, so the hull's float height has to be baked in here.
const WATER_LINE = 0.03;

// CylinderGeometry's default axis is Y, so a bare wheel lies flat like a
// coin (round face up). Rotating it about X (not Z) swings that round face
// into the X-Y plane with the thin axle running along Z, which is what
// makes it read as a circle from the side (Z) instead of from the front/
// back (X) - confirmed with a throwaway raycast-silhouette check.
function wheel() {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(WHEEL_R, WHEEL_R, WHEEL_W, 10), new THREE.MeshLambertMaterial({ color: 0x161616 }));
  m.rotation.x = Math.PI / 2;
  return m;
}

// Two-tone rim+tire wheel for bikes/scooters - a dark tire cylinder with a
// slightly smaller lighter rim cylinder nested inside it, seen edge-on.
function bikeWheel(radius) {
  const group = new THREE.Group();
  const tire = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 0.05, 12), new THREE.MeshLambertMaterial({ color: 0x111111 }));
  tire.rotation.x = Math.PI / 2;
  group.add(tire);
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.6, radius * 0.6, 0.07, 8), new THREE.MeshLambertMaterial({ color: 0x9a9a9a }));
  rim.rotation.x = Math.PI / 2;
  group.add(rim);
  return group;
}

// A thin box stretched and angled between two points in the local X-Y (side
// profile) plane - used to build bike/scooter frame tubes without needing a
// dedicated tube geometry.
function tubeBetween(ax, ay, bx, by, thickness, color) {
  const len = Math.hypot(bx - ax, by - ay) || 0.01;
  const m = new THREE.Mesh(new THREE.BoxGeometry(len, thickness, thickness), new THREE.MeshLambertMaterial({ color }));
  m.position.set((ax + bx) / 2, (ay + by) / 2, 0);
  m.rotation.z = Math.atan2(by - ay, bx - ax);
  return m;
}

function wheelArch(x, y, wid) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.26, wid + 0.08), new THREE.MeshLambertMaterial({ color: ARCH_COLOR }));
  m.position.set(x, y, 0);
  return m;
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
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.2 * sizeMul, 0.42 * sizeMul, 2, 5), new THREE.MeshLambertMaterial({ color: shirt || 0x2f5c8a }));
  torso.rotation.z = lean;
  torso.position.set(0.05 * sizeMul, torsoY, 0);
  group.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.15 * sizeMul, 7, 6), new THREE.MeshLambertMaterial({ color: 0xe0b48a }));
  head.position.set(0.28 * sizeMul, torsoY + 0.3 * sizeMul, 0);
  group.add(head);
  return group;
}

function buildLightBar(wid, y) {
  const group = new THREE.Group();
  const half = wid / 2 - 0.08;
  const blue = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.14, half), new THREE.MeshLambertMaterial({ color: 0x1c1c1c, emissive: 0x2255ff, emissiveIntensity: 0.9 }));
  blue.position.set(0.05, y, -half / 2);
  group.add(blue);
  const red = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.14, half), new THREE.MeshLambertMaterial({ color: 0x1c1c1c, emissive: 0xff2222, emissiveIntensity: 0.9 }));
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
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(len * 0.94, chassisH, wid), new THREE.MeshLambertMaterial({ color: bodyColor }));
  chassis.position.y = chassisY;
  group.add(chassis);

  group.add(wheelArch(hl * 0.55, chassisY - chassisH / 2, wid));
  group.add(wheelArch(-hl * 0.6, chassisY - chassisH / 2, wid));

  const cabinLen = len * 0.48, cabinH = 0.6;
  const cabinTopY = chassisY + chassisH / 2 + cabinH - 0.06;
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(cabinLen, cabinH, wid * 0.88), new THREE.MeshLambertMaterial({ color: GLASS_COLOR }));
  cabin.position.set(hl * 0.02, cabinTopY - cabinH / 2, 0);
  group.add(cabin);

  for (const ax of [hl * 0.62, -hl * 0.62]) {
    for (const sz of [hw - 0.05, -(hw - 0.05)]) {
      const w = wheel();
      w.position.set(ax, WHEEL_R, sz);
      group.add(w);
    }
  }

  for (const sz of [hw - 0.15, -(hw - 0.15)]) {
    const front = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.14, 0.22), new THREE.MeshLambertMaterial({ color: 0xfff7c2 }));
    front.position.set(hl * 0.97, chassisY, sz);
    group.add(front);
    const rear = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.12, 0.2), new THREE.MeshLambertMaterial({ color: 0x661111 }));
    rear.position.set(-hl * 0.97, chassisY, sz);
    group.add(rear);
  }

  // Sport model gets a small rear spoiler - the one detail that reads at a
  // glance without adding real geometry cost.
  if (v.model.name === 'sport') {
    const spoiler = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, wid * 0.8), new THREE.MeshLambertMaterial({ color: bodyColor }));
    spoiler.position.set(-hl * 0.88, cabinTopY + 0.03, 0);
    group.add(spoiler);
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
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(len * 0.98, chassisH, wid), new THREE.MeshLambertMaterial({ color: bodyColor }));
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
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(cabinLen, cabinH, wid * 0.94), new THREE.MeshLambertMaterial({ color: GLASS_COLOR }));
  cabin.position.set(0, chassisY + chassisH / 2 + cabinH / 2 - 0.05, 0);
  group.add(cabin);

  for (const ax of [hl * 0.62, -hl * 0.62]) {
    for (const sz of [hw - 0.05, -(hw - 0.05)]) {
      const w = wheel();
      w.position.set(ax, WHEEL_R, sz);
      group.add(w);
    }
  }

  for (const sz of [hw * 0.55, -hw * 0.55]) {
    const headlight = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.06, 10), new THREE.MeshLambertMaterial({ color: 0xf2eede }));
    headlight.rotation.z = Math.PI / 2;
    headlight.position.set(hl * 0.99, chassisY + 0.02, sz);
    group.add(headlight);
  }

  const taillight = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.14, wid * 0.82), new THREE.MeshLambertMaterial({ color: 0x2a1010 }));
  taillight.position.set(-hl * 0.99, chassisY + 0.05, 0);
  group.add(taillight);

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
  group.add(tubeBetween(bbX, bbY, hl * 0.55, barY, 0.05, color));
  group.add(tubeBetween(bbX, bbY, -hl * 0.55, seatY, 0.05, color));
  group.add(tubeBetween(-hl * 0.55, seatY, hl * 0.55, barY, 0.05, color));

  for (const sx of [hl * 0.85, -hl * 0.85]) {
    const w = bikeWheel(wheelR);
    w.position.set(sx, wheelR, 0);
    group.add(w);
  }

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

  group.add(tubeBetween(-hl * 0.75, wheelR, colX, deckY, 0.045, color));
  group.add(tubeBetween(colX, deckY, colX, barY, 0.05, color));
  group.add(tubeBetween(-hl * 0.2, deckY, colX, barY * 0.72, 0.03, color));

  for (const sx of [hl * 0.75, -hl * 0.75]) {
    const w = bikeWheel(wheelR);
    w.position.set(sx, wheelR, 0);
    group.add(w);
  }

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

function busWindowRow(len, hw, bodyH, jointX, bodyY) {
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
        const win = new THREE.Mesh(new THREE.BoxGeometry(step * 0.72, winH, 0.04), new THREE.MeshLambertMaterial({ color: 0x2c3844 }));
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

  const body = new THREE.Mesh(new THREE.BoxGeometry(len, bodyH, wid), new THREE.MeshLambertMaterial({ color: bodyColor }));
  body.position.y = bodyY;
  group.add(body);

  // cosmetic accordion-joint cue at ~60% of the body length from the front -
  // real hinge is not simulated, this is a static livery band
  const joint = new THREE.Mesh(new THREE.BoxGeometry(0.4, bodyH + 0.04, wid + 0.02), new THREE.MeshLambertMaterial({ color: 0x1a1a1a }));
  joint.position.set(jointX, bodyY, 0);
  group.add(joint);

  const stripe = new THREE.Mesh(new THREE.BoxGeometry(len + 0.02, bodyH * 0.18, wid + 0.02), new THREE.MeshLambertMaterial({ color: v.model.stripe || 0x3fc6d4 }));
  stripe.position.set(0, bodyY - bodyH * 0.23, 0);
  group.add(stripe);

  const sign = new THREE.Mesh(new THREE.BoxGeometry(0.06, bodyH * 0.16, wid * 0.6), new THREE.MeshLambertMaterial({ color: v.model.accent || 0xe8e6de }));
  sign.position.set(hl - 0.05, bodyY + bodyH * 0.34, 0);
  group.add(sign);

  group.add(busWindowRow(len, hw, bodyH, jointX, bodyY));

  for (const ax of [hl * 0.72, jointX, -hl * 0.78]) {
    for (const sz of [hw - 0.1, -(hw - 0.1)]) {
      const w = wheel();
      w.scale.setScalar(wheelR / WHEEL_R);
      w.position.set(ax, wheelR, sz);
      group.add(w);
    }
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
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.04, postH, 0.04), new THREE.MeshLambertMaterial({ color: 0x1c1c1c }));
    post.position.set(0, postH / 2, sz);
    group.add(post);
  }
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, hw * 0.8 + 0.06), new THREE.MeshLambertMaterial({ color: 0x1c1c1c }));
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

  const hull = new THREE.Mesh(new THREE.BoxGeometry(hullLen, hullH, wid), new THREE.MeshLambertMaterial({ color: hullColor }));
  hull.position.set(hl - bowLen - hullLen / 2, hullH / 2 + WATER_LINE, 0);
  group.add(hull);

  // bow wedge: a cone laid on its side and flattened vertically so it tapers
  // to a point in the horizontal plane like a real hull, not a spike
  const bow = new THREE.Mesh(new THREE.ConeGeometry(hw, bowLen, 6), new THREE.MeshLambertMaterial({ color: hullColor }));
  bow.rotation.z = -Math.PI / 2;
  bow.scale.x = hullH / (hw * 2);
  bow.position.set(hl - bowLen / 2, hullH / 2 + WATER_LINE, 0);
  group.add(bow);

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(len * 0.32, 0.5, wid * 0.78), new THREE.MeshLambertMaterial({ color: v.model.cabin || 0x2f3a44 }));
  cabin.position.set(-hl * 0.05, hullH + 0.25 + WATER_LINE, 0);
  group.add(cabin);

  if (hash2(v.id, 5.3) < 0.5) {
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.1, 6), new THREE.MeshLambertMaterial({ color: 0x1c1c1c }));
    mast.position.set(-hl * 0.05, hullH + 0.5 + 0.55 + WATER_LINE, 0);
    group.add(mast);
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 5), new THREE.MeshLambertMaterial({ color: 0xdd2222 }));
    beacon.position.set(-hl * 0.05, hullH + 0.5 + 1.1 + WATER_LINE, 0);
    group.add(beacon);
  } else {
    const arch = buildRadarArch(hw);
    arch.position.set(-hl * 0.05, hullH + 0.5 + WATER_LINE, 0);
    group.add(arch);
  }

  return group;
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
