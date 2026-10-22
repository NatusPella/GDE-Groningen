// Scheepswerf De Kielhaal (#398): de tijdlijn van het schip, de golf en de duw, de plek in de agenda. Puur, zonder wereld.
//   node scripts/werf_test.mjs
import './node3d.mjs';
import * as W from '../game/js/werf.js';
import { AGENDA, KINDS, centreOf, isActive, activeEvents, closures } from '../game/js/evenementen.js';
import { day } from '../game/js/calendar.js';
import { BOAT_KINDS } from '../game/js/boattypes.js';

let n = 0, bad = 0;
const check = (name, ok, info = '') => { n++; if (!ok) { bad++; console.log('FAIL', name, info); } };

// ---- de assen
check('N is een eenheidsvector', Math.abs(Math.hypot(W.N.x, W.N.y) - 1) < 1e-9);
check('T staat loodrecht op N', Math.abs(W.N.x * W.T.x + W.N.y * W.T.y) < 1e-9);
for (const [l, q] of [[0, 0], [10, 5], [-30, 22], [55, -13]]) {
  const w = W.naarWereld(l, q), r = W.naarWerf(w.x, w.y);
  check(`naarWerf(naarWereld(${l}, ${q}))`, Math.abs(r.l - l) < 1e-6 && Math.abs(r.q - q) < 1e-6);
}
const landin = W.naarWereld(0, 10), kade = W.naarWereld(0, 0);
check('landinwaarts is tegen de richting naar het water in', (landin.x - kade.x) * W.N.x + (landin.y - kade.y) * W.N.y < 0);
// het schip: lokaal +z (de zijde die naar het water kijkt) is N
check('de koers laat +z naar het water kijken', Math.abs(-Math.sin(W.KOERS) - W.N.x) < 1e-9 && Math.abs(Math.cos(W.KOERS) - W.N.y) < 1e-9);

// ---- de tijdlijn
const fases = [];
let vorige = null, maxStap = 0, minDy = 0, maxRol = 0;
for (let u = 0; u <= W.T_RUST + 10; u += 0.05) {
  const s = W.schipOp(u);
  check(`schipOp(${u.toFixed(2)}) is eindig`, [s.q, s.rol, s.stamp, s.dy].every(Number.isFinite));
  if (!fases.length || fases[fases.length - 1] !== s.fase) fases.push(s.fase);
  if (vorige) maxStap = Math.max(maxStap, Math.hypot(s.q - vorige.q, s.dy - vorige.dy, (s.rol - vorige.rol) * 8));
  vorige = s; minDy = Math.min(minDy, s.dy); maxRol = Math.max(maxRol, Math.abs(s.rol));
}
check('de fases komen in volgorde', fases.join(',') === 'wacht,glijdt,valt,drijft,rust', fases.join(','));
check('de beweging is vloeiend (geen sprong per 0,05 s)', maxStap < 1.2, maxStap.toFixed(2));
check('het schip duikt niet dieper dan zijn kiel', minDy > -2.2, minDy.toFixed(2));
check('het schip rolt hooguit 35 graden', maxRol < 0.62, maxRol.toFixed(2));
const s0 = W.schipOp(0), sEnd = W.schipOp(W.T_RUST + 5);
check('het schip begint op de helling', s0.q === W.TIJD.startQ && s0.dy > 6);
check('het schip eindigt drijvend op het water', Math.abs(sEnd.q - W.TIJD.eindQ) < 0.3 && Math.abs(sEnd.dy) < 0.05 && Math.abs(sEnd.rol) < 0.02);
check('het hele schip ligt aan het eind in het water (rand van de romp voorbij de kade)', sEnd.q + W.SCHIP.breedte / 2 < 0);
let qPrev = 1e9, mono = true;
for (let u = 0; u <= W.T_RUST; u += 0.1) { const q = W.schipOp(u).q; if (q > qPrev + 1e-9) mono = false; qPrev = q; }
check('het schip glijdt alleen richting het water', mono);
check('de plons is na de rand van de kade', W.T_PLONS > W.T_RAND && W.T_RAND > W.TIJD.wacht);

// ---- de golf
const x0 = 0.5;
check('geen golf voor de plons', W.golfDiepte(5, 0, -1) === 0 && W.golfDuw(5, 0, -1) === 0);
check('de golf is op de kade het hoogst', W.golfDiepte(2, 0, 1.2) > W.golfDiepte(40, 0, 4));
check('de golf dooft uit met de afstand', W.golfDiepte(W.GOLF.reik + 5, 0, 6) === 0 && W.golfDuw(W.GOLF.reik + 5, 0, 6) === 0);
check('op het water is er geen golfduw (alleen op het land)', W.golfDuw(-3, 0, 2) === 0 && W.golfDiepte(-3, 0, 2) === 0);
check('de golf komt niet ver langs de kade', W.golfDiepte(5, 150, 1.5) === 0 && W.golfDuw(5, 150, 1.5) === 0);
check('de diepte is nergens negatief of absurd', (() => { let ok = true; for (let q = 0; q <= 80; q += 4) for (let l = -90; l <= 90; l += 10) for (let x = 0; x <= 20; x += 0.5) { const d = W.golfDiepte(q, l, x); if (!(d >= 0 && d <= W.GOLF.hoogte + 1e-9)) ok = false; } return ok; })());
check('het water is na de golf weg', W.golfDiepte(5, 0, 18) < 0.12 && W.golfDiepte(30, 0, 18) < 0.12);
let maxDuw = 0, negatief = false;
for (let q = 0; q <= 80; q += 2) for (let l = -90; l <= 90; l += 10) for (let x = 0; x <= 20; x += 0.25) { const v = W.golfDuw(q, l, x); maxDuw = Math.max(maxDuw, v); if (v < 0) negatief = true; }
check('de duw is nooit negatief (nooit het water in) en begrensd', !negatief && maxDuw <= W.GOLF.duwMax + 1e-9 && maxDuw > 5, maxDuw.toFixed(1));

