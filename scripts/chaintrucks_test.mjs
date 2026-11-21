// De zichtbare ketenwagens, het pure deel (chaintrucks.js): ritten uit de ketens, de route (rechte lijn of via wegpunten), de pose uit de speltijd, hoogstens vier binnen 230 m met
// hysterese, alleen in diensttijd, deterministisch.   node scripts/chaintrucks_test.mjs
import assert from 'node:assert/strict';
import * as C from '../game/js/chaintrucks.js';
import * as SC from '../game/js/supplychain.js';
import * as L from '../game/js/bezitlive.js';
import * as BL from '../game/js/boerderijlive.js';

let n = 0, fails = 0;
const t = (name, fn) => { n++; try { fn(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', String(e.stack || e.message).split('\n').slice(0, 3).join(' | ')); } };
const NOON = 12 * 3600;
const chain = (trucks = 2, over = {}) => ({ id: 'friet', links: [
  { id: 'aardappelen', trucks, moved: 9000, distance: 4000, pos: { x: 0, y: 0 }, ...over },
  { id: 'frietfabriek', trucks: 0, moved: 6000, distance: 0, pos: { x: 4000, y: 0 } },
  { id: 'snackbar', trucks: 0, moved: 0, distance: 0, pos: { x: 4000, y: 10 } }] });

t('ritten: alleen een schakel met wagens, afstand, verplaatste hoeveelheid en twee bekende plekken', () => {
  assert.equal(C.chainTrips([chain(2)]).length, 2);
  assert.equal(C.chainTrips([chain(0)]).length, 0);
  assert.equal(C.chainTrips([chain(2, { moved: 0 })]).length, 0);
  assert.equal(C.chainTrips([chain(2, { distance: 0 })]).length, 0);
  assert.equal(C.chainTrips([chain(2, { pos: null })]).length, 0);
  const c = chain(2); c.links[1].pos = null; assert.equal(C.chainTrips([c]).length, 0);
  assert.equal(C.chainTrips([chain(9)]).length, C.MAX_PER_LINK);
  assert.deepEqual(C.chainTrips(null), []); assert.deepEqual(C.chainTrips([null, {}, { links: 5 }]), []);
});
t('een rit heeft een eigen sleutel, een verzonnen chauffeur en de reistijd van supplychain.js', () => {
  const [a, b] = C.chainTrips([chain(2)]);
  assert.notEqual(a.key, b.key); assert.ok(SC.DRIVER_NAMES.includes(a.driver)); assert.equal(a.secs, SC.tripSeconds(4000));
});
t('route: een rechte lijn zonder snap, anders begin, wegpunt bij het begin, wegpunt bij het eind, eind', () => {
  assert.equal(C.pathOf({ x: 0, y: 0 }, { x: 100, y: 0 }).length, 2);
  const snap = (x, y) => ({ x: x + 5, y: y + 5 });
  const r = C.pathOf({ x: 0, y: 0 }, { x: 100, y: 0 }, snap);
  assert.equal(r.length, 4); assert.deepEqual(r[1], { x: 5, y: 5 }); assert.deepEqual(r[2], { x: 105, y: 5 });
  assert.equal(C.pathOf({ x: 0, y: 0 }, { x: 100, y: 0 }, () => null).length, 2);
  assert.equal(C.pathOf({ x: 0, y: 0 }, { x: 100, y: 0 }, () => { throw new Error('geen wegen'); }).length, 2);
  assert.equal(C.pathOf({ x: 0, y: 0 }, { x: 0.2, y: 0 }).length >= 1, true);
});
t('pointAlong volgt de lengte: begin, midden, eind en de richting', () => {
  const r = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }];
  assert.deepEqual([C.pointAlong(r, 0).x, C.pointAlong(r, 0).y], [0, 0]);
  const mid = C.pointAlong(r, 0.5); assert.ok(Math.abs(mid.x - 100) < 1e-9 && Math.abs(mid.y) < 1e-9);
  assert.ok(Math.abs(C.pointAlong(r, 0.75).heading - Math.PI / 2) < 1e-9);
  assert.deepEqual([C.pointAlong(r, 2).x, C.pointAlong(r, 2).y], [100, 100]);
});
t('de pose: laden bij het begin, heen met lading, lossen bij het eind, leeg terug; altijd binnen de route', () => {
  const [trip] = C.chainTrips([chain(1)]); const route = C.pathOf(trip.from, trip.to);
  const seen = new Set();
  for (let s = 0; s < trip.secs; s += 30) {
    const p = C.tripPose({ ...trip, index: 0, of: 1 }, route, s); seen.add(p.phase);
    assert.ok(p.x >= -1 && p.x <= 4001);
    assert.equal(p.loaded, p.phase === 'heen' || p.phase === 'lossen');
  }
  assert.deepEqual([...seen].sort(), ['heen', 'laden', 'lossen', 'terug']);
});
t('de dienst: alleen tussen zeven en zeventien uur', () => {
  assert.equal(C.onShift(6 * 3600), false); assert.equal(C.onShift(7 * 3600), true); assert.equal(C.onShift(16.9 * 3600), true); assert.equal(C.onShift(17 * 3600), false);
  assert.equal(C.onShift(86400 + 8 * 3600), true); assert.equal(C.onShift(-3600), false);
  assert.deepEqual(C.planChainTrucks(C.chainTrips([chain(2)]), { x: 0, y: 0 }, { timeS: 3 * 3600 }), []);
});
t('hoogstens vier tegelijk, dichtstbijzijnde eerst, alleen binnen 230 m', () => {
  const many = []; for (let i = 0; i < 6; i++) many.push({ ...chain(3), id: `k${i}`, links: chain(3).links.map((l) => ({ ...l, pos: { x: l.pos.x, y: l.pos.y + i * 10 } })) });
  const trips = C.chainTrips(many);
  const p = C.planChainTrucks(trips, { x: 0, y: 0 }, { timeS: NOON });
  assert.ok(p.length <= C.MAX_TRUCKS);
  for (let i = 1; i < p.length; i++) assert.ok(p[i - 1].distance <= p[i].distance);
  for (const x of p) assert.ok(x.distance <= C.SPAWN_R);
  assert.deepEqual(C.planChainTrucks(trips, { x: 1e6, y: 1e6 }, { timeS: NOON }), []);
});
t('hysterese: een wagen die al in beeld is blijft tot 330 m, een nieuwe verschijnt pas binnen 230 m', () => {
  const one = [{ key: 'k:a:0', chainId: 'k', linkId: 'a', index: 0, of: 1, from: { x: 280, y: 0 }, to: { x: 281, y: 0 }, distance: 1, secs: 400, driver: 'Femke' }];
  assert.equal(C.planChainTrucks(one, { x: 0, y: 0 }, { timeS: NOON }).length, 0);
  assert.equal(C.planChainTrucks(one, { x: 0, y: 0 }, { timeS: NOON, current: new Set(['k:a:0']) }).length, 1);
});
t('deterministisch en met een routecache die niet onbeperkt groeit', () => {
  const trips = C.chainTrips([chain(3)]);
  const routes = new Map();
  const a = C.planChainTrucks(trips, { x: 10, y: 0 }, { timeS: NOON, routes }), b = C.planChainTrucks(trips, { x: 10, y: 0 }, { timeS: NOON });
  assert.equal(JSON.stringify(a), JSON.stringify(b));
  assert.ok(routes.size >= 1);
  const flood = []; for (let i = 0; i < 100; i++) flood.push({ ...trips[0], key: `x:${i}:0` });
  C.planChainTrucks(flood, { x: 0, y: 0 }, { timeS: NOON, routes });
  assert.ok(routes.size <= 64);
});
t('rommel: geen speler, NaN, lege lijst', () => {
  assert.deepEqual(C.planChainTrucks(C.chainTrips([chain(2)]), null, { timeS: NOON }), []);
  assert.deepEqual(C.planChainTrucks(C.chainTrips([chain(2)]), { x: NaN, y: 0 }, { timeS: NOON }), []);
  assert.deepEqual(C.planChainTrucks([], { x: 0, y: 0 }, { timeS: NOON }), []);
  assert.doesNotThrow(() => C.planChainTrucks(C.chainTrips([chain(2)]), { x: 0, y: 0 }, { timeS: NaN }));
});
t('bezitlive.chainTruckInput: zonder wagens niets, met een wagen de schakels met plek (de bron: een perceel)', () => {
  const m = new Map(); const store = { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem(k, v) { m.set(k, String(v)); }, removeItem: (k) => m.delete(k) };
  L.initBezit({ opslag: store }); BL.initBoerderij({ opslag: store });
  assert.deepEqual(L.chainTruckInput(), []);
  const views = [{ id: 'friet', sources: [{ id: 'paaaaaaaaaaa1', picked: false }], links: [{ id: 'aardappelen', trucks: 1, moved: 5, distance: 900, ref: null }, { id: 'frietfabriek', trucks: 0, moved: 0, distance: 0, ref: null }] }];
  const out = L.chainTruckInput(views);
  assert.equal(out.length, 1); assert.equal(out[0].links.length, 2); assert.equal(out[0].links[0].trucks, 1); assert.equal(out[0].links[1].pos, null);
});
console.log(`chaintrucks_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
