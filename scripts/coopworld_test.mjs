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
  assert.match(W.missieTekst(m, 'wereld'), /De gastheer speelt: Berend telt de krassen\. Jij loopt mee in de open wereld/);
  assert.match(W.missieTekst(m, 'hoofdrol'), /Doe mee waar het kan/);
  assert.equal(W.missieTekst({ actief: false }), '');
});
console.log(`coopworld_test: ${n}/${n} ok`);
