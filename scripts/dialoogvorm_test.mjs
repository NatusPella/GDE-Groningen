// Dialoogvorm (#1134): overlap, onderbreking en stilte als optionele tags per regel. Zonder tags verandert niets; de tags komen
// via de build in script.json; de timing van de ondertitelpraat volgt lineSchedule; een afkap werkt niet op een ingesproken regel.
// node scripts/dialoogvorm_test.mjs
import fs from 'node:fs';
import { parseForm, lineSchedule, formProblems, FORM_LIMITS, DEFAULT_GAP, MIN_OPENING } from '../game/js/dialogueform.js';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };
const read = (f) => fs.readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const throws = (fn) => { try { fn(); return false; } catch (e) { return true; } };

// tags lezen
ok(parseForm('Ja, maar... {ov=0.3}').text === 'Ja, maar...' && parseForm('Ja, maar... {ov=0.3}').form.ov === 0.3, 'overlap uit de tekst gehaald');
ok(parseForm('Niks. {pause=0.8}').form.pause === 0.8 && parseForm('Dat is wat ik zeg {cut=1.4}').form.cut === 1.4, 'pauze en afkap');
ok(parseForm('Gewone regel.').form === null && parseForm('Gewone regel.').text === 'Gewone regel.', 'zonder tags geen vorm');
ok(throws(() => parseForm('x {ov=9}')) && throws(() => parseForm('x {pause=0.01}')), 'een waarde buiten de grenzen is een fout');
ok(throws(() => parseForm('x {pause=1} {pause=2}')) && throws(() => parseForm('x {ov=0.3} {cut=1}')), 'dubbel of overlap met afkap is een fout');
ok(FORM_LIMITS.ov[1] <= 1.2 && FORM_LIMITS.pause[1] <= 3, 'de grenzen houden een regel leesbaar');

// timing
const base = lineSchedule({ text: 'Een gewone regel.' }, 3);
ok(base.holdS === 3 && Math.abs(base.untilNextS - (3 + DEFAULT_GAP)) < 1e-9 && base.text === 'Een gewone regel.', 'zonder vorm: dezelfde timing als voorheen');
ok(lineSchedule({ text: 'Dat is niet waar.', form: { pause: 1 } }, 3).untilNextS === 4, 'pauze vervangt de standaardpauze');
ok(Math.abs(lineSchedule({ text: 'Ja, maar...', form: { ov: 0.5 } }, 3).untilNextS - 2.5) < 1e-9, 'overlap: de volgende regel start eerder');
ok(lineSchedule({ text: 'Kort.', form: { ov: 1.2 } }, 1).untilNextS >= MIN_OPENING, 'overlap start nooit voor het begin');
const cut = lineSchedule({ text: 'Dat is wat ik wilde zeggen.', form: { cut: 1.4 } }, 4);
ok(cut.holdS === 1.4 && cut.untilNextS === 1.4 && cut.text === 'Dat is wat ik wilde zeggen...', 'afkap: de regel eindigt op drie puntjes en de volgende begint meteen');
ok(lineSchedule({ text: 'Kort.', form: { cut: 5 } }, 1).text === 'Kort.', 'een afkap na het einde van de regel doet niets');
ok(lineSchedule({ text: 'Een lange stilte.', form: { pause: 3 } }, 2).untilNextS === 5, 'een stilte telt als beurt');

// de data
const data = JSON.parse(read('game/storydata/script.json'));
const tagged = data.scenes.flatMap((s) => s.lines.filter((l) => l.form).map((l) => ({ id: s.id, l })));
ok(tagged.length >= 3, 'de nieuwe vorm wordt gebruikt (O7, O8, O9)', tagged.length);
ok(tagged.every(({ l }) => !/\{(ov|cut|pause)=/.test(l.text)), 'geen tag in de speltekst zelf');
ok(formProblems(data.scenes).length === 0, 'tags alleen waar ze werken', formProblems(data.scenes).join('; '));
ok(data.scenes.flatMap((s) => s.lines).filter((l) => !l.form).length > 1000, 'bijna alle regels zijn ongewijzigd (achterwaarts compatibel)');

// de bedrading
const talk = read('game/js/storytalk.js');
const text = read('game/js/storytext.js');
ok(/lineSchedule/.test(talk) && /sch\.untilNextS/.test(talk), 'storytalk.js gebruikt lineSchedule');
ok(/cut: undefined/.test(talk), 'een afkap werkt niet op een ingesproken regel (de stem wordt niet midden in een woord gestopt)');
ok(/\.\.\.\(l\.form \?/.test(text), 'storytext.js geeft de vorm aan de talk door');
ok(/parseForm/.test(read('scripts/build_story_data.mjs')), 'de build leest de tags');
ok(!/localStorage|fetch\(|WebSocket|coopNet/.test(read('game/js/dialogueform.js').split('\n').filter((l) => !l.trim().startsWith('//')).join('\n')), 'dialogueform.js raakt geen opslag of net');

console.log(`dialoogvorm_test: ${n - fails}/${n} ok`);
if (fails) process.exit(1);
