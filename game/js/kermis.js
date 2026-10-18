import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { canvasTex } from './canvastex.js';
import { getScene } from './scene3d.js';
import { buildPersonMesh, animatePersonWalk, seatPerson, seatedY, TAMMO_APPEARANCE, ANITA_APPEARANCE } from './models3d_people.js';
import { showBanner } from './cinematics.js';
import { pushAudioEvent } from './pedestrians.js';
import { unlockAchievement, recordChallengeResult, getChallengeRecord, recordStat, MEDALS } from './achievements.js';
import { showCard } from './hudcards.js';
import { notifyPhone } from './phonefeed.js';
import { spawnFxSpark } from './fx3d.js';
import { addStaticCollider } from './breakables.js';
import { activityBlock, iconDisc } from './activitykit.js';
import { KERMIS_LINES, BOTS_BUMPED, BOTS_HIT, KERMIS_NEWS, KERMIS_TWINS } from './funlines.js';
import { DURK_LOOK, DOUWE_LOOK } from './storycast.js';
import { isToday } from './calendarday.js';
import { rand } from './rng.js';
import { WHEEL_AT, R, AX as WHEEL_AX, N, OMEGA } from './reuzenradrules.js';

// Kermis op de Grote Markt. The botsautotent of kermisbaas Jan stands on
// the south side of the square all the time (always open, €3 a ride);
// every evening from 19:00 to 01:00, and all day during the Zomerkermis
// (calendar.js: 21 to 30 augustus), the rest of the kermis joins it: a reuzenrad,
// stalls, coloured lights and a crowd. The ride: 75 s in a
// bumper car against five others (Tammo or Tessa in one of them), points
// for every bump you give, more for a fast one or one in a flank, a combo
// for quick ones in a row. `window.__kermis` debug.

const K = { x: 173.32, y: 108.21, rot: -0.0164 };
const HU = 10, HV = 6;
const CAR_R = 0.92;
const RIDE_S = 75;
const PRICE = 3;
const PRIZE = [0, 5, 12, 25];
const MEDAL_AT = [0, 60, 110, 160];
const USE_RADIUS = 2.4;
const DETAIL_M = 230;
const ACCENT = '#e0457a';
const WHEEL = WHEEL_AT;
const STALLS = [
  { u: -9, v: -12.5, sign: 'EIERBALLEN', c: 0xc8261e },
  { u: -1.5, v: -12.5, sign: 'SUIKERSPIN', c: 0xe0457a },
  { u: 6, v: -12.5, sign: 'SCHIETTENT', c: 0x2f5f9a },
];
const CAR_COLORS = [0xd8262e, 0x2f6fd0, 0x2fa04a, 0xf2c230, 0x8a3ac8, 0xf07a1e];
const DRIVERS = [
  { name: 'Sjoerdje', shirt: 0x3fa0d0, variant: 'male', age: 'young' },
  { name: 'Trijntje', shirt: 0xe07ab0, variant: 'female', age: 'young' },
  { name: 'Opa Harm', shirt: 0x6a5a48, variant: 'male', age: 'old' },
  { name: 'Lieke', shirt: 0xf2e050, variant: 'female', age: 'adult' },
];

let game = null;
let built = null;
let fair = null;
let crowd = null;
let hud = null;
let lodT = 0;
let rides = 0;
let lastKermisDay = -1;
let announced = false;

const C = Math.cos(K.rot), S = Math.sin(K.rot);
const toW = (u, v) => ({ x: K.x + C * u - S * v, y: K.y + S * u + C * v });
const toL = (x, y) => ({ u: (x - K.x) * C + (y - K.y) * S, v: -(x - K.x) * S + (y - K.y) * C });
const BOOTH = toW(-HU - 1.6, 3.2);
const STAND = toW(-HU - 2.8, 0.8);
const JAN = toW(-HU - 1, 2.4);

// The kermis frame, for reuzenrad.js: kermis-local (u, v) to map and back, and the frame's turn.
export const kermisFrame = { toW, toL, rot: K.rot };

// The reuzenrad (reuzenrad.js rides it): its turn angle, or null while the fair is not standing.
export function kermisWheel() {
  return fair && fair.root.visible ? { rot: fair.wheel.rotation.z } : null;
}

// The kermis is in town this evening (or all day in the Zomerkermis).
export function kermisOn(w) {
  const h = ((w.clock % 24) + 24) % 24;
  if (h >= 19 || h < 1) return true;
  return isToday('kermis', w);
}

// Footprints the market stalls, clutter and parked cars stay out of.
function reserved(x, y) {
  const l = toL(x, y);
  if (Math.abs(l.u) < HU + 4.5 && Math.abs(l.v) < HV + 2.5) return true;
  for (const s of STALLS) if (Math.abs(l.u - s.u) < 3 && Math.abs(l.v - s.v) < 2.2) return true;
  return Math.abs(l.u - WHEEL.u) < 5.5 && Math.abs(l.v - WHEEL.v) < 3;
}

// The rim, the kassa, the stalls and the wheel's legs are solid (the stalls
// and the wheel stand there on kermis evenings only, their colliders always:
// small, and out of the way on the square).
function addColliders() {
  const seg = (u0, v0, u1, v1, r = 0.2) => {
    const a = toW(u0, v0), b = toW(u1, v1);
    addStaticCollider('garagewall', (a.x + b.x) / 2, (a.y + b.y) / 2, r, Math.hypot(b.x - a.x, b.y - a.y) / 2, Math.atan2(b.y - a.y, b.x - a.x));
  };
  const e = 0.3;
  seg(-HU - e, -HV - e, HU + e, -HV - e); seg(-HU - e, HV + e, HU + e, HV + e);
  seg(-HU - e, -HV - e, -HU - e, HV + e); seg(HU + e, -HV - e, HU + e, HV + e);
  const b = toL(BOOTH.x, BOOTH.y);
  seg(b.u - 0.6, b.v - 0.1, b.u - 0.6, b.v + 0.9, 0.75);
  for (const st of STALLS) seg(st.u - 1.7, st.v - 0.3, st.u + 1.7, st.v - 0.3, 0.55);
  for (const k of [-1, 1]) for (const sd of [-1.3, 1.3]) {
    const p = toW(WHEEL.u + k * Math.tan(0.32) * 10, WHEEL.v + sd);
    addStaticCollider('post', p.x, p.y, 0.3);
  }
}

