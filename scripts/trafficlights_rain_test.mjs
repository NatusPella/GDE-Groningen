// Rain gives cyclists an earlier green: car phases run faster when wet.
//   node scripts/trafficlights_rain_test.mjs
import './node3d.mjs';
const { trafficClockRate, RAIN_CAR_SPEEDUP } = await import('../game/js/trafficlights.js');

let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } };
const car = { axis: 0, move: 'all' };
ok(trafficClockRate(car, 0) === 1, 'dry: normal speed');
ok(trafficClockRate(car, 0.2) === 1, 'drizzle: normal speed');
ok(Math.abs(trafficClockRate(car, 1) - (1 + RAIN_CAR_SPEEDUP)) < 1e-9, 'downpour: car phase faster');
ok(trafficClockRate(car, 0.6) > 1 && trafficClockRate(car, 0.6) < trafficClockRate(car, 1), 'monotonic');
ok(trafficClockRate({ bike: true }, 1) === 1, 'bike green never shortened');
ok(trafficClockRate({ idle: true }, 1) === 1, 'idle untouched');
ok(trafficClockRate(null, 1) === 1, 'no phase');
if (fails) process.exit(1);
console.log('trafficlights_rain_test: ok');
