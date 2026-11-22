// De kudde in beeld (herdview3d.js): een echte kip (geen eend), elke kudde-pose is eindig en staat niet door de grond, de pose is vast per zaad,
// en de driehoekenbegroting van de weidedieren blijft binnen de grens.
//   node scripts/dierenmodel_test.mjs      (vereist de vendor-cache, zoals crowd_test.mjs)
import './node3d.mjs';
import fs from 'node:fs';
const THREE = await import('three');
const W = await import('../game/js/wildlife.js');
let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log('FAIL', name, info); } };

function meet(g) {
  g.updateMatrixWorld(true);
  const v = new THREE.Vector3(); let lo = Infinity, hi = -Infinity, xlo = Infinity, xhi = -Infinity, bad = 0, tris = 0;
  g.traverse((o) => {
    if (!o.isSkinnedMesh) return;
    const p = o.geometry.attributes.position; tris += (o.geometry.index ? o.geometry.index.count : p.count) / 3;
    for (let i = 0; i < p.count; i++) {
      o.getVertexPosition(i, v); v.applyMatrix4(o.matrixWorld);
      if (!Number.isFinite(v.x + v.y + v.z)) { bad++; continue; }
      lo = Math.min(lo, v.y); hi = Math.max(hi, v.y); xlo = Math.min(xlo, v.x); xhi = Math.max(xhi, v.x);
    }
  });
  return { lo, hi, len: xhi - xlo, bad, tris };
}

// de kip: elke variant
for (let v = 0; v < W.KIP_VARIANTEN; v++) {
  const m = meet(W.buildChickenMesh3D(v));
  ok(m.bad === 0, `kip ${v}: eindige hoekpunten`);
  ok(m.tris > 120 && m.tris <= 560, `kip ${v}: driehoekenbegroting`, m.tris);
  ok(m.lo > -0.01 && m.lo < 0.02, `kip ${v}: de poten staan op de grond`, m.lo);
  ok(m.hi > 0.28 && m.hi < 0.5, `kip ${v}: een kip is klein (28 tot 50 cm)`, m.hi);
  ok(m.len > 0.25 && m.len < 0.55, `kip ${v}: lengte`, m.len);
}
ok(W.buildChickenMesh3D(99).userData.kipVariant === 0 && W.buildChickenMesh3D(NaN).userData.kipVariant === 0 && W.buildChickenMesh3D(-1).userData.kipVariant === 0, 'een onbekende variant valt terug op de witte hen');
{
  const a = W.buildChickenMesh3D(2), b = W.buildChickenMesh3D(2), c = W.buildChickenMesh3D(5);
  const geo = (g) => { let r; g.traverse((o) => { if (o.isSkinnedMesh) r = o.geometry; }); return r; };
  ok(geo(a) === geo(b), 'dezelfde variant deelt zijn geometrie (een kudde is een skelet en een verwijzing)');
  ok(geo(a) !== geo(c), 'een haan is een eigen geometrie');
}
// de haan is hoger en heeft een grotere staart dan de hen van dezelfde look
ok(meet(W.buildChickenMesh3D(W.KIP_VARIANTEN / 2)).hi > meet(W.buildChickenMesh3D(0)).hi, 'de haan is hoger dan de hen (kam)');

// poses
const seen = new Set();
for (const model of ['cow', 'sheep', 'hen']) {
  for (let i = 0; i < 40; i++) {
    const seed = i / 40;
    const g = model === 'cow' ? W.buildCowMesh3D(seed, i % 5 === 0) : model === 'sheep' ? W.buildSheepMesh3D() : W.buildChickenMesh3D(i % W.KIP_VARIANTEN);
    const pose = W.poseHerdAnimal(g, model, seed);
    seen.add(pose);
    const m = meet(g);
    ok(m.bad === 0, `${model} ${pose}: eindige hoekpunten`, seed);
    ok(m.lo > (model === 'hen' ? -0.03 : -0.1), `${model} ${pose}: niet door de grond`, m.lo.toFixed(3));
    const g2 = model === 'cow' ? W.buildCowMesh3D(seed, i % 5 === 0) : model === 'sheep' ? W.buildSheepMesh3D() : W.buildChickenMesh3D(i % W.KIP_VARIANTEN);
    ok(W.poseHerdAnimal(g2, model, seed) === pose && g2.userData.bones.head.rotation.z === g.userData.bones.head.rotation.z, `${model}: dezelfde pose bij hetzelfde zaad`);
  }
}
ok([...W.KUDDE_POSES].every((p) => seen.has(p)), 'alle vier de poses komen voor', [...seen].join());
ok(['staan', 'kijken', 'grazen', 'grazen-diep'].every((p) => W.KUDDE_POSES.includes(p)), 'de posenamen');
ok(W.poseHerdAnimal(null, 'cow', 0.3) === W.KUDDE_POSES[1] && W.poseHerdAnimal({}, 'hen', NaN) === 'staan', 'zonder skelet of met een ongeldig zaad geen fout');

// de herdview3d gebruikt de kip en niet de eend
const src = fs.readFileSync(new URL('../game/js/herdview3d.js', import.meta.url), 'utf8');
ok(/buildChickenMesh3D/.test(src) && !/buildDuckMesh3D/.test(src), 'herdview3d bouwt kippen met het kipmodel, niet met de eend');
ok(/poseHerdAnimal\(/.test(src), 'herdview3d zet elk dier in een vaste pose');

console.log(`${n - fails}/${n} dierenmodel`);
process.exit(fails ? 1 : 0);
