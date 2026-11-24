// Seizoenen, divisies, beker en Waddenbeker van de voetbalcarrière (#1108, epic #1106, docs/VOETBAL-CARRIERE-21-11.md hoofdstuk 3): puur, geen DOM en geen THREE (scripts/voetbal_seizoen_test.mjs).
// Een divisie is een halve competitie van acht clubs (7 rondes, 3 punten voor winst, 1 voor gelijk). Jouw duel speel je zelf of rekent de club uit; alle andere duels worden deterministisch uitgerekend
// uit de ratings (Poisson, dezelfde familie als simuleerDuel in voetbalcompetitie.js). Zaad: hash(seizoenszaad, divisie, ronde, thuis, uit): dezelfde seed geeft voor iedere speler dezelfde uitkomst.
// Na zeven rondes gaan de eerste twee omhoog en de laatste twee omlaag (de Kroonklasse heeft geen promotie); onder de Talentenklasse ligt een pool van lokale clubs.
// De beker (Dijkbeker, 16 clubs uit alle klassen) en de Waddenbeker (de kampioen van de Kroonklasse plus verzonnen buitenlandse clubs) zijn knock-outs met strafschoppen bij gelijkspel.
import { makeRng } from './minigamekit.js';
import { hashSeed } from './voetbalplayers.js';

export const ROUNDS = 7;
export const POINTS = { winst: 3, gelijk: 1 };
export const PROMOTE = 2, RELEGATE = 2;
export const DIV_ORDER = ['kroon', 'terp', 'talent'];           // van hoog naar laag
export const HOME_ADVANTAGE = 1.06;
export const BASE_GOALS = 1.35;
const KNOCKOUT_ROUNDS = 4;

// Het speelschema (de cirkelmethode): 8 clubs geven 7 rondes van 4 duels; ieder speelt ieder een keer; thuis en uit wisselen af (hooguit vier uitritten per club).
export function schedule(ids) {
  const n = ids.length;
  const l = ids.map((_, i) => i);
  const rounds = [];
  for (let r = 0; r < n - 1; r++) {
    const duels = [];
    for (let i = 0; i < n / 2; i++) {
      const a = l[i], b = l[n - 1 - i];
      duels.push(((a + b) % 2 === 0) !== (a < b) ? [ids[b], ids[a]] : [ids[a], ids[b]]);   // thuis en uit op de som en de volgorde van de plek: ieder club speelt 3 of 4 keer uit
    }
    rounds.push(duels);
    l.splice(1, 0, l.pop());
  }
  return rounds;
}
const emptyRow = () => [0, 0, 0, 0, 0, 0];           // gespeeld, winst, gelijk, verlies, voor, tegen
export function newLeague(div, clubs, nr = 1) {
  const rows = {};
  for (const id of clubs) rows[id] = emptyRow();
  return { div, nr, clubs: clubs.slice(), round: 0, rows, results: [], done: false, champion: null };
}
export const fixturesOf = (lg, round = lg.round) => (round >= 0 && round < ROUNDS ? schedule(lg.clubs)[round] : []);
export const awayCount = (lg, id) => schedule(lg.clubs).filter((r) => r.some((d) => d[1] === id)).length;
export const points = (row) => row[1] * POINTS.winst + row[2] * POINTS.gelijk;
// De stand, de beste eerst: punten, doelsaldo, doelpunten voor, dan de volgorde in de lijst (stabiel).
export function table(lg) {
  const rows = lg.clubs.map((id, i) => { const r = lg.rows[id]; return { id, g: r[0], w: r[1], gl: r[2], v: r[3], vv: r[4], tg: r[5], p: points(r), saldo: r[4] - r[5], i }; });
  rows.sort((a, b) => b.p - a.p || b.saldo - a.saldo || b.vv - a.vv || a.i - b.i);
  rows.forEach((r, k) => { r.plek = k + 1; });
  return rows;
}
export const rankOf = (lg, id) => (table(lg).find((r) => r.id === id) || {}).plek || 0;

