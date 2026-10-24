// De vluchtdienst (#444) in arcadeplane.js: route tussen twee velden, poorten, checklist,
// puntentelling en medaille. Puur: geen THREE, geen wereld.
//   node scripts/vluchtdienst_test.mjs
import assert from 'node:assert';
import { VLUCHT, CHECKLIST, checklist, maakVluchtdienst, vluchtStap, vluchtVoortgang, vluchtUitslag, vluchtStand } from '../game/js/arcadeplane.js';

const dt = 0.5;
const van = { x: 0, y: 0, naam: 'Veld Noord' };
const naar = { x: 2000, y: 0, naam: 'Veld Zuid' };
const route = [{ x: 800, y: 0, z: 200, naam: 'Poort 1' }, { x: 1500, y: 0, z: 200, naam: 'Poort 2' }];

// Een kist in de lucht: de test schrijft de baan zelf voor.
const kist = (x, { z = 200, speed = 40, onGround = false, roll = 0, flaps = 0, gear = true, landing = undefined } = {}) =>
  ({ x, y: 0, z: onGround ? 0 : z, speed, onGround, roll, flaps, gear, landing, crashed: false });

// --- checklist ------------------------------------------------------------------------------
const schoon = kist(0, { onGround: true });
assert.ok(checklist(schoon).every((i) => i.ok), 'een nette kist voldoet');
assert.strictEqual(checklist({ ...schoon, flaps: 3 }).find((i) => i.id === 'kleppen').ok, false);
assert.strictEqual(checklist({ ...schoon, gear: false }).find((i) => i.id === 'gestel').ok, false);
assert.strictEqual(checklist({ ...schoon, roll: 0.6 }).find((i) => i.id === 'waterpas').ok, false);
assert.strictEqual(CHECKLIST.length, 3);

// --- de hele vlucht: poorten op hoogte, zachte landing --------------------------------------
const d = maakVluchtdienst({ van, naar, route });
assert.strictEqual(d.vervoer, 'vliegtuig');
assert.strictEqual(d.naam, 'Veld Noord – Veld Zuid', 'verzonnen veldnamen');
assert.strictEqual(d.halten.length, 3, 'twee poorten en het veld');
assert.strictEqual(d.halten[2].stil, true, 'het veld telt pas als je er staat');
assert.strictEqual(d.halten[0].z, 200);
assert.strictEqual(vluchtVoortgang(d), 0);

const evs = [];
const vlieg = (p) => { evs.push(...vluchtStap(d, p, { dt })); };
for (let x = 20; x < 2000; x += 20) vlieg(kist(x));
assert.ok(evs.some((e) => e.soort === 'halte'), 'de poorten tellen');
const poorten = evs.filter((e) => e.soort === 'halte');
assert.strictEqual(poorten.length, 2, 'twee poorten gehaald');
assert.ok(poorten.every((e) => e.opTijd), 'op tijd: ' + JSON.stringify(poorten.map((e) => e.late)));
assert.ok(vluchtVoortgang(d) > 0.6 && vluchtVoortgang(d) < 1, 'onderweg: ' + vluchtVoortgang(d));
assert.ok(d.checklist && d.checklistOk, 'de checklist is bij het opstijgen beoordeeld');
// landen: aan de grond op het veld
vlieg(kist(2000, { onGround: true, speed: 25, landing: 'zacht' }));
assert.ok(d.klaar, 'de vlucht is klaar');
const u = vluchtUitslag(d);
assert.strictEqual(u.klaar, true);
assert.strictEqual(u.gehaald, 3);
assert.strictEqual(u.landing, 'zacht');
assert.strictEqual(u.bonus, VLUCHT.landBonus + VLUCHT.checklistBonus, 'bonus voor de landing en de checklist');
assert.strictEqual(u.punten, 100, 'een vlucht zonder fouten is honderd punten');
assert.strictEqual(u.medailleNaam, 'Goud');
assert.strictEqual(u.gemist, 0);
assert.strictEqual(evs.at(-1).soort, 'klaar');
assert.strictEqual(evs.at(-1).uitslag.medailleNaam, 'Goud', 'het laatste bericht heeft de eindstand bij zich');
assert.strictEqual(vluchtVoortgang(d), 1);
assert.strictEqual(vluchtStand(d).volgende, null);

