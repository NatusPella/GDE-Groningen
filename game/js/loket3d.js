import * as THREE from 'three';
import { canvasTex as sharedCanvasTex } from './canvastex.js';

// #956: the Loket of the Stadhuis on the Grote Markt as a real waiting room, for
// M03. The mission used to queue on the square and collect forms at points on the
// pavement; the conversation, the number screen and the three counters are now a
// room around the player. Only the inside is ever in view. Plan: u along world x,
// v along world y, h up; the counters stand at +u, the queue and the door at -u.
export const LOKET = {
  w: 12,
  d: 7.4,
  h: 3.0,
  counterU: 3.6,   // front of the counter
  counterH: 1.08,
  clerkU: 4.35,    // the clerks stand behind it
  doorU: -5.55,
};

const canvasTex = (w, h, draw) => sharedCanvasTex(w, h, draw, { anisotropy: 4 });

function wallTex() {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#eee7d8'; g.fillRect(0, 0, w, h);
    // a wooden wainscot along the bottom of the hall
    g.fillStyle = '#8a6a44'; g.fillRect(0, h * 0.55, w, h * 0.45);
    g.fillStyle = 'rgba(60, 40, 20, 0.18)';
    for (let x = 0; x < w; x += 42) g.fillRect(x, h * 0.55, 2, h * 0.45);
    g.fillStyle = 'rgba(255, 255, 255, 0.10)';
    for (let y = 0; y < h * 0.55; y += 48) g.fillRect(0, y, w, 2);
    const r = g.createLinearGradient(0, 0, 0, h);
    r.addColorStop(0, 'rgba(40, 30, 20, 0.10)'); r.addColorStop(0.5, 'rgba(0, 0, 0, 0)'); r.addColorStop(1, 'rgba(40, 30, 20, 0.12)');
    g.fillStyle = r; g.fillRect(0, 0, w, h);
  });
}

function floorTex() {
  const t = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#b9b2a2'; g.fillRect(0, 0, w, h);
    // pale terrazzo tiles with a darker joint
    for (let y = 0; y < h; y += 64) for (let x = 0; x < w; x += 64) {
      g.fillStyle = (x / 64 + y / 64) % 2 ? '#c6bfae' : '#b3ac9c';
      g.fillRect(x + 1, y + 1, 62, 62);
    }
    g.fillStyle = 'rgba(70, 64, 54, 0.20)';
    for (let k = 0; k < 64; k++) g.fillRect((k * 53) % w, (k * 97) % h, 2, 2);
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(4, 3);
  return t;
}

function signTex(title, sub = '') {
  return canvasTex(512, 256, (g, w, h) => {
    g.fillStyle = '#0f4a2c'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#f0ede4'; g.textAlign = 'center';
    g.font = 'bold 84px Arial, sans-serif'; g.fillText(title, w / 2, 112);
    if (sub) { g.font = '34px Arial, sans-serif'; g.fillText(sub, w / 2, 176); }
    g.strokeStyle = '#c9a04a'; g.lineWidth = 8; g.strokeRect(10, 10, w - 20, h - 20);
  });
}

function numberTex(number) {
  return canvasTex(512, 192, (g, w, h) => {
    g.fillStyle = '#121816'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#0f4a2c'; g.fillRect(0, 0, w, 34);
    g.fillStyle = '#f0ede4'; g.textAlign = 'left'; g.font = 'bold 22px monospace';
    g.fillText('STADHUIS  ·  LOKETTEN', 18, 25);
    g.textAlign = 'right'; g.fillStyle = '#63e08a'; g.font = 'bold 72px monospace';
    g.fillText(number, w - 26, 128);
    g.fillStyle = '#9aa89e'; g.font = '24px monospace';
    g.fillText('A   B   C', w - 26, 168);
  });
}

function posterTex(kind) {
  return canvasTex(256, 352, (g, w, h) => {
    g.fillStyle = '#f4efe2'; g.fillRect(0, 0, w, h);
    if (kind === 0) {
      g.fillStyle = '#0f4a2c'; g.fillRect(0, 0, w, 54);
      g.fillStyle = '#f4efe2'; g.font = 'bold 28px Arial, sans-serif'; g.fillText('NOORDELIJKE', 18, 38);
      g.fillStyle = '#7a1f1f'; g.font = 'bold 56px Arial, sans-serif'; g.fillText('SNACK', 18, 132);
      g.fillText('PRIJS', 18, 190);
      g.fillStyle = '#2a2a2a'; g.font = '20px Arial, sans-serif';
      for (let y = 236; y < 320; y += 22) g.fillRect(18, y, 150 + ((y * 7) % 60), 3);
    } else {
      g.fillStyle = '#1a3d66'; g.fillRect(0, 0, w, 54);
      g.fillStyle = '#f4efe2'; g.font = 'bold 26px Arial, sans-serif'; g.fillText('FORMULIER 7B', 18, 38);
      g.fillStyle = '#2a2a2a'; g.font = '18px Arial, sans-serif';
      g.fillText('In drievoud. Niet vouwen.', 18, 92);
      for (let y = 126; y < 318; y += 24) g.fillRect(18, y, 150 + ((y * 11) % 70), 2);
    }
  });
}

