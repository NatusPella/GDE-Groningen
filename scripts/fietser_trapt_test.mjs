// Fietsers van anderen (verkeer, straat) trappen (#1337): hun modulaire rijder zit op het zadel en de voeten volgen de trappers,
// die met de wielen meedraaien (vooruit: de voet onderaan gaat naar achteren). Voor elke stijl fiets en voor beide rijders.
//   node scripts/fietser_trapt_test.mjs
import './node3d.mjs';
const THREE = await import('three');
await import('../game/js/player.js');
const fs = await import('node:fs');
const M = await import('../game/js/modularpeople.js');
for (const r of ['man', 'vrouw']) M.registerModularRig(r, JSON.parse(fs.readFileSync(new URL(`../game/models/mensen/${r}.json`, import.meta.url))), fs.readFileSync(new URL(`../game/models/mensen/${r}.bin`, import.meta.url)));
const P = await import('../game/js/models3d_people.js');
P.setModularPlayerLooks(true);
const { buildVehicleMesh, updateVehicleWheelSpin } = await import('../game/js/models3d_vehicles.js');
const { syncBikeRiderPedals, vehicleSeat } = await import('../game/js/seating3d.js');
let n = 0, bad = 0;
const ok = (c, name, info = '') => { n++; if (!c) { bad++; console.log(`FAIL ${name}${info ? ' (' + info + ')' : ''}`); } };
const wrap = (d) => Math.atan2(Math.sin(d), Math.cos(d));
const modellen = { stad: { name: 'bike', len: 1.75, wid: 0.5 }, race: { name: 'bike', stijl: 'race', len: 1.75, wid: 0.5 }, mtb: { name: 'bike', stijl: 'mtb', len: 1.75, wid: 0.5 }, bak: { name: 'bike', cargo: true, len: 2.55, wid: 0.72 } };
for (const [naam, base] of Object.entries(modellen)) for (const id of [3, 4, 5, 6]) {
  const v = { id, health: 100, x: 0, y: 0, angle: 0, speed: 0, isBike: true, road: {}, model: { ...base, color: '#1c1c1c', rider: '#2f5c8a' } };
  const mesh = buildVehicleMesh(v);
  const bb = vehicleSeat(v, true).bb;
  const rider = mesh.userData.riderMesh || mesh.children.find((c) => c.userData && c.userData.qRig);
  ok(rider && rider.userData.qRig, `${naam}#${id}: de fietser is een modulaire mens`);
  if (!rider || !rider.userData.qRig) continue;
  const ud = rider.userData;
  const foot = () => { mesh.updateMatrixWorld(true); return ud.qBones[ud.qIdx.footL].getWorldPosition(new THREE.Vector3()); };
  let t = 0;
  const stap = (speed, k) => { v.speed = speed; for (let i = 0; i < k; i++) { t += 1 / 60; updateVehicleWheelSpin(mesh, speed, 1 / 60); if (!syncBikeRiderPedals(mesh, v, t)) ok(false, `${naam}#${id}: fietser gezet`); } };
  stap(0, 90);
  const f0 = foot().clone(); stap(0, 20);
  ok(foot().distanceTo(f0) < 0.005, `${naam}#${id}: stilstaand blijven de voeten staan`);
  const ang = () => { const f = foot(); return Math.atan2(f.x - bb.x, -(f.y - bb.y - 0.07)); };
  const a0 = ang(); stap(4, 12);
  ok(wrap(ang() - a0) < -0.2, `${naam}#${id}: vooruit rijden beweegt de voet (achterwaarts onderaan)`, (wrap(ang() - a0)).toFixed(2));
  ok(foot().distanceTo(new THREE.Vector3(bb.x + 0.17 * Math.sin(ang()), bb.y + 0.07 - 0.17 * Math.cos(ang()), -bb.z)) < 0.12, `${naam}#${id}: de voet staat op het pedaal`);
  // de kruk draait mee met de voeten
  const c0 = mesh.userData.crank.rotation.z; stap(4, 12);
  ok(Math.abs(wrap(mesh.userData.crank.rotation.z - c0)) > 0.2, `${naam}#${id}: de kruk draait mee`);
  // geen fietser (afgeworpen: onzichtbaar) of geen fiets: niets gezet
  rider.visible = false; ok(syncBikeRiderPedals(mesh, v, t) === false, `${naam}#${id}: een afgeworpen fietser wordt niet gezet`); rider.visible = true;
}
console.log(bad ? `fietser_trapt_test: ${bad} van ${n} mislukt` : `fietser_trapt_test: alles goed (${n} controles)`);
process.exit(bad ? 1 : 0);
