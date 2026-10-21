// Reiger, zeehond, vis en vluchtende koeien (#193): meshes bouwen, animeren en de updates draaien.
//   node scripts/dieren_water_test.mjs      (3D-modules in Node: zie scripts/node3d.mjs)
import './node3d.mjs';
const W = await import('../game/js/wildlife.js');
let n = 0, bad = 0;
const check = (name, c, extra = '') => { n++; if (!c) { bad++; console.log('FAIL', name, extra); } };

const poly = { pts: [[-50, -50], [50, -50], [50, 50], [-50, 50]] };
const world = (px, py, inV = null) => ({ time: 10, clock: 12, player: { x: px, y: py, vx: 0, vy: 0, inVehicle: inV }, vehicles: [], map: new Proxy({ meta: { horeca: [] }, _bridgeRails: new Map() }, { get: (t, k) => (k in t ? t[k] : () => []) }), wildlife: [], pedestrians: [], weather: null, addMessage: () => {} });

for (const kind of ['reiger', 'zeehond', 'vis']) {
  const a = { kind, x: 0, y: 0, angle: 0, speed: 0.3, z: 0, bobSeed: 1, state: kind === 'reiger' ? 'stand' : kind === 'zeehond' ? 'rust' : 'zwem', poly };
  const mesh = W.buildWildlifeMesh3D(a);
  check(kind + ': mesh heeft botten', !!(mesh && mesh.userData.bones && mesh.userData.bones.head));
  for (let t = 0; t < 20; t++) W.animateWildlifeMesh3D(mesh, a, t * 0.5);
  check(kind + ': animatie zonder NaN', Number.isFinite(mesh.position.y), String(mesh.position.y));
}

// reiger vliegt weg voor een speler die te dichtbij komt, en verdwijnt later
{
  const w = world(0, 0);
  const a = { kind: 'reiger', x: 6, y: 0, angle: 0, speed: 0, z: 0, state: 'stand', bobSeed: 0, waypointTimer: 5, wanderTarget: { x: 6, y: 0 } };
  w.player.vx = 3; // lopend
  w.wildlife.push(a);
  W.updateWildlife(0.1, w);
  check('reiger schrikt van een lopende speler', a.state === 'fly');
  for (let i = 0; i < 100; i++) W.updateWildlife(0.1, w);
  check('reiger is weggevlogen en verdwenen', a.gone === true && a.z > 3);
  check('reiger vliegt van de speler af', a.x > 6);
}
// zeehond duikt weg
{
  const w = world(0, 0);
  w.player.inVehicle = { speed: 8 };
  const a = { kind: 'zeehond', x: 10, y: 0, angle: 0, speed: 0, state: 'rust', bobSeed: 0, poly, wanderTarget: { x: 10, y: 0 }, waypointTimer: 5 };
  w.wildlife.push(a);
  W.updateWildlife(0.1, w);
  check('zeehond duikt voor een voertuig', a.state === 'duik');
  for (let i = 0; i < 40; i++) W.updateWildlife(0.1, w);
  check('zeehond is na het duiken weg', a.gone === true);
}
// vis schiet weg en blijft in het water
{
  const w = world(0, 0);
  w.player.vx = 3;
  const a = { kind: 'vis', x: 2, y: 0, angle: Math.PI, speed: 0.4, state: 'zwem', bobSeed: 0, poly, wanderTarget: { x: 2, y: 0 }, waypointTimer: 3 };
  w.wildlife.push(a);
  for (let i = 0; i < 60; i++) W.updateWildlife(0.1, w);
  check('vis blijft binnen het water', Math.abs(a.x) <= 50 && Math.abs(a.y) <= 50);
  check('vis wijkt voor de speler', Math.hypot(a.x, a.y) > 2);
}
// koe stapt weg voor een voertuig, een stilstaande koe niet voor een stilstaande speler ver weg
{
  const w = world(0, 0, { speed: 9 });
  const koe = { kind: 'cow', x: 8, y: 0, angle: 0, speed: 0, wanderTarget: { x: 8, y: 0 }, homeX: 8, homeY: 0, homeRadius: 5, waypointTimer: 5, bobSeed: 0 };
  W.updateHerd(koe, 0.1, w);
  check('koe stapt weg voor een voertuig', koe.fleeT > 0 && koe.wanderTarget.x > 8);
  const w2 = world(0, 0);
  const koe2 = { kind: 'cow', x: 40, y: 0, angle: 0, speed: 0, wanderTarget: { x: 40, y: 0 }, homeX: 40, homeY: 0, homeRadius: 5, waypointTimer: 5, bobSeed: 0 };
  W.updateHerd(koe2, 0.1, w2);
  check('koe ver weg blijft kalm', !(koe2.fleeT > 0));
}
console.log(`dieren_water_test: ${n - bad}/${n} ok`);
process.exit(bad ? 1 : 0);
