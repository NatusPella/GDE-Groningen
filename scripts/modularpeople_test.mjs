// Tests voor de modulaire mensen (ADR 0050, fase 1): de omgezette rigs in game/models/mensen/, bouwen, kleuren per zaad, animatie
// zonder uitschieters, hielcontacten, voeten op de grond, LOD's (minstens 40% en 70% minder driehoeken) en de verwijzingstelling.
//   node scripts/modularpeople_test.mjs
import './node3d.mjs';
import fs from 'node:fs';
const THREE = await import('three');
const M = await import('../game/js/modularpeople.js');
const P = await import('../game/js/models3d_people.js');

let fails = 0, n = 0;
const ok = (c, msg) => { n++; if (!c) { fails++; console.log('FAIL', msg); } };
for (const r of ['man', 'vrouw']) M.registerModularRig(r, JSON.parse(fs.readFileSync(new URL(`../game/models/mensen/${r}.json`, import.meta.url))), fs.readFileSync(new URL(`../game/models/mensen/${r}.bin`, import.meta.url)));
ok(M.modularReady(), 'beide rigs geladen');

const tris = (m) => m.userData.body.geometry.index.count / 3;
const v = new THREE.Vector3();
// alle vertices na het huiden binnen een redelijke doos rond de mens (geen spies, geen vertex in de oorsprong van de wereld)
function inBox(m) {
  m.updateMatrixWorld(true);
  const b = m.userData.body, g = b.geometry, bb = new THREE.Box3();
  for (let i = 0; i < g.attributes.position.count; i++) { v.fromBufferAttribute(g.attributes.position, i); b.applyBoneTransform(i, v); if (!Number.isFinite(v.x + v.y + v.z)) return null; bb.expandByPoint(v); }
  return bb;
}

for (const female of [false, true]) {
  const rig = female ? 'vrouw' : 'man';
  for (let s = 0; s < 12; s++) {
    const seed = 1000 + s * 37;
    const m = M.buildModularPerson(seed, { female, skin: 0xa8754f, shirt: 0x3f6ea8 });
    const ud = m.userData;
    let meshes = 0; m.traverse((o) => { if (o.isMesh) meshes++; });
    ok(meshes === 1 && ud.body.isSkinnedMesh && ud.body.skeleton.bones.length === 22, `${rig} ${seed}: één SkinnedMesh met 22 botten`);
    const rest = inBox(m);
    ok(rest && rest.max.y > 1.55 && rest.max.y < 2.05 && rest.min.y > -0.05 && Math.max(-rest.min.x, rest.max.x, -rest.min.z, rest.max.z) < 0.8, `${rig} ${seed}: in rust binnen de doos (${rest && rest.max.y.toFixed(2)} m hoog)`);
    for (let f = 0; f < 90; f++) P.animatePersonWalk(m, f < 45 ? 1.4 : 5, 1 / 60);
    const run = inBox(m);
    ok(run && run.max.y < 2.1 && run.min.y > -0.15 && Math.max(-run.min.x, run.max.x, -run.min.z, run.max.z) < 1.1, `${rig} ${seed}: lopend en rennend binnen de doos`);
    ok(ud.footN > 0, `${rig} ${seed}: hielcontacten voor de stapgeluiden`);
    const t0 = tris(m);
    M.setModularLod(m, 1); const t1 = tris(m);
    M.setModularLod(m, 2); const t2 = tris(m);
    ok(t1 <= t0 * 0.6 + 1 && t2 <= t0 * 0.3 + 1, `${rig} ${seed}: LOD 1 en 2 minstens 40% en 70% minder (${t0} -> ${t1} -> ${t2})`);
    ok(inBox(m) !== null, `${rig} ${seed}: LOD 2 eindig`);
  }
}

// zelfde zaad = zelfde mens; ander zaad meestal anders
{
  const a = M.modularLook(77, {}), b = M.modularLook(77, {}), c = M.modularLook(78, {});
  ok(JSON.stringify(a) === JSON.stringify(b), 'deterministisch per zaad');
  ok(JSON.stringify(a) !== JSON.stringify(c), 'ander zaad, andere look');
  const fem = new Set(), parts = new Set();
  for (let i = 0; i < 200; i++) { const l = M.modularLook(i * 3.7, {}); fem.add(l.rig); parts.add(l.parts.hoofd); }
  ok(fem.size === 2 && parts.size >= 8, `man en vrouw, en ${parts.size} verschillende hoofden in 200 zaden`);
}

// verwijzingen: LOD-wissels tellen de gedeelde geometrie op en af
{
  const m = M.buildModularPerson(5, { female: false });
  const g0 = m.userData.body.geometry, r0 = g0.userData.personRefs;
  M.setModularLod(m, 1);
  ok(g0.userData.personRefs === r0 - 1 && m.userData.body.geometry.userData.personRefs >= 1, 'LOD-wissel telt af en op');
  ok(!M.setModularLod(m, 1), 'hetzelfde niveau doet niets');
  ok(M.lodForDistance(10, 0) === 0 && M.lodForDistance(20, 0) === 1 && M.lodForDistance(60, 1) === 2 && M.lodForDistance(14.5, 1) === 1 && M.lodForDistance(12, 1) === 0, 'LOD op afstand met marge');
}

