// #938: de zwaailampen van de politieauto hangen aan de carrosserie. Bij remmen
// en optrekken beweegt de koets (scene3d.js zet susPitch/susRoll op userData.body),
// en de lampen horen mee te bewegen; aan de wortel van het voertuig bleven ze
// star rechtop staan.
//   node scripts/police_lamps_test.mjs
import './node3d.mjs';
const THREE = await import('three');
const { buildVehicleMesh } = await import('../game/js/models3d_vehicles.js');
const { Vehicle, TRAFFIC_MODELS } = await import('../game/js/vehicle.js');

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };

const models = new Map();
for (const m of TRAFFIC_MODELS()) if (!models.has(m.name)) models.set(m.name, m);
const base = models.get('wagon') || { name: 'wagon', len: 4.5, wid: 1.85, color: '#888888' };
const police = new Vehicle(7, 0, 0, { ...base, name: 'wagon', len: 4.5, wid: 1.85 });
police.isPolice = true;
const mesh = buildVehicleMesh(police);
const body = mesh.userData.body;
const lamps = mesh.userData.policeLamps;

ok(!!body, 'de politieauto heeft een koets (userData.body)');
ok(!!lamps && lamps.length === 2, 'twee zwaailampen', String(lamps && lamps.length));
ok(lamps.every((l) => l.parent === body), 'de lampen hangen aan de koets, niet aan de wortel');
ok(lamps.every((l) => l.parent !== mesh), 'niet meer direct aan de voertuiggroep');

// De koets helt bij remmen/optrekken: de lampen bewegen dan mee in de wereld.
if (body && lamps.length) {
  mesh.position.set(0, 0, 0);
  body.rotation.z = 0;
  mesh.updateMatrixWorld(true);
  const before = new THREE.Vector3();
  lamps[0].getWorldPosition(before);
  body.rotation.z = 0.08; // susPitch
  mesh.updateMatrixWorld(true);
  const after = new THREE.Vector3();
  lamps[0].getWorldPosition(after);
  ok(Math.abs(after.y - before.y) > 0.005 || Math.abs(after.z - before.z) > 0.005, 'de lamp volgt de koets als die helt', `${before.y.toFixed(3)} -> ${after.y.toFixed(3)}`);
}

// Ook een ambulance heeft zijn lampen op de koets (dezelfde code).
const amb = new Vehicle(8, 0, 0, { ...base, name: 'van', len: 5.2, wid: 2.0, color: '#f1d21c' });
amb.isAmbulance = true;
const am = buildVehicleMesh(amb);
ok(am.userData.policeLamps.every((l) => l.parent === am.userData.body), 'de ambulance-lampen hangen ook aan de koets');

console.log(`${n - fails}/${n} police_lamps`);
process.exit(fails ? 1 : 0);
