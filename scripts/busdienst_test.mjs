// De bus in de gedeelde dienstvorm (#444): maakBusdienst, busVoortgang, busUitslag en busStand.
// De regels zelf (dienstregeling, tevredenheid, deuren) zitten in busride_test.mjs.
//   node scripts/busdienst_test.mjs
import assert from 'node:assert';
import { prepareLine, pointAt } from '../game/js/busroutes.js';
import { rideStop, updateRide } from '../game/js/busride.js';
import { maakBusdienst, busVoortgang, busUitslag, busStand } from '../game/js/busride.js';

const line = prepareLine({ id: 'x', ref: '5', pts: [[0, 0], [1500, 0]], stops: [{ x: 0, y: 0 }, { x: 500, y: 0 }, { x: 1000, y: 0 }, { x: 1500, y: 0 }] });
const mk = () => { let s = 3; return () => (s = (s * 16807) % 2147483647) / 2147483647; };

const { ride, start } = maakBusdienst(line, { rng: mk() });
assert.ok(ride && start.length > 0 && start[0].type === 'board', 'de dienst start met instappers');
assert.strictEqual(ride.phase, 'dwell');
assert.strictEqual(busVoortgang(ride), 0, 'nog geen halte gehaald');
assert.strictEqual(busUitslag(ride), null, 'zonder eindstand geen uitslag');
const stand0 = busStand(ride);
assert.strictEqual(stand0.vervoer, 'bus');
assert.strictEqual(stand0.totaal, 3, 'drie halten te gaan');
assert.ok(stand0.volgende);

// Rijd de lijn, rem voor de haltes en wacht de dienstregeling af.
const bus = { x: 0, y: 0, speed: 0 };
let s = 0, midden = null;
const dt = 0.1;
for (let i = 0; i < 20000 && !ride.done && !ride.failed; i++) {
  const row = ride.phase === 'dwell' ? null : rideStop(ride);
  if (ride.phase === 'dwell' && ride.dwellLeft > 0) bus.speed = 0;
  else if (row) {
    const gap = row.s - s;
    bus.speed = gap < 6 ? 0 : Math.min(8.5, Math.max(0, gap - 4) * 0.8);
  } else bus.speed = 8.5;
  s += bus.speed * dt;
  bus.x = pointAt(line, s).x;
  updateRide(ride, bus, dt);
  if (midden == null && ride.next >= 2) midden = busVoortgang(ride);
}
assert.ok(ride.done, 'de rit is uitgereden');
assert.ok(midden > 0 && midden < 1, 'onderweg is de voortgang tussen nul en een: ' + midden);
assert.strictEqual(busVoortgang(ride), 1);

const u = busUitslag(ride);
assert.strictEqual(u.vervoer, 'bus');
assert.strictEqual(u.klaar, true);
assert.ok(u.gehaald === 3, 'drie halten: ' + u.gehaald);
assert.strictEqual(u.totaal, 3);
assert.ok(u.punten >= 55 && u.punten <= 100, 'punten: ' + u.punten);
assert.ok(u.medaille >= 1 && u.medailleNaam !== 'geen medaille', 'er is een medaille: ' + u.medailleNaam);
assert.ok(u.loon > 0, 'de rit levert loon op');
assert.ok(u.tevredenheid >= 0 && u.tevredenheid <= 100);
assert.strictEqual(busStand(ride).volgende, null);

// Een halve rit heeft nog geen uitslag, maar wel voortgang.
{
  const half = maakBusdienst(line, { rng: mk() });
  const b2 = { x: 0, y: 0, speed: 0 };
  let s2 = 0;
  for (let i = 0; i < 400 && !half.ride.done; i++) {
    const row = half.ride.phase === 'dwell' ? null : rideStop(half.ride);
    if (half.ride.phase === 'dwell' && half.ride.dwellLeft > 0) b2.speed = 0;
    else if (row) { const gap = row.s - s2; b2.speed = gap < 6 ? 0 : Math.min(8.5, Math.max(0, gap - 4) * 0.8); }
    else b2.speed = 8.5;
    s2 += b2.speed * dt;
    b2.x = pointAt(line, s2).x;
    updateRide(half.ride, b2, dt);
  }
  assert.strictEqual(busUitslag(half.ride), null);
  assert.ok(busVoortgang(half.ride) >= 0 && busVoortgang(half.ride) < 1);
}

console.log('busdienst_test ok');
