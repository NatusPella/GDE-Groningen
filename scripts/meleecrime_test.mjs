// #1356: alleen een echte treffer telt als misdrijf, een lege slag niet.
// node scripts/meleecrime_test.mjs
import { markPlayerHit, classifyPlayerHit, meleeSparesVehicle, HIT_WINDOW } from '../game/js/meleecrime.js';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };

const ped = (extra = {}) => ({ health: 50, _hp: 50, state: 'wander', ...extra });

// een lege slag (in de lucht, tegen een muur): niemand is gemarkeerd, dus er is geen misdrijf, ook niet als een voorbijganger
// op dat moment om een andere reden gewond raakt (auto, ruzie)
const toevallig = ped({ health: 30 });
ok(classifyPlayerHit(toevallig, 10) === null, 'lege slag: gewonde voorbijganger zonder treffer is geen misdrijf');
ok(classifyPlayerHit(ped({ health: 30, isCop: true }), 10) === null, 'lege slag: gewonde agent zonder treffer geeft geen ster');

// een echte treffer op een voorbijganger is een misdrijf met getuigen
const slachtoffer = ped();
markPlayerHit(slachtoffer, 10, 0);
slachtoffer.health = 40;
const c1 = classifyPlayerHit(slachtoffer, 10.2);
ok(c1 && c1.kind === 'ped' && c1.crime === true, 'treffer op een voorbijganger: misdrijf', JSON.stringify(c1));

// een treffer op een roadrager is zelfverdediging
const rager = ped({ rager: true });
markPlayerHit(rager, 5, 0);
const c2 = classifyPlayerHit(rager, 5.1);
ok(c2 && c2.kind === 'ped' && c2.crime === false, 'treffer op een roadrager: geen misdrijf');

// een treffer op een NPC-agent blijft strafbaar
const agent = ped({ isCop: true });
markPlayerHit(agent, 5, 0);
const c3 = classifyPlayerHit(agent, 5.1);
ok(c3 && c3.kind === 'cop', 'treffer op een agent: copAanval');

// de treffer van een gast (Samen spelen) is niet de zaak van wie het spel opende
const gastSlag = ped();
markPlayerHit(gastSlag, 5, 2);
ok(classifyPlayerHit(gastSlag, 5.1) === null, 'treffer van een gast telt niet bij de host');

// een oude treffer telt niet meer
const oud = ped();
markPlayerHit(oud, 5, 0);
ok(classifyPlayerHit(oud, 5 + HIT_WINDOW + 0.5) === null, 'een oude treffer is geen nieuw misdrijf');
ok(classifyPlayerHit(null, 1) === null && classifyPlayerHit({}, 1) === null, 'geen ped: niets');

// tegen de eigen auto: geen schade, dus geen wrak en geen getuige
ok(meleeSparesVehicle({ playerOwned: true }) === true, 'eigen auto wordt niet kapotgeslagen');
ok(meleeSparesVehicle({ isHeroCar: true }) === true, 'de eigen heldenauto wordt niet kapotgeslagen');
ok(meleeSparesVehicle({}) === false, 'een vreemde auto wel');
ok(meleeSparesVehicle(null) === false, 'geen voertuig: niets');

console.log(`${n - fails}/${n} meleecrime`);
process.exit(fails ? 1 : 0);
