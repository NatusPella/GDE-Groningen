import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const GREEN_TIME = 8;
const YELLOW_TIME = 2;
const RED_TIME = GREEN_TIME + YELLOW_TIME;
const CYCLE_TIME = GREEN_TIME + YELLOW_TIME + RED_TIME;

// OSM tags one signal node per approach; nodes this close share one
// controller so a junction's approaches alternate instead of conflicting.
const CONTROLLER_RADIUS = 30;

let lights = [];
let controllers = [];

function phaseAt(t) {
  if (t < GREEN_TIME) return 'green';
  if (t < GREEN_TIME + YELLOW_TIME) return 'yellow';
  return 'red';
}

export function getTrafficLights() {
  return lights;
}

// Phase seen by traffic travelling at `heading`: the controller's main axis
// runs the first half of the cycle, the cross axis the second half.
export function trafficLightPhaseFor(light, heading) {
  const c = light.ctrl;
  const main = Math.abs(Math.cos(heading - c.axis)) >= Math.SQRT1_2;
  return phaseAt(main ? c.t : (c.t + RED_TIME) % CYCLE_TIME);
}

// What the lamp shows: the phase for traffic along the light's own road.
export function getTrafficLightPhase(light) {
  return trafficLightPhaseFor(light, light.axis);
}

function roadAxisAt(map, x, y) {
  let best = null, bestD2 = Infinity;
  for (const road of map.roadsNear(x, y, 12)) {
    if (road.cat === 'foot' || road.cat === 'cycle') continue;
    for (let i = 0; i < road.pts.length - 1; i++) {
      const [ax, ay] = road.pts[i], [bx, by] = road.pts[i + 1];
      const dx = bx - ax, dy = by - ay;
      const len2 = dx * dx + dy * dy || 1;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / len2));
      const d2 = (x - ax - dx * t) ** 2 + (y - ay - dy * t) ** 2;
      if (d2 < bestD2) { bestD2 = d2; best = Math.atan2(dy, dx); }
    }
  }
  return best ?? 0;
}

export function initTrafficLights(world) {
  const positions = world.map.meta.trafficLights || [];
  lights = positions.map((p) => ({ x: p.x, y: p.y, t: 0, axis: roadAxisAt(world.map, p.x, p.y), ctrl: null }));
  controllers = [];
  for (const light of lights) {
    if (light.ctrl) continue;
    const ctrl = { t: Math.random() * CYCLE_TIME, axis: light.axis };
    controllers.push(ctrl);
    for (const o of lights) {
      if (!o.ctrl && Math.hypot(o.x - light.x, o.y - light.y) < CONTROLLER_RADIUS) o.ctrl = ctrl;
    }
  }
  for (const light of lights) light.t = light.ctrl.t;
}

// AI traffic reads the lights itself (see trafficLightLimit in vehicle.js).
export function updateTrafficLights(dt, world) {
  for (const c of controllers) c.t = (c.t + dt) % CYCLE_TIME;
  for (const light of lights) light.t = light.ctrl.t;
}

const PHASE_COLORS = { green: 0x2ecc40, yellow: 0xf1c40f, red: 0xe74c3c };
const LAMP_ORDER = ['red', 'yellow', 'green'];
const POLE_MAT = new THREE.MeshLambertMaterial({ color: 0x9a9d9f });
const HOUSING_MAT = new THREE.MeshLambertMaterial({ color: 0x1b1d1f });
const LAMP_OFF = Object.fromEntries(LAMP_ORDER.map((p) => [p, new THREE.MeshBasicMaterial({ color: new THREE.Color(PHASE_COLORS[p]).multiplyScalar(0.18) })]));
const LAMP_ON = Object.fromEntries(LAMP_ORDER.map((p) => [p, new THREE.MeshBasicMaterial({ color: PHASE_COLORS[p] })]));
// Lit lamps are pushed above 1.0 at night so the bloom pass picks them up.
export function setTrafficLightGlow(k) {
  for (const p of LAMP_ORDER) LAMP_ON[p].color.setHex(PHASE_COLORS[p]).multiplyScalar(k);
}
const POLE_GEO = new THREE.CylinderGeometry(0.09, 0.09, 2.9, 8);
const HOUSING_GEO = new THREE.BoxGeometry(0.26, 1.0, 0.34);
const LAMP_GEO = new THREE.CircleGeometry(0.12, 12);

// Traffic light nodes sit on the road centerline in OSM; stand the pole on
// the kerb next to it instead, facing along the road.
export function placeTrafficLight(light, map) {
  let best = null;
  for (const road of map.roadsNear(light.x, light.y, 12)) {
    for (let i = 0; i < road.pts.length - 1; i++) {
      const [ax, ay] = road.pts[i], [bx, by] = road.pts[i + 1];
      const dx = bx - ax, dy = by - ay;
      const len2 = dx * dx + dy * dy || 1;
      const t = Math.max(0, Math.min(1, ((light.x - ax) * dx + (light.y - ay) * dy) / len2));
      const px = ax + dx * t, py = ay + dy * t;
      const d2 = (light.x - px) ** 2 + (light.y - py) ** 2;
      if (!best || d2 < best.d2) best = { d2, dx, dy, half: (road.width || 6) / 2 };
    }
  }
  if (!best) return { x: light.x, y: light.y, angle: 0 };
  const len = Math.hypot(best.dx, best.dy) || 1;
  const nx = -best.dy / len, ny = best.dx / len;
  const off = best.half + 0.9;
  return { x: light.x + nx * off, y: light.y + ny * off, angle: Math.atan2(best.dy, best.dx) };
}

export function buildTrafficLightMesh3D() {
  const group = new THREE.Group();
  const pole = new THREE.Mesh(POLE_GEO, POLE_MAT);
  pole.position.y = 1.45;
  group.add(pole);
  const housing = new THREE.Mesh(HOUSING_GEO, HOUSING_MAT);
  housing.position.y = 3.2;
  group.add(housing);
  const lamps = {};
  LAMP_ORDER.forEach((phase, i) => {
    // one lamp face per side so the light reads from both approach directions
    for (const side of [1, -1]) {
      const lamp = new THREE.Mesh(LAMP_GEO, LAMP_OFF[phase]);
      lamp.position.set(side * 0.131, 3.5 - i * 0.3, 0);
      lamp.rotation.y = side * Math.PI / 2;
      group.add(lamp);
      (lamps[phase] ||= []).push(lamp);
    }
  });
  group.userData.lamps = lamps;
  group.userData.phase = null;
  return group;
}

export function setTrafficLightPhase3D(group, phase) {
  if (group.userData.phase === phase) return;
  group.userData.phase = phase;
  for (const p of LAMP_ORDER) {
    for (const lamp of group.userData.lamps[p]) lamp.material = p === phase ? LAMP_ON[p] : LAMP_OFF[p];
  }
}