// De uitslag van een duel uit de sterkte: ctx.strength(id) geeft { attack, defense } (1 tot 100). Alleen een rng als parameter, nooit Math.random.
function poisson(l, rng) { const L = Math.exp(-l); let k = 0, p = 1; do { k++; p *= rng(); } while (p > L && k < 12); return k - 1; }
export const lambdaFor = (att, defOpp, home) => Math.min(4, Math.max(0.2, BASE_GOALS * Math.pow(Math.max(1, att) / Math.max(1, defOpp), 1.2) * (home ? HOME_ADVANTAGE : 1 / HOME_ADVANTAGE ** 0.5)));
export function simulateDuel(a, b, ctx, rng) {
  const sa = ctx.strength(a), sb = ctx.strength(b);
  return [poisson(lambdaFor(sa.attack, sb.defense, true), rng), poisson(lambdaFor(sb.attack, sa.defense, false), rng)];
}
const book = (rows, id, vv, tg) => { const r = rows[id]; r[0]++; r[4] += vv; r[5] += tg; if (vv > tg) r[1]++; else if (vv < tg) r[3]++; else r[2]++; };

// Een ronde: `mine` = { club, gf, ga } is jouw gespeelde uitslag (dan wordt jouw duel niet uitgerekend); zonder wordt alles uitgerekend. Geeft een nieuwe competitie en de uitslagen van de ronde.
export function playRound(lg, seed, ctx, mine = null) {
  if (!lg || lg.done) return { league: lg, results: [] };
  const c = JSON.parse(JSON.stringify(lg));
  const out = [];
  for (const [a, b] of fixturesOf(c)) {
    let s;
    if (mine && (a === mine.club || b === mine.club)) s = a === mine.club ? [mine.gf | 0, mine.ga | 0] : [mine.ga | 0, mine.gf | 0];
    else s = simulateDuel(a, b, ctx, makeRng(hashSeed('duel', seed, c.div, c.round, a, b)));
    book(c.rows, a, s[0], s[1]); book(c.rows, b, s[1], s[0]);
    out.push([a, b, s[0], s[1]]);
  }
  c.results.push(out);
  c.round++;
  if (c.round >= ROUNDS) { c.done = true; c.champion = table(c)[0].id; }
  return { league: c, results: out };
}
// De rest van een competitie uitrekenen (voor de divisies waar jij niet speelt, of een gemiste ronde): zonder `mine`.
export function playOut(lg, seed, ctx) {
  let c = lg;
  while (c && !c.done) c = playRound(c, seed, ctx).league;
  return c;
}
// Jouw wedstrijd van de ronde (of null als je club geen duel heeft): { home, away, opponent, isHome }.
export function myFixture(lg, id) {
  if (!lg || lg.done) return null;
  const d = fixturesOf(lg).find((x) => x.includes(id));
  return d ? { home: d[0], away: d[1], opponent: d[0] === id ? d[1] : d[0], isHome: d[0] === id } : null;
}

