// Het profiel en de regels van de voetbalcarrière (#1110, epic #1106, ADR 0042, docs/VOETBAL-CARRIERE-21-11.md): puur, geen DOM, geen THREE, geen opslag (scripts/voetbal_carriere_test.mjs).
// Eén profiel per speler in gde-voetbalcarriere-v1 (nooit in een savegame, zoals gde-loopbaan-v1): de speler (Tessa de ster of Tammo), de andere figuur als computerteamgenoot, de club, de divisies,
// het seizoen, de agenda in speldagen (`day`, opgehoogd per nacht), vorm, vermoeidheid, blessure, beker en Waddenbeker. Alle functies geven een nieuw profiel terug en wijzigen het oude niet.
// Geld komt hier alleen als `earn`-regels terug; de live-laag (voetbalcarrierelive.js) betaalt ze via loopbaanVerdien. Zelfde seed = zelfde uitkomst voor alle spelers.
import { makeProtagonist, makeSquad, lineupFor, teamStrength, simFactors, hashSeed, playerRating, readPlayer } from './voetbalplayers.js';
import { CLUBS, EUROPE_CLUBS, clubsOf, clubById, teamFor, clubName } from './voetbalclubs.js';
import { localDivision, fallbackIndex, NEAR_TRIP_M, HOME_FALLBACK } from './voetbalparken.js';
import * as S from './voetbalseason.js';
import * as A from './voetbalagenda.js';
import * as O from './voetbalontwikkeling.js';
import * as T from './voetbaltransfers.js';
import * as Sp from './voetbalsponsors.js';
import * as B from './voetbalclub_bezit.js';
import { makeRng } from './minigamekit.js';
import { emblemIndex } from './voetbalwapen.js';

export const VERSION = 1;
export const WORLD_SEED = 1106;                 // één wereldzaad: iedere speler krijgt dezelfde uitkomst voor niet-gespeelde duels
export const CUP_FROM_SEASON = 2;               // seizoen 1 is de lichte vorm: alleen de Talentenklasse
export const ROLES = { speler: 'Speler', trainer: 'Trainer', manager: 'Manager' };
export const TRAINER_FROM_SEASON = 3;
export const LEVELS = [{ id: 'talent', naam: 'Talent' }, { id: 'selectie', naam: 'Selectiespeler' }, { id: 'basis', naam: 'Basisspeler' }, { id: 'kapitein', naam: 'Kapitein' }, { id: 'trainer', naam: 'Trainer' }];

// De verdiensten per wedstrijd (startwaarden, het balanspakket bevestigt ze met de economie-sim): `contract` krijg je altijd (ook bij uitrekenen), `win` en `draw` alleen als je zelf speelt.
export const PAY = {
  talent: { contract: 25, win: 30, draw: 10 },       // amateur: een onkostenvergoeding, geen salaris
  terp: { contract: 60, win: 60, draw: 20 },
  kroon: { contract: 90, win: 80, draw: 30 },
  cup: { contract: 0, win: 50, draw: 0, played: 20 },
  europe: { contract: 0, win: 120, draw: 40, played: 60 },
};
export const SEASON_PAY = { promotion: 200, cup: 400, terpChampion: 500, kroonChampion: 1200, europe: 1000 };
const clone = (o) => JSON.parse(JSON.stringify(o));
const rel = (c) => c.day - c.seasonStart;

export function newCareer() { return { v: VERSION, started: false }; }
export const hasCareer = (c) => !!(c && c.started);

// ---- het begin ----
// opts: { char: 'anita' | 'tammo', index: de parkindex (voetbalparken.js), home: { x, y } }. Zonder bruikbare index (kapotte data) valt de start terug op acht vaste plaatsen rond de stad (fallbackIndex).
export function createCareer({ char = 'anita', index = null, home = null, day = 0 } = {}) {
  const c = char === 'tammo' ? 'tammo' : 'anita';
  const idx = index && index.clubs.length >= 8 ? index : fallbackIndex();
  const loc = localDivision(idx, home || HOME_FALLBACK);
  const talent = loc.clubs.map((x) => x.id);
  const clubId = loc.home.id;
  const world = S.newWorld({ kroon: clubsOf('kroon').map((x) => x.id), terp: clubsOf('terp').map((x) => x.id), talent, pool: loc.pool.map((x) => x.id) });
  const other = c === 'anita' ? 'tammo' : 'anita';
  const s = {
    v: VERSION, started: true, char: c, role: 'speler', roles: { trainer: false, manager: false }, club: clubId, homeClub: clubId, world,
    me: makeProtagonist(c, clubId, 10), mate: makeProtagonist(other, clubId, 11),
    seasonNr: 1, day: Math.max(0, day | 0), seasonStart: Math.max(0, day | 0), cal: [], evDone: 0, leagues: null, cup: null, europe: null, europeQ: false,
    prog: {}, phase: {}, mprog: {}, mphase: {}, fatigue: 0, injury: null, history: [], trainedDay: -1, matchDay: -1, focus: c === 'anita' ? 'shot' : 'pass',
    stats: { matches: 0, wins: 0, draws: 0, losses: 0, goals: 0, assists: 0, simulated: 0, seasons: 0, titles: 0, promotions: 0, cups: 0, europe: 0, earned: 0, coached: 0 },
    seasonStats: { goals: 0, assists: 0, played: 0 }, log: [], flags: {}, last: null, settings: { injuries: true }, result: null, market: T.emptyMarket(), tactic: { formation: '4-4-2', style: 'evenwichtig' }, pins: { start: [], bench: [] }, offer: null, bezit: B.newClubBezit(),
  };
  return openSeason(s);
}
export const seasonSeed = (c) => hashSeed('season', WORLD_SEED, c.seasonNr);

// Het begin van een seizoen: de drie competities (elke klasse speelt mee), de beker vanaf seizoen 2 en de Waddenbeker voor de kampioen van de Kroonklasse.
export function openSeason(c) {
  const s = clone(c);
  const seed = seasonSeed(s);
  s.leagues = { kroon: S.newLeague('kroon', s.world.kroon, s.seasonNr), terp: S.newLeague('terp', s.world.terp, s.seasonNr), talent: S.newLeague('talent', s.world.talent, s.seasonNr) };
  s.cup = s.seasonNr >= CUP_FROM_SEASON ? S.newKnockout('dijkbeker', S.cupEntrants(s.world, s.club, seed), seed) : null;
  s.europe = s.europeQ ? S.newKnockout('waddenbeker', S.europeEntrants(s.club, EUROPE_CLUBS.map((x) => x.id), seed), seed) : null;
  s.cal = A.seasonCalendar({ cup: !!s.cup, europe: !!s.europe });
  s.evDone = 0;
  s.seasonStart = s.day;
  s.seasonStats = { goals: 0, assists: 0, played: 0 };
  s.phase = O.resetPhase(); s.mphase = O.resetPhase();
  s.result = null;
  s.sponsors = Sp.newSponsors(s.club, S.divisionOf(s.world, s.club) || 'talent', s.seasonNr);
  return s;
}

