import * as THREE from 'three';
import { adoptSetLight } from './setlights.js';
import { canvasTex as sharedCanvasTex } from './canvastex.js';

// #956: Oma Trijntje's kitchen at the Noorderhaven as a room for M25, where the
// practice round of eierballen is baked and Jelle makes his offer. The old
// mission baked at a spot in the open air; the stove, the table with the five
// ingredients and the Delft tiles are now around the player. Only the inside is
// in view. Plan: u along world x, v along world y, h up; the stove is at +u and
// the table with the window at -u.
export const OMA_KEUKEN = {
  w: 8.4,
  d: 6.0,
  h: 2.8,
  stoveU: 2.55,
  counterH: 0.92,
  tableU: -1.3,
  tableH: 0.77,
};

const canvasTex = (w, h, draw) => sharedCanvasTex(w, h, draw, { anisotropy: 4 });

function wallTex() {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#dfd0ad'; g.fillRect(0, 0, w, h);
    // the lower half is white Delft tile with a thin blue line, the upper half warm plaster
    g.fillStyle = '#f2efe6'; g.fillRect(0, h * 0.48, w, h * 0.52);
    g.strokeStyle = 'rgba(60, 90, 120, 0.35)'; g.lineWidth = 2;
    for (let x = 0; x < w; x += 32) { g.beginPath(); g.moveTo(x, h * 0.48); g.lineTo(x, h); g.stroke(); }
    for (let y = h * 0.48; y < h; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    g.fillStyle = 'rgba(255, 255, 255, 0.10)';
    for (let x = 6; x < w; x += 64) g.fillRect(x, h * 0.52, 8, 8);
    const r = g.createLinearGradient(0, 0, 0, h);
    r.addColorStop(0, 'rgba(50, 35, 18, 0.12)'); r.addColorStop(0.55, 'rgba(0, 0, 0, 0)'); r.addColorStop(1, 'rgba(50, 35, 18, 0.16)');
    g.fillStyle = r; g.fillRect(0, 0, w, h);
  });
}

function floorTex() {
  const t = canvasTex(256, 256, (g, w, h) => {
    // wide old floorboards
    for (let y = 0; y < h; y += 32) {
      g.fillStyle = y % 64 ? '#9a774d' : '#8d6c45'; g.fillRect(0, y, w, 32);
      g.fillStyle = 'rgba(50, 30, 12, 0.22)'; g.fillRect(0, y + 30, w, 2);
      g.fillStyle = 'rgba(255, 235, 200, 0.05)'; g.fillRect(0, y + 3, w, 2);
    }
    g.strokeStyle = 'rgba(50, 30, 12, 0.18)'; g.lineWidth = 1;
    for (let x = 0; x < w; x += 80) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 2.5);
  return t;
}

function windowTex() {
  return canvasTex(512, 384, (g, w, h) => {
    const sky = g.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#a9d3e8'); sky.addColorStop(0.6, '#d8e7d4'); sky.addColorStop(1, '#f0e2bd');
    g.fillStyle = sky; g.fillRect(0, 0, w, h);
    // the Noorderhaven: low houses, a bridge and a moored sloep
    g.fillStyle = '#5c4a3a';
    let x = -10;
    while (x < w) {
      const rw = 52 + ((x * 31) % 42), top = 214 + ((x * 17) % 24);
      g.fillStyle = (x * 7) % 3 ? '#8a6a4a' : '#7a5c40';
      g.fillRect(x, top, rw, h - top);
      g.fillStyle = '#3a2a20';
      g.beginPath(); g.moveTo(x - 4, top); g.lineTo(x + rw / 2, top - 28); g.lineTo(x + rw + 4, top); g.fill();
      g.fillStyle = '#f2d79a';
      for (let wx = x + 8; wx < x + rw - 10; wx += 18) g.fillRect(wx, top + 12, 9, 12);
      x += rw + 4;
    }
    g.fillStyle = '#2f4a3a'; g.fillRect(0, h - 76, w, 76);
    g.fillStyle = '#6a3a2a';
    g.fillRect(70, 258, 12, 50); g.fillRect(150, 258, 12, 50);
    g.fillRect(58, 262, 116, 8);
    g.fillStyle = '#3a5a6a'; g.beginPath(); g.moveTo(300, 330); g.lineTo(410, 330); g.lineTo(392, 356); g.lineTo(318, 356); g.fill();
  });
}

function tileTex() {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#f2efe6'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(50, 80, 120, 0.4)'; g.lineWidth = 2;
    for (let y = 0; y < h; y += 32) for (let x = 0; x < w; x += 32) g.strokeRect(x + 1, y + 1, 30, 30);
    // a small blue windmill on one tile
    g.strokeStyle = '#315a86'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(80, 210); g.lineTo(110, 210); g.lineTo(105, 160); g.lineTo(85, 160); g.closePath(); g.stroke();
    for (const a of [0.4, 2.0, 3.6, 5.2]) { g.beginPath(); g.moveTo(95, 148); g.lineTo(95 + Math.cos(a) * 34, 148 + Math.sin(a) * 34); g.stroke(); }
  });
}

