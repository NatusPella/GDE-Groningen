// LOD's van de voertuigmodellen (eis eigenaar 23-11, vehiclelod3d.js): elk geregistreerd voertuig en de grote voertuigen (bus,
// heli, trekker-limo, bakwagen, boot) hebben twee vereenvoudigde niveaus met duidelijk minder driehoeken; de niveaukeuze heeft een
// drempel terug (geen knipperen) en de overgang dithert en eindigt op het juiste niveau.
//   node scripts/vehiclelod_test.mjs [--meet]   (eenmalig: cd desktop && npm run stage)
import './node3d.mjs';

await import('three');
await import('../game/js/player.js');
const { buildVehicleMesh } = await import('../game/js/models3d_vehicles.js');
const { lodNiveau, updateVehicleLods, LOD_FADE_S } = await import('../game/js/vehiclelod3d.js');
const { VOERTUIG_REGISTER, VOERTUIG_LOD } = await import('../game/js/propregister.js');

let bad = 0;
const check = (name, ok, info = '') => { if (!ok) { bad++; console.log('FAIL', name, info); } };

// niveaukeuze
const [, n1, n2] = VOERTUIG_LOD;
check('dichtbij: niveau 0', lodNiveau(5) === 0);
check('voorbij de eerste grens: niveau 1', lodNiveau(n1.vanaf + 1) === 1);
check('voorbij de tweede grens: niveau 2', lodNiveau(n2.vanaf + 1) === 2);
check('drempel terug: net binnen de grens blijft niveau 1', lodNiveau(n1.vanaf - 1, 1) === 1);
check('ver genoeg terug: niveau 0', lodNiveau(n1.vanaf - 10, 1) === 0);

const ANDERE = [
  ['bus', { model: { name: 'bus', len: 11.2, wid: 2.55, trailer: 6.8, color: '#132a44', stripe: '#3fc6d4', accent: '#e8e6de' }, isBus: true }],
  ['midibus', { model: { name: 'midibus', len: 8, wid: 2.4, color: '#0f3a4a' }, isBus: true }],
  ['heli', { model: { name: 'heli', len: 9, wid: 2.4, color: '#c23b2e' }, isHeli: true }],
  ['sloep', { model: { name: 'boat', kind: 'sloep', len: 5.5, wid: 2.0, color: '#e8e6e0' }, isBoat: true }],
  ['bestelbus', { model: { name: 'van', len: 5, wid: 2, color: '#d9d9d9' } }],
  ['wagon', { model: { name: 'wagon', len: 4.5, wid: 1.8, color: '#6e937c' } }],
];
const lijst = [...Object.entries(VOERTUIG_REGISTER).map(([id, e]) => [id, { model: { ...e.model }, isTaxi: !!e.isTaxi, isPolice: !!e.isPolice }]), ...ANDERE];
for (const [id, spec] of lijst) {
  const mesh = buildVehicleMesh({ id: 'lod-' + id, health: 100, ...spec });
  const lod = mesh.userData.lods;
  check(id + ': heeft LOD-niveaus', !!lod);
  if (!lod) continue;
  const [t0, t1, t2] = lod.tris;
  // een klein model (een kano, een sloep onder de 800 driehoeken) heeft aan niveau 1 weinig te winnen; niveau 2 blijft rond 100
  if (t0 > 800) check(id + ': niveau 1 duidelijk minder driehoeken', t1 < t0 * 0.8, `${t1} tegen ${t0}`);
  check(id + ': niveau 2 een fractie', (t2 < t0 * 0.15 || t2 <= 100) && t2 < 400, `${t2} tegen ${t0}`);
  if (process.argv.includes('--meet')) console.log(`${id}: ${t0} / ${t1} / ${t2} driehoeken`);
  // overgang: ver weg -> na de dither alleen niveau 2; dichtbij -> weer het volle model
  const map = new Map([[1, mesh]]);
  mesh.position.set(0, 0, 0);
  for (let t = 0; t < LOD_FADE_S * 3; t += 0.05) updateVehicleLods(map, n2.vanaf + 20, 5, 0, 0.05);
  for (let t = 0; t < LOD_FADE_S * 3; t += 0.05) updateVehicleLods(map, n2.vanaf + 20, 5, 0, 0.05);
  check(id + ': ver weg eindigt op niveau 2', lod.niveau === 2 && lod.m2.visible && !lod.m1.visible && lod.body.material !== lod.mats, `niveau ${lod.niveau}`);
  for (let t = 0; t < LOD_FADE_S * 6; t += 0.05) updateVehicleLods(map, 3, 2, 0, 0.05);
  check(id + ': dichtbij weer het volle model', lod.niveau === 0 && !lod.m2.visible && !lod.m1.visible && lod.body.material === lod.mats, `niveau ${lod.niveau}`);
}
console.log(bad ? `vehiclelod_test: ${bad} mislukt` : 'vehiclelod_test: ok');
process.exit(bad ? 1 : 0);
