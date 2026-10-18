// A flier only touches props that reach up to it (flightrules.js, issue #139).
//   node scripts/flightrules_test.mjs
import { touchesProp, FLIGHT_MARGIN } from '../game/js/flightrules.js';
let bad = 0;
const check = (n, ok) => { if (!ok) { bad++; console.log('FAIL', n); } };
const bike = 1.0;
check('pigeon at 5 m over a bike: no touch', !touchesProp(5, bike));
check('pigeon at 1.5 m over a bike: no touch', !touchesProp(1.5, bike));
check('pigeon just above the margin: no touch', !touchesProp(bike + FLIGHT_MARGIN + 0.01, bike));
check('pigeon on the ground (0 m): touches', touchesProp(0, bike));
check('pigeon at 0.5 m: touches', touchesProp(0.5, bike));
check('pigeon at 3 m past a 4 m static collider: touches', touchesProp(3, 4));
check('pigeon at 5 m past a 4 m static collider: no touch', !touchesProp(5, 4));
check('prop without height defaults to 1 m', !touchesProp(3) && touchesProp(0.2));
console.log(bad ? `${bad} failed` : 'all passed');
process.exit(bad ? 1 : 0);
