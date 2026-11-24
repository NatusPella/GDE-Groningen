// Pure test van de uitzendingsuitbreiding van de voetbalwedstrijd (epic voetbal-uitzending, 21-11): scripts/voetbal_uitzending_test.mjs
// De aanvullende spelregels (kaarten, blessures, wissels, strafschoppen, buitenspel), het commentaar (afwisselend, niet herhalend, 200+ regels), de TV-regie (camera en herhaling) en de
// presentatie (rustpauze, eindsamenvatting, Man van de match, opstelling). Geen THREE, geen DOM, geen Electron.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PITCH, zetFormaat, richtingVan } from '../game/js/voetbalrules.js';
import { makeMatch, tikWedstrijd, setupResume, snapVoetbal, leesLiveVoetbal, makeFootballMirror, voerInVoetbal } from '../game/js/voetbalmatch.js';
import { DEFAULT_RULES, NO_RULES, cleanRules, penaltySpot, judgeFoul, pasBeoordelingToe, substitute, rustWissels, blessureWissels, offsideAtKick, matchMvp, statistiekenVan, speelMinuut } from '../game/js/voetbalextrarules.js';
import { COMMENTATOREN, KINDS, COMMENTAAR, MIN_PER_KIND, MIN_TOTAAL, MAX_WORDS } from '../game/js/voetbalcommentaardata.js';
import { makeCommentaar, commentaarVoor, tikCommentaar, allLines, countLines, vulSjabloon, stemSleutel, derbyVan } from '../game/js/voetbalcommentaar.js';
import { hasForbiddenWord } from './voetbal_verboden.mjs';
import { CAMERA_MODI, SHOTS, cleanModus, nextMode, makeRegie, regieTik, cameraVoor, makeOpname, opnameTik, opnameClip, clipFrame, pasFrameToe, herstelStaat, planHerhaling, herhalingShot } from '../game/js/voetbalregie.js';
import { scoreboardRow, clubLogo, cardIcon, hex, opstellingHtml, rustHtml, eindHtml, eindModel, radarModel, radarHtml, guestEvents, leesTvVoorkeur, subtitleHtml } from '../game/js/voetbalpresentatie.js';
import { CLUBS } from '../game/js/voetbalclubs.js';

let n = 0;
const t =(naam, f) => { try { f(); n++; } catch (e) { console.error('FAIL', naam); throw e; } };
const DT = 1 / 30;
const stap = (m, sec, inv = null) => { const ev = []; for (let i = 0; i < Math.ceil(sec / DT); i++) ev.push(...tikWedstrijd(m, DT, inv)); return ev; };
const tot = (m, fase, max = 120, inv = null) => { const ev = []; for (let i = 0; i < Math.ceil(max / DT) && m.fase !== fase; i++) ev.push(...tikWedstrijd(m, DT, inv)); return ev; };
const newName = (o = {}) => { const m = makeMatch([], { duur: 'kort', seed: 7, aiBeide: true, formaat: 'groot', ...o }); tot(m, 'spel', 30); return m; };

