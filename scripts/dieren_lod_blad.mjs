// One page with every animal of the register at mesh LOD 0, 1 and 2 (meshlod.js), with the triangle counts in the console.
// Software render without Electron.   node scripts/dieren_lod_blad.mjs <out.png>
import './node3d.mjs';
import fs, { writeFileSync } from 'node:fs';
import { renderGeometry } from './lib/kleding_clip_png.mjs';
import { bakeColoured } from './lib/glb_node.mjs';
const THREE = await import('three');
const R = await import('../game/js/dierenregister.js');
const W = await import('../game/js/wildlife.js');
const C = await import('../game/js/countryside.js');
const AM = await import('../game/js/animalmodels.js');
const L = await import('../game/js/meshlod.js');
const out = process.argv[2] || 'dieren_lod.png';
for (const id of [...AM.ANIMAL_MODEL_IDS, ...AM.FISH_MODEL_IDS]) AM.primeAnimalModel(id, JSON.parse(fs.readFileSync(new URL(`../game/models/dieren/${id}.json`, import.meta.url), 'utf8')));
const tilt = new THREE.Matrix4().makeRotationX(0.4).multiply(new THREE.Matrix4().makeRotationY(-0.5));
const all = { pos: [], col: [] };
let y = 0;
for (const d of R.DIEREN) {
  let rowLen = 0, rowH = 0;
  const parts = [];
  for (let level = 0; level < 3; level++) {
    const g = d.model.module === 'countryside' ? C[d.model.fn](...d.model.args) : W.buildWildlifeMesh3D({ kind: d.kind, variant: d.variant, bobSeed: 0.5, breed: 0, color: 0 });
    if (d.kind === 'vis' || d.kind === 'duck' || d.kind === 'zeehond') g.position.y = 0.2;
    const lod = g.userData.lod;
    if (lod) lod.mesh.geometry = lod.geos[level];
    g.updateMatrixWorld(true);
    const o = bakeColoured(g, { pos: [], col: [] }, [0, 0, 0], tilt);
    let x0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (let i = 0; i < o.pos.length; i += 3) { x0 = Math.min(x0, o.pos[i]); x1 = Math.max(x1, o.pos[i]); y1 = Math.max(y1, o.pos[i + 1]); }
    parts.push({ o, x0, w: x1 - x0 });
    rowLen = Math.max(rowLen, x1 - x0); rowH = Math.max(rowH, y1);
  }
  const k = 1 / (rowLen * 1.2);
  y -= (rowH + 0.25) * k + 0.05;
  parts.forEach((p, i) => { for (let j = 0; j < p.o.pos.length; j += 3) { all.pos.push((p.o.pos[j] - p.x0) * k + i * 1.05, p.o.pos[j + 1] * k + y, p.o.pos[j + 2] * k); } for (const c of p.o.col) all.col.push(c); });
  const g0 = d.model.module === 'countryside' ? C[d.model.fn](...d.model.args) : W.buildWildlifeMesh3D({ kind: d.kind, variant: d.variant, bobSeed: 0.5 });
  console.log(d.id.padEnd(8), g0.userData.lod ? g0.userData.lod.geos.map(L.triCount).join(' / ') : '-');
}
const geo = new THREE.BufferGeometry();
geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(all.pos), 3));
geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(all.col), 3));
writeFileSync(out, renderGeometry(geo, { view: 'zij', box: [-0.05, y - 0.1, 3.2, 0.1], ppm: 420 }));
console.log('klaar', out);
