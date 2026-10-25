// Samen spelen (#428): de eigen voertuigen van een gast gaan bij het aansluiten opzij en komen bij het verlaten terug, zonder Electron:
//   node scripts/coopvoertuigen_test.mjs
import assert from 'node:assert/strict';
import { createLink } from '../game/js/net/memtransport.js';
import * as N from '../game/js/coopnet.js';
import { coopStep } from '../game/js/coopglue.js';
import { zetDeelHaken, nieuweDeelStaat } from '../game/js/coopbezit.js';

let n = 0;
const t = (name, f) => { f(); n++; console.log('ok  ' + name); };
const INFO = N.handshakeInfo({ tiles: 'abc', story: 'oud' });
const toets = () => { const s = new Set(); return { s, wasPressed: (k) => s.delete(k), isDown: () => false, axis: () => [0, 0] }; };
const mkWorld = (extra = {}) => ({ player: { x: 0, y: 0, angle: 0, character: 'tammo', vx: 0, vy: 0 }, companion: { x: 1, y: 1, angle: 0, character: 'anita', vx: 0, vy: 0, radius: 0.4 }, coop: { local: true }, money: 0, wanted: 0, camYaw: 0, time: 0, clock: 12, messages: [], addMessage(m) { this.messages.push(m); }, input: toets(), vehicles: [], ...extra });
const voertuigen = (aantal, vooraf = 'v') => Array.from({ length: aantal }, (_, i) => ({ id: `${vooraf}${i}`, x: 500 + i * 7, y: 40, angle: 0, speed: 0, model: { len: 4 }, isBoat: i % 20 === 19, isHeroCar: i === 0 }));

function avond() {
  const hw = mkWorld({ vehicles: voertuigen(12, 'host') });
  N.startHost(hw, INFO, { seed: 5 });
  const link = createLink({ latency: 0.03, jitter: 0.01, loss: 0, seed: 11 });
  N.addGuest(hw, link.a);
  const eigen = voertuigen(62, 'eigen');
  const gw = mkWorld({ player: { x: 0, y: 0, angle: 0, character: 'anita', vx: 0, vy: 0 }, companion: { x: 1, y: 1, angle: 0, character: 'tammo' }, vehicles: eigen.slice() });
  const lijst = gw.vehicles;
  N.startClient(gw, link.b, INFO, {});
  const step = (secs) => {
    for (let k = 0; k < Math.round(60 * secs); k++) {
      if (!hw.paused && !hw.companion.inVehicle) coopStep(hw.companion, 1 / 60, hw, hw.coopMove || ((q, d) => { q.x += q.vx * d; q.y += q.vy * d; }));
      N.tickCoopNet(hw, 1 / 60);
      if (gw.coopNet) N.tickCoopNet(gw, 1 / 60);
      link.advance(1 / 60); gw.time += 1 / 60; hw.time += 1 / 60;
    }
  };
  return { hw, gw, eigen, lijst, step };
}

t('voor het aansluiten staat alles nog op zijn plek; daarna zijn de 62 eigen voertuigen opzij (ook de auto en de boten)', () => {
  const s = avond();
  assert.equal(s.gw.vehicles.length, 62, 'nog niet aangesloten: niets verplaatst');
  s.step(3);
  assert.ok(s.gw.coopNet && s.gw.coopNet.joined, 'aangesloten');
  assert.equal(s.gw.vehicles.length, 0, 'geen bevroren eigen verkeer meer in world.vehicles');
  assert.equal(s.gw.vehicles, s.lijst, 'dezelfde array: andere modules houden hem vast');
  assert.equal(s.gw.coopNet.eigenVoertuigen.length, 62);
  assert.ok(s.gw.coopNet.eigenVoertuigen.some((v) => v.isHeroCar) && s.gw.coopNet.eigenVoertuigen.some((v) => v.isBoat), 'eigen auto en boten zijn bewaard');
  s.step(3); assert.equal(s.gw.coopNet.eigenVoertuigen.length, 62, 'de volgende ticks laten het zo');
  assert.equal(N.zetEigenVoertuigenOpzij(s.gw), 0, 'twee keer opzij zetten verliest niets');
  assert.equal(s.hw.vehicles.length, 12, 'de wereld van de host blijft zoals hij was');
});

t('verlaten: dezelfde voertuigen komen terug, en wat de sessie erbij zette is weg (geen dubbele voertuigen)', () => {
  const s = avond(); s.step(3);
  s.gw.vehicles.push({ id: 'sessie', x: 0, y: 0, model: { len: 4 } }); // iets dat er in de sessie in kwam
  N.stopCoopNet(s.gw);
  assert.equal(s.gw.vehicles.length, 62);
  assert.deepEqual(s.gw.vehicles.map((v) => v.id), s.eigen.map((v) => v.id));
  assert.ok(s.gw.vehicles.every((v, i) => v === s.eigen[i]), 'hetzelfde object, ook voor de eigen auto (isHeroCar) en de boten');
  assert.equal(s.gw.vehicles, s.lijst);
});

