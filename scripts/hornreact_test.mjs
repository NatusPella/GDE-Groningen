// Hoe de straat antwoordt op een menselijke bestuurder (game/js/hornreact.js):
//  1. verkeer vlak voor een toeterende auto gaat aan de kant, toetert terug of doet niets (vast per voertuig);
//  2. een voetganger in de baan van een toeter of fietsbel stapt opzij;
//  3. een auto die rakelings langs een voetganger scheurt wordt nagekeken (geen aanrijding);
//  4. gastheer en gast tellen allebei (driver === 'player'), zonder world.player;
//  5. de lijsten per frame maken geen nieuwe arrays aan.
// Puur: geen wereld, geen opslag, geen toetsen.
//   node scripts/hornreact_test.mjs
import { readFileSync } from 'node:fs';
const H = await import('../game/js/hornreact.js');

let n = 0, bad = 0;
const ok = (c, name, info = '') => { n++; if (!c) { bad++; console.log('FAIL', name, info); } };
const car = (o = {}) => ({ id: 0, x: 0, y: 0, z: 0, angle: 0, speed: 0, halfLen: 1.9, halfWid: 0.85, driver: null, horn: false, ...o });

// --- 1. verkeer ---------------------------------------------------------------
const src = car({ id: 100, x: -12, driver: 'player', horn: true, speed: 10 });
ok(H.hornCarResponse(car({ id: 0 }), src) === 'aside', 'auto 12 m voor de toeter, zelfde baan: aan de kant');
ok(H.hornCarResponse(car({ id: 7 }), src) === 'honk', 'koppige bestuurder (id 7) toetert terug');
ok(H.hornCarResponse(car({ id: 9 }), src) === null, 'onverschillige bestuurder (id 9) doet niets');
ok(H.hornCarResponse(car({ id: 0, x: -30 }), src) === null, 'auto achter de toeter reageert niet');
ok(H.hornCarResponse(car({ id: 0, y: 5 }), src) === null, 'auto op een andere baan (5 m opzij) reageert niet');
ok(H.hornCarResponse(car({ id: 0, x: 40 }), src) === null, 'auto 52 m verderop hoort het niet meer');
ok(H.hornCarResponse(car({ id: 0, angle: Math.PI }), src) === null, 'tegenligger reageert niet');
ok(H.hornCarResponse(car({ id: 0, angle: Math.PI / 2 }), src) === null, 'kruisend verkeer reageert niet');
ok(H.hornCarResponse(car({ id: 0, z: 6 }), src) === null, 'auto op het viaduct erboven reageert niet');
ok(H.hornCarResponse(car({ id: 0, isPolice: true }), src) === null, 'politie gaat niet opzij voor een toeter');
ok(H.hornCarResponse(car({ id: 0, isBus: true }), src) === null, 'de lijnbus houdt zijn dienst');
ok(H.hornCarResponse(car({ id: 0 }), car({ ...src, isBike: true })) === null, 'een fietsbel zet geen auto opzij');
ok(H.hornCarResponse(src, src) === null, 'de toeteraar reageert niet op zichzelf');

// verdeling van het karakter: 7 op de 10 opzij, 2 toeteren terug, 1 niets; vast per voertuig
const tel = { aside: 0, honk: 0, null: 0 };
for (let id = 0; id < 1000; id++) tel[String(H.hornTemper(id))]++;
ok(tel.aside === 700 && tel.honk === 200 && tel.null === 100, 'karakterverdeling 70/20/10', JSON.stringify(tel));
ok(H.hornTemper(13) === H.hornTemper(13) && H.hornTemper(-3) === H.hornTemper(7), 'karakter is vast per id, ook bij een negatief id');

// wie opzij gaat rijdt door, maar langzamer dan zijn kruissnelheid en nooit bijna stil
ok(H.hornAsideSpeed(13.9) < 13.9 && H.hornAsideSpeed(13.9) > 3.5, 'opzij op een 50-weg: langzamer, sneller dan de sirenestand (3,5 m/s)', String(H.hornAsideSpeed(13.9)));
ok(H.hornAsideSpeed(4) === H.HORN_ASIDE_MIN, 'opzij in een woonerf: ondergrens');

