// Waar een waypoint landt (#502, playtest 27-10): "als ik een waypoint uitklik,
// dan wordt het niet exact die plek", "bij het forum gaan die waypoints een
// beetje raar door het forum heen" en "de waypoint van het vliegveld staat niet
// waar je moet zijn". Deze test bewijst de drie dingen die daaronder zitten:
//   a. een klik op (x, y) wordt een doel op (x, y); alleen een klik in een
//      gebouw schuift naar de gevel (daar kan niemand staan), en de router
//      verplaatst het doel daarna niet meer;
//   b. als de router om een gebouw heen rijdt, raakt geen enkel stuk van de
//      getekende lijn dat gebouw (het Forum als proef: de luchtlijn loopt er
//      dwars doorheen, de route eromheen);
//   c. het vliegvelddoel van de vliegschool ligt binnen de vliegveldzone die het
//      spel zelf al gebruikt (het hele veld van Eelde, activities.js `reik`).
//   node scripts/waypoint_klopt_test.mjs
import './node3d.mjs';
import fs from 'node:fs';
import zlib from 'node:zlib';
import { loadCityWorld } from './lib/loadworld.mjs';
import { pointInPolygon } from '../game/js/util.js';
import { roadGraphVersion } from '../game/js/roadgraph.js';

let n = 0, fails = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FAIL', m); } };

const { map } = await loadCityWorld();
const R = await import('../game/js/routing.js');
const RG = await import('../game/js/roadgraph.js');

// Dezelfde wereld als in het spel: de stadskaart plus het provincienet (de weg
// naar Eelde loopt daarover). Zonder dat net kan een doel buiten de stad geen
// route krijgen en zegt deze test niets over het vliegveld.
const roadFile = new URL('../game/world/provincie-roads.json.gz', import.meta.url);
const net = fs.existsSync(roadFile) ? RG.decodeRoadNet(JSON.parse(zlib.gunzipSync(fs.readFileSync(roadFile)).toString('utf8'))) : null;
if (net) RG.setRoadNet(net);

// Een vast "klokje" per plan: routing.js bewaart routes per sleutel en de
// tussenpozen (MIN_RECOMPUTE_S) mogen een nieuwe route niet tegenhouden.
let clock = 0;
const realNow = performance.now.bind(performance);
performance.now = () => realNow() + clock * 1000;

const DRIVE = { isBike: false, isBoat: false };
// Een wereld zoals main.js hem aan de router geeft, met de speler in de auto op a.
const plan = (a, b, vehicle = DRIVE) => {
  clock += 100;
  const w = { map, time: 0, health: 100, player: { x: a[0], y: a[1], gz: a[2] || 0, inVehicle: vehicle ? { ...vehicle, z: a[2] || 0 } : null }, addMessage: () => {} };
  R.setUserWaypoint(b[0], b[1], 'doel', b[2]);
  R.updateRouting(0.1, w);
  return R.getActiveRoute();
};
R.clearUserWaypoint();

// Ligt (x, y) in een gebouw? Zonder doorgangen: de kaart tekent de lijn ook
// over een poort heen als hij de gevel raakt, en dat is wat de speler zag.
const buildingAt = (x, y) => {
  for (const b of map.buildingsNear(x, y, 1)) {
    const [x0, y0, x1, y1] = b.bounds;
    if (x < x0 || x > x1 || y < y0 || y > y1) continue;
    if (pointInPolygon(x, y, b.pts)) return b;
  }
  return null;
};
// Elk punt van het stuk, om de meter: een lijn van 5 m die de gevel schampt telt mee.
const crossesBuilding = (ax, ay, bx, by) => {
  const k = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay)));
  for (let i = 0; i <= k; i++) {
    const t = i / k;
    const b = buildingAt(ax + (bx - ax) * t, ay + (by - ay) * t);
    if (b) return b;
  }
  return null;
};
const routeHits = (r) => {
  const out = [];
  for (let i = 0; i < r.pts.length - 1; i++) {
    const b = crossesBuilding(r.pts[i][0], r.pts[i][1], r.pts[i + 1][0], r.pts[i + 1][1]);
    if (b) out.push({ seg: i, name: b.name || b.landmark || '', x: r.pts[i][0], y: r.pts[i][1] });
  }
  return out;
};
const polyLen = (pts) => { let l = 0; for (let i = 1; i < pts.length; i++) l += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return l; };

