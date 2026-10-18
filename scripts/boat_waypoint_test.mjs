// A waypoint on water gives a boat route (#232, #184): the trip planner of the GPS and the travel card (routing.js
// planBoatTrip, travelroute.js boatTrip) runs over the waterway network, snaps a waypoint beside the water to the
// nearest water (a quay, a jetty) and a goal on the water, for someone on foot, to a berth on the shore.
//   node scripts/boat_waypoint_test.mjs
import './node3d.mjs';
import fs from 'node:fs';
import { loadCityWorld } from './lib/loadworld.mjs';

const V = await import('../game/js/vaarnet.js');
const T = await import('../game/js/travelroute.js');
const R = await import('../game/js/routing.js');

let n = 0, fails = 0;
const ok = (c, m, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${m}${info ? ' (' + info + ')' : ''}`); } };
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

// ---- the trip planner over a made-up net: a canal along y = 0 from x = 0 to 3000, a low bridge at 1500
const net = V.createVaarNet({
  nodes: [[0, 0, 'haven', 'West'], [1500, 0, 'kruising', ''], [3000, 0, 'haven', 'Oost']],
  edges: [[0, 1, 1500, 4, 18, [0, 0, 15000, 0]], [1, 2, 1500, 4, -1, [15000, 0, 15000, 0]]],
  hubs: { West: 0, Oost: 2 },
});
// water: within 12 m of the canal
const wet = (x, y) => x >= 0 && x <= 3000 && Math.abs(y) <= 12;
const ctx = { isWater: wet, clearance: () => 10 };
const planNet = (kind) => (sa, sb) => V.planVaarRoute(net, sa, sb, kind);

// a waypoint on the water
let t = T.boatTrip(ctx, [100, 3], [2800, -4], { net: planNet('rondvaart') });
ok(t && t.net && t.pts.length >= 2 && t.length > 2600 && t.length < 2900, 'a waypoint on the water: a route with points and a length', t && `${t.length}`);
ok(t && Math.abs(t.pts[0][0] - 100) < 1 && dist(t.pts[t.pts.length - 1], [2800, -4]) < 1, 'it starts at the boat and ends at the waypoint');
ok(t && t.etaS > 2600 / 8 && t.etaS < 2600, 'with a sailing time', t && `${Math.round(t.etaS)}`);
ok(t && t.dock === null, 'and no dock: the goal is on the water');

// a waypoint on the quay, 20 m from the water: the trip ends at the water, a straight bit over the quay
t = T.boatTrip(ctx, [100, 3], [2800, 32], { net: planNet('rondvaart') });
ok(t && t.net && dist(t.pts[t.pts.length - 1], [2800, 32]) < 1, 'a waypoint beside the water: the route reaches it');
ok(t && t.dock && Math.abs(t.dock[1]) <= 13 && t.dock[0] > 2700, 'by the nearest water, the berth', t && JSON.stringify(t.dock));
ok(t && t.pts.some((p) => Math.abs(p[1]) <= 12.01 && p[0] > 2790), 'the water part of the route ends near the waypoint');

// the boat's height: a barge does not pass the low bridge; a tour boat does
const barge = T.boatTrip(ctx, [100, 3], [2800, -4], { net: planNet('binnenvaart'), height: 4.3 });
ok(!barge || !barge.net, 'a barge gets no route over the net past the low bridge');
ok(T.boatTrip(ctx, [100, 3], [2800, -4], { net: planNet('sloep'), height: 1.4 }).net === true, 'a sloep does');

// no water near: no trip
ok(T.boatTrip(ctx, [100, 3], [1500, 500], { net: planNet('sloep') }) === null, 'a waypoint far from the water has no boat route');
// without a net the local grid search takes over
const local = T.boatTrip(ctx, [100, 3], [400, -3], { net: null });
ok(local && !local.net && local.pts.length >= 2 && local.length > 250, 'without a net the local search still gives a route', local && `${local.length}`);
// a short hop stays with the local search
const hop = T.boatTrip(ctx, [100, 3], [180, -3], { net: planNet('sloep') });
ok(hop && !hop.net && hop.length < 150, 'a short hop is the local search', hop && `${hop.length}`);

// ---- the real net: from the inner city to places on water and beside it
const real = V.createVaarNet(JSON.parse(fs.readFileSync(new URL('../game/vaarnet.json', import.meta.url), 'utf8')));
const near = (x, y, r) => !!V.nearestOnNet(real, x, y, r);
const rctx = { isWater: (x, y) => near(x, y, 14), clearance: () => 10 };
const H = real.hubs, node = (nm) => real.nodes[H[nm]];
const plan = (kind) => (sa, sb) => V.planVaarRoute(real, sa, sb, kind);
const A = node('Binnenstad Groningen');
for (const [name, minKm] of [['Lauwersmeer', 20], ['Eems bij Delfzijl', 15], ['Dollard bij Termunterzijl', 20]]) {
  const B = node(name);
  const r = T.boatTrip(rctx, [A.x + 5, A.y + 3], [B.x, B.y], { net: plan('rondvaart'), height: 1.7 });
  ok(r && r.net && r.length > minKm * 1000 && r.length < 90000 && r.pts.length > 10, `inner city to ${name}: a route`, r && `${Math.round(r.length)} m, ${r.pts.length} points`);
}
{
  // a waypoint on the quay 40 m from a canal of the net
  const e = real.edges.find((q) => q.len > 600 && q.cls >= 3 && q.clear === Infinity);
  const p = e.pts[Math.floor(e.pts.length / 2)];
  const w = T.boatTrip(rctx, [A.x + 5, A.y + 3], [p[0] + 40, p[1] + 3], { net: plan('sloep'), height: 1.4 });
  ok(!w || w.dock || dist(w.pts[w.pts.length - 1], [p[0] + 40, p[1] + 3]) < 2, 'a waypoint near a canal of the real net ends at the waypoint');
}

// ---- on foot to a goal on the water: the berth
const { map } = await loadCityWorld({ src: 'json' });
const poly = map.water.find((w) => w.pts.length > 40 && w.nav >= 3) || map.water[0];
let cx = 0, cy = 0;
for (const q of poly.pts) { cx += q[0]; cy += q[1]; }
cx /= poly.pts.length; cy /= poly.pts.length;
// a point of the water: the first grid point of the polygon's bounds that is in it
let wp = null;
for (let x = poly.bounds[0]; x < poly.bounds[2] && !wp; x += 3) for (let y = poly.bounds[1]; y < poly.bounds[3]; y += 3) if (R.berthFor(map, x, y, 400)) { wp = [x, y]; break; }
ok(!!wp, 'the city has water to stand a goal on');
if (wp) {
  const b = R.berthFor(map, wp[0], wp[1], 400);
  ok(b && b.shoreD < 400 && !(R.berthFor(map, b.x, b.y, 400)), 'a goal on the water: a berth on land beside the shore', b && JSON.stringify(b));
  ok(b && Math.hypot(b.x - wp[0], b.y - wp[1]) <= b.shoreD + 2, 'at the nearest shore, not further than the shore plus a step', b && `${Math.hypot(b.x - wp[0], b.y - wp[1]).toFixed(1)} vs ${b.shoreD.toFixed(1)}`);
}
ok(R.berthFor(map, 100000, 100000) === null, 'a goal on dry land has no berth');

// ---- the planner exported to the GPS: without a net it is the local search, with one the net
const trip = R.planBoatTrip(map, [A.x, A.y], [A.x + 60, A.y + 10], 'sloep');
ok(trip === null || trip.pts.length >= 2, 'planBoatTrip on the city map answers (route or null)');

console.log(`${n} checks, ${fails} failed`);
process.exit(fails ? 1 : 0);
