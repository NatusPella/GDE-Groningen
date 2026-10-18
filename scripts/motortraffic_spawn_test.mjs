// Motors in the traffic population on a toy map: they spawn on roads only,
// never on the cycle path, and the scooter population leaves them alone.
//   node scripts/motortraffic_spawn_test.mjs
import './node3d.mjs';
const { manageMotorPopulation, manageScooterPopulation } = await import('../game/js/vehicle.js');

let bad = 0;
const check = (name, ok, info = '') => { if (!ok) { bad++; console.log('FAIL', name, info); } };
const mk = (cat, y, width) => ({ cat, type: cat === 'cycle' ? 'cycleway' : 'residential', width, pts: [[-300, y], [0, y], [300, y]], oneway: false });
const roads = [mk('normal', 0, 6), mk('cycle', 8, 2.5), mk('minor', -9, 4), mk('normal', 20, 6)];
const map = {
  roadsNear: () => roads, buildingsNear: () => [], meta: { neighbourhoodPoints: [] }, nodeAt: () => null, nearestRoadPoint: () => null,
};
const world = { map, player: { x: 0, y: 0, inVehicle: null }, vehicles: [], time: 0, clock: 14, pedView: null };
try {
  manageMotorPopulation(world, { target: 6, spawnMin: 10 });
} catch (e) { console.log('spawn threw', e.message); bad++; }
const motors = world.vehicles.filter((v) => v.isMotor);
check('motors spawned', motors.length > 0, motors.length);
check('all are scooter-family two-wheelers', motors.every((v) => v.isScooter && !v.isBike));
check('none on the cycle path', motors.every((v) => v.road.cat !== 'cycle'));
const n = motors.length;
manageScooterPopulation(world, { target: 0, spawnMin: 10 });
check('the scooter population keeps its hands off them', world.vehicles.filter((v) => v.isMotor).length === n);
if (bad) { console.log(bad, 'failed'); process.exit(1); }
console.log('motortraffic_spawn_test ok', n);
