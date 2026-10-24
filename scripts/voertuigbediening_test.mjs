// Het stuur en de bediening van voertuigen (#442): ploeg en aftakas (toestand), het stuur dat meedraait in een auto,
// fiets, step en brommer, de trekkercabine, het roer en het stuurwiel van boten, en dat het alleen dichtbij bestaat.
//   node scripts/voertuigbediening_test.mjs   (eenmalig: cd desktop && npm run stage; three in desktop/vendor-cache)
import './node3d.mjs';
await import('three');
await import('../game/js/player.js');
const { buildVehicleMesh, updateVehicleWheelSpin } = await import('../game/js/models3d_vehicles.js');
const { Vehicle, TRAFFIC_MODELS, TRACTOR_MODEL, QUAD_MODEL, MOPED_MODEL } = await import('../game/js/vehicle.js');
const { BOAT_KINDS } = await import('../game/js/boattypes.js');
const { syncCabins } = await import('../game/js/cabin3d.js');
const A = await import('../game/js/autointerieur.js');
const V = await import('../game/js/voertuigbediening.js');

let bad = 0;
const check = (name, ok, info = '') => { if (!ok) { bad++; console.log('FAIL', name, info); } };

// --- toestand van het werktuig ---
{
  const st = V.nieuwWerktuig();
  check('start: niet aangekoppeld', !st.gekoppeld && !st.omlaag && !st.aftakas);
  check('eerste Z koppelt aan en zet omlaag', /aangekoppeld/.test(V.werktuigKnop(st, 'ploeg')) && st.gekoppeld && st.omlaag);
  for (let i = 0; i < 120; i++) V.werktuigStap(st, 1 / 60);
  check('ploeg zakt naar de grond', st.hoogte === 1, String(st.hoogte));
  check('tweede Z zet omhoog', V.werktuigKnop(st, 'ploeg') === 'Ploeg omhoog.' && !st.omlaag);
  for (let i = 0; i < 120; i++) V.werktuigStap(st, 1 / 60);
  check('ploeg stijgt weer', st.hoogte === 0);
  check('X zet de aftakas aan en uit', V.werktuigKnop(st, 'aftakas') === 'Aftakas aan.' && st.aftakas && V.werktuigKnop(st, 'aftakas') === 'Aftakas uit.' && !st.aftakas);
  V.werktuigKnop(st, 'aftakas');
  const f0 = st.fase; V.werktuigStap(st, 0.1);
  check('draaiende aftakas loopt door', st.fase !== f0);
  const msgs = [];
  const input = { wasPressed: (k) => k === 'z' };
  const tv = Object.assign(new Vehicle(0, 0, 0, TRACTOR_MODEL), {});
  V.bedienTrekker(tv, input, { addMessage: (t) => msgs.push(t) });
  check('bedienTrekker maakt de toestand en meldt', tv.werktuig && tv.werktuig.gekoppeld && msgs.length === 1);
  const auto = new Vehicle(0, 0, 0, TRAFFIC_MODELS().find((m) => m.name === 'hatch'));
  V.bedienTrekker(auto, input, { addMessage: () => msgs.push('fout') });
  check('Z doet niets op een auto', !auto.werktuig && msgs.length === 1);
}

