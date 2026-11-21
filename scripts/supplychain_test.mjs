// De productieketen (#1103): schakels met buffer en doorvoer, stokken bij een volle volgende schakel, logistiek met chauffeur, extra marge
// (15% / 15% / 35%), zwakste schakel, massabalans en de exploit-tests.   node scripts/supplychain_test.mjs
import assert from 'node:assert/strict';
import * as C from '../game/js/supplychain.js';
import { PRIJS_KG } from '../game/js/gewasmarkt.js';

let n = 0, fails = 0;
const t = (name, fn) => { n++; try { fn(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', String(e.message).split('\n')[0]); } };
const sum = (a) => a.reduce((x, y) => x + y, 0);
const stockOf = (c) => sum(c.links.map((l, i) => l.stock * rawEq(c, i)));
const rawEq = (c, idx) => { let y = 1; for (let i = 0; i < idx; i++) y *= c.links[i].yield; return 1 / y; };    // kilo grondstof per kilo in schakel idx

t('de zes ketens uit het ontwerp bestaan met bron, verwerker(s) en verkooppunt', () => {
  assert.deepEqual(C.CHAIN_IDS.sort(), ['bieten', 'brood', 'eieren', 'friet', 'hooi', 'kaas']);
  for (const id of C.CHAIN_IDS) { const c = C.newChain(id); assert.equal(c.links[0].role, 'source'); assert.equal(c.links.at(-1).role, 'outlet'); assert.ok(c.links.slice(1, -1).every((l) => l.role === 'processor')); }
  assert.equal(C.newChain('brood').links.filter((l) => l.role === 'processor').length, 2);
  assert.equal(C.newChain('bestaat-niet'), null);
  assert.match(C.CHAIN_DEFS.friet.links[2].label, /jouw snackwagen/); assert.match(C.CHAIN_DEFS.bieten.links[1].label, /Suikerhal Hoogkerk/);
  assert.equal(C.CHAIN_DEFS.hooi.links[2].sale, 'internal');
});
t('grondstofprijzen: de gewassen zijn die van gewasmarkt.js', () => { for (const k of Object.keys(PRIJS_KG)) if (C.RAW_PRICE[k] !== undefined) assert.equal(C.RAW_PRICE[k], PRIJS_KG[k]); });
t('de dagstap past de invoer niet aan en is deterministisch', () => {
  const c = C.newChain('kaas'); const snap = JSON.stringify(c);
  const a = C.stepChainDay(c, { produced: 5000 }), b = C.stepChainDay(c, { produced: 5000 });
  assert.equal(JSON.stringify(c), snap); assert.deepEqual(a, b);
});
t('stroom: de grondstof loopt door de schakels en wordt verkocht; massabalans klopt (niets verdwijnt)', () => {
  let c = C.newChain('brood'), intake = 0, soldRaw = 0;
  for (let d = 1; d <= 30; d++) {
    const r = C.stepChainDay(c, { produced: 6000 }); c = r.chain; intake += r.report.intake;
    soldRaw += r.report.sold * rawEq(c, c.links.length - 1);
  }
  assert.ok(soldRaw > 0 && intake > 0);
  assert.ok(Math.abs(intake - (soldRaw + stockOf(c))) < 1, `intake ${intake}, verkocht ${soldRaw}, voorraad ${stockOf(c)}`);
  for (const l of c.links) assert.ok(l.stock >= -1e-9 && l.stock <= l.cap + 1e-9);
});
t('opbrengst van het verwerkingsproces: kaas 0,1 per kilo melk; brood 0,8 x 1,3 per kilo graan', () => {
  let c = C.newChain('kaas'); const r = C.stepChainDay(c, { produced: 2000 });
  assert.equal(r.report.moved[0], 2000); assert.equal(r.chain.links[1].stock, 2000);
  const r2 = C.stepChainDay(r.chain, { produced: 0 }); assert.ok(Math.abs(r2.chain.links[2].stock - 0) < 1e-9 || r2.report.sold >= 0);
  assert.ok(Math.abs(r2.report.moved[1] - 2000) < 1e-6); assert.ok(Math.abs(r2.report.sold - 0) < 1e-9);
  const r3 = C.stepChainDay(r2.chain, { produced: 0 }); assert.ok(Math.abs(r3.report.sold - 200) < 1e-6, String(r3.report.sold));
  const b = C.newChain('brood'); assert.ok(Math.abs(b.links[1].yield * b.links[2].yield - 1.04) < 1e-9);
});
t('stokken: een volle volgende schakel houdt de keten tegen, de oogst blijft op het veld (blocked) en dat meldt de zwakste schakel', () => {
  let c = C.newChain('kaas'); let last;
  for (let d = 1; d <= 60; d++) { const r = C.stepChainDay(c, { produced: 6000 }); c = r.chain; last = r.report; }
  assert.ok(last.blocked > 0, 'de bron zit vol');
  assert.ok(last.sold <= c.links[2].perDay + 1e-9);
  assert.ok(c.links[0].stock <= c.links[0].cap);
  const w = C.weakestLink(c, last);
  assert.ok(w && ['vol', 'oogst'].includes(w.kind), JSON.stringify(w)); assert.ok(w.text.length > 15);
  // de verkoop is het smalste stuk (400 kg kaas per dag = 4.000 kg melk): de schakel voor het verkooppunt stokt
  assert.ok(last.stuck.some((s) => s.index === 1 && s.why === 'vol'));
});
t('een schakel stokt precies als de volgende vol zit: meer opnamevermogen lost het op', () => {
  const run = (perDayOut) => { let c = C.newChain('kaas'); c.links[2].perDay = perDayOut; let sold = 0; for (let d = 1; d <= 40; d++) { const r = C.stepChainDay(c, { produced: 6000 }); c = r.chain; sold += r.report.sold; } return sold; };
  assert.ok(run(400) < run(1500) * 0.9 && run(400) <= 40 * 400 + 1);
});
t('logistiek: zonder wagen op afstand stokt de keten; met chauffeur loopt hij en kost loon plus diesel', () => {
  let c = C.setDistance(C.newChain('friet'), 'frietfabriek', 18000);
  let r = C.stepChainDay(C.stepChainDay(c, { produced: 8000 }).chain, { produced: 0 });
  assert.ok(r.report.stuck.some((s) => s.index === 1 && s.why === 'transport'));
  const w = C.weakestLink(r.chain, r.report); assert.equal(w.kind, 'transport'); assert.match(w.text, /chauffeur/);
  const t1 = C.addTruck(c, 'frietfabriek'); assert.ok(t1.ok); assert.ok(t1.chain.links[1].trucks[0].driver.length > 2);
  assert.equal(t1.chain.links[1].trucks.length, 1); assert.equal(c.links[1].trucks.length, 0);
  let run = t1.chain, tot = { wages: 0, diesel: 0, sold: 0 };
  for (let d = 1; d <= 10; d++) { const x = C.stepChainDay(run, { produced: 8000 }); run = x.chain; tot.wages += x.report.cost.wages; tot.diesel += x.report.cost.diesel; tot.sold += x.report.sold; }
  assert.ok(tot.sold > 0 && tot.wages === 10 * C.DRIVER_WAGE && tot.diesel > 0);
  assert.equal(C.addTruck(C.addTruck(c, 'bestaat-niet').chain, 'x').ok, false);
  assert.equal(C.removeTruck(t1.chain, 'frietfabriek').chain.links[1].trucks.length, 0); assert.equal(C.removeTruck(c, 'frietfabriek').ok, false);
});
t('reistijd: afstand / 15 m/s heen en terug plus laden; ritten per dienst en capaciteit per wagen', () => {
  assert.equal(C.tripSeconds(0), C.LOAD_S); assert.equal(C.tripSeconds(15000), 2000 + C.LOAD_S);
  assert.equal(C.tripsPerDay(15000), Math.floor(C.SHIFT_S / 2300)); assert.equal(C.tripsPerDay(0), Infinity);
  const link = { distance: 15000, trucks: [{}, {}] }; assert.equal(C.transportCapacity(link), 2 * 15 * C.TRUCK_KG);
  assert.equal(C.transportCapacity({ distance: 15000, trucks: [] }), 0); assert.equal(C.transportCapacity({ distance: 0, trucks: [] }), Infinity);
  assert.ok(C.tripSeconds(40000) > C.tripSeconds(10000));
});
t('extra marge: eigen verwerker +15%, eigen verkooppunt +15%, beide +35% (niet 30%)', () => {
  let c = C.newChain('kaas'); assert.equal(C.extraMargin(c), 0);
  assert.equal(C.extraMargin(C.setOwned(c, 'kaasmakerij', true)), 0.15); assert.equal(C.extraMargin(C.setOwned(c, 'verkoop', true)), 0.15);
  assert.equal(C.extraMargin(C.setOwned(C.setOwned(c, 'kaasmakerij', true), 'verkoop', true)), 0.35);
  assert.equal(C.extraMargin(C.newChain('brood', { owned: ['meelmolen', 'bakkerij'] })), 0.15);          // twee verwerkers zijn nog steeds één "eigen verwerker"
  assert.equal(C.extraMargin(C.newChain('eieren', { owned: ['verkoop'] })), 0.15);
});
t('extra marge telt alleen voor schakels die je kunt kopen: de Suikerhal en het eigen vee niet', () => {
  assert.equal(C.extraMargin(C.setOwned(C.newChain('bieten'), 'suikerhal', true)), 0);
  assert.equal(C.extraMargin(C.setOwned(C.setOwned(C.newChain('hooi'), 'hooiberg', true), 'vee', true)), 0);
  assert.equal(C.newChain('bieten', { owned: ['suikerhal'] }).links[1].owned, false);
});
t('opbrengst: eigen keten levert tot 35% meer dan dezelfde kilo\'s via een afnemer, nooit meer; de hooiketen verkoopt niets maar voert', () => {
  const run = (owned, id = 'friet') => { let c = C.newChain(id, { owned }); let rev = 0, base = 0, last; for (let d = 1; d <= 40; d++) { const r = C.stepChainDay(c, { produced: 4000 }); c = r.chain; rev += r.report.revenue; base += r.report.revenueBase; last = r.report; } return { rev, base, last }; };
  const none = run([]), proc = run(['frietfabriek']), both = run(['frietfabriek', 'snackbar']);
  assert.ok(none.rev > 0 && Math.abs(none.rev - none.base) < 0.5);
  assert.ok(Math.abs(proc.rev / proc.base - 1.15) < 0.001); assert.ok(Math.abs(both.rev / both.base - 1.35) < 0.001);
  assert.ok(both.rev / none.rev < 1.351);
  const hooi = run([], 'hooi'); assert.equal(hooi.rev, 0); assert.ok(hooi.last.fed > 0 && hooi.last.sold === 0);
  const raw = run([], 'bieten'); assert.ok(raw.rev > 0);
});
t('de streekprijsfactor (0,7 tot 1,4) werkt door in de opbrengst en wordt afgekapt', () => {
  const rev = (rf) => { let c = C.newChain('eieren'); let s = 0; for (let d = 1; d <= 5; d++) { const r = C.stepChainDay(c, { produced: 1000, regionFactor: rf }); c = r.chain; s += r.report.revenue; } return s; };
  assert.ok(rev(1.4) > rev(1) * 1.39 && rev(1.4) < rev(1) * 1.41); assert.equal(rev(5), rev(1.4)); assert.equal(rev(0.01), rev(0.7)); assert.equal(rev(NaN), rev(1));
});
t('exploit: de keten is geen geldmachine: de opbrengst per dag is begrensd door het vraagplafond van het verkooppunt, hoeveel je ook produceert', () => {
  const day = (prod) => { let c = C.newChain('kaas', { owned: ['kaasmakerij', 'verkoop'] }); let last; for (let d = 1; d <= 40; d++) { const r = C.stepChainDay(c, { produced: prod }); c = r.chain; last = r.report; } return last; };
  const a = day(5000), b = day(5e6);
  assert.ok(b.revenue <= a.revenue * 1.5 + 1, `${b.revenue} tegen ${a.revenue}`);
  assert.ok(b.sold <= C.CHAIN_DEFS.kaas.links[2].perDay + 1e-9);
  assert.ok(b.blocked > 0);
});
t('exploit: chauffeurs kosten geld: een overbodige wagen maakt de keten minder winstgevend', () => {
  const net = (trucks) => { let c = C.setDistance(C.newChain('kaas'), 'melk', 8000); for (let i = 0; i < trucks; i++) c = C.addTruck(c, 'melk').chain; let s = 0; for (let d = 1; d <= 30; d++) { const r = C.stepChainDay(c, { produced: 3000 }); c = r.chain; s += r.report.net; } return s; };
  assert.ok(net(1) > net(0)); assert.ok(net(1) > net(6));
});
t('zwakste schakel: een bron zonder aanvoer (leeg) en een soepele keten', () => {
  let c = C.newChain('kaas'); const r = C.stepChainDay(c, { produced: 0 });
  const w = C.weakestLink(r.chain, r.report); assert.ok(!w || w.kind === 'leeg');
  const view = C.chainView(r.chain, r.report); assert.equal(view.links.length, 3); assert.ok(view.links.every((l) => l.fill >= 0 && l.fill <= 1));
  assert.equal(view.margin, 0);
  let healthy = C.newChain('eieren'), rep; for (let d = 1; d <= 10; d++) { const x = C.stepChainDay(healthy, { produced: 800 }); healthy = x.chain; rep = x.report; }
  assert.equal(C.weakestLink(healthy, rep), null);
});
t('opslag: normalizeChain zuivert kapotte invoer, begrenst opwaardering en kent alleen echte ketens', () => {
  assert.equal(C.normalizeChain({ id: 'goudmijn', links: [] }), null); assert.equal(C.normalizeChain(null), null); assert.equal(C.normalizeChain({ id: 'kaas' }), null);
  const c = C.normalizeChain({ id: 'kaas', day: 9, links: [{ stock: 1e12, perDay: 1e12, cap: 1, trucks: [{ id: 'a', driver: 'x'.repeat(99), wage: 1 }, 5] }, { owned: true }, { owned: true, stock: -3 }] });
  assert.equal(c.links[0].stock, c.links[0].cap); assert.equal(c.links[0].perDay, 6000 * 4); assert.equal(c.links[0].cap, 20000);
  assert.equal(c.links[0].trucks.length, 1); assert.equal(c.links[0].trucks[0].driver.length, 24); assert.equal(c.links[0].trucks[0].wage, C.DRIVER_WAGE);
  assert.equal(c.links[1].owned, true); assert.equal(c.links[2].stock, 0); assert.equal(c.day, 9);
  assert.equal(C.normalizeChain({ id: 'bieten', links: [{}, { owned: true }] }).links[1].owned, false);
});
t('settleChain: meerdere dagen, begrensd, met per-dag-productie en per-dag-prijs', () => {
  const r = C.settleChain(C.newChain('eieren'), 10, 20, { produced: (d) => 500 + d, regionFactor: (d) => (d % 2 ? 1 : 1.2) });
  assert.equal(r.sum.days, 10); assert.ok(r.sum.revenue > 0); assert.equal(r.last.day, 20); assert.equal(r.chain.day, 20);
  assert.equal(C.settleChain(C.newChain('eieren'), 0, 99999, {}).sum.days, 400); assert.equal(C.settleChain(C.newChain('eieren'), 9, 3, {}).sum.days, 0);
});
t('kapotte invoer: geen NaN in de dagstap', () => {
  const r = C.stepChainDay(C.newChain('kaas'), { produced: NaN, regionFactor: undefined, day: 'x' });
  for (const k of ['intake', 'blocked', 'sold', 'revenue', 'net']) assert.ok(Number.isFinite(r.report[k]), k);
  assert.ok(Number.isFinite(C.stepChainDay(C.newChain('kaas'), { produced: -50 }).report.intake));
});

console.log(`supplychain_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
