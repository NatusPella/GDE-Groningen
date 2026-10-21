// Routekwaliteit (#320): kiest de GPS een omweg? Voor een vaste reeks start/doel-paren (stad, dorpen, A7, provincie, doelen op en bij
// water en bruggen) vergelijkt deze test de gekozen route (routing.js, de echte routeplanner op de echte wegen) met de kortste weg in de
// graaf (scripts/lib/routeref.mjs: Dijkstra op zuivere lengte over stad + provincienet, één knoop per halve meter) en met hemelsbreed.
// Een route die meer dan 1,3 keer zo lang is als de kortste weg is een fout; de uitschieters staan in het rapport.
//   node scripts/route_quality_test.mjs [--verbose] [--max=1.3]
import './node3d.mjs';
import fs from 'node:fs';
import zlib from 'node:zlib';

const VERBOSE = process.argv.includes('--verbose');
const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? +a.slice(k.length + 3) : d; };
const MAX = arg('max', 1.3);
// waar de stadsgraaf zelf geen weg heeft (zie cityGap) komt de route uit het provincienet alleen: ruimer, tot #90 één graaf maakt
const MAX_GAP = arg('maxgap', 1.5);
const DEBUG = (process.argv.find((x) => x.startsWith('--debug=')) || '').slice(8);
const roadFile = new URL('../game/world/provincie-roads.json.gz', import.meta.url);
if (!fs.existsSync(roadFile)) { console.log('SKIP geen game/world met het provincienet (scripts/world/build_province.mjs)'); process.exit(0); }
import { loadCityWorld } from './lib/loadworld.mjs';
import { roadAllowed, oneWayFor } from '../game/js/roadaccess.js';
import { buildRef, snapRef, refLength, cityDrivable } from './lib/routeref.mjs';
const R = await import('../game/js/routing.js');
const RG = await import('../game/js/roadgraph.js');
const map = (await loadCityWorld()).map;
RG.setRoadNet(RG.decodeRoadNet(JSON.parse(zlib.gunzipSync(fs.readFileSync(roadFile)).toString('utf8'))));
const roadNet = RG.roadNetRows();
const city = map.roads.filter(cityDrivable);
// een wegstuk dwars door een gebouw is geen weg voor een auto (routing.js rekent er het achtvoudige voor)
const G = buildRef([...city, ...roadNet], (r, ax, ay, bx, by) => !r.bridge && r.cat && R.throughBuilding(map, ax, ay, bx, by));

// ---- de paren, allemaal vast (zaad en namen)
let seed = 320;
const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296);
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const MB = map.meta.bounds;
const inBounds = (p, m = 0) => p[0] > MB[0] - m && p[0] < MB[2] + m && p[1] > MB[1] - m && p[1] < MB[3] + m;
// een punt met zijn hoogte (z): wie op een brug of afrit begint of eindigt, staat op die hoogte
const withZ = (p, z) => { const q = [p[0], p[1]]; q.z = z || 0; return q; };
const cityPt = () => { const r = pick(city); return withZ(r.pts[0], r.z ? r.z[0] : 0); };
const outerPt = () => { for (;;) { const r = pick(roadNet), p = pick(r.pts); if (!inBounds(p, 800)) return p; } };
const LM = Object.fromEntries(map.meta.landmarks.map((l) => [l.name, [l.x, l.y]]));
const pairs = [];
const add = (set, name, a, b) => pairs.push({ set, name, a, b });

// 1. de stad: vaste herkenbare plekken kriskras en willekeurige straten
const lmNames = Object.keys(LM);
for (let i = 0; i < lmNames.length; i++) for (const k of [3, 7]) {
  const j = (i + k) % lmNames.length;
  add('stad-plekken', `${lmNames[i]} -> ${lmNames[j]}`, LM[lmNames[i]], LM[lmNames[j]]);
}
for (let i = 0; i < 60; i++) add('stad-straten', `straat #${i}`, cityPt(), cityPt());

// 2. het geval uit #320: van het centrum naar het zuidoosten (Bergenweg, Eemskanaal, Euroborg) en terug
const ZO = {
  'Bergenweg west': [1929.4, 717.6], 'Bergenweg oost': [2211.3, 624.8], 'Bergenweg schakel': [2037.3, 717],
  Eemskanaal: [1190.6, 134], Euroborg: LM.Euroborg, 'Verlengde Hereweg': [891.2, 2060.6], 'Hereweg zuid': [433.3, 959.7],
};
for (const [n, p] of Object.entries(ZO)) {
  for (const [from, fa] of [['Goudkantoor', LM.Goudkantoor], ['Grote Markt', LM['Grote Markt']], ['Hoofdstation', LM['Hoofdstation Groningen']]]) {
    add('zuidoost', `${from} -> ${n}`, fa, p);
    add('zuidoost', `${n} -> ${from}`, p, fa);
  }
}

