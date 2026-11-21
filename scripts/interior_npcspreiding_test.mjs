// Interieurs (review 22-11 P3): de mensen van een pand komen niet allemaal in de frame dat het pand live gaat, maar een figuur per frame
// (en alleen binnen het budget van de streamplanner, klasse actors); op het eind staat dezelfde bezetting als voorheen, zonder dubbelen,
// en bij het droppen van het pand zijn de posebronnen weg. Draai: node scripts/interior_npcspreiding_test.mjs (vraagt de gevendorde three.js)
import './node3d.mjs';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

registerHooks({
  load(url, ctx, next) {
    if (url.endsWith('/game/js/scene3d.js')) {
      const r = next(url, ctx);
      return { ...r, source: String(r.source) + '\nexport function __setScene(s) { scene = s; }\n', shortCircuit: true };
    }
    return next(url, ctx);
  },
});
const perm = () => new Proxy(function () {}, { get: (t, k) => (k === Symbol.toPrimitive ? () => '' : k === 'length' ? 0 : perm()), set: () => true, apply: () => perm() });
const THREE = await import('three');
const sc = await import('../game/js/scene3d.js');
sc.__setScene(new THREE.Scene());
const I = await import('../game/js/interiors.js');
const { building } = await import('./interior_fixtures.mjs');
const { mulberry32 } = await import('../game/js/rng.js');
const { streamPlanner } = await import('../game/js/streamplanner.js');

const { b } = building('winkel', 'supermarkt', 13, 16, mulberry32(5));
const player = { x: 6.5, y: -8, z: 0, angle: 0, inVehicle: null, swimming: false, dead: false, gz: 0 };
const w = { player, players: [player], clock: 12, audioEvents: [], addMessage() {}, map: { buildingsNear: () => [b], groundHeightAt: () => 0, surfaceAt: () => ({ z: 0 }) }, insideExternal: false };

// scan elke 0,3 s: eerste tik bouwt het pand, de volgende tikken bouwen de mensen
const plan = streamPlanner();
const perFrame = [];
let vorige = 0;
for (let i = 0; i < 60; i++) {
  plan.openFrame({ frameMs: 16.7 });
  I.updateInteriors(1 / 60, w);
  const s = I.interiorStats();
  perFrame.push(s.npcs - vorige); vorige = s.npcs;
}
const eind = I.interiorStats();
assert.equal(eind.live, 1, 'het pand is live');
assert.ok(eind.npcs >= 3, `het pand heeft mensen (${eind.npcs})`);
assert.ok(Math.max(...perFrame) <= 1, `hooguit een figuur per frame (${perFrame.filter((n) => n).join(',')})`);
assert.equal(perFrame.reduce((a, c) => a + c, 0), eind.npcs, 'alle figuren komen er uiteindelijk');
const eerste = perFrame.findIndex((n) => n > 0), laatste = perFrame.length - 1 - [...perFrame].reverse().findIndex((n) => n > 0);
assert.ok(laatste > eerste, 'de bouw is over meerdere frames gespreid');

// nog 60 frames: geen nieuwe figuren (geen dubbelen)
for (let i = 0; i < 60; i++) { plan.openFrame({ frameMs: 16.7 }); I.updateInteriors(1 / 60, w); }
assert.equal(I.interiorStats().npcs, eind.npcs, 'geen dubbele figuren na de bouw');

// weglopen: pand en mensen gaan weer weg
player.y = -200;
for (let i = 0; i < 40; i++) { plan.openFrame({ frameMs: 16.7 }); I.updateInteriors(1 / 60, w); }
assert.equal(I.interiorStats().live, 0, 'het pand is gedropt');
assert.equal(I.interiorStats().npcs, 0);
console.log(`interior_npcspreiding_test ok (${eind.npcs} figuren over frames ${eerste}..${laatste}, per frame ${perFrame.filter((n) => n).join(',')})`);
