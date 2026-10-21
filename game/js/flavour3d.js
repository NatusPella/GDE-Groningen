import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { fitText as sharedFitText } from './canvastex.js';
import { buildHorseMesh } from './countryside.js';
import { isInsideBuilding, isOnRoad } from './pedgeom.js';
import { isInWater, pointInPolygon } from './util.js';
import { BILLBOARD_SLOGANS, KROLBRUG_SIGNS, OOSTERPARK_PLAQUE } from './flavourlines.js';
import { KROLBRUG, PLANTSOEN, GROTE_MARKT, OOSTERPARK, krolLevel } from './flavour.js';
import { buildPersonMesh, seatPose, seatedY } from './models3d_people.js';
import { SIT_GROUND, SEAT_TOP, POOL_SIZE, picnicPeople, assignPool } from './picnicpeople.js';

// The 3D side of flavour.js: billboards, the Gerrit Krolbrug detour, the
// Noorderplantsoen picnic, the wandering Peerd, the Oosterpark plaque, the
// Bommen Berend flags and the Bloemetjesmarkt house plants. Everything is
// built once at boot (hidden, so the shader warm-up sees it) and only
// toggled, moved or re-lettered afterwards; instanced where there are many.

let root = null;
let map = null;
const boards = [];
let krol = null, picnic = null, peerd = null, plaque = null, flags = null, plants = null, flowerMarket = null;
let lastStage = -1, lastNight = -1, lastKrolText = '', lastKrolLevel = -1, lastPeerd = null;
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _p = new THREE.Vector3(), _e = new THREE.Euler();
const UP = new THREE.Vector3(0, 1, 0);

function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

const free = (x, y, margin = 0.6) =>
  !isInsideBuilding(map, x, y) && !isInWater(map, x, y) && !isOnRoad(map, x, y, margin, ['major', 'normal', 'minor', 'cycle', 'foot']) && !map.offStreetLevel(x, y, 1);

function std(color, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, ...extra });
}

function canvasTex(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

const fitText = (ctx, text, maxW, size, weight = 800, font = 'system-ui, sans-serif') => sharedFitText(ctx, text, maxW, size, weight, font);

export function initFlavour3D(world, scene) {
  if (root || !scene) return;
  map = world.map;
  root = new THREE.Group();
  root.name = 'flavour';
  scene.add(root);
  buildBoards();
  buildKrol();
  buildPicnic();
  buildPeerd();
  buildPlaque();
  buildFlags();
  buildPlants();
  buildFlowerMarket();
  if (world.flavour) world.flavour.boards = boards.map((b) => ({ x: b.x, y: b.y, face: b.face }));
}

// --- billboards ---------------------------------------------------------------

// Along the big roads into and around the city; each spot is moved to a free
// patch beside the nearest street-level main road, facing it.
const BOARD_ANCHORS = [[-43.04, 1098.27], [1502.98, 1223.75], [-235.79, 1574.54], [-1969.04, -229.61], [22.38, -2254.95], [2333.44, -662.54], [1179.24, -160.04], [-911.8, -548.58], [662.54, 1328.28], [-1288.95, 927.2]];

function boardSpot(ax, ay) {
  const q = map.nearestRoadPoint(ax, ay, 320, true, true);
  if (!q) return null;
  const pts = q.road.pts;
  let bi = 0, bd = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2;
    const d = Math.hypot(mx - q.x, my - q.y);
    if (d < bd) { bd = d; bi = i; }
  }
  const dx = pts[bi + 1][0] - pts[bi][0], dy = pts[bi + 1][1] - pts[bi][1];
  const l = Math.hypot(dx, dy) || 1;
  const tx = dx / l, ty = dy / l;
  for (const side of [1, -1]) {
    for (const extra of [4, 6, 9]) {
      const off = (q.road.width || 8) / 2 + extra;
      const nx = -ty * side, ny = tx * side;
      const x = q.x + nx * off, y = q.y + ny * off;
      const ok = [-3.6, 0, 3.6].every((k) => free(x + tx * k, y + ty * k, 0.8));
      if (ok && !map.treesNear(x, y, 2.5).length) return { x, y, face: Math.atan2(-ny, -nx) };
    }
  }
  return null;
}

