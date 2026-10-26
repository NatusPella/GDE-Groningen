// De vluchtdienst (#444) in arcadeplane.js: route tussen twee velden, poorten, checklist,
// puntentelling en medaille. Puur: geen THREE, geen wereld. Sinds #492 hoort de beloning en de
// toren erbij (luchtverkeer.js) en betaalt de dienst in activities.js via loopbaanVerdien.
//   node scripts/vluchtdienst_test.mjs
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { VLUCHT, CHECKLIST, checklist, maakVluchtdienst, vluchtStap, vluchtVoortgang, vluchtUitslag, vluchtStand, vluchtTussenVelden } from '../game/js/arcadeplane.js';
import { VLUCHT_LOON, VLUCHT_XP, vluchtLoon, departure, approach } from '../game/js/luchtverkeer.js';
import { margeVoorDienst } from '../game/js/simdienst.js';

const hier = path.dirname(fileURLToPath(import.meta.url));
const dienstBron = readFileSync(path.join(hier, '../game/js/activities.js'), 'utf8');

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

// --- de beloning (#492): goud, zilver en brons betalen verschillend ---------------------------
const uitslag = (medaille, extra = {}) => ({ klaar: true, afgebroken: false, mislukt: null, medaille, ...extra });
const goudLoon = vluchtLoon(uitslag(3));
const zilverLoon = vluchtLoon(uitslag(2));
const bronsLoon = vluchtLoon(uitslag(1));
const geenLoon = vluchtLoon(uitslag(0));
assert.deepStrictEqual(goudLoon, { geld: 40, xp: 26, n: 1 });
assert.deepStrictEqual(zilverLoon, { geld: 28, xp: 20, n: 1 });
assert.deepStrictEqual(bronsLoon, { geld: 18, xp: 14, n: 1 });
assert.strictEqual(geenLoon.geld, 0, 'zonder medaille geen geld');
assert.ok(goudLoon.geld > zilverLoon.geld && zilverLoon.geld > bronsLoon.geld, 'de beloning schaalt met de medaille');
assert.ok(goudLoon.xp > zilverLoon.xp && zilverLoon.xp > bronsLoon.xp, 'de ervaring schaalt mee');
assert.strictEqual(VLUCHT_LOON[0], 0);
assert.ok(Math.max(...VLUCHT_LOON) < 60, 'onder de eenmalige vliegschoolmedailles (€25-60): ' + Math.max(...VLUCHT_LOON));
assert.ok(VLUCHT_XP.every((x) => x >= 0 && x < 60));

// een afgebroken of mislukte vlucht betaalt niets, hoe goed de vlucht tot dan toe was
assert.deepStrictEqual(vluchtLoon(uitslag(3, { afgebroken: true })), { geld: 0, xp: 0, n: 0 }, 'afgebroken vlucht betaalt 0');
assert.deepStrictEqual(vluchtLoon(uitslag(3, { mislukt: 'crash' })), { geld: 0, xp: 0, n: 0 }, 'crash betaalt 0');
assert.deepStrictEqual(vluchtLoon(uitslag(3, { mislukt: 'te laat' })), { geld: 0, xp: 0, n: 0 }, 'te laat betaalt 0');
assert.deepStrictEqual(vluchtLoon(uitslag(3, { klaar: false })), { geld: 0, xp: 0, n: 0 }, 'een vlucht die nog loopt betaalt niets');
assert.deepStrictEqual(vluchtLoon(null), { geld: 0, xp: 0, n: 0 }, 'zonder uitslag betaalt niets');

// geen dubbele betaling: de tweede keer op dezelfde dienst levert niets meer op
const run = {};
assert.deepStrictEqual(vluchtLoon(uitslag(3), run), { geld: 40, xp: 26, n: 1 });
assert.strictEqual(run.betaald, true, 'de dienst weet dat er betaald is');
assert.deepStrictEqual(vluchtLoon(uitslag(3), run), { geld: 0, xp: 0, n: 0 }, 'nooit twee keer betaald');
assert.deepStrictEqual(vluchtLoon(uitslag(3), { betaald: true }), { geld: 0, xp: 0, n: 0 }, 'een betaalde dienst betaalt niet nog eens');

