// Samen spelen (#95): de wereld van de host delen met gasten (game/js/coopworld.js) + codec en hub.
import assert from 'node:assert/strict';
import * as W from '../game/js/coopworld.js';
import { encodeSnapshot, decodeSnapshot } from '../game/js/net/codec.js';

let n = 0;
const t = (name, f) => { f(); n++; };

const veh = (id, x, y, extra = {}) => ({ id, x, y, angle: 0.5, model: { len: 4.2 }, ...extra });

t('voertuigsoorten: bus, politie, boot, fiets, vrachtwagen, gewone auto', () => {
  const S = W.VOERTUIG_SOORTEN;
  assert.equal(S[W.voertuigSoort({ isBus: true })], 'bus'); assert.equal(S[W.voertuigSoort({ isPolice: true })], 'politie');
  assert.equal(S[W.voertuigSoort({ isBoat: true })], 'boot'); assert.equal(S[W.voertuigSoort({ isBike: true, model: {} })], 'fiets');
  assert.equal(S[W.voertuigSoort({ isBike: true, model: { motorbike: true } })], 'motor'); assert.equal(S[W.voertuigSoort({ isScooter: true })], 'scooter');
  assert.equal(S[W.voertuigSoort({ model: { len: 9 } })], 'vracht'); assert.equal(S[W.voertuigSoort({ model: { len: 5.2 } })], 'bakkie');
  assert.equal(S[W.voertuigSoort({ model: { len: 4 } })], 'auto');
  for (const s of S) assert.ok(W.VOERTUIG_MATEN[s], s);
});
t('alleen voertuigen dicht bij een speler, nabije eerst; wrakken en rommel niet', () => {
  const world = { vehicles: [veh(1, 10, 0), veh(2, 500, 0), veh(3, 100, 0), veh(4, 0, 20, { wrecked: true }), veh(5, NaN, 0), null] };
  const e = W.verzamelEntiteiten(world, [{ x: 0, y: 0 }]);
  assert.deepEqual(e.map((x) => x.id), [1, 3]);
  const twee = W.verzamelEntiteiten(world, [{ x: 0, y: 0 }, { x: 500, y: 0 }]);
  assert.deepEqual(twee.map((x) => x.id).sort(), [1, 2, 3]);
});
t('het doel van de lopende opdracht gaat mee, alleen als hij actief is', () => {
  const world = { vehicles: [], mission: { phase: 'active', marker: { x: 12, y: 34 } } };
  assert.deepEqual(W.verzamelEntiteiten(world, [{ x: 0, y: 0 }]), [{ id: W.ID_DOEL, kind: W.SOORT_DOEL, x: 12, z: 34, angle: 0 }]);
  assert.deepEqual(W.verzamelEntiteiten({ vehicles: [], mission: { phase: 'idle', marker: { x: 1, y: 1 } } }, [{ x: 0, y: 0 }]), []);
});
t('maximum aantal entiteiten (de codec kent er 64)', () => {
  const world = { vehicles: Array.from({ length: 200 }, (_, i) => veh(i + 1, i, 0)) };
  assert.equal(W.verzamelEntiteiten(world, [{ x: 0, y: 0 }]).length, W.MAX_ENTITEITEN);
});
t('rondreis door de codec: voertuigen en doel komen bij de gast aan en worden tekenbare blokken', () => {
  const world = { vehicles: [veh(7, 10, 5, { isBus: true }), veh(8, 20, 5, { isPolice: true })], mission: { phase: 'active', marker: { x: 100, y: 200 } } };
  const ents = W.verzamelEntiteiten(world, [{ x: 0, y: 0 }]);
  const buf = encodeSnapshot(1, 1, 0, { players: [{ slot: 0, x: 0, y: 0, z: 0, angle: 0, alive: true, health: 100 }], shared: { money: 0, wanted: 0, clock: 0 }, mission: { stage: 0, state: 'run', present: 3 }, entities: ents });
  const snap = decodeSnapshot(buf);
  const r = W.leesEntiteiten(snap.entities);
  assert.deepEqual(r.voertuigen.map((v) => v.soort).sort(), ['bus', 'politie']);
  assert.ok(r.voertuigen.every((v) => v.len > 1 && v.wid > 0.4 && /^#/.test(v.kleur)));
  assert.equal(r.doelen.length, 1); assert.ok(Math.abs(r.doelen[0].x - 100) < 0.01 && Math.abs(r.doelen[0].y - 200) < 0.01);
});
t('onbekende soorten van een nieuwere host worden genegeerd', () => {
  const r = W.leesEntiteiten([{ id: 1, kind: 77, x: 0, z: 0, angle: 0 }, { id: 2, kind: 0, x: 1, z: 2, angle: 0 }]);
  assert.equal(r.voertuigen.length, 1); assert.deepEqual(r.doelen, []);
});
t('uiterlijk van de host: model, kleur, bijkleur, deuken en soorten gaan heel mee (#428)', () => {
  const alles = [
    veh(1, 5, 0, { model: { name: 'sedan', len: 4.3, wid: 1.8, color: '#7a1f1f' }, dentLog: [[1.5, 0.2, 0.7], [-1.0, -0.5, 0.3]], indicator: 'left', flat: true }),
    veh(2, 6, 0, { isPolice: true, model: { name: 'police', len: 4.3, wid: 1.8, color: '#1c1c1c' } }),
    veh(3, 7, 0, { isBus: true, model: { name: 'bus', len: 11.2, wid: 2.55, trailer: 6.8, color: '#132a44', stripe: '#3fc6d4' } }),
    veh(4, 8, 0, { isBike: true, model: { name: 'bike', len: 1.75, wid: 0.5, color: '#2b2b2b', rider: '#7a2e2e' } }),
    veh(5, 9, 0, { isBoat: true, model: { kind: 'zeeschip', soort: 'tanker', name: 'boat', len: 98, wid: 15.4, color: '#2a2d33', cabin: '#e8e6e0' } }),
    veh(6, 10, 0, { isHeli: true, z: 40, rotor: 1, model: { name: 'heli', len: 8.8, wid: 2.1 } }),
    veh(7, 11, 0, { isPlane: true, z: 90, model: { name: 'plane', len: 8, wid: 10.6, color: '#e9e4d3' } }),
    veh(8, 12, 0, { isScooter: true, model: { name: 'motor', motorbike: 'naked', len: 2.05, wid: 0.72, color: '#2f5a8f', rider: '#3a3c40' } }),
    veh(9, 13, 0, { model: { name: 'truck', tank: true, len: 8, wid: 2.5, color: '#d9dcdf' } }),
    veh(10, 14, 0, { isBoat: true, model: { kind: 'dinghy', soort: 'zeilboot', zeil: true, name: 'boat', len: 5.2, wid: 1.9, color: '#f2f0ea', cabin: '#2a8fb0' } }),
  ];
  const world = { vehicles: alles, wanted: 2 };
  const cache = new Map(); const gezien = new Set();
  for (let k = 0; k < 6; k++) { // een paar snapshots: de uiterlijkrecords gaan roulerend mee
    const ents = W.verzamelEntiteiten(world, [{ x: 0, y: 0 }]);
    assert.ok(ents.looks.length <= 4);
    const d = decodeSnapshot(encodeSnapshot(k, k, 0, { players: [], shared: { money: 0, wanted: 0, clock: 0 }, mission: { stage: 0, state: 'run', present: 3 }, entities: ents, looks: ents.looks }), cache);
    for (const l of d.looks) gezien.add(l.id);
    if (k === 5) {
      const r = W.leesEntiteiten(d.entities);
      for (const v of r.voertuigen) assert.ok(v.look, 'voertuig ' + v.id + ' heeft zijn uiterlijk');
      const per = Object.fromEntries(r.voertuigen.map((v) => [v.id, v]));
      const s1 = W.uiterlijkSpec(per[1].look);
      assert.equal(s1.model.name, 'sedan'); assert.equal(s1.model.color, '#7a1f1f'); assert.equal(s1.dentLog.length, 2); assert.ok(Math.abs(s1.dentLog[0][0] - 1.5) < 0.06);
      assert.equal(per[1].ind, 'left'); assert.equal(per[1].lek, true);
      assert.ok(per[2].sirene, 'politie met wanted > 0: zwaailicht aan'); assert.equal(W.uiterlijkSpec(per[2].look).isPolice, true);
      const bus = W.uiterlijkSpec(per[3].look); assert.equal(bus.isBus, true); assert.equal(bus.model.trailer, 6.8); assert.equal(bus.model.stripe, '#3fc6d4');
      assert.equal(W.uiterlijkSpec(per[4].look).model.rider, '#7a2e2e');
      const boot = W.uiterlijkSpec(per[5].look); assert.equal(boot.isBoat, true); assert.equal(boot.model.soort, 'tanker'); assert.equal(boot.model.kind, 'zeeschip'); assert.equal(boot.model.cabin, '#e8e6e0'); assert.ok(boot.model.len > 97);
      const heli = W.uiterlijkSpec(per[6].look); assert.equal(heli.isHeli, true); assert.ok(Math.abs(per[6].hoogteZ - 40) < 0.06 && per[6].rotor === 1);
      assert.equal(W.uiterlijkSpec(per[7].look).isPlane, true); assert.ok(Math.abs(per[7].hoogteZ - 90) < 0.06);
      assert.equal(W.uiterlijkSpec(per[8].look).model.motorbike, 'naked');
      assert.equal(W.uiterlijkSpec(per[9].look).model.tank, true);
      const zeil = W.uiterlijkSpec(per[10].look); assert.equal(zeil.model.zeil, true); assert.equal(zeil.model.soort, 'zeilboot');
    }
  }
  assert.equal(gezien.size, 10, 'alle voertuigen kregen binnen een paar snapshots hun uiterlijk');
});
t('een nieuw voertuig krijgt zijn uiterlijk meteen, daarna roulerend (en verdwenen voertuigen worden vergeten)', () => {
  const world = { vehicles: Array.from({ length: 30 }, (_, i) => veh(i + 1, i, 1, { model: { name: 'hatch', len: 3.8, wid: 1.7, color: '#c7c9cc' } })) };
  const a = W.verzamelEntiteiten(world, [{ x: 0, y: 0 }]).looks.map((l) => l.id);
  assert.equal(a.length, 4, 'hoogstens MAX_LOOKS'); assert.deepEqual(a, [1, 2, 3, 4]);
  world.vehicles.push(veh(99, 3, 3, { model: { name: 'van', len: 5, wid: 2, color: '#d9d9d9' } }));
  W.verzamelEntiteiten(world, [{ x: 0, y: 0 }]);
  const c = W.verzamelEntiteiten(world, [{ x: 0, y: 0 }]).looks.map((l) => l.id);
  assert.ok(c.includes(99), 'een nieuw voertuig gaat voor');
});
t('treinen: de host stuurt het midden en de snelheid, de gast leest de route terug', () => {
  const world = { vehicles: [] };
  const e = W.verzamelEntiteiten(world, [{ x: 0, y: 0 }], { treinen: [{ id: 3, x: 50, y: 20, v: -12, halfLen: 40 }, { id: 4, x: 900, y: 0, v: 5, halfLen: 40 }] });
  assert.equal(e.length, 1); assert.equal(e[0].kind, W.SOORT_TREIN); assert.equal(e[0].id, W.ID_TREIN0 + 3);
  const d = decodeSnapshot(encodeSnapshot(1, 1, 0, { players: [], shared: { money: 0, wanted: 0, clock: 0 }, mission: { stage: 0, state: 'run', present: 3 }, entities: e, looks: e.looks }));
  const r = W.leesEntiteiten(d.entities);
  assert.equal(r.voertuigen.length, 0); assert.deepEqual(r.treinen.map((x) => [x.route, x.x, x.y, x.v]), [[3, 50, 20, -12]]);
});
t('veel voertuigen en een trein: de trein past erbij en het maximum blijft gelden', () => {
  const world = { vehicles: Array.from({ length: 200 }, (_, i) => veh(i + 1, i, 0)) };
  const e = W.verzamelEntiteiten(world, [{ x: 0, y: 0 }], { treinen: [{ id: 0, x: 10, y: 10, v: 3, halfLen: 30 }] });
  assert.equal(e.length, W.MAX_ENTITEITEN); assert.equal(e[0].kind, W.SOORT_TREIN);
});
t('opdracht-bericht: alleen bij verandering; begin en einde; gast controleert wat binnenkomt', () => {
  let huidig = null;
  const pub = { phase: 'active', label: 'Berend telt de krassen', type: 'delivery', index: 3 };
  let r = W.missieBericht(huidig, pub); assert.deepEqual(r.event, { k: 'missie', actief: true, label: 'Berend telt de krassen', type: 'delivery', index: 3, stap: '' }); huidig = r.huidig;
  assert.equal(W.missieBericht(huidig, pub).event, null, 'geen herhaling');
  r = W.missieBericht(huidig, { phase: 'idle' }); assert.deepEqual(r.event, { k: 'missie', actief: false }); assert.equal(r.huidig, null);
  assert.equal(W.missieBericht(null, { phase: 'idle' }).event, null);
  assert.equal(W.leesMissieBericht({ k: 'missie', actief: true, label: 'x'.repeat(100) }), null);
  assert.equal(W.leesMissieBericht({ k: 'iets' }), null);
  assert.deepEqual(W.leesMissieBericht({ k: 'missie', actief: false }), { actief: false });
});
t('tekst voor de gast: Nederlands; extra spelers lopen mee in de open wereld', () => {
  const m = { actief: true, label: 'Berend telt de krassen' };
  assert.match(W.missieTekst(m, 'wereld'), /De ander speelt: Berend telt de krassen\. Jij loopt mee in de open wereld/);
  assert.match(W.missieTekst(m, 'hoofdrol'), /Doe mee waar het kan/);
  assert.equal(W.missieTekst({ actief: false }), '');
});
t('voetgangers van de host: dichtbij, met een vast id, agenten herkenbaar, doden en verre niet; voertuigen houden hun plekken', () => {
  const ped = (x, y, extra = {}) => ({ x, y, angle: 1, state: 'wander', health: 30, isCop: false, ...extra });
  const a = ped(10, 0), b = ped(30, 5, { isCop: true }), dood = ped(5, 5, { state: 'dead' }), ver = ped(300, 0), kapot = ped(1, 1, { health: 0 });
  const world = { vehicles: Array.from({ length: 60 }, (_, i) => veh(i + 1, 5 + i, 3)), pedestrians: [a, b, dood, ver, kapot, null, ped(NaN, 0)] };
  const e = W.verzamelEntiteiten(world, [{ x: 0, y: 0 }]);
  const peds = e.filter((x) => x.kind === W.SOORT_VOETGANGER || x.kind === W.SOORT_AGENT);
  assert.deepEqual(peds.map((p) => p.kind).sort(), [W.SOORT_VOETGANGER, W.SOORT_AGENT], 'een voetganger en een agent; geen dode, geen verre, geen rommel');
  assert.ok(e.length <= W.MAX_ENTITEITEN && e.filter((x) => x.kind < 12).length >= 12, 'de voertuigen houden minstens 12 plekken');
  const id1 = peds.find((p) => p.kind === W.SOORT_VOETGANGER).id;
  assert.equal(W.verzamelEntiteiten(world, [{ x: 0, y: 0 }]).find((x) => x.kind === W.SOORT_VOETGANGER).id, id1, 'zelfde voetganger, zelfde id');
  assert.ok(id1 >= 0x8000 && !e.some((x) => x.kind < 12 && x.id === id1), 'voetgangers delen geen id met voertuigen');
  const veel = { vehicles: [], pedestrians: Array.from({ length: 80 }, (_, i) => ped(i % 40, Math.floor(i / 40))) };
  assert.equal(W.verzamelEntiteiten(veel, [{ x: 0, y: 0 }]).length, W.MAX_VOETGANGERS, 'niet meer dan 20 voetgangers');
  const g = W.leesEntiteiten(e); assert.equal(g.voetgangers.length, 2); assert.equal(g.voetgangers.filter((p) => p.agent).length, 1);
  const snap = { players: [], shared: { money: 0, wanted: 0, clock: 0 }, mission: { stage: 0, state: 'run', present: 3 }, entities: e };
  const back = decodeSnapshot(encodeSnapshot(1, 1, 0, snap)); assert.equal(back.entities.length, e.length, 'past in een snapshot');
});
t('scène van de host: filmpje, regel en keuze worden gereinigd en alleen bij verandering verstuurd', () => {
  const sc = { filmpje: true, regel: { wie: 'Tammo', tekst: 'Dat gaat nooit goed.' }, keuze: { tekst: 'Wat doe je?', opties: ['Rijden', 'Lopen', '', 'x'.repeat(200)] } };
  const r = W.schoonScene(sc);
  assert.equal(r.filmpje, true); assert.deepEqual(r.regel, { wie: 'Tammo', tekst: 'Dat gaat nooit goed.' });
  assert.equal(r.keuze.opties.length, 3); assert.equal(r.keuze.opties[2].length, 80, 'lange tekst wordt afgekapt');
  assert.deepEqual(W.schoonScene(null), W.SCENE_LEEG); assert.deepEqual(W.schoonScene({ regel: { tekst: 12 }, keuze: { opties: 'nee' } }), W.SCENE_LEEG);
  const a = W.sceneBericht(null, sc); assert.equal(a.event.k, 'scene'); assert.equal(a.event.filmpje, true);
  assert.equal(W.sceneBericht(a.huidig, sc).event, null, 'zelfde stand: geen bericht');
  const b = W.sceneBericht(a.huidig, { filmpje: false }); assert.equal(b.event.filmpje, false); assert.ok(W.sceneLeeg(b.huidig));
  assert.equal(W.sceneBericht(null, null).event, null, 'leeg naar leeg: niets');
  assert.deepEqual(W.leesSceneBericht({ k: 'scene', filmpje: true }), { filmpje: true, pauze: false, regel: null, keuze: null });
  assert.equal(W.sceneLeeg(W.schoonScene({ pauze: true })), false, 'een pauze van de host is ook iets om te melden'); assert.equal(W.sceneBericht(null, { pauze: true }).event.pauze, true); assert.equal(W.leesSceneBericht({ k: 'x' }), null);
  assert.ok(JSON.stringify(W.schoonScene({ filmpje: true, regel: { wie: 'w'.repeat(99), tekst: 't'.repeat(999) }, keuze: { tekst: 'k'.repeat(999), opties: Array(9).fill('o'.repeat(99)) } })).length < 1500, 'past ruim in een bericht');
});
console.log(`coopworld_test: ${n}/${n} ok`);
