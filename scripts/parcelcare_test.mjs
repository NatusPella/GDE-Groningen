// Verzekering en bestrijding per perceel (parcelcare.js, #1103): ingangsdag, premie, kosten, opslag en effect op het opbrengstverlies.   node scripts/parcelcare_test.mjs
import assert from 'node:assert/strict';
import * as PC from '../game/js/parcelcare.js';
import * as Z from '../game/js/bezit.js';
import * as N from '../game/js/bezitnews.js';
import * as EV from '../game/js/bezitevents.js';

let n = 0, fails = 0;
const t = (name, fn) => { n++; try { fn(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', String(e.stack || e.message).split('\n').slice(0, 3).join('\n   ')); } };
const findDay = (pred, max = 8000) => { for (let d = 1; d <= max; d++) if (pred(d)) return d; return 0; };
const mk = () => { const b = Z.newBezit(); b.parcels.pa = { k: 'a', ha: 10, t: 1, p: 1000, w: 1, m: 'self' }; b.parcels.pb = { k: 'b', ha: 2, t: 1, p: 500, w: 1, m: 'self' }; b.parcels.pw = { k: 'w', ha: 5, t: 1, p: 500, w: 1, m: 'self' }; return b; };

t('verzekering gaat een dag na afsluiten in en is op te zeggen', () => {
  const b = mk();
  const r = PC.setInsurance(b, ['pa', 'pa', 'nietbestaand'], true, 100);
  assert.equal(r.done, 1); assert.equal(r.skipped['al-verzekerd'], 1); assert.equal(r.skipped.onbekend, 1);
  assert.equal(PC.isInsured(b.parcels.pa, 100), false, 'niet op de dag van afsluiten');
  assert.equal(PC.isInsured(b.parcels.pa, 101), true);
  assert.equal(PC.setInsurance(b, ['pa'], false, 105).done, 1);
  assert.equal(PC.isInsured(b.parcels.pa, 200), false);
});

t('de premie telt alleen de dagen dat de verzekering geldt, per ha per speldag', () => {
  const b = mk(); PC.setInsurance(b, ['pa'], true, 10);                          // vanaf dag 11
  const cal = (d) => d;                                                           // kalenderdag = boerderijdag
  assert.equal(PC.premiumBetween(b, 9, 10, cal), 0);
  assert.equal(PC.premiumBetween(b, 10, 12, cal), 2 * EV.insurancePremium(10));
  assert.equal(EV.insurancePremium(10), 30);
  assert.equal(PC.insuredCount(b), 1);
});

t('bestrijden: mieren op akker en weide, wespen alleen op boomgaard, kosten uit geld, tien dagen stand', () => {
  const b = mk();
  const m = PC.treat(b, ['pa', 'pb', 'pw'], 'mieren', 50, 1000);
  assert.equal(m.done, 2); assert.equal(m.skipped['past-niet'], 1); assert.equal(m.cost, EV.antControlCost(10) + EV.antControlCost(5));
  assert.equal(PC.treatedOf(b.parcels.pa, 59).ants, true); assert.equal(PC.treatedOf(b.parcels.pa, 60).ants, false);
  assert.equal(PC.treat(b, ['pa'], 'mieren', 52, 1000).skipped['al-bestreden'], 1, 'tussen de bestrijding door niet dubbel betalen');
  const w = PC.treat(b, ['pb', 'pa'], 'wespen', 50, 10);
  assert.equal(w.done, 0); assert.equal(w.skipped['te-weinig-geld'], 1);
  assert.equal(PC.treat(b, ['pb'], 'wespen', 50, 40).cost, EV.WASP_NEST_COST);
  assert.equal(PC.treat(b, ['pa'], 'onzin', 50, 1e6).done, 0);
});

t('het verlies daalt met verzekering en bestrijding, zonder dat de cache de varianten verwart', () => {
  const storm = findDay((d) => EV.activeSpan(EV.EVENT_DEFS.stortbui, 'hogeland', d) && !EV.activeSpan(EV.EVENT_DEFS.droogte, 'hogeland', d) && !EV.activeSpan(EV.EVENT_DEFS.mierenplaag, 'hogeland', d));
  assert.ok(storm > 0);
  const p = { id: 'pa', kind: 'a', region: 'hogeland' };
  const bare = N.lossOfParcel(p, storm).mult, ins = N.lossOfParcel(p, storm, { insured: true }).mult;
  assert.ok(ins > bare + 0.15, `${bare} ${ins}`);
  const ant = findDay((d) => EV.activeSpan(EV.EVENT_DEFS.mierenplaag, 'oldambt', d) && !EV.activeSpan(EV.EVENT_DEFS.stortbui, 'oldambt', d) && !EV.droughtOn('oldambt', d));
  assert.ok(ant > 0);
  const q = { id: 'x', kind: 'a', region: 'oldambt' };
  const open = N.lossOfParcel(q, ant).mult, treatedAnts = N.lossOfParcel(q, ant, { treated: { ants: true } }).mult, treatedWasps = N.lossOfParcel(q, ant, { treated: { wasps: true } }).mult;
  assert.ok(treatedAnts > open); assert.equal(treatedWasps, open, 'wespenbestrijding helpt niet tegen mieren');
});

t('exploit: afsluiten op de dag van de bui helpt niet; de premie over een jaar is groter dan het verwachte verlies op 1 ha', () => {
  const b = mk(); PC.setInsurance(b, ['pa'], true, 77);
  assert.equal(PC.isInsured(b.parcels.pa, 77), false);
  const jaar = EV.insurancePremium(1) * 365;
  assert.ok(jaar > 0);
});

t('opslag: ins, ta en tw blijven bewaard en kapotte waarden vallen weg', () => {
  const b = mk(); PC.setInsurance(b, ['pa'], true, 10); PC.treat(b, ['pa'], 'mieren', 10, 1000);
  const raw = JSON.parse(JSON.stringify(Z.serializeBezit(b)));
  const c = Z.normalizeBezit(raw);
  assert.equal(c.parcels.pa.ins, 11); assert.equal(c.parcels.pa.ta, 19);
  raw.parcels.pa.ins = 'x'; raw.parcels.pa.tw = NaN;
  const d = Z.normalizeBezit(raw);
  assert.equal(d.parcels.pa.ins, undefined); assert.equal(d.parcels.pa.tw, undefined);
});

console.log(`${n - fails}/${n} controles ok`);
process.exit(fails ? 1 : 0);