export function buildLoket(x, y, z) {
  const group = new THREE.Group();
  group.position.set(x, z, y);
  const own = [];
  const keep = (o) => { own.push(o); return o; };
  const std = (color, extra = {}) => keep(new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...extra }));
  const geoBox = (w, h, d) => keep(new THREE.BoxGeometry(w, h, d));
  const add = (geo, mat, u, h, v, parent = group) => { const m = new THREE.Mesh(geo, mat); m.position.set(u, h, v); parent.add(m); return m; };
  const box = (w, h, d, mat, u, hh, v, parent) => add(geoBox(w, h, d), mat, u, hh, v, parent);
  const W = LOKET.w, D = LOKET.d, H = LOKET.h;

  // the room, seen from the inside: the walls, the terrazzo floor and a soft ceiling
  const wall = keep(new THREE.MeshBasicMaterial({ map: keep(wallTex()), side: THREE.BackSide, color: 0xf3ecdd }));
  const ceil = keep(new THREE.MeshBasicMaterial({ color: 0x2b302c, side: THREE.BackSide }));
  const floorMat = keep(new THREE.MeshStandardMaterial({ map: keep(floorTex()), roughness: 0.9, side: THREE.BackSide }));
  const room = new THREE.Mesh(keep(new THREE.BoxGeometry(W, H, D)), [wall, wall, ceil, floorMat, wall, wall]);
  room.position.y = H / 2;
  group.add(room);

  // the counter: one long desk with three windows and glass between the clerks and the queue
  const desk = std(0x7c5a36, { roughness: 0.65 }), top = std(0xd9cfba, { roughness: 0.5 });
  const frame = std(0x3d4b42, { roughness: 0.45, metalness: 0.25 });
  box(1.1, 0.06, 5.4, top, LOKET.counterU + 0.25, LOKET.counterH, 0);
  box(0.9, 1.0, 5.4, desk, LOKET.counterU + 0.25, 0.5, 0);
  for (const v of [-2.7, 2.7]) box(0.16, 2.4, 0.16, frame, LOKET.counterU + 0.72, 1.2, v);
  for (const v of [-1.8, 0, 1.8]) box(0.04, 2.2, 0.06, frame, LOKET.counterU + 0.72, 1.2, v);
  // glass above the counter, window by window
  const glass = keep(new THREE.MeshBasicMaterial({ color: 0xbfd8d6, transparent: true, opacity: 0.22, side: THREE.DoubleSide }));
  for (const v of [-1.8, 0, 1.8]) add(keep(new THREE.PlaneGeometry(1.62, 1.45)), glass, LOKET.counterU + 0.72, LOKET.counterH + 0.78, v);
  // the three signs above the windows: A, B and C
  for (const [i, v] of [-1.8, 0, 1.8].entries()) {
    const plate = add(keep(new THREE.PlaneGeometry(1.35, 0.52)), keep(new THREE.MeshBasicMaterial({ map: keep(signTex(String.fromCharCode(65 + i))) })), LOKET.counterU + 0.7, 2.62, v);
    plate.rotation.y = -Math.PI / 2;
  }
  // the number screen on the back wall, above the counters. The hall counts up
  // while the queue moves (M03: 4093, 4101, 4109, then 4117).
  const screenMaps = ['4093', '4101', '4109', '4117'].map((n) => keep(numberTex(n)));
  const screen = add(keep(new THREE.PlaneGeometry(3.2, 1.2)), keep(new THREE.MeshBasicMaterial({ map: screenMaps[0] })), LOKET.counterU + 0.68, 2.25, 2.9);
  screen.rotation.y = -Math.PI / 2;
  let screenStep = 0;
  // a small screen on the desk and a stamp + forms at every window
  for (const v of [-1.8, 0, 1.8]) {
    box(0.06, 0.45, 0.62, std(0x171b1e, { roughness: 0.5 }), LOKET.clerkU + 0.06, LOKET.counterH + 0.3, v);
    box(0.05, 0.03, 0.32, std(0x0d0f12), LOKET.clerkU + 0.04, LOKET.counterH + 0.05, v);
    box(0.14, 0.06, 0.14, std(0x7a1f1f, { roughness: 0.6 }), LOKET.counterU - 0.15, LOKET.counterH + 0.06, v + 0.7);
    box(0.24, 0.015, 0.32, std(0xf4efe2), LOKET.counterU - 0.25, LOKET.counterH + 0.04, v - 0.5);
  }
  // the queue: posts and a red rope, a number machine, and a plant
  const brass = std(0xb08a4a, { roughness: 0.35, metalness: 0.55 });
  for (const [u, v] of [[-1.7, -1.9], [-1.7, 1.9], [1.0, -1.9], [1.0, 1.9]]) box(0.08, 1.0, 0.08, brass, u, 0.5, v);
  for (const v of [-1.9, 1.9]) box(2.7, 0.05, 0.05, std(0x8a1f1f, { roughness: 0.7 }), -0.35, 0.93, v);
  box(0.5, 1.45, 0.42, std(0xd9d4c6, { roughness: 0.55 }), -3.4, 0.73, 2.7);
  box(0.28, 0.3, 0.05, std(0x121816), -3.4, 1.2, 2.48);
  box(0.1, 0.1, 0.02, std(0x63e08a, { emissive: 0x63e08a, emissiveIntensity: 0.6 }), -3.4, 1.2, 2.45);
  // chairs along the side wall and a second plant by the door
  const chair = std(0x2c3a4a, { roughness: 0.7 });
  for (const u of [-3.0, -1.8, 0.0, 1.2]) {
    box(0.52, 0.06, 0.52, chair, u, 0.48, -D / 2 + 0.75);
    box(0.52, 0.55, 0.06, chair, u, 0.75, -D / 2 + 0.5);
    box(0.06, 0.44, 0.06, std(0x33383d), u, 0.22, -D / 2 + 0.75);
  }
  for (const [u, v] of [[-4.9, -2.9], [-4.9, 2.9], [2.6, -3.15]]) {
    box(0.4, 0.4, 0.4, std(0x9c7a4a, { roughness: 0.5 }), u, 0.2, v);
    for (let k = 0; k < 4; k++) box(0.46, 0.04, 0.46, std(0x557a46), u + (k % 2 ? 0.08 : -0.08), 0.52 + k * 0.12, v);
  }
  // the copier by the side door (the one that is always in the way) and the posters
  box(0.7, 1.05, 0.9, std(0xd6d0c2, { roughness: 0.6 }), -4.7, 0.53, 3.0);
  box(0.5, 0.16, 0.7, std(0x3a3f45), -4.7, 1.1, 3.0);
  for (const [i, v] of [-2.0, 0.2, 2.4].entries()) {
    const p = add(keep(new THREE.PlaneGeometry(0.8, 1.1)), keep(new THREE.MeshBasicMaterial({ map: keep(posterTex(i % 2)) })), -W / 2 + 0.06, 1.6, v);
    p.rotation.y = Math.PI / 2;
  }
  // the door at the back (only a frame and a dark pane), the clock and the ceiling lights
  box(0.08, 2.25, 1.4, std(0x5b4634), LOKET.doorU - 0.02, 1.12, 0);
  box(0.04, 2.0, 1.05, std(0x1a1f1c, { roughness: 0.4 }), LOKET.doorU - 0.08, 1.05, 0);
  const clockFace = add(keep(new THREE.CircleGeometry(0.26, 20)), keep(new THREE.MeshBasicMaterial({ color: 0xf4f1e8 })), -W / 2 + 0.07, 2.25, -0.4);
  clockFace.rotation.y = Math.PI / 2;
  box(0.02, 0.18, 0.015, std(0x2a2a2a), -W / 2 + 0.06, 2.31, -0.42);
  box(0.02, 0.015, 0.13, std(0x2a2a2a), -W / 2 + 0.06, 2.25, -0.35);
  for (const u of [-3.4, -0.4, 2.6]) box(1.5, 0.08, 0.3, std(0xf2f0e2, { emissive: 0xffe9bd, emissiveIntensity: 1.2 }), u, H - 0.12, 0);

  // the light of a public hall: warm from above, cooler from the glass and the screen
  const lampWarm = new THREE.PointLight(0xffe2b8, 3.0, 9.5, 1.7);
  lampWarm.position.set(-1.4, H - 0.45, 0.3);
  group.add(lampWarm);
  const lampKoel = new THREE.PointLight(0xdce9f2, 1.6, 8, 1.9);
  lampKoel.position.set(3.0, 2.2, -0.6);
  group.add(lampKoel);
  group.add(new THREE.AmbientLight(0xfff1df, 0.58));

  return {
    group,
    // the number screen keeps the hall alive: every few seconds the queue moves
    frame(t) {
      const step = t < 2.5 ? 0 : t < 5 ? 1 : t < 8 ? 2 : 3;
      if (step !== screenStep) { screenStep = step; screen.material.map = screenMaps[step]; screen.material.needsUpdate = true; }
    },
    dispose() {
      for (const o of own) { if (o && typeof o.dispose === 'function') o.dispose(); }
    },
  };
}
