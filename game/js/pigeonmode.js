import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { getScene } from './scene3d.js';
import { buildBuildingMesh } from './models3d_buildings.js';
import { onLandmarkModelLoaded } from './landmarkmodels.js';
import { getSettings } from './settings.js';
import { pushAudioEvent } from './pedgeom.js';
import { unlockAchievement } from './achievements.js';
import { saveGame } from './savehook.js';
import { pointInPolygon, isInWater, clamp, angleLerp, normalizeAngle, WATER_Y } from './util.js';
import { KEYS } from './storagekeys.js';
import { quitRunningActivities } from './busy.js';
import { waterNearby } from './waterlevels.js';

const LEVEL_H = 3.1;
const G = 9.8;
const MAX_ALT = 120;
const CRUISE = 11;
const MIN_SPEED = 3;
const MAX_SPEED = 24;
const STALL_SPEED = 6;
const WALL_STEP = 0.35;
const PIGEON_SCALE = 1.5;
const PROXY_NEAR = 50;
const PROXY_FAR = 85;
const STORE_KEY = KEYS.pigeon;
const COMBO_S = 3.5;
const BOOST_S = 15;
const MILESTONES = [
  [100, 'KIEKDOAR: mysterieuze duif terroriseert de Grote Markt'],
  [250, 'KIEKDOAR: stomerijen in Grunn draaien overuren'],
  [500, 'KIEKDOAR: gemeente overweegt duivenparaplu voor de binnenstad'],
  [1000, 'KIEKDOAR: "Het was één duif", zegt getuige. "Eén. Duif."'],
  [2000, 'KIEKDOAR: Martinitoren krijgt poetsploeg, duif blijft voortvluchtig'],
];
const PED_LINES = ['Bah! Een duif!', 'Hé! Mien jas!', 'Kreng van n duuf!', 'Nee hè, net wassen!', 'Dat brengt geluk, zeggen ze…', 'Wie gooit dat?! O. Een duif.'];
const COP_LINES = ['Hé! Belediging van n ambtenaar!', 'Aanhouden, die duif!', 'Mien pet! Mien nieuwe pet!'];
const FOOD_LINES = ['Hé! Mien patat!', 'Dat was mien kroket!', 'Rotbeest! Geef terug!'];
const COO_LINES = ['Ach, wat n dikke duif.', 'Kiek, n duifke!', 'Hou die poten thuis, duif.'];
const ACH = {
  martini: 'Hoogste duif van Grunn!',
  forum: 'Uitzicht vanaf het Forum',
  station: 'Stationsduif',
  aakerk: 'Kerkduif van de Der Aa-kerk',
  bus: 'Zwartrijder: meegelift op de bus',
  boot: 'Grachtenduif: meegevaren',
  auto: 'Liftduif: meegereden op een auto',
  loft: 'Thuis bij de duivenmelker',
  meeuw: 'Meeuw te slim af',
};
const CAR_ROOF = { van: 2.05, sport: 1.22, hatch: 1.45, sedan: 1.42, wagon: 1.5, escort: 1.38 };
const LOFT_SPOT = { x: 261.5, y: -210.93 };

const INTRO_S = 1.9;
const CAM_BLEND_S = 0.7;
const OUTRO_S = 2.6;

let world = null;
let scene = null;
let active = false;
let ready = false;
let store = { best: 0, total: 0, ach: [], home: false };
let intro = null;
let outro = null;
let camBlend = 0;
let session = null;

const P = {
  x: 0, y: 0, z: 30, yaw: 0, pitch: 0, roll: 0, speed: CRUISE, flapBoost: 0, pitchCmd: 0,
  mode: 'fly', landing: false, walkPhase: 0, flapPhase: 0, flapAmp: 0.5, fold: 0, yawRate: 0,
  ride: null, carry: null, boostT: 0, flapSoundT: 0, cooT: 6, bonkAt: -99, splashAt: -99, peckT: 0,
};
const cam = { pos: null, yaw: 0, pitchOff: 0, orbitT: 0, orbitA: 0 };
let lastSet = { x: 0, y: 0 };
let prevMouseDown = false;
let poopCd = 0;
let score = 0;
let combo = 0;
let comboUntil = 0;
let milestoneIdx = 0;
let hintAt = 0;
let elapsed = 0;

let pigeon = null;
let shadow = null;
const drops = [];
const decals = [];
const foods = [];
let foodTimer = 2;
let gull = null;
let gullCd = 0;
let gullDiveHits = 0;
const flock = [];
let flockScatterT = 0;
let loft = null;
const achCd = new Map();
const landmarkHitAt = new Map();

const proxies = new Map();
const extraColliders = [];
let proxyTimer = 0;
const raycaster = new THREE.Raycaster();
const DOWN = new THREE.Vector3(0, -1, 0);
const _o = new THREE.Vector3();
const _d = new THREE.Vector3();

let hud = null;

// --- storage ---------------------------------------------------------------

function sanitizeStore(d) {
  return {
    best: Math.max(0, Math.floor(Number(d.best) || 0)),
    total: Math.max(0, Math.floor(Number(d.total) || 0)),
    ach: Array.isArray(d.ach) ? d.ach.filter((a) => typeof a === 'string' && ACH[a]) : [],
    home: !!d.home,
  };
}

// Pigeon progress lives in the savegame; the old standalone-mode key is only
// read once so earlier high scores carry over.
function loadLegacyStore() {
  try {
    const d = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
    if (d && typeof d === 'object') store = sanitizeStore(d);
  } catch (e) { /* ignore */ }
}

export function getPigeonSaveData() {
  return { ...store, ach: [...store.ach] };
}

export function applyPigeonSaveData(d) {
  if (!d || typeof d !== 'object') return;
  const s = sanitizeStore(d);
  store = { best: Math.max(store.best, s.best), total: Math.max(store.total, s.total), ach: [...new Set([...store.ach, ...s.ach])], home: store.home || s.home };
}


// --- helpers ---------------------------------------------------------------

function sfx(kind, x = P.x, y = P.y, strength = 0.6, extra = {}) {
  pushAudioEvent(world, { kind, x, y, strength, ...extra });
}

const pick = (list) => list[Math.floor(Math.random() * list.length)];

function mat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, flatShading: true, ...opts });
}

function blob(r, sx, sy, sz, material, x, y, z, detail = 1) {
  const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, detail), material);
  m.scale.set(sx, sy, sz);
  m.position.set(x, y, z);
  return m;
}

function box(w, h, d, material, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  return m;
}

function roofHeight(v) {
  if (v.isBus) return 3.05;
  if (v.isBoat) return WATER_Y + 1.25;
  return CAR_ROOF[v.model && v.model.name] ?? 1.5;
}

function rectDist(b, x, y) {
  return Math.hypot(Math.max(b[0] - x, 0, x - b[2]), Math.max(b[1] - y, 0, y - b[3]));
}

function buildingDepth(b) {
  if (b.landmarkKind === 'tower') return 95 * 0.6;
  return Math.max(2.4, (b.h || 3) * LEVEL_H);
}

// --- collision -------------------------------------------------------------

function syncProxies(x, y, force = false) {
  proxyTimer -= 1;
  if (proxyTimer > 0 && !force) return;
  proxyTimer = 12;
  let built = 0;
  for (const b of world.map.buildingsNear(x, y, PROXY_NEAR)) {
    if (proxies.has(b) || rectDist(b.bounds, x, y) > PROXY_NEAR) continue;
    if (built++ > (force ? 400 : 20)) break;
    try {
      const g = buildBuildingMesh(b);
      g.updateMatrixWorld(true);
      const meshes = [];
      g.traverse((o) => { if (o.isMesh) meshes.push(o); });
      proxies.set(b, { meshes, bounds: b.bounds });
    } catch (e) {
      proxies.set(b, { meshes: [], bounds: b.bounds, failed: true });
    }
  }
  for (const [b, pr] of proxies) if (rectDist(pr.bounds, x, y) > PROXY_FAR) proxies.delete(b);
}

function rayDownMeshes(meshes, x, y) {
  raycaster.set(_o.set(x, 220, y), DOWN);
  raycaster.near = 0;
  raycaster.far = 240;
  const hits = raycaster.intersectObjects(meshes, false);
  return hits.length ? 220 - hits[0].distance : -Infinity;
}

// Highest surface straight above/below (x, y): roofs, towers, vehicle roofs, water or ground.
function surfaceAt(x, y, withVehicles = true) {
  let h = -Infinity, bHit = null, kind = 'ground', vHit = null;
  for (const [b, pr] of proxies) {
    const bb = pr.bounds;
    if (x < bb[0] - 2 || x > bb[2] + 2 || y < bb[1] - 2 || y > bb[3] + 2) continue;
    let hy;
    if (pr.failed) hy = pointInPolygon(x, y, b.pts) ? buildingDepth(b) : -Infinity;
    else hy = rayDownMeshes(pr.meshes, x, y);
    if (hy > h) { h = hy; bHit = b; }
  }
  for (const b of world.map.buildingsNear(x, y, 1)) {
    if (proxies.has(b)) continue;
    const bb = b.bounds;
    if (x < bb[0] || x > bb[2] || y < bb[1] || y > bb[3] || !pointInPolygon(x, y, b.pts)) continue;
    const hy = buildingDepth(b);
    if (hy > h) { h = hy; bHit = b; }
  }
  for (const c of extraColliders) {
    const bb = c.bounds;
    if (x < bb[0] || x > bb[2] || y < bb[1] || y > bb[3]) continue;
    const hy = rayDownMeshes(c.meshes, x, y);
    if (hy > h) { h = hy; bHit = null; kind = c.kind; }
  }
  if (bHit) kind = 'building';
  if (withVehicles) {
    for (const v of world.vehicles) {
      if (v.isBike || v.isScooter || !v.model) continue;
      const dx = x - v.x, dy = y - v.y;
      if (Math.abs(dx) > 8 || Math.abs(dy) > 8) continue;
      const c = Math.cos(v.angle), s = Math.sin(v.angle);
      const lx = dx * c + dy * s, ly = -dx * s + dy * c;
      if (Math.abs(lx) > v.model.len / 2 || Math.abs(ly) > v.model.wid / 2) continue;
      const rh = roofHeight(v);
      if (rh > h) { h = rh; kind = 'vehicle'; vHit = v; bHit = null; }
    }
  }
  if (h < 0.02) {
    if (isInWater(world.map, x, y)) return { h: WATER_Y, kind: 'water' };
    return { h: 0, kind: 'ground' };
  }
  return { h, kind, b: bHit, v: vHit };
}

function rayHitDistance(fx, fy, fz, tx, ty, tz) {
  const dx = tx - fx, dy = ty - fy, dz = tz - fz;
  const len = Math.hypot(dx, dy, dz);
  if (len < 1e-3) return Infinity;
  const minx = Math.min(fx, tx) - 1, maxx = Math.max(fx, tx) + 1, miny = Math.min(fy, ty) - 1, maxy = Math.max(fy, ty) + 1;
  const meshes = [];
  for (const pr of proxies.values()) {
    const b = pr.bounds;
    if (b[2] < minx || b[0] > maxx || b[3] < miny || b[1] > maxy) continue;
    for (const m of pr.meshes) meshes.push(m);
  }
  for (const c of extraColliders) for (const m of c.meshes) meshes.push(m);
  if (!meshes.length) return Infinity;
  raycaster.set(_o.set(fx, fz, fy), _d.set(dx / len, dz / len, dy / len));
  raycaster.near = 0;
  raycaster.far = len;
  const hits = raycaster.intersectObjects(meshes, false);
  return hits.length ? hits[0].distance : Infinity;
}

// --- models ----------------------------------------------------------------