function recipeTex() {
  return canvasTex(320, 420, (g, w, h) => {
    g.fillStyle = '#fbf6e8'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#7a1f1f'; g.font = 'bold 30px Georgia, serif'; g.fillText('EIERBAL', 24, 48);
    g.fillStyle = '#3a2a1a'; g.font = '20px Georgia, serif';
    const rows = ['1. ei', '2. zout', '3. grof meel', '4. vet', '5. mosterd'];
    rows.forEach((r, i) => g.fillText(r, 28, 104 + i * 38));
    g.strokeStyle = '#8a6a44'; g.lineWidth = 2; g.strokeRect(12, 12, w - 24, h - 24);
    g.fillStyle = 'rgba(120, 80, 40, 0.12)'; g.fillRect(22, 330, 170, 4); g.fillRect(22, 352, 130, 4);
  });
}

function signTex(text) {
  return canvasTex(512, 128, (g, w, h) => {
    g.fillStyle = '#f4efe2'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#8a6a44'; g.lineWidth = 6; g.strokeRect(4, 4, w - 8, h - 8);
    g.fillStyle = '#7a1f1f'; g.font = 'bold 56px Georgia, serif'; g.textAlign = 'center'; g.fillText(text, w / 2, 84);
  });
}

export function buildOmaKitchen(x, y, z) {
  const group = new THREE.Group();
  group.position.set(x, z, y);
  const own = [];
  const keep = (o) => { own.push(o); return o; };
  const std = (color, extra = {}) => keep(new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...extra }));
  const geoBox = (w, h, d) => keep(new THREE.BoxGeometry(w, h, d));
  const add = (geo, mat, u, h, v, parent = group) => { const m = new THREE.Mesh(geo, mat); m.position.set(u, h, v); parent.add(m); return m; };
  const box = (w, h, d, mat, u, hh, v, parent) => add(geoBox(w, h, d), mat, u, hh, v, parent);
  const cyl = (r, hh, mat, u, h, v, seg = 12) => add(keep(new THREE.CylinderGeometry(r, r, hh, seg)), mat, u, h, v);
  const W = OMA_KEUKEN.w, D = OMA_KEUKEN.d, H = OMA_KEUKEN.h;

  // the room: plaster above, Delft tiles below, old boards on the floor
  const wall = keep(new THREE.MeshBasicMaterial({ map: keep(wallTex()), side: THREE.BackSide, color: 0xf3ead6 }));
  const ceil = keep(new THREE.MeshBasicMaterial({ color: 0xd9cdb4, side: THREE.BackSide }));
  const floorMat = keep(new THREE.MeshStandardMaterial({ map: keep(floorTex()), roughness: 0.9, side: THREE.BackSide }));
  const room = new THREE.Mesh(keep(new THREE.BoxGeometry(W, H, D)), [wall, wall, ceil, floorMat, wall, wall]);
  room.position.y = H / 2;
  group.add(room);

  // the stove and the counter along the +u wall
  const stove = std(0xe6e2d8, { roughness: 0.5 }), black = std(0x1d1f21, { roughness: 0.4, metalness: 0.3 });
  box(1.6, OMA_KEUKEN.counterH, 2.6, std(0xb99a74, { roughness: 0.7 }), OMA_KEUKEN.stoveU, OMA_KEUKEN.counterH / 2, 0.5);
  box(1.62, 0.06, 2.64, std(0xd9cfba), OMA_KEUKEN.stoveU, OMA_KEUKEN.counterH, 0.5);
  box(0.9, 0.14, 0.7, black, OMA_KEUKEN.stoveU - 0.25, OMA_KEUKEN.counterH + 0.04, -0.35);
  for (const v of [-0.7, 0.15, 1.0]) cyl(0.16, 0.03, black, OMA_KEUKEN.stoveU - 0.25, OMA_KEUKEN.counterH + 0.12, v, 10);
  // the pan on the fire, with a lid and a wooden spoon
  cyl(0.3, 0.2, black, OMA_KEUKEN.stoveU - 0.25, OMA_KEUKEN.counterH + 0.22, -0.35, 16);
  cyl(0.31, 0.04, std(0x8a9096, { metalness: 0.5, roughness: 0.4 }), OMA_KEUKEN.stoveU - 0.25, OMA_KEUKEN.counterH + 0.34, -0.35, 16);
  box(0.04, 0.04, 0.62, std(0x8a6238), OMA_KEUKEN.stoveU - 0.55, OMA_KEUKEN.counterH + 0.3, 0.05);
  // the oven door and its warm light
  box(0.04, 0.6, 0.8, std(0x2a2d30, { roughness: 0.35 }), OMA_KEUKEN.stoveU - 0.82, 0.32, 0.5);
  const ovenGlow = adoptSetLight(new THREE.PointLight(0xff9a3a, 1.6, 3.2, 2));
  ovenGlow.position.set(OMA_KEUKEN.stoveU - 0.9, 0.4, 0.5);
  group.add(ovenGlow);
  // upper cupboards, a shelf with jars and hanging pans
  box(0.5, 0.9, 2.4, std(0x8a6a44, { roughness: 0.7 }), OMA_KEUKEN.stoveU + 0.45, 2.2, 0.6);
  for (const v of [-0.2, 0.7, 1.4]) cyl(0.09, 0.22, std(0xc9b48a, { roughness: 0.6 }), OMA_KEUKEN.stoveU + 0.12, 1.72, v, 8);
  for (const v of [-0.8, 0.0, 0.8]) {
    cyl(0.19, 0.05, std(0x3a3f45, { metalness: 0.4 }), OMA_KEUKEN.stoveU + 0.2, 1.5, v, 12);
    box(0.03, 0.55, 0.03, std(0x8a9096), OMA_KEUKEN.stoveU + 0.2, 1.78, v);
  }
  // the table where the ingredients stand, with a checked cloth
  const table = std(0x8a6238, { roughness: 0.7 });
  box(1.9, 0.06, 1.2, table, OMA_KEUKEN.tableU, OMA_KEUKEN.tableH, -0.6);
  box(1.98, 0.02, 1.28, std(0xdfe6df, { roughness: 0.9 }), OMA_KEUKEN.tableU, OMA_KEUKEN.tableH + 0.04, -0.6);
  for (const [u, v] of [[-2.15, -1.12], [-2.15, -0.08], [-0.45, -1.12], [-0.45, -0.08]]) box(0.07, OMA_KEUKEN.tableH - 0.06, 0.07, table, u, (OMA_KEUKEN.tableH - 0.06) / 2, v);
  // five ingredients: an egg basket, salt, flour, fat and mustard
  const eggMat = std(0xf2ead6, { roughness: 0.8 });
  for (let k = 0; k < 6; k++) add(keep(new THREE.SphereGeometry(0.075, 10, 8)), eggMat, OMA_KEUKEN.tableU - 0.55 + (k % 3) * 0.14, OMA_KEUKEN.tableH + 0.14, -0.85 + Math.floor(k / 3) * 0.12).scale.set(1, 1.25, 1);
  box(0.18, 0.24, 0.18, std(0xdfe6df, { roughness: 0.6 }), OMA_KEUKEN.tableU - 0.05, OMA_KEUKEN.tableH + 0.16, -0.85);
  box(0.34, 0.5, 0.24, std(0xd9c9a8, { roughness: 0.8 }), OMA_KEUKEN.tableU + 0.45, OMA_KEUKEN.tableH + 0.29, -0.55);
  box(0.26, 0.22, 0.2, std(0xc9c0a8, { roughness: 0.7 }), OMA_KEUKEN.tableU + 0.42, OMA_KEUKEN.tableH + 0.15, -1.02);
  box(0.16, 0.3, 0.16, std(0xd9c04a, { roughness: 0.5 }), OMA_KEUKEN.tableU + 0.78, OMA_KEUKEN.tableH + 0.19, -0.75);
  // the recipe card on a stand
  const recipe = add(keep(new THREE.PlaneGeometry(0.34, 0.45)), keep(new THREE.MeshBasicMaterial({ map: keep(recipeTex()) })), OMA_KEUKEN.tableU - 0.55, OMA_KEUKEN.tableH + 0.28, -0.2);
  recipe.rotation.y = 0.55;
  box(0.05, 0.22, 0.05, table, OMA_KEUKEN.tableU - 0.55, OMA_KEUKEN.tableH + 0.11, -0.2);
  // chairs and a little stool
  for (const [u, v, face] of [[-2.2, -1.4, -0.4], [-0.4, -1.9, 1.2], [0.6, 0.3, 2.2]]) {
    box(0.48, 0.06, 0.48, std(0x6b4a2a), u, 0.46, v);
    box(0.48, 0.52, 0.06, std(0x6b4a2a), u + Math.cos(face) * 0.2, 0.72, v + Math.sin(face) * 0.2);
    box(0.05, 0.44, 0.05, std(0x3a2a1a), u, 0.22, v);
  }
  // the window over the sink, with the Noorderhaven outside
  const glass = new THREE.Mesh(keep(new THREE.PlaneGeometry(2.2, 1.35)), keep(new THREE.MeshBasicMaterial({ map: keep(windowTex()) })));
  glass.position.set(-W / 2 + 0.06, 1.7, -1.1);
  glass.rotation.y = Math.PI / 2;
  group.add(glass);
  for (const v of [-2.2, 0, 2.2]) box(0.08, 1.45, 0.08, std(0xf4efe2), -W / 2 + 0.1, 1.7, v);
  box(0.08, 0.08, 2.2, std(0xf4efe2), -W / 2 + 0.1, 2.42, 0);
  // the sink and a tea towel
  box(0.5, 0.1, 1.0, std(0xc9d2da, { metalness: 0.3, roughness: 0.4 }), -W / 2 + 0.5, 1.0, -1.1);
  box(0.05, 0.3, 0.4, std(0xf4efe2), -W / 2 + 0.82, 1.2, -1.1);
  // a radio on the shelf and a clock above the table
  box(0.36, 0.24, 0.2, std(0x6b4526, { roughness: 0.6 }), -W / 2 + 0.3, 2.1, 1.8);
  const radio = add(keep(new THREE.PlaneGeometry(0.2, 0.12)), keep(new THREE.MeshBasicMaterial({ color: 0x1a3d2a })), -W / 2 + 0.39, 2.13, 1.8);
  radio.rotation.y = Math.PI / 2;  const clockFace = add(keep(new THREE.CircleGeometry(0.24, 20)), keep(new THREE.MeshBasicMaterial({ color: 0xf4f1e8 })), -W / 2 + 0.07, 2.35, 0.9);
  clockFace.rotation.y = Math.PI / 2;
  box(0.02, 0.16, 0.015, std(0x2a2a2a), -W / 2 + 0.06, 2.4, 0.88);
  box(0.02, 0.015, 0.12, std(0x2a2a2a), -W / 2 + 0.06, 2.35, 0.95);
  // the sign above the stove, the plants and the cat's basket
  const sign = add(keep(new THREE.PlaneGeometry(1.3, 0.33)), keep(new THREE.MeshBasicMaterial({ map: keep(signTex('BIJ OMA')) })), OMA_KEUKEN.stoveU + 0.44, 2.6, 0.0);
  sign.rotation.y = -Math.PI / 2;
  for (const [u, v] of [[-3.6, 2.3], [0.2, -2.5], [3.2, -2.3]]) {
    box(0.36, 0.36, 0.36, std(0x9c7a4a, { roughness: 0.5 }), u, 0.18, v);
    for (let k = 0; k < 4; k++) box(0.42, 0.04, 0.42, std(0x557a46), u + (k % 2 ? 0.06 : -0.06), 0.45 + k * 0.11, v);
  }
  box(0.7, 0.18, 0.55, std(0x8a6a4a), 1.2, 0.09, 2.2);
  // a bulb over the table, warm as an old kitchen
  const lamp = adoptSetLight(new THREE.PointLight(0xffd9a0, 2.6, 8.0, 1.8));
  lamp.position.set(-0.9, H - 0.35, 0.0);
  group.add(lamp);
  const lamp2 = adoptSetLight(new THREE.PointLight(0xffe6c4, 1.3, 6.0, 1.9));
  lamp2.position.set(2.0, 2.1, 0.6);
  group.add(lamp2);
  group.add(new THREE.AmbientLight(0xfff2df, 0.55));
  box(0.26, 0.2, 0.26, std(0x2a2a2a), -0.9, H - 0.18, 0.0);
  cyl(0.16, 0.1, std(0xf2ead6, { emissive: 0xffe2b0, emissiveIntensity: 1.4 }), -0.9, H - 0.32, 0.0, 12);

  // the steam of the pan: three soft planes that rise and fade
  const steams = [];
  for (let k = 0; k < 3; k++) {
    const s = add(keep(new THREE.PlaneGeometry(0.24, 0.34)), keep(new THREE.MeshBasicMaterial({ color: 0xf4f1e8, transparent: true, opacity: 0.0, depthWrite: false })), OMA_KEUKEN.stoveU - 0.25, OMA_KEUKEN.counterH + 0.45, -0.35);
    s.rotation.y = -Math.PI / 2;
    steams.push(s);
  }

  return {
    group,
    frame(t) {
      // the oven breathes and the steam rises from the pan; cheap and always in view
      ovenGlow.intensity = 1.3 + Math.sin(t * 5.2) * 0.35;
      for (let k = 0; k < steams.length; k++) {
        const s = steams[k], u = (t * 0.35 + k / 3) % 1;
        s.position.y = OMA_KEUKEN.counterH + 0.45 + u * 0.8;
        s.material.opacity = Math.sin(u * Math.PI) * 0.18;
        s.position.x = OMA_KEUKEN.stoveU - 0.25 + Math.sin(t * 1.3 + k) * 0.06;
      }
    },
    dispose() {
      for (const o of own) { if (o && typeof o.dispose === 'function') o.dispose(); }
    },
  };
}
