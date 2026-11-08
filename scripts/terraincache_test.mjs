// The baked terrain ground: the cache format of game/js/terraincache.js (round
// trip, damaged blocks, the water-row fingerprint) and the wiring in the game and
// the build. Pure and fast: no three, no world, no stage needed. The real world is
// compared in the heavy phase with `node scripts/world/bake_terrain.mjs --check`
// (fresh bake == stored cache == what the reader returns).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const C = await import('../game/js/terraincache.js');

let n = 0, fails = 0;
const ok = (cond, name, info = '') => { n++; if (!cond) { fails++; console.log(`FAIL ${name}${info ? ' (' + info + ')' : ''}`); } else console.log(`ok ${name}`); };
const throws = (f, re, name) => {
  try { f(); ok(false, name, 'geen fout'); } catch (e) { ok(re.test(String(e && e.message)), name, e && e.message); }
};
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

// A small terrain in exactly the shape terrainArrays() returns: a regular base
// grid plus two extra (water-edge) points and two tiles whose index also has a
// negative delta and a large id.
function smallTerrain() {
  const grid = { minX: 100, minY: 200, totalW: 40, totalD: 30, segsX: 4, segsZ: 3, nx: 5, nz: 4, base: 20 };
  const verts = 22; // 20 base points + 2 extra
  const positions = new Float32Array(verts * 3);
  for (let j = 0; j < grid.nz; j++) {
    for (let i = 0; i < grid.nx; i++) {
      const at = (j * grid.nx + i) * 3;
      positions[at] = grid.minX + (grid.totalW * i) / grid.segsX;
      positions[at + 1] = 0;
      positions[at + 2] = grid.minY + (grid.totalD * j) / grid.segsZ;
    }
  }
  positions[20 * 3] = 123.5; positions[20 * 3 + 2] = 234.25;
  positions[21 * 3] = 140.75; positions[21 * 3 + 2] = 250.5;
  const normals = new Float32Array(verts * 3);
  for (let i = 1; i < normals.length; i += 3) normals[i] = 1;
  const tiles = [
    { index: new Uint32Array([0, 5, 6, 6, 5, 10]), box: [100, 200, 110, 210] },
    { index: new Uint32Array([20, 21, 0, 19, 14, 15, 3, 2, 1]), box: [100, 200, 120, 220] },
  ];
  return { positions, normals, tiles, y: -0.05, droppedTriangles: 7, maxTriangles: 9, grid };
}
const bounds = [-20, -10, 30, 40];
const sig = 0xdeadbeef;

// --- round trip
const T = smallTerrain();
const raw = C.encodeTerrain(T, { bounds, rowsSig: sig });
ok(raw instanceof Uint8Array && raw.byteLength > 112, 'encode levert een blok met kop', `${raw.byteLength} bytes`);
const back = C.decodeTerrain(raw);
ok(back.positions.length === T.positions.length && back.positions.every((v, i) => v === T.positions[i]), 'posities komen er hetzelfde uit');
ok(back.normals.every((v, i) => v === T.normals[i]), 'normalen worden opnieuw gemaakt (0,1,0)');
ok(back.tiles.length === T.tiles.length, 'aantal tegels');
ok(back.tiles.every((t, i) => t.index.length === T.tiles[i].index.length && t.index.every((v, k) => v === T.tiles[i].index[k])), 'indexen komen er hetzelfde uit (incl. negatieve delta en groot id)');
ok(back.tiles.every((t, i) => t.box.length === 4 && t.box.every((v, k) => v === Math.fround(T.tiles[i].box[k]))), 'dozen komen er hetzelfde uit');
ok(back.y === T.y && back.droppedTriangles === 7 && back.maxTriangles === 9, 'y en telgetallen');
ok(back.bounds.length === 4 && back.bounds.every((v, i) => v === bounds[i]), 'kaartgrenzen in het blok');
ok(back.rowsSig === sig, 'watervingerafdruk in het blok');
ok(back.grid.segsX === 4 && back.grid.segsZ === 3 && back.grid.nx === 5 && back.grid.nz === 4, 'gridgegevens in het blok');

// --- a valid block for the stage check
ok(C.checkTerrainCacheBytes(raw) === null, 'de stagecontrole keurt een geldig blok goed');

