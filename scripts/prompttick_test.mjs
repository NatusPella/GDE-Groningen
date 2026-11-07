// #659: de primaire E-hintzoeker draait op 8 Hz in plaats van 60x/s.
// node scripts/prompttick_test.mjs
import { makePromptClock, PRIMARY_INTERVAL } from '../game/js/prompttick.js';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };

const clock = makePromptClock();
let runs = 0;
for (let f = 0; f < 60; f++) if (clock.due(1 / 60)) runs++;
ok(PRIMARY_INTERVAL === 0.12, 'interval 0,12 s', PRIMARY_INTERVAL);
ok(runs >= 7 && runs <= 10, 'ongeveer 8 zoekrondes per seconde', runs);
ok(runs < 60 / 2, 'minstens de helft minder dan per frame', runs);
const c2 = makePromptClock();
c2.due(5);
c2.reset();
ok(c2.due(0.01), 'reset: de volgende frame zoekt meteen weer');
console.log(`#659 meting: ${runs} primaire zoekrondes in 60 frames (was 60), ${60 - runs} overgeslagen`);
console.log(`${n - fails}/${n} prompttick`);
process.exit(fails ? 1 : 0);