// ---- clubs en sterkte ----
export const nameOf = (getClub, id) => { const k = getClub && getClub(id); return k ? k.naam : clubName(id); };
export const divisionOfMyClub = (c) => S.divisionOf(c.world, c.club);
// De selectie van een club: vast uit (club, zaad); de eigen club krijgt de speler en de teamgenoot erin (op de plek van de beste van hun rol).
export function squadOf(c, clubId, getClub) {
  const club = getClub(clubId) || { id: clubId, sterkte: 40 };
  const squad = T.rosterOf(c.market || T.emptyMarket(), clubId, makeSquad(clubId, club.sterkte, WORLD_SEED));
  if (clubId !== c.club) return squad;
  for (const p of [c.me, c.mate]) {
    const i = squad.findIndex((q) => q.role === p.role && !q.protagonist);
    const best = squad.map((q, k) => ({ q, k })).filter((x) => x.q.role === p.role && !x.q.protagonist).sort((a, b) => playerRating(b.q) - playerRating(a.q))[0];
    if (best) squad[best.k] = { ...p, id: p.id, club: clubId, num: best.q.num, protagonist: true };
    else if (i < 0) squad.push({ ...p, protagonist: true });
  }
  return squad;
}
export function makeContext(c, getClub) {
  const mine = teamStrength(squadOf(c, c.club, getClub));
  const fatigueMult = O.isTired(c.fatigue) ? 0.97 : 1;
  const own = { attack: mine.attack * fatigueMult * (c.injury ? 0.97 : 1), defense: mine.defense };
  const strengthByClub = { [c.club]: own };
  const m = c.market || T.emptyMarket();
  for (const id of new Set([...Object.keys(m.imports), ...Object.keys(m.gone)])) {
    if (id === c.club) continue;
    const club = getClub(id);
    if (club) strengthByClub[id] = teamStrength(T.rosterOf(m, id, makeSquad(id, club.sterkte, WORLD_SEED)));
  }
  return S.makeCtx(getClub, strengthByClub);
}
export const myRating = (c) => playerRating(c.me);
export function levelOf(c) {
  if (!c || !c.started) return LEVELS[0];
  if (c.roles.trainer) return LEVELS[4];
  if (c.flags.captain) return LEVELS[3];
  const r = rankInSquad(c);
  return r <= 11 && c.seasonNr > 1 ? LEVELS[2] : c.stats.matches >= 4 ? LEVELS[1] : LEVELS[0];
}
const rankInSquad = (c) => 1 + [c.me].concat(c.mate ? [c.mate] : []).filter((p) => playerRating(p) > playerRating(c.me)).length + 9;

// ---- de volgende wedstrijd ----
export function nextMatch(c, getClub) {
  if (!c || !c.started || c.evDone >= c.cal.length) return null;
  const ev = c.cal[c.evDone];
  let opp = null, isHome = true;
  if (ev.kind === 'league') { const f = S.myFixture(c.leagues[divisionOfMyClub(c) || 'talent'], c.club); if (f) { opp = f.opponent; isHome = f.isHome; } }
  else { const ko = ev.kind === 'cup' ? c.cup : c.europe; const tie = S.myTie(ko, c.club); if (tie) { opp = tie.opponent; isHome = tie.isHome; } }
  if (!opp) return null;
  const myClub = getClub(c.club), oppClub = getClub(opp), venue = isHome ? myClub : oppClub;
  const park = venue && venue.stadion ? { stadium: venue.stadion } : venue && venue.park ? { park: venue.park, parkPlaats: venue.plaats || null } : {};
  const travelDays = !isHome && venue && venue.park && myClub && myClub.park && Math.hypot(venue.park.x - myClub.park.x, venue.park.y - myClub.park.y) > NEAR_TRIP_M ? 2 : 1;
  return { ev, opponent: opp, opponentName: nameOf(getClub, opp), isHome, ...park, status: A.eventStatus(ev, rel(c), travelDays), travelDays, in: A.daysUntil(ev, rel(c)), canPlay: !c.injury, kind: ev.kind, n: ev.n };
}

// ---- de opzet van een wedstrijd voor de sim (makeMatch) ----
// Geeft { teams, ratings, formaat, vorming, stijl, bonus, rol, naamMens }: de clubteams, de factoren per plek van beide teams en de bonus van de speler zelf (zijn vaardigheden, vorm en vermoeidheid).
export function matchSetup(c, getClub, formations) {
  const m = nextMatch(c, getClub);
  if (!m) return null;
  const roles = formations.map((x) => x.rol);
  const form = O.formFactor(c.history);
  const mySquad = squadOf(c, c.club, getClub), oppSquad = squadOf(c, m.opponent, getClub);
  const my = lineupFor(mySquad, roles, { must: [c.me.id, c.mate.id], ...pinsOf(c) }), opp = lineupFor(oppSquad, roles);
  const fac = (l) => l.map((x) => ({ naam: x.player ? x.player.name : undefined, f: x.factors }));
  const bonus = simFactors(c.me, { form, fatigue: c.fatigue });
  const mine = getClub(c.club), theirs = getClub(m.opponent);
  // het wapen in de uitzending is hetzelfde als in het Clubhuis: het symbool komt uit de klas van de club
  const embl = (club) => { const d = S.divisionOf(c.world, club.id), ids = (d && c.world[d]) || []; return emblemIndex(club, ids.map((x) => getClub(x)).filter(Boolean)); };
  return { teams: [{ ...teamFor(mine), emblem: embl(mine) }, { ...teamFor(theirs), emblem: embl(theirs) }], ratings: [fac(my), fac(opp)], bonus: { sprint: bonus.sprint, schot: bonus.schot, aanname: bonus.aanname, verd: bonus.verd, uit: bonus.uit }, opponent: m.opponent, match: m };
}

// ---- een wedstrijd verwerken ----
const outcomeOf = (club, gf, ga, pens) => (gf > ga ? 'winst' : gf < ga ? 'verlies' : pens ? (pens === club ? 'winst' : 'verlies') : 'gelijk');
// Wat een wedstrijd oplevert aan geld: contractdeel altijd (alleen competitie), bonus alleen als je zelf speelt.
export function payFor(division, kind, outcome, played) {
  const t = kind === 'league' ? PAY[division] : PAY[kind];
  if (!t) return [];
  const out = [];
  if (kind === 'league' && t.contract) out.push({ label: 'Vergoeding', amount: t.contract, bron: 'contract' });
  if (played) {
    if (kind !== 'league' && t.played) out.push({ label: kind === 'cup' ? 'Bekerwedstrijd' : 'Waddenbeker', amount: t.played, bron: 'bonus' });
    if (outcome === 'winst' && t.win) out.push({ label: 'Winstbonus', amount: t.win, bron: 'bonus' });
    else if (outcome === 'gelijk' && t.draw) out.push({ label: 'Gelijkspelbonus', amount: t.draw, bron: 'bonus' });
  }
  return out;
}

