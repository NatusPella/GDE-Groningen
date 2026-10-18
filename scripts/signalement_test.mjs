// Logic test for signalement.js (what the police know about your vehicle):
//   node scripts/signalement_test.mjs
import { profileOf, fitsProfile, decayFactor, MISMATCH_DECAY } from '../game/js/signalement.js';
let fails = 0, n = 0;
const ok = (c, name) => { n++; if (!c) { fails++; console.log('FAIL', name); } };
const car = { color: '#7a1f1f', model: { name: 'sedan' } };
const other = { color: '#2f3a52', model: { name: 'sedan' } };
const w = (v) => ({ player: { inVehicle: v } });
const prof = profileOf(w(car));
ok(fitsProfile(prof, w(car)) && decayFactor(prof, w(car)) === 1, 'same car: fits');
ok(!fitsProfile(prof, w(other)) && decayFactor(prof, w(other)) === MISMATCH_DECAY, 'another car: no match, faster decay');
ok(!fitsProfile(prof, w(null)), 'on foot: no match');
car.color = '#ffffff';
ok(!fitsProfile(prof, w(car)), 'repainted: no match');
ok(fitsProfile(null, w(car)), 'no description: fits');
const foot = profileOf(w(null));
ok(fitsProfile(foot, w(null)) && !fitsProfile(foot, w(car)), 'on foot stays on foot');
console.log(`${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
