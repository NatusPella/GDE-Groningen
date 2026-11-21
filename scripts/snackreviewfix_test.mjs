// Reviewbevindingen 22-11 (gameplay): vergunningen verlengen met een lopend saldo, een geschonken wagen is geen geldbron, een bod aannemen na een vervallen vergunning.   node scripts/snackreviewfix_test.mjs
// Schrijft nooit naar echte opslag: de opslag is een nepobject.
import assert from 'node:assert/strict';
import * as L from '../game/js/bezitlive.js';
import * as BL from '../game/js/boerderijlive.js';
import * as BZ from '../game/js/business.js';
import { newBezit, normalizeBezit, serializeBezit } from '../game/js/bezit.js';
import * as SN from '../game/js/snackvan.js';
import * as SP from '../game/js/pitch.js';
import * as RV from '../game/js/rival.js';

let n = 0, fails = 0;
const t = (name, fn) => { n++; try { fn(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', String(e.stack || e.message).split('\n').slice(0, 3).join(' | ')); } };
const nepOpslag = () => { const m = new Map(); return { m, getItem: (k) => (m.has(k) ? m.get(k) : null), setItem(k, v) { m.set(k, String(v)); }, removeItem: (k) => m.delete(k) }; };
const quiet = (S) => { S.rival.spots = []; S.rival.mood = 5; S.rival.lastEvent = 1e6; S.rival.lastOffer = 1e6; return S; };

t('verlengen over meerdere dagen: het saldo loopt mee, de som aan verlengingen is nooit meer dan het geld', () => {
  const S = quiet(SN.newSnack());
  const ids = ['markt', 'martini', 'station'];
  ids.forEach((id, i) => { S.permits[id] = { until: i + 1, paid: SP.permitPrice(id, 0) }; });
  const cost = SP.renewalCost('markt', 3), money = Math.round(cost * 1.2);
  const { sum } = SN.settleDays(S, 0, 6, (d) => ({ day: d, money, ownWagon: false }));
  assert.ok(sum.fixed <= money, `verlengd voor ${sum.fixed} met ${money} in kas`);
  assert.ok(ids.filter((id) => S.permits[id] && S.permits[id].until >= 6).length <= 1, 'hoogstens een vergunning verlengd');
});
t('een geschonken wagen is geen geldbron: verkopen levert niets op, ook na opslaan en laden', () => {
  const store = nepOpslag(); L.initBezit({ opslag: store }); BL.initBoerderij({ opslag: store });
  assert.equal(L.schenkMobiel(), true);
  const b = L.getBezit();
  const geladen = normalizeBezit(JSON.parse(JSON.stringify(serializeBezit(b))));
  assert.equal(geladen.mobile.frietwagen.gift, true);
  assert.equal(BZ.sellMobile(geladen, 'frietwagen').refund, 0);
  const koop = newBezit(); assert.equal(BZ.buyMobile(koop, 'frietwagen', 1, 1e6).ok, true);
  assert.equal(BZ.sellMobile(normalizeBezit(JSON.parse(JSON.stringify(serializeBezit(koop)))), 'frietwagen').refund, 5625);      // een gekochte wagen blijft 75% opleveren
});
t('een bod aannemen na een vervallen vergunning: geen weigering, het aanbod blijft staan', () => {
  const S = quiet(SN.newSnack()); S.own.spot = null;
  S.ev.pending = { kind: 'bod', id: 3, wagon: 'own', spot: 'park', depth: 0, price: 9000, text: 'Bod', choices: RV.CHOICES.bod, day: 40, deadline: 43 };
  const r = SN.answerEvent(S, 'verkoop', 41, 0);
  assert.equal(r.ok, false); assert.equal(r.why, 'onbekend');
  assert.equal(S.stats.refused, 0); assert.equal(S.rep, 50); assert.ok(S.ev.pending);
});
console.log(fails ? `${fails} van ${n} gefaald` : `ok: ${n} tests`);
process.exit(fails ? 1 : 0);
