// Water dat het vaarnet toevoegt ligt nooit over een gebouw (#362). Zonder wereld, op een klein raster:
// de geometrie van huizenindex.mjs, closeGaps (vult geen cel onder een gebouw), clusterGaps en autoLinks (rechthoeken
// die geen gebouw raken) en de zeeverbinding die om een dorp heen loopt. De echte wereld meet
// scripts/world/gaten_gebouwen_audit.mjs (0 overlappen).
//   node scripts/vaarnet_huizen_test.mjs
import './node3d.mjs';
import { maakHuizenIndex, veelhoekenRaken } from './lib/huizenindex.mjs';
import { gatPolygon } from '../game/js/vaarnet.js';
const W = await import('./world/vaarnet.mjs');

let n = 0, bad = 0;
const check = (name, ok, info = '') => { n++; if (!ok) { bad++; console.log('FAIL', name, info); } };
const doos = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];

// ---- de geometrie
check('overlap van twee vlakken', veelhoekenRaken(doos(0, 0, 10, 10), doos(5, 5, 15, 15)));
check('de een helemaal in de ander', veelhoekenRaken(doos(0, 0, 10, 10), doos(2, 2, 4, 4)) && veelhoekenRaken(doos(2, 2, 4, 4), doos(0, 0, 10, 10)));
check('los van elkaar', !veelhoekenRaken(doos(0, 0, 10, 10), doos(11, 0, 20, 10)));
check('een kier van een centimeter is geen overlap', !veelhoekenRaken(doos(0, 0, 10, 10), doos(10.01, 0, 20, 10)));
check('een kruis zonder hoekpunt in de ander', veelhoekenRaken(doos(0, 4, 10, 6), doos(4, 0, 6, 10)));
const idx = maakHuizenIndex([{ pts: doos(100, 100, 120, 120) }, { pts: doos(300, 300, 310, 310), type: 'houseboat' }]);
check('index vindt een gebouw', idx.raakt(doos(110, 110, 130, 130)) && idx.aantal(doos(90, 90, 130, 130)) === 1);
check('index mist een gebouw ver weg', !idx.raakt(doos(200, 200, 230, 230)));
check('een woonboot telt niet', !idx.raakt(doos(295, 295, 315, 315)));

// ---- closeGaps vult geen cel onder een gebouw; clusterGaps en autoLinks leveren vrije rechthoeken
const C = W.CELL;
const maakRaster = (huizen) => {
  const R = new W.Raster();
  const vul = (x0, y0, x1, y1) => W.fillPolygon(R, doos(x0, y0, x1, y1), 3);
  vul(0, 0, 100, 60);          // water links
  vul(105, 0, 205, 60);        // water rechts, een kolom van een cel ertussen (rasterruis)
  R.huizen = huizen ? maakHuizenIndex(huizen) : null;
  return R;
};
const zonder = maakRaster(null);
W.closeGaps(zonder);
const celCount = (R) => new Set(R.filled.map(([cx, cy]) => cx + ',' + cy)).size; // (closeGaps meldt een cel soms vanuit twee assen)
check('zonder gebouwen vult closeGaps de hele kolom', celCount(zonder) === 60 / C, String(celCount(zonder)));

const huis = doos(98, 20, 112, 34);  // een huis dat de kolom en een stuk water raakt
const R = maakRaster([{ pts: huis }]);
W.closeGaps(R);
check('closeGaps laat de cellen onder het huis leeg', celCount(R) < celCount(zonder) && R.filled.every(([cx, cy]) => !R.opHuis(cx, cy)), String(celCount(R)));
const gaten = W.clusterGaps(R, 1);
check('er blijven gaten over', gaten.length >= 2, String(gaten.length));
check('geen gat raakt het huis', gaten.every((g) => !R.huizen.raakt(gatPolygon(g))), JSON.stringify(gaten.filter((g) => R.huizen.raakt(gatPolygon(g)))));
// zonder het opdelen was het één rechthoek over het huis geweest
const heel = W.clusterGaps(zonder, 1);
check('zonder huis is het één rechthoek', heel.length === 1 && R.huizen.raakt(gatPolygon(heel[0])));

// een schuine rechthoek wordt in stukken gedeeld
const stukken = W.vrijeStukken(R, [100, 28, 40, 10, 0, 3]);
check('vrijeStukken: stukken zonder gebouw', stukken.length >= 1 && stukken.every((g) => !R.huizen.raakt(gatPolygon(g))), JSON.stringify(stukken));
check('vrijeStukken: een vrije rechthoek blijft heel', W.vrijeStukken(R, [20, 28, 10, 5, 0, 3]).length === 1);
check('vrijeStukken: helemaal onder het huis valt weg', W.vrijeStukken(R, [105, 27, 6, 6, 0, 3]).length === 0);

// ---- de zeeverbinding loopt om een dorp heen
const dorp = [];
for (let y = -40; y <= 40; y += 20) for (let x = 100; x <= 160; x += 20) dorp.push({ pts: doos(x, y - 6, x + 12, y + 6) }); // 4 rijen huizen met straten ertussen
const Z = new W.Raster();
Z.huizen = maakHuizenIndex(dorp);
const rechtdoor = [[...[130, 0, 300, 40, 0, 4], 'zee test']];
check('de rechte verbinding raakt het dorp', Z.huizen.raakt(gatPolygon(rechtdoor[0])));
const om = W.zeeVerbinding(Z, [-20, 0], [270, 0], 'zee test');
check('zeeverbinding: stukken met de naam van de zee', om.length > 1 && om.every((g) => g[6] === 'zee test' && g[5] === 4));
check('zeeverbinding: geen stuk raakt een gebouw', om.every((g) => !Z.huizen.raakt(gatPolygon(g))), String(om.length));
check('zeeverbinding: het water loopt van begin tot eind', Math.min(...om.map((g) => g[0])) < 20 && Math.max(...om.map((g) => g[0])) > 230);
const vrij = W.zeeVerbinding(Z, [-20, 200], [270, 200], 'zee vrij');
check('zeeverbinding: zonder gebouw één rechthoek zoals voorheen', vrij.length === 1 && vrij[0][2] === 310 && vrij[0][3] === W.SEA_TONGUE.link && vrij[0][6] === 'zee vrij', JSON.stringify(vrij));

console.log(bad ? `${bad} van ${n} mislukt` : `vaarnet_huizen_test ok (${n} checks)`);
process.exit(bad ? 1 : 0);
