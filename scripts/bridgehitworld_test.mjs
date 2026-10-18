// Ships against bridges in a tiny fake world (#9): a barge rams a low bridge,
// the deck closes to traffic, the hull is dented, the deck heals.
//   node scripts/bridgehitworld_test.mjs
import { updateBridgeHits, resetBridgeDamage, bridgeDamageOf } from '../game/js/bridgehitworld.js';
import { loweredBridgeBoomsNear } from '../game/js/movablebridges.js';
let bad = 0;
const ok = (n, c, i = '') => { if (!c) bad++; console.log(`${c ? 'ok  ' : 'FAIL'} ${n} ${i}`); };
// a road bridge along x from (-10,0) to (10,0) over a canal running along y; deck 1.8 m over the water
const road = { bridge: true, width: 6, cat: 'normal', pts: [[-10, 0], [10, 0]], z: [2.3, 2.3], name: 'Proefbrug' };
const water = { kind: 'diep', pts: [[-40, -60], [40, -60], [40, 60], [-40, 60]] };
const map = { roads: [road], roadsNear: () => [road], waterPolyAt: () => water, water: [water] };
const boat = (o) => ({ isBoat: true, x: 0, y: -22, angle: Math.PI / 2, speed: 5, health: 100, model: { kind: 'binnenvaart', len: 38, wid: 5 }, ...o });
resetBridgeDamage();
const barge = boat({});
const w = { map, player: { x: 0, y: -30 }, vehicles: [barge] };
const hits = updateBridgeHits(0.1, w);
ok('barge hits the bridge', hits.length === 1 && hits[0].severity >= 1, JSON.stringify(hits.map((h) => h.severity)));
ok('hull dented, never destroyed', barge.health < 100 && barge.health >= 10 && !barge.wrecked);
ok('barge slowed or stopped', barge.speed < 5);
const d = bridgeDamageOf(road);
ok('deck damaged and closed to traffic', d && d.level >= 2 && d.closed > 0);
ok('barriers stand for traffic', loweredBridgeBoomsNear(0, 0, 30).length === 2);
ok('no second hit in the cooldown', updateBridgeHits(0.1, { ...w, vehicles: [boat({})] }).length === 0);
for (let i = 0; i < 600; i++) updateBridgeHits(1, { ...w, vehicles: [] });
ok('deck healed, barriers gone', bridgeDamageOf(road).level === 0 && loweredBridgeBoomsNear(0, 0, 30).length === 0);
const sloep = boat({ model: { kind: 'sloep', len: 5.5, wid: 2 } });
resetBridgeDamage();
ok('a sloep does nothing', updateBridgeHits(0.1, { ...w, vehicles: [sloep] }).length === 0);
if (bad) { console.log(`${bad} failed`); process.exit(1); }
console.log('all ok');
