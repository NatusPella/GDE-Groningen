// Samen spelen (#1159): een navigatiedoel delen tussen bestuurder en navigator (game/js/multiplayergoal.js) en het pad door coopnet.js met een geheugenverbinding.
// Pure en mock-test, geen Electron. Niet in beeld bekeken: de knop in het wiel (multiplayerphrasesradial.js) en het zetten van het doel op de kaart.
import assert from 'node:assert/strict';
import { createLink } from '../game/js/net/memtransport.js';
import * as D from '../game/js/multiplayergoal.js';
import * as Z from '../game/js/multiplayerphrases.js';
import * as N from '../game/js/coopnet.js';
import * as S from '../game/js/settings.js';

let n = 0;
const t = (name, f) => { f(); n++; };
const auto = { id: 'auto-1' }, bus = { id: 'bus-1' };

t('readGoal: eindige coördinaten binnen de wereld, anders niets', () => {
  assert.deepEqual(D.readGoal({ k: 'doel', x: 10, y: 20 }), { x: 10, y: 20, aan: 'voertuig' });
  assert.equal(D.readGoal({ k: 'doel', x: 10, y: 20, aan: 'iedereen' }).aan, 'iedereen');
  assert.equal(D.readGoal({ k: 'doel', x: NaN, y: 0 }), null); assert.equal(D.readGoal({ k: 'doel', x: 9e9, y: 0 }), null);
  assert.equal(D.readGoal({ k: 'ping', x: 1, y: 1 }), null); assert.equal(D.readGoal(null), null);
  assert.deepEqual(D.goalEvent(1, 2, 'raar'), { k: 'doel', x: 1, y: 2, aan: 'voertuig' });
});
t('wie bestuurt en wie navigeert: de rol hangt aan het voertuig, te voet is er geen', () => {
  const bez = [{ slot: 0, voertuig: auto, bestuurder: true }, { slot: 1, voertuig: auto, bestuurder: false }, { slot: 2, voertuig: null, bestuurder: false }];
  assert.equal(D.roleInVehicle(0, bez), 'bestuurder'); assert.equal(D.roleInVehicle(1, bez), 'navigator');
  assert.equal(D.roleInVehicle(2, bez), null); assert.equal(D.roleInVehicle(9, bez), null);
});
t('naar wie: de navigator deelt met de bestuurder, de bestuurder met wie meerijdt, te voet met iedereen', () => {
  const bez = [
    { slot: 0, voertuig: bus, bestuurder: true }, { slot: 1, voertuig: bus, bestuurder: false }, { slot: 2, voertuig: bus, bestuurder: false },
    { slot: 3, voertuig: null, bestuurder: false },
  ];
  assert.deepEqual(D.recipients(1, 'voertuig', bez), [0], 'een navigator in de bus deelt alleen met de bestuurder, niet met de hele bus');
  assert.deepEqual(D.recipients(0, 'voertuig', bez), [1, 2], 'de bestuurder deelt met wie meerijdt');
  assert.deepEqual(D.recipients(3, 'voertuig', bez), [], 'te voet is er geen voertuig om mee te delen');
  assert.deepEqual(D.recipients(3, 'iedereen', bez), [0, 1, 2], 'iedereen behalve jezelf');
  assert.deepEqual(D.recipients(0, 'iedereen', bez, [0, 1, 2, 3, 4]), [1, 2, 3, 4], 'ook spelers die nog geen bezetting hebben');
  assert.equal(D.defaultReach(1, bez), 'voertuig'); assert.equal(D.defaultReach(3, bez), 'iedereen');
  assert.equal(D.defaultReach(0, [{ slot: 0, voertuig: auto, bestuurder: true }]), 'iedereen', 'alleen in een voertuig is er niemand om mee te delen');
});
t('het voorstel: één tegelijk, het nieuwste wint, twintig seconden, J volgt en N negeert', () => {
  const s = D.createGoalState(), a = { slot: 1, naam: 'Tessa' };
  const r = D.receiveGoal(s, { k: 'doel', x: 5, y: 6 }, a, 0, { rol: 'navigator' });
  assert.ok(r.toon); assert.equal(r.regel, 'Tessa (navigator) deelt een doel: J = volgen, N = negeren.');
  assert.ok(D.openGoal(s, 5));
  D.receiveGoal(s, { k: 'doel', x: 7, y: 8 }, { slot: 2, naam: 'Rik' }, 6, {});
  assert.equal(D.openGoal(s, 7).x, 7, 'het nieuwste voorstel wint');
  assert.equal(D.openGoal(s, 40), null, 'na twintig seconden vervalt het');
  D.receiveGoal(s, { k: 'doel', x: 1, y: 2 }, a, 100, {});
  assert.deepEqual(D.answerGoal(s, true, 101), { actie: 'volg', x: 1, y: 2, naam: 'Doel van Tessa' });
  assert.equal(D.answerGoal(s, true, 102), null, 'één keer');
  D.receiveGoal(s, { k: 'doel', x: 1, y: 2 }, { slot: 1, naam: 'Tessa' }, 200, {});
  assert.deepEqual(D.answerGoal(s, false, 201), { actie: 'negeer' });
});
t('het voorstel: opt-in, geblokkeerd en te snel worden niet getoond', () => {
  const s = D.createGoalState(), a = { slot: 1, naam: 'Tessa' }, b = { k: 'doel', x: 1, y: 1 };
  assert.equal(D.receiveGoal(s, b, a, 0, { aan: false }).reden, 'uit');
  assert.equal(D.receiveGoal(s, b, a, 0, { mag: false }).reden, 'geblokkeerd');
  assert.ok(D.receiveGoal(s, b, a, 0, {}).toon);
  assert.equal(D.receiveGoal(s, b, a, 1, {}).reden, 'te-snel');
  assert.equal(D.receiveGoal(s, { k: 'doel', x: 'a' }, a, 50, {}).reden, 'onbekend');
});
t('gedempt ziet nog gewoon een doel, geblokkeerd niet (zelfde regel als de pings)', () => {
  const z = Z.createPhraseState(), a = { slot: 1, naam: 'Tessa' };
  Z.setMuteState(z, a, 'gedempt'); assert.ok(Z.mayReceive(z, a, 'doel'));
  Z.setMuteState(z, a, 'geblokkeerd'); assert.ok(!Z.mayReceive(z, a, 'doel'));
});

