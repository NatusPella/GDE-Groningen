// Hoogvlieger (#145): in- en uitstappen moet ook met gamepad en touch kunnen.
// reuzenrad.js luistert op E (in en uit), F en Backspace (uit); controle: de
// voetenkaart van het pad (Y = E, X = F) en het touchplan geven die toetsen.
//   node scripts/reuzenrad_invoer_test.mjs
import { PAD_MAPS } from '../game/js/controls.js';
import { touchPlan } from '../game/js/touchlogic.js';

let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log('FAIL ' + m); } };
ok(PAD_MAPS.foot.y === 'e', 'pad: Y is E (instappen en uitstappen)');
ok(PAD_MAPS.foot.x === 'f', 'pad: X is F (uitstappen)');
const plan = touchPlan('foot');
ok(plan.some((b) => b.action === 'e'), 'touch: een Gebruik-knop (E) op de voetenkaart');
ok(plan.some((b) => b.action === 'f'), 'touch: een F-knop op de voetenkaart');
console.log(fails ? `${fails} mislukt` : 'reuzenrad_invoer: alles ok');
process.exit(fails ? 1 : 0);
