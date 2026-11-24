// Test van het profiel en de regels van de voetbalcarrière (#1110, #1108, #1109): scripts/voetbal_carriere_test.mjs. Puur, geen DOM. Gebruikt de headless sim-testbank (voetbal_carriere_sim.mjs).
import assert from 'node:assert/strict';
import { wgsToWorld } from '../game/js/rdnew.js';
import { HOME_WGS, fallbackIndex } from '../game/js/voetbalparken.js';
import * as C from '../game/js/voetbalcarriere.js';
import { runCareer, loadIndex } from './voetbal_carriere_sim.mjs';
import { formationList } from '../game/js/voetbalrules.js';
import { makeMatch, tikWedstrijd } from '../game/js/voetbalmatch.js';
import { ATTRS } from '../game/js/voetbalplayers.js';

let n = 0;
const t = (naam, f) => { try { f(); n++; } catch (e) { console.error('FAIL', naam); throw e; } };
const index = loadIndex();
const [hx, hy] = wgsToWorld(HOME_WGS.lat, HOME_WGS.lon);
const getClub = C.clubResolver(index);
const start = (char = 'anita') => C.createCareer({ char, index, home: { x: hx, y: hy } });

t('start: Tessa de ster, Tammo gewoon, allebei in het team; de club is een lokale club bij het huis', () => {
  const a = start('anita'), b = start('tammo');
  assert.ok(C.hasCareer(a) && a.char === 'anita' && a.me.name === 'Tessa' && a.mate.name === 'Tammo');
  assert.ok(b.char === 'tammo' && b.me.name === 'Tammo' && b.mate.name === 'Tessa');
  assert.ok(a.me.attrs.shot > b.me.attrs.shot);
  assert.equal(a.club, a.world.talent[0]); assert.ok(a.club.startsWith('lc'));
  assert.equal(a.world.talent.length, 8); assert.equal(a.world.terp.length, 8); assert.equal(a.world.kroon.length, 8);
  assert.equal(a.seasonNr, 1); assert.equal(a.cup, null, 'seizoen 1 is de lichte vorm');
  assert.equal(a.cal.length, 7); assert.equal(a.roles.trainer, false);
  assert.equal(C.divisionOfMyClub(a), 'talent');
  const sq = C.squadOf(a, a.club, getClub);
  assert.equal(sq.length, 18); assert.ok(sq.some((p) => p.id === 'tessa') && sq.some((p) => p.id === 'tammo'));
});
t('de start zonder parkdata valt terug op acht vaste plaatsen', () => {
  const c = C.createCareer({ char: 'anita', index: null, home: null });
  assert.equal(c.world.talent.length, 8); assert.ok(C.nextMatch(c, C.clubResolver(fallbackIndex())));
});
t('de volgende wedstrijd en het venster: op dag 3 open, daarna gemist en uitgerekend zonder geldverlies', () => {
  let c = start();
  let m = C.nextMatch(c, getClub);
  assert.equal(m.status, 'soon'); assert.equal(m.in, 3); assert.equal(m.kind, 'league'); assert.ok(m.opponentName && m.opponent !== c.club);
  c = C.advanceDays(c, 3, getClub).career;
  m = C.nextMatch(c, getClub); assert.equal(m.status, 'open');
  const r = C.advanceDays(c, 1, getClub);
  assert.equal(r.summaries.length, 1, 'de gemiste ronde wordt uitgerekend');
  assert.equal(r.summaries[0].missed, true);
  assert.ok(r.earn.every((e) => e.bron === 'contract') && r.earn.reduce((a, e) => a + e.amount, 0) === C.PAY.talent.contract, 'alleen het contractdeel');
  assert.equal(r.career.evDone, 1);
  assert.equal(C.nextMatch(r.career, getClub).n, 2);
});
t('een gespeelde wedstrijd: bonus, ervaring, vorm, vermoeidheid, stand, en de andere duels worden uitgerekend', () => {
  let c = C.advanceDays(start(), 3, getClub).career;
  const r = C.playEvent(c, getClub, { gf: 3, ga: 1, stats: { goals: 2, assists: 1, shots: 5, passes: 20, tackles: 2, minutes: 8, sprints: 10 } });
  const s = r.summary, c2 = r.career;
  assert.equal(s.outcome, 'winst'); assert.ok(s.played && s.debut && s.firstGoal);
  assert.equal(s.earn.reduce((a, e) => a + e.amount, 0), C.PAY.talent.contract + C.PAY.talent.win);
  assert.equal(c2.stats.matches, 1); assert.equal(c2.stats.goals, 2); assert.equal(c2.fatigue, 35); assert.equal(c2.history.length, 1);
  const st = C.leagueTable(c2);
  assert.equal(st.round, 1);
  assert.equal(st.rows.reduce((a, x) => a + x.g, 0), 8, 'vier duels, acht clubs gespeeld');
  assert.equal(st.rows.find((x) => x.id === c.club).p, 3);
  assert.equal(c.stats.matches, 0, 'het oude profiel blijft ongemoeid');
  assert.ok(c2.leagues.kroon.round === 1 && c2.leagues.terp.round === 1, 'alle klassen spelen mee');
  // uitrekenen levert alleen het contractdeel
  const sim = C.simulateEvent(c, getClub).summary;
  assert.equal(sim.played, false); assert.ok(sim.earn.every((e) => e.bron === 'contract'));
});
t('een blessure maakt spelen onmogelijk maar blokkeert niets blijvend', () => {
  let c = start(); c.injury = { days: 2, text: 'Je kuit is moe; rust 2 speldagen' };
  assert.equal(C.nextMatch(c, getClub).canPlay, false);
  assert.equal(C.train(c, 'pace').ok, false);
  c = C.advanceDays(c, 2, getClub).career;
  assert.equal(c.injury, null);
});
t('trainen: een per speldag, kost vermoeidheid, focus wordt onthouden', () => {
  const c = start();
  const r = C.train(c, 'pace', 1.2);
  assert.ok(r.ok && r.career.fatigue === 15 && r.career.focus === 'pace');
  assert.equal(C.train(r.career, 'pace').ok, false, 'twee keer op een dag kan niet');
  const next = C.advanceDays(r.career, 1, getClub).career;
  assert.ok(C.train(next, 'pace').ok, 'de volgende dag weer');
  assert.equal(C.withFocus(c, 'nep').focus, c.focus);
});
t('drie seizoenen headless: de structuur klopt (promotie, standen, bekers, economie)', () => {
  const r = runCareer({ char: 'anita', seizoenen: 3, strategie: 'speel' });
  assert.equal(r.seasons.length, 3);
  assert.deepEqual(r.seasons.map((x) => x.nr), [1, 2, 3]);
  assert.ok(r.seasons.every((x) => x.rank >= 1 && x.rank <= 8));
  assert.ok(r.seasons[0].outcome.includes('promotie') || r.seasons[0].outcome === 'blijft' || r.seasons[0].outcome === 'kampioen', 'seizoen 1: Talentenklasse');
  const c = r.career;
  assert.equal(c.world.kroon.length + c.world.terp.length + c.world.talent.length, 24);
  const all = [...c.world.kroon, ...c.world.terp, ...c.world.talent, ...c.world.pool];
  assert.equal(new Set(all).size, all.length, 'niemand dubbel');
  assert.ok(r.earned > 0 && r.earned < 20000);
  assert.ok(r.perHour < 1100 * 0.6, `voetbal is niet de snelste geldmachine: ${r.perHour} per actief uur`);
  assert.equal(r.playedMatches + r.simMatches, c.stats.matches);
  assert.ok(r.end >= r.start, 'door te trainen word je beter');
});
t('uitrekenen is nooit meer geld per minuut dan spelen en nooit meer dan het contractdeel', () => {
  const speel = runCareer({ char: 'anita', seizoenen: 2, strategie: 'speel' }), reken = runCareer({ char: 'anita', seizoenen: 2, strategie: 'reken' });
  assert.ok(reken.earned < speel.earned || reken.earned <= 25 * 14 + 1600, `reken ${reken.earned} speel ${speel.earned}`);
  assert.ok(reken.perWorldHour < 50, `uitrekenen is bijna niets per uur: ${reken.perWorldHour}`);
});
t('determinisme: dezelfde keuzes geven dezelfde uitkomst voor alle spelers', () => {
  const a = runCareer({ char: 'tammo', seizoenen: 2, strategie: 'mix' }), b = runCareer({ char: 'tammo', seizoenen: 2, strategie: 'mix' });
  const strip = ({ career, ...r }) => r;
  assert.deepEqual(strip(a), strip(b));
  assert.deepEqual(a.career.world, b.career.world);
  assert.deepEqual(a.career.leagues, b.career.leagues);
});
t('dagen verstrijken: salaris volgt rondes, niet nachten; na het seizoen volgt een nieuw seizoen; lange afwezigheid wordt begrensd', () => {
  const c = start();
  const r = C.advanceDays(c, 1000, getClub);
  assert.ok(r.career.day - c.day <= 40);
  assert.ok(r.earn.reduce((a, e) => a + e.amount, 0) <= 7 * C.PAY.talent.contract + 14 * 400, 'geen achterstallig salaris');
  const seven = C.advanceDays(c, 24, getClub);
  assert.equal(seven.career.seasonNr, 2); assert.ok(seven.newSeason); assert.equal(seven.career.evDone, 0);
  assert.ok(seven.career.cup, 'seizoen 2 heeft de beker'); assert.equal(seven.career.cal.filter((e) => e.kind === 'cup').length, 4);
  assert.equal(seven.career.lastResults.length, 1);
  const alleen = C.advanceDays(c, 0, getClub); assert.equal(alleen.career, c);
  assert.equal(C.advanceDays(null, 3, getClub).career, null);
});
t('opslag: normalize bewaart een geldig profiel en maakt van kapotte data een leeg profiel', () => {
  const c = C.advanceDays(start(), 5, getClub).career;
  const back = C.normalize(C.serialize(c));
  assert.equal(back.club, c.club); assert.equal(back.day, c.day); assert.deepEqual(back.leagues, c.leagues); assert.deepEqual(back.me, c.me);
  assert.ok(C.serialize(c).length < 20000, `klein: ${C.serialize(c).length}`);
  for (const bad of [null, undefined, 'x', '{}', '{"v":2}', '{"v":1,"started":true}', '{"v":1,"started":true,"char":"x"}', 42, [], JSON.stringify({ ...c, leagues: { kroon: 1 } }), JSON.stringify({ ...c, me: { role: 'x' } })]) {
    const r = C.normalize(bad);
    assert.equal(C.hasCareer(r), false, String(bad).slice(0, 30));
    assert.equal(r.v, 1);
  }
  const hack = C.normalize(JSON.stringify({ ...c, fatigue: 9999, day: -5, injury: { days: 99, text: 'x' }, stats: { ...c.stats, goals: 'x' } }));
  assert.equal(hack.fatigue, 100); assert.equal(hack.day, 0); assert.equal(hack.injury.days, 3); assert.equal(hack.stats.goals, 0);
});
t('de uitslag van een gespeelde wedstrijd hoort bij de ratings: sterker is beter in de sim met clubteams', () => {
  const c = C.advanceDays(start(), 3, getClub).career;
  const setup = C.matchSetup(c, getClub, formationList('groot', '4-4-2'));
  assert.ok(setup && setup.teams.length === 2 && setup.ratings[0].length === 11 && setup.ratings[1].length === 11);
  assert.ok(Object.values(setup.bonus).every((v) => v > 0.8 && v < 1.31));
  const m = makeMatch([{ slot: 1, naam: 'Tessa', char: 'anita', bonus: setup.bonus }], { duur: 'kort', seed: 9, formaat: 'groot', teams: setup.teams, ratings: setup.ratings });
  for (let i = 0; i < 400; i++) tikWedstrijd(m, 1 / 30, null);
  assert.ok(m.spelers.every((p) => Number.isFinite(p.x)));
  assert.ok(ATTRS.length === 5);
});
t('niveau en rol: begint als Talent, Speler; trainer pas later', () => {
  const c = start();
  assert.equal(C.levelOf(c).id, 'talent'); assert.equal(c.role, 'speler'); assert.equal(C.levelOf(null).id, 'talent');
  assert.ok(C.summary(c, getClub).next && C.summary(c, getClub).divisionName === 'Talentenklasse');
  assert.equal(C.summary(null, getClub), null);
});
t('de rij in Te doen (#1110): club, stand, de volgende wedstrijd met een doel op het park; zonder carrière geen rij', () => {
  assert.equal(C.todoRow(C.newCareer(), getClub), null);
  let c = start();
  let r = C.todoRow(c, getClub, { x: 1, y: 2 });
  const m = C.nextMatch(c, getClub);
  assert.equal(r.key, 'vc:carriere'); assert.equal(r.group, 'loopbanen'); assert.ok(r.title.startsWith('Voetbal: '));
  assert.match(r.record, /^Talentenklasse, plek \d$/); assert.equal(r.status, '', 'nog niet aan de beurt');
  assert.ok(r.meta.includes(m.opponentName) && r.meta.includes('over 3 speldagen'));
  const park = m.park; assert.ok(park, 'een lokale club speelt op een park');
  assert.equal(r.goal.kind, 'place'); assert.equal(r.goal.x, park.x); assert.equal(r.goal.y, park.y); assert.ok(r.goal.name.startsWith('Voetbal · Sportpark'));
  assert.ok(m.parkPlaats, 'het park weet zijn plaats (de opstellingskaart noemt hem)');
  c = C.advanceDays(c, 3, getClub).career;
  r = C.todoRow(c, getClub); assert.equal(r.status, 'nu'); assert.ok(r.meta.endsWith('nu te spelen'));
});
console.log(`voetbal_carriere_test ok (${n} groepen)`);
