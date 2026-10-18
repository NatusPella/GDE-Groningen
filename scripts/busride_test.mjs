import assert from 'node:assert';
import { prepareLine, pointAt } from '../game/js/busroutes.js';
import { makeRide, startRide, updateRide, rideStop, stopPos } from '../game/js/busride.js';

const line = prepareLine({ id: 'x', ref: '5', pts: [[0, 0], [1500, 0]], stops: [{ x: 0, y: 0 }, { x: 500, y: 0 }, { x: 1000, y: 0 }, { x: 1500, y: 0 }] });
const mk = () => { let s = 3; return () => (s = (s * 16807) % 2147483647) / 2147483647; };

// Simulatie: de bus rijdt met snelheid v langs de lijn en remt voor haltes.
function drive(speed, { early = false, slow = 1 } = {}) {
  const ride = makeRide(line, { rng: mk() });
  const evs = startRide(ride);
  const bus = { x: 0, y: 0, speed: 0 };
  let s = 0;
  const dt = 0.1;
  for (let i = 0; i < 20000 && !ride.done && !ride.failed; i++) {
    const row = ride.phase === 'dwell' ? null : rideStop(ride);
    if (ride.phase === 'dwell' && ride.dwellLeft > 0 && !early) bus.speed = 0;
    else if (row) {
      const gap = row.s - s;
      const v = Math.min(speed * slow, Math.max(0, gap - 4) * 0.8);
      bus.speed = gap < 6 ? 0 : v;
    } else bus.speed = speed;
    s += bus.speed * dt;
    bus.x = pointAt(line, s).x;
    for (const e of updateRide(ride, bus, dt)) evs.push(e);
  }
  return { ride, evs };
}

const good = drive(8.5);
assert.ok(good.ride.done, 'rit uitgereden');
assert.strictEqual(good.evs.filter((e) => e.type === 'arrive').length, 3);
assert.ok(good.evs.at(-1).type === 'done' && good.ride.onBoard === 0, 'iedereen is uitgestapt');
assert.ok(good.ride.score.pay > 0);
assert.ok(good.ride.passengers > 0);

const late = drive(8.5, { slow: 0.15 });
assert.ok(late.ride.failed === 'laat' || late.ride.score.share < 1, 'veel te langzaam is te laat');

// niet blijven halteren: de bus mag pas weg na de dienstregeling
const g2 = drive(8.5);
const dep = g2.evs.filter((e) => e.type === 'depart');
assert.ok(dep.length >= 2);
assert.deepStrictEqual(stopPos(g2.ride, g2.ride.table[1]), { x: 500, y: 0 });
console.log('busride_test ok');
