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
    ok(meshes === 1 && ud.body.isSkinnedMesh && ud.body.skeleton.bones.length === 24 && ud.qBones.length === 22, `${rig} ${seed}: één SkinnedMesh met 22 botten plus mond en ooglid`);
    ok(ud.mouth && ud.lids && ud.mouth.scale.y === 0 && ud.lids.scale.y === 0, `${rig} ${seed}: mond dicht en ogen open bij het bouwen`);
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

// een Groningse straat: opvallende stijlen zeldzaam, ouderen en natuurlijk haar
{
  const N2 = 3000, count = {};
  let old = 0, natural = 0;
  for (let i = 0; i < N2; i++) {
    const l = M.modularLook(i * 1.37 + 0.5, {});
    for (const s of ['hoofd', 'romp']) count[l.parts[s]] = (count[l.parts[s]] || 0) + 1;
    if (l.old) old++;
    if (![0x2f6f8a, 0x8a2f6f, 0xc9694a].includes(l.hair)) natural++;   // de geverfde kleuren van modularpeople.js
  }
  const share = (id) => (count[id] || 0) / N2;
  ok(share('Punk_Head') < 0.03 && share('Farmer_Head') < 0.03, `hanenkam ${(share('Punk_Head') * 100).toFixed(1)}% en cowboyhoed ${(share('Farmer_Head') * 100).toFixed(1)}% zijn zeldzaam`);
  ok(share('Punk_Body') < 0.03 && share('Farmer_Body') < 0.03, 'punkleer en tuinbroek zijn zeldzaam');
  ok(old / N2 > 0.15 && old / N2 < 0.25, `ongeveer een op de vijf is ouder (${(100 * old / N2).toFixed(0)}%)`);
  ok(natural / N2 > 0.97, `haar is bijna altijd natuurlijk (${(100 * natural / N2).toFixed(1)}%)`);
}

// verwijzingen: LOD-wissels tellen de gedeelde geometrie op en af
{
  const m = M.buildModularPerson(5, { female: false });
  const g0 = m.userData.body.geometry, r0 = g0.userData.personRefs;
  M.setModularLod(m, 1);
  ok(g0.userData.personRefs === r0 - 1 && m.userData.body.geometry.userData.personRefs >= 1, 'LOD-wissel telt af en op');
  ok(!M.setModularLod(m, 1), 'hetzelfde niveau doet niets');
  ok(M.lodForDistance(20, 0) === 0 && M.lodForDistance(30, 0) === 1 && M.lodForDistance(70, 1) === 2 && M.lodForDistance(24.5, 1) === 1 && M.lodForDistance(22, 1) === 1 && M.lodForDistance(20, 1) === 0 && M.lodForDistance(200, 2) === 2, 'LOD op afstand met 4 m hysterese (25 en 60 m, de soort person van het centrale register lodregistry.js)');
  const LR = await import('../game/js/lodregistry.js');
  M.registerModularLods(LR.registerLodModel);
  const mine = LR.lodModels().filter((x) => /^modulair:/.test(x.name));
  ok(mine.length === 8 && LR.auditLod(mine).length === 0, `het centrale register keurt de 8 modulaire mensen (${JSON.stringify(LR.auditLod(mine)).slice(0, 120)})`);
  M.setModularLodPreset('laag'); ok(M.lodForDistance(20, 0) === 1 && M.lodForDistance(40, 1) === 2, 'een lichtere grafische stand wisselt eerder (laag: 15 en 36 m)'); M.setModularLodPreset('hoog');
  const reg = []; ok(M.registerModularLods((k, nm, t) => reg.push({ k, nm, t })) === 8 && reg.every((r) => r.k === 'person' && 1 - r.t[1] / r.t[0] >= 0.35 && 1 - r.t[2] / r.t[0] >= 0.6), 'registerModularLods: 8 mensen, elk binnen de minCut van de soort person (35% en 60%)');
  M.setModularLodPolicy((d) => (d > 100 ? 2 : 0)); ok(M.lodForDistance(120, 0) === 2 && M.lodForDistance(30, 0) === 0, 'een beleid van het centrale register wint'); M.setModularLodPolicy(null);
}

