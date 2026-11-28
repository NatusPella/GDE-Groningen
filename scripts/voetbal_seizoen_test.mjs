// Test van de seizoenen, divisies en knock-outs (#1108): scripts/voetbal_seizoen_test.mjs. Puur, geen DOM.
import PARKDATA from '../game/js/voetbalparkendata.js';
import assert from 'node:assert/strict';
import { schedule, newLeague, playRound, playOut, table, points, myFixture, awayCount, newWorld, endSeason, outcomeFor, divisionOf, newKnockout, playKnockoutRound, playKnockoutOut, myTie, shootout, cupEntrants, europeEntrants, makeCtx, baseStrength, lambdaFor, ROUNDS, knockoutRoundName } from '../game/js/voetbalseason.js';
import { CLUBS, EUROPE_CLUBS, clubById, clubsOf } from '../game/js/voetbalclubs.js';
import { makeParkIndex, localDivision, HOME_WGS } from '../game/js/voetbalparken.js';
import { wgsToWorld } from '../game/js/rdnew.js';
import { makeRng } from '../game/js/minigamekit.js';

let n = 0;
const t = (naam, f) => { try { f(); n++; } catch (e) { console.error('FAIL', naam); throw e; } };
const idx = makeParkIndex(PARKDATA);
const [hx, hy] = wgsToWorld(HOME_WGS.lat, HOME_WGS.lon);
const loc = localDivision(idx, { x: hx, y: hy });
const getClub = (id) => clubById(id) || idx.byId.get(id) || null;
const ctx = makeCtx(getClub);
const startWorld = () => newWorld({ kroon: clubsOf('kroon').map((c) => c.id), terp: clubsOf('terp').map((c) => c.id), talent: loc.clubs.map((c) => c.id), pool: loc.pool.map((c) => c.id) });

