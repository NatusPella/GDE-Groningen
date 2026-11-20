// Parkkit tegen wegen (dropOnRoad, hedgeSamples): geen boom of heg op het wegdek, de rest blijft staan.
import assert from 'node:assert/strict';
import './node3d.mjs';
const SP = await import('../game/js/streekplekken.js');

const plek = { id: 7, t: 'park', sub: 'park', x: 1000, y: 2000, a: 0.6, l: 80, w: 50 };
const parts = SP.partsToWorld(plek);
const hedges = parts.filter(SP.isHedgePart), bomen = parts.filter((q) => q.s === 'cone');
assert.equal(hedges.length, 2, 'twee heggen');
assert.ok(bomen.length >= 4, 'bomen aanwezig');
// een weg die een heg op 1 plek kruist (cirkel van 2,5 m rond het midden van die heg)
const heg = hedges[0];
const roadHeg = (x, y) => Math.hypot(x - heg.x, y - heg.z) < 2.5;
const kept = SP.dropOnRoad(parts, roadHeg);
const keptHeg = kept.filter(SP.isHedgePart);
assert.ok(keptHeg.length >= hedges.length, 'een heg wordt geknipt, niet helemaal weggegooid');
assert.ok(keptHeg.every((q) => !SP.hedgeSamples(q).some(([x, y]) => roadHeg(x, y))), 'geen heg-stuk op de weg');
const lost = hedges.reduce((s, q) => s + q.w, 0) - keptHeg.reduce((s, q) => s + q.w, 0);
assert.ok(lost > 0 && lost < 9, 'alleen het stuk op de weg valt weg: ' + lost.toFixed(1) + ' m');
// bomen: een weg door een boom haalt stam en kroon weg
const b = bomen[0];
const rondB = (x, y) => Math.hypot(x - b.x, y - b.z) < 2;
const k2 = SP.dropOnRoad(parts, rondB);
assert.ok(!k2.some((q) => q.h >= 0.1 && !SP.isHedgePart(q) && rondB(q.x, q.z)), 'geen boom op de weg');
assert.equal(k2.filter((q) => q.s === 'cone').length, bomen.length - 1, 'precies die ene boom valt weg');
// vlakke onderdelen (zandpad, vijver) blijven, ook over een weg
const k3 = SP.dropOnRoad(parts, () => true);
assert.ok(k3.length > 0 && k3.every((q) => q.h < 0.1), 'bij een weg overal blijven alleen vlakke onderdelen');
const k4 = SP.dropOnRoad(parts, () => false);
assert.equal(k4.filter((q) => !SP.isHedgePart(q)).length, parts.length - hedges.length, 'zonder weg blijft alles behalve de heg-opdeling');
assert.ok(Math.abs(k4.filter(SP.isHedgePart).reduce((s, q) => s + q.w, 0) - hedges.reduce((s, q) => s + q.w, 0)) < 1e-6, 'de hegenlengte blijft gelijk');
console.log('streekplekken_park_weg_test ok');
