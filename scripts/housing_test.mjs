// Woningen om te kopen en te verhuren (#1103): de woningtelling per plaats (bezit_index.mjs), housesAt in de index, de gesynthetiseerde woningen van
// housing.js (ID, rij, aanbod, begrenzing) en de verhuur van business.js.   node scripts/housing_test.mjs
import assert from 'node:assert/strict';
import * as HS from '../game/js/housing.js';
import * as BZ from '../game/js/business.js';
import { createParcelIndex } from '../game/js/parcelindex.js';
import { countHomes, isHome, HOME_TYPES, HOME_M2, HOME_RADIUS } from './world/bezit_index.mjs';

let n = 0, fails = 0;
const t = (name, fn) => { n++; try { fn(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', String(e.stack || e.message).split('\n').slice(0, 3).join('\n   ')); } };
const PLACES = [['Winsum', 1000, 1000, 2400], ['Kleinhuizen', 9000, 9000, 60], ['Leegdorp', 20000, 20000, 0], ['Oud', 30000, 30000]];

t('telling: een woning telt bij de dichtstbijzijnde plaats binnen 4 km, grondvlak 40 tot 400 m2, alleen woontypen', () => {
  assert.ok(isHome('house', 100) && isHome('apartments', 40) && isHome('yes', 400));
  assert.equal(isHome('house', 39), false); assert.equal(isHome('house', 401), false); assert.equal(isHome('shed', 100), false); assert.equal(isHome('retail', 100), false);
  assert.ok(HOME_TYPES.has('terrace') && HOME_M2[0] === 40 && HOME_RADIUS === 4000);
  const places = [['A', 0, 0], ['B', 10000, 0]];
  const c = countHomes([[10, 10], [500, 0], [9500, 0], [5000, 0], [100000, 0], [-3900, 0]], places);
  assert.deepEqual(c, [3, 1], '5 km van beide: nergens; 100 km: nergens');
  assert.deepEqual(countHomes([], places), [0, 0]);
});

t('index: housesAt en placeNear lezen het vierde veld; een oud bestand zonder telling geeft null', () => {
  const ix = createParcelIndex({ v: 1, places: PLACES, rows: [] });
  assert.equal(ix.housesAt(1200, 1100), 2400); assert.equal(ix.placeAt(1200, 1100), 'Winsum');
  assert.equal(ix.placeNear(1200, 1100)[0], 'Winsum'); assert.equal(ix.placeNear(500000, 0), null);
  const oud = createParcelIndex({ v: 1, places: [['Winsum', 1000, 1000]], rows: [] });
  assert.equal(oud.housesAt(1000, 1000), null); assert.equal(oud.placeAt(1000, 1000), 'Winsum');
});

t('ID: ver boven elk OSM-id, per plaats en nummer, terug te lezen; een botsing van plaatsnummers schuift door', () => {
  const m = HS.createHomeMarket(PLACES);
  assert.equal(m.size, 2, 'alleen plaatsen met woningen');
  const r = m.rowOf(HS.SYNTH_BASE + (HS.parseHomeId(m.near(1000, 1000, new Set(), 1)[0].osm).key) * HS.SLOT_SPACE + 5);
  assert.ok(r && r.place === 'Winsum' && r.slot === 5 && r.m2 >= HS.MIN_HOME_M2 && r.m2 <= HS.MAX_HOME_M2 && r.type === 'house' && r.synth === 1);
  assert.ok(HS.isHomeId(r.osm)); assert.equal(HS.isHomeId(1234567890), false); assert.equal(HS.isHomeId(HS.SYNTH_BASE - 1), false);
  assert.ok(Number.isSafeInteger(r.osm));
  assert.equal(m.rowOf(HS.SYNTH_BASE + 99999 * HS.SLOT_SPACE + 9999), null);
  const clash = HS.createHomeMarket(Array.from({ length: 3000 }, (_, i) => [`Dorp${i}`, i * 10, 0, 50]));
  assert.equal(clash.size, 3000, 'ook met veel plaatsen krijgt elke plaats een eigen nummer');
});

t('aanbod: de woningen rond een punt, vast per plaats, zonder wat je al hebt; hooguit het aantal in de plaats', () => {
  const m = HS.createHomeMarket(PLACES);
  const a = m.near(1200, 1100, new Set(), 4), b = m.near(1200, 1100, new Set(), 4);
  assert.equal(a.length, 4); assert.deepEqual(a.map((r) => r.osm), b.map((r) => r.osm), 'vast: geen toeval');
  assert.equal(new Set(a.map((r) => r.osm)).size, 4);
  const owned = new Set(a.map((r) => r.osm));
  const c = m.near(1200, 1100, owned, 4);
  assert.ok(c.every((r) => !owned.has(r.osm)));
  const all = new Set(); let guard = 0;
  while (guard++ < 100) { const x = m.near(9000, 9000, all, 10); if (!x.length) break; for (const r of x) all.add(r.osm); }
  assert.ok(all.size <= 60 && all.size > 0, `Kleinhuizen heeft 60 woningen, ${all.size} te koop geweest`);
  assert.deepEqual(m.near(500000, 500000), []);
  assert.deepEqual(HS.createHomeMarket(null).near(0, 0), []);
});

t('prijs en verhuur: een woning kost de woningprijs van de plaats en levert huur met leegstand', () => {
  const m = HS.createHomeMarket(PLACES), row = m.near(1000, 1000, new Set(), 1)[0];
  const kind = BZ.classifyBuilding(row, null);
  assert.deepEqual(kind, { cls: 'rent', type: 'woning' });
  const price = BZ.basePrice(row, kind, { houses: 2400 });
  assert.ok(price > 0 && price % 50 === 0);
  const biz = { id: row.osm, type: 'woning', cls: 'rent', m2: BZ.livingArea(row), p: price, base: price, q: 100, cfg: BZ.normalizeCfg({}) };
  let rent = 0, empty = 0;
  for (let d = 1; d <= 400; d++) { const r = BZ.stepDay(biz, { day: d, owned: 1 }); if (r.report.moved) empty++; rent += r.report.revenue; }
  assert.ok(rent > 0 && empty > 0, 'er is huur en er zijn verhuizingen');
});

console.log(`housing_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