// --- te snel door een poort: die telt niet --------------------------------------------------
const snel = maakVluchtdienst({ van, naar: { x: 1600, y: 0, naam: 'Veld Snel' }, route: [{ x: 500, y: 0, z: 200, naam: 'Poort' }] });
const sev = [];
for (let x = 10; x <= 1600; x += 20) sev.push(...vluchtStap(snel, kist(x, { speed: 70 }), { dt }));
sev.push(...vluchtStap(snel, kist(1600, { onGround: true, speed: 20, landing: 'hard' }), { dt }));
assert.strictEqual(snel.gehaald, 1, 'alleen het veld is gehaald');
assert.ok(sev.some((e) => e.soort === 'gemist'), 'de poort is gemist');
assert.ok(snel.gemist.length === 1 && snel.gemist[0].naam === 'Poort');
const us = vluchtUitslag(snel);
assert.strictEqual(us.gehaald, 1);
assert.strictEqual(us.gemist, 1);
assert.ok(us.punten < u.punten, 'een gemiste poort kost punten: ' + us.punten);

// --- de verkeerde hoogte telt niet, ook al vlieg je er langzaam langs ----------------------
const laag = maakVluchtdienst({ van, naar: { x: 1600, y: 0, naam: 'Veld Laag' }, route: [{ x: 500, y: 0, z: 200, naam: 'Poort' }] });
const lev = [];
for (let x = 10; x <= 1600; x += 20) lev.push(...vluchtStap(laag, kist(x, { z: 420, speed: 40 }), { dt }));
lev.push(...vluchtStap(laag, kist(1600, { onGround: true, speed: 20, landing: 'hard' }), { dt }));
assert.strictEqual(laag.gehaald, 1);
assert.ok(lev.some((e) => e.soort === 'gemist'), 'op vierhonderd meter hoogte mis je de poort');

// --- crash: de vlucht mislukt ---------------------------------------------------------------
const crash = maakVluchtdienst({ van, naar, route });
const cev = vluchtStap(crash, { ...kist(100), crashed: true }, { dt });
assert.ok(cev.some((e) => e.soort === 'mislukt' && e.reden === 'crash'));
assert.strictEqual(crash.mislukt, 'crash');
assert.strictEqual(vluchtUitslag(crash).mislukt, 'crash');
assert.ok(vluchtUitslag(crash).punten <= 40, 'een crash levert geen medaille');

// --- te laat: de klok stopt de vlucht -------------------------------------------------------
const laat = maakVluchtdienst({ van, naar, route, maxTijd: 5 });
const le = vluchtStap(laat, kist(100), { dt: 6 });
assert.ok(le.some((e) => e.soort === 'mislukt' && e.reden === 'te laat'));

// --- zonder bestemming geen dienst ----------------------------------------------------------
assert.throws(() => maakVluchtdienst({ van, route: [] }), /bestemming/);

// --- een harde landing levert minder op dan een zachte --------------------------------------
const hard = maakVluchtdienst({ van, naar: { x: 500, y: 0, naam: 'Veld Hard' } });
for (let x = 20; x < 500; x += 20) vluchtStap(hard, kist(x), { dt });
vluchtStap(hard, kist(500, { onGround: true, speed: 30, landing: 'hard' }), { dt });
assert.strictEqual(vluchtUitslag(hard).landing, 'hard');
assert.ok(vluchtUitslag(hard).punten < vluchtUitslag(d).punten, 'een harde landing is minder');

console.log('vluchtdienst_test ok');
