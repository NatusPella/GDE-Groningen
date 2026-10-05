// A player boat with a sail that has no wind yet (sailTop 0: the skûtsje
// race countdown) must stay finite with the throttle held.
//   node scripts/vehicle_finite_test.mjs
import './node3d.mjs';

const { Vehicle } = await import('../game/js/vehicle.js');
const { BOAT_KINDS } = await import('../game/js/boattypes.js');

let bad = 0;
const check = (name, ok) => { if (!ok) { bad++; console.log('FAIL', name); } };

const boat = new Vehicle(0, 0, 0, { ...BOAT_KINDS.skutsje });
boat.isBoat = true;
boat.driver = 'player';
boat.sailTop = 0;
for (let i = 0; i < 120; i++) boat.applyControls(1 / 60, 1, 0, false);
check('speed finite with sailTop 0', Number.isFinite(boat.speed) && Number.isFinite(boat.x) && Number.isFinite(boat.y));
boat.sailTop = 6;
for (let i = 0; i < 600; i++) boat.applyControls(1 / 60, 1, 0, false);
check('boat accelerates once the wind comes', boat.speed > 1 && boat.speed <= 6.01);

if (bad) process.exit(1);
console.log('vehicle finite: all passed');
