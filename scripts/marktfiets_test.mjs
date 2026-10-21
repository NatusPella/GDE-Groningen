// The bike route over the Grote Markt (roadaccess.js, roadsurface.js, marktfiets.js,
// trafficlaw.js): which ways carry it, that they get painted markings (and other
// ways do not), where the signs stand, and the one-time hint for a cyclist on the
// square (a different one on a market day). Runs on the real map.
//   node scripts/marktfiets_test.mjs
import './node3d.mjs';
import fs from 'node:fs';

import { loadCityWorld } from './lib/loadworld.mjs';
const RS = await import('../game/js/roadsurface.js');
const RA = await import('../game/js/roadaccess.js');
const MF = await import('../game/js/marktfiets.js');
const TL = await import('../game/js/trafficlaw.js');
const CAL = await import('../game/js/calendar.js');
const { isInWater } = await import('../game/js/util.js');
const { isInsideBuilding } = await import('../game/js/pedestrians.js');

let bad = 0, n = 0;
const check = (name, ok, info = '') => { n++; if (!ok) { bad++; console.log('FAIL', name, info); } };

const root = new URL('../game/', import.meta.url);
const map = (await loadCityWorld()).map;
RS.setRoadNetwork(map);

// --- which ways
const markt = map.roads.filter((r) => r.name === 'Grote Markt');
const route = markt.filter((r) => RA.isMarktFietsRoad(r));
check('the Grote Markt has pedestrian ways on the map', markt.length >= 8 && markt.every((r) => r.type === 'pedestrian'));
check('most of them carry the bike route, short stubs do not', route.length >= 7 && route.length < markt.length, `${route.length}/${markt.length}`);
check('only the Grote Markt carries it', map.roads.filter((r) => RA.isMarktFietsRoad(r)).every((r) => r.name === 'Grote Markt'));
check('a footway, a road with another name or a bridge does not', !RA.isMarktFietsRoad({ ...route[0], name: 'Herestraat' }) && !RA.isMarktFietsRoad({ ...route[0], type: 'footway' }) && !RA.isMarktFietsRoad({ ...route[0], z: [0, 1] }) && !RA.isMarktFietsRoad(null));
check('a way too far from the square does not', !RA.isMarktFietsRoad({ ...route[0], pts: route[0].pts.map(([x, y]) => [x + 900, y]) }));
check('a too short way does not', !RA.isMarktFietsRoad(route[0], 10));

// --- the painted lanes
const markVerts = (r) => { const g = RS.roadSurfaceGeometries(r, true); return g && g.mark ? g.mark.attributes.position.count : 0; };
// (a way that lies wholly in a terrace or the tent gets none: the paint stays off what stands on the square, #327)
const horeca = map.meta.horeca || [];
const freeWay = (r) => RA.marktFietsSpans(r, horeca, 1, 1e9).length > 0;
check('every bike-route way with a free stretch gets painted markings', route.every((r) => freeWay(r) ? markVerts(r) > 16 : markVerts(r) === 0), route.map(markVerts).join(','));
check('most of the bike route is still painted', route.filter(freeWay).length >= 6, route.filter(freeWay).length);
{
  // no paint inside the bumper-car tent or within the café terraces (mark vertices are x, height, y)
  let inside = 0, total = 0;
  for (const r of route) {
    const g = RS.roadSurfaceGeometries(r, true);
    const pos = g && g.mark ? g.mark.attributes.position.array : [];
    for (let i = 0; i < pos.length; i += 3) { total++; if (RA.marktFietsBlocked(horeca, pos[i], pos[i + 2])) inside++; }
  }
  check('no marking inside the tent or a terrace', total > 100 && inside <= total * 0.02, inside + '/' + total);
}
check('the same ways under another name get none (the paint is the route)', route.every((r) => markVerts({ ...r, name: 'Ander pad' }) === 0));
check('the markings stay finite', route.every((r) => { const a = RS.roadSurfaceGeometries(r, true).mark.attributes.position.array; return a.every(Number.isFinite); }));

// --- the signs
const spots = MF.signSpots(map);
check('there are signs at the entrances', spots.length >= 2 && spots.length <= 12, spots.length);
check('the signs stand on open ground near the square', spots.every((s) => Number.isFinite(s.x + s.y + s.face) && !isInsideBuilding(map, s.x, s.y) && !isInWater(map, s.x, s.y) && Math.hypot(s.x - RA.MARKT.x, s.y - RA.MARKT.y) < 220));
check('no two signs on top of each other', spots.every((s, i) => spots.every((o, j) => i === j || Math.hypot(s.x - o.x, s.y - o.y) >= 14)));

// --- the hint
const road = route[0];
const day = (m, d) => CAL.weekdayOf(CAL.day(m, d));
const wd = (m, d) => day(m, d);
check('a cyclist gets the hint', /Fietsen mag/.test(RA.marktFietsHint('fiets', road, { weekday: wd(8, 18) === 2 ? 4 : wd(8, 18), hour: 20 }) || ''));
check('a cyclist gets the market-day version on a market day', /stap af/.test(RA.marktFietsHint('fiets', road, { weekday: 2, hour: 11 }) || '') && /stap af/.test(RA.marktFietsHint('fiets', road, { weekday: 6, hour: 9 }) || ''));
check('after the market closes, or on another day, riding is fine', /Fietsen mag/.test(RA.marktFietsHint('fiets', road, { weekday: 5, hour: 18.5 })) && /Fietsen mag/.test(RA.marktFietsHint('fiets', road, { weekday: 3, hour: 11 })));
check('walkers and drivers get no hint, nor does another street', RA.marktFietsHint('lopen', road, {}) === null && RA.marktFietsHint('auto', road, {}) === null && RA.marktFietsHint('fiets', { name: 'Herestraat' }, {}) === null && RA.marktFietsHint('fiets', null, {}) === null);
check('cycling over a pedestrian way is allowed, no offence', RA.roadAllowed(road, 'fiets') === true && RA.offenceOf(road, 'fiets') === null);

// a cyclist on the square: one hint, once
{
  const mid = road.pts[Math.floor(road.pts.length / 2)];
  const msgs = [];
  const bike = { x: mid[0], y: mid[1], z: 0, isBike: true, speed: 3, angle: 0 };
  const world = {
    map, health: 100, clock: 20, calendar: { day: CAL.day(8, 18) }, wanted: 0, pedestrians: [], vehicles: [],
    player: { x: mid[0], y: mid[1], gz: 0, inVehicle: bike }, addMessage: (t, s, o) => msgs.push({ t, o }),
  };
  TL.resetTrafficLaw();
  for (let i = 0; i < 12; i++) TL.updateTrafficLaw(0.3, world);
  check('riding onto the square shows the hint once', msgs.filter((m) => m.o && m.o.key === 'marktfiets').length === 1 && msgs.length === 1, JSON.stringify(msgs));
  for (let i = 0; i < 12; i++) TL.updateTrafficLaw(0.3, world);
  check('and not again', msgs.length === 1);
  check('no offence, no star for riding there', !TL.getLawState().kind && world.wanted === 0);
  // on foot: nothing
  const msgs2 = [];
  const w2 = { ...world, player: { x: mid[0], y: mid[1], gz: 0, inVehicle: null }, addMessage: (t, s, o) => msgs2.push(t) };
  TL.resetTrafficLaw();
  for (let i = 0; i < 12; i++) TL.updateTrafficLaw(0.3, w2);
  check('walking over the square shows nothing', msgs2.length === 0);
}

console.log(`marktfiets: ${n - bad}/${n} ok`);
process.exit(bad ? 1 : 0);
