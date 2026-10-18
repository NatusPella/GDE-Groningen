// Coöp online (#95): host en gast aan wereld-achtige objecten gekoppeld over een
// in-memory transport (game/js/coopnet.js, coopclient.js): vaste personages,
// invoer met camerahoek, toestand terug, autosave van de coöp-save.
import assert from 'node:assert/strict';
import { createLink } from '../game/js/net/memtransport.js';
import * as N from '../game/js/coopnet.js';
import * as C from '../game/js/coopclient.js';
import { remoteP2 } from '../game/js/coop.js';

let n = 0;
const t = (name, f) => { f(); n++; };

const INFO = N.handshakeInfo({ tiles: 'abc', story: 'oud' });
const mkWorld = (extra = {}) => ({ player: { x: 0, y: 0, angle: 0, character: 'anita', vx: 3, vy: 3 }, companion: { x: 1, y: 1, angle: 0, character: 'tammo' }, coop: {}, money: 0, wanted: 0, camYaw: 0.5, input: { axis: () => [1, 0], isDown: () => false }, ...extra });

t('vaste personages: host Tammo, gast Tessa, ongeacht de startstand', () => {
  const h = mkWorld(), g = mkWorld();
  C.setFixedCharacters(h, 'host'); C.setFixedCharacters(g, 'client');
  assert.deepEqual([h.player.character, h.companion.character], ['tammo', 'anita']);
  assert.deepEqual([g.player.character, g.companion.character], ['anita', 'tammo']);
  assert.equal(h.coop.fixedChars, true);
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
t('end-to-end: gast stuurt invoer, host ontvangt; host-toestand verschijnt op de gast', () => {
  const link = createLink({ latency: 0.03, seed: 2 });
  const hw = mkWorld({ money: 250, wanted: 2 }), gw = mkWorld();
  N.startHost(hw, link.a, INFO, 5);
  N.startClient(gw, link.b, INFO);
  assert.equal(gw.player.character, 'anita');
  for (let i = 0; i < 180; i++) {
    hw.player.x = 10 + i * 0.01; hw.companion.x = 20; hw.companion.y = 5; // host simuleert beide lichamen
    N.tickCoopNet(hw, 1 / 60); N.tickCoopNet(gw, 1 / 60); link.advance(1 / 60);
  }
  assert.equal(gw.coopNet.session.status, 'ok');
  assert.equal(hw.coop.remote, true);
  assert.equal(hw.coop.remoteInput.yaw > 0.49 && hw.coop.remoteInput.yaw < 0.51, true);
  const r = remoteP2(hw.coop.remoteInput); assert.equal(r.x, 1);
  assert.ok(Math.abs(gw.companion.x - 10) < 3, `Tammo op de gast: ${gw.companion.x}`); // host-lichaam
  assert.ok(Math.abs(gw.player.x - 20) < 0.5, `Tessa op de gast: ${gw.player.x}`);
  assert.equal(gw.money, 250); assert.equal(gw.wanted, 2);
});
t('rollen: de gast bewaart het verhaal niet (coopRole), de host wel', () => {
  const link = createLink({ latency: 0.01 });
  const hw = mkWorld(), gw = mkWorld();
  N.startHost(hw, link.a, INFO); N.startClient(gw, link.b, INFO);
  assert.equal(hw.coopRole, 'host'); assert.equal(gw.coopRole, 'client');
  N.stopCoopNet(hw); assert.equal(hw.coopRole, null);
});
t('verbinding weg: beide kanten krijgen het wacht-scherm (onHold); de host valt terug op de volg-AI', () => {
  const link = createLink({ latency: 0.02 });
  const hw = mkWorld(), gw = mkWorld(); const holds = [];
  N.startHost(hw, link.a, INFO, 1, { onHold: (r) => holds.push(r) }); N.startClient(gw, link.b, INFO, { onHold: (r) => holds.push(r) });
  for (let i = 0; i < 120; i++) { N.tickCoopNet(hw, 1 / 60); N.tickCoopNet(gw, 1 / 60); link.advance(1 / 60); }
  assert.equal(hw.coop.remote, true);
  link.cut();
  for (let i = 0; i < 60 * 7; i++) { N.tickCoopNet(hw, 1 / 60); N.tickCoopNet(gw, 1 / 60); link.advance(1 / 60); }
  assert.equal(hw.coop.remote, false);
  assert.deepEqual(holds.sort(), ['client', 'host']);
  N.stopCoopNet(hw); assert.equal(hw.coopNet, null);
});
console.log(`coopnet_test: ${n}/${n} ok`);
