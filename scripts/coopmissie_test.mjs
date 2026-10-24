// Samen spelen (#452 punt 3): verhaalstappen kijken naar alle meespelers, niet alleen naar de gastheer.
//   node scripts/coopmissie_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createLink } from '../game/js/net/memtransport.js';
import * as N from '../game/js/coopnet.js';
import { ververs, opdrachtSpelers, inVoertuig, dichtstbijzijndeMeespeler, afstandMeespeler, meespelerInVoertuig, iedereenBinnen } from '../game/js/spelersregister.js';
import { teamActor, doelStand, groepKlaar } from '../game/js/stagegroep.js';

let n = 0;
const t = (name, f) => { f(); n++; };

// de modeOk van missions.js, zoals hij daar staat (te voet, boot, missievoertuig)
const missieAuto = { id: 'auto', x: 100, y: 0, speed: 0 };
const modeOk = (p, mode) => {
  if (mode === 'foot') return !p.inVehicle;
  if (mode === 'boat') return !!(p.inVehicle && p.inVehicle.isBoat);
  if (mode === 'vehicle') return p.inVehicle === missieAuto;
  return true;
};
// nepwereld: de gastheer op (0, 0), gast 1 en 2 uit world.coopPartners; slots = wie meedoet en staat (zoals coopnet.js coopMeespelers)
function wereld({ gasten = [], meedoen = null, vehicles = [] } = {}) {
  const w = { player: { x: 0, y: 0, inVehicle: null }, vehicles, coopPartners: gasten.map((g) => ({ status: 'voet', zichtbaar: true, ...g })) };
  w.coopMeespelers = meedoen ? () => meedoen : undefined;
  ververs(w, 0);
  return w;
}
const DOEL = { x: 500, y: 0 };

t('eenspeler: een register van één, exact als voorheen', () => {
  const w = wereld();
  assert.equal(opdrachtSpelers(w).length, 1);
  assert.equal(teamActor(w, DOEL), w.player, 'de hoofdspeler zelf, geen proxy');
  assert.equal(doelStand(w, DOEL, 30, undefined, modeOk).status, 'buiten');
  w.player.x = 490;
  assert.equal(doelStand(w, DOEL, 30, undefined, modeOk).status, 'binnen');
  w.player.inVehicle = { id: 'x' };
  assert.equal(doelStand(w, DOEL, 30, 'foot', modeOk).status, 'modus');
  // een sessie van één gast die geen J zei: niemand telt behalve de gastheer
  const w2 = wereld({ gasten: [{ slot: 1, x: 500, y: 0 }], meedoen: [] });
  assert.equal(opdrachtSpelers(w2).length, 1);
  assert.equal(doelStand(w2, DOEL, 30, undefined, modeOk).status, 'buiten', 'een toeschouwer in het doel telt niet');
});

t('goto: een gast alleen in het doel is genoeg, een toeschouwer niet', () => {
  const w = wereld({ gasten: [{ slot: 1, x: 495, y: 5 }], meedoen: [1] });
  assert.equal(opdrachtSpelers(w).length, 2);
  const g = doelStand(w, DOEL, 30, undefined, modeOk);
  assert.equal(g.status, 'binnen');
  assert.equal(g.actor.gast, true);
  assert.equal(afstandMeespeler(w, DOEL.x, DOEL.y) < 10, true, 'afstand van de dichtstbijzijnde meespeler');
  assert.equal(dichtstbijzijndeMeespeler(w, DOEL.x, DOEL.y).slot, 1);
  w.coopMeespelers = () => []; // de gast zei nee
  assert.equal(doelStand(w, DOEL, 30, undefined, modeOk).status, 'buiten');
});

t('goto met modus: de gast te voet of in de boot telt als de stap het vraagt', () => {
  const boot = { id: 'boot', isBoat: true, x: 505, y: 0 };
  const w = wereld({ gasten: [{ slot: 1, x: 505, y: 0, status: 'voertuig' }], meedoen: [1], vehicles: [boot] });
  assert.equal(inVoertuig(w, w.players[1]), boot);
  assert.equal(doelStand(w, DOEL, 30, 'boat', modeOk).status, 'binnen', 'de gast zit in de boot');
  assert.equal(doelStand(w, DOEL, 30, 'foot', modeOk).status, 'modus', 'de gast moet te voet');
  w.coopPartners[0].status = 'voet'; ververs(w, 0);
  assert.equal(doelStand(w, DOEL, 30, 'foot', modeOk).status, 'binnen');
});

t('hold: een meespeler bij het doel houdt de klok gaande; met iedereen moeten ze er allemaal zijn', () => {
  const w = wereld({ gasten: [{ slot: 1, x: 0, y: 0 }], meedoen: [1] });
  w.player.x = 0; w.coopPartners[0].x = 10; w.coopPartners[0].y = 0;
  const DEUR = { x: 10, y: 0 };
  assert.equal(doelStand(w, DEUR, 5, undefined, modeOk).status, 'binnen', 'alleen de gast staat er: genoeg');
  assert.equal(doelStand(w, DEUR, 5, undefined, modeOk, true).status, 'wacht', 'met iedereen mist de gastheer');
  w.player.x = 9;
  assert.equal(doelStand(w, DEUR, 5, undefined, modeOk, true).status, 'binnen');
  assert.equal(iedereenBinnen(w, 10, 0, 5), true);
  assert.equal(iedereenBinnen(w, 500, 0, 5), false);
});

