// Schaal van de voertuigen (eis eigenaar 23-11): elke hybride auto uit het register houdt de norm van VOERTUIG_NORM aan (lengte,
// breedte, hoogte, wielbasis, wieldiameter, deuropening, een volwassene van 1,78 m met zijn hoofd onder het dak). Daarna een
// overzicht (zonder oordeel) van de andere voertuigen: bus, trein-achtigen, boot, heli, trekker-limo, bakwagen.
//   node scripts/voertuigschaal_test.mjs   (eenmalig: cd desktop && npm run stage)
import './node3d.mjs';

const THREE = await import('three');
await import('../game/js/player.js');
const { buildVehicleMesh, carBodyFit } = await import('../game/js/models3d_vehicles.js');
const { VOERTUIG_REGISTER, VOERTUIG_NORM: N0 } = await import('../game/js/propregister.js');
const { vehicleSeat } = await import('../game/js/seating3d.js');
const { DEUR_DEFS } = await import('../game/js/vehicledoors.js');

let bad = 0;
const check = (name, ok, info = '') => { if (!ok) { bad++; console.log('FAIL', name, info); } };
const binnen = (x, [a, b]) => x >= a - 1e-3 && x <= b + 1e-3;
const r2 = (x) => x.toFixed(2);

for (const [id, e] of Object.entries(VOERTUIG_REGISTER)) {
  if (!e.hybride) continue;
  const N = { ...N0, ...(e.maatNorm || {}) }; // de Escapade is een oude compacte hatchback (maatNorm in het register)
  const v = { id: 'schaal-' + id, model: { ...e.model }, health: 100, isTaxi: !!e.isTaxi, isPolice: !!e.isPolice };
  const mesh = buildVehicleMesh(v);
  check(id + ': gebouwd als hybride', mesh.userData.hybride === e.hybride, String(mesh.userData.hybride));
  // de romp samen met de dichte deuren (die zijn uit de flank geknipt en vormen daar de breedste plek)
  const b = new THREE.Box3();
  for (const g of [mesh.userData.body.geometry, mesh.userData.deurenDicht && mesh.userData.deurenDicht.geometry]) { if (!g) continue; g.computeBoundingBox(); b.union(g.boundingBox); }
  const len = b.max.x - b.min.x, wid = b.max.z - b.min.z;
  const fit = carBodyFit(v);
  const hoog = fit.roof; // het dak van de romp, zonder taxibord (dat telt niet als dakhoogte)
  const suv = e.hybride === 'suv';
  check(id + ': lengte', binnen(len, N.len), r2(len));
  check(id + ': breedte', binnen(wid, N.wid), r2(wid));
  check(id + ': hoogte', binnen(hoog, suv ? N.hoogSuv : N.hoog), r2(hoog));
  const xs = mesh.userData.wheels.map((w) => w.position.x), wb = Math.max(...xs) - Math.min(...xs);
  check(id + ': wielbasis', binnen(wb, N.wielbasis), r2(wb));
  const dia = mesh.userData.wheelRadius * 2;
  check(id + ': wieldiameter', binnen(dia, N.wielDiameter), r2(dia));
  // de deuropening: van de onderkant van het gat tot de raamlijst bovenin (het uitgeknipte deel)
  const defs = (DEUR_DEFS[{ sport2: 'sport' }[e.hybride] || e.hybride] || []).filter((d) => d.soort === 'scharnier');
  for (const d of defs) check(`${id}.${d.id}: deuropening hoog genoeg voor een volwassene`, fit.roof - 0.07 - d.y0 >= N.deurHoogte, r2(fit.roof - 0.07 - d.y0));
  // een volwassene van 1,78 m: zittend reikt het hoofd tot zitting + 0,85 m (heup 0,93 van 1,78)
  const seat = vehicleSeat(v, true), kruin = seat.y + (N.persoon - 0.93);
  check(id + ': hoofd van de bestuurder onder het dak', kruin <= fit.roof - 0.02, `kruin ${r2(kruin)}, dak ${r2(fit.roof)}`);
  console.log(`${id}: ${r2(len)} x ${r2(wid)} x ${r2(hoog)} m, wielbasis ${r2(wb)}, wiel ${r2(dia)}, kruin ${r2(kruin)}`);
}

// overzicht van de andere voertuigen tegen gangbare maten (alleen melden)
const ANDERE = [
  ['bus (gelede, voorste deel 11,2 + 6,8 m)', { model: { name: 'bus', len: 11.2, wid: 2.55, trailer: 6.8, color: '#132a44' }, isBus: true }, 'lengte 18 m, breedte 2,55, hoogte 3,0-3,3'],
  ['midibus', { model: { name: 'midibus', len: 8, wid: 2.4, color: '#0f3a4a' }, isBus: true }, 'lengte 7-9 m, breedte 2,3-2,4, hoogte 2,8-3,0'],
  ['trekker-limo', { model: { name: 'trekkerlimo', len: 5.6, wid: 2.0, color: '#141414' } }, 'eigen ontwerp; een limousine is 5,5-6,5 m'],
  ['bakwagen', { model: { name: 'truck', len: 8.5, wid: 2.5, color: '#e8e6e0' } }, 'lengte 8-10 m, breedte 2,5, hoogte 3,5-3,8'],
  ['helikopter', { model: { name: 'heli', len: 9, wid: 2.4, color: '#c23b2e' }, isHeli: true }, 'romp 8-10 m, rotor 10 m, hoogte 2,8-3,2'],
  ['sloep', { model: { name: 'boat', kind: 'sloep', len: 5.5, wid: 2.0, color: '#e8e6e0' }, isBoat: true }, 'lengte 5-6 m, breedte 2,0-2,2'],
];
for (const [naam, spec, norm] of ANDERE) {
  const m = buildVehicleMesh({ id: 'ander-' + naam, health: 100, ...spec });
  const box = new THREE.Box3().setFromObject(m), s = box.getSize(new THREE.Vector3());
  // de romp zonder spiegels: de breedte op de middelste helft van de lengte, alleen van de romp zelf
  const body = m.userData.body || m.children.find((c) => c.isMesh), p = body.geometry.attributes.position;
  let romp = 0;
  for (let i = 0; i < p.count; i++) if (Math.abs(p.getX(i) - (box.min.x + box.max.x) / 2) < s.x / 4) romp = Math.max(romp, Math.abs(p.getZ(i)) * 2);
  console.log(`melding ${naam}: ${r2(s.x)} x ${r2(s.z)} x ${r2(s.y)} m met uitsteeksels, romp ${r2(romp)} breed (norm: ${norm})`);
}
console.log(bad ? `voertuigschaal_test: ${bad} mislukt` : 'voertuigschaal_test: ok');
process.exit(bad ? 1 : 0);
