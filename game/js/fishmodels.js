// The fish of the fish book (visdata.js) as 3D models, at their real length (visdata.js lengte): perch, carp, bream and roach on a
// recoloured pack fish (Quaternius CC0, animalmodels.js vis_*), pike and eel our own, because no pack fish has their shape (a long
// pike with a duck-bill snout, an eel like a ribbon). Every model faces +x, swims with a wave that runs from head to tail, flaps on
// the line ('vangst'), and has mesh LODs (meshlod.js). Species without a model of their own borrow the closest shape and colour.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { SkinBuilder, vcMaterial, composeMatrix, markShared } from './pixelart3d.js';
import { soort } from './visdata.js';
import { buildAnimalModel, animateAnimalModel } from './animalmodels.js';
import { animalLods, setupSkinnedLods, updateSkinnedLod, makeDitherable } from './meshlod.js';

// fish book id -> model: a pack base (animalmodels.js) or our own ('snoek', 'paling')
export const FISH_MODEL_OF = {
  voorn: 'vis_voorn', baars: 'vis_baars', brasem: 'vis_brasem', karper: 'vis_karper', snoek: 'snoek', paling: 'paling',
  ruisvoorn: 'vis_voorn', kolblei: 'vis_brasem', winde: 'vis_voorn', giebel: 'vis_karper', kroeskarper: 'vis_karper', zeelt: 'vis_karper',
  snoekbaars: 'vis_baars', stekelbaars: 'vis_baars', bittervoorn: 'vis_voorn', modderkruiper: 'paling',
};
export const OWN_FISH = ['snoek', 'paling'];
const MAT = markShared(makeDitherable(vcMaterial({ roughness: 0.6 })));

const ellip = (sx, sy, sz, ws = 8, hs = 5) => new THREE.SphereGeometry(1, ws, hs).scale(sx, sy, sz);
// blend a vertex between the bones along x: bones at the given x positions (head first), linear between neighbours
function alongX(xs) {
  return (x) => {
    if (x >= xs[0]) return [0, 0, 1];
    for (let i = 0; i < xs.length - 1; i++) {
      if (x >= xs[i + 1]) { const t = (xs[i] - x) / (xs[i] - xs[i + 1]); return [i, i + 1, 1 - t]; }
    }
    const L = xs.length - 1;
    return [L, L, 1];
  };
}
const fract = (v) => v - Math.floor(v);
const noise = (x, y, z) => fract(Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453);

// the pike: 0.7 m, olive green with pale spots, cream belly, a long flat snout, the dorsal and anal fin far back
const PIKE_BONES = [0.12, -0.02, -0.16, -0.28];
function pikeGeometry() {
  const B = new SkinBuilder(1);
  B.bone = alongX(PIKE_BONES);
  const back = 0x4f5a2a, belly = 0xe2dcb8, spot = 0xc8c890, fin = 0x8a6a3a;
  const coat = (x, y, z) => (y < -0.012 ? belly : noise(Math.floor(x * 40), Math.floor(y * 60), Math.floor(z * 60)) > 0.82 ? spot : back);
  B.geo(ellip(0.26, 0.05, 0.042, 10, 6), composeMatrix(0.05, 0, 0), coat);                     // the long body
  B.geo(ellip(0.12, 0.04, 0.03, 8, 5), composeMatrix(-0.2, 0.002, 0), coat);                   // the tail stem
  B.geo(ellip(0.06, 0.016, 0.03, 6, 4), composeMatrix(0.33, -0.006, 0), 0x5a6430);             // the duck-bill snout
  B.geo(ellip(0.01, 0.01, 0.006, 4, 3), composeMatrix(0.29, 0.016, 0.028), 0xd8c040);          // eyes (gold)
  B.geo(ellip(0.01, 0.01, 0.006, 4, 3), composeMatrix(0.29, 0.016, -0.028), 0xd8c040);
  B.geo(ellip(0.045, 0.03, 0.004, 5, 3), composeMatrix(-0.19, 0.055, 0, 0, 0, 0.3), fin);     // dorsal fin, far back
  B.geo(ellip(0.04, 0.026, 0.004, 5, 3), composeMatrix(-0.19, -0.05, 0, 0, 0, -0.3), fin);    // anal fin below it
  for (const s of [1, -1]) B.geo(ellip(0.03, 0.004, 0.014, 4, 3), composeMatrix(0.17, -0.03, s * 0.04, s * 0.4, 0, -0.3), fin);   // pectoral fins
  for (const s of [1, -1]) B.geo(ellip(0.055, 0.032, 0.004, 5, 3), composeMatrix(-0.33, s * 0.025, 0, 0, 0, s * 0.55), fin);    // forked tail
  return B.build();
}

