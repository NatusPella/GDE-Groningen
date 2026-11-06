// De sessie van één (#553): Alleen spelen is een gastheer-sessie met max 1 speler.
//   node scripts/coopsolo_test.mjs
import assert from 'node:assert/strict';
import { startSoloHost, stopSoloHost, isSoloHost } from '../game/js/coopsolo.js';
import * as N from '../game/js/coopnet.js';

let n = 0;
const t = (name, f) => { f(); n++; };

const INFO = N.handshakeInfo({ tiles: 'abc', story: 'oud' });
const mkWorld = (extra = {}) => ({ player: { x: 0, y: 0, angle: 0, character: 'anita' }, companion: { x: 1, y: 1, angle: 0, character: 'tammo' }, coop: { local: true }, money: 0, wanted: 0, camYaw: 0.5, time: 0, messages: [], addMessage(m) { this.messages.push(m); }, input: { axis: () => [0, 0], isDown: () => false }, ...extra });

t('sessie van één start als host met max 1', () => {
  const w = mkWorld();
  const net = startSoloHost(w, { info: INFO, seed: 7 });
  assert.ok(net, 'sessie');
  assert.equal(w.coopRole, 'host');
  assert.equal(w.coopSolo, true);
  assert.equal(isSoloHost(w), true);
  assert.equal(w.coop.local, true, 'het toetsenbord blijft van de speler');
  assert.ok(!w.coop.fixedChars, 'de verhaalpersonages blijven staan');
  assert.equal(net.hub.roster.spelers.length, 1, 'alleen plek 0');
  assert.equal(net.hub.roster.spelers[0].slot, 0);
  stopSoloHost(w);
  assert.equal(w.coopNet, null);
  assert.equal(w.coopSolo, false);
});

t('twee keer starten maakt geen tweede sessie', () => {
  const w = mkWorld();
  const a = startSoloHost(w, { info: INFO });
  const b = startSoloHost(w, { info: INFO });
  assert.ok(a);
  assert.equal(b, null);
  stopSoloHost(w);
});

t('de hub draait zonder gasten en zonder berichten naar buiten', () => {
  const w = mkWorld();
  const net = startSoloHost(w, { info: INFO });
  for (let i = 0; i < 600; i++) { w.time += 1 / 60; N.tickCoopNet(w, 1 / 60); }
  assert.equal(w.coopNet, net);
  assert.equal(net.hub.roster.spelers.length, 1);
  assert.equal(w.messages.length, 0, 'geen sessiemeldingen in je eentje');
  stopSoloHost(w);
});

t('stoppen zonder sessie doet niets', () => {
  assert.equal(stopSoloHost(mkWorld()), false);
  assert.equal(stopSoloHost(null), false);
});

console.log(`coopsolo_test: ${n} controles ok`);



