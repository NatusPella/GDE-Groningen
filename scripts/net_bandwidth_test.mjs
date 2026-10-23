// Samen spelen (#95): bandbreedte per speler, gemeten aan de echte codec (net/codec.js) en de vaste frequenties (net/session.js).
// Slechtste geval: 4 spelers, het maximum van 64 voertuigen/doelen in elke snapshot. De host stuurt dat naar elke gast.
import assert from 'node:assert/strict';
import { encodeSnapshot, encodeInput, encodeExtra, MAX_ENTITIES, MAX_LOOKS, MAX_EXTRA } from '../game/js/net/codec.js';
import { MAX_ENTITEITEN } from '../game/js/coopworld.js';
import { SNAP_HZ, INPUT_HZ, EXTRA_HZ } from '../game/js/net/session.js';
import * as X from '../game/js/coopextra.js';

const speler = (slot) => ({ slot, x: 100.5, y: 200.25, z: 0, angle: 1.2, alive: true, inVeh: false, driver: false, run: true, health: 100, vehicle: null });
// een voertuig draagt vlaggen, snelheid en sturen; een kwart rijdt op hoogte (brug), de helft is in beweging; het uiterlijk gaat roulerend mee (MAX_LOOKS per snapshot, met schade)
const ent = (i) => ({ id: i, kind: 1, x: i * 3.5, z: i * 2.5, angle: 0.5, fl: 1 | (i % 4 ? 0 : 4), speed: i % 2 ? 8.5 : 0, steer: 0.2, vz: i % 4 ? 0 : 6 });
const look = (i) => ({ id: i, model: 2, fl: 1, len: 4.3, wid: 1.8, color: 0x7a1f1f, color2: 0x202020, extra: 0, dents: [[1.2, 0.3, 0.6], [-1.5, -0.4, 0.4]] });
const snap = (ents) => ({ players: [0, 1, 2, 3].map(speler), shared: { money: 12345, wanted: 2, clock: 99.5 }, mission: { stage: 3, state: 'run', present: 15 }, entities: Array.from({ length: ents }, (_, i) => ent(i)), looks: Array.from({ length: MAX_LOOKS }, (_, i) => look(i)) });
const leeg = encodeSnapshot(1, 1, 0, snap(0)).length;
const vol = encodeSnapshot(1, 1, 0, snap(MAX_ENTITEITEN)).length; // het echte maximum van de host (60), niet de ruimere grens van de codec
const inp = encodeInput(1, 1, 0, { mx: 1, my: 0, buttons: 1, yaw: 0.3 }).length;
// de rest van de wereld (#428: coopextra.js): het slechtste geval, 20 voetgangers met een uiterlijk (8 nieuwe per bericht, een paar met een look en een last),
// 20 dieren, 40 verkeerslichten, 40 kapotte objecten en 4 sprekers
const peds = Array.from({ length: 20 }, (_, i) => ({ x: 100 + i, y: 200, angle: 1, speed: 1.4, health: 30, state: 'wander', clothing: '#b8473a', skin: '#d9aa82', _lookSeed: 1234.5678 + i, hasBag: true, look: i % 2 ? { top: 'hoodie', hat: 'beanie', hatColor: 0x3a3a3c, facial: 'beard', age: 'old' } : null, carry: i % 5 === 0 ? 'paper' : null, speechText: i < 4 ? 'Moi, wat een mooi weer is het vandaag toch!' : null, speechUntil: 1e9, greetUntil: 1e9 }));
const dieren = Array.from({ length: 30 }, (_, i) => ({ kind: ['cow', 'sheep', 'dog', 'cat', 'duck'][i % 5], x: 100 + i, y: 210, angle: 2, speed: 0.5, bobSeed: 1.5 + i, variant: 'hen', breed: 1, color: 0.5 }));
// ook (#428): een paar met een wapen en een klap, een paar dood, 24 voertuigen met een open deur, 6 bruggen en 4 sluizen die bewegen en 2 sprekers
peds.forEach((p, i) => { if (i % 4 === 1) { p.heldWeapon = 'hockeystick'; p.attackFx = { type: 'melee', swing: 'overhead', start: 49.9 }; } if (i % 7 === 3) { p.state = 'dead'; p.health = 0; } });
const wereld = { time: 50, pedestrians: peds, wildlife: dieren, vehicles: Array.from({ length: 24 }, (_, i) => ({ id: 400 + i, x: 100 + i * 3, y: 205, model: { name: 'sedan' }, doors: { open: { vl: 1 }, want: { vl: 1, ar: 1 }, loose: {}, hold: {}, dmg: {} } })) };
const bijP = [{ x: 100, y: 200 }];
const bruggenWorst = Array.from({ length: 6 }, (_, i) => ({ state: 'opening', open: 0.5, boom: 1, x: 100 + i * 20, y: 210 })), sluizenWorst = Array.from({ length: 4 }, (_, i) => ({ x: 100 + i * 30, y: 220, state: 'levelling', at: 1, gate: [0, 1], level: -1.2 }));
const sprekersWorst = [{ x: 101, y: 201, h: 2.3, speechName: 'Kermisbaas Jan', speechText: 'Kom maar binnen, joh! Het is hier gezellig en alles is vandaag half geld.', speechUntil: 1e9 }, { x: 103, y: 201, h: 2.2, female: true, speechName: 'Hilje van de boerderij', speechText: 'Moi! Wat een mooi weer, hè? Pak maar een bakkie.', speechUntil: 1e9 }];
const extraDeps = { wereld: (bij) => X.maakWereldLijst(bruggenWorst, sluizenWorst, bij), sprekers: (bij, nu) => X.maakSprekersLijst(sprekersWorst, nu, bij), controllers: Array.from({ length: 60 }, (_, i) => ({ x: 100 + i, y: 200, t: i })), gebroken: () => Array.from({ length: 60 }, (_, i) => ({ key: 'bin@' + i, kind: 'bin', x10: 1000 + i, y10: 2000 })), misc: () => [{ tag: 1, data: new Uint8Array(40) }] };
const extraBytes = encodeExtra(1, 1, 0, X.codeerExtra(X.verzamelExtra(wereld, bijP, X.nieuwGeheugen(), extraDeps), bijP[0])).length;
// een rustig bericht: alles al verteld, de kapotlijst ongewijzigd
const gh = X.nieuwGeheugen(); X.verzamelExtra(wereld, bijP, gh, extraDeps); X.verzamelExtra(wereld, bijP, gh, extraDeps); X.verzamelExtra(wereld, bijP, gh, extraDeps);
const extraRustig = encodeExtra(1, 1, 0, X.codeerExtra(X.verzamelExtra(wereld, bijP, gh, extraDeps), bijP[0])).length;
const NET = 1.2; // ruwe opslag voor TCP/IP- of WebRTC-kopjes en lengteprefix
const perGastNaar = (b) => b * SNAP_HZ * NET;            // host -> gast, bytes per seconde
const perGastVan = inp * INPUT_HZ * NET;                 // gast -> host
console.log(`  snapshot: ${leeg} B zonder voertuigen, ${vol} B met ${MAX_ENTITEITEN} voertuigen en ${MAX_LOOKS} uiterlijkrecords; invoer ${inp} B`);
console.log(`  host -> gast: ${(perGastNaar(leeg) / 1024).toFixed(1)}..${(perGastNaar(vol) / 1024).toFixed(1)} kB/s (${(perGastNaar(vol) * 8 / 1e6).toFixed(2)} Mbit/s); gast -> host ${(perGastVan / 1024).toFixed(1)} kB/s`);
console.log(`  extra wereld (EXTRA_HZ ${EXTRA_HZ}): ${extraRustig} B rustig, ${extraBytes} B in het slechtste bericht (grens ${MAX_EXTRA}); ${(extraRustig * EXTRA_HZ * NET / 1024).toFixed(1)}..${(extraBytes * EXTRA_HZ * NET / 1024).toFixed(1)} kB/s per gast`);
console.log(`  host met 3 gasten: ${(3 * perGastNaar(vol) * 8 / 1e6).toFixed(2)} Mbit/s omhoog in het slechtste geval; een gast 0,${Math.round(perGastNaar(vol) * 8 / 1e5)} Mbit/s omlaag`);
const perGastTotaal = perGastNaar(vol) + extraBytes * EXTRA_HZ * NET; // snapshot met 64 entiteiten plus het slechtste extra-bericht, elk bericht
console.log(`  samen per gast: ${(perGastTotaal / 1024).toFixed(1)} kB/s; host met 3 gasten ${(3 * perGastTotaal * 8 / 1e6).toFixed(2)} Mbit/s omhoog`);
// een gewone thuisverbinding heeft 5-10 Mbit/s omhoog: het slechtste geval met 3 gasten moet daar ruim onder blijven
assert.ok(3 * perGastNaar(vol) * 8 / 1e6 < 2, 'host met 3 gasten blijft onder 2 Mbit/s omhoog');
assert.ok(3 * perGastTotaal * 8 / 1e6 < 2, 'host met 3 gasten blijft met de extra wereld onder 2 Mbit/s omhoog');
assert.ok(extraBytes <= 13 + MAX_EXTRA && extraBytes + 28 <= 1200, 'een extra-bericht past in één pakket');
assert.ok(extraRustig < 800, 'een rustig extra-bericht is klein: ' + extraRustig);
assert.ok(perGastVan * 8 / 1e6 < 0.1, 'een gast stuurt minder dan 0,1 Mbit/s');
assert.ok(vol <= 1280, 'een snapshot past in één pakket (1280 B, de kleinste MTU van IPv6; was 1024 B vóór de voertuigstaat, #428)');
console.log('net_bandwidth_test: ok');
// Uitkomst na het samenvoegen van voertuigstaat (codec 2) en EXTRA (#428): snapshot 1196 B met 60 voertuigen + 4 uiterlijkrecords (28 kB/s per gast),
// EXTRA hoogstens 1112 B op 5 Hz (4,3 tot 6,5 kB/s); samen 34,5 kB/s per gast en 0,85 Mbit/s omhoog voor een host met 3 gasten, onder de grens van 2 Mbit/s.