// grijphand: alleen de vingers verschuiven (naar de pols toe gekruld, geen spies), wisselen telt netjes, LOD houdt een open hand,
// en zitten aan het stuur of op de fiets sluit de handen; uitstappen opent ze weer
for (const female of [false, true]) {
  const m = M.buildModularPerson(77, { female });
  const ud = m.userData, man = ud.qRig.man;
  ok(man.grip > 100, `${ud.qLook.rig}: grijpvariant in de import (${man.grip} vertices)`);
  const wrist = ['WristL', 'WristR'].map((nm) => new THREE.Vector3().setFromMatrixPosition(new THREE.Matrix4().fromArray(man.bones.find((b) => b.name === nm).inv).invert()));
  const open = ud.body.geometry;
  const g0 = open.userData.personRefs;
  ok(M.setModularGrip(m, true) && !M.setModularGrip(m, true), 'setModularGrip wisselt alleen als het verandert');
  const shut = ud.body.geometry;
  ok(shut !== open && open.userData.personRefs === g0 - 1 && shut.userData.personRefs >= 1 && shut.attributes.position.count === open.attributes.position.count, 'grijpgeometrie: zelfde vertices, verwijzingen kloppen');
  const A = open.attributes.position, B = shut.attributes.position, a = new THREE.Vector3(), b = new THREE.Vector3();
  // per hand: de verschoven vertices liggen bij de pols, de hand wordt korter (de toppen komen omhoog naar de palm) en geen
  // vertex steekt buiten de open hand (plus 2 cm): een vuist, geen spies en geen vingers naar de rug van de hand
  let moved = 0, far = 0;
  const hb = [0, 1].map(() => ({ open: new THREE.Box3(), shut: new THREE.Box3() }));
  for (let i = 0; i < A.count; i++) {
    a.fromBufferAttribute(A, i); b.fromBufferAttribute(B, i);
    if (a.distanceTo(b) < 0.002) continue;
    moved++;
    const k = a.distanceTo(wrist[0]) < a.distanceTo(wrist[1]) ? 0 : 1;
    if (a.distanceTo(wrist[k]) > 0.32) far++;
    hb[k].open.expandByPoint(a); hb[k].shut.expandByPoint(b);
  }
  const rise = hb.map((h) => h.shut.min.y - h.open.min.y), inside = hb.every((h) => h.open.clone().expandByScalar(0.02).containsBox(h.shut));
  ok(moved > 60 && far === 0 && rise.every((r) => r > 0.06) && inside, `${ud.qLook.rig}: alleen de vingers sluiten tot een vuist (${moved} verschoven, toppen ${rise.map((r) => (r * 100).toFixed(1)).join(' en ')} cm omhoog, binnen de open hand ${inside})`);
  M.setModularLod(m, 1);
  ok(ud.body.geometry.attributes.position.count < A.count, 'LOD 1 met grijphand blijft het lichte niveau');
  M.setModularLod(m, 0);
  ok(ud.body.geometry === shut, 'terug naar LOD 0: weer de grijphand');
  M.setModularGrip(m, false);
  ok(ud.body.geometry === open, 'open hand is weer de gewone geometrie');
  const wheelSeat = { x: 0, y: 0.5, z: 0, pose: { arms: 'wheel', footY: -0.3 } };
  M.seatModular(m, wheelSeat, 1); M.seatModular(m, wheelSeat, 1.02);
  ok(ud.qGrip === true, 'aan het stuur: handen dicht');
  M.animateModular(m, 1.4, 1 / 60);
  ok(ud.qGrip === false, 'uitgestapt en lopen: handen open');
  M.seatModular(m, { x: 0, y: 0.5, z: 0, pose: { arms: 'lap' } }, 2);
  ok(!ud.qGrip, 'passagier: handen open');
}

