// Test van de plek van de trainingsoefening (#1109, beeld 24-11): de oefening ligt op het trainingsveld van de eigen club (of het hoofdveld), langs de lengteas van dat veld,
// en niet meer "naast je" op straat of in huis. Zonder parkdata (de terugval) geen veld. node scripts/voetbal_trainingveld_test.mjs
import './node3d.mjs';
import assert from 'node:assert/strict';
import PARKDATA from '../game/js/voetbalparkendata.js';
import { makeParkIndex, fallbackIndex, HOME_WGS } from '../game/js/voetbalparken.js';
import { wgsToWorld } from '../game/js/rdnew.js';
import * as C from '../game/js/voetbalcarriere.js';
const { trainingField } = await import('../game/js/voetbaltrainingrun.js');

const index = makeParkIndex(PARKDATA), getClub = C.clubResolver(index);
const [hx, hy] = wgsToWorld(HOME_WGS.lat, HOME_WGS.lon);
const c = C.createCareer({ char: 'tammo', index, home: { x: hx, y: hy } });
const club = getClub(c.club);
const v = trainingField(c, getClub, true), doel = club.trainingsvelden[0] || club.park;
assert.ok(v, 'een club uit de kaart heeft een veld');
assert.equal(v.x, doel.x); assert.equal(v.y, doel.y);
assert.ok(Math.abs(v.heading - (doel.r - Math.PI / 2)) < 1e-9, 'de oefening loopt langs de lengteas, zoals de wedstrijd (pitchPlacement)');
assert.ok(Math.hypot(v.x - club.park.x, v.y - club.park.y) < 3000, 'het veld hoort bij de plaats van de club');
const terug = C.createCareer({ char: 'tammo', index: null, home: null });
assert.equal(trainingField(terug, C.clubResolver(fallbackIndex()), false), null, 'de terugval ligt niet op de kaart: dan naast de speler');
assert.equal(trainingField(C.newCareer(), getClub, true), null);
console.log('voetbal_trainingveld_test ok');
