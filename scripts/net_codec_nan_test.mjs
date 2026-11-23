// Multiplayer (#1293): one entity with a non-finite position or a non-finite clock must not
// make the receiver reject the whole snapshot (game/js/net/codec.js).
import assert from 'node:assert/strict';
import * as K from '../game/js/net/codec.js';

let n = 0;
const t = (name, f) => { f(); n++; };

const SNAP = {
  players: [{ slot: 0, x: 100, y: 200, z: 1, angle: 1.0, alive: true, health: 100, vehicle: null }],
  shared: { money: 10, wanted: 1, clock: 13.5 },
  mission: { stage: 1, state: 'run', present: 3 },
  entities: [
    { id: 1, kind: 0, x: 10, z: 20, angle: 0.5, speed: 3 },
    { id: 2, kind: 0, x: 30, z: 40, angle: 1.5, speed: 4 },
    { id: 3, kind: 40, x: 50, z: 60, angle: 2.5 },
  ],
};
const withEntity = (i, patch) => ({ ...SNAP, entities: SNAP.entities.map((e, j) => (j === i ? { ...e, ...patch } : e)) });
const ids = (d) => d.entities.map((e) => e.id);

t('gezonde snapshot: alle entiteiten komen aan, lengte ongewijzigd', () => {
  const d = K.decodeSnapshot(K.encodeSnapshot(1, 2, 3, SNAP));
  assert.ok(d, 'een gezonde snapshot wordt gelezen');
  assert.deepEqual(ids(d), [1, 2, 3]);
  assert.equal(K.CODEC_VERSION, 2, 'geen versiebump');
});
t('één NaN-entiteit tussen gezonde entiteiten: de gezonde komen aan', () => {
  for (const patch of [{ x: NaN }, { z: NaN }, { x: Infinity }, { z: -Infinity }, { x: undefined }, { x: 1e39 }, { z: 5e6 }]) {
    const d = K.decodeSnapshot(K.encodeSnapshot(1, 2, 3, withEntity(1, patch)));
    assert.ok(d, `snapshot met een kapotte entiteit (${JSON.stringify(Object.keys(patch))}=${Object.values(patch)[0]}) wordt niet afgewezen`);
    assert.deepEqual(ids(d), [1, 3], 'alleen de kapotte entiteit ontbreekt');
    assert.equal(d.players.length, 1); assert.equal(d.shared.clock, 13.5);
    assert.equal(d.entities[1].kind, 40, 'de entiteit na de overgeslagen entiteit staat nog op zijn plek');
  }
});
t('kapotte entiteit vooraan, achteraan en allemaal', () => {
  assert.deepEqual(ids(K.decodeSnapshot(K.encodeSnapshot(1, 2, 3, withEntity(0, { x: NaN })))), [2, 3]);
  assert.deepEqual(ids(K.decodeSnapshot(K.encodeSnapshot(1, 2, 3, withEntity(2, { z: NaN })))), [1, 2]);
  const all = { ...SNAP, entities: SNAP.entities.map((e) => ({ ...e, x: NaN })) };
  const d = K.decodeSnapshot(K.encodeSnapshot(1, 2, 3, all));
  assert.ok(d, 'ook met alleen kapotte entiteiten komt de rest van de snapshot aan');
  assert.deepEqual(ids(d), []);
});
t('niet-eindige klok: snapshot komt aan met een veilige klok', () => {
  for (const clock of [NaN, Infinity, -Infinity, 1e39]) {
    const d = K.decodeSnapshot(K.encodeSnapshot(1, 2, 3, { ...SNAP, shared: { ...SNAP.shared, clock } }));
    assert.ok(d, `snapshot met klok ${clock} wordt niet afgewezen`);
    assert.ok(Number.isFinite(d.shared.clock), 'de klok is eindig');
    assert.deepEqual(ids(d), [1, 2, 3]);
  }
});
t('speler met een niet-eindige positie: de rest van de snapshot komt aan (#1293)', () => {
  const twee = { ...SNAP, players: [SNAP.players[0], { slot: 1, x: 5, y: 6, z: 0, angle: 0, alive: true, health: 90, vehicle: null }] };
  for (const patch of [{ x: NaN }, { y: Infinity }, { z: NaN, x: 1e39 }, { x: undefined }, { slot: 200 }]) {
    const kapot = { ...twee, players: [{ ...twee.players[0], ...patch }, twee.players[1]] };
    const d = K.decodeSnapshot(K.encodeSnapshot(1, 2, 3, kapot));
    assert.ok(d, `snapshot met een kapotte speler (${JSON.stringify(patch)}) wordt niet afgewezen`);
    assert.deepEqual(d.players.map((p) => p.slot), [1], 'alleen de kapotte speler ontbreekt');
    assert.equal(d.players[0].health, 90);
    assert.deepEqual(ids(d), [1, 2, 3], 'de entiteiten staan nog op hun plek');
  }
  const d = K.decodeSnapshot(K.encodeSnapshot(1, 2, 3, twee));
  assert.deepEqual(d.players.map((p) => p.slot), [0, 1], 'gezonde spelers komen allebei aan');
});
t('speler met een niet-eindige positie: de rest van de snapshot en de andere spelers komen aan', () => {
  const twee = { ...SNAP, players: [...SNAP.players, { slot: 1, x: 5, y: 6, z: 0, angle: 0, alive: true, health: 90, vehicle: 7 }] };
  for (const patch of [{ x: NaN }, { y: Infinity }, { y: -Infinity }, { x: 2e6 }]) {
    const kapot = { ...twee, players: [{ ...twee.players[0], ...patch }, twee.players[1]] };
    const d = K.decodeSnapshot(K.encodeSnapshot(1, 2, 3, kapot));
    assert.ok(d, `snapshot met een kapotte speler (${Object.keys(patch)[0]}=${Object.values(patch)[0]}) wordt niet afgewezen`);
    assert.deepEqual(d.players.map((p) => p.slot), [1], 'alleen de kapotte speler ontbreekt');
    assert.equal(d.players[0].vehicle, 7); assert.equal(d.players[0].health, 90);
    assert.deepEqual(ids(d), [1, 2, 3]); assert.equal(d.shared.clock, 13.5);
  }
  const zNaN = K.decodeSnapshot(K.encodeSnapshot(1, 2, 3, { ...twee, players: [{ ...twee.players[0], z: NaN }, twee.players[1]] }));
  assert.deepEqual(zNaN.players.map((p) => [p.slot, p.z]), [[0, 0], [1, 0]], 'een NaN-hoogte gaat als 0 mee (p.z || 0)');
});
console.log(`net_codec_nan_test: ${n}/${n} ok`);
