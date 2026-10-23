// Samen spelen (#434): de wereld loopt door achter het menu, boten, treinen en onzichtbare objecten bij de gast.
import assert from 'node:assert/strict';
import { createLink } from '../game/js/net/memtransport.js';
import * as N from '../game/js/coopnet.js';

let n = 0;
const t = (name, f) => { f(); n++; };

const INFO = N.handshakeInfo({ tiles: 'abc', story: 'oud' });
const mkWorld = () => ({ player: { x: 0, y: 0, angle: 0, character: 'anita', vx: 0, vy: 0 }, companion: { x: 1, y: 1, angle: 0, character: 'tammo' }, coop: { local: true }, money: 0, wanted: 0, camYaw: 0, time: 0, messages: [], addMessage(m) { this.messages.push(m); }, input: { axis: () => [0, 0], isDown: () => false } });

t('wereld loopt door achter het menu, alleen met minstens een gast', () => {
  const solo = mkWorld(); solo.paused = true;
  assert.equal(N.coopWereldDoorloop(solo), false, 'solo: pauze blijft pauze');
  const hw = mkWorld();
  N.startHost(hw, INFO, { seed: 5 });
  hw.paused = true;
  assert.equal(N.coopWereldDoorloop(hw), false, 'wel een sessie, nog geen gast');
  const link = createLink({ latency: 0.03, jitter: 0.01, seed: 2 });
  N.addGuest(hw, link.a);
  const gw = mkWorld(); N.startClient(gw, link.b, INFO, {});
  for (let k = 0; k < 120; k++) { N.tickCoopNet(hw, 1 / 60); if (gw.coopNet) N.tickCoopNet(gw, 1 / 60); link.advance(1 / 60); hw.time += 1 / 60; gw.time += 1 / 60; }
  assert.equal(N.coopWereldDoorloop(hw), true, 'met een gast loopt de wereld door');
  assert.equal(N.coopWereldDoorloop(hw, false), false, 'geen menu open: niets te doen');
  hw.coopHold = true; assert.equal(N.coopWereldDoorloop(hw), false, 'een wachtscherm pauzeert voor iedereen'); hw.coopHold = false;
  hw.uiPaused = true; assert.equal(N.coopWereldDoorloop(hw), false, 'een minigame-scherm pauzeert'); hw.uiPaused = false;
  assert.equal(N.coopWereldDoorloop(gw), false, 'een gast draait de wereld niet');
  hw.paused = false; assert.equal(N.coopWereldDoorloop(hw), false);
});

console.log(`coop434_test: ${n} tests ok`);
