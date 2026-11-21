// Tab blijft binnen een modale kaart (aria-modal): de startkeuze, de toestemmingskaart en de moeilijkheidskaart (review 22-11).
//   node scripts/kaart_tabval_test.mjs
import { readFileSync } from 'node:fs';
import * as L from '../game/js/listnav.js';

let bad = 0, n = 0;
const check = (name, ok, info = '') => { n++; if (!ok) { bad++; console.log('FAIL', name, info); } };

const f = L.tabInKaart;
check('tabInKaart bestaat', typeof f === 'function');
if (typeof f === 'function') {
  const [a, b, c] = ['a', 'b', 'c'];
  check('Tab gaat naar de volgende', f([a, b, c], a, false) === b);
  check('Tab op de laatste gaat naar de eerste', f([a, b, c], c, false) === a);
  check('Shift+Tab op de eerste gaat naar de laatste', f([a, b, c], a, true) === c);
  check('Shift+Tab gaat naar de vorige', f([a, b, c], c, true) === b);
  check('focus buiten de kaart: Tab naar de eerste, Shift+Tab naar de laatste', f([a, b, c], 'x', false) === a && f([a, b, c], null, true) === c);
  check('lege kaart: niets te doen', f([], a, false) === null && f(null, a, false) === null);
  check('een veld: blijft daar', f([a], a, false) === a && f([a], a, true) === a);
}

for (const [bestand, minimaal] of [['launchchoiceui.js', 2], ['difficultyui.js', 1]]) {
  const s = readFileSync(new URL('../game/js/' + bestand, import.meta.url), 'utf8');
  check(bestand + ': onKey houdt Tab in de kaart', s.split('tabInKaart(').length - 1 >= minimaal, String(s.split('tabInKaart(').length - 1));
}
console.log(bad ? `${bad} van ${n} mislukt` : `kaart_tabval_test: ${n} controles ok`);
process.exit(bad ? 1 : 0);
