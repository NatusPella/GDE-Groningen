// Test van samen een bus rijden (#444): rollen, deelname zonder late instap, deuren en kaartjes door het hulpje, beloning per halte,
// wegvallen van de chauffeur, de stoelen in de bus en de lijm met het spel (coopbus.js) op een nepwereld.
//   node scripts/coop/buscoop_test.mjs
import '../node3d.mjs';
import assert from 'node:assert';
import {
  maakBusCoop, startDienst, rolVan, magDeur, hulpjeSlot, wisselChauffeur, valtWeg, nieuweHalte, wachtend, valideer, haltebedrag, haltebeloning, LATE_INSTAP, doetMee,
} from '../../game/js/buscoop.js';
import { busInterieur, bezetting, coopPlek, coopBezet } from '../../game/js/businterieur.js';
import { makeBediening, toggleDeuren, stepBediening } from '../../game/js/busbestuur.js';

// --- rollen en deelname
const bc = maakBusCoop('sessie1');
assert.strictEqual(LATE_INSTAP, false, 'een dienst met een klok kent geen late instap');
assert.strictEqual(rolVan(bc, 0), 'kijkt mee', 'voor de start heeft niemand een rol');
startDienst(bc, { chauffeur: 0, aanboord: [0, 2, 3] });
assert.deepStrictEqual(bc.deelnemers, [0, 2, 3]);
assert.strictEqual(hulpjeSlot(bc), 2);
assert.strictEqual(rolVan(bc, 0), 'chauffeur'); assert.strictEqual(rolVan(bc, 2), 'hulpje'); assert.strictEqual(rolVan(bc, 3), 'passagier');
assert.strictEqual(rolVan(bc, 4), 'kijkt mee', 'wie na de start instapt rijdt alleen mee');
assert.ok(magDeur(bc, 0) && magDeur(bc, 2) && !magDeur(bc, 3) && !magDeur(bc, 4));
assert.ok(!doetMee(bc, 4));
// zonder medespeler is er geen hulpje en valideert de chauffeur zelf
const solo = startDienst(maakBusCoop(), { chauffeur: 0, aanboord: [0] });
assert.strictEqual(hulpjeSlot(solo), null);
nieuweHalte(solo, 2);
assert.ok(valideer(solo, 0).ok, 'solo valideert de chauffeur');

// --- kaartjes
nieuweHalte(bc, 3);
assert.strictEqual(wachtend(bc), 3);
assert.strictEqual(valideer(bc, 0).reden, 'hulpje', 'met een hulpje valideert de chauffeur niet');
assert.strictEqual(valideer(bc, 3).reden, 'geen rol');
assert.strictEqual(valideer(bc, 4).reden, 'geen rol');
let r = valideer(bc, 2); assert.ok(r.ok && r.resterend === 2);
valideer(bc, 2); r = valideer(bc, 2); assert.ok(r.ok && r.resterend === 0);
assert.strictEqual(valideer(bc, 2).reden, 'niemand');

// --- beloning per halte: gelijk verdeeld met samenwerkingsbonus, elke gebeurtenis een eigen id
assert.strictEqual(haltebedrag({ board: 0, alight: 0 }), 0);
assert.ok(haltebedrag({ board: 5, alight: 3, sat: 100 }) > haltebedrag({ board: 5, alight: 3, sat: 10 }), 'tevredenheid telt');
assert.ok(haltebedrag({ board: 5, alight: 3, gevalideerd: 5 }) > haltebedrag({ board: 5, alight: 3, gevalideerd: 0 }), 'valideren levert iets op');
const g1 = haltebeloning(bc, { board: 5, alight: 3, sat: 80 }), g2 = haltebeloning(bc, { board: 5, alight: 3, sat: 80 });
assert.notStrictEqual(g1.id, g2.id);
assert.ok(g1.bonus > 0 && g1.totaal > haltebedrag({ board: 5, alight: 3, sat: 80, gevalideerd: 3 }) - 1, 'met meer spelers een bonus');
assert.strictEqual(Object.values(g1.bedragen).reduce((a, b) => a + b, 0), g1.totaal, 'de som klopt');
assert.deepStrictEqual(Object.keys(g1.bedragen).map(Number).sort(), [0, 2, 3], 'alleen de deelnemers');
assert.strictEqual(haltebeloning(bc, { board: 0, alight: 0 }), null);