// the eel: 0.6 m, one closed tube that tapers smoothly to a point (round in front, flatter towards the tail), a small head, and
// one fin seam that runs from the middle of the back round the tail to the belly. One lofted surface, so it bends without seams.
const EEL_BONES = [0.22, 0.1, -0.02, -0.14, -0.26];
const EEL_LEN = 0.6, EEL_X0 = 0.3;
// reference (Anguilla anguilla, MarLIN, FishBase): snake-like, round in front and flatter towards the tail, body depth 2.5 to 4% of
// the length, a small head whose lower jaw sticks out past the upper, a small pectoral fin behind the head, and dorsal, tail and anal
// fin as one continuous seam over the rear two thirds; dark olive above, yellowish below
const eelR = (t) => 0.0105 * (t < 0.07 ? 0.5 + t * 7.1 : t < 0.6 ? 1 : 1 - (t - 0.6) * 2.2);   // radius along the body (t: 0 nose, 1 tail)
function tubeGeometry(rings, sides, ry, rz) {
  const pos = [], idx = [];
  pos.push(EEL_X0 + 0.012, 0, 0);   // the nose point
  for (let i = 0; i < rings; i++) {
    const t = (i + 0.5) / rings, x = EEL_X0 - t * EEL_LEN;
    for (let j = 0; j < sides; j++) { const an = (j / sides) * Math.PI * 2; pos.push(x, Math.sin(an) * ry(t), Math.cos(an) * rz(t)); }
  }
  pos.push(EEL_X0 - EEL_LEN - 0.01, 0, 0);   // the tail point
  const ring = (i) => 1 + i * sides, last = pos.length / 3 - 1;
  for (let j = 0; j < sides; j++) { const j2 = (j + 1) % sides; idx.push(0, ring(0) + j2, ring(0) + j); }
  for (let i = 0; i < rings - 1; i++) for (let j = 0; j < sides; j++) {
    const j2 = (j + 1) % sides, a = ring(i) + j, b = ring(i) + j2, c = ring(i + 1) + j, d = ring(i + 1) + j2;
    idx.push(a, b, d, a, d, c);
  }
  for (let j = 0; j < sides; j++) { const j2 = (j + 1) % sides; idx.push(last, ring(rings - 1) + j, ring(rings - 1) + j2); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  return g;
}
// a fin seam in the middle plane: from t0 to 1 along the top (side +1) or the bottom (-1), height h at the tail end
function seamGeometry(t0, side, h) {
  const pos = [], idx = [], n = 14;
  for (let i = 0; i <= n; i++) {
    // the seam rises from nothing, runs on, and rounds off round the tail tip (top and bottom meet behind the body)
    const u = i / n, t = t0 + (1 - t0) * u, x = EEL_X0 - t * EEL_LEN - (u > 0.9 ? (u - 0.9) * 0.12 : 0), r = eelR(t) * 0.8;
    const hh = h * Math.sin(Math.min(1, u * 2.2) * Math.PI / 2) * (u > 0.8 ? 0.35 + 0.65 * Math.cos(((u - 0.8) / 0.2) * Math.PI / 2) : 1);
    pos.push(x, side * r, 0, x, side * (r + hh), 0);
  }
  for (let i = 0; i < n; i++) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3, a, a + 1, a + 2, a + 1, a + 3, a + 2); }   // both sides
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  return g;
}
function eelGeometry() {
  const B = new SkinBuilder(1);
  B.bone = alongX(EEL_BONES);
  // a smooth gradient from the dark olive back to the yellowish belly (per vertex, so no saw edge)
  const mix = (a, b, k) => { const ch = (s) => Math.round(((a >> s) & 255) * (1 - k) + ((b >> s) & 255) * k); return (ch(16) << 16) | (ch(8) << 8) | ch(0); };
  const coat = (x, y) => mix(0x3a3620, 0xb8a85a, Math.max(0, Math.min(1, 0.5 - y / 0.016)));
  B.geo(tubeGeometry(34, 10, eelR, (t) => eelR(t) * (0.95 - 0.5 * Math.max(0, t - 0.35))), null, coat);
  B.geo(ellip(0.016, 0.004, 0.006, 5, 3), composeMatrix(EEL_X0 + 0.004, -0.006, 0), 0x4a4428);   // the lower jaw, a little past the upper
  for (const s of [1, -1]) B.geo(ellip(0.0025, 0.0025, 0.002, 4, 3), composeMatrix(EEL_X0 - 0.014, 0.004, s * 0.0055), 0x111111);   // small eyes
  B.geo(seamGeometry(0.33, 1, 0.008), null, 0x4a4430);    // dorsal fin over the rear two thirds to the tail
  B.geo(seamGeometry(0.48, -1, 0.007), null, 0x6a6040);   // anal fin from just behind the middle, meeting it round the tail
  for (const s of [1, -1]) B.geo(ellip(0.007, 0.0025, 0.005, 4, 3), composeMatrix(EEL_X0 - 0.045, -0.002, s * 0.011, s * 0.5, 0, 0), 0x4a4430);   // small pectoral fins
  return B.build();
}

