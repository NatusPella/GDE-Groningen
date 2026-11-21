// De streekmarkt (#1103): dynamische prijs per streek per dag (0,7 tot 1,4), vraag uit hash, aanbod van spelers, verzadiging 3% per 1.000 kg
// met 25% herstel per dag, deterministisch, gedeeld via de kalenderdag, en de exploit-tests (opdelen, dumpen, spreiden).
//   node scripts/areamarket_test.mjs
import assert from 'node:assert/strict';
import * as R from '../game/js/areamarket.js';
import { PRIJS_KG as PRICE_KG } from '../game/js/gewasmarkt.js';
import { STREKEN } from '../game/js/regioleven.js';

let n = 0, fails = 0;
const t = (name, fn) => { n++; try { fn(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', String(e.message).split('\n')[0]); } };
const M0 = () => R.advanceMarket(R.newMarket(), 5);

t('de streken zijn die van het spel plus overig; de basisprijzen van de gewassen zijn die van gewasmarkt.js', () => {
  assert.deepEqual(R.DISTRICT_IDS.slice(0, -1), STREKEN.map((s) => s.id)); assert.equal(R.DISTRICT_IDS.at(-1), 'overig');
  for (const [k, v] of Object.entries(PRICE_KG)) assert.equal(R.BASE_PRICE[k], v);
  for (const p of R.PRODUCTS) assert.ok(R.REFERENCE[p] > 0 && R.BASE_PRICE[p] > 0, p);
});
t('de vraag is deterministisch uit streek, dag en product: geen Math.random', () => {
  const real = Math.random; let calls = 0; Math.random = () => { calls++; return 0.5; };
  try {
    const a = R.demandKg('hogeland', 'graan', 12), b = R.demandKg('hogeland', 'graan', 12);
    assert.equal(a, b);
    assert.notEqual(R.demandKg('hogeland', 'graan', 13), a); assert.notEqual(R.demandKg('oldambt', 'graan', 12), a); assert.notEqual(R.demandKg('hogeland', 'bieten', 12), a);
    R.priceFactor(M0(), 'hogeland', 'graan', 9); R.deliver(M0(), 'hogeland', 'graan', 3000, 5);
  } finally { Math.random = real; }
  assert.equal(calls, 0);
});
t('de vraag ligt tussen 0,3 en 2,2 maal de referentie en wisselt echt', () => {
  const vals = []; for (let d = 1; d <= 400; d++) vals.push(R.demandKg('veenkolonien', 'aardappelen', d) / R.REFERENCE.aardappelen);
  assert.ok(Math.min(...vals) >= 0.29 && Math.max(...vals) <= 2.2);
  assert.ok(Math.min(...vals) < 0.5 && Math.max(...vals) > 2.0);
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length; assert.ok(mean > 1.1 && mean < 1.4, String(mean));
});
t('de marktfactor blijft binnen 0,7 en 1,4 (zonder event), voor elke streek, product en dag', () => {
  const m = M0();
  for (const r of R.DISTRICT_IDS) for (const p of R.PRODUCTS) for (let d = 1; d <= 120; d += 3) { const f = R.priceFactor(m, r, p, d); assert.ok(f >= 0.7 - 1e-9 && f <= 1.4 + 1e-9, `${r} ${p} ${d}: ${f}`); }
});
t('de formule: basis x (1 + 0,2 x (vraag - aanbod) / referentie), met een schone markt', () => {
  const m = R.advanceMarket(R.newMarket(), 20);
  for (const [r, p, d] of [['hogeland', 'graan', 20], ['oldambt', 'melk', 20], ['westerwolde', 'eieren', 20]]) {
    const exp = Math.min(1.4, Math.max(0.7, 1 + 0.2 * (R.demandKg(r, p, d) - R.backgroundSupplyKg(p)) / R.REFERENCE[p]));
    assert.ok(Math.abs(R.priceFactor(m, r, p, d) - exp) < 1e-3, `${r} ${p}`);
    assert.ok(Math.abs(R.pricePerKg(m, r, p, d) - Math.max(0.01, Math.round(R.BASE_PRICE[p] * exp * 100) / 100)) < 0.011);
  }
});
t('de marktdag komt uit de kalender: gebroken, negatief of onbekend telt als een geldige dag', () => {
  assert.equal(R.marketDay(15.9), 15); assert.equal(R.marketDay(-3), 1); assert.equal(R.marketDay(NaN), 1); assert.equal(R.marketDay(41), 41);   // ook in de nazomer
  assert.equal(R.demandKg('hogeland', 'graan', 15.9), R.demandKg('hogeland', 'graan', 15));
});
t('twee spelers met dezelfde dag zien dezelfde prijs (en met elkaars levering ook)', () => {
  let a = M0(), b = M0();
  assert.equal(R.pricePerKg(a, 'hunsingo', 'melk', 5), R.pricePerKg(b, 'hunsingo', 'melk', 5));
  const d = R.deliver(a, 'hunsingo', 'melk', 6000, 5); a = d.market;
  b = R.recordRemoteDelivery(b, 'hunsingo', 'melk', 6000, 5);
  assert.deepEqual(a, b);
  assert.equal(R.pricePerKg(a, 'hunsingo', 'melk', 5), R.pricePerKg(b, 'hunsingo', 'melk', 5));
});
t('aanbod drukt de prijs: leveren in een streek verlaagt de prijs daar, niet in een andere', () => {
  const m = M0(), base = R.priceFactor(m, 'hogeland', 'graan', 5);
  const { market } = R.deliver(m, 'hogeland', 'graan', 8000, 5);
  assert.ok(R.priceFactor(market, 'hogeland', 'graan', 5) < base * 0.9);
  assert.equal(R.priceFactor(market, 'oldambt', 'graan', 5), R.priceFactor(m, 'oldambt', 'graan', 5));
  assert.equal(R.priceFactor(market, 'hogeland', 'bieten', 5), R.priceFactor(m, 'hogeland', 'bieten', 5));
});
t('verzadiging: 3% per 1.000 kg, hoogstens zestig procent, herstel 25% per dag', () => {
  const m = R.advanceMarket(R.newMarket(), 5);
  const { market } = R.deliver(m, 'oldambt', 'uien', 1000, 5);
  assert.ok(Math.abs(market.depression['oldambt:uien'] - 0.03) < 1e-4);
  assert.ok(Math.abs(R.deliver(m, 'oldambt', 'uien', 10000, 5).market.depression['oldambt:uien'] - 0.3) < 1e-3);
  assert.equal(R.deliver(m, 'oldambt', 'uien', 1e7, 5).market.depression['oldambt:uien'], R.MAX_DEPRESSION);
  const big = R.deliver(m, 'oldambt', 'uien', 10000, 5).market;
  const d6 = R.advanceMarket(big, 6), d7 = R.advanceMarket(big, 7), d30 = R.advanceMarket(big, 30);
  assert.ok(Math.abs(d6.depression['oldambt:uien'] - 0.3 * 0.75) < 1e-3, String(d6.depression['oldambt:uien']));
  assert.ok(Math.abs(d7.depression['oldambt:uien'] - 0.3 * 0.75 * 0.75) < 1e-3);
  assert.equal(d30.depression['oldambt:uien'], undefined);
  assert.deepEqual(d6.today, {});                                                         // het aanbod van gisteren is weg
  assert.equal(R.advanceMarket(big, 3), big);                                              // nooit terug in de tijd
});
t('ook ná het seizoen blijft de markt werken (nazomer, dag 41 en later)', () => {
  for (const d of [40, 41, 60, 200]) { const f = R.priceFactor(R.advanceMarket(R.newMarket(), d), 'eemsdelta', 'graan', d); assert.ok(f >= 0.7 && f <= 1.4); }
});
t('exploit: opdelen helpt niet: een grote levering levert niet meer op dan dezelfde kilo\'s in porties op één dag', () => {
  const big = R.deliver(M0(), 'hogeland', 'graan', 12000, 5);
  let m = M0(), sum = 0; for (let i = 0; i < 12; i++) { const r = R.deliver(m, 'hogeland', 'graan', 1000, 5); m = r.market; sum += r.revenue; }
  assert.ok(Math.abs(sum - big.revenue) < 0.5, `${sum} tegen ${big.revenue}`);
  assert.ok(big.revenue < 12000 * R.pricePerKg(M0(), 'hogeland', 'graan', 5), 'de gemiddelde prijs ligt onder de beginprijs');
});
t('exploit: elke dag dezelfde streek leveren levert minder dan spreiden over streken', () => {
  const total = (regions) => { let m = R.newMarket(), sum = 0; for (let d = 1; d <= 30; d++) { const r = R.deliver(m, regions[d % regions.length], 'graan', 10000, d); m = r.market; sum += r.revenue; } return sum; };
  const one = total(['hogeland']), spread = total(['hogeland', 'oldambt', 'hunsingo', 'eemsdelta', 'veenkolonien']);
  assert.ok(spread > one * 1.08, `spreiden ${spread} tegen één streek ${one}`);
});
t('exploit: je kunt de prijs niet omlaag duwen om je eigen product goedkoop terug te kopen: de markt kent geen koopprijs, alleen levering', () => {
  const m = M0();
  assert.ok(R.deliver(m, 'hogeland', 'graan', 5000, 5).revenue <= 5000 * R.BASE_PRICE.graan * 1.4 * 1.0001);       // nooit boven de bovengrens
  assert.ok(R.deliver(m, 'hogeland', 'graan', 5000, 5).revenue >= 5000 * R.BASE_PRICE.graan * 0.7 * 0.5);
});
t('monopolie: een product in één streek houdt de prijs laag; de prijs blijft nooit onder 0,7 x basis (geen nul)', () => {
  let m = R.advanceMarket(R.newMarket(), 5);
  const r = R.deliver(m, 'hogeland', 'graan', 500000, 5);
  const p = R.pricePerKg(r.market, 'hogeland', 'graan', 5);
  assert.ok(p >= R.BASE_PRICE.graan * 0.7 - 0.011, String(p));
  assert.ok(r.avgPrice > 0);
});
t('veilingdag: +25% op één product (een dag), bovenop de begrensde marktfactor', () => {
  const m = M0(), f = R.priceFactor(m, 'oldambt', 'melk', 5), fe = R.priceFactor(m, 'oldambt', 'melk', 5, 1.25);
  assert.ok(Math.abs(fe / f - 1.25) < 0.001); assert.ok(fe <= R.PRICE_MAX * R.MAX_EVENT_MULT + 1e-9);
  assert.equal(R.priceFactor(m, 'oldambt', 'melk', 5, 99), R.priceFactor(m, 'oldambt', 'melk', 5, 1.25));       // een grotere factor wordt afgekapt
  assert.ok(R.pricePerKg(m, 'oldambt', 'melk', 5, 1.25) > R.pricePerKg(m, 'oldambt', 'melk', 5));
});
t('de trend en het tabblad Markt: de beste streek staat bovenaan en de rijen zijn volledig', () => {
  const b = R.marketBoard(M0(), 'graan', 5);
  assert.equal(b.rows.length, STREKEN.length); assert.equal(b.best.region, b.rows[0].region);
  for (let i = 1; i < b.rows.length; i++) assert.ok(b.rows[i - 1].factor >= b.rows[i].factor);
  for (const r of b.rows) assert.ok(['op', 'neer', 'gelijk'].includes(r.trend));
  const { market } = R.deliver(M0(), b.best.region, 'graan', 9000, 5);
  assert.ok(R.marketBoard(market, 'graan', 5).rows.find((x) => x.region === b.best.region).factor < b.best.factor);
});
t('onbekend product, nul of negatief of oneindig geeft geen opbrengst en geen fout; NaN-dag telt als dag 1', () => {
  const m = M0();
  for (const kg of [0, -5, NaN]) assert.equal(R.deliver(m, 'hogeland', 'graan', kg, 5).revenue, 0);
  assert.equal(R.deliver(m, 'hogeland', 'goud', 100, 5).revenue, 0); assert.equal(R.pricePerKg(m, 'hogeland', 'goud', 5), 0);
  assert.ok(Number.isFinite(R.priceFactor(m, 'mars', 'graan', NaN)));
});
t('de deliver past de invoer niet aan, normalizeMarket zuivert kapotte opslag', () => {
  const m = M0(), snap = JSON.stringify(m); R.deliver(m, 'hogeland', 'graan', 5000, 5); assert.equal(JSON.stringify(m), snap);
  const bad = R.normalizeMarket({ day: 'x', today: { 'mars:graan': 5, 'hogeland:graan': -4, 'hogeland:goud': 3 }, depression: { 'oldambt:uien': 9 } });
  assert.deepEqual(Object.keys(bad.today), ['hogeland:graan']); assert.equal(bad.today['hogeland:graan'], 0); assert.equal(bad.depression['oldambt:uien'], R.MAX_DEPRESSION);
  assert.deepEqual(R.normalizeMarket(null), R.newMarket());
});

console.log(`areamarket_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
