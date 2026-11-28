// De kudde van de hoeve en de dagelijkse verzorging (#1373, audit B8): twaalf koeien op vijf hectare, een klus per soort per speldag, melken telt als de melkrobot,
// voeren scheelt bijgekocht voer, geen klus is geen straf, en de klus staat in de opslag van de speler.   node scripts/herdchores_test.mjs
// Schrijft nooit naar echte opslag: de opslag is een nepobject.
import './node3d.mjs';
import assert from 'node:assert/strict';
import * as K from '../game/js/herdchores.js';
import * as Z from '../game/js/bezit.js';
import * as PC from '../game/js/percelen.js';
import * as B from '../game/js/boerderij.js';
import * as H from '../game/js/holdingsmodel.js';
import { herdsOf, herdDayTick, livestockDayTick, capacityOf, SPECIES, ROBOT_FACTOR, KLUS_VOER_BONUS } from '../game/js/livestock.js';

let n = 0, fails = 0;
const t = (name, fn) => { n++; try { fn(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', String(e.message).split('\n')[0]); } };
const metHoeve = () => {
  const farm = B.nieuweBoerderij(); PC.schenk(farm.bedrijf);
  const bezit = Z.newBezit();
  assert.ok(K.zetHoeveKudde(bezit, farm.bedrijf).ok);
  return { farm, bezit };
};

t('de kudde past op de weide: twaalf koeien op vijf hectare (en veertig niet)', () => {
  assert.equal(PC.perceelDef(K.HOEVE_WEI).ha, 5);
  assert.equal(capacityOf('melkvee', 5), 12);
  assert.equal(K.HOEVE_KUDDE.n, capacityOf('melkvee', PC.perceelDef(K.HOEVE_WEI).ha));
  assert.ok(capacityOf('melkvee', 5) < 40, 'veertig koeien vragen zestien hectare');
  const { bezit } = metHoeve();
  assert.deepEqual({ ...herdsOf(bezit)[K.HOEVE_WEI] }, { sp: 'melkvee', n: 12, sick: 0 });
  assert.equal(K.zetHoeveKudde(bezit, B.nieuweBoerderij().bedrijf).ok, false, 'een tweede keer doet niets');
});

t('zonder de schenking is er geen kudde en geen perceel in het bezit', () => {
  const bezit = Z.newBezit();
  assert.equal(K.zetHoeveKudde(bezit, B.nieuweBoerderij().bedrijf).ok, false);
  assert.ok(!Object.keys(bezit.parcels).some((id) => PC.SCHENK_PERCEEL_IDS.includes(id)));
});

t('een klus per soort per speldag; een nieuwe dag mag weer', () => {
  const { bezit } = metHoeve();
  assert.deepEqual(K.klusAanbod(bezit, K.HOEVE_WEI, 5).map((k) => [k.id, k.gedaan]), [['voeren', false], ['melken', false]]);
  const r = K.doeKlus(bezit, K.HOEVE_WEI, 'melken', 5);
  assert.ok(r.ok && r.xp > 0);
  assert.equal(K.doeKlus(bezit, K.HOEVE_WEI, 'melken', 5).why, 'al-gedaan');
  assert.ok(K.doeKlus(bezit, K.HOEVE_WEI, 'voeren', 5).ok, 'voeren is een andere klus');
  assert.deepEqual(K.klusStand(bezit, K.HOEVE_WEI, 5), { voeren: true, melken: true });
  assert.deepEqual(K.klusStand(bezit, K.HOEVE_WEI, 6), { voeren: false, melken: false });
  assert.ok(K.doeKlus(bezit, K.HOEVE_WEI, 'melken', 6).ok);
  assert.equal(K.doeKlus(bezit, 'nergens', 'melken', 6).why, 'geen-kudde');
  assert.equal(K.doeKlus(bezit, K.HOEVE_WEI, 'wassen', 6).why, 'onbekende-klus');
});

t('melken kan alleen bij melkvee', () => {
  const { farm, bezit } = metHoeve();
  herdsOf(bezit)[K.HOEVE_WEI] = { sp: 'schapen', n: 50, sick: 0 };
  assert.equal(K.doeKlus(bezit, K.HOEVE_WEI, 'melken', 1).why, 'past-niet');
  assert.deepEqual(K.klusAanbod(bezit, K.HOEVE_WEI, 1).map((k) => k.id), ['voeren']);
  assert.ok(farm);
});

t('melken telt als de melkrobot en voeren geeft vijf procent meer', () => {
  const herd = () => ({ sp: 'melkvee', n: 12, sick: 0 });
  const zonder = herdDayTick(herd(), { kind: 'w', ha: 5 });
  const molk = herdDayTick(herd(), { kind: 'w', ha: 5, klus: { melken: true } });
  const robot = herdDayTick(herd(), { kind: 'w', ha: 5, robot: true });
  assert.equal(molk.products.melk, robot.products.melk);
  assert.ok(molk.products.melk > zonder.products.melk);
  assert.ok(Math.abs(zonder.products.melk / molk.products.melk - ROBOT_FACTOR) < 0.01);
  const voer = herdDayTick(herd(), { kind: 'w', ha: 5, klus: { voeren: true } });
  assert.ok(Math.abs(voer.products.melk / zonder.products.melk - KLUS_VOER_BONUS) < 0.02, 'voeren geeft 5% meer');
  assert.equal(voer.feedCost, 0, 'twaalf koeien eten de weide niet leeg: geen bijgekocht voer');
  assert.equal(SPECIES.melkvee.product, 'melk');
});

t('geen klus is geen straf: de kudde leeft gewoon door en de uitkomst is gelijk aan die van voor de klus bestond', () => {
  const { bezit } = metHoeve();
  const a = livestockDayTick(bezit, { hay: {} });
  const b = livestockDayTick(bezit, { hay: {}, klus: () => null });
  assert.deepEqual(a.products, b.products); assert.equal(a.feedCost, b.feedCost);
  assert.equal(K.klusVan(bezit, 5), null);
});

t('de klus van gisteren of vandaag telt in de dagverwerking, die van eergisteren niet', () => {
  const { bezit } = metHoeve();
  K.doeKlus(bezit, K.HOEVE_WEI, 'melken', 10);
  assert.equal(K.klusVan(bezit, 11)(K.HOEVE_WEI).melken, true);
  assert.equal(K.klusVan(bezit, 10)(K.HOEVE_WEI).melken, true);
  assert.equal(K.klusVan(bezit, 12), null);
});

t('advanceDays: met melken meer melk in een dag dan zonder, en alleen de eerste verwerkte dag', () => {
  const run = (klus) => {
    const { farm, bezit } = metHoeve();
    bezit.x.lastDay = 10;
    if (klus) K.doeKlus(bezit, K.HOEVE_WEI, 'melken', 10);
    return H.advanceDays(bezit, farm, 12, { money: 1e6, deliver: 'sell' }).livestock.products.melk;
  };
  const met = run(true), zonder = run(false);
  assert.ok(met > zonder, `${met} > ${zonder}`);
  // de eerste dag (11) krijgt het voordeel, de tweede (12) niet: het verschil is een dag, niet twee
  const dag = SPECIES.melkvee.perDag * 12;
  assert.ok(Math.abs((met - zonder) - dag * (1 - ROBOT_FACTOR)) <= 1.5, `verschil ${met - zonder}`);
});

t('de opslag: de klus overleeft bewaren en laden, rommel wordt opgeruimd en een oude opslag zonder veld laadt gewoon', () => {
  const { bezit } = metHoeve();
  K.doeKlus(bezit, K.HOEVE_WEI, 'voeren', 7);
  const terug = Z.normalizeBezit(JSON.parse(JSON.stringify(Z.serializeBezit(bezit))));
  assert.deepEqual(K.klusStand(terug, K.HOEVE_WEI, 7), { voeren: true, melken: false });
  terug.x.dierklus = { dag: 'x', gedaan: { 'a b': 3, ok: 9, goed: 2, [K.HOEVE_WEI]: 3 } };
  assert.deepEqual(K.klusStand(terug, 'goed', 0), { voeren: false, melken: false });
  assert.equal(K.klusVan(terug, 1), null, 'een kapotte dag telt niet');
  const oud = Z.normalizeBezit({ v: 1, parcels: {} });
  assert.deepEqual(K.klusStand(oud, 'x', 3), { voeren: false, melken: false });
});

console.log(`herdchores_test: ${n - fails}/${n}`);
process.exit(fails ? 1 : 0);
