// De cabine van auto's, bestelbussen en vrachtwagens van buiten gezien (#389): cabin3d.js bouwt per voertuigsoort één
// samengevoegde geometrie in Node; die moet eindig zijn, in het voertuig blijven en klein genoeg voor één draw call.
//   node scripts/cabin_test.mjs   (eenmalig: cd desktop && npm run stage)
import './node3d.mjs';
const THREE = await import('three');
await import('../game/js/player.js');
const { buildVehicleMesh, carBodyFit } = await import('../game/js/models3d_vehicles.js');
const { Vehicle, TRAFFIC_MODELS } = await import('../game/js/vehicle.js');
const C = await import('../game/js/cabin3d.js');
const { vehicleSeat } = await import('../game/js/seating3d.js');
const { interiorKlasse } = await import('../game/js/carinteriorlayout.js');

let bad = 0;
const check = (name, ok, info = '') => { if (!ok) { bad++; console.log('FAIL', name, info); } };
const models = new Map();
for (const m of TRAFFIC_MODELS()) if (!models.has(m.name)) models.set(m.name, m);
const extra = [['escort', { name: 'escort', len: 4.0, wid: 1.65, color: '#a11f1f' }, { isHeroCar: true }], ['truck', { name: 'truck', len: 8.5, wid: 2.5, color: '#e8e6e0' }, {}], ['ambulance', { ...models.get('van') }, { isAmbulance: true }], ['police', { ...models.get('sedan') }, { isPolice: true }], ['taxi', { name: 'taxi', len: 4.6, wid: 1.8, color: '#1b1c1f' }, {}]];
const cases = [...['hatch', 'sedan', 'wagon', 'van', 'sport', 'taxi'].filter((n) => models.has(n)).map((n) => [n, models.get(n), {}]), ...extra];
for (const [name, model, flags] of cases) {
  const v = Object.assign(new Vehicle(0, 0, 0, model), flags);
  check(name + ': wil een cabine', C.wantsCabin(v));
  const mesh = buildVehicleMesh(v);
  const meshes = new Map([[v.id, mesh]]);
  C.syncCabins({ vehicles: [v] }, meshes, 0, 0);
  const cab = mesh.userData.cabin;
  check(name + ': cabine aangemaakt', !!cab && cab.visible);
  if (!cab) continue;
  const g = cab.geometry;
  const pos = g.attributes.position;
  let finite = true;
  for (let i = 0; i < pos.array.length; i++) if (!Number.isFinite(pos.array[i])) finite = false;
  check(name + ': eindige posities', finite);
  g.computeBoundingBox();
  const b = g.boundingBox, hl = model.len / 2, hw = model.wid / 2;
  check(name + ': binnen de carrosserie', b.min.x >= -hl - 0.05 && b.max.x <= hl + 0.05 && b.min.z >= -hw && b.max.z <= hw, `x ${b.min.x.toFixed(2)}..${b.max.x.toFixed(2)} z ${b.min.z.toFixed(2)}..${b.max.z.toFixed(2)}`);
  check(name + ': klein genoeg (<= 1200 driehoeken)', pos.count / 3 <= 1200, 'driehoeken ' + pos.count / 3);
  check(name + ': gedeeld en één groep', g.userData.shared === true && g.groups.length === 1);
  // een tweede voertuig van dezelfde soort hergebruikt de geometrie
  const v2 = Object.assign(new Vehicle(0, 0, 0, model), flags);
  const mesh2 = buildVehicleMesh(v2);
  C.syncCabins({ vehicles: [v2] }, new Map([[v2.id, mesh2]]), 0, 0);
  check(name + ': geometrie gedeeld met een tweede voertuig', mesh2.userData.cabin && mesh2.userData.cabin.geometry === g);
  // ver weg: onzichtbaar
  C.syncCabins({ vehicles: [v] }, meshes, 200, 0);
  check(name + ': verborgen op afstand', !cab.visible);
  // de binnenin-camera tekent zijn eigen interieur
  mesh.userData.interior = { visible: true };
  C.syncCabins({ vehicles: [v] }, meshes, 0, 0);
  check(name + ': verborgen bij de binnenin-camera', !cab.visible);
}
// een gewone personenauto heeft een zichtbaar interieur (#442): de cabine hangt aan de echte raamlijn
// en het echte dak, met onderdelen boven de raamlijn (stuur, binnenspiegel, dakhemel) zodat je hem
// van buiten door de ruiten en door een open portier gevuld ziet
for (const name of ['hatch', 'sedan', 'wagon', 'sport', 'van']) {
  const model = models.get(name);
  if (!model) continue;
  const v = new Vehicle(0, 0, 0, { ...model });
  const romp = carBodyFit(v);
  check(name + ': romp bekend', !!romp);
  if (!romp) continue;
  const g = C.buildCabinGeometry(vehicleSeat(v, true), v.model.len, v.model.wid, interiorKlasse(v), romp);
  g.computeBoundingBox();
  const b = g.boundingBox;
  check(name + ': interieur boven de raamlijn', b.max.y > romp.belt + 0.02, `max y ${b.max.y.toFixed(2)} raamlijn ${romp.belt}`);
  check(name + ': interieur onder het echte dak', b.max.y < romp.roof, `max y ${b.max.y.toFixed(2)} dak ${romp.roof}`);
}

