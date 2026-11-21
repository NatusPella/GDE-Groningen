// Test van de spelers, ratings en clubs van de voetbalcarrière (#1107): scripts/voetbal_spelers_test.mjs. Puur, geen DOM.
// Dekt: factoren, rating per rol, deterministische selecties, namen, de club-lijst (parodienamen, geen echte merken), en de koppeling aan de sim
// (neutraal blijft gelijk; een sterker team wint vaker; clubteams en ratings reizen mee in makeMatch).
import assert from 'node:assert/strict';
import { makeMatch, tikWedstrijd } from '../game/js/voetbalmatch.js';
import { ATTRS, ROLES, SQUAD_SIZE, SQUAD_SHAPE, MAX_FACTOR, factorOf, ratingFor, playerRating, simFactors, makeSquad, makeProtagonist, attrCap, readPlayer, isValidPlayer, lineupFor, teamStrength, hashSeed, NAME_POOL, TALENTS } from '../game/js/voetbalspelers.js';
import { CLUBS, EUROPE_CLUBS, clubsOf, clubById, teamFor, hasForbiddenWord, DIVISIONS, PATTERNS, CLUBS_PER_DIVISION } from '../game/js/voetbalclubs.js';
import { formationList } from '../game/js/voetbalrules.js';

let n = 0;
const t = (naam, f) => { try { f(); n++; } catch (e) { console.error('FAIL', naam); throw e; } };

