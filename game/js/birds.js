// The pigeon flock (instanced bodies and wings), shared by the intro montage,
// the trailer and the pigeon story mission. Its own module so the story does not
// pull in the intro montage (a big, rarely used module) for a few birds.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { getCamera } from './scene3d.js';
import { pigeonMerged, pigeonWingGeometry, PIGEON_PIVOT } from './pigeonmodel.js';

const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);
// De zwerm gebruikt het middelniveau van het ene duivenmodel (pigeonmodel.js): een gladde romp met kop, staart en poten, en een
// vleugel met veren die per vogel klapt. Geen doos met een plaatje meer. Romp en vleugel zijn gedeeld door alle zwermen.
const FLOCK_SCALE = 0.6; // de duif van het model is 0,6 m lang (pigeonmodel.js); een stadsduif is ca. 0,33 tot 0,38 m (#1195: 0,9 gaf duiven van 0,54 m)
let BIRD_GEO = null, WING_GEO = null, BIRD_MAT = null;
function sharedParts() {
  if (BIRD_GEO) return;
  BIRD_GEO = pigeonMerged('mid', {}, { wings: 'none', scale: FLOCK_SCALE });
  WING_GEO = pigeonWingGeometry('mid').scale(FLOCK_SCALE, FLOCK_SCALE, FLOCK_SCALE);
  BIRD_MAT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, side: THREE.DoubleSide });
  // one flock's geometry and material serve every bird: the scene's cleaner
  // (disposeObject) must not throw them away when a single flock is removed
  BIRD_GEO.userData.shared = true;
  WING_GEO.userData.shared = true;
  BIRD_MAT.userData.shared = true;
}
export const BIRDS = 64;

// A pigeon flock as two instanced meshes (bodies, wings): a few dozen birds
// in two draw calls. Scattered, they burst up and wheel round the square.
// avoid (m): a bubble round the camera the flock keeps out of, so no bird
// passes the lens as a huge shape; birds deep inside it are hidden.
// De tinten vermenigvuldigen de kleuren van het model: lichter en donkerder grijs, een witte en een bruine duif ertussen.
const TONES = [0xffffff, 0xd9dbe2, 0xb9bcc6, 0xefe6dc, 0xc9b49e].map((c) => new THREE.Color(c));
export function makeBirds(group, cx, cy, r, n = BIRDS, { avoid = 0 } = {}) {
  sharedParts();
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

const _w = new THREE.Matrix4(), _r = new THREE.Matrix4(), _e = new THREE.Euler();

export function updateBirds(b, dt, t) {
  const d = b.dummy;
  d.rotation.order = 'YXZ';
  const cam = b.avoid > 0 ? getCamera() : null;
  const cp = cam && cam.position;
  b.list.forEach((p, i) => {
    let flap, bank = 0;
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
        // a faster downstroke than upstroke; circling, a pigeon now and then glides with its wings in a V and banks into the turn
        const ph = t * 26 + p.ph, glide = p.air > 1.5 ? clamp01((Math.sin(t * 0.6 + p.ph) - 0.4) * 2.5) : 0;
        flap = Math.sin(ph - 0.5 * Math.sin(ph)) * 1.05 * (1 - glide) + glide * 0.35;
        if (p.air > 0.7) bank = -b.spin * 0.35;
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
    d.position.set(p.x, p.z + 0.147 * FLOCK_SCALE * size, p.y);
    d.rotation.set(bank, -p.h, -peck);
    d.scale.set(size, size, size);
    d.updateMatrix();
    b.body.setMatrixAt(i, d.matrix);
    for (const side of [1, -1]) {
      // schouder van de vleugel op de romp; in de lucht slaat hij op en neer, op de grond ligt hij gevouwen langs de flank
      if (p.fly) _w.makeTranslation(PIGEON_PIVOT.wing[0] * FLOCK_SCALE, PIGEON_PIVOT.wing[1] * FLOCK_SCALE, PIGEON_PIVOT.wing[2] * FLOCK_SCALE * side).multiply(_r.makeRotationX(flap * side));
      else {
        _w.makeTranslation((PIGEON_PIVOT.wing[0] + 0.015) * FLOCK_SCALE, (PIGEON_PIVOT.wing[1] - 0.02) * FLOCK_SCALE, PIGEON_PIVOT.wing[2] * FLOCK_SCALE * side * 1.3);
        _w.multiply(_r.makeRotationFromEuler(_e.set(0.5 * side, -1.55 * side, 0, 'XYZ')));
        _w.multiply(_r.makeScale(1, 1, 0.62));
      }
      if (side < 0) _w.multiply(_r.makeScale(1, 1, -1));
      _w.premultiply(d.matrix);
      b.wings.setMatrixAt(i * 2 + (side > 0 ? 0 : 1), _w);
    }
  });
  b.body.instanceMatrix.needsUpdate = true;
  b.wings.instanceMatrix.needsUpdate = true;
}
