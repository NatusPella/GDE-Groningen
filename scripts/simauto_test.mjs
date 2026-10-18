// Auto's op de simulatiekern en de bridge (simkernel.js dir/stop, simbridge.js updateCars, #58).
//   node scripts/simauto_test.mjs
import assert from 'node:assert/strict';
import { createSimKernel } from '../game/js/simkernel.js';
import { MSG, unpackSnapshot } from '../game/js/simcontract.js';
import { createSimBridge, RECONCILE_EVERY } from '../game/js/simbridge.js';
import { createSimHost } from '../game/js/simhost.js';
import { isAmbientCar } from '../game/js/simambient.js';

// kern: rijrichting en stoppen aan het eind
{
  const k = createSimKernel();
  k.handle({ type: MSG.INIT, seed: 1, roads: [{ id: 5, pts: new Float32Array([0, 0, 1000, 0]) }] });
  k.handle({ type: MSG.SPAWN, agents: [
    { id: 1, road: 5, s: 100, speed: 10, kind: 'car', dir: 1 },
    { id: 2, road: 5, s: 100, speed: 10, kind: 'car', dir: -1 },
    { id: 3, road: 5, s: 990, speed: 10, kind: 'car', dir: 1, stop: true },
  ] });
  let snap;
  for (let t = 0; t < 40; t++) snap = unpackSnapshot(k.handle({ type: MSG.STEP, tick: t, dt: 0.1 }));
  const a = snap.get(1), b = snap.get(2), c = snap.get(3);
  assert.ok(a.x > 100 && Math.abs(a.angle) < 0.01, 'vooruit naar rechts');
  assert.ok(b.x < 900 && Math.abs(Math.abs(b.angle) - Math.PI) < 0.01, 'achteruit rijdt naar links met omgedraaide hoek');
  assert.ok(b.x > 800 && b.x < 900 + 1, 'rijrichting -1 begint aan het andere eind (s = 100 van het einde)');
  assert.ok(c.x > 999 && c.speed === 0, 'een stoppende auto wacht aan het eind');
}

const road = { pts: [[0, 0], [2000, 0]] };
const roads = [];
const carRoads = [{ id: 0, pts: new Float32Array([0, 0, 2000, 0]) }];
const attached = [];
const car = (x, y, angle = 0, extra = {}) => ({ x, y, angle, speed: 8, road, model: { maxSpeed: 50 }, cruiseScale: 1, ...extra });
const player = { x: 0, y: 0 };
const mk = () => createSimBridge({ host: createSimHost({ useWorker: false }), roads, carRoads, roadOf: () => road, attach: (v) => attached.push(v) });

assert.ok(isAmbientCar(car(0, 0)));
assert.ok(!isAmbientCar(car(0, 0, 0, { isPolice: true })) && !isAmbientCar(car(0, 0, 0, { driver: 'player' })) && !isAmbientCar(car(0, 0, 0, { missionCar: true })) && !isAmbientCar(car(0, 0, 0, { road: null })), 'rollen blijven echt');

const bridge = mk();
const cars = [car(600, 1.5), car(1200, -1.5, Math.PI), car(40, 1.5), car(900, 1.5, 0, { isPolice: true })];
const frame = (dt = RECONCILE_EVERY) => { bridge.update(dt, player, [], 0); bridge.updateCars(dt, player, cars); return cars.map((v) => bridge.driveCar(v)); };
let driven = frame();
assert.deepEqual(driven, [true, true, false, false], 'ver weg + gewoon = worker; dichtbij en politie = echt');
assert.equal(bridge.carSize(), 2);
const x0 = cars[0].x, x1 = cars[1].x;
for (let i = 0; i < 150; i++) frame(0.1);
assert.ok(cars[0].x > x0 + 20, 'auto 1 rijdt vooruit');
assert.ok(cars[1].x < x1 - 20 && Math.abs(Math.abs(cars[1].angle) - Math.PI) < 0.01, 'auto 2 rijdt achteruit (andere rijrichting)');
assert.ok(Math.abs(cars[0].y - 1.5) < 0.3 && Math.abs(cars[1].y + 1.5) < 0.3, 'blijft in zijn baan (zijwaartse afstand)');
assert.ok(cars[0].speed > 3, 'snelheid uit het snapshot');

// de speler komt dichtbij: terug naar de echte AI, op het wegennet gezet
player.x = cars[0].x;
for (let i = 0; i < 4; i++) frame();
assert.equal(cars[0]._wid, 0, 'dichtbij is hij weer echt');
assert.ok(attached.includes(cars[0]), 'attachToNearestRoad aangeroepen');

// rol verandert (bestuurder stapt in): terug
player.x = 0;
for (let i = 0; i < 6; i++) frame();
const c1 = cars[1];
assert.ok(c1._wid);
c1.driver = 'player';
assert.equal(bridge.driveCar(c1), false);
assert.equal(c1._wid, 0);

// aan het eind van de weg: terug naar de echte AI
const b2 = createSimBridge({ host: createSimHost({ useWorker: false }), roads, carRoads, roadOf: () => road, attach: (v) => attached.push(v) });
const e = car(1900, 1.5);
const list = [e];
for (let i = 0; i < 400 && (i < 2 || e._wid); i++) { b2.update(0.1, player, [], 0); b2.updateCars(0.1, player, list); b2.driveCar(e); }
assert.equal(e._wid, 0, 'eindpunt van de weg: weer echt');
assert.ok(e.x > 1950, 'op het eind van de weg afgegeven', String(e.x));

// weggehaalde auto's worden afgemeld
const b3 = mk();
const g = car(900, 1.5), l3 = [g];
for (let i = 0; i < 3; i++) { b3.update(RECONCILE_EVERY, player, [], 0); b3.updateCars(RECONCILE_EVERY, player, l3); }
const wid = g._wid;
assert.ok(wid);
l3.length = 0;
for (let i = 0; i < 3; i++) { b3.update(RECONCILE_EVERY, player, [], 0); b3.updateCars(RECONCILE_EVERY, player, l3); }
assert.equal(b3.cars.has(wid), false);

// zonder carRoads blijft alles echt (vlag uit)
const off = createSimBridge({ host: createSimHost({ useWorker: false }), roads });
off.updateCars(1, player, [car(900, 1.5)]);
assert.equal(off.carSize(), 0);
console.log('simauto_test: ok');
