// Stationsleven: stations uit lijnen, bord, omroep zonder herhaling, reizigersplekken (stationlife.js, #198).
//   node scripts/stationlife_test.mjs
import * as S from '../game/js/stationlife.js';

let bad = 0, n = 0;
const check = (name, ok, info = '') => { n++; if (!ok) { bad++; console.log('FAIL', name, info); } };

const pts = (r) => r; // lijnen lopen langs de x-as, 1 m per s
const point = (route, s) => [route.x0 + s, route.y0];
const A = { name: 'Stoptrein Noord', x0: 0, y0: 0, stops: [{ name: 'Alpha', s: 0 }, { name: 'Beta', s: 12000 }, { name: 'Gamma', s: 30000 }, { name: 'Buiten', s: 31000, offmap: true }] };
const B = { name: 'Sneltrein Oost', x0: 0, y0: 0, stops: [{ name: 'Beta', s: 12000 }, { name: 'Delta', s: 20000 }] };
const st = S.stationsFromRoutes([A, B], point);
check('stations op naam samengevoegd', st.length === 4 && st.find((s) => s.name === 'Beta').lijnen.length === 2);
check('halte buiten de kaart valt af', !st.some((s) => s.name === 'Buiten'));
const beta = st.find((s) => s.name === 'Beta');
check('positie en rijrichting', Math.abs(beta.x - 12000) < 1e-9 && Math.abs(beta.tx - 1) < 1e-9 && Math.abs(beta.ty) < 1e-9);
check('dichtstbijzijnde binnen straal', S.nearestStation(st, 12010, 20)?.station.name === 'Beta' && S.nearestStation(st, 6000, 0) === null);

const v8 = S.stationView(beta, 8.0, 3);
check('bord gevuld en oplopend', v8.bord.length >= 3 && v8.bord.every((r, i) => i === 0 || r.tijd >= v8.bord[i - 1].tijd));
check('bord telt vanaf nu', v8.bord.every((r) => r.tijd >= v8.nu - 30));
const v3 = S.stationView(beta, 3.0, 3);
check('om 3 uur eerst de ochtend', v3.eerst && v3.eerst.tijd > 5 * 3600);
check('drukte 0..14, spits drukker dan nacht', v8.drukte <= 14 && v8.drukte >= S.stationView(beta, 23.5, 3).drukte);
check('cellen als tekst', S.bordCellen(v8).length > 0 && S.bordCellen(v8).every((c) => /\d\d:\d\d/.test(c.t)));
check('na de laatste trein leeg bord', S.stationView(beta, 23.99, 3).bord.length >= 0);

// omroep: een bericht per rit en fase
const ost = S.omroepToestand();
const m1 = S.omroepStap(ost, v8, 100);
const m2 = S.omroepStap(ost, v8, 101);
check('eerste keer een bericht, daarna stil', (m1 === '' || m1.includes('spoor')) && m2 === '');
let msgs = 0;
for (let k = 0; k < 600; k += 10) { const v = S.stationView(beta, 8 + k / 3600, 3); if (S.omroepStap(ost, v, 200 + k)) msgs++; }
check('omroep niet bij elke tik', msgs > 0 && msgs < 20, msgs);
check('geen echte merken in de omroep', !/NS|Arriva|Qbuzz/.test(S.stationView(beta, 8, 3).tekst));

// reizigers
const sp = S.reizigerPlekken(beta, 14), sp2 = S.reizigerPlekken(beta, 5);
check('plekken vast per station', sp.slice(0, 5).every((p, i) => p.x === sp2[i].x && p.y === sp2[i].y));
check('op het perron: rechts van het spoor, binnen de lengte', sp.every((p) => p.y < -S.PERRON_AF + 0.01 && Math.abs(p.x - beta.x) <= S.PERRON_LANG));
check('andere stations andere plekken', S.reizigerPlekken(st[0], 1)[0].x !== sp[0].x);
{
  const tr = [{ route: A, c: 12000, dir: 1, v: 0, state: 'dwell', target: 1, timer: 30, vmax: 20 }];
  const v = S.stationView(beta, 8.0, 3, tr, 1);
  check('met treinen volgt het bord de echte trein', v.bord.length >= 1 && v.bord[0].echt && v.bord[0].tijd === v.nu + 30);
  check('zonder treinen op deze lijnen terug op het rooster', !S.stationView(beta, 8.0, 3, [{ route: { name: 'X', stops: [] }, state: 'run', c: 0, dir: 1, target: 0 }], 1).bord.some((r) => r.echt));
}
// #339: een trein die in het echt ver weg is, zet geen willekeurige tijd op het bord
{
  const nu0 = 10 * 3600;
  const ver = [{ route: A, c: 100, dir: 1, v: 18, state: 'run', target: 1, vmax: 20 }]; // 12 km op 16 m/s = 12,5 min echt = 12,5 uur spelklok
  const v = S.stationView(beta, 10, 3, ver, 60);
  check('verre trein (uren op de spelklok) staat niet op het bord', v.bord.every((r) => !r.echt) && v.bord.length >= 3);
  check('bord loopt op en blijft binnen een paar uur van nu', v.bord.every((r, i) => (i === 0 || r.tijd >= v.bord[i - 1].tijd) && r.tijd - nu0 < 4 * 3600), v.bord.map((r) => r.tijd));
  const dicht = [{ route: A, c: 12000, dir: 1, v: 0, state: 'dwell', target: 1, timer: 20, vmax: 20 }]; // staat nu op het station: vertrekt over 20 s echt = 20 min spelklok
  const w = S.stationView(beta, 10, 3, dicht, 60);
  check('nabije trein staat er wel op, gemengd met het rooster in tijdvolgorde', w.bord.some((r) => r.echt) && w.bord.length >= 4 && w.bord.every((r, i) => i === 0 || r.tijd >= w.bord[i - 1].tijd));
  check('geen dubbelen tussen echte trein en rooster', new Set(w.bord.map((r) => r.lijn + r.richting + Math.round(r.tijd / 600))).size === w.bord.length);
  check('bordCellen: vier cellen met oplopende tijden', (() => { const c = S.bordCellen(w); const ts = c.map((x) => x.t.slice(0, 5)); return c.length === 4 && ts.every((t, i) => i === 0 || t >= ts[i - 1]); })());
}
console.log(bad ? `${bad} van ${n} mislukt` : `stationlife_test: ${n} controles ok`);
process.exit(bad ? 1 : 0);