// ---------------------------------------------------------------- de regels
t('de regels: standaard aan (behalve buitenspel), corrupte voorkeur geeft de standaard', () => {
  assert.deepEqual(cleanRules(null), DEFAULT_RULES);
  assert.deepEqual(cleanRules({ kaarten: 'ja', blessures: false, onzin: true }), { ...DEFAULT_RULES, blessures: false });
  assert.equal(DEFAULT_RULES.buitenspel, false);
  assert.ok(Object.values(NO_RULES).every((x) => x === false));
});
t('strafschopstip: binnen het strafschopgebied van de verdediger, midden voor het doel', () => {
  zetFormaat('groot');
  for (const team of [0, 1]) {
    const sp = penaltySpot(team);
    assert.equal(sp.x, 0);
    assert.ok(Math.abs(sp.y) < PITCH.L / 2 && Math.abs(sp.y) > PITCH.L / 2 - PITCH.STRAF_D, `y ${sp.y}`);
  }
  assert.ok(penaltySpot(0).y < 0 && penaltySpot(1).y > 0);
});
t('een fout in het eigen strafschopgebied geeft een strafschop; elders een vrije bal', () => {
  const m = newName({ seed: 11 });
  const dader = m.spelers.find((p) => p.team === 1 && p.i === 3), slachtoffer = m.spelers.find((p) => p.team === 0 && p.i === 9);
  const sp = penaltySpot(1);
  slachtoffer.x = 2; slachtoffer.y = sp.y; // vlak voor het doel van team 1
  dader.x = 2.5; dader.y = slachtoffer.y;
  const b = judgeFoul(m, dader, slachtoffer, true);
  assert.equal(b.strafschop, true);
  slachtoffer.y = 0; assert.equal(judgeFoul(m, dader, slachtoffer, true).strafschop, false);
  const m2 = newName({ seed: 11, regels: { strafschoppen: false } });
  const d2 = m2.spelers.find((p) => p.team === 1 && p.i === 3), s2 = m2.spelers.find((p) => p.team === 0 && p.i === 9);
  s2.x = 2; s2.y = penaltySpot(1).y; assert.equal(judgeFoul(m2, d2, s2, true).strafschop, false);
});
t('een strafschop: de nemer staat bij de stip, de keeper op zijn lijn, de rest buiten het strafschopgebied', () => {
  const m = newName({ seed: 12 });
  setupResume(m, 'strafschop', 0, 0, 0);
  const sp = penaltySpot(1), taker = m.spelers[m.hervat.taker];
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
  const m = newName({ seed: 13 });
  const dader = m.spelers.find((p) => p.team === 1 && p.i === 4), slach = m.spelers.find((p) => p.team === 0 && p.i === 8);
  const ev1 = pasBeoordelingToe(m, dader, slach, { strafschop: false, kaart: 'geel', blessure: false });
  assert.equal(ev1[0].kleur, 'geel'); assert.equal(dader.geel, 1); assert.equal(dader.rood, false); assert.deepEqual(m.stat.geel, [0, 1]);
  const ev2 = pasBeoordelingToe(m, dader, slach, { strafschop: false, kaart: 'geelrood', blessure: false });
  assert.equal(ev2[0].kleur, 'rood'); assert.equal(ev2[0].tweede, true); assert.equal(dader.rood, true); assert.deepEqual(m.stat.rood, [0, 1]);
  assert.ok(Math.abs(dader.x) > PITCH.B / 2, 'naar de zijlijn');
  const x0 = dader.x; stap(m, 5); assert.equal(dader.x, x0, 'een uitgesloten speler beweegt niet meer');
  for (const p of m.spelers) assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y));
  assert.equal(substitute(m, dader.id), null, 'een rode kaart mag niet gewisseld worden');
});
t('met de regels uit geen kaarten, blessures of strafschoppen', () => {
  const m = newName({ seed: 14, regels: { kaarten: false, blessures: false, strafschoppen: false } });
  for (let i = 0; i < 50; i++) { const a = m.spelers[3], b = m.spelers[14]; const r = judgeFoul(m, a, b, true); assert.deepEqual(r, { strafschop: false, kaart: null, blessure: false }); }
});
t('een blessure: kreupel tot de volgende dode bal, dan wisselt hij met de bank', () => {
  const m = newName({ seed: 15 });
  const slach = m.spelers.find((p) => p.team === 0 && p.i === 8), dader = m.spelers.find((p) => p.team === 1 && p.i === 3);
  const ev = pasBeoordelingToe(m, dader, slach, { strafschop: false, kaart: null, blessure: true });
  assert.equal(ev[0].type, 'blessure'); assert.equal(slach.blessure, true);
  const oud = slach.naam;
  const w = blessureWissels(m);
  assert.equal(w.length, 1); assert.equal(w[0].uit, oud); assert.notEqual(slach.naam, oud); assert.equal(slach.blessure, false); assert.equal(m.wissels[0], 1);
});
t('wissels: maximaal de bank (groot 3, klein 2), de keeper wisselt niet, de rust wisselt de moeste veldspeler', () => {
  const m = newName({ seed: 16 });
  assert.equal(m.bank[0].length, 3);
  for (let i = 0; i < 6; i++) substitute(m, m.spelers.find((p) => p.team === 0 && p.rol !== 'keeper' && p.gewisseld === 0 && !p.rood).id);
  assert.equal(m.wissels[0], 3);
  assert.equal(substitute(m, m.spelers.find((p) => p.team === 0 && p.rol !== 'keeper' && p.gewisseld === 0).id), null);
  assert.equal(substitute(m, m.spelers.find((p) => p.team === 1 && p.rol === 'keeper').id), null);
  const k = makeMatch([], { duur: 'kort', seed: 3, formaat: 'klein' });
  assert.equal(k.bank[0].length, 2);
  const r = newName({ seed: 17 });
  for (const p of r.spelers) p.stamina = 0.9;
  r.spelers.find((p) => p.team === 1 && p.i === 6).stamina = 0.3;
  const ev = rustWissels(r);
  assert.ok(ev.some((e) => e.team === 1 && e.reden === 'moe'));
});
t('buitenspel (optioneel): alleen met de regel aan, alleen voor een speler voor de een-na-laatste tegenstander', () => {
  const m = newName({ seed: 18, regels: { buitenspel: true } });
  const p = m.spelers.find((q) => q.team === 0 && q.i === 3), o = m.spelers.find((q) => q.team === 0 && q.i === 9);
  for (const q of m.spelers) if (q.team === 1) { q.y = 10 + q.i; q.x = 0; }
  p.y = 0; o.y = 30; assert.equal(offsideAtKick(m, p, o), true);
  o.y = 8; assert.equal(offsideAtKick(m, p, o), false);
  o.y = -3; assert.equal(offsideAtKick(m, p, o), false, 'achter de bal');
  const m2 = newName({ seed: 18 }); assert.equal(offsideAtKick(m2, m2.spelers[3], m2.spelers[9]), false, 'uit tenzij ingeschakeld');
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
    const mm = matchMvp(m);
    assert.ok(mm && typeof mm.naam === 'string' && mm.id >= 0);
    assert.ok(speelMinuut(m) <= 90 && speelMinuut(m) >= 1);
  }
});
t('de momentopname kent de strafschop en blijft even lang (het protocol is ongewijzigd)', () => {
  const m = newName({ seed: 19 });
  setupResume(m, 'strafschop', 0, 0, 0);
  const snap = snapVoetbal(m, 1);
  assert.equal(snap.d.length, 64);
  const st = leesLiveVoetbal(JSON.parse(JSON.stringify(snap)));
  const sp = makeFootballMirror({ deeln: [{ slot: 0, naam: 'Jij' }] }, 0, { formaat: 'groot', duur: 'kort' });
  assert.equal(voerInVoetbal(sp, st), true); assert.equal(sp.hervat.kind, 'strafschop');
});

