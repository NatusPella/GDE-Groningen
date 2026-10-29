// Samen spelen (#502): de gastheer ziet de gast als zichzelf, niet als Tessa.
//   node scripts/cooprol_test.mjs
// Drie afspraken, zonder Electron:
//  a) plek 1 is op de gastheer een eigen gesimuleerde figuur met eigen char en naam (geen tammo/anita/Tessa), en het
//     snapshot leest die figuur — niet de metgezel;
//  b) de computermetgezel blijft Tessa (de andere verhaalrol) als er geen tweede mens is, ook als er wel een gast is;
//  c) de eigen speler speelt de rol van de stap (cooproles.rolVoorSpeler), tijdelijk als de stap een andere rol vraagt.
import assert from 'node:assert/strict';
import { createLink } from '../game/js/net/memtransport.js';
import * as N from '../game/js/coopnet.js';
import * as R from '../game/js/cooproles.js';
import { STEPS } from '../game/js/storyarc.js';

let n = 0;
const t = (name, f) => { f(); n++; };
const STORY = ['tammo', 'tessa', 'anita'];
const INFO = N.handshakeInfo({ tiles: 'abc', story: 'oud' });
const toets = () => { const s = new Set(); return { s, wasPressed: (k) => s.delete(k), isDown: () => false, axis: () => [0, 0] }; };
const mkWorld = (extra = {}) => ({ player: { x: 0, y: 0, angle: 0, character: 'tammo', vx: 0, vy: 0 }, companion: { x: 1, y: 1, angle: 0, character: 'anita' }, coop: { local: true }, money: 0, wanted: 0, camYaw: 0, time: 0, clock: 12, messages: [], addMessage(m) { this.messages.push(m); }, input: toets(), ...extra });

// Een gastheer met één gast, een paar tellen in dezelfde wereld (dezelfde opzet als coopgaten_test).
function samen() {
  const hw = mkWorld();
  N.startHost(hw, INFO, { seed: 9, max: 4 });
  const link = createLink({ latency: 0.02, jitter: 0.01, loss: 0, seed: 3 });
  N.addGuest(hw, link.a);
  const gw = mkWorld({ player: { x: 0, y: 0, angle: 0, character: 'anita', vx: 0, vy: 0 }, companion: { x: 1, y: 1, angle: 0, character: 'tammo' } });
  N.startClient(gw, link.b, INFO, {});
  for (let k = 0; k < 180; k++) {
    N.tickCoopNet(hw, 1 / 60);
    if (gw.coopNet) N.tickCoopNet(gw, 1 / 60);
    link.advance(1 / 60);
    gw.time += 1 / 60; hw.time += 1 / 60;
  }
  return { hw, gw, link };
}

t('a) de gastheer simuleert plek 1 als eigen figuur, met eigen char en naam', () => {
  const { hw } = samen();
  const f = hw.coopFigures && hw.coopFigures[1];
  assert.ok(f, 'plek 1 heeft een eigen figuur op de gastheer');
  assert.notEqual(f, hw.companion, 'de figuur is niet het lichaam van de metgezel');
  assert.ok(!STORY.includes(String(f.char).toLowerCase()), `eigen char, geen verhaalrol (${f.char})`);
  assert.ok(f.naam && !STORY.includes(String(f.naam).toLowerCase()), `eigen naam, geen Tammo/Tessa (${f.naam})`);
  assert.equal(f.slot, 1);
});

t('a) de spelerslijst en het HUD noemen plek 1 bij zijn avatar, niet bij Tessa', () => {
  const { hw } = samen();
  const f = hw.coopFigures[1];
  const rij = (hw.coopRoster || []).find((r) => r.slot === 1);
  assert.ok(rij, 'plek 1 staat in de lijst');
  assert.equal(rij.char, f.char, 'de lijst gebruikt de char van de avatar');
  assert.equal(rij.naam, f.naam, 'de lijst gebruikt de naam van de avatar');
  const p = (hw.coopPartners || []).find((x) => x.slot === 1);
  assert.ok(p, 'de gastheer ziet plek 1 als partner');
  assert.equal(p.naam, f.naam, 'het label van plek 1 komt uit de avatar');
});

