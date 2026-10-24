// De werktuigen van de boerderij in 3D (#415 stap 2), laag-poly: ploeg, cultivator, zaaimachine, mestverspreider, spuit, maaier en aanhanger.
// Elk werktuig is een groep met de voorkant naar +z (naar de trekker) en het midden van het werktuig in de oorsprong; het deel dat de hef
// optilt zit in `userData.hef` (omhoog of omlaag), de lading van de aanhanger in `userData.lading`. Geen echte merken, alleen vormen en kleuren.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const mat = (c) => new THREE.MeshLambertMaterial({ color: c });
const GRIJS = 0x7b8085, STAAL = 0xe2e5e8, DONKER = 0x3a3d40;

function doos(g, x, y, z, bx, by, bz, kleur) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(bx, by, bz), mat(kleur));
  m.position.set(x, y, z);
  g.add(m);
  return m;
}

function wiel(g, x, y, z, r, br) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, br, 10), mat(0x1f1f21));
  m.rotation.z = Math.PI / 2;
  m.position.set(x, r, z);
  g.add(m);
}

// Breedte en lengte (m) per type, voor de plek op het erf en de koppeling.
export const AFMETING = { ploeg: [2.0, 2.2], cultivator: [3.0, 1.8], zaaimachine: [3.0, 1.8], mestverspreider: [2.4, 3.0], spuit: [5.0, 1.8], maaier: [3.2, 1.6], aanhanger: [2.3, 4.6] };
export const GEWAS_KLEUR = { aardappelen: 0xb99b5a, bieten: 0x8d4a52, graan: 0xd9b84a, gras: 0x6fb04a };

export function bouwWerktuig(type) {
  const g = new THREE.Group();
  const hef = new THREE.Group();
  g.add(hef);
  g.userData.hef = hef;
  if (type === 'ploeg') {
    doos(hef, 0, 0.7, 0.2, 1.8, 0.16, 0.16, GRIJS);
    doos(hef, 0, 0.6, 0.9, 0.12, 0.5, 0.12, GRIJS);
    for (let k = 0; k < 3; k++) {
      const s = doos(hef, -0.7 + k * 0.7, 0.28, -0.6 + k * 0.4, 0.14, 0.52, 0.95, STAAL);
      s.rotation.y = 0.45;
    }
    doos(hef, 0, 0.5, -0.9, 0.12, 0.18, 0.12, DONKER);
  } else if (type === 'cultivator') {
    doos(hef, 0, 0.62, 0.3, 3.0, 0.14, 0.14, 0x9a8a2c);
    doos(hef, 0, 0.62, -0.2, 3.0, 0.14, 0.14, 0x9a8a2c);
    for (let k = 0; k < 9; k++) {
      const t = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.55, 5), mat(STAAL));
      t.rotation.x = Math.PI;
      t.position.set(-1.35 + k * 0.34, 0.28, k % 2 ? 0.3 : -0.2);
      hef.add(t);
    }
    const r = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 3.0, 10), mat(DONKER));
    r.rotation.z = Math.PI / 2; r.position.set(0, 0.28, -0.7);
    hef.add(r);
  } else if (type === 'zaaimachine') {
    doos(hef, 0, 1.1, 0, 3.0, 0.7, 0.9, 0xd8a31c);
    doos(hef, 0, 0.5, -0.5, 3.0, 0.12, 0.16, DONKER);
    for (let k = 0; k < 8; k++) doos(hef, -1.3 + k * 0.37, 0.28, -0.5, 0.05, 0.4, 0.05, GRIJS);
    wiel(g, -1.5, 0, -0.2, 0.4, 0.2); wiel(g, 1.5, 0, -0.2, 0.4, 0.2);
  } else if (type === 'mestverspreider') {
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 2.4, 12), mat(0x5c7a3a));
    tank.rotation.x = Math.PI / 2; tank.position.set(0, 1.35, 0);
    g.add(tank);
    doos(g, 0, 0.9, 1.5, 0.12, 0.12, 1.0, GRIJS);
    wiel(g, -1.05, 0, -0.2, 0.55, 0.3); wiel(g, 1.05, 0, -0.2, 0.55, 0.3);
    for (const s of [-1, 1]) { const d = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.05, 10), mat(DONKER)); d.position.set(s * 0.4, 0.5, -1.45); hef.add(d); }
  } else if (type === 'spuit') {
    doos(g, 0, 0.9, 0.2, 1.0, 0.9, 0.9, 0x2f7d6a);
    doos(hef, 0, 0.75, -0.7, 5.0, 0.08, 0.08, GRIJS);
    for (const s of [-1, 1]) for (let k = 1; k < 5; k++) doos(hef, s * k * 0.5, 0.65, -0.7, 0.03, 0.2, 0.03, 0x2b2b2e);
    wiel(g, -0.7, 0, 0, 0.45, 0.2); wiel(g, 0.7, 0, 0, 0.45, 0.2);
  } else if (type === 'maaier') {
    doos(hef, 0, 0.45, -0.1, 3.2, 0.1, 0.5, 0xb9552b);
    for (let k = 0; k < 4; k++) { const d = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.05, 12), mat(STAAL)); d.position.set(-1.1 + k * 0.73, 0.4, -0.4); hef.add(d); }
    doos(hef, 0, 0.62, 0.4, 0.3, 0.3, 0.8, GRIJS);
  } else if (type === 'aanhanger') {
    doos(g, 0, 0.95, 0, 2.2, 0.12, 3.6, 0x7a5a2c);
    for (const s of [-1, 1]) { doos(g, s * 1.1, 1.45, 0, 0.1, 0.9, 3.6, 0x8a6a3c); }
    doos(g, 0, 1.45, -1.8, 2.2, 0.9, 0.1, 0x8a6a3c);
    doos(g, 0, 0.7, 2.0, 0.14, 0.14, 1.5, GRIJS);
    wiel(g, -1.15, 0, -0.9, 0.55, 0.3); wiel(g, 1.15, 0, -0.9, 0.55, 0.3);
    const lading = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1, 3.4), mat(0xb99b5a));
    lading.visible = false;
    g.add(lading);
    g.userData.lading = lading;
  }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

// De lading van de aanhanger zichtbaar: hoogte volgens het aandeel van de capaciteit (0..1), kleur van het gewas.
export function zetLading(g, aandeel, gewas) {
  const l = g && g.userData.lading;
  if (!l) return;
  l.visible = aandeel > 0.01;
  const h = Math.max(0.05, 0.85 * Math.min(1, aandeel));
  l.scale.y = h;
  l.position.y = 1.0 + h / 2;
  l.material.color.setHex(GEWAS_KLEUR[gewas] || 0xb99b5a);
}

// De hef: een werktuig dat omhoog hangt zit 0,55 m boven de grond, omlaag staat het erop.
export function zetHef(g, omlaag) {
  if (g && g.userData.hef) g.userData.hef.position.y = omlaag ? 0 : 0.55;
}

export function ruimWerktuig(g) {
  if (!g) return;
  if (g.parent) g.parent.remove(g);
  g.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
}