// Het eigen duel rekenen we uit met de rng van het event als het niet gespeeld wordt.
function ownResult(c, m, ctx, played, mine) {
  if (played && mine) {
    const gf = mine.gf | 0, ga = mine.ga | 0;
    // een gespeeld gelijkspel in een beker wordt beslist met strafschoppen (de uitslag blijft gelijk; de winnaar komt uit dezelfde reeks als bij uitrekenen)
    const pens = mine.pens || (gf === ga && m.kind !== 'league' ? S.shootout(c.club, m.opponent, ctx, makeRng(hashSeed('pens', WORLD_SEED, c.seasonNr, c.evDone, c.club))).winner : null);
    return { gf, ga, pens };
  }
  const rng = makeRng(hashSeed('own', WORLD_SEED, c.seasonNr, c.evDone, c.club));
  const [a, b] = S.simulateDuel(m.isHome ? c.club : m.opponent, m.isHome ? m.opponent : c.club, ctx, rng);
  const gf = m.isHome ? a : b, ga = m.isHome ? b : a;
  let pens = null;
  if (gf === ga && m.kind !== 'league') pens = S.shootout(c.club, m.opponent, ctx, rng).winner;
  return { gf, ga, pens };
}

// Speel (of reken uit) de wedstrijd van het huidige event. result = { gf, ga, pens?, stats?: { goals, assists, shots, passes, tackles, minutes, sprints } }; null = uitrekenen (ook voor een gemiste ronde).
// missed = true bij een gemiste ronde (de club rekent hem uit met vorm -1, zonder geldverlies). Geeft { career, summary } met summary.earn = de te betalen regels.
export function playEvent(c, getClub, result = null, { missed = false } = {}) {
  const m = nextMatch(c, getClub);
  if (!m) return { career: c, summary: null };
  const s = clone(c);
  const ctx = makeContext(s, getClub);
  const played = !!result && !missed;
  const own = ownResult(s, m, ctx, played, result);
  const seed = seasonSeed(s);
  const division = divisionOfMyClub(s) || 'talent';
  const mineArg = { club: s.club, gf: own.gf, ga: own.ga, pens: own.pens };
  const outcome = outcomeOf(s.club, own.gf, own.ga, own.pens);
  const notes = [];
  if (m.kind === 'league') {
    // alle drie de competities spelen deze ronde; jouw klasse met jouw uitslag
    for (const d of S.DIV_ORDER) {
      const r = S.playRound(s.leagues[d], seed, ctx, d === division ? mineArg : null);
      s.leagues[d] = r.league;
    }
  } else if (m.kind === 'cup') {
    s.cup = S.playKnockoutRound(s.cup, ctx, mineArg);
    if (!s.cup.alive.includes(s.club)) { s.cup = S.playKnockoutOut(s.cup, ctx); s.cal = s.cal.filter((e, i) => e.kind !== 'cup' || i <= s.evDone); notes.push('Uitgeschakeld in de Dijkbeker'); }
  } else {
    s.europe = S.playKnockoutRound(s.europe, ctx, mineArg);
    if (!s.europe.alive.includes(s.club)) { s.europe = S.playKnockoutOut(s.europe, ctx); s.cal = s.cal.filter((e, i) => e.kind !== 'europe' || i <= s.evDone); notes.push('Uitgeschakeld in de Waddenbeker'); }
  }
  s.evDone++;
  // ontwikkeling: ervaring, vorm, vermoeidheid
  const coach = played && !!(result && result.coach);        // coachwedstrijd (#1111): de Trainer speelde niet mee: uitslag en geld tellen, speler-ontwikkeling en blessurekans niet
  const stat = (played && !coach && result && result.stats) || {};
  const perf = played && !coach ? O.performance({ goals: stat.goals, assists: stat.assists, tackles: stat.tackles }) : 0.3;
  const xp = played && !coach ? O.matchXp({ minutes: 8, ...stat }) : O.simulatedXp(s.me.role, outcome);
  const g = O.applyXp(s.me, xp, s.prog, s.phase);
  s.me = g.player; s.prog = g.prog; s.phase = g.phase;
  const mg = O.applyXp(s.mate, xp, s.mprog, s.mphase, O.MATE_RATE);
  s.mate = mg.player; s.mprog = mg.prog; s.mphase = mg.phase;
  s.history = O.pushHistory(s.history, { r: outcome === 'winst' ? 'W' : outcome === 'gelijk' ? 'D' : 'L', perf: missed ? Math.max(0, perf - 0.2) : perf });
  s.fatigue = O.addFatigue(s.fatigue, coach ? 0 : played ? O.FATIGUE.match : O.FATIGUE.match * 0.5);
  s.matchDay = rel(s);
  const injury = played && !coach ? O.rollInjury({ seed, day: s.day, fatigue: s.fatigue, enabled: s.settings.injuries !== false }) : null;
  if (injury) s.injury = injury;
  s.stats.matches++;
  if (outcome === 'winst') s.stats.wins++; else if (outcome === 'gelijk') s.stats.draws++; else s.stats.losses++;
  if (!played) s.stats.simulated++;
  if (coach) s.stats.coached = (s.stats.coached | 0) + 1;
  s.stats.goals += stat.goals | 0; s.stats.assists += stat.assists | 0;
  s.seasonStats.goals += stat.goals | 0; s.seasonStats.assists += stat.assists | 0; if (played && !coach) s.seasonStats.played++;
  const earn = payFor(division, m.kind, outcome, played && !coach);   // een coach krijgt geen speelbonus
  if (m.kind === 'league') earn.push(...clubDividends(s, getClub));
  const sp = Sp.settle(s.sponsors, { goals: s.seasonStats.goals, unbeaten: Sp.unbeatenRun(s.history), promoted: false });
  s.sponsors = sp.sponsors; earn.push(...sp.earn);
  s.stats.earned += earn.reduce((a, x) => a + x.amount, 0);
  if (!s.flags.shareReady && s.stats.earned >= SHARE_READY_EARNED) s.flags.shareReady = true;      // het eerste clubaandeel komt in beeld als je genoeg met voetbal verdiende (B10)
  const summary = {
    kind: m.kind, n: m.n, opponent: m.opponent, opponentName: m.opponentName, isHome: m.isHome, gf: own.gf, ga: own.ga, pens: own.pens, outcome, played, missed, earn, gains: g.gains, injury, notes, goals: stat.goals | 0,
    firstGoal: !!(stat.goals && !s.flags.firstGoal), debut: !s.flags.debut,
  };
  s.flags = { ...s.flags, debut: true, firstGoal: s.flags.firstGoal || !!(stat.goals | 0) };
  s.last = { kind: m.kind, text: `${nameOf(getClub, s.club)} ${own.gf}-${own.ga} ${m.opponentName}`, outcome };
  return { career: s, summary };
}
export const simulateEvent = (c, getClub, opts) => playEvent(c, getClub, null, opts);

