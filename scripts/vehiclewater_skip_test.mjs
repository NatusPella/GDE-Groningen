// De watertoets van AI-voertuigen slaat kleine verplaatsingen over. node scripts/vehiclewater_skip_test.mjs
import './node3d.mjs';
const { vehicleWaterTestDue, checkVehicleWater } = await import('../game/js/vehicle.js');
let n = 0, fails = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FAIL', m); } };
const v = { x: 10, y: 10, z: 0 };
ok(vehicleWaterTestDue(v) === true, 'eerste keer toetsen');
ok(vehicleWaterTestDue(v) === false, 'niet verplaatst: overslaan');
v.x += 0.2; v.y += 0.1;
ok(vehicleWaterTestDue(v) === false, 'minder dan 0,5 m: overslaan');
v.x += 0.4;
ok(vehicleWaterTestDue(v) === true, 'samen meer dan 0,5 m: toetsen');
ok(vehicleWaterTestDue(v) === false, 'daarna weer overslaan');
v.z = 0.5;
ok(vehicleWaterTestDue(v) === true, 'hoogteverschil (brug, viaduct): toetsen');
let tests = 0; for (let i = 0; i < 100; i++) if (vehicleWaterTestDue(v)) tests++;
ok(tests >= 2 && tests <= 4, 'ook stilstaand zo nu en dan opnieuw: ' + tests + ' van 100');
v.airborne = true; v._wx = v.x; v._wskip = 0;
ok(vehicleWaterTestDue(v) === true, 'in de lucht altijd toetsen');
// speler en een testfunctie `wet` blijven elk frame toetsen
const map = {}; let calls = 0;
const p = { x: 0, y: 0, z: 0, driver: 'player', speed: 0, model: { len: 4 }, halfLen: 2 };
const world = { time: 1, addMessage() {}, vehicles: [], players: [], inVehicle: null };
try { for (let i = 0; i < 5; i++) { world.time += 0.016; checkVehicleWater(p, map, world, () => { calls++; return false; }); } } catch (e) { console.log('(wereld-stub te mager:', e.message + ')'); }
ok(calls >= 5, 'met eigen wet-functie elk frame: ' + calls);
console.log(`vehiclewater_skip_test: ${n - fails}/${n}`);
process.exit(fails ? 1 : 0);
