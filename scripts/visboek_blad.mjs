// The fish of the fish book side by side at real length (fishmodels.js): swimming and on the line, with a 1 m ruler, and the
// triangles per LOD in the console. Software render without Electron.   node scripts/visboek_blad.mjs <out.png> [ids]
import './node3d.mjs';
import fs, { writeFileSync } from 'node:fs';
import { renderGeometry } from './lib/kleding_clip_png.mjs';
import { bakeColoured } from './lib/glb_node.mjs';
const THREE = await import('three');
const AM = await import('../game/js/animalmodels.js');
const FM = await import('../game/js/fishmodels.js');
const L = await import('../game/js/meshlod.js');
const [out = 'visboek.png', only = 'snoek,karper,brasem,paling,baars,voorn'] = process.argv.slice(2);
for (const id of AM.FISH_MODEL_IDS) AM.primeAnimalModel(id, JSON.parse(fs.readFileSync(new URL(`../game/models/dieren/${id}.json`, import.meta.url), 'utf8')));
const tilt = new THREE.Matrix4().makeRotationX(0.5).multiply(new THREE.Matrix4().makeRotationY(-0.35));
const all = { pos: [], col: [] };
const ids = only.split(',');
ids.forEach((id, row) => {
  ['zwem', 'vangst'].forEach((state, col) => {
    const g = FM.buildFishModel(id);
    FM.animateFishModel(g, { state, speed: 0.4 }, 0);
    FM.animateFishModel(g, { state, speed: 0.4 }, 0.37);
    g.position.set(col * 0.9, -row * 0.42, 0);
    g.updateMatrixWorld(true);
    bakeColoured(g, all, [0, 0, 0], tilt);
    if (col === 0) {
      let lod = null;
      g.traverse((o) => { if (!lod && o.userData && o.userData.lod) lod = o.userData.lod; });
      console.log(id.padEnd(8), lod ? lod.geos.map(L.triCount).join(' / ') : '-');
    }
  });
});
// a 1 m ruler under the fish
for (const [x0, x1] of [[0, 1]]) {
  const y = -ids.length * 0.42 + 0.15;
  const r = [[x0 - 0.35, y, 0], [x1 - 0.35, y, 0], [x1 - 0.35, y - 0.01, 0], [x0 - 0.35, y, 0], [x1 - 0.35, y - 0.01, 0], [x0 - 0.35, y - 0.01, 0]];
  for (const p of r) { all.pos.push(...p); all.col.push(0.1, 0.1, 0.1); }
}
const geo = new THREE.BufferGeometry();
geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(all.pos), 3));
geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(all.col), 3));
writeFileSync(out, renderGeometry(geo, { view: 'zij', box: [-0.5, -ids.length * 0.42 + 0.1, 1.4, 0.25], ppm: 900 }));
console.log('klaar', out);
