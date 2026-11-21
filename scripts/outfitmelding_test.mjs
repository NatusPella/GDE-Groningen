// De melding bij een outfit waar stukken van ontbreken vervoegt het werkwoord mee (review 22-11).
//   node scripts/outfitmelding_test.mjs
import * as P from '../game/js/clothingpanel.js';

let bad = 0, n = 0;
const check = (name, ok, info = '') => { n++; if (!ok) { bad++; console.log('FAIL', name, info); } };

const f = P.outfitMessage;
check('outfitMessage bestaat', typeof f === 'function');
if (typeof f === 'function') {
  check('compleet: alleen aan', f('Outfit 2', 0) === 'Outfit 2 aan');
  check('een stuk: ontbreekt', f('Outfit 2', 1) === 'Outfit 2 aan, maar 1 stuk ontbreekt');
  check('meer stukken: ontbreken', f('Outfit 2', 3) === 'Outfit 2 aan, maar 3 stukken ontbreken');
}
console.log(bad ? `${bad} van ${n} mislukt` : `outfitmelding_test: ${n} controles ok`);
process.exit(bad ? 1 : 0);
