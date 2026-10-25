// De checklist van #434 (playtest 23-10, vier spelers) als één controle: per punt een test.
// Wat al in main zit, wordt hier tegen de echte code gehouden; wat (nog) niet kan, staat er eerlijk bij.
//   node scripts/coopcheck434_test.mjs
// De punten met een scherm of een echte Electron-sessie (camera omhoog/omlaag) verwijzen naar de testbankstap die
// ze dekt; alles wat puur is, wordt hier echt doorgerekend.
import './node3d.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as I from '../game/js/net/interp.js';
import * as S from '../game/js/coopspeler.js';
import * as GAST from '../game/js/coopgast.js';
import * as C from '../game/js/coopboot.js';
import * as T from '../game/js/treincoop.js';
import * as G from '../game/js/coopgezocht.js';
import * as P from '../game/js/coopspelers.js';
import * as M from '../game/js/coopmissie.js';
import * as L from '../game/js/coopgeluid.js';
import * as W from '../game/js/coopwapen.js';
import * as F from '../game/js/coopfoci.js';
import * as R from '../game/js/coopbestuur.js';
import * as Q from '../game/js/coopcut.js';
import * as PLAY from '../game/js/coopplayers.js';
import * as SL from '../game/js/net/serverlijst.js';
import { verzamelEntiteiten, SOORT_START } from '../game/js/coopworld.js';
const Z = await import('../game/js/seating3d.js'); // three.js: pas na de laadhaak van node3d.mjs

const lees = (pad) => fs.readFileSync(new URL(pad, import.meta.url), 'utf8');
let n = 0;
const punt = (naam, f) => { f(); n++; console.log(`${n}. ok   ${naam}`); };

// 1. Schokkerig bewegen: de gast tekent tussen twee snapshots, voorspelt kort en springt alleen bij een teleport
punt('schokkerig bewegen (snapshots interpoleren)', () => {
  assert.equal(I.INTERP_DELAY, 0.12);
  assert.equal(I.EXTRA_MAX, 0.25);
  assert.equal(I.SPRONG_M, 20);
  let toon = 0, laatste = 0;
  const stappen = [];
  for (let k = 0; k < 300; k++) {
    if (k % 4 === 0) laatste += 0.05; // 20 Hz, met een schokkerige aankomst
    const vorige = toon;
    toon = I.volgTijd(toon, laatste, 1 / 60);
    if (k > 60) stappen.push(toon - vorige);
  }
  assert.ok(Math.min(...stappen) > 0.004, 'geen beeld staat stil: ' + Math.min(...stappen));
  assert.ok(Math.max(...stappen) < 0.05, 'geen beeld springt: ' + Math.max(...stappen));
  assert.ok(toon <= laatste + I.EXTRA_MAX + 1e-9, 'hoogstens 0,25 s voorspellen');
  // een teleport van 60 m glijdt niet: meteen naar de nieuwe plek
  assert.equal(I.mixPositie({ x: 0, y: 0, z: 0 }, { x: 60, y: 0, z: 0 }, 0.5).x, 60);
});

punt('camera van de gast draait ook omhoog en omlaag (testbankstap gastpitch)', () => {
  const bank = lees('./coop/gastkant_434.mjs');
  assert.match(bank, /'gastpitch'/, 'de testbank meet de kijkhoek op en neer');
  assert.match(bank, /pi\.a1 - pi\.a0/, 'en toetst dat de hoek twee kanten op gaat');
  // de muis links en rechts blijft werken (dezelfde regel als voor de gast)
  assert.ok(GAST.gastKijkHoek(0, 100) > 0 && GAST.gastKijkHoek(0, -100) < 0);
});

punt('springen en bukken van de gast (dezelfde sprong als de speler)', () => {
  assert.equal(S.knoppen({ springen: true }), S.KNOP_SPRING);
  assert.equal(S.knoppen({ bukken: true }), S.KNOP_BUK);
  assert.equal(S.knoppen({ springen: true, handrem: true }), S.KNOP_SPRING | S.KNOP_HANDREM, 'Spatie met het stuur blijft de handrem');
  const s = { z: 0, vz: 0 };
  let hoog = 0;
  S.stapSprong(s, S.KNOP_SPRING, 1 / 60);
  for (let k = 0; k < 120; k++) { S.stapSprong(s, S.KNOP_SPRING, 1 / 60); hoog = Math.max(hoog, s.z); }
  assert.ok(hoog > 0.4 && hoog < 0.8, 'ongeveer 0,6 m: ' + hoog.toFixed(2));
  assert.equal(S.stapSprong(s, S.KNOP_BUK, 1 / 60).bukt, true);
  assert.equal(s.z, 0, 'bukken kan alleen op de grond');
});