// ---- de wereld van divisies: promotie en degradatie ----
export function newWorld({ kroon, terp, talent, pool = [] }) { return { kroon: kroon.slice(), terp: terp.slice(), talent: talent.slice(), pool: pool.slice() }; }
export const divisionOf = (world, id) => DIV_ORDER.find((d) => world[d].includes(id)) || (world.pool.includes(id) ? 'pool' : null);
// Na een seizoen: de top twee van een lagere klasse gaan omhoog, de onderste twee van een hogere klasse omlaag; de Talentenklasse vult zich uit de pool (volgorde op hash, deterministisch).
// leagues = { kroon, terp, talent } (alle drie klaar). Geeft de nieuwe wereld en een verslag per club.
export function endSeason(world, leagues, seed, keep = null) {
  const tab = {};
  for (const d of DIV_ORDER) tab[d] = table(leagues[d]).map((r) => r.id);
  const next = { kroon: [], terp: [], talent: [], pool: world.pool.slice() };
  const report = { promoted: [], relegated: [], champions: {}, toPool: [], fromPool: [] };
  for (const d of DIV_ORDER) report.champions[d] = tab[d][0];
  // kroon: laatste twee naar terp; terp: eerste twee naar kroon, laatste twee naar talent; talent: eerste twee naar terp, laatste twee naar de pool
  const part = (list, from, to) => list.slice(from, to);
  next.kroon = [...part(tab.kroon, 0, 8 - RELEGATE), ...part(tab.terp, 0, PROMOTE)];
  next.terp = [...part(tab.kroon, 8 - RELEGATE, 8), ...part(tab.terp, PROMOTE, 8 - RELEGATE), ...part(tab.talent, 0, PROMOTE)];
  let stay = part(tab.talent, PROMOTE, 8 - RELEGATE);
  let out = part(tab.talent, 8 - RELEGATE, 8);
  // een beschermde club (de club van de speler) zakt nooit in de pool: de beste van de zakkers blijft, de laagste van wie bleef gaat in zijn plaats
  if (keep && out.includes(keep)) { const worstStay = stay[stay.length - 1]; out = out.map((id) => (id === keep ? worstStay : id)); stay = [...stay.slice(0, -1), keep]; }
  const pool = world.pool.slice().sort((a, b) => hashSeed('pool', seed, a) - hashSeed('pool', seed, b) || (a < b ? -1 : 1));
  const inn = pool.slice(0, RELEGATE);
  next.talent = [...tab.terp.slice(8 - RELEGATE), ...stay, ...inn];
  next.pool = [...pool.slice(RELEGATE), ...out].sort();
  report.promoted.push(...tab.terp.slice(0, PROMOTE), ...tab.talent.slice(0, PROMOTE));
  report.relegated.push(...tab.kroon.slice(8 - RELEGATE), ...tab.terp.slice(8 - RELEGATE), ...out);
  report.toPool = out; report.fromPool = inn;
  return { world: next, report };
}
// Wat er met één club gebeurde: 'kampioen', 'promotie', 'degradatie' of 'blijft'; de kampioen van de Kroonklasse speelt de Waddenbeker.
export function outcomeFor(report, id, divBefore) {
  const champ = report.champions[divBefore] === id;
  if (report.promoted.includes(id)) return champ ? 'kampioen-promotie' : 'promotie';
  if (report.relegated.includes(id)) return 'degradatie';
  return champ ? 'kampioen' : 'blijft';
}