t('het speelschema: 7 rondes van 4 duels, ieder tegen ieder, hooguit vier uitritten per club', () => {
  const ids = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const s = schedule(ids);
  assert.equal(s.length, ROUNDS);
  const paren = new Set();
  for (const r of s) { assert.equal(r.length, 4); assert.equal(new Set(r.flat()).size, 8); for (const [x, y] of r) paren.add([x, y].sort().join('-')); }
  assert.equal(paren.size, 28);
  const lg = newLeague('talent', ids);
  for (const id of ids) { const a = awayCount(lg, id); assert.ok(a >= 3 && a <= 4, `${id} uit ${a}`); }
});
t('een competitie: punten, stand, kampioen; de uitslag van de speler telt, de rest wordt uitgerekend', () => {
  let lg = newLeague('talent', loc.clubs.map((c) => c.id));
  const me = lg.clubs[0];
  for (let r = 0; r < ROUNDS; r++) {
    const f = myFixture(lg, me);
    assert.ok(f && f.opponent !== me);
    const res = playRound(lg, 1, ctx, { club: me, gf: 3, ga: 0 });
    lg = res.league;
    const mijn = res.results.find((x) => x[0] === me || x[1] === me);
    assert.equal(mijn[0] === me ? mijn[2] : mijn[3], 3);
  }
  assert.ok(lg.done && lg.round === ROUNDS);
  const tb = table(lg);
  assert.equal(tb[0].id, me, 'zeven keer 3-0 wint de competitie');
  assert.equal(tb[0].p, 21);
  assert.equal(tb.reduce((s, r) => s + r.vv, 0), tb.reduce((s, r) => s + r.tg, 0), 'voor en tegen sluiten');
  assert.equal(tb.reduce((s, r) => s + r.w, 0), tb.reduce((s, r) => s + r.v, 0));
  assert.equal(lg.champion, me);
  assert.equal(playRound(lg, 1, ctx).league, lg, 'een klaar seizoen verandert niet');
});
t('determinisme: dezelfde seed geeft dezelfde uitkomst, een andere seed een andere', () => {
  const ids = loc.clubs.map((c) => c.id);
  const a = playOut(newLeague('talent', ids), 5, ctx), b = playOut(newLeague('talent', ids), 5, ctx), c = playOut(newLeague('talent', ids), 6, ctx);
  assert.deepEqual(a, b);
  assert.notDeepEqual(a.results, c.results);
});
t('sterkere clubs eindigen gemiddeld hoger; de uitkomst is geen vaste volgorde', () => {
  const ids = clubsOf('kroon').map((c) => c.id);
  let top = 0, plekSom = {};
  for (let s = 1; s <= 60; s++) { const tb = table(playOut(newLeague('kroon', ids), s, ctx)); if (tb[0].id === 'grachtenhelden') top++; tb.forEach((r) => { plekSom[r.id] = (plekSom[r.id] || 0) + r.plek; }); }
  assert.ok(plekSom.grachtenhelden < plekSom.noorderlichters - 60, 'de sterkste club eindigt gemiddeld meer dan een plek hoger');
  assert.ok(top >= 8 && top <= 48, `de sterkste wordt vaak kampioen maar niet altijd: ${top}/60`);
  assert.ok(lambdaFor(70, 40, true) > lambdaFor(40, 70, false));
  assert.ok(lambdaFor(1, 100, false) >= 0.2 && lambdaFor(100, 1, true) <= 4);
});
t('promotie en degradatie over drie seizoenen: de acht blijven acht, niemand verdwijnt of dubbelt', () => {
  let world = startWorld();
  const alle = [...world.kroon, ...world.terp, ...world.talent, ...world.pool];
  assert.equal(new Set(alle).size, alle.length);
  for (let s = 1; s <= 3; s++) {
    const leagues = Object.fromEntries(['kroon', 'terp', 'talent'].map((d) => [d, playOut(newLeague(d, world[d], s), s, ctx)]));
    const before = JSON.parse(JSON.stringify(world));
    const { world: next, report } = endSeason(world, leagues, s);
    for (const d of ['kroon', 'terp', 'talent']) assert.equal(next[d].length, 8, `${d} blijft acht`);
    assert.equal(new Set([...next.kroon, ...next.terp, ...next.talent, ...next.pool]).size, alle.length, 'niemand verdwijnt of dubbelt');
    const tTalent = table(leagues.talent).map((r) => r.id);
    assert.ok(tTalent.slice(0, 2).every((id) => next.terp.includes(id)), 'top twee van de Talentenklasse gaan omhoog');
    assert.ok(tTalent.slice(6).every((id) => next.pool.includes(id)), 'laatste twee gaan naar de pool');
    const tKroon = table(leagues.kroon).map((r) => r.id);
    assert.ok(tKroon.slice(6).every((id) => next.terp.includes(id)) && !next.kroon.some((id) => tKroon.slice(6).includes(id)));
    const tTerp = table(leagues.terp).map((r) => r.id);
    assert.ok(tTerp.slice(0, 2).every((id) => next.kroon.includes(id)));
    assert.equal(report.champions.talent, tTalent[0]);
    assert.equal(outcomeFor(report, tTalent[0], 'talent'), 'kampioen-promotie');
    assert.equal(outcomeFor(report, tKroon[0], 'kroon'), 'kampioen');
    assert.equal(outcomeFor(report, tKroon[7], 'kroon'), 'degradatie');
    assert.equal(divisionOf(next, tTalent[0]), 'terp');
    assert.notDeepEqual(next, before);
    world = next;
  }
});
t('de beker: 16 clubs, vier rondes, een winnaar, strafschoppen bij gelijkspel, de eigen uitslag telt', () => {
  const world = startWorld();
  const me = loc.clubs[0].id;
  const entr = cupEntrants(world, me, 3);
  assert.equal(entr.length, 16); assert.equal(new Set(entr).size, 16); assert.ok(entr.includes(me));
  assert.equal(entr, cupEntrants(world, me, 3).slice() && entr);
  let ko = newKnockout('dijkbeker', entr, 3);
  assert.equal(ko.alive.length, 16);
  assert.equal(knockoutRoundName(ko), 'Achtste finale');
  const tie = myTie(ko, me);
  assert.ok(tie);
  ko = playKnockoutRound(ko, ctx, { club: me, gf: 2, ga: 2, pens: me });
  assert.equal(ko.alive.length, 8); assert.ok(ko.alive.includes(me), 'strafschoppen gewonnen = door');
  assert.equal(knockoutRoundName(ko), 'Kwartfinale');
  ko = playKnockoutOut(ko, ctx);
  assert.ok(ko.done && ko.winner && ko.rounds.length === 4);
  for (const r of ko.rounds) for (const x of r) { assert.ok(x[4] === x[0] || x[4] === x[1]); if (x[2] === x[3]) assert.ok(x[5], 'gelijk geeft strafschoppen'); }
  const again = playKnockoutOut(playKnockoutRound(newKnockout('dijkbeker', entr, 3), ctx, { club: me, gf: 2, ga: 2, pens: me }), ctx);
  assert.deepEqual(again, ko);
  const so = shootout('a', 'b', ctx2(), makeRng(4));
  assert.ok(so.a !== so.b && ['a', 'b'].includes(so.winner));
});
function ctx2() { return { strength: () => ({ attack: 50, defense: 50 }) }; }
t('de Waddenbeker: de kampioen en vijftien buitenlandse clubs', () => {
  const e = europeEntrants('stadjers', EUROPE_CLUBS.map((c) => c.id), 2);
  assert.equal(e.length, 16); assert.equal(new Set(e).size, 16); assert.equal(e[0], 'stadjers');
  const ko = playKnockoutOut(newKnockout('waddenbeker', e, 2), ctx);
  assert.ok(ko.done && ko.winner);
  // de buitenlandse topclubs zijn sterker dan een Kroonklasse-club: de Stadjers winnen zelden
  let w = 0;
  for (let s = 1; s <= 40; s++) if (playKnockoutOut(newKnockout('waddenbeker', europeEntrants('stadjers', EUROPE_CLUBS.map((c) => c.id), s), s), ctx).winner === 'stadjers') w++;
  assert.ok(w <= 10, `Stadjers winnen ${w}/40`);
});
t('baseStrength is stabiel en wijkt een klein beetje af per club', () => {
  const a = baseStrength(clubById('stadjers')), b = baseStrength(clubById('stadjers'));
  assert.deepEqual(a, b);
  assert.ok(Math.abs(a.attack - 72) <= 2 && Math.abs(a.defense - 72) <= 2);
  assert.ok(CLUBS.length === 16);
});
t('een beschermde club (jouw club) zakt nooit in de pool, ook niet als laatste', () => {
  const world = startWorld();
  const leagues = Object.fromEntries(['kroon', 'terp', 'talent'].map((d) => [d, playOut(newLeague(d, world[d], 1), 1, ctx)]));
  const laatste = table(leagues.talent)[7].id;
  const { world: next } = endSeason(world, leagues, 1, laatste);
  assert.ok(next.talent.includes(laatste) && !next.pool.includes(laatste));
  assert.equal(next.talent.length, 8); assert.equal(new Set([...next.kroon, ...next.terp, ...next.talent, ...next.pool]).size, world.pool.length + 24);
});
console.log(`voetbal_seizoen_test ok (${n} groepen)`);
