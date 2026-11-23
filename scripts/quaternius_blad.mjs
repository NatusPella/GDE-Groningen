// Comparison sheet: our animals next to the Quaternius models (CC0) in their clips, software render without Electron.
//   node scripts/quaternius_blad.mjs <asset-root with ultimate-animated-animals/, farm-animal/, animated-fish/> <out.png> [rows]
// rows: comma list of row keys (default all). Each row: our model (if we have the species) in a few poses, then the
// Quaternius model in its clips, both scaled to the real length of the animal and turned to face +x, seen from 3/4 above.
import './node3d.mjs';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { renderGeometry } from './lib/kleding_clip_png.mjs';
import { loadGlb, pose, bakeColoured } from './lib/glb_node.mjs';
const THREE = await import('three');
const W = await import('../game/js/wildlife.js'), C = await import('../game/js/countryside.js');
const [root, out = 'quaternius_blad.png', only = ''] = process.argv.slice(2);
if (!root) { console.log('gebruik: node scripts/quaternius_blad.mjs <assetmap> <uit.png> [rijen]'); process.exit(1); }
const U = (f) => path.join(root, 'ultimate-animated-animals/pack', f), F = (f) => path.join(root, 'farm-animal/pack', f), V = (f) => path.join(root, 'animated-fish/pack', f);
const ANIM = ['Idle', 'Walk', 'Gallop', 'Eating', 'Attack_Headbutt'];
const DOG = ['Idle', 'Walk', 'Gallop', 'Eating', 'Attack'];
const FARM = ['Idle', 'Walk', 'Run', 'Jump'];
const FISH = ['Swimming_Normal', 'Swimming_Fast', 'Out_Of_Water'];
const ours = (bouw, kind, poses) => ({ bouw, kind, poses });
const STAP = [{ speed: 0 }, { speed: 0.6, stride: 0.9 }, { speed: 2.8, stride: 2.1, fleeT: 2, flee: 2, state: 'flee' }];
// len: real length in metres (nose to tail)
const ROWS = {
  koe: { len: 2.3, ons: ours(() => W.buildCowMesh3D(0.3), 'cow', STAP), q: [[U('Cow.glb'), ANIM], [F('Cow.glb'), FARM]] },
  schaap: { len: 1.3, ons: ours(() => W.buildSheepMesh3D(1), 'sheep', STAP), q: [[F('Sheep.glb'), ['Idle', 'Jump']]] },
  paard: { len: 2.3, ons: ours(() => C.buildHorseMesh(0), 'horse', STAP), q: [[U('Horse.glb'), ANIM], [F('Horse.glb'), FARM]] },
  hond: { len: 0.9, ons: ours(() => W.buildDogMesh3D(0, 0.3), 'dog', STAP), q: [[U('Shiba Inu.glb'), DOG], [F('Pug.glb'), ['Idle', 'Jump']]] },
  ree: { len: 1.2, q: [[U('Deer.glb'), ANIM]] },
  vos: { len: 1.0, q: [[U('Fox.glb'), DOG]] },
  wolf: { len: 1.4, q: [[U('Wolf.glb'), DOG]] },
  ezel: { len: 1.8, q: [[U('Donkey.glb'), ANIM]] },
  alpaca: { len: 1.6, q: [[U('Alpaca.glb'), ANIM], [F('Llama.glb'), ['Idle', 'Jump']]] },
  varken: { len: 1.4, q: [[F('Pig.glb'), ['Idle', 'Jump']]] },
  // candidate bases for the fish book species (each in its swimming pose)
  visbasis: { len: 0.45, q: ['Tuna', 'Red Snapper', 'Coral Grouper', 'Koi', 'Goldfish', 'Tetra', 'Cardinal Fish', 'Butterfly Fish', 'Piranha', 'Armored Catfish', 'Swordfish', 'Flatfish'].map((n) => [V(n + '.glb'), ['Swimming_Normal']]) },
  vis: { len: 0.45, ons: ours(() => W.buildFishMesh3D(), 'vis', [{ speed: 0.4 }]), q: [[V('Flatfish.glb'), FISH], [V('Goldfish.glb'), FISH], [V('Red Snapper.glb'), FISH], [V('Tuna.glb'), FISH]] },
};
const tilt = new THREE.Matrix4().makeRotationX(0.45).multiply(new THREE.Matrix4().makeRotationY(-0.55));
const all = { pos: [], col: [] };
const cell = (len) => len * 1.35;
let y = 0;
const want = only ? new Set(only.split(',')) : null;
const labels = [];
for (const [key, R] of Object.entries(ROWS)) {
  if (want && !want.has(key)) continue;
  const items = [];
  if (R.ons) for (const p of R.ons.poses) items.push({ ons: true, p });
  for (const [file, clips] of R.q) for (const c of clips) items.push({ file, clip: c });
  const cw = cell(R.len);
  let x = 0, rowH = 0;
  const rowPos = { pos: [], col: [] };
  for (const it of items) {
    let obj;
    if (it.ons) {
      obj = R.ons.bouw();
      W.animateWildlifeMesh3D(obj, { kind: R.ons.kind, bobSeed: 0.37, angle: 0, x: 0, y: 0, ...it.p }, 12);
      if (R.ons.kind === 'vis') obj.position.y = 0.1;   // in the world it swims below the canal surface
      obj.updateMatrixWorld(true);
    } else {
      const g = await loadGlb(it.file);
      obj = pose(g, it.clip, 0.35);
    }
    // turn the longest horizontal axis to x with the head at +x, scale to the real length, feet on y = 0
    const box = new THREE.Box3().setFromObject(obj, true), sz = box.getSize(new THREE.Vector3());
    const wrap = new THREE.Group();
    wrap.add(obj);
    let head = null;
    obj.traverse((o) => { if (!head && o.isBone && /^head$/i.test(o.name)) head = o; });
    if (!it.ons) {
      const alongZ = sz.z > sz.x;
      const c = box.getCenter(new THREE.Vector3()), h = head ? head.getWorldPosition(new THREE.Vector3()) : null;
      const sign = h ? Math.sign((alongZ ? h.z - c.z : h.x - c.x) || 1) : 1;
      wrap.rotation.y = alongZ ? (sign > 0 ? Math.PI / 2 : -Math.PI / 2) : (sign > 0 ? 0 : Math.PI);
      const k = R.len / Math.max(sz.x, sz.z);
      wrap.scale.setScalar(k);
      wrap.updateMatrixWorld(true);
      const b2 = new THREE.Box3().setFromObject(wrap, true);
      wrap.position.y = -b2.min.y + (R.len < 0.6 ? 0.1 : 0);
    }
    wrap.updateMatrixWorld(true);
    const before = rowPos.pos.length;
    bakeColoured(wrap, rowPos, [x, 0, 0], tilt);
    for (let i = before + 1; i < rowPos.pos.length; i += 3) rowH = Math.max(rowH, rowPos.pos[i]);
    x += cw;
  }
  // scale every row to the same width per cell so small animals stay readable
  const k = 1 / cw;
  y -= rowH * k + 0.12;
  for (let i = 0; i < rowPos.pos.length; i += 3) all.pos.push(rowPos.pos[i] * k + 0.5, rowPos.pos[i + 1] * k + y, rowPos.pos[i + 2] * k);
  for (const c of rowPos.col) all.col.push(c);
  labels.push([key, items.length]);
}
const geo = new THREE.BufferGeometry();
geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(all.pos), 3));
geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(all.col), 3));
const cols = Math.max(...labels.map((l) => l[1]));
writeFileSync(out, renderGeometry(geo, { view: 'zij', box: [-0.2, y - 0.05, cols + 0.2, 0.25], ppm: Math.round(1800 / (cols + 0.4)) }));
console.log('klaar', out, labels.map((l) => l.join(':')).join(' '));
