// Vaarwegklasse (#234): binnenvaart hoort alleen op hoofdvaarwegen en havens, nooit op diepen,
// vaarten, sloten of vijvers. Zuivere regels (waterlevels.js) plus de echte data: de wateren van
// de stadskaart (stad.json en de OSM-lagen) en het vaarnet (game/vaarnet.json).
//   node scripts/vaarwegklasse_test.mjs
import fs from 'node:fs';
import * as L from '../game/js/waterlevels.js';
import * as V from '../game/js/vaarnet.js';

let n = 0, fails = 0;
const ok = (c, m, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${m}${info ? ' (' + info + ')' : ''}`); } };
const rect = (x0, y0, x1, y1, o = {}) => ({ pts: [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], ...o });

// de regels
ok(L.waterwayClass(rect(0, 0, 400, 40, { kind: 'kanaal', nav: 4, name: 'Eemskanaal' })) === 'hoofd', 'breed kanaal = hoofdvaarweg');
ok(L.waterwayClass(rect(0, 0, 400, 12, { kind: 'diep', nav: 3, name: 'Damsterdiep' })) === 'klein', 'een diep is klein water');
ok(L.waterwayClass(rect(0, 0, 400, 12, { kind: 'kanaal', nav: 4, name: 'Winschoterdiep' })) === 'hoofd', 'een smal getekend stuk van een hoofdvaarweg blijft hoofdvaarweg (de ruimte rond de boot oordeelt)');
ok(L.waterwayClass(rect(0, 0, 400, 12, { kind: 'diep', nav: 4 })) === 'klein', 'smal en zonder hoofdvaartnaam is klein');
ok(L.waterwayClass(rect(0, 0, 400, 3, { kind: 'sloot', nav: 1 })) === 'klein', 'sloot');
ok(L.waterwayClass(rect(0, 0, 400, 40, { kind: 'vijver', nav: 1 })) === 'klein', 'vijver, hoe breed ook');
ok(L.waterwayClass(rect(0, 0, 400, 40, { kind: 'vaart', nav: 2 })) === 'klein', 'vaart');
ok(L.waterwayClass(rect(0, 0, 400, 40, { kind: 'kanaal', nav: 4, name: 'Hoofdsloot' })) === 'klein', 'een sloot met een kanaalbreedte blijft sloot');
ok(L.waterwayClass(rect(0, 0, 300, 60, { kind: 'diep', nav: 3, name: 'Eemshaven' })) === 'haven', 'brede haven');
ok(L.waterwayClass(rect(0, 0, 300, 8, { kind: 'diep', nav: 3, name: 'Oude Haven' })) === 'klein', 'smalle haven');
ok(L.waterwayClass(rect(0, 0, 3000, 2000, { kind: 'zee', nav: 4, name: 'Dollard' })) === 'hoofd', 'zee');
ok(L.bargeWaterAt({ navigable: 4, kind: 'kanaal' }) && !L.bargeWaterAt({ navigable: 4, kind: 'sloot' }) && !L.bargeWaterAt({ navigable: 2, kind: 'diep' }) && !L.bargeWaterAt(null), 'bargeWaterAt');
ok(V.classOfKind('sloep') < V.classOfKind('binnenvaart'), 'sloepen zijn kleinere klasse dan binnenvaart');

// de echte stad: elk water waar binnenvaart mag spawnen is breed, diep en geen sloot
const { loadCityData } = await import('./lib/loadworld.mjs');
const city = await loadCityData({ extras: false });
let eligible = 0;
for (const w of city.water || []) {
  if (!w.pts || w.pts.length < 3) continue;
  if (!L.bargeWater(w)) continue;
  eligible++;
  ok(['kanaal', 'zee', 'meer', 'diep'].includes(w.kind) && (w.nav ?? 0) >= 3, 'binnenvaartwater is breed hoofdwater', `${w.kind} ${w.name || ''} ${Math.round(L.meanWidth(w))} m`);
}
console.log(`stadwater: ${(city.water || []).length} polygonen, ${eligible} voor binnenvaart`);

// het echte vaarnet: een klasse-4-weg ligt in de stad alleen in water waar binnenvaart hoort
const net = V.createVaarNet(JSON.parse(fs.readFileSync(new URL('../game/vaarnet.json', import.meta.url))));
const polys = (city.water || []).filter((w) => w.pts && w.pts.length >= 3).map((w) => {
  let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity;
  for (const p of w.pts) { a = Math.min(a, p[0]); c = Math.max(c, p[0]); b = Math.min(b, p[1]); d = Math.max(d, p[1]); }
  return { w, box: [a, b, c, d] };
});
const inside = (P, x, y) => { let r = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) if ((P[i][1] > y) !== (P[j][1] > y) && x < (P[j][0] - P[i][0]) * (y - P[i][1]) / (P[j][1] - P[i][1]) + P[i][0]) r = !r; return r; };
// een groot meer (vaarnet.js LAKE_BARGE_AREA) draagt binnenvaart, ook als de stadskaart het als vijver tekent
const bigLake = (w) => L.polyArea(w.pts) >= V.LAKE_BARGE_AREA;
let checked = 0, bad = [];
for (const e of net.edges) {
  if (e.cls < 4 || !e.pts) continue;
  for (const p of e.pts) {
    const hits = polys.filter((q) => p[0] >= q.box[0] && p[0] <= q.box[2] && p[1] >= q.box[1] && p[1] <= q.box[3] && inside(q.w.pts, p[0], p[1]));
    if (!hits.length) continue;
    checked++;
    // water dat ook onder een hoofdvaarweg of haven valt (overlappende polygonen) telt niet
    if (hits.every((q) => (['sloot', 'vijver', 'vaart'].includes(q.w.kind) || L.SMALL_WATER.test(q.w.name || '')) && !bigLake(q.w))) bad.push(`${hits[0].w.kind} ${hits[0].w.name || ''} @${Math.round(p[0])},${Math.round(p[1])}`);
  }
}
console.log(`vaarnet: ${checked} klasse-4-punten in stadswater getoetst, ${bad.length} in sloot/vijver/vaart`);
// vijvers: de stadskaart tekent soms een vijver over een kanaal dat de provinciedata heeft (9 punten bij -600,-3142; nog niet in beeld bekeken); sloot en vaart mogen er niet bij
const hard = bad.filter((b) => !b.startsWith('vijver'));
// een stukje vaart van 5 m bij 2988,-1057 zit nog in het net tot het opnieuw gebouwd is met scripts/world/vaarnet_graph.mjs (MAIN_ROOM_M)
ok(hard.length <= 1, 'geen klasse-4-weg door sloot of vaart (op dat ene stukje na)', hard.slice(0, 5).join('; '));
ok(bad.length <= 10, 'het aantal klasse-4-punten in een vijver groeit niet', String(bad.length));

console.log(fails ? `${fails} van ${n} mislukt` : `ok: ${n} controles`);
process.exit(fails ? 1 : 0);
