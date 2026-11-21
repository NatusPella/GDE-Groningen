// De routeregel "snelste route" (21-11, docs/ROUTEREGELS.md), zuiver op een handvol wegen:
//   de soft-graaf laat toe wat het voertuig officieel niet mag (tegen een eenrichtingsweg in, een voetpad met de auto, de snelweg te
//   voet) met een lichte toeslag, laat trappen duur voor wie niet loopt, en de 3D-baan (pathlane.js) schuift nooit in een gevel.
//   node scripts/route_regels_test.mjs
import { graphBuildSteps, runSteps } from '../game/js/pathgraphbuild.js';
import { keepRight, trimPathEnd } from '../game/js/pathlane.js';
import { insideBuilding } from '../game/js/buildinghit.js';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };

const consts = { SOFT_COST: 1.25, SOFT_ROAD_COST: 1.6, THROUGH_BUILDING_COST: 40, SERVICE_COST: 2.5, OFFROAD_COST: 15, STEPS_COST: 60, MOTORWAY_AVOID: 8, BIKE_COST: { cycle: 0.8, minor: 1.15, normal: 1, major: 1.8, foot: 1.4 }, MOTORWAY_TYPES: new Set(['motorway', 'trunk']) };
const hooks = {
  isDrivable: (r) => r.cat !== 'foot' && r.cat !== 'cycle' && !r.busOnly,
  isWalkable: (r) => !r.busOnly && r.type !== 'motorway',
  isBikeable: (r) => !r.busOnly && r.type !== 'motorway' && r.type !== 'steps' && r.type !== 'footway',
  oneWayFor: (r) => !!r.oneway,
  throughOf: () => false,
  consts,
};
const road = (x0, type, cat, extra = {}) => ({ pts: [[x0, 0], [x0 + 100, 0]], type, cat, ...extra });
const roads = [road(0, 'residential', 'normal', { oneway: true }), road(200, 'footway', 'foot'), road(400, 'motorway', 'major'), road(600, 'steps', 'foot'), road(800, 'residential', 'normal')];
const G = runSteps(graphBuildSteps(roads, hooks)).value;
const edge = (adj, road, back = false) => {
  const rn = G.roadNodes.get(road);
  const [a, b] = back ? [rn[1], rn[0]] : [rn[0], rn[1]];
  for (let e = adj.start[a]; e < adj.start[a + 1]; e++) if (adj.to[e] === b) return adj.len[e];
  return null;
};

// de auto
ok(edge(G.drive, roads[0]) === 100 && edge(G.drive, roads[0], true) === null, 'streng: een eenrichtingsweg is maar een kant op');
ok(edge(G.driveSoft, roads[0]) === 100 && edge(G.driveSoft, roads[0], true) === 125, 'snelste: tegen de richting in mag, met 25% toeslag');
ok(edge(G.drive, roads[1]) === null && edge(G.driveSoft, roads[1]) === 160, 'snelste: een voetpad voor de auto mag, met 60% toeslag');
ok(edge(G.driveSoft, roads[3]) === 6000, 'snelste: trappen blijven voor de auto zeer duur');
ok(edge(G.driveSoft, roads[4]) === 100, 'snelste: een gewone weg kost niets extra');
ok(edge(G.driveSoftAvoid, roads[2]) === 800, 'snelste, snelwegen mijden: de snelweg blijft duur');
// te voet
ok(edge(G.walk, roads[2]) === null && edge(G.walkSoft, roads[2]) === 800, 'snelste te voet: de snelweg mag, maar duur (je gaat er niet voor om)');
ok(edge(G.walkSoft, roads[1]) === 100 && edge(G.walkSoft, roads[3]) === 100, 'snelste te voet: voetpaden en trappen zijn gewoon');
// fiets
ok(edge(G.bike, roads[1]) === null && edge(G.bikeSoft, roads[1]) === 160, 'snelste per fiets: een voetpad mag, met toeslag');
ok(edge(G.bikeSoft, roads[0], true) === 125, 'snelste per fiets: tegen de richting in, met toeslag');
ok(edge(G.bikeSoft, roads[3]) === 6000, 'snelste per fiets: trappen zeer duur');
ok(edge(G.bikeSoft, roads[4]) === 100, 'snelste per fiets: een gewone weg kost niets extra');

// de strook: nooit in een gevel
const gebouw = { bounds: [-10, 3, 20, 12], pts: [[-10, 3], [20, 3], [20, 12], [-10, 12], [-10, 3]] };
const grid = { cell: 50, cellItems: (cx, cy) => (cx === 0 && cy === 0 || cx === -1 && cy === 0 ? [gebouw] : null) };
const map = { buildingGrid: grid, roadsNear: () => [{ cat: 'normal', width: 8, pts: [[-20, 0], [60, 0]] }] };
// een weg langs de noordkant van de x-as: rechts houden schuift 2 m naar (x, -2) of (x, +2), afhankelijk van de rijrichting
const heen = keepRight([[0, 2.6], [10, 2.6]], map), terug = keepRight([[10, 2.6], [0, 2.6]], map);
const buiten = (p) => !insideBuilding(map, p[0], p[1]);
ok(heen.every(buiten) && terug.every(buiten), 'keepRight schuift de lijn niet in een gebouw');
const vrij = keepRight([[30, 0], [40, 0]], { ...map, buildingGrid: { cell: 50, cellItems: () => null } });
ok(Math.abs(Math.abs(vrij[0][1]) - 2) < 1e-9, 'keepRight schuift buiten gebouwen gewoon 2 m naar rechts');

// de route eindigt bij de gevel als de weg in het pand eindigt
const pand = { bounds: [100, -10, 140, 10], pts: [[100, -10], [140, -10], [140, 10], [100, 10], [100, -10]] };
const kaart2 = { buildingGrid: { cell: 50, cellItems: (cx) => (cx === 2 || cx === 3 ? [pand] : null) }, roadsNear: () => [] };
const kort = trimPathEnd(kaart2, [[0, 0], [60, 0], [130, 0]]);
ok(kort.length === 3 && kort[2][0] > 99 && kort[2][0] < 100.6 && kort[2][1] === 0, 'trimPathEnd: de route eindigt bij de gevel', JSON.stringify(kort));
const heel = [[0, 0], [60, 0], [90, 0]];
ok(trimPathEnd(kaart2, heel) === heel, 'trimPathEnd: een route buiten gebouwen blijft zoals hij is');
const lang = [[0, 0], [100.5, 0], [139, 0]];
ok(trimPathEnd(kaart2, lang).length === 2, 'trimPathEnd: een staart van 38 m binnen het pand wordt afgekapt');

if (fails) { console.log(`${fails} van ${n} controles mislukt`); process.exit(1); }
console.log(`route_regels_test: ${n} controles ok`);