// ---- over de geheugenverbinding
const INFO = N.handshakeInfo({ tiles: 'abc', story: 'oud' });
const mk = (extra = {}) => ({ player: { x: 0, y: 0, angle: 0, character: 'anita', vx: 0, vy: 0 }, companion: { x: 1, y: 1, angle: 0, character: 'tammo' }, coop: { local: true }, money: 0, wanted: 0, camYaw: 0, time: 0, messages: [], addMessage(m) { this.messages.push(m); }, input: { axis: () => [0, 0], isDown: () => false, wasPressed: () => false }, ...extra });
function session(gasten = 2) {
  const hw = mk(); N.startHost(hw, INFO, { seed: 5 });
  const gs = [];
  for (let i = 0; i < gasten; i++) { const link = createLink({ latency: 0.03, jitter: 0.01, seed: 2 + i }); N.addGuest(hw, link.a); const gw = mk(); N.startClient(gw, link.b, INFO, {}); gs.push({ gw, link }); }
  const step = (secs) => { for (let k = 0; k < 60 * secs; k++) { N.tickCoopNet(hw, 1 / 60); for (const g of gs) { if (g.gw.coopNet) N.tickCoopNet(g.gw, 1 / 60); g.link.advance(1 / 60); g.gw.time += 1 / 60; } hw.time += 1 / 60; } };
  return { hw, gs, step, gw: gs.map((g) => g.gw) };
}
const goalLines = (w) => w.messages.filter((m) => /deelt een doel/.test(m));
const inCar = (s) => { // host rijdt, gast 1 zit er als bijrijder in, gast 2 loopt rond
  s.hw.player.inVehicle = auto;
  s.hw.coopFigures = { 1: { slot: 1, inVeh: auto }, 2: { slot: 2, inVeh: null } };
};

