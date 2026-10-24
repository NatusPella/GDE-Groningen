// Samen spelen (#434): de wereld loopt door achter het menu, boten, treinen en onzichtbare objecten bij de gast.
import assert from 'node:assert/strict';
import { createLink } from '../game/js/net/memtransport.js';
import * as N from '../game/js/coopnet.js';
import { verzamelEntiteiten, leesEntiteiten, ID_TREIN0, SOORT_START, SOORT_DOEL } from '../game/js/coopworld.js';
import { gladBoot, eigenBoot } from '../game/js/coopboot.js';

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

t('boten: een groot schip blijft in de snapshot zolang zijn romp dichtbij is; treinen ruim van tevoren', () => {
  const schip = { id: 7, x: 190, y: 0, angle: 0, isBoat: true, model: { len: 92 }, speed: 3 };
  const rondvaart = { id: 8, x: 230, y: 10, angle: 0, isBoat: true, model: { len: 6 }, speed: 3 };
  const auto = { id: 9, x: 160, y: 0, angle: 0, model: { len: 4 }, speed: 3 };
  const w = { vehicles: [schip, rondvaart, auto], pedestrians: [], time: 1, wanted: 0 };
  const e = verzamelEntiteiten(w, [{ x: 0, y: 0 }], { treinen: [{ id: 3, x: 400, y: 0, v: 30, halfLen: 50 }, { id: 4, x: 900, y: 0, v: 30, halfLen: 50 }] });
  const ids = e.map((q) => q.id);
  assert.ok(ids.includes(7), 'schip met romp binnen 150 m');
  assert.ok(!ids.includes(8), 'kleine boot op 230 m: te ver');
  assert.ok(!ids.includes(9), 'auto op 160 m: te ver');
  assert.ok(ids.includes(ID_TREIN0 + 3), 'trein op 400 m');
  assert.ok(!ids.includes(ID_TREIN0 + 4), 'trein op 900 m: nog niet');
});

t('boten bij de gast: glad en zonder sprong', () => {
  const st = {};
  let g = gladBoot(st, 0, 0, 0, 4, 0.016);
  assert.deepEqual([g.x, g.y, g.angle], [0, 0, 0], 'eerste keer: precies waar de host zegt');
  // snapshots van 10 Hz op een boot van 4 m/s: de getekende plek loopt gelijkmatig mee, zonder achterstand bij constante snelheid
  let x = 0, vorig = 0, maxStap = 0;
  for (let k = 1; k <= 300; k++) {
    if (k % 6 === 0) x = 4 * (k / 60); // een nieuwe snapshot
    g = gladBoot(st, x, 0, 0, 4, 1 / 60);
    if (k > 60) maxStap = Math.max(maxStap, Math.abs(g.x - vorig));
    vorig = g.x;
  }
  assert.ok(maxStap < 0.12, 'geen sprongen: ' + maxStap);
  assert.ok(Math.abs(g.x - 20) < 0.5, 'loopt niet achter: ' + g.x);
  // een slingerende koers van +-0.08 rad rond 1 wordt rustiger
  let min = 9, max = -9;
  for (let k = 0; k < 240; k++) { g = gladBoot(st, 20, 0, 1 + (k % 12 < 6 ? 0.08 : -0.08), 0, 1 / 60); if (k > 120) { min = Math.min(min, g.angle); max = Math.max(max, g.angle); } }
  assert.ok(max - min < 0.1, 'koers gladgestreken: ' + (max - min));
  // de overgang van 359 naar 1 graad is geen draai van bijna een toer
  const st2 = {}; gladBoot(st2, 0, 0, 6.2, 0, 1 / 60);
  assert.ok(Math.abs(gladBoot(st2, 0, 0, 0.1, 0, 1 / 60).angle - 6.2) < 0.2);
  // een sprong (teleport) zet de boot meteen goed
  assert.equal(gladBoot(st, 500, 0, 0, 0, 1 / 60).x, 500);
});

