// Farm goods to the snack van over two stores (#1379 X1: deliveries.js, farmdelivery.js, snackvan.js receiveFarmGoods and the daily use): one path, no doubles, no losses,
// old saves load, per player.   node scripts/farm_delivery_test.mjs
// Never writes to real storage: the storage is a fake object.
import assert from 'node:assert/strict';
import * as L from '../game/js/bezitlive.js';
import * as BL from '../game/js/boerderijlive.js';
import * as GT from '../game/js/bezitgate.js';
import * as SL from '../game/js/snacklive.js';
import * as SN from '../game/js/snackvan.js';
import * as SP from '../game/js/pitch.js';
import * as PC from '../game/js/percelen.js';
import * as B from '../game/js/boerderij.js';
import { KEYS } from '../game/js/storagekeys.js';
import { progressFrom, newGate } from '../game/js/unlockgate.js';

let n = 0, fails = 0;
const t = (name, fn) => { n++; try { fn(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', String(e.stack || e.message).split('\n').slice(0, 3).join(' | ')); } };
// breek: sleutels waarvan het schrijven mislukt (een volle of geblokkeerde opslag)
const nepOpslag = () => { const m = new Map(); return { m, breek: new Set(), getItem: (k) => (m.has(k) ? m.get(k) : null), setItem(k, v) { if (this.breek.has(k)) throw new Error('vol'); m.set(k, String(v)); }, removeItem: (k) => m.delete(k) }; };
const reset = (store = nepOpslag()) => { L.initBezit({ opslag: store }); BL.initBoerderij({ opslag: store }); L.setClaimLookup(null); L.setClaimSend(null); GT.resetUnlockGate(); GT.setGateProgress(() => ({ dev: true })); return store; };
const erf = () => PC.opslagGebruikt(BL.getBedrijf(), BL.getBedrijf().thuis);
const ligt = (g) => (BL.getBedrijf().opslag[BL.getBedrijf().thuis][g] || 0);
const inWagen = (g) => L.snackState().own.stock[g] || 0;
const opschijf = (st) => ({ boer: JSON.parse(st.getItem(KEYS.boerderij) || 'null'), bezit: JSON.parse(st.getItem(KEYS.bezit) || 'null') });
const vul = (g, kg) => { assert.ok(PC.bergOp(BL.getBedrijf(), BL.getBedrijf().thuis, g, kg).ok); };

t('een levering: de aardappelen gaan van het erf naar de wagen, beide kanten staan op schijf, het journaal sluit af', () => {
  const st = reset(); vul('aardappelen', 800);
  const r = SL.sendFarmGoods('aardappelen', 500);
  assert.ok(r.ok, r.text); assert.equal(r.delivered, 500); assert.equal(r.returned, 0);
  assert.equal(ligt('aardappelen'), 300); assert.equal(inWagen('aardappelen'), 500);
  const s = opschijf(st);
  assert.equal(s.boer.bedrijf.opslag[s.boer.bedrijf.thuis].aardappelen, 300);
  assert.equal(s.bezit.x.snack.own.stock.aardappelen, 500);
  assert.deepEqual(s.boer.deliveries.pending, {}); assert.equal(s.boer.deliveries.done.length, 1);
  assert.equal(Object.keys(s.bezit.x.snack.received).length, 1);
  assert.deepEqual(SL.farmGoodsInVan(), { aardappelen: 500 });
});

t('geen tweede keer: elke levering heeft een eigen id; opnieuw laden van beide opslagen geeft dezelfde stand', () => {
  const st = reset(); vul('aardappelen', 1000);
  SL.sendFarmGoods('aardappelen', 200); SL.sendFarmGoods('aardappelen', 300);
  assert.equal(inWagen('aardappelen'), 500); assert.equal(ligt('aardappelen'), 500);
  L.initBezit({ opslag: st }); BL.initBoerderij({ opslag: st });
  assert.equal(inWagen('aardappelen'), 500); assert.equal(ligt('aardappelen'), 500);
  assert.deepEqual(SL.resumeFarmDeliveries ? [] : [], []);
  assert.equal(BL.getBoerderij().deliveries.done.length, 2);
});

t('de wagen is vol: wat niet past ligt weer op het erf, en samen blijft het hetzelfde totaal', () => {
  reset(); vul('aardappelen', 3000);
  const r = SL.sendFarmGoods('aardappelen', 3000);
  assert.ok(r.ok); assert.equal(r.delivered, SN.FARM_STOCK_MAX); assert.equal(r.returned, 3000 - SN.FARM_STOCK_MAX);
  assert.equal(ligt('aardappelen') + inWagen('aardappelen'), 3000);
  const nog = SL.sendFarmGoods('aardappelen', 100);
  assert.equal(nog.ok, false); assert.equal(nog.delivered, 0); assert.equal(ligt('aardappelen'), 3000 - SN.FARM_STOCK_MAX, 'niets verdwenen bij een volle wagen');
});

t('de wagenopslag kan niet worden bewaard: de levering blijft onderweg en komt bij de volgende dag precies één keer aan', () => {
  const st = reset(); vul('aardappelen', 600);
  st.breek.add(KEYS.bezit);                                          // de opslag van Bezit is vol
  const r = SL.sendFarmGoods('aardappelen', 400);
  assert.equal(r.state, 'pending'); assert.match(r.text, /Onderweg/);
  assert.equal(ligt('aardappelen'), 200, 'van het erf af');
  assert.equal(Object.keys(opschijf(st).boer.deliveries.pending).length, 1, 'het journaal staat op schijf');
  st.breek.delete(KEYS.bezit);
  const w = { money: 0, calendar: { day: 100 }, msgs: [], addMessage() {} };
  L.dayTick(w);                                                      // de dagtik maakt hem af
  assert.equal(inWagen('aardappelen'), 400); assert.equal(ligt('aardappelen'), 200);
  assert.deepEqual(BL.getBoerderij().deliveries.pending, {});
  L.dayTick(w); L.dayTick(w);
  assert.equal(inWagen('aardappelen'), 400, 'nog eens afmaken verandert niets');
});

t('het spel stopt na het schrijven van de wagen maar voor het afsluiten bij de boer: opnieuw laden telt niet dubbel', () => {
  const st = reset(); vul('aardappelen', 600);
  const echt = st.setItem.bind(st); let boerSchrijft = 0;
  st.setItem = function (k, v) { if (k === KEYS.boerderij && ++boerSchrijft === 2) throw new Error('uit'); return echt(k, v); };   // het tweede schrijven van de boer (afsluiten) mislukt
  SL.sendFarmGoods('aardappelen', 400);
  st.setItem = echt;
  const s = opschijf(st);
  assert.equal(Object.keys(s.boer.deliveries.pending).length, 1, 'op schijf staat de levering nog onderweg');
  assert.equal(s.bezit.x.snack.own.stock.aardappelen, 400, 'terwijl de wagen hem al heeft');
  L.initBezit({ opslag: st }); BL.initBoerderij({ opslag: st });     // opnieuw laden
  SL.resumeFarmDeliveries && L.dayTick({ money: 0, calendar: { day: 5 }, addMessage() {} });
  assert.equal(inWagen('aardappelen'), 400, 'niet 800'); assert.equal(ligt('aardappelen'), 200);
  assert.deepEqual(BL.getBoerderij().deliveries.pending, {});
});

t('weigeren zonder iets te verplaatsen: geen aardappelen, een goed dat de wagen niet gebruikt, een dichte tak', () => {
  reset(); vul('bieten', 100);
  const geen = SL.sendFarmGoods('aardappelen', 10);
  assert.equal(geen.ok, false); assert.match(geen.text, /geen aardappelen in opslag/i);
  const bieten = SL.sendFarmGoods('bieten', 10);
  assert.equal(bieten.ok, false); assert.equal(bieten.why, 'not-accepted'); assert.equal(ligt('bieten'), 100);
  vul('aardappelen', 100);
  GT.setGateProgress(() => progressFrom({ stepId: 'M01', gate: newGate() }));
  const dicht = SL.sendFarmGoods('aardappelen', 50);
  assert.equal(dicht.ok, false); assert.equal(dicht.why, 'dicht'); assert.equal(ligt('aardappelen'), 100); assert.equal(inWagen('aardappelen'), 0);
  GT.setGateProgress(() => ({ dev: true }));
  assert.equal(SL.sendFarmGoods('aardappelen', 0).ok, false);
  assert.equal(SL.sendFarmGoods('aardappelen', 'veel').ok, false);
  assert.equal(ligt('aardappelen'), 100);
});

t('een erf dat je opgaf: wat de wagen niet nam gaat terug naar je thuis', () => {
  reset(); vul('aardappelen', 100);
  const bd = BL.getBedrijf();
  PC.schenk(bd); BL.zetThuis(PC.SCHENK_ERF);
  PC.bergOp(bd, PC.SCHENK_ERF, 'aardappelen', 3000);
  const r = SL.sendFarmGoods('aardappelen', 3000, PC.SCHENK_ERF);
  assert.ok(r.ok); assert.equal(r.delivered, SN.FARM_STOCK_MAX);
  assert.equal(bd.opslag[PC.SCHENK_ERF].aardappelen, 3000 - SN.FARM_STOCK_MAX, 'het erf waar het vandaan kwam krijgt de rest terug');
});

t('oude opslag: een boerderij en een snackstaat zonder de nieuwe velden laden gewoon, zonder versiebump', () => {
  const oudBoer = JSON.parse(JSON.stringify(B.nieuweBoerderij())); delete oudBoer.deliveries; oudBoer.uren = 321;
  const b = B.normaliseer(oudBoer);
  assert.equal(b.v, 1); assert.equal(b.uren, 321); assert.deepEqual(b.deliveries, { seq: 0, pending: {}, done: [] });
  const oudSnack = JSON.parse(JSON.stringify(SN.newSnack())); delete oudSnack.received; delete oudSnack.own.stock; oudSnack.rep = 77;
  const S = SN.normalizeSnack(oudSnack);
  assert.equal(S.rep, 77); assert.deepEqual(S.own.stock, {}); assert.deepEqual(S.received, {});
  const rommel = SN.normalizeSnack({ own: { stock: { aardappelen: -5, uien: 40, goud: 9 } }, received: { 'a b': 1, x: 'veel', y: 3 } });
  assert.deepEqual(rommel.own.stock, {}); assert.deepEqual(rommel.received, { x: 0, y: 3 });
  assert.equal(SN.normalizeSnack({ own: { stock: { aardappelen: 1e9 } } }).own.stock.aardappelen, SN.FARM_STOCK_MAX);
  assert.ok(JSON.stringify(SN.normalizeSnack(null)).length < 3000);
});

t('receiveFarmGoods: dezelfde levering geeft nooit twee keer iets, alleen wat de wagen gebruikt wordt aangenomen', () => {
  const S = SN.newSnack();
  const d = { id: 'p1:lev:1', good: 'aardappelen', amount: 300 };
  assert.deepEqual(SN.receiveFarmGoods(S, d), { ok: true, amount: 300 });
  assert.deepEqual(SN.receiveFarmGoods(S, d), { ok: true, duplicate: true, amount: 300 });
  assert.equal(S.own.stock.aardappelen, 300);
  assert.equal(SN.receiveFarmGoods(S, { id: 'x', good: 'bieten', amount: 5 }).reason, 'not-accepted');
  assert.equal(SN.receiveFarmGoods(S, { id: '', good: 'aardappelen', amount: 5 }).ok, false);
  for (let i = 0; i < SN.RECEIVED_MAX + 10; i++) { S.own.stock.aardappelen = 0; SN.receiveFarmGoods(S, { id: `q:${i}`, good: 'aardappelen', amount: 1 }); }
  assert.ok(Object.keys(S.received).length <= SN.RECEIVED_MAX, 'het geheugen van ontvangen leveringen blijft klein');
});

// een dag met en zonder boerderijvoorraad, met een vaste concurrentie (zoals snackvan_test)
const dag = (stock) => {
  const S = SN.newSnack(); S.permits.dorp = { until: 1e6, paid: SP.permitPrice('dorp', 0) }; S.own.spot = 'dorp'; S.own.stockDays = 5; S.own.stock = stock;
  S.rival.spots = []; S.rival.mood = 5; S.rival.lastEvent = 1e6; S.rival.lastOffer = 1e6;
  return { S, rep: SN.settleDay(S, { day: 20, weekend: false, money: 1e9, ownWagon: true, ownQ: 100, kermisAt: () => false, chainOwn: () => 0 }) };
};
t('het gebruik: de voorraad van je boer gaat eerst op en scheelt inkoop; zonder voorraad verandert er niets', () => {
  const zonder = dag({}), met = dag({ aardappelen: 500 });
  assert.equal(zonder.rep.own.farmCredit, 0); assert.deepEqual(zonder.rep.own.farmUsed, {});
  const used = met.rep.own.farmUsed.aardappelen;
  assert.ok(used > 0 && used <= 500, 'er is aardappel gebruikt');
  assert.ok(met.rep.own.farmCredit > 0 && met.rep.own.cogs < zonder.rep.own.cogs, 'de inkoop is lager');
  assert.equal(met.rep.own.net - zonder.rep.own.net, zonder.rep.own.cogs - met.rep.own.cogs, 'het verschil in winst is precies de lagere inkoop');
  assert.ok(met.rep.own.farmCredit <= zonder.rep.own.cogs, 'nooit meer dan de inkoop zelf');
  assert.ok(Math.abs(met.S.own.stock.aardappelen - (500 - used)) < 0.02, 'de voorraad is met het verbruik gedaald');
  assert.equal(zonder.rep.own.revenue, met.rep.own.revenue, 'de omzet verandert niet');
});
t('het gebruik: een kleine voorraad raakt op, en het credit volgt het echte gebruik', () => {
  const r = dag({ aardappelen: 2 });
  assert.equal(r.rep.own.farmUsed.aardappelen, 2);
  assert.equal(r.S.own.stock.aardappelen, undefined, 'op is op');
  assert.ok(r.rep.own.farmCredit <= Math.round(2 * SN.FARM_CREDIT_PER_KG));
});

t('per speler: de voorraad van een ander staat nergens; het journaal hoort bij deze boerderij en niet bij een nieuwe', () => {
  const st = reset(); vul('aardappelen', 100);
  SL.sendFarmGoods('aardappelen', 100);
  const tweede = nepOpslag();
  reset(tweede);                                                     // een andere speler op een ander apparaat: een eigen boerderij en een eigen wagen
  assert.equal(inWagen('aardappelen'), 0); assert.equal(BL.getBoerderij().deliveries.done.length, 0);
  assert.notEqual(st, tweede);
});

console.log(`farm_delivery_test: ${n - fails}/${n}`);
process.exit(fails ? 1 : 0);
