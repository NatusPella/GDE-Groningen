// On-foot jump/vault/climb rules (game/js/vaultkit.js): obstacle height ->
// hop / vault / climb / block, no accidental vault into the canal, and the
// car-roof helpers.
//   node scripts/vault_test.mjs
import { vaultDecision, vehicleHeight, standable, roofSpot, onRoof, localToWorld, worldToLocal, CLIMB_MAX_H } from '../game/js/vaultkit.js';

let fails = 0;
const check = (name, ok) => { if (!ok) { fails++; console.log('FAIL', name); } else console.log('ok  ', name); };
const car = (name, extra = {}) => ({ x: 10, y: 5, angle: 0.6, speed: 0, model: { name, len: 4.2, wid: 1.8, ...extra.model }, ...extra });

check('nothing ahead: a plain jump', vaultDecision(0) === 'hop');
check('a 0.45 m rail: a plain jump clears it', vaultDecision(0.45) === 'hop');
check('a bench (0.9 m) is vaulted', vaultDecision(0.9) === 'vault');
check('a bollard (1.0 m) is vaulted', vaultDecision(1.0) === 'vault');
check('a fence (1.1 m) is vaulted', vaultDecision(1.1) === 'vault');
check('a 1.3 m low wall / hedge is vaulted', vaultDecision(1.3) === 'vault');
check('a 1.5 m wall without a top blocks', vaultDecision(1.5) === 'block');
check('a building blocks', vaultDecision(8) === 'block');
check('a car roof is climbed', vaultDecision(vehicleHeight(car('sedan')), { top: true }) === 'climb');
check('an SUV roof is climbed', vaultDecision(vehicleHeight(car('suv')), { top: true }) === 'climb');
check('a van is too tall', vaultDecision(vehicleHeight(car('van')), { top: true }) === 'block');
check('a bus is too tall', vaultDecision(vehicleHeight(car('bus')), { top: true }) === 'block');
check('an unknown vehicle blocks', vehicleHeight({ model: { name: 'raket' } }) > CLIMB_MAX_H);
check('model.h overrides', vehicleHeight({ model: { name: 'van', h: 1.4 } }) === 1.4);
check('a parked bike is vaulted over', vaultDecision(vehicleHeight(car('bike')), { top: standable({ isBike: true, model: { name: 'bike' } }) }) === 'vault');

const water = { water: true };
check('a run-up never vaults into the canal', vaultDecision(1.05, { landing: water, deliberate: false }) === 'block');
check('sprinting at a railing never vaults into the canal', vaultDecision(1.05, { landing: water, deliberate: true, sprint: true }) === 'block');
check('standing at the railing, SPACE goes over into the water', vaultDecision(1.05, { landing: water, deliberate: true }) === 'vault');
check('a wall right behind the fence: no vault', vaultDecision(1.1, { landing: { blocked: true } }) === 'block');
check('a viaduct railing over a 6 m drop: no vault', vaultDecision(0.8, { landing: { drop: 6 } }) === 'block');
check('a cutting fence over a 1 m step: vault', vaultDecision(1.1, { landing: { drop: 1 } }) === 'vault');
check('a low car with a blocked far side: climb on instead', vaultDecision(1.25, { top: true, landing: { blocked: true } }) === 'climb');

check('cars have a roof', standable(car('sedan')));
check('bikes, boats, horses and helis do not', !standable({ isBike: true, model: { name: 'bike' } }) && !standable({ isBoat: true, model: { name: 'boat' } }) && !standable(car('horse')) && !standable(car('heli')));

const v = car('hatch');
const [ax, ay] = localToWorld(v, 1.2, -0.4);
const [lx, ly] = worldToLocal(v, ax, ay);
check('local <-> world round trip', Math.abs(lx - 1.2) < 1e-9 && Math.abs(ly + 0.4) < 1e-9);
for (const [fx, fy] of [[-3, 0], [3, 0], [0, 1.4], [0, -1.4], [2.5, 1.2]]) {
  const [wx, wy] = localToWorld(v, fx, fy);
  const s = roofSpot(v, wx, wy);
  check(`roof spot from (${fx}, ${fy}) lies on the roof`, onRoof(v, s.lx, s.ly) && Math.abs(s.lx) < v.model.len / 2 - 0.4 && Math.abs(s.ly) < v.model.wid / 2 - 0.3);
}
check('past the bonnet you step off', !onRoof(v, 2.2, 0));
check('past the side you step off', !onRoof(v, 0, 0.9));

console.log(fails ? `${fails} failed` : 'all passed');
process.exit(fails ? 1 : 0);