// 3. dorpen: de padelcentra liggen in de dorpscentra van de provincie
const echt = JSON.parse(fs.readFileSync(new URL('../game/echteplekken.json', import.meta.url), 'utf8'));
const dorpen = [];
const seenPlaats = new Set();
for (const p of echt.padel || []) {
  if (p.soort !== 'centrum' || seenPlaats.has(p.plaats)) continue;
  seenPlaats.add(p.plaats);
  dorpen.push({ naam: p.plaats, p: [p.x, p.y] });
}
dorpen.sort((u, v) => (u.naam < v.naam ? -1 : 1));
for (let i = 0; i < dorpen.length; i++) {
  add('dorpen', `stad -> ${dorpen[i].naam}`, LM['Grote Markt'], dorpen[i].p);
  add('dorpen', `${dorpen[i].naam} -> ${dorpen[(i * 7 + 3) % dorpen.length].naam}`, dorpen[i].p, dorpen[(i * 7 + 3) % dorpen.length].p);
}

// 4. de provincie: stad<->buiten, buiten<->buiten, dichtbij elkaar
for (let i = 0; i < 20; i++) add('provincie', `stad -> buiten #${i}`, cityPt(), outerPt());
for (let i = 0; i < 20; i++) add('provincie', `buiten -> stad #${i}`, outerPt(), cityPt());
for (let i = 0; i < 20; i++) {
  const a = outerPt();
  let b;
  do { b = outerPt(); } while (Math.hypot(b[0] - a[0], b[1] - a[1]) > 15000);
  add('provincie', `buiten -> buiten #${i}`, a, b);
}

// 5. de A7 en andere snelwegen: punten op wegen van het type snelweg (kind 1) naar de stad en naar elkaar
const mw = roadNet.filter((r) => r.kind === 1);
const mwPt = () => { const r = pick(mw); return r.pts[Math.floor(r.pts.length / 2)]; };
for (let i = 0; i < 12; i++) add('A7', `snelweg -> stad #${i}`, mwPt(), cityPt());
for (let i = 0; i < 8; i++) add('A7', `stad -> snelweg #${i}`, cityPt(), mwPt());
for (let i = 0; i < 8; i++) add('A7', `snelweg -> snelweg #${i}`, mwPt(), mwPt());

// 6. bruggen: doelen aan beide kanten van een brug en op het brugdek
const { roadZAt } = await import('../game/js/elevation.js');
const bridges = city.filter((r) => r.bridge && r.pts.length >= 2 && !r.oneway);
for (let i = 0; i < 16; i++) {
  const r = pick(bridges), m = Math.floor(r.pts.length / 2);
  const a = r.pts[0], b = r.pts[r.pts.length - 1], mid = r.pts[m];
  add('bruggen', `brugeinde -> brugeinde #${i}`, cityPt(), withZ(a, r.z ? r.z[0] : 0));
  // een doel op het brugdek heeft de hoogte van het dek (zoals een klik op de kaart): de route eindigt op de brug, niet eronder
  add('bruggen', `brugmidden #${i}`, cityPt(), withZ(mid, roadZAt(r, mid[0], mid[1])));
}

// 7. water: doelen op het water (de route eindigt dan bij de aanlegplek) en aan de waterkant
const inWater = [];
{
  const { isInWater } = await import('../game/js/util.js');
  for (let tries = 0; inWater.length < 24 && tries < 40000; tries++) {
    const p = [MB[0] + rnd() * (MB[2] - MB[0]), MB[1] + rnd() * (MB[3] - MB[1])];
    if (isInWater(map, p[0], p[1])) inWater.push(p);
  }
}
inWater.forEach((p, i) => add('water', `doel op water #${i}`, cityPt(), p));

