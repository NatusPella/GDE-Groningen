// Test van de ontwikkeling, training, vorm, vermoeidheid en blessures (#1109) en van de agenda (#1108): scripts/voetbal_ontwikkeling_test.mjs. Puur.
import assert from 'node:assert/strict';
import { makeProtagonist, ATTRS, attrCap } from '../game/js/voetbalspelers.js';
import { matchXp, simulatedXp, applyXp, trainingXp, canTrain, formFactor, formArrow, pushHistory, performance, addFatigue, recover, isTired, rollInjury, tickInjury, INJURY_TEXTS, FORBIDDEN_INJURY_WORDS, PHASE_CAP, FATIGUE, MAX_INJURY_DAYS, resetPhase } from '../game/js/voetbalontwikkeling.js';
import { nightPassed, seasonCalendar, seasonLength, eventStatus, nextEvent, windowOf, dayText, catchUpDays, DAYS_PER_ROUND, MAX_CATCHUP_DAYS } from '../game/js/voetbalagenda.js';

let n = 0;
const t = (naam, f) => { try { f(); n++; } catch (e) { console.error('FAIL', naam); throw e; } };

t('ervaring uit een wedstrijd: doelpunten voeden schot, uitgerekend is 60%', () => {
  const stat = { goals: 2, shots: 4, assists: 1, passes: 20, tackles: 3, minutes: 8, sprints: 12 };
  const x = matchXp(stat), s = matchXp(stat, true);
  assert.ok(x.shot > x.defend && x.shot > 3);
  for (const k of ATTRS) assert.ok(Math.abs(s[k] - x[k] * 0.6) < 0.02);
  assert.deepEqual(matchXp({}), { pace: 0, shot: 0, pass: 0, stamina: 0, defend: 0 });
  assert.ok(simulatedXp('aanvaller', 'winst').shot > simulatedXp('verdediger', 'winst').shot);
});
t('groei: trainen verhoogt de focus, het plafond van de fase is 4, het potentieel is het plafond', () => {
  let p = makeProtagonist('tammo'), prog, phase = resetPhase();
  const start = p.attrs.shot;
  let gains = 0;
  for (let i = 0; i < 60; i++) { const r = applyXp(p, trainingXp('shot', 1), prog, phase); p = r.player; prog = r.prog; phase = r.phase; gains += r.gains.length; }
  assert.equal(p.attrs.shot - start, PHASE_CAP, 'precies het plafond van de fase');
  assert.equal(gains, PHASE_CAP);
  assert.equal(p.attrs.pace, makeProtagonist('tammo').attrs.pace, 'andere vaardigheden blijven staan');
  // een nieuwe fase: weer groei
  phase = resetPhase();
  for (let i = 0; i < 60; i++) { const r = applyXp(p, trainingXp('shot', 1), prog, phase); p = r.player; prog = r.prog; phase = r.phase; }
  assert.equal(p.attrs.shot - start, PHASE_CAP * 2);
  // het plafond van het potentieel
  let q = makeProtagonist('tammo'); q.attrs.shot = attrCap(q, 'shot');
  const r = applyXp(q, trainingXp('shot', 1.5));
  assert.equal(r.player.attrs.shot, attrCap(q, 'shot'));
  assert.deepEqual(r.gains, []);
  // de oude speler is niet aangepast
  assert.equal(makeProtagonist('tammo').attrs.shot, start);
});
t('trainingsxp: geklemd op 0,5 tot 1,5; onbekende focus geeft niets; een dagcap', () => {
  assert.ok(trainingXp('pace', 9).pace === trainingXp('pace', 1.5).pace);
  assert.ok(trainingXp('pace', -3).pace === trainingXp('pace', 0.5).pace);
  assert.equal(trainingXp('nep').pace, 0);
  assert.ok(trainingXp('pass').pass > 0 && trainingXp('pass', 1.4).pass > trainingXp('pass', 0.6).pass);
  assert.ok(canTrain({}, 3)); assert.ok(!canTrain({ trainedDay: 3 }, 3)); assert.ok(!canTrain({ matchDay: 3 }, 3), 'een wedstrijd telt als de training van de dag'); assert.ok(!canTrain({ injury: { days: 1 } }, 4));
});
t('vorm: laatste vijf wedstrijden, 0,92 tot 1,08, met pijltje', () => {
  assert.equal(formFactor([]), 1);
  const goed = Array.from({ length: 5 }, () => ({ r: 'W', perf: 1 })), slecht = Array.from({ length: 5 }, () => ({ r: 'L', perf: 0 }));
  assert.equal(formFactor(goed), 1.08); assert.equal(formFactor(slecht), 0.92);
  assert.equal(formArrow(1.08), 'stijgend'); assert.equal(formArrow(0.92), 'dalend'); assert.equal(formArrow(1), 'stabiel');
  let h = [];
  for (let i = 0; i < 9; i++) h = pushHistory(h, { r: 'W', perf: 2 });
  assert.equal(h.length, 5); assert.equal(h[0].perf, 1);
  assert.ok(performance({ goals: 2 }) > performance({}) && performance({ goals: 99 }) === 1);
});
t('vermoeidheid: wedstrijd 35, training 15, herstel 35 per dag; moe vanaf 75', () => {
  let f = addFatigue(0, FATIGUE.match); assert.equal(f, 35);
  f = addFatigue(f, FATIGUE.match); f = addFatigue(f, FATIGUE.training); assert.equal(f, 85); assert.ok(isTired(f));
  assert.equal(recover(f, 1), 50); assert.equal(recover(f, 5), 0); assert.equal(addFatigue(99, 50), 100);
});
t('blessures: deterministisch, alleen bij overbelasting, uit te zetten, hooguit 3 dagen, zonder leed-woorden', () => {
  assert.equal(rollInjury({ seed: 1, day: 1, fatigue: 50 }), null, 'fris geeft nooit een blessure');
  assert.equal(rollInjury({ seed: 1, day: 1, fatigue: 100, enabled: false }), null, 'uitgezet');
  let hits = 0, hitsFysio = 0;
  for (let d = 0; d < 400; d++) {
    const a = rollInjury({ seed: 3, day: d, fatigue: 100 }), b = rollInjury({ seed: 3, day: d, fatigue: 100 });
    assert.deepEqual(a, b);
    if (a) { hits++; assert.ok(a.days >= 1 && a.days <= MAX_INJURY_DAYS); for (const w of FORBIDDEN_INJURY_WORDS) assert.ok(!a.text.toLowerCase().includes(w), a.text); assert.match(a.text, /rust \d speldag/); }
    if (rollInjury({ seed: 3, day: d, fatigue: 100, physio: true })) hitsFysio++;
  }
  assert.ok(hits > 40 && hits < 200, `kans ${hits}/400`);
  assert.ok(hitsFysio < hits, 'de fysio helpt');
  for (const x of INJURY_TEXTS) for (const w of FORBIDDEN_INJURY_WORDS) assert.ok(!x.toLowerCase().includes(w));
  let inj = { days: 3, text: 'x' };
  inj = tickInjury(inj); assert.equal(inj.days, 2); inj = tickInjury(inj, 5); assert.equal(inj, null);
});
t('het nachtsignaal: een klok die meer dan vier uur terugspringt is een nacht', () => {
  assert.ok(nightPassed(23.5, 0.1)); assert.ok(nightPassed(22, 6)); assert.ok(!nightPassed(10, 9.9)); assert.ok(!nightPassed(null, 2)); assert.ok(!nightPassed(NaN, 2));
});
t('de agenda: competitie elke 3 dagen, beker en Europa ertussen, nooit twee wedstrijden op een dag', () => {
  for (const o of [{ cup: false }, { cup: true }, { cup: true, europe: true }]) {
    const cal = seasonCalendar(o);
    assert.equal(new Set(cal.map((e) => e.day)).size, cal.length, JSON.stringify(o));
    const lg = cal.filter((e) => e.kind === 'league');
    assert.equal(lg.length, 7); lg.forEach((e, i) => assert.equal(e.day, DAYS_PER_ROUND * (i + 1)));
  }
  assert.equal(seasonCalendar({ cup: false }).length, 7);
  assert.equal(seasonCalendar({ cup: true, europe: true }).length, 15);
  assert.equal(seasonLength(seasonCalendar({ cup: false })), 24);
  const cal = seasonCalendar({ cup: false });
  assert.equal(nextEvent(cal, 0).day, 3); assert.equal(nextEvent(cal, 7), null);
});
t('wedstrijdvensters: soon, open, missed; een verre rit duurt twee dagen', () => {
  const ev = { day: 3, kind: 'league', n: 1 };
  assert.equal(eventStatus(ev, 2), 'soon'); assert.equal(eventStatus(ev, 3), 'open'); assert.equal(eventStatus(ev, 4), 'missed');
  assert.equal(eventStatus(ev, 4, 2), 'open'); assert.deepEqual(windowOf(ev, 2), { from: 3, to: 4 });
  assert.equal(dayText(0), 'vandaag'); assert.equal(dayText(1), 'morgen'); assert.equal(dayText(2), 'over 2 speldagen');
  assert.equal(catchUpDays(500), MAX_CATCHUP_DAYS); assert.equal(catchUpDays(-3), 0); assert.equal(catchUpDays('x'), 0);
});
console.log(`voetbal_ontwikkeling_test ok (${n} groepen)`);
