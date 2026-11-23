// Converts the chosen Quaternius animals (CC0) into small game assets in game/models/dieren/<id>.json, read by
// game/js/animalmodels.js. Per animal: one merged skinned geometry (positions quantised to 16 bit, a material index per
// vertex instead of separate materials, so one draw call), the bone tree with its rest pose and inverse bind matrices, and
// only the clips the game plays (quaternions quantised to 16 bit, constant tracks that equal the rest pose dropped).
// The source .glb files stay outside git (C:\Users\abuis\gde-assets\quaternius, see LICENTIE.txt there).
//   node scripts/dieren_converteer.mjs <asset-root> [id,id,...]
import './node3d.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { loadGlb, findClip } from './lib/glb_node.mjs';
import { measureAnimal } from './lib/diermaat.mjs';
const AM = await import('../game/js/animalmodels.js');
const REG = await import('../game/js/dierenregister.js');
const VIS = await import('../game/js/visdata.js');
const THREE = await import('three');
const [root, only = ''] = process.argv.slice(2);
if (!root) { console.log('gebruik: node scripts/dieren_converteer.mjs <assetmap> [ids]'); process.exit(1); }
const U = (f) => path.join(root, 'ultimate-animated-animals/pack', f), F = (f) => path.join(root, 'farm-animal/pack', f), V = (f) => path.join(root, 'animated-fish/pack', f);
const FISH = { swim: 'Swimming_Normal', fast: 'Swimming_Fast', out: 'Out_Of_Water' };
const WILD = { idle: 'Idle', idle2: 'Idle_2', walk: 'Walk', run: 'Gallop', eat: 'Eating', death: 'Death', hit: 'Idle_HitReact_Left' };
// len: real nose-to-tail length in metres; src: the pack file; clips: game key -> clip name in the pack
export const ANIMALS = {
  ree: { src: U('Deer.glb'), len: 1.15, clips: { ...WILD, low: 'Idle_Headlow' } },
  vos: { src: U('Fox.glb'), len: 1.0, clips: { ...WILD, low: 'Idle_2_HeadLow', attack: 'Attack' } },
  wolf: { src: U('Wolf.glb'), len: 1.45, clips: { ...WILD, low: 'Idle_2_HeadLow', attack: 'Attack' } },
  ezel: { src: U('Donkey.glb'), len: 1.8, clips: { ...WILD, low: 'Idle_Headlow', attack: 'Attack_Kick' } },
  alpaca: { src: U('Alpaca.glb'), len: 1.6, clips: { ...WILD, low: 'Idle_Headlow' } },
  varken: { src: F('Pig.glb'), len: 1.3, clips: { idle: 'Idle', hit: 'Jump' } },
  // the fish book (visdata.js): pack fish as a base, recoloured to Groningen species by material role (Main, Light, Fins, Dark),
  // scaled to the real length in visdata.js (lengte). Pike and eel have no fitting base: they are our own (fishmodels.js).
  vis_baars: { src: V('Red Snapper.glb'), fish: 'baars', clips: FISH, oog: 0.45, hoog: 0.8, breed: 0.8, kleur: { Main: 0x6f7a3a, Light: 0xd8c99a, Fins: 0xd8642a, Dark: 0x2a2e1e } },
  vis_karper: { src: V('Koi.glb'), fish: 'karper', clips: FISH, oog: 0.4, hoog: 0.62, breed: 0.62, kleur: { Main: 0x8a6a2e, Light: 0xd8c08a, Fins: 0x7a5a2a, Dark: 0x4a3a20 } },
  vis_brasem: { src: V('Koi.glb'), fish: 'brasem', clips: FISH, oog: 0.4, hoog: 0.85, breed: 0.42, kleur: { Main: 0x8a8468, Light: 0xc8c0a0, Fins: 0x4a4436, Dark: 0x5a5440 } },   // the carp body, deep and flat
  vis_voorn: { src: V('Cardinal Fish.glb'), fish: 'voorn', clips: FISH, oog: 0.5, hoog: 0.75, breed: 0.65, kleur: { Main: 0x8a9aa8, Light: 0xe6e8ea, Fins: 0xc8402a, Dark: 0x3a4450 } },
};
const b64 = (ta) => Buffer.from(ta.buffer, ta.byteOffset, ta.byteLength).toString('base64');
const r5 = (x) => Math.round(x * 1e5) / 1e5;
const outDir = path.resolve(import.meta.dirname, '../game/models/dieren');
mkdirSync(outDir, { recursive: true });
const want = only ? new Set(only.split(',')) : null;

