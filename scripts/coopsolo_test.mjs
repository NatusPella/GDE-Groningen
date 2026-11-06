// De sessie van één (#553): Alleen spelen is een gastheer-sessie met max 1 speler.
//   node scripts/coopsolo_test.mjs
import assert from 'node:assert/strict';
import { startSoloHost, stopSoloHost, isSoloHost } from '../game/js/coopsolo.js';
import * as N from '../game/js/coopnet.js';
import { wijsPlekToe, heeftPlek } from '../game/js/coopplayers.js';
import { coopStep } from '../game/js/coopglue.js';

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
  assert.equal(w.coop.local, false, 'geen gast: de metgezel volgt de volg-AI, niet het toetsenbord (#559)');
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
  assert.equal(w.coopPartner, null, 'geen partner in je eentje');
  assert.equal(w.coop.local, false, 'geen gast: de metgezel volgt de volg-AI (#559)');
  stopSoloHost(w);
  assert.equal(w.coop.local, true, 'na stoppen is het toetsenbord weer van plek 2 (de oude stand)');
});

// #559: de metgezel bleef in Alleen spelen staan omdat coopStep (toetsenbord van plek 2) hem overnam.
// De sessie van één is een gewone sessie: zonder gast is er geen gast-invoer en doet de volg-AI het werk.
t('#559: de metgezel volgt zonder toetsen; coopStep laat hem met rust', () => {
  const w = mkWorld();
  const net = startSoloHost(w, { info: INFO, seed: 7 });
  assert.ok(net);
  const namOver = () => { throw new Error('coopStep nam de metgezel over in een sessie van één'); };
  assert.equal(coopStep(w.companion, 1 / 60, w, namOver), false, 'de volg-AI van companion.js doet het werk');
  // een gastheer met een gast houdt dezelfde regel; de gast-invoer komt via het net
  const h = mkWorld();
  N.startHost(h, INFO, { seed: 3, max: 4 });
  assert.equal(h.coop.local, false, 'in een echte sessie stuurt geen toetsenbord de metgezel');
  assert.equal(coopStep(h.companion, 1 / 60, h, namOver), false);
  N.stopCoopNet(h);
  stopSoloHost(w);
});

t('een echte sessie over de solo-sessie wist coopSolo', () => {
  const w = mkWorld();
  startSoloHost(w, { info: INFO });
  N.startHost(w, INFO, { seed: 3, max: 4 });
  assert.equal(w.coopSolo, false);
  assert.equal(w.coopRole, 'host');
  assert.ok(w.coopNet);
  N.stopCoopNet(w);
});

t('stoppen zonder sessie doet niets', () => {
  assert.equal(stopSoloHost(mkWorld()), false);
  assert.equal(stopSoloHost(null), false);
});

// ADR 0024: de sessie van één is besloten en heeft ruimte voor alleen plek 0. Deze test bewijst de
// beloftes die de rest van het spel op de hub bouwt: geen tweede plek, geen aankondiging, niets naar buiten.
t('ADR 0024: ruimte voor alleen plek 0, niets naar buiten', () => {
  const w = mkWorld();
  // Niets mag een verbinding openen: een sessie van één kondigt zich niet aan en opent geen poort.
  const OrigWS = globalThis.WebSocket, OrigPC = globalThis.RTCPeerConnection;
  let verbindingen = 0;
  const nep = function () { verbindingen++; throw new Error('geen verbinding in een sessie van één'); };
  globalThis.WebSocket = nep; globalThis.RTCPeerConnection = nep;
  try {
    const net = startSoloHost(w, { info: INFO, seed: 7 });
    assert.ok(net, 'de sessie van één start');
    assert.equal(net.hub.roster.max, 1, 'ruimte voor één speler: plek 0, geen gasten');
    assert.equal(net.hub.roster.spelers.length, 1, 'alleen plek 0');
    assert.equal(heeftPlek(net.hub.roster), false, 'de sessie is vol');
    assert.equal(wijsPlekToe(net.hub.roster), null, 'een gast kan geen plek krijgen');
    assert.equal(net.hub.openbaar, null, 'geen openbare aankondiging');
    for (let i = 0; i < 600; i++) { w.time += 1 / 60; N.tickCoopNet(w, 1 / 60); }
    assert.equal(verbindingen, 0, 'geen WebSocket en geen RTCPeerConnection');
    assert.equal(w.coopRole, 'host', 'de host is plek 0');
    assert.equal(w.coopNet, net, 'de sessie loopt nog');
  } finally {
    if (OrigWS === undefined) delete globalThis.WebSocket; else globalThis.WebSocket = OrigWS;
    if (OrigPC === undefined) delete globalThis.RTCPeerConnection; else globalThis.RTCPeerConnection = OrigPC;
  }
  stopSoloHost(w);
});

t('ADR 0024: een echte sessie stopt de solo-sessie voor hij begint', () => {
  // main.js: wie Samen spelen opent, stopt eerst de sessie van één (pauzemenu, hoofdmenu, openbare lijst).
  const w = mkWorld();
  startSoloHost(w, { info: INFO });
  const solo = w.coopNet;
  stopSoloHost(w); // de volgorde van het Samen-scherm
  assert.equal(w.coopNet, null); assert.equal(w.coopSolo, false);
  const echt = N.startHost(w, INFO, { seed: 3, max: 4 });
  assert.ok(echt && echt !== solo.hub, 'de echte sessie is een nieuwe hub');
  assert.equal(echt.roster.max, 4, 'een echte sessie houdt de gewone ruimte');
  assert.equal(isSoloHost(w), false, 'en is geen sessie van één meer');
  assert.equal(w.coopNet.hub, echt);
  N.stopCoopNet(w);
});

console.log(`coopsolo_test: ${n} controles ok`);





