// Test van de meldingenaudit (scripts/meldingen_audit.mjs): de code vindt een melding die buiten de wachtrij om gaat, en de repo is schoon.
//   node scripts/meldingen_audit_test.mjs
import { audit, sinkViolations, callRanges, matching, EXEMPT_TYPES, BLOCKER_TYPES } from './meldingen_audit.mjs';
import { NOTICE_TYPES } from '../game/js/noticetiming.js';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FOUT ${name}${info !== '' ? ` (${JSON.stringify(info)})` : ''}`); } };

// de repo zelf: nul meldingen buiten de wachtrij
const r = audit();
ok(r.findings.length === 0, 'de repo heeft geen melding buiten de wachtrij om', r.findings);
ok(r.typeRows.length === NOTICE_TYPES.length, 'elk meldingstype is beoordeeld');
ok(r.typeRows.filter((t) => t.how === 'wachtrij').length >= 7, 'minstens zeven typen lopen via de wachtrij');
ok(Object.keys(EXEMPT_TYPES).every((k) => EXEMPT_TYPES[k].length > 20), 'elke uitzondering heeft een echte reden');
ok(Object.keys({ ...EXEMPT_TYPES, ...BLOCKER_TYPES }).every((k) => NOTICE_TYPES.some((t) => t.id === k)), 'uitzonderingen noemen alleen bestaande typen');

// de detector: een weergavefunctie buiten enqueueNotice wordt gevonden, erbinnen en in de eigen functie niet
const goed = `function showNote(w) { if (x) showNote(w); }\nenqueueNotice('phone', { show: () => { showNote(world); }, text: 'a (b)' });`;
ok(sinkViolations(goed, ['showNote']).length === 0, 'binnen enqueueNotice en in de eigen functie is goed');
const fout = `function showNote(w) {}\nenqueueNotice('phone', { show: () => showNote(world) });\nfunction update() { showNote(world); }`;
const v = sinkViolations(fout, ['showNote']);
ok(v.length === 1 && v[0].line === 3, 'een aanroep buiten de wachtrij wordt gevonden met zijn regel', v);
ok(sinkViolations('// showNote(w) in commentaar\n', ['showNote']).length === 0, 'commentaar telt niet');
ok(sinkViolations("export function display() {}\nx.display = 1;\nfoo(() => display());", ['display']).length === 1, 'ook een aanroep in een pijlfunctie buiten de wachtrij');
ok(callRanges("enqueueNotice('a', { text: ')' , show: () => f() }); g();").length === 1 && matching('(a (b) "c)")', 0, '(', ')') === 11, 'haakjes in strings verstoren de bereiken niet');

console.log(`${n - fails}/${n} goed${fails ? `, ${fails} FOUT` : ''}`);
process.exit(fails ? 1 : 0);
