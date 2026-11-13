// 3D-kant van het arcade-vliegtuig (planeflight.js): een low-poly tweezitter
// "Kist Kees", +x is voorwaarts, wielen op y = 0. Alleen THREE.

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

export function buildPlaneMesh(v) {
  const wrecked = !!v.wrecked;
  const paint = new THREE.Color((v.model && v.model.color) || '#e9e4d3');
  if (wrecked) paint.set(0x2a2a2a);
  const body = new THREE.MeshLambertMaterial({ color: paint });
  const accent = new THREE.MeshLambertMaterial({ color: wrecked ? 0x1a1a1a : 0xd2552b });
  const glass = new THREE.MeshLambertMaterial({ color: 0x3b5a73, transparent: true, opacity: 0.8 });
  const dark = new THREE.MeshLambertMaterial({ color: 0x1c1d20 });
  const g = new THREE.Group();
  const add = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    g.add(m);
    return m;
  };
  // Cabine (#847): de romp is onder de cabine dicht (y 0,8-1,65), daarboven alleen de
  // zijwanden en het dakvlak buiten de cockpitopening, zodat de cockpit onder de glaskap
  // zichtbaar is. De opening loopt van x -1,1 tot 1,55 (de glaskap staat op x 0,7 ± 0,75).
  add(new THREE.BoxGeometry(6.8, 0.85, 1.3), body, 0, 1.225, 0);
  for (const s of [1, -1]) add(new THREE.BoxGeometry(6.8, 0.45, 0.06), body, 0, 1.875, s * 0.62);
  add(new THREE.BoxGeometry(1.85, 0.06, 1.3), body, 2.475, 2.07, 0);
  add(new THREE.BoxGeometry(2.3, 0.06, 1.3), body, -2.25, 2.07, 0);
  add(new THREE.BoxGeometry(2.0, 0.5, 1.28), accent, 1.2, 1.1, 0);
  add(new THREE.BoxGeometry(1.5, 0.6, 1.1), glass, 0.7, 2.2, 0);
  add(new THREE.BoxGeometry(1.5, 0.12, 10.6), body, 0.5, 2.0, 0);
  add(new THREE.BoxGeometry(1.0, 0.1, 3.8), body, -3.2, 1.7, 0);
  add(new THREE.BoxGeometry(1.0, 1.3, 0.12), accent, -3.2, 2.4, 0);
  const prop = new THREE.Group();
  prop.position.set(3.55, 1.45, 0);
  prop.add(new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.2, 0.2), dark));
  g.add(prop);
  g.userData.prop = prop;
  for (const z of [-1.1, 1.1]) add(new THREE.CylinderGeometry(0.35, 0.35, 0.22, 8), dark, 0.9, 0.4, z, Math.PI / 2, 0, 0);
  add(new THREE.CylinderGeometry(0.22, 0.22, 0.18, 8), dark, -2.9, 0.5, 0, Math.PI / 2, 0, 0);
  return g;
}
