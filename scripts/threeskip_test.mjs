// #1298: alleen een ontbrekende three.js mag een node3d-test overslaan, en in CI ook dat niet (scripts/lib/threeskip.mjs).
//   node scripts/threeskip_test.mjs
import assert from 'node:assert/strict';
import { skipKeuze, inCi } from './lib/threeskip.mjs';

const geenThree = new Error('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js is not vendored yet: run `cd desktop && npm run stage` once');
const echteFout = new SyntaxError("The requested module './saveslots.js' does not provide an export named 'readSlot'");
const LOKAAL = {}, CI = { CI: 'true' }, REGELS = { GDE_RULES_BASE: 'abc123' };

assert.equal(skipKeuze(geenThree, LOKAAL), 'skip', 'lokaal zonder three.js: SKIP');
assert.equal(skipKeuze(geenThree, CI), 'fout', 'in CI is een ontbrekende three.js een fout');
assert.equal(skipKeuze(geenThree, REGELS), 'fout', 'met GDE_RULES_BASE (CI-diff) ook');
assert.equal(skipKeuze(echteFout, LOKAAL), 'fout', 'een echte importfout in de spelcode is nooit een stille SKIP');
assert.equal(skipKeuze(new TypeError('x is undefined'), LOKAAL), 'fout');
assert.equal(skipKeuze(new Error("Cannot find package 'three' imported from /x"), LOKAAL), 'skip');
assert.equal(inCi(LOKAAL), false); assert.equal(inCi(CI), true);
console.log('threeskip_test: 7 gevallen geslaagd');
