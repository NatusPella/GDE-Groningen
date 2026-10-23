import assert from 'node:assert/strict';
import { nieuweBeurt, beginBaan, slaan, volgendeBaan, stand } from '../game/js/golfbeurt.js';

// één speler: altijd zijn beurt, tot het hol
const solo = nieuweBeurt(['tamo']);
beginBaan(solo, { x: 0, y: 0 });
assert.equal(slaan(solo, 'tamo', { x: 5, y: 0 }, { x: 10, y: 0 }), 'tamo');
assert.equal(slaan(solo, 'tamo', { x: 10, y: 0 }, { x: 10, y: 0 }, { inHol: true }), null);
assert.equal(solo.spelers[0].kaart[0], 2);

// twee spelers: de verste slaat
const b = nieuweBeurt(['a', 'b']);
assert.equal(beginBaan(b, { x: 0, y: 0 }), 'a');
assert.equal(slaan(b, 'a', { x: 8, y: 0 }, { x: 10, y: 0 }), 'b', 'b ligt nog op de tee: verder weg');
assert.equal(slaan(b, 'b', { x: 9, y: 0 }, { x: 10, y: 0 }), 'a', 'a ligt verder dan b');
assert.equal(slaan(b, 'a', { x: 10, y: 0 }, { x: 10, y: 0 }, { inHol: true }), 'b');
assert.equal(slaan(b, 'b', { x: 10, y: 0 }, { x: 10, y: 0 }, { inHol: true }), null);
assert.deepEqual(b.spelers.map((s) => s.kaart[0]), [2, 2]);
// de eer: wie de vorige baan het minst had
volgendeBaan(b);
b.spelers[1].kaart[0] = 1;
assert.equal(beginBaan(b, { x: 0, y: 0 }), 'b');
// opgepakt telt als klaar
assert.equal(slaan(b, 'b', { x: 1, y: 1 }, { x: 10, y: 0 }, { opgepakt: true }), 'a');
assert.deepEqual(stand(b).map((x) => x.totaal), [2, 2], 'eerst gelijk');
slaan(b, 'a', { x: 10, y: 0 }, { x: 10, y: 0 }, { inHol: true });
assert.equal(stand(b)[0].id, 'b', 'b heeft de laagste stand');
// discgolf: een boom of de mand laat de schijf niet over een grote afstand springen (#436)
import { simulateFlight } from '../game/js/discgolfrules.js';
const boom = { x: 20, y: 0, r: 0.4, h: 12 };
const vlucht = simulateFlight({ x: 0, y: 0, yaw: 0, power: 0.9, loft: 0.15, release: 0, disc: 'driver' }, { trees: [boom], rng: () => 0.5 });
assert.equal(vlucht.reason, 'tree');
const na = vlucht.path.slice(-4);
for (let i = 1; i < na.length; i++) assert.ok(Math.hypot(na[i][0] - na[i - 1][0], na[i][1] - na[i - 1][1], na[i][2] - na[i - 1][2]) < 3, 'de schijf springt niet');
console.log('golfbeurt_test ok');