// ---- training ----
export function train(c, focus, score = 0.8) {
  const s = clone(c);
  if (!O.canTrain(s, rel(s))) return { career: c, ok: false, reason: s.injury ? 'blessure' : 'vandaag al bezig' };
  const f = O.TRAIN_FOCI.includes(focus) ? focus : s.focus;
  const g = O.applyXp(s.me, O.trainingXp(f, score), s.prog, s.phase);
  s.me = g.player; s.prog = g.prog; s.phase = g.phase; s.focus = f;
  const mg = O.applyXp(s.mate, O.trainingXp(f, score), s.mprog, s.mphase, O.MATE_RATE);
  s.mate = mg.player; s.mprog = mg.prog; s.mphase = mg.phase;
  s.fatigue = O.addFatigue(s.fatigue, O.FATIGUE.training);
  s.trainedDay = rel(s);
  return { career: s, ok: true, gains: g.gains, focus: f };
}
export const withFocus = (c, focus) => (O.TRAIN_FOCI.includes(focus) ? { ...c, focus } : c);

// ---- de tijd: speldagen ----
// Een nacht (of meer) verder. Een ronde die voorbij zijn venster is, wordt door de club uitgerekend (gemist: zonder geldverlies). Na de laatste wedstrijd en de pauze begint het volgende seizoen.
// Geeft { career, notes, earn, summaries }; maximaal MAX_CATCHUP_DAYS dagen tellen mee.
export function advanceDays(c, nights, getClub) {
  let s = c;
  const out = { notes: [], earn: [], summaries: [], newSeason: false };
  if (!c || !c.started) return { career: c, ...out };
  const days = A.catchUpDays(nights);
  for (let i = 0; i < days; i++) {
    s = clone(s);
    s.day++;
    s.fatigue = O.reduceFatigue(s.fatigue, 1);
    s.injury = O.tickInjury(s.injury, 1);
    // gemiste wedstrijden (de dag na het venster)
    for (let guard = 0; guard < 20 && s.evDone < s.cal.length; guard++) {
      const m = nextMatch(s, getClub);
      if (!m) { s.evDone++; continue; }              // geen duel in dit event (mag niet voorkomen): niet blijven hangen
      if (m.status !== 'missed') break;
      const r = playEvent(s, getClub, null, { missed: true });
      s = r.career; out.summaries.push(r.summary); out.earn.push(...r.summary.earn);
      out.notes.push(`${S_KIND[r.summary.kind]} uitgerekend: ${r.summary.gf}-${r.summary.ga} tegen ${r.summary.opponentName}`);
    }
    if (s.evDone >= s.cal.length && rel(s) >= A.seasonLength(s.cal)) {
      const r = finishSeason(s, getClub);
      s = r.career; out.earn.push(...r.earn); out.notes.push(...r.notes); out.newSeason = true; out.report = r.report;
    }
  }
  return { career: s, ...out };
}
const S_KIND = { league: 'Competitie', cup: 'Dijkbeker', europe: 'Waddenbeker' };

// ---- einde van het seizoen ----
export function finishSeason(c, getClub) {
  const s = clone(c);
  const seed = seasonSeed(s);
  const ctx = makeContext(s, getClub);
  const before = S.divisionOf(s.world, s.club);
  const leagues = {};
  for (const d of S.DIV_ORDER) leagues[d] = S.playOut(s.leagues[d], seed, ctx);
  const { world, report } = S.endSeason(s.world, leagues, seed, s.club);
  const outcome = S.outcomeFor(report, s.club, before);
  const earn = [], notes = [];
  if (s.cup && !s.cup.done) s.cup = S.playKnockoutOut(s.cup, ctx);
  if (s.europe && !s.europe.done) s.europe = S.playKnockoutOut(s.europe, ctx);
  const rank = S.rankOf(leagues[before], s.club);
  if (outcome === 'promotie' || outcome === 'kampioen-promotie') { earn.push({ label: 'Promotie', amount: SEASON_PAY.promotion, bron: 'seizoen' }); s.stats.promotions++; }
  if (outcome === 'kampioen-promotie' || outcome === 'kampioen') s.stats.titles++;
  if (before === 'terp' && report.champions.terp === s.club) earn.push({ label: 'Kampioen van de Terpklasse', amount: SEASON_PAY.terpChampion, bron: 'seizoen' });
  if (before === 'kroon' && report.champions.kroon === s.club) { earn.push({ label: 'Kampioen van de Kroonklasse', amount: SEASON_PAY.kroonChampion, bron: 'seizoen' }); }
  const cupWon = s.cup && s.cup.winner === s.club;
  if (cupWon) { earn.push({ label: 'Dijkbeker gewonnen', amount: SEASON_PAY.cup, bron: 'seizoen' }); s.stats.cups++; }
  if (s.europe && s.europe.winner === s.club) { earn.push({ label: 'Waddenbeker gewonnen', amount: SEASON_PAY.europe, bron: 'seizoen' }); s.stats.europe++; }
  const spf = Sp.settle(s.sponsors, { goals: s.seasonStats.goals, unbeaten: Sp.unbeatenRun(s.history), promoted: outcome === 'promotie' || outcome === 'kampioen-promotie' });
  s.sponsors = spf.sponsors; earn.push(...spf.earn);
  s.stats.earned += earn.reduce((a, x) => a + x.amount, 0);
  const result = { nr: s.seasonNr, division: before, rank, outcome, champion: report.champions[before], cup: cupWon ? 'gewonnen' : s.cup ? (s.cup.alive.length ? 'uit' : 'uit') : null, europe: s.europe ? (s.europe.winner === s.club ? 'gewonnen' : 'uit') : null, goals: s.seasonStats.goals, earn };
  s.stats.seasons++;
  s.world = world;
  // de boekhouding en de transfers van de AI-clubs in de pauze (deterministisch); de clubkas van jouw club loopt mee
  const allClubs = [...world.kroon, ...world.terp, ...world.talent].map((id) => getClub(id)).filter(Boolean);
  const baseOf = (id) => makeSquad(id, (getClub(id) || { sterkte: 40 }).sterkte, WORLD_SEED);
  const settled = T.settleSeason(s.market, allClubs, (id) => T.rosterOf(s.market, id, baseOf(id)));
  const ai = T.aiRound(settled.market, allClubs.filter((k) => k.id !== s.club), baseOf, seed);
  const tk = T.tickContracts(ai.market, s.club);
  s.market = tk.market;
  for (const p of tk.left) notes.push(`${p.name} vertrekt: het contract loopt af`);
  s.market.pool = T.freeAgents(seed, s.market.nr + 1, 8);
  s.europeQ = S.divisionOf(world, s.club) === 'kroon' && before === 'kroon' && report.champions.kroon === s.club;
  s.seasonNr++;
  s.phase = O.resetPhase();
  promoteRoles(s, getClub, rank);
  const nxt = openSeason({ ...s, day: s.day });
  nxt.seasonStart = s.day;
  nxt.result = result;
  nxt.offer = T.offerFor(nxt, null, getClub);
  nxt.flags = { ...nxt.flags, bid: !!nxt.offer, cupFinal: nxt.flags.cupFinal || result.cup === 'gewonnen' };
  nxt.lastResults = (s.lastResults || []).concat([result]).slice(-6);
  notes.push(outcome === 'promotie' || outcome === 'kampioen-promotie' ? 'Promotie!' : outcome === 'degradatie' ? 'Degradatie: volgend seizoen een klasse lager' : 'Het seizoen is voorbij');
  return { career: nxt, earn, notes, report: result };
}

