// Gebeurtenissen van Bezit (#1103): droogte (zand meer), stortbui (verzekering), mieren, wespen, machine kapot (boven 70% slijtage), ziek vee,
// Inspectiedienst Noordrand, koeling, staking, veiling, veilingdag, landbouwbeurs, buren met keuze, kermis, trekkertrek.
//   node scripts/bezitevents_test.mjs
import assert from 'node:assert/strict';
import * as E from '../game/js/bezitevents.js';
import * as Bz from '../game/js/business.js';
import * as R from '../game/js/areamarket.js';

let n = 0, fails = 0;
const t = (name, fn) => { n++; try { fn(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', String(e.message).split('\n')[0]); } };
const DAYS = Array.from({ length: 300 }, (_, i) => i + 1);
const REGIONS = ['hogeland', 'veenkolonien', 'oldambt', 'westerkwartier'];
const field = (o = {}) => ({ id: 'p1', kind: 'a', region: 'veenkolonien', sandy: false, sown: true, ...o });

t('alles is deterministisch: dezelfde dag, plek en zaad geven dezelfde uitkomst, zonder Math.random', () => {
  const real = Math.random; let calls = 0; Math.random = () => { calls++; return 0.4; };
  try {
    const ctx = { regions: REGIONS, seed: 'speler-1', machines: [{ id: 'm1', name: 'Trekker', wear: 95, price: 80000 }], herds: [{ id: 'h1', kind: 'melkvee', count: 20, perHa: 2, refPerHa: 2.5 }], buildings: [{ id: 5, stock: { kaas: 400 } }], audit: { qAvg: 20 } };
    for (const d of DAYS) assert.deepEqual(E.eventsOn(d, ctx), E.eventsOn(d, ctx));
  } finally { Math.random = real; }
  assert.equal(calls, 0);
  assert.notDeepEqual(DAYS.map((d) => !!E.droughtOn('hogeland', d)), DAYS.map((d) => !!E.droughtOn('oldambt', d)));
});
t('het weer is gedeeld: twee spelers in dezelfde streek op dezelfde dag zien dezelfde droogte (het spelerszaad doet er niet toe)', () => {
  for (const d of DAYS) assert.deepEqual(E.parcelLoss(field(), d), E.parcelLoss(field(), d));
  const a = E.eventsOn(77, { regions: REGIONS, seed: 'a' }).filter((e) => e.scope === 'region'), b = E.eventsOn(77, { regions: REGIONS, seed: 'b' }).filter((e) => e.scope === 'region');
  assert.deepEqual(a, b);
});
t('droogte: duurt 3 tot 6 dagen, komt voor, en op zand is het verlies groter (15..35% in totaal)', () => {
  const lens = []; let run = 0;
  for (const d of [0, ...DAYS, 301]) { if (d >= 1 && d <= 300 && E.droughtOn('hogeland', d)) run++; else if (run) { lens.push(run); run = 0; } }
  assert.ok(lens.length >= 5, `droogtes ${lens.length}`);
  assert.ok(Math.max(...lens) <= 11 && Math.max(...lens) >= 3, `langste droogte ${Math.max(...lens)}`);
  const clay = [], sand = [];
  for (const d of DAYS) { const dr = E.droughtOn('hogeland', d); if (!dr) continue; clay.push(E.parcelLoss(field({ region: 'hogeland' }), d).loss); sand.push(E.parcelLoss(field({ region: 'hogeland', sandy: true }), d).loss); }
  assert.ok(clay.length > 10);
  const droughtOnly = (d, sandy) => E.parcelLoss(field({ region: 'hogeland', sandy }), d).causes.find((c) => c.id === 'droogte').loss;
  for (const d of DAYS) { if (!E.droughtOn('hogeland', d)) continue; const c = droughtOnly(d, false), s = droughtOnly(d, true); assert.ok(c >= 0.15 && c <= 0.25 && s >= 0.25 && s <= 0.35 && s > c, `${c} ${s}`); }
  assert.equal(E.yieldMultiplier(field({ region: 'hogeland' }), DAYS.find((d) => !E.droughtOn('hogeland', d) && E.parcelLoss(field({ region: 'hogeland' }), d).loss === 0)), 1);
});
t('stortbui: een gezaaid perceel verliest 30% op de dag zelf; een niet gezaaid perceel niets; verzekering dekt 80%', () => {
  const d = DAYS.find((x) => E.activeSpan(E.EVENT_DEFS.stortbui, 'oldambt', x)); assert.ok(d, 'er is stortbui binnen 300 dagen');
  const f = (o) => field({ region: 'oldambt', ...o });
  const loss = E.parcelLoss(f(), d).causes.find((c) => c.id === 'stortbui'); assert.equal(loss.loss, 0.3);
  assert.ok(!E.parcelLoss(f({ sown: false }), d).causes.some((c) => c.id === 'stortbui'));
  assert.ok(Math.abs(E.parcelLoss(f(), d, { insured: true }).causes.find((c) => c.id === 'stortbui').loss - 0.06) < 1e-9);
  assert.equal(E.stormPayout(1000, true), 800); assert.equal(E.stormPayout(1000, false), 0); assert.equal(E.insurancePremium(10), 30);
  assert.ok(E.STORM_INSURANCE.covers < 1, 'de verzekering dekt nooit alles');
});
t('mierenplaag treft akker en weide, wespen alleen de boomgaard; bestrijden voorkomt het verlies en kost geld', () => {
  const dA = DAYS.find((x) => E.activeSpan(E.EVENT_DEFS.mierenplaag, 'hunsingo', x)), dW = DAYS.find((x) => E.activeSpan(E.EVENT_DEFS.wespen, 'hunsingo', x));
  assert.ok(dA && dW);
  const f = (o) => field({ region: 'hunsingo', ...o });
  assert.ok(E.parcelLoss(f({ kind: 'a' }), dA).causes.some((c) => c.id === 'mierenplaag')); assert.ok(E.parcelLoss(f({ kind: 'w' }), dA).causes.some((c) => c.id === 'mierenplaag'));
  assert.ok(!E.parcelLoss(f({ kind: 'b' }), dA).causes.some((c) => c.id === 'mierenplaag'));
  assert.ok(!E.parcelLoss(f({ kind: 'a', treated: { ants: true } }), dA).causes.some((c) => c.id === 'mierenplaag'));
  assert.ok(E.parcelLoss(f({ kind: 'b' }), dW).causes.some((c) => c.id === 'wespen')); assert.ok(!E.parcelLoss(f({ kind: 'a' }), dW).causes.some((c) => c.id === 'wespen'));
  assert.ok(!E.parcelLoss(f({ kind: 'b', treated: { wasps: true } }), dW).causes.some((c) => c.id === 'wespen'));
  assert.equal(E.antControlCost(10), 150); assert.ok(E.WASP_NEST_COST > 0);
});
t('het totale verlies blijft begrensd (hoogstens 60%) en de opbrengst nooit negatief', () => {
  for (const r of ['hogeland', 'oldambt', 'westerwolde']) for (const d of DAYS) { const l = E.parcelLoss(field({ region: r, sandy: true, kind: 'b' }), d).loss; assert.ok(l >= 0 && l <= 0.6); assert.ok(E.yieldMultiplier(field({ region: r }), d) >= 0.4); }
});
t('machine kapot: onder 70% slijtage nooit, daarboven een kans die oploopt; de reparatie kost geld en duurt 1 tot 3 dagen', () => {
  assert.equal(E.breakdownChance(0), 0); assert.equal(E.breakdownChance(70), 0); assert.ok(E.breakdownChance(71) > 0.02 - 1e-9);
  assert.ok(E.breakdownChance(100) > E.breakdownChance(85) && E.breakdownChance(85) > E.breakdownChance(72)); assert.ok(E.breakdownChance(100) <= 0.2001);
  const count = (wear) => DAYS.filter((d) => E.machineBreakdown({ id: 'm', wear, price: 60000 }, d, 'x')).length;
  assert.equal(count(60), 0); assert.equal(count(70), 0); assert.ok(count(95) > count(75) && count(95) > 15);
  for (const d of DAYS) { const b = E.machineBreakdown({ id: 'm', name: 'Kleine trekker', wear: 100, price: 60000 }, d, 's'); if (b) { assert.ok(b.days >= 1 && b.days <= 3); assert.ok(b.cost >= 60000 * 0.08 - 5 && b.cost <= 60000 * 0.28 + 5); assert.match(b.text, /Kleine trekker/); } }
  assert.equal(E.machineBreakdown(null, 5), null);
});
t('ziek vee: quarantaine van drie dagen met dierenartskosten op de eerste dag; een te volle weide maakt het waarschijnlijker', () => {
  const herd = (perHa) => ({ id: 'h', kind: 'schapen', count: 30, perHa, refPerHa: 10 });
  const sick = (h) => DAYS.filter((d) => E.herdSickness(h, d, 's')).length;
  assert.ok(sick(herd(10)) > 0 && sick(herd(20)) > sick(herd(10)));
  const d = DAYS.find((x) => E.herdSickness(herd(10), x, 's') && E.herdSickness(herd(10), x, 's').first), s = E.herdSickness(herd(10), d, 's');
  assert.equal(s.days, 3); assert.equal(s.vetCost, E.VET_BASE + E.VET_PER_ANIMAL * 30); assert.equal(s.quarantine, true); assert.match(s.text, /schapen/); assert.ok(!/dood|sterft|slacht|lijd|bloed/i.test(s.text));
  const later = DAYS.find((x) => E.herdSickness(herd(10), x, 's') && !E.herdSickness(herd(10), x, 's').first); assert.equal(E.herdSickness(herd(10), later, 's').vetCost, 0);
});
t('Inspectiedienst Noordrand: boete bij verwaarlozing, lof bij orde, anders niets; de bedragen zijn klein', () => {
  const d = DAYS.find((x) => E.activeSpan(E.EVENT_DEFS.inspectie, 'sp', x)); assert.ok(d);
  const bad = E.inspection({ qAvg: 10, tidyFields: 0.1, dailyRevenue: 5000 }, d, 'sp'), good = E.inspection({ qAvg: 100, tidyFields: 1 }, d, 'sp'), mid = E.inspection({ qAvg: 70, tidyFields: 0.7 }, d, 'sp');
  assert.equal(bad.outcome, 'boete'); assert.ok(bad.amount < 0 && bad.amount >= -1500); assert.match(bad.text, /Inspectiedienst Noordrand/);
  assert.equal(good.outcome, 'lof'); assert.ok(good.amount > 0 && good.amount <= 250);
  assert.equal(mid.outcome, 'geen-opmerkingen'); assert.equal(mid.amount, 0);
  assert.equal(E.inspection({ qAvg: 10 }, DAYS.find((x) => !E.activeSpan(E.EVENT_DEFS.inspectie, 'sp', x)), 'sp'), null);
});
t('storing in de koeling: een deel van de bederfelijke voorraad is weg, niet van wat niet bederft', () => {
  const d = DAYS.find((x) => E.coolingFailure(7, x, { kaas: 1000 }, 's')); assert.ok(d);
  const c = E.coolingFailure(7, d, { kaas: 1000, graan: 5000, melk: 0 }, 's');
  assert.ok(c.fraction >= 0.15 && c.fraction <= 0.3); assert.equal(c.lost.graan, undefined); assert.equal(c.lost.melk, undefined); assert.equal(c.lost.kaas, Math.round(1000 * c.fraction));
});
t('staking: een dag dicht voor de supermarkten van de streek (satire), werkt door in business.js; andere winkels draaien door', () => {
  const d = DAYS.find((x) => E.activeSpan(E.EVENT_DEFS.staking, 'hogeland', x)); assert.ok(d);
  const m = E.businessMods({ id: 1, type: 'supermarkt' }, 'hogeland', d); assert.equal(m.closed, true); assert.match(m.note, /Bond Kassa Vrij Noord/);
  assert.equal(E.businessMods({ id: 2, type: 'bakker' }, 'hogeland', d).closed, undefined);
  const biz = { id: 1, type: 'supermarkt', cls: 'shop', m2: 90, p: 100000, q: 100, cfg: Bz.defaultCfg(1) };
  const r = Bz.stepDay(biz, { day: d, town: { houses: 1000 }, owned: 1, event: m }).report; assert.equal(r.revenue, 0); assert.equal(r.open, false);
  assert.ok(!/geweld|overval|dief/i.test(m.note));
});
t('kermis en dorpsfeest: drie dagen per twaalf per streek, +20% voor de winkels, en de kermisplek van de frietwagen', () => {
  const on = DAYS.filter((d) => E.festivalOn('hogeland', d));
  assert.ok(on.length >= 60 && on.length <= 80, `${on.length}`);
  for (const d of on.slice(0, 20)) { const f = E.festivalOn('hogeland', d); assert.equal(f.revMult, 1.2); assert.equal(typeof f.kermis, 'boolean'); }
  assert.notDeepEqual(DAYS.map((d) => !!E.festivalOn('hogeland', d)), DAYS.map((d) => !!E.festivalOn('oldambt', d)));
  const dk = DAYS.find((d) => { const f = E.festivalOn('hogeland', d); return f && f.kermis; }); assert.ok(dk);
  const biz = { id: 3, type: 'bakker', cls: 'shop', m2: 80, p: 70000, q: 100, cfg: Bz.defaultCfg(3) };
  const plain = Bz.stepDay(biz, { day: dk, town: { houses: 1000 }, owned: 1 }).report.revenue, feest = Bz.stepDay(biz, { day: dk, town: { houses: 1000 }, owned: 1, event: E.businessMods(biz, 'hogeland', dk) }).report.revenue;
  assert.ok(feest > plain * 1.15 && feest < plain * 1.25);
  const fw = { id: 'frietwagen', type: 'frietwagen', cls: 'mobile', m2: 0, p: 7500, q: 100, cfg: Bz.setKnob(Bz.defaultCfg(0, false), 'hr', 10) };
  fw.cfg.spot = 'kermis';
  assert.ok(Bz.stepDay(fw, { day: dk, kermis: true }).report.revenue > Bz.stepDay(fw, { day: dk, kermis: false }).report.revenue * 1.7);
});
t('veiling: een koopje van 20 tot 35% korting in een streek, een dag', () => {
  const offers = DAYS.map((d) => E.auctionOffer('oldambt', d)).filter(Boolean);
  assert.ok(offers.length >= 5);
  for (const o of offers) { assert.ok(o.discount >= 0.2 && o.discount <= 0.35 && o.pick >= 0 && o.pick < 1 && ['perceel', 'pand'].includes(o.kind)); assert.match(o.text, /Oldambt/); }
  assert.equal(E.auctionOffer('oldambt', 0), null);
});
t('veilingdag: één product +25% bovenop de marktfactor; alleen voor dat product; werkt met areamarket.js', () => {
  const d = DAYS.find((x) => E.auctionDay(x)); assert.ok(d);
  const a = E.auctionDay(d); assert.equal(a.mult, 1.25); assert.ok(E.AUCTION_PRODUCTS.includes(a.product));
  assert.equal(E.marketEventMult(a.product, d), 1.25);
  assert.equal(E.marketEventMult(E.AUCTION_PRODUCTS.find((p) => p !== a.product), d), 1);
  assert.equal(E.marketEventMult(a.product, DAYS.find((x) => !E.auctionDay(x))), 1);
  const m = R.advanceMarket(R.newMarket(), d);
  if (R.BASE_PRICE[a.product] > 0) assert.ok(R.priceFactor(m, 'hogeland', a.product, d, E.marketEventMult(a.product, d)) > R.priceFactor(m, 'hogeland', a.product, d) * 1.2);
  assert.ok(DAYS.filter((x) => E.auctionDay(x)).length < 40);
});
t('landbouwbeurs: vaste dagen (twee per veertien vanaf dag 10), 15% korting op machines, ook in de nazomer', () => {
  assert.equal(E.fairOn(9), null); assert.equal(E.fairOn(10).dayOfFair, 1); assert.equal(E.fairOn(11).dayOfFair, 2); assert.equal(E.fairOn(12), null); assert.ok(E.fairOn(24)); assert.ok(E.fairOn(66));
  assert.equal(E.fairPrice(10000, 10), 8500); assert.equal(E.fairPrice(10000, 12), 10000);
  assert.match(E.fairOn(10).text, /15% korting/);
});
t('buren-kibbelen: elke scene heeft keuzes zonder straf; de uitkomst is klein en vriendelijk', () => {
  const d = DAYS.find((x) => E.neighborScene(x, 'sp')); assert.ok(d);
  const sc = E.neighborScene(d, 'sp'); assert.ok(sc.choices.length >= 3);
  for (const s of E.NEIGHBOR_SCENES) { assert.ok(s.choices.length >= 3); for (const c of s.choices) { assert.ok(c.cost >= 0 && c.cost <= 50, `${s.id}/${c.id}`); const r = E.resolveNeighbor(s.id, c.id); assert.ok(r.ok && r.text.length > 10); } }
  assert.equal(E.resolveNeighbor('x', 'y').ok, false);
  assert.ok(E.NEIGHBOR_SCENES.every((s) => s.choices.some((c) => c.cost === 0)), 'elke scene heeft een gratis keuze');
});
t('trekkertrek: een gegevensdefinitie met klassen, inleg en prijzen; alleen op een feestdag', () => {
  const T = E.TRACTOR_PULL;
  assert.equal(T.id, 'trekkertrek'); assert.equal(T.classes.length, 2);
  for (const c of T.classes) { assert.ok(c.fee > 0 && c.prizes.length === 3); assert.ok(c.prizes[0] > c.prizes[1] && c.prizes[1] > c.prizes[2]); assert.ok(c.prizes[2] > c.fee * 0.5); }
  assert.equal(E.pullPrize('licht', 1), 250); assert.equal(E.pullPrize('licht', 4), 0); assert.equal(E.pullPrize('mars', 1), 0);
  assert.ok(T.coop.length > 20);
  const on = DAYS.find((d) => E.festivalOn('hogeland', d)), off = DAYS.find((d) => !E.festivalOn('hogeland', d));
  assert.equal(E.trekkertrekAvailable('hogeland', on), true); assert.equal(E.trekkertrekAvailable('hogeland', off), false);
});
t('eventsOn: meldt alleen wat in de streken van de speler speelt, en een begin één keer', () => {
  const ctx = { regions: ['hogeland'], seed: 'a' };
  const total = DAYS.flatMap((d) => E.eventsOn(d, ctx));
  assert.ok(total.length > 20); assert.ok(total.every((e) => e.scope !== 'region' || e.region === 'hogeland'));
  const dr = DAYS.filter((d) => E.eventsOn(d, ctx).some((e) => e.id === 'droogte')), firsts = DAYS.filter((d) => E.eventsOn(d, ctx).some((e) => e.id === 'droogte' && e.first));
  assert.ok(firsts.length < dr.length && firsts.length > 0);
  assert.deepEqual(E.eventsOn(5, {}).filter((e) => e.scope === 'region'), []);
  assert.deepEqual(E.eventsOn(NaN, ctx).filter((e) => e.scope === 'region'), []);
});
t('frequentie: een speler wordt niet doodgegooid: samen hoogstens zo\'n 45% van de dagen heeft een regionale gebeurtenis, de persoonlijke zijn zeldzaam', () => {
  const ctx = { regions: ['hogeland'], seed: 'a', audit: { qAvg: 50 } };
  const busy = DAYS.filter((d) => E.eventsOn(d, ctx).some((e) => e.scope === 'region' && ['droogte', 'stortbui', 'mierenplaag', 'wespen', 'staking'].includes(e.id))).length;
  assert.ok(busy / DAYS.length < 0.45, `${busy}`);
  const personal = DAYS.filter((d) => E.eventsOn(d, ctx).some((e) => e.scope === 'player')).length; assert.ok(personal < 25, `${personal}`);
});
t('constitution: alles Nederlands, altijd zomer, verzonnen namen, geen aardbeving, gaswinning, overval of geweld, geen echte merken', () => {
  const BAD = /winter|sneeuw|vorst|\bijs\b|ijzel|gladheid|kerst|aardbev|gaswinning|\bgas\b|overval|geweld|doodslag|dief|steel|inbraak|bloed|wapen|ADAC|Rabobank|Albert Heijn|Jumbo|LTO|Boerenbond|NAM\b/i;
  for (const s of E.ALL_TEXTS()) { assert.ok(typeof s === 'string' && s.length > 2, String(s)); assert.ok(!BAD.test(s), `verboden woord in: ${s}`); }
  for (const w of ['Inspectiedienst Noordrand', 'Bond Kassa Vrij Noord', 'Landbouwbeurs Noorderveld']) assert.ok(E.ALL_TEXTS().includes(w));
  const all = E.ALL_TEXTS().join(' '); assert.ok(!/\bde Grunn\b/.test(all));
  for (let d = 1; d <= 120; d++) for (const e of E.eventsOn(d, { regions: ['hogeland', 'oldambt'], seed: 'z', machines: [{ id: 'm', name: 'Trekker', wear: 95, price: 1e4 }], audit: { qAvg: 30 } })) assert.ok(!BAD.test(e.text + e.title), e.text);
});

console.log(`bezitevents_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
