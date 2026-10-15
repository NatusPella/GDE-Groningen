// Logic test for the money fines in trafficlaw.js (phone in hand, no bike light):
//   node scripts/fines_test.mjs
import { checkPhoneWhileMoving, updateBikeLight, resetLightFine, FINE_PHONE, FINE_NO_LIGHT } from '../game/js/trafficlaw.js';

let fails = 0, n = 0;
const ok = (c, name) => { n++; if (!c) { fails++; console.log('FAIL', name); } };

const msgs = [];
const mk = (over = {}) => {
  const bike = { isBike: true, speed: 5, x: 0, y: 0, angle: 0 };
  return {
    money: 500, health: 100, addMessage: (t) => msgs.push(t),
    player: { x: 0, y: 0, inVehicle: bike },
    pedestrians: [{ isCop: true, x: 20, y: 0, state: 'wander' }], vehicles: [bike],
    dayNight: { night: 0 }, ...over,
  };
};

let w = mk();
ok(checkPhoneWhileMoving(w) === FINE_PHONE.fiets && w.money === 500 - FINE_PHONE.fiets, 'phone on a bike in an agent\'s sight: fined');
ok(/boete/.test(msgs[msgs.length - 1]), 'with a message');

w = mk(); w.pedestrians = [];
ok(checkPhoneWhileMoving(w) === 0 && w.money === 500, 'no agent about: no fine');
w = mk(); w.player.inVehicle.speed = 0;
ok(checkPhoneWhileMoving(w) === 0, 'standing still: no fine');
w = mk(); w.player.inVehicle = null;
ok(checkPhoneWhileMoving(w) === 0, 'on foot: no fine');
w = mk({ mission: { phase: 'active' } });
ok(checkPhoneWhileMoving(w) === 0, 'never during a mission');
w = mk(); w.money = 10;
ok(checkPhoneWhileMoving(w) === 10 && w.money === 0, 'never more than you have');

const car = { speed: 9, x: 0, y: 0, angle: 0 };
w = mk(); w.player.inVehicle = car; w.vehicles = [car];
ok(checkPhoneWhileMoving(w) === FINE_PHONE.auto, 'a car pays the higher fine');

// the bike light: dark, an agent watching for a few seconds, then once per two minutes
resetLightFine();
w = mk({ dayNight: { night: 1 } });
let paid = 0;
for (let i = 0; i < 40; i++) paid += updateBikeLight(0.1, w);
ok(paid === FINE_NO_LIGHT, 'a dark ride past an agent: one fine');
for (let i = 0; i < 100; i++) paid += updateBikeLight(0.1, w);
ok(paid === FINE_NO_LIGHT, 'then a long pause');
resetLightFine();
w = mk({ dayNight: { night: 0 } }); paid = 0;
for (let i = 0; i < 60; i++) paid += updateBikeLight(0.1, w);
ok(paid === 0, 'daytime: no fine');
resetLightFine();
w = mk({ dayNight: { night: 1 } }); w.player.inVehicle.light = true; paid = 0;
for (let i = 0; i < 60; i++) paid += updateBikeLight(0.1, w);
ok(paid === 0, 'with a light: no fine');
resetLightFine();
w = mk({ dayNight: { night: 1 } }); w.pedestrians = []; paid = 0;
for (let i = 0; i < 60; i++) paid += updateBikeLight(0.1, w);
ok(paid === 0, 'no agent in sight: no fine');

console.log(`${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
