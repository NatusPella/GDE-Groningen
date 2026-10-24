// The city's places as tile rows (game/js/poisections.js, #314 B6-B8): split and join are lossless, also through the .gdt tables,
// on made-up lists and on the real meta of game/stad.json.
//   node scripts/poisections_test.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert';
import { splitMeta, joinMeta } from '../game/js/poisections.js';
import { poiLayers, poiLayerTiles } from './world/poilagen.mjs';
import * as G from '../game/js/gdt.js';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info ? ' (' + info + ')' : ''}`); } };
const same = (a, b, name) => { n++; try { assert.deepStrictEqual(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b))); } catch (e) { fails++; console.log('FAIL ' + name + ': ' + String(e.message).split('\n').slice(0, 6).join(' | ')); } };
const tileKeyOf = (x, y) => { const [i, j] = G.tileIndexOf(x, y); return G.tileKey(i, j); };

// made-up meta: lists, a single object, a map of lists (one empty), things that are no places
const meta = {
  shops: [{ t: 'wapens', x: 298.56, y: 348.96, wijk: 'Binnenstad' }, { t: 'kapper', x: 1500.5, y: -20.25 }, { t: 'bakker', x: 301, y: 340 }],
  horeca: [],
  hospital: { name: 'UMCG', x: 10, y: 20 },
  pois: { health: [{ x: 1, y: 2, kind: 'health', name: 'a' }, { x: 3000, y: 2, kind: 'health', name: 'b' }], money: [] },
  bounds: [-3020, -4310, 4090, 3500], frame: 'rd-new', rdOrigin: [233670, 582250],
  districts: [{ name: 'Groningen', rings: [[[1, 2], [3, 4], [5, 6]]] }],
};
{
  const s = splitMeta(meta, tileKeyOf);
  ok(!('shops' in s.meta) && !('hospital' in s.meta) && s.meta.bounds === meta.bounds && s.meta.districts === meta.districts, 'places leave the meta, the rest stays');
  ok(Array.isArray(s.meta.horeca) && s.meta.horeca.length === 0 && s.meta.poiLists.hospital === -1 && s.meta.poiLists['pois.health'] === 2 && s.meta.poiLists['pois.money'] === 0, 'an empty list stays in the meta, every moved list is named (a kind with no places too)');
  ok(s.rows.size >= 2 && [...s.rows.values()].flat().length === 6, 'six places in the rows of their tiles', `${s.rows.size} tiles`);
  ok(![...s.rows.entries()].some(([k, rows]) => rows.some((r) => tileKeyOf(r.x, r.y) !== k)), 'each place sits in the tile of its point');
  same(joinMeta(s.meta, s.rows.values()), meta, 'join gives back the meta');
  // through the .gdt tables
  const through = [...s.rows.entries()].map(([k, rows]) => { const [i, j] = G.tileFromKey(k); const b = G.decodeBlob(G.encodeBlob({ i, j, sections: [{ type: G.SECTION.POIS, rows }] })); return b.sections.find((q) => q.type === G.SECTION.POIS).rows; });
  same(joinMeta(s.meta, through), meta, 'and through encodeBlob / decodeBlob');
  // a tile that cannot hold a place: it stays in the meta
  const held = splitMeta(meta, tileKeyOf, (k) => k !== tileKeyOf(1500.5, -20.25));
  ok(held.meta.poiRest.length === 1 && held.meta.poiRest[0].t === 'kapper', 'a place without a tile goes to poiRest');
  same(joinMeta(held.meta, held.rows.values()), meta, 'and comes back');
  // order: tiles arrive in any order
  same(joinMeta(s.meta, [...s.rows.values()].reverse()), meta, 'the order of the lists survives any order of tiles');
  let threw = false;
  try { joinMeta(s.meta, [...s.rows.values()].slice(1)); } catch (e) { threw = true; }
  ok(threw, 'a missing tile is an error, not a short list');
  threw = false;
  try { splitMeta({ shops: [{ x: 1, y: 2, _l: 'x' }] }, tileKeyOf); } catch (e) { threw = true; }
  ok(threw, 'a field called _l is refused');
  ok(joinMeta({ bounds: [1] }, []).bounds[0] === 1 && joinMeta(undefined, []) === undefined, 'a meta without places passes through');
}

// de POI-lagen in de tegelindex (#314, B6): per lijst de tegels die hem dragen, zodat een lezer
// alleen die tegels vraagt; uit die tegels komt dezelfde meta terug (met poiRest uit de globale laag)
{
  const s = splitMeta(meta, tileKeyOf);
  const layers = poiLayers(s);
  const rowsOf = (name) => [...s.rows.entries()].filter(([, rows]) => rows.some((r) => r._l === name)).map(([k, rows]) => [k, rows.filter((r) => r._l === name)]);
  const all = Object.keys(layers.layers);
  ok(all.length === Object.keys(s.meta.poiLists || {}).length && all.includes('shops') && all.includes('pois.money') && all.includes('hospital'), 'every list of the meta has a layer, an empty kind too');
  let countsOk = 0;
  for (const name of all) {
    const rows = rowsOf(name);
    const l = layers.layers[name];
    if (l.n === rows.reduce((a, [, r]) => a + r.length, 0) && l.tiles.join() === rows.map(([k]) => k).sort().join()) countsOk++;
  }
  ok(countsOk === all.length, 'per layer: the count and the sorted tiles of its rows', `${countsOk}/${all.length}`);
  const moved = Object.values(layers.layers).reduce((a, l) => a + l.n, 0);
  const every = Object.values(s.meta.poiLists).reduce((a, c) => a + (c < 0 ? 1 : c), 0); // (-1 is a single place)
  ok(moved + layers.rest === every, 'the rows in the tiles plus the rest are every place');
  const fetched = new Map();
  for (const l of Object.values(layers.layers)) for (const k of l.tiles) fetched.set(k, s.rows.get(k));
  same(joinMeta(s.meta, fetched.values()), meta, 'a reader that asks only the tiles of the layers gets the meta back');
  // what the packer writes: build() carries the layers, writeWorld puts them in index.json
  const { writeWorld } = await import('./world/pack_tiles.mjs');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gde-poi-index-'));
  try {
    writeWorld(dir, { blobs: new Map(), global: G.encodeBlob({ sections: [{ type: G.SECTION.META, json: { meta: s.meta } }] }), counts: {}, pois: layers });
    const index = JSON.parse(fs.readFileSync(path.join(dir, 'index.json'), 'utf8'));
    same(index.pois, layers, 'index.json carries the POI layers');
    ok(poiLayerTiles(index, 'shops').join() === layers.layers.shops.tiles.join() && poiLayerTiles(index, 'bestaat.niet').length === 0, 'the tiles of a layer come from the index');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

// the real meta of the city
{
  const stad = JSON.parse(fs.readFileSync(new URL('../game/stad.json', import.meta.url), 'utf8'));
  const cityTiles = new Set(stad.tiles);
  const s = splitMeta(stad.meta, tileKeyOf, (k) => cityTiles.has(k));
  const moved = [...s.rows.values()].flat().length;
  const lists = Object.entries(s.meta.poiLists).filter(([, c]) => c !== 0);
  ok(moved > 500, 'the real city has its places in tile rows', `${moved} places in ${s.rows.size} tiles, ${(s.meta.poiRest || []).length} in the rest`);
  const through = [...s.rows.entries()].map(([k, rows]) => { const [i, j] = G.tileFromKey(k); return G.decodeBlob(G.encodeBlob({ i, j, sections: [{ type: G.SECTION.POIS, rows }] })).sections.find((q) => q.type === G.SECTION.POIS).rows; });
  same(joinMeta(s.meta, through), stad.meta, 'game/stad.json meta: tiles in, tiles out, the same');
  const layers = poiLayers(s);
  ok(Object.values(layers.layers).reduce((a, l) => a + l.n, 0) === moved && layers.rest === (s.meta.poiRest || []).length, 'the real city: every place counted per layer, the rest apart');
  ok(Object.values(layers.layers).every((l) => l.tiles.every((k) => cityTiles.has(k))), 'the real city: a layer only names city tiles');
  const fetched = new Map();
  for (const l of Object.values(layers.layers)) for (const k of l.tiles) fetched.set(k, s.rows.get(k));
  same(joinMeta(s.meta, fetched.values()), stad.meta, 'the real meta comes back from the tiles the index names');
  console.log(`     ${moved} places in ${s.rows.size} tiles (${lists.map(([k, c]) => k + ' ' + c).join(', ')}), ${(s.meta.poiRest || []).length} stay in the global meta; ${Object.keys(layers.layers).length} POI-layers in the index`);
}

console.log(`${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
