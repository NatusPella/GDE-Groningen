// Halteren van een lijnbus in het verkeer (wens eigenaar 23-11): afremmen, stoeprand, deuren, wachten, knipperen,
// invoegen; gemist, file voor de halte, live bus, ronde lijn. Deterministisch: een eendimensionale bus.
import { HALTE, makeHalteStaat, stapHalte, halteAfstand, remSnelheid } from '../game/js/busstop.js';

let fail = 0;
const check = (n, ok, x = '') => { if (!ok) { fail++; console.log('FAIL', n, x); } };

const lijn = { length: 1000, loop: false };
const stop = { s: 300 };
const DT = 1 / 30;

// rijdt een bus met cruise 12 m/s langs de lijn; hold(t) = extra rem (file), live = { stil(t) }
function rit({ cruise = 12, s0 = 100, max = 120, hold = null, live = null, dir = 1, lijnX = lijn, stopX = stop } = {}) {
  const r = { line: lijnX, s: s0, dir };
  const st = makeHalteStaat();
  let v = cruise, t = 0, maxRem = 0;
  const log = [];
  for (let i = 0; i < max / DT; i++) {
    t += DT;
    const afstand = halteAfstand(r, st.stop || stopX);
    stapHalte(st, { stop: stopX, afstand, speed: v, dt: DT, dwell: 9, decel: HALTE.DECEL, live: !!live, liveStil: live ? live.stil(t) : false });
    let want = Math.min(cruise, st.vmax);
    if (hold && hold(t)) want = 0;
    if (live) want = live.stil(t) ? Math.min(cruise, remSnelheid(afstand + 2, 2.5)) : cruise; // de echte bus staat bij de halte: het doel ligt daar
    const nv = want > v ? Math.min(want, v + 1.5 * DT) : Math.max(want, v - 3 * DT);
    if (v - nv > 0) maxRem = Math.max(maxRem, (v - nv) / DT);
    v = nv;
    r.s += v * DT * dir;
    if (lijnX.loop) r.s = (r.s + lijnX.length) % lijnX.length;
    log.push({ t, s: r.s, v, fase: st.fase, stoep: st.stoep, knipper: st.knipper, deur: st.deurOpen, aankomst: st.aankomst, gemist: st.gemist });
    if (!lijnX.loop && (r.s > lijnX.length - 6 || r.s < 6)) break;
  }
  return { log, st };
}

// gewoon halteren
{
  const { log } = rit();
  const aan = log.find((e) => e.aankomst);
  check('bus komt aan bij de halte', !!aan);
  check('stopt bij het stoppunt (3 m voorbij de halte)', aan && Math.abs(aan.s - (stop.s + HALTE.VOORUIT)) < HALTE.STOP_M, aan && aan.s);
  const staan = log.filter((e) => e.fase === 'staan');
  check('staat ongeveer de wachttijd', Math.abs(staan.length * DT - 9) < 0.2, staan.length * DT);
  check('staat stil tijdens het halteren', staan.every((e) => e.v < HALTE.STIL_V));
  check('deuren open bij stilstand en dicht voor vertrek', staan.some((e) => e.deur) && !staan[staan.length - 1].deur);
  check('deuren dicht onderweg', log.filter((e) => e.fase !== 'staan').every((e) => !e.deur));
  const nader = log.filter((e) => e.fase === 'nadering');
  check('naar de stoeprand in de nadering', nader.some((e) => e.stoep) && nader.filter((e) => e.stoep).every((e) => e.s > stop.s - HALTE.STOEP_M));
  check('knippert rechts in de nadering', nader.some((e) => e.knipper === 'right'));
  check('geen knipper bij stilstand', staan.every((e) => e.knipper === null));
  const inv = log.filter((e) => e.fase === 'invoegen');
  check('knippert links bij het invoegen', inv.length > 0 && inv.every((e) => e.knipper === 'left' && !e.stoep));
  check('daarna weer gewoon rijden', log[log.length - 1].fase === 'rijden' && log[log.length - 1].v > 10);
  check('maar één aankomst', log.filter((e) => e.aankomst).length === 1);
  // zacht remmen: nooit harder dan comfortabel (met marge voor de discrete stap)
  let hard = 0;
  for (let i = 1; i < log.length; i++) if (log[i].fase === 'nadering') hard = Math.max(hard, (log[i - 1].v - log[i].v) / DT);
  check('remt comfortabel af', hard <= HALTE.DECEL * 1.6 + 0.01, hard.toFixed(2));
}