function buildBoards() {
  const post = std(0x4a4f55, { metalness: 0.3, roughness: 0.6 });
  const back = std(0x2c3036);
  const postGeo = new THREE.BoxGeometry(0.28, 5, 0.28).translate(0, 2.5, 0);
  const panelGeo = new THREE.PlaneGeometry(8, 3.2);
  const frameGeo = new THREE.BoxGeometry(8.3, 3.5, 0.25);
  BOARD_ANCHORS.forEach(([ax, ay], i) => {
    const s = boardSpot(ax, ay);
    if (!s) return;
    const g = new THREE.Group();
    g.position.set(s.x, 0, s.y);
    // plane faces +z locally; turn it to face the road
    g.rotation.y = Math.PI / 2 - s.face;
    for (const k of [-2.6, 2.6]) { const m = new THREE.Mesh(postGeo, post); m.position.x = k; g.add(m); }
    const frame = new THREE.Mesh(frameGeo, back);
    frame.position.set(0, 6.4, -0.14);
    g.add(frame);
    const tex = canvasTex(1024, 410);
    const mat = new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.15, roughness: 0.7 });
    const panel = new THREE.Mesh(panelGeo, mat);
    panel.position.set(0, 6.4, 0.02);
    g.add(panel);
    g.visible = false;
    root.add(g);
    boards.push({ g, tex, mat, i, x: s.x, y: s.y, face: s.face });
  });
}

const BOARD_THEMES = [['#1f4a2e', '#f3efe2', '#f2c94c'], ['#e8e2d0', '#1d2733', '#c0392b'], ['#1d3557', '#f1faee', '#e9c46a'], ['#c94b3a', '#fff8ec', '#1d1d1d']];

function paintBoard(b, stage) {
  const [head, small] = BILLBOARD_SLOGANS[(stage + b.i * 3) % BILLBOARD_SLOGANS.length];
  const [bg, fg, accent] = BOARD_THEMES[(stage + b.i) % BOARD_THEMES.length];
  const c = b.tex.image, x = c.getContext('2d');
  x.fillStyle = bg; x.fillRect(0, 0, c.width, c.height);
  x.fillStyle = accent; x.fillRect(0, c.height - 28, c.width, 28);
  x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle';
  const words = head.split(' ');
  const mid = Math.ceil(words.length / 2);
  const lines = head.length > 26 ? [words.slice(0, mid).join(' '), words.slice(mid).join(' ')] : [head];
  lines.forEach((ln, k) => {
    fitText(x, ln, c.width - 90, 104);
    x.fillText(ln, c.width / 2, lines.length === 1 ? 160 : 110 + k * 110);
  });
  fitText(x, small, c.width - 140, 40, 600);
  x.globalAlpha = 0.85;
  x.fillText(small, c.width / 2, 330);
  x.globalAlpha = 1;
  b.tex.needsUpdate = true;
}

// --- Gerrit Krolbrug detour -------------------------------------------------------

// Parts per level (0 = first pass): each pass adds more, until the detour is a monument.
let krolSignTex = null, krolBigTex = null;

function signMat(tex) {
  return new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.1, roughness: 0.7 });
}

