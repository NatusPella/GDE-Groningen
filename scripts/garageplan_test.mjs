// Logic test for the parking garage plan (game/js/garageplan.js, #418): the hall layout, the gate and its place, the cars.
//   node scripts/garageplan_test.mjs
import * as G from '../game/js/garageplan.js';

let fails = 0, n = 0;
const ok = (c, name, extra) => { n++; if (!c) { fails++; console.log('FAIL', name, extra !== undefined ? JSON.stringify(extra) : ''); } };
let seed = 5;
const rng = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);

// the hall: bays inside the walls, none on top of one another, none on a column, rows clear of the aisles
const L = G.hallLayout();
ok(L.L === G.HALL_L && L.W === G.HALL_W, 'the size of the hall');
ok(L.bays.length === 4 * L.n && L.n >= 12, 'four rows of bays', L.n);
for (const b of L.bays) {
  ok(b.u - b.wid / 2 >= 0 && b.u + b.wid / 2 <= L.L && Math.abs(b.v) + b.len / 2 <= L.hw + 2.5 + 0.01, 'a bay lies in the hall', b);
}
const overlap = (a, b) => Math.abs(a.u - b.u) < (a.wid + b.wid) / 2 - 0.01 && Math.abs(a.v - b.v) < (a.len + b.len) / 2 - 0.01;
let overlaps = 0;
for (let i = 0; i < L.bays.length; i++) for (let j = i + 1; j < L.bays.length; j++) if (overlap(L.bays[i], L.bays[j])) overlaps++;
ok(overlaps === 0, 'no two bays overlap', overlaps);
// a column stands between two bays, never in the middle of one
let inBay = 0;
for (const c of L.columns) for (const b of L.bays) if (Math.abs(c.u - b.u) < b.wid / 2 - G.COLUMN / 2 - 0.05 && Math.abs(c.v - b.v) < b.len / 2) inBay++;
ok(inBay === 0, 'no column inside a bay', inBay);
// the aisles are free: no bay reaches into v between the rows
for (const b of L.bays) {
  const lo = b.v - b.len / 2, hi = b.v + b.len / 2;
  for (const [v0, v1] of [[-11, -5], [5, 11]]) ok(hi <= v0 + 0.01 || lo >= v1 - 0.01, 'a bay keeps out of the aisles', { b, v0, v1 });
}
// both aisles are as wide as an aisle must be, and open at the ends where the cross lanes run
ok(L.rowsV.length === 4, 'four rows');
const aisleW = [L.rowsV[1][0] - L.rowsV[0][1], L.rowsV[3][0] - L.rowsV[2][1]];
ok(aisleW.every((w) => w >= G.AISLE - 0.01), 'aisles of at least 6 m', aisleW);
ok(L.bays[0].u - L.bays[0].wid / 2 >= 5 && G.HALL_L - (L.bays[L.n - 1].u + L.bays[L.n - 1].wid / 2) >= 5, 'a cross lane of 5 m at both ends');
// the exit and the arrival: the exit is in the wall u = 0 and wide enough; the arrival is in an aisle clear of the exit zone
ok(L.opening.v1 - L.opening.v0 >= 6.5, 'the exit is wide enough');
ok(L.arrive.u > L.exitZone.u1 + 2, 'the arrival is clear of the exit zone');
ok(L.arrive.v > -11 && L.arrive.v < -5, 'the arrival is in an aisle');
ok(L.arrive.u > 0 && L.arrive.u < L.bays[0].u - L.bays[0].wid / 2 + 2, 'the arrival is in the cross lane');
ok(L.lights.every((l) => l.u > 0 && l.u < L.L && Math.abs(l.v) < L.hw), 'lights in the hall');
ok(L.arrows.every((a) => a.u > 0 && a.u < L.L && Math.abs(a.v) < L.hw), 'arrows in the hall');
ok(G.CEIL_Z - G.FLOOR_Z >= 3, 'a ceiling at least 3 m high');
ok(G.CEIL_Z < -0.5 && G.FLOOR_Z < -3.5, 'the hall lies under the street and below the level where buildings stop counting (vehicle.js)');

// frames: world and local agree
const f = { x: 120, y: -40, angle: 0.7 };
for (const [p, q] of [[0, 0], [10, 3], [-4, 8]]) {
  const [x, y] = G.toWorld(f, p, q), [p2, q2] = G.toLocal(f, x, y);
  ok(Math.abs(p - p2) < 1e-9 && Math.abs(q - q2) < 1e-9, 'toWorld and toLocal are inverses', [p, q, p2, q2]);
}
const hf = G.hallFrame(null, [100, 50], 0);
ok(G.inHall(hf, 100, 50) && G.inHall(hf, 120, 50) && !G.inHall(hf, 130, 50), 'a hall without an outline is centred on the point');
// an outline: the hall takes the long axis and the middle
const poly = [[0, 0], [60, 0], [60, 36], [0, 36], [0, 0]];
const pf = G.hallFrame(poly, [30, 18], 0);
ok(Math.abs(Math.cos(pf.angle)) > 0.99, 'the long axis of the outline', pf.angle);
const mid = G.toWorld(pf, G.HALL_L / 2, 0);
ok(G.inHall(pf, 30, 18) && Math.abs(mid[0] - 30) < 1e-6 && Math.abs(mid[1] - 18) < 1e-6, 'the hall is centred in the outline');
const poly2 = [[0, 0], [36, 0], [36, 60], [0, 60], [0, 0]];
const pf2 = G.hallFrame(poly2, [18, 30], 0);
ok(Math.abs(Math.sin(pf2.angle)) > 0.99, 'the long axis of a tall outline', pf2.angle);

