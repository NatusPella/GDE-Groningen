import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { canvasTex } from './canvastex.js';
import { spawnFxPuff, spawnFxSpark, spawnFxChip } from './fx3d.js';
import { getVehicleMesh } from './models3d_vehicles.js';
import { flashMuzzleLight } from './nightlights3d.js';
import { markShared } from './pixelart3d.js';
import { rand } from './rng.js';

// throwables.js (which needs combat and pedestrians) registers its drawing at load, so this
// module stays a leaf for that import cycle (#108)
let updateThrowables3D = () => {};
export function setThrowables3D(fn) { updateThrowables3D = fn; }

// Gunfire effects: muzzle flashes (with a light pop), tracers, impacts that
// depend on what was hit (brick dust, glass, sparks, dirt, splashes) and
// bullet holes that stay - ring-buffered on walls and the ground, parented
// to the car on vehicles. Everything is pooled; combat.js only reports shots
// and hits (gunShotFx / gunImpactFx) and this module draws them.
// Coordinates in the API are game coordinates: x/y on the map, z up.

const TRACER_MAX = 48;
const FLASH_MAX = 4;
const HOLE_MAX = 220;
const CRACK_MAX = 48;
const CAR_HOLE_MAX = 90;
const CAR_HOLES_PER_VEHICLE = 14;
const FX_RANGE = 90;

let scene = null;
let ready = false;
let now = 0;
const shots = [];
const hits = [];

export function gunShotFx(shot) {
  if (shots.length < 16) shots.push(shot);
}

export function gunImpactFx(hit) {
  if (hits.length < 48) hits.push(hit);
}


// --- textures -------------------------------------------------------------

const canvasTexture = (size, draw) => canvasTex(size, size, draw);

// Four-pointed star with a hot core: reads as a gun flash from any side.
function flashTexture() {
  return canvasTexture(128, (g, s) => {
    const c = s / 2;
    const glow = g.createRadialGradient(c, c, 0, c, c, c);
    glow.addColorStop(0, 'rgba(255,250,225,1)');
    glow.addColorStop(0.18, 'rgba(255,214,120,0.95)');
    glow.addColorStop(0.45, 'rgba(255,140,40,0.35)');
    glow.addColorStop(1, 'rgba(255,90,10,0)');
    g.fillStyle = glow;
    g.fillRect(0, 0, s, s);
    g.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + (k % 2) * 0.3;
      const len = k % 2 ? c * 0.7 : c * 0.98;
      const grad = g.createLinearGradient(c, c, c + Math.cos(a) * len, c + Math.sin(a) * len);
      grad.addColorStop(0, 'rgba(255,240,190,0.9)');
      grad.addColorStop(1, 'rgba(255,150,40,0)');
      g.strokeStyle = grad;
      g.lineWidth = s * 0.05;
      g.beginPath();
      g.moveTo(c, c);
      g.lineTo(c + Math.cos(a) * len, c + Math.sin(a) * len);
      g.stroke();
    }
  });
}

// Side view of the flash: a flame cone along +x.
function flameTexture() {
  return canvasTexture(128, (g, s) => {
    const img = g.createImageData(s, s);
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const u = x / (s - 1), v = (y / (s - 1)) * 2 - 1;
        const width = 0.12 + 0.55 * Math.sin(Math.min(1, u * 1.3) * Math.PI * 0.8);
        const edge = Math.max(0, 1 - Math.abs(v) / width);
        const a = Math.pow(edge, 1.6) * Math.pow(1 - u, 0.7);
        const i = (y * s + x) * 4;
        img.data[i] = 255;
        img.data[i + 1] = Math.round(170 + 85 * edge * (1 - u));
        img.data[i + 2] = Math.round(70 + 150 * edge * edge * (1 - u));
        img.data[i + 3] = Math.round(Math.min(1, a * 1.4) * 255);
      }
    }
    g.putImageData(img, 0, 0);
  });
}

