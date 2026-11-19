import assert from 'node:assert/strict';
import { newExplorationProfile, revealArea, strekenStand, streekOpenTekst, awardAreaStamp, areaForPoint } from '../game/js/verkenpunten.js';
import { STREKEN } from '../game/js/regioleven.js';
import { wgsToWorld } from '../game/js/rdnew.js';

const [a, b] = STREKEN;
const at = (s) => { const [x, y] = wgsToWorld(s.at[0], s.at[1]); return { x, y }; };
const p = newExplorationProfile();
let st = strekenStand(p);
assert.equal(st.totaal, STREKEN.length);
assert.equal(st.verkend, 0);
assert.equal(st.ontdekt, 0);
assert.ok(st.rijen.every((r) => r.naam === ''), 'onbekende streken hebben geen naam in de lijst');
assert.equal(streekOpenTekst(st.rijen[0]), 'Nog niet ontdekt');

revealArea(p, a.id);
const punt = { ...at(a), streek: a.id, id: 'uitkijkpunt:' + a.id };
const missie = { x: at(a).x, y: at(a).y, done: false };
st = strekenStand(p, { missions: [missie], points: [punt] });
const ra = st.rijen.find((r) => r.id === a.id);
assert.equal(ra.naam, a.name);
assert.equal(st.ontdekt, 1);
assert.equal(st.verkend, 0);
assert.equal(streekOpenTekst(ra), 'Nog open: 1 missie en 1 uitkijkpunt');
assert.equal(st.rijen.find((r) => r.id === b.id).naam, '', 'andere streek blijft anoniem');

// Missie klaar en punt gebruikt: verkend met stempel.
missie.done = true;
revealArea(p, a.id, { point: punt.id });
assert.equal(awardAreaStamp(p, a.id, { missions: [missie], points: [punt] }), true);
st = strekenStand(p, { missions: [missie], points: [punt] });
assert.equal(st.verkend, 1);
assert.equal(streekOpenTekst(st.rijen.find((r) => r.id === a.id)), 'Verkend, met stempel');
console.log('streken_stand_test: ok');
