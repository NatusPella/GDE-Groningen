// Jatbare auto's (#436): een witte bestelbus en een zwarte politieauto met een
// wachtende of stilstaande bestuurder zijn met E te pakken; rijdend verkeer,
// scène-auto's en de auto van een medespeler niet.
//   node scripts/vehicle_steal_test.mjs
import './node3d.mjs';
import assert from 'node:assert/strict';
const { Vehicle, canEnterVehicle, findEnterableVehicle, POLICE_MODEL } = await import('../game/js/vehicle.js');
const { Player } = await import('../game/js/player.js');

let n = 0;
const ok = (name, f) => { f(); n++; console.log('ok  ' + name); };
const VAN = { name: 'van', len: 5.0, wid: 2.0, maxSpeed: 38, accel: 7, brake: 19, turnRate: 2.0, color: '#d9d9d9' };
const car = (model = VAN) => new Vehicle(0, 0, 0, model);

ok('een lege auto is instapbaar', () => assert.equal(canEnterVehicle(car()), true));
ok('een wachtende in een geparkeerde auto is te jatten', () => {
  const v = car(); v.driver = 'ai'; v.parked = true; v.speed = 0;
  assert.equal(canEnterVehicle(v), true);
});
ok('een witte bestelbus die stil voor het licht staat is te jatten', () => {
  const v = car(); v.driver = 'ai'; v.speed = 0.2; v.road = null;
  assert.equal(canEnterVehicle(v), true);
  assert.equal(findEnterableVehicle(v.halfWid + 1, 0, [v]), v);
});
ok('een zwarte politieauto die stilstaat is te jatten', () => {
  const v = car(POLICE_MODEL); v.isPolice = true; v.driver = 'ai'; v.speed = 0.4;
  assert.equal(canEnterVehicle(v), true);
});
ok('rijdend verkeer laat je met rust', () => {
  const v = car(); v.driver = 'ai'; v.speed = 12;
  assert.equal(canEnterVehicle(v), false);
  assert.equal(findEnterableVehicle(3, 0, [v]), null);
});
ok('een scène- of missieauto is geen jatbare auto', () => {
  for (const d of ['cine', 'owner', 'mission', 'jelle', 'racer']) {
    const v = car(); v.driver = d; v.speed = 0; v.parked = true;
    assert.equal(canEnterVehicle(v), false, d);
  }
});
ok('de auto van een medespeler niet', () => {
  const v = car(); v.driver = 1; v.speed = 0;
  assert.equal(canEnterVehicle(v), false);
});
ok('een wrak of zinkend voertuig niet', () => {
  const v = car(); v.wrecked = true;
  assert.equal(canEnterVehicle(v), false);
  const w = car(); w.sinking = { phase: 'fall' };
  assert.equal(canEnterVehicle(w), false);
});

ok('E in een stilstaande auto met AI-bestuurder is een autokraak', () => {
  const p = new Player(0, 0);
  const v = car(); v.driver = 'ai'; v.speed = 0; v.road = null; v.parked = false;
  const world = { player: p, vehicles: [v], time: 0, audioEvents: [], addMessage() {} };
  p.character = 'anita'; // geen ingesproken regel in een test
  p.enterVehicle(v, world);
  assert.equal(p.inVehicle, v);
  assert.equal(v.driver, 'player');
  assert.equal(v.carjacked, true);
});
console.log(`vehicle_steal_test: ${n} ok`);
