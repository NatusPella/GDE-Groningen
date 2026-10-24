// Samen spelen (#452): gezamenlijke keuzes. Alle spelers zijn gelijkwaardig: schermen pauzeren de wereld alleen met één speler, tijdsprongen
// (slapen, onderduiken, reizen met de klok) vragen akkoord van de anderen, cheats en het testmenu staan uit met meer spelers.
// Dezelfde koppeling als in het spel (coopnet.js, hub, sessies) op een nep-wereld per speler, over een geheugentransport. Geen DOM, geen Electron.
//   node scripts/coop/groep_test.mjs
import assert from 'node:assert/strict';
import { createLink } from '../../game/js/net/memtransport.js';
import * as N from '../../game/js/coopnet.js';
import * as G from '../../game/js/coopgroep.js';

let n = 0;
const t = (name, f) => { f(); n++; };
const INFO = N.handshakeInfo({ tiles: 'abc', story: 'oud' });
const toets = () => { const s = new Set(); return { s, wasPressed: (k) => s.delete(k), isDown: () => false, axis: () => [0, 0] }; };
const mkWorld = (extra = {}) => ({ player: { x: 0, y: 0, angle: 0, character: 'tammo', vx: 0, vy: 0 }, companion: { x: 1, y: 1, angle: 0, character: 'anita' }, coop: { local: true }, money: 0, wanted: 0, camYaw: 0, time: 0, clock: 12, messages: [], addMessage(m) { this.messages.push(m); }, input: toets(), ...extra });
const tekstIn = (w, re) => w.messages.some((m) => re.test(m));

// een sessie met een host en `gasten` (elk met eigen wereld en eigen link)
function sessie(gasten = 1) {
  const hw = mkWorld(), gs = [];
  N.startHost(hw, INFO, { seed: 5, max: 6 });
  for (let i = 0; i < gasten; i++) {
    const link = createLink({ latency: 0.03, jitter: 0.01, seed: 2 + i });
    N.addGuest(hw, link.a);
    const gw = mkWorld({ player: { x: 0, y: 0, angle: 0, character: 'anita', vx: 0, vy: 0 }, companion: { x: 1, y: 1, angle: 0, character: 'tammo' } });
    N.startClient(gw, link.b, INFO, {});
    gs.push({ gw, link });
  }
  const step = (secs, f) => { for (let k = 0; k < 60 * secs; k++) { if (f) f(k); N.tickCoopNet(hw, 1 / 60); for (const g of gs) { if (g.gw.coopNet) N.tickCoopNet(g.gw, 1 / 60); g.link.advance(1 / 60); g.gw.time += 1 / 60; } hw.time += 1 / 60; } };
  return { hw, gs, step };
}

// ---------------------------------------------------------------- punt 9: schermen pauzeren de wereld alleen met één speler
t('zachte pauze: afspeel-vooruit, snelreis, laden, fotomodus en hulpaanbod laten de wereld doorlopen, een filmpje niet', () => {
  const s = sessie(1); s.step(2);
  const hw = s.hw; hw.paused = true;
  for (const bron of ['afspeelvooruit', 'reisrit', 'laden', 'fotomodus', 'hulpaanbod']) {
    hw.uiPaused = true; G.zachtePauze(hw, bron, true);
    assert.equal(N.coopWereldDoorloop(hw, false), true, `${bron}: de wereld loopt door`);
    assert.equal(N.coopWereldDoorloop(hw, true), true, `${bron}: ook met een menu open`);
    hw.uiHard = true; assert.equal(N.coopWereldDoorloop(hw), false, `${bron}: een filmpje pauzeert voor iedereen`); hw.uiHard = false;
    hw.coopHold = true; assert.equal(N.coopWereldDoorloop(hw), false, `${bron}: een wachtscherm pauzeert`); hw.coopHold = false;
    G.zachtePauze(hw, bron, false); hw.uiPaused = false;
  }
  hw.uiPaused = true; assert.equal(N.coopWereldDoorloop(hw, false), false, 'een uiPaused zonder zachte bron (minigame-scherm) pauzeert');
  assert.equal(N.coopWereldDoorloop(hw, true), false);
  assert.equal(N.coopWereldDoorloop(s.gs[0].gw, false), false, 'een gast draait de wereld niet');
});
t('zachte pauze: met één speler blijft alles zoals het is', () => {
  const solo = mkWorld(); solo.paused = true; solo.uiPaused = true; G.zachtePauze(solo, 'laden', true);
  assert.equal(N.coopWereldDoorloop(solo, false), false);
  const hw = mkWorld(); N.startHost(hw, INFO, { seed: 5 }); hw.paused = true; hw.uiPaused = true; G.zachtePauze(hw, 'reisrit', true);
  assert.equal(N.coopWereldDoorloop(hw, false), false, 'wel een sessie, nog geen gast');
  assert.equal(G.meerSpelers(solo), false); assert.equal(G.meerSpelers(hw), false);
});
t('zachte pauze: bronnen komen en gaan los van elkaar', () => {
  const w = mkWorld(); G.zachtePauze(w, 'a', true); G.zachtePauze(w, 'b', true); G.zachtePauze(w, 'a', false);
  assert.equal(G.zachtAan(w), true); G.zachtePauze(w, 'b', false); assert.equal(G.zachtAan(w), false);
  w.uiPaused = true; assert.equal(G.zachtAlleen(w), false, 'geen bron: geen zachte pauze');
});

console.log(`groep_test: ${n} tests ok`);
