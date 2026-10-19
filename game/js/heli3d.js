import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { GeoBuilder, vcMaterial, markShared, composeMatrix } from './pixelart3d.js';

// 3D side of the own helicopter (heliflight.js): the Wieken Wubbo body,
// its spinning rotors, the helipads (home roof, Rotor Roelf on Eelde) and
// the downwash dust. Vehicle-local like every vehicle mesh: origin at the
// bottom of the skids, +X forward, +Z the right-hand side.

const G_BODY = 0, G_GLASS = 1, G_LAMP = 2;
const TRIM = 0x26282b;
const CREAM = 0xf0ede4;
const GLASS = 0x2b3740;
export const ROTOR_Y = 2.86;
const ROTOR_R = 5.0;
const TAIL_X = -4.75;

const geoCache = new Map();

function hexOf(c, fallback) {
  if (typeof c === 'number') return c;
  if (typeof c === 'string') return new THREE.Color(c).getHex();
  return fallback;
}

function bodyGeometry(paint, wrecked) {
  const key = paint + '|' + wrecked;
  let g = geoCache.get(key);
  if (g) return g;
  const B = new GeoBuilder(3);
  const P = wrecked ? 0x1f1d1b : paint;
  const C = wrecked ? 0x2a2826 : CREAM;
  // cabin: a rounded bubble, painted below the belt line, glass above and in front
  B.geo(new THREE.SphereGeometry(1, 12, 8, 0, Math.PI * 2, Math.PI * 0.52, Math.PI * 0.48), composeMatrix(0.55, 1.2, 0, 0, 0, 0, 1.55, 0.85, 0.92), P, G_BODY);
  B.geo(new THREE.SphereGeometry(1, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.52), composeMatrix(0.55, 1.2, 0, 0, 0, 0, 1.55, 0.95, 0.92), wrecked ? 0x3a3a3a : GLASS, G_GLASS);
  B.box(0.35, 1.02, 0, 2.6, 0.12, 1.86, C, G_BODY);
  B.box(-0.55, 1.62, 0, 1.2, 1.0, 1.5, P, G_BODY);
  // engine hump, mast and the hub
  B.box(-0.55, 2.3, 0, 1.5, 0.42, 0.9, P, G_BODY);
  B.geo(new THREE.CylinderGeometry(0.1, 0.13, 0.5, 8), composeMatrix(-0.2, 2.6, 0), TRIM, G_BODY);
  // tail boom (tapered), fin, stabiliser, tail rotor guard
  B.geo(new THREE.CylinderGeometry(0.1, 0.24, 3.7, 8), composeMatrix(-2.95, 1.62, 0, 0, 0, Math.PI / 2), P, G_BODY);
  B.box(-2.4, 1.62, 0, 1.4, 0.06, 0.5, C, G_BODY);
  B.box(TAIL_X + 0.05, 2.08, 0, 0.7, 1.0, 0.07, P, G_BODY, 0, 0, -0.35);
  B.box(TAIL_X + 0.2, 1.2, 0, 0.45, 0.6, 0.06, P, G_BODY, 0, 0, 0.35);
  B.box(TAIL_X + 0.4, 1.66, 0, 0.36, 0.05, 1.1, C, G_BODY);
  // skids and struts
  for (const s of [1, -1]) {
    B.geo(new THREE.CylinderGeometry(0.055, 0.055, 3.4, 6), composeMatrix(0.2, 0.08, s * 0.98, 0, 0, Math.PI / 2), TRIM, G_BODY);
    B.geo(new THREE.CylinderGeometry(0.055, 0.055, 0.5, 6), composeMatrix(2.0, 0.2, s * 0.98, 0, 0, -0.9), TRIM, G_BODY);
    for (const x of [-0.7, 1.1]) B.geo(new THREE.CylinderGeometry(0.045, 0.045, 0.95, 5), composeMatrix(x, 0.52, s * 0.82, s * 0.32, 0, 0), TRIM, G_BODY);
    // door stripe and nav lights
    B.box(0.2, 1.3, s * 0.9, 1.6, 0.08, 0.02, C, G_BODY);
    B.box(-0.6, 1.95, s * 0.76, 0.12, 0.08, 0.04, s > 0 ? 0x2fd05a : 0xd83a2a, G_LAMP);
  }
  B.box(TAIL_X - 0.05, 2.56, 0, 0.12, 0.1, 0.1, 0xd83a2a, G_LAMP);
  B.box(2.05, 0.8, 0, 0.06, 0.14, 0.3, 0xf2efe4, G_LAMP);
  g = markShared(B.build());
  geoCache.set(key, g);
  return g;
}

