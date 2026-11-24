// The province animals from the Quaternius packs (CC0, see game/models/dieren/LICENTIE.txt): roe deer, fox, wolf, donkey,
// alpaca and pig. scripts/dieren_converteer.mjs turns each .glb into game/models/dieren/<id>.json: one merged skinned
// geometry with a colour per vertex (one draw call, the world palette on top), the bone tree and only the clips the game plays;
// the mesh LODs are made here, like those of every other animal (meshlod.js). This module loads them, shares geometry, material and clips per
// species, and gives every animal its own bones and AnimationMixer. Until a model has loaded, its group stays empty
// (nothing pops: it appears with the first frame after loading).
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { dsWereld } from './worldpalette.js';
import { vcMaterial, markShared } from './pixelart3d.js';
import { setupSkinnedLods, updateSkinnedLod, makeDitherable, animalLods, triCount } from './meshlod.js';

export const ANIMAL_MODEL_IDS = ['ree', 'vos', 'wolf', 'ezel', 'alpaca', 'varken'];
// fish book species on a pack fish base, recoloured (fishmodels.js picks these or its own pike and eel)
export const FISH_MODEL_IDS = ['vis_baars', 'vis_karper', 'vis_brasem', 'vis_voorn'];
const MAT = markShared(makeDitherable(vcMaterial({ roughness: 0.9 })));
const data = new Map(), templates = new Map(), loading = new Map();

// Node tests and tools hand the parsed JSON in directly; the game fetches it (preloadAnimalModels).
export function primeAnimalModel(id, json) {
  data.set(id, json);
  templates.delete(id);
}
export const animalModelReady = (id) => data.has(id);
export function preloadAnimalModels(ids = [...ANIMAL_MODEL_IDS, ...FISH_MODEL_IDS]) {
  return Promise.all(ids.map((id) => {
    if (data.has(id)) return Promise.resolve(true);
    if (!loading.has(id)) {
      loading.set(id, fetch(new URL(`../models/dieren/${id}.json`, import.meta.url).href)
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => { if (j) data.set(id, j); return !!j; })
        .catch((e) => { console.warn(`animalmodels: ${id} niet geladen`, e); return false; }));
    }
    return loading.get(id);
  }));
}

const bytes = (s) => { const b = typeof atob === 'function' ? Uint8Array.from(atob(s), (c) => c.charCodeAt(0)) : new Uint8Array(Buffer.from(s, 'base64')); return b; };
const typed = (s, T) => { const b = bytes(s); return new T(b.buffer, b.byteOffset, b.byteLength / T.BYTES_PER_ELEMENT); };

function template(id) {
  let t = templates.get(id);
  if (t) return t;
  const d = data.get(id);
  if (!d) return null;
  const q = typed(d.position, Int16Array), n = q.length / 3;
  const pos = new Float32Array(q.length);
  for (let i = 0; i < q.length; i++) { const c = i % 3; pos[i] = d.box.min[c] + ((q[i] + 32768) / 65535) * (d.box.max[c] - d.box.min[c]); }
  const mi = typed(d.material, Uint8Array);
  const pal = d.palette.map((hex) => new THREE.Color(dsWereld(hex)));
  const col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const c = pal[mi[i]]; col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
  const attrs = {
    position: new THREE.BufferAttribute(pos, 3),
    color: new THREE.BufferAttribute(col, 3),
    skinIndex: new THREE.BufferAttribute(new Uint16Array(typed(d.skinIndex, Uint8Array)), 4),
    skinWeight: new THREE.BufferAttribute(Float32Array.from(typed(d.skinWeight, Uint8Array), (x) => x / 255), 4),
  };
  const geoWith = (indexB64) => {
    const g = new THREE.BufferGeometry();
    for (const [k, a] of Object.entries(attrs)) g.setAttribute(k, a);
    g.setIndex(new THREE.BufferAttribute(d.index32 && indexB64 === d.index ? typed(indexB64, Uint32Array) : typed(indexB64, Uint16Array), 1));
    // flat shading: no normals needed (the material derives them per face)
    return markShared(g);
  };
  // the LODs: the same clustering as every animal (meshlod.js: per bone part, legs keep their thickness), made once per species
  // and registered in the central LOD register (lodregistry.js) under the species id
  const box = new THREE.Box3().setFromBufferAttribute(attrs.position);
  const bs = box.getSize(new THREE.Vector3());
  const lods = animalLods(geoWith(d.index), Math.max(bs.x, bs.y, bs.z), id);
  const geos = Object.assign(lods.map((g) => markShared(g)), { silhouette: lods.silhouette }); // silhouette: meshlod.js stopte voor het silhouet
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  const inverses = [];
  const iv = typed(d.inverses, Float32Array);
  for (let i = 0; i < d.bones.length; i++) inverses.push(new THREE.Matrix4().fromArray(iv, i * 16));
  const clips = {};
  for (const [key, c] of Object.entries(d.clips)) {
    const tracks = [];
    for (const tr of c.tracks) {
      const times = typed(tr.t || c.t, Float32Array);
      const bn = d.bones[tr.b].n;
      if (tr.k === 'q') tracks.push(new THREE.QuaternionKeyframeTrack(`${bn}.quaternion`, times, Float32Array.from(typed(tr.v, Int16Array), (x) => x / 32767)));
      else tracks.push(new THREE.VectorKeyframeTrack(`${bn}.${tr.k === 't' ? 'position' : 'scale'}`, times, typed(tr.v, Float32Array)));
    }
    clips[key] = new THREE.AnimationClip(key, c.d, tracks);
  }
  // the bind matrix of the source mesh (the loader binds with identity; the vertices then live in the skeleton's space)
  const bindMatrix = d.bind ? new THREE.Matrix4().fromArray(d.bind) : new THREE.Matrix4();
  t = { d, geos, sphere, inverses, clips, bindMatrix };
  templates.set(id, t);
  return t;
}

