// Een geparkeerd achtervolgingsdoel (M07 tankwagen) wacht op de speler: 6 s plus de rit ernaartoe (speeltestlus: 750 m in 6 s was onhaalbaar).
//   node scripts/chasewait_test.mjs
import './node3d.mjs';
import assert from 'node:assert/strict';
const M = await import('../game/js/missions.js');
const { CHASE_WAIT_MAX, chaseWaitMax } = M;
assert.equal(chaseWaitMax(0, { parked: 60 }), CHASE_WAIT_MAX);
assert.equal(chaseWaitMax(50, { parked: 60 }), CHASE_WAIT_MAX, 'al binnen de ring: geen extra tijd');
// M07: start 750 m van de tankwagen, ring 60 m: genoeg tijd voor 690 m rijden
const w = chaseWaitMax(750, { parked: 60 });
assert.ok(w > CHASE_WAIT_MAX + 30 && w < 80, `wachttijd M07 ${w}`);
assert.ok(690 / (w - CHASE_WAIT_MAX) <= 20, 'rij-eis blijft onder 20 m/s');
console.log('chasewait_test: 5 checks ok');
process.exit(0);
