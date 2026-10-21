// Wat de romp van een boot tegenhoudt buiten de oever (#343): een woonboot van een tegel is een afgemeerd obstakel zolang
// de tegel er is, een naad tussen twee waterstukken (een haarlijn, of een strook land tot 4 m tussen een gatenstuk en het
// kanaal) is geen muur, en de lijn van een tak van het vaarnet loopt niet door een woonboot of over land.
//   node scripts/moored_seam_test.mjs
import './node3d.mjs';

const WI = await import('../game/js/waterindex.js');
const { simplify } = await import('./world/vaarnet_graph.mjs');
const W = await import('./world/vaarnet.mjs');
const V = await import('../game/js/vaarnet.js');

let n = 0, fails = 0;
const ok = (c, m, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${m}${info ? ' (' + info + ')' : ''}`); } };
const rect = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];

// ------------------------------------------------ een woonboot van een tegel is een obstakel zolang de tegel er is
{
  const map = { water: [{ pts: rect(0, 0, 100, 40) }], buildings: [] };
  const hb = { type: 'houseboat', pts: rect(40, 10, 60, 16) };
  const free = WI.waterClearance(map, 50, 20, 8);
  ok(free > 5, 'open water in a canal is free all round', String(free));
  WI.addMooredBuilding(map, hb);
  const near = WI.waterClearance(map, 50, 20, 8);
  ok(near < free && Math.abs(near - 4) < 0.1, 'a houseboat of a tile is an obstacle: 4 m from the hull', String(near));
  ok(WI.waterClearance(map, 50, 13, 8) < 0, 'inside the hull there is no free water');
  WI.addMooredBuilding(map, hb);
  ok(WI.waterClearance(map, 50, 20, 8) === near, 'adding it twice changes nothing');
  WI.dropMooredBuilding(map, hb);
  ok(WI.waterClearance(map, 50, 20, 8) === free && WI.waterClearance(map, 50, 13, 8) > 3, 'the obstacle goes when its tile drops');
  ok(!hb._moor, 'and the building is clear of it');
}

// ------------------------------------------------ de naden tussen waterstukken
const seamMap = (gap, seam) => {
  const rows = [
    { pts: rect(0, 0, 60, 30), nav: 3, seam },                 // het gatenstuk
    { pts: rect(60 + gap, 0, 200, 30), nav: 3 },               // het kanaal, gap m verder
    { pts: rect(-140, 0, 0, 30), nav: 3 },                     // en de andere kant van het stuk
  ];
  return { water: [], buildings: [], waterGrid: {}, waterNear: () => rows, _waterVer: 1 };
};
{
  const hair = seamMap(0.4, false);
  ok(WI.waterClearance(hair, 60.2, 15, 8) > 2, 'a hairline of 0.4 m between two rows is water', String(WI.waterClearance(hair, 60.2, 15, 8)));
  const strip = seamMap(2.4, false);
  ok(WI.waterClearance(strip, 61.2, 15, 8) < 0, 'a strip of 2.4 m between plain rows stays land (a dam)');
  const patch = seamMap(2.4, true);
  const c = WI.waterClearance(patch, 61.2, 15, 8);
  ok(c > 2, 'a strip of 2.4 m after a gap patch is welded: free water for the hull', String(c));
  ok(WI.waterClearance(patch, 58.9, 15, 8) > 2 && WI.waterClearance(patch, 63.1, 15, 8) > 2, 'and the edges either side of the strip are no shore', `${WI.waterClearance(patch, 58.9, 15, 8)} / ${WI.waterClearance(patch, 63.1, 15, 8)}`);
  ok(WI.waterClearance(patch, 61.2, 31.5, 8) < 0, 'beside the canal it is still land');
  const wide = seamMap(6, true);
  ok(WI.waterClearance(wide, 63, 15, 8) < 0, 'a strip of 6 m is too wide to weld: land');
  ok(WI.waterClearance(patch, 61.2, 1.2, 8) < 2.5, 'the weld keeps the canal bank as a shore (1.2 m from it)', String(WI.waterClearance(patch, 61.2, 1.2, 8)));
}
{
  const rows = V.patchRows({ links: [{ from: [0, 0], to: [10, 0], width: 6 }], gaten: [[0, 0, 10, 6, 0, 3]], verbindingen: [[0, 0, 10, 6, 0, 2]], sluisgaten: [[0, 0, 10, 6, 0, 3]], zee: [[0, 0, 2000, 40, 0, 4, 'zee waddenzee']] });
  ok(rows.filter((r) => r.seam).length === 3 && !rows[3].seam && !rows[4].seam, 'the links, gaps and joins are welded, the lock chambers and the sea are not');
}

// ------------------------------------------------ de lijn van een tak
{
  const P = [[0, 0], [30, 0], [60, 0], [60, 30], [60, 60]];
  ok(simplify(P, 14).length === 3, 'simplify drops the middle of a straight piece');
  const L = [[0, 0], [20, 0], [40, 0], [40, 20], [40, 40]];
  ok(simplify(L, 30).length === 2, 'a long bend is cut straight when nothing is in the way');
  const dry = (x, y) => Math.hypot(x - 20, y - 20) < 3;
  const kept = simplify(L, 30, dry);
  ok(kept.length >= 3 && kept.some((p) => p[0] === 40 && p[1] === 0), 'a chord over a dry spot is split at the bend', JSON.stringify(kept));
}
{
  const R = new W.Raster();
  const [cx, cy] = W.cellOf(0, 0);
  for (let a = -20; a <= 20; a++) for (let b = -20; b <= 20; b++) R.put(cx + a, cy + b, 4);
  const boat = rect(-6, -3, 6, 3);
  const cleared = W.blockRing(R, boat);
  ok(cleared > 4, 'a houseboat closes the cells under and next to it', String(cleared));
  ok(R.nav(cx, cy) === 0 && R.nav(cx + 18, cy) === 4, 'the middle is closed, far away is open');
  ok(W.ringNear(R, 7.5, 0, 1.6) && !W.ringNear(R, 9, 0, 1.6) && W.ringNear(R, 0, 0, 0), 'ringNear measures to the hull (inside counts)');
}

console.log(`${n} checks, ${fails} failed`);
process.exit(fails ? 1 : 0);
