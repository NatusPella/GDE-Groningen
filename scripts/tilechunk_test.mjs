// #650: één gestroomde tegel is niet langer één onbegrensd FrameQueue-item.
// node scripts/tilechunk_test.mjs  (puur, virtuele klok, geen echte tegeldata)
//
// De tegelrijen gaan nu in stukken van hooguit ROW_CHUNK door de wachtrij; het
// budget van de wachtrij knipt alleen tussen items, dus de chunkgrootte is wat
// het frame begrenst. Deze test meet dat op een synthetische tegel van 4.000
// rijen: vóór #650 was dat 1 item van 4.000 rijen, nu N items van ≤ ROW_CHUNK.
import './node3d.mjs';
const G = await import('../game/js/gdt.js');
const { TileWorld, ROW_CHUNK } = await import('../game/js/tileworld.js');

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };

const tile = (i, j, sections) => ({ i, j, sections });
const sec = (type, rows) => ({ type, rows });
const global = { sections: [{ type: G.SECTION.META, json: { counts: { buildings: 0 }, meta: {} } }] };
const road = (gid, i) => ({ gid, pts: [[i * 10, 500], [i * 10 + 5, 500]], width: 6, cat: 'minor', type: 'residential' });

// drain de wachtrij met een virtuele klok: run(0) voert precies één item uit
const drain = (tw, maxItems = 10000) => {
  let items = 0, maxRows = 0;
  while (tw.tileQueue.size && items < maxItems) {
    const before = tw._res.roads.size;
    tw.tileQueue.run(0, () => 0);
    items++;
    maxRows = Math.max(maxRows, tw._res.roads.size - before);
  }
  return { items, maxRows };
};

// 1. een grote gestroomde tegel: 4.000 rijen
{
  const N = 4000;
  const rows = Array.from({ length: N }, (_, i) => road(i, i));
  const tw = TileWorld.fromTiles(global, []);
  let added = 0;
  tw.onTiles((ev) => { if (ev === 'add') added++; });
  tw.queueTile(tile(0, 0, [sec(G.SECTION.ROADS, rows)]), 'big');
  const r = drain(tw);
  ok(tw._res.roads.size === N, 'alle 4.000 rijen komen erin', tw._res.roads.size);
  ok(added === 1, 'de add-listener vuurt één keer, aan het eind', added);
  ok(r.items > 1, 'de tegel gaat in meer dan één wachtrij-item', r.items);
  ok(r.items >= Math.ceil(N / ROW_CHUNK), 'minstens één item per chunk', r.items);
  ok(r.maxRows <= ROW_CHUNK, 'geen enkel item doet meer dan ROW_CHUNK rijen', r.maxRows);
  console.log(`#650 meting: ${N} rijen -> ${r.items} wachtrij-items, max ${r.maxRows} rijen/item; oud: 1 item, ${N} rijen`);
}
// 2. een kleine tegel blijft één item (geen onnodige overhead)
{
  const N = 25;
  const rows = Array.from({ length: N }, (_, i) => road(i, i));
  const tw = TileWorld.fromTiles(global, []);
  tw.queueTile(tile(0, 0, [sec(G.SECTION.ROADS, rows)]), 'small');
  const r = drain(tw);
  ok(tw._res.roads.size === N && r.maxRows <= ROW_CHUNK && r.items <= 3, 'kleine tegel: geen extra chunks', `${r.items} items, max ${r.maxRows} rijen`);
}
// 3. valt de tegel halverwege weg, dan stopt het chunkwerk en komt er niets meer bij
{
  const N = 4000;
  const rows = Array.from({ length: N }, (_, i) => road(i, i));
  const tw = TileWorld.fromTiles(global, []);
  const tk = tw.queueTile(tile(0, 0, [sec(G.SECTION.ROADS, rows)]), 'cancel');
  tw.tileQueue.run(0, () => 0); // één chunk erin
  const done = tw._res.roads.size;
  ok(done > 0 && done <= ROW_CHUNK, 'eerste chunk staat erin', done);
  tw.dropTile(tk); // de tegel valt weg
  drain(tw);
  ok(tw._res.roads.size === 0, 'de weggevallen tegel voegt geen rijen meer toe', tw._res.roads.size);
  ok(tw._tileJobs.size === 0, 'geen achtergebleven chunkwerk');
}
// 4. de synchrone addTile (pinned/overlay, tests) doet alles in één keer
{
  const N = 1000;
  const rows = Array.from({ length: N }, (_, i) => road(i, i));
  const tw = TileWorld.fromTiles(global, []);
  const ret = tw.addTile(tile(0, 0, [sec(G.SECTION.ROADS, rows)]), 'sync');
  ok(ret === true && tw._res.roads.size === N, 'addTile synchroon: alle rijen erin', tw._res.roads.size);
}

console.log(`${n - fails}/${n} tilechunk`);
process.exit(fails ? 1 : 0);
