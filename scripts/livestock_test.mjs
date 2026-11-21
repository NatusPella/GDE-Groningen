// Vee op een perceel (#1101): aantallen per ha, voer, melk, eieren en wol, ziekte als invoer, de zichtbare kudde (hoogstens 12) en de opslag.
//   node scripts/livestock_test.mjs
// Schrijft nooit naar echte opslag: alles in het geheugen.
import assert from 'node:assert/strict';
import * as Z from '../game/js/bezit.js';
import * as L from '../game/js/livestock.js';

let n = 0, fails = 0;
const t = (name, fn) => { n++; try { fn(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', String(e.stack || e.message).split('\n').slice(0, 5).join('\n   ')); } };
const pid = (i) => 'p' + (0xabc000000000 + i * 7919).toString(16).padStart(12, '0');
const bezitMet = (...ps) => { const b = Z.newBezit(); ps.forEach(([k, ha], i) => { b.parcels[pid(i)] = { k, ha, t: 0, p: 3000, w: 0, m: 'self' }; }); return b; };

t('aantallen: melkvee 2,5 per ha, schapen 10 per ha, kippen een hok van 200', () => {
  assert.equal(L.capacityOf('melkvee', 4), 10); assert.equal(L.capacityOf('melkvee', 1), 2); assert.equal(L.capacityOf('melkvee', 0.3), 0);
  assert.equal(L.capacityOf('schapen', 1.6), 16); assert.equal(L.capacityOf('schapen', 0.05), 0);
  assert.equal(L.capacityOf('kippen', 0.3), 200); assert.equal(L.capacityOf('kippen', 50), 200, 'een hok, ook op een grote akker'); assert.equal(L.capacityOf('kippen', 0.1), 0);
  assert.equal(L.capacityOf('draak', 5), 0); assert.equal(L.capacityOf('melkvee', NaN), 0);
  assert.ok(L.canKeep('melkvee', 'w', 2) && !L.canKeep('melkvee', 'a', 2) && !L.canKeep('melkvee', 'b', 2));
  assert.ok(L.canKeep('kippen', 'w', 1) && !L.canKeep('kippen', 'a', 1) && !L.canKeep('kippen', 'b', 1));   // weide is voor vee, akker voor gewassen (eigenaar 21-11)
});

t('zichtbare kudde: hoogstens twaalf', () => {
  assert.equal(L.visibleAnimals(0), 0); assert.equal(L.visibleAnimals(5), 5); assert.equal(L.visibleAnimals(12), 12);
  assert.equal(L.visibleAnimals(13), 12); assert.equal(L.visibleAnimals(200), 12); assert.equal(L.visibleAnimals(-3), 0); assert.equal(L.visibleAnimals(NaN), 0);
  assert.equal(L.visibleAnimals(5000, 4), 4);
});

t('neerzetten: soort bij de grond, een kudde per perceel, hooguit de capaciteit', () => {
  const b = bezitMet(['w', 4], ['a', 3], ['b', 2]);
  assert.deepEqual(L.stockHerd(b, pid(0), 'melkvee'), { ok: true, n: 10 });
  assert.equal(L.stockHerd(b, pid(0), 'schapen').why, 'al-vee');
  assert.equal(L.stockHerd(b, pid(1), 'melkvee').why, 'past-niet');
  assert.equal(L.stockHerd(b, pid(1), 'kippen').why, 'past-niet');   // een akker is voor gewassen
  assert.equal(L.stockHerd(bezitMet(['w', 1]), pid(0), 'kippen', 500).n, 200, 'niet meer dan het hok');
  assert.equal(L.stockHerd(b, 'p000000000000', 'kippen').why, 'niet-van-jou');
  assert.equal(L.stockHerd(b, pid(0), 'draak').why, 'onbekende-soort');
  assert.ok(L.removeHerd(b, pid(0)) && !L.removeHerd(b, pid(0)));
});

t('melkvee op eigen gras: melk per dag, geen voerkosten, minder zonder melkrobot', () => {
  const herd = { sp: 'melkvee', n: 10, sick: 0 };
  const zonder = L.herdDayTick({ ...herd }, { kind: 'w', ha: 4 });
  assert.equal(zonder.feedCost, 0); assert.deepEqual(zonder.hayUsed, {}); assert.equal(zonder.fed, 1);
  const met = L.herdDayTick({ ...herd }, { kind: 'w', ha: 4, robot: true });
  assert.equal(met.products.melk, 220);
  assert.equal(zonder.products.melk, Math.round(220 * L.ROBOT_FACTOR));
  assert.equal(met.value, Math.round(220 * L.PRODUCT_PRICE.melk));
});

t('voer: eerst de wei, dan hooi uit de opslag, dan bijkopen; zonder bijkopen daalt de melk', () => {
  const herd = () => ({ sp: 'melkvee', n: 10, sick: 0 });       // 180 kg per dag
  const kaal = L.herdDayTick(herd(), { kind: 'a', ha: 4, hay: { hooi: 100 }, robot: true });   // geen wei: een akker
  assert.equal(kaal.hayUsed.hooi, 100); assert.ok(kaal.feedCost > 0);
  assert.ok(Math.abs(kaal.feedCost - 80 * L.FEED_PRICE.hooi) < 0.01);
  const arm = L.herdDayTick(herd(), { kind: 'w', ha: 0.5, hay: { gras: 60 }, robot: true });     // 45 van de wei, 60 gras, 75 tekort
  assert.equal(arm.hayUsed.gras, 60); assert.ok(arm.feedCost > 0);
  const honger = L.herdDayTick(herd(), { kind: 'w', ha: 0.5, buy: false, robot: true });
  assert.ok(honger.fed > 0.2 && honger.fed < 0.3, `gevoerd: ${honger.fed}`);
  assert.ok(honger.products.melk < 60 && honger.feedCost === 0);
  const vol = L.herdDayTick(herd(), { kind: 'w', ha: 4, robot: true });
  assert.ok(vol.products.melk > honger.products.melk * 3);
});

t('schapen geven wol en kippen eieren, met graan als voer', () => {
  const s = L.herdDayTick({ sp: 'schapen', n: 20, sick: 0 }, { kind: 'w', ha: 2 });
  assert.equal(s.products.wol, 2.4); assert.equal(s.feedCost, 0);
  const k = L.herdDayTick({ sp: 'kippen', n: 200, sick: 0 }, { kind: 'w', ha: 1, hay: { graan: 24 } });
  assert.equal(k.products.eieren, 160); assert.equal(k.hayUsed.graan, 24); assert.equal(k.feedCost, 0);
  const k2 = L.herdDayTick({ sp: 'kippen', n: 200, sick: 0 }, { kind: 'w', ha: 1 });
  assert.ok(Math.abs(k2.feedCost - 24 * L.FEED_PRICE.graan) < 0.01, 'graan bijkopen');
  assert.equal(L.herdDayTick({ sp: 'kippen', n: 200, sick: 0 }, { kind: 'w', ha: 9 }).hayUsed.graan, undefined, 'kippen grazen niet van de wei');
});

t('ziekte: de aanroeper voert het in, een kwart opbrengst, loopt af, de dierenarts kost geld', () => {
  const h = { sp: 'melkvee', n: 10, sick: 0 };
  assert.equal(L.cure(h).why, 'niet-ziek');
  assert.ok(L.infect(h)); assert.equal(L.infect(h), false, 'al ziek');
  const ziek = L.herdDayTick(h, { kind: 'w', ha: 4, robot: true });
  assert.equal(ziek.sick, true); assert.equal(ziek.products.melk, Math.round(220 * L.SICK_FACTOR));
  assert.equal(h.sick, L.SICK_DAYS - 1);
  L.herdDayTick(h, { kind: 'w', ha: 4 }); L.herdDayTick(h, { kind: 'w', ha: 4 });
  assert.equal(h.sick, 0, 'na drie dagen beter');
  assert.equal(L.herdDayTick(h, { kind: 'w', ha: 4, robot: true }).products.melk, 220);
  L.infect(h);
  const arm = L.cure(h, 10); assert.equal(arm.ok, false); assert.equal(arm.why, 'te-weinig-geld'); assert.ok(h.sick > 0);
  const ok = L.cure(h, 1e6); assert.ok(ok.ok && ok.cost === L.vetCost(h) && h.sick === 0);
  assert.ok(L.vetCost({ n: 200 }) > L.vetCost({ n: 10 }));
});

t('dagtik van het bezit: producten, voer uit de opslag verdeeld, een verkocht perceel neemt de kudde mee, deterministisch', () => {
  const b = bezitMet(['w', 4], ['w', 1.6], ['w', 2]);
  L.stockHerd(b, pid(0), 'melkvee'); L.stockHerd(b, pid(1), 'schapen'); L.stockHerd(b, pid(2), 'kippen');
  const r = L.livestockDayTick(b, { robot: true, hay: { graan: 30 } });
  assert.equal(r.herds, 3); assert.equal(r.products.melk, 220); assert.equal(r.products.wol, 1.92); assert.equal(r.products.eieren, 160);
  assert.equal(r.hayUsed.graan, 24); assert.equal(r.feedCost, 0);
  assert.equal(r.value, Math.round(220 * 0.45 + 1.92 * 2.4 + 160 * 0.2));
  assert.deepEqual(L.livestockDayTick(b, { robot: true, hay: { graan: 30 } }), r, 'dezelfde stand, hetzelfde rapport');
  delete b.parcels[pid(1)];
  assert.equal(L.livestockDayTick(b, {}).herds, 2); assert.ok(!L.herdsOf(b)[pid(1)]);
  assert.equal(L.sellValue({ melk: 100, eieren: 10, onbekend: 5 }), 47);
});

t('opslag: de kuddes overleven normaliseren, kapotte opslag geeft niets', () => {
  const b = bezitMet(['w', 4]);
  L.stockHerd(b, pid(0), 'melkvee'); L.infect(L.herdsOf(b)[pid(0)]);
  const terug = Z.normalizeBezit(JSON.parse(JSON.stringify(Z.serializeBezit(b))));
  assert.deepEqual(L.herdsOf(terug), { [pid(0)]: { sp: 'melkvee', n: 10, sick: L.SICK_DAYS } });
  for (const slecht of [null, 3, 'x', [], { a: null, b: { sp: 'draak', n: 5 }, c: { sp: 'schapen', n: -5 }, d: { sp: 'schapen', n: 1e9, sick: 'x' } }]) {
    const h = L.normalizeHerds(slecht);
    for (const v of Object.values(h)) assert.ok(L.SPECIES[v.sp] && v.n > 0 && v.n <= L.MAX_HERD && v.sick >= 0);
  }
  assert.deepEqual(L.normalizeHerds({ x1: { sp: 'melkvee', n: 3 } }, () => false), {}, 'een ongeldig id valt weg');
});

t('1000 kuddes: een dagtik blijft snel', () => {
  const b = Z.newBezit();
  for (let i = 0; i < 1000; i++) { b.parcels[pid(i)] = { k: 'w', ha: 3, t: 0, p: 3000, w: 0, m: 'self' }; L.stockHerd(b, pid(i), i % 2 ? 'melkvee' : 'schapen'); }
  const t0 = process.hrtime.bigint();
  const r = L.livestockDayTick(b, { hay: { hooi: 1e6 } });
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  assert.equal(r.herds, 1000); assert.ok(ms < 20, `${ms} ms`);
});

console.log(`livestock_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