t('opt-in: zonder instelling kan niemand een doel delen en ziet niemand een voorstel', () => {
  S.setSetting('samenZinnen', false);
  const s = session(2); s.step(2);
  assert.equal(N.shareGoal(s.gw[0], { x: 5, y: 5 }), false);
  assert.equal(N.shareGoal(s.hw, { x: 5, y: 5 }, 'iedereen'), false);
  assert.equal(N.shareGoal(s.hw, { x: NaN, y: 5 }, 'iedereen'), false);
});
t('de navigator (gast in de auto van de host) deelt zijn doel: alleen de bestuurder krijgt het voorstel', () => {
  S.setSetting('samenZinnen', true);
  const s = session(2); s.step(2); inCar(s);
  assert.equal(N.shareGoal(s.gw[0], { x: 300, y: 400 }, 'voertuig'), true); s.step(1);
  const regels = goalLines(s.hw);
  assert.equal(regels.length, 1, 'de bestuurder (de host) krijgt het voorstel'); assert.match(regels[0], /\(navigator\) deelt een doel/);
  assert.equal(goalLines(s.gw[1]).length, 0, 'wie niet meerijdt hoort er niets van');
  assert.ok(N.goalProposal(s.hw) && N.goalProposal(s.hw).x === 300);
  s.hw.input.wasPressed = (k) => k === 'j'; N.tickCoopNet(s.hw, 1 / 60);
  assert.deepEqual(s.hw.coopDoelVolg && [s.hw.coopDoelVolg.x, s.hw.coopDoelVolg.y], [300, 400], 'J: het doel staat klaar om op de eigen kaart te zetten');
  assert.equal(N.goalProposal(s.hw), null);
  S.setSetting('samenZinnen', false);
});
t('de bestuurder (host) deelt met wie meerijdt; een andere vraag gaat voor op J en N', () => {
  S.setSetting('samenZinnen', true);
  const s = session(2); s.step(2); inCar(s);
  assert.equal(N.shareGoal(s.hw, { x: 10, y: 20 }), true); s.step(1);
  assert.equal(goalLines(s.gw[0]).length, 1); assert.match(goalLines(s.gw[0])[0], /Tammo|Anita|Tessa|\(bestuurder\)/);
  assert.equal(goalLines(s.gw[1]).length, 0);
  s.gw[0].coopStem = { rest: 5 }; s.gw[0].input.wasPressed = (k) => k === 'n';
  N.tickCoopNet(s.gw[0], 1 / 60);
  assert.ok(N.goalProposal(s.gw[0]), 'tijdens een stemming blijft het voorstel staan: de N is voor de stemming');
  assert.equal(s.gw[0].coopDoelVraag, false);
  S.setSetting('samenZinnen', false);
});
t('te voet: een doel gaat naar iedereen; de host begrenst een spammer', () => {
  S.setSetting('samenZinnen', true);
  const s = session(2); s.step(2);
  assert.equal(N.shareGoal(s.gw[0], { x: 1, y: 2 }, 'iedereen'), true); s.step(1);
  assert.equal(goalLines(s.hw).length, 1); assert.equal(goalLines(s.gw[1]).length, 1);
  for (let i = 0; i < 6; i++) s.gw[0].coopNet.session.sendEvent({ k: 'doel', x: i, y: i, aan: 'iedereen' });
  s.step(1);
  assert.equal(goalLines(s.gw[1]).length, 1, 'zes voorstellen in een oogwenk: er komt er geen bij binnen vijf seconden');
  S.setSetting('samenZinnen', false);
});
t('een geblokkeerde speler kan geen doel delen; dempen laat het doel wel door', () => {
  S.setSetting('samenZinnen', true);
  const s = session(2); s.step(2);
  assert.equal(N.setPlayerMuteState(s.hw, 1, 'gedempt'), 'gedempt');
  N.shareGoal(s.gw[0], { x: 1, y: 2 }, 'iedereen'); s.step(1);
  assert.equal(goalLines(s.hw).length, 1, 'gedempt: het doel komt wel');
  N.setPlayerMuteState(s.hw, 1, 'geblokkeerd'); s.step(6);
  N.shareGoal(s.gw[0], { x: 3, y: 4 }, 'iedereen'); s.step(1);
  assert.equal(goalLines(s.hw).length, 1, 'geblokkeerd: geen tweede voorstel');
  assert.equal(goalLines(s.gw[1]).length, 2, 'de andere gast ziet beide');
  S.setSetting('samenZinnen', false);
});
t('een ping op je doel (kaartpunt): dezelfde ster als de roepjes, bij iedereen', () => {
  const s = session(2); s.step(2);
  assert.equal(N.pingGoal(s.gw[0], { x: 70, y: 80 }), true); s.step(1);
  assert.ok(s.hw.coopPings.lijst.some((p) => p.x === 70 && p.soort === 'doel'));
  assert.ok(s.gw[1].coopPings.lijst.some((p) => p.x === 70 && p.soort === 'doel'));
  assert.equal(N.pingGoal(s.gw[0], null), false); assert.equal(N.pingGoal(s.gw[0], { x: NaN, y: 1 }), false);
});

console.log(`multiplayergoal_test: ${n} ok`);
process.exit(0);