// --- de meshes ---
const alle = TRAFFIC_MODELS();
const bike = alle.find((m) => m.name === 'bike' && !m.cargo && !m.fat);
const step = alle.find((m) => m.name === 'scooter' && !m.moped && !m.motorbike && !m.geared);
const cases = [
  ['fiets', bike, { isBike: true }],
  ['step', step, { isScooter: true }],
  ['brommer', MOPED_MODEL, { isScooter: true }],
  ['trekker', TRACTOR_MODEL, {}],
  ['quad', QUAD_MODEL, {}],
  ['rondvaart', BOAT_KINDS.rondvaart, { isBoat: true }],
  ['sloep', BOAT_KINDS.sloep, { isBoat: true }],
  ['binnenvaart', BOAT_KINDS.spits, { isBoat: true }],
];
const tris = (m) => { let n = 0; m.traverse((o) => { if (o.isMesh) n += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; }); return n; };
const meshCount = (m) => { let n = 0; m.traverse((o) => { if (o.isMesh && o.visible) n++; }); return n; };
for (const [naam, model, flags] of cases) {
  check(naam + ': model bestaat', !!model);
  if (!model) continue;
  const v = Object.assign(new Vehicle(100, 100, 0, model), flags);
  const mesh = buildVehicleMesh(v);
  const meshes = new Map([[v.id, mesh]]);
  const world = { vehicles: [v] };
  const voor = meshCount(mesh);
  v.steer = 1;
  // ver weg: niets erbij
  V.syncVoertuigBediening(world, meshes, 0, 0, 1 / 60);
  check(naam + ': ver weg geen extra onderdelen', meshCount(mesh) === voor);
  // dichtbij
  for (let i = 0; i < 90; i++) {
    updateVehicleWheelSpin(mesh, 3, 1 / 60, v.steer);
    V.syncVoertuigBediening(world, meshes, 100, 100, 1 / 60);
  }
  const ud = mesh.userData;
  if (naam === 'fiets' || naam === 'step' || naam === 'brommer') {
    const sw = ud.vb && ud.vb.sw;
    check(naam + ': stuurstang gebouwd', !!sw && sw.stuur.visible);
    check(naam + ': carrosserie zonder stuur', sw && sw.body.geometry === sw.zonder && sw.zonder !== sw.orig);
    check(naam + ': stuurstang draait mee', sw && Math.abs(sw.stuur.rotation.y) > 0.3, sw && String(sw.stuur.rotation.y));
    check(naam + ': voorwiel stuurt', ud.frontWheels && Math.abs(ud.frontWheels[0].rotation.y) > 0.3);
    check(naam + ': zonder stuur is lichter dan met', sw && tris({ traverse: (f) => f({ isMesh: true, geometry: sw.zonder }) }) < tris({ traverse: (f) => f({ isMesh: true, geometry: sw.orig }) }));
    // weer ver weg: de gewone carrosserie terug
    V.syncVoertuigBediening(world, meshes, 0, 0, 1 / 60);
    check(naam + ': ver weg weer de gewone carrosserie', sw.body.geometry === sw.orig && !sw.stuur.visible);
  } else if (naam === 'trekker') {
    const tr = ud.vb && ud.vb.tr;
    check('trekker: cabine met stoel en stuur', !!tr && tr.cabine.visible && tr.stuur.visible);
    check('trekker: stuurwiel draait', tr && Math.abs(tr.stuur.userData.turn.rotation.z) > 1);
    check('trekker: voorwielen sturen', ud.frontWheels && ud.frontWheels.length === 2 && Math.abs(ud.frontWheels[0].rotation.y) > 0.3);
    check('trekker: geen werktuig zonder knop', !ud.vb.wg);
    v.werktuig = V.nieuwWerktuig();
    V.werktuigKnop(v.werktuig, 'ploeg');
    V.werktuigKnop(v.werktuig, 'aftakas');
    for (let i = 0; i < 120; i++) V.syncVoertuigBediening(world, meshes, 100, 100, 1 / 60);
    const wg = ud.vb.wg;
    check('trekker: ploeg verschijnt en staat omlaag', !!wg && wg.visible && Math.abs(wg.rotation.z) < 0.01, wg && String(wg.rotation.z));
    V.werktuigKnop(v.werktuig, 'ploeg');
    for (let i = 0; i < 120; i++) V.syncVoertuigBediening(world, meshes, 100, 100, 1 / 60);
    check('trekker: ploeg omhoog kantelt', wg.rotation.z < -0.6, String(wg.rotation.z));
    check('trekker: aftakas draait', wg.userData.as.rotation.x !== 0);
    V.syncVoertuigBediening(world, meshes, 0, 0, 1 / 60);
    check('trekker: ver weg alles uit', !ud.vb.tr.cabine.visible && !wg.visible);
  } else if (naam === 'quad') {
    check('quad: voorwielen sturen', ud.frontWheels && Math.abs(ud.frontWheels[0].rotation.y) > 0.3);
  } else {
    const bt = ud.vb && ud.vb.bt;
    check(naam + ': roer', !!bt && !!bt.roer && Math.abs(bt.roer.rotation.y) > 0.3);
    if (naam !== 'sloep') check(naam + ': stuurwiel', !!bt && !!bt.stuur && Math.abs(bt.stuur.userData.turn.rotation.z) > 1);
  }
  check(naam + ': alles eindig', (() => { let ok = true; mesh.traverse((o) => { if (o.isMesh) for (const x of o.geometry.attributes.position.array) if (!Number.isFinite(x)) ok = false; }); return ok; })());
}

// --- het stuur in een auto ---
{
  const model = alle.find((m) => m.name === 'hatch');
  const v = new Vehicle(50, 50, 0, model);
  const mesh = buildVehicleMesh(v);
  const meshes = new Map([[v.id, mesh]]);
  const world = { vehicles: [v] };
  syncCabins(world, meshes, 50, 50);
  v.steer = -0.8;
  for (let i = 0; i < 90; i++) A.syncAutoStuur(world, meshes, 50, 50, 1 / 60);
  const w = mesh.userData.cabin.userData.stuur;
  check('auto: stuur gebouwd in de cabine', !!w && w.visible);
  check('auto: stuur draait mee', w && Math.abs(w.userData.turn.rotation.z - 0.8 * A.STUUR_HOEK) < 0.05, w && String(w.userData.turn.rotation.z));
  v.steer = 0.8;
  for (let i = 0; i < 90; i++) A.syncAutoStuur(world, meshes, 50, 50, 1 / 60);
  check('auto: stuur draait terug de andere kant op', w.userData.turn.rotation.z < -1);
  A.syncAutoStuur(world, meshes, 500, 500, 1 / 60);
  check('auto: ver weg geen stuur', !w.visible);
  check('auto: stuurgeometrie gedeeld', A.stuurwielGeometrie(0.17) === A.stuurwielGeometrie(0.17));
}

if (bad) { console.log(bad + ' mislukt'); process.exit(1); }
console.log('voertuigbediening_test: ok');