const ownGeo = new Map();
function ownTemplate(id) {
  let t = ownGeo.get(id);
  if (t) return t;
  const g = markShared(id === 'snoek' ? pikeGeometry() : eelGeometry());
  g.name = 'vis_' + id;
  g.computeBoundingBox();
  const sz = g.boundingBox.getSize(new THREE.Vector3());
  const lods = animalLods(g, Math.max(sz.x, sz.y, sz.z), 'vis_' + id);
  const geos = lods.map((x) => markShared(x));
  geos.silhouette = lods.silhouette; // perf-r3: het silhouet bleef bewaard (een niveau zonder minder driehoeken), zie meshlod.js
  t = { geos, xs: id === 'snoek' ? PIKE_BONES : EEL_BONES };
  ownGeo.set(id, t);
  return t;
}

function buildOwn(id) {
  const t = ownTemplate(id);
  const group = new THREE.Group();
  const bones = t.xs.map((x, i) => { const b = new THREE.Bone(); b.name = i ? 'seg' + i : 'head'; b.position.set(i ? x - t.xs[i - 1] : x, 0, 0); return b; });
  for (let i = 1; i < bones.length; i++) bones[i - 1].add(bones[i]);
  group.add(bones[0]);
  const mesh = new THREE.SkinnedMesh(t.geos[0], MAT);
  mesh.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 0.45);
  group.add(mesh);
  group.updateMatrixWorld(true);
  mesh.bind(new THREE.Skeleton(bones));
  group.userData = { ownFish: id, bones, lod: setupSkinnedLods(mesh, t.geos), wave: id === 'paling' ? 0.45 : 0.22 };
  return group;
}

// The fish of a fish book id at its real length; null for an unknown id.
export function buildFishModel(fishId) {
  const m = FISH_MODEL_OF[fishId];
  const s = soort(fishId);
  if (!m) return null;
  const g = OWN_FISH.includes(m) ? buildOwn(m) : buildAnimalModel(m);
  const outer = new THREE.Group();
  outer.add(g);
  // a borrowed shape is scaled to its own species (a perch model for a three-spined stickleback is much smaller)
  const own = OWN_FISH.includes(m) ? (m === 'snoek' ? 0.7 : 0.6) : (soort(m.slice(4)) || {}).lengte;
  const want = s && s.lengte ? s.lengte : own;
  if (own && want) g.scale.setScalar(want / own);
  // what the world and the tests read on an animal model: its head bone and its LODs
  const head = g.userData.ownFish ? g.userData.bones[0] : g.userData.bones && g.userData.bones.head;
  outer.userData = { fishId, inner: g, lodD2: 0, bones: { head }, head, lod: g.userData.lod };
  return outer;
}

// state: 'zwem' (swimming, speed m/s) or 'vangst' (on the line, flapping); time in seconds.
export function animateFishModel(outer, { state = 'zwem', speed = 0.3 } = {}, time = 0) {
  const g = outer.userData.inner, ud = g.userData;
  if (!ud.ownFish) { ud.lodD2 = outer.userData.lodD2; animateAnimalModel(g, { state: state === 'vangst' ? 'vangst' : 'zwem', speed }, time); return; }
  const flap = state === 'vangst';
  const f = flap ? 14 : 4 + speed * 6, amp = flap ? ud.wave * 1.8 : ud.wave * (0.6 + Math.min(1, speed));
  ud.bones.forEach((b, i) => { b.rotation.y = Math.sin(time * f - i * 0.9) * amp * (i / ud.bones.length + 0.15); });
  if (flap) ud.bones[0].rotation.z = Math.sin(time * 9) * 0.25;
  updateSkinnedLod(ud.lod, Math.sqrt(outer.userData.lodD2 || 0), time);
}
