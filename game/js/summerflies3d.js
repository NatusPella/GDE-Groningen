// Warme avond (summerday.js): een handvol vliegjes en stuifmeel dat in het gloeiende licht rond de camera zweeft.
// Eén Points-object met hoogstens SUMMER_LIMITS.maxFlies points (één draw call), alleen zichtbaar als layer.flies > 0.02.
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { SUMMER_LIMITS } from './summerday.js';

const N = SUMMER_LIMITS.maxFlies;
const SPREAD = 14; // m rond de camera
let points = null, base = null, t0 = 0;

function build() {
  const pos = new Float32Array(N * 3);
  base = new Float32Array(N * 4);
  for (let i = 0; i < N; i++) { // vaste spreiding (elke speler ziet dezelfde wolk)
    base[i * 4] = ((i * 0.6180339) % 1) * 2 - 1;
    base[i * 4 + 1] = ((i * 0.7548776) % 1);
    base[i * 4 + 2] = ((i * 0.5698402) % 1) * 2 - 1;
    base[i * 4 + 3] = i * 1.7;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const m = new THREE.PointsMaterial({ color: 0xf3ead3, size: 0.07, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  const p = new THREE.Points(g, m);
  p.frustumCulled = false; p.visible = false; p.name = 'summerflies';
  return p;
}

// strength: layer.flies (0..1); cam: camera met position. Geeft het aantal draw calls dat dit beeld extra kost (0 of 1).
export function updateSummerFlies(scene, strength, cam, dt) {
  if (!points) { points = build(); scene.add(points); }
  if (strength < 0.02 || !cam || !cam.position) { points.visible = false; return 0; }
  t0 += dt;
  points.visible = true;
  points.material.opacity = Math.min(0.8, strength);
  const a = points.geometry.attributes.position.array, c = cam.position;
  const n = Math.max(8, Math.round(N * Math.min(1, strength)));
  points.geometry.setDrawRange(0, n);
  for (let i = 0; i < n; i++) {
    const ph = base[i * 4 + 3];
    a[i * 3] = c.x + base[i * 4] * SPREAD + Math.sin(t0 * 0.6 + ph) * 0.8;
    a[i * 3 + 1] = Math.max(0.3, c.y - 2) + base[i * 4 + 1] * 4 + Math.sin(t0 * 0.9 + ph * 1.3) * 0.4;
    a[i * 3 + 2] = c.z + base[i * 4 + 2] * SPREAD + Math.cos(t0 * 0.5 + ph) * 0.8;
  }
  points.geometry.attributes.position.needsUpdate = true;
  return 1;
}
