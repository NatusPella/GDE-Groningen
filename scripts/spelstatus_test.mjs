// Test voor game/js/spelstatus.js: kopband, strook Aandacht, verlies, vergelijking, vasthouden, uitslagbon en de naam van de hoofdpersoon.
import assert from 'node:assert/strict';
import { kopStatus, aandachtRegels, verliesSinds, verliesTekst, slotVergelijk, vraagtVasthouden, uitslagBon, sprekerNaam, zonderSpreker, GEZONDHEID_LAAG, LANG_GELEDEN_MIN, VASTHOUD_MS } from '../game/js/spelstatus.js';

let n = 0;
const ok = (c, m) => { assert.ok(c, m); n++; };
const eq = (a, b, m) => { assert.deepEqual(a, b, m); n++; };

// kopband
let k = kopStatus({ money: 12840, health: 100, wanted: 0 });
eq([k.geld, k.gezond, k.gezocht, k.gezondLaag], ['€12.840', 100, 'Niet', false], 'gewone stand');
k = kopStatus({ money: 5, health: GEZONDHEID_LAAG - 1, wanted: 3 });
ok(k.gezondLaag && k.gezocht === '3 sterren' && k.sterren === 3, 'laag en gezocht');
eq(kopStatus({ wanted: 1 }).gezocht, '1 ster', 'enkelvoud');
eq(kopStatus({ money: NaN, health: undefined, wanted: 99 }).sterren, 5, 'NaN en te veel sterren worden begrensd');
eq(kopStatus({ money: -50 }).geld, '€0', 'geen negatief geld');
eq(kopStatus({ health: 140 }).gezond, 100, 'gezondheid begrensd');

// strook Aandacht
let a = aandachtRegels({});
eq([a.regels.length, a.meer], [0, 0], 'zonder bronnen verdwijnt de strook');
a = aandachtRegels({ ongelezen: 2, evenement: { naam: 'Kermis', sub: 'Grote Markt' }, minutenSindsOpslaan: 40 });
eq(a.regels.map((r) => r.soort), ['vandaag', 'nieuw', 'nu'], 'drie bronnen, drie regels');
ok(a.regels[1].kop === 'Je hebt 2 berichten', 'meervoud berichten');
a = aandachtRegels({ ongelezen: 1, evenement: { naam: 'Kermis' }, minutenSindsOpslaan: LANG_GELEDEN_MIN, max: 2 });
eq([a.regels.length, a.meer], [2, 1], 'meer dan het maximum telt als +n');
eq(aandachtRegels({ minutenSindsOpslaan: LANG_GELEDEN_MIN - 1 }).regels.length, 0, 'net opgeslagen is geen aandacht');
eq(aandachtRegels({ ongelezen: -3 }).regels.length, 0, 'negatief ongelezen telt niet');

// verlies
let v = verliesSinds({ speeltijd: 1700, money: 13480, missies: 4 }, { speeltijd: 1460, money: 12840, missies: 3 });
eq([v.min, v.geld, v.missies, v.leeg], [4, 640, 1, false], 'verschil sinds de save');
ok(verliesTekst(v, { missieNaam: 'Een middag op het terras' }).includes('+€640') && verliesTekst(v, { missieNaam: 'Een middag op het terras' }).includes('4 min'), 'tekst noemt minuten en geld');
v = verliesSinds({ speeltijd: 100, money: 10, missies: 1 }, { speeltijd: 5000, money: 900, missies: 9 });
ok(v.leeg && verliesTekst(v).startsWith('Je hebt sinds'), 'minder dan de save is geen verlies');
ok(verliesSinds({}, {}).leeg, 'lege invoer is leeg');

// vergelijking bij overschrijven
let c = slotVergelijk({ speeltijd: 18000, character: 'tammo' }, { speeltijd: 22000, character: 'tammo' });
ok(c.veilig && !c.waarschuwing, 'meer speeltijd in het nieuwe spel is veilig');
c = slotVergelijk({ speeltijd: 30000, character: 'tammo' }, { speeltijd: 22000, character: 'tammo' });
ok(!c.veilig && c.meerInOud && c.waarschuwing.includes('meer speeltijd'), 'meer speeltijd in de plek is een waarschuwing');
c = slotVergelijk({ speeltijd: 100, character: 'anita' }, { speeltijd: 200, character: 'tammo' });
ok(!c.veilig && c.anderVerhaal, 'een andere hoofdpersoon is een ander spel');

// vasthouden alleen bij het onomkeerbare
ok(vraagtVasthouden('overschrijven') && vraagtVasthouden('verwijderen') && vraagtVasthouden('terugzetten'), 'onomkeerbaar vraagt vasthouden');
ok(!vraagtVasthouden('laden') && !vraagtVasthouden('nieuw') && !vraagtVasthouden('afsluiten'), 'de rest niet');
eq(VASTHOUD_MS, 600, 'zelfde 600 ms als tweedruk.js');

// uitslagbon
let b = uitslagBon({ busted: true, boete: 120, geld: 12840, missieNaam: 'Een middag op het terras' });
eq([b.over, b.opnieuw, b.regels[0].waarde], ['€12.720', true, '−€120'], 'opgepakt: boete eraf');
b = uitslagBon({ busted: true, boete: 0, geld: 50 });
ok(b.regels[0].waarde === 'geen' && b.over === '€50' && !b.opnieuw, 'gratis arrestatie (geleende missieauto)');
b = uitslagBon({ busted: false, geld: 12840 });
ok(b.over === '€12.840' && b.regels[0].waarde === 'gratis', 'neergaan kost niets');
b = uitslagBon({ busted: false, geld: 10, herstelEscapade: 50 });
ok(b.regels.some((r) => r.waarde === 'nieuw €50'), 'total loss van de Escapade kost geld');
ok(uitslagBon({ busted: true, boete: 999, geld: 10 }).over === '€0', 'nooit onder nul');

// de naam van de hoofdpersoon in de recap
eq([sprekerNaam('tammo'), sprekerNaam('anita'), sprekerNaam(undefined)], ['Tammo', 'Anita', 'Tammo'], 'naam volgt de gekozen hoofdpersoon');
eq(zonderSpreker('Anita: Honderdvijftig euro verdienen.'), 'Honderdvijftig euro verdienen.', 'voorvoegsel van de spreker eraf');
eq(zonderSpreker('Tammo : Eerst geld.'), 'Eerst geld.', 'ook met een spatie');
eq(zonderSpreker('Zonder voorvoegsel.'), 'Zonder voorvoegsel.', 'zonder voorvoegsel blijft hetzelfde');

console.log(`spelstatus_test: ${n} controles ok`);