t('factor: 0,88 bij 1, ongeveer neutraal rond 32, 1,25 bij 100', () => {
  assert.ok(Math.abs(factorOf(1) - 0.8837) < 0.001);
  assert.ok(Math.abs(factorOf(32) - 0.9984) < 0.002);
  assert.ok(Math.abs(factorOf(100) - 1.25) < 0.001);
  assert.equal(factorOf(NaN), factorOf(1));
});
t('rating per rol weegt de juiste vaardigheden', () => {
  const att = { pace: 80, shot: 90, pass: 50, stamina: 40, defend: 20 };
  assert.ok(ratingFor(att, 'aanvaller') > ratingFor(att, 'verdediger'));
  assert.equal(ratingFor({ pace: 50, shot: 50, pass: 50, stamina: 50, defend: 50 }, 'middenvelder'), 50);
  assert.equal(ratingFor({ pace: 1, shot: 1, pass: 50, stamina: 50, defend: 1, reflex: 100 }, 'keeper'), 80);
  assert.ok(ROLES.every((r) => ATTRS.length === 5 && r));
});
t('een selectie van 18 is deterministisch, volledig en heeft unieke namen', () => {
  const a = makeSquad('stadjers', 60, 7), b = makeSquad('stadjers', 60, 7), c = makeSquad('stadjers', 60, 8);
  assert.deepEqual(a, b);
  assert.notDeepEqual(a.map((p) => p.name), c.map((p) => p.name));
  assert.equal(a.length, SQUAD_SIZE);
  for (const r of ROLES) assert.equal(a.filter((p) => p.role === r).length, SQUAD_SHAPE[r]);
  assert.equal(new Set(a.map((p) => p.name)).size, 18);
  assert.equal(new Set(a.map((p) => p.id)).size, 18);
  assert.ok(a.every(isValidPlayer));
  assert.ok(a.filter((p) => p.role === 'keeper').every((p) => p.attrs.reflex >= 1));
  assert.ok(a.every((p) => p.talents.length <= 3 && p.pot >= 60 && p.pot <= 95));
});
t('namen: geen echte persoon (verboden achternamen en clubwoorden)', () => {
  const BEKEND = ['Messi', 'Ronaldo', 'Cruijff', 'Cruyff', 'Robben', 'Sneijder', 'Persie', 'Bergkamp', 'Seedorf', 'Neymar', 'Mbappe', 'Haaland', 'Pele', 'Maradona', 'Kluivert', 'Gullit', 'Rijkaard', 'Overmars', 'Huntelaar', 'Depay', 'Dumfries', 'Virgil', 'Bosz', 'Koeman', 'Advocaat', 'Jansen', 'Bakker', 'Visser'];
  for (const s of [...NAME_POOL.last, ...NAME_POOL.first]) assert.ok(!BEKEND.some((k) => s.toLowerCase().includes(k.toLowerCase())), s);
  assert.ok(NAME_POOL.last.length >= 40 && NAME_POOL.first.length >= 30);
  for (const id of CLUBS.map((x) => x.id)) for (const p of makeSquad(id, 55, 1)) assert.ok(!hasForbiddenWord(p.name), p.name);
});
t('simFactors: geklemd, talenten, rol, vorm en vermoeidheid', () => {
  const p = makeProtagonist('anita');
  const f = simFactors(p);
  assert.ok(Object.values(f).every((v) => v <= MAX_FACTOR && v >= 0.6));
  const top = { id: 'x', role: 'aanvaller', attrs: { pace: 100, shot: 100, pass: 100, stamina: 100, defend: 100 }, talents: ['rustigeAfwerker', 'pitbull', 'dribbler'] };
  assert.ok(Object.values(simFactors(top, { form: 1.08 })).every((v) => v <= MAX_FACTOR));
  assert.ok(simFactors(top, { role: 'verdediger' }).schot < simFactors(top).schot, 'buiten de hoofdrol 90%');
  assert.ok(simFactors(top, { fatigue: 90 }).sprint < simFactors(top, { fatigue: 0 }).sprint);
  assert.ok(simFactors(top, { form: 1.08 }).schot > simFactors(top, { form: 0.92 }).schot);
  assert.ok(Object.keys(TALENTS).length === 8);
});
t('Tessa is de ster (hogere start en potentieel), Tammo gewoon; plafonds volgen het potentieel', () => {
  const te = makeProtagonist('anita'), ta = makeProtagonist('tammo');
  assert.ok(playerRating(te) > playerRating(ta) + 5);
  assert.ok(te.pot > ta.pot);
  assert.ok(attrCap(te, 'shot') > attrCap(te, 'defend'));
  assert.ok(ATTRS.every((k) => te.attrs[k] <= attrCap(te, k) + 1 || k === 'defend'));
  assert.equal(te.char, 'anita'); assert.equal(ta.char, 'tammo');
});
t('readPlayer: kapotte data wordt null of geklemd', () => {
  assert.equal(readPlayer(null), null); assert.equal(readPlayer({ role: 'x' }), null);
  const r = readPlayer({ role: 'aanvaller', attrs: { pace: 500, shot: -3, pass: 'x', stamina: 10, defend: 10 }, pot: 1000, talents: ['dribbler', 'nep'], name: 'A'.repeat(99) });
  assert.equal(r.attrs.pace, 100); assert.equal(r.attrs.shot, 1); assert.equal(r.pot, 99); assert.deepEqual(r.talents, ['dribbler']); assert.equal(r.name.length, 32);
});
t('de club-lijst: 8 + 8 clubs, 16 Europese clubs, parodienamen, patronen, unieke id en kleuren', () => {
  for (const d of ['kroon', 'terp']) assert.equal(clubsOf(d).length, CLUBS_PER_DIVISION);
  assert.equal(EUROPE_CLUBS.length, 16);
  assert.deepEqual(DIVISIONS, ['kroon', 'terp', 'talent']);
  const all = [...CLUBS, ...EUROPE_CLUBS];
  assert.equal(new Set(all.map((x) => x.id)).size, all.length);
  assert.equal(new Set(all.map((x) => x.naam)).size, all.length);
  for (const x of all) {
    assert.ok(!hasForbiddenWord(x.naam) && !hasForbiddenWord(x.kort), x.naam);
    assert.ok(PATTERNS.includes(x.patroon), x.id);
    assert.ok(x.sterkte >= 40 && x.sterkte <= 95);
    assert.ok(!/^(VV|SV|FC|SC|RKSV)\b/.test(x.naam));
  }
  assert.ok(clubsOf('kroon').every((x) => x.stadion === 'euroborg'));
  assert.equal(clubById('stadjers').division, 'kroon');
  assert.equal(clubById('nietbestaand'), null);
  assert.deepEqual(Object.keys(teamFor(clubById('wadlopers'))).sort(), ['accent', 'broek', 'id', 'keeperShirt', 'kort', 'naam', 'patroon', 'shirt']);
  assert.ok(hasForbiddenWord('FC Utrecht') && hasForbiddenWord('Ajax Amsterdam') && !hasForbiddenWord('De Stadjers'));
  // de sterkte stijgt met de klasse (gemiddelde)
  const avg = (l) => l.reduce((s, x) => s + x.sterkte, 0) / l.length;
  assert.ok(avg(clubsOf('kroon')) > avg(clubsOf('terp')));
});
t('lineupFor en teamStrength: de beste per rol, sterkere selectie is sterker', () => {
  const zwak = makeSquad('zwak', 35, 1), sterk = makeSquad('sterk', 70, 1);
  assert.ok(teamStrength(sterk).attack > teamStrength(zwak).attack + 15);
  assert.ok(teamStrength(sterk).defense > teamStrength(zwak).defense + 15);
  const lijst = formationList('groot', '4-4-2').map((x) => x.rol);
  const lu = lineupFor(sterk, lijst);
  assert.equal(lu.length, 11);
  assert.equal(new Set(lu.map((x) => x.player.id)).size, 11, 'niemand tweemaal');
  assert.equal(lu[0].player.role, 'keeper');
  assert.equal(hashSeed('a', 1), hashSeed('a', 1));
});

