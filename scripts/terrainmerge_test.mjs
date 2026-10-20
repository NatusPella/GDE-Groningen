// node scripts/terrainmerge_test.mjs: terrain tiles joined in coarse cells (game/js/terrainmerge.js)
import { mergeTerrainTiles } from '../game/js/terrainmerge.js';

let fail = 0;
const ok = (name, cond, extra = '') => { if (!cond) fail++; console.log(`${cond ? 'ok  ' : 'FAIL'} ${name} ${extra}`); };
const tile = (gx, gz, tri) => ({ index: Uint32Array.from(tri), box: [gx * 400 + 5, gz * 400 + 5, gx * 400 + 395, gz * 400 + 395] });

// a 4 x 4 block of 400 m tiles joins in 2 x 2 cells of 800 m: four draws instead of sixteen
const tiles = [];
for (let gx = 0; gx < 4; gx++) for (let gz = 0; gz < 4; gz++) tiles.push(tile(gx, gz, [gx, gz, 100, gx + 1, gz + 1, 101]));
const m = mergeTerrainTiles(tiles, 800);
ok('16 tiles become 4', m.length === 4, String(m.length));
ok('no triangle is lost or doubled', m.reduce((a, t) => a + t.index.length, 0) === tiles.reduce((a, t) => a + t.index.length, 0));
const all = new Set(); for (const t of m) for (let i = 0; i < t.index.length; i += 6) all.add(t.index[i] + ',' + t.index[i + 1]);
ok('every original triangle is in one merged tile', all.size === 16);
ok('the box is the union', m.every((t) => t.box[2] - t.box[0] > 700 && t.box[3] - t.box[1] > 700), JSON.stringify(m[0].box));
ok('a lone tile stays as it is', mergeTerrainTiles([tiles[0], tile(9, 9, [1, 2, 3])], 800).length === 2);
ok('no cell size: untouched', mergeTerrainTiles(tiles, 0) === tiles);
process.exit(fail ? 1 : 0);