// ---- clubbezit (#1113, #1179): aandelen in een club, in het profiel tot Bezit er een tak voor heeft (voetbalclub_bezit.js; de adapter naar Bezit is voetbalbezit.js) ----
export const SHARE_READY_EARNED = 3000;
const clubDivision = (c, id) => S.divisionOf(c.world, id);
// De dividenden van een competitieronde: elke club waarvan je een aandeel hebt, naar zijn plek in zijn eigen klasse; een club in de pool (niet gespeeld) keert niets uit.
export function clubDividends(c, getClub) {
  const out = [];
  for (const id of Object.keys((c.bezit && c.bezit.clubs) || {})) {
    const d = clubDivision(c, id), lg = d && c.leagues[d];
    if (!lg || !lg.clubs.includes(id)) continue;
    const h = c.bezit.clubs[id], r = B.dividendOf(h, S.rankOf(lg, id) || (lg.clubs.length + 1) / 2, lg.clubs.length);
    if (r.payout > 0) out.push({ label: `Dividend ${nameOf(getClub, id)}`, amount: r.payout, bron: 'club' });
  }
  return out;
}
// Een aandeel kopen of verkopen: `money` is wat de speler heeft (de live-laag betaalt of stort het bedrag via loopbaanVerdien / de kas). Alleen een club in jouw wereld, nooit de pool.
export function buyClubShare(c, clubId, share, money, getClub = null) {
  const d = c && c.started ? clubDivision(c, clubId) : null;
  if (!d || d === 'pool') return { career: c, ok: false, reason: 'Die club staat niet in de competitie' };
  const r = B.buy(c, clubId, d, share, money, c.day);
  return r.ok ? { career: r.career, ok: true, price: r.price, club: nameOf(getClub, clubId) } : { career: c, ok: false, reason: r.reason, price: r.price };
}
export function sellClubShare(c, clubId) {
  if (!c || !c.started) return { career: c, ok: false, reason: 'Geen carrière' };
  const r = B.sell(c, clubId);
  return r.ok ? { career: r.career, ok: true, price: r.price } : { career: c, ok: false, reason: r.reason };
}
export const clubSharesOf = (c) => Object.entries((c && c.bezit && c.bezit.clubs) || {}).map(([club, h]) => ({ club, ...h }));
// De duurste hele club kost nooit meer dan de Kroonklasse-waarde met de volle schaalopslag: een bewerkte save (prijs 1e9) keert geen miljoenen dividend uit (#1116).
const CLUB_PRICE_MAX = B.priceOf('kroon', 1, B.SCALE_CAP);
function normClubBezit(raw) {
  const out = B.newClubBezit();
  const src = raw && typeof raw === 'object' && raw.clubs && typeof raw.clubs === 'object' ? raw.clubs : {};
  for (const id of Object.keys(src).slice(0, 40)) {
    const h = src[id];
    if (!/^[a-z0-9_-]{1,40}$/i.test(id) || !h || typeof h !== 'object') continue;
    const frac = Math.round(Number(h.aandeel) * 100) / 100;
    if (!(frac > 0 && frac <= 1)) continue;
    out.clubs[id] = { aandeel: frac, sinds: Math.max(0, Math.min(1e6, Math.round(Number(h.sinds)) || 0)), prijs: Math.max(0, Math.min(CLUB_PRICE_MAX, Math.round(Number(h.prijs)) || 0)) };
  }
  return out;
}

// De context voor het commentaar van een carrièrewedstrijd (#1179, voetbalcommentaar.js ctx.carriere): welke ronde, welke plek, de laatste ronde, het debuut, de ster en de sponsor.
export function commentaryContext(c, getClub, m = null) {
  if (!hasCareer(c)) return null;
  const ev = m || nextMatch(c, getClub);
  if (!ev) return null;
  const st = leagueTable(c), mine = st.rows.find((r) => r.id === c.club);
  const first = (c.sponsors && c.sponsors.slots ? c.sponsors.slots : []).find((x) => x.accepted);
  return {
    kind: ev.kind, ronde: ev.n, rondes: ev.kind === 'league' ? S.ROUNDS : ev.n, laatste: ev.kind === 'league' && ev.n === S.ROUNDS, divisie: ({ kroon: 'Kroonklasse', terp: 'Terpklasse', talent: 'Talentenklasse' })[st.division] || 'competitie',
    rank: mine ? mine.plek : 0, clubs: st.rows.length, debuut: !c.flags.debut, naam: c.me.name, sponsor: first ? first.naam : '',
  };
}

// ---- stand en overzicht voor de schermen ----
export function leagueTable(c, div = null) {
  const d = div || divisionOfMyClub(c) || 'talent';
  return { division: d, rows: S.table(c.leagues[d]), round: c.leagues[d].round, done: c.leagues[d].done };
}
export function summary(c, getClub) {
  if (!hasCareer(c)) return null;
  const st = leagueTable(c);
  const mine = st.rows.find((r) => r.id === c.club);
  return {
    club: nameOf(getClub, c.club), clubId: c.club, division: st.division, divisionName: { kroon: 'Kroonklasse', terp: 'Terpklasse', talent: 'Talentenklasse' }[st.division], rank: mine ? mine.plek : 0, points: mine ? mine.p : 0, round: st.round,
    season: c.seasonNr, day: rel(c), next: nextMatch(c, getClub), level: levelOf(c), rating: myRating(c), form: O.formFactor(c.history), formArrow: O.formArrow(O.formFactor(c.history)), fatigue: c.fatigue, injury: c.injury,
  };
}

