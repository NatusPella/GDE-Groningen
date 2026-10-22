// Routes per way of travel (routing.js, travelroute.js, roadaccess.js,
// trafficlaw.js), on the city map and on the same map loaded from F0 tiles:
//   walk, bike, car   random pairs, every leg of the route is for the mode (no
//                     illegal edge), one-ways held, motorways avoided on request,
//                     every allowed road reachable in both directions
//   waypoints         a point on a bridge deck and one on the street below it
//                     snap to their own level
//   boat              routes stay in the water, under the bridges that are high enough
//   train             walk > station > train (> change) > walk, with where to get off
//   air               a line round the no-fly zones, an altitude hint, a landing spot
//   the law           a warning on the motorway, a star after the grace period, once
//   node scripts/mode_route_test.mjs [--verbose] [--no-tiles]
import './node3d.mjs';
import { loadCityWorld } from './lib/loadworld.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const VERBOSE = process.argv.includes('--verbose');

const R = await import('../game/js/routing.js');
const A = await import('../game/js/roadaccess.js');
const T = await import('../game/js/travelroute.js');
const L = await import('../game/js/trafficlaw.js');
const N = await import('../game/js/navgraph.js');
const { pointInPolygon } = await import('../game/js/util.js');

let n = 0, fails = 0;
const ok = (cond, name, info = '') => { n++; if (!cond) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } else if (VERBOSE) console.log(`ok   ${name}${info !== '' ? ` (${info})` : ''}`); };

let seed = 20261015;
const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296);
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const polyLen = (pts) => { let l = 0; for (let i = 1; i < pts.length; i++) l += dist(pts[i - 1], pts[i]); return l; };

// ---- the access table, pure
{
  const R0 = (type, cat, extra = {}) => ({ type, cat, ...extra });
  const mw = R0('motorway', 'major'), trunk = R0('trunk', 'major'), street = R0('residential', 'normal'), foot = R0('footway', 'foot'), cyc = R0('cycleway', 'cycle'), steps = R0('steps', 'foot'), ped = R0('pedestrian', 'foot');
  ok(A.roadAllowed(mw, 'lopen') === false && A.roadAllowed(mw, 'fiets') === false && A.roadAllowed(mw, 'auto') === true, 'motorway: only cars');
  ok(A.roadAllowed(trunk, 'lopen') === false && A.roadAllowed(trunk, 'fiets') === false, 'trunk road (the ring): no walkers or cyclists');
  ok(A.roadAllowed(street, 'lopen') && A.roadAllowed(street, 'fiets') && A.roadAllowed(street, 'auto'), 'a street is for everyone');
  ok(A.roadAllowed(foot, 'auto') === false && A.roadAllowed(cyc, 'auto') === false && A.roadAllowed(steps, 'auto') === false, 'no cars on footways, cycle paths, steps');
  ok(A.roadAllowed(foot, 'fiets') === false && A.roadAllowed(steps, 'fiets') === false && A.roadAllowed(cyc, 'fiets') === true && A.roadAllowed(ped, 'fiets') === true, 'bikes: cycle paths and pedestrian streets, no footways or steps');
  ok(A.roadAllowed(R0('residential', 'normal', { busOnly: true }), 'auto') === false, 'a bus lane is not for a car');
  ok(A.roadAllowed(R0('residential', 'normal', { acc: 1 | 2 }), 'auto') === false && A.roadAllowed(R0('footway', 'foot', { acc: 1 | 2 }), 'fiets') === true && A.roadAllowed(R0('residential', 'normal', { acc: 4 }), 'lopen') === false, 'an `acc` mask from the OSM tags wins over the class');
  ok(N.accessOf(R0('footway', 'foot', { acc: 7 })) === 7, 'navgraph reads `acc` too');
  ok(A.offenceOf(mw, 'lopen') === 'snelweg' && A.offenceOf(mw, 'fiets') === 'snelweg' && A.offenceOf(mw, 'auto') === null, 'offence: walking or cycling on the motorway');
  ok(A.offenceOf(cyc, 'auto') === 'fietspad' && A.offenceOf(foot, 'auto') === 'voetpad' && A.offenceOf(foot, 'fiets') === 'voetpad' && A.offenceOf(cyc, 'fiets') === null, 'offence: a car on a cycle path or a footway, a bike on a footway');
  ok(A.oneWayFor(R0('residential', 'normal', { oneway: true }), 'fiets') === false && A.oneWayFor(R0('secondary', 'major', { oneway: true }), 'fiets') === true && A.oneWayFor(R0('residential', 'normal', { oneway: true }), 'auto') === true && A.oneWayFor(R0('residential', 'normal', { oneway: true }), 'lopen') === false, 'one-ways: walkers ignore them, cyclists on quiet streets, cars never');
  ok(A.ROUTE_MODE.lopen === 'walk' && A.MODE_OF_ROUTE.bike === 'fiets', 'mode names map both ways');
}