// ---- de planner
let clock = 0;
const realNow = performance.now.bind(performance);
performance.now = () => realNow() + clock * 1000;
const DRIVE = { isBike: false, isBoat: false };
const rows = [];
// het doel is een plek op de kaart (setUserWaypoint, zoals de speler er een klikt), de speler zit in een auto
const plan = (a, b) => {
  clock += 100;
  const w = { map, time: 0, health: 100, player: { x: a[0], y: a[1], inVehicle: { ...DRIVE, z: a.z || 0 } }, addMessage: () => {} };
  R.setUserWaypoint(b[0], b[1], 'doel', b.z ? b.z : undefined);
  R.updateRouting(0.1, w);
  return R.getActiveRoute();
};
const MIN_CROW = 80;
const polyLen = (pts) => { let l = 0; for (let i = 1; i < pts.length; i++) l += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return l; };
for (const pr of pairs) {
  const crow = Math.hypot(pr.a[0] - pr.b[0], pr.a[1] - pr.b[1]);
  if (crow < MIN_CROW) continue;
  // een doel op het water: de route eindigt bij de aanlegplek
  const berth = R.berthFor(map, pr.b[0], pr.b[1]);
  const goal = berth ? [berth.x, berth.y] : pr.b;
  const r = plan(pr.a, pr.b);
  const len = r && r.pts.length > 1 ? r.length : NaN;
  // de kortste weg tussen de uiteinden van de route zelf (waar de planner het doel op het net zette), plus de rechte stukjes
  // van die uiteinden naar het dichtstbijzijnde wegstuk: een doel op een autovrij plein of aan het water heeft geen eigen weg
  let ref = Infinity, snapA = Infinity, snapB = Infinity, gap = Infinity;
  if (Number.isFinite(len)) {
    const e0 = r.pts[0], e1 = r.pts[r.pts.length - 1];
    const sa = snapRef(G, e0[0], e0[1], 3000, { z: pr.a.z || 0 }), sb = snapRef(G, e1[0], e1[1], 3000, { z: pr.b.z || 0 });
    if (sa && sb) ref = refLength(G, sa, sb) + sa.d + sb.d;
    // een doel dat buiten de weg valt: hoever het van het begin en het eind van de route ligt
    const ga = snapRef(G, pr.a[0], pr.a[1], 3000, { z: pr.a.z || 0 }), gb = snapRef(G, goal[0], goal[1], 3000, { z: pr.b.z || 0 });
    snapA = ga ? ga.d : Infinity; snapB = gb ? gb.d : Infinity;
    gap = Math.hypot(e1[0] - goal[0], e1[1] - goal[1]);
  } else {
    const ga = snapRef(G, pr.a[0], pr.a[1], 3000, { z: pr.a.z || 0 }), gb = snapRef(G, goal[0], goal[1], 3000, { z: pr.b.z || 0 });
    if (ga && gb) ref = refLength(G, ga, gb);
  }
  if (DEBUG && pr.name.includes(DEBUG) && Number.isFinite(len)) {
    const nm = (x) => `${x.name || '?'}(${x.type || 'k' + x.kind}${x.oneway ? ',1w' : ''}${x.bridge ? ',br' : ''})`;
    const seq = (roads) => roads.map(nm).filter((n, i, a) => n !== a[i - 1]).join(' > ');
    const path = [], e0 = r.pts[0], e1 = r.pts[r.pts.length - 1];
    const sa = snapRef(G, e0[0], e0[1], 3000, { z: pr.a.z || 0 }), sb = snapRef(G, e1[0], e1[1], 3000, { z: pr.b.z || 0 });
    refLength(G, sa, sb, path);
    const lr = R.planLandRoute(map, 'drive', pr.a, pr.b, { az: pr.a.z, bz: pr.b.z });
    console.log(`DEBUG ${pr.name}: route ${Math.round(len)} m (compromis ${r.compromise || 'geen'}), stad-planner ${lr ? Math.round(polyLen(lr.pts)) : '-'} m, kortste ${Math.round(ref)} m, begin ${e0.map(Math.round)} eind ${e1.map(Math.round)}, z ${pr.a.z || 0} -> ${pr.b.z || 0}`);
    console.log('  KORTSTE ' + seq(path.map((ri) => G.roads[ri])));
    if (lr) console.log('  PLANNER ' + seq(lr.roads));
  }
  // heeft de stadsgraaf zelf (streng: planLandRoute) een weg tussen de uiteinden? Zo niet, dan sluit het provincienet het gat
  // (een eenrichtingsafrit die de stadskaart aan de rand afsnijdt) en is dat net de enige bron voor de route.
  let cityGap = false;
  if (Number.isFinite(len) && inBounds(pr.a) && inBounds(goal)) {
    const e0 = r.pts[0], e1 = r.pts[r.pts.length - 1];
    cityGap = !R.planLandRoute(map, 'drive', e0, e1, { az: pr.a.z, bz: pr.b.z });
  }
  rows.push({ ...pr, crow, len, ref, ratio: len / ref, vsCrow: len / crow, snapA, snapB, gap, cityGap });
}

