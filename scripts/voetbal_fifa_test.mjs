// Pure test van de FIFA-uitbreiding van de voetbalwedstrijd (epic voetbal-fifa, 21-11): scripts/voetbal_fifa_test.mjs
// De aanvullende spelregels (kaarten, blessures, wissels, strafschoppen, buitenspel), het commentaar (afwisselend, niet herhalend, 200+ regels), de TV-regie (camera en herhaling) en de
// presentatie (rustpauze, eindsamenvatting, Man van de match, opstelling). Geen THREE, geen DOM, geen Electron.
import assert from 'node:assert/strict';
import { PITCH, zetFormaat, richtingVan } from '../game/js/voetbalrules.js';
import { makeMatch, tikWedstrijd, setupResume, snapVoetbal, leesLiveVoetbal, makeFootballMirror, voerInVoetbal } from '../game/js/voetbalmatch.js';
import { REGELS_STANDAARD, GEEN_REGELS, cleanRegels, strafschopPlek, beoordeelFout, pasBeoordelingToe, wisselSpeler, rustWissels, blessureWissels, buitenspelBijSchop, manVanDeMatch, statistiekenVan, speelMinuut } from '../game/js/voetbalspelregels.js';
import { COMMENTATOREN, SOORTEN, COMMENTAAR, MIN_PER_SOORT, MIN_TOTAAL, MAX_WOORDEN } from '../game/js/voetbalcommentaardata.js';
import { makeCommentaar, commentaarVoor, tikCommentaar, alleRegels, tellRegels, vulSjabloon, stemSleutel, derbyVan } from '../game/js/voetbalcommentaar.js';
import { hasForbiddenWord } from './voetbal_verboden.mjs';

let n = 0;
const t =(naam, f) => { try { f(); n++; } catch (e) { console.error('FAIL', naam); throw e; } };
const DT = 1 / 30;
const stap = (m, sec, inv = null) => { const ev = []; for (let i = 0; i < Math.ceil(sec / DT); i++) ev.push(...tikWedstrijd(m, DT, inv)); return ev; };
const tot = (m, fase, max = 120, inv = null) => { const ev = []; for (let i = 0; i < Math.ceil(max / DT) && m.fase !== fase; i++) ev.push(...tikWedstrijd(m, DT, inv)); return ev; };
const nieuw = (o = {}) => { const m = makeMatch([], { duur: 'kort', seed: 7, aiBeide: true, formaat: 'groot', ...o }); tot(m, 'spel', 30); return m; };

