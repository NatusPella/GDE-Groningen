// Trapfase van modulaire fietsers (#1336): bij vooruit rijden (+x) gaat de voet onderaan de slag naar ACHTEREN en de
// kruk draait met de wielen mee (hoek neemt af); achteruit rollen draait terug; stilstaan laat de voeten staan.
//   node scripts/trapfase_richting_test.mjs
import './node3d.mjs';
const THREE = await import('three');
await import('../game/js/player.js');
const fs = await import('node:fs');
const M = await import('../game/js/modularpeople.js');
for (const r of ['man', 'vrouw']) M.registerModularRig(r, JSON.parse(fs.readFileSync(new URL(`../game/models/mensen/${r}.json`, import.meta.url))), fs.readFileSync(new URL(`../game/models/mensen/${r}.bin`, import.meta.url)));
const { buildVehicleMesh, updateVehicleWheelSpin } = await import('../game/js/models3d_vehicles.js');
const { vehicleSeat, placeSeatedLocal } = await import('../game/js/seating3d.js');
let n = 0, fouten = 0;
const ok = (c, t) => { n++; if (!c) { fouten++; console.log('FAIL ' + t); } };
for (const stijl of [undefined, 'race', 'mtb']) {
  const v = { id: 1, x: 0, y: 0, angle: 0, speed: 0, steer: 0, isBike: true, model: { name: 'bike', stijl, len: 1.75, wid: 0.5, color: '#1c1c1c' } };
  const mesh = buildVehicleMesh(v), seat = vehicleSeat(v, true), bb = seat.bb;
  const p = M.buildModularPerson(100, { female: false });
  p.userData.isPerson = true;
  const host = mesh.userData.body || mesh;
  host.userData.vehicleRef = v; host.add(p);
  const ud = p.userData, foot = () => { mesh.updateMatrixWorld(true); return ud.qBones[ud.qIdx.footL].getWorldPosition(new THREE.Vector3()); };
  // hoek van de linkervoet rond de trapas: 0 = onderaan, toenemend = naar voren omhoog
  const ang = () => { const f = foot(); return Math.atan2(f.x - bb.x, -(f.y - bb.y - 0.07)); };
  const stap = (speed, frames) => { v.speed = speed; for (let i = 0; i < frames; i++) { placeSeatedLocal(p, seat, (stap.t += 1 / 60)); updateVehicleWheelSpin(mesh, speed, 1 / 60); } };
  stap.t = 0;
  const wrap = (d) => Math.atan2(Math.sin(d), Math.cos(d));
  stap(0, 30);
  const a0 = ang(); stap(0, 30);
  ok(Math.abs(wrap(ang() - a0)) < 0.02, `${stijl}: stilstaan laat de voeten staan`);
  const c0 = mesh.userData.crank.rotation.z;
  const a1 = ang(); stap(4, 20);
  const dv = wrap(ang() - a1);
  ok(dv < -0.2, `${stijl}: vooruit rijden moet de voethoek laten afnemen (achteruit trappen is fout), kreeg ${dv.toFixed(3)}`);
  ok(wrap(mesh.userData.crank.rotation.z - c0) < -0.2, `${stijl}: de kruk draait met de voeten mee`);
  const a2 = ang(); stap(-4, 20);
  const dr = wrap(ang() - a2);
  ok(dr > 0.2, `${stijl}: achteruit rollen draait de trappers terug, kreeg ${dr.toFixed(3)}`);
  // dezelfde draairichting als de wielen: een wiel draait bij vooruit met afnemende rotation.z
  const w = mesh.userData.wheels[0], w0 = w.rotation.z; stap(4, 10);
  ok(w.rotation.z < w0, `${stijl}: wiel draait vooruit met afnemende hoek`);
  p.removeFromParent();
}
console.log(fouten ? `trapfase_richting_test: ${fouten} van ${n} mislukt` : `trapfase_richting_test: alles goed (${n} controles)`);
if (fouten) process.exit(1);
