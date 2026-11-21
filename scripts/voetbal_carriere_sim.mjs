// Headless sim-testbank van de voetbalcarrière (#1106, #1116): rekent drie seizoenen door zonder Electron en controleert promotie, standen, economie en determinisme.
//   node scripts/voetbal_carriere_sim.mjs [--seizoenen=3] [--char=anita|tammo] [--strategie=speel|reken|mix] [--stil] [--json]
// `speel` boekt jouw wedstrijden als gespeeld (uitslag uit de sim van de ratings, met kleine statistiek), `reken` laat de club alles uitrekenen, `mix` speelt de helft.
// De uitvoer is het rapport van docs/VOETBAL-CARRIERE-VERIFICATIE-21-11.md (economie per uur, promotie, stand). Deterministisch: dezelfde seed geeft hetzelfde rapport.
import PARKDATA from '../game/js/voetbalparkendata.js';
import { wgsToWorld } from '../game/js/rdnew.js';
import { makeParkIndex, HOME_WGS } from '../game/js/voetbalparken.js';
import * as C from '../game/js/voetbalcarriere.js';
import { makeRng } from '../game/js/minigamekit.js';
import { hashSeed } from '../game/js/voetbalspelers.js';
import { simulateDuel } from '../game/js/voetbalseizoen.js';

const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.split('=')[1] : d; };
const WALL_MIN_PER_MATCH = 8;                       // echte minuten per gespeelde wedstrijd inclusief menu's (ontwerp hoofdstuk 7)
const DAY_MIN = 24;                                 // een speldag is 24 minuten echte tijd

export function loadIndex() {
  return makeParkIndex(PARKDATA);
}
// Eén carrière van `seizoenen` seizoenen. `strategie`: 'speel' | 'reken' | 'mix'. Geeft een rapport met per seizoen de uitkomst en het totaal aan geld en speeltijd.
export function runCareer({ char = 'anita', seizoenen = 3, strategie = 'speel', index = loadIndex(), train = true } = {}) {
  const [hx, hy] = wgsToWorld(HOME_WGS.lat, HOME_WGS.lon);
  const getClub = C.clubResolver(index);
  let c = C.createCareer({ char, index, home: { x: hx, y: hy } });
  const rep = { char, strategie, seasons: [], earned: 0, playedMatches: 0, simMatches: 0, days: 0, minutes: 0, start: C.myRating(c), notes: [] };
  const target = c.seasonNr + seizoenen;
  let guard = 0;
  while (c.seasonNr < target && guard++ < 4000) {
    if (train && c.evDone < c.cal.length) { const r = C.train(c, c.focus, 1); c = r.career; }
    const m = C.nextMatch(c, getClub);
    if (m && m.status === 'open') {
      const play = strategie === 'speel' || (strategie === 'mix' && (c.evDone % 2 === 0));
      let res = null;
      if (play && !c.injury) {
        const ctx = C.makeContext(c, getClub);
        const rng = makeRng(hashSeed('sim', c.seasonNr, c.evDone));
        const [a, b] = simulateDuel(m.isHome ? c.club : m.opponent, m.isHome ? m.opponent : c.club, ctx, rng);
        const gf = m.isHome ? a : b, ga = m.isHome ? b : a;
        res = { gf, ga, pens: gf === ga && m.kind !== 'league' ? c.club : null, stats: { goals: Math.min(gf, rng() < 0.5 ? 1 : 0), assists: rng() < 0.2 ? 1 : 0, shots: 2, passes: 18, tackles: 2, minutes: WALL_MIN_PER_MATCH, sprints: 8 } };
      }
      const r = C.playEvent(c, getClub, res);
      c = r.career;
      const pay = r.summary.earn.reduce((x, y) => x + y.amount, 0);
      rep.earned += pay;
      if (r.summary.played) { rep.playedMatches++; rep.minutes += WALL_MIN_PER_MATCH; } else rep.simMatches++;
    }
    const before = c.seasonNr;
    const adv = C.advanceDays(c, 1, getClub);
    c = adv.career; rep.days++;
    for (const e of adv.earn) rep.earned += e.amount;
    if (adv.newSeason && adv.report) {
      rep.seasons.push({ nr: adv.report.nr, division: adv.report.division, rank: adv.report.rank, outcome: adv.report.outcome, champion: adv.report.champion, goals: adv.report.goals, earned: adv.report.earn.reduce((x, y) => x + y.amount, 0), rating: C.myRating(c) });
    }
    if (c.seasonNr === before && guard > 3500) break;
  }
  rep.end = C.myRating(c);
  rep.club = c.club; rep.final = { division: C.divisionOfMyClub(c), season: c.seasonNr };
  // geld per actief uur (gespeelde minuten plus een training van een halve minuut menu per speldag) en per uur wereldtijd (alle speldagen, ook als je niets doet)
  const hours = Math.max(0.01, (rep.minutes + rep.days * 0.5) / 60);
  rep.dayHours = Math.round((rep.days * DAY_MIN / 60) * 10) / 10;
  rep.perHour = Math.round(rep.earned / hours);
  rep.perWorldHour = Math.round(rep.earned / Math.max(0.01, rep.dayHours));
  rep.career = c;
  return rep;
}

if (process.argv[1] && process.argv[1].endsWith('voetbal_carriere_sim.mjs')) {
  const seizoenen = +arg('seizoenen', 3), stil = process.argv.includes('--stil');
  const out = [];
  for (const strategie of ['speel', 'reken', 'mix']) for (const char of ['anita', 'tammo']) {
    if (arg('char', null) && arg('char', null) !== char) continue;
    if (arg('strategie', null) && arg('strategie', null) !== strategie) continue;
    const r = runCareer({ char, seizoenen, strategie });
    out.push(r);
    if (!stil) {
      console.log(`\n${char} / ${strategie}: rating ${r.start} -> ${r.end}, ${r.playedMatches} gespeeld, ${r.simMatches} uitgerekend, ${r.days} speldagen (${r.dayHours} u), verdiend EUR ${r.earned} (EUR ${r.perHour} per actief uur, EUR ${r.perWorldHour} per wereldtijd-uur)`);
      for (const s of r.seasons) console.log(`  seizoen ${s.nr}: ${s.division} plek ${s.rank} (${s.outcome}), EUR ${s.earned}`);
    }
  }
  if (process.argv.includes('--json')) console.log(JSON.stringify(out.map(({ career, ...r }) => r)));
}
