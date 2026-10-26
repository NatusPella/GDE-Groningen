// Test voor game/js/players.js (#500): de leesbare ingang bovenop het
// spelersregister. De hoofdspeler is het eigen lichaam, een gast is een dunne
// client, medespelers zijn de anderen en een onbekende id geeft null.
//   node scripts/players_test.mjs
import { hoofdspeler, isGast, elkeSpeler, medespelers, spelerMetId } from '../game/js/players.js';

let failed = 0;
const ok = (cond, msg) => { if (!cond) { failed++; console.log('FAIL ' + msg); } };

const lichaam = { x: 3, y: 4, character: 'tammo' };
const buur = { slot: 1, x: 30, y: 40, status: 'voet' };
const wereld = { player: lichaam, coopPartners: [buur] };

// hoofdspeler: het lichaam van dit apparaat, nooit een meespeler
ok(hoofdspeler(wereld) === lichaam, 'hoofdspeler is world.player');
ok(hoofdspeler(null) === null && hoofdspeler(undefined) === null, 'zonder wereld null');
ok(hoofdspeler({}) === null, 'zonder lichaam null');

// isGast: alleen de dunne client
ok(isGast({ coopRole: 'client' }) === true, 'client is gast');
ok(isGast({ coopRole: 'host' }) === false, 'host is geen gast');
ok(isGast({}) === false && isGast(null) === false, 'zonder rol geen gast');

// de lijst komt uit spelersregister.js; deze module maakt geen tweede lijst
ok(elkeSpeler(null).length === 0, 'zonder wereld een lege lijst');
const allen = elkeSpeler(wereld);
ok(allen.length === 2 && allen[0].lokaal && !allen[1].lokaal, 'twee spelers, de eerste is lokaal');
ok(elkeSpeler(wereld) === wereld.players, 'dezelfde lijst als world.players');
ok(medespelers(wereld).length === 1 && medespelers(wereld)[0].slot === 1, 'één medespeler op plek 1');
ok(medespelers(wereld).every((r) => !r.lokaal), 'de hoofdspeler zit nooit bij de medespelers');
ok(medespelers({ player: lichaam }).length === 0, 'alleen spelen geeft geen medespelers');

// spelerMetId: op plek of op personage, onbekend geeft null
ok(spelerMetId(wereld, 0) === allen[0], 'plek 0 is de hoofdspeler');
ok(spelerMetId(wereld, 1) === allen[1], 'plek 1 is de medespeler');
ok(spelerMetId(wereld, 9) === null, 'onbekende plek is null');
ok(spelerMetId(wereld, 'tammo') === allen[0], 'personage-id van de hoofdspeler');
ok(spelerMetId(wereld, 'anita') === null, 'zonder lobbyroster geen tweede personage');
ok(spelerMetId(wereld, 'onbekend') === null, 'onbekende id is null');
ok(spelerMetId(wereld, null) === null && spelerMetId(null, 0) === null, 'zonder id of wereld null');

// met een lobbyroster wijst een personage-id naar de juiste plek
const metRoster = { ...wereld, coopRoster: { max: 4, spelers: [{ slot: 0, char: 'tammo' }, { slot: 1, char: 'anita' }] } };
ok(spelerMetId(metRoster, 'anita') === allen[1], 'anita is de medespeler op plek 1');
ok(spelerMetId(metRoster, 'rik') === null, 'een personage dat niet meedoet is null');

console.log(failed ? `${failed} test(s) mislukt` : 'players_test: alles goed');
process.exit(failed ? 1 : 0);
