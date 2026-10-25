// Headless run of the real on-foot controller (player.js) against a parked
// car on the real city map: walking into it is blocked, SPACE climbs onto
// the roof, you can walk on it, and SPACE hops off without ending up inside
// the car; a van stays blocking; a car pulling away throws you off.
//   node scripts/vault_sim.mjs   (needs desktop/vendor-cache, see node3d.mjs)
import './node3d.mjs';
import fs from 'node:fs';

import { loadCityWorld } from './lib/loadworld.mjs';
const { Vehicle, pushCircleOutOfVehicle } = await import('../game/js/vehicle.js');
const { Player } = await import('../game/js/player.js');
const { vehicleHeight } = await import('../game/js/vaultkit.js');

const root = new URL('../game/', import.meta.url);
const map = (await loadCityWorld()).map;

let fails = 0;
const check = (name, ok, extra = '') => { if (!ok) { fails++; console.log('FAIL', name, extra); } else console.log('ok  ', name); };

function makeInput() {
  const st = { down: new Set(), pressed: new Set(), ay: 0 };
  return {
    st,
    wasPressed: (k) => st.pressed.has(k),
    isDown: (k) => st.down.has(k),
    axis: () => [0, st.ay],
    lookActive: () => false,
    mouse: { dx: 0, dy: 0, down: false, rightDown: false, wheel: 0 },
  };
}

// an open street spot, heading east, with room around it
function scene(model, carSpeed = 0) {
  const sp = map.findOpenSpawn(...findStart(), 400);
  const p = new Player(sp.x, sp.y);
  p.radius = 0.35;
  p.angle = 0;
  const v = new Vehicle(sp.x + 1.4 + model.wid / 2, sp.y, Math.PI / 2, model);
  v.speed = carSpeed;
  const input = makeInput();
  const world = { input, map, vehicles: [v], time: 0, camYaw: 0, audioEvents: [], pedestrians: [], companion: null, health: 100, armor: 0, ammo: {}, weapon: null, particles: [] };
  return { p, v, world, input };
}
function findStart() {
  const lm = map.meta.landmarks || [];
  return lm.length ? [lm[0].x, lm[0].y] : [0, 0];
}
function step(s, n = 1, keys = {}) {
  for (let i = 0; i < n; i++) {
    s.input.st.ay = keys.fwd ? -1 : 0;
    s.input.st.pressed = new Set(i === 0 && keys.space ? [' '] : []);
    s.p.update(1 / 60, s.world);
    s.world.time += 1 / 60;
    s.world.audioEvents.length = 0;
  }
}
const inside = (s) => !!pushCircleOutOfVehicle(s.p.x, s.p.y, 0.2, s.v) && s.p.gz + s.p.z < (s.v.z || 0) + vehicleHeight(s.v) - 0.1;

const SEDAN = { name: 'sedan', len: 4.4, wid: 1.8, maxSpeed: 15, accel: 3, brake: 6, turnRate: 1.5 };
const VAN = { name: 'van', len: 5, wid: 2, maxSpeed: 13, accel: 2.5, brake: 6, turnRate: 1.3 };

{
  const s = scene(SEDAN);
  step(s, 90, { fwd: true });
  check('walking into a parked car is blocked', !inside(s) && s.p.z === 0 && s.p.x < s.v.x - s.v.halfWid);
  step(s, 1, { fwd: true, space: true });
  check('SPACE at a car starts the climb', !!(s.p.vault && s.p.vault.climb));
  step(s, 40);
  check('standing on the roof', !!s.p.perch && Math.abs(s.p.gz + s.p.z - vehicleHeight(s.v)) < 1e-6, `z=${s.p.z}`);
  let maxAir = 0;
  for (let i = 0; i < 60; i++) { step(s, 1, { fwd: true, space: i === 0 }); maxAir = Math.max(maxAir, s.p.z); if (inside(s)) break; }
  step(s, 120, { fwd: true });
  check('hopped off the far side onto the street', !s.p.perch && s.p.z === 0 && s.p.x > s.v.x + s.v.halfWid && !inside(s), `x=${(s.p.x - s.v.x).toFixed(2)} z=${s.p.z}`);
  check('SPACE on the roof is a step off, not a second jump (#434)', maxAir < vehicleHeight(s.v) + 0.2, `top=${maxAir.toFixed(2)}`);
}
{
  const s = scene(SEDAN);
  step(s, 90, { fwd: true });
  step(s, 1, { fwd: true, space: true });
  step(s, 40);
  // walk along the roof off the side: steps down, never inside
  let wasInside = false;
  s.world.camYaw = 0;
  for (let i = 0; i < 200; i++) { step(s, 1, { fwd: true }); wasInside ||= inside(s); }
  check('walking off the roof steps down beside the car', !s.p.perch && s.p.z === 0 && !wasInside);
}
{
  const s = scene(SEDAN);
  step(s, 90, { fwd: true });
  step(s, 1, { fwd: true, space: true });
  step(s, 40);
  s.v.speed = 9;
  step(s, 1);
  step(s, 120);
  check('a car pulling away throws you off, not into it', !s.p.perch && s.p.z === 0 && !inside(s));
}
{
  const s = scene(VAN);
  step(s, 90, { fwd: true });
  step(s, 1, { fwd: true, space: true });
  check('a van is not climbed: plain jump', !s.p.vault && s.p.vz > 0);
  step(s, 60, { fwd: true });
  check('and it stays blocking', !inside(s) && s.p.x < s.v.x - s.v.halfWid);
}
{
  const s = scene(SEDAN);
  step(s, 1, { space: true });
  check('SPACE in the open: a plain jump', !s.p.vault && s.p.vz > 0);
  step(s, 60);
  check('lands back on the ground', s.p.z === 0 && !s.p.perch);
}

// a fence / low wall across the path, as a collider with a height
const { addStaticCollider } = await import('../game/js/breakables.js');
function fenceScene(h, a) {
  const s = scene(SEDAN);
  s.world.vehicles.length = 0;
  s.world.camYaw = a;
  s.p.angle = a;
  const ux = Math.cos(a), uy = Math.sin(a), x0 = s.p.x, y0 = s.p.y;
  addStaticCollider('post', x0 + ux * 1.5, y0 + uy * 1.5, 0.1, 1.5, a + Math.PI / 2, false, h);
  // how far past the fence line the player is
  return { ...s, past: () => (s.p.x - x0) * ux + (s.p.y - y0) * uy - 1.5 };
}
{
  const s = fenceScene(1.1, 0);
  step(s, 90, { fwd: true });
  check('a 1.1 m fence blocks walking', s.past() < 0);
  step(s, 1, { fwd: true, space: true });
  step(s, 40, { fwd: true });
  check('SPACE vaults it', s.past() > 0.3 && s.p.z === 0, `past=${s.past().toFixed(2)}`);
}
{
  const s = fenceScene(1.2, Math.PI / 2);
  step(s, 1, { fwd: true, space: true });
  step(s, 90, { fwd: true });
  check('a jump taken 1.5 m early still goes over the fence', s.past() > 0.3, `past=${s.past().toFixed(2)}`);
}
{
  const s = fenceScene(2.2, Math.PI);
  step(s, 90, { fwd: true });
  step(s, 1, { fwd: true, space: true });
  step(s, 60, { fwd: true });
  check('a 2.2 m wall stays blocking', s.past() < 0 && !s.p.vault);
}

console.log(fails ? `${fails} failed` : 'all passed');
process.exit(fails ? 1 : 0);
