import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

// Tessa's kitchen in the Oosterparkwijk at dawn, for the opening of a new
// game: a closed room staged high above the street (only its inside is ever
// in view). Plan coordinates: u along world x, v along world y, h up; the
// table stands at the origin, the window is on the u = -2.2 wall (behind
// Tessa), the door on the v = +1.8 wall.

export const KITCHEN = {
  seatH: 0.46,
  tableH: 0.77,
  anitaSeat: { u: -0.82, v: 0 },
  tammoSeat: { u: 0.82, v: 0 },
  door: { u: 1.3, v: 1.62 },
  radio: { u: -2.06, v: 0.62, h: 1.1 },
  drawing: { u: -0.28, v: 0.06 },
  phone: { u: -0.46, v: -0.3 },
};

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function wallTex() {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#d9c8a6'; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(150, 120, 80, 0.12)';
    for (let x = 0; x < w; x += 32) g.fillRect(x, 0, 12, h);
    const r = g.createLinearGradient(0, 0, 0, h);
    r.addColorStop(0, 'rgba(40, 25, 10, 0.25)'); r.addColorStop(0.5, 'rgba(0, 0, 0, 0)'); r.addColorStop(1, 'rgba(40, 25, 10, 0.3)');
    g.fillStyle = r; g.fillRect(0, 0, w, h);
  });
}