t('de band zet een gast in de boot als er geen droge plek is', () => {
  const boot = { isBoat: true, x: 100, y: 100, speed: 5, angle: 0, model: { len: 6 } };
  const mk = (extra = {}) => ({ player: { x: 100, y: 100, inVehicle: boot }, companion: { x: 400, y: 100, state: 'ok' }, coopFigures: {}, coop: { remote: true }, coopVrij: () => false, time: 0, ...extra });
  const w = mk();
  assert.equal(N.zetInBoot(w, w.companion), true);
  assert.equal(w.companion.inVehicle, boot);
  assert.equal(boot.passenger, 'companion');
  assert.equal(N.zetInBoot(w, w.companion), false, 'de plek van Tessa is bezet');
  const fig = { slot: 2, x: 0, y: 0 }; w.coopFigures[2] = fig;
  assert.equal(N.zetInBoot(w, fig), true); assert.equal(fig.inVeh, boot);
  const w2 = mk(); w2.player.inVehicle = { x: 0, y: 0, model: { len: 4 } }; // een auto: nooit
  assert.equal(N.zetInBoot(w2, w2.companion), false);
});

t('missiemarkers: de gast ziet het begin van de volgende opdracht en daarna het doel', () => {
  const w = { vehicles: [], pedestrians: [], time: 1, wanted: 0, mission: { phase: 'idle', index: 7, marker: { x: 100, y: 50 } } };
  const lees = (ents) => leesEntiteiten(JSON.parse(JSON.stringify(ents)));
  let e = verzamelEntiteiten(w, [{ x: 0, y: 0 }]);
  assert.equal(e.filter((q) => q.kind === SOORT_START).length, 1);
  assert.deepEqual(lees(e).starts, [{ index: 7, x: 100, y: 50 }]);
  assert.equal(lees(e).doelen.length, 0);
  w.mission.marker = { x: 900, y: 0 }; // veel te ver weg: geen zuil in beeld
  assert.equal(verzamelEntiteiten(w, [{ x: 0, y: 0 }]).filter((q) => q.kind === SOORT_START).length, 0);
  w.mission = { phase: 'active', index: 7, marker: { x: 120, y: 60 } };
  e = verzamelEntiteiten(w, [{ x: 0, y: 0 }]);
  assert.equal(e.filter((q) => q.kind === SOORT_START).length, 0, 'tijdens de opdracht alleen het doel');
  assert.equal(e.filter((q) => q.kind === SOORT_DOEL).length, 1);
  w.mission = { phase: 'cooldown', index: 8, marker: { x: 10, y: 10 } };
  assert.equal(verzamelEntiteiten(w, [{ x: 0, y: 0 }]).length, 0);
});

t('treinen: ook de trein die de gastheer zelf bestuurt of neerzet gaat mee in de snapshot (#436)', () => {
  const route = { stops: [{ s: 0 }, { s: 900 }] };
  const treinen = [
    { route, c: 100, v: 12, dir: 1, state: 'player', halfLen: 20 },  // de gastheer rijdt de dienst
    { route, c: 200, v: 0, dir: -1, state: 'dwell', halfLen: 20 },   // wacht op een halte
    { route, c: 300, v: 0, dir: 1, state: 'parked', halfLen: 20 },   // net neergezet na het kapen
    { route, c: 400, v: 4, dir: 1, state: 'mission', halfLen: 20 },  // een opdrachttrein: die tekent de gast zelf
  ];
  N.setCoopTreinen({ getTrains: () => treinen, getRoutes: () => [route], routePoint: (r, c) => [c, 0] });
  const w = mkWorld({ vehicles: [], pedestrians: [], mission: null });
  const snap = N.hostSim(w, () => ({ spelers: [] })).snapshot();
  const tr = leesEntiteiten(snap.entities).treinen;
  assert.deepEqual(tr.map((q) => q.route), [0, 0, 0], 'drie treinen mee, de opdrachttrein niet: ' + JSON.stringify(tr));
  assert.deepEqual(tr.map((q) => q.x), [100, 200, 300], 'op hun eigen plek op de route');
  assert.equal(tr[0].v, 12, 'de snelheid met teken gaat mee');
  assert.equal(tr[1].v, 0, 'een stilstaande trein is ook zichtbaar');
  N.setCoopTreinen(null);
});

t('boten: de boot waar de gast zelf op zit tekent hij precies, een andere boot glad (#436)', () => {
  const eigen = { x: 100, y: 50, speed: 5 };
  assert.equal(eigenBoot(eigen, 100.1, 50.1), true, 'de eigen boot');
  assert.equal(eigenBoot(eigen, 103, 50), false, 'een andere boot, 3 m verderop');
  assert.equal(eigenBoot(null, 0, 0), false, 'niet in een boot: geen eigen boot');
  assert.equal(eigenBoot({ x: NaN, y: 0 }, 0, 0), false, 'zonder plek: geen eigen boot');
});

console.log(`coop434_test: ${n} tests ok`);