// ---- the maps to run on: the city, and the same city from F0 tiles
const maps = [{ name: 'stad', map: (await loadCityWorld({ src: 'json' })).map }];
if (!process.argv.includes('--no-tiles')) maps.push({ name: 'tegels', map: (await loadCityWorld({ src: 'tiles' })).map });

const KIND_MODE = { walk: 'lopen', bike: 'fiets', drive: 'auto' };

for (const { name, map } of maps) {
  const tag = (s) => `[${name}] ${s}`;
  const roads = map.roads;
  const [bx0, by0, bx1, by1] = map.meta.bounds;
  const usable = (kind) => roads.filter((r) => A.roadAllowed(r, KIND_MODE[kind]) !== false && !r.busOnly && r.cat !== (kind === 'drive' ? 'foot' : 'none') && r.pts.length > 1);
  const pointOn = (road) => { const i = Math.floor(rnd() * (road.pts.length - 1)), t = 0.2 + rnd() * 0.6; return [road.pts[i][0] + (road.pts[i + 1][0] - road.pts[i][0]) * t, road.pts[i][1] + (road.pts[i + 1][1] - road.pts[i][1]) * t]; };

  // ---- 1. random pairs per mode: reach, no illegal leg, sensible length
  for (const kind of ['walk', 'bike', 'drive']) {
    const mode = KIND_MODE[kind];
    const pool = usable(kind);
    let routed = 0, tried = 0, illegal = 0, jumps = 0, long = 0;
    const lens = [];
    for (let i = 0; i < 60; i++) {
      const a = pointOn(pool[Math.floor(rnd() * pool.length)]), b = pointOn(pool[Math.floor(rnd() * pool.length)]);
      if (dist(a, b) < 150) continue;
      tried++;
      const t0 = performance.now();
      const r = R.planLandRoute(map, kind, a, b);
      lens.push(performance.now() - t0);
      if (!r) continue;
      routed++;
      for (const road of r.roads) if (A.roadAllowed(road, mode) === false) illegal++;
      for (let k = 1; k < r.pts.length; k++) if (dist(r.pts[k - 1], r.pts[k]) > 900) { jumps++; if (VERBOSE) console.log(`  jump ${Math.round(dist(r.pts[k - 1], r.pts[k]))} m at [${r.pts[k - 1].map(Math.round)}] road ${r.roads[k - 1] && r.roads[k - 1].type} ${r.roads[k - 1] && r.roads[k - 1].name}, ${r.pts.length} pts, from [${a.map(Math.round)}] to [${b.map(Math.round)}]`); }
      if (polyLen(r.pts) > dist(a, b) * 4 + 400) long++;
    }
    ok(tried >= 40 && routed >= tried * 0.85, tag(`${kind}: random pairs get a route`), `${routed}/${tried}`);
    ok(illegal === 0, tag(`${kind}: no leg of any route is closed to ${mode}`), illegal);
    ok(jumps === 0, tag(`${kind}: no leg jumps over a gap`), jumps);
    ok(long <= tried * 0.05, tag(`${kind}: routes are not absurdly long`), long);
    lens.sort((p, q) => p - q);
    ok(lens[Math.floor(lens.length * 0.9)] < 100, tag(`${kind}: 90% of routes in < 100 ms`), `${Math.round(lens[Math.floor(lens.length * 0.9)])} ms`);
  }

  // ---- 2. motorways: closed to walkers and cyclists, avoidable by car
  {
    const mws = roads.filter((r) => r.type === 'trunk' || r.type === 'motorway');
    ok(mws.length > 0, tag('the map has trunk roads to test with'), mws.length);
    let walkOn = 0, bikeOn = 0, checked = 0;
    for (let i = 0; i < 30; i++) {
      const a = pointOn(mws[Math.floor(rnd() * mws.length)]), b = pointOn(mws[Math.floor(rnd() * mws.length)]);
      for (const kind of ['walk', 'bike']) {
        const r = R.planLandRoute(map, kind, a, b);
        if (!r) continue;
        checked++;
        const bad = r.roads.some((road) => road.type === 'trunk' || road.type === 'motorway' || road.type === 'trunk_link' || road.type === 'motorway_link');
        if (bad) (kind === 'walk' ? walkOn++ : bikeOn++);
      }
    }
    ok(checked > 10 && walkOn === 0 && bikeOn === 0, tag('walk and bike routes from the trunk road never use one'), `${walkOn}+${bikeOn}/${checked}`);
    const carRoads = usable('drive');
    let mwNormal = 0, mwAvoid = 0, pairs = 0, avoidFail = 0;
    const mwLen = (r) => { let l = 0; for (let k = 0; k < r.roads.length; k++) { const rd = r.roads[k]; if (rd.type === 'trunk' || rd.type === 'motorway' || rd.type === 'trunk_link' || rd.type === 'motorway_link') l += k < r.pts.length - 1 ? dist(r.pts[k], r.pts[k + 1]) : 0; } return l; };
    for (let i = 0; i < 40; i++) {
      const a = pointOn(carRoads[Math.floor(rnd() * carRoads.length)]), b = pointOn(carRoads[Math.floor(rnd() * carRoads.length)]);
      if (dist(a, b) < 1500) continue;
      const r1 = R.planLandRoute(map, 'drive', a, b), r2 = R.planLandRoute(map, 'drive', a, b, { avoidMotorways: true });
      if (!r1) continue;
      pairs++;
      if (!r2) { avoidFail++; continue; }
      mwNormal += mwLen(r1); mwAvoid += mwLen(r2);
    }
    ok(pairs >= 10 && avoidFail === 0, tag('"snelwegen vermijden" still finds a way'), `${avoidFail}/${pairs}`);
    ok(mwAvoid <= mwNormal && (mwNormal === 0 || mwAvoid < mwNormal), tag('and uses less motorway than the quick route'), `${Math.round(mwAvoid)} m against ${Math.round(mwNormal)} m`);
  }

  // ---- 3. every road allowed for a mode is reachable both ways (one-ways: with the traffic)
  for (const kind of ['walk', 'bike', 'drive']) {
    const mode = KIND_MODE[kind];
    const pool = usable(kind).filter((r) => polyLen(r.pts) > 30);
    // the hub: a road in the middle of the main network
    const hubRoad = pool.reduce((best, r) => { const c = r.pts[Math.floor(r.pts.length / 2)]; const d = Math.hypot(c[0], c[1]); return d < best.d ? { d, r } : best; }, { d: Infinity, r: null }).r;
    const hub = hubRoad.pts[Math.floor(hubRoad.pts.length / 2)];
    const sample = [];
    for (let k = 0; k < pool.length && sample.length < 160; k += Math.max(1, Math.floor(pool.length / 160))) sample.push(pool[k]);
    let both = 0, there = 0, back = 0, isolated = 0, wrongWay = 0, checkedOne = 0;
    for (const road of sample) {
      const p = pointOn(road);
      const out = R.planLandRoute(map, kind, p, hub), ret = R.planLandRoute(map, kind, hub, p);
      if (!out && !ret) { isolated++; continue; }
      if (out) there++;
      if (ret) back++;
      if (out && ret) both++;
      // a one-way road: a route that rides it rides it with the traffic
      for (const r of [out, ret]) {
        if (!r) continue;
        for (let k = 1; k < r.pts.length - 2; k++) {
          const rd = r.roads[k];
          if (!rd || !A.oneWayFor(rd, mode)) continue;
          const a = r.pts[k], b = r.pts[k + 1];
          for (let s = 0; s < rd.pts.length - 1; s++) {
            const fa = dist(rd.pts[s], a) < 0.8 && dist(rd.pts[s + 1], b) < 0.8, ra = dist(rd.pts[s], b) < 0.8 && dist(rd.pts[s + 1], a) < 0.8;
            if (fa || ra) { checkedOne++; if (ra && !fa) wrongWay++; break; }
          }
        }
      }
    }
    // roads in a pocket the network does not connect are listed (isolated), the rest must go both ways
    // (a one-way road may be reachable one way only)
    const open = sample.length - isolated;
    ok(isolated <= sample.length * 0.08, tag(`${kind}: nearly every road is in the main network`), `${isolated}/${sample.length} isolated`);
    const tolerance = kind === 'drive' ? 0.9 : 0.97;
    ok(both >= open * tolerance, tag(`${kind}: roads allowed for ${mode} reach the hub and back`), `${both}/${open}`);
    ok(wrongWay === 0, tag(`${kind}: no route rides a one-way against the traffic`), `${wrongWay}/${checkedOne}`);
  }

  // ---- 4. waypoints on the right level: a bridge deck and the street below it
  {
    const decks = roads.filter((r) => r.z && Math.max(...r.z) > 3 && A.roadAllowed(r, 'auto') !== false && !r.busOnly);
    let cross = 0, deckOk = 0, groundOk = 0;
    for (const deck of decks) {
      if (cross >= 40) break;
      const i = Math.floor(deck.pts.length / 2);
      if (deck.z[i] < 3) continue;
      const [x, y] = deck.pts[i];
      const below = map.roadsNear(x, y, 6).find((r) => r !== deck && !r.z && A.roadAllowed(r, 'auto') !== false && !r.busOnly && r.cat !== 'foot' && r.cat !== 'cycle' && r.pts.some((q, k) => k < r.pts.length - 1 && dist([x, y], q) < 12));
      if (!below) continue;
      // exactly over the street below: both roads are under the point, the level has to decide
      let bd = Infinity, bq = null;
      for (let k = 0; k < below.pts.length - 1; k++) {
        const ax = below.pts[k][0], ay = below.pts[k][1], dx = below.pts[k + 1][0] - ax, dy = below.pts[k + 1][1] - ay, l2 = dx * dx + dy * dy || 1;
        const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l2));
        const q = [ax + dx * t, ay + dy * t], d = dist(q, [x, y]);
        if (d < bd) { bd = d; bq = q; }
      }
      if (bd > 8) continue;
      cross++;
      const up = R.snapWaypoint(map, 'drive', x, y, deck.z[i]);
      const down = R.snapWaypoint(map, 'drive', bq[0], bq[1], 0);
      const zOf = (h) => (h.road.z ? h.road.z[h.seg] + (h.road.z[h.seg + 1] - h.road.z[h.seg]) * h.t : 0);
      if (up && Math.abs(zOf(up) - deck.z[i]) < 2.5) deckOk++;
      if (down && Math.abs(zOf(down)) < 2.5) groundOk++;
    }
    ok(cross >= 3, tag('the map has bridges over streets to test with'), cross);
    ok(deckOk === cross, tag('a waypoint at deck height snaps to the bridge'), `${deckOk}/${cross}`);
    ok(groundOk === cross, tag('a waypoint at street level snaps to the street under it'), `${groundOk}/${cross}`);
  }

  // ---- 5. boats: stay in the water, and under bridges high enough
  {
    // two points in the same water, a few hundred metres apart (a canal or a lake)
    const inside = (w, k) => {
      const [x0, y0, x1, y1] = w.bounds, out = [];
      for (let t = 0; t < 600 && out.length < k; t++) {
        const p = [x0 + rnd() * (x1 - x0), y0 + rnd() * (y1 - y0)];
        if (pointInPolygon(p[0], p[1], w.pts) && map.inWaterRaw(p[0], p[1]) && Math.hypot(p[0], p[1]) < 6000) out.push(p);
      }
      return out;
    };
    const waters = map.water.filter((w) => w.pts.length > 14).sort((p, q) => q.pts.length - p.pts.length).slice(0, 14);
    let tried = 0, routed = 0, dry = 0, shortcut = 0;
    const times = [], spots = [];
    for (const w of waters) {
      const ps = inside(w, 6);
      spots.push(...ps);
      for (let i = 0; i + 1 < ps.length; i += 2) {
        const a = ps[i], b = ps[i + 1];
        if (dist(a, b) < 120 || dist(a, b) > 1800) continue;
        tried++;
        const t0 = performance.now();
        const r = R.planBoatRoute(map, a, b);
        times.push(performance.now() - t0);
        if (!r) continue;
        routed++;
        for (let k = 1; k < r.pts.length; k++) {
          const L2 = dist(r.pts[k - 1], r.pts[k]), m = Math.ceil(L2 / 8);
          for (let s2 = 0; s2 <= m; s2++) {
            const x = r.pts[k - 1][0] + (r.pts[k][0] - r.pts[k - 1][0]) * s2 / m, y = r.pts[k - 1][1] + (r.pts[k][1] - r.pts[k - 1][1]) * s2 / m;
            if (!map.inWaterRaw(x, y)) { dry++; break; }
          }
        }
        if (r.length < dist(a, b) - 1) shortcut++;
        if (!(r.etaS > 0)) dry++;
      }
    }
    ok(tried >= 3, tag('boat: water pairs to test with'), tried);
    ok(routed >= tried * 0.7, tag('boat: pairs in one water get a route'), `${routed}/${tried}`);
    ok(dry === 0 && shortcut === 0, tag('boat: routes stay in the water and never beat the straight line'), `${dry} dry, ${shortcut} short`);
    ok(times.length === 0 || Math.max(...times) < 1500, tag('boat: planned in < 1.5 s'), `${Math.round(Math.max(0, ...times))} ms`);
    // a boat asked for a goal on the quay is brought to the water next to it
    if (spots.length > 2) {
      const wp = spots[0], a = spots[1];
      const land = [wp[0] + 30, wp[1]];
      const r = R.planBoatRoute(map, a, land);
      ok(!r || (dist(r.pts.at(-1), land) < 1 && (!r.dock || dist(r.dock, land) < 170)), tag('boat: a goal on land ends at the nearest water'), r ? r.dock : 'no route');
    }
  }

  // ---- 6. the train: walk > station > train > walk, and where to get off
  {
    const st = map.stations || [];
    ok(st.length >= 3 && (map.railRoutes || []).length >= 3, tag('train: the map has stations and lines'), `${st.length} stations`);
    const at = (s, dx = 60, dy = 40) => [s.x + dx, s.y + dy];
    const byName = (nm) => st.find((s) => s.name === nm);
    const hoofd = byName('Groningen Hoofdstation'), noord = byName('Groningen Noord'), europa = byName('Groningen Europapark');
    if (hoofd && noord && europa) {
      const direct = R.planTrainTrip(map, at(hoofd), at(europa));
      ok(!!direct && direct.legs.map((l) => l.kind).join() === 'walk,train,walk', tag('train: Hoofdstation to Europapark is walk, train, walk'), direct && direct.legs.map((l) => l.kind).join());
      ok(direct && /Europapark/.test(direct.uitstappen) && direct.changes.length === 0, tag('train: get off at Europapark, no change'), direct && `${direct.uitstappen} ${direct.changes}`);
      const change = R.planTrainTrip(map, at(noord), at(europa));
      ok(!!change && change.changes.includes('Groningen Hoofdstation') && /Europapark/.test(change.uitstappen), tag('train: Noord to Europapark changes at the Hoofdstation'), change && `${change.changes} > ${change.uitstappen}`);
      ok(change && change.stops.map((s) => s.kind).join() === 'instap,overstap,uitstap', tag('train: the stops to put signs at'), change && change.stops.map((s) => s.kind).join());
      for (const tr of [direct, change]) {
        if (!tr) continue;
        let gap = 0;
        for (let k = 1; k < tr.legs.length; k++) gap = Math.max(gap, dist(tr.legs[k - 1].pts.at(-1), tr.legs[k].pts[0]));
        ok(gap < 120, tag('train: the legs join up (station entrance to platform)'), `${Math.round(gap)} m`);
        ok(tr.etaS > 120 && tr.length > 500 && tr.pts.length > 5, tag('train: an ETA and a line'), `${Math.round(tr.etaS)} s`);
      }
      const onTrain = R.planTrainTrip(map, direct.legs[1].pts[Math.floor(direct.legs[1].pts.length / 3)], at(europa), { onTrain: true });
      ok(!!onTrain && onTrain.legs[0].kind === 'train' && /Europapark/.test(onTrain.uitstappen), tag('train: from the cab, straight to getting off'), onTrain && onTrain.legs.map((l) => l.kind).join());
    }
  }

  // ---- 7. the air: round the no-fly zones, an altitude hint, a landing spot
  {
    const zones = R.noFlyZones(map), pads = R.landingSpots(map);
    ok(zones.length > 0 && pads.length > 0, tag('air: no-fly zones and landing spots exist'), `${zones.length}/${pads.length}`);
    let bad = 0, bent = 0, total = 0;
    for (let i = 0; i < 40 && zones.length; i++) {
      const z = zones[Math.floor(rnd() * zones.length)];
      const a = [z.x - 600 + rnd() * 80, z.y - 40 + rnd() * 80], b = [z.x + 600 - rnd() * 80, z.y - 40 + rnd() * 80];
      const r = R.planAirRoute(map, a, b);
      total++;
      if (r.pts.length > 2) bent++;
      for (let k = 1; k < r.pts.length; k++) {
        const L2 = dist(r.pts[k - 1], r.pts[k]), m = Math.ceil(L2 / 5);
        for (let s = 0; s <= m; s++) {
          const x = r.pts[k - 1][0] + (r.pts[k][0] - r.pts[k - 1][0]) * s / m, y = r.pts[k - 1][1] + (r.pts[k][1] - r.pts[k - 1][1]) * s / m;
          for (const q of zones) if (Math.hypot(x - q.x, y - q.y) < q.r) { bad++; s = m + 1; k = r.pts.length; break; }
        }
      }
    }
    ok(total > 0 && bad === 0 && bent > 0, tag('air: no line crosses a no-fly zone'), `${bad} inside, ${bent}/${total} bent`);
    const pad = pads[0];
    const r = R.planAirRoute(map, [pad.x + 3000, pad.y + 800], [pad.x + 60, pad.y - 50]);
    ok(r.landing && r.landing.x === pad.x && r.alt >= 45 && r.alt <= 110 && /Hoogte/.test(T.airHint(r)), tag('air: a landing spot near the goal and an altitude hint'), `${r.alt} m ${r.landing && r.landing.name}`);
    const plane = R.planAirRoute(map, [0, 0], [9000, 4000], { plane: true });
    ok(plane.alt > r.alt && plane.alt <= 300, tag('air: a plane cruises higher than a helicopter'), `${plane.alt} m`);
  }
}