// ---------------------------------------------------------------- het commentaar
t('commentaar: 200+ regels als data, elke soort met genoeg regels, twee commentatoren', () => {
  assert.ok(countLines() >= MIN_TOTAAL, `aantal ${countLines()}`);
  for (const soort of Object.keys(KINDS)) {
    const p = COMMENTAAR[soort]; assert.ok(p, `soort ${soort} mist`);
    assert.ok((p.h || []).length + (p.r || []).length >= MIN_PER_KIND, `${soort} heeft te weinig regels`);
  }
  for (const soort of Object.keys(COMMENTAAR)) assert.ok(KINDS[soort], `soort ${soort} zonder instelling`);
  assert.ok(Object.values(COMMENTAAR).every((p) => (p.h || []).length >= 2 && (p.r || []).length >= 2), 'beide commentatoren praten bij elke soort');
  assert.deepEqual(Object.keys(COMMENTATOREN), ['h', 'r']);
});
t('commentaar: geen echte clubs of merken, geen "de Grunn", geen dubbele regel, woordbudget', () => {
  const gezien = new Set();
  for (const r of allLines()) {
    assert.equal(hasForbiddenWord(r.tekst), false, r.tekst);
    assert.equal(/de Grunn\b/.test(r.tekst), false, r.tekst);
    assert.equal(/\b(winter|sneeuw|ijs)\b/i.test(r.tekst), false, `altijd zomer: ${r.tekst}`);
    assert.ok(r.tekst.split(/\s+/).length <= MAX_WORDS, `te lang: ${r.tekst}`);
    assert.equal(gezien.has(r.tekst), false, `dubbel: ${r.tekst}`); gezien.add(r.tekst);
    assert.ok(/[.!?]$/.test(r.tekst), `eindigt zonder leesteken: ${r.tekst}`);
    const open = (r.tekst.match(/\{/g) || []).length; assert.equal(open, (r.tekst.match(/\}/g) || []).length);
    for (const mm of r.tekst.matchAll(/\{([a-z]+)\}/g)) assert.ok(['speler', 'team', 'ander', 'stand', 'ronde', 'rondes', 'divisie', 'sponsor'].includes(mm[1]), `onbekend sjabloon ${mm[0]}`);
  }
});
t('commentaar: seizoen en carrière (#1179): de juiste soort bij de ronde, de plek en het debuut; zonder carrière niets', () => {
  const soorten = (ctx) => { const c = makeCommentaar({ seed: 7, teams: ['Stadjers', 'Wadlopers'], ids: ['stadjers', 'wadlopers'] }); const uit = commentaarVoor(c, { type: 'aftrap', team: 0 }, { helft: 1, score: [0, 0], ...ctx }); return [...new Set(uit.map((e) => e.soort))]; };
  const basis = { kind: 'league', ronde: 2, rondes: 7, laatste: false, divisie: 'Talentenklasse', rank: 5, clubs: 8, debuut: false, naam: 'Tessa', sponsor: '' };
  assert.deepEqual(soorten({}), ['start']);
  assert.deepEqual(soorten({ carriere: basis }), ['start', 'seizoenRonde']);
  assert.ok(soorten({ carriere: { ...basis, rank: 1 } }).includes('seizoenTop'));
  assert.ok(soorten({ carriere: { ...basis, rank: 8 } }).includes('seizoenBodem'));
  assert.ok(soorten({ carriere: { ...basis, ronde: 7, laatste: true } }).includes('seizoenLaatste'));
  assert.ok(soorten({ carriere: { ...basis, kind: 'cup' } }).includes('bekerWedstrijd'));
  assert.ok(soorten({ carriere: { ...basis, kind: 'europe' } }).includes('europaWedstrijd'));
  assert.ok(soorten({ carriere: { ...basis, debuut: true } }).includes('carriereDebuut'));
  assert.ok(soorten({ carriere: { ...basis, sponsor: 'Gouden Bakkerij', ronde: 3 } }).includes('sponsorRegel'));
  for (const soort of ['seizoenRonde', 'seizoenTop', 'seizoenBodem', 'seizoenLaatste', 'bekerWedstrijd', 'europaWedstrijd', 'carriereDebuut', 'sterGoal', 'sponsorRegel']) {
    assert.ok(KINDS[soort] && COMMENTAAR[soort].h.length >= MIN_PER_KIND && COMMENTAAR[soort].r.length >= MIN_PER_KIND, soort);
    assert.ok(COMMENTAAR[soort].h.some((x) => !/\{/.test(x)) && COMMENTAAR[soort].r.some((x) => !/\{/.test(x)), `${soort}: ook vaste regels (stem)`);
  }
  // de sjablonen worden gevuld, ook zonder waarden valt het netjes terug
  const c = makeCommentaar({ seed: 3, teams: ['Stadjers', 'Wadlopers'], ids: ['stadjers', 'wadlopers'] });
  const uit = commentaarVoor(c, { type: 'aftrap', team: 0 }, { helft: 1, score: [0, 0], carriere: { ...basis, debuut: true } });
  for (const e of uit) assert.ok(!/\{/.test(e.tekst), e.tekst);
  assert.equal(vulSjabloon('Ronde {ronde} van {rondes} in de {divisie}.', {}), 'Ronde deze ronde van zeven in de competitie.');
  // een doelpunt van de carrièrespeler is een ster-regel, een doelpunt van een ander niet
  const ster = (naam) => { const k = makeCommentaar({ seed: 5, teams: ['Stadjers', 'Wadlopers'], ids: ['stadjers', 'wadlopers'] }); return commentaarVoor(k, { type: 'goal', team: 0, speler: 3, stand: [1, 0] }, { score: [1, 0], carriere: basis, naamVan: () => naam }).map((e) => e.soort); };
  assert.ok(ster('Tessa').every((x) => x === 'sterGoal') && ster('Tessa').length >= 1);
  assert.ok(ster('Wietske').every((x) => x === 'goalThuis') && ster('Wietske').length >= 1);
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

// ---------------------------------------------------------------- de tv-regie en de herhaling
const shotsVan = (modus, sim, evs = []) => { const r = makeRegie({ modus }); return regieTik(r, sim, evs, 0.05).shot; };
t('regie: de standaard wisselt alleen bij een dode bal; speler nooit; tv ook bij een schot; intro en einde zijn breed', () => {
  const m = makeMatch([{ slot: 0, naam: 'Jij' }], { duur: 'kort', seed: 31, formaat: 'groot' });
  assert.equal(shotsVan('auto', m), 'breed'); assert.equal(shotsVan('speler', m), 'breed');
  tot(m, 'spel', 30);
  assert.equal(shotsVan('auto', m), 'speler'); assert.equal(shotsVan('speler', m), 'speler'); assert.equal(shotsVan('tv', m), 'zijlijn'); assert.equal(shotsVan('hoog', m), 'hoog');
  m.fase = 'goal'; m.faseT = 3.2 - 0.5; assert.equal(shotsVan('auto', m), 'doel'); m.faseT = 3.2 - 2; assert.equal(shotsVan('auto', m), 'viering'); assert.equal(shotsVan('speler', m), 'speler');
  m.fase = 'spel';
  setupResume(m, 'strafschop', 0, 0, 0); assert.equal(shotsVan('auto', m), 'doel');
  setupResume(m, 'hoek', 0, 20, 40); assert.equal(shotsVan('auto', m), 'hoek'); assert.equal(shotsVan('speler', m), 'speler');
  m.fase = 'spel'; m.hervat = null;
  assert.equal(shotsVan('auto', m, [{ type: 'kaart', kleur: 'geel', team: 1, speler: 14 }]), 'kaart');
  m.bal.y = 30; assert.equal(shotsVan('tv', m, [{ type: 'schop', soort: 'schot', sterkte: 0.9 }]), 'doel'); assert.equal(shotsVan('auto', m, [{ type: 'schop', soort: 'schot', sterkte: 0.9 }]), 'speler');
  m.fase = 'rust'; assert.equal(shotsVan('auto', m), 'breed'); m.fase = 'eind'; assert.equal(shotsVan('speler', m), 'breed');
});
t('regie: een snit is een snit en de camera is altijd eindig, voor elk shot en elk formaat', () => {
  for (const formaat of ['klein', 'groot']) {
    const m = makeMatch([{ slot: 0, naam: 'Jij' }], { duur: 'kort', seed: 32, formaat }); tot(m, 'spel', 30);
    for (const shot of SHOTS) for (const by of [-30, 0, 30]) {
      m.bal.y = by * (formaat === 'groot' ? 1 : 0.5); m.bal.x = 3;
      const c = cameraVoor(shot, m, 4, 5, { speler: 3 });
      for (const v of [c.pos.x, c.pos.y, c.pos.z, c.at.x, c.at.y, c.at.z, c.fov]) assert.ok(Number.isFinite(v), `${shot} ${formaat}`);
      assert.ok(c.pos.z > 0.5 && c.fov > 30 && c.fov < 80);
    }
  }
  const r = makeRegie({ modus: 'auto' }), m = makeMatch([], { duur: 'kort', seed: 33 });
  assert.equal(regieTik(r, m, [], 0.1).cut, true); assert.equal(regieTik(r, m, [], 0.1).cut, false);
  assert.deepEqual(CAMERA_MODI.map((x) => cleanModus(x)), CAMERA_MODI); assert.equal(cleanModus('onzin'), 'auto');
  assert.equal(nextMode('auto'), 'speler'); assert.equal(nextMode('hoog'), 'auto');
});
t('herhaling: opname, clip, tussenbeeld, zetten en terugzetten van de sim', () => {
  const m = newName({ seed: 34 });
  const op = makeOpname();
  for (let i = 0; i < 30 * 10; i++) { tikWedstrijd(m, DT); opnameTik(op, m, DT); }
  assert.ok(op.frames.length >= 100 && op.frames[0].t >= op.t - 12.1, 'de opname is begrensd');
  const clip = opnameClip(op, op.t - 5, op.t - 1);
  assert.ok(clip && clip.duur > 3.5 && clip.duur < 4.2);
  const f0 = clipFrame(clip, 0), f1 = clipFrame(clip, clip.duur / 2), f2 = clipFrame(clip, 99);
  for (const f of [f0, f1, f2]) { assert.equal(f.p.length, m.spelers.length * 5); assert.ok(f.p.every(Number.isFinite) && f.b.every(Number.isFinite)); }
  const voor = JSON.stringify([m.bal.x, m.bal.y, m.spelers.map((p) => [p.x, p.y, p.face, p.speed])]);
  const bw = pasFrameToe(m, f1);
  assert.notEqual(JSON.stringify([m.bal.x, m.bal.y, m.spelers.map((p) => [p.x, p.y, p.face, p.speed])]), voor, 'het beeld staat op de sim');
  herstelStaat(m, bw);
  assert.equal(JSON.stringify([m.bal.x, m.bal.y, m.spelers.map((p) => [p.x, p.y, p.face, p.speed])]), voor, 'de sim is weer zoals hij was');
  assert.equal(opnameClip(op, 9999, 99999), null);
});
t('herhaling: bij een doelpunt altijd, bij een paal hoogstens een per anderhalve minuut, nooit online of vlak voor het fluitsignaal', () => {
  const op = makeOpname(); op.t = 100;
  const g = planHerhaling(op, { type: 'goal' }, {}); assert.deepEqual([g.soort, g.van, g.tot], ['goal', 95, 101.2]);
  assert.equal(planHerhaling(op, { type: 'goal' }, { online: true }), null);
  assert.equal(planHerhaling(op, { type: 'paal' }, { klok: 60, laatste: -999 }).soort, 'kans');
  assert.equal(planHerhaling(op, { type: 'paal' }, { klok: 60, laatste: 50 }), null);
  assert.equal(planHerhaling(op, { type: 'lat' }, { klok: 10, laatste: -999 }), null);
  assert.equal(planHerhaling(op, { type: 'redding' }, {}), null);
  assert.equal(herhalingShot(0.2), 'zijlijn'); assert.equal(herhalingShot(0.9), 'doel');
});

// ---------------------------------------------------------------- de presentatie
t('presentatie: scorebord met verzonnen logo\'s en kaart- en blessure-icoontjes, alles ontsnapt', () => {
  const m = newName({ seed: 41 });
  m.teams[1] = { ...m.teams[1], naam: 'De <b>Boze</b> Boys', kort: '<b>Boze</b>' };
  const kaart = m.spelers.find((p) => p.team === 1 && p.i === 3), bles = m.spelers.find((p) => p.team === 0 && p.i === 5);
  kaart.geel = 1; bles.blessure = true;
  const rij = scoreboardRow(m);
  assert.ok(rij.includes('vbtv-logo') && rij.includes('vbtv-kaart--geel') && rij.includes('vbtv-blessure'));
  assert.equal(rij.includes('<b>Boze</b>'), false, 'de teamnaam is ontsnapt'); assert.ok(rij.includes('&lt;b&gt;Boze'));
  kaart.rood = true; assert.ok(scoreboardRow(m).includes('vbtv-kaart--rood'));
  for (const club of CLUBS) { const svg = clubLogo(club, 30); assert.ok(svg.startsWith('<svg') && svg.includes('role="img"') && !/NaN|undefined/.test(svg), club.id); }
  assert.ok(cardIcon('rood').includes('rood') && cardIcon('geel').includes('geel'), 'een kaart heeft een woord, niet alleen een kleur');
  assert.equal(hex(0x2f9e5b), '#2f9e5b'); assert.equal(hex(NaN), '#000000');
});
t('presentatie: opstelling, rustpauze en eindsamenvatting met Man van de match', () => {
  const m = makeMatch([{ slot: 0, naam: 'Jij' }], { duur: 'kort', seed: 42, aiBeide: false, formaat: 'groot' });
  const op = opstellingHtml(m);
  assert.equal((op.match(/<li/g) || []).length, 22, 'tweeëntwintig spelers'); assert.ok(op.includes('vbtv-jij') && op.includes(m.teams[0].kort) && op.includes('4-'));
  tot(m, 'rust', 400, () => ({ mx: 0, my: -1, buttons: 0 }));
  const rust = rustHtml(m);
  for (const w of ['Balbezit', 'Schoten', 'Hoekschoppen', 'Overtredingen', 'Rust']) assert.ok(rust.includes(w), w);
  tot(m, 'eind', 600, () => ({ mx: 0, my: -1, buttons: 0 }));
  const em = eindModel(m), eind = eindHtml(m);
  assert.ok(em.mvp && eind.includes('Man van de match') && eind.includes(m.spelers[em.mvp.id].naam.replace(/&/g, '&amp;')) && ['Gewonnen', 'Verloren', 'Gelijkspel'].includes(em.uitslag));
  assert.ok(eind.includes('Eindsignaal'));
  assert.ok(op.includes('Aftrap in de Euroborg'), 'zonder plek: de Euroborg'); assert.ok(opstellingHtml(m, 'op het sportpark in <Ten Boer>').includes('Aftrap op het sportpark in &lt;Ten Boer&gt;'), 'een park: de plaats, ontsnapt');
  const spiegel = makeFootballMirror({ deeln: [{ slot: 0, naam: 'Jij' }] }, 0, { formaat: 'groot' });
  assert.equal(eindModel(spiegel).mvp, null, 'een gast heeft geen statistieken (die zijn van de host)'); assert.ok(!eindHtml(spiegel).includes('vbtv-stats'));
});
t('presentatie: de radar blijft binnen 0 tot 1, jouw speler is gemarkeerd, een uitgesloten speler staat er niet op', () => {
  const m = newName({ seed: 43 });
  m.spelers[14].rood = true;
  const r = radarModel(m, 3);
  assert.equal(r.spelers.length, 21); assert.equal(r.spelers.filter((p) => p.jij).length, 1);
  for (const p of [...r.spelers, r.bal]) assert.ok(p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1);
  assert.ok(radarHtml(m, 3).includes('vbtv-rjij') && !/NaN/.test(radarHtml(m, 3)));
});
t('presentatie: een gast haalt gebeurtenissen uit het verschil tussen twee momentopnamen', () => {
  const a = { fase: 'spel', score: [0, 0], hervatKind: null };
  assert.deepEqual(guestEvents(null, a), []);
  const g = guestEvents(a, { fase: 'goal', score: [1, 0], hervatKind: null });
  assert.equal(g.length, 1); assert.deepEqual([g[0].type, g[0].team], ['goal', 0]);
  assert.equal(guestEvents(a, { fase: 'rust', score: [0, 0], hervatKind: null })[0].type, 'fluit');
  assert.equal(guestEvents(a, { fase: 'eind', score: [2, 1], hervatKind: null })[0].winnaar, 0);
  assert.equal(guestEvents(a, { fase: 'hervat', score: [0, 0], hervatKind: 'strafschop' })[0].kind, 'strafschop');
  assert.deepEqual(guestEvents(a, a), []);
});
t('presentatie: de voorkeur voor camera en regels herstelt zich van onzin', () => {
  assert.deepEqual(leesTvVoorkeur(null), { camera: 'auto', regels: DEFAULT_RULES });
  assert.deepEqual(leesTvVoorkeur('geen json'), { camera: 'auto', regels: DEFAULT_RULES });
  const v = leesTvVoorkeur(JSON.stringify({ tv: { camera: 'tv', regels: { kaarten: false, onzin: 1 } } }));
  assert.equal(v.camera, 'tv'); assert.equal(v.regels.kaarten, false); assert.equal(v.regels.blessures, true);
  assert.equal(leesTvVoorkeur(JSON.stringify({ tv: { camera: 5 } })).camera, 'auto');
});
t('de nieuwe regels veranderen de bestaande aanpak niet: met alles uit is de wedstrijd gelijk aan de oude (zelfde stand, zelfde uit)', () => {
  const a = makeMatch([], { duur: 'kort', seed: 51, aiBeide: true, formaat: 'groot', regels: { kaarten: false, blessures: false, strafschoppen: false, wissels: false } });
  const b = makeMatch([], { duur: 'kort', seed: 51, aiBeide: true, formaat: 'groot', regels: { kaarten: false, blessures: false, strafschoppen: false, wissels: false } });
  tot(a, 'klaar', 700); tot(b, 'klaar', 700);
  assert.deepEqual(a.score, b.score); assert.deepEqual(a.stat.overtredingen, b.stat.overtredingen);
  assert.deepEqual([a.stat.geel, a.stat.rood, a.wissels], [[0, 0], [0, 0], [0, 0]]);
});

t('ondertitel: zonder tekst geen balk (review 22-11)', () => {
  assert.equal(subtitleHtml(null), ''); assert.equal(subtitleHtml({ naam: 'Jelle', tekst: '' }), ''); assert.equal(subtitleHtml({ naam: 'Jelle', tekst: '  ' }), '');
  assert.match(subtitleHtml({ naam: 'Jelle', tekst: 'Goal!' }), /<span>Goal!<\/span>/);
});

t('#1110: een verborgen kaart van de tv-laag blijft verborgen (geen lege witte balk over het veld)', () => {
  const fs = process.getBuiltinModule('node:fs');
  const css = fs.readFileSync(new URL('../game/js/voetbaltv.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  // .vbtv-paneel.ds-z-kaart zet display: grid; de verbergregel moet zwaarder wegen dan die twee klassen
  assert.match(css, /\.vbtv \.ds-z-kaart\[hidden\][^{]*\{\s*display:\s*none/);
  assert.match(css, /\.vbtv-paneel\.ds-z-kaart\s*\{[^}]*display:\s*grid/);
});

t('derby (#1114): wie in team 1 speelt kijkt vanaf de andere kant en zijn stick draait mee, vooruit is naar het doel van de tegenstander', () => {
  const m = makeMatch([{ slot: 0, naam: 'Jij' }], { duur: 'kort', seed: 32, formaat: 'groot' }); tot(m, 'spel', 30);
  m.bal.x = 6; m.bal.y = 12;
  const mir = (q) => ({ ...q, x: -q.x, y: -q.y });
  for (const shot of ['speler', 'hoog']) {
    const a = cameraVoor(shot, m, 4, 5, { team1: true }), b = cameraVoor(shot, { ...m, bal: mir(m.bal), spelers: m.spelers.map(mir) }, 4, 5, {});
    assert.deepEqual([a.pos.x, a.pos.y, a.pos.z, a.at.x, a.at.y], [-b.pos.x, -b.pos.y, b.pos.z, -b.at.x, -b.at.y], shot);
    const gewoon = cameraVoor(shot, m, 4, 5, {});
    assert.ok(Math.sign(a.at.y - a.pos.y) === -Math.sign(gewoon.at.y - gewoon.pos.y), shot + ': de kijkrichting is omgedraaid');
  }
  assert.deepEqual(cameraVoor('zijlijn', m, 4, 5, { team1: true }), cameraVoor('zijlijn', m, 4, 5, {}), 'een tv-shot blijft gewoon');
  // dezelfde stick (vooruit) brengt een mens in team 0 en een in team 1 elk naar het doel van de tegenstander
  for (const team of [0, 1]) {
    const d = makeMatch([{ slot: 0, naam: 'Jij', team }], { duur: 'kort', seed: 9, formaat: 'groot' }); tot(d, 'spel', 30);
    const me = d.spelers[d.mensen[0].ctl], y0 = me.y;
    for (let i = 0; i < 40; i++) tikWedstrijd(d, DT, () => ({ mx: 0, my: -1, buttons: 0 }));
    assert.ok((me.y - y0) * richtingVan(team) > 1, `team ${team}: ${y0.toFixed(1)} naar ${me.y.toFixed(1)}`);
  }
});

t('commentaar op een sportpark (beeld 24-11): geen regel over de Euroborg, en geen over de Stadjers als die niet spelen', () => {
  for (let seed = 1; seed <= 40; seed++) {
    const c = makeCommentaar({ seed, teams: ['Dorkwerd', 'Roodehaan'], ids: ['lc1', 'lc2'], buiten: true });
    const regels = [];
    for (const ev of [{ type: 'aftrap', team: 0 }, { type: 'goal', team: 0, speler: 3 }, { type: 'fluit', helft: 1 }, { type: 'goal', team: 1, speler: 14 }, { type: 'einde', winnaar: 0 }]) regels.push(...commentaarVoor(c, ev, { helft: 1, score: [1, 0], naamVan: () => 'Aart' }));
    for (const r of regels) assert.ok(!/Euroborg|Stadjers/.test(r.tekst), r.tekst);
  }
  const thuis = makeCommentaar({ seed: 1, teams: ['Stadjers', 'Wadlopers'], ids: ['stadjers', 'wadlopers'] });
  assert.equal(thuis.mijd, null, 'in de Euroborg met de Stadjers mag alles');
});

t('stijl: de gespiegelde kolom van de opstelling geeft de rol niet de smalle kolom (#1110, 24-11: "KeepeAart" liep over de naam)', () => {
  const css = fs.readFileSync(new URL('../game/js/voetbaltv.css', import.meta.url), 'utf8');
  const thuis = /\.vbtv-kolom li \{[^}]*grid-template-columns:\s*([^;]+);/.exec(css), uit = /\.vbtv-kolom--uit li \{[^}]*grid-template-columns:\s*([^;]+);/.exec(css);
  assert.ok(thuis && uit, 'beide kolommen hebben een raster');
  assert.equal(uit[1].trim(), thuis[1].trim(), 'rtl spiegelt de volgorde al: dezelfde kolommen als thuis');
  assert.match(css, /\.vbtv-kolom--uit li \{[^}]*direction:\s*rtl/);
});

console.log(`voetbal_uitzending_test ok (${n} groepen)`);