// ---- het rapport
const finite = rows.filter((x) => Number.isFinite(x.ratio));
const noRoute = rows.filter((x) => !Number.isFinite(x.len));
const noRef = rows.filter((x) => Number.isFinite(x.len) && !Number.isFinite(x.ref));
const bad = finite.filter((x) => x.ratio > (x.cityGap ? MAX_GAP : MAX));
const gaps = finite.filter((x) => x.cityGap);
const med = (arr) => (arr.length ? arr.slice().sort((u, v) => u - v)[Math.floor(arr.length / 2)] : NaN);
const f2 = (v) => (Number.isFinite(v) ? v.toFixed(2) : '-');
console.log(`${pairs.length} paren, ${rows.length} gepland (hemelsbreed >= ${MIN_CROW} m), ${finite.length} met een kortste weg in de graaf`);
console.log('set            paren  mediaan  p90   max   >' + MAX + '  mediaan-vs-hemelsbreed  geen-route');
for (const set of [...new Set(rows.map((x) => x.set))]) {
  const s = rows.filter((x) => x.set === set), sf = s.filter((x) => Number.isFinite(x.ratio)), ratios = sf.map((x) => x.ratio);
  const p90 = ratios.length ? ratios.slice().sort((u, v) => u - v)[Math.floor(ratios.length * 0.9)] : NaN;
  console.log(`${set.padEnd(14)} ${String(s.length).padStart(5)}  ${f2(med(ratios)).padStart(7)} ${f2(p90).padStart(5)} ${f2(Math.max(...ratios)).padStart(5)} ${String(sf.filter((x) => x.ratio > MAX).length).padStart(5)} ${f2(med(s.filter((x) => Number.isFinite(x.vsCrow)).map((x) => x.vsCrow))).padStart(20)} ${String(s.filter((x) => !Number.isFinite(x.len)).length).padStart(10)}`);
}
console.log(`${gaps.length} paren zonder weg in de stadsgraaf alleen (provincienet sluit het gat), grootste omweg daarvan ${f2(Math.max(0, ...gaps.map((x) => x.ratio)))}x; zonder gat ${f2(Math.max(0, ...finite.filter((x) => !x.cityGap).map((x) => x.ratio)))}x`);
const worst = finite.slice().sort((u, v) => v.ratio - u.ratio).slice(0, VERBOSE ? 40 : 10);
console.log('\nlangste omwegen (route / kortste weg):');
for (const x of worst) console.log(`  ${f2(x.ratio)}x  ${Math.round(x.len)} m tegen ${Math.round(x.ref)} m (hemelsbreed ${Math.round(x.crow)} m)  [${x.set}] ${x.name}  [${x.a.map((v) => v.toFixed(2))}] -> [${x.b.map((v) => v.toFixed(2))}]`);
for (const x of noRoute) console.log(`  GEEN ROUTE  [${x.set}] ${x.name}  [${x.a.map((v) => v.toFixed(2))}] -> [${x.b.map((v) => v.toFixed(2))}]${Number.isFinite(x.ref) ? ' (de graaf heeft er wel een: ' + Math.round(x.ref) + ' m)' : ''}`);
for (const x of noRef) if (VERBOSE) console.log(`  geen kortste weg in de graaf (los stuk of doel te ver van de weg): [${x.set}] ${x.name}`);

