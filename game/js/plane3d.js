// 3D-kant van het arcade-vliegtuig (planeflight.js): een low-poly tweezitter
// "Kist Kees", +x is voorwaarts, wielen op y = 0. Alleen THREE.

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

export function buildPlaneMesh(v) {
  const wrecked = !!v.wrecked;
  const paint = new THREE.Color((v.model && v.model.color) || '#e9e4d3');
  if (wrecked) paint.set(0x2a2a2a);
  const body = new THREE.MeshLambertMaterial({ color: paint });
  const accent = new THREE.MeshLambertMaterial({ color: wrecked ? 0x1a1a1a : 0xd2552b });
  // #851: the canopy looked like an opaque dark block; lighter glass with less opacity reads as glass.
  const glass = wrecked
    ? new THREE.MeshLambertMaterial({ color: 0x1c1d20 })
    : new THREE.MeshLambertMaterial({ color: 0x9fbed2, transparent: true, opacity: 0.42, depthWrite: false });
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
  // #851: the old accent box sat fully inside the fuselage (1.28 wide in a 1.3 m body) and was
  // invisible. This band is 6 cm wider than the fuselage, so it shows as a red nose band.
  add(new THREE.BoxGeometry(1.5, 0.45, 1.36), accent, 2.5, 1.02, 0);
  add(new THREE.BoxGeometry(1.5, 0.6, 1.1), glass, 0.7, 2.2, 0);
  // #851: the wing was a plate straight through the canopy (wing y 1.94-2.06, canopy 1.90-2.50).
  // A high wing resting on the canopy keeps the Cessna-like look: bottom 2.51 is 1 cm above the
  // glass top, so the two no longer intersect anywhere.
  add(new THREE.BoxGeometry(1.5, 0.12, 10.6), body, 0.5, 2.57, 0);
  add(new THREE.BoxGeometry(1.0, 0.1, 3.8), body, -3.2, 1.7, 0);
  add(new THREE.BoxGeometry(1.0, 1.3, 0.12), accent, -3.2, 2.4, 0);
  const prop = new THREE.Group();
  prop.position.set(3.55, 1.45, 0);
  prop.add(new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.2, 0.2), dark));
  g.add(prop);
  g.userData.prop = prop;
  // #853: both wheels hung above the strip (nose 5 cm, tail 28 cm). They now stand on their
  // radius with a leg up to the fuselage (the nose wheels tucked just outside the body).
  for (const z of [-0.7, 0.7]) {
    add(new THREE.BoxGeometry(0.06, 0.5, 0.06), dark, 0.9, 0.6, z < 0 ? -0.65 : 0.65);
    add(new THREE.CylinderGeometry(0.35, 0.35, 0.22, 8), dark, 0.9, 0.35, z, Math.PI / 2, 0, 0);
  }
  add(new THREE.BoxGeometry(0.06, 0.56, 0.06), dark, -2.9, 0.52, 0);
  add(new THREE.CylinderGeometry(0.22, 0.22, 0.18, 8), dark, -2.9, 0.22, 0, Math.PI / 2, 0, 0);
  return g;
}
