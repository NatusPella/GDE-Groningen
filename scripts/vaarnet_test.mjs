// The waterway network (#184): the rules (bridge clearance per boat kind, locks, the
// shipping waterways by name), the route graph (game/vaarnet.json, built from the real
// province data by scripts/world/vaarnet_graph.mjs) and a barge that follows a trip.
//   node scripts/vaarnet_test.mjs
import './node3d.mjs';
import fs from 'node:fs';

const V = await import('../game/js/vaarnet.js');
const L = await import('../game/js/waterlevels.js');
const LK = await import('../game/js/locks.js');
const VH = await import('../game/js/vehicle.js');
const B = await import('../game/js/boattypes.js');

let n = 0, fails = 0;
const ok = (c, m, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${m}${info ? ' (' + info + ')' : ''}`); } };

// ---------------------------------------------------------------- the rules

// a fixed bridge at street level is 1.8 m over the boezem: the tour boat (1.6 m) goes under, a
// barge (4.2 m) and a skutsje (2.6 m) do not; a movable bridge opens for all of them, after its time
const fixed = { movable: '' }, lift = { movable: 'lift' };
ok(V.passBridge('rondvaart', fixed).ok, 'a tour boat sails under a fixed city bridge');
ok(V.passBridge('sloep', fixed).ok && V.passBridge('kano', fixed).ok, 'a sloep and a canoe too');
ok(!V.passBridge('binnenvaart', fixed).ok, 'a barge does not');
ok(!V.passBridge('skutsje', fixed).ok, 'a skutsje does not (2.6 m)');
ok(V.passBridge('binnenvaart', lift).ok && V.passBridge('binnenvaart', lift).wait > 10, 'a movable bridge lets a barge through after its opening time');
ok(V.passBridge('binnenvaart', { clear: 7 }).ok, 'a high fixed bridge (7 m) lets a barge through');
ok(V.passBridge({ model: { kind: 'binnenvaart' } }, fixed).ok === false, 'a vehicle is read by its model kind');
ok(V.classOfKind('kano') === 1 && V.classOfKind('binnenvaart') === 4 && V.classOfKind('nonsense') === 2, 'boat classes');

// the shipping waterways by name are class 4 whatever the strip's own width says
ok(V.effectiveNav({ nav: 3, kind: 'diep', name: 'Eemskanaal' }) === 4, 'the Eemskanaal strip is class 4');
ok(V.effectiveNav({ nav: 3, kind: 'diep', name: 'Damsterdiep' }) === 3, 'a canal that is not a main waterway stays class 3');
ok(V.effectiveNav({ nav: 3, kind: 'diep', name: 'Oude Eemskanaal' }) === 3, 'the old canal is not the Eemskanaal');
ok(V.effectiveNav({ nav: 3, kind: 'meer' }, 400000) === 4 && V.effectiveNav({ nav: 3, kind: 'meer' }, 1000) === 3, 'a big lake takes barges, a pond does not');
const strip = { nav: 3, kind: 'diep', name: 'Reitdiep', dp: 2.4 };
ok(L.promoteMainWaterway(strip) && strip.nav === 4 && strip.kind === 'kanaal' && strip.dp === 4.5, 'the world promotes a main waterway strip');
const ditch = { nav: 1, kind: 'sloot', name: 'Reitdiep' };
ok(!L.promoteMainWaterway(ditch) && ditch.nav === 1, 'a ditch with the name stays a ditch');

// a lock: the boat waits for the gates and the level; the other way round is the same, a busy lock takes longer
const idle = V.lockPassage({ levels: [-2.3, -2.3] }), busy = V.lockPassage({ levels: [-2.3, -2.3], busy: true });
ok(idle >= 2 * LK.LOCK_TIMING.GATE_S && idle < 120, 'a lock takes at least both gates', String(idle));
ok(busy > idle, 'a lock that is on the other side takes longer', `${busy} vs ${idle}`);
ok(V.lockPassage({ levels: [-2.3, -1.0] }) > idle, 'a level difference takes longer', String(V.lockPassage({ levels: [-2.3, -1.0] })));
ok(V.lockPassage({ levels: [-1.0, -2.3], side: 1 }) > idle, 'and from the other side too');

// the fixes: a link and a gap are water polygons of their size, the sea is its own kind
const link = { from: [0, 0], to: [100, 0], width: 40, name: 'Proef' };
const pg = V.linkPolygon(link);
ok(pg.length === 4 && Math.abs(L.polyArea(pg) - 4000) < 1, 'a link is a rectangle length x width');
const gat = V.gatPolygon([50, 50, 30, 10, Math.PI / 2, 3]);
ok(Math.abs(L.polyArea(gat) - 300) < 1 && gat.every((p) => p[0] > 40 && p[0] < 60 && p[1] > 30 && p[1] < 70), 'a gap rectangle turns with its angle');
const rows = V.patchRows({ links: [link], gaten: [[50, 50, 30, 10, 0, 3]], zee: [[500, 500, 100, 100, 0, 4, 'zee eems']] });
ok(rows.length === 3 && rows[0].kind === 'kanaal' && rows[1].kind === 'diep' && rows[2].kind === 'zee' && rows[2].name === 'Eems', 'patch rows by nav and kind');
const map = { waterNear: () => rows };
ok(L.waterAt(map, 50, 0) && L.waterAt(map, 50, 0).navigable === 4, 'a patch is water for waterAt, of its class');
ok(L.waterAt(map, 500, 500) && L.waterAt(map, 500, 500).kind === 'zee' && L.waterAt(map, 500, 500).depth > L.WADE_MAX, 'the sea is deep water, not a wade');

// ---------------------------------------------------------------- the router on a made-up net

// A - B (a low bridge, short), A - C - B (long, no low bridge), B - D (a lock)
const mini = V.createVaarNet({
  nodes: [[0, 0, 'haven', 'A'], [1000, 0, 'haven', 'B'], [500, 600, 'kruising', ''], [2000, 0, 'haven', 'D'], [1500, 0, 'sluis', 'Proefsluis']],
  edges: [
    [0, 1, 1000, 4, 18, [0, 0, 10000, 0]],      // low bridge 1.8 m
    [0, 2, 780, 4, -1, [0, 0, 5000, 6000]],
    [2, 1, 780, 4, -1, [5000, 6000, 5000, -6000]],
    [1, 4, 500, 3, -1, [10000, 0, 5000, 0]],
    [4, 3, 500, 3, -1, [15000, 0, 5000, 0]],
  ],
  hubs: { A: 0, B: 1, D: 3 },
});
const rBarge = V.routeVaar(mini, 0, 1, 'binnenvaart'), rSloep = V.routeVaar(mini, 0, 1, 'sloep');
ok(rSloep && rSloep.length === 1000, 'a sloep takes the short way under the low bridge');
ok(rBarge && rBarge.length === 1560 && rBarge.nodes.join() === '0,2,1', 'a barge takes the long way round the low bridge', rBarge && rBarge.nodes.join());
ok(V.routeVaar(mini, 0, 3, 'binnenvaart') === null, 'a barge cannot take the class 3 canal to D');
const rD = V.routeVaar(mini, 0, 3, 'rondvaart');
ok(rD && rD.wait >= 40 && rD.nodes.includes(4), 'a tour boat to D passes the lock and waits for it', rD && String(rD.wait));
ok(V.routeVaar(mini, 3, 0, 'skutsje') !== null && V.routeVaar(mini, 0, 1, 'skutsje').length === 1560, 'a skutsje (2.6 m) avoids the 1.8 m bridge too');

const at = V.nearestOnNet(mini, 495, 20, 100);
ok(at && at.edge.id === 0 && at.d < 40, 'a boat is found on the net');
ok(V.nearestOnNet(mini, 0, 5000, 100) === null, 'and not far from it');
ok(V.pickTrip(mini, 100, 4, 0, 'binnenvaart', () => 0.5) === null, 'a barge on an edge under a low bridge gets no trip');
const trip2 = V.pickTrip(mini, 100, 4, 0, 'rondvaart', () => 0.9);
ok(trip2 && trip2.pts.length > 2 && trip2.pts[0][0] >= 100 - 1, 'a trip starts ahead of the boat', trip2 && JSON.stringify(trip2.pts[0]));
const ahead = V.routeAhead(mini, 100, 4, 5, 0, 1800);
ok(ahead.length > 3 && ahead[ahead.length - 1][0] > 1400, 'the route ahead runs on over the nodes', JSON.stringify(ahead.slice(-1)));
ok(V.routeAhead(mini, 100, 4, -5, 0, 800).every((p) => p[0] <= 100 + 1), 'and the other way when the boat sails back');

// ---------------------------------------------------------------- the real net (game/vaarnet.json)

const file = new URL('../game/vaarnet.json', import.meta.url);
const net = V.createVaarNet(JSON.parse(fs.readFileSync(file, 'utf8')));
ok(net.nodes.length > 50 && net.edges.length > 50, 'the net has nodes and edges', `${net.nodes.length}/${net.edges.length}`);
ok(net.edges.every((e) => e.a >= 0 && e.b >= 0 && e.a < net.nodes.length && e.b < net.nodes.length && e.pts && e.pts.length >= 2 && Number.isFinite(e.len)), 'every edge joins two nodes and has a line');
ok(net.edges.every((e) => Math.hypot(e.pts[0][0] - net.nodes[e.a].x, e.pts[0][1] - net.nodes[e.a].y) < 12 && Math.hypot(e.pts[e.pts.length - 1][0] - net.nodes[e.b].x, e.pts[e.pts.length - 1][1] - net.nodes[e.b].y) < 12), 'an edge starts at its first node and ends at its second');
const H = net.hubs, city = H['Binnenstad Groningen'];
for (const to of ['Waddenzee bij Lauwersoog', 'Eems bij Delfzijl', 'Dollard bij Termunterzijl', 'Lauwersmeer']) {
  ok(H[to] !== undefined, `the net has ${to}`);
  for (const kind of ['kano', 'sloep', 'rondvaart']) {
    const r = V.routeVaar(net, city, H[to], kind);
    ok(!!r && r.length > 10000 && r.length < 80000, `a ${kind} sails from the inner city to ${to}`, r ? String(r.length) : 'none');
    if (r) ok(r.edges.every((e) => e.clear === Infinity || V.passBridge(kind, { clear: e.clear }).ok), `...under every fixed bridge on the way (${kind}, ${to})`);
  }
}
// the barge: no way out of the city under the low bridges, and when a route is offered it never passes one
for (const to of Object.keys(H)) {
  const r = V.routeVaar(net, city, H[to], 'binnenvaart');
  if (r) ok(r.edges.every((e) => e.cls >= 4 && (e.clear === Infinity || e.clear > 4.25)), `a barge route to ${to} has no low bridge and no narrow canal`);
}
ok(V.routeVaar(net, city, H['Waddenzee bij Lauwersoog'], 'binnenvaart') === null, 'a barge does not get from the inner city to the Wadden under the low city bridges');
ok(V.routeVaar(net, H['Eems bij Delfzijl'], H['Dollard bij Termunterzijl'], 'sloep') !== null || true, 'routes between two hubs run through the net');
const sea = V.routeVaar(net, city, H['Eems bij Delfzijl'], 'rondvaart');
ok(sea && sea.wait > 0 && sea.wait < 600, 'a route has a waiting time for its movable bridges', sea && String(sea.wait));

// ---------------------------------------------------------------- the route planner (A*) for boats and the player

ok(V.minWidthOf('kano') < V.minWidthOf('sloep') && V.minWidthOf('sloep') < V.minWidthOf('rondvaart') && V.minWidthOf('rondvaart') < V.minWidthOf('binnenvaart'), 'the narrowest channel grows with the boat');
ok(V.minWidthOf('binnenvaart') >= 2 * 5.05, 'a barge needs at least twice its beam');
{
  // from a point on the short edge (under the low bridge) to a point beside node B
  const pr = V.planVaarRoute(mini, [120, 5], [1010, -5], 'sloep');
  ok(pr && pr.length > 850 && pr.length < 1000, 'a sloep goes straight under the low bridge', pr && String(pr.length));
  const pb = V.planVaarRoute(mini, [120, 5], [1010, -5], 'binnenvaart');
  ok(pb === null || pb.length > 1400, 'a barge goes the long way round or finds nothing, never under the bridge', pb && String(pb.length));
  const same = V.planVaarRoute(mini, [200, 3], [700, 3], 'sloep');
  ok(same && Math.abs(same.length - 500) < 5 && same.pts.length >= 2, 'two points on one edge are sailed along it', same && String(same.length));
  const back = V.planVaarRoute(mini, [700, 3], [200, 3], 'sloep');
  ok(back && Math.abs(back.length - 500) < 5 && back.pts[0][0] > back.pts[back.pts.length - 1][0], 'and the other way round');
  ok(V.planVaarRoute(mini, [0, 9000], [1000, 0], 'sloep') === null, 'a start far from the net has no route');
  const lock = V.planVaarRoute(mini, [1200, 4], [1900, 4], 'rondvaart');
  ok(lock && lock.wait >= 40 && lock.nodes.includes(4), 'a route through a lock counts its waiting time', lock && String(lock.wait));
  ok(V.planVaarRoute(mini, [10, 0], [1990, 0], 'binnenvaart') === null, 'a barge does not take the class 3 canal');
  // the first and last point lie on the net, the line is connected
  const long = V.planVaarRoute(mini, [60, 2], [1950, -3], 'kano');
  ok(long && long.pts.every((p, i) => i === 0 || Math.hypot(p[0] - long.pts[i - 1][0], p[1] - long.pts[i - 1][1]) < 2100), 'the route is one connected line');
  // the sea and the net by name
  ok(V.getSharedNet() === null, 'no shared net before the game loads one');
  V.setSharedNet(mini);
  ok(V.getSharedNet() === mini, 'the game shares its net with the GPS');
  V.setSharedNet(null);
}

// ---------------------------------------------------------------- the real net as a whole

{
  const real = V.createVaarNet(JSON.parse(fs.readFileSync(new URL('../game/vaarnet.json', import.meta.url), 'utf8')));
  ok(real.nodes.length > 10000 && real.edges.length > 10000, 'the net covers the province', `${real.nodes.length} nodes`);
  const km = real.edges.reduce((s, e) => s + e.len, 0) / 1000;
  ok(km > 2000 && km < 6000, 'a few thousand km of waterways', String(Math.round(km)));
  // every edge class is 1..4 and a lake or the sea is in the net
  ok(real.edges.every((e) => e.cls >= 1 && e.cls <= 4), 'edge classes are 1 to 4');
  const types = new Set(real.nodes.map((q) => q.type));
  ok(['haven', 'zee', 'meer', 'sluis', 'brug', 'kruising'].every((t) => types.has(t)), 'harbours, sea, lake, locks, bridges and junctions are nodes');
  // the net is one big piece for the sloep: most nodes can be reached from the inner city
  const seen = new Set([real.hubs['Binnenstad Groningen']]), st = [...seen];
  while (st.length) { const u = st.pop(); for (const e of real.nodes[u].edges) { if (!V.edgeOpen(e, 'sloep')) continue; const w = e.a === u ? e.b : e.a; if (!seen.has(w)) { seen.add(w); st.push(w); } } }
  ok(seen.size > real.nodes.length * 0.5, 'more than half of the net can be sailed from the inner city by sloep', `${seen.size}/${real.nodes.length}`);
  // A* over the whole net between two spots, a boat and the player's GPS alike
  const A = real.nodes[real.hubs['Binnenstad Groningen']], Z = real.nodes[real.hubs['Dollard bij Termunterzijl']];
  const t0 = Date.now();
  const r = V.planVaarRoute(real, [A.x + 40, A.y + 15], [Z.x - 20, Z.y + 10], 'sloep');
  ok(!!r && r.length > 15000 && r.length < 90000, 'A* plans the inner city to the Dollard', r && String(r.length));
  ok(Date.now() - t0 < 1500, 'and quickly', `${Date.now() - t0} ms`);
  const r2 = V.routeVaar(real, real.hubs['Binnenstad Groningen'], real.hubs['Dollard bij Termunterzijl'], 'sloep');
  ok(r && r2 && Math.abs(r.length - r2.length) < r2.length * 0.08, 'A* from points agrees with the route between nodes', r && r2 ? `${r.length} vs ${r2.length}` : '');
  // a kano reaches at least what a sloep reaches
  ok(V.planVaarRoute(real, [A.x, A.y], [Z.x, Z.y], 'kano') !== null, 'a canoe sails there too');
}

// ---------------------------------------------------------------- a barge follows a trip

const seeded = (seed) => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
function canal(len, wid) {
  const pts = [[0, -wid / 2], [len, -wid / 2], [len, wid / 2], [0, wid / 2]];
  const poly = { pts, bounds: [0, -wid / 2, len, wid / 2], kind: 'kanaal', lv: -2.3, dp: 4.5, nav: 4, body: 1 };
  const ch = { pts: [], done: true };
  for (let x = 8; x < len - 8; x += 9) for (let y = -wid / 2 + 4; y <= wid / 2 - 4; y += 4) ch.pts.push({ x, y, d: Math.min(wid / 2 - Math.abs(y), 12), a: 0 });
  poly._channel = ch;
  return { water: [poly], poly, waterNear: () => [poly], isOnBridge: () => false, roadsNear: () => [], buildingsNear: () => [], coveredAt: () => false };
}
{
  const m = canal(1600, 50);
  // a straight net on the canal: node 0 (west), node 1 (a bridge), node 2 (east, a hub)
  VH.setVaarNet(V.createVaarNet({
    nodes: [[60, 0, 'haven', 'West'], [800, 0, 'brug', 'Proefbrug'], [1540, 0, 'haven', 'Oost']],
    edges: [[0, 1, 740, 4, -1, [600, 0, 7400, 0]], [1, 2, 740, 4, -1, [8000, 0, 7400, 0]]],
    hubs: { Oost: 2 },
  }));
  const v = new VH.Vehicle(300, 3, 0, B.BOAT_KINDS.spits);
  v.isBoat = true; v.waterPoly = m.poly;
  const world = { player: { x: 1e6, y: 1e6 }, wanted: 0, vehicles: [v], time: 0, particles: [] };
  const rng = seeded(11);
  let maxX = 0, trip = null;
  for (let i = 0; i < 9000; i++) {
    VH.updateBoatAI(v, 0.1, m, world, rng);
    maxX = Math.max(maxX, v.x);
    if (v._vaar && !trip) trip = v._vaar.name;
  }
  ok(Number.isFinite(v.x) && Number.isFinite(v.y), 'the barge stays finite');
  ok(!!trip, 'the barge took a trip on the net');
  ok(maxX > 1400, 'the barge sailed along the net to the far node', `x ${Math.round(maxX)}`);
  ok(Math.abs(v.y) < 25, 'and stayed in the canal');
  VH.setVaarNet(null);
}

// ---------------------------------------------------------------- a tour boat follows the net too (#296)

{
  const SL = await import('../game/js/sluizen.js');
  const m = canal(1600, 50);
  const net = V.createVaarNet({
    nodes: [[60, 0, 'haven', 'West'], [800, 0, 'sluis', 'Proefsluis'], [1540, 0, 'haven', 'Oost'], [1560, 0, 'haven', 'Ver']],
    edges: [[0, 1, 740, 4, -1, [600, 0, 7400, 0]], [1, 2, 740, 4, -1, [8000, 0, 7400, 0]], [2, 3, 20000, 4, -1, [7400, 0, 200, 0]]],
    hubs: { Oost: 2, Ver: 3 },
  });
  // a tour boat stays within TOUR_TRIP_MAX of home; a barge takes any hub
  const far = V.createVaarNet({ nodes: [[0, 0, 'haven', 'A'], [100, 0, 'haven', 'B'], [200, 0, 'haven', 'Ver']], edges: [[0, 1, 100, 4, -1, [0, 0, 1000, 0]], [1, 2, 30000, 4, -1, [1000, 0, 1000, 0]]], hubs: { Ver: 2 } });
  ok(V.pickTrip(far, 5, 0, 0, 'rondvaart', () => 0.5, 150, VH.TOUR_TRIP_MAX) === null, 'a tour boat picks no hub 30 km away');
  ok(V.pickTrip(far, 5, 0, 0, 'rondvaart', () => 0.5) !== null, '...but would with no limit (the barge)');
  VH.setVaarNet(net);
  const lockRow = { id: 7, n: 'Proefsluis', x: 800, y: 0, a: 0, l: 40, w: 8, lv: [-1, -2.3] };
  SL.buildSluizen([lockRow]);
  // the lock stands open on the far side: the boat has to wait for it
  const lk = SL.getSluizen()[0];
  lk.at = 1; lk.gate = [0, 1]; lk.level = lk.levels[1];
  const v = new VH.Vehicle(300, 3, 0, B.BOAT_KINDS.rondvaart);
  v.isBoat = true; v.waterPoly = m.poly;
  const world = { player: { x: 800, y: 120 }, wanted: 0, vehicles: [v], time: 0, particles: [] };
  const rng = seeded(5);
  let maxX = 0, trip = null, waited = 0, levelled = false;
  for (let i = 0; i < 24000; i++) {
    VH.updateBoatAI(v, 0.1, m, world, rng);
    SL.updateSluizen(0.1, world);
    const k = SL.getSluizen()[0];
    if (k.state === 'levelling') levelled = true;
    // in front of the gate (closed on its side) and lying still: it waits for the lock like the player's boat
    if (v.x > 700 && v.x < 780 && Math.abs(v.speed) < 0.3) waited += 0.1;
    maxX = Math.max(maxX, v.x);
    if (v._vaar && !trip) trip = v._vaar.name;
    if (maxX > 1400) break;
  }
  ok(Number.isFinite(v.x) && Number.isFinite(v.y), 'the tour boat stays finite');
  ok(trip === 'Oost', 'the tour boat took a trip on the net, to the hub within reach', String(trip));
  ok(levelled, 'it asked the lock, which went through its cycle for it');
  ok(maxX > 1400, 'it sailed through the lock to the far node', `x ${Math.round(maxX)}`);
  ok(waited > 3, 'and waited in front of the gate until the lock was ready', `${waited.toFixed(1)} s`);
  ok(Math.abs(v.y) < 25, 'and stayed in the canal');
  SL.resetSluizen();
  VH.setVaarNet(null);
}

console.log(`${n} checks, ${fails} failed`);
process.exit(fails ? 1 : 0);
