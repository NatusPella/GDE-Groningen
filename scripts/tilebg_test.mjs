// Achtergrondtegels van een plaatsingsvenster (perf-regressie 22-11, docs/PERF-REGRESSIE-22-11.md): ze gaan als druppel door een eigen
// wachtrij, hun kruispuntbump wordt gebundeld, en een tegel waar de speler heen komt gaat naar de gewone stroom.
//   node scripts/tilebg_test.mjs
import './node3d.mjs';
const { TileWorld } = await import('../game/js/tileworld.js');
const G = await import('../game/js/gdt.js');
const S = await import('../game/js/tilestream.js');

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info ? ' (' + info + ')' : ''}`); } };

const sq = (x, y, s) => [[x, y], [x + s, y], [x + s, y + s], [x, y + s], [x, y]];
const global = { sections: [{ type: G.SECTION.META, json: { counts: { buildings: 0 }, meta: {} } }] };
const world = TileWorld.fromTiles(global, []);
const prio = {};
world.store = { priorityOf: (k) => prio[k] ?? 0, index: { tiles: {} }, prefetch() {} };
const tile = (i, j, signals = false) => ({ i, j, sections: [
  { type: G.SECTION.BUILDINGS, rows: [{ gid: i * 100 + j, pts: sq(i * 1000 + 100, j * 1000 + 100, 20), type: 'house', h: 6 }] },
  ...(signals ? [{ type: G.SECTION.JUNCTIONS, rows: [{ k: `${i},${j}`, p: [[i * 1000 + 5, j * 1000 + 5]], c: 'signals', a: [[0, 0, 1, 1, 5, 1]] }] }] : []),
] });

// een achtergrondtegel (prioriteit 5000) staat in bgQueue, een gewone (afstand) in tileQueue
prio['0,0'] = S.BACKGROUND_PRIORITY; prio['5,0'] = 120;
world.queueTile(tile(0, 0, true), '0,0');
world.queueTile(tile(5, 0), '5,0');
ok(world.bgQueue.items.length === 1 && world.tileQueue.items.length === 1, 'achtergrondtegel in bgQueue, gewone tegel in tileQueue');
ok(world._bgTiles.has('0,0') && !world._bgTiles.has('5,0'), 'alleen de achtergrondtegel staat in _bgTiles');

// de kruispuntbump van een achtergrondtegel wacht op flushJunctions (hoogstens eens per BG_JUNCTION_FLUSH_MS)
const jv0 = world.junctionVer || 0, sv0 = world.signalVer || 0;
world.bgQueue.run(1e9);
ok((world.junctionVer || 0) === jv0 && (world.signalVer || 0) === sv0, 'de achtergrondtegel bumpt junctionVer en signalVer nog niet');
ok(world.flushJunctions(1000) === true && world.junctionVer === jv0 + 1 && world.signalVer === sv0 + 1, 'flushJunctions bumpt beide, een keer');
ok(world.flushJunctions(1001) === false, 'zonder nieuwe tegel geen tweede bump');
world.queueTile(tile(0, 1, true), '0,1'); // gewone tegel (prio 0): bumpt direct
world.tileQueue.run(1e9);
ok(world.junctionVer === jv0 + 2, 'een gewone tegel bumpt meteen');

// bundelen: twee achtergrondtegels vlak na elkaar geven een bump
prio['0,2'] = S.BACKGROUND_PRIORITY; prio['0,3'] = S.BACKGROUND_PRIORITY;
world.queueTile(tile(0, 2, true), '0,2'); world.queueTile(tile(0, 3, true), '0,3');
world.bgQueue.run(1e9);
const jv1 = world.junctionVer;
ok(world.flushJunctions(1000 + 10) === false && world.junctionVer === jv1, 'binnen het interval geen bump');
ok(world.flushJunctions(1000 + S.BG_JUNCTION_FLUSH_MS + 10) === true && world.junctionVer === jv1 + 1, 'na het interval een bump voor beide tegels samen');

// promotie: een achtergrondtegel in de buurt van de speler gaat naar de gewone wachtrij, met afstandsprioriteit
prio['3,0'] = S.BACKGROUND_PRIORITY; prio['40,0'] = S.BACKGROUND_PRIORITY;
world.queueTile(tile(3, 0), '3,0'); world.queueTile(tile(40, 0), '40,0');
const before = world.bgQueue.items.length;
const moved = world.promoteBgTiles(3500, 500);
ok(moved === 1 && world.bgQueue.items.length === before - 1, 'alleen de tegel bij de speler gaat over', `moved ${moved}`);
ok(!world._bgTiles.has('3,0') && world._bgTiles.has('40,0'), 'de overgegane tegel is geen achtergrondtegel meer');
ok(world.tileQueue.items.some((it) => it.label === 'add:3,0') && !world.bgQueue.items.some((it) => it.label === 'add:3,0'), 'zijn rijen staan in tileQueue');
const job = world._tileJobs.get('3,0');
ok(job.queue === world.tileQueue, 'volgende stukken van de tegel gaan ook naar tileQueue');
world.tileQueue.run(1e9);
ok(world.resident.has('3,0'), 'de overgegane tegel komt binnen via follow');

// geoVer: een achtergrondtegel ver van de speler ververst geen cache, een nabije achtergrondtegel of een gewone tegel wel
world.focusAt = { x: 500, y: 500 };
prio['30,0'] = S.BACKGROUND_PRIORITY; prio['2,0'] = S.BACKGROUND_PRIORITY; prio['31,0'] = 90;
world.queueTile(tile(30, 0), '30,0'); world.queueTile(tile(2, 0), '2,0'); world.queueTile(tile(31, 0), '31,0');
ok(world._farBgTile('30,0') === true && world._farBgTile('2,0') === false && world._farBgTile('31,0') === false, '_farBgTile: alleen een verre achtergrondtegel', world._farBgTile('30,0') + '/' + world._farBgTile('2,0') + '/' + world._farBgTile('31,0'));
const g0 = world.geoVer || 0;
world.bgQueue.run(1e9); // 30,0 en 2,0
ok(world.geoVer === g0 + 1, 'de verre achtergrondtegel bumpt geoVer niet, de nabije wel', String(world.geoVer - g0));
world.dropTile('30,0');
ok(world.geoVer === g0 + 1, 'de drop van de verre achtergrondtegel bumpt ook niet');
world.tileQueue.run(1e9);
ok(world.geoVer === g0 + 2, 'een verre gewone tegel bumpt wel', String(world.geoVer - g0));
world.focusAt = null;
world._bgTiles.add('31,0');
ok(world._farBgTile('31,0') === false, 'zonder focus is niets ver');

// follow geeft de achtergrondwachtrij hoogstens BG_FOLLOW_MS
let ran = 0;
const stub = { items: [{ priority: 1, seq: 0, label: 'add:9,9', fn: () => {} }], run(ms) { ran = ms; return 0; } };
const bgReal = world.bgQueue; world.bgQueue = stub;
world.follow(0, 0, {}, 4);
world.bgQueue = bgReal;
ok(ran > 0 && ran <= S.BG_FOLLOW_MS + 1e-9, `follow geeft de achtergrondwachtrij ${ran} ms (hoogstens ${S.BG_FOLLOW_MS})`);

console.log(`tilebg_test: ${n - fails}/${n} ${fails ? 'MISLUKT' : 'groen'}`);
process.exit(fails ? 1 : 0);