// --- meshes ------------------------------------------------------------------------------

let mats = null;

function materials() {
  if (mats) return mats;
  const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.7, ...o });
  const stripes = (a, b, n = 8) => canvasTex(128, 32, (g, w, h) => { for (let i = 0; i < n; i++) { g.fillStyle = i % 2 ? b : a; g.fillRect((i * w) / n, 0, w / n + 1, h); } });
  const sign = (text, bg, fg = '#fff6d8') => canvasTex(256, 64, (g, w, h) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#ffd23f'; g.lineWidth = 6; g.strokeRect(4, 4, w - 8, h - 8);
    g.fillStyle = fg; g.font = 'bold 40px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, w / 2, h / 2 + 2);
  });
  const roof = stripes('#c8261e', '#f2e8d0', 12);
  roof.wrapS = THREE.RepeatWrapping;
  roof.repeat.set(3, 1);
  mats = {
    floor: std(0x3a3e44, { metalness: 0.6, roughness: 0.45 }), rim: std(0x1d1d1f, { roughness: 0.9 }), rimTop: std(0xf2c230),
    post: new THREE.MeshStandardMaterial({ map: stripes('#c8261e', '#f2e8d0', 6), roughness: 0.6 }),
    roof: new THREE.MeshStandardMaterial({ map: roof, roughness: 0.8, side: THREE.DoubleSide }),
    grid: new THREE.MeshStandardMaterial({ color: 0x9aa2a8, metalness: 0.8, roughness: 0.4, wireframe: true }),
    sign: new THREE.MeshBasicMaterial({ map: sign("BOTSAUTO'S", '#1d2a6a') }),
    kassa: new THREE.MeshBasicMaterial({ map: sign('KASSA €3', '#7a1e1e') }),
    booth: std(0xe9e0c8), boothRoof: std(0xc8261e),
    rubber: std(0x151515, { roughness: 0.95 }), pole: std(0x9aa2a8, { metalness: 0.8, roughness: 0.3 }), seat: std(0x1d1d1f),
    steel: std(0xd8dde2, { metalness: 0.7, roughness: 0.35 }), gondola: std(0xf2c230, { emissive: 0xf2c230, emissiveIntensity: 0 }),
    bulbA: new THREE.MeshBasicMaterial({ color: 0xffe6a0 }), bulbB: new THREE.MeshBasicMaterial({ color: 0xff7ab0 }),
    bulbOff: new THREE.MeshBasicMaterial({ color: 0x6a6258 }),
    stallSigns: STALLS.map((s) => new THREE.MeshBasicMaterial({ map: sign(s.sign, '#' + s.c.toString(16).padStart(6, '0')) })),
    awnings: STALLS.map((s) => new THREE.MeshStandardMaterial({ map: stripes('#' + s.c.toString(16).padStart(6, '0'), '#f2e8d0', 6), roughness: 0.8, side: THREE.DoubleSide })),
    counter: std(0x8a6a4a),
  };
  return mats;
}

function mesh(geo, mat, x, y, z, parent, shadow = true) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = shadow;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

// A row of bulbs as one instanced mesh; pts in the parent's frame.
function bulbs(pts, mat, parent, r = 0.09) {
  const im = new THREE.InstancedMesh(new THREE.SphereGeometry(r, 6, 4), mat, pts.length);
  const m4 = new THREE.Matrix4();
  pts.forEach((p, i) => { m4.makeTranslation(p[0], p[1], p[2]); im.setMatrixAt(i, m4); });
  im.instanceMatrix.needsUpdate = true;
  parent.add(im);
  return im;
}

function buildTent() {
  const M = materials();
  const root = new THREE.Group();
  root.position.set(K.x, 0, K.y);
  root.rotation.y = -K.rot;
  mesh(new THREE.BoxGeometry(HU * 2, 0.12, HV * 2), M.floor, 0, 0.06, 0, root, false);
  // the rubber rim with a yellow top
  for (const [w, d, x, z] of [[HU * 2 + 0.6, 0.3, 0, HV + 0.15], [HU * 2 + 0.6, 0.3, 0, -HV - 0.15], [0.3, HV * 2, HU + 0.15, 0], [0.3, HV * 2, -HU - 0.15, 0]]) {
    mesh(new THREE.BoxGeometry(w, 0.42, d), M.rim, x, 0.21, z, root);
    mesh(new THREE.BoxGeometry(w, 0.06, d), M.rimTop, x, 0.45, z, root, false);
  }
  // posts, ceiling grid and the striped roof
  const posts = [];
  for (const x of [-HU, -HU / 3, HU / 3, HU]) for (const z of [-HV, HV]) posts.push([x, z]);
  for (const [x, z] of posts) mesh(new THREE.CylinderGeometry(0.12, 0.12, 4.4, 8), M.post, x * 1.03, 2.2, z * 1.05, root);
  const grid = mesh(new THREE.PlaneGeometry(HU * 2, HV * 2, 20, 12).rotateX(Math.PI / 2), M.grid, 0, 4.15, 0, root, false);
  const roof = new THREE.Group();
  root.add(roof);
  const ridge = 6.6, eave = 4.4;
  for (const s of [-1, 1]) {
    const len = Math.hypot(HV + 0.6, ridge - eave);
    const p = mesh(new THREE.PlaneGeometry(HU * 2 + 1.2, len), M.roof, 0, (ridge + eave) / 2, s * (HV + 0.6) / 2, roof, false);
    p.rotation.x = Math.atan2(-s * (HV + 0.6), ridge - eave);
  }
  for (const s of [-1, 1]) {
    const tri = new THREE.BufferGeometry();
    tri.setAttribute('position', new THREE.Float32BufferAttribute([s * (HU + 0.6), eave, -(HV + 0.6), s * (HU + 0.6), eave, HV + 0.6, s * (HU + 0.6), ridge, 0], 3));
    tri.computeVertexNormals();
    mesh(tri, M.roof, 0, 0, 0, roof, false);
  }
  // the sign over the long side and the bulbs along the eaves
  const sg = mesh(new THREE.PlaneGeometry(5, 1.25), M.sign, 0, 5.2, -(HV + 0.75), root, false);
  sg.rotation.y = Math.PI;
  const ptsA = [], ptsB = [];
  for (let i = 0; i <= 40; i++) {
    const x = -HU - 0.6 + (i / 40) * (HU * 2 + 1.2);
    for (const z of [-(HV + 0.62), HV + 0.62]) (i % 2 ? ptsA : ptsB).push([x, eave - 0.05, z]);
  }
  for (let i = 0; i <= 24; i++) {
    const z = -HV - 0.6 + (i / 24) * (HV * 2 + 1.2);
    for (const x of [-(HU + 0.62), HU + 0.62]) (i % 2 ? ptsA : ptsB).push([x, eave - 0.05, z]);
  }
  const lightsA = bulbs(ptsA, M.bulbA, root), lightsB = bulbs(ptsB, M.bulbB, root);
  // kassa
  const b = toL(BOOTH.x, BOOTH.y);
  mesh(new THREE.BoxGeometry(1.6, 2.2, 1.4), M.booth, b.u - 0.6, 1.1, b.v + 0.4, root);
  mesh(new THREE.BoxGeometry(1.9, 0.12, 1.7), M.boothRoof, b.u - 0.6, 2.26, b.v + 0.4, root);
  const ks = mesh(new THREE.PlaneGeometry(1.5, 0.38), M.kassa, b.u - 0.6, 1.85, b.v - 0.31, root, false);
  ks.rotation.y = Math.PI;
  getScene().add(root);
  // the bumper cars, parked along the rim
  const cars = CAR_COLORS.map((c, i) => buildCar(c, i));
  cars.forEach((car, i) => parkCar(car, i));
  // Jan at the kassa
  const jan = buildPersonMesh(0x2a2a2a, 0xe2b48c, { variant: 'male', seed: 6201, pants: 0x26262a, hairStyle: 'short', hair: 0x2a2018, look: { age: 'adult', build: 'heavy', top: 'jacket', bottom: 'trousers', hat: null, bag: null, umbrella: null } });
  const jp = JAN;
  jan.position.set(jp.x, 0, jp.y);
  jan.rotation.y = -(K.rot - Math.PI * 0.8);
  getScene().add(jan);
  return { root, roof, grid, cars, lightsA, lightsB, jan: { mesh: jan, x: jp.x, y: jp.y } };
}

