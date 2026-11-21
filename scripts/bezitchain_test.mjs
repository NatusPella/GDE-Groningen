// De koppeling van de ketens aan het bezit (#1103): welke panden passen, de bron uit percelen en vee, koppelen en afstand, de dag met streekprijs en de bonus
// (alleen het extra), opslag en de exploit-tests.   node scripts/bezitchain_test.mjs
import assert from 'node:assert/strict';
import * as C from '../game/js/bezitchain.js';
import * as SC from '../game/js/supplychain.js';
import * as AM from '../game/js/areamarket.js';
import { newBezit, serializeBezit, normalizeBezit } from '../game/js/bezit.js';

let n = 0, fails = 0;
const t = (name, fn) => { n++; try { fn(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', String(e.stack || e.message).split('\n').slice(0, 3).join('\n   ')); } };
const rows = (o = []) => o.map((r) => ({ id: r.id, level: 'staff', phase: 'groeit', crop: r.crop || 'aardappelen', plan: r.crop || 'aardappelen', expectedKg: r.kg ?? 3600, ...r }));
const bezitMet = () => { const b = newBezit(); return b; };
const info = { 1001: { cls: 'industry', type: 'industrie', x: 1000, y: 0 }, 1002: { cls: 'shop', type: 'winkel', x: 1100, y: 0 }, 1003: { cls: 'shop', type: 'bakker', x: 9000, y: 0 }, 'm:frietwagen': { cls: 'mobile', type: 'frietwagen', x: 0, y: 0 } };
const infoOf = (ref) => info[ref] || null;

t('passen: verwerkers zijn bedrijfsruimte, verkooppunten winkels, de frietwagen is een snackbar; hooi en bieten zijn niet te koppelen', () => {
  const kaas = SC.newChain('kaas'), friet = SC.newChain('friet'), hooi = SC.newChain('hooi'), bieten = SC.newChain('bieten');
  assert.ok(C.fits('kaas', kaas.links[1], info[1001])); assert.equal(C.fits('kaas', kaas.links[1], info[1002]), false);
  assert.ok(C.fits('kaas', kaas.links[2], info[1002])); assert.equal(C.fits('kaas', kaas.links[2], info[1001]), false);
  assert.ok(C.fits('friet', friet.links[2], info['m:frietwagen'])); assert.equal(C.fits('kaas', kaas.links[2], info['m:frietwagen']), false);
  assert.equal(C.fits('hooi', hooi.links[1], info[1001]), false); assert.equal(C.fits('bieten', bieten.links[1], info[1001]), false);
  assert.equal(C.fits('kaas', kaas.links[0], info[1001]), false, 'een bron is geen pand');
});

t('opslag: alle zes ketens, begrensd en zonder rommel; ongebruikt wordt niet bewaard', () => {
  const b = bezitMet();
  const all = C.chainsOf(b);
  assert.deepEqual(Object.keys(all).sort(), SC.CHAIN_IDS.slice().sort());
  assert.deepEqual(C.serializableChains(b), {});
  C.bindLink(b, 'kaas', 'kaasmakerij', 1001, infoOf);
  assert.deepEqual(Object.keys(C.serializableChains(b)), ['kaas']);
  const e = C.normalizeEntry({ chain: { id: 'kaas', links: [] }, bind: { p: ['paaaaaaaaaaa1', 'x', 5, '<script>'], l: { kaasmakerij: 'nep', verkoop: 7, melk: 9 } }, closed: -4, last: 'rommel' }, 'kaas');
  assert.deepEqual(e.bind.p, ['paaaaaaaaaaa1']); assert.deepEqual(e.bind.l, { verkoop: 7 }); assert.equal(e.closed, 0); assert.equal(e.last, null);
  assert.equal(C.normalizeEntry({ chain: { id: 'andere' } }, 'kaas').chain.id, 'kaas');
});

t('bron: percelen op Personeel met het gewas en kuddes met het product; zieke kudde een kwart; bind kiest; verlies drukt', () => {
  const r = rows([{ id: 'pa', kg: 3600 }, { id: 'pb', kg: 7200 }, { id: 'pc', crop: 'graan' }, { id: 'pd', level: 'self' }]);
  const s = C.sourceKgPerDay('aardappelen', r, {});
  assert.deepEqual(s.ids.sort(), ['pa', 'pb']); assert.equal(s.kg, Math.round(10800 / (Math.ceil(30 / 24) + 1)));
  assert.equal(C.sourceKgPerDay('aardappelen', r, {}, ['pa']).ids.length, 1);
  assert.ok(C.sourceKgPerDay('aardappelen', r, {}, [], () => 0.3).kg < s.kg * 0.75);
  const herds = { p1: { sp: 'melkvee', n: 10, sick: 0 }, p2: { sp: 'kippen', n: 200, sick: 0 }, p3: { sp: 'melkvee', n: 10, sick: 2 } };
  assert.equal(C.sourceKgPerDay('melk', [], herds).kg, 10 * 22 + Math.round(10 * 22 * 0.25));
  assert.equal(C.sourceKgPerDay('eieren', [], herds).kg, Math.round(200 * 0.8 * C.EGG_KG));
  assert.equal(C.sourceKgPerDay('graan', [], herds).kg, 0);
});

t('koppelen: past, van jou, één pand een schakel per keten; losmaken en opruimen van verkochte panden', () => {
  const b = bezitMet();
  assert.equal(C.bindLink(b, 'kaas', 'kaasmakerij', 1002, infoOf).why, 'past-niet');
  assert.equal(C.bindLink(b, 'kaas', 'kaasmakerij', 4242, infoOf).why, 'niet-van-jou');
  assert.equal(C.bindLink(b, 'kaas', 'melk', 1001, infoOf).why, 'geen-schakel');
  assert.equal(C.bindLink(b, 'kaas', 'kaasmakerij', 'raar', infoOf).why, 'onbekend');
  assert.ok(C.bindLink(b, 'kaas', 'kaasmakerij', 1001, infoOf).ok);
  assert.ok(C.bindLink(b, 'kaas', 'verkoop', 1002, infoOf).ok);
  assert.equal(C.pruneBindings(b, (ref) => ref !== 1001 ? infoOf(ref) : null), 1);
  assert.deepEqual(C.chainsOf(b).kaas.bind.l, { verkoop: 1002 });
  assert.ok(C.unbindLink(b, 'kaas', 'verkoop')); assert.equal(C.unbindLink(b, 'kaas', 'verkoop'), false);
  assert.ok(C.toggleSourceParcel(b, 'kaas', 'paaaaaaaaaaa1')); assert.ok(C.toggleSourceParcel(b, 'kaas', 'paaaaaaaaaaa1')); assert.deepEqual(C.chainsOf(b).kaas.bind.p, []);
});

const env = (b, extra = {}) => ({ rows: [], herds: { p1: { sp: 'melkvee', n: 20, sick: 0 } }, market: AM.newMarket(), calDay: 10, lossOf: () => 0, loc: (r) => (infoOf(r) && !String(r).startsWith('m:') ? { x: infoOf(r).x, y: infoOf(r).y } : null), valid: (r) => !!infoOf(r), parcelLoc: () => ({ x: 0, y: 0 }), regionOf: () => 'hogeland', spotOf: () => 'park', eventMult: () => 1, ...extra });

t('afstand: binnen 500 m geen wagen nodig; verder stokt de keten zonder wagen en loopt hij met een wagen', () => {
  const b = bezitMet();
  C.bindLink(b, 'kaas', 'kaasmakerij', 1001, infoOf);       // 1000 m van de bron
  C.bindLink(b, 'kaas', 'verkoop', 1002, infoOf);           // 100 m van de verwerker: op het erf
  let e = C.chainsOf(b).kaas;
  const r1 = C.stepEntry(e, env(b));
  assert.equal(r1.entry.chain.links[0].distance, 1000); assert.equal(r1.entry.chain.links[1].distance, 0);
  assert.deepEqual(r1.rep.stuck.map((s) => s.why), ['transport']);
  assert.equal(r1.entry.chain.links[1].stock, 0);
  e = { ...C.chainsOf(b).kaas }; e.chain = SC.addTruck(e.chain, 'melk').chain;
  const r2 = C.stepEntry(e, env(b));
  assert.ok(r2.entry.chain.links[1].stock > 0);
  assert.ok(r2.entry.last.moved[0] > 0);
});

t('extra marge: alleen een eigen schakel geeft een bonus; zonder eigen schakel is de bonus nul en kosten de wagens niets uit het bezit', () => {
  const herds = { p1: { sp: 'melkvee', n: 200, sick: 0 } };
  const run = (bind) => { const b = bezitMet(); for (const [l, ref] of bind) C.bindLink(b, 'kaas', l, ref, infoOf); let e = C.chainsOf(b).kaas, bonus = 0, market = AM.newMarket(); e = { ...e, chain: SC.addTruck(e.chain, 'melk').chain }; for (let d = 1; d <= 6; d++) { const r = C.stepEntry(e, env(b, { market, calDay: d, herds })); e = r.entry; market = r.market; bonus += r.bonus; } return { bonus, e }; };
  const none = run([]), one = run([['kaasmakerij', 1001]]), both = run([['kaasmakerij', 1001], ['verkoop', 1002]]);
  assert.equal(none.bonus, 0);
  assert.ok(one.bonus > 0 && both.bonus > one.bonus, `verwerker ${one.bonus}, beide ${both.bonus}`);
});

t('bonus telt alleen het extra: de verkochte kilo\'s als grondstof worden er al afgetrokken', () => {
  const chain = SC.newChain('kaas', { owned: ['kaasmakerij', 'verkoop'] });
  const rep = { sold: 100, revenue: 100 * 4.5 * 0.1 * 0, margin: 0.35, cost: { wages: 0, diesel: 0 } };
  rep.revenue = 1000 / 0.1 * 0.45 * 1.35 * 0.1;               // 1000 kg melk als kaas verkocht met 35% marge
  rep.sold = 100;                                              // 100 kg kaas = 1000 kg melk
  const b = C.bonusOf(chain, rep);
  assert.equal(Math.round(b), Math.round(rep.revenue - 1000 * 0.45));
  assert.equal(C.bonusOf(chain, { ...rep, margin: 0 }), 0);
});

t('gesloten keten telt een dag als alle schakels werken; de streekprijs staat in de verkoop en de markt krijgt het aanbod', () => {
  const b = bezitMet();
  C.bindLink(b, 'kaas', 'kaasmakerij', 1001, infoOf); C.bindLink(b, 'kaas', 'verkoop', 1002, infoOf);
  let e = C.chainsOf(b).kaas; e = { ...e, chain: SC.addTruck(e.chain, 'melk').chain };
  let market = AM.newMarket(), closed = 0;
  for (let d = 1; d <= 6; d++) { const r = C.stepEntry(e, env(b, { market, calDay: d })); e = r.entry; market = r.market; if (r.closed) closed++; }
  assert.ok(closed >= 1 && e.closed === closed);
  assert.ok(Object.keys(market.today).some((k) => k.endsWith(':kaas')), 'wat de keten verkoopt, telt als aanbod in de streek');
});

t('de streekprijs doet mee: een verzadigde streek geeft een lagere bonus', () => {
  const b = bezitMet();
  C.bindLink(b, 'kaas', 'kaasmakerij', 1001, infoOf); C.bindLink(b, 'kaas', 'verkoop', 1002, infoOf);
  let e = C.chainsOf(b).kaas; e = { ...e, chain: SC.addTruck(e.chain, 'melk').chain };
  const sat = { day: 6, today: {}, depression: { 'hogeland:kaas': 0.6 } };
  const fresh = AM.newMarket();
  let r1 = e, r2 = e, m1 = fresh, m2 = sat, a = 0, c = 0;
  for (let d = 1; d <= 8; d++) { const x = C.stepEntry(r1, env(b, { market: m1, calDay: d + 6 })); r1 = x.entry; m1 = x.market; a += x.bonus; const y = C.stepEntry(r2, env(b, { market: m2, calDay: d + 6 })); r2 = y.entry; m2 = y.market; c += y.bonus; }
  assert.ok(c < a, `verzadigd ${c} < vers ${a}`);
});

t('viewOf: schakels met balk, de zwakste schakel en wat er gekoppeld is; opslag rond', () => {
  const b = bezitMet();
  C.bindLink(b, 'kaas', 'kaasmakerij', 1001, infoOf);
  const v = C.viewOf(C.chainsOf(b).kaas, env(b));
  assert.equal(v.links.length, 3); assert.equal(v.links[1].ref, 1001); assert.equal(v.links[1].owned, true); assert.equal(v.sourceKg, 20 * 22);
  assert.equal(Math.round(v.margin * 100), 15);
  b.x.chains = JSON.parse(JSON.stringify(C.serializableChains(b)));
  const b2 = normalizeBezit(JSON.parse(JSON.stringify(serializeBezit(b))));
  assert.equal(C.chainsOf(b2).kaas.bind.l.kaasmakerij, 1001);
});

t('exploit: een keten kan geen geld uit het niets maken (massabalans: wat verkocht is, kwam uit de bron)', () => {
  const b = bezitMet();
  C.bindLink(b, 'kaas', 'kaasmakerij', 1001, infoOf); C.bindLink(b, 'kaas', 'verkoop', 1002, infoOf);
  let e = C.chainsOf(b).kaas, market = AM.newMarket(), soldKaas = 0, melk = 0;
  for (let d = 1; d <= 30; d++) { const r = C.stepEntry(e, env(b, { market, calDay: d })); e = r.entry; market = r.market; soldKaas += r.rep.sold; melk += r.produced; }
  assert.ok(soldKaas * 10 <= melk + 1, `kaas ${soldKaas} x 10 <= melk ${melk}`);
});

console.log(`bezitchain_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
