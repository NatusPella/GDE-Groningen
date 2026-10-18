import assert from 'node:assert/strict';
import { FLAT_SCALE, flatSide, flatWheelIndex, flatRadius } from '../game/js/flatlook.js';

const car = [{ x: 1.3, z: -0.8 }, { x: 1.3, z: 0.8 }, { x: -1.2, z: -0.8 }, { x: -1.2, z: 0.8 }];
assert.equal(flatSide(1), 1);
assert.equal(flatSide(2), -1);
assert.equal(flatWheelIndex(car, 1), 1, 'oneven id: voorwiel rechts');
assert.equal(flatWheelIndex(car, 2), 0, 'even id: voorwiel links');
assert.equal(flatWheelIndex([], 3), -1);
assert.equal(flatWheelIndex(null, 3), -1);
assert.equal(flatWheelIndex([{ x: 0, z: -1 }], 1), -1, 'geen wiel aan die kant');
assert.equal(flatWheelIndex([{ x: NaN, z: 1 }, { x: -1, z: 1 }], 1), 1, 'NaN wordt overgeslagen');
assert.ok(FLAT_SCALE < 1 && FLAT_SCALE > 0.6 && flatRadius(0.5) < 0.5);
console.log('flatlook_test ok');