t('poort voor stappen zonder eigen logica (kluis): standaard een is genoeg, met de vlag iedereen', () => {
  const w = wereld({ gasten: [{ slot: 1, x: 200, y: 0 }], meedoen: [1] });
  w.player.x = 1;
  const kluis = { x: 0, y: 0 };
  assert.equal(groepKlaar(w, { kind: 'crack' }, kluis), true, 'zonder vlag niets te wachten');
  assert.equal(groepKlaar(w, { kind: 'crack', iedereen: true }, kluis), false, 'de gast is nog onderweg');
  w.coopPartners[0].x = 5; ververs(w, 0);
  assert.equal(groepKlaar(w, { kind: 'crack', iedereen: true }, kluis), true);
  assert.equal(groepKlaar(wereld(), { iedereen: true }, kluis), true, 'alleen: de gastheer is de groep');
});

t('board: iemand stapt in het missievoertuig; een gast telt via zijn voertuig', () => {
  const w = wereld({ gasten: [{ slot: 1, x: 100, y: 2, status: 'rijdt' }], meedoen: [1], vehicles: [missieAuto] });
  assert.equal(meespelerInVoertuig(w, missieAuto).slot, 1);
  const w2 = wereld({ gasten: [{ slot: 1, x: 100, y: 2, status: 'rijdt' }], meedoen: [], vehicles: [missieAuto] });
  assert.equal(meespelerInVoertuig(w2, missieAuto), null, 'een toeschouwer die instapt telt niet');
  w2.player.inVehicle = missieAuto;
  assert.equal(meespelerInVoertuig(w2, missieAuto).slot, 0, 'de gastheer zelf');
});

t('escape en chase: afstand van de dichtstbijzijnde meespeler', () => {
  const w = wereld({ gasten: [{ slot: 1, x: 900, y: 0 }], meedoen: [1] });
  assert.equal(Math.round(afstandMeespeler(w, 880, 0)), 20, 'de gast zit er vlak achter, de gastheer is ver weg');
  w.coopPartners[0].status = 'neer'; ververs(w, 0);
  assert.equal(Math.round(afstandMeespeler(w, 880, 0)), 880, 'wie neer is telt niet meer mee');
  const boot = { id: 'b', isBoat: true, x: 510, y: 0 };
  const w2 = wereld({ gasten: [{ slot: 1, x: 510, y: 0, status: 'rijdt' }], meedoen: [1], vehicles: [boot] });
  const q = teamActor(w2, DOEL, (a, d) => d < 40 && !!a.inVehicle && !!a.inVehicle.isBoat);
  assert.equal(q.inVehicle, boot, 'de boot van de gast legt aan');
});

t('de gastheer is neergegaan of opgepakt: de gast houdt de stap gaande en alleen hij telt', () => {
  const w = wereld({ gasten: [{ slot: 1, x: 495, y: 0 }], meedoen: [1] });
  w.pendingRespawn = { busted: true }; // opgepakt op het politiebureau
  const l = opdrachtSpelers(w);
  assert.deepEqual(l.map((r) => r.slot), [1], 'de gastheer telt niet mee zolang hij wacht op zijn herstart');
  assert.equal(doelStand(w, DOEL, 30, undefined, modeOk).status, 'binnen');
  const w2 = wereld(); w2.pendingRespawn = { busted: false };
  assert.deepEqual(opdrachtSpelers(w2).map((r) => r.slot), [0], 'alleen: de gastheer blijft de enige');
});

// ---- falen: echte sessie (host + gast), zoals coopteam_test.mjs
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

t('sessie: coopMeespelers geeft wie J zei, verbonden is en staat; de stap volgt hem', () => {
  const { hw, gs, step } = sessie(2);
  assert.equal(typeof hw.coopMeespelers, 'function');
  opdracht(hw); step(1);
  assert.deepEqual(hw.coopMeespelers(), [], 'niemand zei J');
  assert.equal(opdrachtSpelers(hw).length, 1);
  druk(gs[0].gw, 'j'); step(1);
  assert.deepEqual(hw.coopMeespelers(), [1]);
  hw.companion.state = 'dead'; step(1);
  assert.deepEqual(hw.coopMeespelers(), [], 'de meespeler is neer');
  assert.equal(hw.coopOpdrachtDoor(), false, 'de gastheer neer en de enige meespeler neer: de opdracht faalt');
  hw.companion.state = 'alive'; step(1);
  assert.deepEqual(hw.coopMeespelers(), [1]);
  assert.equal(hw.coopOpdrachtDoor(), true, 'de gastheer neer of opgepakt, een meespeler staat: de opdracht loopt door');
  druk(gs[1].gw, 'j'); step(1);
  hw.companion.state = 'dead'; step(1);
  assert.deepEqual(hw.coopMeespelers(), [2], 'een extra gast die staat telt');
  assert.equal(hw.coopOpdrachtDoor(), true);
  N.stopCoopNet(hw);
  assert.equal(hw.coopMeespelers, null, 'na het stoppen weg');
});

t('de respawn-haak vraagt de sessie voor neer en voor opgepakt, en de stappen lopen via stagegroep.js', () => {
  const src = fs.readFileSync(new URL('../game/js/missions.js', import.meta.url), 'utf8');
  assert.match(src, /if \(w\.coopOpdrachtDoor && w\.coopOpdrachtDoor\(\)\) return;\s*\r?\n\s*failActiveMission\(w, busted/, 'busted en neer lopen door dezelfde check');
  for (const naam of ['doelStand(', 'teamActor(', 'groepKlaar(', 'meespelerInVoertuig(', 'afstandMeespeler(']) assert.ok(src.includes(naam), `missions.js gebruikt ${naam}`);
});

console.log(`coopmissie_test: ${n}/${n} ok`);
