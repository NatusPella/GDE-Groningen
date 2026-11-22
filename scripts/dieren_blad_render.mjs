// Beeldblad van dieren (software-render, geen Electron): de gevilde mesh in zijn huidige pose naar een PNG, zijaanzicht, naast elkaar.
//   node scripts/dieren_blad_render.mjs <uitmap> <soort> [n] [rust]      soort: kip | koe | schaap | eend; zonder 'rust' met de kudde-poses
import './node3d.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
import { renderGeometry } from './lib/kleding_clip_png.mjs';
const THREE = await import('three');
const W = await import('../game/js/wildlife.js');
const [out = 'dieren_blad', soort = 'kip', ns = '8'] = process.argv.slice(2); const n = +ns;
mkdirSync(out, { recursive: true });
const bouw = { kip: (i) => W.buildChickenMesh3D(i), koe: (i) => W.buildCowMesh3D(0.1 + i * 0.25, i % 5 === 4), schaap: (i) => W.buildSheepMesh3D(i), eend: (i) => W.buildDuckMesh3D(['drake', 'hen'][i % 2]) }[soort];
const pos = [], col = [], span = { kip: 0.6, koe: 2.6, schaap: 1.4, eend: 0.6 }[soort], hoog = { kip: 0.5, koe: 1.6, schaap: 1.1, eend: 0.4 }[soort];
for (let i = 0; i < n; i++) {
  const g = bouw(i);
  if (process.argv[5] !== 'rust') W.poseHerdAnimal(g, soort === 'koe' ? 'cow' : soort === 'schaap' ? 'sheep' : 'hen', (i * 0.137) % 1);
  g.updateMatrixWorld(true);
  const v = new THREE.Vector3();
  g.traverse((o) => {
    if (!o.isSkinnedMesh) return;
    const p = o.geometry.attributes.position, c = o.geometry.attributes.color;
    const idx = o.geometry.index;
    const cnt = idx ? idx.count : p.count;
    for (let k = 0; k < cnt; k++) {
      const j = idx ? idx.getX(k) : k;
      o.getVertexPosition(j, v); v.applyMatrix4(o.matrixWorld);
      pos.push(v.x + i * span, v.y, v.z); col.push(c.getX(j), c.getY(j), c.getZ(j));
    }
  });
}
const geo = new THREE.BufferGeometry();
geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(col), 3));
writeFileSync(`${out}/blad_${soort}.png`, renderGeometry(geo, { view: 'zij', box: [-span * 0.5, -0.02, n * span - span * 0.5, hoog], ppm: Math.round(1500 / (n * span)) }));
console.log('klaar', soort, n);
