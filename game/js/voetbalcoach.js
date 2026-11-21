// De coachwedstrijd van de Trainer (#1111, epic #1106, docs/VOETBAL-CARRIERE-21-11.md hoofdstuk 6): puur, geen DOM en geen THREE (scripts/voetbal_coach_test.mjs).
// Een Trainer (vanaf seizoen 4) mag een ronde coachen in plaats van spelen: de sim draait met alleen computerspelers (makeMatch zonder mensen, `alleenAi`), de opstelling komt uit de
// tactiek van de Trainer-tab en de vorming of speelstijl is onderweg te wisselen (toets 1 en 2 in de wedstrijd), met een rusttijd tussen twee wissels zodat tactiek geen knop is om te spammen.
// Samen spelen: coachen is van de speler zelf (zijn eigen club); een gast kan het niet starten en vrienden beheren je selectie niet.
import { makeMatch, zetTactiek } from './voetbalmatch.js';
import { formationList, cleanFormation, cleanStijl } from './voetbalrules.js';
import { lineupFor } from './voetbalplayers.js';
import * as C from './voetbalcarriere.js';

export const COACH_COOLDOWN_S = 40;          // seconden speeltijd tussen twee tactiekwissels
export const COACH_MAX_CHANGES = 6;           // hooguit zoveel wissels per wedstrijd

export const canCoach = (c) => !!(c && c.roles && c.roles.trainer);

// De opzet van een coachwedstrijd: de ratings van beide teams (geen speler is verplicht in de basis), de clubteams en de tactiek van de Trainer. Null zonder Trainer of zonder wedstrijd.
export function coachSetup(c, getClub) {
  if (!canCoach(c)) return null;
  const m = C.nextMatch(c, getClub);
  if (!m) return null;
  const vorming = cleanFormation('groot', c.tactic && c.tactic.formation), stijl = cleanStijl(c.tactic && c.tactic.style);
  const roles = formationList('groot', vorming).map((x) => x.rol);
  const my = lineupFor(C.squadOf(c, c.club, getClub), roles), opp = lineupFor(C.squadOf(c, m.opponent, getClub), roles);
  const fac = (l) => l.map((x) => ({ naam: x.player ? x.player.name : undefined, f: x.factors }));
  const teamFor = C.matchSetup(c, getClub, formationList('groot', vorming));
  return { teams: teamFor ? teamFor.teams : null, ratings: [fac(my), fac(opp)], vorming, stijl, opponent: m.opponent, match: m };
}

// Maakt de sim: geen mensen, dus `alleenAi`. De wedstrijdduur en de moeilijkheid komen van de aanroeper.
export function makeCoachMatch(setup, { duur = 'normaal', stand = 'standaard', seed = 1, regels = null, timings = null } = {}) {
  if (!setup || !setup.teams) return null;
  const m = makeMatch([], { duur, stand, seed, formaat: 'groot', vorming: setup.vorming, stijl: setup.stijl, teams: setup.teams, ratings: setup.ratings, regels, timings });
  m.coach = { wissels: 0, laatsteT: -1e9 };
  return m;
}

// Een tactiekwissel onderweg: alleen in een coachwedstrijd, nooit tijdens een doelpuntviering, met rusttijd en een maximum. Geeft { ok, reden }.
export function coachTactic(m, { vorming = null, stijl = null } = {}) {
  if (!m || !m.coach || !m.alleenAi) return { ok: false, reden: 'Dit is geen coachwedstrijd' };
  if (!(vorming || stijl)) return { ok: false, reden: 'Niets te wisselen' };
  if (m.fase === 'klaar' || m.fase === 'eind') return { ok: false, reden: 'De wedstrijd is voorbij' };
  if (m.fase === 'goal') return { ok: false, reden: 'Wacht tot na het doelpunt' };
  const wacht = COACH_COOLDOWN_S - (m.tijd - m.coach.laatsteT);
  const rust = m.fase === 'rust';
  if (!rust && wacht > 0) return { ok: false, reden: `Nog ${Math.ceil(wacht)} seconden wachten` };
  if (m.coach.wissels >= COACH_MAX_CHANGES) return { ok: false, reden: 'Je hebt alle wissels gehad' };
  zetTactiek(m, 0, { vorming, stijl });
  m.coach.wissels++; m.coach.laatsteT = m.tijd;
  return { ok: true, reden: '' };
}

// Het resultaat voor de carrière: de uitslag telt, maar de Trainer speelde niet mee (geen doelpunten, geen speeltijd); `coach` laat playEvent de speler-ontwikkeling en blessurekans overslaan.
export function coachResult(m) {
  return { gf: m.score[0], ga: m.score[1], coach: true, stats: { goals: 0, assists: 0, shots: 0, minutes: 0 } };
}