// ---------------------------------------------------------------- de regels
t('de regels: standaard aan (behalve buitenspel), corrupte voorkeur geeft de standaard', () => {
  assert.deepEqual(cleanRegels(null), REGELS_STANDAARD);
  assert.deepEqual(cleanRegels({ kaarten: 'ja', blessures: false, onzin: true }), { ...REGELS_STANDAARD, blessures: false });
  assert.equal(REGELS_STANDAARD.buitenspel, false);
  assert.ok(Object.values(GEEN_REGELS).every((x) => x === false));
});
t('strafschopstip: binnen het strafschopgebied van de verdediger, midden voor het doel', () => {
  zetFormaat('groot');
  for (const team of [0, 1]) {
    const sp = strafschopPlek(team);
    assert.equal(sp.x, 0);
    assert.ok(Math.abs(sp.y) < PITCH.L / 2 && Math.abs(sp.y) > PITCH.L / 2 - PITCH.STRAF_D, `y ${sp.y}`);
  }
  assert.ok(strafschopPlek(0).y < 0 && strafschopPlek(1).y > 0);
});
t('een fout in het eigen strafschopgebied geeft een strafschop; elders een vrije bal', () => {
  const m = nieuw({ seed: 11 });
  const dader = m.spelers.find((p) => p.team === 1 && p.i === 3), slachtoffer = m.spelers.find((p) => p.team === 0 && p.i === 9);
  const sp = strafschopPlek(1);
  slachtoffer.x = 2; slachtoffer.y = sp.y; // vlak voor het doel van team 1
  dader.x = 2.5; dader.y = slachtoffer.y;
  const b = beoordeelFout(m, dader, slachtoffer, true);
  assert.equal(b.strafschop, true);
  slachtoffer.y = 0; assert.equal(beoordeelFout(m, dader, slachtoffer, true).strafschop, false);
  const m2 = nieuw({ seed: 11, regels: { strafschoppen: false } });
  const d2 = m2.spelers.find((p) => p.team === 1 && p.i === 3), s2 = m2.spelers.find((p) => p.team === 0 && p.i === 9);
  s2.x = 2; s2.y = strafschopPlek(1).y; assert.equal(beoordeelFout(m2, d2, s2, true).strafschop, false);
});
t('een strafschop: de nemer staat bij de stip, de keeper op zijn lijn, de rest buiten het strafschopgebied', () => {
  const m = nieuw({ seed: 12 });
  setupResume(m, 'strafschop', 0, 0, 0);
  const sp = strafschopPlek(1), taker = m.spelers[m.hervat.taker];
  assert.equal(m.hervat.kind, 'strafschop'); assert.equal(m.fase, 'hervat'); assert.equal(taker.team, 0);
  assert.ok(Math.hypot(taker.x - sp.x, taker.y - sp.y) < 0.5); assert.ok(Math.hypot(m.bal.x - sp.x, m.bal.y - sp.y) < 0.5);
  const keeper = m.spelers.find((p) => p.team === 1 && p.rol === 'keeper');
  assert.ok(Math.abs(keeper.y) > PITCH.L / 2 - 1.5);
  const gy = Math.sign(sp.y) * PITCH.L / 2;
  for (const p of m.spelers) {
    if (p === taker || p === keeper) continue;
    const binnen = Math.abs(p.x) < PITCH.STRAF_B / 2 && Math.abs(p.y - gy) < PITCH.STRAF_D;
    assert.equal(binnen, false, `speler ${p.id} staat in het strafschopgebied`);
  }
  const ev = stap(m, 6);
  assert.ok(ev.some((e) => e.type === 'schop' && e.soort === 'schot'), 'de computer neemt de strafschop op het doel');
});
t('een kaart: geel is een waarschuwing, geelrood en rood sturen de speler weg (hij telt niet meer mee)', () => {
  const m = nieuw({ seed: 13 });
  const dader = m.spelers.find((p) => p.team === 1 && p.i === 4), slach = m.spelers.find((p) => p.team === 0 && p.i === 8);
  const ev1 = pasBeoordelingToe(m, dader, slach, { strafschop: false, kaart: 'geel', blessure: false });
  assert.equal(ev1[0].kleur, 'geel'); assert.equal(dader.geel, 1); assert.equal(dader.rood, false); assert.deepEqual(m.stat.geel, [0, 1]);
  const ev2 = pasBeoordelingToe(m, dader, slach, { strafschop: false, kaart: 'geelrood', blessure: false });
  assert.equal(ev2[0].kleur, 'rood'); assert.equal(ev2[0].tweede, true); assert.equal(dader.rood, true); assert.deepEqual(m.stat.rood, [0, 1]);
  assert.ok(Math.abs(dader.x) > PITCH.B / 2, 'naar de zijlijn');
  const x0 = dader.x; stap(m, 5); assert.equal(dader.x, x0, 'een uitgesloten speler beweegt niet meer');
  for (const p of m.spelers) assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y));
  assert.equal(wisselSpeler(m, dader.id), null, 'een rode kaart mag niet gewisseld worden');
});
t('met de regels uit geen kaarten, blessures of strafschoppen', () => {
  const m = nieuw({ seed: 14, regels: { kaarten: false, blessures: false, strafschoppen: false } });
  for (let i = 0; i < 50; i++) { const a = m.spelers[3], b = m.spelers[14]; const r = beoordeelFout(m, a, b, true); assert.deepEqual(r, { strafschop: false, kaart: null, blessure: false }); }
});
t('een blessure: kreupel tot de volgende dode bal, dan wisselt hij met de bank', () => {
  const m = nieuw({ seed: 15 });
  const slach = m.spelers.find((p) => p.team === 0 && p.i === 8), dader = m.spelers.find((p) => p.team === 1 && p.i === 3);
  const ev = pasBeoordelingToe(m, dader, slach, { strafschop: false, kaart: null, blessure: true });
  assert.equal(ev[0].type, 'blessure'); assert.equal(slach.blessure, true);
  const oud = slach.naam;
  const w = blessureWissels(m);
  assert.equal(w.length, 1); assert.equal(w[0].uit, oud); assert.notEqual(slach.naam, oud); assert.equal(slach.blessure, false); assert.equal(m.wissels[0], 1);
});
t('wissels: maximaal de bank (groot 3, klein 2), de keeper wisselt niet, de rust wisselt de moeste veldspeler', () => {
  const m = nieuw({ seed: 16 });
  assert.equal(m.bank[0].length, 3);
  for (let i = 0; i < 6; i++) wisselSpeler(m, m.spelers.find((p) => p.team === 0 && p.rol !== 'keeper' && p.gewisseld === 0 && !p.rood).id);
  assert.equal(m.wissels[0], 3);
  assert.equal(wisselSpeler(m, m.spelers.find((p) => p.team === 0 && p.rol !== 'keeper' && p.gewisseld === 0).id), null);
  assert.equal(wisselSpeler(m, m.spelers.find((p) => p.team === 1 && p.rol === 'keeper').id), null);
  const k = makeMatch([], { duur: 'kort', seed: 3, formaat: 'klein' });
  assert.equal(k.bank[0].length, 2);
  const r = nieuw({ seed: 17 });
  for (const p of r.spelers) p.stamina = 0.9;
  r.spelers.find((p) => p.team === 1 && p.i === 6).stamina = 0.3;
  const ev = rustWissels(r);
  assert.ok(ev.some((e) => e.team === 1 && e.reden === 'moe'));
});
t('buitenspel (optioneel): alleen met de regel aan, alleen voor een speler voor de een-na-laatste tegenstander', () => {
  const m = nieuw({ seed: 18, regels: { buitenspel: true } });
  const p = m.spelers.find((q) => q.team === 0 && q.i === 3), o = m.spelers.find((q) => q.team === 0 && q.i === 9);
  for (const q of m.spelers) if (q.team === 1) { q.y = 10 + q.i; q.x = 0; }
  p.y = 0; o.y = 30; assert.equal(buitenspelBijSchop(m, p, o), true);
  o.y = 8; assert.equal(buitenspelBijSchop(m, p, o), false);
  o.y = -3; assert.equal(buitenspelBijSchop(m, p, o), false, 'achter de bal');
  const m2 = nieuw({ seed: 18 }); assert.equal(buitenspelBijSchop(m2, m2.spelers[3], m2.spelers[9]), false, 'uit tenzij ingeschakeld');
});
t('een hele wedstrijd met alle regels: geen NaN, de stand klopt, statistieken en Man van de match bestaan', () => {
  for (const seed of [1, 2, 3]) {
    const m = makeMatch([], { duur: 'kort', seed, aiBeide: true, formaat: 'groot', regels: { buitenspel: true } });
    tot(m, 'klaar', 600);
    assert.equal(m.fase, 'klaar');
    for (const p of m.spelers) assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y) && Math.abs(p.y) <= PITCH.L / 2 + 0.2, `speler ${p.id}`);
    const s = statistiekenVan(m);
    assert.equal(s.bezit[0] + s.bezit[1], 100);
    assert.ok(s.schoten[0] + s.schoten[1] >= s.opDoel[0] + s.opDoel[1]);
    const mm = manVanDeMatch(m);
    assert.ok(mm && typeof mm.naam === 'string' && mm.id >= 0);
    assert.ok(speelMinuut(m) <= 90 && speelMinuut(m) >= 1);
  }
});
t('de momentopname kent de strafschop en blijft even lang (het protocol is ongewijzigd)', () => {
  const m = nieuw({ seed: 19 });
  setupResume(m, 'strafschop', 0, 0, 0);
  const snap = snapVoetbal(m, 1);
  assert.equal(snap.d.length, 64);
  const st = leesLiveVoetbal(JSON.parse(JSON.stringify(snap)));
  const sp = makeFootballMirror({ deeln: [{ slot: 0, naam: 'Jij' }] }, 0, { formaat: 'groot', duur: 'kort' });
  assert.equal(voerInVoetbal(sp, st), true); assert.equal(sp.hervat.kind, 'strafschop');
});

