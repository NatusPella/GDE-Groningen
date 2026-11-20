// #955 (M19 Stoom): de museumtrein staat bij de kaartautomaat van Veendam. Zolang de automaat geblokkeerd is (een missie loopt),
// is zijn prompt dim en doet E daar niets; hij nam het instappen in de cabine toch weg, dus een mens kwam de trein niet in.
//   node scripts/trainboard_ticket_test.mjs
import './node3d.mjs';
import fs from 'node:fs';

let fails = 0, n = 0;
const ok = (c, m, i = '') => { n++; if (!c) { fails++; console.log(`FAIL ${m}${i !== '' ? ' (' + i + ')' : ''}`); } };

const { ticketMachineTakesE } = await import('../game/js/traindrive.js');
ok(ticketMachineTakesE({ id: 'trein-VEE', key: 'E', label: 'Met de trein', sub: 'Kaartautomaat VEE', dim: false }) === true, 'een werkende automaat krijgt de E (een kaartje kopen)');
ok(ticketMachineTakesE({ id: 'trein-VEE', key: 'E', label: 'Met de trein', sub: 'Niet nu: maak eerst je missie af', dim: true }) === false, 'een geblokkeerde automaat (dim) laat de E aan het instappen');
ok(ticketMachineTakesE(null) === false && ticketMachineTakesE(undefined) === false, 'geen automaat in de buurt: de E is van de trein');

// boardable gebruikt de regel (en de trein loopt in main.js vóór het station)
const drive = fs.readFileSync(new URL('../game/js/traindrive.js', import.meta.url), 'utf8');
ok(/if \(ticketMachineTakesE\(stationPrompt\(world\)\)\) return null;/.test(drive), 'boardable vraagt de regel, niet alleen of er een automaat is');
const main = fs.readFileSync(new URL('../game/js/main.js', import.meta.url), 'utf8');
ok(main.indexOf('tryTrainInteract(world);') > 0 && main.indexOf('tryTrainInteract(world);') < main.indexOf('tryStationInteract(world);'), 'de trein leest de E vóór het station');

console.log(`${n - fails}/${n} trainboard_ticket`);
process.exit(fails ? 1 : 0);