// --- stuur wisselen en wegvallen
assert.ok(!wisselChauffeur(bc, 4) && !wisselChauffeur(bc, 0), 'alleen een deelnemer die niet al rijdt');
assert.ok(wisselChauffeur(bc, 3) && bc.chauffeur === 3 && rolVan(bc, 0) !== 'chauffeur');
wisselChauffeur(bc, 0);
// een passagier valt weg: de dienst gaat door
let v = valtWeg(bc, 3, [0, 2]);
assert.strictEqual(v.actie, 'doorgaan'); assert.ok(!doetMee(bc, 3));
// de chauffeur valt weg: een medespeler neemt over
const bc2 = startDienst(maakBusCoop(), { chauffeur: 2, aanboord: [0, 2, 3] });
v = valtWeg(bc2, 2, [0, 3]);
assert.deepStrictEqual([v.actie, v.chauffeur], ['overnemen', 0]);
assert.strictEqual(rolVan(bc2, 0), 'chauffeur');
// de laatste meedoende chauffeur valt weg: remmen
const bc3 = startDienst(maakBusCoop(), { chauffeur: 1, aanboord: [1] });
v = valtWeg(bc3, 1, []);
assert.deepStrictEqual([v.actie, v.chauffeur], ['remmen', null]);

// --- stoelen en staanplekken uit businterieur.js
const L = busInterieur(11.2, 2.55, { trailer: 6.8 });
const p2 = coopPlek(L, 2), p3 = coopPlek(L, 3);
assert.ok(p2.soort === 'zit' && p3.soort === 'zit' && p2.index !== p3.index);
assert.strictEqual(coopPlek(L, 2 + L.seats.length).soort, 'sta', 'als de stoelen op zijn, staan ze');
assert.strictEqual(coopPlek(L, 2 + L.seats.length + L.stand.length), null, 'een volle bus');
const bezet = coopBezet(L, [2, 3, 2 + L.seats.length]);
assert.deepStrictEqual(bezet, [p2.index, p3.index], 'alleen zitplaatsen tellen als bezet');
const met = bezetting(L, 12), zonder = bezetting(L, 12, bezet);
assert.ok(zonder.zit.every((i) => !bezet.includes(i)), 'de reizigers van het spel zitten niet op een stoel van een medespeler');
assert.strictEqual(zonder.zit.length + zonder.sta.length, 12);
assert.ok(met.zit.length > 0);

// --- de stoelen in coopzitten3d.js
const Z = await import('../../game/js/coopzitten3d.js');
const bus = { isBus: true, model: { name: 'bus', len: 11.2, wid: 2.55, trailer: 6.8 }, x: 0, y: 0, angle: 0 };
const s2 = Z.stoelVoor(bus, 2), s3 = Z.stoelVoor(bus, 3);
assert.ok(Math.abs(s2.z) > 0.4 && s2.x !== s3.x || s2.z !== s3.z, 'twee medespelers zitten niet op dezelfde plek');
assert.ok(s2.y > 0.5 && s2.y < 1.2, 'op zithoogte: ' + s2.y);
const sSta = Z.stoelVoor(bus, 2 + L.seats.length);
assert.ok(sSta.stand === true, 'op een staanplek');

