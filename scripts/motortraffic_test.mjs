// AI motorbikes and brommers: picks, speed limit, cycle-path rule, warning text.
//   node scripts/motortraffic_test.mjs
import { pickMotor, motorCruiseTop, motorRoadAllowed, motorTarget, isMotorised, TUNED_TOP } from '../game/js/motortraffic.js';
import { MOPED_LEGAL_SPEED, MOTORBIKE_MODELS } from '../game/js/motomodels.js';

let bad = 0;
const check = (name, ok, info = '') => { if (!ok) { bad++; console.log('FAIL', name, info); } };
let seed = 7;
const rng = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

const counts = {};
let tuned = 0, mopeds = 0;
for (let i = 0; i < 3000; i++) {
  const p = pickMotor('student', rng);
  counts[p.kind] = (counts[p.kind] || 0) + 1;
  if (p.kind === 'moped') { mopeds++; if (p.tuned) tuned++; }
  check('model is motorised', isMotorised(p.model));
  check('legal brommer capped at 45', p.tuned || p.kind !== 'moped' || motorCruiseTop(p.model, false) <= MOPED_LEGAL_SPEED);
  check('traffic bikes stay slower than the shop top', p.kind === 'moped' || p.model.maxSpeed <= MOTORBIKE_MODELS[p.kind].maxSpeed);
}
check('students ride mostly brommers', counts.moped > counts.sport * 5, JSON.stringify(counts));
check('about one in seven brommers is tuned', tuned / mopeds > 0.09 && tuned / mopeds < 0.2, tuned / mopeds);
{
  const t = pickMotor('standaard', () => 0);
  check('a tuned brommer goes faster than 45', motorCruiseTop({ ...t.model, maxSpeed: TUNED_TOP }, true) > MOPED_LEGAL_SPEED);
  check('an untuned one at tuned speed is held to 45', motorCruiseTop({ ...t.model, maxSpeed: TUNED_TOP }, false) === MOPED_LEGAL_SPEED);
}
{
  const m = pickMotor('chic', rng).model;
  check('road is fine', motorRoadAllowed(m, { cat: 'normal', type: 'residential' }));
  check('cycle path is not', !motorRoadAllowed(m, { cat: 'cycle', type: 'cycleway' }));
  check('footway is not', !motorRoadAllowed(m, { cat: 'foot', type: 'footway' }));
  check('by type alone too', !motorRoadAllowed(m, { type: 'cycleway' }));
  check('no road, no ride', !motorRoadAllowed(m, null));
}
check('quieter at night', motorTarget('standaard', 3) < motorTarget('standaard', 14));
check('more in student wijken', motorTarget('student', 14) > motorTarget('chic', 14));
check('never negative', motorTarget('x', -5) >= 0);

if (bad) { console.log(bad, 'failed'); process.exit(1); }
console.log('motortraffic_test ok');
