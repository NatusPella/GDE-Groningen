// Pure test van de hengelhoudingen (#437): scripts/hengelpose_test.mjs
import assert from 'node:assert/strict';
import { hengelPose, vangstBoog, dobberPositie, lijnPunten, UITGOOI_T, VANG_T } from '../game/js/hengelpose.js';

const cast0 = hengelPose('cast', 0), castMid = hengelPose('cast', UITGOOI_T * 0.35), castEind = hengelPose('cast', UITGOOI_T);
assert.ok(castMid.rod < cast0.rod, 'eerst naar achteren');
assert.ok(castEind.rod > cast0.rod, 'dan naar voren');
assert.equal(castEind.uit, 1);
assert.ok(hengelPose('cast', UITGOOI_T * 0.7).boog > 2, 'het dobbertje vliegt in een boog');
assert.equal(castEind.boog < 0.01, true);
assert.equal(hengelPose('idle').zichtbaar, false);
const wacht = hengelPose('wait', 1.3);
assert.ok(wacht.zichtbaar && wacht.uit === 1 && Math.abs(wacht.bob) < 0.06);
const beet = hengelPose('bite', 0.2, 1);
assert.ok(beet.dip > 0.2 && beet.spanning >= 0.5 && beet.trilling === 1, 'de beet trekt het dobbertje onder');
assert.ok(hengelPose('bite', 0.2, 0).spanning > beet.spanning, 'hoe langer de beet, hoe strakker de lijn');
assert.equal(hengelPose('scare', 1.6).uit, 0);
assert.ok(hengelPose('scare', 0.1).uit > 0.5, 'de lijn gaat snel binnen');
assert.equal(vangstBoog(-1), null); assert.equal(vangstBoog(VANG_T + 0.1), null);
assert.ok(vangstBoog(VANG_T / 2).hoogte > 1.5);
assert.ok(vangstBoog(VANG_T * 0.95).terug);
const tip = { x: 0, y: 0, h: 2 }, doel = { x: 10, y: 0, h: -2.3 };
const d = dobberPositie(tip, doel, 0.5, 1);
assert.equal(d.x, 5); assert.ok(Math.abs(d.h - (-0.15 + 1)) < 1e-9);
const slap = lijnPunten(tip, doel, 0.3, 0), strak = lijnPunten(tip, doel, 0.3, 1);
assert.equal(slap.length, 11);
assert.ok(slap[5].h < strak[5].h, 'slappe lijn hangt door, strakke niet');
assert.deepEqual(slap[0], { x: 0, y: 0, h: 2 });
console.log('hengelpose_test ok');