// --- de lijm met het spel op een nepwereld
const C = await import('../../game/js/coopbus.js');
function wereld() {
  const bus = { isBus: true, speed: 0, model: { name: 'bus', len: 11.2, wid: 2.55 }, busBediend: makeBediening() };
  const w = {
    player: { inVehicle: bus }, vehicles: [bus], companion: null, coopFigures: { 2: { slot: 2, inVeh: bus, stoel: 2 }, 3: { slot: 3, inVeh: bus, stoel: 3 } },
    money: 100, msgs: [], gmsgs: [], deelden: [],
    addMessage(t) { this.msgs.push(t); }, coopMeld(slot, t) { this.gmsgs.push([slot, t]); },
    coopDeel(bedrag, info) { this.deelden.push([bedrag, info]); return 1; },
  };
  return { w, bus };
}
{
  const { w, bus } = wereld();
  assert.deepStrictEqual(C.aanBoord(w, bus).sort(), [0, 2, 3]);
  const bc = C.busCoopStart(w, bus, 3);
  assert.deepStrictEqual(bc.deelnemers.sort(), [0, 2, 3]);
  assert.strictEqual(bc.wacht, 3);
  // een late speler stapt in: geen rol
  w.coopFigures[4] = { slot: 4, inVeh: bus, stoel: 4 };
  assert.ok(C.busCoopActie(w, 4, 'deur') && w.gmsgs.at(-1)[0] === 4, 'een late instapper krijgt een melding en bedient niets');
  assert.ok(!bus.busBediend.doorWant);
  // het hulpje opent de deuren (alleen bij stilstand)
  bus.speed = 5;
  C.busCoopActie(w, 2, 'deur'); assert.ok(!bus.busBediend.doorWant, 'rijdend niet');
  bus.speed = 0;
  C.busCoopActie(w, 2, 'deur'); assert.ok(bus.busBediend.doorWant, 'het hulpje opent de deuren');
  stepBediening(bus.busBediend, 1, 0);
  // een passagier drukt E: dat is uitstappen (niet afgehandeld hier)
  assert.ok(!C.busCoopValideerE(w, 3));
  // het hulpje valideert met E
  assert.ok(C.busCoopValideerE(w, 2) && C.aanBoord(w, bus).length === 4);
  assert.strictEqual(wachtend(bc), 2);
  C.busCoopValideerE(w, 2); C.busCoopValideerE(w, 2);
  assert.ok(!C.busCoopValideerE(w, 2), 'niemand meer: E doet weer wat het altijd deed');
  // de halte wordt per gebeurtenis betaald en verdeeld
  const geld0 = w.money;
  const euro = C.busCoopBetaal(w, bus, { board: 3, alight: 4 }, 90);
  assert.ok(euro > 0 && w.money === geld0 + euro && w.deelden.length === 1, 'gastheer krijgt het bedrag, coopDeel verdeelt');
  assert.deepStrictEqual(w.deelden[0][1].slots.sort(), [2, 3], 'alleen wie meedoet krijgt een deel, niet de late instapper');
  assert.ok(w.deelden[0][1].vak === 'bus' && w.deelden[0][1].basis === euro);
  // solo: niets extra
  const s = wereld();
  s.w.coopFigures = {};
  C.busCoopStart(s.w, s.bus, 2);
  assert.strictEqual(C.busCoopBetaal(s.w, s.bus, { board: 3, alight: 4 }, 90), 0, 'solo blijft zoals het was');
  assert.strictEqual(s.w.deelden.length, 0);
}
// de chauffeur is een gast en valt weg: de bus remt veilig af
{
  const { w, bus } = wereld();
  w.player = { inVehicle: null }; // de gastheer zit er niet in; speler 2 is chauffeur
  w.coopFigures = { 2: { slot: 2, inVeh: bus, stoel: 2 } };
  const bc = C.busCoopStart(w, bus, 0);
  assert.strictEqual(bc.chauffeur, 2);
  bus.speed = 12;
  delete w.coopFigures[2];
  C.busCoopTik(w, bus, 0.1);
  assert.ok(bc.remmen && bus.speed < 12, 'de bus remt');
  for (let i = 0; i < 40; i++) C.busCoopTik(w, bus, 0.1);
  assert.strictEqual(bus.speed, 0);
  assert.ok(bus.handbrake && !bc.remmen, 'de bus staat stil met de handrem erop');
}
// een gast aan het stuur valt weg terwijl de gastheer meerijdt: de gastheer neemt over, geen noodstop
{
  const { w, bus } = wereld();
  w.coopFigures = { 2: { slot: 2, inVeh: bus, stoel: 2 } };
  const bc = C.busCoopStart(w, bus, 0);
  bc.chauffeur = 2;
  bus.speed = 10;
  delete w.coopFigures[2];
  C.busCoopTik(w, bus, 0.1);
  assert.strictEqual(bc.chauffeur, 0);
  assert.ok(!bc.remmen && bus.speed === 10, 'doorrijden: de gastheer rijdt');
}
console.log('buscoop_test ok');