// De rij in Te doen (#1110): club, stand en de volgende wedstrijd, met als doel het park waar hij gespeeld wordt (thuis het eigen park, uit dat van de tegenstander)
// of de Euroborg (`arena` = { x, y } van de spelerspoort). Zonder carrière geen rij. Puur: todo.js zet hem in de lijst.
export function todoRow(c, getClub, arena = null) {
  const ov = summary(c, getClub);
  if (!ov) return null;
  const m = ov.next;
  const plek = m && m.park ? { x: m.park.x, y: m.park.y, naam: m.parkPlaats ? `Sportpark ${m.parkPlaats}` : 'Sportpark' } : m && m.stadium && arena ? { x: arena.x, y: arena.y, naam: 'Euroborg' } : null;
  const wat = m ? `${A.KIND_NAMES[m.kind]}${m.kind === 'league' ? ` ronde ${m.n}` : ''} tegen ${m.opponentName} (${m.isHome ? 'thuis' : 'uit'})` : 'Pauze tussen de seizoenen';
  const wanneer = !m ? '' : m.status === 'open' ? 'nu te spelen' : m.status === 'missed' ? 'voorbij: de club rekent hem uit' : A.dayText(m.in);
  return {
    key: 'vc:carriere', group: 'loopbanen', icon: 'act-voetbal', title: `Voetbal: ${ov.club}`, status: m && m.status === 'open' ? 'nu' : '', medal: null,
    meta: wanneer ? `${wat} · ${wanneer}` : wat, record: `${ov.divisionName}, plek ${ov.rank}`,
    x: plek ? plek.x : undefined, y: plek ? plek.y : undefined,
    goal: plek ? { kind: 'place', id: 'voetbal:' + (m.isHome ? ov.clubId : m.opponent), name: `Voetbal · ${plek.naam}`, sub: m.isHome ? 'Thuiswedstrijd' : 'Uitwedstrijd', x: plek.x, y: plek.y } : null,
    detail: {
      kicker: `Voetbal · seizoen ${ov.season}`,
      text: 'Start de wedstrijd in het Voetbal-scherm onder Loopbanen of laat hem uitrekenen. Het doel wijst naar het park waar hij gespeeld wordt.',
      rows: [['Club', ov.club], ['Stand', `${ov.divisionName}, plek ${ov.rank} met ${ov.points} punten`], ['Volgende', m ? `${wat}${wanneer ? `, ${wanneer}` : ''}` : wat], ...(plek ? [['Waar', plek.naam]] : [])],
    },
  };
}

// ---- rollen en de managerlaag ----
// Kapitein vanaf seizoen 3 bij een goede plek of rating (de selectie stemt); Trainer na een seizoen als kapitein (vanaf seizoen 4); Manager na twee seizoenen als Trainer of bij het eerste clubaandeel.
export function promoteRoles(s, getClub, rankIn = null) {
  const rank = rankIn != null ? rankIn : S.rankOf(s.leagues[S.divisionOf(s.world, s.club) || 'talent'], s.club);
  const squad = squadOf(s, s.club, getClub).map((p) => playerRating(p)).sort((a, b) => b - a);
  if (s.seasonNr >= 3 && !s.flags.captain && (playerRating(s.me) >= squad[Math.floor(squad.length / 2)] || rank <= 4)) s.flags.captain = true;
  if (s.flags.captain && s.seasonNr >= TRAINER_FROM_SEASON + 1 && !s.roles.trainer) { s.roles.trainer = true; s.flags.trainerSince = s.seasonNr; }
  if (s.roles.trainer && !s.roles.manager && (s.seasonNr - (s.flags.trainerSince || s.seasonNr) >= 2 || s.flags.shareReady)) s.roles.manager = true;
}
export function acceptOffer(c) {
  if (!c || !c.offer || c.evDone !== 0) return { career: c, ok: false, reason: 'Een bod kan alleen aan het begin van een seizoen' };
  const s = clone(c);
  s.club = s.offer.club; s.me.club = s.club; s.mate.club = s.club; s.offer = null; s.flags.moved = (s.flags.moved | 0) + 1; s.flags.bid = false;
  return { career: s, ok: true };
}
// plaats = [x, y] van de club (de wereldplek van zijn park): daar zoekt de pandindex het sponsorpand bij; zonder plaats vindt hij niets.
export function acceptSponsor(c, slotId, pandIndex = null, plaats = null) {
  const r = Sp.accept(c.sponsors, slotId, pandIndex, plaats);
  return r.ok ? { career: { ...c, sponsors: r.sponsors }, ok: true, slot: r.slot } : { career: c, ok: false };
}
// Is het vandaag een thuiswedstrijddag van de club (de volgende wedstrijd staat vandaag open en is thuis)? Voor de klantenbonus van het sponsorpand (sponsorpanden.js).
export function homeMatchToday(c, getClub) {
  if (!c || !c.started) return false;
  const m = nextMatch(c, getClub);
  return !!m && m.isHome && m.status === 'open';
}
export const formOfCareer = (c) => (c && c.history ? O.formFactor(c.history) : 1);
export const declineOffer = (c) => (c && c.offer ? { ...c, offer: null, flags: { ...c.flags, bid: false } } : c);
export const TACTICS = { formations: ['4-4-2', '4-3-3', '3-5-2'], styles: ['verdedigend', 'evenwichtig', 'aanvallend'] };
export function withTactic(c, { formation, style } = {}) {
  if (!c || !c.roles || !c.roles.trainer) return c;
  const t = { ...c.tactic };
  if (TACTICS.formations.includes(formation)) t.formation = formation;
  if (TACTICS.styles.includes(style)) t.style = style;
  return { ...c, tactic: t };
}
// De keuze van de trainer of manager (Tammo regelt de papieren): spelers die vast in de basis staan of op de bank blijven, per speler in het eigen profiel.
export const MAX_PINS = 8;
export const pinsOf = (c) => ({ start: (c && c.pins && c.pins.start) || [], bench: (c && c.pins && c.pins.bench) || [] });
// where: 'start', 'bench' of 'auto' (terug naar de beste elf). Alleen voor een Trainer of Manager, alleen voor spelers van de eigen selectie, nooit de eigen speler of zijn teamgenoot op de bank.
export function setLineupPin(c, playerId, where, getClub) {
  if (!c || !c.roles || !c.roles.trainer) return { career: c, ok: false, reason: 'Nog geen trainer' };
  if (!squadOf(c, c.club, getClub).some((x) => x.id === playerId)) return { career: c, ok: false, reason: 'Die speler is er niet' };
  const cur = pinsOf(c), start = cur.start.filter((x) => x !== playerId), bench = cur.bench.filter((x) => x !== playerId);
  if (where === 'start') { if (start.length >= MAX_PINS) return { career: c, ok: false, reason: `Hooguit ${MAX_PINS} vaste basisspelers` }; start.push(playerId); }
  else if (where === 'bench') { if (bench.length >= MAX_PINS) return { career: c, ok: false, reason: `Hooguit ${MAX_PINS} spelers op de bank` }; bench.push(playerId); }
  else if (where !== 'auto') return { career: c, ok: false, reason: 'Onbekende keuze' };
  return { career: { ...c, pins: { start, bench } }, ok: true, where };
}
export const clearLineupPins = (c) => (c && c.pins ? { ...c, pins: { start: [], bench: [] } } : c);
// De opstelling van de trainer: de beste elf per rol van de vorming (basis) en de rest op de bank.
export function lineupOf(c, getClub, formationRoles) {
  const squad = squadOf(c, c.club, getClub);
  const lu = lineupFor(squad, formationRoles, { must: c.roles.trainer ? [] : [c.me.id, c.mate.id], ...pinsOf(c) });
  const ids = new Set(lu.map((x) => x.player && x.player.id));
  return { basis: lu.map((x) => x.player).filter(Boolean), bank: squad.filter((p) => !ids.has(p.id)).sort((a, b) => playerRating(b) - playerRating(a)) };
}
export function managerBuy(c, playerId, getClub, seasons = 2) {
  if (!c.roles.manager) return { career: c, ok: false, reason: 'Nog geen manager' };
  if (!T.inBreak(c)) return { career: c, ok: false, reason: 'Alleen in de pauze tussen de seizoenen' };
  const club = getClub(c.club), p = (c.market.pool || []).find((x) => x.id === playerId);
  if (!p) return { career: c, ok: false, reason: 'Die speler is er niet' };
  const r = T.buyPlayer(c.market, club, p, squadOf(c, c.club, getClub), seasons);
  return r.ok ? { career: { ...c, market: r.market }, ok: true, price: r.price } : { career: c, ok: false, reason: r.reason };
}
export function managerRenew(c, playerId, getClub, seasons = 1) {
  if (!c.roles.manager) return { career: c, ok: false, reason: 'Nog geen manager' };
  if (!T.inBreak(c)) return { career: c, ok: false, reason: 'Alleen in de pauze tussen de seizoenen' };
  const r = T.renewPlayer(c.market, getClub(c.club), playerId, seasons);
  return r.ok ? { career: { ...c, market: r.market }, ok: true, cost: r.cost, contract: r.contract } : { career: c, ok: false, reason: r.reason };
}
export const managerAdvice = (c, getClub) => (c && c.roles && c.roles.manager && c.market ? T.agentAdvice(c.market, getClub(c.club) || { id: c.club, budget: 0 }, squadOf(c, c.club, getClub)) : null);
// De ondergrens van een selectie die je als manager kunt uitverkopen: genoeg voor een basis en een bank, en een keeper.
export const MIN_SQUAD = 14, MIN_ROLE = { keeper: 1, verdediger: 3, middenvelder: 3, aanvaller: 2 };
export function managerSell(c, playerId, getClub) {
  if (!c.roles.manager) return { career: c, ok: false, reason: 'Nog geen manager' };
  if (!T.inBreak(c)) return { career: c, ok: false, reason: 'Alleen in de pauze tussen de seizoenen' };
  const p = squadOf(c, c.club, getClub).find((x) => x.id === playerId);
  if (!p || p.protagonist) return { career: c, ok: false, reason: 'Die speler blijft' };
  const sq = squadOf(c, c.club, getClub);
  if (sq.length <= MIN_SQUAD) return { career: c, ok: false, reason: `De selectie houdt minstens ${MIN_SQUAD} spelers` };
  if (sq.filter((x) => x.role === p.role).length <= (MIN_ROLE[p.role] || 1)) return { career: c, ok: false, reason: `Je houdt minstens ${MIN_ROLE[p.role] || 1} ${(MIN_ROLE[p.role] || 1) === 1 ? 'speler' : 'spelers'} op die positie` };
  const r = T.sellPlayer(c.market, getClub(c.club), p);
  return { career: { ...c, market: r.market }, ok: true, price: r.price };
}
export const clubCash = (c, getClub) => T.cashOf(c.market || T.emptyMarket(), getClub(c.club) || { id: c.club, budget: 0 });

