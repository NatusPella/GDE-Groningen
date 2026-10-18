// Samen spelen (#95): host en gast aan wereld-achtige objecten gekoppeld over een in-memory
// transport (game/js/coopnet.js, coopclient.js, coopglue.js): naadloos erin en eruit, eigen
// voortgang voor ieder, vaste personages, verwijderen, beloning, pings, pauze bij wegvallen.
import assert from 'node:assert/strict';
import { createLink } from '../game/js/net/memtransport.js';
import * as N from '../game/js/coopnet.js';
import * as C from '../game/js/coopclient.js';
import { remoteP2 } from '../game/js/coop.js';
import { coopStep } from '../game/js/coopglue.js';

let n = 0;
const t = (name, f) => { f(); n++; };

const INFO = N.handshakeInfo({ tiles: 'abc', story: 'oud' });
const mkWorld = (extra = {}) => ({ player: { x: 0, y: 0, angle: 0, character: 'anita', vx: 3, vy: 3 }, companion: { x: 1, y: 1, angle: 0, character: 'tammo' }, coop: { local: true }, money: 0, wanted: 0, camYaw: 0.5, time: 0, messages: [], addMessage(m) { this.messages.push(m); }, input: { axis: () => [1, 0], isDown: () => false }, ...extra });
const steps = (hw, gw, link, secs, f) => { for (let i = 0; i < 60 * secs; i++) { if (f) f(i); N.tickCoopNet(hw, 1 / 60); if (gw && gw.coopNet) N.tickCoopNet(gw, 1 / 60); link.advance(1 / 60); hw.time += 1 / 60; if (gw) gw.time += 1 / 60; } };
function connected(hExtra, gExtra, opts = {}) {
  const link = createLink({ latency: 0.03, seed: 2 });
  const hw = mkWorld(hExtra), gw = mkWorld(gExtra);
  const fades = [];
  N.startHost(hw, link.a, INFO, 5, { onHold: opts.onHold, fade: (d) => fades.push('h:' + d) });
  N.startClient(gw, link.b, INFO, { onHold: opts.onHoldG, fade: (d) => fades.push('g:' + d) });
  steps(hw, gw, link, 2, (i) => { hw.player.x = 10; hw.companion.x = 20; hw.companion.y = 5; });
  return { link, hw, gw, fades };
}

