// Figures on a boat are shown only while it floats (decorrules.js, issue #148).
//   node scripts/decorrules_test.mjs
import { decorVisible } from '../game/js/decorrules.js';
let bad = 0;
const check = (n, ok) => { if (!ok) { bad++; console.log('FAIL', n); } };
check('afloat boat: shown', decorVisible({ sinking: null, wrecked: false }));
check('boat without flags: shown', decorVisible({}));
check('sinking boat (mesh below the waterline): hidden', !decorVisible({ sinking: { z: -4, pitch: 0.4 } }));
check('wrecked boat: hidden', !decorVisible({ wrecked: true }));
check('no boat: hidden', !decorVisible(null));
console.log(bad ? `${bad} failed` : 'all passed');
process.exit(bad ? 1 : 0);