// verre menigte: gebakken poses (lichtste LOD, geen huid) in instances; een draw call per variant en fase
{
  const g = M.bakeModularPose(7000, { female: false }, 'Walk', 0.1, 2);
  g.computeBoundingBox();
  const bb = g.boundingBox, pos = g.attributes.position.array;
  ok(!g.attributes.skinIndex && pos.every(Number.isFinite) && bb.max.y > 1.6 && bb.max.y < 2 && bb.min.y > -0.08 && bb.min.y < 0.08, `gebakken pose: vast, zonder huid, een mens van ${bb.max.y.toFixed(2)} m op de grond`);
  const g2 = M.bakeModularPose(7000, { female: false }, 'Walk', 0.6, 2);
  let diff = 0; for (let i = 0; i < pos.length; i++) diff = Math.max(diff, Math.abs(pos[i] - g2.attributes.position.array[i]));
  ok(diff > 0.1, `twee loopfasen verschillen (benen ${diff.toFixed(2)} m)`);
  const FC = await import('../game/js/farcrowd3d.js');
  const scene = new THREE.Scene(), fc = FC.createFarCrowd(scene);
  ok(fc.ready && FC.FAR_CROWD_FROM === 75 && FC.FAR_CROWD_BACK < FC.FAR_CROWD_FROM, `verre menigte klaar, vanaf ${FC.FAR_CROWD_FROM} m (de tweede LOD-grens van person plus 15 m)`);
  fc.begin(); for (let i = 0; i < 300; i++) fc.add(i, 0, 0, i * 0.1, i * 13, i % 2 === 1); fc.end(0.3);
  let ims = 0, drawn = 0; scene.traverse((o) => { if (o.isInstancedMesh) { ims++; drawn += o.count; } });
  ok(ims === 2 * FC.VARIANTS * 2 && drawn === 300 && fc.total() === 300, `300 verre lopers in ${ims} instanced meshes (${drawn} getekend)`);
  fc.dispose(); let left = 0; scene.traverse((o) => { if (o.isInstancedMesh) left++; }); ok(left === 0, 'opruimen haalt alles uit de scène');
}

// wapens en aanvallen op het nieuwe model: het wapen in de rechterhand (vuist), richten tilt de hand naar voren op schouderhoogte, een
// schot en een stoot bewegen de arm; dragen brengt beide handen naar de last
{
  const m = M.buildModularPerson(321, { female: false });
  const ud = m.userData, wr = (n) => ud.qBones[ud.qIdxBy[n]].getWorldPosition(new THREE.Vector3());
  for (let f = 0; f < 30; f++) P.animatePersonWalk(m, 0, 1 / 60);
  m.updateMatrixWorld(true);
  const rest = wr('WristR');
  P.setHeldWeapon(m, 'pistol');
  m.updateMatrixWorld(true);
  const gun = ud.guns && ud.guns.pistol, gp = gun && gun.getWorldPosition(new THREE.Vector3()), gs = gun && gun.getWorldScale(new THREE.Vector3());
  ok(gun && ud.muzzle && gp.distanceTo(rest) < 0.15 && Math.abs(gs.x - m.scale.x) < 0.02 && ud.qGrip, `pistool in de rechterhand (${gp && (gp.distanceTo(rest) * 100).toFixed(0)} cm van de pols, schaal ${gs && gs.x.toFixed(2)}), hand dicht`);
  for (let f = 0; f < 3; f++) P.animatePersonWalk(m, 0, 1 / 60);
  ok(ud.qGrip, 'met een wapen blijft de hand dicht (ook bij lopen)');
  P.applyAttackPose(m, null, 10, 'pistol');
  const aim = wr('WristR'), tip = ud.muzzle.getWorldPosition(new THREE.Vector3());
  ok(aim.y > 1.25 && aim.x > rest.x + 0.25 && tip.x > aim.x, `richten: pols naar voren en omhoog (${aim.x.toFixed(2)}, ${aim.y.toFixed(2)}), de loop wijst vooruit (${tip.x.toFixed(2)})`);
  for (let f = 0; f < 2; f++) P.animatePersonWalk(m, 0, 1 / 60);
  const before = wr('WristR');
  P.applyAttackPose(m, { type: 'melee', start: 10, side: 1 }, 10.1, null);
  ok(wr('WristR').distanceTo(before) > 0.08, 'een stoot beweegt de hand');
  P.setHeldWeapon(m, null);
  ok(!ud.guns.pistol.visible, 'wapen weg');
  P.animatePersonWalk(m, 0, 1 / 60);
  ok(!ud.qGrip, 'zonder wapen gaat de hand weer open');
  P.carryOverlay(m);
  const L = wr('WristL'), R = wr('WristR');
  ok(L.x > 0.25 && R.x > 0.25 && L.y > 0.85 && R.y > 0.85 && L.z < 0 && R.z > 0, `dragen: beide handen voor de borst (L ${L.x.toFixed(2)},${L.y.toFixed(2)} R ${R.x.toFixed(2)},${R.y.toFixed(2)})`);
}

