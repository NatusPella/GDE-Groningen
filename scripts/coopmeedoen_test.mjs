// Samen spelen (#429): iedereen kiest zelf of hij meedoet met een opdracht (game/js/coopmeedoen.js en coopnet.js).
import assert from 'node:assert/strict';
import * as M from '../game/js/coopmeedoen.js';
import { createLink } from '../game/js/net/memtransport.js';
import * as N from '../game/js/coopnet.js';
import { coopRule } from '../game/js/cooproles.js';

let n = 0;
const t = (name, f) => { f(); n++; };

t('pure: uitnodigen, antwoorden, time-out en wie vrij loopt', () => {
  const st = M.maakMeedoen();
  assert.equal(M.loopVrij(st, 1), false, 'zonder opdracht: oud gedrag');
  assert.equal(M.krijgtDeel(st, 1), true);
  const uit = M.begin(st, '3|Bezorgen', [1, 2]);
  assert.deepEqual(uit.map((u) => [u.slot, u.verplicht, u.sec]), [[1, false, 10], [2, false, 10]]);
  assert.equal(M.loopVrij(st, 1), true, 'tijdens het vragen niet vastzetten');
  assert.equal(M.antwoord(st, 1, false), true); assert.equal(M.antwoord(st, 1, true), false, 'een keuze is definitief');
  assert.equal(M.loopVrij(st, 1), true); assert.equal(M.krijgtDeel(st, 1), false, 'nee: geen deel');
  assert.deepEqual(M.tik(st, 9), []); assert.deepEqual(M.tik(st, 30), [], 'slot 2 antwoordde niet: doet nooit vanzelf mee (#452)');
  assert.equal(st.keuze[2], 'wacht'); assert.equal(M.loopVrij(st, 2), true, 'toeschouwer: vrij'); assert.equal(M.krijgtDeel(st, 2), false); assert.deepEqual(M.meespelers(st), []);
  assert.equal(M.antwoord(st, 2, true), true, 'een late J telt zolang de uitnodiging staat'); assert.deepEqual(M.meespelers(st), [2]); assert.equal(M.krijgtDeel(st, 2), true);
  M.einde(st); assert.equal(M.loopVrij(st, 1), false); assert.equal(M.krijgtDeel(st, 1), true);
});
t('verplicht waar het verhaal de gast-hoofdrol eist (beide spelers of needsTwo), niet voor extra spelers', () => {
  const beide = coopRule({ id: 'M06', kind: 'mission' }, 2), dicht = coopRule({ id: 'X', kind: 'scene' }, 2);
  assert.equal(M.verplichtVoor(1, beide), true); assert.equal(M.verplichtVoor(1, dicht), false);
  assert.equal(M.verplichtVoor(2, beide), false, 'extra spelers doen in het hoofdverhaal niet mee');
  const st = M.maakMeedoen(); const uit = M.begin(st, 'a', [1, 2], beide);
  assert.equal(uit[0].verplicht, true); assert.equal(M.antwoord(st, 1, false), false, 'verplicht: nee werkt niet');
  assert.equal(M.loopVrij(st, 1), false); assert.deepEqual(M.tik(st, 20), []); assert.deepEqual(M.meespelers(st), [1], 'verplicht blijft meedoen, de rest is toeschouwer');
});
t('de uitnodiging van de gast: gelezen, begrensd en in het Nederlands', () => {
  assert.equal(M.maakUitnodiging({ k: 'x' }), null); assert.equal(M.maakUitnodiging({ k: 'meedoen', label: 5 }), null);
  const u = M.maakUitnodiging({ k: 'meedoen', label: 'Bezorgen', sec: 999 });
  assert.equal(u.rest, 30); assert.match(M.uitnodigingTekst(u, 'Tammo'), /Meedoen met Bezorgen\? J = ja, N = nee/);
  assert.match(M.uitnodigingTekst({ ...u, verplicht: true }, 'Tammo'), /je doet mee/);
});

// ---- over het net
const INFO = { game: 'GDE', proto: 1, version: '1', tiles: '-', story: 'nieuw' };
const mkWorld = (extra = {}) => ({ player: { x: 0, y: 0, angle: 0, character: 'tammo', vx: 0, vy: 0 }, companion: { x: 1, y: 1, angle: 0, character: 'anita' }, coop: { local: true }, money: 0, wanted: 0, camYaw: 0, time: 0, messages: [], addMessage(m) { this.messages.push(m); }, input: { axis: () => [0, 0], isDown: () => false, wasPressed: () => false }, ...extra });
function sessie(hostExtra = {}) {
  const hw = mkWorld(hostExtra); N.startHost(hw, INFO, { seed: 3 });
  const link = createLink({ latency: 0.02, seed: 7 }); N.addGuest(hw, link.a);
  const gw = mkWorld(); N.startClient(gw, link.b, INFO, {});
  const step = (s) => { for (let k = 0; k < 60 * s; k++) { N.tickCoopNet(hw, 1 / 60); N.tickCoopNet(gw, 1 / 60); link.advance(1 / 60); hw.time += 1 / 60; gw.time += 1 / 60; } };
  step(2);
  return { hw, gw, step };
}
const opdracht = (hw, label = 'Bezorgen') => { hw.mission = { phase: 'active', label, type: 'checkpoint', index: 4, progressText: 'Rij naar de kerk' }; };
const druk = (gw, toets) => { let eens = true; gw.input.wasPressed = (k) => { if (k === toets && eens) { eens = false; return true; } return false; }; };