// --- 2. voetgangers -------------------------------------------------------------
const honker = car({ driver: 'player', horn: true, speed: 6 });
const left = H.hornPedDodge(8, 0.4, honker), right = H.hornPedDodge(8, -0.4, honker);
ok(left !== null && Math.abs(left - Math.PI / 2) < 1e-9, 'voetganger links in de baan stapt naar links', String(left));
ok(right !== null && Math.abs(right + Math.PI / 2) < 1e-9, 'voetganger rechts in de baan stapt naar rechts', String(right));
ok(H.hornPedDodge(-4, 0, honker) === null, 'voetganger achter de auto blijft lopen');
ok(H.hornPedDodge(8, 4, honker) === null, 'voetganger op de stoep (4 m opzij) blijft lopen');
ok(H.hornPedDodge(25, 0, honker) === null, 'voetganger 25 m verderop blijft lopen');
ok(H.hornPedDodge(15, 0, honker) !== null, 'een toeter reikt 16 m voor de bumper');
ok(H.hornPedDodge(15, 0, car({ ...honker, isBike: true, halfLen: 0.9, halfWid: 0.3 })) === null, 'een fietsbel reikt half zo ver');
ok(H.hornPedDodge(6, 0, car({ ...honker, isBike: true, halfLen: 0.9, halfWid: 0.3 })) !== null, 'een fietsbel zet een voetganger op 6 m opzij');
// het gewone uitwijken (kort bereik) en het toeteren (lang bereik) delen één functie
ok(H.pathDodgeHeading(8, 0, honker, 2.5, 1.2) === null && H.pathDodgeHeading(8, 0, honker, H.HORN_PED_REACH, H.HORN_PED_MARGIN) !== null, 'zonder toeter wijkt hij op 8 m nog niet uit, met toeter wel');
// gedraaid voertuig: de stap staat haaks op de rijrichting
const noord = car({ angle: Math.PI / 2, driver: 'player', horn: true });
const h = H.hornPedDodge(0.3, 7, noord);
ok(h !== null && Math.abs(Math.cos(h - noord.angle)) < 1e-9, 'de stap staat haaks op de rijrichting', String(h));

// --- 3. rakelings ---------------------------------------------------------------
const racer = car({ driver: 'player', speed: 14 });
ok(H.skimsPast(0, 1.6, racer) === true, 'voetganger 0,75 m naast de flank bij 50 km/u: geschrokken');
ok(H.skimsPast(0, -1.6, racer) === true, 'ook aan de andere kant');
ok(H.skimsPast(0, 0.9, racer) === false, 'tegen de flank aan is een aanrijding, geen rakelings');
ok(H.skimsPast(0, 3, racer) === false, 'ruim twee meter ernaast: niets aan de hand');
ok(H.skimsPast(6, 1.6, racer) === false, 'ver voor de auto: dat is uitwijken, geen rakelings');
ok(H.skimsPast(0, 1.6, car({ driver: 'player', speed: 5 })) === false, 'stapvoets langsrijden schrikt niemand');
ok(H.skimsPast(0, 1.6, car({ driver: 'player', speed: -12 })) === true, 'hard achteruit telt ook');

// --- 4. gastheer en gast, 5. geen nieuwe arrays -----------------------------------
const hostCar = car({ id: 1, driver: 'player', horn: true });
const guestCar = car({ id: 2, x: 50, driver: 'player', coopBestuurder: 2, horn: true });
const silent = car({ id: 3, driver: 'player' });
const npc = car({ id: 4, driver: 'ai', horn: true });
const wreck = car({ id: 5, driver: 'player', horn: true, wrecked: true });
const boat = car({ id: 6, driver: 'player', horn: true, isBoat: true });
const world = { time: 1, vehicles: [hostCar, guestCar, silent, npc, wreck, boat] }; // bewust zonder player
const a = H.hornSources(world), d = H.drivenVehicles(world);
ok(a.length === 2 && a.includes(hostCar) && a.includes(guestCar), 'de toeter van de gastheer en van een gast tellen allebei', String(a.length));
ok(d.length === 3 && d.includes(silent), 'bestuurde voertuigen: gastheer, gast en de stille; geen NPC, wrak of boot', String(d.length));
ok(H.hornYield(car({ id: 0, x: 62 }), world) === 'aside', 'NPC voor de auto van de gast gaat aan de kant');
world.time = 2; hostCar.horn = false;
const a2 = H.hornSources(world);
ok(a2 === a && H.drivenVehicles(world) === d, 'dezelfde arrays worden hergebruikt (geen allocatie per frame)');
ok(a2.length === 1 && a2[0] === guestCar, 'de lijst volgt de toeter per frame');
world.vehicles = []; world.time = 3;
ok(H.hornSources(world).length === 0 && H.hornYield(car(), world) === null, 'niemand toetert: geen reactie');

// --- bedrading: de AI en de voetgangers lezen het ---------------------------------
const traffic = readFileSync(new URL('../game/js/vehicle/traffic.js', import.meta.url), 'utf8');
const peds = readFileSync(new URL('../game/js/pedestrians.js', import.meta.url), 'utf8');
ok(/hornYield\(v, world\)/.test(traffic) && /v\.yieldSoft \? hornAsideSpeed\(cruise\)/.test(traffic), 'de verkeers-AI gebruikt hornYield en de zachte snelheid');
ok(/hornBackAt \+ HORN_BACK_LEN/.test(traffic), 'terugtoeteren zit in v.horn (dus ook in het geluid en in de snapshot voor gasten)');
ok(/hornPedDodge\(ped\.x, ped\.y, hv\)/.test(peds) && /skimsPast\(ped\.x, ped\.y, dv\)/.test(peds), 'voetgangers gebruiken hornPedDodge en skimsPast');
const blok = peds.slice(peds.indexOf('a horn or bell coming up behind'), peds.indexOf('if (!moving) {', peds.indexOf('a horn or bell coming up behind')));
ok(blok.length > 0 && !/world\.player|hoofdspeler\(/.test(blok), 'het nieuwe voetgangersblok kent geen enkele speler (geen world.player, geen hoofdspeler)');

console.log(bad ? `hornreact_test: ${bad} van ${n} mislukt` : `hornreact_test: ${n} controles geslaagd`);
if (bad) process.exit(1);
