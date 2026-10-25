// De indelingsregel van clearance_audit (#494) zonder de wereld: een smal
// voetbrugdek naast een weg is geen doorgang boven die weg, boven de rijbaan is
// het er wel een; een breed viaduct houdt de oude regel (het dek boven de as).
//   node scripts/clearance_audit_test.mjs
import { laneUnderDeck } from './lib/clearance.mjs';

let fails = 0, n = 0;
const ok = (c, name) => { n++; if (!c) { fails++; console.log('FAIL', name); } };
const lane = (over = {}) => ({ ax: -20, ay: 0, bx: 20, by: 0, hs: 3.8, r: { width: 4, cat: 'minor' }, ...over });
const path = { ax: -20, ay: 0, bx: 20, by: 0, hs: 1.3, r: { width: 2, cat: 'cycle' } };

// Het gemelde punt (-252, 933): een voetbrug van 2,4 m breed naast een weg van
// 4 m. Het dek ligt 2,4 m van de as, dus boven de stoep/berm (hs 3,8) en niet
// boven de rijbaan (2,0).
ok(!laneUnderDeck(0, 2.4, lane(), 1.2), 'een voetbrug naast de weg telt niet als doorgang');
ok(laneUnderDeck(0, 1.9, lane(), 1.2), 'boven de rijbaan telt hij wel');
ok(laneUnderDeck(0, 2.0, lane(), 1.2), 'de rand van de rijbaan telt ook');
ok(!laneUnderDeck(0, 2.1, lane(), 1.2), 'net over de rand niet');

// Een breed viaduct houdt de oude regel: een laan die ernaast loopt (1,2 m van de
// as) is geen doorgang, ook al valt de berm onder het dek.
ok(laneUnderDeck(0, 0.4, lane(), 4.03), 'onder een breed viaduct telt de laan boven de as');
ok(!laneUnderDeck(0, 1.2, lane(), 4.03), 'een laan naast de as is geen doorgang');

// Een fietspad van 2 m onder een smal voetbrugdek.
ok(laneUnderDeck(0, 0.4, path, 1.2), 'een fietspad boven zijn as telt');
ok(!laneUnderDeck(0, 1.2, path, 1.2), 'en ernaast niet');

// Zonder breedte in de data valt de regel terug op de oude halve breedte.
ok(laneUnderDeck(0, 2.4, lane({ r: { cat: 'minor' } }), 1.2), 'zonder width telt de oude regel');

console.log(`${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
