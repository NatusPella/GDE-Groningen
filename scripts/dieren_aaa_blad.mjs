// Beeldblad van de dieren in vier poses (staan, kijken naar de speler, stappen, op de vlucht), software-render zonder Electron.
//   node scripts/dieren_aaa_blad.mjs <uitmap> [bronmap met game/js, standaard deze repo] [voor|na]
// Voor een voor/na-vergelijking: pak de oude commit uit (git archive <commit> game/js | tar -x -C <map>) en geef die map als tweede argument.
import './node3d.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { renderGeometry } from './lib/kleding_clip_png.mjs';
const THREE = await import('three');
const [out = 'dieren_aaa', src = path.resolve(import.meta.dirname, '..'), tag = 'na'] = process.argv.slice(2);
const imp = (f) => import(pathToFileURL(path.join(src, 'game/js', f)).href);
const W = await imp('wildlife.js'), C = await imp('countryside.js');
mkdirSync(out, { recursive: true });
const POSES = [
  { naam: 'staan', a: { speed: 0, stride: 0 } },
  { naam: 'kijken', a: { speed: 0, stride: 0, watch: 0.8 } },
  { naam: 'stap', a: { speed: 0.6, stride: 0.9 } },
  { naam: 'vlucht', a: { speed: 2.8, stride: 2.1, fleeT: 2, flee: 2, state: 'flee' } },
];
const SOORT = {
  koe: { kind: 'cow', bouw: (i) => W.buildCowMesh3D(0.1 + i * 0.25, false), span: 2.8, hoog: 1.8 },
  schaap: { kind: 'sheep', bouw: (i) => W.buildSheepMesh3D(i), span: 1.6, hoog: 1.2 },
  paard: { kind: 'horse', bouw: (i) => C.buildHorseMesh(i), span: 3.0, hoog: 2.4 },
  kat: { kind: 'cat', bouw: (i) => W.buildCatMesh3D(i), span: 0.9, hoog: 0.6 },
  hond: { kind: 'dog', bouw: (i) => W.buildDogMesh3D(i, 0.3), span: 1.4, hoog: 0.9 },
};
for (const [naam, S] of Object.entries(SOORT)) {
  const pos = [], col = [];
  POSES.forEach((P, i) => {
    const g = S.bouw(i);
    const a = { kind: S.kind, bobSeed: 0.37, angle: 0, x: 0, y: 0, ...P.a };
    W.animateWildlifeMesh3D(g, a, 12);   // t = 12: geen graaspuls, zodat staan ook staan is
    g.updateMatrixWorld(true);
    const v = new THREE.Vector3();
    g.traverse((o) => {
      if (!o.isSkinnedMesh) return;
      const p = o.geometry.attributes.position, c = o.geometry.attributes.color, idx = o.geometry.index, cnt = idx ? idx.count : p.count;
      for (let k = 0; k < cnt; k++) {
        const j = idx ? idx.getX(k) : k;
        o.getVertexPosition(j, v); v.applyMatrix4(o.matrixWorld);
        pos.push(v.x + i * S.span, v.y, v.z); col.push(c.getX(j), c.getY(j), c.getZ(j));
      }
    });
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(col), 3));
  writeFileSync(`${out}/${tag}_${naam}.png`, renderGeometry(geo, { view: 'zij', box: [-S.span * 0.5, -0.02, POSES.length * S.span - S.span * 0.5, S.hoog], ppm: Math.round(1500 / (POSES.length * S.span)) }));
}
console.log('klaar', out);