t('vaste personages: host Tammo, gast Tessa, ongeacht de startstand', () => {
  const h = mkWorld(), g = mkWorld();
  C.setFixedCharacters(h, 'host'); C.setFixedCharacters(g, 'client');
  assert.deepEqual([h.player.character, h.companion.character], ['tammo', 'anita']);
  assert.deepEqual([g.player.character, g.companion.character], ['anita', 'tammo']);
});
t('lichamen per rol: op de gast is world.player het eigen lichaam (Tessa)', () => {
  const w = mkWorld();
  assert.equal(C.bodyFor(w, 'client', 1), w.player); assert.equal(C.bodyFor(w, 'client', 0), w.companion);
  assert.equal(C.bodyFor(w, 'host', 0), w.player); assert.equal(C.bodyFor(w, 'host', 1), w.companion);
});
t('invoer van de gast draagt de camerahoek; host rekent daarmee', () => {
  assert.deepEqual(C.makeClientInput([1, -1], true, 0.5), { mx: 1, my: -1, buttons: 1, yaw: 0.5 });
  assert.equal(C.makeClientInput(null, false, NaN).yaw, 0);
});
t('aansluiten kan niet midden in iets: voertuig, duif, filmpje', () => {
  assert.equal(N.canJoin(mkWorld()).ok, true);
  assert.match(N.canJoin(mkWorld({ player: { inVehicle: {} } })).reason, /uit je voertuig/);
  assert.match(N.canJoin(mkWorld({ pigeonMode: true })).reason, /duif/);
  assert.match(N.canJoin(mkWorld({ cameraOverride: {} })).reason, /filmpje/);
  assert.throws(() => N.startClient(mkWorld({ player: { inVehicle: {} } }), createLink().b, INFO), /voertuig/);
});
t('end-to-end: invoer van de gast naar de host, toestand terug; de gast ziet de host naast zich', () => {
  const { hw, gw, fades } = connected({ money: 250, wanted: 2 }, { money: 40 });
  assert.equal(gw.coopNet.session.status, 'ok');
  assert.equal(hw.coop.remote, true);
  assert.ok(Math.abs(hw.coop.remoteInput.yaw - 0.5) < 0.01);
  assert.equal(remoteP2(hw.coop.remoteInput).x, 1);
  assert.ok(Math.abs(gw.companion.x - 10) < 0.5, `Tammo op de gast: ${gw.companion.x}`);
  assert.ok(Math.abs(gw.player.x - 20) < 0.5, `Tessa op de gast: ${gw.player.x}`);
  assert.equal(gw.wanted, 2, 'wanted is gedeeld');
  assert.ok(fades.includes('g:in') && fades.includes('h:in'), 'korte fade bij het binnenkomen');
});
t('eigen voortgang: het geld van de gast blijft van de gast, dat van de host van de host', () => {
  const { hw, gw } = connected({ money: 250 }, { money: 40 });
  assert.equal(gw.money, 40); assert.equal(hw.money, 250);
});
t('de gast bewaart het verhaal niet zolang de sessie loopt; daarna weer wel', () => {
  const { hw, gw, link } = connected();
  assert.equal(gw.coopRole, 'client'); assert.equal(hw.coopRole, 'host');
  N.stopCoopNet(gw); assert.equal(gw.coopRole, null);
});
t('vertrek: de gast komt terug op zijn eigen plek, met eigen wanted en personage, en zijn beloningen', () => {
  const link = createLink({ latency: 0.02 });
  const hw = mkWorld({ wanted: 3 }), gw = mkWorld({ wanted: 1 }); gw.player.x = 77; gw.player.y = 88; gw.player.angle = 1.25;
  const fades = [];
  N.startHost(hw, link.a, INFO); N.startClient(gw, link.b, INFO, { fade: (d) => fades.push(d) });
  steps(hw, gw, link, 2, () => { hw.player.x = 500; hw.companion.x = 520; });
  assert.equal(gw.wanted, 3); assert.ok(gw.player.x > 400, 'in de wereld van de host');
  assert.equal(N.payGuest(hw, 150), true);
  steps(hw, gw, link, 1);
  assert.equal(gw.money, 150, 'beloning komt bij de gast, in zijn eigen portemonnee');
  assert.match(gw.messages.join(' '), /Beloning: €150/);
  N.stopCoopNet(gw);
  assert.deepEqual([gw.player.x, gw.player.y, gw.player.angle, gw.wanted], [77, 88, 1.25, 1]);
  assert.equal(gw.player.character, 'anita'); assert.equal(gw.coop.fixedChars, false);
  assert.equal(gw.money, 150, 'het geld gaat mee terug');
  assert.ok(fades.includes('uit'));
});
t('beloningen worden begrensd en alleen de gast ontvangt ze', () => {
  const { hw, gw } = connected();
  assert.equal(N.handleEvent(gw, { k: 'beloning', geld: -5 }), false);
  assert.equal(N.handleEvent(gw, { k: 'beloning', geld: 'veel' }), false);
  N.handleEvent(gw, { k: 'beloning', geld: 9e12 }); assert.equal(gw.money, N.MAX_REWARD);
  assert.equal(N.handleEvent(hw, { k: 'beloning', geld: 100 }), false); assert.equal(hw.money, 0);
  assert.equal(N.payGuest(gw, 5), false, 'een gast kan niemand betalen');
});
t('host verwijdert de gast: bericht, dan verbreken; de gast is terug bij zichzelf', () => {
  const link = createLink({ latency: 0.02 });
  const hw = mkWorld(), gw = mkWorld(); gw.player.x = 5;
  N.startHost(hw, link.a, INFO); N.startClient(gw, link.b, INFO);
  steps(hw, gw, link, 2, () => { hw.player.x = 300; });
  assert.equal(N.removeGuest(gw), false, 'een gast kan niemand verwijderen');
  assert.equal(N.removeGuest(hw), true);
  steps(hw, gw, link, 2);
  assert.equal(gw.coopNet, null); assert.equal(gw.player.x, 5); assert.equal(gw.coopRole, null);
  assert.match(gw.messages.join(' '), /uit het spel van de host gehaald/);
  assert.equal(hw.coopNet, null); assert.equal(hw.coop.remote, false);
});
t('pings: komen aan bij de ander, met cooldown en controle', () => {
  const { hw, gw } = connected();
  assert.equal(N.sendPing(hw, 12, 34, 'doel'), true);
  assert.equal(N.sendPing(hw, 1, 1), false, 'te snel');
  steps(hw, gw, createLink(), 0); // geen extra tijd; het bericht is al onderweg
  for (let i = 0; i < 60; i++) { N.tickCoopNet(hw, 1 / 60); N.tickCoopNet(gw, 1 / 60); }
  assert.equal(N.handleEvent(gw, { k: 'ping', x: NaN, y: 0 }), false);
  assert.equal(N.handleEvent(gw, { k: 'iets-nieuws', x: 1 }), false, 'onbekende soorten worden genegeerd');
});
t('partner-label: naam en status voor beide kanten', () => {
  const { hw, gw } = connected();
  assert.equal(hw.coopPartner.naam, 'Tessa'); assert.equal(gw.coopPartner.naam, 'Tammo');
  assert.equal(hw.coopPartner.tekst, 'te voet');
});
t('zonder gast loopt de metgezel op de volg-AI; met gast stuurt de gast, zonder toetsenbord', () => {
  const w = mkWorld(); let moved = 0;
  w.coop.local = false; w.coop.remote = false;
  assert.equal(coopStep(w.companion, 0.016, w, () => { moved++; }), false);
  w.coop.remote = true; w.coop.remoteInput = { mx: 1, my: 0, buttons: 0, yaw: 0 };
  assert.equal(coopStep(w.companion, 0.016, w, () => { moved++; }), true); assert.equal(moved, 1);
  w.coop.input = w.input; w.coop.remote = false; w.coop.local = true; // het oude ?coop-gedrag op één scherm blijft zoals het was
  assert.equal(coopStep(w.companion, 0.016, w, () => { moved++; }), true);
});
t('verbinding weg: beide kanten krijgen het wacht-scherm; de host valt terug op de volg-AI', () => {
  const holds = [];
  const link = createLink({ latency: 0.02 });
  const hw = mkWorld(), gw = mkWorld();
  N.startHost(hw, link.a, INFO, 1, { onHold: (r) => holds.push(r) }); N.startClient(gw, link.b, INFO, { onHold: (r) => holds.push(r) });
  steps(hw, gw, link, 2);
  assert.equal(hw.coop.remote, true);
  link.cut();
  steps(hw, gw, link, 7);
  assert.equal(hw.coop.remote, false);
  assert.deepEqual(holds.sort(), ['client', 'host']);
  N.stopCoopNet(hw); assert.equal(hw.coopNet, null); assert.equal(hw.coop.local, true, 'host terug naar het oude gedrag');
});
console.log(`coopnet_test: ${n}/${n} ok`);
