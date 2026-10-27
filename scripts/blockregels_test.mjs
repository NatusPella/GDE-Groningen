// Melee-blokkeren (#492): de pure regels van de blokstand staan in game/js/blockregels.js; hier de duur (maximaal 2 s), het
// herstel (0,35 s), de nieuwe druk, de schade die erdoor komt (melee ×0,20, een kogel ongewijzigd) en de veilige stand bij
// een lege of kapotte invoer.
//   node scripts/blockregels_test.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { nieuweBlok, magBlokkeren, beginBlok, herstel, blokkeer, blokActief, schadeNaBlok, MAX_BLOK_S, HERSTEL_S, BLOK_FACTOR } from '../game/js/blockregels.js';

let n = 0;
const t = (naam, f) => { f(); n++; };

t('de maten: 2 s volhouden, 0,35 s herstel, een vijfde van de melee-schade komt erdoor', () => {
  assert.equal(MAX_BLOK_S, 2); assert.equal(HERSTEL_S, 0.35); assert.equal(BLOK_FACTOR, 0.2);
});

t('een verse stand blokkeert niet en een nieuwe druk begint de blokstand', () => {
  const st = nieuweBlok();
  assert.deepEqual(st, { aan: false, sinds: 0, herstelTot: 0, ingedrukt: false });
  assert.equal(blokActief(st, 10), false); assert.equal(magBlokkeren(st, 10), true);
  assert.equal(beginBlok(st, 10), true);
  assert.equal(st.aan, true); assert.equal(st.sinds, 10);
  assert.equal(blokActief(st, 10), true); assert.equal(blokActief(st, 11.9), true);
  assert.equal(magBlokkeren(st, 10.5), false, 'tijdens de blokstand begin je er geen tweede');
  assert.equal(beginBlok(st, 10.5), false);
});

t('de blokstand houdt precies 2 s: op de grens breekt hij en volgt 0,35 s herstel', () => {
  const st = nieuweBlok();
  blokkeer(st, 10, true);
  assert.equal(blokkeer(st, 11.99, true), true, 'nog net binnen de twee seconden');
  assert.equal(blokkeer(st, 12, true), false, 'op 2 s breekt de blokstand');
  assert.equal(st.aan, false);
  assert.ok(Math.abs(st.herstelTot - (12 + HERSTEL_S)) < 1e-9, 'het herstel begint bij het breken');
  assert.equal(blokkeer(st, 12.1, true), false, 'tijdens het herstel geen blok');
  assert.equal(blokActief(st, 12.1), false);
});

t('na het herstel begint een nieuwe druk weer een blok; vasthouden na een breuk doet dat niet', () => {
  const st = nieuweBlok();
  blokkeer(st, 10, true);
  blokkeer(st, 12, true); // breekt op de grens
  assert.equal(blokkeer(st, 12.4, true), false, 'nog steeds vasthouden: geen nieuwe blokstand vanzelf');
  assert.equal(blokkeer(st, 13, true), false, 'ook later niet: je moet eerst loslaten');
  assert.equal(blokkeer(st, 13, false), false, 'loslaten');
  assert.equal(blokkeer(st, 13.01, true), true, 'opnieuw indrukken begint weer een blok');
  assert.equal(st.sinds, 13.01);
});

t('loslaten zet het herstel in en pas daarna kun je weer blokkeren', () => {
  const st = nieuweBlok();
  blokkeer(st, 5, true);
  assert.equal(blokkeer(st, 5.5, false), false, 'loslaten stopt de blokstand');
  assert.equal(st.herstelTot, 5.5 + HERSTEL_S);
  assert.equal(blokkeer(st, 5.6, true), false, 'in het herstel begint er niets');
  assert.equal(magBlokkeren(st, 5.5 + HERSTEL_S), true, 'op de grens van het herstel mag het weer');
  assert.equal(blokkeer(st, 5.5 + HERSTEL_S, true), false, 'de druk van tijdens het herstel telt niet: eerst loslaten');
  blokkeer(st, 5.9, false);
  assert.equal(blokkeer(st, 5.91, true), true, 'loslaten en opnieuw indrukken: weer een blok');
});

t('de schade door de blokstand: melee ×0,20, een kogel ongewijzigd, onbekend telt als melee', () => {
  assert.equal(schadeNaBlok(30), 6);
  assert.equal(schadeNaBlok(30, 'melee'), 6);
  assert.ok(Math.abs(schadeNaBlok(42, 'melee') - 8.4) < 1e-9, 'de zwaarste melee (3e slag met de knuppel)');
  assert.equal(schadeNaBlok(20, 'kogel'), 20, 'een kogel gaat er dwars doorheen');
  assert.equal(schadeNaBlok(95, 'kogel'), 95);
  assert.equal(schadeNaBlok(30, 'stoot'), 6, 'een onbekende slagsoort is veilig geblokkeerd');
  for (const raar of [0, -5, NaN, undefined, null, 'veel']) assert.equal(schadeNaBlok(raar), 0, String(raar));
  assert.ok(schadeNaBlok(30) < 60, 'onder de cap van 60 van een PvP-treffer');
});

t('een lege stand, een kapotte klok en een klok die terugloopt geven veilig geen blok', () => {
  for (const leeg of [undefined, null]) {
    assert.equal(blokkeer(leeg, 5, true), false); assert.equal(blokActief(leeg, 5), false); assert.equal(magBlokkeren(leeg, 5), false);
    assert.equal(herstel(leeg, 5), false);
  }
  assert.equal(blokkeer({}, 5, true), true, 'een lege stand is een verse stand');
  const st = nieuweBlok();
  for (const tijd of [NaN, undefined, null, Infinity]) assert.equal(blokkeer(st, tijd, true), false, String(tijd));
  assert.equal(st.aan, false);
  const terug = { aan: true, sinds: 10, herstelTot: 0, ingedrukt: true };
  assert.equal(blokActief(terug, 9), false, 'een klok die terugloopt telt niet als blok');
  assert.equal(blokkeer(terug, 9, true), false);
  assert.equal(blokkeer({ aan: false, sinds: 0, herstelTot: 20 }, 10, true), false, 'het herstel van een oude stand geldt');
  assert.equal(blokkeer({ aan: false, sinds: 0, herstelTot: 20 }, 21, true), true);
});

t('de module is puur: geen DOM, THREE, klok, opslag of random en geen eigen imports', () => {
  const src = readFileSync(fileURLToPath(new URL('../game/js/blockregels.js', import.meta.url)), 'utf8');
  const code = src.split(/\r?\n/).map((r) => r.replace(/\/\/.*$/, '')).join('\n'); // zonder commentaar
  for (const verboden of ['document', 'window', 'THREE', 'Date', 'performance', 'localStorage', 'Math.random', 'setTimeout', 'import ']) {
    assert.equal(code.includes(verboden), false, `geen ${verboden} in blockregels.js`);
  }
});

console.log(`blockregels_test: ${n}/${n} ok`);
