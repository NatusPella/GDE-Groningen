import * as THREE from 'three';
import { canvasTex as sharedCanvasTex } from './canvastex.js';

// #950: het kantoor van Wiebelwerk, voor het gesprek met de accountmanager (M18).
// De scène stond in een weiland omdat het doelpunt een schatting op de kaart was;
// nu speelt het gesprek in een klein kantoorset op de plek van het echte pand,
// met een bureau, een scherm, een whiteboard en een glazen wand. Alleen de
// binnenkant is ooit in beeld. Plan: u langs wereld-x, v langs wereld-y, h omhoog;
// het bureau staat op +u, de bezoekers op de oorsprong.

export const OFFICE = {
  w: 7.8,    // m langs u (de manager wandelt in M18.2 tot u = 3,8)
  d: 5.6,    // m langs v
  h: 2.9,    // m hoog
  deskU: 2.35,
  deskH: 0.76,
};

const canvasTex = (w, h, draw) => sharedCanvasTex(w, h, draw, { anisotropy: 4 });

function wallTex() {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#f0ede4'; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(240, 237, 228, 0.10)';
    for (let x = 0; x < w; x += 64) g.fillRect(x, 0, 2, h);
    const r = g.createLinearGradient(0, 0, 0, h);
    r.addColorStop(0, 'rgba(40, 44, 50, 0.10)'); r.addColorStop(0.55, 'rgba(0, 0, 0, 0)'); r.addColorStop(1, 'rgba(40, 44, 50, 0.12)');
    g.fillStyle = r; g.fillRect(0, 0, w, h);
  });
}

function floorTex() {
  const t = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#0f5c30'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(12, 20, 14, 0.35)'; g.lineWidth = 2;
    for (let y = 0; y <= h; y += 64) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    g.fillStyle = 'rgba(255, 255, 255, 0.05)';
    for (let x = 0; x < w; x += 32) g.fillRect(x, 0, 12, h);
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 2.5);
  return t;
}

function signTex() {
  return canvasTex(512, 256, (g, w, h) => {
    g.fillStyle = '#f0ede4'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#1e9e56'; g.fillRect(0, 0, w, 22);
    g.fillStyle = '#0f5c30'; g.font = 'bold 62px Arial, sans-serif'; g.fillText('WIEBELWERK', 34, 112);
    g.fillStyle = '#0f5c30'; g.font = 'italic 30px Arial, sans-serif'; g.fillText('websites met karakter', 36, 164);
    g.strokeStyle = '#f0ede4'; g.lineWidth = 3;
    for (let y = 198; y < 240; y += 14) { g.beginPath(); g.moveTo(36, y); g.lineTo(36 + 150 + (y % 40) * 4, y); g.stroke(); }
  });
}

function glassTex() {
  return canvasTex(256, 256, (g, w, h) => {
    const grad = g.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#cfe0e8'); grad.addColorStop(0.55, '#b6cfda'); grad.addColorStop(1, '#9fbccb');
    g.fillStyle = grad; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255, 255, 255, 0.22)';
    for (let x = -h; x < w; x += 90) { g.save(); g.translate(x, 0); g.rotate(0.5); g.fillRect(0, -h, 16, h * 3); g.restore(); }
  });
}