punt('een gast stapt zelf in een vrij voertuig en weer uit', () => {
  assert.equal(R.weigerReden({ isHeli: true }, 1), 'vlieg');
  assert.equal(R.weigerReden({ driver: 'player' }, 1), 'bezet');
  assert.equal(R.weigerReden({ road: true }, 1), 'verkeer');
  assert.equal(R.weigerReden({ isPolice: true }, 1), 'niet');
  assert.equal(R.weigerReden({ isBoat: true, model: { len: 5 } }, 1), null, 'een vrije boot mag');
  assert.equal(R.weigerReden(null, 1), 'geen');
  assert.equal(GAST.kanUitstappen({ speed: 1.9 }), true, 'uitstappen bij bijna stilstand');
  assert.equal(GAST.kanUitstappen({ speed: 4 }), false);
  assert.equal(GAST.kanUitstappen({ isHeli: true, speed: 0 }), false);
});

punt('passagiers zitten zichtbaar op hun stoel, niet door de carrosserie', () => {
  const auto = { model: { name: 'sedan', len: 4.4, wid: 1.8 }, isBoat: false };
  for (const stoel of [0, 1, 2, 3]) {
    const z = Z.vehicleSeatAt(auto, stoel);
    assert.ok(Math.abs(z.x) < 2.2 && Math.abs(z.z) < 0.9, `stoel ${stoel} binnen de auto: ${JSON.stringify(z)}`);
    assert.ok(z.y > 0 && z.y < 1.4, `stoel ${stoel} op zithoogte`);
  }
  const taxi = { model: { name: 'taxi', len: 4.6, wid: 1.8 } };
  assert.ok(Z.vehicleSeatAt(taxi, 2).x < Z.vehicleSeatAt(taxi, 1).x, 'de taxi heeft een echte achterbank');
  const boot = { isBoat: true, model: { name: 'sloep', len: 5.5, wid: 2 } };
  assert.ok(Z.vehicleSeatAt(boot, 2), 'een boot heeft een derde plek');
});

punt('een gast wordt niet teruggezet naar de gastheer', () => {
  assert.equal(F.MAX_AFSTAND, Infinity, 'geen vaste maximale afstand');
  const reg = F.maakRegister();
  F.zetPlek(reg, 0, 0, 0); F.zetPlek(reg, 2, 400, 0);
  const foci = F.bouwFoci({ x: 0, y: 0 }, reg);
  assert.equal(foci.foci.length, 2, '400 m uit elkaar: twee groepen');
  assert.deepEqual(foci.bediend, new Set([0, 2]));
  assert.equal(F.losBesluit({ aan: true, slot: 2, bediend: foci.bediend, dHost: 400, geladen: true }).ok, true, 'ver weg en geladen: hij blijft vrij');
  assert.equal(F.losBesluit({ aan: true, slot: 2, bediend: new Set([0]), dHost: 400 }).reden, 'geen-focus');
  const net = lees('../game/js/coopnet.js');
  assert.match(net, /maxAfstand: MAX_AFSTAND/, 'losVoor gebruikt geen grens meer op de afstand');
  assert.match(net, /snelheid van de host telt niet mee/, 'de snelheid van de gastheer zet niemand terug');
});

punt('een gast ziet de missiemarker en kan zelf een opdracht starten', () => {
  const w = { vehicles: [], pedestrians: [], time: 1, wanted: 0, mission: { phase: 'idle', index: 7, marker: { x: 100, y: 50 } } };
  const e = verzamelEntiteiten(w, [{ x: 0, y: 0 }]);
  assert.equal(e.filter((q) => q.kind === SOORT_START).length, 1, 'de gele zuil bij het beginpunt');
  const verzoek = { i: 4, label: 'De kluis' };
  const def = { label: 'De kluis', start: { x: 10, y: 10 } };
  assert.equal(M.startReden({ verzoek, def, eigen: { index: 4 }, lichaam: { x: 12, y: 10 } }), null, 'dichtbij: het verzoek mag');
  assert.ok(M.startReden({ verzoek, def, eigen: { index: 4 }, lichaam: { x: 200, y: 10 } }), 'ver weg: een melding');
  assert.ok(M.verzoekBlok({ wanted: 2 }), 'niet tijdens een achtervolging');
  assert.match(lees('../game/js/coopglue.js'), /missieGastE/, 'E bij het startpunt vraagt de opdracht aan');
});