// blik en oude houdingen: een blik opzij draait het hoofd (in Electron gevonden: ReferenceError in animateModular), en code die nog
// houdingen op de botten van het eigen model zet (ud.armR.rotation, ud.head) breekt niets op het nieuwe model
{
  const m = M.buildModularPerson(99, { female: true });
  const ud = m.userData, head = ud.qBones[ud.qIdx.head];
  for (let f = 0; f < 5; f++) M.animateModular(m, 0, 1 / 60);
  const q0 = head.getWorldQuaternion(new THREE.Quaternion());
  let threw = null;
  try { ud.gazeT = 0.6; for (let f = 0; f < 40; f++) M.animateModular(m, 0, 1 / 30); } catch (e) { threw = e.message; }
  m.updateMatrixWorld(true);
  ok(!threw && head.getWorldQuaternion(new THREE.Quaternion()).angleTo(q0) > 0.2, `blik opzij draait het hoofd (${threw || 'geen fout'})`);
  threw = null;
  try { ud.armR.rotation.set(0.1, 0, 2.2); ud.elbowL.rotation.z = 1.2; ud.head.rotation.y = 0.3; ud.pelvis.position.y = 0.9; ud.chest.rotation.z = -0.1; P.swimPose(m, 1, true); P.seatPose(m); } catch (e) { threw = e.message; }
  ok(!threw && ud.qAlias && ud.elbowR.parent === ud.qBones[ud.qIdxBy.LowerArmR], `oude houdingen op het nieuwe model: geen fout (${threw || 'ok'}), houders aan de echte botten`);
}

// eerste-persoonhanden: de echte onderarm met gesloten hand van Tammo en Anita, van ver naar dichtbij gesorteerd
{
  const { TAMMO_APPEARANCE, ANITA_APPEARANCE } = P;
  for (const [nm, app] of [['Tammo', TAMMO_APPEARANCE], ['Anita', ANITA_APPEARANCE]]) {
    const look = M.modularLookFromAppearance(app);
    for (const side of ['R', 'L']) {
      const g = look && M.bakeModularForearm(look, side);
      const p = g && g.attributes.position.array;
      if (!p) { ok(false, `${nm} ${side}: onderarm gebakken`); continue; }
      g.computeBoundingBox();
      const bb = g.boundingBox, n = p.length / 9;
      let sorted = true; for (let t = 1; t < n; t++) if (p[t * 9 + 2] + p[t * 9 + 5] + p[t * 9 + 8] < p[t * 9 - 7] + p[t * 9 - 4] + p[t * 9 - 1] - 1e-6) { sorted = false; break; }
      ok(n > 60 && p.every(Number.isFinite) && bb.min.z < -0.06 && bb.min.z > -0.2 && bb.max.z > 0.15 && bb.max.z < 0.4 && bb.max.x - bb.min.x < 0.16 && sorted,
        `${nm} ${side}: onderarm met vuist (${n} drh, vingers tot ${(-bb.min.z * 100).toFixed(0)} cm voor de pols, arm ${(bb.max.z * 100).toFixed(0)} cm erachter, ${((bb.max.x - bb.min.x) * 100).toFixed(0)} cm breed, gesorteerd ${sorted})`);
    }
  }
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
  const NORM = { man: [1.70, 1.88], vrouw: [1.60, 1.74] };   // lengte uit het zaad (personSize): ouders en kinderen daargelaten, een gewone Nederlandse straat
  for (const female of [false, true]) {
    const rig = female ? 'vrouw' : 'man';
    let lo = 9, hi = 0, eyeMin = 9, eyeMax = 0, knee = 0, sh = 0, bad = 0;
    for (let i = 0; i < 40; i++) {
      const m = M.buildModularPerson(i * 13.7 + 2, { female, old: false });
      const r = measure(m);
      lo = Math.min(lo, r.lengte); hi = Math.max(hi, r.lengte);
      if (Number.isFinite(r.oog)) { eyeMin = Math.min(eyeMin, r.oog); eyeMax = Math.max(eyeMax, r.oog); }
      if (r.lengte < NORM[rig][0] - 0.005 || r.lengte > NORM[rig][1] + 0.005) bad++;
      const k = new THREE.Vector3(); m.userData.qBones[m.userData.qIdx.loL].getWorldPosition(k); knee = Math.max(knee, k.y);
      sh = Math.max(sh, r.schouder);
    }
    ok(bad === 0, `${rig}: lengte binnen ${NORM[rig].join('-')} m (gemeten ${lo.toFixed(3)}-${hi.toFixed(3)})`);
    if (!female) ok(eyeMin > 1.50 && eyeMax < 1.75, `${rig}: ooghoogte rond 1,62 m (${eyeMin.toFixed(3)}-${eyeMax.toFixed(3)})`);
    ok(knee > 0.4 && knee < 0.6, `${rig}: kniehoogte ${knee.toFixed(2)} m past bij een zitting van 0,45 m`);
    ok(hi < 2.05 - 0.1, `${rig}: past onder een deur van 2,05 m`);
    ok(sh > 0.38 && sh < 0.6, `${rig}: schouders ${sh.toFixed(2)} m`);
  }
}

