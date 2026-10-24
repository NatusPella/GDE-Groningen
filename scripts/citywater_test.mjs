// De klassen van het stadswater (annotateCityWater, waterlevels.js, #90): wat de oude stad als een polygoon had en de
// OSM-bouw in stukken geeft, blijft dezelfde vaarweg. Een kanaal dat uit meer packs komt (dezelfde polygoon meerdere keren),
// een lint van een kanaallijn over een kanaalpolygon en een smalle gracht naast een kanaal.
//   node scripts/citywater_test.mjs
import { annotateCityWater, polyArea, BOEZEM_Y, SMALL_POND_AREA } from '../game/js/waterlevels.js';

let n = 0, fails = 0;
const ok = (c, m, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${m}${info ? ' (' + info + ')' : ''}`); } };
const rect = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]];
const poly = (pts, name = null) => ({ pts, name });

// een havenbekken 80 x 400 m met een kanaal van 20 m erlangs, en het lint (14 m) van een kanaallijn dwars door het bekken
const basin = () => poly(rect(0, 0, 80, 400));
const arm = () => poly(rect(80, 100, 600, 120), 'Zijkanaal');
const ribbon = () => poly(rect(10, 0, 24, 400));
const ditch = () => poly(rect(80, 300, 600, 306), 'Eerste sloot');

{
  const rows = [basin(), arm(), ditch()];
  annotateCityWater(rows);
  ok(rows[0].kind === 'kanaal' && rows[0].nav === 4, 'a wide basin is a kanaal', rows[0].kind);
  ok(rows[1].kind === 'diep' && rows[1].nav === 3, 'a 20 m arm of the boezem is a diep', rows[1].kind);
}
{
  // het lint ligt in het bekken en neemt de breedste cellen niet af
  const rows = [basin(), ribbon(), arm()];
  annotateCityWater(rows);
  ok(rows[0].kind === 'kanaal', 'a ribbon laid over the basin leaves the basin a kanaal', rows[0].kind);
  ok(rows[1].kind === 'kanaal' && rows[1].nav === 4, 'a canal strip that lies wholly in a kanaal polygon is part of it', rows[1].kind);
  ok(rows[2].kind === 'diep', 'a narrow arm next to the basin keeps its own class', rows[2].kind);
}
{
  // dezelfde polygoon uit drie packs krijgt overal dezelfde klasse en hetzelfde lichaam
  const rows = [basin(), basin(), ribbon(), basin(), arm()];
  annotateCityWater(rows, { base: 100 });
  ok([0, 1, 3].every((i) => rows[i].kind === 'kanaal' && rows[i].nav === 4 && rows[i].dp === rows[0].dp), 'copies of one polygon get one class', rows.map((r) => r.kind).join(','));
  ok(rows[0].body === rows[1].body && rows[1].body === rows[3].body && rows[0].body >= 100, 'and one body', rows.map((r) => r.body).join(','));
}
{
  // een lint dat maar half in het kanaal ligt, en een sloot, blijven wat ze zijn
  const half = poly(rect(60, 0, 200, 14));
  const rows = [basin(), half, ditch()];
  annotateCityWater(rows);
  ok(rows[1].kind !== 'kanaal', 'a strip half in the basin stays what its own width says', rows[1].kind);
  ok(rows[2].nav <= 2 && polyArea(rows[2].pts) > 0, 'a ditch stays small water', rows[2].kind);
}
{
  // een poel van 12 x 10 m op een plein (#327) hangt aan geen gracht: op straatniveau, geen put van 2,3 m; een vijver
  // van 40 x 30 m en een gracht blijven op het peil van de boezem
  const pool = poly(rect(1000, 1000, 1012, 1010)), lake = poly(rect(2000, 2000, 2040, 2030));
  const rows = [basin(), pool, lake];
  annotateCityWater(rows);
  if (SMALL_POND_AREA > 0) ok(rows[1].kind === 'vijver' && rows[1].lv > -1 && rows[1].dp <= 0.6, 'a small pond away from the canals lies at street level', `${rows[1].kind} ${rows[1].lv} ${rows[1].dp}`);
  ok(rows[0].lv === BOEZEM_Y, 'the boezem keeps its level', rows[0].lv);
  ok(rows[2].lv === BOEZEM_Y, 'a larger pond keeps the canal level', `${rows[2].kind} ${rows[2].lv}`);
}
{
  // een poel bij een weg of onder een brug (#327): de weg en het brugdek rekenen op het peil van de gracht, dus de poel
  // blijft daar zoals hij was; een poel ver van elke weg komt op straatniveau; een voetpad telt alleen als brug
  const mk = (x0) => poly(rect(x0, 1000, x0 + 12, 1010));
  const road = (pts, o = {}) => ({ pts, cat: 'normal', bridge: false, ...o });
  const roads = [
    road([[1000, 995], [1050, 995]]),                         // 5 m langs de poel
    road([[2000, 900], [2000, 1100]], { cat: 'foot', bridge: true }), // een voetbrug over de poel
    road([[3000, 900], [3000, 1100]], { cat: 'foot' }),       // een voetpad: geen reden
    road([[4022, 900], [4022, 1100]]),                        // 10 m naast de poel
    road([[5100, 900], [5100, 1100]]),                        // 90 m ver
  ];
  const rows = [basin(), mk(1000), mk(2000), mk(3000), mk(4000), mk(5000)];
  annotateCityWater(rows, { roads });
  const lv = (i) => rows[i].lv;
  ok(lv(1) === BOEZEM_Y, 'a pond beside a road keeps the canal level', lv(1));
  ok(lv(2) === BOEZEM_Y, 'a pond under a foot bridge keeps the canal level', lv(2));
  ok(lv(3) > -1, 'a pond with only a foot path beside it lies at street level', lv(3));
  ok(lv(4) === BOEZEM_Y, 'a pond 10 m from a road keeps the canal level', lv(4));
  ok(lv(5) > -1, 'a pond far from every road lies at street level', lv(5));
  const rows2 = [basin(), mk(1000)];
  annotateCityWater(rows2);
  ok(rows2[1].lv > -1, 'without road data the pond lies at street level as before', rows2[1].lv);
}
console.log(`citywater_test: ${n} checks, ${fails} failed`);
process.exit(fails ? 1 : 0);
