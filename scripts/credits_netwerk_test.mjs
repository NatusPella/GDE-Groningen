// De privacytekst in Over (credits.js), docs/PRIVACY-EN-CREDITS.md en onlineconsent.js zegt eerlijk wat Alleen spelen aan netwerk doet
// (review 22-11): live bussen en live treinen staan standaard aan, ook bij Alleen spelen, elk met een eigen uitzetter.
//   node scripts/credits_netwerk_test.mjs
import { readFileSync } from 'node:fs';
import { LICENSES_HTML } from '../game/js/credits.js';

let bad = 0, n = 0;
const check = (name, ok, info = '') => { n++; if (!ok) { bad++; console.log('FAIL', name, info); } };
const lees = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

const privacy = LICENSES_HTML.slice(LICENSES_HTML.indexOf('<h4>Privacy</h4>'));
check('Over belooft niet dat Alleen spelen het netwerk niet gebruikt', !/Alleen spelen gebruikt het netwerk niet[;.]/.test(privacy));
check('Over noemt Alleen spelen en het netwerk voor Samen spelen', /Alleen spelen gebruikt het netwerk niet voor Samen spelen/.test(privacy));
check('Over noemt live bussen en live treinen', /live bussen/i.test(privacy) && /live treinen/i.test(privacy));
check('Over zegt dat het ook bij Alleen spelen geldt en noemt de uitzetters', /ook bij Alleen spelen/.test(privacy) && /eigen uitzetter/.test(privacy));

const doc = lees('docs/PRIVACY-EN-CREDITS.md');
check('PRIVACY-EN-CREDITS.md: geen "Alleen spelen (geen netwerk)"', !/Alleen spelen \(geen netwerk\)/.test(doc));
check('PRIVACY-EN-CREDITS.md: ook bij Alleen spelen', /ook bij Alleen spelen/.test(doc));

const oc = lees('game/js/onlineconsent.js');
check('onlineconsent.js: de commentaarregel belooft niet meer dan waar is', !/Alleen spelen gebruikt het netwerk niet en vraagt niets/.test(oc));

console.log(bad ? `${bad} van ${n} mislukt` : `credits_netwerk_test: ${n} controles ok`);
process.exit(bad ? 1 : 0);