// de clips uit de Universal Animation Library: elke clip van elke state bestaat en houdt de mens heel (geen ledemaat de wereld in)
{
  for (const female of [false, true]) {
    const m = M.buildModularPerson(31, { female });
    for (const [state, list] of Object.entries(M.STATE_CLIPS)) {
      if (!list) continue;
      for (const c of list) {
        const who = female ? 'vrouw' : 'man';
        ok(M.modularClipNames(m).includes(c), `${who}: clip ${c} voor ${state}`);
        for (const u of [0, 0.33, 0.66, 0.99]) {
          M.poseModularClip(m, c, u);
          const bb = inBox(m);
          ok(bb && bb.max.y < 2.2 && bb.min.y > (state === 'swim' ? -1.5 : -0.4) && Math.max(-bb.min.x, bb.max.x, -bb.min.z, bb.max.z) < 2.2, `${who}: ${c} op ${u} binnen de doos`);
        }
      }
    }
    // states via de machine: zitten, rijden, zwemmen en een val, elk met een clip en eindig
    const { stateName } = await import('../game/js/animstate.js');
    for (const [params, want] of [[{ seated: true }, 'sit'], [{ vehicle: 'car' }, 'drive'], [{ water: true }, 'swim'], [{ knocked: true }, 'knockdown']]) {
      const p2 = M.buildModularPerson(77, { female });
      p2.userData.qParams = params;
      for (let f = 0; f < 150; f++) P.animatePersonWalk(p2, 0, 1 / 60);
      const name = stateName(p2.userData.qSM);
      ok(name === want, `${female ? 'vrouw' : 'man'}: ${JSON.stringify(params)} wordt ${want} (${name})`);
      ok(inBox(p2) !== null, `${want}: eindig`);
    }
  }
}

