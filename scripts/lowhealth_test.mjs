// Doodgaan en zwaar gewond (#436): het rode scherm en de flits na een klap. Alleen de pure regels (lowhealthrules.js).
import assert from 'node:assert/strict';
import { hurtLevel, walkFactor, flashFor } from '../game/js/lowhealthrules.js';

assert.equal(hurtLevel(100), 0);
assert.equal(hurtLevel(25), 0);
assert.ok(hurtLevel(10) > 0.5 && hurtLevel(10) < 1);
assert.equal(hurtLevel(0), 1, 'dood: het scherm staat volledig rood');
assert.equal(hurtLevel(-5), 1);
assert.equal(hurtLevel(NaN), 0);
assert.equal(flashFor(100, 95), 0, 'een schram geeft geen flits');
assert.ok(flashFor(100, 70) > 0.5);
assert.equal(flashFor(100, 0), 1);
assert.equal(walkFactor(0), 0.7);
console.log('lowhealth_test ok');
