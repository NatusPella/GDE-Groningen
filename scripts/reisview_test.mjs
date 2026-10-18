// Travel beat views (game/js/reisview.js, #97):  node scripts/reisview_test.mjs
import * as V from '../game/js/reisview.js';
import * as B from '../game/js/hudbus.js';
let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };
const beat = { to: 'Zoutkamp', length: 30000, ride: 'bus', lines: ['Klaas wacht.'] };

ok(V.briefingLine(beat) === 'Naar Zoutkamp · 30 km · ± 23 min met de auto · ± 36 min met de bus', V.briefingLine(beat));
ok(!/bus|trein/.test(V.briefingLine({ to: 'Winsum', length: 4500 })), 'no ride in line without ride');
ok(V.briefingLine({ to: 'Dichtbij', length: 800 }).includes('0,8 km'), 'short in km with comma');
const st = V.panelState(beat);
ok(st.options.length === 3 && st.options[0].key === '1' && st.options[0].cls === 'pick', 'default highlighted');
ok(V.panelState(beat, 'zelf').options[1].cls === 'pick', 'pick moves');
ok(V.panelState({ ...beat, lines: null }).options.length === 2, 'no skip without lines');
ok(V.pickFromKey(beat, '3') === 'overslaan' && V.pickFromKey({ ...beat, lines: null }, '3') === null && V.pickFromKey(beat, '9') === null, 'keys');
// every option's key (what a tap on its row sends, reispanel.js) picks that option
ok(st.options.every((o, i) => V.pickFromKey(beat, o.key) === ['meerijden', 'zelf', 'overslaan'][i]), 'tap keys pick their option');
ok(V.hudLine(0) === '' && V.hudLine(1500) === '1,5 km · ± 1 min', 'hud line', V.hudLine(1500));
ok(V.shouldPrompt(8000) && !V.shouldPrompt(2000), 'prompt only on a jump');
ok(V.arrivalMessage(beat).kind === 'reis' && B.KINDS.reis.p === B.P1, 'reis is a P1 story kind');
console.log(`${n - fails}/${n} reisview`);
process.exit(fails ? 1 : 0);