// De taxi en de politieauto hebben een ingerichte passagiersruimte (#442): meer onderdelen dan dezelfde auto
// zonder die klasse (taxameter, betaalautomaat en scheidingsruit; kooi, mobilofoon en stopbord), en alles
// binnen de carrosserie en onder het echte dak, zodat je het van buiten door de ruiten ziet.
for (const [naam, model, flags] of [['taxi', { name: 'taxi', len: 4.6, wid: 1.8 }, {}], ['politie', { name: 'sedan', len: 4.3, wid: 1.8 }, { isPolice: true }]]) {
  const v = Object.assign(new Vehicle(0, 0, 0, model), flags);
  const romp = carBodyFit(v);
  check(naam + ': romp bekend', !!romp);
  if (!romp) continue;
  const seat = vehicleSeat(v, true);
  const g = C.buildCabinGeometry(seat, v.model.len, v.model.wid, interiorKlasse(v), romp);
  const gewoon = C.buildCabinGeometry(seat, v.model.len, v.model.wid, 'auto', romp);
  g.computeBoundingBox();
  const b = g.boundingBox;
  check(naam + ': rijker ingericht dan een gewone auto', g.attributes.position.count >= gewoon.attributes.position.count + 100, `${g.attributes.position.count} tegen ${gewoon.attributes.position.count}`);
  check(naam + ': onder het echte dak', b.max.y < romp.roof, `max y ${b.max.y.toFixed(2)} dak ${romp.roof}`);
  check(naam + ': binnen de carrosserie', b.min.x >= -v.model.len / 2 - 0.05 && b.max.x <= v.model.len / 2 + 0.05 && b.min.z >= -v.model.wid / 2 && b.max.z <= v.model.wid / 2, `x ${b.min.x.toFixed(2)}..${b.max.x.toFixed(2)} z ${b.min.z.toFixed(2)}..${b.max.z.toFixed(2)}`);
}

// geen cabine voor bus, wrak, fiets en boot
const bus = Object.assign(new Vehicle(0, 0, 0, { ...models.get('bus') }), {});
check('bus: geen cabine', !C.wantsCabin(bus));
const wrak = Object.assign(new Vehicle(0, 0, 0, models.get('sedan')), { wrecked: true });
check('wrak: geen cabine', !C.wantsCabin(wrak));
const fiets = Object.assign(new Vehicle(0, 0, 0, models.get('bike')), { isBike: true });
check('fiets: geen cabine', !C.wantsCabin(fiets));
console.log(bad ? `${bad} mislukt` : `cabin_test: ok (${cases.length} voertuigen)`);
process.exit(bad ? 1 : 0);
