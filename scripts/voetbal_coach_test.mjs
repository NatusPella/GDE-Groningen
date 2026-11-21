// Test van de coachwedstrijd van de Trainer (#1111): scripts/voetbal_coach_test.mjs. Puur, geen DOM: een sim zonder mensen, tactiek onderweg en het resultaat in de carrière.
import assert from 'node:assert/strict';
import { wgsToWorld } from '../game/js/rdnew.js';
import { HOME_WGS } from '../game/js/voetbalparken.js';
import * as C from '../game/js/voetbalcarriere.js';
import * as K from '../game/js/voetbalcoach.js';
import { loadIndex } from './voetbal_carriere_sim.mjs';
import * as T from '../game/js/voetbaltransfers.js';
import { viewHtml } from '../game/js/voetbalcarriereui.js';
import { tikWedstrijd, snapVoetbal, leesLiveVoetbal } from '../game/js/voetbalmatch.js';

let n = 0;
const t = (naam, f) => { try { f(); n++; } catch (e) { console.error('FAIL', naam); throw e; } };
const index = loadIndex();
const [hx, hy] = wgsToWorld(HOME_WGS.lat, HOME_WGS.lon);
const getClub = C.clubResolver(index);
const speler = () => C.createCareer({ char: 'anita', index, home: { x: hx, y: hy } });
const trainer = () => { const c = speler(); return { ...c, roles: { ...c.roles, trainer: true } }; };
const DT = 1 / 30;