for (const [id, A] of Object.entries(ANIMALS)) {
  if (want && !want.has(id)) continue;
  const gltf = await loadGlb(A.src);
  const scene = gltf.scene;
  scene.updateMatrixWorld(true);
  const meshes = [];
  scene.traverse((o) => { if (o.isSkinnedMesh) meshes.push(o); });
  const skel = meshes[0].skeleton;
  for (const m of meshes) if (m.skeleton.bones.length !== skel.bones.length || !m.matrixWorld.equals(meshes[0].matrixWorld)) throw new Error(`${id}: meshes met een ander skelet of een andere plek`);
  // the armature: the common parent of the root bones (its world transform carries the axis and scale of the export)
  const boneIdx = new Map(skel.bones.map((b, i) => [b, i]));
  const rootBones = skel.bones.filter((b) => !boneIdx.has(b.parent));
  const arm = rootBones[0].parent;
  const armPos = new THREE.Vector3(), armQ = new THREE.Quaternion(), armS = new THREE.Vector3();
  arm.matrixWorld.decompose(armPos, armQ, armS);
  const meshPos = new THREE.Vector3(), meshQ = new THREE.Quaternion(), meshS = new THREE.Vector3();
  meshes[0].matrixWorld.decompose(meshPos, meshQ, meshS);
  // merged geometry: position, joints, weights, a material index per vertex
  const palette = [], pos = [], si = [], sw = [], mi = [], idx = [], eyes = [];
  let base = 0;
  for (const m of meshes) {
    const g = m.geometry, mat = Array.isArray(m.material) ? m.material[0] : m.material;
    // a recoloured fish: the colour by the role at the end of the material name (RedSnapper_Main -> Main); eyes stay
    const role = A.kleur && Object.keys(A.kleur).find((r) => mat.name.endsWith('_' + r) || mat.name === r);
    const hex = role ? A.kleur[role] : mat.color.getHex();
    let k = palette.indexOf(hex);
    if (k < 0) { k = palette.length; palette.push(hex); }
    const p = g.attributes.position, j = g.attributes.skinIndex, w = g.attributes.skinWeight;
    const isEye = /^eyes?$/i.test(mat.name);
    for (let i = 0; i < p.count; i++) {
      if (isEye) eyes.push(pos.length / 3);
      pos.push(p.getX(i), p.getY(i), p.getZ(i));
      for (let c = 0; c < 4; c++) { si.push(j.getComponent(i, c)); sw.push(w.getComponent(i, c)); }
      mi.push(k);
    }
    if (g.index) for (let i = 0; i < g.index.count; i++) idx.push(g.index.getX(i) + base); else for (let i = 0; i < p.count; i++) idx.push(i + base);
    base += p.count;
  }
  // the pack fish have cartoon eyes (a third of the head): smaller (A.oog: scale per eye round its own centre) and a little higher
  if (A.oog && eyes.length) {
    const up = new THREE.Vector3(0, 1, 0).transformDirection(new THREE.Matrix4().copy(meshes[0].matrixWorld).invert()).normalize();
    const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
    for (const i of eyes) for (let c = 0; c < 3; c++) { lo[c] = Math.min(lo[c], pos[i * 3 + c]); hi[c] = Math.max(hi[c], pos[i * 3 + c]); }
    const ax = [0, 1, 2].reduce((m, c) => (hi[c] - lo[c] > hi[m] - lo[m] ? c : m), 0), mid = (lo[ax] + hi[ax]) / 2;
    for (const side of [-1, 1]) {
      const vs = eyes.filter((i) => Math.sign(pos[i * 3 + ax] - mid) === side);
      if (!vs.length) continue;
      const c = [0, 0, 0];
      for (const i of vs) for (let k = 0; k < 3; k++) c[k] += pos[i * 3 + k] / vs.length;
      let r = 0;
      for (const i of vs) r = Math.max(r, Math.hypot(pos[i * 3] - c[0], pos[i * 3 + 1] - c[1], pos[i * 3 + 2] - c[2]));
      const lift = r * A.oog * 0.8;
      for (const i of vs) for (let k = 0; k < 3; k++) pos[i * 3 + k] = c[k] + (pos[i * 3 + k] - c[k]) * A.oog + up.getComponent(k) * lift;
    }
  }
  let mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
  for (let i = 0; i < pos.length; i += 3) for (let c = 0; c < 3; c++) { mn[c] = Math.min(mn[c], pos[i + c]); mx[c] = Math.max(mx[c], pos[i + c]); }
  const q16 = new Int16Array(pos.length);
  for (let i = 0; i < pos.length; i++) { const c = i % 3; q16[i] = Math.round(((pos[i] - mn[c]) / ((mx[c] - mn[c]) || 1)) * 65535 - 32768); }
  const wq = new Uint8Array(sw.length);
  for (let i = 0; i < sw.length; i += 4) {   // weights to bytes that still sum to 255
    let s = 0;
    for (let c = 0; c < 4; c++) { wq[i + c] = Math.round(sw[i + c] * 255); s += wq[i + c]; }
    let big = i; for (let c = 1; c < 4; c++) if (wq[i + c] > wq[big]) big = i + c;
    wq[big] += 255 - s;
  }
  // bones: parent, rest TRS (local; a root bone relative to the armature), inverse bind matrices
  const bones = skel.bones.map((b) => ({ n: b.name, p: boneIdx.has(b.parent) ? boneIdx.get(b.parent) : -1, t: b.position.toArray().map(r5), q: b.quaternion.toArray().map(r5), s: b.scale.toArray().map(r5) }));
  const inv = new Float32Array(skel.bones.length * 16);
  skel.boneInverses.forEach((m, i) => inv.set(m.elements, i * 16));
  // clips: only what the game plays; tracks by bone index
  const clips = {};
  for (const [key, name] of Object.entries(A.clips)) {
    const clip = findClip(gltf, name);
    if (!clip) { console.log(`${id}: clip ${name} ontbreekt`); continue; }
    const tracks = [];
    // long clips (idle, eating) at half the key rate: the eye does not see it, the file halves
    const step = clip.duration > 2.5 ? 2 : 1;
    let shared = null, same = true;
    for (const tr of clip.tracks) {
      const [bn, prop] = tr.name.split('.');
      const bi = skel.bones.findIndex((b) => b.name === bn);
      if (bi < 0) continue;
      const kind = prop === 'quaternion' ? 'q' : prop === 'position' ? 't' : 's';
      const v = tr.values, n = kind === 'q' ? 4 : 3;
      const rest = kind === 'q' ? bones[bi].q : kind === 't' ? bones[bi].t : bones[bi].s;
      let constant = true;
      for (let i = 0; i < v.length && constant; i++) if (Math.abs(v[i] - rest[i % n]) > 1e-4) constant = false;
      if (constant) continue;
      const keep = [];
      for (let i = 0; i < tr.times.length; i += step) keep.push(i);
      if (keep[keep.length - 1] !== tr.times.length - 1) keep.push(tr.times.length - 1);
      const times = Float32Array.from(keep, (i) => tr.times[i]);
      const sub = []; for (const i of keep) for (let c = 0; c < n; c++) sub.push(v[i * n + c]);
      const vals = kind === 'q' ? Int16Array.from(sub, (x) => Math.round(Math.max(-1, Math.min(1, x)) * 32767)) : Float32Array.from(sub);
      const tb = b64(times);
      if (shared === null) shared = tb; else if (tb !== shared) same = false;
      tracks.push({ b: bi, k: kind, t: tb, v: b64(vals) });
    }
    if (same && shared) for (const t of tracks) delete t.t;   // one time line for the whole clip
    clips[key] = { d: r5(clip.duration), ...(same && shared ? { t: shared } : {}), tracks };
  }
  // normalisation: the head to +x, the real length, the feet on y = 0 (measured on the bind pose)
  const box = new THREE.Box3();
  const v = new THREE.Vector3();
  const mw = meshes[0].matrixWorld;
  for (let i = 0; i < pos.length; i += 3) box.expandByPoint(v.set(pos[i], pos[i + 1], pos[i + 2]).applyMatrix4(mw));
  const sz = box.getSize(new THREE.Vector3()), ctr = box.getCenter(new THREE.Vector3());
  // the head bone points the nose to +x; the pack fish have none: their nose is at +z
  const head = skel.bones.find((b) => /^head$/i.test(b.name));
  const hp = head ? head.getWorldPosition(new THREE.Vector3()) : ctr.clone().add(new THREE.Vector3(0, 0, 1));
  const alongZ = sz.z > sz.x;
  const sign = Math.sign((alongZ ? hp.z - ctr.z : hp.x - ctr.x) || 1);
  const rotY = alongZ ? (sign > 0 ? Math.PI / 2 : -Math.PI / 2) : (sign > 0 ? 0 : Math.PI);
  const scale = (A.len || 1) / Math.max(sz.x, sz.z);
  // mesh LODs: vertex clustering on the bind pose per colour (a cell of len * f), triangles that collapse are dropped;
  // the LODs share the vertex buffer and only carry their own index list
  const lods = [], lodTris = [];
  for (const f of [0.045, 0.09]) {
    const cell = Math.max(mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]) * f, rep = new Map(), map = new Int32Array(base);
    for (let i = 0; i < base; i++) {
      const key = mi[i] + ':' + Math.floor(pos[i * 3] / cell) + ':' + Math.floor(pos[i * 3 + 1] / cell) + ':' + Math.floor(pos[i * 3 + 2] / cell);
      let r = rep.get(key);
      if (r === undefined) { r = i; rep.set(key, i); }
      map[i] = r;
    }
    const out = [];
    for (let i = 0; i < idx.length; i += 3) {
      const a = map[idx[i]], b = map[idx[i + 1]], c = map[idx[i + 2]];
      if (a !== b && b !== c && a !== c) out.push(a, b, c);
    }
    lodTris.push(out.length / 3);   // only reported: the game makes its own LODs (meshlod.js animalLods)
  }
  const data = {
    id, bron: path.basename(A.src), licentie: 'CC0 1.0 (Quaternius)', len: A.len,
    // hoog, breed: the pack fish are chubby cartoons; a Groningen fish gets its own height and width (times the length scale)
    norm: { rotY: r5(rotY), scale: r5(scale), y: r5(-box.min.y * scale), hoog: A.hoog || 1, breed: A.breed || 1 },
    armature: { t: armPos.toArray().map(r5), q: armQ.toArray().map(r5), s: armS.toArray().map(r5) },
    mesh: { t: meshPos.toArray().map(r5), q: meshQ.toArray().map(r5), s: meshS.toArray().map(r5) }, bind: meshes[0].bindMatrix.elements.map(r5),
    palette, box: { min: mn.map(r5), max: mx.map(r5) },
    position: b64(q16), material: b64(Uint8Array.from(mi)), skinIndex: b64(Uint8Array.from(si)), skinWeight: b64(wq),
    index: b64(base < 65536 ? Uint16Array.from(idx) : Uint32Array.from(idx)), index32: base >= 65536,
    bones, inverses: b64(inv), clips,
  };
  // the real size: build the model as the game does, measure the shoulder height (scripts/lib/diermaat.mjs) and scale it to
  // the register's maat.schoft (the length above only gave the first guess)
  const maat = A.fish ? { lengte: VIS.soort(A.fish).lengte } : REG.dierById(id).maat;
  AM.primeAnimalModel(id, data);
  const m0 = measureAnimal(AM.buildAnimalModel(id));
  const k = maat && maat.schoft ? maat.schoft / m0.schoft : maat && maat.lengte ? maat.lengte / m0.lengte : 1;
  data.norm.scale = r5(data.norm.scale * k);
  data.norm.y = r5(data.norm.y * k);
  AM.primeAnimalModel(id, data);
  const m1 = measureAnimal(AM.buildAnimalModel(id));
  console.log(`  ${id}: schoft ${m1.schoft === null ? '-' : m1.schoft.toFixed(2)} m, lengte ${m1.lengte.toFixed(2)} m, hoogte ${m1.hoogte.toFixed(2)} m (doel ${maat ? JSON.stringify(maat) : '-'})`);
  const file = path.join(outDir, `${id}.json`);
  const text = JSON.stringify(data);
  writeFileSync(file, text);
  console.log(`${id}: ${idx.length / 3} tri, ${skel.bones.length} botten, ${palette.length} kleuren, LOD ${lodTris.join("/")} tri, clips ${Object.keys(clips).join('/')}, ${Math.round(text.length / 1024)} kB`);
}