t('een gast die N drukt wordt niet vastgezet, geen "je kijkt even mee" en geen deel van de beloning', () => {
  const { hw, gw, step } = sessie();
  hw.companionHold = { x: 5, y: 5, face: 0 }; // de opdracht parkeert Tessa
  opdracht(hw); step(1);
  assert.ok(gw.messages.some((m) => /Meedoen met Bezorgen\? J = ja, N = nee/.test(m)), 'uitnodiging bij het begin');
  assert.equal(hw.coopVrijLopen, true, 'tijdens het vragen loopt hij vrij');
  druk(gw, 'n'); step(1);
  assert.equal(hw.coopNet.meedoen.keuze[1], 'nee'); assert.equal(hw.coopVrijLopen, true);
  assert.ok(gw.messages.some((m) => /Je doet niet mee/.test(m)));
  step(3);
  assert.equal(gw.messages.some((m) => /Je kijkt even mee/.test(m)), false, 'geen blokkade');
  assert.ok(!hw.coopNet.tessaVast);
  assert.equal(hw.coopDeel(100), 0, 'wie niet meedoet krijgt geen deel'); step(1);
  assert.equal(gw.money, 0);
  hw.mission = null; step(1);
  assert.equal(hw.coopNet.meedoen.opdracht, null); assert.equal(hw.coopVrijLopen, false, 'volgende opdracht: opnieuw kiezen');
});
t('J: vastgezet en met deel; geen antwoord: toeschouwer, de uitnodiging blijft in beeld (#452)', () => {
  const { hw, gw, step } = sessie();
  hw.companionHold = { x: 5, y: 5, face: 0 }; opdracht(hw);
  druk(gw, 'j'); step(1);
  assert.equal(hw.coopNet.meedoen.keuze[1], 'ja'); assert.equal(hw.coopVrijLopen, false);
  assert.equal(hw.coopDeel(100), 1); step(1); assert.ok(gw.money > 0, 'deel in de eigen portemonnee');
  assert.ok(gw.messages.some((m) => /Je kijkt even mee/.test(m)), 'wie meedoet blijft vastgezet');
  const b = sessie(); b.hw.companionHold = { x: 5, y: 5, face: 0 }; opdracht(b.hw); b.step(1);
  assert.equal(b.hw.coopVrijLopen, true); b.step(30);
  assert.equal(b.hw.coopNet.meedoen.keuze[1], 'wacht', 'na 30 s nog geen antwoord: toeschouwer'); assert.equal(b.hw.coopVrijLopen, true);
  assert.ok(b.gw.coopUitnodiging, 'de uitnodiging blijft in beeld');
  assert.equal(b.hw.coopDeel(100), 0, 'zonder antwoord geen deel');
  druk(b.gw, 'j'); b.step(1);
  assert.equal(b.hw.coopNet.meedoen.keuze[1], 'ja', 'een late J telt'); assert.equal(b.gw.coopUitnodiging, null);
  const c = sessie(); c.hw.companionHold = { x: 5, y: 5, face: 0 }; opdracht(c.hw); c.step(15); c.hw.mission = null; c.step(1);
  assert.equal(c.gw.coopUitnodiging, null, 'de opdracht is voorbij: de uitnodiging weg');
});
t('verplichte rol: de gast kan niet weigeren; de host kan het niet beantwoorden en een gast kan niet voor een ander kiezen', () => {
  const { hw, gw, step } = sessie({ coopStapRegel: () => coopRule({ id: 'M06', kind: 'mission' }, 2) });
  opdracht(hw); step(1);
  assert.ok(gw.messages.some((m) => /Het verhaal heeft jou nodig/.test(m)));
  assert.equal(N.gastMeedoen(gw, false), false); assert.equal(hw.coopNet.meedoen.keuze[1], 'verplicht');
  assert.equal(N.handleEvent(gw, { k: 'meedoenantwoord', ja: false }, 0), false, 'een gast luistert er niet naar');
  assert.equal(N.handleEvent(hw, { k: 'meedoenantwoord', ja: false }, 0), false, 'de host is geen gast');
  assert.equal(hw.coopVrijLopen, false);
});