function buildKrol() {
  const g = new THREE.Group();
  g.visible = false;
  g.position.set(KROLBRUG.x, 0, KROLBRUG.y);
  root.add(g);
  const spots = [];
  const r = rng(77);
  for (let t = 0; t < 400 && spots.length < 5; t++) {
    const a = r() * Math.PI * 2, d = 10 + r() * 18;
    const x = KROLBRUG.x + Math.cos(a) * d, y = KROLBRUG.y + Math.sin(a) * d;
    if (!free(x, y, 1.2) || spots.some((s) => Math.hypot(s.x - x, s.y - y) < 5)) continue;
    spots.push({ x, y, face: Math.atan2(KROLBRUG.y - y, KROLBRUG.x - x) });
  }
  const lamp = new THREE.MeshStandardMaterial({ color: 0x5a3a00, emissive: 0xffa21a, emissiveIntensity: 0 });
  const tiers = [];
  krol = { g, tiers, lamp };
  if (!spots.length) return;
  const white = std(0xf2f2ee), red = std(0xc8302a), orange = std(0xe8742a), yellow = std(0xf2c230), grey = std(0x8a8f94), blue = std(0x2e5fa0);
  // (dx along the part's front, h up, dz towards the bridge)
  const add = (lvl, geo, mat, s, dx, h, dz, ry = 0) => {
    const m = new THREE.Mesh(geo, mat);
    const c = Math.cos(s.face), n = Math.sin(s.face);
    m.position.set(s.x - KROLBRUG.x + c * dz - n * dx, h, s.y - KROLBRUG.y + n * dz + c * dx);
    m.rotation.y = Math.PI / 2 - s.face + ry;
    (tiers[lvl] = tiers[lvl] || []).push(m);
    g.add(m);
    return m;
  };
  const [s0, s1 = s0, s2 = s0, s3 = s1, s4 = s2] = spots;
  const barrier = new THREE.BoxGeometry(2.2, 0.22, 0.08), leg = new THREE.BoxGeometry(0.08, 1, 0.08);
  const cone = new THREE.ConeGeometry(0.2, 0.7, 8).translate(0, 0.35, 0);
  const signPole = new THREE.BoxGeometry(0.1, 2.6, 0.1).translate(0, 1.3, 0);
  const bulb = new THREE.SphereGeometry(0.12, 8, 6);
  const tower = new THREE.BoxGeometry(0.25, 7, 0.25).translate(0, 3.5, 0);
  for (const s of [s0, s1]) {
    add(0, barrier, red, s, 0, 0.95, 0); add(0, barrier, white, s, 0, 0.7, 0);
    add(0, leg, white, s, -1, 0.5, 0); add(0, leg, white, s, 1, 0.5, 0);
  }
  add(0, signPole, grey, s0, 1.8, 0, -0.05);
  krolSignTex = canvasTex(512, 256);
  add(0, new THREE.PlaneGeometry(2.2, 1.1), signMat(krolSignTex), s0, 1.8, 2.3, 0.02, Math.PI);
  for (let k = 0; k < 5; k++) add(1, cone, orange, s1, -2 + k, 0, 1.4);
  add(1, signPole, grey, s2, 0, 0, 0);
  add(1, new THREE.BoxGeometry(1.6, 0.6, 0.05), yellow, s2, 0, 2.4, 0.06);
  for (const s of [s0, s1, s2]) add(2, bulb, lamp, s, 0.9, 1.15, 0);
  add(3, new THREE.BoxGeometry(6, 2.6, 2.4).translate(0, 1.3, 0), blue, s3, 0, 0, -2);
  add(3, new THREE.BoxGeometry(6, 2.4, 2.4).translate(0, 1.2, 0), orange, s4, 0, 0, -2, 0.3);
  add(4, tower, grey, s3, -5.5, 0, 1.5); add(4, tower, grey, s3, 5.5, 0, 1.5);
  add(4, new THREE.BoxGeometry(11.3, 0.35, 0.35), grey, s3, 0, 7, 1.5);
  for (let k = 0; k < 4; k++) add(4, bulb, lamp, s3, -4.5 + k * 3, 6.6, 1.5);
  krolBigTex = canvasTex(1024, 200);
  add(5, new THREE.PlaneGeometry(10.6, 2), signMat(krolBigTex), s3, 0, 5.4, 1.52, Math.PI);
}

function paintKrol(level, text) {
  if (krolSignTex) {
    const c = krolSignTex.image, x = c.getContext('2d');
    x.fillStyle = '#f2c230'; x.fillRect(0, 0, c.width, c.height);
    x.fillStyle = '#1d1d1d'; x.fillRect(10, 10, c.width - 20, 8); x.fillRect(10, c.height - 18, c.width - 20, 8);
    x.textAlign = 'center'; x.textBaseline = 'middle';
    const sign = KROLBRUG_SIGNS[level];
    fitText(x, sign, c.width - 40, 64);
    x.fillText(sign, c.width / 2, 92);
    x.font = '600 26px system-ui, sans-serif';
    const words = text.split(' ');
    let ln = '', y = 160;
    for (const w of words) {
      const t = ln ? ln + ' ' + w : w;
      if (x.measureText(t).width > c.width - 50) { x.fillText(ln, c.width / 2, y); ln = w; y += 30; } else ln = t;
    }
    if (ln && y < 240) x.fillText(ln, c.width / 2, y);
    krolSignTex.needsUpdate = true;
  }
  if (krolBigTex) {
    const c = krolBigTex.image, x = c.getContext('2d');
    x.fillStyle = '#2e5fa0'; x.fillRect(0, 0, c.width, c.height);
    x.fillStyle = '#ffffff'; x.textAlign = 'center'; x.textBaseline = 'middle';
    fitText(x, KROLBRUG_SIGNS[KROLBRUG_SIGNS.length - 1], c.width - 60, 84);
    x.fillText(KROLBRUG_SIGNS[KROLBRUG_SIGNS.length - 1], c.width / 2, c.height / 2);
    krolBigTex.needsUpdate = true;
  }
}

// --- Noorderplantsoen picnic -------------------------------------------------------

