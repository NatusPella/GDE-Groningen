// De zee als waterrijen (#233, game/js/seatiles.js): de zeering van regions.js op het raster van 1 km, rond de speler.
//   node scripts/seatiles_test.mjs        (met game/world de echte kust; anders alleen het knippen)
import './node3d.mjs';
import fs from 'node:fs';

const { clipRing, seaTileRow, ensureSeaRows } = await import('../game/js/seatiles.js');
const { setRegionData, seaAt } = await import('../game/js/regions.js');
const G = await import('../game/js/gdt.js');
const { onTileCut } = await import('../game/js/waterindex.js');

let n = 0, fails = 0;
const ok = (c, m, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${m}${info ? ' (' + info + ')' : ''}`); } };
const areaOf = (P) => { let a = 0; for (let i = 0, j = P.length - 1; i < P.length; j = i++) a += (P[j][0] + P[i][0]) * (P[j][1] - P[i][1]); return Math.abs(a / 2); };

// a concave ring against a rectangle: a U shape, the window cuts both arms
const U = [[0, 0], [30, 0], [30, 30], [20, 30], [20, 10], [10, 10], [10, 30], [0, 30]];
const c = clipRing(U, 0, 0, 30, 20);
ok(areaOf(c) > 0, 'the U against a window gives an area');
ok(Math.abs(areaOf(c) - 500) < 1e-6, 'and the right one (500 m2)', String(areaOf(c)));
ok(clipRing(U, 100, 100, 200, 200).length === 0, 'a window beside the ring gives nothing');
ok(areaOf(clipRing(U, -5, -5, 40, 40)) === areaOf(U), 'a window round the ring gives the ring');

const root = new URL('../game/world/', import.meta.url);
if (!fs.existsSync(new URL('index-provincie.json', root))) { console.log(fails ? `${fails} of ${n} FAILED` : `${n} sea tile checks passed (no game/world: the real coast skipped)`); process.exit(fails ? 1 : 0); }
const idx = JSON.parse(fs.readFileSync(new URL('index-provincie.json', root), 'utf8'));
setRegionData(idx.global);

// a spot off Lauwersoog, 300 m off the strips of vaarnet_fixes (the strips are 500 m wide): the sea tile there
const [px, py] = [-24706, -21255];
const [ti, tj] = G.tileIndexOf(px, py);
const row = seaTileRow(ti, tj);
ok(row && row.kind === 'zee' && row.nav === 4 && row.pts.length >= 3, 'a sea row where the Wadden Sea is');
if (row) {
  ok(areaOf(row.pts) <= 1e6 + 1, 'at most a tile');
  // every vertex on the tile border or on the coast; the points inside the row are sea
  const [x0, y0] = G.tileOrigin(ti, tj);
  let onBorder = 0;
  for (const p of row.pts) if (Math.abs(p[0] - x0) < 0.02 || Math.abs(p[0] - x0 - 1000) < 0.02 || Math.abs(p[1] - y0) < 0.02 || Math.abs(p[1] - y0 - 1000) < 0.02) onBorder++;
  ok(onBorder >= 2, 'the row is cut at the tile border (so it is no shore there)', String(onBorder));
  let wet = 0, tot = 0;
  for (let k = 0; k < 200; k++) {
    const x = x0 + ((k * 37) % 100) * 10 + 5, y = y0 + (Math.floor(k / 2) * 53 % 100) * 10 + 5;
    let c2 = false;
    for (let a = 0, b = row.pts.length - 1; a < row.pts.length; b = a++) if ((row.pts[a][1] > y) !== (row.pts[b][1] > y) && x < ((row.pts[b][0] - row.pts[a][0]) * (y - row.pts[a][1])) / (row.pts[b][1] - row.pts[a][1]) + row.pts[a][0]) c2 = !c2;
    if (c2) { tot++; if (seaAt(x, y)) wet++; }
  }
  ok(tot > 20 && wet / tot > 0.97, `the row covers sea (${wet} of ${tot} samples)`);
}
// ensureSeaRows adds each tile once
const added = [];
const map = { addWaterPatches: (rows) => { added.push(...rows); return rows.length; } };
const a1 = ensureSeaRows(map, px, py, 2000);
const a2 = ensureSeaRows(map, px + 10, py + 10, 2000);
ok(a1 >= 9 && a2 === 0, 'the sea tiles round the player come once', `${a1} then ${a2}`);
ok(ensureSeaRows(map, 0, 0, 1500) === 0, 'none in the city');
// land inland: no row
ok(seaTileRow(...G.tileIndexOf(-1000, -3000)) === null, 'no sea row on land');
console.log(fails ? `${fails} of ${n} FAILED` : `${n} sea tile checks passed`);
process.exit(fails ? 1 : 0);