punt('de politie jaagt op een gast met een eigen gezocht-niveau', () => {
  const w = { wanted: 0, coopWanted: { 2: 3 }, coopDoelwit: 2, vehicles: [], pedestrians: [], coopRole: 'host', player: { x: 0, y: 0 }, companion: { x: 1, y: 1 }, coopFigures: { 2: { slot: 2, x: 5, y: 5 } }, coop: { remote: true } };
  assert.deepEqual(G.kiesDoelwit(w), { slot: 2, level: 3 });
  assert.equal(G.hudWanted(w), 3, 'sterren in het scherm van wie het spel opende');
  assert.equal(G.zichtbaarWanted(w), 3, 'iedereen ziet hetzelfde niveau');
  w.wanted = 3;
  assert.equal(G.kiesDoelwit(w).slot, 2, 'gelijk niveau: wie al gejaagd werd');
  w.coopWanted[2] = 0; w.coopDoelwit = 0;
  assert.equal(G.kiesDoelwit(w).slot, 0);
});

punt('kicken: de knop per speler, en wat de gast te lezen krijgt', () => {
  assert.equal(P.kanEruitZetten('host', { slot: 2, naam: 'Nikky' }), true);
  assert.equal(P.kanEruitZetten('host', { slot: 2, naam: 'Ik', jij: true }), false, 'jezelf niet');
  assert.equal(P.kanEruitZetten('client', { slot: 2 }), false, 'alleen wie het spel opende');
  assert.equal(P.eruitKnopTekst(false), 'Eruit zetten');
  assert.equal(P.eruitKnopTekst(true), 'Zeker weten?');
  const m = P.wegMelding('gekickt', 'Tammo', 'ABCDE-FGHJK');
  assert.match(m, /uit het spel gezet/);
  assert.match(m, /ABCDE-FGHJK/, 'de kamercode staat klaar');
  assert.doesNotMatch(m, /\d+\.\d+\.\d+\.\d+/, 'nooit een IP-adres');
});