function floorTex() {
  const t = canvasTex(256, 256, (g, w, h) => {
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) {
      g.fillStyle = (i + j) % 2 ? '#8c7b62' : '#c9bb9c';
      g.fillRect(i * 32, j * 32, 32, 32);
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 3);
  return t;
}

// dawn over the rooftops of the Oosterparkwijk, d'Olle Grieze far off
function windowTex() {
  return canvasTex(512, 384, (g, w, h) => {
    const sky = g.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#f4c99a'); sky.addColorStop(0.45, '#ffb070'); sky.addColorStop(0.75, '#ffd9a0'); sky.addColorStop(1, '#f7e7c4');
    g.fillStyle = sky; g.fillRect(0, 0, w, h);
    const sun = g.createRadialGradient(360, 270, 4, 360, 270, 120);
    sun.addColorStop(0, 'rgba(255, 250, 225, 1)'); sun.addColorStop(0.15, 'rgba(255, 228, 170, 0.85)'); sun.addColorStop(1, 'rgba(255, 200, 120, 0)');
    g.fillStyle = sun; g.fillRect(0, 0, w, h);
    g.fillStyle = '#4a3428';
    // the tower: shaft, stages, spire
    g.fillRect(150, 150, 22, 160); g.fillRect(154, 118, 14, 34); g.fillRect(157, 96, 8, 24);
    g.beginPath(); g.moveTo(156, 96); g.lineTo(161, 70); g.lineTo(166, 96); g.fill();
    // rooftops and chimneys
    g.fillStyle = '#3a2a22';
    let x = -10;
    while (x < w) {
      const rw = 50 + ((x * 37) % 40), top = 270 + ((x * 13) % 30);
      g.beginPath(); g.moveTo(x, h); g.lineTo(x, top + 20); g.lineTo(x + rw / 2, top); g.lineTo(x + rw, top + 20); g.lineTo(x + rw, h); g.fill();
      g.fillRect(x + rw * 0.7, top - 4, 7, 20);
      x += rw - 4;
    }
  });
}

function hallTex() {
  return canvasTex(64, 128, (g, w, h) => {
    const r = g.createLinearGradient(0, 0, 0, h);
    r.addColorStop(0, '#1c1612'); r.addColorStop(1, '#3a2c20');
    g.fillStyle = r; g.fillRect(0, 0, w, h);
  });
}

function radioTex() {
  return canvasTex(256, 160, (g, w, h) => {
    g.fillStyle = '#6b4526'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#d8c7a0'; g.fillRect(14, 14, 130, 132);
    g.strokeStyle = '#6b5a3c'; g.lineWidth = 3;
    for (let y = 22; y < 140; y += 9) { g.beginPath(); g.moveTo(18, y); g.lineTo(140, y); g.stroke(); }
    g.fillStyle = '#20180f'; g.fillRect(156, 22, 86, 40);
    g.fillStyle = '#3fc97a'; g.fillRect(160, 26, 78, 32);
    g.fillStyle = '#0d2a18'; g.font = 'bold 15px Arial, sans-serif'; g.fillText('NACHT-', 168, 40); g.fillText('STREEK', 168, 55);
    g.fillStyle = '#2a1c10';
    g.beginPath(); g.arc(176, 110, 18, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(222, 110, 18, 0, Math.PI * 2); g.fill();
  });
}

// the loan papers: a bank letter and handwritten sums
function paperTex(kind) {
  return canvasTex(256, 352, (g, w, h) => {
    g.fillStyle = '#f2eee4'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#4a4a4a';
    if (kind === 0) {
      g.font = 'bold 20px Arial, sans-serif'; g.fillText('BANK VAN GRUNN', 20, 40);
      g.font = '15px Arial, sans-serif'; g.fillText('Uw plan is sympathiek.', 20, 92);
      for (let y = 120; y < 300; y += 18) g.fillRect(20, y, 150 + ((y * 7) % 60), 3);
    } else {
      g.strokeStyle = '#3a4a5a'; g.lineWidth = 2;
      for (let y = 40; y < 320; y += 26) { g.beginPath(); g.moveTo(18, y); for (let x = 18; x < 200; x += 10) g.lineTo(x, y + Math.sin(x * 0.3 + y) * 2); g.stroke(); }
      g.font = 'bold 22px Arial, sans-serif'; g.fillStyle = '#7a1f1f'; g.fillText('€ ???', 150, 330);
    }
  });
}

// Tessa's drawing: a blue chip van with the hatch open
function drawingTex() {
  return canvasTex(512, 360, (g, w, h) => {
    g.fillStyle = '#f5f1e6'; g.fillRect(0, 0, w, h);
    g.lineJoin = 'round';
    g.fillStyle = '#2f6fb5'; g.strokeStyle = '#1a3d66'; g.lineWidth = 5;
    g.beginPath(); g.moveTo(70, 270); g.lineTo(70, 130); g.quadraticCurveTo(74, 96, 110, 96); g.lineTo(400, 96); g.quadraticCurveTo(440, 98, 446, 150); g.lineTo(450, 270); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#fbe9b8'; g.fillRect(140, 128, 190, 70); g.strokeRect(140, 128, 190, 70);
    g.fillStyle = '#e8e2d2'; g.beginPath(); g.moveTo(130, 128); g.lineTo(340, 128); g.lineTo(370, 88); g.lineTo(100, 88); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#3fc97a'; for (let x = 104; x < 366; x += 30) g.fillRect(x, 88, 15, 8);
    g.fillStyle = '#2a2a2a';
    for (const x of [140, 380]) { g.beginPath(); g.arc(x, 274, 30, 0, Math.PI * 2); g.fill(); g.fillStyle = '#9a9a9a'; g.beginPath(); g.arc(x, 274, 11, 0, Math.PI * 2); g.fill(); g.fillStyle = '#2a2a2a'; }
    g.fillStyle = '#f2c230'; g.beginPath(); g.moveTo(230, 82); g.lineTo(250, 30); g.lineTo(270, 82); g.fill();
    g.fillStyle = '#c96a2a'; g.fillRect(232, 46, 4, 30); g.fillRect(244, 40, 4, 36); g.fillRect(256, 44, 4, 32);
    g.fillStyle = '#f5f1e6'; g.font = 'bold 40px Arial Black, Arial, sans-serif'; g.textAlign = 'center';
    g.fillText('FJORD FRITUUR', 258, 245);
    g.fillStyle = '#1a3d66'; g.font = 'italic 22px Arial, sans-serif'; g.fillText('luik!', 236, 172);
    g.strokeStyle = '#555'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(470, 60); g.lineTo(500, 30); g.stroke();
  });
}

export function buildKitchen(x, y, z) {
  const group = new THREE.Group();
  group.position.set(x, z, y);
  const own = [];
  const keep = (o) => { own.push(o); return o; };
  const std = (color, extra = {}) => keep(new THREE.MeshStandardMaterial({ color, roughness: 0.75, ...extra }));
  const geoBox = (w, h, d) => keep(new THREE.BoxGeometry(w, h, d));
  const add = (geo, mat, u, h, v, parent = group) => { const m = new THREE.Mesh(geo, mat); m.position.set(u, h, v); parent.add(m); return m; };
  const box = (w, h, d, mat, u, hh, v, parent) => add(geoBox(w, h, d), mat, u, hh, v, parent);

  // the room, seen from inside, and its floor
  const wall = keep(wallTex());
  add(geoBox(4.4, 2.6, 3.6), keep(new THREE.MeshBasicMaterial({ map: wall, side: THREE.BackSide, color: 0xd8c8b0 })), 0, 1.3, 0);
  const floor = keep(floorTex());
  const fl = add(keep(new THREE.PlaneGeometry(4.38, 3.58)), keep(new THREE.MeshStandardMaterial({ map: floor, roughness: 0.9 })), 0, 0.005, 0);
  fl.rotation.x = -Math.PI / 2;

  // the window behind Tessa, its frame, the sill and the old radio
  const win = keep(windowTex());
  const wp = add(keep(new THREE.PlaneGeometry(1.5, 1.1)), keep(new THREE.MeshBasicMaterial({ map: win })), -2.19, 1.6, 0);
  wp.rotation.y = Math.PI / 2;
  const frame = std(0xece6da);
  box(0.06, 1.2, 0.07, frame, -2.17, 1.6, 0);
  box(0.06, 0.06, 1.6, frame, -2.17, 1.6, 0);
  box(0.06, 1.22, 0.07, frame, -2.17, 1.6, -0.78);
  box(0.06, 1.22, 0.07, frame, -2.17, 1.6, 0.78);
  box(0.06, 0.07, 1.62, frame, -2.17, 2.18, 0);
  box(0.28, 0.05, 1.7, frame, -2.07, 1.02, 0);
  const radio = new THREE.Group();
  radio.position.set(KITCHEN.radio.u, KITCHEN.radio.h, KITCHEN.radio.v);
  group.add(radio);
  const rt = keep(radioTex());
  const wood = std(0x6b4526);
  const front = keep(new THREE.MeshStandardMaterial({ map: rt, roughness: 0.7, emissive: 0x112211, emissiveMap: rt, emissiveIntensity: 0.6 }));
  // +x face (towards the room) carries the front
  add(geoBox(0.16, 0.18, 0.3), [front, wood, wood, wood, wood, wood], 0, 0, 0, radio);
  box(0.01, 0.12, 0.01, std(0x222222), -0.02, 0.15, -0.1, radio).rotation.x = 0.4;

  // kitchen counter along the far wall, upper cupboards, a fridge
  const counter = std(0x7c5a3a), top = std(0xcfc7b6), door = std(0x5d7d5a);
  box(3.0, 0.88, 0.6, counter, 0.3, 0.44, -1.5);
  box(3.04, 0.04, 0.64, top, 0.3, 0.9, -1.5);
  for (let i = 0; i < 5; i++) box(0.56, 0.7, 0.02, door, -0.9 + i * 0.6, 0.45, -1.19);
  for (let i = 0; i < 4; i++) box(0.68, 0.6, 0.34, door, -0.8 + i * 0.72, 1.95, -1.62);
  box(0.7, 1.8, 0.65, std(0xe6e2d8, { roughness: 0.4 }), 1.75, 0.9, -1.45);
  box(0.24, 0.3, 0.18, std(0x2a2a2a), -0.6, 1.07, -1.55);
  box(0.1, 0.22, 0.1, std(0xb0b0b0, { metalness: 0.6, roughness: 0.3 }), 0.2, 1.03, -1.5);

  // the door to the hall, standing open into the room
  const hall = keep(hallTex());
  const hp = add(keep(new THREE.PlaneGeometry(0.9, 2.05)), keep(new THREE.MeshBasicMaterial({ map: hall })), 1.3, 1.025, 1.79);
  hp.rotation.y = Math.PI;
  const dframe = std(0xe9e3d6);
  box(0.07, 2.12, 0.1, dframe, 0.82, 1.06, 1.77);
  box(0.07, 2.12, 0.1, dframe, 1.78, 1.06, 1.77);
  box(1.03, 0.08, 0.1, dframe, 1.3, 2.1, 1.77);
  const hinge = new THREE.Group();
  hinge.position.set(1.75, 0, 1.78);
  group.add(hinge);
  const leaf = box(0.88, 2.02, 0.045, std(0x8a9a7a), -0.44, 1.02, 0, hinge);
  box(0.05, 0.03, 0.12, std(0xc8c0a0, { metalness: 0.7, roughness: 0.3 }), -0.8, 1.0, 0, hinge);
  hinge.rotation.y = -1.25;

  // the table and two chairs
  const tableM = std(0xb08a5a), legM = std(0x5a4030);
  box(1.3, 0.04, 0.86, tableM, 0, KITCHEN.tableH - 0.02, 0);
  for (const su of [-0.6, 0.6]) for (const sv of [-0.38, 0.38]) box(0.05, KITCHEN.tableH - 0.04, 0.05, legM, su, (KITCHEN.tableH - 0.04) / 2, sv);
  const chairM = std(0x3f6e4f);
  for (const [s, side] of [[KITCHEN.anitaSeat, -1], [KITCHEN.tammoSeat, 1]]) {
    box(0.44, 0.04, 0.44, chairM, s.u, KITCHEN.seatH - 0.02, s.v);
    box(0.04, 0.5, 0.42, chairM, s.u + side * 0.21, KITCHEN.seatH + 0.25, s.v);
    for (const du of [-0.19, 0.19]) for (const dv of [-0.19, 0.19]) box(0.035, KITCHEN.seatH - 0.04, 0.035, legM, s.u + du, (KITCHEN.seatH - 0.04) / 2, s.v + dv);
  }

  // papers, the drawing, the phone
  const flat = (tex, w, d, u, v, rot) => {
    const m = add(keep(new THREE.PlaneGeometry(w, d)), keep(new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 })), u, KITCHEN.tableH + 0.002, v);
    m.rotation.set(-Math.PI / 2, 0, rot);
    return m;
  };
  const p0 = keep(paperTex(0)), p1 = keep(paperTex(1)), dr = keep(drawingTex());
  flat(p0, 0.21, 0.29, -0.42, -0.2, Math.PI / 2 + 0.2);
  flat(p1, 0.21, 0.29, -0.5, 0.22, Math.PI / 2 - 0.3);
  flat(p1, 0.21, 0.29, -0.2, -0.3, Math.PI / 2 + 0.5).position.y += 0.001;
  // its top points to Tessa: readable from Tammo's side of the table
  const drawing = flat(dr, 0.42, 0.3, KITCHEN.drawing.u, KITCHEN.drawing.v, Math.PI / 2 - 0.08);
  drawing.position.y += 0.003;
  const pen = box(0.14, 0.012, 0.012, std(0x1e9e56), -0.12, KITCHEN.tableH + 0.008, 0.2);
  pen.rotation.y = 0.6;
  const screen = keep(new THREE.MeshStandardMaterial({ color: 0x0b0d0c, emissive: 0x3fc97a, emissiveIntensity: 0 }));
  const phone = add(geoBox(0.075, 0.01, 0.15), [std(0x1a1a1a), std(0x1a1a1a), screen, std(0x1a1a1a), std(0x1a1a1a), std(0x1a1a1a)], KITCHEN.phone.u, KITCHEN.tableH + 0.006, KITCHEN.phone.v);
  phone.rotation.y = 0.3;

  // coffee from the night shop: two on the table (shown once Tammo sits)
  const cupGeo = keep(new THREE.CylinderGeometry(0.045, 0.034, 0.12, 14));
  const lidGeo = keep(new THREE.CylinderGeometry(0.047, 0.047, 0.012, 14));
  const cupMat = std(0xf2efe6), lidMat = std(0x1e9e56);
  const makeCup = () => {
    const c = new THREE.Group();
    add(cupGeo, cupMat, 0, 0.06, 0, c);
    add(lidGeo, lidMat, 0, 0.125, 0, c);
    return c;
  };
  const tableCups = [makeCup(), makeCup()];
  tableCups[0].position.set(0.42, KITCHEN.tableH, 0.08);
  tableCups[1].position.set(-0.36, KITCHEN.tableH, 0.08);
  for (const c of tableCups) { c.visible = false; group.add(c); }
  const handCups = [makeCup(), makeCup()];

  // a lamp still on over the table, dawn through the window
  box(0.01, 0.6, 0.01, std(0x222222), 0, 2.3, 0);
  const shade = add(keep(new THREE.ConeGeometry(0.26, 0.2, 18, 1, true)), keep(new THREE.MeshStandardMaterial({ color: 0x1e9e56, side: THREE.DoubleSide, emissive: 0x0f3a20, emissiveIntensity: 0.5 })), 0, 1.98, 0);
  shade.rotation.x = 0;
  const lamp = new THREE.PointLight(0xffd6a0, 3.2, 6, 1.6);
  lamp.position.set(0, 1.85, 0);
  group.add(lamp);
  const dawn = new THREE.PointLight(0xffb27a, 5, 7, 1.4);
  dawn.position.set(-1.9, 1.7, 0.2);
  group.add(dawn);
  group.add(new THREE.AmbientLight(0xffe6cc, 0.75));

  for (const o of group.children) { o.castShadow = false; o.receiveShadow = false; }

  // a world point in plan coordinates
  const kp = (u, v, h) => ({ x: x + u, y: y + v, z: z + h });

  // cups into (or out of) a person's hands; the forearm points along -y of
  // the elbow, so each cup is turned back upright by the arm angle
  function holdCups(m, on, tilt = 1.6, hands = 'LR') {
    const ud = m.userData;
    handCups.forEach((c, i) => {
      const e = i ? ud.elbowR : ud.elbowL;
      if (!e) return;
      if (on && hands.includes(i ? 'R' : 'L')) {
        if (c.parent !== e) e.add(c);
        c.position.set(0, -0.27, 0);
        c.rotation.set(0, 0, -tilt);
        c.visible = true;
      } else if (c.parent) c.removeFromParent();
    });
  }

  function buzz(t, on) {
    screen.emissiveIntensity = on ? 1.2 : 0;
    phone.position.x = KITCHEN.phone.u + (on && t % 0.5 < 0.3 ? Math.sin(t * 90) * 0.004 : 0);
  }

  function reset() {
    hinge.rotation.y = -1.25;
    for (const c of tableCups) c.visible = false;
    buzz(0, false);
  }

  function dispose() {
    for (const c of handCups) c.removeFromParent();
    group.removeFromParent();
    for (const o of own) o.dispose();
  }

  return { group, kp, holdCups, buzz, reset, dispose, tableCups, hinge, leaf, radio };
}