t('alleen een Trainer kan coachen', () => {
  assert.equal(K.canCoach(speler()), false); assert.equal(K.coachSetup(speler(), getClub), null);
  assert.equal(K.canCoach(trainer()), true); assert.ok(K.coachSetup(trainer(), getClub));
  assert.equal(K.makeCoachMatch(null), null);
});
t('de coachwedstrijd heeft geen mensen, elf tegen elf en de tactiek van de Trainer', () => {
  const c = C.withTactic(trainer(), { formation: '4-3-3', style: 'aanvallend' });
  const setup = K.coachSetup(c, getClub);
  assert.equal(setup.vorming, '4-3-3'); assert.equal(setup.stijl, 'aanvallend');
  const m = K.makeCoachMatch(setup, { duur: 'kort', seed: 11 });
  assert.equal(m.mensen.length, 0); assert.equal(m.alleenAi, true); assert.equal(m.perTeam, 11);
  assert.equal(m.tac[0].vorming, '4-3-3'); assert.equal(m.tac[0].stijl, 'aanvallend');
  assert.ok(m.spelers.every((p) => p.slot === null), 'niemand wordt door een mens bestuurd');
});
t('een hele coachwedstrijd loopt uit zonder invoer en geeft een uitslag', () => {
  const m = K.makeCoachMatch(K.coachSetup(trainer(), getClub), { duur: 'kort', seed: 3 });
  for (let i = 0; i < 30 * 600 && m.fase !== 'klaar'; i++) tikWedstrijd(m, DT, () => null);
  assert.equal(m.fase, 'klaar');
  assert.ok(Number.isInteger(m.score[0]) && Number.isInteger(m.score[1]));
  assert.ok(m.spelers.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y)), 'geen NaN');
  const r = K.coachResult(m);
  assert.equal(r.coach, true); assert.equal(r.stats.goals, 0); assert.equal(r.gf, m.score[0]);
});
t('deterministisch: dezelfde opzet en zaad geven dezelfde uitslag', () => {
  const run = () => { const m = K.makeCoachMatch(K.coachSetup(trainer(), getClub), { duur: 'kort', seed: 5 }); for (let i = 0; i < 30 * 600 && m.fase !== 'klaar'; i++) tikWedstrijd(m, DT); return m.score.join('-'); };
  assert.equal(run(), run());
});
t('tactiek onderweg: een wissel verandert de rollen, met rusttijd en een maximum', () => {
  const m = K.makeCoachMatch(K.coachSetup(trainer(), getClub), { duur: 'normaal', seed: 2 });
  for (let i = 0; i < 30 * 12 && m.fase !== 'spel'; i++) tikWedstrijd(m, DT);
  assert.equal(m.fase, 'spel');
  const voor = m.spelers.filter((p) => p.team === 0).map((p) => p.rol).join();
  const a = K.coachTactic(m, { vorming: '3-5-2' });
  assert.equal(a.ok, true); assert.equal(m.tac[0].vorming, '3-5-2');
  assert.notEqual(m.spelers.filter((p) => p.team === 0).map((p) => p.rol).join(), voor);
  const b = K.coachTactic(m, { stijl: 'verdedigend' });
  assert.equal(b.ok, false); assert.match(b.reden, /seconden/);
  for (let i = 0; i < 30 * (K.COACH_COOLDOWN_S + 1) && m.fase !== 'klaar'; i++) tikWedstrijd(m, DT);
  if (m.fase === 'spel') assert.equal(K.coachTactic(m, { stijl: 'verdedigend' }).ok, true);
  assert.equal(K.coachTactic(m, {}).ok, false);
  m.coach.wissels = K.COACH_MAX_CHANGES; m.coach.laatsteT = -1e9;
  assert.match(K.coachTactic(m, { stijl: 'aanvallend' }).reden, /alle wissels|doelpunt|voorbij/);
});
t('een gewone wedstrijd kent geen coachwissel', () => {
  assert.equal(K.coachTactic({ alleenAi: false, coach: null }, { vorming: '4-4-2' }).ok, false);
  assert.equal(K.coachTactic(null, { vorming: '4-4-2' }).ok, false);
});
t('de momentopname van een coachwedstrijd is geldig (een kijkende gast zou hem kunnen lezen)', () => {
  const m = K.makeCoachMatch(K.coachSetup(trainer(), getClub), { duur: 'kort', seed: 4 });
  for (let i = 0; i < 90; i++) tikWedstrijd(m, DT);
  assert.ok(leesLiveVoetbal(snapVoetbal(m, 1)));
});
t('het resultaat telt voor de competitie en het geld, maar niet voor de speler: geen groei, geen blessure, geen speelbonus', () => {
  const c = trainer();
  const gespeeld = C.playEvent(c, getClub, { gf: 2, ga: 0, stats: { goals: 1, minutes: 8 } });
  const gecoacht = C.playEvent(c, getClub, { gf: 2, ga: 0, coach: true, stats: { goals: 0, minutes: 0 } });
  assert.equal(gecoacht.summary.gf, 2); assert.equal(gecoacht.summary.ga, 0); assert.equal(gecoacht.summary.outcome, 'winst');
  assert.equal(gecoacht.career.stats.matches, 1); assert.equal(gecoacht.career.stats.wins, 1); assert.equal(gecoacht.career.stats.coached, 1);
  assert.equal(gecoacht.career.stats.goals, 0); assert.equal(gecoacht.career.seasonStats.played, 0);
  assert.equal(gecoacht.summary.injury, null);
  assert.equal(gecoacht.career.fatigue, c.fatigue, 'coachen kost geen energie');
  const som = (x) => x.summary.earn.reduce((a, e) => a + e.amount, 0);
  assert.ok(som(gecoacht) <= som(gespeeld));
  assert.equal(gespeeld.career.stats.coached, 0);
  const round = C.normalize(JSON.parse(C.serialize(gecoacht.career)));
  assert.equal(round.stats.coached, 1, 'het overleeft opslaan en laden');
});
t('het Trainer-scherm biedt Coach de wedstrijd, de Speler-tabs niet', () => {
  const env = { money: 0, getClub, unlocked: true, hint: '', char: 'anita' };
  const open = { ...trainer(), day: 3 };
  assert.match(viewHtml(open, 'trainer', env), /data-vb="coach"/);
  assert.match(viewHtml(open, 'trainer', env), /toets 1 speelstijl/);
  assert.doesNotMatch(viewHtml(speler(), 'vandaag', env), /data-vb="coach"/);
});
t('het Manager-scherm toont het contract, Verleng en het voorstel van Tammo', () => {
  const env = { money: 0, getClub, unlocked: true, hint: '', char: 'anita' };
  let c = { ...trainer(), roles: { trainer: true, manager: true } };
  c = { ...c, evDone: c.cal.length };       // de pauze
  const club = getClub(c.club);
  const agent = (c.market.pool && c.market.pool[0]) || T.freeAgents(3, 1)[0];
  const r = T.buyPlayer({ ...c.market, cash: { ...c.market.cash, [c.club]: 900000 } }, club, agent, C.squadOf(c, c.club, getClub), 2);
  const cm = { ...c, market: r.market };
  const html = viewHtml(cm, 'manager', env);
  assert.match(html, /contract nog 2 seizoenen/); assert.match(html, /data-vb="renew:/);
  const v = C.managerRenew(cm, agent.id, getClub, 1);
  assert.ok(v.ok && v.contract === 3);
  assert.equal(C.managerRenew({ ...cm, evDone: 0 }, agent.id, getClub, 1).ok, false, 'alleen in de pauze');
  assert.equal(C.managerRenew({ ...cm, roles: { trainer: true, manager: false } }, agent.id, getClub, 1).ok, false);
});
console.log(`voetbal_coach_test ok (${n} groepen)`);