punt('spel starten, de limietknop 4/8/12/16 en de openbare sessielijst', () => {
  assert.equal(PLAY.clampMax(4), 4); assert.equal(PLAY.clampMax(8), 8); assert.equal(PLAY.clampMax(12), 12); assert.equal(PLAY.clampMax(16), 16);
  assert.equal(PLAY.MIN_MAX, 4); assert.equal(PLAY.ABS_MAX, 16);
  assert.equal(PLAY.clampMax(40), 16, 'geen grotere sessie dan het protocol');
  const tekst = SL.codeer({ versie: '0.99.0', proto: 2, naam: 'Zomer in Grunn', spelers: 3, max: 8, room: 'ABCDE23456', id: 'x1y2z3ab', nu: 1000 });
  const terug = SL.decodeer(tekst, 1000);
  assert.equal(terug.ok, true, 'de eigen aankondiging leest terug: ' + JSON.stringify(terug));
  assert.equal(terug.a.naam, 'Zomer in Grunn');
  assert.doesNotMatch(tekst, /192\.168|10\.0\.|:\/\//, 'geen adres in de aankondiging');
});

punt('Spelers is een tabblad onder Samen spelen', () => {
  const ui = lees('../game/js/coopspelersui.js');
  assert.match(ui, /tabblad Spelers/, 'de lijst hoort bij het tabblad Spelers');
  assert.match(ui, /data-eruit=/, 'met de knop per speler');
  assert.match(P.rijTekst({ naam: 'Nikky', doet: 'loopt mee', verbindingTekst: 'goed', jij: true }), /Nikky \(jij\)/);
});

punt('geluid: de dempknop is te herstellen en stemmen staan zachter', () => {
  assert.equal(L.DEMP_TOETS, 'U');
  assert.match(L.dempHint({ touch: false }), /U/);
  assert.match(L.dempMelding(true), /U/);
  assert.equal(L.stemNiveau(1), 0.5);
  assert.ok(L.stemNiveau(0.8) < 0.8);
  // na een dempknop staat er in beeld hoe je het terugzet (de klacht uit de playtest)
  assert.match(L.dempMelding(true), /Druk op U voor geluid/, 'de melding zegt hoe je het terugzet');
});

punt('wapens: de gast ziet het wapen van de gastheer en zijn eigen wapen blijft', () => {
  assert.equal(W.gastWapenKan('knuppel'), true);
  assert.equal(W.gastWapenKan('jachtgeweer'), true);
  assert.equal(W.heeftKijker('jachtgeweer'), true, 'de kijker van het jachtgeweer');
  assert.equal(W.wapenEvent('jachtgeweer', 3).n, 3);
  assert.ok(W.stapAanvalKlok({ key: 'knuppel', n: 0, koel: 0, slag: 0 }, 1 / 60, true, 'knuppel', 0), 'een slagwapen raakt nooit op');
  assert.equal(S.wapenCode(''), 0, 'geen wapen is 0 in het snapshot');
  assert.ok(S.wapenCode('knuppel') > 0, 'het wapen gaat als getal mee');
});

punt('de opening: elke rol één keer, geen dubbel persoon die gek meedoet', () => {
  const def = { actors: { tammo: { look: 'tammo' }, tessa: { look: 'tessa' }, tessa2: { look: 'anita' }, omstander: { look: 'man' } } };
  const scène = { hoofdrol: 'tammo', metgezel: 'anita' };
  const d = Q.cutsceneVerdeling(def, scène);
  assert.equal(d.perActeur.tammo, 'speler');
  assert.equal(d.perActeur.tessa, 'metgezel');
  assert.equal(d.perActeur.tessa2, 'dubbel', 'de alias van Tessa wordt niet nog eens getekend');
  assert.ok(d.verberg.includes('tessa2'));
  assert.equal(d.perActeur.omstander, 'figuur');
  assert.match(lees('../game/js/cutscenes.js'), /poes|kat/i, 'de kattenscène staat er (geneutraliseerd volgens besluit 24-10)');
});

punt('safehouse en garage zijn er ook bij de gast', () => {
  const main = lees('../game/js/main.js');
  assert.match(main, /updateGarages\(dt, world, true\)/, 'de gast bouwt de garages');
  const start = main.indexOf('updateGastLokaal(world, dt)');
  assert.ok(start > 0, 'de gast-tak van updateGameplay staat er');
  const gat = main.slice(start, start + 1200);
  assert.match(gat, /updateHomeExterior/, 'het safehouse in de gast-tak van updateGameplay');
  assert.match(gat, /updateGarages/, 'en de garages ook');
});

punt('de garagemarker bij de spuitdienst van een opdracht', () => {
  assert.equal(M.doelMarker({ x: 10, y: 10 })?.soort, 'goal');
  assert.equal(M.doelMarker({ x: 10, y: 10 }, () => true)?.soort, 'garage');
  assert.equal(M.doelMarker(null), null);
  assert.equal(M.GARAGE_MARKER_M, 20);
});

punt('boten: glad, niet slingerend, en een groot schip verdwijnt niet hard', () => {
  const st = {};
  let g = C.gladBoot(st, 0, 0, 0, 4, 1 / 60, 50);
  let maxStap = 0, vorig = 0, x = 0;
  for (let k = 1; k <= 300; k++) { if (k % 6 === 0) x = 4 * (k / 60); g = C.gladBoot(st, x, 0, 0, 4, 1 / 60, 50); if (k > 60) maxStap = Math.max(maxStap, Math.abs(g.x - vorig)); vorig = g.x; }
  assert.ok(maxStap < 0.12, 'geen sprongen: ' + maxStap);
  const rol = (len) => { let m = 0; for (let t = 0; t < 40; t += 0.05) m = Math.max(m, Math.abs(C.deiningBoot(len, t).roll)); return m; };
  assert.ok(rol(92) < 0.0031, 'een containerschip deint nauwelijks: ' + rol(92));
  assert.ok(rol(92) < rol(5.5) / 2, 'veel minder dan een sloep: ' + rol(5.5));
  assert.equal(C.bootBlijft(92, 2, 4), true, 'een groot varend schip vaart even door');
  assert.equal(C.bootBlijft(6, 2, 4), false, 'een kleine boot niet');
  assert.equal(C.bootBlijft(92, 2, 0), false, 'een stilgevallen schip gaat meteen weg');
  assert.equal(C.kiesEigenBoot({ x: 0, y: 0 }, [{ id: 3, soort: 'boot', x: 0, y: 0, len: 6, wid: 2 }], null), 3);
});

punt('treinen: vloeiend, solide, en een gast voelt de klap', () => {
  let c = 40;
  const stappen = [];
  for (let k = 0; k < 120; k++) { const vorige = c; c = T.volgTrein(c, 40 + k * 0.3, 18, 1 / 60); stappen.push(c - vorige); }
  assert.ok(Math.min(...stappen) > 0, 'geen beeld staat de trein stil');
  assert.ok(Math.max(...stappen) < 1, 'en hij springt niet');
  const duw = T.duwVanWagen({ x: 0, y: 0, angle: 0, len: 17 }, 0, 0.2, 0.35);
  assert.ok(duw && Math.abs(duw.nx * duw.depth) + Math.abs(duw.ny * duw.depth) > 0.5, 'de trein duwt een lichaam opzij');
  assert.equal(T.duwVanWagen({ x: 0, y: 0, angle: 0, len: 17 }, 0, 40), null, 'ver naast het spoor: niets');
  assert.equal(T.treinKlap(0.5, 10), null, 'een kruipende wagen telt niet');
  assert.ok(T.treinKlap(12, 10).schade > 60, 'een trein op 12 m/s slaat hard');
  assert.equal(T.treinKlap(12, 10, 9.5), null, 'niet elke beeld opnieuw');
});

console.log(`\ncoopcheck434: ${n} punten nagelopen`);
