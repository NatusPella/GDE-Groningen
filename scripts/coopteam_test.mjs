// Samen spelen (#452 punt 18): een opdracht faalt voor iedereen pas als alle meespelers uitgeschakeld zijn.
//   node scripts/coopteam_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createLink } from '../game/js/net/memtransport.js';
import * as N from '../game/js/coopnet.js';
import { teamDown } from '../game/js/cooproles.js';

let n = 0;
const t = (name, f) => { f(); n++; };
const INFO = { game: 'GDE', proto: 1, version: '1', tiles: '-', story: 'nieuw' };
const mkWorld = (extra = {}) => ({ player: { x: 0, y: 0, angle: 0, character: 'tammo', vx: 0, vy: 0 }, companion: { x: 1, y: 1, angle: 0, character: 'anita', state: 'alive' }, coop: { local: true }, money: 0, wanted: 0, camYaw: 0, time: 0, messages: [], addMessage(m) { this.messages.push(m); }, input: { axis: () => [0, 0], isDown: () => false, wasPressed: () => false }, ...extra });
function sessie(gasten = 1) {
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
  return { hw, gs, step };
}
const opdracht = (hw) => { hw.mission = { phase: 'active', label: 'Bezorgen', type: 'stages', index: 4, progressText: 'Naar de kerk' }; };
const druk = (gw, toets) => { let eens = true; gw.input.wasPressed = (k) => { if (k === toets && eens) { eens = false; return true; } return false; }; };

t('teamDown: alleen als niemand meer staat', () => {
  assert.equal(teamDown([]), true, 'zonder meespelers is niemand over');
  assert.equal(teamDown([false, false]), true);
  assert.equal(teamDown([false, true]), false);
  assert.equal(teamDown(null), true);
});

t('de gastheer gaat neer: staat een meespeler nog, dan loopt de opdracht door; zonder meespeler faalt hij zoals altijd', () => {
  const { hw, gs, step } = sessie(1);
  assert.equal(typeof hw.coopOpdrachtDoor, 'function');
  opdracht(hw); step(1);
  assert.equal(hw.coopOpdrachtDoor(), false, 'niemand zei J: de gastheer speelt alleen, dus faalt de opdracht als altijd');
  druk(gs[0].gw, 'j'); step(1);
  assert.equal(hw.coopNet.meedoen.keuze[1], 'ja');
  assert.equal(hw.coopOpdrachtDoor(), true, 'de meespeler staat nog');
  hw.companion.state = 'dead';
  assert.equal(hw.coopOpdrachtDoor(), false, 'ook de meespeler is neer: de opdracht faalt voor iedereen');
  hw.companion.state = 'alive';
  gs[0].link.cut(); step(8);
  assert.equal(hw.coopOpdrachtDoor(), false, 'een weggevallen meespeler telt niet mee');
});

t('wie nee zei telt niet als meespeler; een extra gast die ja zei houdt de opdracht gaande', () => {
  const { hw, gs, step } = sessie(2);
  opdracht(hw); step(1);
  druk(gs[0].gw, 'n'); step(1);
  assert.equal(hw.coopOpdrachtDoor(), false, 'alleen een toeschouwer over');
  druk(gs[1].gw, 'j'); step(1);
  hw.companion.state = 'dead';
  assert.equal(hw.coopOpdrachtDoor(), true, 'gast 2 doet mee en staat');
});

t('zonder sessie bestaat de haak niet en gedraagt missions.js zich als altijd', () => {
  const w = mkWorld(); assert.equal(w.coopOpdrachtDoor, undefined);
  const { hw } = sessie(1); N.stopCoopNet(hw); assert.equal(hw.coopOpdrachtDoor, null, 'na het stoppen weg');
  const src = fs.readFileSync(new URL('../game/js/missions.js', import.meta.url), 'utf8');
  assert.match(src, /if \(w\.coopOpdrachtDoor && w\.coopOpdrachtDoor\(\)\) return;\s*\r?\n\s*failActiveMission\(w, busted/, 'de respawn-haak vraagt eerst de sessie');
});

console.log(`coopteam_test: ${n}/${n} ok`);