// ---- the road snaps a point onto a road that is for the mode (also the walker's start on the motorway)
{
  const { map } = maps[0];
  const trunk = map.roads.find((r) => r.type === 'trunk' && r.pts.length > 4);
  const p = trunk.pts[2];
  const w = R.snapWaypoint(map, 'walk', p[0], p[1]);
  ok(w && A.roadAllowed(w.road, 'lopen') !== false && dist([w.x, w.y], p) < 480, 'a waypoint on the trunk road snaps to a walkable road for a walker', w && w.road.type);
  const c = R.snapWaypoint(map, 'drive', p[0], p[1]);
  ok(c && A.roadAllowed(c.road, 'auto') === true, 'and to a drivable one for a car');
}

// ---- live: updateRouting per mode, rerouting after leaving the route, the HUD's numbers
{
  const { map } = maps[0];
  let clock = 0;
  const realNow = performance.now.bind(performance);
  performance.now = () => realNow() + clock * 1000;
  const mkWorld = (px, py, tx, ty, inVehicle, extra = {}) => ({ map, time: 0, health: 100, player: { x: px, y: py, inVehicle }, storyGuide: { x: tx, y: ty, name: 'Test', step: 'x' }, addMessage: () => {}, ...extra });
  const A0 = [-40, 30], B0 = [880, -250];
  const bikeW = mkWorld(A0[0], A0[1], B0[0], B0[1], { isBike: true });
  R.updateRouting(0.1, bikeW);
  const rb = R.getActiveRoute();
  ok(rb && rb.mode === 'bike' && rb.pts.length > 5 && rb.etaS > 0, 'live: a cyclist gets a bike route with an ETA', rb && `${rb.mode} ${Math.round(rb.length)} m`);
  // the bike route differs from the walking one in what it may use: it keeps off the footways
  const walkW = mkWorld(A0[0], A0[1], B0[0], B0[1], null);
  R.updateRouting(0.1, walkW);
  const rw = R.getActiveRoute();
  ok(rw && rw.mode === 'walk', 'live: a walker gets a walking route', rw && rw.mode);
  const carW = mkWorld(A0[0], A0[1], B0[0], B0[1], { isBike: false });
  R.updateRouting(0.1, carW);
  const rc = R.getActiveRoute();
  ok(rc && rc.mode === 'drive' && rc.length > 0, 'live: a driver gets a driving route', rc && rc.mode);
  // reroute after leaving the route sideways: fast, and a new route from where we are
  clock += 5;
  const mid = Math.floor(rb.pts.length / 2), a = rb.pts[mid], b = rb.pts[mid + 1];
  const Lm = dist(a, b) || 1;
  bikeW.player.x = a[0] - ((b[1] - a[1]) / Lm) * 120; bikeW.player.y = a[1] + ((b[0] - a[0]) / Lm) * 120;
  R.updateRouting(0.1, bikeW);
  const t0 = realNow();
  clock += 3;
  R.updateRouting(0.1, bikeW);
  const ms = realNow() - t0;
  const rb2 = R.getActiveRoute();
  ok(rb2 && rb2 !== rb && dist(rb2.pts[0], [bikeW.player.x, bikeW.player.y]) < 60, 'live: leaving the route brings a new one from where you are', rb2 && Math.round(dist(rb2.pts[0], [bikeW.player.x, bikeW.player.y])));
  ok(ms < 150, 'live: rerouting takes < 150 ms', `${Math.round(ms)} ms`);
  // the motorway toggle
  R.setRoutePrefs({ avoidMotorways: true });
  R.updateRouting(0.1, carW);
  const rc2 = R.getActiveRoute();
  ok(rc2 && rc2 !== rc && R.getRoutePrefs().avoidMotorways, 'live: "snelwegen vermijden" plans the route again');
  R.setRoutePrefs({ avoidMotorways: false });
  // the map's mode choice plans the goal for another way of travel
  const Gl = await import('../game/js/goal.js');
  Gl.initGoal(walkW);
  walkW.storyGuide = null;
  R.setUserWaypoint(B0[0], B0[1], 'Test');
  R.updateRouting(0.1, walkW);
  const rg = R.getActiveRoute();
  ok(rg && rg.mode === 'walk' && rg.kind === 'user', 'live: a waypoint gives a user route for your own way of travel', rg && `${rg.kind} ${rg.mode}`);
  R.setRoutePrefs({ planMode: 'bike' });
  R.updateRouting(0.1, walkW);
  const rp = R.getActiveRoute();
  ok(rp && rp.mode === 'bike', 'live: the map can plan the goal by bike while you walk', rp && rp.mode);
  R.setRoutePrefs({ planMode: null });
  R.clearUserWaypoint();
  Gl.clearGoal({ quiet: true });
  // boat and heli, live
  const waterSpot = (() => { for (const w of map.water) if (w.pts.length > 60) { const [x0, y0, x1, y1] = w.bounds; for (let t = 0; t < 400; t++) { const p = [x0 + rnd() * (x1 - x0), y0 + rnd() * (y1 - y0)]; if (map.inWaterRaw(p[0], p[1]) && Math.hypot(p[0], p[1]) < 3000) return p; } } return null; })();
  if (waterSpot) {
    const bw = mkWorld(waterSpot[0], waterSpot[1], waterSpot[0] + 300, waterSpot[1] + 100, { isBoat: true });
    R.updateRouting(0.1, bw);
    const rbo = R.getActiveRoute();
    ok(rbo && rbo.mode === 'boat', 'live: a boat gets a water route (not none)', rbo && rbo.mode);
  }
  const hw = mkWorld(0, 0, 3000, 500, { isHeli: true });
  R.updateRouting(0.1, hw);
  const rh = R.getActiveRoute();
  ok(rh && rh.mode === 'fly' && rh.alt > 0 && rh.etaS > 0, 'live: a heli gets a line with an altitude hint', rh && `${rh.alt} m`);
  const tw = mkWorld(-45, 960, 1417, 1624, null, { trainDriving: true });
  R.updateRouting(0.1, tw);
  const rt = R.getActiveRoute();
  ok(rt && rt.mode === 'ov', 'live: in the train cab the route is the train trip', rt && rt.mode);
  performance.now = realNow;
}

