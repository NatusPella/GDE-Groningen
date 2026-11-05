// Fiets- en step-ronde in het skatepark (#537): de pure regels.
//   node scripts/skatefiets_test.mjs
import { createRun, stepRun, medalFor, progressText, RUN_S, MEDAL_AT } from '../game/js/skatefietsrules.js';

let n = 0, bad = 0;
const ok = (c, m, info = '') => { n++; if (!c) { bad++; console.log(`FAIL ${m}${info ? ` (${info})` : ''}`); } };

const r = createRun();
for (let i = 0; i < 5; i++) stepRun(r, 0.1, { speed: 6, wheelie: true, pitch: 0.4, hop: false });
ok(r.wheelieM > 2.9 && r.wheelieM < 3.1, 'wheelie telt meters', r.wheelieM);
ok(r.score > 0, 'wheelie geeft punten', r.score);
const scoreNaWheelie = r.score;
stepRun(r, 0.1, { speed: 6, wheelie: false, pitch: 0, hop: true });
ok(r.hops === 1, 'sprong telt één keer', r.hops);
ok(r.score === scoreNaWheelie + 40, 'sprong geeft 40 punten', r.score);
stepRun(r, 0.1, { speed: 6, wheelie: false, pitch: -0.3, hop: false });
ok(r.stoppies === 1, 'stoppie telt', r.stoppies);
ok(medalFor(0) === null && medalFor(MEDAL_AT.brons) === 'brons' && medalFor(MEDAL_AT.zilver) === 'zilver' && medalFor(MEDAL_AT.goud) === 'goud', 'medailles');
ok(progressText(r).includes('Fietsronde') && progressText(r).includes('punten'), 'voortgangstekst');
const r2 = createRun();
for (let i = 0; i < 1000 && !r2.done; i++) stepRun(r2, 0.1, { speed: 0, wheelie: false, pitch: 0, hop: false });
ok(r2.done && r2.t >= RUN_S, 'de ronde stopt na de tijd', r2.t);
ok(stepRun(r2, 1, { speed: 9, wheelie: true }).t === r2.t, 'na het einde telt niets meer');

console.log(bad ? `skatefiets_test: ${bad} van ${n} mislukt` : `skatefiets_test: ${n} controles ok`);
process.exit(bad ? 1 : 0);

