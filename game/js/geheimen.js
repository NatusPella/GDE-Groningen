import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { canvasTex } from './canvastex.js';
import { getScene } from './scene3d.js';
import { buildPersonMesh } from './models3d_people.js';
import { buildHorseMesh } from './countryside.js';
import { JELLE_LOOK } from './storycast.js';
import { showCard } from './hudcards.js';
import { notifyPhone } from './phonefeed.js';
import { pushAudioEvent } from './pedgeom.js';
import { addToSaveSet, getSaveSet } from './achievements.js';
import { WATER_Y } from './util.js';
import { advanceRoomClock, roomShouldClose } from './roomclock.js';

// Geheimpjes: eight hidden little things in town, each found once per
// playthrough for a small reward, counted by the hidden achievement
// 'geheimen_alle' (achievements.js, save set 'geheimen'). Some want an E
// (the door behind the Martinitoren, the eierbal vending machine in an
// alley, the bench, the mini Jelle, the duck race), the rest you only have
// to be near at the right time (the UFO over Zernike at night, the Peerd
// van Ome Loeks on top of the Martinitoren, a bike in a tree). Everything
// is built when the player comes near and hidden again further away.
// `window.__geheimen` debug.

export const SECRETS_TOTAL = 8;
const D = (x, y) => ({ x, y });
// On the south face of the Martinitoren model's plinth (landmarkmodels.js: a
// 14.4 m square centred on the footprint's bounding box, so its wall lies
// ~2.5 m inside the footprint's collision edge); a little door to fit the
// plinth's 1 m. The player stands and returns outside the footprint (DOOR_OUT).
export const DOOR = { x: 215.71, y: 2.94, a: -Math.PI / 2 };
export const DOOR_OUT = { x: 215.34, y: -0.6 };
const ROOM_Z = 360;
const UFO = { x: -1917.64, y: -2032.32, z: 55 };
const TOWER = { x: 214.32, y: 10.4, top: 95.3 };
const JELLE_AT = D(286.45, -205.71);
const VENDING = { x: 104.46, y: 149.61, a: 3.1252 };
const BENCH = { x: 246.62, y: -67.14, a: 1.5544 };
const DUCKS = { x0: [76, -693.5][0], x1: [168.18, -695.01][0], y: [122.09, -694.26][1], sign: D(105.79, -710.1) };
const BIKE_TREE = { x: -1980.48, y: -2015.21, z: 4.6 };

const fromA = (p, a, d) => ({ x: p.x + Math.cos(a) * d, y: p.y + Math.sin(a) * d });
export const DOOR_SPOT = DOOR_OUT;
const VEND_SPOT = fromA(VENDING, VENDING.a, 1.3);
const BENCH_SPOT = fromA(BENCH, BENCH.a, 1.2);
const JELLE_SPOT = D(JELLE_AT.x - 1.9, JELLE_AT.y + 0.4);

const EGGS = {
  kamer: { title: 'Het kamertje onder de Martinitoren', reward: 100 },
  ufo: { title: 'UFO boven Zernike', reward: 50 },
  peerd: { title: 'Het Peerd op de Martinitoren', reward: 50 },
  jelle: { title: 'Een Fries tuintje', reward: 25 },
  automaat: { title: 'De geheime eierbalautomaat', reward: 25 },
  bankje: { title: 'Het bankje', reward: 25 },
  eendjes: { title: 'De badeendjesrace', reward: 25 },
  fiets: { title: 'Een fiets in een boom', reward: 25 },
};

let world = null;
let room = null;
let roomScene = null;
const meshes = {};
let lodT = 0;
let ufo = null;
let ducks = null;
let race = null;
let peerdSeen = -1;
const nightNo = (w) => (w.flavour ? w.flavour.night : 0);

const found = (id) => getSaveSet('geheimen').has(id);

function discover(w, id, body) {
  if (!addToSaveSet(w, 'geheimen', id)) return false;
  const e = EGGS[id];
  const n = getSaveSet('geheimen').size;
  if (e.reward) w.money += e.reward;
  showCard(w, { kind: 'prestatie', kicker: `Geheimpje ${n}/${SECRETS_TOTAL}`, title: e.title, body: `${body}${e.reward ? ` (+€${e.reward})` : ''}`, duration: 7, key: 'geheim-' + id, voice: false });
  pushAudioEvent(w, { kind: 'prestatie' });
  return true;
}

// --- textures and small builders -------------------------------------------------------



function heart(g, x, y, s) {
  g.beginPath();
  g.moveTo(x, y + s * 0.35);
  g.bezierCurveTo(x, y, x - s * 0.5, y, x - s * 0.5, y + s * 0.3);
  g.bezierCurveTo(x - s * 0.5, y + s * 0.6, x, y + s * 0.8, x, y + s);
  g.bezierCurveTo(x, y + s * 0.8, x + s * 0.5, y + s * 0.6, x + s * 0.5, y + s * 0.3);
  g.bezierCurveTo(x + s * 0.5, y, x, y, x, y + s * 0.35);
  g.fill();
}

