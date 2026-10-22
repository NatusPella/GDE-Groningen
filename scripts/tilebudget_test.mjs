// Het geheugenbudget van de TileStore (#379): een gedecodeerde tegel is ~26 keer zijn ruwe grootte op de JS-heap, dus het standaardbudget
// (ruwe bytes) moet klein genoeg zijn dat een lange rit tegels loslaat. Nagebootste tegels van 1 MB ruw op een rij van 120 km (TILE_M 1000 m).
//   node scripts/tilebudget_test.mjs
const { TileStore, MemorySource } = await import('../game/js/tilestore.js');
const { tileKey } = await import('../game/js/gdt.js');

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info ? ' (' + info + ')' : ''}`); } };

const TILES = 120, RAW = 1e6;
const index = { packs: { p: { file: 'p.gdp' } }, tiles: {}, pins: {} };
for (let i = 0; i < TILES; i++) index.tiles[tileKey(i, 0)] = { i, j: 0, pack: 'p', off: i, len: 1, raw: RAW };
const files = { 'p.gdp': new Uint8Array(TILES + 1) };
const decode = async (b, meta) => ({ i: meta.i, j: meta.j, sections: [] });

let clock = 0;
const drive = async (opts) => {
  const store = new TileStore({ source: new MemorySource(files), index, decode, now: () => clock, ...opts });
  let late = 0, peak = 0;
  for (let step = 0; step < TILES * 10; step++) {
    const x = step * 100 + 500; // 100 m per stap, 10 stappen per tegel
    clock += 1000; // 1 s per stap: 100 m/s, ruim boven de snelste voertuigen
    store.prefetch(x, 500, { vx: 100, vy: 0 });
    for (let k = 0; k < 8; k++) await Promise.resolve();
    await new Promise((r) => setImmediate(r));
    for (const k of store.keysAround(x, 500, 250)) if (!store.ready(k)) late++;
    peak = Math.max(peak, store.residentBytes);
  }
  return { store, late, peak };
};

// 1. het standaardbudget (nu 40e6 ruw ~ 1 GB heap als het volloopt) laat bij 120 MB aan tegels er honderden los
const d = await drive({});
ok(d.store.budgetBytes <= 50e6, 'het standaardbudget rekent met de heap, niet met 150 MB ruw', String(d.store.budgetBytes));
ok(d.store.stats.evictions > 0, 'een rit van 120 tegels laat tegels los', String(d.store.stats.evictions));
ok(d.peak <= d.store.budgetBytes + 6 * RAW, 'de top blijft bij het budget (plus de tegels om de auto)', `${d.peak / 1e6} MB`);
ok(d.late === 0, 'geen enkele tegel binnen 250 m kwam te laat', String(d.late));

// 2. het oude budget liet pas bij de helft van 150 MB ruw los
const o = await drive({ budgetBytes: 150e6 });
ok(o.peak >= 70e6, 'met 150e6 ruw hield de store tot 75 MB ruw vast (het oude gedrag, ~2 GB heap)', `${o.peak / 1e6} MB`);
ok(d.peak < o.peak * 0.5, 'het nieuwe budget houdt de top onder de helft van de oude', `${d.peak / 1e6} tegen ${o.peak / 1e6} MB`);

console.log(fails ? `${fails} van ${n} mislukt` : `ok: ${n} controles`);
process.exit(fails ? 1 : 0);
