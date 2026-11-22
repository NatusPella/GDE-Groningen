// Pure test van de bochtbogen (game/js/vehicle/turnarcs.js, #1049): raaklijn, straal, ruimer uithalen bij een gevel, geen boog bij rechtdoor of keren.
//   node scripts/turnarcs_test.mjs
import { turnArc, facadeClearance, nearestOnArc, ARC_PTS } from '../game/js/vehicle/turnarcs.js';
let n = 0, fails = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FAIL', m); } };
const near = (a, b, e = 1e-6) => Math.abs(a - b) <= e;

// rechtsaf: noord op x=1.6, dan oost op y=-1.6 (knooppunt op 0,0)
const A = [1.6, -30], J = [1.6, 0], O = [0, -1.6], B = [30, -1.6];
const a = turnArc(A, J, O, B, { R0: 6, margin: 0, clearance: null });
ok(a && a.pts.length === 2 * ARC_PTS, 'rechtsaf geeft een boog');
ok(near(a.theta, Math.PI / 2), 'draaiing is 90 graden');
ok(near(a.R, 6) && near(a.T, 6), 'straal 6 geeft raaklengte 6 bij 90 graden');
ok(near(a.pts[0], 1.6) && near(a.pts[1], -1.6 - 6), 'de boog begint op de inkomende rijstrooklijn, T voor het snijpunt');
ok(near(a.pts[2 * 4], 1.6 + 6) && near(a.pts[2 * 4 + 1], -1.6), 'de boog eindigt op de uitgaande rijstrooklijn, T voorbij het snijpunt');
// elk punt ligt op straal R van het middelpunt (7.6, -7.6)
let onCircle = true;
for (let k = 0; k < ARC_PTS; k++) if (!near(Math.hypot(a.pts[2 * k] - 7.6, a.pts[2 * k + 1] + 7.6), 6)) onCircle = false;
ok(onCircle, 'alle bogenpunten liggen op de cirkel');
ok(Math.hypot(a.pts[4] - 1.6, a.pts[5] + 1.6) > 0.5, 'de apex ligt niet op het scherpe hoekpunt');

// linksaf wordt gespiegeld
const l = turnArc([-1.6, -30], [-1.6, 0], [0, 1.6], [-30, 1.6], { R0: 6, margin: 0, clearance: null });
ok(l && near(l.theta, Math.PI / 2) && l.pts[2 * 4] < -1.6, 'linksaf buigt naar links');

// rechtdoor en keren: geen boog
ok(turnArc([0, -30], [0, 0], [0, 0], [0, 30], { R0: 6, margin: 0 }) === null, 'rechtdoor geeft geen boog');
ok(turnArc([0, -30], [0, 0], [0, 0], [0, -30], { R0: 6, margin: 0 }) === null, 'keren geeft geen boog');
// te weinig ruimte: de raaklengte wordt beperkt tot 85% van het korte stuk
const kort = turnArc([1.6, -4], [1.6, 0], [0, -1.6], [30, -1.6], { R0: 6, margin: 0 });
ok(kort && kort.T <= 0.85 * 5.6 + 1e-9 && kort.R < 6, 'een kort stuk beperkt de straal');

// ruimer uithalen als de gevel te dichtbij komt: een gebouw in de binnenbocht
const huis = [{ pts: [[3.6, -3.6], [20, -3.6], [20, -20], [3.6, -20], [3.6, -3.6]] }];
const clear = (x, y) => facadeClearance(huis, x, y);
const smal = turnArc(A, J, O, B, { R0: 3, margin: 5, clearance: clear });
const eerste = turnArc(A, J, O, B, { R0: 3, margin: 0, clearance: clear });
ok(smal.R >= eerste.R, 'bij een gevel dichtbij wordt de straal niet kleiner');
ok(smal.clear >= eerste.clear - 1e-9, 'de gevelafstand is minstens zo groot als met de kleinste straal');
ok(facadeClearance([], 0, 0) === Infinity, 'zonder gebouw is de afstand oneindig');

// dichtstbijzijnde punt op de boog
const out = {};
nearestOnArc(a.pts, a.pts[0], a.pts[1], out);
ok(out.i === 0 && out.t === 0 && out.d < 1e-9, 'het beginpunt van de boog is het dichtstbij');
nearestOnArc(a.pts, a.pts[2 * 4], a.pts[2 * 4 + 1], out);
ok(out.i === ARC_PTS - 2 && out.t === 1, 'het eindpunt van de boog is het dichtstbij');
console.log(`turnarcs_test: ${n - fails}/${n}`);
process.exit(fails ? 1 : 0);