// duwStap: iemand op de kade
const vrij = () => true, geen = () => false;
let pos = W.naarWereld(0, 4), tot = 0;
const start = W.naarWerf(pos.x, pos.y);
for (let u = W.T_PLONS; u < W.T_GOLF_EINDE; u += 0.05) { const r = W.duwStap(pos.x, pos.y, u, 0.05, vrij); tot += Math.hypot(r.x - pos.x, r.y - pos.y); pos = { x: r.x, y: r.y }; }
const eind = W.naarWerf(pos.x, pos.y);
check('wie op de kade staat wordt landinwaarts geduwd', eind.q > start.q + 6, `${start.q.toFixed(1)} -> ${eind.q.toFixed(1)}`);
check('en blijft op dezelfde plek langs de kade', Math.abs(eind.l - start.l) < 0.5);
check('het is een duw van tientallen meters hooguit', eind.q - start.q < 45, (eind.q - start.q).toFixed(1));
pos = W.naarWereld(0, 4);
for (let u = W.T_PLONS; u < W.T_GOLF_EINDE; u += 0.05) { const r = W.duwStap(pos.x, pos.y, u, 0.05, geen); pos = { x: r.x, y: r.y }; }
check('waar geen ruimte is (water, gebouw) blijft iemand staan', Math.abs(W.naarWerf(pos.x, pos.y).q - 4) < 1e-6);
// ruim buiten bereik
const ver = W.naarWereld(0, 120);
check('ver landinwaarts voelt niemand iets', W.duwStap(ver.x, ver.y, W.T_PLONS + 3, 0.1, vrij).v === 0);

// ---- de menigte staat achter het hek
check('buitenGolf: de kade, de helling en het bereik van de golf horen er niet bij', !W.buitenGolf(...Object.values(W.naarWereld(0, 10))) && !W.buitenGolf(...Object.values(W.naarWereld(40, 60))));
check('buitenGolf: verder landinwaarts en langs de kade wel', W.buitenGolf(...Object.values(W.naarWereld(0, W.GOLF.reik + 10))) && W.buitenGolf(...Object.values(W.naarWereld(W.GOLF.breed + W.GOLF.uitloop + 12, 20))));
check('het hart van het evenement staat buiten de golf en de afsluiting dekt de kade', W.buitenGolf(...Object.values(W.naarWereld(0, W.HART_Q))) && W.HART_Q - KINDS.tewaterlating.closure < 0);

// ---- de dag
check('werfFase: geen evenement is leeg', W.werfFase(false, 15) === 'leeg');
check('werfFase: voor de lancering wacht het schip', W.werfFase(true, 14.2) === 'wacht');
check('werfFase: om drie uur komt het los', W.werfFase(true, W.LANCEERUUR) === 'nu' && W.werfFase(true, W.LANCEERUUR + 0.3) === 'nu');
check('werfFase: wie te laat is ziet een lege helling', W.werfFase(true, W.LANCEERUUR + W.LANCEER_NAVENSTER_UUR + 0.01) === 'voorbij');

// ---- de agenda
const werf = AGENDA.filter((e) => e.kind === 'tewaterlating');
check('drie tewaterlatingen in de zomer', werf.length === 3 && new Set(werf.map((e) => e.id)).size === 3);
check('de soort bestaat', !!KINDS.tewaterlating && KINDS.tewaterlating.closure >= 100 && KINDS.tewaterlating.traffic === 0);
for (const ev of werf) {
  const c = centreOf(ev), hart = W.naarWereld(0, W.HART_Q);
  check(`${ev.id}: het hart ligt op de helling`, Math.hypot(c.x - hart.x, c.y - hart.y) < 3, Math.hypot(c.x - hart.x, c.y - hart.y).toFixed(1));
  check(`${ev.id}: loopt over de lancering`, ev.hours[0] < W.LANCEERUUR && ev.hours[1] > W.LANCEERUUR + W.LANCEER_NAVENSTER_UUR + 0.5);
  check(`${ev.id}: staat op de werf`, ev.plaats === W.WERF.plaats);
  check(`${ev.id}: is actief om half drie op zijn dag`, isActive(ev, ev.from, 14.5) && !isActive(ev, ev.from + 1, 14.5));
  check(`${ev.id}: de weg is dicht bij de helling`, closures(ev.from, 15).some((c2) => c2.id === ev.id && c2.traffic === 0 && c2.r >= 100));
}
check('actieve werf-evenementen worden gevonden', activeEvents(day(8, 23), 15).some((e) => e.kind === 'tewaterlating'));
const dagen = werf.map((e) => e.from).sort((a, b) => a - b);
check('de lanceringen liggen verspreid (minstens twee weken uit elkaar)', dagen[1] - dagen[0] >= 12 && dagen[2] - dagen[1] >= 12, dagen.join(','));

// ---- het schip en zijn model
const M = BOAT_KINDS[W.SCHIP.model];
check('het gelanceerde schip is een groot zeeschip', M && M.kind === 'zeeschip' && M.len >= 80 && M.len === W.SCHIP.lengte && Math.abs(M.wid - W.SCHIP.breedte) < 1e-9);
check('de gelanceerde romp past tussen de rand van de basin en de helling', W.SCHIP.lengte / 2 < W.GOLF.breed);

console.log(bad ? `${bad} van ${n} mislukt` : `werf_test ok (${n} checks)`);
process.exit(bad ? 1 : 0);
