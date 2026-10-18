import assert from 'node:assert';
import { findClearSpot, CLEAR } from '../game/js/helispawn.js';

const pad = { x: 100, y: 100, deck: 12, angle: 0 };
// niemand in de weg: blijft op de plek
let s = findClearSpot(pad, [], { deck: false });
assert.deepStrictEqual([s.x, s.y, s.z, s.moved], [100, 100, 12, false]);
// speler-heli staat op de pad: op de grond een plek ernaast, ver genoeg
const own = { x: 101, y: 100, z: 12 };
s = findClearSpot(pad, [own], { deck: false });
assert.ok(s && s.moved && Math.hypot(s.x - own.x, s.y - own.y) >= CLEAR && s.z === 12);
// op een dek is er geen ruimte ernaast: null (wachten)
assert.strictEqual(findClearSpot(pad, [own], { deck: true }), null);
// een heli op een heel andere hoogte (boven het dek) blokkeert niet
assert.strictEqual(findClearSpot(pad, [{ x: 100, y: 100, z: 80 }], { deck: true }).moved, false);
// meerdere helis rondom: kiest nog steeds een vrije plek of niets
const ring = [0, 1, 2, 3, 4, 5].map((k) => ({ x: 100 + Math.cos(k) * 15, y: 100 + Math.sin(k) * 15, z: 12 }));
s = findClearSpot(pad, [own, ...ring], { deck: false });
assert.ok(!s || [own, ...ring].every((b) => Math.hypot(s.x - b.x, s.y - b.y) >= CLEAR));
// afstand precies op de grens
assert.strictEqual(findClearSpot(pad, [{ x: 100 + CLEAR, y: 100, z: 12 }], { deck: true }).moved, false);
console.log('helispawn_test ok');
