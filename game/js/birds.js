// The pigeon flock (instanced bodies and wings), shared by the intro montage,
// the trailer and the pigeon story mission. Its own module so the story does not
// pull in the intro montage (a big, rarely used module) for a few birds.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { getCamera } from './scene3d.js';

const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);
const BIRD_GEO = new THREE.BoxGeometry(0.26, 0.11, 0.12);
const WING_GEO = new THREE.PlaneGeometry(0.13, 0.26).rotateX(-Math.PI / 2).translate(0, 0, 0.13);
const BIRD_MAT = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, side: THREE.DoubleSide });
// one flock's geometry and material serve every bird: the scene's cleaner
// (disposeObject) must not throw them away when a single flock is removed
BIRD_GEO.userData.shared = true;
WING_GEO.userData.shared = true;
BIRD_MAT.userData.shared = true;
export const BIRDS = 64;

// A pigeon flock as two instanced meshes (bodies, wings): a few dozen birds
// in two draw calls. Scattered, they burst up and wheel round the square.
// avoid (m): a bubble round the camera the flock keeps out of, so no bird
// passes the lens as a huge low-poly shape; birds deep inside it are hidden.
const TONES = [0x7c8088, 0x6a6e76, 0x8e9198, 0x5c5f66, 0xa3a6ab].map((c) => new THREE.Color(c));
export function makeBirds(group, cx, cy, r, n = BIRDS, { avoid = 0 } = {}) {
  const body = new THREE.InstancedMesh(BIRD_GEO, BIRD_MAT, n);
  const wings = new THREE.InstancedMesh(WING_GEO, BIRD_MAT, n * 2);
  body.frustumCulled = wings.frustumCulled = false;
  group.add(body, wings);
  const list = [];
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * r;
    list.push({ x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d, z: 0.1, h: Math.random() * 6, vx: 0, vy: 0, vz: 0, fly: false, ph: Math.random() * 6, delay: Math.random() * 0.35, air: 0, alt: 5 + Math.random() * 9, ring: 9 + Math.random() * 9 });
    const tone = TONES[i % TONES.length];
    body.setColorAt(i, tone);
    wings.setColorAt(i * 2, tone); wings.setColorAt(i * 2 + 1, tone);
  }
  return { body, wings, list, dummy: new THREE.Object3D(), cx, cy, spin: Math.random() < 0.5 ? 1 : -1, avoid };
}

export function scatterBirds(b, fromX, fromY) {
  for (const p of b.list) {
    const a = Math.atan2(p.y - fromY, p.x - fromX) + (Math.random() - 0.5) * 1.2;
    const s = 3 + Math.random() * 3;
    p.vx = Math.cos(a) * s; p.vy = Math.sin(a) * s; p.vz = 4 + Math.random() * 3.5;
    p.h = a; p.fly = true;
  }
}

export function updateBirds(b, dt, t) {
  const d = b.dummy;
  d.rotation.order = 'YXZ';
  const cam = b.avoid > 0 ? getCamera() : null;
  const cp = cam && cam.position;
  b.list.forEach((p, i) => {
    let flap;
    if (p.fly) {
      if ((p.delay -= dt) > 0) flap = 0.3;
      else {
        p.air += dt;
        if (p.air > 0.7) {
          // wheel round the square: steer onto a circle, climb to cruise height
          const dx = p.x - b.cx, dy = p.y - b.cy, dl = Math.hypot(dx, dy) || 1;
          const pull = (p.ring - dl) * 0.5;
          const tx = (-dy / dl) * 7.5 * b.spin + (dx / dl) * pull, ty = (dx / dl) * 7.5 * b.spin + (dy / dl) * pull;
          const k = Math.min(1, dt * 1.4);
          p.vx += (tx - p.vx) * k; p.vy += (ty - p.vy) * k;
          p.vz += ((p.alt - p.z) * 0.8 - p.vz) * k;
          p.h = Math.atan2(p.vy, p.vx);
        } else p.vz = Math.max(0.6, p.vz - 1.2 * dt);
        p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
        flap = Math.sin(t * 26 + p.ph) * 1.05;
      }
    } else {
      flap = 0.3;
      p.h += Math.sin(t * 0.7 + p.ph) * dt * 0.8;
    }
    let size = 1;
    if (cp) {
      let dx = p.x - cp.x, dy = p.y - cp.z, dz = p.z - cp.y;
      let dl = Math.hypot(dx, dy, dz);
      if (p.fly && dl < b.avoid) {
        if (dl < 1e-3) { dx = 1; dy = 0; dz = 0; dl = 1; }
        const push = (b.avoid - dl) * Math.min(1, dt * 5) / dl;
        p.x += dx * push; p.y += dy * push; p.z = Math.max(0.1, p.z + dz * push);
        const into = (p.vx * dx + p.vy * dy + p.vz * dz) / dl;
        if (into < 0) { p.vx -= (dx / dl) * into; p.vy -= (dy / dl) * into; p.vz -= (dz / dl) * into; }
      }
      size = clamp01((dl - b.avoid * 0.5) / 0.6);
    }
    const peck = p.fly ? 0 : Math.max(0, Math.sin(t * 2.2 + p.ph * 3)) * 0.5;
    d.position.set(p.x, p.z + 0.07, p.y);
    d.rotation.set(0, -p.h, -peck);
    d.scale.set(size, size, size);
    d.updateMatrix();
    b.body.setMatrixAt(i, d.matrix);
    for (const side of [1, -1]) {
      d.rotation.set(flap * side, -p.h, 0);
      d.scale.set(size, size, size * side);
      d.updateMatrix();
      b.wings.setMatrixAt(i * 2 + (side > 0 ? 0 : 1), d.matrix);
    }
  });
  b.body.instanceMatrix.needsUpdate = true;
  b.wings.instanceMatrix.needsUpdate = true;
}