// voeten op de grond: de voet op de tree komt mee omhoog, het been blijft heel (knie-enkel even lang)
{
  const m = M.buildModularPerson(4242, { female: true });
  for (let f = 0; f < 60; f++) P.animatePersonWalk(m, 0, 1 / 60);
  m.updateMatrixWorld(true);
  const B = m.userData.qBones, I = m.userData.qIdx;
  const w = (i) => B[i].getWorldPosition(new THREE.Vector3());
  const before = [w(I.footL), w(I.footR)], shin = [w(I.loL).distanceTo(before[0]), w(I.loR).distanceTo(before[1])];
  const side = before[0].z > before[1].z ? 0 : 1;
  const ground = (x, z) => (z > (before[0].z + before[1].z) / 2 ? 0.12 : 0);
  ok(P.plantFeet(m, ground, 1), 'plantFeet gaat via de modulaire weg');
  m.updateMatrixWorld(true);
  const after = [w(I.footL), w(I.footR)];
  ok(Math.abs(after[side].y - before[side].y - 0.12) < 0.01, `de voet op de tree stijgt 12 cm (${(after[side].y - before[side].y).toFixed(3)})`);
  ok(Math.abs(after[1 - side].y - before[1 - side].y) < 0.01, 'de andere voet blijft staan');
  ok(Math.abs(w(I.loL).distanceTo(after[0]) - shin[0]) < 0.005 && Math.abs(w(I.loR).distanceTo(after[1]) - shin[1]) < 0.005, 'het onderbeen blijft even lang (geen losse voet)');
  ok(!P.plantFeet(m, () => 0, 1) || true, 'vlak: geen fout');
}

// maten (eis eigenaar 23-11): lengte tot de kruin, ooghoogte, schouders, en of een stoel van 0,45 m en een deur van 2,05 m passen
{
  const { measure } = await import('./people/mensen_maten.mjs');
  const NORM = { man: [1.75, 1.85], vrouw: [1.65, 1.72] };
  for (const female of [false, true]) {
    const rig = female ? 'vrouw' : 'man';
    let lo = 9, hi = 0, eyeMin = 9, eyeMax = 0, knee = 0, sh = 0, bad = 0;
    for (let i = 0; i < 40; i++) {
      const m = M.buildModularPerson(i * 13.7 + 2, { female });
      const r = measure(m);
      lo = Math.min(lo, r.lengte); hi = Math.max(hi, r.lengte);
      if (Number.isFinite(r.oog)) { eyeMin = Math.min(eyeMin, r.oog); eyeMax = Math.max(eyeMax, r.oog); }
      if (r.lengte < NORM[rig][0] - 0.005 || r.lengte > NORM[rig][1] + 0.005) bad++;
      const k = new THREE.Vector3(); m.userData.qBones[m.userData.qIdx.loL].getWorldPosition(k); knee = Math.max(knee, k.y);
      sh = Math.max(sh, r.schouder);
    }
    ok(bad === 0, `${rig}: lengte binnen ${NORM[rig].join('-')} m (gemeten ${lo.toFixed(3)}-${hi.toFixed(3)})`);
    if (!female) ok(eyeMin > 1.55 && eyeMax < 1.72, `${rig}: ooghoogte rond 1,62 m (${eyeMin.toFixed(3)}-${eyeMax.toFixed(3)})`);
    ok(knee > 0.4 && knee < 0.6, `${rig}: kniehoogte ${knee.toFixed(2)} m past bij een zitting van 0,45 m`);
    ok(hi < 2.05 - 0.1, `${rig}: past onder een deur van 2,05 m`);
    ok(sh > 0.38 && sh < 0.6, `${rig}: schouders ${sh.toFixed(2)} m`);
  }
}

// CPU: animatie per mens per beeld
{
  const crowd = []; for (let i = 0; i < 40; i++) crowd.push(M.buildModularPerson(i * 11, {}));
  for (let f = 0; f < 60; f++) for (const m of crowd) P.animatePersonWalk(m, 1.4, 1 / 60);
  const t = performance.now();
  for (let f = 0; f < 300; f++) for (const m of crowd) P.animatePersonWalk(m, f % 120 < 60 ? 1.4 : 4.5, 1 / 60);
  const us = (performance.now() - t) * 1000 / (300 * crowd.length);
  console.log(`modulaire mens: ${us.toFixed(1)} µs animatie per mens per beeld`);
  ok(us < 60, 'animatie blijft goedkoop');
}

console.log(fails ? `${fails} van ${n} FAILED` : `modularpeople: alle ${n} checks groen`);
process.exit(fails ? 1 : 0);
