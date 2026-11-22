// Economiebalans (#985 punt 45, docs/BALANS-21-11.md): de economiesim over een sessie van tien uur en de verhoudingen die
// de Duizendpoot-uitbetaling bewaken. Puur: geen wereld, geen opslag.
//   node scripts/economie_sim_test.mjs
import assert from 'node:assert/strict';
import * as S from './lib/economiesim.mjs';
import * as L from '../game/js/loopbaan.js';
import { runCareer } from './voetbal_carriere_sim.mjs';

let n = 0, fails = 0;
const t = (naam, fn) => { n++; try { fn(); } catch (e) { fails++; console.log('FAIL ' + naam + '\n  ' + e.message.split('\n')[0]); } };

const r = S.simuleer({ uren: 10 });

t('de sim is deterministisch en positief: een sessie van tien uur houdt geld over', () => {
  assert.deepEqual(S.simuleer({ uren: 10 }), r);
  assert.ok(r.bruto > r.kosten * 2, 'de kosten zijn een minderheid van het inkomen');
  assert.ok(r.netPerUur > 600 && r.netPerUur < 2000, `netto per uur ${Math.round(r.netPerUur)} valt buiten de orde van een uur spelen`);
});

t('tempo: een eerste auto binnen het eerste halfuur, een eerste perceel binnen de eerste twee uur', () => {
  assert.ok(r.minutenEersteAuto <= 30, `eerste auto na ${Math.round(r.minutenEersteAuto)} min`);
  assert.ok(r.minutenEerstePerceel <= 120 && r.minutenEerstePerceel >= 45, `eerste perceel na ${Math.round(r.minutenEerstePerceel)} min`);
});

t('inflatie: na tien uur koopt het vermogen de duurste auto een paar keer, niet tien keer', () => {
  assert.ok(r.inflatie >= 2 && r.inflatie <= 5, `vermogen is ${r.inflatie.toFixed(1)} keer de duurste auto`);
});

t('de Duizendpoot: de inspanning is ruim een uur, de uitbetaling is het netto inkomen van die tijd', () => {
  const i = S.duizendpootInspanning();
  assert.equal(i.vakken, L.VAKKEN.length, 'de sim kent alle loopbanen');
  for (const v of L.VAK_IDS) assert.ok(S.EERSTE_KLUS[v] > 0 && v in S.EERSTE_KLUS_LOON, `${v} mist in de sim`);
  assert.ok(i.uren >= 1.5 && i.uren <= 3, `${i.uren.toFixed(1)} uur voor negentien eerste klussen`);
  const uit = L.DUIZENDPOOT_EURO;
  const waarde = (i.loon + uit) / (i.uren * r.netPerUur); // wat het jagen oplevert tegenover gewoon doorspelen
  assert.ok(waarde >= 1.2 && waarde <= 2, `jagen levert ${waarde.toFixed(2)} keer zoveel als doorspelen`);
  assert.ok(uit / r.netPerUur <= i.uren * 1.1, 'de uitbetaling is hooguit de tijd van de jacht aan netto inkomen');
});

t('de Duizendpoot blijft onder het eerste perceel en minstens een revanche-goud', () => {
  assert.ok(L.DUIZENDPOOT_EURO < S.EERSTE_PERCEEL.koop, 'het is een duwtje, geen perceel cadeau');
  assert.ok(L.DUIZENDPOOT_EURO + 500 >= S.EERSTE_PERCEEL.koop - 100, 'met de startgeld ernaast is het perceel bijna binnen');
  assert.ok(L.DUIZENDPOOT_EURO >= 1500, 'minstens de goudbeloning van een revanche (1.500)');
});

t('inflatie door de bonus is begrensd: hooguit een vijfde van wat er in tien uur netto binnenkomt', () => {
  const zonder = S.simuleer({ uren: 10, duizendpoot: 0 });
  assert.ok(r.bonus / zonder.netto <= 0.2, `${Math.round(100 * r.bonus / zonder.netto)}% van het netto vermogen`);
  assert.equal(S.simuleer({ uren: 1 }).bonus, 0, 'in het eerste uur is de jacht niet te halen');
});

t('de loonfactor van de loopbaan (+30% hooguit) laat de sessie met hooguit 30% van de vakbronnen stijgen', () => {
  const top = S.simuleer({ uren: 10, factor: L.LOON_FACTOR[L.MAX_NIVEAU - 1] });
  assert.ok(top.bruto / r.bruto <= 1.3, 'hoogstens +30%');
  assert.ok(top.bruto > r.bruto);
});

t('voetbalcarrière (#1116): zelf spelen levert ongeveer 420 euro per actief uur; een tiende van de speeltijd erin verschuift het netto per uur met minder dan 15%', () => {
  for (const char of ['anita', 'tammo']) {
    const rep = runCareer({ char, seizoenen: 3, strategie: 'speel' });
    assert.ok(Math.abs(rep.perHour - S.BRONNEN.voetbal.perUur) / S.BRONNEN.voetbal.perUur <= 0.15, `${char}: ${rep.perHour} per actief uur wijkt af van de sim-bron (${S.BRONNEN.voetbal.perUur})`);
  }
  assert.equal(S.simuleer({ uren: 10 }).per.voetbal.uur, 0, 'de standaardsessie speelt geen voetbal');
  const mix = S.simuleer({ uren: 10, verdeling: { ...S.VERDELING, missie: S.VERDELING.missie - 0.1, voetbal: 0.1 } });
  const delta = mix.netPerUur / r.netPerUur - 1;
  assert.ok(Math.abs(delta) <= 0.15, `netto per uur verschuift ${Math.round(delta * 100)}%`);
  assert.ok(S.BRONNEN.voetbal.perUur < r.netPerUur, 'voetbal is nooit de snelste bron');
});

console.log(`economie_sim_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
