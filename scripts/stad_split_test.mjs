// game/stad.json is een verliesloze splitsing van citymap.json (#90): de stadstegels (pack_tiles) uit [stad.json + OSM-lagen]
// zijn byte voor byte gelijk aan die uit [citymap.json + dezelfde OSM-lagen], voor elke keuze van STAD_LAAG.
//   node scripts/stad_split_test.mjs           fixture (kleine stad, verzonnen OSM-lagen, alle keuzes van lagen) + stad.json-controles
//   node scripts/stad_split_test.mjs --echt    ook de echte stad: citymap.json tegenover stad.json met de echte OSM-lagen (minuten;
//                                              slaat over zonder game/citymap.json of data/cache/province)
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const GAME = path.join(ROOT, 'game');
const P = await import('./world/pack_tiles.mjs');
const { splitCity, readCitymap, stringifyStad, OSM_LAGEN } = await import('./world/stad_split.mjs');
const { isHandBuilding } = await import('./world/stad_laag.mjs');
const { buildCityCover } = await import('./world/citycover.mjs');
const { GameMap, applyMapExtras } = await import('../game/js/mapdata.js');
const NOATTR = { osm: [], bag: [] };
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');

// --- de vingerafdruk van een stadsbouw: sha256 van elke tegel, de globale laag en de tellingen
const fingerprint = (built) => {
  const f = { global: sha(built.global), counts: JSON.stringify(built.counts), attr: JSON.stringify(built.attrStats) };
  for (const [k, b] of built.blobs) f['tile ' + k] = sha(b.bytes);
  return f;
};
const sameBuild = (a, b, what) => {
  const A = fingerprint(a), B = fingerprint(b);
  assert.deepEqual(Object.keys(A), Object.keys(B), `${what}: andere tegels`);
  for (const k of Object.keys(A)) assert.equal(A[k], B[k], `${what}: ${k} verschilt`);
  return Object.keys(A).length;
};

// --- de fixture: de echte wegen en spoorlijnen van stad.json in een venster, met verzonnen water, groen, bomen en gebouwen
let seed = 90210;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
const stad = P.readStad(GAME);
const WIN = [-1400, -1400, 1400, 1400];
const inWin = (pts) => pts.some(([x, y]) => x > WIN[0] && x < WIN[2] && y > WIN[1] && y < WIN[3]);
const square = (x, y, r) => [[x - r, y - r], [x + r, y - r], [x + r, y + r], [x - r, y + r]];
const at = () => [WIN[0] + rnd() * (WIN[2] - WIN[0]), WIN[1] + rnd() * (WIN[3] - WIN[1])].map((v) => Math.round(v * 10) / 10);
const fake = () => {
  const d = { ...stad.data, roads: stad.data.roads.filter((r) => inWin(r.pts)), rails: (stad.data.rails || []).filter((r) => inWin(r.pts)) };
  const hand = stad.data.buildings.filter((b) => inWin(b.pts));
  const make = (n, f) => Array.from({ length: n }, f);
  d.buildings = [...hand, ...make(250, (_, i) => { const [x, y] = at(); return { pts: square(x, y, 4 + rnd() * 6), h: 3 + rnd() * 9, type: 'yes', name: i % 9 ? undefined : 'Huis ' + i, hsrc: 'default', hm: 6 }; })];
  d.water = make(12, () => { const [x, y] = at(); return { pts: square(x, y, 12 + rnd() * 30), name: null, body: 3, kind: 'vijver', lv: -2.3, dp: 1.5, nav: 1 }; });
  d.green = make(14, () => { const [x, y] = at(); return { pts: square(x, y, 15 + rnd() * 40), kind: 'park' }; });
  d.trees = make(300, () => [...at(), Math.floor(rnd() * 9), 100 + Math.floor(rnd() * 150), 0]);
  return d;
};
const legacyOf = (d, tag) => {
  const copy = JSON.parse(JSON.stringify(d));
  const ex = JSON.parse(fs.readFileSync(path.join(GAME, 'mapextras.json'), 'utf8'));
  const m = JSON.parse(JSON.stringify(d));
  applyMapExtras(m, ex);
  return { data: copy, fromOsm: [], tiles: P.cityTileKeys(copy), mask: buildCityCover(new GameMap(m)).mask(), tag };
};
// "OSM": een eigen, vaste verzameling rijen per laag; de gebouwen na het handwerk, zoals osmCityLayers dat doet
const osmRows = (() => {
  seed = 777;
  const make = (n, f) => Array.from({ length: n }, f);
  return {
    water: make(9, () => { const [x, y] = at(); return { pts: square(x, y, 10 + rnd() * 25), name: 'Sloot', body: 2, kind: 'sloot', lv: -2, dp: 1, nav: 0 }; }),
    green: make(11, () => { const [x, y] = at(); return { pts: square(x, y, 12 + rnd() * 30), kind: 'grass' }; }),
    trees: make(200, () => [...at(), Math.floor(rnd() * 9), 90 + Math.floor(rnd() * 160), 0]),
    buildings: make(200, () => { const [x, y] = at(); return { pts: square(x, y, 3 + rnd() * 8), h: 3 + rnd() * 9, type: 'yes', hsrc: 'osm_levels', hm: 7 }; }),
  };
})();
const recorder = (calls) => async (keys, inside, lagen, data) => {
  const probe = []; for (let x = WIN[0]; x < WIN[2]; x += 53) for (let y = WIN[1]; y < WIN[3]; y += 53) probe.push(inside(x, y) ? 1 : 0);
  calls.push({ keys: [...keys], lagen: [...lagen].sort(), hand: data.buildings.filter(isHandBuilding), probe: probe.join('') });
  const out = {};
  for (const l of lagen) out[l] = JSON.parse(JSON.stringify(osmRows[l]));
  if (out.buildings) out.buildings = [...data.buildings.filter(isHandBuilding), ...out.buildings];
  return out;
};

