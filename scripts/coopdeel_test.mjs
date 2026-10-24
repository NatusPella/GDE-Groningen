// Samen spelen (#452 punt 6): de beloning gaat gelijk over alle meespelers, de gastheer inbegrepen, met een samenwerkingsbonus.
//   node scripts/coopdeel_test.mjs
import assert from 'node:assert/strict';
import { createLink } from '../game/js/net/memtransport.js';
import * as N from '../game/js/coopnet.js';

let n = 0;
const t = (name, f) => { f(); n++; };
const INFO = { game: 'GDE', proto: 1, version: '1', tiles: '-', story: 'nieuw' };
const mkWorld = (extra = {}) => ({ player: { x: 0, y: 0, angle: 0, character: 'tammo', vx: 0, vy: 0 }, companion: { x: 1, y: 1, angle: 0, character: 'anita' }, coop: { local: true }, money: 0, wanted: 0, camYaw: 0, time: 0, messages: [], addMessage(m) { this.messages.push(m); }, input: { axis: () => [0, 0], isDown: () => false, wasPressed: () => false }, ...extra });
function sessie(gasten) {
  const hw = mkWorld(); N.startHost(hw, INFO, { seed: 3 });
  const gs = [];
  for (let i = 0; i < gasten; i++) {
    const link = createLink({ latency: 0.02, seed: 7 + i });
    N.addGuest(hw, link.a);
    const gw = mkWorld(); N.startClient(gw, link.b, INFO, {});
    gs.push({ gw, link });
  }
  const step = (s) => { for (let k = 0; k < 60 * s; k++) { N.tickCoopNet(hw, 1 / 60); for (const g of gs) { N.tickCoopNet(g.gw, 1 / 60); g.link.advance(1 / 60); g.gw.time += 1 / 60; } hw.time += 1 / 60; } };
  step(2);
  return { hw, gs: gs.map((g) => g.gw), step };
}

t('met één speler verandert er niets: geen gasten, geen bonus, geen aanpassing van het geld van de gastheer', () => {
  const { hw, step } = sessie(0);
  hw.money = 500; assert.equal(hw.coopDeel(100), 0); step(1);
  assert.equal(hw.money, 500); assert.equal(hw.messages.some((m) => /Samenwerkbonus/.test(m)), false);
});

t('twee spelers: 100 x 1,5 = 150, gelijk verdeeld: 75 voor de gast en 75 voor de gastheer, met een regel Samenwerkbonus', () => {
  const { hw, gs, step } = sessie(1);
  hw.money = 100; // de opdracht gaf de gastheer net 100
  assert.equal(hw.coopDeel(100), 1); step(1);
  assert.equal(gs[0].money, 75); assert.equal(hw.money, 75, 'geen 100% meer voor de gastheer');
  assert.ok(gs[0].messages.some((m) => /Samenwerkbonus: €25/.test(m)), 'gast: regel in de uitbetaling');
  assert.ok(hw.messages.some((m) => /Samenwerkbonus: €25/.test(m)), 'gastheer: dezelfde regel');
});

t('drie spelers: 400 x 1,5 = 600, 200 voor iedereen; de som klopt altijd en een gast die nee zei krijgt niets', () => {
  const { hw, gs, step } = sessie(2);
  hw.money = 400; assert.equal(hw.coopDeel(400), 2); step(1);
  assert.deepEqual([hw.money, gs[0].money, gs[1].money], [200, 200, 200]);
  const b = sessie(2); b.hw.money = 400;
  b.hw.mission = { phase: 'active', label: 'X', type: 'checkpoint', index: 1, progressText: 'a' }; b.step(1);
  b.gs[1].input.wasPressed = (k) => k === 'n'; b.step(1); b.gs[1].input.wasPressed = () => false;
  b.gs[0].input.wasPressed = (k) => k === 'j'; b.step(1); b.gs[0].input.wasPressed = () => false;
  assert.equal(b.hw.coopDeel(400), 1); b.step(1);
  assert.deepEqual([b.hw.money, b.gs[0].money, b.gs[1].money], [300, 300, 0], 'twee spelers delen 600; wie nee zei krijgt niets');
});

t('de som van de uitbetaling is het totaal na de bonus, ook als het niet gelijk opgaat', () => {
  const { hw, gs, step } = sessie(3);
  hw.money = 101; N.deelMetGasten(hw, 101); step(1);
  assert.equal(hw.money + gs.reduce((a, g) => a + g.money, 0), 101 + Math.floor(101 * 0.5), '101 x 1,5, afgerond');
});

console.log(`coopdeel_test: ${n}/${n} ok`);
