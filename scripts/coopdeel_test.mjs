// Samen spelen (#452 punt 6): elke meespelende speler krijgt de volledige beloning (geen verdeling, geen bonus).
//   node scripts/coopdeel_test.mjs
import assert from 'node:assert/strict';
import { createLink } from '../game/js/net/memtransport.js';
import * as N from '../game/js/coopnet.js';
import { registerSaveGame, registerSaveTimers, registerGastBoek } from '../game/js/savehook.js';

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

t('met één speler verandert er niets: geen gasten, geen aanpassing van het geld van de gastheer', () => {
  const { hw, step } = sessie(0);
  hw.money = 500; assert.equal(hw.coopDeel(100), 0); step(1);
  assert.equal(hw.money, 500); assert.equal(hw.messages.some((m) => /Samenwerkbonus/.test(m)), false);
});

t('twee spelers: elke speler krijgt het volle bedrag (100 en 100), geen bonus en geen regel Samenwerkbonus', () => {
  const { hw, gs, step } = sessie(1);
  hw.money = 100; // de opdracht gaf de gastheer net 100
  assert.equal(hw.coopDeel(100), 1); step(1);
  assert.equal(gs[0].money, 100); assert.equal(hw.money, 100, 'de gastheer houdt zijn volle bedrag');
  assert.equal(gs[0].messages.some((m) => /Samenwerkbonus/.test(m)) || hw.messages.some((m) => /Samenwerkbonus/.test(m)), false);
  assert.ok(gs[0].messages.some((m) => /^Beloning: €100$/.test(m)));
});

t('drie spelers: 400 voor iedereen; wie nee zei of niet antwoordde krijgt niets', () => {
  const { hw, gs, step } = sessie(2);
  hw.money = 400; assert.equal(hw.coopDeel(400), 2); step(1);
  assert.deepEqual([hw.money, gs[0].money, gs[1].money], [400, 400, 400]);
  const b = sessie(2); b.hw.money = 400;
  b.hw.mission = { phase: 'active', label: 'X', type: 'checkpoint', index: 1, progressText: 'a' }; b.step(1);
  b.gs[1].input.wasPressed = (k) => k === 'n'; b.step(1); b.gs[1].input.wasPressed = () => false;
  b.gs[0].input.wasPressed = (k) => k === 'j'; b.step(1); b.gs[0].input.wasPressed = () => false;
  assert.equal(b.hw.coopDeel(400), 1); b.step(1);
  assert.deepEqual([b.hw.money, b.gs[0].money, b.gs[1].money], [400, 400, 0], 'wie J zei krijgt het volle bedrag, wie nee zei niets');
});

t('hetzelfde bericht geeft nooit twee keer geld (idempotente id)', () => {
  const { hw, gs, step } = sessie(1);
  hw.coopDeel(250); step(1);
  const ev = { k: 'beloning', geld: 250, id: 'x:b:1' };
  assert.equal(N.handleEvent(gs[0], ev, 0), true); assert.equal(N.handleEvent(gs[0], ev, 0), false);
  assert.equal(gs[0].money, 500, 'één keer uit de opdracht, één keer uit het losse bericht; het tweede losse bericht telt niet');
});

// (#448) verrekening: checkpoint bij binnenkomst, per gebeurtenis meteen naar de eigen save, en een gast die later
// terugkomt houdt wat hij had zonder dezelfde gebeurtenis nog eens te krijgen.
t('checkpoint bij binnenkomst: een gast bewaart eerst zijn eigen spel en speelt dan pas mee', () => {
  let saves = 0;
  registerSaveGame(() => { saves++; return true; });
  try {
    const hw = mkWorld(); N.startHost(hw, INFO, { seed: 3 });
    const link = createLink({ latency: 0.02, seed: 7 }); N.addGuest(hw, link.a);
    saves = 0; const gw = mkWorld(); N.startClient(gw, link.b, INFO, {});
    assert.equal(saves, 1, 'de gast schrijft zijn eigen save voordat hij meespeelt');
    assert.equal(gw.coopRole, 'client', 'en is daarna gewoon gast');
  } finally { registerSaveGame(null); }
});

t('elke sessie heeft vanaf de start een eigen id: gebeurtenis-ids van twee sessies botsen nooit', () => {
  const a = sessie(0), b = sessie(0);
  assert.match(a.hw.coopNet.sessieId, /^[a-z0-9]{6}$/, 'de gastheer heeft meteen een sessie-id, ook vóór de eerste uitbetaling');
  assert.notEqual(a.hw.coopNet.sessieId, b.hw.coopNet.sessieId);
});

t('een uitbetaling zet de eigen save van de gastheer meteen klaar, niet pas na een minuut', () => {
  let seintjes = 0; registerSaveTimers(() => { seintjes++; }, () => {});
  try {
    const { hw } = sessie(1);
    assert.equal(hw.coopDeel(100), 1); const na = seintjes; assert.ok(na >= 1);
    hw.coopDeel(0); assert.equal(seintjes, na, 'zonder bedrag geen seintje');
    const solo = sessie(0); solo.hw.coopDeel(400); assert.ok(seintjes > na, 'de gastheer verdient ook zonder gasten in zijn eigen wereld');
  } finally { registerSaveTimers(null, null); }
});

t('het einde van de sessie verrekent nog een keer: de eigen save van de gast krijgt de laatste beloning', () => {
  const a = sessie(1), gw = a.gs[0];
  gw.coopVerdiend = 150;
  const gezien = []; registerSaveGame((w, o) => { gezien.push([w, o]); return true; });
  try { N.stopCoopNet(gw); } finally { registerSaveGame(null); }
  assert.deepEqual(gezien.map(([w]) => w), [gw], 'één laatste schrijfbeurt voor deze speler');
  assert.equal(gezien[0][1].toast, false);
  assert.equal(gw.coopVerdiend, 0, 'het geld zit in world.money; de teller gaat niet mee naar een volgende sessie');
});

t('een gast die later terugkomt houdt zijn geld en krijgt dezelfde gebeurtenis niet nog eens', () => {
  const a = sessie(1), gw = a.gs[0], ev = { k: 'beloning', geld: 300, id: 'terug:b:1' };
  assert.equal(N.handleEvent(gw, ev, 0), true); assert.equal(gw.money, 300);
  const eigen = ['terug:b:1']; // wat savegame.js in zijn eigen save zet (coopGebeurtenissen)
  registerGastBoek(() => eigen);
  try {
    const hw2 = mkWorld(); N.startHost(hw2, INFO, { seed: 9 });
    const link = createLink({ latency: 0.02, seed: 11 }); N.addGuest(hw2, link.a);
    const terug = mkWorld({ money: gw.money }); N.startClient(terug, link.b, INFO, {});
    assert.equal(N.handleEvent(terug, ev, 0), false, 'dezelfde id telt bij het terugkomen niet nog eens');
    assert.equal(terug.money, 300, 'en zijn geld blijft staan');
  } finally { registerGastBoek(null); }
});

console.log(`coopdeel_test: ${n}/${n} ok`);