// cutscene-fase: vaste looks houden hun identiteit, animateActor stuurt een modulaire mens (lipsync, zitten, zwaaien)
{
  const A = await import('../game/js/actoranim.js');
  const C = await import('../game/js/storycast.js');
  const tammo = M.buildModularFromAppearance(P.TAMMO_APPEARANCE);
  ok(tammo && tammo.userData.qLook.cap === 'tammo' && tammo.userData.qLook.capColor === 0xc8621e && tammo.userData.qLook.rig === 'man', 'Tammo: man met zijn oranje pet');
  ok(tammo.userData.qLook.parts.romp === 'Casual_Body' && tammo.userData.qLook.parts.benen.startsWith('Casual') && tammo.userData.qLook.shirt === P.TAMMO_APPEARANCE.shirt, 'Tammo: jack met capuchon, spijkerbroek, zijn blauw');
  const tessa = M.buildModularFromAppearance(P.ANITA_APPEARANCE);
  ok(tessa && tessa.userData.qLook.rig === 'vrouw' && tessa.userData.qLook.shirt === P.ANITA_APPEARANCE.shirt && tessa.userData.qLook.parts.voeten !== 'Casual_Feet', 'Tessa: vrouw in haar rode jas met laarzen');
  const jelle = M.buildModularFromAppearance(C.JELLE_LOOK);
  ok(jelle && jelle.userData.qLook.parts.romp === 'Suit_Body' && jelle.userData.qLook.shirt === C.JELLE_LOOK.shirt && jelle.userData.qLook.hair === C.JELLE_LOOK.hair && jelle.scale.y > M.modularLook(1, { female: false }).scale * 0.99, 'Jelle: blauw colbert, blond, lang');
  const durk = M.buildModularFromAppearance(C.DURK_LOOK);
  ok(durk && durk.userData.qLook.cap === 'beanie', 'Durk: muts');
  let tris0 = 0; tammo.userData.body.geometry.index && (tris0 = tammo.userData.body.geometry.index.count / 3);
  const plain = M.buildModularPerson(11, { look: { ...tammo.userData.qLook, cap: null } });
  ok(tris0 > plain.userData.body.geometry.index.count / 3, 'de pet zit in dezelfde mesh (geen extra draw call)');
  // praten: de mond gaat open en dicht; stil: dicht
  let maxJ = 0, minJ = 1;
  for (let f = 0; f < 300; f++) { A.animateActor(tammo, { anim: "talk", speaking: true, dt: 1 / 60 }); maxJ = Math.max(maxJ, tammo.userData.mouth.scale.y); if (f > 30) minJ = Math.min(minJ, tammo.userData.mouth.scale.y); }
  ok(maxJ > 0.4 && minJ < 0.2, `lipsync: de kaak beweegt (max ${maxJ.toFixed(2)}, min ${minJ.toFixed(2)})`);
  for (let f = 0; f < 60; f++) A.animateActor(tammo, { anim: 'idle', dt: 1 / 60 });
  ok(tammo.userData.mouth.scale.y < 0.02, 'na het praten is de mond dicht');
  const { stateName } = await import('../game/js/animstate.js');
  for (let f = 0; f < 90; f++) A.animateActor(tessa, { anim: 'idle', seated: true, dt: 1 / 60 });
  ok(stateName(tessa.userData.qSM) === 'sit', 'aan tafel: de zit-state');
  ok(Math.abs(M.modularSeatContact(tessa) - 0.476 * tessa.scale.y) < 1e-9, 'zitvlak volgt de schaal');
  for (let f = 0; f < 60; f++) A.animateActor(jelle, { anim: 'wave', dt: 1 / 60 });
  ok(stateName(jelle.userData.qSM) === 'emote', 'zwaaien: emote');
  ok(A.animateActor(jelle, { verberg: true }) === true && jelle.visible === false, 'een dubbele rol verdwijnt');
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

// Samen spelen (samen-qa 24-11): in de spelerfase is ook de figuur van een medespeler een modulaire mens, gebouwd uit zijn
// kledingcode (coopspeler.js avatarLook). In twee vensters zag de gastheer de gast als het oude model, zonder zijn kleding.
{
  const SP = await import('../game/js/coopspeler.js'), C = await import('../game/js/clothing.js');
  const code = C.localOutfitCode();
  P.setModularPlayerLooks(true);
  const met = SP.avatarLook(SP.avatarVan({ avatar: { naam: 'Gast', outfit: code } }, 1));
  const m1 = P.buildPersonMesh(met.shirt, met.skin, met.opts);
  ok(!!m1.userData.qRig, 'medespeler met kledingcode: modulaire mens');
  const zonder = SP.avatarLook(SP.avatarVan({ avatar: { naam: 'Gast' } }, 2));
  const m2 = P.buildPersonMesh(zonder.shirt, zonder.skin, zonder.opts);
  ok(!!m2.userData.qRig, 'medespeler zonder kledingcode: modulaire mens');
  P.setModularPlayerLooks(false);
  const oud = P.buildPersonMesh(met.shirt, met.skin, met.opts);
  ok(!oud.userData.qRig, 'zonder spelerfase (?mensen=oud) het oude model');
}

// #1178 (hertest 24-11): Tessa zat in de lucht. seatPose (de bank in het flat) laat ud.qParams op zitten staan; wie daarna alleen
// animatePersonWalk aanroept, blijft zitten. De metgezel in scene3d.js zet daarom elke frame eigen parameters, net als de speler.
{
  const { stateName } = await import('../game/js/animstate.js');
  const m = M.buildModularPerson(4242, { female: true });
  for (let f = 0; f < 60; f++) P.seatPose(m);
  for (let f = 0; f < 120; f++) P.animatePersonWalk(m, 1.4, 1 / 60);
  ok(stateName(m.userData.qSM) === 'sit', 'na seatPose blijft een mens zonder eigen qParams zitten (de valkuil van #1178)');
  m.userData.qParams = { water: false, grounded: true, vy: 0, jump: false, seated: false, climbing: false };
  for (let f = 0; f < 120; f++) P.animatePersonWalk(m, 1.4, 1 / 60);
  ok(stateName(m.userData.qSM) !== 'sit', `met eigen qParams staat ze weer op (${stateName(m.userData.qSM)})`);
  const s3 = fs.readFileSync(new URL('../game/js/scene3d.js', import.meta.url), 'utf8');
  ok(/companionMesh\.userData\.qParams = qc;[\s\S]{0,80}animatePersonWalk\(companionMesh, Math\.hypot\(comp\.vx, comp\.vy\)/.test(s3), 'scene3d.js: de metgezel zet eigen qParams vóór het lopen (#1178)');
}

console.log(fails ? `${fails} van ${n} FAILED` : `modularpeople: alle ${n} checks groen`);
process.exit(fails ? 1 : 0);