t('a) het snapshot leest plek 1 uit de figuur, niet uit de metgezel', () => {
  const { hw } = samen();
  const f = hw.coopFigures[1];
  f.x = 12.5; f.y = -3.25;
  hw.companion.x = 100; hw.companion.y = 100; // als het snapshot de metgezel las, stond plek 1 hier
  const s = N.hostSim(hw, () => hw.coopNet.hub.roster).snapshot();
  const p = s.players.find((q) => q.slot === 1);
  assert.ok(p, 'plek 1 zit in het snapshot');
  assert.equal(p.x, 12.5); assert.equal(p.y, -3.25);
});

t('a) de invoer van de gast gaat naar zijn eigen figuur, niet naar de metgezel', () => {
  const { hw, gw, link } = samen();
  const f = hw.coopFigures[1];
  const c = hw.companion;
  const f0 = { x: f.x, y: f.y }, c0 = { x: c.x, y: c.y };
  gw.input.axis = () => [0, -1]; // vooruit in de eigen camera (yaw 0): wereld +x
  for (let k = 0; k < 60; k++) {
    N.tickCoopNet(hw, 1 / 60); N.tickCoopNet(gw, 1 / 60); link.advance(1 / 60);
    gw.time += 1 / 60; hw.time += 1 / 60;
  }
  assert.ok(Math.hypot(f.x - f0.x, f.y - f0.y) > 0.5, 'de figuur van de gast liep mee met zijn invoer');
  assert.ok(Math.hypot(c.x - c0.x, c.y - c0.y) < 1.5, 'de computermetgezel bleef bij de gastheer'); // de volg-AI, geen gastinvoer
});

t('b) zonder tweede mens blijft de metgezel Tessa (de andere verhaalrol)', () => {
  const hw = mkWorld();
  N.startHost(hw, INFO, { seed: 4, max: 4 });
  N.tickCoopNet(hw, 1 / 60);
  assert.ok(hw.companion, 'er is een computermetgezel');
  assert.equal(hw.companion.character, 'anita', 'de gastheer speelt Tammo, dus de metgezel is Tessa');
  assert.equal(hw.coopFigures[1], undefined, 'zonder gast is plek 1 geen figuur');
  const m06 = STEPS.find((x) => x.id === 'M06');
  assert.equal(R.metgezelVoorSpeler(m06, { verhaalrol: 'tammo' }), 'anita', 'de computermetgezel is de andere verhaalrol');
  assert.equal(R.metgezelVoorSpeler(m06, { verhaalrol: 'anita' }), 'tammo', 'en andersom');
});

t('b) ook met een gast blijft de metgezel van de gastheer Tessa', () => {
  const { hw } = samen();
  assert.equal(hw.companion.character, 'anita', 'de gast neemt de plek van Tessa niet over');
  assert.notEqual(hw.companion, hw.coopFigures[1], 'de gast en de metgezel zijn twee verschillende figuren');
});

t('c) de eigen speler speelt de rol van de stap, tijdelijk als die afwijkt', () => {
  const m21 = STEPS.find((x) => x.id === 'M21'); // solo-stap van Tessa
  assert.equal(m21.player, 'anita');
  const eigen = R.rolVoorSpeler(m21, { verhaalrol: 'tammo' });
  assert.deepEqual(eigen, { rol: 'anita', eigen: 'tammo', tijdelijk: true }, 'Tammo speelt in deze stap Tessa');
  const thuis = R.rolVoorSpeler(m21, { verhaalrol: 'anita' });
  assert.deepEqual(thuis, { rol: 'anita', eigen: 'anita', tijdelijk: false }, 'Tessa blijft zichzelf');
  const m03 = STEPS.find((x) => x.id === 'M03');
  assert.equal(R.rolVoorSpeler(m03, { verhaalrol: 'tammo' }).rol, m03.player || 'tammo');
});

console.log(`cooprol_test: ${n}/${n} ok`);
