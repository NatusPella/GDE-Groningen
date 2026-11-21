// Pure test van de FIFA-uitbreiding van de voetbalwedstrijd (epic voetbal-fifa, 21-11): scripts/voetbal_fifa_test.mjs
// De aanvullende spelregels (kaarten, blessures, wissels, strafschoppen, buitenspel), het commentaar (afwisselend, niet herhalend, 200+ regels), de TV-regie (camera en herhaling) en de
// presentatie (rustpauze, eindsamenvatting, Man van de match, opstelling). Geen THREE, geen DOM, geen Electron.
import assert from 'node:assert/strict';
import { PITCH, zetFormaat, richtingVan } from '../game/js/voetbalrules.js';
import { makeMatch, tikWedstrijd, setupResume, snapVoetbal, leesLiveVoetbal, makeFootballMirror, voerInVoetbal } from '../game/js/voetbalmatch.js';
import { REGELS_STANDAARD, GEEN_REGELS, cleanRegels, strafschopPlek, beoordeelFout, pasBeoordelingToe, wisselSpeler, rustWissels, blessureWissels, buitenspelBijSchop, manVanDeMatch, statistiekenVan, speelMinuut } from '../game/js/voetbalspelregels.js';

let n = 0;
const t = (naam, f) => { try { f(); n++; } catch (e) { console.error('FAIL', naam); throw e; } };
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

console.log(`voetbal_fifa_test ok (${n} groepen)`);
