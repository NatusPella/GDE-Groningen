// Loopbaanmomenten: een vraag van de dag en een koppelmoment per vak, kort, zonder voortgang, aangesloten op het begin van een loopbaan en het eerste niveau omhoog.
// node scripts/careerbeats_test.mjs
import fs from 'node:fs';
import { CAREER_BEATS, careerTalk, beatProblems } from '../game/js/careerbeats.js';
import { VAK_IDS } from '../game/js/loopbaan.js';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };
const read = (f) => fs.readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');

ok(beatProblems(VAK_IDS).length === 0, 'elk vak heeft een vraag en een koppelmoment van twee korte regels', beatProblems(VAK_IDS).join('; '));
ok(Object.keys(CAREER_BEATS).length === 19, 'negentien vakken');
const t = careerTalk('taxi', 'vraag');
ok(t.length === 2 && t[0].speaker && t[0].textOnly === true && t[0].voice === null, 'talk-regels zonder opname');
ok(careerTalk('bestaat-niet', 'vraag').length === 0 && careerTalk('taxi', 'anders').length === 0, 'een onbekend vak of soort geeft niets');
const live = read('game/js/loopbaanlive.js');
ok(/careerTalk\(vak, 'vraag'\)/.test(live) && /careerTalk\(o\.vak, 'koppel'\)/.test(live), 'het begin van een loopbaan en het eerste niveau omhoog spelen het moment');
ok(!/markDone|addMoney|reward/.test(read('game/js/careerbeats.js')), 'geen voortgang of geld');

console.log(`careerbeats_test: ${n - fails}/${n} ok`);
if (fails) process.exit(1);