// ---- opslag ----
function normSponsors(sp) {
  if (!sp || typeof sp !== 'object' || !Array.isArray(sp.slots)) return null;
  const deals = sp.slots.slice(0, Sp.MAX_SPONSOR_DEALS).filter((x) => x && Sp.SORTS[x.sort] && Sp.GOALS[x.goal] && Number.isFinite(x.amount)).map((x) => ({ id: String(x.id).slice(0, 20), sort: x.sort, naam: String(x.naam || '').slice(0, 40), goal: x.goal, amount: Math.max(0, Math.min(2000, Math.round(x.amount))), accepted: !!x.accepted, paid: !!x.paid, osm: Number.isFinite(x.osm) ? x.osm : null }));
  return { nr: Math.max(1, sp.nr | 0), slots: deals };
}
function normMarket(m) {
  const e = T.emptyMarket();
  if (!m || typeof m !== 'object') return e;
  const cash = {}; for (const [k, v] of Object.entries(m.cash && typeof m.cash === 'object' ? m.cash : {}).slice(0, 60)) if (Number.isFinite(v)) cash[String(k).slice(0, 40)] = Math.max(0, Math.round(v));
  const imports = {}; for (const [k, v] of Object.entries(m.imports && typeof m.imports === 'object' ? m.imports : {}).slice(0, 60)) imports[String(k).slice(0, 40)] = (Array.isArray(v) ? v : []).map((p) => { const r = readPlayer(p); return r ? { ...r, boughtFor: Number.isFinite(p.boughtFor) ? p.boughtFor : undefined, contract: Number.isInteger(p.contract) ? Math.min(T.CONTRACT_MAX, Math.max(0, p.contract)) : undefined } : null; }).filter(Boolean).slice(0, 12);
  const gone = {}; for (const [k, v] of Object.entries(m.gone && typeof m.gone === 'object' ? m.gone : {}).slice(0, 60)) gone[String(k).slice(0, 40)] = (Array.isArray(v) ? v : []).filter((x) => typeof x === 'string').slice(0, 30);
  return { ...e, cash, imports, gone, pool: (Array.isArray(m.pool) ? m.pool : []).map(readPlayer).filter(Boolean).slice(0, 20), sinks: Number.isFinite(m.sinks) ? Math.round(m.sinks) : 0, nr: Math.max(0, Math.min(999, m.nr | 0)) };
}
export const serialize = (c) => JSON.stringify(c);
const isLeague = (l) => !!l && typeof l === 'object' && Array.isArray(l.clubs) && l.clubs.every((x) => typeof x === 'string') && l.rows && typeof l.rows === 'object' && Number.isInteger(l.round) && l.round >= 0 && l.round <= S.ROUNDS && Array.isArray(l.results) && l.clubs.every((id) => Array.isArray(l.rows[id]) && l.rows[id].length === 6 && l.rows[id].every((v) => Number.isInteger(v) && v >= 0 && v < 1000));
// Een veilige lezer: kapotte of onbekende data geeft een geldig, leeg profiel (de uitnodiging begint opnieuw); de wedstrijdsim blijft altijd bruikbaar.
export function normalize(raw) {
  let d = raw;
  if (typeof raw === 'string') { try { d = JSON.parse(raw); } catch (e) { return newCareer(); } }
  if (!d || typeof d !== 'object' || d.v !== VERSION) return newCareer();
  if (!d.started) return { ...newCareer(), invited: !!d.invited, inviteDay: Number.isInteger(d.inviteDay) ? d.inviteDay : null, invites: Math.max(0, Math.min(9, d.invites | 0)), inviteWorld: Number.isInteger(d.inviteWorld) ? d.inviteWorld : null };   // alleen de uitnodiging blijft bewaard
  try {
    const me = readPlayer(d.me), mate = readPlayer(d.mate);
    const strList = (l) => Array.isArray(l) && l.every((x) => typeof x === 'string');
    const w = d.world;
    if (!me || !mate || !w || !strList(w.kroon) || !strList(w.terp) || !strList(w.talent) || !strList(w.pool) || typeof d.club !== 'string' || (d.char !== 'anita' && d.char !== 'tammo')) return newCareer();
    if (!d.leagues || !['kroon', 'terp', 'talent'].every((k) => isLeague(d.leagues[k]))) return newCareer();
    const num = (v, dflt = 0, max = 1e9) => (Number.isFinite(v) ? Math.max(0, Math.min(max, Math.round(v))) : dflt);
    const cal = Array.isArray(d.cal) ? d.cal.filter((e) => e && ['league', 'cup', 'europe'].includes(e.kind) && Number.isInteger(e.day) && e.day > 0 && e.day < 200).slice(0, 40) : [];
    const st = d.stats && typeof d.stats === 'object' ? d.stats : {};
    const stats = {}; for (const k of ['matches', 'wins', 'draws', 'losses', 'goals', 'assists', 'simulated', 'seasons', 'titles', 'promotions', 'cups', 'europe', 'earned', 'coached']) stats[k] = num(st[k]);
    const ko = (k) => (k && typeof k === 'object' && Array.isArray(k.alive) && Array.isArray(k.rounds) && typeof k.name === 'string' ? k : null);
    const out = {
      ...newCareer(), started: true, char: d.char, role: ROLES[d.role] ? d.role : 'speler', roles: { trainer: !!(d.roles && d.roles.trainer), manager: !!(d.roles && d.roles.manager) }, club: d.club, homeClub: typeof d.homeClub === 'string' ? d.homeClub : d.club,
      world: { kroon: w.kroon.slice(0, 8), terp: w.terp.slice(0, 8), talent: w.talent.slice(0, 8), pool: w.pool.slice(0, 400) }, me, mate, seasonNr: Math.max(1, num(d.seasonNr, 1, 999)), day: num(d.day, 0, 1e6), seasonStart: num(d.seasonStart, 0, 1e6),
      cal, evDone: Math.min(cal.length, num(d.evDone, 0, 100)), leagues: { kroon: d.leagues.kroon, terp: d.leagues.terp, talent: d.leagues.talent }, cup: ko(d.cup), europe: ko(d.europe), europeQ: !!d.europeQ,
      prog: d.prog && typeof d.prog === 'object' ? d.prog : {}, phase: d.phase && typeof d.phase === 'object' ? d.phase : {}, mprog: d.mprog && typeof d.mprog === 'object' ? d.mprog : {}, mphase: d.mphase && typeof d.mphase === 'object' ? d.mphase : {}, fatigue: num(d.fatigue, 0, 100), injury: d.injury && Number.isFinite(d.injury.days) && d.injury.days > 0 ? { days: Math.min(O.MAX_INJURY_DAYS, Math.round(d.injury.days)), text: String(d.injury.text || '').slice(0, 80) } : null,
      history: (Array.isArray(d.history) ? d.history : []).filter((h) => h && ['W', 'D', 'L'].includes(h.r)).slice(-5).map((h) => ({ r: h.r, perf: Math.min(1, Math.max(0, Number(h.perf) || 0)) })),
      trainedDay: Number.isInteger(d.trainedDay) ? d.trainedDay : -1, matchDay: Number.isInteger(d.matchDay) ? d.matchDay : -1, focus: ['pace', 'shot', 'pass', 'stamina', 'defend'].includes(d.focus) ? d.focus : 'shot',
      stats, seasonStats: { goals: num(d.seasonStats && d.seasonStats.goals), assists: num(d.seasonStats && d.seasonStats.assists), played: num(d.seasonStats && d.seasonStats.played) },
      log: [], flags: d.flags && typeof d.flags === 'object' ? Object.fromEntries(Object.entries(d.flags).slice(0, 40).map(([k, v]) => [String(k).slice(0, 24), v === true ? true : v === false ? false : typeof v === 'number' ? v : 0])) : {},
      last: d.last && typeof d.last === 'object' ? { kind: String(d.last.kind || ''), text: String(d.last.text || '').slice(0, 80), outcome: String(d.last.outcome || '') } : null,
      sponsors: normSponsors(d.sponsors), market: normMarket(d.market), tactic: { formation: TACTICS.formations.includes(d.tactic && d.tactic.formation) ? d.tactic.formation : '4-4-2', style: TACTICS.styles.includes(d.tactic && d.tactic.style) ? d.tactic.style : 'evenwichtig' }, pins: normPins(d.pins), offer: d.offer && typeof d.offer.club === 'string' ? { club: d.offer.club, seasons: Math.max(1, Math.min(3, d.offer.seasons | 0)), salaryBonus: Math.max(0, d.offer.salaryBonus | 0) } : null, bezit: normClubBezit(d.bezit),
      settings: { injuries: !(d.settings && d.settings.injuries === false) }, result: d.result && typeof d.result === 'object' ? d.result : null, lastResults: Array.isArray(d.lastResults) ? d.lastResults.slice(-6) : [],
    };
    return out;
  } catch (e) { return newCareer(); }
}
const normPins = (p) => { const ids = (l) => (Array.isArray(l) ? [...new Set(l.filter((x) => typeof x === 'string' && x.length < 40))].slice(0, MAX_PINS) : []); const start = ids(p && p.start); return { start, bench: ids(p && p.bench).filter((x) => !start.includes(x)) }; };
export const clubResolver = (index) => (id) => clubById(id) || (index && index.byId.get(id)) || null;
export { CLUBS, clubById };