function parkPoints(n, seed) {
  const polys = map.greenNear(PLANTSOEN.x, PLANTSOEN.y, PLANTSOEN.r)
    .filter((g) => (g.kind === 'grass' || g.kind === 'park') && g.pts.length > 3)
    .map((g) => { const b = g.bounds; return { g, b, a: (b[2] - b[0]) * (b[3] - b[1]) }; })
    .filter((p) => p.a > 300);
  const total = polys.reduce((s, p) => s + p.a, 0);
  const r = rng(seed);
  const out = [];
  for (let t = 0; t < n * 40 && out.length < n; t++) {
    let k = r() * total, P = polys[0];
    for (const p of polys) { k -= p.a; if (k <= 0) { P = p; break; } }
    if (!P) break;
    const x = P.b[0] + r() * (P.b[2] - P.b[0]), y = P.b[1] + r() * (P.b[3] - P.b[1]);
    if (!pointInPolygon(x, y, P.g.pts) || !free(x, y, 1) || map.treesNear(x, y, 1.6).length) continue;
    if (out.some((o) => Math.hypot(o.x - x, o.y - y) < 3.2)) continue;
    out.push({ x, y, a: r() * Math.PI * 2, r: r() });
  }
  return out;
}

function instanced(geo, mat, n) {
  const m = new THREE.InstancedMesh(geo, mat, n);
  m.frustumCulled = false;
  return m;
}

function place(mesh, i, x, h, y, ry = 0, rx = 0, s = 1) {
  _e.set(rx, ry, 0, 'YXZ');
  _q.setFromEuler(_e);
  _m.compose(_p.set(x, h, y), _q, _s.set(s, s, s));
  mesh.setMatrixAt(i, _m);
}

const BLANKETS = [0xd8433a, 0x3f7fc4, 0xf0c33c, 0x3fa56b, 0xe8e2d0, 0x9a4fb0, 0xe8742a, 0x2e3c56];
const SHIRTS = [0x2b2f36, 0xc94b3a, 0xe8e6e0, 0x3f5c8a, 0xc9a227, 0x1f4a2e, 0x6b6b6b, 0xd88aa8];
const SKINS = [0xf0c8a0, 0xe0b48a, 0xc28e62, 0x8d5a3b, 0x5a3825];

function buildPicnic() {
  const spots = parkPoints(60, 4242);
  const g = new THREE.Group();
  g.visible = false;
  root.add(g);
  const white = std(0xffffff);
  const col = new THREE.Color();
  const blanket = instanced(new THREE.PlaneGeometry(1.9, 1.5).rotateX(-Math.PI / 2), white, spots.length);
  const speaker = instanced(new THREE.BoxGeometry(0.26, 0.42, 0.24).translate(0, 0.21, 0), std(0x1e2126), spots.length);
  const bbq = instanced(new THREE.BoxGeometry(0.46, 0.12, 0.3).translate(0, 0.06, 0), std(0xb9bdc2, { metalness: 0.5, roughness: 0.5 }), spots.length);
  const coals = instanced(new THREE.PlaneGeometry(0.4, 0.24).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x331100, emissive: 0xff5a1a, emissiveIntensity: 1.4 }), spots.length);
  const wheel = instanced(new THREE.TorusGeometry(0.33, 0.03, 5, 14), std(0x1e1e1e), spots.length * 2);
  const frame = instanced(new THREE.BoxGeometry(1.0, 0.05, 0.05), white, spots.length);
  let ns = 0, nb = 0, nk = 0;
  spots.forEach((s, i) => {
    place(blanket, i, s.x, 0.04, s.y, s.a);
    blanket.setColorAt(i, col.setHex(BLANKETS[i % BLANKETS.length]));
    if (i % 3 === 0) { place(speaker, ns++, s.x + Math.cos(s.a + 1) * 0.8, 0.04, s.y + Math.sin(s.a + 1) * 0.8, s.a); }
    if (i % 3 === 1) {
      const bx = s.x + Math.cos(s.a - 1.2) * 1.5, by = s.y + Math.sin(s.a - 1.2) * 1.5;
      place(bbq, nb, bx, 0.02, by, s.a); place(coals, nb, bx, 0.13, by, s.a); nb++;
    }
    if (i % 4 === 2) {
      const bx = s.x + Math.cos(s.a + 2.4) * 2.2, by = s.y + Math.sin(s.a + 2.4) * 2.2, ba = s.a * 1.7;
      const fx = Math.cos(ba) * 0.5, fy = -Math.sin(ba) * 0.5;
      place(wheel, nk * 2, bx - fx, 0.04, by - fy, ba, Math.PI / 2);
      place(wheel, nk * 2 + 1, bx + fx, 0.04, by + fy, ba, Math.PI / 2);
      place(frame, nk, bx, 0.07, by, ba);
      frame.setColorAt(nk, col.setHex(BLANKETS[(i + 2) % BLANKETS.length]));
      nk++;
    }
  });
  speaker.count = ns; bbq.count = coals.count = nb; wheel.count = nk * 2; frame.count = nk;
  for (const m of [blanket, speaker, bbq, coals, wheel, frame]) g.add(m);
  // de picknickers zijn gewone mensmodellen in een zittende pose (#342), een pool bij de speler in de buurt
  picnic = { g, coals, people: picnicPeople(spots), pool: [], lastAssign: -1 };
}

