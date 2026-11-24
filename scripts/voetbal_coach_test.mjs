// Test van de coachwedstrijd van de Trainer (#1111): scripts/voetbal_coach_test.mjs. Puur, geen DOM: een sim zonder mensen, tactiek onderweg en het resultaat in de carrière.
import assert from 'node:assert/strict';
import { wgsToWorld } from '../game/js/rdnew.js';
import { HOME_WGS } from '../game/js/voetbalparken.js';
import * as C from '../game/js/voetbalcarriere.js';
import * as K from '../game/js/voetbalcoach.js';
import { loadIndex } from './voetbal_carriere_sim.mjs';
import * as T from '../game/js/voetbaltransfers.js';
import { viewHtml as vh, ui } from '../game/js/voetbalcarriereui.js';
// Club-UI 24-11: de tabs Vandaag, Trainer en Manager zijn Overzicht, Tactiek en het deel Transfers van Selectie; deze test blijft de oude namen gebruiken
const viewHtml = (c, tab, env) => { ui.deel = 'selectie'; if (tab === 'manager') { ui.deel = 'transfers'; tab = 'selectie'; } if (tab === 'trainer') tab = 'tactiek'; if (tab === 'vandaag') tab = 'overzicht'; return vh(c, tab, env); };

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
  assert.match(viewHtml(open, "trainer", env), /speelstijl [(]toets 1[)]/);
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
t('opstelling kiezen: vast in de basis, op de bank, terug naar auto en een geklemde save', () => {
  const c = trainer(), roles = ['keeper', 'verdediger', 'verdediger', 'verdediger', 'verdediger', 'middenvelder', 'middenvelder', 'middenvelder', 'middenvelder', 'aanvaller', 'aanvaller'];
  const auto = C.lineupOf(c, getClub, roles);
  const sterk = auto.basis[1], zwak = auto.bank[auto.bank.length - 1];
  assert.equal(C.setLineupPin(speler(), sterk.id, 'bench', getClub).ok, false, 'alleen een Trainer');
  assert.equal(C.setLineupPin(c, 'nietbestaand', 'start', getClub).ok, false);
  assert.equal(C.setLineupPin(c, sterk.id, 'zomaar', getClub).ok, false);
  const b = C.setLineupPin(c, sterk.id, 'bench', getClub); assert.ok(b.ok);
  assert.ok(!C.lineupOf(b.career, getClub, roles).basis.some((p) => p.id === sterk.id), 'bankspeler niet in de basis');
  const v = C.setLineupPin(b.career, zwak.id, 'start', getClub); assert.ok(v.ok);
  const lu = C.lineupOf(v.career, getClub, roles);
  assert.ok(lu.basis.some((p) => p.id === zwak.id), 'vaste speler in de basis');
  assert.equal(new Set(lu.basis.map((p) => p.id)).size, lu.basis.length, 'niemand dubbel');
  assert.equal(lu.basis.length + lu.bank.length, auto.basis.length + auto.bank.length);
  const coach = K.coachSetup(v.career, getClub); assert.ok(coach.ratings[0].some((x) => x.naam === zwak.name), 'ook de coachwedstrijd volgt de keuze');
  const los = C.setLineupPin(v.career, zwak.id, 'auto', getClub); assert.deepEqual(C.pinsOf(los.career).start, []);
  assert.deepEqual(C.pinsOf(C.clearLineupPins(v.career)), { start: [], bench: [] });
  let vol = c; for (const p of auto.basis.concat(auto.bank)) { const r = C.setLineupPin(vol, p.id, 'bench', getClub); if (r.ok) vol = r.career; }
  assert.equal(C.pinsOf(vol).bench.length, C.MAX_PINS, 'hooguit acht');
  assert.equal(C.lineupOf(vol, getClub, roles).basis.length, 11, 'een bank die nodig is speelt toch');
  const rond = C.normalize(JSON.parse(JSON.stringify({ ...v.career, pins: { start: [zwak.id, zwak.id, 5, 'x'.repeat(80)], bench: [zwak.id, sterk.id, ...Array(20).fill('a:1')] } })));
  assert.deepEqual(C.pinsOf(rond).start, [zwak.id]); assert.ok(!C.pinsOf(rond).bench.includes(zwak.id) && C.pinsOf(rond).bench.length <= C.MAX_PINS, 'save geklemd');
  const oud = JSON.parse(JSON.stringify(speler())); delete oud.pins; assert.deepEqual(C.pinsOf(C.normalize(oud)), { start: [], bench: [] }, 'oude save zonder pins');
});
t('het Manager-scherm en de Trainer-tab tonen de opstelling met knoppen', () => {
  const cm = { ...trainer(), roles: { trainer: true, manager: true } };
  const env = { getClub, money: 100, match: C.nextMatch(cm, getClub), ov: C.summary(cm, getClub), char: 'anita' };
  // Club-UI 24-11: de opstelling staat op Tactiek (een plek op het veld kiezen, dan een speler van de bank); het deel Transfers heeft alleen de markt en de eigen selectie
  const tact = viewHtml(cm, 'trainer', env);
  assert.match(tact, /data-vb="pin:start:/); assert.match(tact, /data-vb="slot:\d+"/); assert.match(tact, /class="vb-veld"/);
  assert.match(viewHtml(cm, 'manager', env), /Clubkas/);
  const lu = C.lineupOf(cm, getClub, ['keeper']); const r = C.setLineupPin(cm, lu.basis[0].id, 'start', getClub);
  assert.match(viewHtml(r.career, 'trainer', env), /data-vb="pin:all"/);
});
console.log(`voetbal_coach_test ok (${n} groepen)`);