let checks = 0;
{
  const d = fake();
  const choices = [[], ['water'], ['green', 'trees'], ['buildings'], ['trees', 'water', 'buildings'], OSM_LAGEN];
  for (const L of choices) {
    // stad.json voor deze keuze: de gekozen lagen eruit, de rest blijft; door de tekst en terug
    const text = stringifyStad(splitCity(legacyOf(d), { omit: L }));
    const city = P.stadOf(JSON.parse(text));
    assert.deepEqual([...city.fromOsm].sort(), [...L].sort());
    const callsA = [], callsB = [];
    const a = await P.loadSourcesLaag(GAME, L, { city: legacyOf(d), osm: recorder(callsA) });
    const b = await P.loadSourcesLaag(GAME, [], { city, osm: recorder(callsB) });
    assert.deepEqual(callsB, callsA, `STAD_LAAG=${L.join(',') || '-'}: de OSM-bouw krijgt andere stadstegels, dekking of handgebouwen`);
    assert.equal(a.map.buildings.length, b.map.buildings.length);
    checks += sameBuild(P.build(a, NOATTR, new Map()), P.build(b, NOATTR, new Map()), `STAD_LAAG=${L.join(',') || '-'}`);
    console.log(`  STAD_LAAG=${L.join(',') || '-'}: ${a.map.buildings.length} gebouwen, ${a.map.roads.length} wegen, ${a.map.water.length} water, ${a.map.trees.length} bomen: gelijk`);
  }
}

// --- het ingecheckte stad.json
{
  const s = P.readStad(GAME);
  assert.deepEqual(s.fromOsm, OSM_LAGEN, 'stad.json laat de OSM-lagen aan de tegelbouw');
  for (const l of OSM_LAGEN) assert.ok(!(l in s.data) || l === 'buildings', `${l} hoort niet in stad.json`);
  assert.ok(s.data.buildings.length > 0 && s.data.buildings.every(isHandBuilding), 'alleen handgebouwen');
  assert.ok(s.tiles.length > 0 && s.mask && s.mask.rle.length > 0);
  const text = fs.readFileSync(path.join(GAME, 'stad.json'), 'utf8').split('\r\n').join('\n'); // autocrlf op Windows
  assert.equal(stringifyStad(JSON.parse(text)), text, 'stad.json staat in de vaste, leesbare vorm (stad_split.mjs)');
  assert.ok(text.length < 8e6, 'stad.json blijft klein');
  const cover = (await import('./world/citycover.mjs')).cityCoverFromMask(s.mask);
  assert.ok(cover.inside(0, 0), 'het centrum ligt in de dekking');
  assert.ok(!cover.inside(1e6, 1e6));
  console.log(`  stad.json: ${(text.length / 1e6).toFixed(2)} MB, ${s.data.roads.length} wegen, ${s.data.buildings.length} handgebouwen, ${s.tiles.length} tegels`);
  // is het de uitkomst van de splitsing? (alleen zolang citymap.json er nog is)
  if (fs.existsSync(path.join(GAME, 'citymap.json'))) {
    const again = stringifyStad(splitCity(await readCitymap(GAME)));
    assert.equal(again, text, 'stad.json is de splitsing van citymap.json (node scripts/world/stad_split.mjs)');
    console.log('  stad.json = splitsing van de huidige citymap.json');
  }
}

// --- de echte stad (opt-in)
if (process.argv.includes('--echt')) {
  const { haveProvince } = await import('./world/build_province.mjs');
  if (!fs.existsSync(path.join(GAME, 'citymap.json')) || !haveProvince()) console.log('SKIP echt: geen game/citymap.json of geen data/cache/province (GDE_PROVINCE_SRC)');
  else {
    const L = process.env.STAD_LAAG ? P.parseLagen(process.env.STAD_LAAG) : OSM_LAGEN;
    const t0 = performance.now();
    const a = P.build(await P.loadSourcesLaag(GAME, L, { city: await readCitymap(GAME) }));
    const t1 = performance.now();
    const b = P.build(await P.loadSourcesLaag(GAME, []));
    const n = sameBuild(a, b, 'echte stad');
    checks += n;
    console.log(`  echte stad (STAD_LAAG=${L.join(',')}): ${a.blobs.size} tegels + globale laag: sha256 gelijk (${n} vingerafdrukken, ${((t1 - t0) / 1000).toFixed(0)} s + ${((performance.now() - t1) / 1000).toFixed(0)} s)`);
  }
}
console.log(`stad_split_test: ok (${checks} sha256-vergelijkingen)`);