// Zet de pool picknickers bij de speler neer (elke halve seconde). Het model wordt pas gebouwd als er een figuur nodig is.
function stepPicnicPeople(world, p) {
  const pn = picnic;
  if (world.time - pn.lastAssign < 0.5) return;
  pn.lastAssign = world.time;
  if (!pn.pool.length) for (let i = 0; i < POOL_SIZE; i++) pn.pool.push({ who: -1, mesh: null });
  for (const i of assignPool(pn.people, pn.pool, p.x, p.y)) {
    const q = pn.pool[i];
    if (q.who < 0) { if (q.mesh) q.mesh.visible = false; continue; }
    const who = pn.people[q.who];
    if (!q.mesh) { q.mesh = buildPersonMesh(SHIRTS[(i * 3) % SHIRTS.length], SKINS[(i * 7 + 1) % SKINS.length]); q.mesh.name = 'picknicker'; pn.g.add(q.mesh); }
    seatPose(q.mesh, SIT_GROUND[who.pose]);
    q.mesh.position.set(who.x, seatedY(q.mesh, SEAT_TOP), who.y);
    q.mesh.rotation.y = who.ry;
    q.mesh.visible = true;
  }
}

// --- Peerd van Ome Loeks ------------------------------------------------------------

function buildPeerd() {
  const g = new THREE.Group();
  const horse = buildHorseMesh(0);
  const sk = horse.children.find((c) => c.isSkinnedMesh);
  const bronze = new THREE.MeshStandardMaterial({ color: 0x6b4a2a, metalness: 0.65, roughness: 0.42 });
  const statue = new THREE.Mesh(sk.geometry, bronze);
  statue.scale.setScalar(1.7);
  statue.position.y = 1.4;
  g.add(statue);
  const stone = std(0xa7a296, { roughness: 0.95 });
  g.add(new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.4, 1.8).translate(0, 0.7, 0), stone));
  g.visible = false;
  root.add(g);
  peerd = g;
}

// --- Oosterpark plaque ---------------------------------------------------------------

function nearFree(x, y, seed, margin = 1.2) {
  const r = rng(seed);
  for (let t = 0; t < 300; t++) {
    const a = r() * Math.PI * 2, d = t < 1 ? 0 : 2 + r() * Math.min(120, t);
    const px = x + Math.cos(a) * d, py = y + Math.sin(a) * d;
    if (free(px, py, margin)) return { x: px, y: py };
  }
  return null;
}

function buildPlaque() {
  const s = nearFree(OOSTERPARK.x, OOSTERPARK.y, 1933);
  if (!s) return;
  const q = map.nearestRoadPoint(s.x, s.y, 80);
  const face = q ? Math.atan2(q.y - s.y, q.x - s.x) : 0;
  const g = new THREE.Group();
  g.position.set(s.x, 0, s.y);
  g.rotation.y = Math.PI / 2 - face;
  const tex = canvasTex(512, 320);
  const c = tex.image, x = c.getContext('2d');
  x.fillStyle = '#1f4a2e'; x.fillRect(0, 0, c.width, c.height);
  x.strokeStyle = '#e8e6e0'; x.lineWidth = 8; x.strokeRect(14, 14, c.width - 28, c.height - 28);
  x.fillStyle = '#f3efe2'; x.textAlign = 'center'; x.textBaseline = 'middle';
  const [a, b, d] = OOSTERPARK_PLAQUE;
  fitText(x, a, c.width - 70, 52, 800, 'Georgia, serif'); x.fillText(a, c.width / 2, 90);
  fitText(x, b, c.width - 70, 44, 600, 'Georgia, serif'); x.fillText(b, c.width / 2, 160);
  fitText(x, d, c.width - 70, 30, 500, 'Georgia, serif'); x.fillText(d, c.width / 2, 240);
  tex.needsUpdate = true;
  g.add(new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.3, 0.35).translate(0, 0.65, 0), std(0x8e8a80, { roughness: 0.95 })));
  const face3 = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.0), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 }));
  face3.position.set(0, 0.72, 0.18);
  g.add(face3);
  g.visible = false;
  root.add(g);
  plaque = g;
}

