// De koppeling tussen echte voetgangers en de simulatiekern (simbridge.js, #58).
//   node scripts/simbridge_test.mjs
import assert from 'node:assert/strict';
import { createSimBridge, RECONCILE_EVERY } from '../game/js/simbridge.js';
import { createSimHost } from '../game/js/simhost.js';
import { createRoadIndex, nearestRoad } from '../game/js/simambient.js';

const roads = [{ id: 0, pts: new Float32Array([0, 0, 2000, 0]) }, { id: 1, pts: new Float32Array([0, 500, 2000, 500]) }];
const idx = createRoadIndex(roads);
assert.equal(nearestRoad(idx, 700, 3).road, 0);
assert.equal(nearestRoad(idx, 700, 250), null);
assert.equal(nearestRoad(idx, 700, 497).road, 1);

const ped = (x, y, extra = {}) => ({ x, y, angle: 0, speed: 0, state: 'wander', ...extra });
const player = { x: 0, y: 0 };
const peds = [ped(600, 2, { speed: 1.4 }), ped(40, 1), ped(900, 3, { isCop: true }), ped(1200, 300)];
const bridge = createSimBridge({ host: createSimHost({ useWorker: false }), roads });
const frame = (dt = 0.1) => { bridge.update(dt, player, peds, 0); return peds.map((p) => bridge.drive(p)); };

let driven = frame();
assert.deepEqual(driven, [true, false, false, false], 'alleen ver weg liggende wandelaar met pad');
assert.equal(bridge.size(), 1);
const x0 = peds[0].x;
for (let i = 0; i < 20; i++) frame();
assert.ok(peds[0].x > x0 + 2, 'ped loopt via de kern');
assert.ok(Math.abs(peds[0].y - 2) < 3 || peds[0].y === 0, 'blijft op het pad');
assert.equal(peds[3]._noRoadUntil, 20, 'ped zonder pad wordt een tijd niet opnieuw bekeken');

// rol verandert: terug naar de hoofdthread op de plek uit het snapshot
const px = peds[0].x;
peds[0].state = 'flee';
assert.equal(bridge.drive(peds[0]), false);
assert.equal(peds[0]._wid, 0);
assert.equal(bridge.size(), 0);
assert.ok(Math.abs(peds[0].x - px) < 3);

// speler loopt erheen: binnen R_IN gaat hij terug
peds[0].state = 'wander';
for (let i = 0; i < 6; i++) frame(); // opnieuw gegeven
assert.ok(peds[0]._wid, 'weer aan de worker');
player.x = peds[0].x;
for (let i = 0; i < 8; i++) frame(RECONCILE_EVERY);
assert.equal(peds[0]._wid, 0, 'dichtbij is hij weer echt');

// weggehaalde peds worden bij de worker afgemeld
player.x = 0;
for (let i = 0; i < 8; i++) frame(RECONCILE_EVERY);
const wid = peds[0]._wid;
assert.ok(wid);
peds.splice(0, 1);
for (let i = 0; i < 3; i++) bridge.update(RECONCILE_EVERY, player, peds, 0);
assert.equal(bridge.owned.has(wid), false);
assert.equal(bridge.host.positions().has(wid), false);

// de worker-id's botsen niet met gewone: alles >= 1e6
for (const id of bridge.owned.keys()) assert.ok(id >= 1e6);
console.log('simbridge_test: ok');
