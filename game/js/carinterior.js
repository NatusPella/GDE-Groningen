import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { vehicleSeat } from './seating3d.js';
import { hasCarInterior, interiorLayout } from './carinteriorlayout.js';

// Low-poly car interior for the "Binnenin" camera (V): dashboard, steering
// wheel, instrument pod, two front seats, a rear bench and a mirror. Parts
// are anonymous (no emblem or badge on the wheel). Added lazily to the
// vehicle mesh and shown only while that camera is on.

const DARK = 0x23262b, GREY = 0x3a3f46, SEAT = 0x4a4f58, TRIM = 0x6a707a;

function box(g, w, h, d, x, y, z, color) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color }));
  m.position.set(x, y, z);
  g.add(m);
  return m;
}

function seatAt(g, x, y, z, tilt) {
  box(g, 0.5, 0.14, 0.5, x, y - 0.07, z, SEAT);
  const back = box(g, 0.1, 0.55, 0.48, x - 0.27, y + 0.27, z, SEAT);
  back.rotation.z = tilt;
  box(g, 0.08, 0.16, 0.26, x - 0.3, y + 0.62, z, GREY);
}

export function buildCarInterior(seat, len, wid) {
  const L = interiorLayout(seat, len, wid);
  const g = new THREE.Group();
  g.name = 'interior';
  const d = L.dash;
  box(g, d.d, d.h, d.w, d.x, d.y + d.h / 2, 0, DARK);
  box(g, d.d * 0.7, 0.05, d.w, d.x - 0.08, d.y + d.h + 0.02, 0, GREY);
  const b = L.binnacle;
  box(g, b.d, b.h, b.w, b.x, b.y, b.z, GREY);
  box(g, 0.02, 0.1, 0.12, b.x - b.d / 2 - 0.005, b.y, b.z - 0.12, 0x9ad0e8); // gauge glass
  box(g, 0.02, 0.1, 0.12, b.x - b.d / 2 - 0.005, b.y, b.z + 0.12, 0x9ad0e8);
  // steering wheel: ring in a spin group, so only the ring turns with v.steer
  const w = L.wheel;
  const mount = new THREE.Group();
  mount.position.set(w.x, w.y, w.z);
  mount.rotation.z = w.tilt;
  const turn = new THREE.Group();
  turn.rotation.y = Math.PI / 2;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(w.r, 0.022, 6, 14), new THREE.MeshLambertMaterial({ color: DARK }));
  turn.add(ring);
  const bar = new THREE.Mesh(new THREE.BoxGeometry(w.r * 1.8, 0.03, 0.03), new THREE.MeshLambertMaterial({ color: GREY }));
  turn.add(bar);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.03, 8), new THREE.MeshLambertMaterial({ color: TRIM }));
  hub.rotation.x = Math.PI / 2;
  turn.add(hub);
  mount.add(turn);
  g.add(mount);
  box(g, 0.05, 0.3, 0.05, w.x + 0.06, w.y - 0.2, w.z, DARK); // column
  for (const s of L.seats) seatAt(g, s.x, seat.y, s.z, 0.2);
  const c = L.console;
  box(g, c.d, c.h, c.w, c.x, c.y, c.z, DARK);
  if (L.rear) box(g, 0.5, 0.14, L.rear.w, L.rear.x, L.rear.y - 0.07, 0, SEAT), box(g, 0.1, 0.55, L.rear.w, L.rear.x - 0.27, L.rear.y + 0.27, 0, SEAT);
  const m = L.mirror;
  box(g, 0.03, 0.1, 0.34, m.x, m.y, m.z, DARK);
  g.userData.wheel = turn;
  return g;
}

// Called every frame from scene3d for the player's car. show = the interior
// camera is on. Returns true when the interior is up (the driver is hidden).
export function updateCarInterior(mesh, v, show) {
  if (!mesh || !hasCarInterior(v)) return false;
  let g = mesh.userData.interior;
  if (!g && show) {
    g = buildCarInterior(vehicleSeat(v, true), v.model.len, v.model.wid);
    mesh.userData.interior = g;
    mesh.add(g);
  }
  if (!g) return false;
  g.visible = !!show;
  if (show) g.userData.wheel.rotation.z = -(v.steer || 0) * 2.2;
  return !!show;
}

// Eye pose (map x, y, height z) and look direction for the cinematics camera.
export function interiorEyePose(v) {
  if (!hasCarInterior(v)) return null;
  const e = interiorLayout(vehicleSeat(v, true), v.model.len, v.model.wid).eye;
  const a = v.angle, c = Math.cos(a), s = Math.sin(a);
  // vehicle-local +x forward, +z right; map y runs with local +z
  const x = v.x + e.x * c - e.z * s, y = v.y + e.x * s + e.z * c;
  return { x, y, z: (v.z || 0) + e.y, fx: c, fy: s };
}
