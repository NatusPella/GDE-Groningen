// De kaartautomaat en het perron op een halte in het land (#927, #961):
// - bij Warffum en Usquert stond de automaat eerst 7 m van het eigen spoor, en dat is op
//   een dubbelsporige lijn precies het tweede spoor;
// - bij Zuidhorn kwam je na de treinreis aan de andere kant van het tweede spoor terecht,
//   met de automaat aan de overkant van het eilandperron. Nu is het perron van de halte
//   een echte vloer in het hoogtemodel en land je erop, naast de automaat.
// Deze test rekent de plekken na op een nagebootst dubbelspoor en, als de wereld er is,
// op de echte tegels rond Zuidhorn, Warffum en Usquert.
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

const { countryMachineSpot, countryArriveSpot, countryPlatformRow } = await import('../game/js/stationtravel.js');
const { SpatialGrid } = await import('../game/js/spatialgrid.js');
const E = await import('../game/js/elevation.js');

let n = 0;
const t = (naam, f) => { f(); n++; console.log(`ok ${naam}`); };
const near = (a, b, e = 0.02) => Math.abs(a - b) <= e;

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

t('het perron is een echte vloer met twee hellingen', () => {
  const row = countryPlatformRow(0, 0, 1, 0, 0, 1, 'Zuidhorn');
  assert.equal(row.st, 'Zuidhorn');
  assert.equal(row.id, 'halte-zuidhorn');
  assert.equal(row.p.length, 2, 'twee punten: het perron is recht');
  assert.ok(row.p.every((q) => near(q[3], 1.02) && near(q[2], 1.6)), 'bovenkant 1,02 m en 3,2 m breed');
  assert.ok(row.p.every((q) => near(q[1], 3.3, 0.01)), 'hartlijn 3,3 m van het spoor');
  assert.ok(row.p[0][0] < 0 && row.p[1][0] > 0, 'van -40 tot +40 m langs het spoor');
  assert.equal(row.r.length, 2, 'aan beide koppen een helling');
  assert.ok(row.r.every((r) => r.k === 'helling' && near(r.za, 1.02) && r.zb === 0 && near(r.hw, 1.3)));
  assert.ok(near(row.r[0].b[0], -47) && near(row.r[1].b[0], 47), 'de helling loopt 7 m naar buiten');
});

t('de aankomstplek ligt op het perron, naast de automaat', () => {
  const a = countryArriveSpot(dubbelspoor(), 0, 0, 0, 1);
  assert.equal(a.z, 1.02, 'op de hoogte van de perronvloer');
  assert.ok(near(a.y, 3.0, 0.01), `tussen de rand en de automaat (${a.y})`);
  const m = countryMachineSpot(0, 0, 0, 1);
  assert.ok(Math.hypot(a.x - m.x, a.y - m.y) >= 0.6, 'niet in de automaat');
});

t('op de perronvloer kun je staan, ook vanaf de grond', () => {
  const row = countryPlatformRow(0, 0, 1, 0, 0, 1, 'Proef');
  const elev = E.addPerrons({ perrons: [row], roads: [], terrainOn: false }, { has: false });
  const a = countryArriveSpot(dubbelspoor(), 0, 0, 0, 1);
  assert.ok(near(E.groundHeightAt(elev, a.x, a.y, 1.02), 1.02, 0.01), 'je staat op de vloer');
  assert.ok(near(E.groundHeightAt(elev, a.x, a.y, 0), 1.02, 0.01), 'vanaf de grond stap je de lage halte op');
  // de helling is zonder sprong te belopen
  const r = row.r[1];
  const s = { z: 0, ribbon: null };
  let jump = 0, z = 0;
  for (let i = 0; i <= 40; i++) {
    const k = i / 40;
    const before = s.z;
    E.surfaceAt(elev, r.b[0] + (r.a[0] - r.b[0]) * k, r.b[1] + (r.a[1] - r.b[1]) * k, s);
    jump = Math.max(jump, Math.abs(s.z - before));
    z = s.z;
  }
  assert.ok(jump < 0.3, `de helling loopt gelijkmatig (sprong ${jump.toFixed(2)})`);
  assert.ok(near(z, 1.02, 0.03), 'boven aan de helling sta je op het perron');
});

// De echte wereld: de tegels rond Zuidhorn, Warffum en Usquert (SKIP zonder game/world).
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
  for (const [x, y] of [[-187.6, -18992.1], [2629.5, -20242.9], [-10615.84, -3026.32]]) {
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
  const perronAfstand = (row, x, y) => {
    let best = Infinity;
    for (let i = 1; i < row.p.length; i++) {
      const ax = row.p[i - 1][0], ay = row.p[i - 1][1], bx = row.p[i][0], by = row.p[i][1];
      const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1;
      const u = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l2));
      best = Math.min(best, Math.hypot(ax + dx * u - x, ay + dy * u - y));
    }
    return best;
  };
  for (const naam of ['Zuidhorn', 'Warffum', 'Usquert']) {
    t(`${naam}: de automaat staat op het perron en je komt er ook op aan`, () => {
      const s = ST.getStationsForRender().find((q) => q.name === naam);
      assert.ok(s && s.machine, `${naam} heeft een kaartautomaat`);
      const mx = s.machine.position.x, my = s.machine.position.z;
      assert.equal(s.machine.position.y, 1.02, 'op het perron');
      const d = railAfstand({ railGrid: map.railGrid }, mx, my);
      assert.ok(d > 1.5, `de automaat staat ${d.toFixed(1)} m van het dichtstbijzijnde spoor`);
      assert.equal(s.row.st, naam, 'de halte heeft een perronrij');
      assert.ok(perronAfstand(s.row, mx, my) <= 1.6, 'de automaat staat op de perronrij');
      assert.ok(s.arrive.z === 1.02, `de aankomst ligt op de perronvloer (${s.arrive.z})`);
      assert.ok(perronAfstand(s.row, s.arrive.x, s.arrive.y) <= 1.6, 'de aankomst ligt op de perronrij');
      // de oude fout: de aankomst lag voorbij alle sporen, aan de andere kant van het perron
      const own = Math.hypot(s.rail.x - s.arrive.x, s.rail.y - s.arrive.y);
      assert.ok(own < 6, `de aankomst ligt aan deze kant van het tweede spoor (${own.toFixed(1)} m)`);
      assert.ok(near(E.groundHeightAt(map.elev, s.arrive.x, s.arrive.y, 1.02), 1.02, 0.01), 'onder de aankomst ligt de perronvloer');
    });
  }
} else {
  console.log('SKIP echte tegels: geen game/world');
}

console.log(`station_machine_test: ${n}/${n} ok`);