// Triangles per LOD of a loaded model (tests, the measuring page).
export function animalModelTris(id) {
  const t = template(id);
  return t ? t.geos.map(triCount) : null;
}

// The outer group is what the world moves and turns (facing +x like every animal); the model hangs in an inner group with
// the normalisation (head to +x, real length, feet on y = 0).
export function buildAnimalModel(id) {
  const group = new THREE.Group();
  group.userData.animalModel = id;
  fill(group);
  return group;
}

function fill(group) {
  const t = template(group.userData.animalModel);
  if (!t) { if (typeof fetch === 'function' && typeof window !== 'undefined') preloadAnimalModels([group.userData.animalModel]); return false; }
  const d = t.d;
  const inner = new THREE.Group();
  inner.rotation.y = d.norm.rotY;
  // a fish gets its own height and width (scripts/dieren_converteer.mjs hoog, breed); the width axis is local x when the model was turned
  const hoog = d.norm.hoog || 1, breed = d.norm.breed || 1, turned = Math.abs(d.norm.rotY) > 1;
  inner.scale.set(d.norm.scale * (turned ? breed : 1), d.norm.scale * hoog, d.norm.scale * (turned ? 1 : breed));
  inner.position.y = d.norm.y;
  const arm = new THREE.Object3D();
  arm.position.fromArray(d.armature.t); arm.quaternion.fromArray(d.armature.q); arm.scale.fromArray(d.armature.s);
  inner.add(arm);
  const bones = d.bones.map((b) => { const o = new THREE.Bone(); o.name = b.n; o.position.fromArray(b.t); o.quaternion.fromArray(b.q); o.scale.fromArray(b.s); return o; });
  d.bones.forEach((b, i) => (b.p >= 0 ? bones[b.p] : arm).add(bones[i]));
  const mesh = new THREE.SkinnedMesh(t.geos[0], MAT);
  mesh.boundingSphere = t.sphere;
  inner.add(mesh);
  mesh.bind(new THREE.Skeleton(bones, t.inverses), t.bindMatrix);
  group.add(inner);
  const mixer = new THREE.AnimationMixer(arm);
  Object.assign(group.userData, { filled: true, mixer, actions: {}, clipNow: null, mixT: null, lod: setupSkinnedLods(mesh, t.geos), skinned: mesh, inner });
  group.userData.bones = { head: bones.find((b) => /^head$/i.test(b.name)) || bones[0] };
  group.userData.head = group.userData.bones.head;
  return true;
}

function play(ud, key, { once = false, scale = 1 } = {}) {
  const t = template(ud.animalModel);
  if (!t.clips[key]) key = t.clips.idle ? 'idle' : Object.keys(t.clips)[0];
  let act = ud.actions[key];
  if (!act) {
    act = ud.mixer.clipAction(t.clips[key]);
    if (once) { act.setLoop(THREE.LoopOnce, 1); act.clampWhenFinished = true; }
    ud.actions[key] = act;
  }
  act.timeScale = scale;
  if (ud.clipNow === key) return;
  const prev = ud.clipNow && ud.actions[ud.clipNow];
  act.reset().play();
  if (prev) act.crossFadeFrom(prev, 0.3, false);
  ud.clipNow = key;
}

// Which clip goes with what the animal is doing. a: the animal (speed, state, dead, bobSeed). walkRef/runRef: speeds (m/s)
// at which the walk and gallop clips look right; faster or slower plays them faster or slower.
const PACE = { ree: [1.1, 4], vos: [1.1, 4], wolf: [1.2, 4.5], ezel: [1.0, 3.5], alpaca: [1.0, 3.5], varken: [0.8, 2.5] };
export function animateAnimalModel(group, a, time) {
  const ud = group.userData;
  if (!ud.filled && !fill(group)) return;
  const [walkRef, runRef] = PACE[ud.animalModel] || [1, 4];
  const speed = a.speed || 0;
  const fish = !!template(ud.animalModel).clips.swim;
  if (fish) play(ud, a.state === 'vangst' ? 'out' : speed > 1.2 ? 'fast' : 'swim', { scale: a.state === 'vangst' ? 1 : Math.max(0.6, Math.min(2, 0.7 + speed)) });   // a fish: swim, dart, or flap on the line
  else if (a.dead) play(ud, 'death', { once: true });
  else if (a.state === 'aanval' && speed < 1.5) play(ud, 'attack');
  else if (a.state === 'schrik') play(ud, 'hit');
  else if (speed > walkRef * 1.8) play(ud, 'run', { scale: Math.max(0.6, Math.min(1.8, speed / runRef)) });
  else if (speed > 0.05) play(ud, 'walk', { scale: Math.max(0.5, Math.min(1.8, speed / walkRef)) });
  else {
    // standing: graze, look up, shift; a slow cycle per animal so a group does not move in step
    const slot = Math.floor((time + (a.bobSeed || 0) * 13) / 7) % 4;
    play(ud, a.state === 'loer' ? 'idle' : ['eat', 'idle', 'low', 'idle2'][slot]);
  }
  const dt = ud.mixT === null ? 0 : Math.max(0, Math.min(0.1, time - ud.mixT));
  // far away: the mixer at 10 Hz is enough
  if (ud.ver) { ud.mixAcc = (ud.mixAcc || 0) + dt; if (ud.mixAcc >= 0.1) { ud.mixer.update(ud.mixAcc); ud.mixAcc = 0; } }
  else ud.mixer.update(dt);
  ud.mixT = time;
  updateSkinnedLod(ud.lod, Math.sqrt(ud.lodD2 || 0), time);
}