// de xp/vak-haak in activities.js: het geld en de punten gaan naar vak 'lucht' via loopbaanVerdien
assert.match(dienstBron, /import \{[^}]*vluchtLoon[^}]*\} from '\.\/luchtverkeer\.js'/, 'activities.js haalt de beloning uit luchtverkeer.js');
assert.match(dienstBron, /loopbaanVerdien\(w, 'lucht', b\.geld, \{ xp: b\.xp, n: b\.n, uniek: 'vluchtdienst', deel: false \}\)/, 'de dienst betaalt via loopbaanVerdien in het vak lucht, zonder het bedrag naar gasten te delen');
assert.match(dienstBron, /beloning: \(w, u, r\) => \{/, 'de vluchtdienst heeft de beloningshaak');
assert.match(dienstBron, /const geld = cfg\.beloning \? cfg\.beloning\(w, u, r\) : 0;/, 'de dienst betaalt pas in stop(), niet bij elke stap');
assert.ok(!/world\.money\s*\+=/.test(dienstBron) && !/w\.money\s*\+=/.test(dienstBron), 'geen tweede kasboek in activities.js');
assert.ok(!/Math\.random/.test(readFileSync(path.join(hier, '../game/js/luchtverkeer.js'), 'utf8')), 'luchtverkeer.js is puur: geen random');

// de toren staat als bordrij in de dienst: één vertrekregel bij het vertrekveld en één
// naderingsregel bij de bestemming (#492), niet bij de naam van de dienst
assert.match(dienstBron, /rijen: \(d\) => \[\['Vertrek', departure\(d\.vanNaam\)\], \['Nadering', approach\(d\.naarNaam\)\]\]/, 'de toren noemt het vertrekveld en de bestemming');
assert.ok(typeof departure('Rondvlucht Eelde') === 'string' && typeof approach('Rondvlucht Eelde') === 'string', 'de bordregels komen uit luchtverkeer.js');

// --- de etappe tussen twee velden (#492) ------------------------------------------------------
const plekken = JSON.parse(readFileSync(path.join(hier, '../game/vliegplekken.json'), 'utf8'));
const VELDEN = [{ id: 'eelde', naam: 'Eelde', x: plekken.eelde.x, y: plekken.eelde.y, thuis: true }, ...plekken.velden];
const rit = vluchtTussenVelden(VELDEN, plekken.eelde.x, plekken.eelde.y, { thuis: 'eelde' });
assert.ok(rit && rit.naar.id !== 'eelde', 'de dienst kiest een tweede veld als bestemming');
const tweed = maakVluchtdienst(rit);
assert.strictEqual(tweed.naam, `Eelde – ${rit.naar.naam}`, 'de dienst heet naar de twee velden');
assert.strictEqual(tweed.vanNaam, 'Eelde');
assert.strictEqual(tweed.naarNaam, rit.naar.naam, 'de bestemming staat in de dienst');
assert.strictEqual(tweed.halten.length, 3, 'twee poorten en het tweede veld');
assert.strictEqual(tweed.halten[2].naam, rit.naar.naam);
assert.strictEqual(tweed.halten[2].stil, true, 'het tweede veld telt pas als je er staat');
assert.ok(Math.hypot(tweed.halten[2].x - rit.naar.x, tweed.halten[2].y - rit.naar.y) < 1, 'de landing telt op het tweede veld');
assert.strictEqual(departure(tweed.vanNaam), departure('Eelde'), 'de vertrekregel hoort bij Eelde');
assert.strictEqual(approach(tweed.naarNaam), approach(rit.naar.naam), 'de naderingsregel hoort bij de bestemming');

// de hele etappe: langs de lijn, poorten op hoogte en een landing op het tweede veld
const d2 = margeVoorDienst(maakVluchtdienst(rit), 14);
const e2 = [];
const k2 = (x, y, extra = {}) => ({ x, y, z: 120, speed: 45, onGround: false, roll: 0, flaps: 0, gear: true, landing: undefined, crashed: false, ...extra });
const lengte = Math.hypot(rit.naar.x - rit.van.x, rit.naar.y - rit.van.y);
const stapT = 20 / 45; // twintig meter per stap, op kruissnelheid
for (let s = 0; s < lengte; s += 20) {
  const t = s / lengte;
  e2.push(...vluchtStap(d2, k2(rit.van.x + (rit.naar.x - rit.van.x) * t, rit.van.y + (rit.naar.y - rit.van.y) * t), { dt: stapT }));
}
e2.push(...vluchtStap(d2, k2(rit.naar.x, rit.naar.y, { onGround: true, z: 0, speed: 0, landing: 'zacht' }), { dt: stapT }));
assert.ok(d2.klaar, 'de etappe is klaar');
assert.ok(e2.some((e) => e.soort === 'halte' && e.halte.naam === rit.naar.naam), 'de landing op het tweede veld telt als halte');
const u2 = vluchtUitslag(d2);
assert.strictEqual(u2.gehaald, 3);
assert.strictEqual(u2.landing, 'zacht');
assert.strictEqual(u2.mislukt, null);
assert.strictEqual(u2.medaille, 3, 'een nette etappe is goud: ' + u2.punten);
const loon2 = vluchtLoon(u2);
assert.ok(loon2.geld > 0 && loon2.xp > 0, 'een landing op het tweede veld betaalt: ' + JSON.stringify(loon2));

// overvliegen zonder te landen: de dienst eindigt, maar zonder landing en zonder beloning
const mis = maakVluchtdienst({ van: { x: 0, y: 0, naam: 'Eelde' }, naar: { x: 2000, y: 0, naam: 'Glimmen' } });
const mev = [];
for (let x = 20; x <= 3200; x += 20) mev.push(...vluchtStap(mis, kist(x), { dt }));
assert.ok(mis.klaar, 'de dienst eindigt bij het voorbijvliegen');
assert.strictEqual(mis.mislukt, 'gemist', 'geen landing op de bestemming is geen geslaagde vlucht');
assert.strictEqual(mev.at(-1).soort, 'klaar');
const um = vluchtUitslag(mis);
assert.strictEqual(um.landing, null);
assert.strictEqual(um.medaille, 0, 'zonder landing geen medaille');
assert.deepStrictEqual(vluchtLoon(um), { geld: 0, xp: 0, n: 0 }, 'zonder landing geen beloning');

// terugvliegen is een nieuwe dienst, en de keuze is nooit het veld waar je al staat
const terug = vluchtTussenVelden(VELDEN, rit.naar.x, rit.naar.y, { thuis: 'eelde' });
assert.ok(terug && terug.van.id === rit.naar.id, 'je vertrekt vanaf het tweede veld');
assert.strictEqual(terug.naar.id, 'eelde', 'terug naar Eelde');
assert.ok(!vluchtTussenVelden([VELDEN[0]], plekken.eelde.x, plekken.eelde.y, { thuis: 'eelde' }), 'zonder tweede veld geen etappe');

// activities.js en planeflight.js: de dienst kiest de etappe en de wereld kent de banen
assert.match(dienstBron, /vluchtTussenVelden\(w\.planeVelden \|\| \[\], v\.x, v\.y, \{ thuis: 'eelde' \}\)/, 'de dienst kiest de etappe uit de velden');
assert.match(dienstBron, /dichtstbijVeld\(w\.planeVelden \|\| \[\], p\.x, p\.y\)/, 'de startplek is het veld waar de Kist staat');
const vliegBron = readFileSync(path.join(hier, '../game/js/planeflight.js'), 'utf8');
assert.match(vliegBron, /vliegplekken\.json/, 'planeflight leest de gemeten velden');
assert.match(vliegBron, /w\.planeVelden = veldenVan\(\)/, 'de velden staan als banen op de wereld');
assert.match(vliegBron, /function opBaan\(w, x, y\)/, 'de landing telt op elke baan');

console.log('vluchtdienst_test ok');
