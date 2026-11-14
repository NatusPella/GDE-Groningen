// A1 (bietenoogst) moet ook met een eigen akker bereikbaar zijn; daarna niet meer.
import './node3d.mjs';
import assert from 'node:assert';
const { bietenoogstBeschikbaar } = await import('../game/js/sidejob_bieten.js');
assert.equal(bietenoogstBeschikbaar(true, 'A1'), true, 'A1 met eigen akker blijft beschikbaar');
assert.equal(bietenoogstBeschikbaar(false, 'M11'), true, 'zonder eigen akker altijd beschikbaar');
assert.equal(bietenoogstBeschikbaar(true, 'M11'), false, 'na A1 verbergt de eigen akker het loonwerk');
console.log('bietenoogst_a1_test: 3/3 ok');
