// Voertuigdeuren tekenen (#225): bouwt meshes in Node en laat deuren open/los gaan.
//   node scripts/vehicledoors3d_test.mjs   (eenmalig: cd desktop && npm run stage)
import './node3d.mjs';

const THREE = await import('three');
await import('../game/js/player.js');
const { buildVehicleMesh } = await import('../game/js/models3d_vehicles.js');
const { Vehicle, TRAFFIC_MODELS } = await import('../game/js/vehicle.js');
const { syncVehicleDoors, tickLooseDoors } = await import('../game/js/vehicledoors3d.js');
const { doorsFor } = await import('../game/js/vehicledoors.js');

let bad = 0;
const check = (name, ok, info = '') => { if (!ok) { bad++; console.log('FAIL', name, info); } };
const scene = new THREE.Scene();
const seen = new Set();
const zichtbaar = (o) => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; };
const visible = (mesh) => { let n = 0; mesh.traverse((o) => { if (o.isMesh && o.parent && o.parent.parent && o.parent.parent.name === 'deuren' && zichtbaar(o)) n++; }); return n; };

for (const m of TRAFFIC_MODELS()) {
  if (seen.has(m.name)) continue;
  seen.add(m.name);
  const v = new Vehicle(0, 0, 0, m);
  const mesh = buildVehicleMesh(v);
  scene.add(mesh);
  const defs = doorsFor(v);
  syncVehicleDoors(mesh, v, 1 / 60, null);
  // een bus heeft bewust een gesloten deurblad (blauw glas boven wit, a3450b80); de rest tekent niets extra
  check(m.name + ': gesloten zonder extra mesh', !mesh.userData.doorRig || (m.name === 'bus' ? visible(mesh) >= 1 : visible(mesh) === 0), 'zichtbaar ' + visible(mesh));
  if (!defs.length) { check(m.name + ': geen deuren, geen rig', !mesh.userData.doorRig); continue; }
  const rol = defs.some((d) => d.seat === 'bestuurder') ? 'bestuurder' : 'bijrijder';
  for (let i = 0; i < 30; i++) syncVehicleDoors(mesh, v, 1 / 60, { rol, open: true });
  check(m.name + ': deur open zichtbaar', !!mesh.userData.doorRig && visible(mesh) >= 1, m.name);
  for (let i = 0; i < 120; i++) syncVehicleDoors(mesh, v, 1 / 60, { rol, open: false });
  check(m.name + ': deur weer dicht', visible(mesh) === 0, m.name);
  if (v.isBus) continue; // een bus die stilstaat opent zijn deuren vanzelf
  v.speed = 15;
  for (let i = 0; i < 10; i++) syncVehicleDoors(mesh, v, 1 / 60, { rol, open: true });
  check(m.name + ': rijdend blijft dicht', visible(mesh) === 0);
}

// losgaan en opruimen
const sedan = new Vehicle(0, 0, 0, TRAFFIC_MODELS().find((m) => m.name === 'sedan'));
const sm = buildVehicleMesh(sedan); scene.add(sm);
sedan.dentLog = [[0.6, 0.9, 0.8], [0.7, 0.9, 0.8]];
const before = scene.children.length;
syncVehicleDoors(sm, sedan, 1 / 60, null);
check('deur ligt los in de scene', scene.children.length === before + 1);
for (let i = 0; i < 60 * 30; i++) tickLooseDoors(1 / 60);
check('losse deur wordt opgeruimd', scene.children.length === before);
// motorkap: eerst scheef (op een kier), dan los
sedan.dentLog = [[2, 0, 0.8]];
syncVehicleDoors(sm, sedan, 1 / 60, null);
check('kap staat scheef, nog vast', sedan.doors.dmg.kap === 'scheef' && sm.userData.doorRig.doors.kap.pivot.visible && !sedan.doors.loose.kap);
const voor = scene.children.length;
sedan.dentLog = [[2, 0, 1.1], [2, 0.2, 1.0]];
syncVehicleDoors(sm, sedan, 1 / 60, null);
check('kap ligt los in de scene', sedan.doors.loose.kap && scene.children.length === voor + 1);
for (let i = 0; i < 60 * 30; i++) tickLooseDoors(1 / 60);
check('losse kap opgeruimd', scene.children.length === voor);
sedan.dentLog = [];
syncVehicleDoors(sm, sedan, 1 / 60, null);
check('reparatie: deur terug', !Object.keys(sedan.doors.loose).length);

if (bad) { console.log(bad + ' mislukt'); process.exit(1); }
console.log('vehicledoors3d_test: ok');
process.exit(0); // overlayhold.js start een interval bij het laden