// A cash machine on a little two-wheel trailer with a drawbar, for Tessa.
export function buildAtmTrailer() {
  const g = new THREE.Group(), own = [];
  const box = (w, h, d, color, x, y, z, emissive = 0) => {
    const geo = new THREE.BoxGeometry(w, h, d), mat = new THREE.MeshStandardMaterial({ color, roughness: 0.6, emissive, emissiveIntensity: emissive ? 1 : 0 });
    own.push(geo, mat);
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z); m.castShadow = true;
    g.add(m);
    return m;
  };
  // the trailer: bed, sides, drawbar towards +x
  box(1.3, 0.06, 0.95, 0x3a3d40, 0, 0.42, 0);
  box(1.3, 0.16, 0.04, 0x55595e, 0, 0.53, 0.47);
  box(1.3, 0.16, 0.04, 0x55595e, 0, 0.53, -0.47);
  box(1.0, 0.05, 0.05, 0x2a2b2d, 1.1, 0.42, 0);
  for (const z of [0.52, -0.52]) {
    const geo = new THREE.CylinderGeometry(0.22, 0.22, 0.1, 16), mat = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.9 });
    own.push(geo, mat);
    const wh = new THREE.Mesh(geo, mat);
    wh.rotation.x = Math.PI / 2; wh.position.set(0, 0.22, z);
    g.add(wh);
  }
  // the machine itself, slightly askew, screen still on
  const atm = new THREE.Group();
  atm.position.set(-0.05, 0.45, 0);
  atm.rotation.y = 0.12;
  g.add(atm);
  const sub = (w, h, d, color, x, y, z, emissive) => { const m = box(w, h, d, color, x, y, z, emissive); atm.add(m); return m; };
  sub(0.62, 1.35, 0.55, 0x7c8590, 0, 0.68, 0);
  sub(0.02, 0.26, 0.34, 0x0f2a1c, 0.32, 1.0, 0, 0x2dbb6a);
  sub(0.04, 0.12, 0.3, 0x1b1d20, 0.32, 0.74, 0);
  sub(0.04, 0.05, 0.2, 0x111111, 0.33, 0.54, 0);
  sub(0.03, 0.12, 0.5, 0x1e9e56, 0.32, 1.26, 0, 0x0b3a1e);
  g.userData.own = own;
  return g;
}

