import assert from 'node:assert/strict';
import { timeWarning, timeWarningText, TIME_WARN_AT } from '../game/js/timewarn.js';

assert.deepEqual(TIME_WARN_AT, [30, 10]);
assert.equal(timeWarning(null, 25), 0, 'geen waarschuwing bij de start');
assert.equal(timeWarning(31, 29.9), 30);
assert.equal(timeWarning(30.1, 30), 30, 'precies op de drempel telt');
assert.equal(timeWarning(29.9, 29.8), 0, 'al onder de drempel: niet nog eens');
assert.equal(timeWarning(11, 9.5), 10);
assert.equal(timeWarning(40, 5), 10, 'sprong over beide: de dringendste');
assert.equal(timeWarning(5, 0), 0, 'bij nul meldt de missie zelf al "tijd op"');
assert.equal(timeWarning(20, 45), 0, 'bonustijd is geen waarschuwing');
assert.equal(timeWarning(Infinity, 20), 0);
assert.equal(timeWarning(12, NaN), 0);
// Bonustijd boven de drempel en daarna weer eronder waarschuwt opnieuw.
assert.equal(timeWarning(45, 31), 0);
assert.equal(timeWarning(31, 29), 30);
assert.equal(timeWarningText(30), 'Nog 30 seconden');
assert.equal(timeWarningText(10), 'Nog 10 seconden!');
console.log('timewarn_test: ok');
