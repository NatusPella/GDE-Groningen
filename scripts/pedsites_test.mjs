// De oversteekplekken van de voetgangers (pedroutes.js): na een tegelwissel alleen de gewijzigde tegels opnieuw (patchSites, 24-11) geeft
// precies dezelfde sites als alles opnieuw (buildSites), op een willekeurig wegennet over meerdere tegels.
//   node scripts/pedsites_test.mjs
import './node3d.mjs';
import assert from 'node:assert/strict';
const { pedSitesForTest: T } = await import('../game/js/pedroutes.js');
const { SpatialGrid } = await import('../game/js/spatialgrid.js');
const { tileOrigin, tileIndexOf, TILE_M } = await import('../game/js/gdt.js');

let seed = 11;
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const CATS = ['major', 'normal', 'minor', 'foot', 'cycle'];
const [ox, oy] = tileOrigin(0, 0);
// knopen op een rooster, zodat wegen elkaar echt in punten raken (ook op de tegelranden)
const P = (gx, gy) => [ox + gx * 125, oy + gy * 125];
function road(gx, gy, dir, len) {
  const pts = [];
  for (let k = 0; k <= len; k++) pts.push(dir ? P(gx + k, gy) : P(gx, gy + k));
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  return { pts, cat: CATS[Math.floor(rnd() * CATS.length)], bounds: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] };
}
const tileOf = (r) => tileIndexOf(r.pts[0][0], r.pts[0][1]).join(',');
const all = [];
for (let n = 0; n < 160; n++) all.push(road(Math.floor(rnd() * 22) - 1, Math.floor(rnd() * 22) - 1, rnd() < 0.5, 1 + Math.floor(rnd() * 5)));
let n = 0;
function mapWith(roads, ver, log) {
  const roadGrid = new SpatialGrid(64);
  for (const r of roads) roadGrid.insert(r, r.bounds);
  return { roadGrid, orderedRoads: () => roads, geoVer: ver, _roadVer: ver, geoLog: log };
}
// begin: alle tegels behalve (1,1) en (0,2); dan komen die erbij en gaat (2,0) weg
const missing = new Set(['1,1', '0,2']);
let roads = all.filter((r) => !missing.has(tileOf(r)));
const log = [];
let map = mapWith(roads, 1, log);
T.build(map);
const steps = [['1,1', true], ['0,2', true], ['2,0', false]];
let ver = 1;
for (const [tk, add] of steps) {
  ver++;
  log.push(ver, tk);
  roads = add ? [...roads, ...all.filter((r) => tileOf(r) === tk)] : roads.filter((r) => tileOf(r) !== tk);
  const next = mapWith(roads, ver, log);
  // dezelfde kaart (de site-index hoort bij een map-object): alleen de inhoud wisselt
  Object.assign(map, next);
  assert.ok(T.patch(map), `${tk}: gericht bijgewerkt`); n++;
  const BOX = [ox - 1000, oy - 1000, ox + 4000, oy + 4000];
  const patched = T.list(BOX);
  T.build(map);
  assert.deepEqual(patched, T.list(BOX), `${tk} ${add ? 'erbij' : 'weg'}: gericht bijwerken geeft dezelfde sites als alles opnieuw`); n++;
  assert.ok(patched.length > 5, 'er zijn sites'); n++;
}
// de log gaat niet ver genoeg terug: geen gerichte update
map.geoVer = ver + 5; map._roadVer = ver + 5; map.geoLog = [ver + 5, '9,9'];
T.build({ ...map, geoVer: 1 }); // een bouw op een oudere stand van een ander object
assert.equal(T.patch(map), false, 'een andere kaart of een te korte log: alles opnieuw'); n++;
console.log(`pedsites_test: ${n} controles groen (TILE_M ${TILE_M})`);
