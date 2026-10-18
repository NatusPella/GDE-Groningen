import assert from 'node:assert';
import { prepareLine } from '../game/js/busroutes.js';
import { buildTimetable, punctuality, holdSeconds, stopExchange, tripScore, stopName, CAPACITY } from '../game/js/busservice.js';

const line = prepareLine({ id: 't', ref: '7', pts: [[0, 0], [1000, 0], [2000, 0]], stops: [{ x: 0, y: 0 }, { x: 900, y: 0 }, { x: 2000, y: 0 }] });
assert.strictEqual(line.stops.length, 3);
const tt = buildTimetable(line);
assert.strictEqual(tt.length, 3);
assert.ok(tt[1].arrive > tt[0].depart && tt[2].arrive > tt[1].depart, 'tijden lopen op');
assert.ok(Math.abs(tt[1].arrive - tt[0].depart - 900 / 8.5) < 1e-9);
const back = buildTimetable(line, { dir: -1 });
assert.strictEqual(back[0].s, 2000);
assert.strictEqual(stopName(line, 1), stopName(line, 1), 'stabiel');
assert.strictEqual(punctuality(-30).state, 'vroeg');
assert.strictEqual(punctuality(0).state, 'op tijd');
assert.strictEqual(punctuality(40).state, 'laat');
assert.strictEqual(holdSeconds(tt[1], tt[1].depart - 5), 5);
assert.strictEqual(holdSeconds(tt[1], tt[1].depart + 5), 0);

let seed = 1; const rng = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
let on = 0;
for (let i = 0; i < 3; i++) {
  const ex = stopExchange(rng, { index: i, count: 3, onBoard: on });
  assert.ok(ex.alight >= 0 && ex.alight <= on && on - ex.alight + ex.board <= CAPACITY);
  if (i === 0) assert.strictEqual(ex.alight, 0);
  if (i === 2) { assert.strictEqual(ex.alight, on); assert.strictEqual(ex.board, 0); }
  on += ex.board - ex.alight;
}
const full = stopExchange(rng, { index: 1, count: 4, onBoard: CAPACITY });
assert.ok(full.board <= full.alight);
const good = tripScore({ passengers: 30, deltas: [0, 3, -4] });
const bad = tripScore({ passengers: 30, deltas: [60, 80, -40], hardBrakes: 4 });
assert.ok(good.perfect && good.pay > bad.pay && !bad.perfect);
console.log('busservice_test ok');
