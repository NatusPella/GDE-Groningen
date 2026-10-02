import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { pompebledTexture } from './fierljep.js';

// Props of the first opening montage that the trailer (trailer.js) still
// stages: the museum vitrine room, the cash machine on its sack truck and
// the pompeblêd flags. Each builder owns its geometry and materials;
// disposeOwned() frees them.

const GOLD_MAT = new THREE.MeshStandardMaterial({ color: 0xe0ac2a, metalness: 0.9, roughness: 0.28, emissive: 0x5a3a06, emissiveIntensity: 0.55 });
function eierbalGeometry() {
  const g = new THREE.IcosahedronGeometry(0.16, 6);
  const p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = Math.sin(v.x * 61) * Math.sin(v.y * 53 + 1.3) * Math.sin(v.z * 67 + 2.1);
    v.multiplyScalar(1 + n * 0.045);
    v.y *= 0.9;
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

function roomTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function buildVitrineRoom() {
  const g = new THREE.Group();
  const own = [];
  const mesh = (geo, mat) => { own.push(geo, mat); const m = new THREE.Mesh(geo, mat); g.add(m); return m; };
  const wall = roomTexture(256, 256, (c, w, h) => {
    const r = c.createRadialGradient(w / 2, h * 0.62, 10, w / 2, h * 0.62, w * 0.75);
    r.addColorStop(0, '#3a2c22'); r.addColorStop(0.5, '#1c1612'); r.addColorStop(1, '#0a0807');
    c.fillStyle = r; c.fillRect(0, 0, w, h);
  });
  mesh(new THREE.BoxGeometry(9, 5, 9), new THREE.MeshBasicMaterial({ map: wall, side: THREE.BackSide })).position.y = 2.5;
  own.push(wall);
  const floor = roomTexture(256, 256, (c, w, h) => {
    const r = c.createRadialGradient(w / 2, h / 2, 6, w / 2, h / 2, w / 2);
    r.addColorStop(0, '#5a4636'); r.addColorStop(0.35, '#2a2019'); r.addColorStop(1, '#0c0a08');
    c.fillStyle = r; c.fillRect(0, 0, w, h);
  });
  const fl = mesh(new THREE.PlaneGeometry(9, 9), new THREE.MeshBasicMaterial({ map: floor }));
  fl.rotation.x = -Math.PI / 2; fl.position.y = 0.01;
  own.push(floor);
  // plinth, cushion, the ball, the glass case and its brass rim
  mesh(new THREE.BoxGeometry(0.62, 1.05, 0.62), new THREE.MeshBasicMaterial({ color: 0xe9e4d8 })).position.y = 0.525;
  const cushion = mesh(new THREE.SphereGeometry(0.2, 20, 10), new THREE.MeshStandardMaterial({ color: 0x8d1424, roughness: 0.9, emissive: 0x3a040b, emissiveIntensity: 0.6 }));
  cushion.scale.set(1, 0.3, 1); cushion.position.y = 1.1;
  const ball = new THREE.Mesh(eierbalGeometry(), GOLD_MAT);
  own.push(ball.geometry);
  ball.position.y = 1.29;
  g.add(ball);
  const glass = mesh(new THREE.BoxGeometry(0.56, 0.62, 0.56), new THREE.MeshStandardMaterial({ color: 0xdfeeff, transparent: true, opacity: 0.12, roughness: 0.05, depthWrite: false }));
  glass.position.y = 1.36;
  mesh(new THREE.BoxGeometry(0.6, 0.04, 0.6), new THREE.MeshStandardMaterial({ color: 0xb08a3a, metalness: 0.8, roughness: 0.35, emissive: 0x2a1c05 })).position.y = 1.69;
  const beam = mesh(new THREE.CylinderGeometry(0.22, 0.7, 3.3, 20, 1, true), new THREE.MeshBasicMaterial({ color: 0xffe2a6, transparent: true, opacity: 0.09, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
  beam.position.y = 3.3;
  // the museum label beside the case
  const label = roomTexture(512, 256, (c, w, h) => {
    c.fillStyle = '#efe9da'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#2a2017';
    c.font = 'bold 54px Arial, sans-serif'; c.fillText('De Gouden Eierbal', 30, 84);
    c.font = '34px Arial, sans-serif'; c.fillText('Grunn, 1953 · 18 karaat goud', 30, 150);
    c.font = 'italic 28px Arial, sans-serif'; c.fillText('Niet aanraken. Ook niet likken.', 30, 212);
  });
  const lab = mesh(new THREE.PlaneGeometry(0.5, 0.25), new THREE.MeshBasicMaterial({ map: label }));
  own.push(label);
  lab.scale.setScalar(0.8);
  lab.position.set(0.315, 0.82, 0); lab.rotation.set(0, Math.PI / 2, 0);
  for (const o of g.children) { o.castShadow = false; o.receiveShadow = false; }
  g.userData = { ball, own };
  return g;
}

// A cash machine on a sack truck, rolled away by Tammo.
export function buildAtm() {
  const g = new THREE.Group(), own = [];
  const box = (w, h, d, color, x, y, z, emissive = 0) => {
    const geo = new THREE.BoxGeometry(w, h, d), mat = new THREE.MeshStandardMaterial({ color, roughness: 0.6, emissive, emissiveIntensity: emissive ? 1 : 0 });
    own.push(geo, mat);
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z); m.castShadow = true;
    g.add(m);
    return m;
  };
  box(0.62, 1.35, 0.55, 0x7c8590, 0, 0.8, 0);
  box(0.02, 0.26, 0.34, 0x0f2a1c, 0.29, 1.12, 0, 0x2dbb6a);
  box(0.04, 0.12, 0.3, 0x1b1d20, 0.29, 0.86, 0);
  box(0.04, 0.05, 0.2, 0x111111, 0.3, 0.66, 0);
  box(0.03, 0.12, 0.5, 0x1d5fae, 0.3, 1.38, 0, 0x0b2a55);
  // the sack truck: frame, toe plate and two wheels
  box(0.05, 1.5, 0.05, 0x333333, -0.32, 0.78, 0.26);
  box(0.05, 1.5, 0.05, 0x333333, -0.32, 0.78, -0.26);
  box(0.45, 0.04, 0.6, 0x333333, 0, 0.1, 0);
  for (const z of [0.32, -0.32]) {
    const geo = new THREE.CylinderGeometry(0.13, 0.13, 0.07, 14), mat = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.9 });
    own.push(geo, mat);
    const wh = new THREE.Mesh(geo, mat);
    wh.rotation.x = Math.PI / 2; wh.position.set(-0.28, 0.13, z);
    g.add(wh);
  }
  g.userData.own = own;
  return g;
}

export function disposeOwned(o) {
  o.removeFromParent();
  for (const x of (o.userData && o.userData.own) || []) x.dispose();
}


export function buildFlag() {
  const g = new THREE.Group(), own = [];
  const poleGeo = new THREE.CylinderGeometry(0.025, 0.03, 2.6, 6), poleMat = new THREE.MeshBasicMaterial({ color: 0x06080a });
  const pole = new THREE.Mesh(poleGeo, poleMat);
  pole.position.y = 1.3;
  g.add(pole);
  const geo = new THREE.PlaneGeometry(1.1, 0.72, 12, 1);
  geo.translate(0.55, 0, 0);
  const mat = new THREE.MeshBasicMaterial({ map: pompebledTexture(), side: THREE.DoubleSide, color: 0x9a8f86 });
  const cloth = new THREE.Mesh(geo, mat);
  cloth.position.y = 2.2;
  g.add(cloth);
  own.push(poleGeo, poleMat, geo, mat);
  g.userData = { cloth, own, base: Float32Array.from(geo.attributes.position.array) };
  return g;
}

export function waveFlag(f, t) {
  const { cloth, base } = f.userData;
  const p = cloth.geometry.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = base[i * 3];
    p.setZ(i, Math.sin(x * 5 - t * 7) * 0.12 * x + Math.sin(x * 9 - t * 11) * 0.03 * x);
  }
  p.needsUpdate = true;
}
