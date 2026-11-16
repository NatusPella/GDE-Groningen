// Het eerbetoon bij Visvliet staat op een vrije berm (#916): op de echte
// wereld bij de brug naar Friesland mogen bankje, bord, huis en tuinbankje niet
// in het water, in een gebouw of op de rijbaan staan. Zonder game/world: SKIP.
//   node scripts/beppe_site_test.mjs
import fs from 'node:fs';
import '../scripts/node3d.mjs';

const root = new URL('../game/world/', import.meta.url);
if (!fs.existsSync(new URL('index-provincie.json', root))) { console.log('SKIP beppe_site_test: geen game/world met de provincie'); process.exit(0); }

const S = await import('../game/js/tilestore.js');
const TW = await import('../game/js/tileworld.js');
const PW = await import('../game/js/provinceworld.js');
const R = await import('../game/js/beppe_rules.js');
const REG = await import('../game/js/regions.js');
const WL = await import('../game/js/waterlevels.js');
const G = await import('../game/js/gdt.js');

const files = new Proxy({}, { get: (o, f) => (typeof f === 'string' ? (o[f] || (o[f] = new Uint8Array(fs.readFileSync(new URL(f, root))))) : undefined) });
const T = await TW.loadTileWorld('world/', { source: new S.MemorySource(files), pool: false, extra: ['index-provincie.json'] });
const map = T.world;
PW.initProvince({ index: T.index, world: map });
// de brug van de N355 over de Lauwers bij Visvliet (het noordelijke punt van de brug)
const X = -20762, Y = -5195;
const keys = new Set();
for (let dx = -500; dx <= 500; dx += 250) for (let dy = -500; dy <= 500; dy += 250) {
  const [i, j] = G.tileIndexOf(X + dx, Y + dy);
  const k = G.tileKey(i, j);
  if (T.index.tiles[k]) keys.add(k);
}
await Promise.all([...keys].map((k) => T.store.request(k, { priority: -1 })));
map.tileQueue.run(1e9);

let n = 0, bad = 0;
const ok = (c, m) => { n++; if (!c) { bad++; console.log('FAIL', m); } };
const free = (x, y) => !WL.waterAt(map, x, y) && !(map.buildingsNear && map.buildingsNear(x, y, 7).length) && !(map.onCarriageway && map.onCarriageway(x, y, 1.2));
const site = R.chooseTributeSite({
  border: { x: X, y: Y }, ux: -1, uy: 0, hw: 5,
  dry: (x, y) => !WL.waterAt(map, x, y),
  free,
  regionOf: (x, y) => REG.regionAt(x, y).id,
});
ok(!!site, 'de plek wordt gevonden');
ok(!!site && site.clear !== false, 'de plek past op een vrije berm');
for (const key of ['bench', 'sign', 'house', 'gardenBench']) {
  const p = site && site[key];
  ok(!!p && !WL.waterAt(map, p.x, p.y), `${key}: niet in het water`);
  ok(!!p && !(map.buildingsNear && map.buildingsNear(p.x, p.y, 5).length), `${key}: niet in een gebouw`);
  ok(!!p && !(map.onCarriageway && map.onCarriageway(p.x, p.y, 0.5)), `${key}: niet op de rijbaan`);
}
ok(!!site && REG.regionAt(site.bench.x, site.bench.y).id === 'groningen' && REG.regionAt(site.house.x, site.house.y).id === 'friesland', 'bankje in Grunn, huis in Friesland');
// #916/QA: de kaart-marker moet er ook zijn, en de plek wordt ook op het startscherm
// opgezocht (daar staat world.time stil op 0, dus de herhaalpogingen hebben een echte klok nodig)
const marker = R.markerOf(site);
ok(!!marker && marker.kind === 'beppe' && Number.isFinite(marker.x) && Number.isFinite(marker.y), 'de kaart-marker staat op de tuinbank');
const garden = fs.readFileSync(new URL('../game/js/beppe_garden.js', import.meta.url), 'utf8');
ok(garden.includes('function siteClock()') && garden.includes('performance.now() / 1000'), 'de plek wordt ook zonder lopende wereldklok opgezocht');

// De echte weg die het spel neemt: beppeMapSpot() moet de plek zelf uit de wereld
// halen (niet uit de vaste brug hierboven), met de echte grensdata en het wegennet.
{
  const zlib = await import('node:zlib');
  const RG = await import('../game/js/roadgraph.js');
  const BG = await import('../game/js/beppe_garden.js');
  const WV = await import('../game/js/wegvlak.js');
  const layer = T.index.layers.provincie.global;
  REG.setRegionData(layer, null);
  RG.setRoadNet(RG.decodeRoadNet(JSON.parse(zlib.gunzipSync(Buffer.from(files[layer.roadsFile])).toString('utf8'))));
  BG.initBeppeGarden({ map, time: 1, addMessage() {}, player: { x: X, y: Y } });
  const live = BG.beppeMapSpot();
  ok(!!live && live.kind === 'beppe' && Math.abs(live.x - X) < 400 && Math.abs(live.y - Y) < 400, 'beppeMapSpot geeft een marker bij de westgrens', JSON.stringify(live && { x: Math.round(live.x), y: Math.round(live.y) }));
  const lp = Object.fromEntries(BG.beppeSpots().map((s) => [s.id, s]));
  ok(!!lp.bankje && REG.regionAt(lp.bankje.x, lp.bankje.y).id === 'groningen', 'de live-plek: bankje in Grunn');
  ok(!!lp.huis && REG.regionAt(lp.huis.x, lp.huis.y).id === 'friesland', 'de live-plek: huis in Friesland');
  // #review N355: de plek lag met bankje en Kollum-bord op de verhoogde weg (en
  // met het tuinbankje op het fietspad ernaast). Alle vier de plekken horen op
  // een droge berm te staan, niet op asfalt, helling, fietspad of in het water.
  const nearPath = (x, y) => map.roadsNear(x, y, 18).some((r) => {
    if (!r || !r.pts || r.pts.length < 2) return false;
    const q = R.nearestOnPath(r.pts, x, y);
    return !!q && q.d < Math.max(1, (r.width || 3) / 2) + 0.6;
  });
  for (const [id, p] of Object.entries(lp)) {
    ok(!!p && !WL.waterAt(map, p.x, p.y), `${id}: niet in het water`);
    ok(!!p && !(map.buildingsNear && map.buildingsNear(p.x, p.y, 5).length), `${id}: niet in een gebouw`);
    ok(!!p && !WV.onRoadway(map, p.x, p.y, 0.2), `${id}: niet op de rijbaan of de helling`);
    ok(!!p && !nearPath(p.x, p.y), `${id}: niet op een weg of fietspad`);
  }
  ok(!!lp.tuinbankje && !!lp.huis && Math.hypot(lp.tuinbankje.x - lp.huis.x, lp.tuinbankje.y - lp.huis.y) < 10, 'het tuinbankje staat in de voortuin van het huis');
  // de marker staat op het tuinbankje en dus ook op die veilige plek
  ok(!!live && !!lp.tuinbankje && live.x === lp.tuinbankje.x && live.y === lp.tuinbankje.y, 'de kaart-marker staat op het tuinbankje');
}
console.log(`beppe_site_test: ${n - bad}/${n} ok`);
process.exit(bad ? 1 : 0);