function buildCar(color, i) {
  const M = materials();
  const g = new THREE.Group();
  const body = new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.4 });
  mesh(new THREE.BoxGeometry(1.5, 0.42, 1.05), body, 0, 0.42, 0, g);
  mesh(new THREE.BoxGeometry(0.5, 0.5, 1.05), body, 0.5, 0.62, 0, g);
  mesh(new THREE.BoxGeometry(0.5, 0.45, 0.9), M.seat, -0.25, 0.75, 0, g);
  const ring = mesh(new THREE.TorusGeometry(0.86, 0.13, 6, 20).rotateX(Math.PI / 2), M.rubber, 0, 0.28, 0, g);
  ring.scale.set(1, 1, 0.72);
  mesh(new THREE.CylinderGeometry(0.03, 0.03, 3.2, 6), M.pole, -0.62, 2.0, 0, g);
  mesh(new THREE.BoxGeometry(0.16, 0.05, 0.16), M.pole, -0.62, 3.62, 0, g);
  getScene().add(g);
  return { mesh: g, idx: i, u: 0, v: 0, a: 0, vu: 0, vv: 0, va: 0, driver: null, rider: null };
}

function parkCar(car, i) {
  const u = -HU + 1.6 + i * 2.2, v = HV - 1.3;
  car.u = u; car.v = v; car.a = -Math.PI / 2; car.vu = car.vv = car.va = 0;
  placeCar(car);
}

function placeCar(car) {
  const p = toW(car.u, car.v);
  car.mesh.position.set(p.x, 0.12, p.y);
  car.mesh.rotation.y = -(K.rot + car.a);
  if (car.rider) {
    const r = car.rider;
    const c = Math.cos(K.rot + car.a), s = Math.sin(K.rot + car.a);
    r.position.set(p.x - c * 0.2, seatedY(r, 0.98), p.y - s * 0.2);
    r.rotation.y = -(K.rot + car.a);
  }
}

// The rest of the kermis: the reuzenrad and the stalls.
function buildFair() {
  const M = materials();
  const root = new THREE.Group();
  root.position.set(K.x, 0, K.y);
  root.rotation.y = -K.rot;
  // reuzenrad: A-frame legs, two rims, spokes, gondolas
  const wheel = new THREE.Group();
  const AX = WHEEL_AX;
  wheel.position.set(WHEEL.u, AX, WHEEL.v);
  root.add(wheel);
  for (const s of [-1, 1]) {
    for (const k of [-1, 1]) {
      const leg = mesh(new THREE.CylinderGeometry(0.16, 0.2, AX / Math.cos(0.32), 8), M.steel, WHEEL.u + k * Math.tan(0.32) * AX / 2, AX / 2, WHEEL.v + s * 1.3, root);
      leg.rotation.z = k * 0.32;
    }
    mesh(new THREE.TorusGeometry(R, 0.09, 6, 48), M.steel, 0, 0, s * 1.2, wheel, false);
  }
  mesh(new THREE.CylinderGeometry(0.3, 0.3, 3.2, 10).rotateX(Math.PI / 2), M.steel, 0, 0, 0, wheel);
  const spokes = N;
  const gondolas = [];
  const rimPts = [];
  for (let i = 0; i < spokes; i++) {
    const a = (i / spokes) * Math.PI * 2;
    for (const s of [-1.2, 1.2]) {
      const sp = mesh(new THREE.BoxGeometry(0.06, R, 0.06), M.steel, Math.cos(a) * R / 2, Math.sin(a) * R / 2, s, wheel, false);
      sp.rotation.z = a - Math.PI / 2;
    }
    const gd = new THREE.Group();
    mesh(new THREE.BoxGeometry(1.1, 0.8, 1.6), M.gondola, 0, -0.9, 0, gd);
    mesh(new THREE.BoxGeometry(1.2, 0.08, 1.7), M.steel, 0, -0.1, 0, gd, false);
    gd.position.set(Math.cos(a) * R, Math.sin(a) * R, 0);
    wheel.add(gd);
    gondolas.push(gd);
    for (let k = 0; k < 4; k++) { const b = a + (k / 4) * (Math.PI * 2 / spokes); rimPts.push([Math.cos(b) * (R + 0.15), Math.sin(b) * (R + 0.15), 1.25], [Math.cos(b) * (R + 0.15), Math.sin(b) * (R + 0.15), -1.25]); }
  }
  const wheelA = bulbs(rimPts.filter((_, i) => i % 4 < 2), M.bulbA, wheel, 0.24);
  const wheelB = bulbs(rimPts.filter((_, i) => i % 4 >= 2), M.bulbB, wheel, 0.24);
  // stalls: counter, back wall, posts, a striped awning and the sign
  STALLS.forEach((st, i) => {
    const g = new THREE.Group();
    g.position.set(st.u, 0, st.v);
    root.add(g);
    mesh(new THREE.BoxGeometry(3.6, 1.05, 0.7), M.counter, 0, 0.52, -0.9, g);
    mesh(new THREE.BoxGeometry(3.6, 2.6, 0.12), M.booth, 0, 1.3, 1.1, g);
    for (const x of [-1.75, 1.75]) mesh(new THREE.BoxGeometry(0.1, 2.7, 0.1), M.steel, x, 1.35, -1.15, g);
    const aw = mesh(new THREE.PlaneGeometry(3.9, 2.6), M.awnings[i], 0, 2.75, 0, g, false);
    aw.rotation.x = -Math.PI / 2 + 0.25;
    const sg = mesh(new THREE.PlaneGeometry(3, 0.75), M.stallSigns[i], 0, 3.25, -1.25, g, false);
    sg.rotation.y = Math.PI;
    sg.rotation.x = 0.1;
  });
  getScene().add(root);
  return { root, wheel, gondolas, wheelA, wheelB };
}