const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.75, ...o });
function add(parent, geo, mat, x, y, z) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

// A group at a map spot, local x along map angle a.
function anchor(p, a = 0, z = 0) {
  const g = new THREE.Group();
  g.position.set(p.x, z, p.y);
  g.rotation.y = -a;
  getScene().add(g);
  return g;
}

function buildDoor() {
  const g = anchor(DOOR, DOOR.a);
  const wood = std(0x3a2618), brass = std(0xc8a24a, { metalness: 0.8, roughness: 0.3 });
  add(g, new THREE.BoxGeometry(0.1, 0.95, 0.62), wood, 0.03, 0.48, 0);
  add(g, new THREE.BoxGeometry(0.06, 0.1, 0.2), brass, 0.09, 0.8, 0);
  add(g, new THREE.SphereGeometry(0.04, 8, 6), brass, 0.1, 0.48, 0.2);
  return g;
}

function buildRoom() {
  const g = new THREE.Group();
  g.position.set(DOOR.x, ROOM_Z, DOOR.y);
  const basic = (o) => new THREE.MeshBasicMaterial(o);
  const brick = canvasTex(256, 128, (c, w, h) => {
    c.fillStyle = '#5a2e22'; c.fillRect(0, 0, w, h);
    for (let r = 0; r < 8; r++) for (let k = -1; k < 9; k++) { c.fillStyle = ['#8a4632', '#7a3c2a', '#94503a'][(r * 7 + k) % 3]; c.fillRect(k * 32 + (r % 2) * 16 + 1, r * 16 + 1, 30, 14); }
  });
  brick.wrapS = brick.wrapT = THREE.RepeatWrapping;
  brick.repeat.set(2, 2);
  const wall = basic({ map: brick, side: THREE.BackSide });
  add(g, new THREE.BoxGeometry(4.6, 2.7, 3.8), wall, 0, 1.35, 0);
  const floor = add(g, new THREE.PlaneGeometry(4.5, 3.7).rotateX(-Math.PI / 2), basic({ color: 0x6a4a2e }), 0, 0.01, 0);
  floor.castShadow = false;
  const plaque = canvasTex(512, 256, (c, w, h) => {
    const gr = c.createLinearGradient(0, 0, w, h);
    gr.addColorStop(0, '#d8b45a'); gr.addColorStop(1, '#a8842a');
    c.fillStyle = gr; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#6a4a1a'; c.lineWidth = 10; c.strokeRect(10, 10, w - 20, h - 20);
    c.fillStyle = '#2a1a08'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = 'bold 50px Georgia, serif';
    c.fillText('Made with', w / 2 - 70, 92);
    c.fillStyle = '#c8102e'; heart(c, w / 2 + 110, 64, 58);
    c.fillStyle = '#2a1a08'; c.font = 'bold 50px Georgia, serif'; c.fillText('in Groningen', w / 2, 160);
    c.font = 'italic 19px Georgia, serif'; c.fillText('Voor iedereen die Grunn kent,', w / 2, 204); c.fillText('en wie het nog leert kennen.', w / 2, 228);
  });
  const pl = add(g, new THREE.PlaneGeometry(1.5, 0.75), basic({ map: plaque }), 2.27, 1.6, 0);
  pl.rotation.y = -Math.PI / 2;
  const desk = basic({ color: 0x4a3220 });
  add(g, new THREE.BoxGeometry(0.8, 0.08, 1.6), desk, 1.7, 0.78, -1.0);
  for (const [x, z] of [[1.35, -1.7], [2.05, -1.7], [1.35, -0.3], [2.05, -0.3]]) add(g, new THREE.BoxGeometry(0.06, 0.78, 0.06), desk, x, 0.39, z);
  const screen = canvasTex(128, 96, (c, w, h) => {
    c.fillStyle = '#0b1a10'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#5dff7a'; c.font = 'bold 26px monospace'; c.textAlign = 'center'; c.fillText('GDE', w / 2, 40);
    c.font = '13px monospace'; c.fillText('build 0.19 ok', w / 2, 66); c.fillText('> _', w / 2 - 30, 84);
  });
  add(g, new THREE.BoxGeometry(0.45, 0.4, 0.5), basic({ color: 0xd8d0c0 }), 1.85, 1.02, -1.2);
  const sc = add(g, new THREE.PlaneGeometry(0.36, 0.28), basic({ map: screen }), 1.62, 1.04, -1.2);
  sc.rotation.y = -Math.PI / 2;
  const notes = canvasTex(256, 192, (c, w, h) => {
    c.fillStyle = '#b8925a'; c.fillRect(0, 0, w, h);
    const list = [['Eierbal = rond', '#f2e050'], ['Krolbrug fixen?', '#f2a0b0'], ['Tammo + Tessa', '#a0d8f2'], ['meer duiven', '#c8f2a0'], ['Kon minder.', '#f2f2f2']];
    list.forEach(([t, col], i) => { const x = 14 + (i % 3) * 80, y = 14 + Math.floor(i / 3) * 90; c.fillStyle = col; c.fillRect(x, y, 72, 72); c.fillStyle = '#222'; c.font = '13px Arial'; c.fillText(t, x + 5, y + 36); });
  });
  const nb = add(g, new THREE.PlaneGeometry(1.1, 0.8), basic({ map: notes }), 0.2, 1.65, -1.88);
  nb.rotation.y = 0;
  add(g, new THREE.SphereGeometry(0.12, 10, 8), basic({ color: 0xfff2c0 }), 0.2, 2.45, 0.2);
  g.visible = false;
  getScene().add(g);
  return g;
}