// ---------------------------------------------------------------- het commentaar
t('commentaar: 200+ regels als data, elke soort met genoeg regels, twee commentatoren', () => {
  assert.ok(tellRegels() >= MIN_TOTAAL, `aantal ${tellRegels()}`);
  for (const soort of Object.keys(SOORTEN)) {
    const p = COMMENTAAR[soort]; assert.ok(p, `soort ${soort} mist`);
    assert.ok((p.h || []).length + (p.r || []).length >= MIN_PER_SOORT, `${soort} heeft te weinig regels`);
  }
  for (const soort of Object.keys(COMMENTAAR)) assert.ok(SOORTEN[soort], `soort ${soort} zonder instelling`);
  assert.ok(Object.values(COMMENTAAR).every((p) => (p.h || []).length >= 2 && (p.r || []).length >= 2), 'beide commentatoren praten bij elke soort');
  assert.deepEqual(Object.keys(COMMENTATOREN), ['h', 'r']);
});
t('commentaar: geen echte clubs of merken, geen "de Grunn", geen dubbele regel, woordbudget', () => {
  const gezien = new Set();
  for (const r of alleRegels()) {
    assert.equal(hasForbiddenWord(r.tekst), false, r.tekst);
    assert.equal(/de Grunn\b/.test(r.tekst), false, r.tekst);
    assert.equal(/\b(winter|sneeuw|ijs)\b/i.test(r.tekst), false, `altijd zomer: ${r.tekst}`);
    assert.ok(r.tekst.split(/\s+/).length <= MAX_WOORDEN, `te lang: ${r.tekst}`);
    assert.equal(gezien.has(r.tekst), false, `dubbel: ${r.tekst}`); gezien.add(r.tekst);
    assert.ok(/[.!?]$/.test(r.tekst), `eindigt zonder leesteken: ${r.tekst}`);
    const open = (r.tekst.match(/\{/g) || []).length; assert.equal(open, (r.tekst.match(/\}/g) || []).length);
    for (const mm of r.tekst.matchAll(/\{([a-z]+)\}/g)) assert.ok(['speler', 'team', 'ander', 'stand'].includes(mm[1]), `onbekend sjabloon ${mm[0]}`);
  }
});
t('commentaar: sjablonen worden gevuld, een vaste regel heeft een stemsleutel, een sjabloon niet', () => {
  assert.equal(vulSjabloon('Goal! {speler} scoort voor {team}. De stand: {stand}.', { speler: 'Wietske', team: 'Stadjers', stand: '1-0' }), 'Goal! Wietske scoort voor Stadjers. De stand: 1-0.');
  assert.equal(vulSjabloon('Hij komt erin: {speler}.', {}), 'Hij komt erin: de speler.');
  assert.equal(stemSleutel('h', 'Rust. De thermosfles gaat rond.'), 'Hilbrand|Rust. De thermosfles gaat rond.');
  assert.equal(stemSleutel('r', 'Goal! {speler} scoort.'), null);
  assert.equal(stemSleutel('x', 'Iets.'), null);
});
t('commentaar: niet herhalend: nooit twee dezelfde achter elkaar, de eerste ronde gebruikt de hele zak', () => {
  const c = makeCommentaar({ seed: 5 });
  const lijst = COMMENTAAR.goalThuis.h, gezien = [];
  for (let i = 0; i < lijst.length * 3; i++) {
    const [a] = commentaarVoor(c, { type: 'goal', team: 0, speler: 3, eigen: false, stand: [i + 1, 0] }, { score: [i + 1, 0], naamVan: () => 'Wietske' });
    c.scorePrev = [0, 0]; c.rij = [];
    gezien.push(a.tekst);
  }
  for (let i = 1; i < gezien.length; i++) assert.notEqual(gezien[i], gezien[i - 1], 'twee dezelfde achter elkaar');
  const eerste = gezien.slice(0, lijst.length);
  assert.ok(new Set(eerste).size >= lijst.length - 3, 'de eerste ronde gebruikt (bijna) alle regels');
});
t('commentaar: een doelpunt komt altijd door, kleine dingen vallen weg bij drukte, de rij loopt af', () => {
  const c = makeCommentaar({ seed: 6 });
  const g = commentaarVoor(c, { type: 'goal', team: 0, speler: 2, eigen: false, stand: [1, 0] }, { score: [1, 0], naamVan: () => 'Hinderk' });
  assert.ok(g.length >= 1 && g[0].soort === 'goalThuis' && g[0].wie === 'h');
  const net = commentaarVoor(c, { type: 'hervat', kind: 'inworp', team: 0 }, { score: [1, 0] });
  assert.equal(net.length, 0, 'een ingooi direct na een doelpunt blijft stil');
  const klinkt = []; for (let i = 0; i < 400; i++) klinkt.push(...tikCommentaar(c, 0.05, { fase: 'goal', score: [1, 0] }));
  assert.ok(klinkt.length >= 1 && klinkt[0].soort === 'goalThuis'); assert.ok(klinkt.length <= 2);
  if (klinkt.length === 2) assert.notEqual(klinkt[0].wie, klinkt[1].wie, 'de ander reageert');
});
t('commentaar: comeback, eigen doelpunt, tegendoelpunt en kaarten kiezen de goede soort', () => {
  const c = makeCommentaar({ seed: 7 });
  const stands = { s: [0, 0] };
  const goal = (team, eigen = false) => { stands.s[team]++; const r = commentaarVoor(c, { type: 'goal', team, speler: eigen ? -1 : 1, eigen, stand: stands.s.slice() }, { score: stands.s.slice(), naamVan: () => 'Roel' }); c.rij = []; c.sinds = 99; return r[0].soort; };
  assert.equal(goal(1), 'goalUit'); assert.equal(goal(1), 'goalUit');
  assert.equal(goal(0), 'goalThuis'); assert.equal(goal(0), 'comeback');
  assert.equal(goal(0, true), 'goalEigen');
  const k1 = commentaarVoor(c, { type: 'kaart', kleur: 'geel', team: 1, speler: 4 }, { naamVan: () => 'Jouke' }); assert.equal(k1[0].soort, 'geel');
  const k2 = commentaarVoor(c, { type: 'kaart', kleur: 'rood', team: 1, speler: 4 }, { naamVan: () => 'Jouke' }); assert.equal(k2[0].soort, 'rood');
});
t('commentaar: een hele wedstrijd levert afwisselend commentaar van beide commentatoren zonder herhaling', () => {
  const m = makeMatch([], { duur: 'kort', seed: 21, aiBeide: true, formaat: 'groot' });
  const c = makeCommentaar({ seed: 21, teams: [m.teams[0].kort, m.teams[1].kort], ids: [m.teams[0].id, m.teams[1].id], duurHelft: m.duurHelft });
  const regels = [], naamVan = (id) => (m.spelers[id] ? m.spelers[id].naam : '');
  for (let i = 0; i < 30 * 700 && m.fase !== 'klaar'; i++) {
    const ev = tikWedstrijd(m, DT);
    const ctx = { fase: m.fase, helft: m.helft, klok: m.klok, duurHelft: m.duurHelft, score: m.score.slice(), bezit: statistiekenVan(m).bezit, naamVan };
    for (const e of ev) commentaarVoor(c, e, ctx);
    regels.push(...tikCommentaar(c, DT, ctx));
  }
  assert.ok(regels.length >= 12, `te weinig commentaar: ${regels.length}`);
  assert.ok(regels.some((r) => r.wie === 'h') && regels.some((r) => r.wie === 'r'), 'beide commentatoren');
  assert.ok(regels.every((r) => !/\{[a-z]+\}/.test(r.tekst)), 'geen onopgeloste sjablonen');
  const teksten = regels.map((r) => r.tekst), uniek = new Set(teksten);
  assert.ok(uniek.size >= teksten.length * 0.9, `te veel herhaling: ${uniek.size}/${teksten.length}`);
  for (let i = 1; i < teksten.length; i++) assert.notEqual(teksten[i], teksten[i - 1]);
  assert.ok(regels.some((r) => r.soort === 'start') && regels.some((r) => r.soort === 'rust') && regels.some((r) => /^eind/.test(r.soort)));
});
t('commentaar: de derby krijgt een eigen regel bij de aftrap', () => {
  assert.equal(derbyVan('stadjers', 'ommelanders'), true); assert.equal(derbyVan('stadjers', 'wadlopers'), false);
  const c = makeCommentaar({ seed: 8 });
  const r = commentaarVoor(c, { type: 'aftrap', team: 0 }, { helft: 1, derby: true, score: [0, 0] });
  assert.ok(r.some((x) => x.soort === 'derby') && r.some((x) => x.soort === 'start'));
});

console.log(`voetbal_fifa_test ok (${n} groepen)`);
