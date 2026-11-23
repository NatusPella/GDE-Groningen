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

// the eel: 0.6 m, a ribbon: dark olive-brown back, yellowish belly, one long fin seam over the back half and round the tail
const EEL_BONES = [0.22, 0.1, -0.02, -0.14, -0.26];
function eelGeometry() {
  const B = new SkinBuilder(1);
  B.bone = alongX(EEL_BONES);
  const back = 0x3a3424, belly = 0xb8a860;
  const coat = (x, y) => (y < -0.008 ? belly : back);
  const segs = 10;
  for (let i = 0; i < segs; i++) {
    const t = i / (segs - 1), x = 0.25 - t * 0.55;
    const r = 0.022 * (t < 0.15 ? 0.75 + t * 1.6 : 1 - Math.max(0, t - 0.55) * 1.2);
    B.geo(ellip(0.04, r, r * 0.85, 6, 4), composeMatrix(x, 0, 0), coat);
  }
  B.geo(ellip(0.035, 0.018, 0.016, 6, 4), composeMatrix(0.27, 0.002, 0), back);              // the head
  for (const s of [1, -1]) B.geo(ellip(0.005, 0.005, 0.004, 4, 3), composeMatrix(0.285, 0.01, s * 0.013), 0x111111);
  B.geo(ellip(0.2, 0.012, 0.0025, 8, 3), composeMatrix(-0.12, 0.022, 0), 0x4a4430);           // the fin seam over the back
  B.geo(ellip(0.16, 0.01, 0.0025, 8, 3), composeMatrix(-0.16, -0.02, 0), 0x6a6040);           // and under the tail
  for (const s of [1, -1]) B.geo(ellip(0.012, 0.003, 0.008, 4, 3), composeMatrix(0.21, -0.006, s * 0.022, s * 0.4, 0, 0), 0x4a4430);
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
  const geos = animalLods(g, Math.max(sz.x, sz.y, sz.z), 'vis_' + id).map((x) => markShared(x));
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
  outer.userData = { fishId, inner: g, lodD2: 0 };
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
