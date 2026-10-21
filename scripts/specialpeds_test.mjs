// Skateboarders, kennismakingsgroepen, bezorgers en verhuizers komen niet uit het populatiebudget (#348, #24):
// spawnPedestriansNear(..., free) geeft ze ook waar de straat al vol is (budget 0). Daarvoor stonden ze in een
// volle wijk nooit: 14 spawnpogingen in vier wijken (centrum, Paddepoel, Sterrebos, Oosterpark) gaven geen enkele.
//   node scripts/specialpeds_test.mjs
import './node3d.mjs';
import assert from 'node:assert/strict';
const { spawnPedestriansNear } = await import('../game/js/pedestrians.js');

// een rechte weg van 400 m met voetpad, geen gebouwen, geen water
const road = { id: 1, type: 'residential', width: 5, pts: [[-200, 0], [200, 0]], bounds: [-200, -3, 200, 3] };
const map = {
  roadsNear: () => [road], buildingsNear: () => [], waterNear: () => [], waterGrid: null, meta: {},
  offStreetLevel: () => false, onRingCarriageway: () => false, greenNear: () => [], isOpenSpot: () => true,
};
let n = 0;
while (spawnPedestriansNear(map, 0, 0, 1, Math.random).length && n < 500) n++;
assert.ok(n > 0 && n < 500, 'het budget raakt op: ' + n + ' wandelaars gespawnd');
assert.equal(spawnPedestriansNear(map, 0, 0, 1, Math.random).length, 0, 'zonder budget geen gewone wandelaar');
let free = 0;
for (let i = 0; i < 12; i++) free += spawnPedestriansNear(map, 0, 0, 1, Math.random, true).length;
assert.ok(free >= 9, 'een wandelaar met een rol komt er toch: ' + free + ' van 12 pogingen');
assert.equal(spawnPedestriansNear(map, 0, 0, 1, Math.random).length, 0, 'de vrije wandelaars hebben het budget niet teruggezet');
assert.equal(spawnPedestriansNear(map, 0, 0, 0, Math.random, true).length, 0, 'nul gevraagd, nul gekregen');
console.log(`specialpeds_test: ok (budget ${n}, vrij ${free}/12)`);