// --- damaged blocks: never silently wrong ground
const broken = (change) => { const b = raw.slice(); change(b); return b; };
throws(() => C.decodeTerrain(broken((b) => { b[0] = 0; })), /magic/, 'verkeerde magic is een fout');
throws(() => C.decodeTerrain(broken((b) => { b[5] = 99; })), /versie 99/, 'een andere cacheversie is een fout (en zegt welke)');
throws(() => C.decodeTerrain(broken((b) => { b[108] = (b[108] + 1) & 255; })), /lengte in de kop/, 'een verkeerde lengte is een fout');
throws(() => C.decodeTerrain(raw.slice(0, 60)), /te kort/, 'een half bestand is een fout');
throws(() => {
  const b = broken((b) => { new DataView(b.buffer).setUint32(108, b.byteLength - 112 + 1, true); });
  C.decodeTerrain(b);
}, /lengte in de kop/, 'een te korte lichaamslengte is een fout');
throws(() => {
  const T2 = smallTerrain();
  T2.tiles[0].index = new Uint32Array([0, 5]);
  C.encodeTerrain(T2, { bounds });
}, /driehoekindex/, 'een index zonder driehoeken bakt niet');
throws(() => {
  const T2 = smallTerrain();
  T2.tiles[0].index = new Uint32Array([0, 5, 999]);
  C.encodeTerrain(T2, { bounds });
}, /buiten het terrein/, 'een index buiten het terrein bakt niet');
ok(C.checkTerrainCacheBytes(broken((b) => { b[0] = 0; })) !== null, 'de stagecontrole noemt een kapot blok');

// --- water-row fingerprint: the cache may only belong to the same list
const rows = [
  { pts: [[0, 0], [10, 0], [10, 10]] },
  { pts: [[20, 20], [30, 20]] },
];
const sigA = C.terrainRowsSignature(rows);
ok(sigA === C.terrainRowsSignature([...rows]), 'dezelfde waterlijst geeft dezelfde vingerafdruk');
ok(sigA !== C.terrainRowsSignature([...rows].reverse()), 'een andere volgorde geeft een andere vingerafdruk');
ok(sigA !== C.terrainRowsSignature([{ pts: [[0, 0], [10, 0], [10, 11]] }, rows[1]]), 'een verplaatst punt geeft een andere vingerafdruk');
ok(C.terrainRowsSignature([]) === C.terrainRowsSignature([]), 'een lege lijst is ook deterministisch');

// --- wiring: the build bakes, the game reads, the stage checks
const tileworld = read('game/js/tileworld.js');
ok(tileworld.includes('terrainCache = false'), 'loadTileWorld heeft een terrainCache-optie');
ok(tileworld.includes('readBakedTerrain') && tileworld.includes('TERRAIN_FILE'), 'tileworld leest en controleert de gebakken grond');
ok(/terrainRowsSignature\(terrainHoleRows\(world\)\)/.test(tileworld), 'tileworld toetst de waterlijst voordat hij de cache gebruikt');
const scene = read('game/js/scene3d.js');
ok(scene.includes('map.terrainCache'), 'scene3d gebruikt de gebakken grond');
ok(scene.indexOf('map.terrainCache') < scene.indexOf("runGeo('terrain'"), 'scene3d kijkt eerst naar de cache en pas daarna naar de worker');
ok(scene.includes('terrainHoleRows'), 'scene3d en de bakker gebruiken dezelfde waterlijst');
const build = read('desktop/build.mjs');
ok(build.includes('bakeTerrain(') && build.includes('bake_terrain.mjs'), 'de stage bakt de grond');
ok(build.includes("'--world=' + worldDir"), 'de stage geeft het wereldpad als --world=<map> mee');
const bake = read('scripts/world/bake_terrain.mjs');
ok(/const i = process\.argv\.indexOf\('--' \+ name\)/.test(bake), 'de bakker leest ook de vorm --world <map> (handmatig gebruik)');
ok(build.includes('GDE_TERRAIN_CACHE'), 'de stage kan de bak overslaan (GDE_TERRAIN_CACHE=0)');
const stagecheck = read('scripts/lib/stagecheck.mjs');
ok(stagecheck.includes('checkTerrainCacheBytes') && stagecheck.includes('TERRAIN_FILE'), 'de stagecontrole keurt terrain.bin');
ok(fs.existsSync(path.join(ROOT, 'scripts/world/bake_terrain.mjs')), 'de bakker bestaat');
const main = read('game/js/main.js');
ok(/terrainCache: true/.test(main), 'de boot vraagt om de gebakken grond');
const terrain = read('game/js/terrain3d.js');
ok(/grid: \{ minX, minY/.test(terrain), 'terrainArrays geeft het basisgrid mee voor de bakker');

console.log(`terraincache_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
