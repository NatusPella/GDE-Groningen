// Beeldblad van NPC-figuren (software-render, geen Electron): schrijft een PNG met n figuren naast elkaar (voor- of zijaanzicht).
//   node scripts/npc_blad_render.mjs <uitmap> [n] [rol] [voor|zij] [startzaad]
import './node3d.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
import { renderableOf } from './lib/kleding_clipping.mjs';
import { renderGeometry } from './lib/kleding_clip_png.mjs';
const THREE = await import('three');
const P = await import('../game/js/models3d_people.js');
const out = process.argv[2] || 'npc_blad'; const n = +process.argv[3] || 12; const rol = process.argv[4] || 'voetganger';
const view = process.argv[5] || 'voor'; const s0 = +process.argv[6] || 1;
mkdirSync(out, { recursive: true });
const pos = [], col = [];
for (let i = 0; i < n; i++) {
  const g = P.buildPersonMesh(0x3f6ea8, 0xd9b08c, { seed: s0 + i * 1.37, variant: i % 2 ? 'female' : 'male', role: rol, outfitCtx: { detail: false } });
  g.userData.body.geometry; g.scale.set(1, 1, 1);
  g.traverse((o) => { if (o.isBone) o.rotation.set(0, 0, 0); }); g.updateMatrixWorld(true);
  const rg = renderableOf({ group: g, geo: g.userData.body.geometry });
  const p = rg.attributes.position.array, c = rg.attributes.color.array;
  for (let k = 0; k < p.length; k += 3) {
    const x = p[k], y = p[k + 1], z = p[k + 2];
    if (view === 'voor') pos.push(x, y, z + i * 0 + 0), col.push(c[k], c[k + 1], c[k + 2]);
    else pos.push(x, y, z);
  }
  // verschuif het laatst toegevoegde figuur in het beeldvlak: voor = beeld-x is -z, zij = beeld-x is x
  const start = pos.length - p.length;
  for (let k = start; k < pos.length; k += 3) { if (view === 'voor') pos[k + 2] -= i * 1.0; else pos[k] += i * 1.0; }
}
const geo = new THREE.BufferGeometry();
geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(col), 3));
const box = view === 'voor' ? [-0.5, 0, n - 0.5, 1.95] : [-0.5, 0, n - 0.5, 1.95];
// voor: beeld-x = -z, dus z van 0 tot -(n-1): beeld-x 0..n-1
writeFileSync(`${out}/blad_${rol}_${view}.png`, renderGeometry(geo, { view, box, ppm: 160 }));
console.log('klaar', n);
