// Modulaire rijders op de tweewielers (24-11): de modulaire man en vrouw (Quaternius) in drie lichaamsmaten zitten via placeSeatedLocal zoals het spel op
// fiets, racefiets, mountainbike, fatbike, bakfiets en snorscooter, of staan op de step; de heup ligt op het zadel, de handen aan de handvatten en de voeten
// op de trappers of de vloerplaat (de plekken komen uit seating3d.js bikeRiderSeat, dezelfde als de geometrie van vehicle_bike.js en vehicle_scooter.js).
import './node3d.mjs';
const THREE = await import('three');
await import('../game/js/player.js');
const fs = await import('node:fs');
const M = await import('../game/js/modularpeople.js');
for (const r of ['man', 'vrouw']) M.registerModularRig(r, JSON.parse(fs.readFileSync(new URL(`../game/models/mensen/${r}.json`, import.meta.url))), fs.readFileSync(new URL(`../game/models/mensen/${r}.bin`, import.meta.url)));
const { buildVehicleMesh } = await import('../game/js/models3d_vehicles.js');
const { vehicleSeat, placeSeatedLocal } = await import('../game/js/seating3d.js');
const B3 = (v) => v.toArray().map((x) => x.toFixed(2)).join(',');
const arg = process.argv[2] || '';
let fouten = 0, n = 0;
const ok = (c, t) => { n++; if (!c) { fouten++; console.log('FAIL ' + t); } };
const CASES = {
  stad: { isBike: true, model: { name: 'bike', len: 1.75, wid: 0.5, color: '#1c1c1c' } },
  race: { isBike: true, model: { name: 'bike', stijl: 'race', len: 1.75, wid: 0.5, color: '#c43d2b' } },
  mtb: { isBike: true, model: { name: 'bike', stijl: 'mtb', len: 1.75, wid: 0.5, color: '#2f7d46' } },
  fat: { isBike: true, model: { name: 'bike', fat: true, len: 1.95, wid: 0.62, color: '#20221f' } },
  bak: { isBike: true, model: { name: 'bike', cargo: true, len: 2.55, wid: 0.72, color: '#2f4a3a' } },
  brommer: { isScooter: true, model: { name: 'scooter', moped: true, len: 1.7, wid: 0.62, color: '#e6e1d6' } },
  step: { isScooter: true, model: { name: 'scooter', len: 1.1, wid: 0.4, color: '#e8e6e0' } },
};
for (const [naam, base] of Object.entries(CASES)) {
  if (arg && arg !== naam) continue;
  for (const female of [false, true]) for (const k of [0.92, 1, 1.08]) {
    const v = { id: 1, x: 0, y: 0, angle: 0, speed: 0, steer: 0, ...base, model: { ...base.model } };
    const mesh = buildVehicleMesh(v);
    const seat = vehicleSeat(v, true);
    const p = M.buildModularPerson(100, { female });
    p.scale.multiplyScalar(k);
    p.userData.isPerson = true;
    const host = mesh.userData.body || mesh;
    host.userData.vehicleRef = v;
    host.add(p);
    for (let i = 0; i < 90; i++) { v.speed = 0; placeSeatedLocal(p, seat, i / 60); }
    mesh.updateMatrixWorld(true);
    const ud = p.userData, B = ud.qBones, I = ud.qIdx;
    const bn = (n) => B[ud.qIdxBy[n]];
    const w = (b) => b.getWorldPosition(new THREE.Vector3());
    const hip = w(bn('Hips')), fl = w(B[I.footL]), fr = w(B[I.footR]), wl = w(bn('WristL')), wr = w(bn('WristR'));
    const g = seat.grip, bb = seat.bb;
    const dist = (a, b) => a.distanceTo(b).toFixed(3);
    let txt = `${naam.padEnd(7)} ${female ? 'vrouw' : 'man  '} x${k.toFixed(2)} heup(${B3(hip)})`;
    if (seat.saddle) txt += ` heup-zadel ${(hip.y - seat.saddle).toFixed(3)}`;
    if (g) {
      const gl = new THREE.Vector3(g.x, g.y, -g.z), gr = new THREE.Vector3(g.x, g.y, g.z);
      txt += ` hand-greep L${dist(wl, gl)} R${dist(wr, gr)}`;
    }
    if (bb) {
      const a0 = ud.qPedal || 0;
      const pl = new THREE.Vector3(bb.x + 0.17 * Math.sin(a0), bb.y + 0.07 - 0.17 * Math.cos(a0), -bb.z), pr = new THREE.Vector3(bb.x - 0.17 * Math.sin(a0), bb.y + 0.07 + 0.17 * Math.cos(a0), bb.z);
      txt += ` voet-pedaal L${dist(fl, pl)} R${dist(fr, pr)}`;
    } else if (seat.feet) {
      const f = seat.feet;
      txt += ` voet-plank L${dist(fl, new THREE.Vector3(f.x, f.y, -f.z))} R${dist(fr, new THREE.Vector3(f.x, f.y, f.z))}`;
    } else txt += ` voeten L(${B3(fl)}) R(${B3(fr)})`;
    if (process.argv.includes('--toon')) console.log(txt);
    const lab = `${naam} ${female ? 'vrouw' : 'man'} x${k}`;
    if (seat.saddle) ok(hip.y - seat.saddle > 0.0 && hip.y - seat.saddle < 0.1, `${lab}: heup ${(hip.y - seat.saddle).toFixed(3)} boven het zadel (0 tot 0,10)`);
    if (g) { ok(wl.distanceTo(new THREE.Vector3(g.x, g.y, -g.z)) < 0.14 && wr.distanceTo(new THREE.Vector3(g.x, g.y, g.z)) < 0.14, `${lab}: handen te ver van het stuur`); }
    if (bb) { const a0 = ud.qPedal || 0; ok(fl.distanceTo(new THREE.Vector3(bb.x + 0.17 * Math.sin(a0), bb.y + 0.07 - 0.17 * Math.cos(a0), -bb.z)) < 0.1 && fr.distanceTo(new THREE.Vector3(bb.x - 0.17 * Math.sin(a0), bb.y + 0.07 + 0.17 * Math.cos(a0), bb.z)) < 0.1, `${lab}: voeten te ver van de pedalen`); }
    if (seat.feet) { const f = seat.feet; ok(fl.distanceTo(new THREE.Vector3(f.x, f.y, -f.z)) < 0.06 && fr.distanceTo(new THREE.Vector3(f.x, f.y, f.z)) < 0.06, `${lab}: voeten niet op de vloerplaat`); }
    p.removeFromParent();
  }
}

console.log(fouten ? `rijpose_modulair_test: ${fouten} van ${n} mislukt` : `rijpose_modulair_test: alles goed (${n} controles)`);
if (fouten) process.exit(1);
