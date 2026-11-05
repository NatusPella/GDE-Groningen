// Fiets-leun (#537): de pure regel uit bewegingsrules.js.
//   node scripts/fietsleun_test.mjs
import { fietsLeun } from '../game/js/bewegingrules.js';

let n = 0, bad = 0;
const ok = (c, m, info = '') => { n++; if (!c) { bad++; console.log(`FAIL ${m}${info ? ` (${info})` : ''}`); } };
const close = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps;

ok(close(fietsLeun(0, 6), 0), 'rechtdoor: geen leun');
ok(fietsLeun(0.5, 6) > 0, 'naar rechts: positieve leun');
ok(fietsLeun(-0.5, 6) < 0, 'naar links: negatieve leun');
ok(close(fietsLeun(2, 20, { assist: true }), 0.28), 'met hulp gecapt op 0,28');
ok(close(fietsLeun(2, 20, { assist: false }), 0.45), 'zonder hulp gecapt op 0,45');
ok(fietsLeun(1, 0) === 0, 'stilstaan: geen leun');
ok(Number.isFinite(fietsLeun(NaN, NaN)), 'onzin invoer geeft een getal');

console.log(bad ? `fietsleun_test: ${bad} van ${n} mislukt` : `fietsleun_test: ${n} controles ok`);
process.exit(bad ? 1 : 0);

