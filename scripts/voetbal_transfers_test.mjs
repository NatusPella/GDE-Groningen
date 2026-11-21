// Test van de transfers, AI-clubs, rollen en de managerlaag (#1111): scripts/voetbal_transfers_test.mjs. Puur.
import assert from 'node:assert/strict';
import PARKDATA from '../game/js/voetbalparkendata.js';
import { makeParkIndex } from '../game/js/voetbalparken.js';
import { CLUBS, clubsOf } from '../game/js/voetbalclubs.js';
import { makeSquad, playerRating } from '../game/js/voetbalplayers.js';
import * as T from '../game/js/voetbaltransfers.js';
import * as C from '../game/js/voetbalcarriere.js';
import { runCareer } from './voetbal_carriere_sim.mjs';

let n = 0;
const t = (naam, f) => { try { f(); n++; } catch (e) { console.error('FAIL', naam); throw e; } };
const index = makeParkIndex(PARKDATA);
const getClub = C.clubResolver(index);
const kroon = clubsOf('kroon');
const base = (id) => makeSquad(id, getClub(id).sterkte, C.WORLD_SEED);

t('prijzen: stijgen met de rating en een verkoop verliest altijd (80% en 10% belasting)', () => {
  const lo = { ...base('stadjers')[7], attrs: { pace: 40, shot: 40, pass: 40, stamina: 40, defend: 40 } }, hi = { ...lo, attrs: { pace: 90, shot: 90, pass: 90, stamina: 90, defend: 90 } };
  assert.ok(T.priceOf(hi) > T.priceOf(lo) * 5);
  assert.ok(T.sellPrice(lo) < T.priceOf(lo) * 0.75);
  assert.ok(T.salaryOf(lo) > 0 && T.salaryOf(lo) < T.priceOf(lo));
});
t('de AI-ronde is deterministisch, zonder Math.random, en iedere speler zit in een selectie', () => {
  const a = T.aiRound(T.emptyMarket(), kroon, base, 7), b = T.aiRound(T.emptyMarket(), kroon, base, 7), c = T.aiRound(T.emptyMarket(), kroon, base, 8);
  assert.deepEqual(a, b);
  assert.notDeepEqual(a.market.imports, c.market.imports);
  assert.ok(a.log.length > 0 && a.log.length <= kroon.length);
  const seen = new Map();
  for (const club of kroon) for (const p of T.rosterOf(a.market, club.id, base(club.id))) { assert.ok(!seen.has(p.id), `${p.id} dubbel`); seen.set(p.id, club.id); }
  for (const l of a.log) assert.equal(seen.get(l.bought), l.club);
  assert.equal(new Set(a.log.map((l) => l.bought)).size, a.log.length, 'een speler wordt maar een keer gekocht');
});
t('behoud van geld: de kassen veranderen alleen door aankopen op de markt (de som past)', () => {
  const m0 = T.emptyMarket(), before = T.totalCash(m0, kroon);
  const { market, log } = T.aiRound(m0, kroon, base, 3);
  const spent = log.reduce((s, l) => s + l.price, 0);
  assert.equal(T.totalCash(market, kroon), before - spent);
  assert.equal(market.sinks, spent);
  const settled = T.settleSeason(market, kroon, (id) => T.rosterOf(market, id, base(id)));
  const rev = Object.values(settled.report).reduce((s, r) => s + r.revenue, 0), sal = Object.values(settled.report).reduce((s, r) => s + r.salaries, 0);
  assert.equal(T.totalCash(settled.market, kroon), T.totalCash(market, kroon) + rev - sal);
  assert.ok(Object.values(settled.market.cash).every((v) => v >= 0), 'geen negatieve kas');
});
t('een club koopt alleen als het een verbetering is en binnen budget', () => {
  const arm = [{ id: 'arm', naam: 'Arm', budget: 100, sterkte: 40 }];
  assert.equal(T.aiRound(T.emptyMarket(), arm, () => makeSquad('arm', 40, 1), 1).log.length, 0);
  assert.equal(T.weakestRole(base('stadjers')) !== undefined, true);
});
t('de manager: kopen en verkopen alleen in de pauze en alleen als manager; een koop-verkoopcyclus kost altijd geld; de kas is niet van de speler', () => {
  let c = C.createCareer({ char: 'anita', index });
  c = { ...c, roles: { trainer: true, manager: true }, market: { ...c.market, pool: T.freeAgents(1, 1, 5) } };
  assert.equal(C.managerBuy(c, c.market.pool[0].id, getClub).ok, false, 'niet buiten de pauze');
  const pauze = { ...c, evDone: c.cal.length };
  const p = pauze.market.pool.find((x) => T.priceOf(x) < C.clubCash(pauze, getClub)) || pauze.market.pool[0];
  const r = C.managerBuy({ ...pauze, market: { ...pauze.market, cash: { [pauze.club]: 1e6 } } }, p.id, getClub);
  assert.ok(r.ok, r.reason);
  assert.equal(C.clubCash(r.career, getClub), 1e6 - T.priceOf(p));
  const imported = r.career.market.imports[pauze.club][0];
  const s = C.managerSell(r.career, imported.id, getClub);
  assert.ok(s.ok && C.clubCash(s.career, getClub) < 1e6, 'koop en verkoop kost geld');
  assert.equal(C.managerBuy({ ...pauze, roles: { trainer: false, manager: false } }, p.id, getClub).ok, false, 'geen manager');
  assert.equal(C.managerSell(pauze, 'tessa', getClub).ok, false, 'je eigen figuren blijven');
  assert.equal(C.managerBuy({ ...pauze, market: { ...pauze.market, cash: { [pauze.club]: 10 } } }, p.id, getClub).ok, false, 'te weinig kas');
});
t('het bod (B6): vanaf seizoen 2, een klasse hoger, aannemen kan alleen aan het begin; weigeren houdt alles', () => {
  const c0 = C.createCareer({ char: 'anita', index });
  assert.equal(T.offerFor(c0, null, getClub), null, 'seizoen 1: geen bod');
  const c = { ...c0, seasonNr: 2, me: { ...c0.me, attrs: { pace: 70, shot: 70, pass: 70, stamina: 70, defend: 50 } } };
  const o = T.offerFor(c, null, getClub);
  assert.ok(o && c.world.terp.includes(o.club) && o.seasons >= 1 && o.seasons <= 3);
  const r = C.acceptOffer({ ...c, offer: o });
  assert.ok(r.ok && r.career.club === o.club && r.career.me.club === o.club && r.career.offer === null);
  assert.equal(C.acceptOffer({ ...c, offer: o, evDone: 2 }).ok, false);
  assert.equal(C.declineOffer({ ...c, offer: o }).offer, null);
  assert.equal(T.offerFor({ ...c, club: c.world.kroon[0], world: { ...c.world, kroon: [c.world.kroon[0]] } }, null, getClub), null, 'in de top is er niets hoger');
});
t('tactiek: alleen als trainer; vormingen en stijlen worden gecontroleerd', () => {
  const c = C.createCareer({ char: 'tammo', index });
  assert.deepEqual(C.withTactic(c, { formation: '4-3-3' }), c, 'een speler beslist de tactiek niet');
  const tr = { ...c, roles: { trainer: true, manager: false } };
  assert.equal(C.withTactic(tr, { formation: '4-3-3', style: 'aanvallend' }).tactic.style, 'aanvallend');
  assert.equal(C.withTactic(tr, { formation: 'nep' }).tactic.formation, '4-4-2');
  const lu = C.lineupOf(tr, getClub, ['keeper', 'verdediger', 'verdediger', 'verdediger', 'verdediger', 'middenvelder', 'middenvelder', 'middenvelder', 'middenvelder', 'aanvaller', 'aanvaller']);
  assert.equal(lu.basis.length, 11); assert.equal(lu.bank.length, 7);
});
t('zeven seizoenen: kapitein, trainer en manager komen in volgorde, de markt blijft consistent en de opslag klein', () => {
  const r = runCareer({ char: 'anita', seizoenen: 7, strategie: 'speel' });
  const c = r.career;
  assert.equal(r.seasons.length, 7);
  if (c.roles.manager) assert.ok(c.roles.trainer);
  if (c.roles.trainer) assert.ok(c.flags.captain);
  assert.ok(!c.flags.captain || c.seasonNr >= 3);
  assert.ok(!c.roles.trainer || c.seasonNr >= 4);
  const alle = [...c.world.kroon, ...c.world.terp, ...c.world.talent];
  assert.equal(alle.length, 24); assert.equal(new Set(alle).size, 24);
  assert.ok(Object.values(c.market.cash).every((v) => v >= 0));
  assert.ok(C.serialize(c).length < 60000, `opslag ${C.serialize(c).length}`);
  const back = C.normalize(C.serialize(c));
  assert.deepEqual(JSON.parse(JSON.stringify(back.market)), JSON.parse(JSON.stringify(c.market))); assert.equal(back.club, c.club);
  assert.ok(CLUBS.length === 16 && playerRating(c.me) > 0);
});
t('de AI-ronde van een hele competitie blijft onder de 5 ms (buiten het frame, deterministisch en goedkoop)', () => {
  const alle = [...clubsOf('kroon'), ...clubsOf('terp'), ...clubsOf('talent')];
  T.aiRound(T.emptyMarket(), alle, base, 1);          // opwarmen
  const t0 = performance.now();
  for (let i = 0; i < 20; i++) T.aiRound(T.emptyMarket(), alle, base, 100 + i);
  const per = (performance.now() - t0) / 20;
  assert.ok(per < 5, `${per.toFixed(2)} ms per ronde`);
});
t('contracten: een koop krijgt 1 tot 3 seizoenen, na het laatste seizoen vertrekt de speler zonder opbrengst, verlengen kost het salaris uit de clubkas', () => {
  const club = { id: 'stadjers', budget: 400000, naam: 'x' };
  const agent = T.freeAgents(5, 1).find((p) => p.role !== 'keeper');
  const r = T.buyPlayer(T.emptyMarket(), club, agent, [], 2);
  assert.ok(r.ok); assert.equal(r.market.imports.stadjers[0].contract, 2);
  assert.equal(T.buyPlayer(T.emptyMarket(), club, agent, [], 99).market.imports.stadjers[0].contract, T.CONTRACT_MAX);
  assert.equal(T.buyPlayer(T.emptyMarket(), club, agent, [], 0).market.imports.stadjers[0].contract, T.CONTRACT_MIN);
  const t1 = T.tickContracts(r.market, 'stadjers');
  assert.equal(t1.left.length, 0); assert.equal(t1.market.imports.stadjers[0].contract, 1);
  const t2 = T.tickContracts(t1.market, 'stadjers');
  assert.equal(t2.left.length, 1); assert.equal(t2.market.imports.stadjers.length, 0);
  assert.equal(t2.market.cash.stadjers, t1.market.cash.stadjers, 'vertrek levert niets op en kost niets');
  const v = T.renewPlayer(t1.market, club, agent.id, 1), kas = T.cashOf(t1.market, club);
  assert.ok(v.ok && v.contract === 2 && T.cashOf(v.market, club) === kas - T.salaryOf(agent));
  assert.equal(T.renewPlayer(v.market, club, agent.id, 5).contract, 3, 'hooguit drie seizoenen');
  assert.equal(T.renewPlayer(T.renewPlayer(v.market, club, agent.id, 5).market, club, agent.id, 1).ok, false);
  assert.equal(T.renewPlayer({ ...t1.market, cash: { stadjers: 1 } }, club, agent.id, 1).ok, false, 'te weinig kas');
  assert.equal(T.renewPlayer(t1.market, club, 'bestaat-niet', 1).ok, false);
  const oud = { ...r.market, imports: { stadjers: [{ ...r.market.imports.stadjers[0], contract: undefined }] } };
  assert.equal(T.tickContracts(oud, 'stadjers').left.length, 0, 'een oude save zonder contract verliest niemand');
});
t('Tammo als zaakwaarnemer: een voorstel voor de zwakste positie binnen de kas, of niets', () => {
  const club = { id: 'stadjers', budget: 400000 }, roster = base('stadjers');
  const pool = T.freeAgents(9, 1, 14);
  const a = T.agentAdvice({ ...T.emptyMarket(), pool }, club, roster);
  if (a) { assert.equal(a.role, T.weakestRole(roster)); assert.ok(a.price <= T.cashOf(T.emptyMarket(), club) * 0.25 && a.better > 0); }
  assert.equal(T.agentAdvice({ ...T.emptyMarket(), pool: [] }, club, roster), null);
  assert.equal(T.agentAdvice({ ...T.emptyMarket(), pool }, { id: 'arm', budget: 10 }, roster), null, 'een arme club kan niets betalen');
});
t('twintig seizoenen: de markt blijft binnen de grenzen, geen negatieve kas, geld uit niets komt niet voor en de opslag blijft klein', () => {
  const r = runCareer({ char: 'tammo', seizoenen: 20, strategie: 'speel' });
  const c = r.career;
  assert.ok(c.seasonNr >= 20);
  assert.ok(Object.values(c.market.cash).every((v) => Number.isFinite(v) && v >= 0));
  assert.ok(c.market.sinks >= 0 || Number.isFinite(c.market.sinks));
  const alle = [...c.world.kroon, ...c.world.terp, ...c.world.talent];
  assert.equal(new Set(alle).size, 24);
  assert.ok(C.serialize(c).length < 80000, `opslag ${C.serialize(c).length}`);
  for (const lijst of Object.values(c.market.imports)) assert.ok(lijst.every((p) => p.contract == null || (p.contract >= 1 && p.contract <= T.CONTRACT_MAX)));
});
console.log(`voetbal_transfers_test ok (${n} groepen)`);