t('opnieuw aansluiten werkt en na elk verlaten is alles terug (ook na een host-overdracht: eerst stoppen, dan startHost)', () => {
  const s = avond(); s.step(3);
  N.stopCoopNet(s.gw);
  // de overdracht (coophostwisselnet.js): stopCoopNet, dan startHost met de eigen wereld
  N.startHost(s.gw, INFO, { seed: 9 });
  assert.equal(s.gw.vehicles.length, 62, 'de nieuwe host speelt met zijn eigen voertuigen');
  N.stopCoopNet(s.gw); assert.equal(s.gw.vehicles.length, 62);
  // en opnieuw als gast
  const link = createLink({ latency: 0.03, jitter: 0.01, loss: 0, seed: 3 });
  N.startHost(s.hw, INFO, { seed: 6 }); // de host van deze avond begint een nieuwe sessie
  N.addGuest(s.hw, link.a);
  N.startClient(s.gw, link.b, INFO, {});
  for (let k = 0; k < 240; k++) { N.tickCoopNet(s.hw, 1 / 60); if (s.gw.coopNet) N.tickCoopNet(s.gw, 1 / 60); link.advance(1 / 60); s.gw.time += 1 / 60; s.hw.time += 1 / 60; }
  assert.ok(s.gw.coopNet.joined); assert.equal(s.gw.vehicles.length, 0);
  N.stopCoopNet(s.gw); assert.equal(s.gw.vehicles.length, 62, 'tweede keer ook terug');
  assert.ok(s.gw.vehicles.every((v, i) => v === s.eigen[i]));
});

t('de oude host die gast wordt: zijn eigen lijst (verkeer en eigen auto) gaat opzij en komt terug', () => {
  const hw = mkWorld({ vehicles: voertuigen(30, 'oudhost') });
  const lijst = hw.vehicles, kopie = lijst.slice();
  const nn = { role: 'client' };
  assert.equal(N.zetEigenVoertuigenOpzij(hw, nn), 30); assert.equal(hw.vehicles.length, 0);
  assert.equal(N.zetEigenVoertuigenTerug(hw, nn), 30);
  assert.ok(hw.vehicles.every((v, i) => v === kopie[i])); assert.equal(hw.vehicles, lijst);
  assert.equal(N.zetEigenVoertuigenTerug(hw, nn), 0, 'terugzetten zonder opzij zetten doet niets');
  assert.equal(N.zetEigenVoertuigenOpzij({ vehicles: undefined }, {}), 0, 'een wereld zonder lijst breekt niets');
});

t('de gast bezorgt zijn eigen auto, boot en heli: de host zet ze neer, iedereen ziet ze en ze gaan weg als de gast gaat (#449)', () => {
  const s = avond(); s.step(3);
  // de wereldhaken van main.js, met een nepwereld: geen kaart, geen parkeerplek zoeken
  const SPECS = {
    hero: { label: 'Fjord Escapade', kind: 'car', color: '#a11f1f', model: { name: 'escort', len: 4, wid: 1.65, maxSpeed: 50 } },
    sloep: { label: 'Sloep Nait Soezen', kind: 'boat', color: '#e8e6e0', model: { name: 'boat', len: 5, wid: 1.9, maxSpeed: 7 } },
    wiekenwubbo: { label: 'Wieken Wubbo', kind: 'heli', color: '#b8322a', model: { name: 'heli', len: 8.8, wid: 2.1, maxSpeed: 40 } },
  };
  const gevraagd = [];
  zetDeelHaken({
    spec: (key) => SPECS[key] || null,
    plek: (w, x, y, model) => { gevraagd.push(model.name); return { x: 500, y: 44, angle: 0 }; },
    maak: (w, g, x, y, a) => { const v = { x, y, angle: a, model: { ...g.spec.model }, upgrades: g.upgrades, health: g.health }; w.vehicles.push(v); return v; },
  });
  s.hw.coop.remote = true; // de gast zit op de plek van de metgezel (zoals in een echte sessie)
  s.gw.coopBezit = nieuweDeelStaat();
  const g = { id: 'hero', kind: 'car', label: 'Fjord Escapade', model: 'Escapade', color: '#a11f1f', upgrades: [], dents: [], health: 100, flat: false };
  const r = s.gw.coopBezitVraag(g);
  assert.equal(r.ok, true);
  s.step(1);
  const bezorgd = s.hw.vehicles.filter((v) => v.coopBezit);
  assert.equal(bezorgd.length, 1, 'de host heeft er een kopie bij');
  assert.equal(bezorgd[0].coopBezit.slot, 1);
  assert.equal(bezorgd[0].coopBezit.recht, 'iedereen', 'de standaard: de gast deelt hem');
  assert.equal(s.gw.vehicles.length, 0, 'de gast zet niets in zijn eigen wereld');
  // de boot en de heli gaan met hetzelfde bericht, elk met hun eigen soort (#449)
  assert.equal(s.gw.coopBezitVraag({ id: 'sloep', kind: 'boat', label: 'Sloep Nait Soezen', color: '#e8e6e0', upgrades: [], dents: [], health: 100, flat: false }).ok, true);
  s.step(1);
  assert.equal(s.hw.vehicles.filter((v) => v.coopBezit && v.coopBezit.id === 'sloep').length, 1, 'de boot staat er bij');
  assert.equal(gevraagd[1], 'boat', 'de host zocht water met het model van de boot');
  s.step(2);
  assert.equal(s.hw.vehicles.filter((v) => v.coopBezit).length, 2, 'de volgende ticks zetten er geen tweede bij');
  N.stopCoopNet(s.hw); // de sessie stopt: de kopie gaat mee terug
  assert.equal(s.hw.vehicles.filter((v) => v.coopBezit).length, 0);
});

console.log(`coopvoertuigen_test: ${n}/5 ok`);