function buildUfo() {
  const g = new THREE.Group();
  const hull = new THREE.MeshStandardMaterial({ color: 0x9aa4ae, metalness: 0.85, roughness: 0.25, emissive: 0x1a2028 });
  const disc = add(g, new THREE.SphereGeometry(7, 28, 12), hull, 0, 0, 0);
  disc.scale.set(1, 0.22, 1);
  const dome = add(g, new THREE.SphereGeometry(2.6, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x9affc8, transparent: true, opacity: 0.85 }), 0, 0.9, 0);
  dome.castShadow = false;
  const lights = [];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const m = add(g, new THREE.SphereGeometry(0.35, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffd23f }), Math.cos(a) * 6.6, -0.2, Math.sin(a) * 6.6);
    m.castShadow = false;
    lights.push(m);
  }
  const beam = new THREE.Mesh(new THREE.ConeGeometry(7, UFO.z, 24, 1, true).translate(0, -UFO.z / 2, 0), new THREE.MeshBasicMaterial({ color: 0xb8ffd8, transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
  g.add(beam);
  g.position.set(UFO.x, UFO.z, UFO.y);
  g.visible = false;
  getScene().add(g);
  return { g, lights, beam, leave: 0, z: UFO.z };
}

function buildPeerd() {
  const horse = buildHorseMesh(0);
  const sk = horse.children.find((c) => c.isSkinnedMesh);
  const g = new THREE.Group();
  const statue = new THREE.Mesh(sk.geometry, new THREE.MeshStandardMaterial({ color: 0x6b4a2a, metalness: 0.65, roughness: 0.42, emissive: 0x2a1a0a }));
  statue.scale.setScalar(2.2);
  g.add(statue);
  g.position.set(TOWER.x, TOWER.top, TOWER.y);
  g.rotation.y = 0.6;
  g.visible = false;
  getScene().add(g);
  return g;
}

function buildJelle() {
  const g = anchor(JELLE_AT, 0);
  const hedge = std(0x2f5a2a, { roughness: 0.95 });
  for (const [w, d, x, z] of [[2.6, 0.3, 0, 1.15], [2.6, 0.3, 0, -1.15], [0.3, 2, 1.15, 0]]) add(g, new THREE.BoxGeometry(w, 0.45, d), hedge, x, 0.22, z);
  add(g, new THREE.BoxGeometry(0.4, 0.5, 0.4), std(0xb8b2a6), 0, 0.25, 0);
  const p = buildPersonMesh(JELLE_LOOK.shirt, JELLE_LOOK.skin, JELLE_LOOK);
  const sk = p.children.find((c) => c.isSkinnedMesh);
  const statue = new THREE.Mesh(sk.geometry, new THREE.MeshStandardMaterial({ color: 0xd8b04a, metalness: 0.9, roughness: 0.25 }));
  statue.scale.setScalar(0.32);
  statue.position.set(0, 0.5, 0);
  statue.rotation.y = Math.PI;
  statue.castShadow = true;
  g.add(statue);
  // a little Frisian flag: blue and white stripes, red pompeblêden
  const flag = canvasTex(96, 64, (c, w, h) => {
    c.fillStyle = '#fff'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#1d4f9c';
    for (let i = 0; i < 7; i++) { c.save(); c.translate(0, 0); c.beginPath(); c.moveTo(i * 28 - 40, 0); c.lineTo(i * 28 - 26, 0); c.lineTo(i * 28 + 14, h); c.lineTo(i * 28, h); c.fill(); c.restore(); }
    c.fillStyle = '#c8102e';
    for (const [x, y] of [[20, 10], [50, 24], [74, 40]]) heart(c, x, y, 12);
  });
  add(g, new THREE.CylinderGeometry(0.02, 0.02, 1.6, 6), std(0xd8d0c0), 0.7, 0.8, 0.7);
  const fl = add(g, new THREE.PlaneGeometry(0.5, 0.33), new THREE.MeshStandardMaterial({ map: flag, side: THREE.DoubleSide }), 0.95, 1.42, 0.7);
  fl.castShadow = false;
  const sign = canvasTex(128, 48, (c, w, h) => { c.fillStyle = '#e9e0c8'; c.fillRect(0, 0, w, h); c.fillStyle = '#1d4f9c'; c.font = 'bold 22px Arial'; c.textAlign = 'center'; c.fillText('Fryske tún', w / 2, 31); });
  add(g, new THREE.BoxGeometry(0.03, 0.6, 0.03), std(0x6a4a2a), -1.35, 0.3, -0.6);
  const sg = add(g, new THREE.PlaneGeometry(0.5, 0.19), new THREE.MeshStandardMaterial({ map: sign }), -1.37, 0.62, -0.6);
  sg.rotation.y = -Math.PI / 2;
  return g;
}

function buildVending() {
  const g = anchor(VENDING, VENDING.a);
  add(g, new THREE.BoxGeometry(0.32, 1.7, 1.3), std(0xe9d27a, { roughness: 0.5 }), 0.16, 1.05, 0);
  const glass = new THREE.MeshStandardMaterial({ color: 0x3a3020, emissive: 0xffa040, emissiveIntensity: 0.55, roughness: 0.2 });
  for (let r = 0; r < 3; r++) for (let k = 0; k < 3; k++) add(g, new THREE.BoxGeometry(0.02, 0.3, 0.32), glass, 0.33, 0.62 + r * 0.38, -0.38 + k * 0.38);
  const sign = canvasTex(192, 48, (c, w, h) => { c.fillStyle = '#c8261e'; c.fillRect(0, 0, w, h); c.fillStyle = '#fff6d8'; c.font = 'bold 26px Arial'; c.textAlign = 'center'; c.fillText('EIERBAL · €2', w / 2, 33); });
  const s = add(g, new THREE.PlaneGeometry(1.2, 0.3), new THREE.MeshBasicMaterial({ map: sign }), 0.33, 1.75, 0);
  s.rotation.y = Math.PI / 2;
  return g;
}

function buildBench() {
  const g = anchor(BENCH, BENCH.a);
  const wood = std(0x7a5a3a), iron = std(0x2a2e30, { metalness: 0.6, roughness: 0.5 });
  for (const x of [-0.12, 0.05]) add(g, new THREE.BoxGeometry(0.14, 0.04, 1.7), wood, x, 0.45, 0);
  for (const y of [0.62, 0.78]) add(g, new THREE.BoxGeometry(0.03, 0.12, 1.7), wood, -0.24, y, 0);
  for (const z of [-0.75, 0.75]) { add(g, new THREE.BoxGeometry(0.4, 0.45, 0.05), iron, -0.05, 0.22, z); add(g, new THREE.BoxGeometry(0.05, 0.55, 0.05), iron, -0.26, 0.6, z); }
  const plate = canvasTex(160, 40, (c, w, h) => { c.fillStyle = '#c8a24a'; c.fillRect(0, 0, w, h); c.fillStyle = '#2a1a08'; c.font = 'bold 24px Georgia, serif'; c.textAlign = 'center'; c.fillText('Kon minder', w / 2, 28); });
  const p = add(g, new THREE.PlaneGeometry(0.34, 0.085), new THREE.MeshStandardMaterial({ map: plate, metalness: 0.6, roughness: 0.35 }), -0.22, 0.7, 0);
  p.rotation.y = Math.PI / 2;
  return g;
}

const DUCK_COLORS = [['geel', 0xf2d22e], ['rood', 0xd8262e], ['blauw', 0x2f6fd0], ['groen', 0x2fa04a], ['roze', 0xf07ab0], ['oranje', 0xf08a1e]];
function buildDucks() {
  const out = [];
  DUCK_COLORS.forEach(([name, c], i) => {
    const g = new THREE.Group();
    const mat = std(c, { roughness: 0.4 });
    const body = add(g, new THREE.SphereGeometry(0.32, 12, 8), mat, 0, 0.12, 0);
    body.scale.set(1.25, 0.8, 1);
    add(g, new THREE.SphereGeometry(0.19, 10, 8), mat, 0.26, 0.42, 0);
    const beak = add(g, new THREE.ConeGeometry(0.07, 0.18, 8), std(0xf08a1e), 0.47, 0.4, 0);
    beak.rotation.z = -Math.PI / 2;
    g.position.set(DUCKS.x0, WATER_Y, DUCKS.y - 5 + i * 2);
    getScene().add(g);
    out.push({ g, name, lane: -5 + i * 2, x: DUCKS.x0, speed: 0 });
  });
  const sign = canvasTex(192, 96, (c, w, h) => { c.fillStyle = '#f2e8d0'; c.fillRect(0, 0, w, h); c.fillStyle = '#c8261e'; c.font = 'bold 22px Arial'; c.textAlign = 'center'; c.fillText('BADEENDJES-', w / 2, 34); c.fillText('RACE', w / 2, 60); c.fillStyle = '#333'; c.font = '15px Arial'; c.fillText('inleg €2 · winst €10', w / 2, 84); });
  const g = anchor(DUCKS.sign, 1.5544);
  add(g, new THREE.BoxGeometry(0.06, 1.1, 0.06), std(0x6a4a2a), 0, 0.55, 0);
  const s = add(g, new THREE.PlaneGeometry(0.8, 0.4), new THREE.MeshStandardMaterial({ map: sign, side: THREE.DoubleSide }), 0.04, 1.2, 0);
  s.rotation.y = Math.PI / 2;
  // start (red) and finish (white) buoys
  const buoys = [];
  const geo = new THREE.CylinderGeometry(0.25, 0.3, 0.5, 10);
  for (const x of [DUCKS.x0 - 1, DUCKS.x1]) {
    const mat = std(x > DUCKS.x0 ? 0xf2f2f2 : 0xc8261e);
    for (const dz of [-7, 7]) {
      const b = new THREE.Mesh(geo, mat);
      b.position.set(x, WATER_Y + 0.15, DUCKS.y + dz);
      getScene().add(b);
      buoys.push(b);
    }
  }
  return { list: out, sign: g, buoys };
}

function buildBike() {
  const g = new THREE.Group();
  const frame = std(0x2f6fd0, { metalness: 0.4, roughness: 0.5 }), tyre = std(0x151515);
  for (const x of [-0.55, 0.55]) { const w = add(g, new THREE.TorusGeometry(0.34, 0.035, 6, 18), tyre, x, 0, 0); w.castShadow = true; }
  const bar = (a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1]; const L = Math.hypot(dx, dy); const m = add(g, new THREE.CylinderGeometry(0.022, 0.022, L, 6), frame, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, 0); m.rotation.z = Math.atan2(dy, dx) - Math.PI / 2; };
  bar([-0.55, 0], [-0.05, 0]); bar([-0.05, 0], [0.42, 0.42]); bar([-0.55, 0], [-0.18, 0.46]); bar([-0.18, 0.46], [0.42, 0.42]); bar([-0.05, 0], [-0.18, 0.46]); bar([0.55, 0], [0.42, 0.42]); bar([0.42, 0.42], [0.36, 0.62]);
  add(g, new THREE.BoxGeometry(0.22, 0.05, 0.1), tyre, -0.2, 0.52, 0);
  add(g, new THREE.CylinderGeometry(0.018, 0.018, 0.5, 6).rotateX(Math.PI / 2), tyre, 0.36, 0.64, 0);
  g.position.set(BIKE_TREE.x, BIKE_TREE.z, BIKE_TREE.y);
  g.rotation.set(0.35, 0.8, 0.25);
  getScene().add(g);
  return g;
}

// --- per frame ------------------------------------------------------------------------

function nearP(w, p, r) {
  return Math.abs(w.player.x - p.x) < r && Math.abs(w.player.y - p.y) < r && Math.hypot(w.player.x - p.x, w.player.y - p.y) < r;
}

function hour(w) {
  return ((w.clock % 24) + 24) % 24;
}

function ufoNight(w) {
  const h = hour(w);
  return h >= 23 || h < 4.5;
}

function peerdNight(w) {
  const h = hour(w);
  return !found('peerd') && nightNo(w) >= 1 && (h >= 0.5 && h < 5);
}

function lod(w) {
  const spec = [
    ['door', DOOR, 220, buildDoor], ['jelle', JELLE_AT, 200, buildJelle], ['vending', VENDING, 160, buildVending],
    ['bench', BENCH, 200, buildBench], ['bike', BIKE_TREE, 220, buildBike],
  ];
  for (const [k, p, r, fn] of spec) {
    const near = nearP(w, p, r);
    if (near && !meshes[k]) meshes[k] = fn();
    if (meshes[k]) meshes[k].visible = near;
  }
  if (nearP(w, { x: (DUCKS.x0 + DUCKS.x1) / 2, y: DUCKS.y }, 240) && !ducks) ducks = buildDucks();
  if (ducks) {
    const vis = nearP(w, { x: (DUCKS.x0 + DUCKS.x1) / 2, y: DUCKS.y }, 280);
    for (const d of ducks.list) d.g.visible = vis;
    for (const b of ducks.buoys) b.visible = vis;
    ducks.sign.visible = vis;
  }
  const ufoWanted = ufoNight(w) && nearP(w, UFO, 900);
  if (ufoWanted && !ufo) ufo = buildUfo();
  if (ufo && !ufoWanted && !ufo.leave) ufo.g.visible = false;
  if (ufo && ufoWanted && !ufo.leave && !ufo.gone) ufo.g.visible = true;
  if (ufo && !ufoNight(w)) { ufo.gone = false; ufo.leave = 0; ufo.z = UFO.z; }
  if (peerdNight(w) && !meshes.peerd && nearP(w, TOWER, 700)) meshes.peerd = buildPeerd();
  // once: after the night it was found it is gone for good
  if (meshes.peerd) meshes.peerd.visible = peerdNight(w) || (peerdSeen === nightNo(w) && hour(w) < 5 && hour(w) >= 0.5);
}

function proximity(w, dt) {
  const p = w.player;
  if (w.pigeonMode && !nearP(w, TOWER, 30)) return;
  if (ufo && ufo.g.visible && !ufo.leave && Math.hypot(p.x - UFO.x, p.y - UFO.y) < 190) {
    ufo.leave = 0.001;
    if (!found('ufo')) {
      discover(w, 'ufo', 'Een schotel met lichtjes boven het Zernikecomplex. Hij ziet je, en is weg.');
      notifyPhone(w, { from: 'Kiekdoar', app: 'sikkom', text: 'KIEKDOAR: Studenten zien UFO boven Zernike. Universiteit: "Gewoon een proefje."', voiced: true });
    }
  }
  if (meshes.peerd && meshes.peerd.visible && !found('peerd') && nearP(w, TOWER, 150)) {
    peerdSeen = nightNo(w);
    discover(w, 'peerd', 'Wacht even. Staat daar een paard boven op de Martinitoren? Het Peerd van Ome Loeks, met uitzicht.');
  }
  if (meshes.bike && !found('fiets') && nearP(w, BIKE_TREE, 18)) discover(w, 'fiets', 'Hoog in een boom op Zernike hangt een fiets. Niemand weet hoe. Iedereen weet wie: studenten.');
}

function updateUfo(w, dt) {
  if (!ufo || !ufo.g.visible) return;
  const t = w.time;
  ufo.lights.forEach((m, i) => m.material.color.setHSL(((t * 0.4 + i / 12) % 1), 0.9, 0.6));
  if (ufo.leave) {
    ufo.leave += dt;
    ufo.beam.visible = false;
    ufo.z += dt * (20 + ufo.leave * 120);
    if (ufo.z > 900) { ufo.g.visible = false; ufo.gone = true; }
  } else {
    ufo.beam.visible = true;
    ufo.beam.material.opacity = 0.09 + 0.05 * Math.sin(t * 3);
  }
  ufo.g.position.set(UFO.x + Math.sin(t * 0.3) * 12, ufo.z + Math.sin(t * 1.3) * 1.2, UFO.y + Math.cos(t * 0.23) * 9);
  ufo.g.rotation.y += dt * 0.6;
}

// The duck race: a heat of ~45 s along the pond, then a short break.
function updateDucks(w, dt) {
  if (!ducks) return;
  if (!race) race = { phase: 'break', t: 6, bet: null };
  race.t -= dt;
  const list = ducks.list;
  if (race.phase === 'break') {
    for (const d of list) { d.x += (DUCKS.x0 - d.x) * Math.min(1, dt * 0.5); }
    if (race.t <= 0) {
      race.phase = 'race';
      race.t = 70;
      for (const d of list) { d.x = DUCKS.x0; d.base = 1.6 + Math.random() * 0.5; }
    }
  } else {
    let winner = null;
    for (const d of list) {
      d.speed = d.base + Math.sin(w.time * (0.7 + d.lane * 0.05) + d.lane) * 0.7 + (Math.random() - 0.5) * 0.4;
      d.x += Math.max(0.3, d.speed) * dt;
      if (d.x >= DUCKS.x1 && !winner) winner = d;
    }
    if (winner || race.t <= 0) {
      const win = winner || list.reduce((a, b) => (a.x > b.x ? a : b));
      const bet = race.bet;
      if (bet || nearP(w, { x: (DUCKS.x0 + DUCKS.x1) / 2, y: DUCKS.y }, 70)) {
        const mine = bet && bet === win.name;
        if (mine) w.money += 10;
        showCard(w, { kind: mine ? 'geld' : 'tip', kicker: 'Badeendjesrace', title: `De ${win.name}e eend wint!`, body: bet ? (mine ? 'Jouw eend! +€10' : `Jij had de ${bet}e. Volgende race beter.`) : 'Zet bij het bordje €2 in op de volgende race.', duration: 5, key: 'eendjes', voice: false });
      }
      race.phase = 'break';
      race.t = 12;
      race.bet = null;
    }
  }
  for (const d of list) {
    d.g.position.set(d.x, WATER_Y - 0.02 + Math.sin(w.time * 3 + d.lane) * 0.04, DUCKS.y + d.lane);
    d.g.rotation.z = Math.sin(w.time * 2.2 + d.lane) * 0.12;
  }
}

// --- the room under the Martinitoren --------------------------------------------------------

function enterRoom(w) {
  if (!roomScene) roomScene = buildRoom();
  roomScene.visible = true;
  room = { t: 0, last: null };
  const first = !found('kamer');
  if (first) discover(w, 'kamer', 'Achter een deurtje in de Martinitoren: een kamertje met een bureau, een oude computer en een plaquette. "Made with ❤ in Groningen." Op het bureau een envelop: "Bedankt voor het spelen."');
  else showCard(w, { kind: 'tip', kicker: 'Martinitoren', title: 'Het kamertje', body: 'Nog altijd hier. Nog altijd met liefde gemaakt.', duration: 5, key: 'geheim-kamer', voice: false });
  pushAudioEvent(w, { kind: 'door_open', x: DOOR.x, y: DOOR.y, wood: true });
}

function dropRoom(w) {
  room = null;
  if (roomScene) roomScene.visible = false;
  if (w.cameraOverride && w.cameraOverride.kamer) w.cameraOverride = null;
}

function leaveRoom(w) {
  dropRoom(w);
  const p = w.player;
  p.x = DOOR_SPOT.x; p.y = DOOR_SPOT.y; p.angle = DOOR.a;
  pushAudioEvent(w, { kind: 'door_close', x: DOOR.x, y: DOOR.y, wood: true });
}

function roomCamera(w) {
  if (!room) return;
  const k = Math.min(1, room.t / 6);
  const sway = Math.sin(room.t * 0.6) * 0.15;
  w.cameraOverride = {
    position: { x: DOOR.x - 1.7 + k * 0.6, y: DOOR.y + 0.9 - k * 0.5 + sway, z: ROOM_Z + 1.65 },
    lookAt: { x: DOOR.x + 2.27, y: DOOR.y + sway * 0.3, z: ROOM_Z + 1.5 }, fov: 55, cut: true, kamer: true,
  };
}

// --- prompts --------------------------------------------------------------------------------

function onFoot(w) {
  const p = w.player;
  return !(p.inVehicle || p.swimming || w.pigeonMode || w.heliRun || room);
}

function nearUse(w) {
  if (!onFoot(w)) return null;
  const p = w.player;
  const near = (s, r = 1.8) => Math.hypot(p.x - s.x, p.y - s.y) < r;
  if (meshes.door && near(DOOR_SPOT, 1.6)) return 'kamer';
  if (meshes.vending && near(VEND_SPOT)) return 'automaat';
  if (meshes.bench && near(BENCH_SPOT)) return 'bankje';
  if (meshes.jelle && near(JELLE_SPOT, 2)) return 'jelle';
  if (ducks && near(DUCKS.sign, 2.2)) return 'eendjes';
  return null;
}

function prompt(w) {
  const id = nearUse(w);
  if (!id) return null;
  if (id === 'kamer') return { id: 'geheim-kamer', x: DOOR.x, y: DOOR.y, h: 1.6, key: 'E', label: 'Deurtje', sub: found('kamer') ? 'Het kamertje' : 'Zit er nog een deur in de Martinitoren?', ring: true };
  if (id === 'automaat') return { id: 'geheim-automaat', x: VENDING.x, y: VENDING.y, h: 2.1, key: 'E', label: 'Eierbal pakken', sub: w.money >= 2 ? '€2 · +35 gezondheid' : 'Te weinig geld (€2)', ring: true, dim: w.money < 2 };
  if (id === 'bankje') return { id: 'geheim-bankje', x: BENCH.x, y: BENCH.y, h: 1.3, key: 'E', label: 'Plaatje lezen', sub: 'Er zit een koperen plaatje op dit bankje', ring: true };
  if (id === 'jelle') return { id: 'geheim-jelle', x: JELLE_AT.x, y: JELLE_AT.y, h: 1.2, key: 'E', label: 'Bekijken', sub: 'Een tuintje met een vlaggetje', ring: true };
  if (id === 'eendjes') {
    const sub = race && race.bet ? `Jij hebt de ${race.bet}e eend` : race && race.phase === 'race' ? 'Wacht op de volgende race' : w.money >= 2 ? '€2 inzetten op een eend · winst €10' : 'Te weinig geld (€2)';
    return { id: 'geheim-eendjes', x: DUCKS.sign.x, y: DUCKS.sign.y, h: 1.6, key: 'E', label: 'Badeendjesrace', sub, ring: true, dim: !!(race && (race.bet || race.phase === 'race')) || w.money < 2 };
  }
  return null;
}

function interact(w) {
  const id = nearUse(w);
  if (!id) return false;
  if (id === 'kamer') { enterRoom(w); return true; }
  if (id === 'automaat') {
    if (w.money < 2) { w.addMessage('Te weinig geld: een eierbal kost €2', 2.5); return true; }
    w.money -= 2;
    w.health = Math.min(100, w.health + 35);
    pushAudioEvent(w, { kind: 'door_open', x: VENDING.x, y: VENDING.y });
    if (!discover(w, 'automaat', 'Een muurautomaat in een steegje, met eierballen achter warme klepjes. Twee euro, en hij is nog heet ook.')) w.addMessage('Klepje open: een warme eierbal uit de muur (+35 gezondheid)', 3);
    return true;
  }
  if (id === 'bankje') {
    if (!discover(w, 'bankje', 'Op het plaatje staat: "Kon minder." In Grunn is dat het hoogste compliment dat een bankje kan krijgen.')) w.addMessage('Op het plaatje: "Kon minder."', 3);
    return true;
  }
  if (id === 'jelle') {
    if (!discover(w, 'jelle', 'Midden in de Prinsentuin: een Fries tuintje met een vlaggetje en een gouden Jelle van dertig centimeter. Wie dóét zoiets?')) w.addMessage('De gouden mini-Jelle kijkt tevreden over de Prinsentuin', 3);
    return true;
  }
  if (id === 'eendjes') {
    const first = discover(w, 'eendjes', 'In de vijver van het Noorderplantsoen racen badeendjes. Er wordt flink op gegokt.');
    if (!race || race.phase === 'race' || race.bet) { if (!first) w.addMessage(race && race.bet ? `Je hebt al ingezet op de ${race.bet}e eend` : 'Er is al een race bezig: wacht op de volgende', 2.5); return true; }
    if (w.money < 2) { if (!first) w.addMessage('Te weinig geld: de inleg is €2', 2.5); return true; }
    w.money -= 2;
    race.bet = DUCK_COLORS[Math.floor(Math.random() * DUCK_COLORS.length)][0];
    if (!first) w.addMessage(`Ingezet: de ${race.bet}e eend`, 3);
    return true;
  }
  return false;
}

// --- the activity ---------------------------------------------------------------------------

export const GEHEIMEN = {
  id: 'geheimen',
  init(w) {
    world = w;
    // dying or being arrested puts you elsewhere: no walk to the door, but the room and its camera go
    w.onRespawn.push((ww) => { if (room) dropRoom(ww); });
    window.__geheimen = {
      found: () => [...getSaveSet('geheimen')],
      total: SECRETS_TOTAL,
      spots: () => ({ kamer: DOOR_SPOT, automaat: VEND_SPOT, bankje: BENCH_SPOT, jelle: JELLE_SPOT, eendjes: DUCKS.sign, ufo: UFO, peerd: TOWER, fiets: BIKE_TREE }),
      room: () => !!room,
      race: () => (race ? { phase: race.phase, t: race.t, bet: race.bet } : null),
    };
  },
  // the walk-up spots, for the spot check
  spots(all = false) {
    if (!all) return [];
    return [
      { id: 'kamer', name: 'deurtje Martinitoren', ...DOOR_SPOT }, { id: 'automaat', name: 'eierbalautomaat', ...VEND_SPOT },
      { id: 'bankje', name: 'bankje Kon minder', ...BENCH_SPOT }, { id: 'jelle', name: 'Fries tuintje', ...JELLE_SPOT },
      { id: 'eendjes', name: 'badeendjesrace', ...DUCKS.sign },
    ];
  },
  prompt,
  secondary: () => [],
  interact,
  active: () => !!room,
  quit: (w) => { if (room) leaveRoom(w); },
  update(dt, w) {
    if (!room) return;
    const t = advanceRoomClock(room, performance.now(), dt);
    const input = w.input;
    w.player.speed = 0;
    if (roomShouldClose(t, input.wasPressed('e') || input.wasPressed('backspace') || input.wasPressed('f'), w.pendingRespawn)) {
      input.consume('e'); input.consume('f'); input.consume('backspace');
      leaveRoom(w);
    }
  },
  tick(dt, w) {
    if (!room && w.cameraOverride && w.cameraOverride.kamer) w.cameraOverride = null;
    if ((lodT -= dt) <= 0) { lodT = 0.5; lod(w); proximity(w, dt); }
    updateUfo(w, dt);
    updateDucks(w, dt);
  },
  camera: roomCamera,
};
