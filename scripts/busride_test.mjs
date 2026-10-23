import assert from 'node:assert';
import { prepareLine, pointAt } from '../game/js/busroutes.js';
import { makeRide, planRide, startRide, takeOverRide, updateRide, rideStop, stopPos } from '../game/js/busride.js';

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
// stuk van een lange lijn: begint bij de dichtstbijzijnde halte, tijden vanaf 0
{
  const L = prepareLine({ id: 9, ref: '7', pts: [[0, 0], [10000, 0]], stops: Array.from({ length: 21 }, (_, k) => ({ x: k * 500, y: 0 })) });
  const a = planRide(L, 480, 5);
  assert.deepStrictEqual(a, { dir: 1, first: 1 });
  const b = planRide(L, 9900, 0);
  assert.deepStrictEqual(b, { dir: -1, first: 0 }, 'aan het eind keert de rit om');
  const r = makeRide(L, { ...a, max: 8 });
  assert.strictEqual(r.table.length, 8);
  assert.strictEqual(r.table[0].arrive, 0);
  assert.ok(r.table[0].index === 1 && stopPos(r, r.table[0]).x === 500, 'eerste rij is halte 1');
}
// de dienst overnemen van een rijdende bus (#396)
{
  // de bus rijdt vanaf boogafstand s0 in richting dir met snelheid speed en remt voor de haltes
  const driveFrom = (ride, s0, dir, speed) => {
    const bus = { x: pointAt(line, s0).x, y: 0, speed: 0 };
    let s = s0;
    for (let i = 0; i < 20000 && !ride.done && !ride.failed; i++) {
      const row = ride.phase === 'dwell' ? null : rideStop(ride);
      if (ride.phase === 'dwell' && ride.dwellLeft > 0) bus.speed = 0;
      else if (row) {
        const gap = Math.abs(row.s - s);
        bus.speed = gap < 6 ? 0 : Math.min(speed, Math.max(0, gap - 4) * 0.8);
      } else bus.speed = speed;
      s += dir * bus.speed * 0.1;
      bus.x = pointAt(line, s).x;
      updateRide(ride, bus, 0.1);
    }
    return ride;
  };
  // vooruit, tussen halte 500 en 1000 in: de rit begint bij halte 500, het doel is 1000
  const r1 = takeOverRide(line, { dir: 1, s: 700, rng: mk() });
  assert.ok(r1.table[0].s === 500 && r1.table[1].s === 1000 && r1.next === 1 && r1.phase === 'drive');
  assert.ok(r1.onBoard > 0 && r1.passengers === 0, 'er zitten reizigers in, die tellen niet voor het loon');
  assert.ok(Math.abs(r1.t - (9 + 200 / 8.5)) < 1e-9, 'de klok loopt mee met het stuk dat al gereden is');
  const klaar = driveFrom(r1, 700, 1, 8.5);
  assert.ok(klaar.done && !klaar.failed, 'de overgenomen rit wordt afgemaakt');
  assert.ok(klaar.deltas.every((d) => Math.abs(d) < 25), 'zonder vertraging niet te vroeg of te laat: ' + klaar.deltas.map((d) => d.toFixed(1)));
  // terug (dir -1): de lijn omgekeerd, de bus tussen 1500 en 1000
  const r2 = takeOverRide(line, { dir: -1, s: 1200, rng: mk() });
  assert.ok(r2.table[0].s === 1500 && r2.table[1].s === 1000, 'terug: van halte 1500 naar 1000');
  assert.ok(Math.abs(r2.t - (9 + 300 / 8.5)) < 1e-9);
  assert.ok(driveFrom(r2, 1200, -1, 8.5).done);
  // een stuk van de lijn
  const r3 = takeOverRide(line, { dir: 1, s: 700, rng: mk(), max: 2 });
  assert.strictEqual(r3.table.length, 2);
  // net bij een halte (boven 1 m erbij) telt de volgende
  assert.strictEqual(takeOverRide(line, { dir: 1, s: 500.5, rng: mk() }).table[1].s, 1000);
  // voor de eerste halte: de klok begint negatief
  const r4 = takeOverRide(line, { dir: 1, s: -100, rng: mk() });
  assert.ok(r4.table[0].s === 0 && r4.t < 9);
  // voorbij de laatste halte: geen dienst
  assert.strictEqual(takeOverRide(line, { dir: 1, s: 1600, rng: mk() }), null);
  assert.strictEqual(takeOverRide(line, { dir: -1, s: -5, rng: mk() }), null);
  // op de voorlaatste halte nog net een rit van twee haltes, daarna niet meer
  assert.strictEqual(takeOverRide(line, { dir: 1, s: 1200, rng: mk() }).table.length, 2);
  assert.strictEqual(takeOverRide(line, { dir: 1, s: 1499.5, rng: mk() }), null, 'binnen 1 m van de laatste halte: er is niets meer te rijden');
}
console.log('busride_test ok');