// remSnelheid: nul op het punt, stijgend met de afstand
check('remsnelheid 0 op het stoppunt', remSnelheid(0) === 0 && remSnelheid(-2) === 0);
check('remsnelheid stijgt', remSnelheid(10) < remSnelheid(40) && remSnelheid(40) < remSnelheid(80));

// te snel en te laat: voorbij geschoten -> gemist, geen aankomst
{
  const r = { line: lijn, s: 299, dir: 1 };
  const st = makeHalteStaat();
  let gem = false, aan = false;
  for (let i = 0; i < 200; i++) {
    r.s += 14 * DT;
    stapHalte(st, { stop, afstand: halteAfstand(r, st.stop || stop), speed: 14, dt: DT, dwell: 9 });
    gem = gem || st.gemist; aan = aan || st.aankomst;
  }
  check('voorbij geschoten: gemist', gem && !aan && st.fase === 'rijden');
  stapHalte(st, { stop, afstand: halteAfstand(r, stop), speed: 14, dt: DT, dwell: 9 });
  check('gemiste halte niet opnieuw', st.fase === 'rijden');
}

// file voor de halte: na NADER_MAX_S overslaan, en de bus rijdt weer
{
  const { log } = rit({ hold: (t) => t > 4, s0: 230, max: 90 });
  check('file voor de halte: na de grens overgeslagen', log.some((e) => e.gemist) && !log.some((e) => e.aankomst));
}

// terug over de lijn (dir -1): stoppunt ligt aan de andere kant van de halte
{
  const r = { line: lijn, s: 500, dir: -1 };
  check('afstand met dir -1', Math.abs(halteAfstand(r, stop) - (500 - 297)) < 1e-9);
  const { log } = rit({ dir: -1, s0: 500 });
  const aan = log.find((e) => e.aankomst);
  check('terugrit stopt aan zijn eigen kant', aan && Math.abs(aan.s - (stop.s - HALTE.VOORUIT)) < HALTE.STOP_M, aan && aan.s);
}

// eind van een niet-ronde lijn: stoppunt blijft voor het keerpunt
check('stoppunt bij de eindhalte blijft voor het keren', halteAfstand({ line: lijn, s: 980, dir: 1 }, { s: 998 }) === 992 - 980);

// ronde lijn: over het naadje heen
{
  const rond = { length: 1000, loop: true };
  check('ronde lijn: afstand over het begin heen', Math.abs(halteAfstand({ line: rond, s: 990, dir: 1 }, { s: 20 }) - 33) < 1e-9);
  const { log } = rit({ lijnX: rond, stopX: { s: 20 }, s0: 960, max: 40 });
  check('ronde lijn: haltert na het naadje', log.some((e) => e.aankomst));
}

// live bus (#395): stopt waar de echte bus stilstaat, zo lang als die stilstaat
{
  const { log } = rit({ live: { stil: (t) => t > 12 && t < 40 }, max: 60 });
  const staan = log.filter((e) => e.fase === 'staan');
  const aan = log.find((e) => e.aankomst);
  check('live: haltert bij de halte', !!aan && Math.abs(aan.s - stop.s) < HALTE.LIVE_R, aan && aan.s);
  check('live: staat tot de echte bus rijdt', staan.length > 0 && Math.abs(staan[staan.length - 1].t - 40) < 0.1, staan.length && staan[staan.length - 1].t);
  check('live: deuren open zolang hij staat', staan.slice(1).every((e) => e.deur));
}

// geen allocaties: dezelfde staat terug
{
  const st = makeHalteStaat();
  check('stapHalte geeft dezelfde staat terug', stapHalte(st, { stop: null, afstand: 0, speed: 0, dt: DT }) === st);
}

console.log(fail ? `busstop_test: ${fail} fout` : 'busstop_test ok');
process.exit(fail ? 1 : 0);
