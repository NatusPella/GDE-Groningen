// Verkeerslichten uit de gestroomde tegel (#314 C2b): een tegel met een beveiligde
// kruising (JUNCTIONS-rij met een seinarm) levert een verkeerslicht, en als zo'n tegel
// bij komt of weggaat bouwt trafficlights zijn netwerk en controllers opnieuw.
// Zonder deze test merkt niemand dat de provincie wel voorrang heeft (#469) maar geen licht.
//   node scripts/trafficlights_tiles_test.mjs
import './node3d.mjs';
const { SpatialGrid } = await import('../game/js/spatialgrid.js');
const J = await import('../game/js/junctions.js');
const TL = await import('../game/js/trafficlights.js');

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info ? ' (' + info + ')' : ''}`); } };

// Een kleine nep-kaart zoals TileWorld hem heeft: geen stadsarrays, wel de rasters en
// de kruispuntrijen van de tegels (gid -> wegobject in map._res.roads).
const roadA = { cat: 'normal', type: 'secondary', width: 8, pts: [[-60, 0], [0, 0], [60, 0]], bounds: [-60, -4, 60, 4] };
const roadB = { cat: 'minor', type: 'residential', width: 6, pts: [[0, -60], [0, 0], [0, 60]], bounds: [-3, -60, 3, 60] };
const roadC = { cat: 'minor', type: 'residential', width: 6, pts: [[0, 40], [0, 60], [0, 80]], bounds: [-3, 40, 3, 80] };
const roadGrid = new SpatialGrid(40);
for (const r of [roadA, roadB, roadC]) roadGrid.insert(r, r.bounds);
const map = {
  roads: [], meta: {}, roadGrid,
  roadsNear: (x, y, r) => roadGrid.query(x - r, y - r, x + r, y + r),
  _res: { roads: new Map([[0, { obj: roadA }], [1, { obj: roadB }], [2, { obj: roadC }]]) },
  junctionRows: new Map([['t0', [{ k: '0,0', p: [[0, 0]], c: 'signals', a: [[0, 1, 1, 1, 6, 1], [1, 1, 1, 1, 6, 1]] }]]]),
  junctionVer: 1, signalVer: 1,
};
const world = { map, weather: { wet: 0 } };

// 1. het eerste tegelkruispunt levert een signaal en een controller
ok(J.allSignals(map).some((s) => s.tile && s.key === '0,0'), 'de tegel met een seinarm levert een verkeerslicht');
TL.initTrafficLights(world);
ok(TL.getTrafficControllers().length === 1, 'een controller voor de beveiligde kruising', String(TL.getTrafficControllers().length));
ok(TL.getTrafficLights().length === 4, 'vier lichten op de twee armen', String(TL.getTrafficLights().length));

// 2. een tegel met een tweede beveiligde kruising komt erbij: het netwerk volgt
map.junctionRows.set('t1', [{ k: '0,55', p: [[0, 55]], c: 'signals', a: [[2, 1, 1, 1, 6, 1]] }]);
map.junctionVer++;
map.signalVer = (map.signalVer || 0) + 1;
TL.updateTrafficLights(1 / 60, world);
ok(TL.getTrafficControllers().length === 2, 'na een tegel met een tweede kruising zijn er twee controllers', String(TL.getTrafficControllers().length));

// 3. de tegel gaat weg: het licht en de controller verdwijnen weer
map.junctionRows.delete('t1');
map.junctionVer++;
map.signalVer = (map.signalVer || 0) + 1;
TL.updateTrafficLights(1 / 60, world);
ok(TL.getTrafficControllers().length === 1, 'na het weggaan van de tegel blijft de stad over', String(TL.getTrafficControllers().length));
ok(!J.allSignals(map).some((s) => s.key === '0,55'), 'het signaal van de weggevallen tegel is weg');

// 4. een tegel zonder beveiligde kruising vraagt geen herbouw
const before = TL.getTrafficControllers().length;
map.junctionRows.set('t2', [{ k: '70,0', p: [[70, 0]], c: 'equal', a: [[0, 2, 1, 3, 4, 1]] }]);
map.junctionVer++; // wel een modelwijziging, geen signalVer
TL.updateTrafficLights(1 / 60, world);
ok(TL.getTrafficControllers().length === before, 'een gewone kruisingstegel raakt de verkeerslichten niet');

console.log(`trafficlights_tiles_test: ${fails ? fails + ' FAILED' : 'ok'} (${n} checks)`);
process.exit(fails ? 1 : 0);
