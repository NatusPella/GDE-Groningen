// De kaartautomaat op een halte in het land (#927): bij Warffum en Usquert
// stond hij 7 m van het eigen spoor, en dat is op een dubbelsporige lijn precies
// het tweede spoor. Deze test rekent de plek na op een nagebootst dubbelspoor en,
// als de wereld er is, op de echte tegels rond Warffum en Usquert.
//   node scripts/station_machine_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import './node3d.mjs';

// DOM-stub voor de reisscène (fade-element) van stationtravel.js
const noop = () => {};
const mk = () => ({ style: { setProperty: noop, removeProperty: noop }, dataset: {}, classList: { add: noop, remove: noop, toggle: noop, contains: () => false },
  appendChild: noop, removeChild: noop, remove: noop, addEventListener: noop, removeEventListener: noop, setAttribute: noop,
  querySelector: () => mk(), querySelectorAll: () => [], getBoundingClientRect: () => ({ left: 0, top: 0, width: 1, height: 1 }) });
document.body = mk();

const { countryMachineSpot, countryArriveSpot } = await import('../game/js/stationtravel.js');
const { SpatialGrid } = await import('../game/js/spatialgrid.js');

let n = 0;
const t = (naam, f) => { f(); n++; console.log(`ok ${naam}`); };

// Een nagebootst dubbelspoor: het eigen spoor op y = 0, het tweede op y = 6.6.
function dubbelspoor() {
  const grid = new SpatialGrid(40);
  for (const y of [0, 6.6]) {
    const rail = { pts: [[-400, y], [400, y]] };
    rail.bounds = [-400, y - 1, 400, y + 1];
    grid.insert(rail, rail.bounds);
  }
  return {
    railGrid: grid,
    buildingsNear: () => [],
    roadsNear: () => [],
    canWalkOut: () => true,
    escapeBuilding: (x, y) => [x, y],
    findOpenSpawn: () => null,
  };
}
const { gridItems } = await import('../game/js/spatialgrid.js');
const railAfstand = (map, x, y) => {
  let best = Infinity;
  for (const r of gridItems(map.railGrid)) {
    const p = r.pts;
    for (let i = 1; i < p.length; i++) {
      const ax = p[i - 1][0], ay = p[i - 1][1], dx = p[i][0] - ax, dy = p[i][1] - ay, l2 = dx * dx + dy * dy || 1;
      const u = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l2));
      best = Math.min(best, Math.hypot(ax + dx * u - x, ay + dy * u - y));
    }
  }
  return best;
};

t('de automaat staat op de perrontegel, niet op het tweede spoor', () => {
  const m = countryMachineSpot(0, 0, 0, 1);
  // perron: 3,3 m uit het spoor, 3,2 m breed -> 1,7 .. 4,9 m; de automaat op 3,7 m
  assert.ok(m.y > 3.3 - 1.6 && m.y < 3.3 + 1.6, `op de perrontegel (${m.y})`);
  assert.equal(m.z, 1.02, 'op de hoogte van het perron');
  const map = dubbelspoor();
  assert.ok(railAfstand(map, m.x, m.y) > 1.5, 'minstens 1,5 m van elk spoor');
});

t('de aankomstplek ligt voorbij alle sporen', () => {
  const map = dubbelspoor();
  const a = countryArriveSpot(map, 0, 0, 0, 1);
  assert.ok(railAfstand(map, a.x, a.y) >= 6, `aankomst op ${railAfstand(map, a.x, a.y).toFixed(1)} m van het spoor`);
  assert.ok(a.y > 6.6, 'aan de stationskant, voorbij het tweede spoor');
});

// De echte wereld: de tegels rond Warffum en Usquert (SKIP zonder game/world).
const root = new URL('../game/world/', import.meta.url);
if (fs.existsSync(new URL('index-provincie.json', root))) {
  const S = await import('../game/js/tilestore.js');
  const TW = await import('../game/js/tileworld.js');
  const G = await import('../game/js/gdt.js');
  const PW = await import('../game/js/provinceworld.js');
  const { applyCityRoutes } = await import('../game/js/corridorrail.js');
  const RW = await import('../game/js/railway.js');
  const ST = await import('../game/js/stationtravel.js');
  const files = new Proxy({}, { get: (o, f) => (typeof f === 'string' ? (o[f] || (o[f] = new Uint8Array(fs.readFileSync(new URL(f, root))))) : undefined) });
  const T = await TW.loadTileWorld('world/', { source: new S.MemorySource(files), pool: false, extra: ['index-provincie.json'] });
  const map = T.world;
  PW.initProvince({ index: T.index, world: map });
  applyCityRoutes(map, JSON.parse(fs.readFileSync(new URL('provincie-land.json', root), 'utf8')));
  const keys = new Set();
  for (const [x, y] of [[-187.6, -18992.1], [2629.5, -20242.9]]) {
    for (let dx = -500; dx <= 500; dx += 250) for (let dy = -500; dy <= 500; dy += 250) {
      const [i, j] = G.tileIndexOf(x + dx, y + dy); const k = G.tileKey(i, j); if (T.index.tiles[k]) keys.add(k);
    }
  }
  await Promise.all([...keys].map((k) => T.store.request(k, { priority: -1 })));
  map.tileQueue.run(1e9);
  const world = { map, vehicles: [], pedestrians: [], player: { x: 0, y: 0, angle: 0, vx: 0, vy: 0, z: 0 }, companion: null, time: 0, clock: 10, money: 200, wanted: 0, input: { wasPressed: () => false, consume: noop, reset: noop }, onRespawn: [], audioEvents: [], particles: [], addMessage: noop };
  RW.initRailway(world);
  // alleen de haltes in het land; de stadstations hebben hun eigen plaatsing
  const landMap = Object.create(map);
  landMap.stations = [];
  landMap.countryStations = map.countryStations;
  ST.initStationTravel({ ...world, map: landMap });
  for (const naam of ['Warffum', 'Usquert']) {
    t(`${naam}: de automaat staat niet op het spoor`, () => {
      const s = ST.getStationsForRender().find((q) => q.name === naam);
      assert.ok(s && s.machine, `${naam} heeft een kaartautomaat`);
      const mx = s.machine.position.x, my = s.machine.position.z;
      assert.equal(s.machine.position.y, 1.02, 'op het perron');
      const d = railAfstand({ railGrid: map.railGrid }, mx, my);
      assert.ok(d > 1.5, `de automaat staat ${d.toFixed(1)} m van het dichtstbijzijnde spoor`);
      assert.ok(railAfstand({ railGrid: map.railGrid }, s.arrive.x, s.arrive.y) >= 6, 'de aankomst is vrij van alle sporen');
    });
  }
} else {
  console.log('SKIP echte tegels: geen game/world');
}

console.log(`station_machine_test: ${n}/${n} ok`);
