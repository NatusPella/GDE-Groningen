import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { adoptSetLight } from './setlights.js';
import { canvasTex as sharedCanvasTex } from './canvastex.js';
import { interiorProp, registeredProp } from './interiorprops3d.js';
import { KITCHEN_DRESSING, KITCHEN_ROOM, KITCHEN_HALL } from './akte1sets.js';

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
  hallStart: 2.45, // v where Tammo starts in the hall behind the door (the hall runs to v = 4.0), so he walks in instead of appearing in the doorway
  radio: { u: -2.06, v: 0.62, h: 1.1 },
  drawing: { u: -0.28, v: 0.06 },
  phone: { u: -0.46, v: -0.3 },
};

const canvasTex = (w, h, draw) => sharedCanvasTex(w, h, draw, { anisotropy: 4 });

// gestuukte muur in gebroken wit: vlekkerig, geen strepen (23-11: de strepen lazen als behang uit een doos)
function plasterTex(base = '#e6dcc8') {
  const t = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    let s = 7;
    const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    for (let i = 0; i < 1400; i++) {
      const a = 0.008 + rnd() * 0.014;
      g.fillStyle = rnd() < 0.5 ? `rgba(120, 95, 60, ${a})` : `rgba(255, 250, 240, ${a * 1.5})`;
      const r = 2 + rnd() * 9;
      g.beginPath(); g.arc(rnd() * w, rnd() * h, r, 0, Math.PI * 2); g.fill();
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// zwart-wit geblokte vloer van een oude zolderkeuken, iets vergeeld, met voegen
function floorTex() {
  const t = canvasTex(256, 256, (g, w, h) => {
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) {
      g.fillStyle = (i + j) % 2 ? '#5f5a52' : '#d8cfbd';
      g.fillRect(i * 32, j * 32, 32, 32);
    }
    g.strokeStyle = 'rgba(40, 32, 24, 0.35)'; g.lineWidth = 1.5;
    for (let i = 0; i <= 8; i++) { g.beginPath(); g.moveTo(i * 32, 0); g.lineTo(i * 32, h); g.stroke(); g.beginPath(); g.moveTo(0, i * 32); g.lineTo(w, i * 32); g.stroke(); }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3.3, 2.7);
  return t;
}

// witte metrotegels achter het aanrecht
function tileTex() {
  const t = canvasTex(256, 128, (g, w, h) => {
    g.fillStyle = '#b9b3a8'; g.fillRect(0, 0, w, h);
    for (let r = 0; r < 8; r++) for (let c = -1; c < 9; c++) {
      const x = c * 32 + (r % 2 ? 16 : 0), y = r * 16;
      g.fillStyle = (r * 7 + c * 3) % 5 ? '#f1eee6' : '#e9e5da';
      g.fillRect(x + 1, y + 1, 30, 14);
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// houten planken in de gang
function plankTex() {
  const t = canvasTex(128, 256, (g, w, h) => {
    for (let i = 0; i < 4; i++) {
      g.fillStyle = ['#8a6a48', '#7d5f40', '#93714c', '#84653f'][i];
      g.fillRect(i * 32, 0, 32, h);
      g.fillStyle = 'rgba(40, 25, 10, 0.4)'; g.fillRect(i * 32, 0, 1.5, h);
      g.fillRect(i * 32, (i * 97) % h, 32, 1.5);
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
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
    g.fillText('TAM & TES', 258, 245);
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

  // the room, seen from inside: plastered walls (lit, so the lamp and the dawn fall off across them), a ceiling, the tiled floor.
  // The door wall has a real opening into the hall behind it (23-11: it used to be a black plane, VQA 23-11 #4).
  const R = KITCHEN_ROOM, HL = KITCHEN_HALL, RH = R.h;
  const plaster = keep(plasterTex()); plaster.repeat.set(2, 1.2);
  const wallM = keep(new THREE.MeshStandardMaterial({ map: plaster, roughness: 0.95 }));
  const ceilM = keep(new THREE.MeshStandardMaterial({ color: 0xf2ede2, roughness: 1 }));
  // a wall piece from (u1, v1) to (u2, v2) between heights h0 and h1, facing into the room (normal: n = [nu, nv])
  const wallPiece = (u1, v1, u2, v2, h0, h1, n, mat = wallM) => {
    const len = Math.hypot(u2 - u1, v2 - v1);
    const m = add(keep(new THREE.PlaneGeometry(len, h1 - h0)), mat, (u1 + u2) / 2, (h0 + h1) / 2, (v1 + v2) / 2);
    m.rotation.y = Math.atan2(n[0], n[1]);
    return m;
  };
  wallPiece(R.u0, R.v0, R.u1, R.v0, 0, RH, [0, 1]);              // the counter wall
  wallPiece(R.u0, R.v0, R.u0, R.v1, 0, RH, [1, 0]);              // the window wall
  wallPiece(R.u1, R.v0, R.u1, R.v1, 0, RH, [-1, 0]);             // the blind wall by the fridge
  wallPiece(R.u0, R.v1, HL.u0, R.v1, 0, RH, [0, -1]);            // the door wall, left of the door
  wallPiece(HL.u1, R.v1, R.u1, R.v1, 0, RH, [0, -1]);            // right of it
  wallPiece(HL.u0, R.v1, HL.u1, R.v1, 2.14, RH, [0, -1]);        // above it
  const ceil = add(keep(new THREE.PlaneGeometry(R.u1 - R.u0, R.v1 - R.v0)), ceilM, 0, RH, 0);
  ceil.rotation.x = Math.PI / 2;
  const floor = keep(floorTex());
  const fl = add(keep(new THREE.PlaneGeometry(R.u1 - R.u0, R.v1 - R.v0)), keep(new THREE.MeshStandardMaterial({ map: floor, roughness: 0.85 })), 0, 0.002, 0);
  fl.rotation.x = -Math.PI / 2;
  // skirting boards and the tiles behind the counter
  const trim = std(0xe9e3d6);
  box(R.u1 - R.u0, 0.08, 0.02, trim, 0, 0.04, R.v0 + 0.01);
  box(0.02, 0.08, R.v1 - R.v0, trim, R.u0 + 0.01, 0.04, 0);
  box(0.02, 0.08, R.v1 - R.v0, trim, R.u1 - 0.01, 0.04, 0);
  const tiles = keep(tileTex()); tiles.repeat.set(3, 1.2);
  wallPiece(-1.3, R.v0 + 0.004, 1.52, R.v0 + 0.004, 0.9, 1.5, [0, 1], keep(new THREE.MeshStandardMaterial({ map: tiles, roughness: 0.35 })));

  // the hall behind the door: plaster, planks, a lamp that is on and the door to the stairwell at its end
  wallPiece(HL.u0, HL.v0, HL.u0, HL.v1, 0, RH, [1, 0]);
  wallPiece(HL.u1, HL.v0, HL.u1, HL.v1, 0, RH, [-1, 0]);
  wallPiece(HL.u0, HL.v1, HL.u1, HL.v1, 0, RH, [0, -1]);
  const hc = add(keep(new THREE.PlaneGeometry(HL.u1 - HL.u0, HL.v1 - HL.v0)), ceilM, (HL.u0 + HL.u1) / 2, RH, (HL.v0 + HL.v1) / 2);
  hc.rotation.x = Math.PI / 2;
  const planks = keep(plankTex()); planks.repeat.set(1, 1.5);
  const hf = add(keep(new THREE.PlaneGeometry(HL.u1 - HL.u0, HL.v1 - HL.v0)), keep(new THREE.MeshStandardMaterial({ map: planks, roughness: 0.8 })), (HL.u0 + HL.u1) / 2, 0.002, (HL.v0 + HL.v1) / 2);
  hf.rotation.x = -Math.PI / 2;

  // the furniture: registered props from the Quaternius packs (akte1sets.js KITCHEN_DRESSING), one LOD each
  const hinge = new THREE.Group();
  hinge.position.set(1.75, 0, 1.78);
  const places = { deur: hinge, gang: group };
  for (const e of KITCHEN_DRESSING) {
    const p = interiorProp(e.id, { x: e.u, y: e.h, z: e.v, rot: e.rot, fit: e.fit, scale: e.scale, kleuren: e.kleuren });
    (places[e.in] || group).add(p);
  }

  // the window behind Tessa: the dawn behind the frame, the sill and the old radio
  const win = keep(windowTex());
  const wp = add(keep(new THREE.PlaneGeometry(1.56, 1.16)), keep(new THREE.MeshBasicMaterial({ map: win })), -2.195, 1.6, 0);
  wp.rotation.y = Math.PI / 2;
  const frame = std(0xece6da);
  box(0.28, 0.05, 1.76, frame, -2.07, 0.985, 0);
  const radio = new THREE.Group();
  radio.position.set(KITCHEN.radio.u, KITCHEN.radio.h, KITCHEN.radio.v);
  group.add(radio);
  // the registered tube radio (propregister.js 'buisradio'), its front (+x) towards the room, standing on the sill
  radio.add(registeredProp('buisradio', { y: -0.09 }));

  // the door frame (the leaf is the registered door in the hinge, see KITCHEN_DRESSING), standing open into the room
  const dframe = std(0xe9e3d6);
  box(0.07, 2.14, 0.12, dframe, HL.u0, 1.07, R.v1);
  box(0.07, 2.14, 0.12, dframe, HL.u1, 1.07, R.v1);
  box(HL.u1 - HL.u0 + 0.07, 0.08, 0.12, dframe, (HL.u0 + HL.u1) / 2, 2.14, R.v1);
  group.add(hinge);
  hinge.rotation.y = -1.25;
  const leaf = hinge.children[0];

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

  // light per room (23-11): the lamp still on over the table (warm), the dawn through the window (low, orange, from behind Tessa)
  // and the hall lamp, so the open door shows a lit hall instead of a black hole. Three lamps borrowed from the night rig
  // (setlights.js; 'middel' has three), plus a soft fill so no corner is black.
  const lamp = adoptSetLight(new THREE.PointLight(0xffd29a, 3.4, 6, 1.6));
  lamp.position.set(0, 1.95, 0);
  group.add(lamp);
  const dawn = adoptSetLight(new THREE.PointLight(0xffb27a, 6, 7.5, 1.3));
  dawn.position.set(-1.95, 1.75, 0.1);
  group.add(dawn);
  const hallLamp = adoptSetLight(new THREE.PointLight(0xffe0b0, 2.4, 4.5, 1.6));
  hallLamp.position.set(1.3, 2.1, 2.7);
  group.add(hallLamp);
  group.add(new THREE.AmbientLight(0xffe6cc, 0.55));

  group.traverse((o) => { o.castShadow = false; o.receiveShadow = false; });

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
