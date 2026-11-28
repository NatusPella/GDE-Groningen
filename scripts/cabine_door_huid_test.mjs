// Het interieur (cabin3d.js) mag bij een dichte deur nergens door de huid van een hybride auto steken (#1349): de uiteinden van het
// dashboard lagen op de nominale halve breedte min 8 cm en staken op de gebogen flank van hatch, suv en wagon als donkere rechthoek door
// het deurblad (zichtbaar op lichte lak). Gedrag: elk driehoekje van de cabine dat naar buiten kijkt en aan de zijkant ligt (|z| > 0,5)
// ligt minstens 1 cm binnen het deurblad of de romp op dezelfde plek (x, y), in een lichte en een rode kleur.
//   node scripts/cabine_door_huid_test.mjs   (eenmalig: cd desktop && npm run stage)
import './node3d.mjs';
const THREE = await import('three');
await import('../game/js/player.js');
const { buildVehicleMesh, carBodyFit } = await import('../game/js/models3d_vehicles.js');
const { Vehicle, TRAFFIC_MODELS, POLICE_MODEL } = await import('../game/js/vehicle.js');
const { vehicleSeat } = await import('../game/js/seating3d.js');
const { interiorKlasse } = await import('../game/js/carinteriorlayout.js');
const { buildCabinGeometry } = await import('../game/js/cabin3d.js');

let bad = 0, gemeten = 0;
const check = (name, ok, info = '') => { if (!ok) { bad++; console.log('FAIL', name, info); } };
const lijst = [...TRAFFIC_MODELS(), { ...POLICE_MODEL }, { name: 'taxi', len: 4.6, wid: 1.8, maxSpeed: 33, accel: 9, brake: 24, turnRate: 2.6, color: '#e8c93a' }];
const gezien = new Set();
const R = new THREE.Raycaster();
const V3 = THREE.Vector3;
for (const m0 of lijst) {
  if (gezien.has(m0.name)) continue;
  gezien.add(m0.name);
  for (const kleur of ['#f4f4f0', '#c62828']) {
    const v = new Vehicle(0, 0, 0, { ...m0, color: kleur });
    if (m0.name === 'police') v.isPolice = true;
    const mesh = buildVehicleMesh(v);
    if (!mesh.userData.hybride || !mesh.userData.deurenDicht) continue;
    const huid = [mesh.userData.body, mesh.userData.deurenDicht].map((o) => { const x = new THREE.Mesh(o.geometry, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })); x.updateMatrixWorld(); return x; });
    const g = buildCabinGeometry(vehicleSeat(v, true), v.model.len, v.model.wid, interiorKlasse(v), carBodyFit(v), 0, { naam: m0.name });
    const p = g.attributes.position, belt = carBodyFit(v).belt;   // boven de raamlijn is de flank glas: daar telt de huid niet
    let slechtst = Infinity, plek = '';
    for (let t = 0; t < p.count / 3; t++) {
      const P = [0, 1, 2].map((k) => [p.getX(t * 3 + k), p.getY(t * 3 + k), p.getZ(t * 3 + k)]);
      const zc = (P[0][2] + P[1][2] + P[2][2]) / 3;
      if (Math.abs(zc) < 0.5) continue;
      const nz = (P[1][0] - P[0][0]) * (P[2][1] - P[0][1]) - (P[1][1] - P[0][1]) * (P[2][0] - P[0][0]);
      if (nz * Math.sign(zc) <= 0) continue;   // kijkt naar binnen: van buiten onzichtbaar
      for (const q of P) {
        if (q[1] > belt - 0.03 || q[1] < 0.3) continue;
        R.set(new V3(q[0], q[1], Math.sign(zc) * 3), new V3(0, 0, -Math.sign(zc)));
        const h = R.intersectObjects(huid, false)[0];
        if (!h) continue;
        if (Math.abs(3 - h.distance) < 0.72 * v.model.wid / 2) continue;   // de binnenkant van een wielkast: daar staat het wiel voor
        const ruimte = Math.abs(3 - h.distance) - Math.abs(q[2]);
        if (ruimte < slechtst) { slechtst = ruimte; plek = q.map((x) => x.toFixed(2)).join(','); }
      }
    }
    // het dak: elk punt boven de raamlijn (dakhemel, stijlen) ligt onder het dak of de motorkap op dezelfde plek (x, z)
    let dakSlechtst = Infinity, dakPlek = '';
    for (let i = 0; i < p.count; i++) {
      const q = [p.getX(i), p.getY(i), p.getZ(i)];
      if (q[1] <= belt + 0.02 || Math.abs(q[2]) < 0.3) continue;
      R.set(new V3(q[0], 3, q[2]), new V3(0, -1, 0));
      const h = R.intersectObjects(huid, false)[0];
      if (!h) { if (-0.5 < dakSlechtst) { dakSlechtst = -0.5; dakPlek = q.map((x) => x.toFixed(2)).join(',') + ' (geen dak)'; } continue; }
      const ruimte = (3 - h.distance) - q[1];
      if (ruimte < dakSlechtst) { dakSlechtst = ruimte; dakPlek = q.map((x) => x.toFixed(2)).join(','); }
    }
    gemeten++;
    check(`${m0.name} ${kleur}: het interieur blijft binnen de huid`, slechtst >= 0.01, `ruimte ${slechtst.toFixed(3)} m bij ${plek}`);
    check(`${m0.name} ${kleur}: dakhemel en stijlen blijven onder het dak`, dakSlechtst >= 0.01, `ruimte ${dakSlechtst.toFixed(3)} m bij ${dakPlek}`);
  }
}
check('minstens vier hybride modellen in twee kleuren gemeten', gemeten >= 8, String(gemeten));
console.log(bad ? `cabine_door_huid_test: ${bad} mislukt` : `cabine_door_huid_test: ok (${gemeten})`);
process.exit(bad ? 1 : 0);