const BIRD_COLORS = {
  pigeon: { body: 0x8a93a6, breast: 0x949db0, head: 0x7b8497, wing: 0x9ea7ba, bar: 0x2f323a, tip: 0x4f5564, tail: 0x7d8699, band: 0x2b2e36, neck: 0x2f8a64, neck2: 0x7b4a93, beak: 0x2b2b2b, eye: 0xff8c1a, leg: 0xe0663a },
  gull: { body: 0xf4f4f0, breast: 0xf7f7f4, head: 0xf8f8f5, wing: 0xb9bec6, bar: 0xb9bec6, tip: 0x1f1f22, tail: 0xf0f0ec, band: 0xe6e6e2, neck: 0xf4f4f0, neck2: 0xf4f4f0, beak: 0xf2c230, eye: 0xf5e26a, leg: 0xe8b04a },
};
const FLOCK_TINTS = [0x8a93a6, 0x6f7584, 0xa79f94, 0x9aa3b8, 0x5d6270, 0xc9c6bf, 0x857a70];
const matCache = new Map();
function cmat(color, opts) {
  const k = color + (opts ? JSON.stringify(opts) : '');
  if (!matCache.has(k)) matCache.set(k, mat(color, opts));
  return matCache.get(k);
}

function buildWing(c, side) {
  const g = new THREE.Group();
  g.position.set(0.035, 0.055, 0.055 * side);
  const inner = box(0.16, 0.016, 0.19, cmat(c.wing), -0.025, 0, 0.095 * side);
  g.add(inner);
  g.add(box(0.022, 0.018, 0.17, cmat(c.bar), -0.055, 0.002, 0.1 * side));
  g.add(box(0.022, 0.018, 0.17, cmat(c.bar), -0.09, 0.002, 0.1 * side));
  const outer = new THREE.Group();
  outer.position.set(0, 0, 0.19 * side);
  outer.add(box(0.13, 0.013, 0.15, cmat(c.wing), -0.035, 0, 0.075 * side));
  outer.add(box(0.1, 0.014, 0.07, cmat(c.tip), -0.05, 0, 0.13 * side));
  g.add(outer);
  g.userData.outer = outer;
  g.userData.side = side;
  return g;
}

function buildBird(kind = 'pigeon', tint = null) {
  const c = { ...BIRD_COLORS[kind] };
  if (tint) { c.body = tint; c.wing = tint; c.breast = tint; }
  const root = new THREE.Group();
  const body = new THREE.Group();
  body.position.y = 0.15;
  root.add(body);
  body.add(blob(1, 0.17, 0.1, 0.1, cmat(c.body), -0.01, 0, 0));
  body.add(blob(1, 0.09, 0.09, 0.085, cmat(c.breast), 0.08, -0.005, 0));
  const irid = { roughness: 0.35, metalness: 0.2 };
  body.add(blob(1, 0.06, 0.05, 0.07, cmat(c.neck2, kind === 'pigeon' ? irid : null), 0.12, 0.025, 0));
  body.add(blob(1, 0.062, 0.072, 0.062, cmat(c.neck, kind === 'pigeon' ? { ...irid, emissive: 0x120a1c } : null), 0.145, 0.07, 0));
  const head = new THREE.Group();
  head.position.set(0.19, 0.115, 0);
  head.add(blob(0.05, 1, 0.95, 0.9, cmat(c.head), 0, 0, 0));
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.013, 0.05, 5), cmat(c.beak));
  beak.rotation.z = -Math.PI / 2;
  beak.position.set(0.058, -0.006, 0);
  head.add(beak);
  if (kind === 'pigeon') head.add(blob(0.013, 1.2, 0.8, 1, cmat(0xe8e6de), 0.036, 0.009, 0, 0));
  for (const s of [1, -1]) {
    head.add(blob(0.012, 1, 1, 1, cmat(c.eye, { roughness: 0.4 }), 0.022, 0.013, 0.037 * s, 0));
    head.add(blob(0.006, 1, 1, 1, cmat(0x0c0c0c, { roughness: 0.3 }), 0.028, 0.014, 0.046 * s, 0));
  }
  body.add(head);
  const tail = new THREE.Group();
  tail.position.set(-0.15, 0.012, 0);
  tail.add(box(0.13, 0.012, 0.085, cmat(c.tail), -0.06, 0, 0));
  tail.add(box(0.03, 0.013, 0.087, cmat(c.band), -0.115, 0, 0));
  body.add(tail);
  const wingL = buildWing(c, -1), wingR = buildWing(c, 1);
  body.add(wingL, wingR);
  const legs = new THREE.Group();
  legs.position.set(0.02, -0.075, 0);
  const legMat = cmat(c.leg);
  const legParts = [];
  for (const s of [1, -1]) {
    const leg = new THREE.Group();
    leg.position.z = 0.03 * s;
    leg.add(box(0.014, 0.07, 0.014, legMat, 0, -0.035, 0));
    for (const a of [-0.5, 0, 0.5]) {
      const toe = box(0.04, 0.008, 0.009, legMat, 0.018, -0.072, 0);
      toe.rotation.y = a;
      leg.add(toe);
    }
    legs.add(leg);
    legParts.push(leg);
  }
  body.add(legs);
  const scale = kind === 'gull' ? 2.1 : PIGEON_SCALE;
  root.scale.setScalar(scale);
  root.rotation.order = 'YZX';
  root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  root.userData = { body, head, tail, wingL, wingR, legs, legParts, flap: Math.random() * 6 };
  return root;
}

function poseBird(bird, { flapPhase, amp, fold, grounded, walkPhase = 0, peck = 0 }) {
  const u = bird.userData;
  const f = Math.sin(flapPhase);
  const lift = amp * f + 0.12 * (1 - fold) - 1.2 * fold;
  const outerBend = grounded ? 0 : -amp * 0.5 * Math.cos(flapPhase);
  for (const w of [u.wingL, u.wingR]) {
    const s = w.userData.side;
    w.rotation.set(-s * lift, -s * fold * 1.55, 0, 'XYZ');
    w.userData.outer.rotation.set(-s * outerBend, s * fold * 2.9, 0);
  }
  u.legs.rotation.z = grounded ? 0 : -1.25;
  u.legs.scale.setScalar(grounded ? 1 : 0.7);
  u.legParts[0].rotation.z = grounded ? Math.sin(walkPhase) * 0.5 : 0;
  u.legParts[1].rotation.z = grounded ? -Math.sin(walkPhase) * 0.5 : 0;
  const bob = grounded ? Math.max(0, Math.sin(walkPhase * 2)) : 0;
  u.head.position.x = 0.19 + (grounded ? Math.sin(walkPhase * 2) * 0.025 : 0.01) + peck * 0.04;
  u.head.position.y = 0.115 - peck * 0.09;
  u.body.position.y = 0.15 + bob * 0.02;
  u.body.rotation.z = -peck * 0.5;
  u.tail.rotation.z = grounded ? 0.15 : -amp * 0.15 * f;
}

function buildFood(kind) {
  const g = new THREE.Group();
  if (kind === 'kroket') {
    const k = new THREE.Mesh(new THREE.CapsuleGeometry(0.04, 0.12, 3, 6), cmat(0x9a5a22));
    k.rotation.z = Math.PI / 2;
    k.position.y = 0.04;
    g.add(k);
    g.add(box(0.2, 0.01, 0.12, cmat(0xf2efe6), 0, 0.004, 0));
  } else {
    g.add(box(0.16, 0.06, 0.1, cmat(0xd8342c), 0, 0.03, 0));
    for (let i = 0; i < 9; i++) {
      const fr = box(0.016, 0.09, 0.016, cmat(0xf2c744), -0.06 + (i % 5) * 0.03, 0.08, -0.025 + Math.floor(i / 5) * 0.05);
      fr.rotation.set((i % 3 - 1) * 0.25, 0, (i % 2 ? 0.2 : -0.15));
      g.add(fr);
    }
    g.add(box(0.05, 0.02, 0.05, cmat(0xf4f1e6), 0.04, 0.07, 0.02));
  }
  return g;
}

