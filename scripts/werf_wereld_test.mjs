// Scheepswerf De Kielhaal (#398) op de echte tegels: ligt voor de kade genoeg diep water voor de lancering, ligt er op de helling en
// langs het schip geen gebouw, en vaart het schip vanaf de basin over het vaarnet naar de Eems? Leest de tegels van game/world,
// GAME_WORLD of --world; zonder wereld SKIP.
//   node scripts/werf_wereld_test.mjs [--world=<map>]
import fs from 'node:fs';
import path from 'node:path';
import './node3d.mjs';
import { fileURLToPath } from 'node:url';
import { heeftTegels, leesTegelRijen } from './lib/tegelrijen.mjs';
import { maakHuizenIndex } from './lib/huizenindex.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const dir = path.resolve(arg('world', process.env.GAME_WORLD || path.join(ROOT, 'game', 'world')));
if (!heeftTegels(dir)) { console.log('SKIP werf_wereld_test: geen wereld in ' + dir); process.exit(0); }
const W = await import('../game/js/werf.js');
const V = await import('../game/js/vaarnet.js');
const WL = await import('../game/js/werflive.js');
const { BOAT_KINDS } = await import('../game/js/boattypes.js');

let n = 0, bad = 0;
const check = (name, ok, info = '') => { n++; if (!ok) { bad++; console.log('FAIL', name, info); } };

const rows = await leesTegelRijen(dir);
const huizen = maakHuizenIndex(rows.buildings);
const inP = (x, y, P) => { let ins = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, yi] = P[i], [xj, yj] = P[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) ins = !ins; } return ins; };
const c = W.naarWereld(0, 0);
const water = rows.water.filter((w) => w.pts.some((p) => Math.hypot(p[0] - c.x, p[1] - c.y) < 400));
const waterOp = (x, y, nav = 0) => water.some((w) => (w.nav ?? 0) >= nav && inP(x, y, w.pts));
const doos = (l0, q0, l1, q1) => [W.naarWereld(l0, q0), W.naarWereld(l1, q0), W.naarWereld(l1, q1), W.naarWereld(l0, q1)].map((p) => [p.x, p.y]);

// de kade: land aan de ene kant, diep water (klasse 4) aan de andere
let oever = 0;
for (let l = -42; l <= 42; l += 7) { const a = W.naarWereld(l, 4), b = W.naarWereld(l, -4); if (waterOp(a.x, a.y)) oever++; if (!waterOp(b.x, b.y, 4)) oever++; }
check('de kade is een rechte oever: 4 m landinwaarts droog, 4 m uit de kade klasse-4-water, over 84 m', oever === 0, `${oever} punten fout`);
let vooruit = 0;
for (let q = -4; q >= -75; q -= 8) for (let l = -48; l <= 48; l += 8) { const p = W.naarWereld(l, q); if (!waterOp(p.x, p.y, 4)) vooruit++; }
check('voor de kade ligt tot 75 m en 48 m aan weerszijden klasse-4-water (de oever is grillig: hooguit twee meetpunten van de 90 vallen erbuiten)', vooruit <= 2, `${vooruit} punten zonder`);

// de helling en het schip: geen gebouw op de helling, onder de romp, in de basin
check('geen gebouw op de helling', !huizen.raakt(doos(-56, -1, 56, W.HELLING.lengte + 2)), huizen.gebouwen(doos(-56, -1, 56, W.HELLING.lengte + 2)).length + ' gebouwen');
for (const [naam, q] of [['aan het begin', W.TIJD.startQ], ['aan de rand', W.TIJD.randQ], ['drijvend', W.TIJD.eindQ]]) {
  const h = W.SCHIP.lengte / 2, b = W.SCHIP.breedte / 2 + 1;
  check(`geen gebouw onder het schip ${naam}`, !huizen.raakt(doos(-h, q - b, h, q + b)));
}
for (let u = 0; u <= W.T_RUST; u += 0.5) {
  const s = W.schipOp(u), h = W.SCHIP.lengte / 2, b = W.SCHIP.breedte / 2;
  if (huizen.raakt(doos(-h, s.q - b, h, s.q + b))) { check(`geen gebouw onder het schip op ${u} s`, false); break; }
}
// de basin: het water waar het schip terechtkomt is overal diep genoeg
let drooggelegd = 0;
for (let q = -4; q > -28; q -= 4) for (let l = -44; l <= 44; l += 11) { const p = W.naarWereld(l, q); if (!waterOp(p.x, p.y, 4)) drooggelegd++; }
check('het schip komt in water terecht (klasse 4, 28 m uit de kade)', drooggelegd === 0, String(drooggelegd));

// de golf over de kade: geen water in de strook waar de golf komt (anders spoelt ze over een sloot of de basin zelf)
let nat = 0;
for (let q = 4; q <= 70; q += 6) for (let l = -48; l <= 48; l += 8) { const p = W.naarWereld(l, q); if (waterOp(p.x, p.y)) nat++; }
check('landinwaarts van de kade is de strook van de golf droog land', nat === 0, `${nat} natte punten`);

// het vaarnet: van de basin naar de Eems
const net = V.createVaarNet(JSON.parse(fs.readFileSync(path.join(ROOT, 'game', 'vaarnet.json'), 'utf8')));
const uit = W.naarWereld(0, W.TIJD.eindQ);
const route = WL.vertrekRoute(net, V.planVaarRoute, uit.x, uit.y);
check('het schip heeft een route van de basin naar de Eems', !!route);
if (route) {
  let lengte = 0;
  for (let i = 1; i < route.length; i++) lengte += Math.hypot(route[i][0] - route[i - 1][0], route[i][1] - route[i - 1][1]);
  check('de route is een paar kilometer', lengte > 1500 && lengte < 20000, String(Math.round(lengte)));
  check('de route begint bij de basin', Math.hypot(route[0][0] - uit.x, route[0][1] - uit.y) < 250);
  const hub = net.nodes[net.hubs['Waddenzee bij Lauwersoog']];
  check('en eindigt bij de zee', Math.hypot(route[route.length - 1][0] - hub.x, route[route.length - 1][1] - hub.y) < 80);
}
// een zeeschip mag niet onder een vaste brug door waar het niet onder past
check('het zeeschip is klasse 4 en past onder 4,2 m', V.classOfKind({ kind: 'zeeschip' }) === 4 && V.airOfKind({ kind: 'zeeschip' }) === 4.2);
check('de tug ook', V.classOfKind({ kind: 'sleper' }) === 4);
check('het model is bekend', !!BOAT_KINDS[W.SCHIP.model]);

console.log(bad ? `${bad} van ${n} mislukt` : `werf_wereld_test ok (${n} checks)`);
process.exit(bad ? 1 : 0);