// --- Bommen Berend flags ---------------------------------------------------------------

function buildFlags() {
  const r = rng(1672);
  const poles = [];
  for (let t = 0; t < 900 && poles.length < 20; t++) {
    const a = r() * Math.PI * 2, d = 18 + r() * 40;
    const x = GROTE_MARKT.x + Math.cos(a) * d, y = GROTE_MARKT.y + Math.sin(a) * d;
    if (isInsideBuilding(map, x, y) || isInWater(map, x, y) || map.onCarriageway(x, y, 0.8) || poles.some((p) => Math.hypot(p.x - x, p.y - y) < 9)) continue;
    poles.push({ x, y });
  }
  poles.sort((p, q) => Math.atan2(p.y - GROTE_MARKT.y, p.x - GROTE_MARKT.x) - Math.atan2(q.y - GROTE_MARKT.y, q.x - GROTE_MARKT.x));
  const g = new THREE.Group();
  g.visible = false;
  root.add(g);
  const white = std(0xffffff, { side: THREE.DoubleSide });
  const col = new THREE.Color();
  const pole = instanced(new THREE.CylinderGeometry(0.06, 0.08, 7, 6).translate(0, 3.5, 0), std(0xe8e6e0), poles.length);
  const flag = instanced(new THREE.PlaneGeometry(1.4, 0.9).translate(0.7, 0, 0), white, poles.length * 2);
  const tri = instanced(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([-0.18, 0, 0, 0.18, 0, 0, 0, -0.34, 0], 3)).computeVertexNormals(), white, poles.length * 12);
  let nt = 0;
  poles.forEach((p, i) => {
    place(pole, i, p.x, 0, p.y);
    const a = r() * Math.PI * 2;
    // the city colours: a green and a white flag per pole
    place(flag, i * 2, p.x, 6.4, p.y, a); flag.setColorAt(i * 2, col.setHex(0x1f7a3a));
    place(flag, i * 2 + 1, p.x, 5.4, p.y, a); flag.setColorAt(i * 2 + 1, col.setHex(0xf4f2ea));
    const q = poles[(i + 1) % poles.length];
    const len = Math.hypot(q.x - p.x, q.y - p.y);
    if (len > 50) return;
    const ang = Math.atan2(q.y - p.y, q.x - p.x);
    for (let k = 1; k <= 11 && nt < poles.length * 12; k++) {
      const t = k / 12, sag = Math.sin(t * Math.PI) * 1.4;
      place(tri, nt, p.x + (q.x - p.x) * t, 5.2 - sag, p.y + (q.y - p.y) * t, -ang);
      tri.setColorAt(nt, col.setHex(k % 2 ? 0x1f7a3a : 0xf4f2ea));
      nt++;
    }
  });
  tri.count = nt;
  g.add(pole, flag, tri);
  flags = g;
}

// --- Bloemetjesmarkt house plants -------------------------------------------------------

const PLANT_MAX = 30;
function buildPlants() {
  const pot = instanced(new THREE.CylinderGeometry(0.13, 0.1, 0.2, 8), std(0xb5613a), PLANT_MAX);
  const leaf = instanced(new THREE.IcosahedronGeometry(0.24, 0), std(0x3f8a3a, { flatShading: true }), PLANT_MAX);
  pot.count = leaf.count = 0;
  const g = new THREE.Group();
  g.add(pot, leaf);
  g.visible = false;
  root.add(g);
  plants = { g, pot, leaf };
}

function updatePlants(world) {
  const p = world.player;
  let n = 0;
  for (const ped of world.pedestrians) {
    if (n >= PLANT_MAX) break;
    if (ped.isCop || ped.state === 'dead' || ped.hideMesh || ped.scene || ped.pose) continue;
    if (Math.floor(ped._lookSeed * 7) % 5 > 1) continue;
    const dx = ped.x - p.x, dy = ped.y - p.y;
    if (dx * dx + dy * dy > 90 * 90) continue;
    const fx = Math.cos(ped.angle) * 0.34, fy = Math.sin(ped.angle) * 0.34;
    const h = (ped.gz || 0) + 1.0;
    place(plants.pot, n, ped.x + fx, h, ped.y + fy);
    place(plants.leaf, n, ped.x + fx, h + 0.28, ped.y + fy, ped._lookSeed, 0, 0.8 + (ped._lookSeed % 1) * 0.6);
    n++;
  }
  plants.pot.count = plants.leaf.count = n;
  plants.pot.instanceMatrix.needsUpdate = plants.leaf.instanceMatrix.needsUpdate = true;
}

