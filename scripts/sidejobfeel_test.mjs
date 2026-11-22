// Game feel van de bijbanen (22-11): de tempobonus en de reeks na een tegenslag (game/js/sidejobfeel.js), en de koppeling in sidejobs.js.
//   node scripts/sidejobfeel_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { TEMPO_TREDEN, TEMPO_MIN_BUDGET, tempoBonus, tempoTekst, reeksNaTegenslag, aanrijdingReeksTekst } from '../game/js/sidejobfeel.js';

let n = 0, fails = 0;
const t = (naam, f) => { n++; try { f(); console.log('ok  ', naam); } catch (e) { fails++; process.exitCode = 1; console.log('FAIL', naam, '\n    ' + (e.message || e)); } };
const lees = (f) => fs.readFileSync(new URL('../game/js/' + f, import.meta.url), 'utf8');

t('de treden lopen van streng naar mild en betalen hooguit 15%', () => {
  assert.ok(TEMPO_TREDEN.length >= 2);
  for (let i = 1; i < TEMPO_TREDEN.length; i++) {
    assert.ok(TEMPO_TREDEN[i - 1].rest > TEMPO_TREDEN[i].rest, 'rest daalt');
    assert.ok(TEMPO_TREDEN[i - 1].pct > TEMPO_TREDEN[i].pct, 'pct daalt');
  }
  for (const tr of TEMPO_TREDEN) { assert.ok(tr.pct > 0 && tr.pct <= 15); assert.ok(tr.rest > 0 && tr.rest < 1); assert.ok(tr.label); }
});
t('ruim de helft van de tijd over: Bliksemsnel, 15% van het loon', () => {
  const b = tempoBonus(40, 60, 100);
  assert.deepEqual(b, { label: 'Bliksemsnel', pct: 15, bonus: 6 });
  assert.equal(tempoTekst(b), 'Bliksemsnel +€6');
});
t('dertig procent over: Vlot, 8% van het loon; op de grens telt hij mee', () => {
  assert.deepEqual(tempoBonus(50, 30, 100), { label: 'Vlot', pct: 8, bonus: 4 });
  assert.equal(tempoBonus(50, 49.9, 100).label, 'Vlot');
  assert.equal(tempoBonus(50, 50, 100).label, 'Bliksemsnel');
});
t('op het nippertje of zonder klok: geen bonus', () => {
  assert.equal(tempoBonus(50, 29, 100), null);
  assert.equal(tempoBonus(50, 0, 100), null);
  assert.equal(tempoBonus(50, null, 100), null);
  assert.equal(tempoBonus(50, 40, undefined), null);
  assert.equal(tempoBonus(50, NaN, NaN), null);
  assert.equal(tempoBonus(0, 80, 100), null);
  assert.equal(tempoTekst(null), '');
});
t('een korte aftelklok (paneel, inleveren) is geen ronde om vlot in te zijn', () => {
  assert.equal(tempoBonus(50, TEMPO_MIN_BUDGET - 1, TEMPO_MIN_BUDGET - 1), null);
  assert.ok(tempoBonus(50, TEMPO_MIN_BUDGET, TEMPO_MIN_BUDGET));
});
t('de bonus is minstens een euro en nooit meer dan 15% (afgerond), ook als de klok boven het budget staat', () => {
  assert.equal(tempoBonus(1, 90, 100).bonus, 1);
  for (let pay = 1; pay < 400; pay += 7) {
    const b = tempoBonus(pay, 500, 100);
    assert.ok(b.bonus >= 1 && b.bonus <= Math.max(1, Math.round(pay * 0.15)), 'loon ' + pay);
  }
});
t('een taxirit recht op het doel aan houdt op een lange rit ongeveer 31% over: dat is Vlot, geen Bliksemsnel', () => {
  // sidejob_taxi.js: timeLeft = dist * 1.45 / sp + 28; de rit zelf kost dist / sp
  const dist = 3000, sp = 12;
  const budget = dist * 1.45 / sp + 28;
  const b = tempoBonus(60, budget - dist / sp, budget);
  assert.equal(b.label, 'Vlot');
});
t('pech houdt de reeks, een aanrijding halveert hem, weglopen kost hem', () => {
  assert.equal(reeksNaTegenslag(7, 'pech'), 7);
  assert.equal(reeksNaTegenslag(7, 'aanrijding'), 3);
  assert.equal(reeksNaTegenslag(1, 'aanrijding'), 0);
  assert.equal(reeksNaTegenslag(7), 0);
  assert.equal(reeksNaTegenslag(7, 'weggelopen'), 0);
  assert.equal(reeksNaTegenslag(-3, 'pech'), 0);
  assert.equal(reeksNaTegenslag(NaN, 'aanrijding'), 0);
  for (let s = 0; s < 30; s++) for (const k of ['pech', 'aanrijding', undefined]) assert.ok(reeksNaTegenslag(s, k) <= s, 'nooit hoger');
});
t('de melding na een aanrijding zegt eerlijk wat er over is', () => {
  assert.equal(aanrijdingReeksTekst(6, 3), 'je reeks zakt naar 3');
  assert.equal(aanrijdingReeksTekst(1, 0), 'je reeks is weg');
  assert.equal(aanrijdingReeksTekst(0, 0), '');
});
t('sidejobs.js gebruikt de regels: tempobonus als fooi, reeks via reeksNaTegenslag, Klussen telt rondes', () => {
  const bron = lees('sidejobs.js');
  assert.match(bron, /tempoBonus\(pay, c\.timeLeft, c\.timeBudget\)/);
  assert.match(bron, /c\.job\.tempo === false/);
  assert.match(bron, /c\.streak = reeksNaTegenslag\(c\.streak, soort\)/);
  assert.match(bron, /reeksNaTegenslag\(c\.streak, 'aanrijding'\)/);
  assert.ok(!/c\.streak = 0;/.test(bron.split('function makeCtx')[1]), 'geen harde reset meer buiten de regels');
  assert.match(bron, /\['Klussen', String\(c\.round\)\]/);
  assert.match(bron, /Klus \$\{c\.round\} klaar · reeks \$\{c\.streak\}/);
  // de klok van de ronde wordt zonder allocatie bijgehouden (één vergelijking per frame)
  assert.match(bron, /if \(!\(c\.timeBudget >= c\.timeLeft\)\) c\.timeBudget = c\.timeLeft;/);
});
t('pech-rondes geven de soort door: geen akker, geen overtreder, geen wijk, en de boerderijtaken', () => {
  assert.equal((lees('sidejob_boerderij.js').match(/c\.skip\([^\n]*'pech'\)/g) || []).length, 2);
  assert.equal((lees('sidejob_boa.js').match(/c\.skip\([^\n]*'pech'\)/g) || []).length, 2);
  assert.match(lees('sidejob_bieten.js'), /c\.skip\([^\n]*'pech'\)/);
  assert.match(lees('sidejob_krantenwijk.js'), /c\.skip\([^\n]*'pech'\)/);
  assert.match(lees('sidejob_lijn.js'), /tempo: false/);
});
t('het regelbestand is puur: geen THREE, geen wereld, geen Math.random', () => {
  const bron = lees('sidejobfeel.js');
  assert.ok(!/^import /m.test(bron));
  assert.ok(!/Math\.random|world\.|window\./.test(bron));
});

console.log(fails ? `\n${fails} van ${n} mislukt` : `\nsidejobfeel_test: ${n} van ${n} geslaagd`);
