// Leestijd van HUD-kaarten (game/js/cardtime.js, #801):  node scripts/cardtime_test.mjs
import { cardSeconds, stickyCard, CARD_MIN_S, CARD_MAX_S } from '../game/js/cardtime.js';

let fails = 0;
const ok = (c, name, extra) => { if (!c) { fails++; console.log('FAIL', name, extra !== undefined ? JSON.stringify(extra) : ''); } };

// de oude formule blijft de basis: minstens 4 s, hoogstens 10 s
ok(cardSeconds({ textSeconds: 1, duration: 0 }) === CARD_MIN_S, 'korte tekst houdt de minimumtijd');
ok(cardSeconds({ textSeconds: 60, duration: 0 }) === CARD_MAX_S, 'lange tekst houdt de maximumtijd');
ok(cardSeconds({ textSeconds: 4, duration: 0 }) === 5, 'vier seconden leestijd wordt 1,25x');
ok(cardSeconds({ duration: 9, textSeconds: 0 }) === 10, 'een lange opgegeven duur stopt bij het maximum');
ok(cardSeconds({}) === CARD_MIN_S, 'zonder invoer de minimumtijd');

// 'ruim' maakt het langer, maar nooit eindeloos
const normaal = cardSeconds({ textSeconds: 4, duration: 0 });
const ruim = cardSeconds({ textSeconds: 4, duration: 0, mode: 'ruim' });
ok(ruim > normaal, 'ruim is langer', [normaal, ruim]);
ok(cardSeconds({ textSeconds: 60, duration: 0, mode: 'ruim' }) === CARD_MAX_S * 1.7, 'ruim heeft een eigen bovengrens');
ok(cardSeconds({ textSeconds: 4, duration: 0, mode: 'geen' }) === normaal, 'geen verandert de duur niet; het gedrag zit in stickyCard');

// 'geen' laat alleen belangrijke kaarten wachten
ok(stickyCard('geen', true) === true, 'geen + belangrijk = blijven staan');
ok(stickyCard('geen', false) === false, 'geen + gewoon = gewoon getimed');
ok(stickyCard('ruim', true) === false && stickyCard('normaal', true) === false, 'andere standen blijven getimed');

// onzin valt terug op de veilige formule
ok(cardSeconds({ textSeconds: 'x', duration: null, mode: 'onzin' }) === CARD_MIN_S, 'onzin valt terug op de minimumtijd');

console.log(fails ? `${fails} FAIL` : 'cardtime_test ok');
process.exit(fails ? 1 : 0);