// ---- late instap (#452)
t('lateInstapVoor: nee voor races, kluis, klokken en wedstrijden, ja voor open stukken', () => {
  assert.equal(M.lateInstapVoor({ type: 'checkpoint' }), false, 'ringrace en bruggenrace');
  assert.equal(M.lateInstapVoor({ type: 'stages', race: true }), false, 'Jelle-race');
  assert.equal(M.lateInstapVoor({ type: 'stages', stageKind: 'vault' }), false, 'kluis');
  assert.equal(M.lateInstapVoor({ type: 'stages', stageKind: 'crack' }), false);
  assert.equal(M.lateInstapVoor({ type: 'stages', stageKind: 'goto', timer: true }), false, 'een klok');
  assert.equal(M.lateInstapVoor({ type: 'stages', stageKind: 'goto' }), true, 'een open stuk');
  assert.equal(M.lateInstapVoor({ type: 'stages', stageKind: 'scene' }), true);
  assert.equal(M.lateInstapVoor(), true);
  const st = M.maakMeedoen(); M.begin(st, 'a', [1], null);
  assert.deepEqual(M.laat(st, 2, null, false), { slot: 2, toeschouwer: true }); assert.equal(st.keuze[2], 'nee');
  assert.equal(M.krijgtDeel(st, 2), false); assert.deepEqual(M.meespelers(st), []); assert.equal(M.laat(st, 2, null, false), null, 'één keer');
  assert.match(M.toeschouwerTekst('Het Loket'), /loopt al, de volgende doe je mee/);
});
t('een laatkomer bij een race wordt toeschouwer ("loopt al, de volgende doe je mee"); bij een open stuk krijgt hij de gewone uitnodiging', () => {
  const { hw, gw, step } = sessie();
  hw.mission = { phase: 'active', label: 'Ringrace', type: 'checkpoint', index: 2, progressText: 'Eerste punt', lateInstap: false }; step(1);
  // een tweede gast sluit aan terwijl de race loopt
  const link = createLink({ latency: 0.02, seed: 9 }); N.addGuest(hw, link.a);
  const laat = mkWorld(); N.startClient(laat, link.b, INFO, {});
  const stap = (s) => { for (let k = 0; k < 60 * s; k++) { N.tickCoopNet(hw, 1 / 60); N.tickCoopNet(gw, 1 / 60); N.tickCoopNet(laat, 1 / 60); link.advance(1 / 60); hw.time += 1 / 60; gw.time += 1 / 60; laat.time += 1 / 60; } };
  stap(2);
  assert.ok(laat.messages.some((m) => /Ringrace loopt al, de volgende doe je mee/.test(m)), 'melding voor de laatkomer');
  assert.equal(laat.coopUitnodiging, null, 'geen uitnodiging');
  assert.equal(hw.coopNet.meedoen.keuze[2], 'nee'); assert.equal(hw.coopDeel(100) >= 0, true);
  assert.equal(laat.money, 0, 'geen deel van de beloning');
  assert.equal(hw.coopVrijLopen, true);
  // een J na het begin van de race is te laat; een J vlak na het begin telt
  const { hw: h2, gw: g2, step: s2 } = sessie();
  h2.mission = { phase: 'active', label: 'Ringrace', type: 'checkpoint', index: 2, progressText: 'Start', lateInstap: false }; s2(1);
  druk(g2, 'j'); s2(1);
  assert.equal(h2.coopNet.meedoen.keuze[1], 'ja', 'binnen de grens telt de J');
  const { hw: h3, gw: g3, step: s3 } = sessie();
  h3.mission = { phase: 'active', label: 'Ringrace', type: 'checkpoint', index: 2, progressText: 'Start', lateInstap: false }; s3(1 + M.LATE_GRENS);
  druk(g3, 'j'); s3(1);
  assert.equal(h3.coopNet.meedoen.keuze[1], 'nee', 'een J halverwege de race is te laat'); assert.ok(g3.messages.some((m) => /loopt al, de volgende doe je mee/.test(m)));
  assert.equal(g3.coopUitnodiging, null);
  // een open stuk: de gewone uitnodiging
  const o = sessie(); o.hw.mission = { phase: 'active', label: 'Bezorgen', type: 'stages', index: 3, progressText: 'Naar de kerk' }; o.step(1);
  const link2 = createLink({ latency: 0.02, seed: 11 }); N.addGuest(o.hw, link2.a); const l2 = mkWorld(); N.startClient(l2, link2.b, INFO, {});
  for (let k = 0; k < 120; k++) { N.tickCoopNet(o.hw, 1 / 60); N.tickCoopNet(o.gw, 1 / 60); N.tickCoopNet(l2, 1 / 60); link2.advance(1 / 60); o.hw.time += 1 / 60; o.gw.time += 1 / 60; l2.time += 1 / 60; }
  assert.ok(l2.messages.some((m) => /Meedoen met Bezorgen\? J = ja, N = nee/.test(m)), 'open stuk: gewone uitnodiging'); assert.ok(l2.coopUitnodiging);
});

console.log(`coopmeedoen_test: ${n}/${n} ok`);
