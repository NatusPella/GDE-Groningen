import assert from 'node:assert/strict';
import { nieuweBeurt, beginBaan, slaan, volgendeBaan, stand, spelerAantal, spelerIds, spelerNaam, spelerStand, uitslag, MAX_SPELERS } from '../game/js/golfbeurt.js';

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
// pass-and-play in de speellus van Pitch & putt (#437): 1 tot 4 spelers, zoals pitchputt.js ze aanroept
assert.equal(MAX_SPELERS, 4);
assert.deepEqual([0, 1, 2.6, 4, 9, 'x', null].map(spelerAantal), [1, 1, 3, 4, 4, 1, 1], 'aantal begrensd op 1 tot 4');
assert.deepEqual(spelerIds(3), ['s1', 's2', 's3']);
assert.equal(spelerNaam(1), 'Speler 2');
{
  const tee = { x: 0, y: 0 }, cup = { x: 30, y: 0 };
  const gb = nieuweBeurt(spelerIds(3));
  const ids = [];
  assert.equal(beginBaan(gb, tee), 's1', 'op de eerste tee begint speler 1');
  // s1 slaat kort, s2 ver, s3 schiet in het hol: de verste (s1) slaat weer, dan s2; s3 is klaar
  assert.equal(slaan(gb, 's1', { x: 5, y: 0 }, cup), 's2', 's2 ligt nu verst (nog op de tee)');
  assert.equal(slaan(gb, 's2', { x: 20, y: 0 }, cup), 's3');
  assert.equal(slaan(gb, 's3', cup, cup, { inHol: true }), 's1', 's3 klaar, de verste is s1');
  assert.equal(spelerStand(gb, 's3').klaar, true);
  assert.deepEqual(spelerStand(gb, 's1'), { lie: { x: 5, y: 0 }, slagen: 1, klaar: false });
  assert.equal(slaan(gb, 's1', cup, cup, { inHol: true }), 's2');
  assert.equal(slaan(gb, 's2', cup, cup, { inHol: true }), null, 'baan klaar als iedereen klaar is');
  volgendeBaan(gb);
  assert.equal(beginBaan(gb, tee), 's3', 'de eer: s3 had het minst slagen (1)');
  assert.deepEqual(spelerStand(gb, 's1'), { lie: tee, slagen: 0, klaar: false }, 'iedereen weer op de tee');
  // twee slagen voor s3, s1 en s2 in één, s3 oppakken
  slaan(gb, 's3', cup, cup, { opgepakt: true });
  slaan(gb, 's1', cup, cup, { inHol: true });
  slaan(gb, 's2', cup, cup, { inHol: true });
  const u = uitslag(gb);
  assert.deepEqual(u.rijen.map((r) => [r.id, r.totaal]), [['s3', 2], ['s1', 3], ['s2', 3]], 'totalen: s3 2, s1 en s2 3');
  assert.deepEqual(u.winnaars, ['s3']);
  assert.equal(u.gelijk, false);
  const gl = nieuweBeurt(['a', 'b']);
  beginBaan(gl, tee);
  slaan(gl, 'a', cup, cup, { inHol: true });
  slaan(gl, 'b', cup, cup, { inHol: true });
  assert.ok(uitslag(gl).gelijk && uitslag(gl).winnaars.length === 2, 'gelijkspel bij gelijk aantal slagen');
  assert.equal(spelerStand(gb, 'x'), null);
  assert.equal(uitslag(nieuweBeurt([])).winnaars.length, 0);
}
// één speler: de beurt blijft altijd bij hem tot het hol
{
  const g1 = nieuweBeurt(spelerIds(1));
  beginBaan(g1, { x: 0, y: 0 });
  assert.equal(slaan(g1, 's1', { x: 3, y: 0 }, { x: 30, y: 0 }), 's1');
  assert.equal(slaan(g1, 's1', { x: 30, y: 0 }, { x: 30, y: 0 }, { inHol: true }), null);
  assert.equal(uitslag(g1).gelijk, false);
}
console.log('golfbeurt_test ok');
