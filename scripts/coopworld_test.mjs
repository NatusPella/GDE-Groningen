// Samen spelen (#95): de wereld van de host delen met gasten (game/js/coopworld.js) + codec en hub.
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as W from '../game/js/coopworld.js';
import { encodeSnapshot, decodeSnapshot } from '../game/js/net/codec.js';

let n = 0;
const t = (name, f) => { f(); n++; };
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// De hoek gaat als 0..2π over de lijn: een negatieve hoek van de host komt als 2π − x terug.
const hoekVerschil = (a, b) => { let d = (a - b) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };

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
  assert.deepEqual(W.verzamelEntiteiten({ vehicles: [], mission: { phase: 'cooldown', marker: { x: 1, y: 1 } } }, [{ x: 0, y: 0 }]), []);
  // niet actief maar wel klaar om te beginnen: de gast ziet het beginpunt, geen doel (#434)
  assert.deepEqual(W.verzamelEntiteiten({ vehicles: [], mission: { phase: 'idle', index: 3, marker: { x: 1, y: 1 } } }, [{ x: 0, y: 0 }]), [{ id: W.ID_START0 + 3, kind: W.SOORT_START, x: 1, z: 1, angle: 0 }]);
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
t('de leider van de groep gaat mee in het opdracht-bericht (#492); een ouder bericht zonder leider blijft werken', () => {
  const pub = { phase: 'active', label: 'Het Loket', type: 'stages', index: 3, progressText: 'Stap in de auto', id: '3|Het Loket' };
  const met = W.missieBericht(null, pub, 2);
  assert.equal(met.event.leider, 2); assert.equal(met.huidig.leider, 2);
  assert.equal(W.leesMissieBericht(met.event).leider, 2);
  // een oud bericht (zonder leider) leest als voorheen; een ongeldige leider telt niet
  assert.equal(W.leesMissieBericht({ k: 'missie', actief: true, label: 'Het Loket' }).leider, undefined);
  assert.equal(W.leesMissieBericht({ k: 'missie', actief: true, label: 'Het Loket', leider: -1 }).leider, undefined);
  assert.equal(W.leesMissieBericht({ k: 'missie', actief: true, label: 'Het Loket', leider: 64 }).leider, undefined);
  assert.equal(W.leesMissieBericht({ k: 'missie', actief: true, label: 'Het Loket', leider: 1.5 }).leider, undefined);
  // alleen de late-instapvlag verandert: nog steeds geen bericht; een andere leider is één bericht met dezelfde stand
  const eerste = met.huidig;
  assert.equal(W.missieBericht(eerste, { ...pub, lateInstap: false }, 2).event, null);
  const wissel = W.missieBericht(eerste, pub, 1);
  assert.equal(wissel.event.actief, true); assert.equal(wissel.event.leider, 1);
  assert.equal(wissel.event.label, 'Het Loket'); assert.equal(wissel.event.index, 3); assert.equal(wissel.event.id, '3|Het Loket');
  assert.equal(W.missieBericht(wissel.huidig, pub, 1).event, null, 'dezelfde leider geeft geen herhaling');
});
t('tekst voor de gast: Nederlands; extra spelers lopen mee in de open wereld', () => {
  const m = { actief: true, label: 'Berend telt de krassen' };
  assert.match(W.missieTekst(m, 'wereld'), /De ander speelt: Berend telt de krassen\. Jij loopt mee in de open wereld/);
  assert.match(W.missieTekst(m, 'hoofdrol'), /Doe mee waar het kan/);
  assert.equal(W.missieTekst({ actief: false }), '');
});
t('voetgangers van de host: dichtbij, met een vast id, agenten herkenbaar, een dode ligt er nog (#428), verre niet; voertuigen houden hun plekken', () => {
  const ped = (x, y, extra = {}) => ({ x, y, angle: 1, state: 'wander', health: 30, isCop: false, ...extra });
  const a = ped(10, 0), b = ped(30, 5, { isCop: true }), dood = ped(5, 5, { state: 'dead', health: 0 }), ver = ped(300, 0), kapot = ped(1, 1, { health: 0 });
  const world = { vehicles: Array.from({ length: 60 }, (_, i) => veh(i + 1, 5 + i, 3)), pedestrians: [a, b, dood, ver, kapot, null, ped(NaN, 0)] };
  const e = W.verzamelEntiteiten(world, [{ x: 0, y: 0 }]);
  const peds = e.filter((x) => x.kind === W.SOORT_VOETGANGER || x.kind === W.SOORT_AGENT);
  assert.deepEqual(peds.map((p) => p.kind).sort(), [W.SOORT_VOETGANGER, W.SOORT_VOETGANGER, W.SOORT_AGENT], 'een voetganger, de dode (die ligt) en een agent; geen verre, geen rommel, geen lijk zonder staat');
  const mp = W.verzamelEntiteiten({ ...world, pedestrians: [ped(90, 0, { missionCrowd: true }), ped(90, 2)] }, [{ x: 0, y: 0 }]).filter((x) => x.kind === W.SOORT_VOETGANGER);
  assert.equal(mp.length, 1, 'iemand van een opdracht op 90 m gaat mee, een gewone voetganger niet');
  assert.ok(e.length <= W.MAX_ENTITEITEN && e.filter((x) => x.kind < 12).length >= 12, 'de voertuigen houden minstens 12 plekken');
  const id1 = peds.find((p) => p.kind === W.SOORT_VOETGANGER).id;
  assert.equal(W.verzamelEntiteiten(world, [{ x: 0, y: 0 }]).find((x) => x.kind === W.SOORT_VOETGANGER).id, id1, 'zelfde voetganger, zelfde id');
  assert.ok(id1 >= 0x8000 && !e.some((x) => x.kind < 12 && x.id === id1), 'voetgangers delen geen id met voertuigen');
  const veel = { vehicles: [], pedestrians: Array.from({ length: 80 }, (_, i) => ped(i % 40, Math.floor(i / 40))) };
  assert.equal(W.verzamelEntiteiten(veel, [{ x: 0, y: 0 }]).length, W.MAX_VOETGANGERS, 'niet meer dan 20 voetgangers');
  const g = W.leesEntiteiten(e); assert.equal(g.voetgangers.length, 3); assert.equal(g.voetgangers.filter((p) => p.agent).length, 1);
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
t('zonder uiterlijk tekent de gast toch een echt model, ook voor een boot, heli en vliegtuig (#428)', () => {
  for (const soort of W.VOERTUIG_SOORTEN) {
    const spec = W.gokUiterlijk(soort, 7, { len: W.VOERTUIG_MATEN[soort][0], wid: W.VOERTUIG_MATEN[soort][1] });
    if (soort === 'trein') { assert.equal(spec, null, 'een trein komt uit de eigen spoorwegen, niet als voertuig'); continue; }
    assert.ok(spec && spec.model && spec.model.name, soort + ' heeft een gokmodel');
    assert.equal(spec.wrecked, false);
  }
  const boot = W.gokUiterlijk('boot', 3);
  assert.equal(boot.isBoat, true); assert.equal(boot.model.kind, 'sloep'); assert.ok(boot.model.len > 4 && boot.model.wid > 1);
  assert.equal(W.gokUiterlijk('heli', 3).isHeli, true);
  assert.equal(W.gokUiterlijk('overig', 3).isPlane, true);
  assert.equal(W.gokUiterlijk('politie', 3).isPolice, true);
  assert.equal(W.gokUiterlijk('fiets', 3).isBike, true);
  assert.deepEqual(W.gokUiterlijk('auto', 5), W.gokUiterlijk('auto', 5), 'hetzelfde id geeft altijd dezelfde gok');
  assert.equal(W.gokUiterlijk('onbekend', 5), null);
  assert.ok(W.GOK_MODELLEN.includes(W.gokUiterlijk('auto', 5).model.name));
});
t('snapshot en weergave: de gast tekent dezelfde voertuigen, boten en trein als de host (#428)', () => {
  const alles = [
    veh(1, 5, 0, { angle: 0.4, model: { name: 'sedan', len: 4.3, wid: 1.8, color: '#7a1f1f' }, speed: 12.4, steer: 0.3, indicator: 'left' }),
    veh(2, 8, 0, { angle: 1.1, model: { name: 'van', len: 5, wid: 2, color: '#d9d9d9' }, speed: -2.5 }),
    veh(3, 11, 0, { angle: 2.2, isBus: true, model: { name: 'bus', len: 11.2, wid: 2.55, color: '#132a44', stripe: '#3fc6d4' }, speed: 6 }),
    veh(4, 14, 0, { angle: -0.7, isPolice: true, model: { name: 'police', len: 4.4, wid: 1.8, color: '#1c1c1c' }, sirenOn: true }),
    veh(5, 17, 0, { angle: 0.9, isBike: true, model: { name: 'motor', motorbike: 'sport', len: 2.1, wid: 0.8, color: '#2f5a8f', rider: '#3a3c40' }, speed: 9 }),
    veh(6, 20, 0, { angle: 1.6, isScooter: true, model: { name: 'scooter', len: 1.8, wid: 0.7, color: '#e0e0e0', rider: '#7a2e2e' } }),
    veh(7, 23, 0, { angle: 2.8, isBike: true, model: { name: 'bike', len: 1.75, wid: 0.5, color: '#2b2b2b', rider: '#2a8f6a' } }),
    veh(8, 26, 0, { angle: 0.1, isBoat: true, model: { kind: 'sloep', name: 'boat', len: 5.5, wid: 2, color: '#e8e6e0', cabin: '#2f3a44' }, speed: 4.2 }),
    veh(9, 34, 0, { angle: 3.1, isBoat: true, model: { kind: 'zeeschip', soort: 'tanker', name: 'boat', len: 98, wid: 15.4, color: '#2a2d33', cabin: '#e8e6e0' }, speed: 5 }),
    veh(10, 40, 0, { angle: 0.2, isHeli: true, z: 40, rotor: 1, model: { name: 'heli', len: 8.8, wid: 2.1, color: '#b0b0b0' } }),
    veh(11, 44, 0, { angle: -1.4, model: { name: 'truck', len: 9, wid: 2.5, color: '#8a7a5a' }, speed: 7 }),
    veh(12, 48, 0, { angle: 1.9, isPlane: true, z: 90, model: { name: 'plane', len: 8, wid: 10.6, color: '#e9e4d3' } }),
  ];
  const ped = (x, y, extra = {}) => ({ x, y, angle: 0.9, state: 'wander', health: 30, isCop: false, clothing: '#b8473a', skin: '#d9aa82', _lookSeed: 10.5, ...extra });
  const peds = [ped(4, 4), ped(6, 6, { isCop: true }), ped(9, 3, { state: 'dead', health: 0 })];
  const world = { vehicles: alles, pedestrians: peds, wanted: 0, time: 10 };
  const treinen = [{ id: 2, x: 60, y: 0, v: 8, halfLen: 40 }];
  const bij = [{ x: 0, y: 0 }];
  const cache = new Map();
  let gast = null;
  for (let k = 0; k < 8; k++) { // het uiterlijk gaat roulerend mee: na een paar snapshots heeft elk voertuig het
    const ents = W.verzamelEntiteiten(world, bij, { treinen });
    const d = decodeSnapshot(encodeSnapshot(k, k, 0, { players: [], shared: { money: 0, wanted: 0, clock: 10 }, mission: { stage: 0, state: 'run', present: 3 }, entities: ents, looks: ents.looks }), cache);
    assert.ok(d, 'snapshot ' + k + ' leesbaar');
    gast = W.leesEntiteiten(d.entities);
  }
  assert.equal(gast.voertuigen.length, alles.length, 'elk voertuig van de host staat bij de gast');
  const perId = new Map(gast.voertuigen.map((v) => [v.id, v]));
  for (const v of alles) {
    const g = perId.get(v.id);
    assert.ok(g, 'voertuig ' + v.id + ' bij de gast');
    assert.equal(g.soort, W.VOERTUIG_SOORTEN[W.voertuigSoort(v)], 'dezelfde soort');
    assert.ok(Math.abs(g.x - v.x) < 0.01 && Math.abs(g.y - v.y) < 0.01, 'dezelfde plek');
    assert.ok(Math.abs(hoekVerschil(g.angle, v.angle || 0)) < 0.001, 'dezelfde richting');
    assert.ok(Math.abs(g.snelheid - (v.speed || 0)) <= 0.26, 'dezelfde snelheid');
    assert.ok(g.look, 'het uiterlijk van ' + v.id + ' is binnen');
    const spec = W.uiterlijkSpec(g.look), host = W.voertuigUiterlijk(v, v.id);
    assert.equal(spec.model.name, W.VOERTUIG_MODELLEN[host.model], 'hetzelfde model');
    assert.equal(spec.model.color, '#' + (host.color & 0xffffff).toString(16).padStart(6, '0'), 'dezelfde kleur');
    assert.ok(Math.abs(spec.model.len - host.len) < 0.02 && Math.abs(spec.model.wid - host.wid) < 0.13, 'dezelfde maat');
  }
  const boot = perId.get(8); assert.equal(W.uiterlijkSpec(boot.look).isBoat, true, 'een boot is een echt bootmodel');
  assert.equal(perId.get(10).hoogteZ, 40); assert.equal(perId.get(12).hoogteZ, 90, 'helikopter en vliegtuig op hun hoogte');
  // voetgangers: dezelfde id's en plekken in de snapshot, en de gast tekent ze alle drie (de dode ligt)
  assert.deepEqual(gast.voetgangers.map((p) => p.id).sort(), peds.map((p) => W.pedId(p)).sort());
  assert.equal(gast.voetgangers.filter((p) => p.agent).length, 1);
  for (const p of peds) { const g = gast.voetgangers.find((q) => q.id === W.pedId(p)); assert.ok(Math.abs(g.x - p.x) < 0.01 && Math.abs(g.y - p.y) < 0.01); }
  // de trein gaat niet als voertuig mee maar als route: de gast tekent hem met zijn eigen spoorwegen (echt model)
  assert.deepEqual(gast.treinen.map((x) => [x.route, x.x, x.y, x.v]), [[2, 60, 0, 8]]);
  assert.ok(!gast.voertuigen.some((v) => v.soort === 'trein'));
  assert.equal(W.gokUiterlijk('trein'), null);
});
t('de gok is hetzelfde soort model als het echte uiterlijk, ook voor een boot, schip, heli en vliegtuig (#428)', () => {
  const maak = {
    auto: { model: { name: 'sedan', len: 4.3, wid: 1.8, color: '#7a1f1f' } },
    bakkie: { model: { name: 'van', len: 5, wid: 2, color: '#d9d9d9' } },
    bus: { isBus: true, model: { name: 'bus', len: 11, wid: 2.5 } },
    politie: { isPolice: true, model: { name: 'police', len: 4.4, wid: 1.8 } },
    motor: { isBike: true, model: { name: 'bike', motorbike: 'sport', len: 2.1, wid: 0.8 } },
    scooter: { isScooter: true, model: { name: 'scooter', len: 1.8, wid: 0.7 } },
    fiets: { isBike: true, model: { name: 'bike', len: 1.75, wid: 0.5 } },
    boot: { isBoat: true, model: { kind: 'sloep', name: 'boat', len: 5.5, wid: 2, cabin: '#2f3a44' } },
    heli: { isHeli: true, model: { name: 'heli', len: 8.8, wid: 2.1 } },
    vracht: { model: { name: 'truck', len: 9, wid: 2.5 } },
    overig: { isPlane: true, model: { name: 'plane', len: 8, wid: 10.6 } },
  };
  for (const soort of W.VOERTUIG_SOORTEN) {
    if (soort === 'trein') continue; // een trein komt uit de eigen spoorwegen, niet uit de snapshot
    const v = maak[soort]; assert.ok(v, soort);
    assert.equal(W.VOERTUIG_SOORTEN[W.voertuigSoort(v)], soort, 'de host heeft een ' + soort);
    const echt = W.uiterlijkSpec(W.voertuigUiterlijk(v, 5));
    const gok = W.gokUiterlijk(soort, 5, { len: echt.model.len, wid: echt.model.wid });
    assert.ok(gok && gok.model && typeof gok.model.name === 'string', soort + ' heeft een gokmodel');
    for (const vlag of ['isBoat', 'isHeli', 'isPlane', 'isPolice', 'isBus']) assert.equal(!!gok[vlag], !!echt[vlag], soort + ': ' + vlag);
    if (soort === 'fiets') assert.equal(gok.isBike, true);
    if (soort === 'scooter') assert.equal(gok.isScooter, true);
    if (soort === 'motor') assert.ok(gok.model.motorbike && echt.model.motorbike, 'beide een motor');
    assert.ok(Math.abs(gok.model.len - echt.model.len) < 0.02 && Math.abs(gok.model.wid - echt.model.wid) < 0.02, soort + ': dezelfde maat');
  }
  // een boot zonder uiterlijk krijgt een romp die bij zijn maat past: geen opgerekte sloep van 98 m (#428)
  assert.deepEqual(W.GOK_BOOT_M, [12, 60]);
  assert.equal(W.gokUiterlijk('boot', 3, { len: 5.5, wid: 2 }).model.kind, 'sloep');
  assert.equal(W.gokUiterlijk('boot', 3, { len: 40, wid: 5 }).model.kind, 'binnenvaart');
  const schip = W.gokUiterlijk('boot', 3, { len: 98, wid: 15.4 });
  assert.equal(schip.isBoat, true); assert.equal(schip.model.kind, 'zeeschip');
  assert.ok(schip.model.len >= 97 && schip.model.wid > 15, 'de maat van het schip blijft');
  assert.equal(W.gokUiterlijk('boot', 3).model.kind, 'sloep', 'zonder maat: de kleinste romp');
});
t('inventaris: wat de gast lokaal invult noemt zijn bron, het stuk code en de test die het dekt (#428)', () => {
  const soorten = new Set(['beeld', 'beweging', 'geluid']);
  assert.ok(Array.isArray(W.LOKAAL_VERZONNEN) && W.LOKAAL_VERZONNEN.length >= 8, 'de inventaris bestaat');
  const gehad = new Set();
  for (const p of W.LOKAAL_VERZONNEN) {
    assert.ok(p.wat && p.waarom && p.bron && p.code && p.test, JSON.stringify(p));
    assert.ok(!gehad.has(p.wat), 'elk punt staat er één keer: ' + p.wat); gehad.add(p.wat);
    assert.ok(soorten.has(p.waar), p.wat + ': ' + p.waar);
    const pad = join(root, 'game', 'js', p.bron);
    assert.ok(existsSync(pad), p.bron + ' bestaat');
    assert.ok(existsSync(join(root, 'scripts', p.test)), p.test + ' bestaat');
    // het stuk code dat de gast zelf invult staat echt in die bron: zo veroudert de inventaris niet
    assert.ok(readFileSync(pad, 'utf8').includes(p.code), p.bron + ' noemt ' + p.code);
  }
  const tekst = W.LOKAAL_VERZONNEN.map((p) => p.wat).join(' | ');
  for (const kern of ['deining', 'valrichting', 'verkeerslicht', 'vogel', 'voertuig zonder uiterlijk', 'wagonindeling', 'achterkant van een gelede bus', 'draaisnelheid van de wielen', 'achterover vallen']) assert.ok(tekst.includes(kern), 'de inventaris noemt ' + kern);
});
console.log(`coopworld_test: ${n}/${n} ok`);