const CROWD_SPOTS = [[-8.5, -15.5, 0.2], [-7.4, -15.8, 2.6], [-2.2, -15.6, 1.3], [-0.6, -16.2, -1.7], [6.2, -15.4, 0.6], [7.5, -16.1, 2.9],
  [-4, -7.4, 1.6], [3.5, -7.5, 1.4], [-11.8, -3.5, -0.4], [11.2, 2.5, 3.1], [-22, -45, 0.9], [-29, -44.6, 2.2]];

// A few visitors per call (the LOD tick), so the crowd doesn't build in one frame.
function buildCrowd(out = []) {
  const from = out.length;
  CROWD_SPOTS.forEach(([u, v, face], i) => {
    if (i < from || i >= from + 3) return;
    const f = i % 3 === 0;
    const m = buildPersonMesh([0x3f6ea8, 0xc8261e, 0x2f8a4a, 0xe0a526, 0x6a4a8a, 0x26262a][i % 6], [0xe2b48c, 0xd9a57c, 0x9a6a4a, 0xc89070][i % 4], { variant: f ? 'female' : 'male', seed: 6300 + i });
    const p = toW(u, v);
    m.position.set(p.x, 0, p.y);
    m.rotation.y = -(K.rot + face);
    getScene().add(m);
    out.push({ mesh: m, phase: Math.random() * 6 });
  });
  return out;
}

function disposeCrowd() {
  if (!crowd) return;
  for (const c of crowd) {
    getScene().remove(c.mesh);
    c.mesh.traverse((o) => { if (o.isSkinnedMesh) { o.geometry.dispose(); if (o.skeleton) o.skeleton.dispose(); } });
  }
  crowd = null;
}

// --- map icon ----------------------------------------------------------------------------

function drawIcon(ctx, s) {
  iconDisc(ctx, s, ACCENT);
  ctx.save();
  ctx.scale(s, s);
  ctx.strokeStyle = '#f2ede0';
  ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.arc(0, -0.4, 2.6, 0, Math.PI * 2); ctx.stroke();
  for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 2.6, -0.4 + Math.sin(a) * 2.6); ctx.lineTo(-Math.cos(a) * 2.6, -0.4 - Math.sin(a) * 2.6); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(-2, 3.4); ctx.lineTo(0, -0.4); ctx.lineTo(2, 3.4); ctx.stroke();
  ctx.restore();
}

// --- prompt and start ----------------------------------------------------------------------

function nearStand(w) {
  const p = w.player;
  if (game || w.pigeonMode || w.heliRun || p.inVehicle || p.swimming) return false;
  return Math.hypot(p.x - STAND.x, p.y - STAND.y) < USE_RADIUS;
}

// The story step (storyarc.js r-kermis, storyfun.js sets world.storyActivity):
// Jan lets you in for free and Durk & Douwe ride along.
const storyRide = (w) => w.storyActivity === 'kermis';

function blockReason(w) {
  return activityBlock(w) || (!storyRide(w) && w.money < PRICE ? `Te weinig geld: een ritje kost €${PRICE}` : null);
}

function prompt(w) {
  if (!nearStand(w)) return null;
  const why = blockReason(w);
  const rec = getChallengeRecord('botsauto');
  const sub = why || (storyRide(w) ? 'Gratis van Jan: Durk en Douwe rijden mee' : rec && rec.best != null ? `€${PRICE} · record: ${rec.best} punten${rec.medal ? ' · ' + MEDALS[rec.medal].toLowerCase() : ''}` : `€${PRICE} per ritje · ${kermisOn(w) ? 'kermisavond: dubbel prijzengeld' : 'botsen tegen Jan zijn vaste klanten'}`);
  return { id: 'botsauto', x: STAND.x, y: STAND.y, h: 2.2, key: 'E', label: "Botsauto's", sub, ring: true, dim: !!why };
}

function secondary(w) {
  if (game || w.player.inVehicle) return [];
  if (Math.abs(w.player.x - K.x) > 45 || Math.abs(w.player.y - K.y) > 45) return [];
  return [{ id: 'botsauto-2', x: STAND.x, y: STAND.y, h: 2.4, label: kermisOn(w) ? 'Kermis op de Grote Markt' : "Botsauto's", sub: 'Loop naar de kassa en druk E', kind: 'place' }];
}

function interact(w) {
  if (!nearStand(w)) return false;
  const why = blockReason(w);
  if (why) { w.addMessage(why, 2.5); return true; }
  start(w, { free: storyRide(w) });
  return true;
}

