// Driehoeken per dier en de rekentijd van één animatiestap (CPU, in Node, zonder GPU): voor en na een wijziging naast elkaar.
//   node scripts/dieren_meting.mjs [bronmap met game/js, standaard deze repo] [tweede bronmap]
// Met twee bronmappen meet het gepaard: per dier om en om vijf rondes van beide en de mediaan, zodat de drukte op de machine
// beide kanten gelijk raakt. Driehoeken tellen alle meshes van het dier (ook losse poten of vleugels); 'dc' is het aantal
// meshes (draw calls per dier).
import './node3d.mjs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
const bronnen = process.argv.slice(2);
if (!bronnen.length) bronnen.push(path.resolve(import.meta.dirname, '..'));
const laad = async (src) => {
  const imp = (f) => import(pathToFileURL(path.join(src, 'game/js', f)).href);
  return { W: await imp('wildlife.js'), C: await imp('countryside.js') };
};
const kanten = [];
for (const b of bronnen) kanten.push(await laad(b));
const tel = (g) => {
  let t = 0, dc = 0;
  g.traverse((o) => { if (o.isMesh) { dc++; t += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; } });
  return [Math.round(t), dc];
};
const wl = (kind) => ({ W }) => W.buildWildlifeMesh3D({ kind, bobSeed: 0.4 });
// [bouwer, toestand van het dier tijdens de meting]
const rows = {
  koe: [({ W }) => W.buildCowMesh3D(0.3), { kind: 'cow', speed: 0.6 }], schaap: [({ W }) => W.buildSheepMesh3D(1), { kind: 'sheep', speed: 0.6 }], paard: [({ C }) => C.buildHorseMesh(0), { kind: 'horse', speed: 0.6 }],
  kat: [({ W }) => W.buildCatMesh3D(0), { kind: 'cat', speed: 0.6 }], hond: [({ W }) => W.buildDogMesh3D(0, 0.2), { kind: 'dog', speed: 0.6 }],
  eend: [({ W }) => W.buildDuckMesh3D('drake'), { kind: 'duck', speed: 0.6 }], reiger: [({ W }) => W.buildDuckMesh3D('reiger'), { kind: 'reiger', speed: 0.6 }],
  'duif-g': [wl('pigeon'), { kind: 'pigeon', state: 'ground', speed: 0.35, z: 0.1 }],
  'duif-v': [wl('pigeon'), { kind: 'pigeon', state: 'fly', speed: 6, z: 5, cruise: 6 }],
  'meeuw-g': [wl('seagull'), { kind: 'seagull', state: 'ground', speed: 0.45, z: 0.1, flapSeed: 1 }],
  'meeuw-v': [wl('seagull'), { kind: 'seagull', state: 'fly', speed: 6, z: 8, cruise: 8, bank: 0.2, flapSeed: 1 }],
  gans: [wl('gans'), { kind: 'gans', speed: 0.6 }],
  zeehond: [wl('zeehond'), { kind: 'zeehond', state: 'rust', speed: 0.3 }],
};
const N = 100000;
function ronde(K, g, a) {
  for (let i = 0; i < 2000; i++) { a.stride += 0.01; a.angle += 0.0005; K.W.animateWildlifeMesh3D(g, a, i * 0.016); }
  const t0 = performance.now();
  for (let i = 0; i < N; i++) { a.stride += 0.01; a.angle += 0.0005; K.W.animateWildlifeMesh3D(g, a, i * 0.016); }
  return ((performance.now() - t0) / N) * 1000;
}
const med = (l) => l.slice().sort((p, q) => p - q)[l.length >> 1];
for (const [n, [f, s]] of Object.entries(rows)) {
  const per = kanten.map((K) => { const g = f(K); return { K, g, a: { bobSeed: 0.4, angle: 0, stride: 0, watch: 0.3, ...s }, tijden: [] }; });
  for (let r = 0; r < (kanten.length > 1 ? 5 : 1); r++) for (const p of per) p.tijden.push(ronde(p.K, p.g, p.a));
  console.log(n.padEnd(8), per.map((p) => { const [t, dc] = tel(p.g); return `${String(t).padStart(4)} tri ${String(dc).padStart(2)} dc ${med(p.tijden).toFixed(2)} us`; }).join('   |   '));
}
