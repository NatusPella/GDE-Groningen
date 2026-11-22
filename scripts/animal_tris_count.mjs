// Driehoeken, bot-aantal en omhullende doos van alle dieren van wildlife.js (voor de dierenronde in docs/DUIF-MODELLEN-22-11.md).
//   node scripts/duif_dieren_telling.mjs
import './node3d.mjs';
const THREE = await import('three');
const W = await import('../game/js/wildlife.js');
const rows = [
  ['meeuw', () => W.buildSeagullMesh3D()], ['koe', () => W.buildCowMesh3D(0)], ['schaap', () => W.buildSheepMesh3D()], ['eend', () => W.buildDuckMesh3D('drake')],
  ['reiger', () => W.buildDuckMesh3D('reiger')], ['zeehond', () => W.buildSealMesh3D()], ['vis', () => W.buildFishMesh3D()], ['duif', () => W.buildPigeonMesh3D(0)],
  ['kat', () => W.buildCatMesh3D(0)], ['hond', () => W.buildDogMesh3D(0, 0)],
];
for (const [naam, f] of rows) {
  const g = f();
  let tris = 0, bones = 0, box = new THREE.Box3();
  g.traverse((o) => {
    if (o.isSkinnedMesh) { const geo = o.geometry; tris += (geo.index ? geo.index.count : geo.attributes.position.count) / 3; bones = o.skeleton.bones.length; geo.computeBoundingBox(); box.union(geo.boundingBox); }
  });
  const s = box.getSize(new THREE.Vector3());
  console.log(naam.padEnd(9), String(Math.round(tris)).padStart(5), 'tri', String(bones).padStart(2), 'botten', `${s.x.toFixed(2)} x ${s.y.toFixed(2)} x ${s.z.toFixed(2)} m`);
}