function start(w, { free = false } = {}) {
  if (game) return false;
  if (!built) built = buildTent();
  const p = w.player;
  if (p.inVehicle) p.exitVehicle(w.map, w);
  if (!free) w.money -= PRICE;
  const story = storyRide(w);
  const meLook = p.character === 'anita' ? ANITA_APPEARANCE : TAMMO_APPEARANCE;
  const mateLook = p.character === 'anita' ? TAMMO_APPEARANCE : ANITA_APPEARANCE;
  const bots = DRIVERS.map((d) => ({ name: d.name, look: { shirt: d.shirt, skin: 0xe2b48c, variant: d.variant, seed: 6400 + d.name.length, look: { age: d.age, hat: null, bag: null, umbrella: null } } }));
  if (story) bots.splice(0, 2, { name: 'Durk', twin: 'durk', look: DURK_LOOK }, { name: 'Douwe', twin: 'douwe', look: DOUWE_LOOK });
  const riders = [{ look: meLook, name: 'jij' }, { look: mateLook, name: p.character === 'anita' ? 'Tammo' : 'Tessa', mate: true }, ...bots];
  const cars = built.cars;
  const starts = [[-6, 0, 0], [6, 0, Math.PI], [-2, -3.5, 0.6], [2, 3.5, -2.4], [-2, 3.5, -0.6], [2, -3.5, 2.4]];
  cars.forEach((car, i) => {
    const r = riders[i];
    car.rider = buildPersonMesh(r.look.shirt, r.look.skin, r.look);
    seatPerson(car.rider, true);
    getScene().add(car.rider);
    car.name = r.name; car.mate = !!r.mate; car.player = i === 0; car.twin = r.twin || null;
    [car.u, car.v, car.a] = starts[i];
    car.vu = car.vv = car.va = 0;
    car.ai = { tx: rand(-HU + 2, HU - 2), ty: rand(-HV + 2, HV - 2), chase: 0, t: rand(1, 3) };
    car.hitT = -9;
    car.byMeT = -9;
    placeCar(car);
  });
  game = { t: 0, phase: 'intro', phaseT: 2.2, score: 0, hits: 0, combo: 0, comboT: 0, best: 0, flash: null, lastSay: -9, cam: null, bonus: kermisOn(w), exit: { ...STAND } };
  rides++;
  w.cinematicHidePlayers = true;
  if (built.roof) built.roof.visible = false;
  document.body.classList.add('kermis-on');
  ensureHud();
  hud.root.hidden = false;
  if (story) showCard(w, { kind: 'missie', kicker: "Botsauto's", title: 'Durk en Douwe rijden mee', body: 'De twee rode hoodies. [W] [S] gas en achteruit, [A] [D] sturen: bots ze in de flank. 75 seconden.', duration: 7, key: 'kermis-help', voice: false });
  else showCard(w, { kind: 'tip', kicker: "Botsauto's", title: 'Instappen!', body: '[W] [S] gas en achteruit, [A] [D] sturen. Bots ze in de flank voor extra punten. 75 seconden.', duration: 7, key: 'kermis-help', voice: false });
  janSay(w, story ? 'story' : 'start');
  return true;
}

// --- the ride ----------------------------------------------------------------------------------

function steer(car, thr, turn, dt, max = 5) {
  const ca = Math.cos(car.a), sa = Math.sin(car.a);
  // a bumper car turns on the spot and slides a lot
  car.va += (turn * 2.6 - car.va) * Math.min(1, dt * 6);
  car.a += car.va * dt;
  if (car.a > Math.PI) car.a -= Math.PI * 2;
  else if (car.a < -Math.PI) car.a += Math.PI * 2;
  car.vu += ca * thr * 7 * dt;
  car.vv += sa * thr * 7 * dt;
  const sp = Math.hypot(car.vu, car.vv);
  if (sp > max) { car.vu *= max / sp; car.vv *= max / sp; }
  const f = Math.exp(-dt * (thr ? 0.9 : 1.8));
  car.vu *= f; car.vv *= f;
}

function aiDrive(car, cars, dt, t) {
  const ai = car.ai;
  ai.t -= dt;
  const me = cars[0];
  if (ai.t <= 0) {
    ai.t = rand(1.5, 3.5);
    ai.chase = Math.random() < (car.mate ? 0.55 : 0.4) ? 1 : 0;
    ai.tx = rand(-HU + 2, HU - 2); ai.ty = rand(-HV + 2, HV - 2);
    if (!ai.chase && Math.random() < 0.5) { const o = cars[1 + Math.floor(Math.random() * (cars.length - 1))]; if (o !== car) { ai.tx = o.u; ai.ty = o.v; } }
  }
  const tx = ai.chase ? me.u + me.vu * 0.4 : ai.tx, ty = ai.chase ? me.v + me.vv * 0.4 : ai.ty;
  const want = Math.atan2(ty - car.v, tx - car.u);
  let da = want - car.a;
  while (da > Math.PI) da -= Math.PI * 2;
  while (da < -Math.PI) da += Math.PI * 2;
  const turn = Math.max(-1, Math.min(1, da * 1.6));
  const thr = Math.abs(da) > 2.2 ? -0.4 : Math.hypot(tx - car.u, ty - car.v) < 1.5 ? 0.2 : 0.85;
  steer(car, thr, turn, dt, car.mate ? 4.8 : 4.3);
}

