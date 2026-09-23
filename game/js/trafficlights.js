import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const GREEN_TIME = 8;
const YELLOW_TIME = 2;
const RED_TIME = 8;
const CYCLE_TIME = GREEN_TIME + YELLOW_TIME + RED_TIME;

const APPROACH_DIST = 12;
const APPROACH_DOT = 0.55;
const PLAYER_APPROACH_DIST = 14;
const PLAYER_SPEED_CAP = 2;

let lights = [];

function phaseAt(t) {
  if (t < GREEN_TIME) return 'green';
  if (t < GREEN_TIME + YELLOW_TIME) return 'yellow';
  return 'red';
}

export function getTrafficLights() {
  return lights;
}

export function getTrafficLightPhase(light) {
  return phaseAt(light.t);
}

export function initTrafficLights(world) {
  const positions = world.map.meta.trafficLights || [];
  lights = positions.map((p) => ({
    x: p.x,
    y: p.y,
    t: Math.random() * CYCLE_TIME,
  }));
}

export function updateTrafficLights(dt, world) {
  for (const light of lights) {
    light.t = (light.t + dt) % CYCLE_TIME;
  }
  if (!lights.length) return;

  for (const v of world.vehicles) {
    if (v.wrecked || v.driver === 'player' || !v.road) continue;
    const fx = Math.cos(v.angle), fy = Math.sin(v.angle);
    for (const light of lights) {
      if (phaseAt(light.t) !== 'red') continue;
      const dx = light.x - v.x, dy = light.y - v.y;
      const d = Math.hypot(dx, dy);
      if (d > APPROACH_DIST) continue;
      const dot = (dx * fx + dy * fy) / (d || 1);
      if (dot < APPROACH_DOT) continue;
      v.waitTimer = 0.3;
      break;
    }
  }

  const pv = world.player.inVehicle;
  if (pv && !pv.wrecked) {
    const fx = Math.cos(pv.angle), fy = Math.sin(pv.angle);
    for (const light of lights) {
      if (phaseAt(light.t) !== 'red') continue;
      const dx = light.x - pv.x, dy = light.y - pv.y;
      const d = Math.hypot(dx, dy);
      if (d > PLAYER_APPROACH_DIST) continue;
      const dot = (dx * fx + dy * fy) / (d || 1);
      if (dot < APPROACH_DOT) continue;
      pv.speed = Math.min(pv.speed, PLAYER_SPEED_CAP);
      break;
    }
  }
}

const PHASE_COLORS = { green: 0x2ecc40, yellow: 0xf1c40f, red: 0xe74c3c };
const LAMP_ORDER = ['red', 'yellow', 'green'];
const POLE_MAT = new THREE.MeshLambertMaterial({ color: 0x9a9d9f });
const HOUSING_MAT = new THREE.MeshLambertMaterial({ color: 0x1b1d1f });
const LAMP_OFF = Object.fromEntries(LAMP_ORDER.map((p) => [p, new THREE.MeshBasicMaterial({ color: new THREE.Color(PHASE_COLORS[p]).multiplyScalar(0.18) })]));
const LAMP_ON = Object.fromEntries(LAMP_ORDER.map((p) => [p, new THREE.MeshBasicMaterial({ color: PHASE_COLORS[p] })]));
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