// ---- de koppeling aan de sim ----
const DT = 1 / 30;
function speel(seed, ratings, extra = {}) {
  const m = makeMatch([], { duur: 'kort', seed, aiBeide: true, formaat: 'klein', ratings, ...extra });
  for (let i = 0; i < 12000 && m.fase !== 'klaar'; i++) tikWedstrijd(m, DT, null);
  assert.equal(m.fase, 'klaar');
  for (const p of m.spelers) assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.stamina));
  return m.score;
}
t('zonder ratings is de sim gelijk, met neutrale ratings ook', () => {
  const neutraal = Array.from({ length: 5 }, () => ({ f: { sprint: 1, schot: 1, aanname: 1, verd: 1, uit: 1 } }));
  for (const seed of [3, 11]) assert.deepEqual(speel(seed, null), speel(seed, [neutraal, neutraal]));
});
t('de teams en namen uit de carrière komen in de wedstrijd', () => {
  const a = teamFor(clubById('wadlopers')), b = teamFor(clubById('kleibijters'));
  const m = makeMatch([], { duur: 'kort', seed: 5, aiBeide: true, teams: [a, b], ratings: [[{ naam: 'Sieb Veenbrand', f: {} }], []] });
  assert.equal(m.teams[0].kort, 'Wadlopers'); assert.equal(m.teams[1].kort, 'Kleibijters');
  assert.equal(m.spelers[0].naam, 'Sieb Veenbrand');
  assert.ok(m.spelers.every((p) => !p.fac || Object.values(p.fac).every(Number.isFinite)));
});
t('een sterker team wint vaker (ratingverschil in de sim)', () => {
  const sterk = Array.from({ length: 5 }, () => ({ f: { sprint: 1.22, schot: 1.22, aanname: 1.2, verd: 1.2, uit: 1.2 } }));
  const zwak = Array.from({ length: 5 }, () => ({ f: { sprint: 0.92, schot: 0.92, aanname: 0.92, verd: 0.92, uit: 0.92 } }));
  let w = 0, v = 0, g = 0;
  for (let s = 1; s <= 24; s++) {
    const [a, b] = s % 2 ? speel(s, [sterk, zwak]) : speel(s, [zwak, sterk]).slice().reverse();
    if (a > b) w++; else if (a < b) v++; else g++;
  }
  assert.ok(w > v, `sterk ${w} zwak ${v} gelijk ${g}`);
  assert.ok(w >= 11, `het sterkere team wint minstens de helft: ${w} van 24`);
});

console.log(`voetbal_spelers_test ok (${n} groepen)`);
