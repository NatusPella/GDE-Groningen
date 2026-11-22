// De steiger van de flat in Paddepoel (boot-flat-22-11): het water achter de toren is een doodlopende vijver (geen vaarnetrand
// binnen 690 m, geen route eruit, 0,2 m oeverruimte op de oude plek). "Jouw steiger" ligt daarom op open water van de vaart ten
// noordwesten van Paddepoel: elke 2 m van de ligplaatslijn is water met >= MIN_CLEAR m oeverruimte, en het vaarnet kent een
// route van daar naar de Binnenstad en het Lauwersmeer. De marker van de steiger komt alleen uit de lijn (geen kaartvraag
// per frame), dus kaart en minikaart wisselen niet tussen frames; host en gast rekenen hetzelfde.
// node scripts/steiger_flat_test.mjs   (het wereldstuk vraagt game/world met de provinciewereld; zonder die SKIP)
import './node3d.mjs';
import fs from 'node:fs';

// (home.js laadt three van een URL en past niet in node: de lijn lezen we uit de bron)
const src = fs.readFileSync(new URL('../game/js/home.js', import.meta.url), 'utf8');
const HOME_MOORING = JSON.parse((src.match(/export const HOME_MOORING = (\[\[[^;]*\]\]);/) || [])[1] || 'null');

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };
const MIN_CLEAR = 5;

// pure: de lijn, en de marker leest geen kaart
ok(Array.isArray(HOME_MOORING) && HOME_MOORING.length === 2 && HOME_MOORING.every((p) => p.length === 2 && p.every(Number.isFinite)), 'de ligplaatslijn is twee eindpunten');
const L = Math.hypot(HOME_MOORING[1][0] - HOME_MOORING[0][0], HOME_MOORING[1][1] - HOME_MOORING[0][1]);
ok(L >= 60, 'de lijn is lang genoeg voor een paar boten', L);
const body = (src.match(/function mooringPoint\([^)]*\) \{([\s\S]*?)\n\}/) || [])[1] || '';
ok(body && !/isInWater|surfaceAt|waterAt|map/.test(body), 'mooringPoint leest geen kaart (stabiel over frames)');
ok(!/bankSide/.test(src), 'geen kaartafhankelijke oeverzijde meer voor de boten');

const root = new URL('../game/world/', import.meta.url);
if (!fs.existsSync(new URL('index-provincie.json', root))) { console.log(`${fails ? 'FAIL' : 'OK'} steiger_flat_test: ${n - fails}/${n} (wereldstuk SKIP, geen game/world met de provinciewereld)`); process.exit(fails ? 1 : 0); }

const { setCountryBounds } = await import('../game/js/countryfield.js');
const { waterClearance } = await import('../game/js/waterindex.js');
const { setRegionData } = await import('../game/js/regions.js');
const { patchRows, createVaarNet, planVaarRoute, nearestOnNet } = await import('../game/js/vaarnet.js');
const { isInWater } = await import('../game/js/util.js');
const S = await import('../game/js/tilestore.js');
const TW = await import('../game/js/tileworld.js');
const G = await import('../game/js/gdt.js');
globalThis.requestAnimationFrame = (f) => setImmediate(f);
const files = new Proxy({}, { get: (o, f) => (typeof f === 'string' ? (o[f] || (o[f] = new Uint8Array(fs.readFileSync(new URL(f, root))))) : undefined) });
const T = await TW.loadTileWorld('world/', { source: new S.MemorySource(files), pool: false, extra: ['index-provincie.json'] });
const map = T.world;
setCountryBounds(map.meta.bounds);
setRegionData(JSON.parse(fs.readFileSync(new URL('index-provincie.json', root), 'utf8')).global);
map.addWaterPatches(patchRows(JSON.parse(fs.readFileSync(new URL('../game/vaarnet_fixes.json', import.meta.url), 'utf8'))).filter((r) => !r.strip));
const net = createVaarNet(JSON.parse(fs.readFileSync(new URL('../game/vaarnet.json', import.meta.url), 'utf8')));
const loaded = new Set();
async function loadAround(x, y, r = 300) {
  const keys = new Set();
  for (const dx of [-r, 0, r]) for (const dy of [-r, 0, r]) { const [i, j] = G.tileIndexOf(x + dx, y + dy), k = G.tileKey(i, j); if (!loaded.has(k) && T.index.tiles[k]) keys.add(k); }
  for (const k of keys) loaded.add(k);
  if (keys.size) { await Promise.all([...keys].map((k) => T.store.request(k, { priority: -1 }))); map.tileQueue.run(1e9); }
}
const [a, b] = HOME_MOORING, mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
await loadAround(mid[0], mid[1], 400);

let worst = Infinity, dry = 0;
for (let t = 0; t <= L; t += 2) {
  const x = a[0] + (b[0] - a[0]) * t / L, y = a[1] + (b[1] - a[1]) * t / L;
  if (!isInWater(map, x, y)) { dry++; continue; }
  worst = Math.min(worst, waterClearance(map, x, y, 12));
}
ok(dry === 0, 'de hele ligplaatslijn is water', dry);
ok(worst >= MIN_CLEAR, `overal minstens ${MIN_CLEAR} m van de kant`, worst.toFixed(1));

const near = nearestOnNet(net, mid[0], mid[1], 200);
ok(!!near, 'de lijn ligt aan een vaarnetrand (binnen 200 m)', near ? near.d.toFixed(0) : '');
for (const hub of ['Binnenstad Groningen', 'Lauwersmeer']) {
  const h = net.nodes[net.hubs[hub]];
  for (const from of [a, mid, b]) ok(!!planVaarRoute(net, from, [h.x, h.y], 'sloep'), `route van de steiger naar ${hub}`, from.map(Math.round).join(','));
}
// de oude plek achter de toren bleef een doodlopende vijver: daar komt nooit meer een boot te liggen
ok(!planVaarRoute(net, [-1236.7, -1073.1], [net.nodes[net.hubs['Binnenstad Groningen']].x, net.nodes[net.hubs['Binnenstad Groningen']].y], 'sloep'), 'de oude plek achter de toren heeft geen route (vandaar de verhuizing)');

console.log(`${fails ? 'FAIL' : 'OK'} steiger_flat_test: ${n - fails}/${n}`);
process.exit(fails ? 1 : 0);
