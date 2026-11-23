// Driehoeken per dier en de rekentijd van één animatiestap (CPU, in Node, zonder GPU): voor en na een wijziging naast elkaar.
//   node scripts/dieren_meting.mjs [bronmap met game/js, standaard deze repo]
import './node3d.mjs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
const src = process.argv[2] || path.resolve(import.meta.dirname, '..');
const imp = (f) => import(pathToFileURL(path.join(src, 'game/js', f)).href);
const W = await imp('wildlife.js'), C = await imp('countryside.js');
const tri = (g) => { let t = 0; g.traverse((o) => { if (o.isSkinnedMesh) t += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; }); return Math.round(t); };
const rows = {
  koe: [() => W.buildCowMesh3D(0.3), 'cow'], schaap: [() => W.buildSheepMesh3D(1), 'sheep'], paard: [() => C.buildHorseMesh(0), 'horse'],
  kat: [() => W.buildCatMesh3D(0), 'cat'], hond: [() => W.buildDogMesh3D(0, 0.2), 'dog'], eend: [() => W.buildDuckMesh3D('drake'), 'duck'], reiger: [() => W.buildDuckMesh3D('reiger'), 'reiger'],
};
for (const [n, [f, kind]] of Object.entries(rows)) {
  const g = f(); const a = { kind, bobSeed: 0.4, angle: 0, speed: 0.6, stride: 0, watch: 0.3 };
  for (let i = 0; i < 20000; i++) { a.stride += 0.01; W.animateWildlifeMesh3D(g, a, i * 0.016); }
  const N = 200000, t0 = performance.now();
  for (let i = 0; i < N; i++) { a.stride += 0.01; W.animateWildlifeMesh3D(g, a, i * 0.016); }
  console.log(n.padEnd(7), String(tri(g)).padStart(4), 'tri', `${((performance.now() - t0) / N * 1000).toFixed(2)} us per stap`);
}