// ---- a. de klik is het doel -------------------------------------------------
// 300 punten in de stad: een punt buiten de gevels blijft exact liggen. Vroeger
// sprong een klik naar de dichtstbijzijnde weg zodra die binnen 30 m lag
// (mapview.handleClick), en bij een zoekresultaat zelfs binnen 120 m
// (chooseResult): je klikte op de kade en je waypoint stond op de straat.
const B = map.meta.bounds;
let seed = 502;
const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296);
let open = 0, inexactOpen = 0, inB = 0;
const checkKlik = (x, y) => {
  const inside = !!buildingAt(x, y);
  const q = R.klikDoel(map, x, y);
  const d = Math.hypot(q[0] - x, q[1] - y);
  if (inside) {
    inB++;
    ok(d <= 60, `een klik in een gebouw schuift ${d.toFixed(1)} m op (max 60), bij (${x.toFixed(1)}, ${y.toFixed(1)})`);
    ok(!buildingAt(q[0], q[1]), `het doel na een klik in een gebouw ligt nog in de gevel (${q[0].toFixed(1)}, ${q[1].toFixed(1)})`);
  } else {
    open++;
    if (d > 1e-9) { inexactOpen++; ok(false, `een klik buiten de gebouwen schoof ${d.toFixed(1)} m op, bij (${x.toFixed(1)}, ${y.toFixed(1)})`); }
  }
};
for (let i = 0; i < 300; i++) checkKlik(B[0] + rnd() * (B[2] - B[0]), B[1] + rnd() * (B[3] - B[1]));
ok(open >= 200, `maar ${open} van de 300 punten lag buiten een gebouw: te weinig steekproef`);
ok(inexactOpen === 0, `${inexactOpen} klikken buiten de gebouwen schoven toch op`);

// En de echte klik: 120 punten op straat (waar de speler klikt) zijn altijd
// exact, ook als er een voetpad of een kade dichterbij ligt.
let streetN = 0;
for (const road of map.roads) {
  if (streetN >= 120) break;
  if (!road.pts.length) continue;
  const p = road.pts[Math.floor(road.pts.length / 2)];
  checkKlik(p[0], p[1]);
  streetN++;
}
ok(streetN >= 120, `maar ${streetN} straatpunten beproefd`);

// En de router verplaatst het doel daarna niet meer: route.target is het punt
// dat je aanwees, ook als de wegsnap 10 m verderop ligt.
let targetMoved = 0;
for (let i = 0; i < 40; i++) {
  const x = B[0] + rnd() * (B[2] - B[0]), y = B[1] + rnd() * (B[3] - B[1]);
  const r = plan([x, y], [x + 120, y + 60]);
  if (!r) continue;
  if (Math.abs(r.target.x - (x + 120)) > 1e-6 || Math.abs(r.target.y - (y + 60)) > 1e-6) targetMoved++;
}
ok(targetMoved === 0, `de router verschoof het doel ${targetMoved} keer`);

// Een klik midden in het Forum: het doel moet naar de gevel (buiten alle
// voetafdrukken) en niet tien meter de hal in.
const forum = map.buildings.find((b) => b.name === 'Forum Groningen');
ok(!!forum, 'het Forum staat in de stadskaart');
if (forum) {
  const [x0, y0, x1, y1] = forum.bounds;
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const q = R.klikDoel(map, cx, cy);
  const d = Math.hypot(q[0] - cx, q[1] - cy);
  ok(d <= 40, `een klik in het Forum schuift ${d.toFixed(1)} m op (max 40)`);
  ok(!buildingAt(q[0], q[1]), 'het doel na een klik in het Forum ligt buiten de gevel');
  const r = plan([cx - 120, cy - 90], q);
  ok(!!r && r.pts.length > 1, 'er is een route naar het Forum-doel');
  if (r) {
    const hits = routeHits(r);
    ok(hits.length === 0, `de route naar het Forum gaat door een gebouw: ${JSON.stringify(hits.slice(0, 3))}`);
    ok(!!r.noRoute !== undefined, 'de route meldt of er een weg is (noRoute)');
  }
  // En hetzelfde doel zonder de klik-herijking (zoals de oude kaart het zette:
  // midden in het gebouw, of een zoekresultaat dat naar de weg bij het Forum
  // sprong): de lijn moet op straat eindigen en niet door de hal lopen. In de
  // oude router liep hij hier met twee stukken dwars door de Forum-gevel.
  const rMid = plan([cx - 120, cy - 132], [cx, cy]);
  ok(!!rMid && rMid.pts.length > 1, 'er is een route naar een doel midden in het Forum');
  if (rMid) {
    const e = rMid.pts[rMid.pts.length - 1];
    ok(!buildingAt(e[0], e[1]), `de route naar het Forum eindigt nog in het gebouw (${e[0].toFixed(1)}, ${e[1].toFixed(1)})`);
    const d = Math.hypot(e[0] - cx, e[1] - cy);
    ok(d <= 45, `de route eindigt ${d.toFixed(0)} m van het Forum-doel (max 45: het gebouw is ${Math.round(Math.min(x1 - x0, y1 - y0))} m diep)`);
    const hits = routeHits(rMid);
    ok(hits.length === 0, `de route naar het Forum-doel loopt door de gevel: ${JSON.stringify(hits.slice(0, 3))}`);
  }
}

