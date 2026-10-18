import assert from 'node:assert';
import { passRing, RING_R, ringScale, newRunState, nextLeg } from '../game/js/heliplan.js';

const ring = { x: 0, y: 0, z: 50, yaw: 0 };
const leg = { kind: 'rings', rings: [ring, { x: 200, y: 0, z: 50, yaw: 0 }] };
const fly = (path) => {
  const st = newRunState();
  let out = null;
  for (const p of path) { out = passRing(leg, st, p) || out; if (out) break; }
  return out;
};
const line = (x0, y, z, x1, step = 2) => { const a = []; for (let x = x0; x <= x1; x += step) a.push({ x, y, z }); return a; };
assert.strictEqual(fly(line(-60, 0, 50, 60)), 'hit', 'recht door het midden');
assert.strictEqual(fly(line(-60, RING_R * 1.1, 50, 60)), 'hit', 'door de rand van de hoepel');
assert.notStrictEqual(fly(line(-60, RING_R * 2, 50, 60)), 'hit', 'ernaast is geen hit');
assert.notStrictEqual(fly(line(-60, 0, 50 + RING_R * 2, 60)), 'hit', 'erboven is geen hit');
assert.strictEqual(fly(line(-60, RING_R * 2, 50, 60)), 'miss', 'ernaast voorbij is gemist');
// stilhangen in het midden telt ook
assert.strictEqual(fly([{ x: -2, y: 0, z: 50 }, { x: -2, y: 0, z: 50 }]), 'hit');
// niet achterwaarts door
assert.notStrictEqual(fly(line(-60, 0, 50, 60).reverse()), 'hit', 'achterwaarts');
assert.strictEqual(ringScale(0), 1); assert.strictEqual(ringScale(5000), 4); assert.ok(ringScale(520) === 2);
const st = newRunState(); st.prev = { x: 1, y: 1, z: 1 }; nextLeg(st); assert.strictEqual(st.prev, null);
console.log('ring_hoop_test ok');
