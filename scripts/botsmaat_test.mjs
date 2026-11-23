// De botsmaat volgt de zichtbare auto (23-11): voor elk verkeersmodel, de politie en de taxi is de lengte en breedte waarmee het
// voertuig botst (v.model.len, wid) gelijk aan de getekende romp (binnen 3 cm, zonder spiegels en deuren die uitsteken), en een
// uitvoering die onze eigen bouwer houdt (roest, elektrisch, tokkie) houdt zijn eigen maat.
//   node scripts/botsmaat_test.mjs   (eenmalig: cd desktop && npm run stage)
import './node3d.mjs';

const THREE = await import('three');
await import('../game/js/player.js');
const { buildVehicleMesh } = await import('../game/js/models3d_vehicles.js');
const { Vehicle, TRAFFIC_MODELS, POLICE_MODEL } = await import('../game/js/vehicle.js');
const { getekendeMaat } = await import('../game/js/propregister.js');

let bad = 0;
const check = (name, ok, info = '') => { if (!ok) { bad++; console.log('FAIL', name, info); } };
const r2 = (x) => x.toFixed(2);
// de getekende romp: lengte over alles, breedte op de middelste helft van de lengte (spiegels zitten voorin)
function romp(mesh) {
  const delen = [mesh.userData.body.geometry, mesh.userData.deurenDicht && mesh.userData.deurenDicht.geometry].filter(Boolean);
  const b = new THREE.Box3();
  for (const g of delen) { g.computeBoundingBox(); b.union(g.boundingBox); }
  let wid = 0;
  for (const g of delen) { const p = g.attributes.position; for (let i = 0; i < p.count; i++) if (Math.abs(p.getX(i)) < (b.max.x - b.min.x) / 4) wid = Math.max(wid, Math.abs(p.getZ(i)) * 2); }
  return { len: b.max.x - b.min.x, wid };
}
const gezien = new Set();
let hybrides = 0;
const lijst = [...TRAFFIC_MODELS(), { ...POLICE_MODEL }, { name: 'taxi', len: 4.6, wid: 1.8, maxSpeed: 33, accel: 9, brake: 24, turnRate: 2.6, color: '#e8c93a' }];
for (const m of lijst) {
  if (gezien.has(m.name)) continue;
  gezien.add(m.name);
  const v = new Vehicle(0, 0, 0, m);
  if (m.name === 'police') v.isPolice = true;
  const mesh = buildVehicleMesh(v);
  if (!mesh.userData.hybride) continue; // bus, fiets, bestelbus: eigen bouwer met de eigen maat
  hybrides++;
  const r = romp(mesh);
  check(m.name + ': botslengte = getekende lengte', Math.abs(v.model.len - r.len) <= 0.03, `${r2(v.model.len)} tegen ${r2(r.len)}`);
  check(m.name + ': botsbreedte = getekende breedte', Math.abs(v.model.wid - r.wid) <= 0.03, `${r2(v.model.wid)} tegen ${r2(r.wid)}`);
  check(m.name + ': het sjabloon zelf blijft ongewijzigd', m.len === lijst.find((q) => q.name === m.name).len);
}
check('minstens vier hybride modellen gekeurd', hybrides >= 4, String(hybrides));
check('roest houdt zijn eigen maat', getekendeMaat({ name: 'hatch', rusty: true, len: 3.7, wid: 1.65 }) === null);
const roest = new Vehicle(0, 0, 0, { name: 'hatch', rusty: true, len: 3.7, wid: 1.65, maxSpeed: 20, accel: 6, brake: 18, turnRate: 2.8 });
check('roest: botsmaat ongewijzigd', roest.model.len === 3.7 && roest.model.wid === 1.65);
const eigen = new Vehicle(0, 0, 0, { name: 'sedan', hybride: false, len: 4.3, wid: 1.8, maxSpeed: 20, accel: 6, brake: 18, turnRate: 2.8 });
check('model.hybride === false: botsmaat ongewijzigd', eigen.model.len === 4.3);
console.log(bad ? `botsmaat_test: ${bad} mislukt` : 'botsmaat_test: ok');
process.exit(bad ? 1 : 0);
