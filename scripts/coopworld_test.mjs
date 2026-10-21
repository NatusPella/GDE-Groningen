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
  const snap = { players: [], shared: {}, mission: {}, entities: e };
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