let bladeGeo = null, tailBladeGeo = null, discGeo = null;
function sharedRotorGeos() {
  if (bladeGeo) return;
  bladeGeo = markShared(new THREE.BoxGeometry(ROTOR_R * 2, 0.045, 0.26));
  tailBladeGeo = markShared(new THREE.BoxGeometry(0.07, 1.1, 0.03));
  discGeo = markShared(new THREE.CircleGeometry(ROTOR_R, 36).rotateX(-Math.PI / 2));
}

// v: a Vehicle with isHeli (or a stand-in { model, id } for previews).
export function buildHeliMesh(v) {
  sharedRotorGeos();
  const wrecked = !!v.wrecked;
  const paint = hexOf(v.model && v.model.color, 0xc23b2e);
  const mats = [
    vcMaterial(wrecked ? { roughness: 0.95, metalness: 0.05 } : { roughness: 0.45, metalness: 0.12 }),
    wrecked ? vcMaterial({ roughness: 0.9, color: 0x3a3a3a }) : vcMaterial({ roughness: 0.25, envMapIntensity: 0.35, transparent: true, opacity: 0.45, depthWrite: false }),
    new THREE.MeshBasicMaterial({ vertexColors: true, color: wrecked ? 0x202020 : 0xffffff }),
  ];
  const group = new THREE.Group();
  group.add(new THREE.Mesh(bodyGeometry(paint, wrecked), mats));
  const bladeMat = new THREE.MeshLambertMaterial({ color: wrecked ? 0x151515 : 0x1c1d20 });
  const rotor = new THREE.Group();
  rotor.position.set(-0.2, ROTOR_Y, 0);
  if (!wrecked) {
    rotor.add(new THREE.Mesh(bladeGeo, bladeMat));
  } else {
    const stub = new THREE.Mesh(bladeGeo, bladeMat);
    stub.scale.set(0.35, 1, 1);
    stub.position.x = ROTOR_R * 0.3;
    stub.rotation.z = -0.25;
    rotor.add(stub);
  }
  group.add(rotor);
  const disc = new THREE.Mesh(discGeo, new THREE.MeshBasicMaterial({ color: 0x1c1d20, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
  disc.position.set(-0.2, ROTOR_Y, 0);
  disc.visible = false;
  group.add(disc);
  const tail = new THREE.Group();
  tail.position.set(TAIL_X, 1.72, 0.14);
  const tb = new THREE.Mesh(tailBladeGeo, bladeMat);
  tail.add(tb);
  const tb2 = new THREE.Mesh(tailBladeGeo, bladeMat);
  tb2.rotation.z = Math.PI / 2;
  tail.add(tb2);
  group.add(tail);
  group.userData.heli = { rotor, tail, disc };
  return group;
}

// Rotor angle and spool (0..1) onto a mesh built by buildHeliMesh.
export function poseHeliRotors(mesh, angle, spool) {
  const h = mesh && mesh.userData.heli;
  if (!h) return;
  h.rotor.rotation.y = angle;
  h.tail.rotation.z = angle * 4.2;
  const blur = Math.max(0, Math.min(1, (spool - 0.35) / 0.5));
  h.disc.visible = blur > 0.02;
  h.disc.material.opacity = blur * 0.22;
  h.rotor.visible = blur < 0.95;
}

// --- helipads -----------------------------------------------------------------

let padTex = null;
function padTexture() {
  if (padTex) return padTex;
  const S = 256, c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  g.fillStyle = '#3d4246';
  g.fillRect(0, 0, S, S);
  g.translate(S / 2, S / 2);
  g.strokeStyle = '#e8c93a';
  g.lineWidth = 12;
  g.beginPath(); g.arc(0, 0, S / 2 - 16, 0, Math.PI * 2); g.stroke();
  g.fillStyle = '#f0ede4';
  g.font = 'bold 150px Arial, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('H', 0, 8);
  padTex = new THREE.CanvasTexture(c);
  padTex.colorSpace = THREE.SRGBColorSpace;
  padTex.anisotropy = 4;
  markShared(padTex);
  return padTex;
}

const PAD_MAT = markShared(new THREE.MeshLambertMaterial({ map: null, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 }));
const PAD_EDGE_MAT = markShared(new THREE.MeshLambertMaterial({ color: 0x2a2d30 }));
const PAD_LAMP_MAT = markShared(new THREE.MeshBasicMaterial({ color: 0x9fe6ff }));

// A square deck with a yellow ring and a white H, `r` metres across the ring,
// `raise` metres thick, lamps on the corners. Origin at the deck's centre on
// the surface below; rotate it with the group.
export function buildHelipadMesh(r, raise = 0.12) {
  if (!PAD_MAT.map) { PAD_MAT.map = padTexture(); PAD_MAT.needsUpdate = true; }
  const g = new THREE.Group();
  const side = r * 2 + 1.2;
  const deck = new THREE.Mesh(new THREE.BoxGeometry(side, raise, side), [PAD_EDGE_MAT, PAD_EDGE_MAT, PAD_MAT, PAD_EDGE_MAT, PAD_EDGE_MAT, PAD_EDGE_MAT]);
  deck.position.y = raise / 2;
  g.add(deck);
  const lampGeo = new THREE.BoxGeometry(0.18, 0.12, 0.18);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const l = new THREE.Mesh(lampGeo, PAD_LAMP_MAT);
    l.position.set(sx * (side / 2 - 0.2), raise + 0.06, sz * (side / 2 - 0.2));
    g.add(l);
  }
  return g;
}

// --- downwash -------------------------------------------------------------------

const DUST_N = 64;
let dust = null;
function glowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.3, 'rgba(255,255,255,0.5)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function buildDust(scene) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(DUST_N * 3), 3));
  geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(DUST_N * 4), 4));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: 2.4, map: glowTexture(), vertexColors: true, transparent: true, depthWrite: false }));
  pts.frustumCulled = false;
  pts.visible = false;
  pts.userData = { vel: new Float32Array(DUST_N * 3), life: new Float32Array(DUST_N), max: new Float32Array(DUST_N), next: 0, acc: 0 };
  scene.add(pts);
  return pts;
}