// Bullet hole: dark crater, a ring of chipped material, fading out.
function holeTexture() {
  return canvasTexture(64, (g, s) => {
    const c = s / 2;
    const chip = g.createRadialGradient(c, c, s * 0.08, c, c, c);
    chip.addColorStop(0, 'rgba(30,26,22,1)');
    chip.addColorStop(0.3, 'rgba(60,54,48,0.8)');
    chip.addColorStop(0.42, 'rgba(205,190,170,0.75)');
    chip.addColorStop(0.7, 'rgba(190,178,160,0.25)');
    chip.addColorStop(1, 'rgba(190,178,160,0)');
    g.fillStyle = chip;
    g.fillRect(0, 0, s, s);
    g.fillStyle = 'rgba(8,7,6,1)';
    g.beginPath();
    g.arc(c, c, s * 0.1, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = 'rgba(30,28,25,0.6)';
    g.lineWidth = 1;
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * Math.PI * 2 + Math.sin(k * 7.3) * 0.4;
      g.beginPath();
      g.moveTo(c + Math.cos(a) * s * 0.1, c + Math.sin(a) * s * 0.1);
      g.lineTo(c + Math.cos(a) * s * (0.22 + 0.1 * Math.abs(Math.sin(k * 3.1))), c + Math.sin(a) * s * (0.22 + 0.1 * Math.abs(Math.sin(k * 3.1))));
      g.stroke();
    }
  });
}

// Shot glass: a small hole with radiating and ring cracks.
function crackTexture() {
  return canvasTexture(128, (g, s) => {
    const c = s / 2;
    g.strokeStyle = 'rgba(235,242,245,0.85)';
    g.lineWidth = 1.4;
    const spokes = 11;
    for (let k = 0; k < spokes; k++) {
      let a = (k / spokes) * Math.PI * 2 + Math.sin(k * 5.1) * 0.25;
      let x = c, y = c;
      g.beginPath();
      g.moveTo(x, y);
      const len = c * (0.55 + 0.4 * Math.abs(Math.sin(k * 2.7)));
      for (let r = 0; r < len; r += 7) {
        a += Math.sin(k * 3 + r) * 0.08;
        x = c + Math.cos(a) * r; y = c + Math.sin(a) * r;
        g.lineTo(x, y);
      }
      g.stroke();
    }
    g.lineWidth = 1;
    for (const r of [0.18, 0.32]) {
      g.beginPath();
      for (let k = 0; k <= spokes; k++) {
        const a = (k / spokes) * Math.PI * 2;
        const rr = c * r * (0.85 + 0.3 * Math.abs(Math.sin(k * 4.3)));
        if (k === 0) g.moveTo(c + Math.cos(a) * rr, c + Math.sin(a) * rr); else g.lineTo(c + Math.cos(a) * rr, c + Math.sin(a) * rr);
      }
      g.stroke();
    }
    const hole = g.createRadialGradient(c, c, 0, c, c, s * 0.08);
    hole.addColorStop(0, 'rgba(20,24,26,0.95)');
    hole.addColorStop(1, 'rgba(200,215,220,0.6)');
    g.fillStyle = hole;
    g.beginPath();
    g.arc(c, c, s * 0.07, 0, Math.PI * 2);
    g.fill();
  });
}

// --- pools ----------------------------------------------------------------

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _q2 = new THREE.Quaternion();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const _n = new THREE.Vector3();
const _Z = new THREE.Vector3(0, 0, 1);
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);

const tracer = { lines: null, pos: null, col: null, used: 0 };
const flashes = [];
const decals = { holes: null, cracks: null };
let carHoleGeo = null, carHoleMat = null, carCrackMat = null;
const carHoles = [];

function decalLayer(tex, max, name, opacity = 1) {
  const mat = new THREE.MeshStandardMaterial({
    map: tex, transparent: true, depthWrite: false, roughness: 0.95, metalness: 0, opacity,
    polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -16,
  });
  const mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), mat, max);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  for (let i = 0; i < max; i++) mesh.setMatrixAt(i, ZERO);
  mesh.frustumCulled = false;
  mesh.receiveShadow = true;
  mesh.renderOrder = 1;
  mesh.name = name;
  scene.add(mesh);
  return { mesh, max, next: 0, dirty: false };
}