// ---- Club-UI: wat de wedstrijdkaart toont (docs/ontwerp/CLUB-UI-24-11.md) ----
const sumPay = (l) => l.reduce((a, x) => a + x.amount, 0);
// Wat een wedstrijd oplevert volgens payFor: spelen (winst, gelijk, verlies) en uitrekenen. Alleen wat de code werkelijk uitbetaalt.
export function payOverview(division, kind) {
  return { winst: sumPay(payFor(division, kind, 'winst', true)), gelijk: sumPay(payFor(division, kind, 'gelijk', true)), verlies: sumPay(payFor(division, kind, 'verlies', true)), uitrekenen: sumPay(payFor(division, kind, 'verlies', false)) };
}
// Sterkte tegen sterkte (gemiddelde van aanval en verdediging van de selectie, zoals teamStrength) met één zin; geen percentage.
export function matchOutlook(c, getClub, m) {
  if (!m) return null;
  const sterkte = (id) => { const s = teamStrength(squadOf(c, id, getClub)); return Math.round((s.attack + s.defense) / 2); };
  const mine = sterkte(c.club), theirs = sterkte(m.opponent), diff = mine - theirs;
  return { mine, theirs, zin: Math.abs(diff) <= 2 ? 'Bijna gelijk' : diff > 0 ? 'Jullie zijn favoriet' : 'Zij zijn favoriet' };
}