// strength 0..1 blows dust outward over the surface at (x, groundZ, y);
// water sprays white instead of sand.
export function updateHeliDust(scene, dt, src) {
  if (!scene) return;
  if (!dust) {
    if (!src || src.strength < 0.02) return;
    dust = buildDust(scene);
  }
  const ud = dust.userData;
  const pos = dust.geometry.attributes.position.array, col = dust.geometry.attributes.color.array;
  if (src && src.strength > 0.02 && dt > 0) {
    ud.acc += dt * 38 * src.strength;
    while (ud.acc >= 1) {
      ud.acc -= 1;
      const i = ud.next;
      ud.next = (ud.next + 1) % DUST_N;
      const a = Math.random() * Math.PI * 2, rr = 1.5 + Math.random() * 3;
      pos[i * 3] = src.x + Math.cos(a) * rr; pos[i * 3 + 1] = src.ground + 0.3; pos[i * 3 + 2] = src.y + Math.sin(a) * rr;
      const sp = (4 + Math.random() * 5) * (0.5 + 0.5 * src.strength);
      ud.vel[i * 3] = Math.cos(a) * sp; ud.vel[i * 3 + 1] = 0.3 + Math.random() * 0.9; ud.vel[i * 3 + 2] = Math.sin(a) * sp;
      ud.life[i] = ud.max[i] = 0.9 + Math.random() * 1.1;
      ud.water = !!src.water;
    }
  }
  let alive = false;
  const [r, g, b] = ud.water ? [0.9, 0.94, 0.97] : [0.72, 0.68, 0.6];
  for (let i = 0; i < DUST_N; i++) {
    if (ud.life[i] <= 0) { col[i * 4 + 3] = 0; continue; }
    alive = true;
    ud.life[i] -= dt;
    const k = Math.max(0, ud.life[i] / ud.max[i]);
    pos[i * 3] += ud.vel[i * 3] * dt; pos[i * 3 + 1] += ud.vel[i * 3 + 1] * dt; pos[i * 3 + 2] += ud.vel[i * 3 + 2] * dt;
    const drag = Math.max(0, 1 - dt * 1.3);
    ud.vel[i * 3] *= drag; ud.vel[i * 3 + 2] *= drag;
    col[i * 4] = r; col[i * 4 + 1] = g; col[i * 4 + 2] = b; col[i * 4 + 3] = 0.32 * k * (1 - k) * 2.4;
  }
  dust.visible = alive;
  if (alive) {
    dust.geometry.attributes.position.needsUpdate = true;
    dust.geometry.attributes.color.needsUpdate = true;
  }
}
