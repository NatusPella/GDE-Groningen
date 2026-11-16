import * as THREE from 'three';
import { canvasTex as sharedCanvasTex } from './canvastex.js';

// #950: het kantoor van Wiebelwerk, voor het gesprek met de accountmanager (M18).
// De scène stond in een weiland omdat het doelpunt een schatting op de kaart was;
// nu speelt het gesprek in een klein kantoorset op de plek van het echte pand,
// met een bureau, een scherm, een whiteboard en een glazen wand. Alleen de
// binnenkant is ooit in beeld. Plan: u langs wereld-x, v langs wereld-y, h omhoog;
// het bureau staat op +u, de bezoekers op de oorsprong.
// #956: dezelfde opbouw voor de serverkamer (buildServerRoom), met de rekken, de
// kabelbaan en de terminal waar Tessa het logboek leest.

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

  // #955: het kantoor is een kamer, geen decorstuk: warm licht van boven, een schemerige
  // hoek bij het glas en de spullen die je op een intake ziet. Zonder licht bleef het
  // interieur een donker blok naast de zon van de wereld.
  const lampWarm = new THREE.PointLight(0xffe6c4, 2.8, 8.5, 1.7);
  lampWarm.position.set(-1.2, H - 0.4, 0.2);
  group.add(lampWarm);
  const lampKoel = new THREE.PointLight(0xdce9f2, 1.5, 7, 1.9);
  lampKoel.position.set(2.6, 2.1, -0.4);
  group.add(lampKoel);
  group.add(new THREE.AmbientLight(0xfff2e2, 0.55));
  // een schemerlamp op het bureau en de spullen van een werkdag
  box(0.03, 0.5, 0.03, leg, OFFICE.deskU - 0.4, OFFICE.deskH + 0.25, 1.05);
  const lampShade = add(keep(new THREE.ConeGeometry(0.16, 0.16, 12, 1, true)), keep(new THREE.MeshStandardMaterial({ color: 0xe8dcc0, emissive: 0xffd9a0, emissiveIntensity: 0.7, side: THREE.DoubleSide })), OFFICE.deskU - 0.4, OFFICE.deskH + 0.52, 1.05);
  lampShade.rotation.x = Math.PI;
  // kapstok bij de deur, koffiezetapparaat op een kast, printer en een klok
  box(0.1, 2.0, 1.2, std(0x5b4634, { roughness: 0.7 }), -W / 2 + 0.5, 1.0, -D / 2 + 0.55);
  for (const v of [-0.25, 0.25]) box(0.06, 0.06, 0.5, std(0x3a2f26), -W / 2 + 0.5, 1.9, -D / 2 + 0.55 + v);
  box(0.9, 0.9, 0.45, std(0xd9d4c8, { roughness: 0.6 }), 1.3, 0.45, -D / 2 + 0.35);
  box(0.42, 0.62, 0.36, std(0x2a2d31, { roughness: 0.4 }), 1.3, 1.2, -D / 2 + 0.35);
  box(0.18, 0.1, 0.06, std(0x8a9096), 1.3, 1.0, -D / 2 + 0.55);
  box(0.7, 0.55, 0.5, std(0xcfcac0, { roughness: 0.6 }), 2.9, 0.85, D / 2 - 0.45);
  box(0.62, 0.06, 0.42, std(0xe8e2d2), 2.9, 1.16, D / 2 - 0.45);
  const clockFace = add(keep(new THREE.CircleGeometry(0.24, 20)), keep(new THREE.MeshBasicMaterial({ color: 0xf4f1e8 })), -W / 2 + 0.07, 2.05, 1.6);
  clockFace.rotation.y = Math.PI / 2;
  box(0.02, 0.18, 0.015, std(0x2a2a2a), -W / 2 + 0.06, 2.11, 1.58);
  box(0.02, 0.015, 0.13, std(0x2a2a2a), -W / 2 + 0.06, 2.05, 1.65);
  // papieren en een klembord op het blad, een kabel onder het bureau
  box(0.3, 0.015, 0.22, std(0xf4f1e8), OFFICE.deskU - 0.2, OFFICE.deskH + 0.04, -0.55);
  box(0.32, 0.012, 0.24, std(0xd9c9a8), OFFICE.deskU - 0.55, OFFICE.deskH + 0.04, 0.75);
  box(0.06, 0.02, 0.5, std(0x1d1f22), OFFICE.deskU + 0.2, 0.03, 0.4);
  box(0.02, 0.03, 0.06, std(0x15171a), OFFICE.deskU + 0.2, 0.06, 1.05);
  // een tweede plant bij het glas
  box(0.34, 0.34, 0.34, std(0x9c7a4a, { roughness: 0.5 }), -2.8, 0.17, D / 2 - 0.6);
  for (let k = 0; k < 4; k++) box(0.4, 0.04, 0.4, std(0x557a46), -2.8 + (k % 2 ? 0.08 : -0.08), 0.5 + k * 0.12, D / 2 - 0.6);

  return {
    group,
    dispose() {
      for (const o of own) { if (o && typeof o.dispose === 'function') o.dispose(); }
    },
  };
}