// ---- the law: a warning, then a star after the grace period, once
{
  const { map } = maps[0];
  const trunk = map.roads.find((r) => r.type === 'trunk' && r.cat === 'major' && !r.z && r.pts.length > 6 && polyLen(r.pts) > 200);
  const cyc = map.roads.find((r) => r.type === 'cycleway' && !r.z && polyLen(r.pts) > 200);
  const street = map.roads.find((r) => r.type === 'residential' && !r.z && polyLen(r.pts) > 200);
  const mk = (road, inVehicle, extra = {}) => {
    const p = road.pts[Math.floor(road.pts.length / 2)];
    const msgs = [];
    const w = { map, time: 0, health: 100, wanted: 0, player: { x: p[0], y: p[1], inVehicle }, addMessage: (t, s, o) => msgs.push([t, o && o.kind]), pedestrians: [], vehicles: [], ...extra };
    if (inVehicle) { inVehicle.x = p[0]; inVehicle.y = p[1]; }
    return { w, msgs };
  };
  const run = (w, secs) => { for (let t = 0; t < secs; t += 0.1) L.updateTrafficLaw(0.1, w); };
  L.resetTrafficLaw();
  let { w, msgs } = mk(trunk, null);
  run(w, 1);
  ok(msgs.length === 0, 'law: walking on the trunk road gives no warning card (#125)', msgs.map((m) => m[0]).join('|'));
  ok(w.wanted === 0, 'law: and no star yet', w.wanted);
  run(w, L.GRACE_S + 10);
  ok(w.wanted === 0 && msgs.length === 0, 'law: after the grace period no star without an agent in sight (#391)', `${w.wanted} ${msgs.length}`);
  w.pedestrians.push({ isCop: true, state: 'walk', x: w.player.x + 20, y: w.player.y });
  run(w, 1);
  ok(w.wanted === 1 && msgs.length === 1, 'law: with an agent in sight the police take an interest (one star)', `${w.wanted} ${msgs.length}`);
  ok(msgs[0] && /politie zag het/.test(msgs[0][0]) && msgs[0][1] === 'politie', 'law: the card names the cause', msgs[0] && msgs[0][0]);
  run(w, 60);
  ok(w.wanted === 1, 'law: staying on it gives no second star', w.wanted);
  L.resetTrafficLaw();
  ({ w, msgs } = mk(trunk, { isBike: true }));
  run(w, 1);
  ok(msgs.length === 0, 'law: cycling on it gives no warning either', msgs.length);
  L.resetTrafficLaw();
  ({ w, msgs } = mk(cyc, { isBike: false }));
  run(w, 1);
  ok(msgs.length === 0, 'law: a car on a cycle path gives no warning', msgs.map((m) => m[0]).join('|'));
  L.resetTrafficLaw();
  ({ w, msgs } = mk(cyc, { isBike: true }));
  run(w, 30);
  ok(msgs.length === 0 && w.wanted === 0, 'law: a bike on a cycle path is fine', msgs.length);
  L.resetTrafficLaw();
  ({ w, msgs } = mk(street, { isBike: false }));
  run(w, 30);
  ok(msgs.length === 0 && w.wanted === 0, 'law: a car in the street is fine');
  L.resetTrafficLaw();
  ({ w, msgs } = mk(trunk, { isBike: false }));
  run(w, 30);
  ok(msgs.length === 0 && w.wanted === 0, 'law: a car on the trunk road is fine');
  L.resetTrafficLaw();
  ({ w, msgs } = mk(cyc, { isBike: false, isPolice: true }));
  run(w, 30);
  ok(msgs.length === 0 && w.wanted === 0, 'law: the police may drive there');
  L.resetTrafficLaw();
  ({ w, msgs } = mk(trunk, null, { mission: { phase: 'active' } }));
  run(w, 30);
  ok(msgs.length === 0 && w.wanted === 0, 'law: not during a mission');
  // a short crossing (under the grace period) costs nothing
  L.resetTrafficLaw();
  ({ w, msgs } = mk(trunk, null));
  run(w, 5);
  const p0 = street.pts[Math.floor(street.pts.length / 2)];
  w.player.x = p0[0]; w.player.y = p0[1];
  run(w, 40);
  ok(w.wanted === 0 && L.getLawState().kind === null, 'law: leaving in time costs no star');
  L.resetTrafficLaw();
}

console.log(`${n - fails}/${n} ok`);
console.log(fails ? 'mode route test FAIL' : 'mode route test ok');
process.exit(fails ? 1 : 0);