function collide(w, cars) {
  const g = game;
  for (const c of cars) {
    // the rim
    const lu = HU - CAR_R, lv = HV - CAR_R;
    if (Math.abs(c.u) > lu) { c.u = Math.sign(c.u) * lu; c.vu = -c.vu * 0.55; bumpSfx(w, c, Math.abs(c.vu)); }
    if (Math.abs(c.v) > lv) { c.v = Math.sign(c.v) * lv; c.vv = -c.vv * 0.55; bumpSfx(w, c, Math.abs(c.vv)); }
  }
  for (let i = 0; i < cars.length; i++) {
    for (let j = i + 1; j < cars.length; j++) {
      const a = cars[i], b = cars[j];
      const du = b.u - a.u, dv = b.v - a.v;
      const d = Math.hypot(du, dv);
      if (d >= CAR_R * 2 || d < 1e-4) continue;
      const nu = du / d, nv = dv / d;
      const push = (CAR_R * 2 - d) / 2;
      a.u -= nu * push; a.v -= nv * push; b.u += nu * push; b.v += nv * push;
      const rel = (a.vu - b.vu) * nu + (a.vv - b.vv) * nv;
      if (rel <= 0) continue;
      // before the impulse: who drove into whom (n points from me to the other)
      const me = a.player ? a : b.player ? b : null, other = me === a ? b : a;
      const n0 = me === a ? nu : -nu, n1 = me === a ? nv : -nv;
      const myV = me ? me.vu * n0 + me.vv * n1 : 0, theirV = me ? -(other.vu * n0 + other.vv * n1) : 0;
      const imp = rel * 0.9;
      a.vu -= imp * nu; a.vv -= imp * nv; b.vu += imp * nu; b.vv += imp * nv;
      a.va += (Math.random() - 0.5) * rel; b.va += (Math.random() - 0.5) * rel;
      bumpSfx(w, a, rel);
      if (g.phase !== 'ride' || !me) continue;
      // points for the player's own bumps: speed into them, more in the flank or the back
      {
        const into = myV;
        if (into < 1.1 || into < theirV * 0.8 || g.t - me.hitT < 0.35 || g.t - (other.byMeT ?? -9) < 1.2) { if (theirV > 1.6) gotHit(w, other); continue; }
        me.hitT = g.t;
        other.byMeT = g.t;
        // along their heading: from behind; against it: head on; across: the flank
        const head = Math.cos(other.a) * n0 + Math.sin(other.a) * n1;
        const flank = Math.abs(head) < 0.55 ? 'flank' : head < 0 ? 'kop' : 'kont';
        g.combo = g.t - g.comboT < 2.2 ? g.combo + 1 : 1;
        g.comboT = g.t;
        const pts = Math.max(1, Math.round(into * 1.3 * (flank === 'flank' ? 1.8 : flank === 'kont' ? 1.4 : 0.7) * (1 + Math.min(4, g.combo - 1) * 0.25)));
        g.score += pts;
        g.hits++;
        { const q = toW(me.u, me.v); pushAudioEvent(w, { kind: 'fx', name: 'kermis_ding', x: q.x, y: q.y }); }
        g.best = Math.max(g.best, g.combo);
        g.flash = { text: `${flank === 'flank' ? 'In de flank' : flank === 'kont' ? 'Van achteren' : 'Kop op kop'}! +${pts}${g.combo > 1 ? ` · reeks ${g.combo}` : ''}`, t: 1.3 };
        w.lastImpact = { strength: Math.min(0.5, 0.12 + into * 0.07), time: w.time, x: w.player.x, y: w.player.y };
        botSay(w, other, BOTS_BUMPED);
      }
    }
  }
}

function gotHit(w, by) {
  w.lastImpact = { strength: 0.2, time: w.time, x: w.player.x, y: w.player.y };
  if (Math.random() < 0.4) botSay(w, by, BOTS_HIT);
}

function bumpSfx(w, c, k) {
  if (k < 0.6) return;
  const p = toW(c.u, c.v);
  pushAudioEvent(w, { kind: 'prop_hit', material: 'plastic', strength: Math.min(1, k / 4), x: p.x, y: p.y });
  if (k > 2) {
    const tp = toW(c.u - Math.cos(c.a) * 0.62, c.v - Math.sin(c.a) * 0.62);
    for (let i = 0; i < 6; i++) spawnFxSpark(tp.x, 4.12, tp.y, rand(-2, 2), rand(-1, 1), rand(-2, 2), 0.35);
  }
}

function updateRide(w, dt) {
  const g = game;
  const input = w.input;
  g.t += dt;
  if (g.flash && (g.flash.t -= dt) <= 0) g.flash = null;
  if (input.wasPressed('backspace')) { input.consume('backspace'); end(w, { quit: true }); return; }
  const cars = built.cars;
  if (g.phase === 'intro') {
    g.phaseT -= dt;
    if (g.phaseT <= 0) { g.phase = 'ride'; g.phaseT = RIDE_S; g.t = 0; pushAudioEvent(w, { kind: 'bell', x: K.x, y: K.y }); }
  } else if (g.phase === 'ride') {
    g.phaseT -= dt;
    if (g.phaseT < 12 && !g.lastCall) { g.lastCall = true; janSay(w, 'last'); }
    if (g.phaseT <= 0) { g.phase = 'outro'; g.phaseT = 2.2; janSay(w, 'end'); pushAudioEvent(w, { kind: 'bell', x: K.x, y: K.y }); }
  } else if (g.phase === 'outro') {
    g.phaseT -= dt;
    if (g.phaseT <= 0) { end(w); return; }
  }
  const live = g.phase === 'ride';
  const me = cars[0];
  const thr = live ? (input.isDown('w') || input.isDown('arrowup') ? 1 : 0) - (input.isDown('s') || input.isDown('arrowdown') ? 0.7 : 0) : 0;
  const turn = live ? (input.isDown('d') || input.isDown('arrowright') ? 1 : 0) - (input.isDown('a') || input.isDown('arrowleft') ? 1 : 0) : 0;
  steer(me, thr, turn, dt, 5.2);
  for (let i = 1; i < cars.length; i++) {
    if (live) aiDrive(cars[i], cars, dt, g.t);
    else steer(cars[i], 0, 0, dt);
  }
  for (const c of cars) { c.u += c.vu * dt; c.v += c.vv * dt; }
  collide(w, cars);
  for (const c of cars) {
    placeCar(c);
    if (live && Math.hypot(c.vu, c.vv) > 3.5 && Math.random() < dt * 3) {
      const tp = toW(c.u - Math.cos(c.a) * 0.62, c.v - Math.sin(c.a) * 0.62);
      spawnFxSpark(tp.x, 4.12, tp.y, rand(-1, 1), -0.5, rand(-1, 1), 0.3);
    }
  }
  const p = w.player;
  const mp = toW(me.u, me.v);
  p.x = mp.x; p.y = mp.y; p.angle = K.rot + me.a; p.speed = 0; p.moving = false;
}

function medalOf(score) {
  return score >= MEDAL_AT[3] ? 3 : score >= MEDAL_AT[2] ? 2 : score >= MEDAL_AT[1] ? 1 : 0;
}

