// Oefenronde (#201): de stappen worden afgevinkt op wat de speler doet. Draai: node scripts/practice_test.mjs
import { STEPS, DONE, startPractice, stepPractice, currentStep } from '../game/js/practicekit.js';

let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.error('FAIL', m); } };
const run = (st, obs, n = 1) => { let adv = []; for (let i = 0; i < n; i++) { const r = stepPractice(st, { dt: 0.1, ...obs }); st = r.st; if (r.advanced) adv.push(r.advanced.id); } return { st, adv }; };

let st = startPractice();
ok(currentStep(st).id === 'lopen', 'begint bij lopen');
// stilstaan telt niet, ook niet met shift
let r = run(st, { dist: 0, sprinting: true }, 50); st = r.st;
ok(r.adv.length === 0, 'stilstaan = geen voortgang');
r = run(st, { dist: 0.5 }, 20); st = r.st;
ok(r.adv.join() === 'lopen', 'lopen na 10 m');
r = run(st, { dist: 0.3, sprinting: true }, 20); st = r.st;
ok(r.adv.join() === 'rennen', 'rennen na 2 s rennen');
// de kaart: alleen het openen telt (rand), blijven openstaan niet
r = run(st, { mapOpen: true }, 30); st = r.st;
ok(r.adv.join() === 'kaart', 'kaart open');
// instappen wordt niet gemist door verkeerde volgorde: rijden telt pas na instappen
r = run(st, { dist: 1, inVehicle: true }, 5); st = r.st;
ok(r.adv.join() === 'instappen', 'instappen');
ok(currentStep(st).id === 'rijden', 'dan rijden');
r = run(st, { dist: 2, inVehicle: true }, 25); st = r.st;
ok(r.adv.join() === 'rijden', '50 m rijden');
r = run(st, { inVehicle: false }, 2); st = r.st;
ok(r.adv.join() === 'uitstappen', 'uitstappen');
r = run(st, { menuOpen: true }, 3); st = r.st;
ok(r.adv.join() === 'menu' && st.done, 'menu, klaar');
ok(currentStep(st) === null, 'geen stap meer na afloop');
ok(stepPractice(st, {}).advanced === null, 'klaar blijft klaar');

// teksten: Nederlands, geen merken, tokens bekend
const KNOWN = new Set(['WASD', 'SHIFT', 'M', 'E', 'ESC']);
for (const s of [...STEPS, DONE]) {
  ok(s.title && s.body, 'tekst: ' + (s.id || 'klaar'));
  for (const m of s.body.matchAll(/\{(\w+)\}/g)) ok(KNOWN.has(m[1]), 'token ' + m[1]);
  ok(!/xbox|playstation|switch|steam/i.test(s.title + s.body), 'geen merken: ' + s.body);
}
ok(new Set(STEPS.map((s) => s.id)).size === STEPS.length, 'ids uniek');
console.log(fails ? `${fails} mislukt` : 'oefenronde ok');
process.exit(fails ? 1 : 0);