// --- Bloemetjesmarkt stalls -------------------------------------------------------------

// Flower stalls in rows on the Grote Markt (clear of the daily market and the
// kermis), striped awnings, zinc buckets full of colour and a banner.
const FLOWER_COLORS = [0xd8333f, 0xf2c230, 0xe86fa8, 0xf4f1ea, 0x8e4fc0, 0xee7a2a, 0xc2185b, 0xffe36e];
const AWNINGS = [0x2f7a4f, 0xd24a3a, 0x3565a8, 0xe0a526];
const DAILY_MARKET = { x: 162.77, y: 76.17, r: 40 };
function buildFlowerMarket() {
  const spots = [];
  const corners = (x, y, a) => [[1.5, 0.9], [1.5, -0.9], [-1.5, 0.9], [-1.5, -0.9]].map(([s, f]) => [x + Math.cos(a) * f - Math.sin(a) * s, y + Math.sin(a) * f + Math.cos(a) * s]);
  for (const row of [-5, 5, -13, 13, -21, 21, -29, 29]) {
    for (let col = -38; col <= 38 && spots.length < 16; col += 4.2) {
      const x = GROTE_MARKT.x + col, y = GROTE_MARKT.y + row;
      const a = row < 0 ? -Math.PI / 2 : Math.PI / 2;
      if (Math.hypot(x - DAILY_MARKET.x, y - DAILY_MARKET.y) < DAILY_MARKET.r) continue;
      const pts = [[x, y], ...corners(x, y, a)];
      if (pts.some(([px, py]) => !free(px, py, 1) || map.onCarriageway(px, py, 0.8) || (map.reservedAt && map.reservedAt(px, py)))) continue;
      spots.push({ x, y, a });
    }
  }
  const g = new THREE.Group();
  g.visible = false;
  root.add(g);
  if (!spots.length) { flowerMarket = { g }; return; }
  const n = spots.length;
  const col = new THREE.Color();
  const table = instanced(new THREE.BoxGeometry(2.6, 0.08, 1.3).translate(0, 0.86, 0), std(0xe9e3d2), n);
  const legs = instanced(new THREE.CylinderGeometry(0.035, 0.035, 2.4, 5).translate(0, 1.2, 0), std(0x6f6a62), n * 4);
  const roof = instanced(new THREE.BoxGeometry(2.9, 0.06, 1.75), std(0xffffff), n);
  const bucket = instanced(new THREE.CylinderGeometry(0.17, 0.13, 0.32, 8).translate(0, 0.16, 0), std(0x9aa3a8, { metalness: 0.4, roughness: 0.5 }), n * 8);
  const bloom = instanced(new THREE.IcosahedronGeometry(0.16, 0), std(0xffffff, { flatShading: true }), n * 8 * 3);
  const leaf = instanced(new THREE.IcosahedronGeometry(0.2, 0), std(0x3f8a3a, { flatShading: true }), n * 8);
  const r = rng(1953);
  let nb = 0, nf = 0;
  spots.forEach((s, i) => {
    const c = Math.cos(s.a), sn = Math.sin(s.a);
    const at = (f, sd) => [s.x + c * f - sn * sd, s.y + sn * f + c * sd];
    place(table, i, s.x, 0, s.y, -s.a + Math.PI / 2);
    [[0.6, 1.35], [0.6, -1.35], [-0.6, 1.35], [-0.6, -1.35]].forEach(([f, sd], k) => { const [x, y] = at(f, sd); place(legs, i * 4 + k, x, 0, y); });
    place(roof, i, s.x, 2.42, s.y, -s.a + Math.PI / 2, 0.12);
    roof.setColorAt(i, col.setHex(AWNINGS[i % AWNINGS.length]));
    // four buckets on the table, four on the cobbles in front
    for (let k = 0; k < 8; k++) {
      const front = k >= 4, sd = -0.95 + (k % 4) * 0.63;
      const [x, y] = at(front ? 1.05 : 0.15, sd + (r() - 0.5) * 0.1);
      const h = front ? 0 : 0.9;
      place(bucket, nb, x, h, y);
      place(leaf, nb, x, h + 0.38, y, r() * 6, 0, 0.9 + r() * 0.3);
      const hue = FLOWER_COLORS[Math.floor(r() * FLOWER_COLORS.length)];
      for (let q = 0; q < 3; q++) {
        const qa = r() * Math.PI * 2;
        place(bloom, nf, x + Math.cos(qa) * 0.09, h + 0.5 + r() * 0.12, y + Math.sin(qa) * 0.09, qa, 0, 0.75 + r() * 0.35);
        bloom.setColorAt(nf, col.setHex(hue).offsetHSL(0, 0, (r() - 0.5) * 0.12));
        nf++;
      }
      nb++;
    }
  });
  g.add(table, legs, roof, bucket, bloom, leaf);
  g.add(flowerBanner(spots));
  flowerMarket = { g };
}