function end(w, { quit = false } = {}) {
  const g = game;
  if (!g) return;
  game = null;
  w.cinematicHidePlayers = false;
  w.cameraOverride = null;
  document.body.classList.remove('kermis-on');
  if (hud) hud.root.hidden = true;
  if (built.roof) built.roof.visible = true;
  built.cars.forEach((car, i) => {
    if (car.rider) {
      getScene().remove(car.rider);
      car.rider.traverse((o) => { if (o.isSkinnedMesh) { o.geometry.dispose(); if (o.skeleton) o.skeleton.dispose(); } });
      car.rider = null;
    }
    parkCar(car, i);
  });
  const p = w.player;
  p.x = g.exit.x; p.y = g.exit.y; p.angle = K.rot;
  if (w.extraSpeakers) w.extraSpeakers = w.extraSpeakers.filter((e) => !e.kermis);
  if (quit) { w.addMessage("Botsauto's: eruit gestapt", 2.5); return; }
  const medal = medalOf(g.score);
  const rec = recordChallengeResult(w, 'botsauto', { value: g.score, medal });
  recordStat(w, 'botsautoRides');
  unlockAchievement(w, 'botsauto_klaar');
  if (medal >= 3) unlockAchievement(w, 'botsauto_goud');
  const prize = (PRIZE[medal] || 0) * (g.bonus ? 2 : 1);
  if (prize) w.money += prize;
  const stats = [['Punten', String(g.score)], ['Botsingen', String(g.hits)], ['Langste reeks', `${g.best}`]];
  if (medal) stats.push(['Medaille', MEDALS[medal]]);
  if (rec && rec.newBest) stats.push(['Record', 'Nieuw!']);
  showBanner({ kind: medal ? 'pass' : 'fail', title: medal ? 'KONING VAN DE BOTSAUTO\'S' : 'NOG EEN RONDJE?', reason: g.bonus && prize ? 'Kermisavond: dubbel prijzengeld' : '', reward: prize, stats });
}

// --- speech --------------------------------------------------------------------------------

function janSay(w, kind) {
  const list = KERMIS_LINES.Jan[kind];
  if (!list || !built) return;
  const text = list[Math.floor(Math.random() * list.length)];
  const sp = w.extraSpeakers || (w.extraSpeakers = []);
  for (let i = sp.length - 1; i >= 0; i--) if (sp[i].speechName === 'Kermisbaas Jan') sp.splice(i, 1);
  sp.push({ x: built.jan.x, y: built.jan.y, h: 2.3, female: false, speechName: 'Kermisbaas Jan', speechText: text, speechUntil: w.time + Math.max(2.8, 1.2 + text.length * 0.06), kermis: true });
}

function botSay(w, car, list) {
  const g = game;
  if (!g || car.player || car.mate || g.t - g.lastSay < 3.5 || Math.random() < 0.5) return;
  g.lastSay = g.t;
  const own = car.twin && KERMIS_TWINS[car.twin];
  if (own) list = list === BOTS_HIT ? own.hit : own.bumped;
  const text = list[Math.floor(Math.random() * list.length)];
  const pos = { get x() { return toW(car.u, car.v).x; }, get y() { return toW(car.u, car.v).y; } };
  const sp = w.extraSpeakers || (w.extraSpeakers = []);
  const female = DRIVERS.find((d) => d.name === car.name)?.variant === 'female';
  sp.push({ x: pos.x, y: pos.y, h: 2, follow: pos, female, speechName: own ? car.name : undefined, speechText: text, speechUntil: w.time + 2.4, kermis: true });
}

// --- per frame -------------------------------------------------------------------------------

function updateLod(w, dt) {
  const d = Math.hypot(w.player.x - K.x, w.player.y - K.y);
  const on = kermisOn(w);
  if (!built && d < DETAIL_M) built = buildTent();
  if (built) {
    const vis = d < DETAIL_M + 60 || !!game;
    built.root.visible = vis;
    for (const c of built.cars) c.mesh.visible = vis;
    built.jan.mesh.visible = vis;
  }
  if (on && !fair && d < DETAIL_M) fair = buildFair();
  if (fair) fair.root.visible = on && d < DETAIL_M + 200;
  if (on && d < 140 && (!crowd || crowd.length < CROWD_SPOTS.length)) crowd = buildCrowd(crowd || []);
  else if (crowd && (!on || d > 180)) disposeCrowd();
  // the first kermis evening of the day gets a Kiekdoar item
  const day = w.flavour ? w.flavour.day : 0;
  if (on && day !== lastKermisDay && w.time > 20) {
    lastKermisDay = day;
    if (!announced || Math.random() < 0.35) notifyPhone(w, { from: 'Kiekdoar', app: 'sikkom', text: `KIEKDOAR: ${KERMIS_NEWS}` });
    announced = true;
  }
}

function sync3D(w, dt) {
  const night = (w.dayNight && w.dayNight.night) || 0;
  const blink = Math.floor(w.time * 2.5) % 2 === 0;
  const lit = night > 0.25;
  if (mats) mats.gondola.emissiveIntensity = lit ? 0.35 : 0;
  if (built) {
    built.lightsA.material = lit && blink ? mats.bulbA : lit ? mats.bulbOff : mats.bulbA;
    built.lightsB.material = lit && !blink ? mats.bulbB : lit ? mats.bulbOff : mats.bulbB;
    animatePersonWalk(built.jan.mesh, 0, dt);
  }
  if (fair && fair.root.visible) {
    fair.wheel.rotation.z += dt * OMEGA;
    for (const gd of fair.gondolas) gd.rotation.z = -fair.wheel.rotation.z;
    fair.wheelA.material = lit && blink ? mats.bulbA : lit ? mats.bulbOff : mats.bulbA;
    fair.wheelB.material = lit && !blink ? mats.bulbB : lit ? mats.bulbOff : mats.bulbB;
  }
  if (crowd) for (const c of crowd) animatePersonWalk(c.mesh, 0, dt);
}

function camera(w) {
  const g = game;
  if (!g || !built) return;
  const me = built.cars[0];
  const a = K.rot + me.a;
  const mp = toW(me.u, me.v);
  // above and behind the car, kept inside the tent's footprint
  const back = toL(mp.x - Math.cos(a) * 6.5, mp.y - Math.sin(a) * 6.5);
  const cu = Math.max(-HU + 1, Math.min(HU - 1, back.u)), cv = Math.max(-HV + 1, Math.min(HV - 1, back.v));
  const cp = toW(cu, cv);
  const pos = { x: cp.x, y: cp.y, z: 6.2 }, at = { x: mp.x + Math.cos(a) * 2, y: mp.y + Math.sin(a) * 2, z: 0.6 };
  if (!g.cam) g.cam = { pos: { ...pos }, at: { ...at } };
  for (const key of ['x', 'y', 'z']) { g.cam.pos[key] += (pos[key] - g.cam.pos[key]) * 0.1; g.cam.at[key] += (at[key] - g.cam.at[key]) * 0.18; }
  w.cameraOverride = { position: { ...g.cam.pos }, lookAt: { ...g.cam.at }, fov: 62, cut: true };
}