export function buildOffice(x, y, z) {
  const group = new THREE.Group();
  group.position.set(x, z, y);
  const own = [];
  const keep = (o) => { own.push(o); return o; };
  const std = (color, extra = {}) => keep(new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...extra }));
  const geoBox = (w, h, d) => keep(new THREE.BoxGeometry(w, h, d));
  const add = (geo, mat, u, h, v, parent = group) => { const m = new THREE.Mesh(geo, mat); m.position.set(u, h, v); parent.add(m); return m; };
  const box = (w, h, d, mat, u, hh, v, parent) => add(geoBox(w, h, d), mat, u, hh, v, parent);

  const W = OFFICE.w, D = OFFICE.d, H = OFFICE.h;
  // de kamer, van binnen gezien: de wanden, de vloer en het plafond
  const wall = keep(new THREE.MeshBasicMaterial({ map: keep(wallTex()), side: THREE.BackSide, color: 0xf2f0ea }));
  const glass = keep(new THREE.MeshBasicMaterial({ map: keep(glassTex()), side: THREE.BackSide }));
  const ceil = keep(new THREE.MeshBasicMaterial({ color: 0x2c3034, side: THREE.BackSide }));
  const floorMat = keep(new THREE.MeshStandardMaterial({ map: keep(floorTex()), roughness: 0.85, side: THREE.BackSide }));
  const room = new THREE.Mesh(keep(new THREE.BoxGeometry(W, H, D)), [glass, wall, ceil, floorMat, wall, wall]);
  room.position.y = H / 2;
  group.add(room);

  // glazen wand aan de +u-kant: stijlen en een deur, zodat het een kantoor is
  const frame = std(0x3a3f45, { roughness: 0.5, metalness: 0.2 });
  for (const v of [-D / 2 + 0.12, -D / 6, D / 6, D / 2 - 0.12]) box(0.09, H - 0.1, 0.09, frame, W / 2 - 0.06, (H - 0.1) / 2, v);
  box(0.09, 0.09, D - 0.2, frame, W / 2 - 0.06, H - 0.12, 0);
  box(0.09, 0.09, D - 0.2, frame, W / 2 - 0.06, 0.08, 0);

  // het bureau met het scherm en een laptop
  const desk = std(0xe9e6df, { roughness: 0.6 }), leg = std(0x33383d, { roughness: 0.4, metalness: 0.3 });
  box(1.15, 0.06, 2.5, desk, OFFICE.deskU, OFFICE.deskH, 0);
  for (const v of [-1.15, 0, 1.15]) box(0.07, OFFICE.deskH - 0.06, 0.07, leg, OFFICE.deskU + 0.5, (OFFICE.deskH - 0.06) / 2, v);
  box(1.0, 0.5, 0.16, std(0x1c1f23), OFFICE.deskU + 0.55, 0.55, 0); // dossierkast onder het blad
  const monitor = std(0x15181c, { roughness: 0.5 });
  box(0.06, 0.55, 0.9, monitor, OFFICE.deskU + 0.06, OFFICE.deskH + 0.33, 0);
  box(0.05, 0.03, 0.5, std(0x0d0f12), OFFICE.deskU + 0.04, OFFICE.deskH + 0.02, 0);
  for (let k = 0; k < 4; k++) box(0.03, 0.03, 0.07, leg, OFFICE.deskU + 0.42, OFFICE.deskH - 0.02, -0.9 + k * 0.12);
  // een gouden plantenbak en een plant
  box(0.42, 0.42, 0.42, std(0xc9a04a, { roughness: 0.5 }), 1.3, 0.21, D / 2 - 0.7);
  box(0.1, 0.55, 0.1, std(0x5b6b46), 1.3, 0.68, D / 2 - 0.7);
  for (let k = 0; k < 5; k++) box(0.5, 0.05, 0.5, std(0x6f8a55), 1.3 + (k % 2 ? 0.12 : -0.1), 0.95 + k * 0.08, D / 2 - 0.7);

  // het whiteboard met de naam, op de wand achter de bezoekers
  const board = add(keep(new THREE.PlaneGeometry(3.0, 1.5)), keep(new THREE.MeshBasicMaterial({ map: keep(signTex()) })), -W / 2 + 0.06, 1.62, 0);
  board.rotation.y = Math.PI / 2;
  box(3.1, 0.06, 0.08, std(0x9aa0a6), -W / 2 + 0.08, 0.86, 0);
  // twee bezoekersstoelen en een tafel
  const chair = std(0x2c3a4a, { roughness: 0.7 });
  for (const v of [-1.05, 1.05]) {
    box(0.5, 0.06, 0.5, chair, 0.35, 0.48, v);
    box(0.5, 0.55, 0.06, chair, 0.35, 0.75, v + (v > 0 ? 0.22 : -0.22));
    box(0.06, 0.44, 0.06, leg, 0.35, 0.22, v);
  }
  box(0.75, 0.05, 0.75, std(0x8c6a44, { roughness: 0.6 }), 0.35, 0.52, 0);
  // plafondlampen
  for (const u of [-1.4, 1.2]) {
    box(1.3, 0.08, 0.28, std(0xf2f0e2, { emissive: 0xfff2cc, emissiveIntensity: 1.4 }), u, H - 0.12, 0);
  }

  return {
    group,
    dispose() {
      for (const o of own) { if (o && typeof o.dispose === 'function') o.dispose(); }
    },
  };
}
