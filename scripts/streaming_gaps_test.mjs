// #799: gedragstests voor de streamingpaden die in de bugronde alleen via bronchecks of indirect
// gedekt waren: cancel-herlaad (#769), LOS-budget (#785), de hysterese-regel (#792) en
// releaseRoadSource/dropRoad (#762). De nearR-index (#791) en de echte host-flood (#778) blijven
// gedocumenteerde gaten: docs/TESTGATEN-799.md zegt waarom.
//   node scripts/streaming_gaps_test.mjs
import './node3d.mjs';
import assert from 'node:assert/strict';
const { TileStore } = await import('../game/js/tilestore.js');
const { tileIndexOf, tileKey } = await import('../game/js/gdt.js');
const { makeLosBudget } = await import('../game/js/losbudget.js');
const { GameMap } = await import('../game/js/mapdata.js');
const { shadowUpgradeAllowed } = await import('../game/js/scene3d.js');

let n = 0, fails = 0;
const t = async (naam, fn) => {
  n++;
  try { await fn(); } catch (e) { fails++; console.log('FAIL', naam, '\n  ', String(e.message || e).split('\n').slice(0, 4).join('\n   ')); }
};

// ---------------------------------------------------------------- #769 cancel-herlaad
const [i0, j0] = tileIndexOf(0, 0);
const key = tileKey(i0, j0);
const index = { packs: { a: { file: 'a-1.gdp', size: 10 } }, tiles: { [key]: { i: i0, j: j0, pack: 'a', off: 0, len: 10, raw: 1 } } };

await t('#769: een afgebroken load laat geen cancelled-entry achter; een nieuwe request laadt de tegel', async () => {
  let eerste = true;
  const source = {
    calls: [],
    read(file, off, len, signal) {
      this.calls.push(file);
      if (!eerste) return Promise.resolve(new Uint8Array(10));
      eerste = false;
      // De eerste read blijft hangen tot de cancel; de store geeft zijn signaal mee.
      return new Promise((resolve, reject) => {
        signal.addEventListener('abort', () => reject(Object.assign(new Error('cancelled'), { cancelled: true })), { once: true });
      });
    },
    readAll: async () => new Uint8Array(),
  };
  const store = new TileStore({ source, index, decode: async () => ({ geladen: true }) });
  const eersteKeer = store.request(key, { token: 'venster' });
  await new Promise((r) => setTimeout(r, 5));
  store.cancel('venster');
  let fout = null;
  try { await eersteKeer; } catch (e) { fout = e; }
  assert.ok(fout && fout.cancelled === true, 'de afgebroken wachter wordt afgewezen');
  assert.ok(store.stats.cancels >= 1, 'de cancel is geteld');
  assert.ok(!store.entries.get(key) || store.entries.get(key).state !== 'cancelled', 'geen cancelled-entry in de map (#769)');
  const tweede = await store.request(key);
  assert.deepEqual(tweede, { geladen: true }, 'een nieuwe request laadt de tegel opnieuw');
  assert.equal(store.ready(key), true, 'en de tegel staat klaar');
  assert.equal(source.calls.length, 2, 'de bron is opnieuw gevraagd');
});

// ---------------------------------------------------------------- #785 LOS-budget
await t('#785: een uitgeput LOS-budget kost alleen de lijncontrole, niet de volgende aanvraag', () => {
  const budget = makeLosBudget(3, 100);
  assert.equal(budget(0), true);
  assert.equal(budget(1), true);
  assert.equal(budget(2), true);
  assert.equal(budget(3), false, 'het budget is na drie aanvragen op');
  assert.equal(budget(4), false, 'en blijft op binnen hetzelfde venster');
  assert.equal(budget(100), true, 'een nieuw venster geeft weer ruimte');
  assert.equal(budget(1000), true, 'de tijd mag ook in één keer vooruit');
});

// ---------------------------------------------------------------- #792 hysterese
await t('#792: de schaduwkaart mag alleen na een lange vraag omhoog, en altijd omlaag', () => {
  const UP = 120000;
  assert.equal(shadowUpgradeAllowed(1024, 2048, 0, 1000), false, 'zonder eerdere vraag: geen opstap');
  assert.equal(shadowUpgradeAllowed(1024, 2048, 1000, 1000 + UP - 1), false, 'vlak voor de wachttijd: nog niet');
  assert.equal(shadowUpgradeAllowed(1024, 2048, 1000, 1000 + UP), true, 'na de wachttijd: wel');
  assert.equal(shadowUpgradeAllowed(2048, 1024, 0, 1), true, 'kleiner mag altijd');
  assert.equal(shadowUpgradeAllowed(1024, 1024, 0, 1), true, 'gelijk mag altijd');
});

// ---------------------------------------------------------------- #762 releaseRoadSource/dropRoad
await t('#762: een sparse wegenlaag geeft zijn bronlijst vrij, een dichte wereld houdt hem', () => {
  const sparse = Object.create(GameMap.prototype);
  sparse._roadsLive = [{ id: 1 }, { id: 2 }];
  sparse._roadsSourceOwn = true;
  sparse.releaseRoadSource();
  assert.equal(sparse._roadsLive, null, 'sparse: de ~11 MB bronlijst is weg');
  assert.equal(sparse._roadsSourceOwn, false, 'en de vlag staat uit');

  const dense = Object.create(GameMap.prototype);
  const weg = { id: 3 };
  dense._roadsLive = [weg];
  dense._roadsSourceOwn = false;
  dense.releaseRoadSource();
  assert.ok(Array.isArray(dense._roadsLive), 'dichte wereld: de map-array blijft (home.js dropRoad)');

  dense.dropRoad(weg);
  assert.equal(dense._roadsLive.length, 0, 'dropRoad haalt de weg uit de lijst');
});

console.log(fails ? `streaming_gaps_test: ${n - fails}/${n} ok` : `streaming_gaps_test: ${n}/${n} ok`);
process.exitCode = fails ? 1 : 0;
