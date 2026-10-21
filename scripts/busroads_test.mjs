// Welke wegen een bus mag nemen (#322, busroutes.js): harde regels (voetpad, fietspad, acc, type, breedte),
// het busnet, en de strook rond een lijn waar ook een woonstraat bij hoort.
//   node scripts/busroads_test.mjs        (de audit op de echte lijnen: node scripts/bus_audit.mjs --sim)
import * as B from '../game/js/busroutes.js';

let n = 0, bad = 0;
const ok = (c, name) => { n++; if (!c) { bad++; console.log('FAIL', name); } };
const road = (o) => ({ cat: 'normal', type: 'residential', width: 6.5, pts: [[0, 0], [100, 0]], ...o });

// harde regels
ok(B.busWegFout(road({ cat: 'foot', type: 'footway', width: 2 })) === 'voetpad', 'voetpad');
ok(B.busWegFout(road({ cat: 'cycle', type: 'cycleway', width: 2 })) === 'fietspad', 'fietspad');
ok(B.busWegFout(road({ acc: 7 })) === 'gesloten voor bussen' && B.busWegFout(road({ acc: 15 })) === null, 'OSM-toegang: bit 8 is bus');
ok(B.busWegFout(road({ type: 'living_street' })) && B.busWegFout(road({ type: 'track' })) && B.busWegFout(road({ type: 'pedestrian' })), 'woonerf, zandweg en voetgangersstraat');
ok(B.busWegFout(road({ width: 3.5 })) === 'te smal' && B.busWegFout(road({ width: 3.7 })) === null && B.busWegFout(road({ width: undefined })) === 'te smal', 'breedte: bus + 1,1 m');
ok(B.busWegFout(road({ cat: 'normal', type: 'busway', width: 3.5, busOnly: true })) === null, 'een busbaan is altijd voor de bus');
ok(B.busWegFout(null) === 'geen weg', 'geen weg');

// het busnet
ok(B.busWegOpNet(road({ cat: 'major', type: 'secondary' })) && B.busWegOpNet(road({ type: 'tertiary' })) && B.busWegOpNet(road({ busOnly: true, type: 'busway' })), 'hoofdweg, tertiair en busbaan zijn busnet');
ok(!B.busWegOpNet(road({ type: 'residential' })) && !B.busWegOpNet(road({ cat: 'minor', type: 'service' })), 'woonstraat en dienstweg niet');

// een lijn over een woonstraat (het Wilgenpad): die ene straat mag, de parallelle niet
const line = B.prepareLine({ id: 'x', ref: '99', pts: [[0, 0], [500, 0]], stops: [] });
const op = road({ name: 'Wilgenpad', pts: [[0, 3], [250, 3], [500, 3]] });
const ernaast = road({ name: 'Zijpad', pts: [[0, 40], [250, 40], [500, 40]] });
const kruis = road({ name: 'Kruisstraat', pts: [[250, -80], [250, 80]] });
ok(B.busMagWeg(op, line), 'een woonstraat waar de lijn loopt mag');
ok(!B.busMagWeg(ernaast, line), 'het parallelle woonstraatje 40 m verder niet');
ok(!B.busMagWeg(kruis, line), 'een dwarsstraat die de lijn alleen kruist niet');
ok(!B.busMagWeg(op, null), 'zonder lijn (een rondzwervende bus) geen woonstraat');
ok(B.busMagWeg(road({ cat: 'major', type: 'secondary', width: 8 }), null), 'zonder lijn wel de hoofdweg');
ok(!B.busMagWeg(road({ type: 'tertiary', width: 3 }), line), 'te smal blijft te smal, ook op de lijn');
ok(!B.busMagWeg(road({ type: 'residential', cat: 'foot' }), line), 'voetpad blijft voetpad');
ok(B.opLijn(line, 250, 10) && !B.opLijn(line, 250, 20) && !B.opLijn(line, 700, 0), 'de strook rond de lijn is 12 m');
// het antwoord per (lijn, weg) komt uit de cache
ok(B.busMagWeg(op, line) === B.busMagWeg(op, line) && line._wegen.get(op) === true, 'cache per lijn en weg');

console.log(`busroads_test: ${n - bad}/${n} ok`);
process.exit(bad ? 1 : 0);