function init(sc) {
  scene = sc;
  const geo = new THREE.BufferGeometry();
  tracer.pos = new Float32Array(TRACER_MAX * 6);
  tracer.col = new Float32Array(TRACER_MAX * 6);
  geo.setAttribute('position', new THREE.BufferAttribute(tracer.pos, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('color', new THREE.BufferAttribute(tracer.col, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setDrawRange(0, 0);
  tracer.lines = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: true }));
  tracer.lines.frustumCulled = false;
  tracer.lines.matrixAutoUpdate = false;
  tracer.lines.renderOrder = 3;
  tracer.lines.name = 'fx-tracers';
  scene.add(tracer.lines);

  const starMat = new THREE.SpriteMaterial({ map: flashTexture(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false });
  const flameMat = new THREE.MeshBasicMaterial({ map: flameTexture(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, side: THREE.DoubleSide, fog: false });
  const flameGeo = new THREE.PlaneGeometry(1, 1).translate(0.5, 0, 0);
  for (let i = 0; i < FLASH_MAX; i++) {
    const g = new THREE.Group();
    const star = new THREE.Sprite(starMat);
    const a = new THREE.Mesh(flameGeo, flameMat);
    const b = new THREE.Mesh(flameGeo, flameMat);
    b.rotation.x = Math.PI / 2;
    g.add(star, a, b);
    g.visible = false;
    g.name = 'fx-muzzle';
    g.userData = { star, until: 0, born: 0, size: 1 };
    scene.add(g);
    flashes.push(g);
  }

  decals.holes = decalLayer(holeTexture(), HOLE_MAX, 'fx-bulletholes');
  decals.cracks = decalLayer(crackTexture(), CRACK_MAX, 'fx-glasscracks', 0.9);
  carHoleGeo = markShared(new THREE.PlaneGeometry(1, 1));
  carHoleMat = markShared(decals.holes.mesh.material.clone());
  carCrackMat = markShared(decals.cracks.mesh.material.clone());
  for (const m of [carHoleMat, carCrackMat]) { m.polygonOffsetFactor = -6; m.polygonOffsetUnits = -24; }
  ready = true;
}

// --- muzzle flash ------------------------------------------------------------

const FLASH = { pistol: [0.8, 0.05, 1], uzi: [0.62, 0.035, 0.75], shotgun: [1.25, 0.07, 1.6], jachtgeweer: [1.1, 0.06, 1.4], police: [0.7, 0.05, 0.9] };

function spawnFlash(s) {
  const f = flashes.find((g) => !g.visible) || flashes.reduce((a, b) => (a.userData.born < b.userData.born ? a : b));
  const [size, life, light] = FLASH[s.weapon] || FLASH.pistol;
  const ud = f.userData;
  ud.born = now;
  ud.until = now + life;
  ud.frames = 0;
  ud.size = size * rand(0.8, 1.2);
  ud.owner = s.owner;
  f.visible = true;
  f.position.set(s.x, s.z, s.y);
  f.rotation.set(0, -s.angle, 0);
  f.children[1].rotation.x = rand(0, Math.PI);
  f.children[2].rotation.x = f.children[1].rotation.x + Math.PI / 2;
  ud.star.material.rotation = rand(0, Math.PI * 2);
  applyFlashScale(f, 1);
  flashMuzzleLight(s.x + Math.cos(s.angle) * 0.3, s.z + 0.1, s.y + Math.sin(s.angle) * 0.3, light);
  // smoke wisp and, on foot, a brass casing flicked out to the right
  const fx = Math.cos(s.angle), fy = Math.sin(s.angle);
  spawnFxPuff(s.x + fx * 0.15, s.z, s.y + fy * 0.15, fx * 0.6, 0.35, fy * 0.6, rand(0.7, 1.1), 0.08, s.weapon === 'shotgun' ? 0.9 : 0.5, 0.78, 0.76, 0.72, s.weapon === 'shotgun' ? 0.3 : 0.18, 2.2, 0.35);
  if (s.casing) spawnFxChip(s.x - fx * 0.3 - fy * 0.1, s.z + 0.05, s.y - fy * 0.3 + fx * 0.1, -fy * rand(1.5, 2.5) + rand(-0.3, 0.3), rand(1.5, 2.6), fx * rand(1.5, 2.5) + rand(-0.3, 0.3), s.weapon === 'shotgun' ? 0.045 : 0.025, s.weapon === 'shotgun' ? 0xb8322a : 0xc9a13c, rand(5, 8));
}

function applyFlashScale(f, k) {
  const ud = f.userData;
  const s = ud.size * k;
  ud.star.scale.set(s * 0.8, s * 0.8, 1);
  f.children[1].scale.set(s * 1.3, s * 0.5, 1);
  f.children[2].scale.set(s * 1.3, s * 0.5, 1);
}

function updateFlashes() {
  for (const f of flashes) {
    if (!f.visible) continue;
    const ud = f.userData;
    // at least two drawn frames, however slow the frame rate
    if (now >= ud.until && ud.frames >= 2) { f.visible = false; continue; }
    ud.frames++;
    const u = Math.min(1, (now - ud.born) / (ud.until - ud.born));
    applyFlashScale(f, 1 - u * 0.5);
  }
}

// scene3d snaps the player's flash onto the gun's barrel tip once the
// player mesh is posed for the frame.
export function alignPlayerFlash(tip) {
  if (!ready || !tip) return;
  for (const f of flashes) {
    if (!f.visible || f.userData.owner !== 'player') continue;
    tip.getWorldPosition(_p);
    f.position.copy(_p);
  }
}

// --- tracers --------------------------------------------------------------------

function updateTracers(world) {
  const P = tracer.pos, C = tracer.col;
  let n = 0;
  for (const b of world.bullets) {
    if (n >= TRACER_MAX) break;
    const sp = Math.hypot(b.vx, b.vy) || 1;
    const ux = b.vx / sp, uy = b.vy / sp;
    const len = Math.min(b.traveled, b.owner === 'player' ? 2.6 : 2);
    const z = b.z ?? 1.2;
    const o = n * 6;
    P[o] = b.x; P[o + 1] = z; P[o + 2] = b.y;
    P[o + 3] = b.x - ux * len; P[o + 4] = z; P[o + 5] = b.y - uy * len;
    const k = b.pellet ? 0.6 : 1;
    C[o] = 1.9 * k; C[o + 1] = 1.5 * k; C[o + 2] = 0.8 * k;
    C[o + 3] = 0; C[o + 4] = 0; C[o + 5] = 0;
    n++;
  }
  const g = tracer.lines.geometry;
  if (n || tracer.used) {
    g.attributes.position.needsUpdate = true;
    g.attributes.color.needsUpdate = true;
  }
  g.setDrawRange(0, n * 2);
  tracer.used = n;
}

// --- decals -------------------------------------------------------------------

function placeDecal(L, x, y, z, nx, ny, nz, size) {
  const i = L.next;
  L.next = (i + 1) % L.max;
  _n.set(nx, nz, ny).normalize();
  _q.setFromUnitVectors(_Z, _n);
  _q2.setFromAxisAngle(_Z, Math.random() * Math.PI * 2);
  _q.multiply(_q2);
  _p.set(x + nx * 0.012, z + nz * 0.012, y + ny * 0.012);
  _s.set(size, size, 1);
  L.mesh.setMatrixAt(i, _m.compose(_p, _q, _s));
  L.dirty = true;
}

function flushDecals(L) {
  if (!L.dirty) return;
  L.mesh.instanceMatrix.needsUpdate = true;
  L.dirty = false;
}

// Hole or crack on a vehicle, parented to its mesh so it drives along.
function carDecal(v, x, y, z, nx, ny, glass, size) {
  const mesh = getVehicleMesh(v.id);
  if (!mesh) return;
  mesh.updateMatrixWorld(true);
  const d = new THREE.Mesh(carHoleGeo, glass ? carCrackMat : carHoleMat);
  d.userData.goreDecal = true;
  d.renderOrder = 2;
  _p.set(x + nx * 0.015, z, y + ny * 0.015);
  mesh.worldToLocal(_p);
  d.position.copy(_p);
  mesh.getWorldQuaternion(_q2);
  _n.set(nx, 0, ny).normalize();
  _q.setFromUnitVectors(_Z, _n);
  d.quaternion.copy(_q2.invert()).multiply(_q).multiply(new THREE.Quaternion().setFromAxisAngle(_Z, Math.random() * Math.PI * 2));
  mesh.getWorldScale(_s);
  d.scale.set(size / (_s.x || 1), size / (_s.y || 1), 1);
  mesh.add(d);
  const list = v._bulletHoles || (v._bulletHoles = []);
  list.push(d);
  if (list.length > CAR_HOLES_PER_VEHICLE) dropCarDecal(list[0]);
  carHoles.push({ d, v });
  if (carHoles.length > CAR_HOLE_MAX) dropCarDecal(carHoles[0].d);
}

function dropCarDecal(d) {
  if (d.parent) d.parent.remove(d);
  const i = carHoles.findIndex((e) => e.d === d);
  if (i < 0) return;
  const list = carHoles[i].v._bulletHoles;
  carHoles.splice(i, 1);
  if (list) { const j = list.indexOf(d); if (j >= 0) list.splice(j, 1); }
}

// --- impacts --------------------------------------------------------------------

const GROUND_DUST = {
  gras: [[0.34, 0.3, 0.2], [0x4d6b32, 0x5a4630]],
  klinkers: [[0.55, 0.45, 0.4], [0x8c5a48, 0x6e6a64]],
  asfalt: [[0.5, 0.5, 0.5], [0x4a4a4c, 0x3a3a3c]],
};

function impact(h) {
  const x = h.x, y = h.y, z = h.z ?? 1.2;
  const nx = h.nx || 0, ny = h.ny || 0, nz = h.nz || 0;
  const out = (a, b, up = 0) => [nx * a + rand(-b, b), nz * a + up + rand(0, b), ny * a + rand(-b, b)];
  switch (h.surface) {
    case 'wall': {
      const col = h.color ?? (Math.random() < 0.6 ? 0x9a5a44 : 0xb8b0a0);
      _c.setHex(col);
      for (let k = 0; k < 6; k++) {
        const [vx, vy, vz] = out(rand(1.5, 3.5), 1.2, 0.8);
        spawnFxChip(x + nx * 0.05, z, y + ny * 0.05, vx, vy, vz, rand(0.018, 0.045), k % 3 ? col : 0x5a5550, rand(3, 6));
      }
      for (let k = 0; k < 2; k++) {
        spawnFxPuff(x + nx * 0.1, z, y + ny * 0.1, nx * rand(0.6, 1.4), rand(0.1, 0.4), ny * rand(0.6, 1.4), rand(0.8, 1.4), 0.1, rand(0.6, 0.9),
          Math.min(1, _c.r * 1.25 + 0.15), Math.min(1, _c.g * 1.25 + 0.15), Math.min(1, _c.b * 1.25 + 0.15), 0.45, 2.4, 0.08);
      }
      if (Math.random() < 0.5) for (let k = 0; k < 2; k++) { const [vx, vy, vz] = out(rand(2, 5), 2, 1); spawnFxSpark(x, z, y, vx, vy, vz, rand(0.08, 0.16)); }
      placeDecal(decals.holes, x, y, z, nx, ny, 0, h.pellet ? rand(0.16, 0.22) : rand(0.24, 0.32));
      break;
    }
    case 'glass': {
      for (let k = 0; k < 10; k++) {
        const [vx, vy, vz] = out(rand(0.5, 2.5), 1.4, 0.4);
        spawnFxChip(x + nx * 0.03, z, y + ny * 0.03, vx, vy, vz, rand(0.02, 0.05), 0xb4cdd4, rand(2.5, 5));
      }
      placeDecal(decals.cracks, x, y, z, nx, ny, 0, rand(0.35, 0.55));
      break;
    }
    case 'metal':
    case 'carglass': {
      const glass = h.surface === 'carglass';
      const n = glass ? 3 : 8;
      for (let k = 0; k < n; k++) { const [vx, vy, vz] = out(rand(2, 6), 2.5, 1); spawnFxSpark(x, z, y, vx, vy, vz, rand(0.1, 0.25)); }
      if (glass) for (let k = 0; k < 8; k++) { const [vx, vy, vz] = out(rand(0.5, 2), 1.2, 0.5); spawnFxChip(x, z, y, vx, vy, vz, rand(0.02, 0.04), 0xb4cdd4, rand(2.5, 4)); }
      spawnFxPuff(x, z, y, nx * 0.5, 0.2, ny * 0.5, 0.5, 0.06, 0.35, 0.7, 0.68, 0.66, 0.25, 3, 0.1);
      if (h.vehicle) carDecal(h.vehicle, x, y, z, nx, ny, glass, glass ? rand(0.3, 0.45) : rand(0.16, 0.22));
      break;
    }
    case 'wood': {
      for (let k = 0; k < 6; k++) { const [vx, vy, vz] = out(rand(1, 3), 1.2, 0.8); spawnFxChip(x, z, y, vx, vy, vz, rand(0.02, 0.05), k % 2 ? 0x8a6a42 : 0xc9a878, rand(3, 5)); }
      spawnFxPuff(x, z, y, nx * 0.6, 0.2, ny * 0.6, 0.8, 0.08, 0.5, 0.62, 0.55, 0.45, 0.3, 2.5, 0.05);
      break;
    }
    case 'ground': {
      const [[r, g, b], cols] = GROUND_DUST[h.ground] || GROUND_DUST.asfalt;
      for (let k = 0; k < 5; k++) spawnFxChip(x, 0.05, y, rand(-1.2, 1.2) + (h.dirx || 0) * 0.8, rand(1.5, 3.5), rand(-1.2, 1.2) + (h.diry || 0) * 0.8, rand(0.02, 0.05), cols[k % 2], rand(3, 5));
      spawnFxPuff(x, 0.1, y, (h.dirx || 0) * 0.4, 0.6, (h.diry || 0) * 0.4, rand(0.8, 1.3), 0.1, rand(0.6, 1), r + 0.2, g + 0.2, b + 0.2, 0.4, 2.2, 0.15);
      if (h.ground !== 'gras') placeDecal(decals.holes, x, y, 0.02, 0, 0, 1, rand(0.12, 0.18));
      break;
    }
    case 'water':
      for (let k = 0; k < 3; k++) spawnFxPuff(x + rand(-0.1, 0.1), h.z ?? -1.05, y + rand(-0.1, 0.1), rand(-0.3, 0.3), rand(1.5, 2.6), rand(-0.3, 0.3), rand(0.5, 0.8), 0.08, 0.35, 0.9, 0.94, 0.96, 0.55, 1.5, -2.5);
      break;
    default:
      break;
  }
}
const _c = new THREE.Color();

// --- entry -------------------------------------------------------------------------

export function updateGunFx3D(dt, world, sc) {
  if (!sc) return;
  if (!ready) init(sc);
  if (!world.paused) now += dt;
  const px = world.player.x, py = world.player.y;
  for (const b of world.bullets) {
    if (b._shotFx) continue;
    b._shotFx = true;
    // someone else's shot (police): flash where it left the barrel
    const sp = Math.hypot(b.vx, b.vy) || 1;
    const ox = b.x - (b.vx / sp) * b.traveled, oy = b.y - (b.vy / sp) * b.traveled;
    if (Math.hypot(ox - px, oy - py) < FX_RANGE) spawnFlash({ x: ox + (b.vx / sp) * 0.6, y: oy + (b.vy / sp) * 0.6, z: b.z ?? 1.3, angle: Math.atan2(b.vy, b.vx), weapon: 'police', owner: b.owner });
  }
  for (const s of shots) spawnFlash(s);
  shots.length = 0;
  for (const h of hits) if (Math.hypot(h.x - px, h.y - py) < FX_RANGE) impact(h);
  hits.length = 0;
  updateFlashes();
  updateTracers(world);
  flushDecals(decals.holes);
  flushDecals(decals.cracks);
  for (let i = carHoles.length - 1; i >= 0; i--) {
    const e = carHoles[i];
    if (!e.d.parent || !e.d.parent.parent) dropCarDecal(e.d);
  }
  updateThrowables3D(dt, world, sc);
}