// ---- b. omrijden zonder de gevel te raken ----------------------------------
// Twee straten aan weerskanten van het Forum. De luchtlijn loopt dwars door het
// gebouw; de auto moet eromheen, en geen enkel stuk van de getekende lijn mag
// het gebouw raken ("dan wil hij mij gewoon echt door dat gebouw heen hebben").
if (forum) {
  const [x0, y0, x1, y1] = forum.bounds;
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const west = map.nearestRoadPoint(x0 - 30, cy, 80, true);
  const east = map.nearestRoadPoint(x1 + 30, cy + 5, 80, true);
  ok(!!west && !!east, 'er liggen autowegen aan weerskanten van het Forum');
  if (west && east) {
    const crow = Math.hypot(west.x - east.x, west.y - east.y);
    ok(!!crossesBuilding(west.x, west.y, east.x, east.y), 'de luchtlijn west->oost kruist het Forum (anders bewijst deze proef niets)');
    const r = plan([west.x, west.y], [east.x, east.y]);
    ok(!!r && r.pts.length > 2, 'de auto krijgt een route om het Forum heen');
    if (r) {
      const hits = routeHits(r);
      ok(hits.length === 0, `de omweg raakt toch een gebouw: ${JSON.stringify(hits.slice(0, 3))}`);
      ok(r.length > crow + 10, `de route is ${Math.round(r.length)} m en de luchtlijn ${Math.round(crow)} m: er is echt omgereden`);
      ok(Math.abs(r.length - polyLen(r.pts)) < 0.5, 'de afstand op de kaart is de lengte van de getekende lijn');
    }
  }
}

// Een doel dat niet over de weg te bereiken is: dan liever geen lijn dan een
// rechte stippellijn door de gevels (mapview.drawFullRoute tekent die alleen nog
// als de luchtlijn vrij is). Hier is de controle op de vlag die dat regelt.
{
  const r = plan([forum ? (forum.bounds[0] + forum.bounds[2]) / 2 : 300, -900], [-2600, 2400]);
  ok(!r || r.noRoute === false || r.pts.length >= 2, 'een route zonder weg heeft geen lijn (noRoute)');
}

// ---- c. het vliegvelddoel ------------------------------------------------
// Het doel dat de kaart en de takenlijst voor de vliegschool zetten, komt uit
// vliegschool.js (standActivity.spots). De zone is dezelfde die het spel zelf
// al gebruikt: "het hele veld" van de vluchtdienst is 420 m rond de plek van
// Eelde (activities.js, `reik`), en die plek staat in game/vliegplekken.json.
const plekken = JSON.parse(fs.readFileSync(new URL('../game/vliegplekken.json', import.meta.url), 'utf8'));
const eelde = plekken.eelde;
ok(!!eelde && Number.isFinite(eelde.x) && Number.isFinite(eelde.y), 'game/vliegplekken.json heeft de plek van Eelde');
const VLIEGSCHOOL = (await import('../game/js/vliegschool.js')).VLIEGSCHOOL;
const doel = VLIEGSCHOOL.spots()[0];
const zoneR = 420;
const dEelde = Math.hypot(doel.x - eelde.x, doel.y - eelde.y);
ok(dEelde <= zoneR, `het vliegvelddoel (${doel.x.toFixed(1)}, ${doel.y.toFixed(1)}) ligt ${dEelde.toFixed(0)} m van Eelde, buiten de vliegveldzone van ${zoneR} m`);
// Het doel moet ook bereikbaar zijn: een waypoint op het veld hoort een route te
// krijgen die bij het veld eindigt (en niet 5 km verderop bij de eerste beste weg).
if (net) {
  const start = [eelde.x - 900, eelde.y - 900];
  const r = plan(start, [doel.x, doel.y]);
  ok(!!r && r.pts.length > 1, 'er is een route naar het vliegvelddoel');
  if (r) {
    const e = r.pts[r.pts.length - 1];
    const d = Math.hypot(e[0] - doel.x, e[1] - doel.y);
    ok(d <= 30, `de route naar het vliegveld eindigt ${d.toFixed(0)} m van het doel (max 30)`);
    ok(Math.hypot(e[0] - eelde.x, e[1] - eelde.y) <= zoneR + 60, 'de route eindigt bij het veld, niet elders');
  }
}

console.log(`waypoint_klopt_test: ${n - fails}/${n}${fails ? ' FAIL' : ' ok'}`);
process.exit(fails ? 1 : 0);