// #956: de serverkamer van Wiebelwerk, op dezelfde manier opgebouwd als het kantoor (een
// kamer van binnen, de camera blijft erin). Een lange hal met twee rijen rekken, een
// kabelbaan boven de gang, een terminal aan het eind en koel licht. De maten zijn ruim
// genoeg voor de scène van M18.3: het scherm staat op +u 4.6 en de camera's blijven
// binnen de wanden.
export const SERVER = {
  w: 11,
  d: 6.4,
  h: 2.9,
  deskU: 4.5,
  deskH: 0.78,
};

function serverWallTex() {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#3d444b'; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255, 255, 255, 0.04)';
    for (let y = 0; y < h; y += 42) g.fillRect(0, y, w, 2);
    g.fillStyle = 'rgba(0, 0, 0, 0.12)';
    for (let x = 0; x < w; x += 64) g.fillRect(x, 0, 2, h);
  });
}

function serverFloorTex() {
  const t = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#2b3035'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(0, 0, 0, 0.35)'; g.lineWidth = 2;
    for (let y = 0; y <= h; y += 64) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    for (let x = 0; x <= w; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
    g.fillStyle = 'rgba(255, 255, 255, 0.05)';
    for (let x = 8; x < w; x += 64) for (let y = 8; y < h; y += 64) g.fillRect(x, y, 4, 4);
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(4, 3);
  return t;
}

function serverScreenTex() {
  return canvasTex(512, 384, (g, w, h) => {
    g.fillStyle = '#0b1a14'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#d7f7e4'; g.font = 'bold 30px monospace'; g.fillText('WIEBELWERK / logboek', 26, 46);
    g.fillStyle = '#63e08a'; g.font = '24px monospace';
    const rows = ['12 aug 00:00  update 3 min', '12 aug 00:02  zijdeur open', '12 aug 00:03  pas bewaker 2', '12 aug 00:11  update klaar', '12 aug 00:11  Us Mem Snacks'];
    rows.forEach((r, i) => g.fillText(r, 26, 100 + i * 44));
    g.fillStyle = '#2b5d43';
    for (let y = 330; y < 372; y += 8) g.fillRect(26, y, 210 + (y % 24) * 2, 3);
  });
}

export function buildServerRoom(x, y, z) {
  const group = new THREE.Group();
  group.position.set(x, z, y);
  const own = [];
  const keep = (o) => { own.push(o); return o; };
  const std = (color, extra = {}) => keep(new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...extra }));
  const geoBox = (w, h, d) => keep(new THREE.BoxGeometry(w, h, d));
  const add = (geo, mat, u, h, v, parent = group) => { const m = new THREE.Mesh(geo, mat); m.position.set(u, h, v); parent.add(m); return m; };
  const box = (w, h, d, mat, u, hh, v, parent) => add(geoBox(w, h, d), mat, u, hh, v, parent);
  const W = SERVER.w, D = SERVER.d, H = SERVER.h;

  // de hal van binnen: beton, een tegelvloer en een donker plafond
  const wall = keep(new THREE.MeshBasicMaterial({ map: keep(serverWallTex()), side: THREE.BackSide, color: 0xc9d2da }));
  const ceil = keep(new THREE.MeshBasicMaterial({ color: 0x252b30, side: THREE.BackSide }));
  const floorMat = keep(new THREE.MeshStandardMaterial({ map: keep(serverFloorTex()), roughness: 0.9, side: THREE.BackSide }));
  const room = new THREE.Mesh(keep(new THREE.BoxGeometry(W, H, D)), [wall, wall, ceil, floorMat, wall, wall]);
  room.position.y = H / 2;
  group.add(room);

  // twee rijen serverrekken met knipperende ledjes, in de lengterichting van de hal
  const rackMat = std(0x1b2229, { roughness: 0.45, metalness: 0.35 });
  const rackFront = std(0x11161b, { roughness: 0.6 });
  const ledMats = [];
  const rackAt = (u, v) => {
    box(0.95, 2.1, 0.72, rackMat, u, 1.05, v);
    box(0.8, 1.9, 0.03, rackFront, u, 1.05, v + (v > 0 ? -0.37 : 0.37));
    for (let k = 0; k < 5; k++) {
      const m = keep(new THREE.MeshBasicMaterial({ color: 0x2f6b46 }));
      box(0.05, 0.03, 0.02, m, u - 0.32 + (k % 2) * 0.64, 1.55 - Math.floor(k / 2) * 0.22, v + (v > 0 ? -0.39 : 0.39));
      ledMats.push(m);
    }
  };
  for (const v of [-D / 2 + 0.55, D / 2 - 0.55]) for (let u = -4.6; u <= 3.4; u += 1.35) rackAt(u, v);
  // de kabelbaan boven de gang
  for (const v of [-1.2, 1.2]) {
    box(W - 1.6, 0.08, 0.16, std(0x3b444c, { metalness: 0.4, roughness: 0.4 }), -0.2, H - 0.25, v);
    for (let u = -4.2; u <= 4.2; u += 0.7) box(0.05, 0.18, 0.14, std(0x20262b), u, H - 0.4, v);
  }
  // de terminal: scherm met het logboek, toetsenbord en een stoel
  const desk = std(0x2a3138, { roughness: 0.55 });
  box(1.0, 0.06, 2.0, desk, SERVER.deskU, SERVER.deskH, 0);
  for (const v of [-0.92, 0.92]) box(0.07, SERVER.deskH - 0.06, 0.07, std(0x151a1e), SERVER.deskU + 0.44, (SERVER.deskH - 0.06) / 2, v);
  const screen = add(keep(new THREE.PlaneGeometry(1.25, 0.8)), keep(new THREE.MeshBasicMaterial({ map: keep(serverScreenTex()) })), SERVER.deskU + 0.05, SERVER.deskH + 0.5, 0);
  screen.rotation.y = -Math.PI / 2;
  box(0.06, 0.04, 0.72, std(0x0e1114), SERVER.deskU + 0.18, SERVER.deskH + 0.04, 0);
  box(0.5, 0.5, 0.5, std(0x22292f, { roughness: 0.7 }), SERVER.deskU - 0.55, 0.5, 0);
  // de deur met een toetsenbord en een koelunit
  box(0.08, 2.1, 1.1, std(0x30383f, { roughness: 0.5, metalness: 0.3 }), -W / 2 + 0.06, 1.05, 1.9);
  box(0.06, 0.24, 0.16, std(0x0d1013), -W / 2 + 0.12, 1.35, 1.45);
  box(0.9, 1.5, 0.55, std(0xbec7cd, { roughness: 0.5, metalness: 0.2 }), -W / 2 + 0.5, 0.75, -D / 2 + 0.6);
  for (let k = 0; k < 6; k++) box(0.7, 0.03, 0.02, std(0x7f8a92), -W / 2 + 0.5, 0.25 + k * 0.18, -D / 2 + 0.9);
  // koel, groenachtig licht en de gloed van het scherm
  const koel = new THREE.PointLight(0xbfe3ff, 3.2, 9, 1.8);
  koel.position.set(-1.2, H - 0.5, 0);
  group.add(koel);
  const koel2 = new THREE.PointLight(0x9fd8c0, 2.2, 8, 1.9);
  koel2.position.set(2.6, H - 0.6, 0.4);
  group.add(koel2);
  const schermGloed = new THREE.PointLight(0x7fe0b0, 1.2, 4, 2);
  schermGloed.position.set(SERVER.deskU - 0.2, SERVER.deskH + 0.6, 0);
  group.add(schermGloed);
  group.add(new THREE.AmbientLight(0xcfe2ee, 0.42));

  return {
    group,
    // de ledjes knipperen: de serverkamer is in bedrijf tijdens het lezen van het logboek
    frame(t) {
      for (let i = 0; i < ledMats.length; i++) {
        const on = Math.sin(t * (1.6 + (i % 5) * 0.28) + i * 1.7) > -0.15;
        ledMats[i].color.setHex(on ? (i % 3 === 0 ? 0x63e08a : i % 3 === 1 ? 0xf2c14e : 0x6fb6ff) : 0x1d2b24);
      }
    },
    dispose() {
      for (const o of own) { if (o && typeof o.dispose === 'function') o.dispose(); }
    },
  };
}
