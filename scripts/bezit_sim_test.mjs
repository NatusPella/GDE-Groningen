// Balans van Bezit (#1105): de bezit-economiesim over 30 speldagen en de schaalcurve.   node scripts/bezit_sim_test.mjs
// Zonder index (game/world) draait hij op de vaste synthetische prijslijst; met BEZIT_INDEX_DIR op de echte.
import assert from 'node:assert/strict';
import * as S from './bezit_sim.mjs';
import * as P from '../game/js/bezitprijs.js';

let n = 0, fails = 0;
const t = (name, fn) => { n++; try { fn(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', String(e.message).split('\n')[0]); } };
const pl = S.priceList(process.env.BEZIT_INDEX_DIR || null);
const r = S.simulate({ days: 30, prices: pl.prices });

t('deterministisch', () => assert.deepEqual(S.simulate({ days: 30, prices: pl.prices }), r));
t('tempo: het eerste perceel komt na ongeveer twee uur (2 tot 3,5 uur) werk', () => {
  assert.ok(r.firstParcelHours >= 2 && r.firstParcelHours <= 3.5, `eerste perceel na ${r.firstParcelHours} uur`);
});
t('na 30 speldagen (12 uur) zijn er een paar percelen, niet honderden', () => assert.ok(r.owned >= 2 && r.owned <= 20, String(r.owned)));
t('passief inkomen blijft onder het actieve werk in de eerste dertig dagen', () => assert.ok(r.passivePerHour < S.ACTIVE_PER_HOUR, String(r.passivePerHour)));
t('schaalcurve: 10, 100 en 1.000 percelen blijven binnen een factor 3 van de actieve speler', () => {
  for (const k of [10, 100, 1000, 20000]) assert.ok(S.passivePerHourAt(k) <= 3 * S.ACTIVE_PER_HOUR + 1, `${k}: ${S.passivePerHourAt(k)}`);
  assert.ok(S.passivePerHourAt(1000) >= S.passivePerHourAt(100) * 0.99, 'meer bezit levert niet minder');
  assert.ok(S.passivePerHourAt(1000) / 1000 < S.passivePerHourAt(10) / 10 / 20, 'het marginale perceel levert veel minder naarmate je meer hebt');
});
t('geen exploit: kopen en direct verkopen kost altijd geld, pacht onder huur, schaalprijs begrensd', () => {
  const e = S.exploitChecks();
  for (const paid of [2400, 11850, 100000]) assert.ok(e.buySell(paid) >= paid * 0.24, `verlies bij ${paid}`);
  assert.ok(e.leaseVsRent.lease < e.leaseVsRent.rent);
  assert.equal(e.maxScale, 3);
  assert.ok(e.mgmt.every(([, f], i, a) => i === 0 || f < a[i - 1][1]), 'afnemende beheeropbrengst');
});
t('de rem is zacht: bij weinig passief inkomen nauwelijks merkbaar, en nooit meer dan het plafond', () => {
  assert.ok(P.compressPassive(100) >= 90);
  assert.ok(P.compressPassive(1e9) <= P.PASSIVE_CAP_DAY);
  assert.equal(P.compressPassive(-50), -50);
});
t('terugverdientijd: pacht van een gemiddeld perceel is in uren ruim boven het eerste uur werk (geen snelle lus)', () => {
  const paid = 11850, perHour = S.leaseDay(paid, 1) / S.HOURS_PER_DAY;
  assert.ok(paid / perHour > 20, `terugverdientijd ${Math.round(paid / perHour)} uur`);
});
t('actieve speler wint van de passieve: wie niet speelt, houdt een kwart over', () => {
  const idle = S.simulate({ days: 30, activeShare: 0, startMoney: 20000, prices: pl.prices });
  assert.ok(idle.passivePerHour < S.ACTIVE_PER_HOUR);
});
console.log(`bezit_sim_test: ${n - fails}/${n} ok (${pl.bron})`);
process.exit(fails ? 1 : 0);