// --- HUD -------------------------------------------------------------------------------------

const CSS = `
#hud .kermis-board[hidden] { display: none; }
#hud .kermis-board { position: absolute; top: 14px; left: 50%; transform: translateX(-50%); min-width: 330px; padding: 8px 18px 9px 12px; color: #f0ede4; text-shadow: var(--hud-shadow); pointer-events: none; z-index: 4;
  background: linear-gradient(90deg, rgba(12,20,14,0.9), rgba(60,20,40,0.66) 80%, rgba(60,20,40,0.2)); border-left: 3px solid ${ACCENT}; }
#hud .kermis-board small { display: block; font-size: 12px; letter-spacing: 3px; color: ${ACCENT}; }
#hud .kermis-board .kb-row { display: flex; gap: 16px; align-items: baseline; font-size: 20px; letter-spacing: 1px; }
#hud .kermis-board .kb-row b { font-weight: normal; color: #ffd23f; font-size: 24px; }
#hud .kermis-board .kb-help { display: flex; flex-wrap: wrap; align-items: center; gap: 3px; font: 13px 'Arial Narrow', Arial, sans-serif; color: rgba(240,237,228,0.78); }
#hud .kermis-board .hud-key { margin: 0 2px; vertical-align: middle; }
#hud .kermis-board .kb-flash { font-size: 22px; letter-spacing: 1.5px; color: #5dff7a; min-height: 1em; }
body.kermis-on #hud .hud-speedo, body.kermis-on #hud .hud-route, body.kermis-on #hud .phonefeed .pf-card { display: none !important; }
@media (max-width: 480px) { #hud .kermis-board { top: 64px; min-width: 0; } }
`;

function ensureHud() {
  if (hud) return hud;
  const st = document.createElement('style');
  st.textContent = CSS;
  document.head.appendChild(st);
  const root = document.createElement('div');
  root.className = 'kermis-board';
  root.hidden = true;
  root.innerHTML = "<small>BOTSAUTO'S</small><div class=\"kb-row\"></div><div class=\"kb-flash\"></div><div class=\"kb-help\"></div>";
  (document.getElementById('hud') || document.body).appendChild(root);
  hud = { root, row: root.querySelector('.kb-row'), flash: root.querySelector('.kb-flash'), help: root.querySelector('.kb-help'), key: '' };
  return hud;
}

function updateHud() {
  const g = game;
  if (!g || !hud) return;
  const k = (t) => `<span class="hud-key">${t}</span>`;
  const left = g.phase === 'ride' ? Math.max(0, Math.ceil(g.phaseT)) : g.phase === 'intro' ? RIDE_S : 0;
  const row = `<span>Tijd <b>${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}</b></span><span>Punten <b>${g.score}</b></span><span>Reeks <b>${g.phase === 'ride' && g.t - g.comboT < 2.2 ? g.combo : 0}</b></span>`;
  const flash = g.flash ? g.flash.text : g.phase === 'intro' ? 'Wacht op de bel...' : g.phase === 'outro' ? 'Afstappen!' : '';
  const help = `${k('W')}${k('S')} gas / achteruit · ${k('A')}${k('D')} sturen · ${k('BACKSPACE')} uitstappen`;
  const key = [row, flash, help].join('|');
  if (key === hud.key) return;
  hud.key = key;
  hud.row.innerHTML = row;
  hud.flash.textContent = flash;
  hud.help.innerHTML = help;
}

// --- the activity --------------------------------------------------------------------------

export const KERMIS = {
  id: 'kermis',
  layer: 'kermis',
  legend: { kind: 'act-kermis', label: 'Kermis', note: "botsauto's op de Grote Markt, 's avonds de hele kermis" },
  init(w) {
    addColliders();
    const prev = w.map.reservedAt;
    w.map.reservedAt = (x, y) => (prev ? prev(x, y) : false) || reserved(x, y);
    window.__kermis = {
      spot: () => ({ ...STAND }),
      on: () => kermisOn(w),
      start: (free = true) => start(w, { free }),
      state: () => (game ? { phase: game.phase, t: game.t, left: game.phaseT, score: game.score, hits: game.hits, combo: game.combo, twins: built ? built.cars.filter((c) => c.twin).map((c) => c.twin) : [], me: built ? { u: built.cars[0].u, v: built.cars[0].v, a: built.cars[0].a } : null } : null),
      finish: () => { if (!game) return false; game.phase = 'ride'; game.phaseT = 0.01; return true; },
      quit: () => { if (!game) return false; end(w, { quit: true }); return true; },
    };
  },
  spots(all = false) {
    return [{ id: 'botsauto', name: "Botsauto's", x: STAND.x, y: STAND.y }];
  },
  prompt,
  secondary,
  interact,
  active: () => !!game,
  quit: (w) => end(w, { quit: true }),
  update(dt, w) {
    if (!game) return;
    if (w.pendingRespawn) { end(w, { quit: true }); return; }
    updateRide(w, dt);
  },
  tick(dt, w) {
    if ((lodT -= dt) <= 0) { lodT = 0.5; updateLod(w, dt); }
    sync3D(w, dt);
    updateHud();
  },
  camera,
  icon: drawIcon,
  mapSub: (s, w) => (kermisOn(w) ? "Kermis! Botsauto's, reuzenrad en suikerspin" : "Botsauto's van kermisbaas Jan · 's avonds kermis"),
  ubbo(w) {
    const d = Math.hypot(STAND.x - w.player.x, STAND.y - w.player.y);
    const rec = getChallengeRecord('botsauto');
    return { name: kermisOn(w) ? 'Kermis op de Grote Markt' : "Botsauto's op de Grote Markt", sub: rec && rec.medal ? `record: ${MEDALS[rec.medal].toLowerCase()}` : `€${PRICE} per ritje`, dist: d, x: STAND.x, y: STAND.y, play: 'kermis', where: "de botsauto's", hint: 'loop naar de kassa en druk E' };
  },
  runs: () => rides,
};