const splatGeos = [0, 1, 2].map((seed) => {
  const g = new THREE.CircleGeometry(0.17, 14);
  const pos = g.attributes.position;
  for (let i = 1; i < pos.count; i++) {
    const n = Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453;
    const k = 0.55 + (n - Math.floor(n)) * 0.75 + (i % 4 === seed ? 0.5 : 0);
    pos.setXY(i, pos.getX(i) * k, pos.getY(i) * k);
  }
  return g;
});
const splatMat = mat(0xf2f0e6, { roughness: 0.5, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
const splatCoreMat = mat(0x7d7a6c, { roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -5, polygonOffsetUnits: -5 });
const dropGeo = new THREE.IcosahedronGeometry(0.06, 0);
const dropMat = mat(0xf4f2ea, { roughness: 0.5 });

function buildSplat() {
  const g = new THREE.Group();
  const geo = splatGeos[Math.floor(Math.random() * splatGeos.length)];
  const a = new THREE.Mesh(geo, splatMat);
  a.rotation.x = -Math.PI / 2;
  g.add(a);
  const b = new THREE.Mesh(geo, splatCoreMat);
  b.rotation.x = -Math.PI / 2;
  b.scale.setScalar(0.35);
  b.position.set(0.02, 0.004, -0.01);
  g.add(b);
  g.rotation.y = Math.random() * Math.PI * 2;
  return g;
}

function buildLoft() {
  const g = new THREE.Group();
  const wood = cmat(0x6b4a2b), paint = cmat(0xe6dcc6), roof = cmat(0x8a2f24), dark = cmat(0x1c1a18);
  g.add(box(0.14, 2.3, 0.14, wood, 0, 1.15, 0));
  g.add(box(1.7, 1.05, 1.1, paint, 0, 2.8, 0));
  for (const s of [1, -1]) {
    const r = box(1.9, 0.07, 0.72, roof, 0, 3.52, 0.3 * s);
    r.rotation.x = s * 0.55;
    g.add(r);
  }
  g.add(box(1.9, 0.06, 0.45, wood, 0, 2.3, 0.75));
  for (let i = 0; i < 3; i++) g.add(box(0.22, 0.22, 0.02, dark, -0.5 + i * 0.5, 2.85, 0.56));
  g.add(box(1.72, 0.05, 0.05, wood, 0, 3.32, 0.56));
  const sign = box(0.7, 0.18, 0.02, cmat(0x2f5c3a), 0, 2.5, 0.57);
  g.add(sign);
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

// --- HUD -------------------------------------------------------------------

const CSS = `
body.pigeon-mode #hud .hud-top-left, body.pigeon-mode #hud .hud-wanted, body.pigeon-mode #hud .hud-money,
body.pigeon-mode #hud .hud-money-delta, body.pigeon-mode #hud .hud-weapon, body.pigeon-mode #hud .hud-mission,
body.pigeon-mode #hud .hud-speedo, body.pigeon-mode #hud .hud-route,
body.pigeon-mode #hud .hud-damage { display: none !important; }
#pigeon-hud[hidden] { display: none; }
#pigeon-hud { position: fixed; inset: 0; pointer-events: none; font-family: 'Bebas Neue', 'Arial Narrow', Arial, sans-serif; color: #f0ede4; z-index: 5; zoom: var(--ui, 1); }
#pigeon-hud .ph-panel { position: absolute; top: 12px; left: 14px; width: 232px; padding: 6px 12px 8px 6px; background: linear-gradient(90deg, rgba(10,14,18,0.8), rgba(10,14,18,0.45) 75%, rgba(10,14,18,0)); border-left: 3px solid #3fc97a; text-shadow: 0 1px 3px rgba(0,0,0,0.9); }
#pigeon-hud .ph-head { display: flex; align-items: center; gap: 10px; }
#pigeon-hud .ph-badge { flex: 0 0 46px; width: 46px; height: 46px; border-radius: 50%; display: grid; place-items: center; background: radial-gradient(circle at 50% 35%, #8a9aa6, #2a333a); box-shadow: 0 0 0 2px #3fc97a, 0 0 12px rgba(63,201,122,0.35); }
#pigeon-hud .ph-badge svg { width: 30px; height: 30px; fill: #eef2f4; }
#pigeon-hud .ph-headtext { flex: 1; min-width: 0; }
#pigeon-hud .ph-title { font-size: 19px; letter-spacing: 2px; color: #3fc97a; line-height: 1; }
#pigeon-hud .ph-score { display: flex; align-items: baseline; gap: 6px; margin-top: 2px; }
#pigeon-hud .ph-score b { font-weight: normal; font-size: 30px; line-height: 1; color: #f0ede4; }
#pigeon-hud .ph-score span { font: 12px 'Arial Narrow', Arial, sans-serif; color: rgba(240,237,228,0.7); }
#pigeon-hud .ph-meters { display: flex; gap: 14px; margin-top: 6px; padding-left: 2px; font: 14px 'Arial Narrow', Arial, sans-serif; font-variant-numeric: tabular-nums; }
#pigeon-hud .ph-meters span { display: inline-flex; align-items: center; gap: 4px; }
#pigeon-hud .ph-meters svg { width: 13px; height: 13px; fill: none; stroke: #3fc97a; stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; }
#pigeon-hud .ph-best { margin-top: 3px; padding-left: 2px; font: 12px 'Arial Narrow', Arial, sans-serif; color: rgba(240,237,228,0.6); }
#pigeon-hud .ph-chips { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 5px; }
#pigeon-hud .ph-chips:not(:has(:not(:empty))) { display: none; }
#pigeon-hud .ph-combo, #pigeon-hud .ph-tag { padding: 0 6px; border-radius: 4px; font: 11px/16px 'Arial Narrow', Arial, sans-serif; white-space: nowrap; }
#pigeon-hud .ph-combo { background: #3fc97a; color: #0c140e; font-weight: bold; }
#pigeon-hud .ph-tag { background: rgba(0,0,0,0.55); border: 1px solid rgba(242,199,68,0.5); color: #f2c744; }
#pigeon-hud .ph-combo:empty, #pigeon-hud .ph-tag:empty { display: none; }
#pigeon-hud .ph-boost { margin-top: 5px; height: 5px; background: rgba(240,237,228,0.15); border-radius: 3px; overflow: hidden; }
#pigeon-hud .ph-boost i { display: block; height: 100%; background: linear-gradient(90deg, #f2c744, #3fc97a); transform-origin: left; }
#pigeon-hud .ph-hints { position: absolute; left: 50%; bottom: 22px; transform: translateX(-50%); display: flex; flex-wrap: wrap; justify-content: center; gap: 4px 14px; max-width: min(720px, calc(100vw / var(--ui, 1) - 380px)); padding: 6px 14px; background: linear-gradient(0deg, rgba(10,14,18,0.72), rgba(10,14,18,0.5)); border-radius: 6px; font: 13px 'Arial Narrow', Arial, sans-serif; letter-spacing: 0.3px; text-shadow: 0 1px 2px rgba(0,0,0,0.9); }
#pigeon-hud .ph-hints span { display: inline-flex; align-items: center; white-space: nowrap; color: rgba(240,237,228,0.88); }
#pigeon-hud .ph-hints .hot { color: #f2c744; }
#pigeon-hud kbd { display: inline-flex; align-items: center; justify-content: center; min-width: 20px; height: 20px; padding: 0 5px; margin-right: 5px; background: #fbfaf5; border: 0; border-radius: 5px; color: #0c140e; font-weight: bold; text-shadow: none; box-shadow: 0 2px 0 #a9a69b, 0 0 0 1px rgba(0, 0, 0, 0.18); font: bold 12px 'Arial Narrow', Arial, sans-serif; }
#pigeon-hud .ph-pops { position: absolute; top: 18%; left: 50%; transform: translateX(-50%); display: flex; flex-direction: column; align-items: center; gap: 2px; }
#pigeon-hud .ph-pop { font-size: 30px; letter-spacing: 2px; color: #f0ede4; text-shadow: 0 2px 8px rgba(0,0,0,0.8); animation: ph-pop 1.4s ease-out forwards; }
#pigeon-hud .ph-pop em { font-style: normal; color: #3fc97a; }
@keyframes ph-pop { 0% { opacity: 0; transform: translateY(12px) scale(0.8); } 12% { opacity: 1; transform: translateY(0) scale(1.08); } 25% { transform: scale(1); } 80% { opacity: 1; } 100% { opacity: 0; transform: translateY(-26px); } }
#pigeon-hud .ph-card { position: absolute; top: 150px; left: 14px; max-width: min(calc(44vw / var(--ui, 1)), 470px); padding: 9px 20px 11px 12px; background: linear-gradient(90deg, rgba(12,20,14,0.86), rgba(23,48,31,0.5) 78%, rgba(23,48,31,0)); border-left: 3px solid #3fc97a; text-shadow: 0 1px 3px rgba(0,0,0,0.9); opacity: 0; transform: translateX(-24px); transition: opacity 0.4s, transform 0.5s cubic-bezier(0.2,0.7,0.2,1); }
#pigeon-hud .ph-card.on { opacity: 1; transform: none; }
#pigeon-hud .ph-card small { display: block; font-size: 14px; letter-spacing: 3px; color: #3fc97a; }
#pigeon-hud .ph-card b { display: block; margin-top: 3px; font-weight: normal; font-size: 32px; letter-spacing: 1px; line-height: 1; }
#pigeon-hud .ph-card i { display: block; font: 16px 'Arial Narrow', Arial, sans-serif; margin-top: 3px; color: rgba(240,237,228,0.85); }
#pigeon-hud .ph-card i:empty { display: none; }
#pigeon-hud .ph-sikkom { position: absolute; top: 96px; right: 14px; width: 270px; padding: 8px 12px 10px; background: rgba(240,237,228,0.95); color: #1a1a1a; border-radius: 10px; box-shadow: 0 6px 20px rgba(0,0,0,0.4); font: 14px/1.3 'Arial Narrow', Arial, sans-serif; transform: translateX(120%); transition: transform 0.35s ease; }
#pigeon-hud .ph-sikkom.on { transform: translateX(0); }
#pigeon-hud .ph-sikkom b { display: block; font: 16px 'Bebas Neue', 'Arial Narrow', sans-serif; letter-spacing: 2px; color: #d93f3f; }
#pigeon-hud .ph-warn { position: absolute; top: 30%; left: 50%; transform: translateX(-50%); font-size: 34px; letter-spacing: 3px; color: #d93f3f; text-shadow: 0 2px 10px rgba(0,0,0,0.8); animation: ph-blink 0.6s steps(2) infinite; }
#pigeon-hud .ph-warn:empty { display: none; }
@keyframes ph-blink { 50% { opacity: 0.45; } }
@media (max-width: 700px) { #pigeon-hud .ph-hints { max-width: calc(100vw / var(--ui, 1) - 32px); bottom: 190px; } #pigeon-hud .ph-sikkom { width: 220px; } }
`;

function initHudDom() {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);
  const root = document.createElement('div');
  root.id = 'pigeon-hud';
  root.innerHTML = `
    <div class="ph-panel">
      <div class="ph-head">
        <div class="ph-badge" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M15.5 5.2a2.6 2.6 0 0 1 2.6 2.1l2.4.9-2.3.9c-.2 2.4-1.3 4.5-3.2 5.9l1 3.5h-1.6l-1-3a8 8 0 0 1-2.4.4l-.6 2.6H8.8l.6-2.9C6 14.6 3.8 12 3.5 8.8c2.4 1.8 5.3 2.4 8.4 1.8L13 7.7a2.6 2.6 0 0 1 2.5-2.5zm.3 1.7a.7.7 0 1 0 0 1.4.7.7 0 0 0 0-1.4z"/></svg></div>
        <div class="ph-headtext">
          <div class="ph-title">Duif-modus</div>
          <div class="ph-score" role="status" aria-label="Poepscore"><b data-score>0</b><span>poepscore</span></div>
        </div>
      </div>
      <div class="ph-meters"><span title="Hoogte"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20V4M6 10l6-6 6 6"/></svg><b data-alt>0 m</b></span><span title="Snelheid"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 16a8 8 0 1 1 16 0M12 16l4-5"/></svg><b data-spd>0 km/u</b></span></div>
      <div class="ph-best"><span data-best></span> · <span data-total></span></div>
      <div class="ph-chips"><span class="ph-combo" data-combo></span><span class="ph-tag" data-tag></span></div>
      <div class="ph-boost" data-boost hidden><i></i></div>
    </div>
    <div class="ph-card" data-card><small></small><b></b><i></i></div>
    <div class="ph-pops" data-pops></div>
    <div class="ph-warn" data-warn></div>
    <div class="ph-sikkom" data-sikkom><b>Kiekdoar</b><span></span></div>
    <div class="ph-hints" data-hints></div>`;
  document.body.appendChild(root);
  const q = (s) => root.querySelector(s);
  hud = {
    root, alt: q('[data-alt]'), spd: q('[data-spd]'), score: q('[data-score]'), best: q('[data-best]'), total: q('[data-total]'), combo: q('[data-combo]'),
    boost: q('[data-boost]'), boostFill: q('[data-boost] i'), tag: q('[data-tag]'), card: q('[data-card]'), pops: q('[data-pops]'),
    warn: q('[data-warn]'), sikkom: q('[data-sikkom]'), hints: q('[data-hints]'), hintKey: '', cardT: 0, sikkomT: 0, last: {},
  };
}

function setText(key, el, text) {
  if (hud.last[key] === text) return;
  hud.last[key] = text;
  el.textContent = text;
}

function popup(text, sub = '') {
  if (!hud) return;
  const d = document.createElement('div');
  d.className = 'ph-pop';
  d.innerHTML = sub ? `${text} <em>${sub}</em>` : text;
  hud.pops.appendChild(d);
  while (hud.pops.children.length > 4) hud.pops.firstChild.remove();
  setTimeout(() => d.remove(), 1500);
}

function card(kicker, title, line = '', secs = 3.5) {
  if (!hud) return;
  hud.card.querySelector('small').textContent = kicker;
  hud.card.querySelector('b').textContent = title;
  hud.card.querySelector('i').textContent = line;
  hud.card.classList.add('on');
  hud.cardT = secs;
}

function sikkom(text) {
  if (!hud) return;
  hud.sikkom.querySelector('span').textContent = text;
  hud.sikkom.classList.add('on');
  hud.sikkomT = 5;
  sfx('notify', P.x, P.y, 0.5);
}

const K = (k, label, hot = false) => `<span${hot ? ' class="hot"' : ''}><kbd>${k}</kbd>${label}</span>`;

function updateHud(dt) {
  if (!hud) return;
  setText('alt', hud.alt, `${Math.max(0, Math.round(P.z))} m`);
  const spd = P.mode === 'fly' ? P.speed : P.mode === 'ride' && P.ride ? Math.abs(P.ride.v.speed || 0) : P.walkSpeed || 0;
  setText('spd', hud.spd, `${Math.round(spd * 3.6)} km/u`);
  setText('score', hud.score, String(score));
  setText('best', hud.best, `Beste ${Math.max(store.best, score)}`);
  setText('total', hud.total, `totaal ${store.total + score}`);
  setText('combo', hud.combo, combo > 1 && elapsed < comboUntil ? `Reeks x${Math.min(5, combo)}` : '');
  hud.boost.hidden = P.boostT <= 0;
  if (P.boostT > 0) hud.boostFill.style.transform = `scaleX(${(P.boostT / BOOST_S).toFixed(3)})`;
  setText('tag', hud.tag, P.carry ? (P.carry.kind === 'kroket' ? 'Kroket in je snavel' : 'Patat in je snavel') : P.boostT > 0 ? 'Frietkracht!' : '');
  let warn = '';
  if (gull && gull.state === 'chase') warn = 'Meeuw op je staart!';
  else if (P.mode === 'fly' && P.speed < STALL_SPEED - 0.5 && P.flapBoost < 1) warn = 'Te langzaam: klapwieken!';
  setText('warn', hud.warn, warn);

  const near = nearestFood(1.4);
  let key;
  if (P.mode === 'fly') key = P.landing ? 'landing' : 'fly';
  else if (P.mode === 'ride') key = 'ride';
  else key = near ? 'ground-food' : P.carry ? 'ground-carry' : 'ground';
  key += flock.length ? '-f' : '';
  if (key !== hud.hintKey) {
    hud.hintKey = key;
    const zw = K('Q', flock.length ? 'zwerm wegsturen' : 'zwerm roepen');
    let html;
    const stop = K('X', 'stoppen');
    if (key.startsWith('fly')) html = K('WASD', 'sturen') + K('Spatie', 'klapwieken') + K('Shift', 'duiken') + K('F', 'poepen') + K('E', 'landen') + zw + stop;
    else if (key.startsWith('landing')) html = K('E', 'landen afbreken', true) + K('Spatie', 'klapwieken') + K('F', 'poepen') + stop;
    else if (key.startsWith('ride')) html = K('Spatie', 'opstijgen') + K('A / D', 'draaien') + K('F', 'poepen') + K('C', 'koeren') + stop;
    else html = K('WASD', 'lopen') + K('Spatie', 'opstijgen') + (key.startsWith('ground-food') ? K('E', 'patat pikken', true) : key.startsWith('ground-carry') ? K('E', 'opeten', true) : K('E', 'pikken')) + K('C', 'koeren') + K('F', 'poepen') + zw + K('X', 'weer mens worden', true);
    hud.hints.innerHTML = html;
  }
  if (hud.cardT > 0 && (hud.cardT -= dt) <= 0) hud.card.classList.remove('on');
  if (hud.sikkomT > 0 && (hud.sikkomT -= dt) <= 0) hud.sikkom.classList.remove('on');
}

// --- score & achievements --------------------------------------------------

function addScore(base, label) {
  combo = elapsed < comboUntil ? combo + 1 : 1;
  comboUntil = elapsed + COMBO_S;
  const mult = Math.min(5, combo);
  const pts = base * mult;
  score += pts;
  popup(`+${pts}`, mult > 1 ? `${label} x${mult}` : label);
  if (score > store.best) store.best = score;
  while (milestoneIdx < MILESTONES.length && score >= MILESTONES[milestoneIdx][0]) {
    sikkom(MILESTONES[milestoneIdx][1]);
    milestoneIdx++;
  }
}

function achieve(id, line = '') {
  const now = elapsed;
  if (now < (achCd.get(id) || 0)) return false;
  achCd.set(id, now + 30);
  const fresh = !store.ach.includes(id);
  if (fresh) store.ach.push(id);
  unlockAchievement(world, 'duif_' + id, { silent: true });
  card(fresh ? 'Nieuwe prestatie' : 'Prestatie', ACH[id], line);
  sfx('achievement', P.x, P.y, 0.7);
  return true;
}

function checkPerch(floor) {
  if (floor.kind === 'loft') {
    if (achieve('loft', 'Duivenmelker Harm: "Moi mien jong! Hier bist thuis. Kom mor weer as t regent."')) {
      if (!store.home) { store.home = true; world.addMessage('Thuis gevonden! Via het pauzemenu (Spel) vlieg je hierheen terug.', 5); }
      sfx('coo', P.x, P.y, 0.8);
    }
    return;
  }
  const b = floor.b;
  if (!b) return;
  const pad = world.map.meta.helipad;
  if (pad && Math.hypot(P.x - pad.x, P.y - pad.y) < pad.r + 2 && P.z > 12) unlockAchievement(world, 'umcg_heli');
  const name = b.landmark || b.name || '';
  if ((b.landmarkKind === 'tower' || name === 'Martinitoren') && P.z > 55) {
    if (achieve('martini', 'Heel Grunn ligt aan je pootjes.')) { cam.orbitT = 6; cam.orbitA = cam.yaw + Math.PI; }
  } else if (name.startsWith('Forum') && P.z > 12) achieve('forum');
  else if (name.startsWith('Hoofdstation')) achieve('station');
  else if (name === 'Der Aa-kerk' || name === 'Akerk') achieve('aakerk');
}

// --- flight ----------------------------------------------------------------

function mouseLook() {
  const inp = world.input;
  if (!inp.lookActive()) return { dx: 0, dy: 0 };
  const st = getSettings();
  const k = 0.0022 * (st.mouseSensitivity || 1);
  return { dx: inp.mouse.dx * k, dy: inp.mouse.dy * k * (st.invertY ? -1 : 1) };
}

function takeOff(extraSpeed = 0) {
  P.mode = 'fly';
  P.ride = null;
  P.speed = Math.min(MAX_SPEED, 6.5 + extraSpeed);
  P.pitch = 0.45;
  P.flapBoost = 5;
  P.landing = false;
  P.pitchCmd = 0;
  sfx('flap', P.x, P.y, 1);
}

function land(floor) {
  P.z = floor.h;
  P.speed = 0;
  P.pitch = 0;
  P.pitchCmd = 0;
  P.flapBoost = 0;
  P.landing = false;
  if (floor.kind === 'vehicle' && floor.v) {
    const v = floor.v;
    const c = Math.cos(v.angle), s = Math.sin(v.angle);
    const dx = P.x - v.x, dy = P.y - v.y;
    P.ride = { v, lx: dx * c + dy * s, ly: -dx * s + dy * c, dyaw: normalizeAngle(P.yaw - v.angle), t: 0 };
    P.mode = 'ride';
    world.addMessage('Gratis meerijden!', 2.5);
    if (v.isBus) achieve('bus');
    else if (v.isBoat) achieve('boot');
    else achieve('auto');
  } else {
    P.mode = 'ground';
  }
  sfx('flap', P.x, P.y, 0.35);
  checkPerch(floor);
}

function splash() {
  if (elapsed - P.splashAt > 0.6) {
    world.particles.push({ x: P.x, y: P.y, until: world.time + 1.1, kind: 'splash' });
    sfx('splash', P.x, P.y, 0.7);
    if (elapsed - P.splashAt > 8) world.addMessage('Plons! Duiven kinnen nait zwemmen.', 2.5);
    P.splashAt = elapsed;
  }
  P.z = WATER_Y + 0.05;
  P.flapBoost = 6;
  P.pitch = Math.max(P.pitch, 0.5);
  P.speed = Math.max(5, P.speed * 0.6);
}

function bonk() {
  P.speed = Math.max(4, P.speed * 0.35);
  P.yaw = normalizeAngle(P.yaw + Math.PI * (Math.random() < 0.5 ? 0.8 : -0.8));
  P.flapBoost = Math.max(P.flapBoost, 2);
  if (elapsed - P.bonkAt > 0.4) sfx('bonk', P.x, P.y, 0.5);
  if (elapsed - P.bonkAt > 6) world.addMessage(pick(['Au! Mien snavel!', 'Boink.', 'Die muur stond der gisteren nog nait.']), 2);
  P.bonkAt = elapsed;
}

function touch(floor) {
  if (floor.kind === 'water') { splash(); return; }
  const vz = P.speed * Math.sin(P.pitch) + P.flapBoost;
  if (P.landing || (P.speed < 9.5 && vz < 1)) { land(floor); return; }
  P.z = floor.h;
  P.pitch = Math.max(P.pitch, 0.12);
  P.flapBoost = Math.max(P.flapBoost, 1);
}

function moveFlying(dx, dy, dz) {
  const n = Math.max(1, Math.ceil(Math.hypot(dx, dy, dz) / 0.6));
  const hl = Math.hypot(dx, dy) || 1;
  const hx = dx / hl, hy = dy / hl;
  for (let i = 0; i < n; i++) {
    let nx = P.x + dx / n, ny = P.y + dy / n;
    const nz = P.z + dz / n;
    const ahead = surfaceAt(nx + hx * 0.3, ny + hy * 0.3);
    if (ahead.h > nz + WALL_STEP && ahead.kind !== 'water') {
      const sx = surfaceAt(nx + hx * 0.3, P.y);
      const sy = surfaceAt(P.x, ny + hy * 0.3);
      if (Math.abs(dx) > 1e-4 && sx.h <= nz + WALL_STEP) { ny = P.y; P.yaw = angleLerp(P.yaw, dx > 0 ? 0 : Math.PI, 0.12); P.speed *= 0.985; }
      else if (Math.abs(dy) > 1e-4 && sy.h <= nz + WALL_STEP) { nx = P.x; P.yaw = angleLerp(P.yaw, dy > 0 ? Math.PI / 2 : -Math.PI / 2, 0.12); P.speed *= 0.985; }
      else { bonk(); P.z = Math.max(P.z, surfaceAt(P.x, P.y).h); return; }
    }
    P.x = nx; P.y = ny; P.z = nz;
    const floor = surfaceAt(P.x, P.y);
    P.groundH = floor.h;
    if (P.z <= floor.h) {
      touch(floor);
      if (P.mode !== 'fly') return;
    }
  }
}

function updateFly(dt) {
  const inp = world.input;
  const [ax, ay] = inp.axis();
  const m = mouseLook();
  const space = inp.isDown(' ');
  const shift = inp.isDown('shift');
  if (inp.wasPressed('e') || inp.wasPressed('control')) {
    P.landing = !P.landing;
    if (P.landing) {
      const f = surfaceAt(P.x, P.y);
      if (P.z - f.h < 1.6 && f.kind !== 'water') { land(f); return; }
    }
  }
  if (shift || space) P.landing = false;

  const keyTurn = ax * 1.55;
  P.yaw = normalizeAngle(P.yaw + keyTurn * dt + m.dx);
  P.yawRate += ((keyTurn + m.dx / Math.max(dt, 1e-3)) - P.yawRate) * Math.min(1, dt * 6);
  P.pitchCmd = clamp(P.pitchCmd - m.dy, -0.9, 0.8);
  if (Math.abs(m.dy) < 1e-4) P.pitchCmd *= Math.exp(-0.9 * dt);

  const boost = P.boostT > 0 ? 1 : 0;
  const stall = clamp((STALL_SPEED - P.speed) / 3, 0, 1);
  const target = P.pitchCmd + (space ? 0.4 : 0) - (shift ? 0.62 : 0) - (P.landing ? 0.3 : 0) - stall * 0.45;
  P.pitch += (clamp(target, -1.1, 0.9) - P.pitch) * Math.min(1, dt * 3);

  let cruise = CRUISE + boost * 4 + (ay < 0 ? 5 : 0) - (ay > 0 ? 5 : 0);
  if (P.landing) cruise = Math.min(cruise, 6.5);
  P.speed += (cruise - P.speed) * Math.min(1, dt * 0.9) - G * Math.sin(P.pitch) * 0.6 * dt + (shift ? 5 * dt : 0);
  P.speed = clamp(P.speed, MIN_SPEED, MAX_SPEED + boost * 4);

  if (inp.wasPressed(' ')) {
    P.flapBoost = Math.max(P.flapBoost, 4.5 * (1 + boost * 0.3));
    sfx('flap', P.x, P.y, 0.8);
    P.flapSoundT = 0.32;
  }
  if (space) {
    P.flapBoost = Math.max(P.flapBoost, 2.8 * (1 + boost * 0.3));
    if ((P.flapSoundT -= dt) <= 0) { P.flapSoundT = 0.32; sfx('flap', P.x, P.y, 0.55); }
  }
  P.flapBoost *= Math.exp(-1.8 * dt);

  let vz = P.speed * Math.sin(P.pitch) + P.flapBoost - stall * 3.5;
  if (P.landing) {
    const below = surfaceAt(P.x, P.y);
    if (below.kind !== 'water' && P.z - below.h < 1.2) { land(below); return; }
    vz -= clamp((P.z - below.h) * 0.12, 0, 6);
  }
  if (P.z > MAX_ALT - 12) vz = Math.min(vz, (MAX_ALT - P.z) * 0.8);
  const hs = P.speed * Math.cos(P.pitch);
  moveFlying(Math.cos(P.yaw) * hs * dt, Math.sin(P.yaw) * hs * dt, vz * dt);
  P.z = Math.min(P.z, MAX_ALT);
  P.roll += (clamp(P.yawRate * 0.38, -0.95, 0.95) - P.roll) * Math.min(1, dt * 5);

  if (shift) { P.fold += (0.75 - P.fold) * Math.min(1, dt * 6); P.flapAmp += (0.05 - P.flapAmp) * Math.min(1, dt * 6); P.flapPhase += dt * 4; }
  else {
    const hard = space || P.flapBoost > 1.5 || P.speed < 8;
    const glide = !hard && P.pitch < -0.22;
    const amp = hard ? 1.0 : glide ? 0.08 : 0.55 + 0.25 * Math.max(0, Math.sin(elapsed * 1.4));
    P.fold += (0 - P.fold) * Math.min(1, dt * 6);
    P.flapAmp += (amp - P.flapAmp) * Math.min(1, dt * 5);
    P.flapPhase += dt * (hard ? 12 : glide ? 2 : 8);
  }
}

function updateGround(dt) {
  const inp = world.input;
  const [ax, ay] = inp.axis();
  const m = mouseLook();
  P.yaw = normalizeAngle(P.yaw + ax * 2.6 * dt + m.dx);
  P.roll *= Math.exp(-8 * dt);
  P.fold += (1 - P.fold) * Math.min(1, dt * 8);
  P.flapAmp *= Math.exp(-6 * dt);
  cam.pitchOff = clamp(cam.pitchOff + m.dy, -0.3, 0.9);
  if (inp.wasPressed(' ')) { takeOff(); return; }

  const walk = (ay < 0 ? 1.3 : ay > 0 ? -0.6 : 0) * (inp.isDown('shift') ? 1.8 : 1);
  P.walkSpeed = Math.abs(walk);
  if (walk) {
    P.walkPhase += dt * 9 * Math.sign(walk) * (inp.isDown('shift') ? 1.5 : 1);
    const nx = P.x + Math.cos(P.yaw) * walk * dt, ny = P.y + Math.sin(P.yaw) * walk * dt;
    const f = surfaceAt(nx, ny);
    if (f.h > P.z + 0.45 || f.kind === 'water') {
      if (f.kind === 'water' && P.z - WATER_Y < 1.4) { P.x = nx; P.y = ny; takeOff(); splash(); return; }
    } else if (f.h < P.z - 0.7) {
      P.x = nx; P.y = ny;
      takeOff();
      P.speed = 4.5; P.pitch = -0.2; P.flapBoost = 2;
      return;
    } else { P.x = nx; P.y = ny; P.z = f.h; }
  } else {
    const f = surfaceAt(P.x, P.y);
    if (f.kind === 'vehicle' && f.h > P.z + 0.5) {
      takeOff();
      world.addMessage(pick(['Kiek uut, joh!', 'Bijna platgereden!', 'Roekoe?! KIJK WAAR JE RIJDT!']), 2);
      return;
    }
    if (f.h < P.z - 0.7) { takeOff(); P.speed = 4; P.pitch = -0.3; return; }
    if (f.h > P.z && f.h < P.z + 0.5) P.z = f.h;
    P.walkPhase += (Math.round(P.walkPhase / Math.PI) * Math.PI - P.walkPhase) * Math.min(1, dt * 10);
  }
  P.groundH = P.z;
  if (inp.wasPressed('e') || inp.wasPressed('control')) peck();
}

function updateRide(dt) {
  const r = P.ride;
  const v = r && r.v;
  if (!v || v.wrecked || !world.vehicles.includes(v)) { takeOff(); return; }
  const inp = world.input;
  const [ax] = inp.axis();
  const m = mouseLook();
  r.dyaw = normalizeAngle(r.dyaw + ax * 2.4 * dt + m.dx);
  cam.pitchOff = clamp(cam.pitchOff + m.dy, -0.3, 0.9);
  const c = Math.cos(v.angle), s = Math.sin(v.angle);
  P.x = v.x + c * r.lx - s * r.ly;
  P.y = v.y + s * r.lx + c * r.ly;
  P.z = roofHeight(v);
  P.groundH = P.z;
  P.yaw = normalizeAngle(v.angle + r.dyaw);
  P.fold += (1 - P.fold) * Math.min(1, dt * 8);
  P.flapAmp *= Math.exp(-6 * dt);
  P.walkSpeed = 0;
  r.t += dt;
  if (inp.wasPressed(' ')) takeOff(Math.abs(v.speed || 0) + 2);
  else if (inp.wasPressed('e') || inp.wasPressed('control')) peck();
}

// --- poop ------------------------------------------------------------------

function dropPoop() {
  const fwd = P.mode === 'fly' ? P.speed * Math.cos(P.pitch) * 0.8 : 0;
  let vx = Math.cos(P.yaw) * fwd, vy = Math.sin(P.yaw) * fwd;
  if (P.mode === 'ride' && P.ride) {
    const v = P.ride.v;
    vx += Math.cos(v.angle) * (v.speed || 0);
    vy += Math.sin(v.angle) * (v.speed || 0);
  }
  const mesh = new THREE.Mesh(dropGeo, dropMat);
  scene.add(mesh);
  const back = 0.25;
  drops.push({
    x: P.x - Math.cos(P.yaw) * back, y: P.y - Math.sin(P.yaw) * back, z: P.z + 0.18,
    vx, vy, vz: P.mode === 'fly' ? Math.min(0, P.speed * Math.sin(P.pitch)) - 0.5 : 0.5, mesh, age: 0,
  });
  sfx('poop', P.x, P.y, 0.35);
}

function addDecal(x, y, h, v = null, scale = 1) {
  const g = buildSplat();
  g.scale.setScalar(scale);
  scene.add(g);
  const d = { mesh: g, x, y, h, v, age: 0 };
  if (v) {
    const c = Math.cos(v.angle), s = Math.sin(v.angle);
    const dx = x - v.x, dy = y - v.y;
    d.lx = dx * c + dy * s;
    d.ly = -dx * s + dy * c;
    d.ry = g.rotation.y + v.angle;
  }
  g.position.set(x, h + 0.02, y);
  decals.push(d);
  while (decals.length > 60) scene.remove(decals.shift().mesh);
}

function hitPed(ped) {
  ped.speechText = pick(ped.isCop ? COP_LINES : PED_LINES);
  ped.speechUntil = world.time + 2.8;
  sfx('shout', ped.x, ped.y, 0.8, { text: ped.speechText });
  sfx('splat', ped.x, ped.y, 0.5);
  addScore(ped.isCop ? 50 : 10, ped.isCop ? 'Agent!' : 'Voetganger');
}

function updateDrops(dt) {
  for (let i = drops.length - 1; i >= 0; i--) {
    const d = drops[i];
    d.age += dt;
    d.vz -= G * dt;
    d.vx *= Math.exp(-0.6 * dt);
    d.vy *= Math.exp(-0.6 * dt);
    d.x += d.vx * dt;
    d.y += d.vy * dt;
    d.z += d.vz * dt;
    d.mesh.position.set(d.x, d.z, d.y);
    let done = false;
    if (d.z < 2.1) {
      for (const ped of world.pedestrians) {
        if (ped.state === 'dead') continue;
        const px = ped.x - d.x, py = ped.y - d.y;
        if (px * px + py * py < 0.3 && d.z > 0.1 && d.z < 1.95) { hitPed(ped); done = true; break; }
      }
      if (!done) {
        for (const v of world.vehicles) {
          if (!(v.isBike || v.isScooter) || !v.driver) continue;
          if (Math.hypot(v.x - d.x, v.y - d.y) < 0.55 && d.z < 2) {
            sfx('shout', v.x, v.y, 0.8, { text: 'Bah! Een duif!' });
            addScore(10, 'Fietser');
            done = true;
            break;
          }
        }
      }
    }
    if (!done) {
      const f = surfaceAt(d.x, d.y);
      if (d.z <= f.h) {
        done = true;
        if (f.kind === 'water') sfx('plop', d.x, d.y, 0.3);
        else {
          addDecal(d.x, d.y, f.h, f.kind === 'vehicle' ? f.v : null, f.kind === 'vehicle' ? 0.8 : 1);
          sfx('splat', d.x, d.y, 0.45);
          if (f.kind === 'vehicle' && !(P.ride && P.ride.v === f.v)) {
            const v = f.v;
            const c = Math.cos(v.angle), s = Math.sin(v.angle);
            const lx = (d.x - v.x) * c + (d.y - v.y) * s;
            addScore(25, v.isBus ? 'Bus!' : v.isBoat ? 'Bootje' : lx > v.model.len * 0.12 ? 'Voorruit!' : 'Autodak');
            if (!v.isBoat) sfx('shout', v.x, v.y, 0.6, { text: 'Hé! Mien auto!' });
          } else if (f.kind === 'building' && f.b && f.b.landmark && elapsed > (landmarkHitAt.get(f.b) || 0)) {
            landmarkHitAt.set(f.b, elapsed + 20);
            addScore(40, 'Monument bekakt!');
          }
        }
      }
    }
    if (done || d.age > 12) {
      scene.remove(d.mesh);
      drops.splice(i, 1);
    }
  }
}

function updateDecals(dt) {
  for (let i = decals.length - 1; i >= 0; i--) {
    const d = decals[i];
    d.age += dt;
    if (d.v) {
      const v = d.v;
      if (!world.vehicles.includes(v)) { scene.remove(d.mesh); decals.splice(i, 1); continue; }
      const c = Math.cos(v.angle), s = Math.sin(v.angle);
      d.mesh.position.set(v.x + c * d.lx - s * d.ly, roofHeight(v) + 0.03, v.y + s * d.lx + c * d.ly);
      d.mesh.rotation.y = d.ry - v.angle;
    } else if (d.age > 150 || Math.hypot(d.x - P.x, d.y - P.y) > 250) {
      scene.remove(d.mesh);
      decals.splice(i, 1);
    }
  }
}

// --- food & seagull ---------------------------------------------------------

function nearestFood(r) {
  let best = null, bd = r;
  for (const f of foods) {
    if (Math.abs(f.z - P.z) > 0.8) continue;
    const d = Math.hypot(f.x - P.x, f.y - P.y);
    if (d < bd) { bd = d; best = f; }
  }
  return best;
}

function spawnFood() {
  const map = world.map;
  const pts = [];
  for (const h of map.meta.horeca || []) if (Math.abs(h.x - P.x) < 140 && Math.abs(h.y - P.y) < 140) pts.push(h);
  for (const l of map.meta.landmarks || []) if (l.kind === 'square' && Math.hypot(l.x - P.x, l.y - P.y) < 220) pts.push(l, l);
  if (!pts.length) return;
  for (let attempt = 0; attempt < 8; attempt++) {
    const c = pick(pts);
    const a = Math.random() * Math.PI * 2, r = 2 + Math.random() * 5;
    const x = c.x + Math.cos(a) * r, y = c.y + Math.sin(a) * r;
    const f = surfaceAt(x, y, false);
    if (f.kind !== 'ground' || f.h > 0.3) continue;
    const kind = Math.random() < 0.6 ? 'patat' : 'kroket';
    const mesh = buildFood(kind);
    mesh.scale.setScalar(1.8);
    mesh.position.set(x, f.h + 0.01, y);
    mesh.rotation.y = Math.random() * Math.PI * 2;
    scene.add(mesh);
    foods.push({ x, y, z: f.h, kind, mesh, age: 0 });
    return;
  }
}

function peck() {
  P.peckT = 0.35;
  if (P.carry) {
    if (gull && gull.state === 'chase') { world.addMessage('Nait nou, die meeuw kiekt mit!', 2); return; }
    eatCarry();
    return;
  }
  const f = nearestFood(1.4);
  if (!f) { sfx('peck', P.x, P.y, 0.3); return; }
  scene.remove(f.mesh);
  foods.splice(foods.indexOf(f), 1);
  const held = buildFood(f.kind);
  held.scale.setScalar(0.55);
  held.position.set(0.075, -0.025, 0);
  held.rotation.set(0, 0, -0.3);
  pigeon.userData.head.add(held);
  P.carry = { kind: f.kind, t: 0, mesh: held };
  sfx('peck', P.x, P.y, 0.5);
  popup(f.kind === 'kroket' ? 'Kroket!' : 'Patat!', 'pas op voor meeuwen');
  let best = null, bd = 12;
  for (const ped of world.pedestrians) {
    if (ped.state !== 'wander' || ped.isCop || ped.scene) continue;
    const d = Math.hypot(ped.x - P.x, ped.y - P.y);
    if (d < bd) { bd = d; best = ped; }
  }
  if (best && Math.random() < 0.6) {
    best.speechText = pick(FOOD_LINES);
    best.speechUntil = world.time + 2.6;
    sfx('shout', best.x, best.y, 0.8, { text: best.speechText });
    const dx = P.x - best.x, dy = P.y - best.y, dl = Math.hypot(dx, dy) || 1;
    best.state = 'flee';
    best.stateUntil = world.time + 1.6;
    best.fleeFrom = { x: best.x - dx / dl * 33, y: best.y - dy / dl * 33 };
    best.fleeJitter = 0;
    best.fleeSpeed = 3.4;
  }
}

function eatCarry() {
  if (!P.carry) return;
  pigeon.userData.head.remove(P.carry.mesh);
  P.carry = null;
  P.boostT = BOOST_S;
  popup('Njam!', 'frietkracht');
  sfx('coo', P.x, P.y, 0.7);
  score += 15;
}

function dropCarry() {
  if (!P.carry) return;
  pigeon.userData.head.remove(P.carry.mesh);
  const m = P.carry.mesh;
  P.carry = null;
  return m;
}

function updateFood(dt) {
  if ((foodTimer -= dt) <= 0) {
    foodTimer = 6;
    let near = 0;
    for (const f of foods) if (Math.hypot(f.x - P.x, f.y - P.y) < 150) near++;
    if (near < 4) spawnFood();
  }
  for (let i = foods.length - 1; i >= 0; i--) {
    const f = foods[i];
    f.age += dt;
    if (f.age > 150 || Math.hypot(f.x - P.x, f.y - P.y) > 230) { scene.remove(f.mesh); foods.splice(i, 1); }
  }
  if (P.carry) {
    P.carry.t += dt;
    if (P.carry.t > 7 && !(gull && gull.state === 'chase')) eatCarry();
  }
  if (P.boostT > 0) P.boostT = Math.max(0, P.boostT - dt);
}

function nearWater() {
  const vm = (world.map.meta.landmarks || []).find((l) => l.name === 'Vismarkt');
  if (vm && Math.hypot(vm.x - P.x, vm.y - P.y) < 250) return true;
  return waterNearby(world.map, P.x, P.y, 40);
}

function spawnGull() {
  const mesh = buildBird('gull');
  scene.add(mesh);
  const bx = P.x - Math.cos(P.yaw) * 28, by = P.y - Math.sin(P.yaw) * 28;
  gull = { x: bx, y: by, z: Math.max(P.z + 8, surfaceAt(bx, by, false).h + 6), vx: 0, vy: 0, vz: 0, mesh, t: 0, state: 'chase', flap: 0, loot: null };
  sfx('caw', bx, by, 0.9);
  world.addMessage('Een meeuw! Hij wil je patat!', 3);
}

// Story missions (H10): a gull that dives at the pigeon whether it carries
// food or not. A hit knocks the pigeon off course.
export function summonDiveGull(text = 'Een meeuw duikt op je af!') {
  if (!active || gull || !scene) return false;
  const mesh = buildBird('gull');
  scene.add(mesh);
  const a = P.yaw + Math.PI + (Math.random() - 0.5) * 1.6;
  const bx = P.x + Math.cos(a) * 34, by = P.y + Math.sin(a) * 34;
  gull = { x: bx, y: by, z: P.z + 14, vx: 0, vy: 0, vz: 0, mesh, t: 0, state: 'dive', flap: 0, loot: null };
  sfx('caw', bx, by, 1);
  world.addMessage(text, 2.5);
  return true;
}


function updateGull(dt) {
  gullCd -= dt;
  if (!gull) {
    if (P.carry && P.carry.t > 0.8 && gullCd <= 0 && Math.random() < dt * (nearWater() ? 0.6 : 0.08)) spawnGull();
    return;
  }
  const g = gull;
  g.t += dt;
  let tx, ty, tz, spd;
  if (g.state === 'dive') {
    tx = P.x; ty = P.y; tz = P.z + 0.2;
    spd = 13.5;
    const d = Math.hypot(tx - g.x, ty - g.y, tz - g.z);
    if (d < 1.6) {
      bonk();
      P.z = Math.max(surfaceAt(P.x, P.y, false).h + 2, P.z - 6);
      gullDiveHits++;
      g.state = 'leave';
      g.t = 0;
      sfx('caw', g.x, g.y, 1);
      world.addMessage('Boink! Die meeuw spreekt Fries.', 2);
    } else if (g.t > 9) { g.state = 'leave'; g.t = 0; addScore(15, 'Meeuw ontweken'); }
  } else if (g.state === 'chase') {
    if (!P.carry) { g.state = 'leave'; g.t = 0; }
    tx = P.x + Math.cos(P.yaw) * (P.mode === 'fly' ? 1.5 : 0);
    ty = P.y + Math.sin(P.yaw) * (P.mode === 'fly' ? 1.5 : 0);
    tz = P.z + 0.3;
    spd = 12.5;
    const d = Math.hypot(tx - g.x, ty - g.y, tz - g.z);
    if (d < 1.3 && P.carry) {
      const m = dropCarry();
      m.scale.setScalar(0.4);
      m.position.set(0.07, -0.02, 0);
      g.mesh.userData.head.add(m);
      g.state = 'leave';
      g.t = 0;
      sfx('caw', g.x, g.y, 1);
      card('Meeuw', 'Gejat!', 'Die meeuw is ervandoor met je snack.', 2.5);
      gullCd = 20;
    } else if (g.t > 14 || d > 70) {
      g.state = 'leave';
      g.t = 0;
      gullCd = 25;
      addScore(30, 'Meeuw afgeschud');
      achieve('meeuw');
    }
  } else {
    tx = g.x + g.vx * 3 + 1;
    ty = g.y + g.vy * 3 + 1;
    tz = g.z + 20;
    spd = 16;
    if (g.t > 7) { scene.remove(g.mesh); gull = null; return; }
  }
  const dx = tx - g.x, dy = ty - g.y, dz = tz - g.z, dl = Math.hypot(dx, dy, dz) || 1;
  const k = Math.min(1, dt * 2.2);
  g.vx += (dx / dl * spd - g.vx) * k;
  g.vy += (dy / dl * spd - g.vy) * k;
  g.vz += (dz / dl * spd - g.vz) * k;
  g.x += g.vx * dt; g.y += g.vy * dt; g.z += g.vz * dt;
  g.z = Math.max(g.z, surfaceAt(g.x, g.y, false).h + 1.2);
  g.flap += dt * 7;
  const yaw = Math.atan2(g.vy, g.vx);
  g.mesh.position.set(g.x, g.z - 0.3, g.y);
  g.mesh.rotation.set(0, -yaw, Math.atan2(g.vz, Math.hypot(g.vx, g.vy)) * 0.6);
  poseBird(g.mesh, { flapPhase: g.flap, amp: 0.7, fold: 0, grounded: false });
  if (g.state === 'chase' && Math.random() < dt * 0.4) sfx('caw', g.x, g.y, 0.7);
}

// --- flock -----------------------------------------------------------------

function toggleFlock() {
  if (flock.length && !flock[0].leaving) {
    for (const b of flock) { b.leaving = true; b.t = 0; b.vz += 4; }
    world.addMessage('Doei, allemaal!', 2);
    return;
  }
  if (flock.length) return;
  const n = 5 + Math.floor(Math.random() * 4);
  for (let i = 0; i < n; i++) {
    const mesh = buildBird('pigeon', FLOCK_TINTS[i % FLOCK_TINTS.length]);
    mesh.scale.setScalar(PIGEON_SCALE * (0.85 + Math.random() * 0.2));
    scene.add(mesh);
    const a = Math.random() * Math.PI * 2;
    const x = P.x + Math.cos(a) * 25, y = P.y + Math.sin(a) * 25;
    flock.push({ x, y, z: P.z + 12 + Math.random() * 6, vx: 0, vy: 0, vz: 0, mesh, i, flap: Math.random() * 6, floor: 0, grounded: false, scatter: null, leaving: false, t: 0, walk: 0 });
  }
  sfx('coo', P.x, P.y, 0.9);
  world.addMessage('Zwerm geroepen! Q stuurt ze weer weg.', 2.5);
}

function updateFlock(dt) {
  if (!flock.length) return;
  const shift = world.input.isDown('shift');
  if (P.mode === 'fly' && shift && P.speed > 15 && flockScatterT <= 0) {
    flockScatterT = 2.5;
    for (const b of flock) {
      const a = Math.random() * Math.PI * 2;
      b.scatter = { x: Math.cos(a) * 18, y: Math.sin(a) * 18, z: 4 + Math.random() * 8 };
    }
  }
  if (flockScatterT > 0) flockScatterT -= dt;
  const c = Math.cos(P.yaw), s = Math.sin(P.yaw);
  const n = flock.length;
  const frameSlot = Math.floor(elapsed * 60) % n;
  for (let j = n - 1; j >= 0; j--) {
    const b = flock[j];
    let tx, ty, tz;
    let settle = false;
    if (b.leaving) {
      b.t += dt;
      tx = b.x + (b.x - P.x) * 2 + 10; ty = b.y + (b.y - P.y) * 2; tz = b.z + 15;
      if (b.t > 5) { scene.remove(b.mesh); flock.splice(j, 1); continue; }
    } else if (flockScatterT > 0 && b.scatter) {
      tx = P.x + b.scatter.x; ty = P.y + b.scatter.y; tz = P.z + b.scatter.z;
    } else if (P.mode === 'fly') {
      const row = Math.floor(b.i / 2) + 1, side = b.i % 2 ? 1 : -1;
      const back = -1.7 * row, lat = side * 1.4 * row;
      tx = P.x + c * back - s * lat;
      ty = P.y + s * back + c * lat;
      tz = P.z + 0.3 * row + Math.sin(elapsed * 1.7 + b.i) * 0.25;
    } else {
      const a = (b.i / n) * Math.PI * 2 + 0.4;
      const r = 1.3 + (b.i % 3) * 0.55;
      tx = P.x + Math.cos(a) * r; ty = P.y + Math.sin(a) * r;
      tz = b.floor;
      settle = true;
    }
    if (j === frameSlot || b.floorAt === undefined) { b.floor = surfaceAt(b.x, b.y, true).h; b.floorAt = elapsed; }
    if (settle && b.floor < 0) tz = Math.max(tz, 0.6);
    const dx = tx - b.x, dy = ty - b.y, dz = tz - b.z;
    let ax = dx * 2.6 - b.vx * 1.7, ay = dy * 2.6 - b.vy * 1.7, az = dz * 2.6 - b.vz * 1.7;
    for (const o of flock) {
      if (o === b) continue;
      const ox = b.x - o.x, oy = b.y - o.y, oz = b.z - o.z;
      const d2 = ox * ox + oy * oy + oz * oz;
      if (d2 < 0.8 && d2 > 1e-4) { ax += ox / d2 * 1.5; ay += oy / d2 * 1.5; az += oz / d2 * 1.5; }
    }
    b.vx += ax * dt; b.vy += ay * dt; b.vz += az * dt;
    const sp = Math.hypot(b.vx, b.vy, b.vz);
    if (sp > 30) { b.vx *= 30 / sp; b.vy *= 30 / sp; b.vz *= 30 / sp; }
    b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
    if (b.z < b.floor) { b.z = b.floor; b.vz = Math.max(0, b.vz); }
    const hsp = Math.hypot(b.vx, b.vy);
    b.grounded = settle && b.z - b.floor < 0.15 && Math.hypot(dx, dy) < 0.8;
    if (hsp > 0.3) b.yaw = angleLerp(b.yaw ?? 0, Math.atan2(b.vy, b.vx), Math.min(1, dt * 6));
    else if (b.grounded) b.yaw = angleLerp(b.yaw ?? 0, P.yaw + Math.sin(elapsed * 0.5 + b.i) * 1.2, dt);
    b.flap += dt * (b.grounded ? 0 : b.vz > 1 || hsp < 6 ? 11 : 7);
    b.walk += dt * hsp * 7;
    b.mesh.position.set(b.x, b.z, b.y);
    b.mesh.rotation.set(b.grounded ? 0 : clamp(-(ax * s - ay * c) * 0.02, -0.7, 0.7), -(b.yaw || 0), b.grounded ? 0 : clamp(Math.atan2(b.vz, hsp + 0.1) * 0.5, -0.6, 0.6));
    const peck = b.grounded ? Math.max(0, Math.sin(elapsed * 2.3 + b.i * 1.7)) ** 8 : 0;
    poseBird(b.mesh, { flapPhase: b.flap, amp: b.grounded ? 0 : 0.8, fold: b.grounded ? 1 : 0, grounded: b.grounded, walkPhase: b.walk, peck });
  }
}

// --- loft ------------------------------------------------------------------

function initLoft() {
  const [x, y] = world.map.escapeBuilding(LOFT_SPOT.x, LOFT_SPOT.y, 2);
  const g = buildLoft();
  g.position.set(x, 0, y);
  g.rotation.y = 0.4;
  g.updateMatrixWorld(true);
  scene.add(g);
  const meshes = [];
  g.traverse((o) => { if (o.isMesh) meshes.push(o); });
  extraColliders.push({ meshes, bounds: [x - 1.6, y - 1.6, x + 1.6, y + 1.6], kind: 'loft' });
  loft = { x, y, mesh: g };
}

// A second duiventil somewhere in the city (the volkstuin trigger spot).
export function addPigeonLoft(x, y, rotY = 0) {
  const g = buildLoft();
  g.position.set(x, 0, y);
  g.rotation.y = rotY;
  g.updateMatrixWorld(true);
  scene.add(g);
  const meshes = [];
  g.traverse((o) => { if (o.isMesh) meshes.push(o); });
  extraColliders.push({ meshes, bounds: [x - 1.6, y - 1.6, x + 1.6, y + 1.6], kind: 'til' });
  return g;
}

function goHome() {
  if (!store.home || !loft) return false;
  const a = -0.4 + Math.PI / 2;
  P.x = loft.x + Math.cos(a) * 0.75;
  P.y = loft.y + Math.sin(a) * 0.75;
  syncProxies(P.x, P.y, true);
  const f = surfaceAt(P.x, P.y);
  P.z = f.h;
  P.yaw = a;
  P.mode = 'ground';
  P.ride = null;
  P.speed = 0;
  cam.pos = null;
  world.player.x = lastSet.x = P.x;
  world.player.y = lastSet.y = P.y;
  world.addMessage('Thuis! Duivenmelker Harm zet de koffie aan.', 3);
  return true;
}

// --- camera ----------------------------------------------------------------

const smooth = (t) => t * t * (3 - 2 * t);

// Intro: over the shoulder of Tammo/Tessa at the pigeon, then down behind it.
// First camera spot from `list` that is outside buildings and sees `to`.
function openCamSpot(list, to) {
  for (const c of list) {
    if (surfaceAt(c.x, c.y, false).h > c.z - 0.4) continue;
    const d = Math.hypot(to.x - c.x, to.y - c.y, to.z - c.z);
    if (rayHitDistance(c.x, c.y, c.z, to.x, to.y, to.z) > d - 0.3) return c;
  }
  return list[list.length - 1];
}

function introShots(pl) {
  const dx = P.x - pl.x, dy = P.y - pl.y, d = Math.hypot(dx, dy) || 1;
  const ux = dx / d, uy = dy / d;
  const bird = { x: P.x, y: P.y, z: P.z + 0.25 };
  const a = [];
  for (const [back, side, z] of [[2.4, 1.6, 2.5], [2.4, -1.6, 2.5], [1.4, 1.1, 2.3], [1.4, -1.1, 2.3], [0.6, 0.9, 2.6]]) {
    a.push({ x: pl.x - ux * back - uy * side, y: pl.y - uy * back + ux * side, z });
  }
  const c = Math.cos(P.yaw), sn = Math.sin(P.yaw);
  const b = [1.25, 0.8, 0.45].map((r) => ({ x: P.x - c * r, y: P.y - sn * r, z: P.z + 0.5 }));
  return { a: openCamSpot(a, bird), b: openCamSpot(b, { x: P.x + c * 4, y: P.y + sn * 4, z: P.z + 1.1 }) };
}

function introCamera(w) {
  const pl = w.player;
  const k = smooth(clamp(intro.t / (INTRO_S * 0.85), 0, 1));
  if (!intro.shots) intro.shots = introShots(pl);
  const { x: ax, y: ay, z: az } = intro.shots.a;
  const { x: bx, y: by, z: bz } = intro.shots.b;
  const lx0 = P.x, ly0 = P.y, lz0 = P.z + 0.25;
  const lx1 = P.x + Math.cos(P.yaw) * 4, ly1 = P.y + Math.sin(P.yaw) * 4, lz1 = P.z + 1.1;
  const mix = (u, v) => u + (v - u) * k;
  w.cameraOverride = {
    position: { x: mix(ax, bx), y: mix(ay, by), z: mix(az, bz) + Math.sin(k * Math.PI) * 0.6 },
    lookAt: { x: mix(lx0, lx1), y: mix(ly0, ly1), z: mix(lz0, lz1) },
    fov: 55 + k * 5,
    cut: false,
  };
}

export function updatePigeonCamera(dt, w) {
  if (!active) return;
  if (intro) { introCamera(w); return; }
  const flying = P.mode === 'fly';
  cam.yaw = angleLerp(cam.yaw, P.yaw, 1 - Math.exp(-(flying ? 3.2 : 5) * dt));
  if (flying) cam.pitchOff *= Math.exp(-2 * dt);
  const fx = P.x, fy = P.y, fz = P.z + 0.45;
  let pos, look, fov;
  if (cam.orbitT > 0) {
    cam.orbitT -= dt;
    const t = 6 - cam.orbitT;
    const a = cam.orbitA + t * 0.55;
    const R = 7 + t * 2.2;
    pos = { x: fx + Math.cos(a) * R, y: fy + Math.sin(a) * R, z: fz + 1.5 + t * 1.6 };
    look = { x: fx, y: fy, z: fz - t * 1.2 };
    fov = 55;
    cam.pos = { ...pos };
  } else {
    const dist = flying ? 3.7 + P.speed * 0.13 : 2.5;
    let elev = clamp((flying ? 0.2 - P.pitch * 0.3 : 0.36) + cam.pitchOff, -0.15, 1.25);
    const offset = (e) => [fx - Math.cos(cam.yaw) * Math.cos(e) * dist, fy - Math.sin(cam.yaw) * Math.cos(e) * dist, fz + Math.sin(e) * dist];
    let [wx, wy, wz] = offset(elev);
    let hit = rayHitDistance(fx, fy, fz, wx, wy, wz);
    for (const e of [0.8, 1.25]) {
      if (hit >= dist * 0.6 || e <= elev) continue;
      const alt = offset(e);
      const h2 = rayHitDistance(fx, fy, fz, alt[0], alt[1], alt[2]);
      if (h2 > hit) { hit = h2; elev = e; [wx, wy, wz] = alt; }
    }
    let k = 1;
    if (hit < dist + 0.3) {
      k = clamp((hit - 0.35) / dist, 0.3, 1);
      wx = fx + (wx - fx) * k; wy = fy + (wy - fy) * k; wz = fz + (wz - fz) * k;
    }
    const floor = surfaceAt(wx, wy, false).h;
    if (floor < fz + 0.3) wz = Math.max(wz, floor + 0.35);
    if (!cam.pos) cam.pos = { x: wx, y: wy, z: wz };
    else {
      const s = 1 - Math.exp(-(flying ? 9 : 12) * dt);
      cam.pos.x += (wx - cam.pos.x) * s;
      cam.pos.y += (wy - cam.pos.y) * s;
      cam.pos.z += (wz - cam.pos.z) * s;
      if (k < 1) {
        const cd = Math.hypot(cam.pos.x - fx, cam.pos.y - fy, cam.pos.z - fz);
        const md = dist * k;
        if (cd > md + 0.05) {
          const r = md / cd;
          cam.pos.x = fx + (cam.pos.x - fx) * r; cam.pos.y = fy + (cam.pos.y - fy) * r; cam.pos.z = fz + (cam.pos.z - fz) * r;
        }
      }
    }
    pos = cam.pos;
    const lead = flying ? 3 : 1.4;
    look = { x: fx + Math.cos(P.yaw) * lead, y: fy + Math.sin(P.yaw) * lead, z: fz + (flying ? P.pitch * 1.2 : 0.1) };
    fov = flying ? clamp(62 + (P.speed - CRUISE) * 0.9, 55, 82) : 58;
  }
  if (camBlend > 0) camBlend -= dt;
  w.cameraOverride = { position: { x: pos.x, y: pos.y, z: pos.z }, lookAt: look, fov, cut: camBlend <= 0 };
}

// --- main ------------------------------------------------------------------

function placePigeonMesh(dt) {
  pigeon.position.set(P.x, P.z, P.y);
  pigeon.rotation.set(P.roll, -P.yaw, P.mode === 'fly' ? P.pitch * 0.8 : 0);
  if (P.peckT > 0) P.peckT -= dt;
  const peck = P.peckT > 0 ? Math.sin((0.35 - P.peckT) / 0.35 * Math.PI) : 0;
  poseBird(pigeon, { flapPhase: P.flapPhase, amp: P.mode === 'fly' ? P.flapAmp : 0, fold: P.fold, grounded: P.mode !== 'fly', walkPhase: P.walkPhase, peck });
  const floor = P.mode === 'fly' ? P.groundH ?? 0 : P.z;
  const alt = P.z - floor;
  shadow.visible = alt < 30;
  shadow.position.set(P.x, floor + 0.03, P.y);
  shadow.scale.setScalar(clamp(1 - alt / 40, 0.35, 1));
  shadow.material.opacity = 0.35 * clamp(1 - alt / 30, 0.15, 1);
}

export function updatePigeonMode(dt, w) {
  if (!active) return;
  elapsed += dt;
  const pl = w.player;
  const inp = w.input;
  if (inp.wasPressed('x')) { inp.consume('x'); stopPigeonMode(w); return; }
  if (intro) { updateIntro(dt, w); return; }
  if (Math.hypot(pl.x - lastSet.x, pl.y - lastSet.y) > 5) {
    P.x = pl.x; P.y = pl.y;
    syncProxies(P.x, P.y, true);
    P.z = surfaceAt(P.x, P.y).h + 25;
    P.mode = 'fly'; P.ride = null; P.speed = CRUISE; P.pitch = 0;
    cam.pos = null;
  }
  syncProxies(P.x, P.y);
  if (P.mode === 'fly') updateFly(dt);
  else if (P.mode === 'ground') updateGround(dt);
  else updateRide(dt);

  const md = inp.mouse.down;
  if ((inp.wasPressed('f') || (md && !prevMouseDown)) && poopCd <= 0) { dropPoop(); poopCd = 0.28; }
  prevMouseDown = md;
  poopCd -= dt;
  if (inp.wasPressed('q')) toggleFlock();
  if (inp.wasPressed('c')) coo();
  if (P.mode !== 'fly' && (P.cooT -= dt) <= 0) { P.cooT = 6 + Math.random() * 8; sfx('coo', P.x, P.y, 0.4); }

  updateDrops(dt);
  updateDecals(dt);
  updateFood(dt);
  updateGull(dt);
  updateFlock(dt);
  placePigeonMesh(dt);
  if (!store.home && elapsed > 120 && hintAt === 0) {
    hintAt = elapsed;
    world.addMessage('Gerucht: ergens in n tuin woont n duivenmelker…', 4);
  }

  pl.x = lastSet.x = P.x;
  world.pigeonAlt = P.z; // absolute height: breakables.js footKicks lets props below it be
  pl.y = lastSet.y = P.y;
  pl.angle = P.yaw;
  pl.vx = 0; pl.vy = 0;
  updateHud(dt);
}

function updateIntro(dt, w) {
  intro.t += dt;
  const pl = w.player;
  pl.angle = angleLerp(pl.angle, Math.atan2(P.y - pl.y, P.x - pl.x), Math.min(1, dt * 6));
  pl.vx = 0; pl.vy = 0;
  if (!intro.pecked && intro.t > 0.3) { intro.pecked = true; P.peckT = 0.35; sfx('coo', P.x, P.y, 0.8); }
  if (!intro.hopped && intro.t > 0.95) { intro.hopped = true; P.peckT = 0.3; }
  placePigeonMesh(dt);
  if (intro.t >= INTRO_S) beginFlight(w);
}

// Take-off heading: close to `pref`, but towards open sky rather than a facade.
function clearestYaw(pref) {
  let best = pref, bestScore = -Infinity;
  for (let i = 0; i < 16; i++) {
    const a = pref + (i / 16) * Math.PI * 2;
    let clear = 0;
    for (let d = 2; d <= 32; d += 2) {
      if (surfaceAt(P.x + Math.cos(a) * d, P.y + Math.sin(a) * d, false).h > P.z + 1 + d * 0.8) break;
      clear = d;
    }
    const score = clear - Math.abs(normalizeAngle(a - pref)) * 3;
    if (score > bestScore) { bestScore = score; best = a; }
  }
  return best;
}

function beginFlight(w) {
  intro = null;
  w.pigeonIntro = false;
  const pl = w.player;
  pl.x = lastSet.x = P.x;
  pl.y = lastSet.y = P.y;
  takeOff(5);
  P.pitch = 0.75;
  P.flapBoost = 7;
  cam.yaw = P.yaw;
  cam.pitchOff = 0;
  cam.pos = null;
  camBlend = CAM_BLEND_S;
  hud.root.hidden = false;
  hud.hintKey = '';
  // in a mission the stage's own card explains the flight (and X would end it)
  if (!inMission(w)) w.addMessage(pick(['Moi duuf! Grunn is van joe.', 'Roekoe! De wijk ligt aan je pootjes.', 'Vleugels uit, poep klaar.']) + ' X om weer mens te worden.', 4);
}

const inMission = (w) => !!(w.mission && w.mission.phase === 'active');

// Where Tammo/Tessa reappear: right below the pigeon if that is open, walkable
// ground; otherwise (roof, water, closed-off courtyard) the nearest street.
function landingSpot(map) {
  const f = surfaceAt(P.x, P.y, false);
  if (f.kind === 'ground' && f.h < 0.3 && !isInWater(map, P.x, P.y)) {
    const [x, y] = map.escapeBuilding(P.x, P.y);
    if (!isInWater(map, x, y) && map.canWalkOut(x, y, 40)) return { x, y };
  }
  const dry = (x, y) => !isInWater(map, x, y);
  const s = map.findOpenSpawn(P.x, P.y, 400);
  if (s && dry(s.x, s.y)) return { x: s.x, y: s.y };
  // kade roads often overlap the canal polygon: walk the nearby street points
  // outwards until one is dry, outside buildings and not a closed courtyard
  const cands = [];
  for (const road of map.roadsNear(P.x, P.y, 150)) {
    if (road.z) continue;
    const pts = road.pts;
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
      const n = Math.max(1, Math.round(Math.hypot(bx - ax, by - ay) / 4));
      for (let k = 0; k <= n; k++) {
        const x = ax + ((bx - ax) * k) / n, y = ay + ((by - ay) * k) / n;
        cands.push({ x, y, d: Math.hypot(x - P.x, y - P.y) });
      }
    }
  }
  cands.sort((u, v) => u.d - v.d);
  let tries = 0;
  for (const c of cands) {
    const [x, y] = map.escapeBuilding(c.x, c.y);
    if (!dry(x, y)) continue;
    if (map.canWalkOut(x, y, 40)) return { x, y };
    if (++tries > 20) break;
  }
  return session ? { x: session.startX, y: session.startY } : { x: P.x, y: P.y };
}

function placeCompanion(w, x, y, angle) {
  const c = w.companion;
  if (!c) return;
  const map = w.map;
  if (c.inVehicle) { c.inVehicle.passenger = null; c.inVehicle = null; }
  let spot = null;
  for (const r of [0.9, 1.8, 3]) {
    for (const side of [1, -1, 2, 0]) {
      const a = angle + side * Math.PI / 2;
      const [cx, cy] = map.escapeBuilding(x + Math.cos(a) * r, y + Math.sin(a) * r);
      if (!isInWater(map, cx, cy)) { spot = [cx, cy]; break; }
    }
    if (spot) break;
  }
  [c.x, c.y] = spot || [x, y];
  c.vx = 0; c.vy = 0; c.z = 0; c.vz = 0;
  c.gz = w.player.gz || 0;
  c.angle = angle;
  c.water = null; c.swimming = false; c.climb = null;
  if (c.state === 'dead') { c.state = 'alive'; c.health = 100; }
}

function clearFlightProps() {
  for (const d of drops) scene.remove(d.mesh);
  drops.length = 0;
  for (const f of foods) scene.remove(f.mesh);
  foods.length = 0;
  for (const b of flock) scene.remove(b.mesh);
  flock.length = 0;
  if (gull) { scene.remove(gull.mesh); gull = null; }
  if (P.carry) dropCarry();
  P.ride = null;
  P.boostT = 0;
  for (let i = decals.length - 1; i >= 0; i--) if (decals[i].v) { scene.remove(decals[i].mesh); decals.splice(i, 1); }
}

// Ends the pigeon activity: Tammo/Tessa (and the companion) step out at the
// spot below the pigeon and normal play resumes; the pigeon flutters off.
export function stopPigeonMode(w = world) {
  if (!active) return false;
  const map = w.map;
  const pl = w.player;
  const spot = intro && session ? { x: session.startX, y: session.startY } : landingSpot(map);
  const flew = !intro;
  active = false;
  intro = null;
  w.pigeonMode = false;
  w.pigeonIntro = false;
  document.body.classList.remove('pigeon-mode');
  hud.root.hidden = true;
  hud.card.classList.remove('on');
  hud.sikkom.classList.remove('on');
  hud.pops.textContent = '';
  store.total += score;
  if (score > store.best) store.best = score;
  clearFlightProps();

  const angle = flew ? P.yaw : pl.angle;
  pl.x = lastSet.x = spot.x;
  pl.y = lastSet.y = spot.y;
  pl.angle = angle;
  pl.vx = 0; pl.vy = 0; pl.z = 0; pl.vz = 0;
  pl.gz = map.groundHeightAt ? map.groundHeightAt(spot.x, spot.y, 0) || 0 : 0;
  pl.inVehicle = null;
  pl.water = null; pl.swimming = false; pl.climb = null;
  placeCompanion(w, spot.x, spot.y, angle);
  w.cameraOverride = null;
  w.input.reset();

  if (flew) {
    outro = { t: 0, x: P.x, y: P.y, z: Math.max(P.z, surfaceAt(P.x, P.y, false).h), yaw: P.yaw };
    const who = pl.character === 'anita' ? 'Tessa' : 'Tammo';
    const wijk = wijkAt(map, spot.x, spot.y);
    // a flight without points (a mission's, or a short hop) needs no score card
    if (score > 0) w.addMessage(`${who} landt${wijk ? ' in ' + wijk : ''}: ${score} poeppunten (totaal ${store.total})`, 4.5);
    sfx('flap', P.x, P.y, 0.8);
    saveGame(w);
  } else {
    pigeon.visible = false;
    shadow.visible = false;
  }
  session = null;
  return true;
}

function wijkAt(map, x, y) {
  let best = null, bd = 900;
  for (const p of map.meta.neighbourhoodPoints || []) {
    const d = Math.hypot(p.x - x, p.y - y);
    if (d < bd) { bd = d; best = p.name; }
  }
  return best;
}

// The pigeon that was just "you" flies off once you're human again.
export function updatePigeonAfterglow(dt) {
  if (!outro || active) return;
  const o = outro;
  o.t += dt;
  o.z += dt * (2.5 + o.t * 3);
  o.x += Math.cos(o.yaw) * dt * 7;
  o.y += Math.sin(o.yaw) * dt * 7;
  pigeon.position.set(o.x, o.z, o.y);
  pigeon.rotation.set(0, -o.yaw, 0.5);
  poseBird(pigeon, { flapPhase: o.t * 12, amp: 1, fold: 0, grounded: false });
  shadow.visible = false;
  if (o.t > OUTRO_S) { pigeon.visible = false; outro = null; }
}

function coo() {
  P.peckT = 0.3;
  sfx('coo', P.x, P.y, 0.9);
  popup('Roe-koe!');
  for (const ped of world.pedestrians) {
    if (ped.state === 'dead' || Math.hypot(ped.x - P.x, ped.y - P.y) > 6 || P.z - (P.groundH ?? 0) > 6) continue;
    if (Math.random() < 0.5) { ped.speechText = pick(COO_LINES); ped.speechUntil = world.time + 2.4; }
    break;
  }
}

// Registered before phone.js so T can't open the phone while flying. Also
// builds the (hidden) pigeon, the loft and the HUD once, so the activity can
// start at any time during normal play.
export function initPigeonMode(w) {
  world = w;
  scene = getScene();
  window.addEventListener('keydown', (e) => {
    if (!w.pigeonMode) return;
    const k = e.key.toLowerCase();
    if (k === 't') { e.stopImmediatePropagation(); return; }
    if (e.ctrlKey && ['f', 'e', 'q', 'c', 'd', 's', 'x'].includes(k)) e.preventDefault();
  }, true);
  loadLegacyStore();
  w.pigeonActions = { home: goHome, hasHome: () => store.home, stop: () => stopPigeonMode(w) };
  onLandmarkModelLoaded((name) => { for (const b of [...proxies.keys()]) if (b.name === name || b.landmark === name) proxies.delete(b); });
  pigeon = buildBird('pigeon');
  pigeon.visible = false;
  scene.add(pigeon);
  shadow = new THREE.Mesh(new THREE.CircleGeometry(0.4, 16), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.visible = false;
  scene.add(shadow);
  initLoft();
  initHudDom();
  hud.root.hidden = true;
  ready = true;
}

export function isPigeonActive() {
  return active;
}

// Read-only flight state for missions and the story (spotting targets,
// poop score of the current flight).
export function getPigeonFlight() {
  if (!active) return null;
  return { x: P.x, y: P.y, z: P.z, ground: surfaceAt(P.x, P.y, false).h, mode: P.mode, score, intro: !!intro, yaw: P.yaw, speed: P.speed };
}

// Read-only: where the gull is (for the mission map), or null.
export function getPigeonThreats() {
  return active && gull ? [{ x: gull.x, y: gull.y, kind: 'meeuw', label: 'Meeuw' }] : [];
}

export { buildBird as buildPigeonBird, poseBird as posePigeonBird };

// Starts the pigeon activity. With a spot ({ x, y }: where a pigeon sits near
// Tammo/Tessa) there is a short intro before it takes off from there; without
// one the pigeon starts in the air above the player.
export function startPigeonMode(w, spot = null) {
  if (active || !ready) return false;
  world = w;
  if (window.__debug) window.__debug.pigeon = { P, cam, surfaceAt, foods, flock, get gull() { return gull; }, spawnGull, spawnFood, addScore, store: () => store };
  const pl = w.player;
  if (pl.inVehicle) return false;
  if (outro) { outro = null; }
  quitRunningActivities(w); // een lopende wandeling of minigame stopt met zijn HUD (#241)
  active = true;
  w.pigeonMode = true;
  w.pigeonIntro = !!spot;
  document.body.classList.add('pigeon-mode');
  score = 0; combo = 0; comboUntil = 0; milestoneIdx = 0;
  P.boostT = 0; P.carry = null; P.ride = null; P.landing = false; P.peckT = 0; P.roll = 0; P.yawRate = 0; P.pitchCmd = 0;
  poopCd = 0;
  prevMouseDown = w.input.mouse.down;
  session = { startX: pl.x, startY: pl.y };
  pigeon.visible = true;
  hud.hintKey = '';
  hud.root.hidden = true;
  w.cameraOverride = null;

  if (spot) {
    P.x = spot.x; P.y = spot.y;
    syncProxies(P.x, P.y, true);
    const floor = surfaceAt(P.x, P.y, false).h;
    P.z = floor < 1.2 ? Math.max(0, floor) : 0;
    P.mode = 'ground';
    P.yaw = clearestYaw(Math.atan2(P.y - pl.y, P.x - pl.x));
    P.speed = 0; P.pitch = 0; P.flapBoost = 0; P.fold = 1; P.flapAmp = 0; P.walkPhase = 0;
    intro = { t: 0 };
    placePigeonMesh(0);
    // Tammo/Tessa whistle, close their eyes and the camera jumps into the bird
    sfx('whistle', pl.x, pl.y, 0.8);
    const tessa = pl.character === 'anita', who = tessa ? 'Tessa' : 'Tammo';
    if (!inMission(w)) w.addMessage(pick([`${who} fluit zachtjes en doet ${tessa ? 'haar' : 'zijn'} ogen dicht…`, `${who} klikt met ${tessa ? 'haar' : 'zijn'} tong. De duif kijkt op…`, `Ogen dicht, fluiten. ${who} zit ineens in de duif…`]), 2.5);
  } else {
    intro = null;
    P.x = pl.x; P.y = pl.y;
    syncProxies(P.x, P.y, true);
    P.z = surfaceAt(P.x, P.y).h + 25;
    P.yaw = pl.angle;
    P.mode = 'fly'; P.speed = CRUISE; P.pitch = 0;
    beginFlight(w);
  }
  updatePigeonCamera(0.016, w);
  return true;
}