// A dripping bike on a rope, fished out of the Diepenring.
export function buildWetBike() {
  const g = new THREE.Group(), own = [];
  const mat = new THREE.MeshStandardMaterial({ color: 0x2b2f2a, roughness: 0.5, metalness: 0.4 });
  const weed = new THREE.MeshStandardMaterial({ color: 0x3f5a2a, roughness: 1 });
  own.push(mat, weed);
  const wheel = new THREE.TorusGeometry(0.33, 0.025, 6, 22);
  own.push(wheel);
  for (const x of [0.52, -0.52]) { const m = new THREE.Mesh(wheel, mat); m.position.set(x, 0, 0); g.add(m); }
  const bar = (len, x, y, rz) => {
    const geo = new THREE.CylinderGeometry(0.02, 0.02, len, 6);
    own.push(geo);
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, 0); m.rotation.z = rz;
    g.add(m);
  };
  bar(0.75, 0, 0.3, Math.PI / 2);
  bar(0.62, -0.2, 0.12, 0.9);
  bar(0.6, 0.3, 0.12, -0.75);
  bar(0.3, 0.48, 0.42, 0.2);
  bar(0.3, -0.3, 0.42, 0);
  const wg = new THREE.SphereGeometry(0.08, 6, 4);
  own.push(wg);
  for (const [x, y] of [[0.5, -0.3], [-0.1, 0.25], [-0.55, 0.28]]) { const m = new THREE.Mesh(wg, weed); m.position.set(x, y, 0.02); m.scale.set(1, 1.8, 0.5); g.add(m); }
  const rope = new THREE.CylinderGeometry(0.012, 0.012, 6, 4);
  own.push(rope);
  const rm = new THREE.Mesh(rope, new THREE.MeshStandardMaterial({ color: 0xc9b68a, roughness: 1 }));
  own.push(rm.material);
  rm.position.set(0, 3.45, 0);
  g.add(rm);
  g.userData.own = own;
  return g;
}

// A frikandel, for a gull to steal.
export function buildFrikandel() {
  const geo = new THREE.CapsuleGeometry(0.022, 0.16, 4, 8);
  const mat = new THREE.MeshStandardMaterial({ color: 0x7a3b1c, roughness: 0.6 });
  const m = new THREE.Mesh(geo, mat);
  m.rotation.x = Math.PI / 2;
  m.userData.own = [geo, mat];
  return m;
}

// A rope from a helicopter's belly down to a person's raised hands.
export function buildRope() {
  const geo = new THREE.CylinderGeometry(0.02, 0.02, 1, 5).translate(0, -0.5, 0);
  const mat = new THREE.MeshStandardMaterial({ color: 0xd8c9a0, roughness: 1 });
  const m = new THREE.Mesh(geo, mat);
  m.userData.own = [geo, mat];
  return m;
}
