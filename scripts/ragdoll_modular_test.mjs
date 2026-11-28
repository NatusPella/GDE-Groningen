// Ragdoll op de modulaire mensen (#1350): de deeltjes sturen de 22 echte botten (ragdollmodular.js). Geen sprong bij het neergaan, geen
// bot dat explodeert of door de grond zakt, de lengtes van de ledematen blijven, opstaan eindigt rechtop met een overgang naar de animatie.
//   node scripts/ragdoll_modular_test.mjs
import './node3d.mjs';
import fs from 'node:fs';
const THREE = await import('three');
const M = await import('../game/js/modularpeople.js');
const P = await import('../game/js/models3d_people.js');
const R = await import('../game/js/ragdoll.js');
for (const r of ['man', 'vrouw']) M.registerModularRig(r, JSON.parse(fs.readFileSync(new URL(`../game/models/mensen/${r}.json`, import.meta.url))), fs.readFileSync(new URL(`../game/models/mensen/${r}.bin`, import.meta.url)));
P.setModularPlayerLooks(true);

let fails = 0, n = 0;
const ok = (c, msg) => { n++; if (!c) { fails++; console.log('FAIL', msg); } };
const v = new THREE.Vector3();
const wp = (m, name) => { m.updateMatrixWorld(true); return m.userData.qBones[m.userData.qIdxBy[name]].getWorldPosition(new THREE.Vector3()); };
const lowest = (m) => { m.updateMatrixWorld(true); const b = m.userData.body, g = b.geometry; let lo = 1e9, hi = -1e9, bad = 0; for (let i = 0; i < g.attributes.position.count; i += 5) { v.fromBufferAttribute(g.attributes.position, i); b.applyBoneTransform(i, v); if (!Number.isFinite(v.x + v.y + v.z)) bad++; lo = Math.min(lo, v.y); hi = Math.max(hi, v.y); } return { lo, hi, bad }; };
const LIMBS = [['UpperArmL', 'LowerArmL'], ['LowerArmL', 'WristL'], ['UpperArmR', 'LowerArmR'], ['UpperLegL', 'LowerLegL'], ['UpperLegR', 'LowerLegR']];

for (const female of [false, true]) for (const kind of ['hit', 'shot', 'blast']) {
  const tag = `${female ? 'vrouw' : 'man'} ${kind}`;
  const m = P.buildPersonMesh(0x3f6ea8, 0xd9a47a, { seed: 77 + (female ? 1 : 0), variant: female ? 'female' : 'male', role: 'voetganger' });
  ok(m.userData.qRig, `${tag}: modulair`);
  const world = { time: 0, map: null, vehicles: [], pedestrians: [], particles: [] };
  const actor = { x: 10, y: 5, angle: 0.7, state: 'alive', speed: 0, gz: 0 };
  m.position.set(actor.x, 0, actor.y); m.rotation.y = -actor.angle;
  for (let f = 0; f < 40; f++) P.animatePersonWalk(m, 0, 1 / 30);
  m.updateMatrixWorld(true);
  const rest = LIMBS.map(([a, b]) => wp(m, a).distanceTo(wp(m, b)));
  const headBefore = wp(m, 'Head');
  R.knockDown(actor, world, { kind, vx: 3.2 * Math.cos(actor.angle), vy: 3.2 * Math.sin(actor.angle), vz: kind === 'blast' ? 5 : 1.5, lieFor: 1.2 });
  let maxJump = 0, prev = headBefore.clone(), minHead = 9, driven = false, finishedAt = -1, sawLie = false;
  for (let f = 0; f < 60 * 14; f++) {
    world.time += 1 / 60;
    const d = R.driveRagdoll(actor, m, world, 1 / 60);
    if (!d) { finishedAt = f; break; }
    driven = true;
    const h = wp(m, 'Head');
    if (f < 3) maxJump = Math.max(maxJump, h.distanceTo(headBefore));
    minHead = Math.min(minHead, h.y);
    const bb = lowest(m);
    ok(bb.bad === 0, `${tag} f${f}: eindige hoekpunten`);
    ok(bb.lo > -0.12, `${tag} f${f}: niet door de grond (${bb.lo.toFixed(2)})`);
    ok(bb.hi < 4, `${tag} f${f}: niet de lucht in (${bb.hi.toFixed(2)})`);
    if (f % 20 === 0) LIMBS.forEach(([a, b], i) => ok(Math.abs(wp(m, a).distanceTo(wp(m, b)) - rest[i]) < 0.08 * m.scale.y + 0.02, `${tag} f${f}: ${a}-${b} behoudt zijn lengte`));
    if (R.isKnockedDown(actor, world) && wp(m, 'Head').y < 0.45 && wp(m, 'Hips').y < 0.4) sawLie = true;
    prev = h;
  }
  ok(driven, `${tag}: de ragdoll stuurt de mens`);
  ok(maxJump < 0.45, `${tag}: geen sprong bij het neergaan (${maxJump.toFixed(2)} m)`);
  ok(sawLie, `${tag}: de mens ligt op de grond (laagste kop ${minHead.toFixed(2)})`);
  ok(finishedAt > 0, `${tag}: staat weer op (frame ${finishedAt})`);
  ok(!actor.ragdoll, `${tag}: ragdoll weg`);
  // na het opstaan: de animatie mengt vanuit de pose, rechtop en eindig
  ok(!!m.userData.qBlendFrom, `${tag}: overgang naar de animatie`);
  for (let f = 0; f < 30; f++) { m.position.set(actor.x, 0, actor.y); m.rotation.y = -actor.angle; P.animatePersonWalk(m, 0, 1 / 60); if (f === 0) { const h = wp(m, 'Head').y / m.scale.y; ok(h > 1.35, `${tag}: eerste animatieframe rechtop (${h.toFixed(2)})`); } }
  const hh = wp(m, 'Head').y / m.scale.y, bb = lowest(m);
  ok(hh > 1.35 && hh < 1.9, `${tag}: na de overgang rechtop (${hh.toFixed(2)})`);
  ok(bb.bad === 0 && bb.lo > -0.05, `${tag}: na de overgang eindig en op de grond (${bb.lo.toFixed(2)})`);
  ok(!m.userData.qBlendFrom, `${tag}: overgang klaar`);
}
console.log(`${n} controles, ${fails} fouten`);
process.exit(fails ? 1 : 0);
