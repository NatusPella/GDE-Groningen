// LOD's van de voertuigmodellen (eis eigenaar 23-11, vehiclelod3d.js op het centrale systeem van lodregistry.js en lod3d.js): elk
// geregistreerd voertuig en de grote voertuigen (bus, heli, trekker-limo, bakwagen) hebben twee lichtere niveaus die de minCut van de
// soort 'vehicle' halen, staan in het centrale register (de audit van lodregistry.js), en op afstand staat het juiste niveau.
//   node scripts/vehiclelod_test.mjs [--meet]   (eenmalig: cd desktop && npm run stage)
import './node3d.mjs';

await import('three');
await import('../game/js/player.js');
const { buildVehicleMesh } = await import('../game/js/models3d_vehicles.js');
const { zetLodAfstand } = await import('../game/js/vehiclelod3d.js');
const { VOERTUIG_REGISTER, VOERTUIG_LOD } = await import('../game/js/propregister.js');
const { LOD_KINDS, lodModels, auditLodModel, clearLodModels } = await import('../game/js/lodregistry.js');

let bad = 0;
const check = (name, ok, info = '') => { if (!ok) { bad++; console.log('FAIL', name, info); } };
check('één systeem: de voertuigopgave is die van het centrale register', VOERTUIG_LOD === LOD_KINDS.vehicle.lod);
clearLodModels();
const [g1, g2] = VOERTUIG_LOD.grenzen;

const ANDERE = [
  ['bus', { model: { name: 'bus', len: 11.2, wid: 2.55, trailer: 6.8, color: '#132a44', stripe: '#3fc6d4', accent: '#e8e6de' }, isBus: true }],
  ['midibus', { model: { name: 'midibus', len: 8, wid: 2.4, color: '#0f3a4a' }, isBus: true }],
  ['heli', { model: { name: 'heli', len: 9, wid: 2.4, color: '#c23b2e' }, isHeli: true }],
  ['bestelbus', { model: { name: 'van', len: 5, wid: 2, color: '#d9d9d9' } }],
  ['wagon', { model: { name: 'wagon', len: 4.5, wid: 1.8, color: '#6e937c' } }],
];
// een voertuig met een eigen LOD-opgave (de tankwagen, vettruck 23-11: e.lod, eigen DitherLOD) toetst lodlevels_test.mjs
const lijst = [...Object.entries(VOERTUIG_REGISTER).filter(([, e]) => !e.lod).map(([id, e]) => [id, { model: { ...e.model }, isTaxi: !!e.isTaxi, isPolice: !!e.isPolice }]), ...ANDERE];
for (const [id, spec] of lijst) {
  const mesh = buildVehicleMesh({ id: 'lod-' + id, health: 100, ...spec });
  // de helikopter (voertuigen-klein 24-11) bouwt zijn romp via het centrale lodkit3d.js (makeLodObject, userData.lod op de rompgroep); de
  // drie niveaus en de afstanden toetst lod_audit_test.mjs
  if (spec.isHeli) {
    let eigen = null; mesh.traverse((o) => { if (!eigen && o.userData && o.userData.lod && o.userData.lod.kind === 'vehicle' && o.userData.lod.entries && o.userData.lod.entries.length) eigen = o.userData.lod; });
    check(id + ': de romp heeft LOD-niveaus via het centrale systeem (lodkit3d.js)', !!eigen);
    continue;
  }
  const l = mesh.userData.lods;
  check(id + ': heeft LOD-niveaus', !!l);
  if (!l) continue;
  const [t0, t1, t2] = l.tris;
  if (process.argv.includes('--meet')) console.log(`${id}: ${t0} / ${t1} / ${t2} driehoeken`);
  const vis = (m) => (Array.isArray(m.material) ? m.material : [m.material]).some((x) => x.visible);
  zetLodAfstand(mesh, 5);
  check(id + ': dichtbij het volle model', vis(l.body) && !vis(l.m1) && !vis(l.m2));
  zetLodAfstand(mesh, (g1 + g2) / 2);
  check(id + ': tussen de grenzen niveau 1', !vis(l.body) && vis(l.m1) && !vis(l.m2));
  zetLodAfstand(mesh, g2 + 30);
  check(id + ': ver weg niveau 2', !vis(l.body) && !vis(l.m1) && vis(l.m2));
  zetLodAfstand(mesh, g1);
  check(id + ': op de grens dithert het (beide niveaus)', vis(l.body) && vis(l.m1) && l.mats[0].userData.lodDither.value.x < 1);
  zetLodAfstand(mesh, 2);
}
// de audit van het centrale register: elk gebouwd voertuig haalt de minCut van zijn soort
const vs = lodModels().filter((m) => m.kind === 'vehicle');
check('voertuigen staan in het centrale register', vs.length >= lijst.length - 1, String(vs.length));
for (const m of vs) { const iss = auditLodModel(m); check('audit ' + m.name, !iss.length, iss.join('; ')); }
console.log(bad ? `vehiclelod_test: ${bad} mislukt` : 'vehiclelod_test: ok');
process.exit(bad ? 1 : 0);
