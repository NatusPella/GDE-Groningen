// A viaduct over a busway the map does not carry (mapextras busRoads, which
// mapdata.js turns into roads of their own) clears it by the road class after
// the solve, and a shallow crossing is cleared along its whole overlap.
//   node scripts/profile_busway_test.mjs
import { solve, apply, busRoadsOf, restoreBusRoads, overlapReach } from './world/profile.mjs';
import { clearanceUnder } from '../game/js/roadprofile.js';

let n = 0, fails = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FAIL ' + m); } };

const road = (pts, extra = {}) => ({ pts, cat: 'major', type: 'secondary', width: 7, ...extra });
// a bridge (layer 1) running north over a busway that runs east, both flat in the map
const deck = road([[0, -80], [0, -30], [0, 0], [0, 30], [0, 80]], { bridge: true, layer: 1, z: [0, 1, 1, 1, 0] });
const approach = [road([[0, -300], [0, -80]]), road([[0, 80], [0, 300]])];
const data = { roads: [deck, ...approach], rails: [], water: [] };
const extras = { busRoads: [
  { pts: [[-60, 10], [60, 10]], name: 'Teststraat', width: 6.4, oneway: false, bridge: false, osmType: 'busway' },
  { pts: [[0, -300], [0, -80]], name: 'volgt een weg', width: 6.4 },
] };

const bus = busRoadsOf(data, extras);
ok(bus.length === 1 && bus[0].entry.name === 'Teststraat', 'only a busway that follows no road of the map is solved with it');
for (const { road: r } of bus) data.roads.push(r);
const sol = solve(data, {});
apply(data, sol);
const b = bus[0].road;
ok(!!deck.z, 'the viaduct got a profile');
const zDeck = Math.max(...deck.z);
const zBus = b.z ? Math.max(...b.z) : 0;
ok(zDeck - zBus >= clearanceUnder(b) - 0.06, `viaduct clears the busway by the road class (${(zDeck - zBus).toFixed(2)} of ${clearanceUnder(b).toFixed(2)} m)`);
ok(restoreBusRoads(bus) >= 0 && bus[0].entry.pts.length >= 2, 'the profile goes back into the extras entry');

// the reach along a road grows as the crossing gets shallower
const mk = (a, b2) => ({ a: { pts: [[0, 0], a] }, i: 0, b: { pts: [[0, 0], b2] }, j: 0 });
const lo = { width: 2.5 }, up = {};
ok(overlapReach(mk([100, 0], [0, 100]), up, lo) < overlapReach(mk([100, 0], [100, 15]), up, lo), 'a shallow crossing is cleared further along');
ok(overlapReach(mk([100, 0], [100, 0.1]), up, lo) <= 43.01, 'the reach is capped');

console.log(fails ? `${fails} of ${n} FAILED` : `${n} busway profile checks passed`);
process.exit(fails ? 1 : 0);
