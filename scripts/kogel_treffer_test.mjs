// A police bullet is swept along its whole step against the player and against a guest (Samen spelen), like against pedestrians.
// Tested at the end point only, a 42 m/s shot stepped over a body on a long frame, so damage on foot depended on the frame rate.
// A guest's height is compared with the bullet's absolute height (b.z), so a guest on a viaduct or dyke can be hit as well.
//   node scripts/kogel_treffer_test.mjs
import './node3d.mjs';
import assert from 'node:assert/strict';
const { updateBullets } = await import('../game/js/combat.js');

const MAP = { roads: [], roadsNear: () => [], buildingsNear: () => [], wallsNear: () => [], waterNear: () => [], inWater: () => false, inWaterRaw: () => false, offStreetLevel: () => 0 };
const wereld = (extra = {}) => ({
  time: 10, map: MAP, player: { x: 0, y: 0, radius: 0.35, z: 0, gz: 0, health: 100 }, vehicles: [], pedestrians: [], props: [], bullets: [], particles: [],
  stats: { kills: 0, copKills: 0, pedKills: 0 }, wanted: 3, armor: 0, health: 100, audioEvents: [], addMessage() {}, ...extra,
});
const schot = (x, z) => ({ x, y: 0, z, vx: 42, vy: 0, damage: 7, owner: 'police', range: 100, traveled: 0 });
// true when the bullet was used up before it passed the body at x = 0 by more than one step
function geraakt(w, dt, stappen) {
  for (let i = 0; i < stappen && w.bullets.length; i++) updateBullets(dt, w);
  return w.bullets.length === 0;
}

let n = 0;
for (const fps of [60, 30, 20, 15]) {
  // start so that no step ends inside the body at 20 and 15 fps: 5 m behind, steps of 42 / fps
  const w = wereld(); w.bullets.push(schot(-5, 1.25));
  assert.ok(geraakt(w, 1 / fps, 12), `${fps} fps: de kogel van de politie raakt de speler te voet`); n++;
}
{
  const w = wereld(); w.bullets.push({ ...schot(-5, 1.25), y: 3 });
  assert.ok(!geraakt(w, 1 / 20, 6), 'een kogel drie meter ernaast raakt de speler niet'); n++;
}
const gastWereld = (gz) => {
  const schade = [];
  const w = wereld({ player: { x: -50, y: -50, radius: 0.4, z: 0, gz: 0 }, coop: { remote: true, remoteInput: null },
    coopFigures: { 2: { slot: 2, x: 0, y: 0, angle: 0, gz, input: null, char: 'a' } } });
  w.coopSchade = (slot, d) => schade.push([slot, d]);
  return { w, schade };
};
for (const fps of [60, 20]) {
  const { w, schade } = gastWereld(0); w.bullets.push(schot(-5, 1.25));
  geraakt(w, 1 / fps, 12);
  assert.deepEqual(schade, [[2, 7]], `${fps} fps: de kogel raakt de gast op straathoogte`); n++;
}
{
  const { w, schade } = gastWereld(6); w.bullets.push(schot(-5, 7.25));
  geraakt(w, 1 / 60, 12);
  assert.deepEqual(schade, [[2, 7]], 'een gast op een viaduct (6 m) is te raken door een kogel op zijn hoogte'); n++;
}
{
  const { w, schade } = gastWereld(6); w.bullets.push(schot(-5, 1.25));
  geraakt(w, 1 / 60, 12);
  assert.deepEqual(schade, [], 'een kogel op straathoogte raakt de gast op het viaduct niet'); n++;
}
console.log(`ok: kogel_treffer_test (${n} controles)`);
