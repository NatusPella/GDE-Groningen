// Een tegel die wegvalt en terugkomt voordat de wachtrij zijn oude werk heeft afgehandeld (heen en weer snelreizen,
// een film die de achtergrondrij vasthoudt): de wereld moet daarna gelijk zijn aan wat de store heeft.
//  1. de uitgestelde drop van de vorige lading mag de rijen van de nieuwe lading niet afbreken (gat in de wereld);
//  2. een afgebroken stuk van de vorige lading mag de boekhouding van de nieuwe niet wissen (spooktegel na een drop).
//   node scripts/tile_reload_race_test.mjs
import './node3d.mjs';
const G = await import('../game/js/gdt.js');
const { TileWorld } = await import('../game/js/tileworld.js');

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info ? ' (' + info + ')' : ''}`); } };

const sq = (x, y, s) => [[x, y], [x + s, y], [x + s, y + s], [x, y + s], [x, y]];
const global = { sections: [{ type: G.SECTION.META, json: { counts: { buildings: 0, green: 0, furniture: 0 }, meta: {} } }] };
const KEY = G.tileKey(5, 0);
const [ox, oy] = G.tileOrigin(5, 0);
const tile = () => ({ i: 5, j: 0, sections: [{ type: G.SECTION.BUILDINGS, rows: [{ gid: 51, pts: sq(ox + 10, oy + 10, 20), h: 8 }, { gid: 52, pts: sq(ox + 100, oy + 10, 20), h: 8 }] }] });

// a store that only tells the world what came in and what left (tilestore.js listeners)
const mk = () => {
  const ls = { tile: [], drop: [] };
  const store = {
    index: { tiles: { [KEY]: { i: 5, j: 0 } } },
    on: (ev, fn) => ls[ev].push(fn),
    priorityOf: () => 100,
    arrive: () => { for (const f of ls.tile) f(tile(), KEY); },
    leave: () => { for (const f of ls.drop) f(KEY); },
  };
  const tw = TileWorld.fromTiles(global, []);
  tw.resident = new Set(['pin']);
  tw.attachStore(store);
  return { tw, store };
};
const drain = (tw) => { let guard = 0; while ((tw.tileQueue.items.length || tw.bgQueue.items.length) && guard++ < 1000) { tw.tileQueue.run(1e9); tw.bgQueue.run(1e9); } };
const one = (tw) => tw.tileQueue.run(0, () => 0); // exactly one item (the budget of a busy frame)

// 1. in the grids, dropped by the store, back in the store before the queued drop ran
{
  const { tw, store } = mk();
  store.arrive();
  drain(tw);
  ok(tw.resident.has('5,0') && tw._res.buildings.size === 2, 'de tegel staat in de rasters');
  store.leave();   // the drop waits in the queue
  store.arrive();  // the reload is there before the drop ran
  drain(tw);
  ok(tw.resident.has('5,0'), 'na drop en herlading is de tegel weer resident', [...tw.resident].join(' '));
  ok(tw._res.buildings.size === 2, 'en zijn gebouwen staan in de wereld', String(tw._res.buildings.size));
  ok(tw.tileRowsDone(5, 0), 'en de rijen zijn af');
}

// 2. first load still queued, dropped, reloaded, dropped again: nothing may stay behind
{
  const { tw, store } = mk();
  store.arrive();  // job 1 (its first step waits)
  store.leave();   // job 1 cancelled, drop queued
  store.arrive();  // job 2
  one(tw);         // the drop (nothing resident yet)
  one(tw);         // the cancelled step of job 1
  ok(tw.tilesPending([KEY]), 'de nieuwe lading staat nog als bezig te boek na het afgebroken stuk van de oude');
  store.leave();   // the store drops the tile for good
  drain(tw);
  ok(!tw.resident.has('5,0'), 'een tegel die de store losliet blijft niet als spooktegel resident', [...tw.resident].join(' '));
  ok(tw._res.buildings.size === 0, 'en laat geen rijen achter', String(tw._res.buildings.size));
}

// 3. the plain order still works: in, out, nothing left
{
  const { tw, store } = mk();
  store.arrive();
  drain(tw);
  store.leave();
  drain(tw);
  ok(!tw.resident.has('5,0') && tw._res.buildings.size === 0, 'gewoon in en uit: de wereld is leeg');
  ok(tw.dropTile('5,0') === false, 'een losse dropTile op een tegel die er niet is doet niets');
}

console.log(fails ? `${fails} van ${n} mislukt` : `ok: ${n} controles`);
process.exit(fails ? 1 : 0);
