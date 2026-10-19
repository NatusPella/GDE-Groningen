// Arcade-vliegtuig aan de wereld (#15), de pure kant: toetsen en gamepad
// (die al als toetsen binnenkomen, zelfde set als de heli) worden stuurinvoer
// voor arcadeplane.js, en de uitkomst gaat terug op het voertuig. Zonder THREE.
// Besturing: W/S gas op/af (het gas blijft staan), A/D rollen, Spatie neus
// omhoog, Ctrl neus omlaag, Shift remmen op de baan. Tests: scripts/planecontrol_test.mjs.

import { makePlane, stepPlane, PLANE } from './arcadeplane.js';

const THROTTLE_RATE = 0.45;   // gas per seconde dat je W of S ingedrukt houdt

// isDown(key) -> bool; st = { thr } blijft tussen beelden bewaard
export function planeInput(isDown, st, dt) {
  const k = (key) => (isDown(key) ? 1 : 0);
  st.thr = Math.max(0, Math.min(1, (st.thr || 0) + (k('w') - k('s')) * THROTTLE_RATE * dt));
  return {
    throttle: st.thr,
    roll: k('d') - k('a'),
    yaw: k('d') - k('a'),
    pitch: k(' ') - k('control'),
    brake: k('shift') > 0,
  };
}

// Een vliegtuig-staat op een voertuig zetten (en omgekeerd bij de start).
export function attachPlane(v, x, y, z, heading) {
  v.plane = makePlane(x, y, z, heading);
  v.planeCtl = { thr: 0 };
  syncToVehicle(v);
  return v;
}

function syncToVehicle(v) {
  const p = v.plane;
  v.x = p.x; v.y = p.y; v.z = p.z; v.angle = p.heading;
  v.speed = p.speed; v.pitch = p.pitch; v.roll = p.roll; v.vz = p.vz;
  v.vx = Math.cos(p.heading) * p.speed; v.vy = Math.sin(p.heading) * p.speed;
  v.onGround = p.onGround; v.airborne = !p.onGround;
  v.groundZ = p.onGround ? p.z : v.groundZ;
  v.throttle = p.throttle;
}

// groundAt(x, y) en onRunway(x, y) komen van de wereld. Geeft de staat terug.
export function flyPlaneVehicle(v, dt, isDown, groundAt, onRunway) {
  const p = v.plane;
  if (!p || v.wrecked) return p;
  const inp = v.disabled ? { throttle: 0 } : planeInput(isDown, v.planeCtl, dt);
  p.landing = null;
  stepPlane(p, inp, dt, groundAt, onRunway, PLANE);
  if (p.crashed) { v.health = 0; v.wrecked = true; }
  syncToVehicle(v);
  return p;
}

// Een geparkeerd vliegtuig zonder piloot rolt uit en blijft staan.
export function idlePlane(v, dt, groundAt) {
  const p = v.plane;
  if (!p || p.crashed) return;
  if (p.onGround) { p.speed = Math.max(0, p.speed - 8 * dt); p.throttle = 0; v.planeCtl.thr = 0; }
  else { p.speed = Math.max(PLANE.stall, p.speed); stepPlane(p, { throttle: 0.3, pitch: -0.1 }, dt, groundAt, () => false); }
  syncToVehicle(v);
}

// '' als je uit mag stappen, anders waarom niet
export function planeExitBlock(v) {
  if (!v || !v.plane || v.wrecked) return '';
  if (!v.plane.onGround) return 'Eerst landen op de baan';
  if (v.plane.speed > 2) return 'Eerst stilstaan: rem met Shift';
  return '';
}

// De baan als rechthoek: begin (x, y), richting, lengte en breedte.
export function makeStrip({ x, y, heading, length = 520, width = 34 }) {
  const c = Math.cos(heading), s = Math.sin(heading);
  return {
    x, y, heading, length, width,
    contains(px, py) {
      const dx = px - x, dy = py - y;
      const along = dx * c + dy * s, across = -dx * s + dy * c;
      return along >= -20 && along <= length + 20 && Math.abs(across) <= width / 2 + 6;
    },
    point(along, across = 0) { return { x: x + c * along - s * across, y: y + s * along + c * across }; },
  };
}

export function planeStatus(v) {
  const p = v.plane;
  if (!p) return null;
  const alt = Math.max(0, Math.round(p.z - (v.groundZ ?? 0)));
  let state = '';
  if (p.crashed || v.wrecked) state = 'Neergestort';
  else if (p.stalled) state = 'Overtrek! Neus omlaag, gas erbij';
  else if (p.onGround && p.speed < 1) state = 'Gas met W, trek bij 30 m/s op met Spatie';
  else if (p.onGround) state = `Rotatie vanaf ${PLANE.liftoff} m/s`;
  else if (p.z - (v.groundZ ?? 0) < 40 && p.vz < -PLANE.landVz) state = 'Te snel zakken!';
  return { speed: Math.round(p.speed * 3.6), alt, throttle: Math.round(p.throttle * 100), state };
}