// zones
const ex = G.toWorld(f, 1, 0);
ok(G.inExitZone(L, f, ex[0], ex[1]), 'a point just in front of the exit is in its zone');
const ar = G.toWorld(f, L.arrive.u, L.arrive.v);
ok(!G.inExitZone(L, f, ar[0], ar[1]), 'the arrival is not in the exit zone');
const gate = { x: 10, y: 10, angle: -1.1 };
const gz = G.toWorld(gate, -2.4, 0);
const gfront = G.toWorld(gate, 1, 0), gside = G.toWorld(gate, -2.4, 5);
ok(G.inGateZone(gate, gz[0], gz[1]) && !G.inGateZone(gate, gfront[0], gfront[1]) && !G.inGateZone(gate, gside[0], gside[1]), 'the gate zone is behind the opening, inside the building');
const out = G.toWorld(gate, G.GATE.out.a, G.GATE.out.b);
ok(!G.inGateZone(gate, out[0], out[1]), 'whoever comes out stands outside the zone');

// the gate's place: on a map of cells that are free except a block of buildings and a road
const blocks = [[0, 0, 40, 30]];   // a building
const free = (x, y) => !blocks.some(([x0, y0, x1, y1]) => x >= x0 && x <= x1 && y >= y0 && y <= y1) && Math.hypot(x - 100, y - 100) > 4 && !(y > 55 && y < 64);   // a pond at (100,100) and a car road along y 55..64
const roadDir = (x, y) => ({ x, y: 59.5, dist: Math.abs(y - 59.5), angle: 0 });
const g = G.planGate(free, roadDir, 20, 15, { radius: 80, step: 3 });
ok(g !== null, 'a gate is found on a free map');
if (g) {
  ok(free(g.x, g.y), 'the gate stands on free ground');
  let allFree = true;
  for (let a = G.GATE.clearA0; a <= G.GATE.clearA1; a += 3) for (let b = -G.GATE.clearB; b <= G.GATE.clearB; b += 3) {
    const [x, y] = G.toWorld(g, a, b);
    if (!free(x, y)) allFree = false;
  }
  ok(allFree, 'the whole place is free');
  // the opening faces the road: the road lies on the side of the opening
  const road = roadDir(g.x, g.y);
  ok(Math.sin(g.angle) * Math.sign(road.y - g.y) > 0.9, 'the opening faces the road', g);
}
ok(G.planGate(() => false, roadDir, 0, 0, { radius: 30 }) === null, 'no gate where nothing is free');
ok(G.planGate(free, () => null, 20, 15, { radius: 40 }) === null, 'no gate without a road in reach');
const near = G.planGate(free, roadDir, 20, 45, { radius: 60, step: 3 });
const far = G.planGate(free, roadDir, 20, 15, { radius: 60, step: 3 });
ok(near && far && near.score <= far.score + 1e-9, 'a spot nearer to the hall and the road scores better');

// the cars: a share of the bays, models that fit, the same every time for a seed
const MODELS = [{ len: 3.8, wid: 1.7 }, { len: 4.5, wid: 1.8 }, { len: 5.0, wid: 2.0 }, { len: 11, wid: 2.5 }];
seed = 9; const s1 = G.carSlots(L, MODELS, rng, 0.55);
seed = 9; const s2 = G.carSlots(L, MODELS, rng, 0.55);
ok(JSON.stringify(s1) === JSON.stringify(s2), 'the same seed puts the same cars in');
ok(s1.length > L.bays.length * 0.4 && s1.length < L.bays.length * 0.7, 'about half of the bays hold a car', s1.length);
ok(s1.every((c) => c.model.len <= G.BAY_D - 0.4 && c.model.wid <= G.BAY_W - 0.5), 'every car fits its bay');
ok(s1.every((c) => Math.abs(Math.abs(c.angle) - Math.PI / 2) < 1e-9), 'cars stand across the rows');
ok(s1.every((c) => c.row >= 0 && c.row < 4), 'every car has a row');
seed = 3; const full = G.carSlots(L, MODELS, rng, 1);
ok(full.length === L.bays.length, 'a full garage is every bay', full.length);
seed = 3; const none = G.carSlots(L, MODELS, rng, 0);
ok(none.length < 3, 'an empty garage', none.length);

console.log(fails ? `${fails} FAILED of ${n}` : `garageplan_test: ${n}/${n} ok`);
process.exit(fails ? 1 : 0);