// ---- knock-outs: de Dijkbeker en de Waddenbeker ----
// Een knock-out van 16 clubs in vier rondes; de loting op hash(seed, id). state = { name, entrants, rounds: [[[a,b,ga,gb,winnaar,strafschoppen?]...]], alive, round, done, winner }.
export function newKnockout(name, ids, seed) {
  const order = ids.slice().sort((a, b) => hashSeed('draw', seed, name, a) - hashSeed('draw', seed, name, b) || (a < b ? -1 : 1));
  return { name, seed, entrants: ids.slice(), alive: order, round: 0, rounds: [], done: false, winner: null };
}
export const knockoutRoundCount = (ids) => Math.ceil(Math.log2(Math.max(2, ids.length)));
export const knockoutPairs = (ko) => { const p = []; for (let i = 0; i + 1 < ko.alive.length; i += 2) p.push([ko.alive[i], ko.alive[i + 1]]); return p; };
export function myTie(ko, id) {
  if (!ko || ko.done) return null;
  const p = knockoutPairs(ko).find((x) => x.includes(id));
  return p ? { home: p[0], away: p[1], opponent: p[0] === id ? p[1] : p[0], isHome: p[0] === id } : null;
}
// Strafschoppen uit de sterkte: vijf ieder en dan sudden death; een rng, geen Math.random. Geeft de winnaar (a of b) en de reeks.
export function shootout(a, b, ctx, rng) {
  const pa = 0.72 + (ctx.strength(a).attack - ctx.strength(b).attack) * 0.001, pb = 0.72 + (ctx.strength(b).attack - ctx.strength(a).attack) * 0.001;
  let sa = 0, sb = 0;
  for (let i = 0; i < 5; i++) { if (rng() < pa) sa++; if (rng() < pb) sb++; }
  for (let i = 0; i < 20 && sa === sb; i++) { if (rng() < pa) sa++; if (rng() < pb) sb++; }
  if (sa === sb) sa++;                                         // nooit een gelijke reeks
  return { winner: sa > sb ? a : b, a: sa, b: sb };
}
// Een ronde van de knock-out; `mine` = { club, gf, ga, pens?: winnaar-club } is jouw gespeelde uitslag (bij gelijkspel de winnaar van de strafschoppen). Geeft de nieuwe knock-out.
export function playKnockoutRound(ko, ctx, mine = null) {
  if (!ko || ko.done) return ko;
  const c = JSON.parse(JSON.stringify(ko));
  const ties = [], next = [];
  for (const [a, b] of knockoutPairs(c)) {
    const rng = makeRng(hashSeed('ko', c.seed, c.name, c.round, a, b));
    let s, pens = null;
    if (mine && (a === mine.club || b === mine.club)) s = a === mine.club ? [mine.gf | 0, mine.ga | 0] : [mine.ga | 0, mine.gf | 0];
    else s = simulateDuel(a, b, ctx, rng);
    let win = s[0] > s[1] ? a : s[0] < s[1] ? b : null;
    if (!win) {
      if (mine && (a === mine.club || b === mine.club) && mine.pens) { win = mine.pens; pens = { winner: win }; }
      else { pens = shootout(a, b, ctx, rng); win = pens.winner; }
    }
    ties.push(pens ? [a, b, s[0], s[1], win, pens.a != null ? [pens.a, pens.b] : 1] : [a, b, s[0], s[1], win]);
    next.push(win);
  }
  c.rounds.push(ties);
  c.alive = next;
  c.round++;
  if (next.length <= 1) { c.done = true; c.winner = next[0] || null; }
  return c;
}
export function playKnockoutOut(ko, ctx) { let c = ko; while (c && !c.done) c = playKnockoutRound(c, ctx); return c; }
export const knockoutRoundName = (ko) => {
  const left = ko.alive.length;
  return left <= 2 ? 'Finale' : left <= 4 ? 'Halve finale' : left <= 8 ? 'Kwartfinale' : 'Achtste finale';
};
// De deelnemers van de Dijkbeker: jouw club en vijftien anderen uit alle klassen, afwisselend uit de drie (loting op hash).
export function cupEntrants(world, mine, seed) {
  const lists = DIV_ORDER.map((d) => world[d].filter((x) => x !== mine).sort((a, b) => hashSeed('cup', seed, a) - hashSeed('cup', seed, b) || (a < b ? -1 : 1)));
  const out = [mine];
  for (let k = 0; out.length < 16; k++) { let added = false; for (const l of lists) { if (k < l.length && out.length < 16) { out.push(l[k]); added = true; } } if (!added) break; }
  return out;
}
// De Waddenbeker: de kampioen van de Kroonklasse en vijftien verzonnen buitenlandse clubs (uit 16 valt er één af op hash).
export function europeEntrants(champion, foreignIds, seed) {
  const f = foreignIds.slice().sort((a, b) => hashSeed('eu', seed, a) - hashSeed('eu', seed, b) || (a < b ? -1 : 1)).slice(0, 15);
  return [champion, ...f];
}
// De standaard sterkte van een club uit het getal in voetbalclubs.js (sterkte, 1 tot 100): aanval en verdediging wijken een klein, vast beetje af (hash), zodat clubs een eigen karakter hebben.
export function baseStrength(club) {
  const h = hashSeed('str', club.id);
  const d = ((h % 9) - 4) * 0.5;
  return { attack: club.sterkte + d, defense: club.sterkte - d };
}
export const makeCtx = (getClub, overrides = {}) => ({ strength: (id) => overrides[id] || baseStrength(getClub(id) || { id, sterkte: 40 }) });
export { KNOCKOUT_ROUNDS };

// ---- weergave van de stand (Club-UI, docs/ontwerp/CLUB-UI-24-11.md) ----
// De laatste uitslagen van één club in deze competitie als letters, oud naar nieuw: W winst, G gelijk, V verlies. Leeg als er nog niet gespeeld is.
export function formOf(lg, id, n = 5) {
  const out = [];
  for (const ronde of (lg && lg.results) || []) { const d = ronde.find((x) => x[0] === id || x[1] === id); if (d) { const mine = d[0] === id ? d[2] : d[3], other = d[0] === id ? d[3] : d[2]; out.push(mine > other ? 'W' : mine === other ? 'G' : 'V'); } }
  return out.slice(-n).join('');
}
// De kleurzones van de stand: de Kroonklasse heeft geen promotie; de laagste klasse (de Talentenklasse) laat alleen de promotie zien, want de club van de speler zakt daar nooit (endSeason houdt hem beschermd) en de pool is geen divisie om naar toe te zakken.
export function zonesFor(division, plek, n = 8) {
  const op = division !== 'kroon' && plek <= PROMOTE;
  const neer = division !== 'talent' && plek > n - RELEGATE;
  return { op, neer };
}
