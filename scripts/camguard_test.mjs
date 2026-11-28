// Test van de camerabescherming voor cutscenes (game/js/camguard.js): een muur stopt de dolly, een correctiesprong glijdt, een snee blijft.
import assert from 'node:assert/strict';
import { createCamGuard, sweepBlocked, pathViolations, GUARD_MAX_SPEED } from '../game/js/camguard.js';

const muur = (x, y) => x > 5 && x < 5.5 && y > -5 && y < 5; // een dunne muur op x = 5 tot 5,5
const blocked = (x, y, z) => muur(x, y) && z < 8;
const P = (x, y, z, o = {}) => ({ position: { x, y, z }, shotIndex: 0, ...o });

// sweep
assert.equal(sweepBlocked(blocked, { x: 0, y: 0, z: 1.6 }, { x: 4, y: 0, z: 1.6 }), null);
const hit = sweepBlocked(blocked, { x: 0, y: 0, z: 1.6 }, { x: 10, y: 0, z: 1.6 });
assert.ok(hit && hit.x <= 5 && hit.x > 4.5, 'de sweep stopt voor de muur, ook als de eindstand achter de muur vrij is (dunne muur)');

// een dolly die de muur raakt blijft ervoor staan en gaat er nooit doorheen
const g = createCamGuard({ blocked });
let x = 0, maxX = 0;
for (let i = 0; i < 400; i++) { x = i * 0.03; const q = g.apply(P(x, 0, 1.6, { cut: i === 0 }), 1 / 60); maxX = Math.max(maxX, q.position.x); assert.ok(!blocked(q.position.x, q.position.y, q.position.z), 'nooit in de muur'); }
assert.ok(maxX < 5, 'de camera komt niet voorbij de muur: ' + maxX);
assert.ok(g.stats.held > 0);

// een correctiesprong binnen een shot (fitCamera) glijdt met een maximale snelheid
const g2 = createCamGuard({ blocked });
g2.apply(P(0, 0, 1.6, { cut: true }), 1 / 60);
const q2 = g2.apply(P(4, 0, 1.6), 1 / 60);
assert.ok(q2.position.x <= GUARD_MAX_SPEED / 60 + 1e-6 && q2.position.x > 0, 'een sprong van 4 m in één beeld wordt een glijbeweging: ' + q2.position.x);

// een bewuste snee naar een vrije plek (nieuw shot) wordt niet gladgestreken
const g3 = createCamGuard({ blocked });
g3.apply(P(0, 0, 1.6, { cut: true }), 1 / 60);
const q3 = g3.apply(P(3, 3, 1.6, { shotIndex: 1 }), 1 / 60);
assert.deepEqual(q3.position, { x: 3, y: 3, z: 1.6 });

// een snee naar een plek in een obstakel gaat omhoog
const q4 = g3.apply(P(5.2, 0, 1.6, { shotIndex: 2 }), 1 / 60);
assert.ok(q4.position.z > 8 || !blocked(q4.position.x, q4.position.y, q4.position.z));

// zonder env doet hij niets, en een geen-getal blijft ongemoeid
const pose = P(1, 2, 3);
assert.equal(createCamGuard({}).apply(pose), pose);

// het padtoets: in en door
const samples = [];
for (let i = 0; i <= 60; i++) samples.push({ t: i / 10, shotIndex: 0, cut: i === 0, position: { x: i * 0.2 - 1, y: 0, z: 1.6 } });
const v = pathViolations(blocked, samples);
assert.ok(v.some((q) => q.soort === 'in'));
const sprong = [{ t: 0, shotIndex: 0, cut: true, position: { x: 4, y: 0, z: 1.6 } }, { t: 0.1, shotIndex: 0, position: { x: 6, y: 0, z: 1.6 } }];
assert.equal(pathViolations(blocked, sprong)[0].soort, 'door');
assert.deepEqual(pathViolations(blocked, [{ t: 0, shotIndex: 0, cut: true, position: { x: 4, y: 0, z: 1.6 } }, { t: 0.1, shotIndex: 1, cut: true, position: { x: 6, y: 0, z: 1.6 } }]), [], 'een snee mag naar de andere kant van een muur');
console.log('camguard_test: groen');
// nudgeFromWalls: een punt 0,3 m van een muur schuift naar buiten; een vrij punt blijft staan
{
  const { nudgeFromWalls } = await import('../game/js/camguard.js');
  const solid = (x, y) => x > 5; // een halfruimte
  const n = nudgeFromWalls(solid, { x: 4.7, y: 0, z: 1.6 });
  assert.ok(n.x < 4.7 && n.x > 3.5, 'weg van de muur: ' + n.x);
  assert.deepEqual(nudgeFromWalls(solid, { x: 2, y: 0, z: 1.6 }), { x: 2, y: 0, z: 1.6 });
  console.log('camguard nudge: groen');
}
// een camera die in een obstakel begint mag naar buiten
{
  const g = createCamGuard({ blocked });
  g.apply(P(5.2, 0, 1.6, { cut: true }), 1 / 60);
  let q; for (let i = 0; i < 30; i++) q = g.apply(P(4, 0, 1.6), 1 / 60);
  assert.ok(!blocked(q.position.x, q.position.y, q.position.z), 'komt uit de muur');
  console.log('camguard escape: groen');
}
