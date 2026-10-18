// Padel, de pure regels (#177): telling, ondergrepen serve, servicevak, glas en gaas.
//   node scripts/padelrules_test.mjs
import * as R from '../game/js/padelrules.js';

let bad = 0;
const check = (name, ok, info = '') => { if (!ok) { bad++; console.log('FAIL', name, info); } };

// --- telling ------------------------------------------------------------------------------------
{
  let st = { points: [0, 0], games: [0, 0] };
  const run = (...teams) => { for (const t of teams) st = { points: [], games: [], ...R.scorePoint(st, t) }; };
  run(0, 0, 0);
  check('40-0 telt 15-30-40', R.pointCall(st.points, 0) === '40' && R.pointCall(st.points, 1) === '0');
  run(0);
  check('vier punten is een game', st.games[0] === 1 && st.points[0] === 0 && st.points[1] === 0);
  // 40-40: een golden point beslist
  st = { points: [0, 0], games: [0, 0] };
  run(0, 1, 0, 1, 0, 1);
  check('40-40 is GP', R.pointCall(st.points, 0) === 'GP' && R.pointCall(st.points, 1) === 'GP', JSON.stringify(st));
  const gp = R.scorePoint(st, 1);
  check('het golden point beslist de game', gp.gameWon && gp.games[1] === 1 && gp.golden);
  check('geen voordeel: 3-3 is nooit 4-3 zonder game', R.scorePoint({ points: [3, 2], games: [0, 0] }, 0).gameWon);
  // een korte set: vier games
  const set = R.scorePoint({ points: [3, 0], games: [3, 2] }, 0);
  check('de vierde game wint de set', set.over && set.games[0] === 4);
  check('de derde game niet', !R.scorePoint({ points: [3, 0], games: [2, 2] }, 0).over);
  check('de uitslag wordt niet gemuteerd', (() => { const a = { points: [3, 0], games: [1, 1] }; R.scorePoint(a, 0); return a.points[0] === 3 && a.games[0] === 1; })());
  // een heel potje: met een vaste volgorde eindigt de set na 16 punten (4 x 4)
  let s2 = { points: [0, 0], games: [0, 0] }, n = 0, over = false;
  while (!over && n < 200) { const r = R.scorePoint(s2, 0); s2 = r; over = r.over; n++; }
  check('vier games van vier punten', n === 16 && s2.games[0] === 4, n);
  // wie wil kan het in elke volgorde spelen: het eindigt altijd
  let seed = 3, ended = 0;
  for (let m = 0; m < 400; m++) {
    let q = { points: [0, 0], games: [0, 0] }, k = 0, o = false;
    while (!o && k < 400) { seed = (seed * 1664525 + 1013904223) >>> 0; const r = R.scorePoint(q, seed >>> 31); q = r; o = r.over; k++; }
    if (o && Math.max(...q.games) === R.SET_GAMES && Math.min(...q.games) <= R.SET_GAMES - 1) ended++;
  }
  check('elke willekeurige set eindigt netjes (4-0..4-3)', ended === 400, ended);
}

// --- serve ---------------------------------------------------------------------------------------
{
  check('serve: eerst laten stuiteren', R.judgeServeHit({ bounced: false, z: 0.5 }) === 'te vroeg');
  check('serve: niet boven de heup', R.judgeServeHit({ bounced: true, z: 1.4 }) === 'te hoog');
  check('serve: na de stuit onder de heup is goed', R.judgeServeHit({ bounced: true, z: 0.6 }) === 'ok');
  // team 0 slaat vanaf rechts (u > 0) schuin naar het linker vak aan de overkant
  check('servicevak: diagonaal, achter het net', R.serveInBox(2.2, 0, -2.5, 4) && R.serveInBox(2.2, 0, -0.1, 6.9));
  check('servicevak: niet in het eigen diagonaal-vak aan dezelfde kant', !R.serveInBox(2.2, 0, 2.5, 4));
  check('servicevak: niet voorbij de servicelijn (6,95 m)', !R.serveInBox(2.2, 0, -2.5, 7.4));
  check('servicevak: niet op de verkeerde helft', !R.serveInBox(2.2, 0, -2.5, -4));
  check('servicevak team 1 spiegelt', R.serveInBox(-2.2, 1, 2.5, -4) && !R.serveInBox(-2.2, 1, -2.5, -4) && !R.serveInBox(-2.2, 1, 2.5, 4));
  const box = R.serviceBox(-1, 0);
  check('servicevak: vanaf links het rechter vak', box.u0 === 0 && box.u1 === R.COURT.W / 2 && box.v0 === 0 && box.v1 === R.COURT.SERVICE);
  let f = R.serveFault(0);
  check('serve: een fout is een tweede serve', !f.double && f.faults === 1);
  f = R.serveFault(f.faults);
  check('serve: twee fouten is een punt', f.double && f.faults === 0);
}

// --- glas en gaas --------------------------------------------------------------------------------
{
  check('glas tot 3 m, daarboven gaas', R.wallKind(1).kind === 'glas' && R.wallKind(3).kind === 'glas' && R.wallKind(3.5).kind === 'gaas');
  check('glas veert meer dan gaas', R.wallKind(1).rest > R.wallKind(3.5).rest);
  check('terugspelen: na een stuit mag de bal tegen het glas', R.judgeWall({ z: 1.2, side: 1, hitter: 0, bounces: 1 }).play === true);
  check('direct tegen het glas op de overkant verliest de slaande partij', R.judgeWall({ z: 1.2, side: 1, hitter: 0, bounces: 0 }).point === 1);
  check('tegen het eigen glas voor de stuit mag nog', R.judgeWall({ z: 1.2, side: 0, hitter: 0, bounces: 0 }).play === true);
  check('over het glas na een stuit is een winnaar voor de slaande partij', R.judgeWall({ z: 4.5, side: 1, hitter: 0, bounces: 1 }).point === 0);
  check('over het glas zonder stuit is uit', R.judgeWall({ z: 4.5, side: 1, hitter: 0, bounces: 0 }).point === 1);
  check('baan van padelformaat', R.COURT.W === 10 && R.COURT.L === 20 && R.COURT.SERVICE === 6.95);
}

console.log(bad ? `padelrules: ${bad} FAILED` : 'padelrules: all passed');
process.exit(bad ? 1 : 0);
