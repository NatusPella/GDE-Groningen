// Snel een game van iemand anders joinen (#973): de serverbrowser en de kamercode staan op
// één scherm, zodat de speler niet vooraf hoeft te kiezen. De regels zijn die van lobby.js
// (dezelfde state machine als de wachtkamer); dit scherm voegt geen netwerk of opslag toe.
//   node scripts/samenbrowser_test.mjs
import assert from 'node:assert/strict';
import * as L from '../game/js/lobby.js';

const APP = { direct: true, rtc: true };
const CODE = 'K3J9D-8F2MN'; // een kamercode (geen direct adres)
let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info ? ` (${info})` : ''}`); } };

// De lijst opent met een kamercodeveld en een eigen knop ernaast
const lijst = L.createLobby({ ...APP, consentSaved: true, keuze: 'gast', lijst: true });
ok(lijst.step === 'lijst', 'de lijst opent direct met bewaarde toestemming');
const v = L.view(lijst);
ok(!!v.input && /Kamercode/.test(v.input.placeholder), 'de lijst heeft een kamercodeveld', JSON.stringify(v.input));
ok(v.buttons.some((b) => b.act === 'koppel' && /kamercode/i.test(b.label)), 'naast de lijst staat "Met kamercode meedoen"');
ok(v.buttons.some((b) => b.act === 'lijst-ververs') && v.buttons.some((b) => b.act === 'lijst-terug'), 'verversen en terug blijven');
ok(v.lines.some((l) => /kamercode/i.test(l)), 'de uitleg noemt beide routes', v.lines.join(' | '));

// Een geldige code vanaf dit scherm gaat meteen verbinden: één scherm, geen omweg
const door = L.reduce(lijst, { t: 'invoer', text: CODE });
ok(door.step === 'verbinden' && door.route === L.ROUTES.KAMER, 'een kamercode vanaf de lijst verbindt direct', door.step);
ok(L.reduce(lijst, { t: 'invoer', text: 'niet-een-code' }).step === 'lijst', 'een onzin-code laat de lijst staan');
ok(!!L.reduce(lijst, { t: 'invoer', text: 'niet-een-code' }).error, 'en zegt wat er mis is');

// De lijst zelf blijft werken: zoeken, filteren, favorieten en een sessie kiezen
const metZoek = L.reduce(lijst, { t: 'lijst-zoek', tekst: 'Grunn' });
ok(metZoek.lijstZoek === 'Grunn', 'zoeken op naam blijft werken');
const metFilter = L.reduce(lijst, { t: 'lijst-filter', filter: 'alleenAansluitbaar' });
ok(metFilter.lijstFilters.alleenAansluitbaar === true, 'het filter Aansluitbaar blijft werken');
const metSter = L.reduce(lijst, { t: 'lijst-ster', id: 'lijst00007' });
ok(metSter.lijstFavorieten.includes('lijst00007'), 'een favoriet (vriend) markeren blijft werken');
const terug = L.reduce(lijst, { t: 'lijst-terug' });
ok(terug.step === 'gast-typt', 'terug gaat naar het aansluitscherm', terug.step);

// De hostkant houdt zijn eigen route: openbaar maken vanaf de wachtkamer
const host = L.createLobby({ ...APP, consentSaved: true, keuze: 'host' });
ok(host.step === 'methode' || host.step === 'host-maakt-code', 'de hostroute is ongewijzigd', host.step);

console.log(fails ? `${fails} of ${n} failed` : `samenbrowser_test: ${n} checks ok`);
process.exit(fails ? 1 : 0);