// ---- lopen en fietsen in de stad: dezelfde vraag voor de andere vervoerswijzen (de stadsgraaf, zuivere lengte)
// lopen: alles wat roadAllowed('lopen') toelaat, beide richtingen; fietsen: roadAllowed('fiets') met de eenrichting van oneWayFor.
// De fietsroute mag de fietspaden voortrekken en de grote wegen mijden (BIKE_COST in routing.js), dus daar geldt een ruimere grens.
const MAX_BIKE = arg('maxbike', 1.6);
const NO_MW = /^(motorway|trunk)/;
const MODE_SETS = [
  { name: 'lopen', inVehicle: null, bound: MAX, ok: (r) => roadAllowed(r, 'lopen') !== false && !r.busOnly && !(r.z && r.cat === 'major' && (r.oneway || NO_MW.test(r.type))), one: () => false },
  { name: 'fietsen', inVehicle: { isBike: true, isBoat: false }, bound: MAX_BIKE, ok: (r) => roadAllowed(r, 'fiets') !== false && !r.busOnly && !(r.z && r.cat === 'major' && NO_MW.test(r.type)), one: (r) => oneWayFor(r, 'fiets') },
];
const modeRows = [];
for (const m of MODE_SETS) {
  const roads = map.roads.filter(m.ok).map((r) => Object.assign(Object.create(r), { oneway: m.one(r) }));
  const GM = buildRef(roads, (r, ax, ay, bx, by) => !r.bridge && R.throughBuilding(map, ax, ay, bx, by));
  const pool = roads.filter((r) => r.pts.length >= 2);
  const pairsM = [];
  for (let i = 0; i < 40; i++) { const a = pick(pool), b = pick(pool); pairsM.push(['straat #' + i, withZ(a.pts[0], a.z ? a.z[0] : 0), withZ(b.pts[0], b.z ? b.z[0] : 0)]); }
  for (let i = 0; i < lmNames.length; i++) { const j = (i + 5) % lmNames.length; pairsM.push([lmNames[i] + ' -> ' + lmNames[j], LM[lmNames[i]], LM[lmNames[j]]]); }
  for (const [name, a, b] of pairsM) {
    if (Math.hypot(a[0] - b[0], a[1] - b[1]) < MIN_CROW) continue;
    clock += 100;
    const w = { map, time: 0, health: 100, player: { x: a[0], y: a[1], gz: a.z || 0, inVehicle: m.inVehicle ? { ...m.inVehicle, z: a.z || 0 } : null }, addMessage: () => {} };
    R.setUserWaypoint(b[0], b[1], 'doel', b.z ? b.z : undefined);
    R.updateRouting(0.1, w);
    const r = R.getActiveRoute();
    if (!r || r.pts.length < 2) { modeRows.push({ mode: m.name, name, len: NaN, ref: Infinity, ratio: NaN, bound: m.bound, a, b }); continue; }
    const e0 = r.pts[0], e1 = r.pts[r.pts.length - 1];
    const sa = snapRef(GM, e0[0], e0[1], 3000, { z: a.z || 0 }), sb = snapRef(GM, e1[0], e1[1], 3000, { z: b.z || 0 });
    const ref = sa && sb ? refLength(GM, sa, sb) + sa.d + sb.d : Infinity;
    modeRows.push({ mode: m.name, name, len: r.length, ref, ratio: r.length / ref, bound: m.bound, a, b });
  }
}
R.clearUserWaypoint();
console.log('\nvervoer  paren  mediaan  max   grens  geen-route');
for (const m of MODE_SETS) {
  const s = modeRows.filter((x) => x.mode === m.name), ratios = s.filter((x) => Number.isFinite(x.ratio)).map((x) => x.ratio);
  console.log(`${m.name.padEnd(8)} ${String(s.length).padStart(5)} ${f2(med(ratios)).padStart(8)} ${f2(Math.max(0, ...ratios)).padStart(5)} ${f2(m.bound).padStart(6)} ${String(s.filter((x) => !Number.isFinite(x.len)).length).padStart(10)}`);
}
const badMode = modeRows.filter((x) => Number.isFinite(x.ratio) && x.ratio > x.bound);
for (const x of modeRows.filter((y) => Number.isFinite(y.ratio)).sort((u, v) => v.ratio - u.ratio).slice(0, VERBOSE ? 12 : 4)) console.log(`  ${f2(x.ratio)}x ${x.mode}: ${Math.round(x.len)} m tegen ${Math.round(x.ref)} m  ${x.name}  [${x.a.map((v) => v.toFixed(2))}] -> [${x.b.map((v) => v.toFixed(2))}]`);

let fails = 0;
if (badMode.length) { fails++; console.log(`FAIL ${badMode.length} lopen/fietsen-routes boven de grens`); for (const x of badMode) console.log(`  ${f2(x.ratio)}x ${x.mode} ${x.name}`); }
// de route is nooit meer dan MAX keer de kortste weg
if (bad.length) { fails++; console.log(`\nFAIL ${bad.length} routes langer dan ${MAX}x (${MAX_GAP}x bij een gat in de stadsgraaf) de kortste weg`); for (const x of bad) console.log(`  ${f2(x.ratio)}x [${x.set}] ${x.name}${x.cityGap ? " (gat in de stadsgraaf)" : ""}`); }
// een route waar de graaf er wel een heeft, is er ook (de verhalen en kaart vragen erom)
const missing = noRoute.filter((x) => Number.isFinite(x.ref));
if (missing.length) { fails++; console.log(`FAIL ${missing.length} paren zonder route terwijl de graaf er een heeft`); }
// genoeg paren
if (pairs.length < 200) { fails++; console.log(`FAIL maar ${pairs.length} paren (minimaal 200)`); }
console.log(fails ? `\nroute_quality_test FAIL (${fails})` : `\nroute_quality_test ok: ${finite.length} paren, grootste omweg ${f2(Math.max(...finite.map((x) => x.ratio)))}x, mediaan ${f2(med(finite.map((x) => x.ratio)))}x`);
process.exit(fails ? 1 : 0);
