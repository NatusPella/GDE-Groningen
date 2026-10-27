// TileStore en een onvolledige wereld (#496): een pack dat de server niet heeft
// (404) gaf per tegel een unhandled rejection, en prefetch vroeg dezelfde tegel
// elk beeld opnieuw. Nu: één waarschuwing, daarna overslaan. Een gewone
// netwerkfout mag nog een keer geprobeerd worden.
import assert from 'node:assert/strict';
import { TileStore } from '../game/js/tilestore.js';
import { tileIndexOf, tileKey } from '../game/js/gdt.js';

let n = 0;
const t = async (name, f) => {
  const out = [];
  const orig = console.warn;
  console.warn = (...a) => out.push(a.join(' '));
  try { await f(out); } finally { console.warn = orig; }
  n++;
  console.log(`ok ${name}`);
};
const settle = () => new Promise((r) => setTimeout(r, 25));

// the tile at the origin, and the pack it lives in
const [i, j] = tileIndexOf(0, 0);
const key = tileKey(i, j);
const index = {
  packs: { a: { file: 'a-1.gdp', size: 10 }, b: { file: 'b-1.gdp', size: 10 } },
  tiles: {
    [key]: { i, j, pack: 'a', off: 0, len: 10, raw: 1 },
    [tileKey(i + 1, j)]: { i: i + 1, j, pack: 'b', off: 0, len: 10, raw: 1 },
  },
};

const bron = (gedrag) => {
  const calls = [];
  return {
    calls,
    read: async (file, off, len) => { calls.push(file); return gedrag(file, off, len); },
    readAll: async () => new Uint8Array(),
  };
};
const fout = (status) => { const e = new Error(`tile read: ${status}`); if (status) e.status = status; return e; };

await t('een ontbrekend pack: één waarschuwing, geen unhandled rejection', async (out) => {
  const source = bron((file) => { if (file === 'a-1.gdp') throw fout(404); return new Uint8Array(10); });
  const store = new TileStore({ source, index, decode: async () => ({}) });
  store.prefetch(0, 0, { radius: 1500 });
  await settle();
  assert.deepEqual(source.calls, ['a-1.gdp', 'b-1.gdp'], 'beide tegels één keer gevraagd');
  assert.equal(store.stats.errors, 1);
  assert.equal(out.length, 1, out.join(' | '));
  assert.match(out[0], /tegelpakket ontbreekt in deze build: a-1\.gdp/);
  assert.equal(store.brokenPacks.has('a'), true);

  // de volgende wensenlijst vraagt het niet nog eens, ook niet elke frame
  store.prefetch(0, 0, { radius: 1500 });
  await settle();
  assert.deepEqual(source.calls, ['a-1.gdp', 'b-1.gdp'], 'geen nieuwe aanvraag');
  assert.equal(out.length, 1, 'geen tweede waarschuwing');
});

await t('request() op een tegel uit een kapot pack geeft null in plaats van een fout', async (out) => {
  const source = bron(() => { throw fout(404); });
  const store = new TileStore({ source, index, decode: async () => ({}) });
  assert.equal(await store.request(key).catch((e) => e.message), 'tile read: 404');
  await settle();
  assert.equal(await store.request(key), null);
  assert.equal(source.calls.length, 1);
  assert.equal(out.length, 1, out.join(' | '));
});

await t('een andere fout mag opnieuw, maar waarschuwt één keer', async (out) => {
  const source = bron(() => { throw fout(0); });
  const store = new TileStore({ source, index: { packs: index.packs, tiles: { [key]: index.tiles[key] } }, decode: async () => ({}) });
  store.prefetch(0, 0, { radius: 1500 });
  await settle();
  store.prefetch(0, 0, { radius: 1500 });
  await settle();
  assert.equal(store.brokenPacks.size, 0, 'een netwerkfout is geen kapotte build');
  assert.equal(source.calls.length, 2, 'de tegel is opnieuw gevraagd');
  assert.equal(out.length, 1, out.join(' | '));
  assert.match(out[0], /tegel laden mislukt/);
});

await t('een complete wereld laadt gewoon', async (out) => {
  const source = bron(() => new Uint8Array(10));
  const store = new TileStore({ source, index, decode: async () => ({ geladen: true }) });
  store.prefetch(0, 0, { radius: 1500 });
  await settle();
  assert.equal(store.stats.errors, 0);
  assert.equal(store.ready(key), true);
  assert.deepEqual(store.tile(key), { geladen: true });
  assert.equal(out.length, 0, out.join(' | '));
});

console.log(`tilestore_test: ${n}/${n} ok`);