// "BLOEMETJESMARKT" between two poles over the walkway of the first row
function flowerBanner(spots) {
  const s = spots[0];
  const tex = canvasTex(1024, 192);
  const c = tex.image, x = c.getContext('2d');
  x.fillStyle = '#2f7a4f'; x.fillRect(0, 0, c.width, c.height);
  x.fillStyle = '#f4f1ea'; x.textAlign = 'center'; x.textBaseline = 'middle';
  fitText(x, 'BLOEMETJESMARKT', c.width - 80, 120, 900); x.fillText('BLOEMETJESMARKT', c.width / 2, c.height / 2 + 6);
  tex.needsUpdate = true;
  const g = new THREE.Group();
  const fx = Math.cos(s.a) * 3.2, fy = Math.sin(s.a) * 3.2;
  g.position.set(s.x + fx, 0, s.y + fy);
  g.rotation.y = -s.a + Math.PI / 2;
  const pole = new THREE.CylinderGeometry(0.06, 0.06, 4.4, 6).translate(0, 2.2, 0);
  const pm = std(0x6f6a62);
  for (const k of [-3.1, 3.1]) { const m = new THREE.Mesh(pole, pm); m.position.x = k; g.add(m); }
  const geo = new THREE.PlaneGeometry(6, 1.1), mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 });
  for (const turn of [0, Math.PI]) {
    const cloth = new THREE.Mesh(geo, mat);
    cloth.position.y = 3.7;
    cloth.rotation.y = turn;
    g.add(cloth);
  }
  return g;
}

// --- per frame ---------------------------------------------------------------------

export function updateFlavour3D(dt, world) {
  const F = world.flavour;
  if (!root || !F) return;
  const p = world.player;
  const night = world.dayNight ? world.dayNight.night : 0;
  const nightStep = Math.round(night * 10);
  const near = (x, y, r) => Math.abs(x - p.x) < r && Math.abs(y - p.y) < r;

  for (const b of boards) b.g.visible = near(b.x, b.y, 480);
  if (F.billboardStage !== lastStage) { lastStage = F.billboardStage; for (const b of boards) paintBoard(b, lastStage); }
  if (nightStep !== lastNight) {
    lastNight = nightStep;
    for (const b of boards) b.mat.emissiveIntensity = 0.12 + night * 0.75;
  }

  if (krol) {
    const on = F.krolPasses > 0 && near(KROLBRUG.x, KROLBRUG.y, 260);
    krol.g.visible = on;
    const lvl = krolLevel();
    if (lvl !== lastKrolLevel) {
      lastKrolLevel = lvl;
      krol.tiers.forEach((list, i) => { if (list) for (const m of list) m.visible = i <= lvl; });
    }
    if (F.krolText !== lastKrolText) { lastKrolText = F.krolText; paintKrol(lvl, F.krolText); }
    if (on && lvl >= 2) krol.lamp.emissiveIntensity = (world.time * 2) % 1 < 0.5 ? 2.2 : 0;
  }

  if (picnic) {
    picnic.g.visible = F.plantsoen && near(PLANTSOEN.x, PLANTSOEN.y, 480);
    if (picnic.g.visible) {
      picnic.coals.material.emissiveIntensity = 1.1 + Math.sin(world.time * 7) * 0.3;
      stepPicnicPeople(world, p);
    }
  }

  if (peerd && F.peerd) {
    if (F.peerd !== lastPeerd) {
      lastPeerd = F.peerd;
      peerd.position.set(F.peerd.x, map.groundHeightAt(F.peerd.x, F.peerd.y, 0), F.peerd.y);
      peerd.rotation.y = F.peerd.angle;
    }
    peerd.visible = near(F.peerd.x, F.peerd.y, 380);
  }

  if (plaque) plaque.visible = near(plaque.position.x, plaque.position.z, 260);
  if (flags) flags.visible = F.event === 'bommenberend' && near(GROTE_MARKT.x, GROTE_MARKT.y, 520);
  const plantsOn = F.event === 'bloemetjesmarkt' && near(GROTE_MARKT.x, GROTE_MARKT.y, 600);
  plants.g.visible = plantsOn;
  if (flowerMarket) flowerMarket.g.visible = plantsOn;
  if (plantsOn) updatePlants(world);
}
