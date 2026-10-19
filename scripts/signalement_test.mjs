// Logic test for signalement.js (what the police know about your vehicle):
//   node scripts/signalement_test.mjs
import { profileOf, fitsProfile, decayFactor, MISMATCH_DECAY, hintFor, MISMATCH_HINT, ON_FOOT_HINT } from '../game/js/signalement.js';
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
{ const flash = { color: '#7a1f1f', model: { name: 'sedan' }, tuning: { opvallend: 0.5 } };
  const pf = profileOf(w(flash));
  ok(Math.abs(decayFactor(pf, w(flash)) - 0.8) < 1e-9, 'flashy tuning: slower cooldown');
  flash.tuning.opvallend = 3;
  ok(Math.abs(decayFactor(pf, w(flash)) - 0.6) < 1e-9, 'flashy tuning is capped at 40% slower');
  flash.tuning.opvallend = 0;
  ok(decayFactor(pf, w(flash)) === 1, 'no flash: normal'); }
const foot = profileOf(w(null));
ok(fitsProfile(foot, w(null)) && !fitsProfile(foot, w(car)), 'on foot stays on foot');
ok(hintFor(prof, w(other), false) === MISMATCH_HINT, 'another car: one hint');
ok(hintFor(prof, w(other), true) === null, 'the hint comes once');
ok(hintFor(prof, w(null), false) === ON_FOOT_HINT, 'on foot: the hint does not call it another vehicle');
{ const c2 = { color: '#111111', model: { name: 'hatch' } }; const p2 = profileOf(w(c2)); ok(hintFor(p2, w(c2), false) === null && hintFor(null, w(c2), false) === null, 'same car or no description: no hint'); }
ok(!/dood|bloed|schiet/i.test(MISMATCH_HINT), 'the hint is plain Dutch text');
console.log(`${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
