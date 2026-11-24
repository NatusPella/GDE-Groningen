// Kits voor de aankleding van een monumentgebied (monumentdecor.js): een lindeboom, een historische lantaarn en een stapel
// kanonskogels, laag-poly uit doosjes, cilinders en bollen zoals de andere aankleding (missiedecor.js). De bouwers melden
// zich bij missiedecor.js (registreerPropBouwer); de glans van de lantaarns volgt het uur (setMonumentLantern).
// Geen scène nodig bij het laden: elke bouwer geeft een losse THREE.Group (geen NaN, vaste maten), de aanroeper ruimt op.
import * as THREE from 'three';
import { registreerPropBouwer } from './missiedecor.js';

const mat = (color) => new THREE.MeshLambertMaterial({ color, flatShading: true });
const box = (w, h, d, color, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color)); m.position.set(x, y, z); return m; };
const cyl = (r0, r1, h, color, x, y, z, seg = 7) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, h, seg), mat(color)); m.position.set(x, y, z); return m; };

// De glasruit van elke lantaarn deelt dit materiaal: één schakelaar voor de hele straat.
const GLOW_ON = 0xffc46b, GLOW_OFF = 0x6f6552;
let glass = null;
const glassMat = () => glass || (glass = new THREE.MeshBasicMaterial({ color: GLOW_OFF }));
export function setMonumentLantern(on, color = GLOW_ON) {
  const m = glassMat();
  m.color.setHex(on ? color : GLOW_OFF);
}
export const monumentLanternMaterial = glassMat;

// #1203 (hertest 24-11): een plein-linde heeft een hoge, opgekroonde stam (kruin vanaf ca. 5 m, zoals de linden op het Marktplein):
// de kruinen staan boven het beeld van wie op het plein staat in plaats van de bovenhelft te vullen.
export const LINDE_KRUIN_ONDER = 5.1;
export function linde() {
  const g = new THREE.Group();
  g.add(cyl(0.2, 0.3, 5.4, 0x5a4028, 0, 2.7, 0));
  const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(2.6, 0), mat(0x4f7a3c));
  crown.position.set(0, 7.3, 0);
  crown.scale.set(1, 0.85, 1);
  const top = new THREE.Mesh(new THREE.IcosahedronGeometry(1.7, 0), mat(0x6b8f43));
  top.position.set(0.6, 8.8, -0.3);
  g.add(crown, top);
  return g;
}

export function lantaarn() {
  const g = new THREE.Group();
  g.add(cyl(0.05, 0.07, 3.1, 0x2a2d30, 0, 1.55, 0, 6));
  g.add(box(0.5, 0.05, 0.05, 0x2a2d30, 0.18, 3.0, 0));
  const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.42, 0.3), glassMat());
  lamp.position.set(0.4, 2.78, 0);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.27, 0.22, 4), mat(0x24272b));
  cap.position.set(0.4, 3.1, 0);
  cap.rotation.y = Math.PI / 4;
  g.add(lamp, cap, box(0.34, 0.05, 0.34, 0x24272b, 0.4, 2.55, 0));
  return g;
}

export function kogels() {
  const g = new THREE.Group();
  g.add(box(1.0, 0.08, 1.0, 0x6f4d2a, 0, 0.04, 0));
  const geo = new THREE.SphereGeometry(0.11, 6, 5);
  const iron = mat(0x2a2d30);
  for (const [n, y] of [[3, 0.19], [2, 0.36], [1, 0.52]]) {
    const off = (n - 1) * 0.11;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const s = new THREE.Mesh(geo, iron);
      s.position.set(-off + i * 0.22, y, -off + j * 0.22);
      g.add(s);
    }
  }
  return g;
}

registreerPropBouwer('linde', linde);
registreerPropBouwer('lantaarn', lantaarn);
registreerPropBouwer('kogels', kogels);
