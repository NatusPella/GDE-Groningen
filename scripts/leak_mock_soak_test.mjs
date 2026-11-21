// Mock-soak op GPU-lekken (#1065): 1000 voertuigen bouwen en vrijgeven (disposeObject, zoals scene3d.js bij een despawn), met per
// ronde de teller "levende geometrieen en materialen". Er is in Node geen renderer; de teller meet wat three.js in info.memory zou
// tellen: een geometrie leeft zodra een mesh hem krijgt, tot dispose() (tijdelijke geometrieen die nooit getekend worden tellen niet).
// De teller mag na het opwarmen niet blijven groeien (de gedeelde cache heeft een bovengrens) en moet bij het eind teruggaan naar de cache.
//   node scripts/leak_mock_soak_test.mjs [--n=1000]
import './node3d.mjs';

const THREE = await import('three');
const N = Number((process.argv.find((a) => a.startsWith('--n=')) || '--n=1000').slice(4));
let n = 0, bad = 0;
const ok = (c, name, info = '') => { n++; if (!c) { bad++; console.log(`FAIL ${name}${info ? ' (' + info + ')' : ''}`); } };

// --- de teller: levende geometrieen en materialen -------------------------------------------------------------------------------------
const geoAlive = new Set(), matAlive = new Set();
const BG = THREE.BufferGeometry.prototype;
const gDispose = BG.dispose; BG.dispose = function () { geoAlive.delete(this); return gDispose.call(this); };
const MP = THREE.Material.prototype;
const mDispose = MP.dispose; MP.dispose = function () { matAlive.delete(this); return mDispose.call(this); };
// materialen zijn "levend" zodra een mesh ze krijgt
const origMeshCtor = THREE.Mesh;
const track = (mesh) => { const ms = Array.isArray(mesh.material) ? mesh.material : [mesh.material]; for (const m of ms) if (m) matAlive.add(m); };

const { Vehicle, TRAFFIC_MODELS } = await import('../game/js/vehicle.js');
const { buildVehicleMesh, pruneVehicleMeshes } = await import('../game/js/models3d_vehicles.js');
const { disposeObject } = await import('../game/js/scene3d.js');

const modellen = TRAFFIC_MODELS();
ok(modellen.length > 5, 'er zijn verkeersmodellen', String(modellen.length));
let seed = 12345; const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);

function spawn(i) {
  const model = modellen[Math.floor(rnd() * modellen.length)];
  const v = Object.assign(new Vehicle(i, 0, 0, model), { isBike: model.name === 'bike', isScooter: model.name === 'scooter', isBus: model.name === 'bus', isBoat: !!model.isBoat });
  if (rnd() < 0.7) v.color = Math.floor(rnd() * 0xffffff);
  const mesh = buildVehicleMesh(v);
  mesh.traverse((o) => { if (o.isMesh) track(o); if (o.geometry) geoAlive.add(o.geometry); }); // three.js telt een geometrie pas als hij getekend wordt
  return mesh;
}

const rows = [];
const live = [];
for (let i = 0; i < N; i++) {
  live.push(spawn(i));
  while (live.length > 12) disposeObject(live.shift()); // twaalf voertuigen tegelijk in beeld, de rest verdwijnt
  if (i % 50 === 49) { pruneVehicleMeshes(); rows.push({ i, geo: geoAlive.size, mat: matAlive.size }); }
}
for (const m of live.splice(0)) disposeObject(m);
const end = { geo: geoAlive.size, mat: matAlive.size };
console.log(rows.map((r) => r.geo).join(" "));
const peak = Math.max(...rows.map((r) => r.geo));
const warm = rows[Math.min(rows.length - 1, 5)];
const last = rows[rows.length - 1];
console.log(`geometrieen: warm ${warm.geo}, piek ${peak}, laatste ${last.geo}, na alles vrijgeven ${end.geo}; materialen: warm ${warm.mat}, laatste ${last.mat}, eind ${end.mat}`);
ok(last.geo <= warm.geo + 200, 'de geometrieteller blijft begrensd (de LRU van de voertuigmodellen)', `${warm.geo} naar ${last.geo}`);
ok(end.geo <= 400, 'na het vrijgeven van alle voertuigen blijft alleen de cache over', String(end.geo));
ok(last.mat <= warm.mat + 120, 'materialen blijven begrensd', `${warm.mat} naar ${last.mat}`);

if (process.argv.includes('--dump')) {
  const by = new Map();
  for (const g of geoAlive) { const k = `${Object.keys(g.userData || {}).join('+') || '-'} pos${g.attributes.position ? g.attributes.position.count : 0} idx${g.index ? 1 : 0}`; by.set(k, (by.get(k) || 0) + 1); }
  console.log([...by.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15));
}
console.log(`leak_mock_soak_test: ${n - bad}/${n} ok`);
process.exit(bad ? 1 : 0);
