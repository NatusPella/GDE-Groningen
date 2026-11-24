// De balans van de snackwagen (scripts/bezit_sim.mjs snackProfile): de beste wagen verdient meer per speldag en per geïnvesteerde euro dan winkels en percelen, maar blijft
// binnen de remmen (compressOwn voor de eigen wagen, compressPassive voor medewerkers); Us Mem en sabotage kosten geld; geen exploit.   node scripts/snackbalans_test.mjs
import assert from 'node:assert/strict';
import * as Sim from './bezit_sim.mjs';
import * as SN from '../game/js/snackvan.js';
import * as SP from '../game/js/pitch.js';
import * as RV from '../game/js/rival.js';
import * as P from '../game/js/bezitprijs.js';

let n = 0, fails = 0;
const t = (name, fn) => { n++; try { fn(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', String(e.message).split('\n').slice(0, 2).join(' | ')); } };
const quiet = Sim.snackProfile({ days: 40, quiet: true }), live = Sim.snackProfile({ days: 40, quiet: false });

t('de ladder: elke stap verdient meer per speldag (start < mid < best < imperium)', () => {
  assert.ok(quiet.start.perDay < quiet.mid.perDay && quiet.mid.perDay < quiet.best.perDay && quiet.best.perDay < quiet.imperium.perDay, JSON.stringify(Object.values(quiet).map((v) => v.perDay)));
});
t('super goed betaald: de beste eigen wagen geeft per geïnvesteerde euro meer dan een winkel, pacht en huur', () => {
  assert.ok(quiet.best.roiPerDay > 0.015, String(quiet.best.roiPerDay));
  assert.ok(quiet.best.roiPerDay > Sim.BASELINE_ROI.huur && quiet.best.roiPerDay > 2 * Sim.BASELINE_ROI.winkel);
  assert.ok(quiet.start.roiPerDay > quiet.best.roiPerDay * 0.9);        // het begin is het voordeligst: de eerste plek en wagen zijn goedkoop (afnemende meeropbrengst)
});
t('de rem: de eigen wagen blijft onder twee maal wat actief werk per speldag oplevert', () => {
  for (const v of Object.values(quiet)) assert.ok(v.ownVsActive <= 2.0, JSON.stringify(v));
  assert.ok(quiet.best.ownC < SN.OWN_CAP_DAY);
});
t('de rem: wat de medewerkers verdienen blijft onder het plafond van drie maal actief (compressPassive), het imperium onder vier en een kwart', () => {
  assert.ok(quiet.imperium.passiveC < P.PASSIVE_CAP_DAY);
  assert.ok(quiet.imperium.vsActive < 4.25, String(quiet.imperium.vsActive));
  assert.ok(quiet.imperium.fleetDay > quiet.imperium.passiveC);        // de rem knijpt echt
});
t('besluit eigenaar 21-11: de eigen snackwagen levert ongeveer 2x actief werk (1,8 tot 2,2), een groot imperium ongeveer 4x (3,8 tot 4,2), op standaard', () => {
  assert.ok(quiet.best.ownVsActive >= 1.8 && quiet.best.ownVsActive <= 2.2, `eigen wagen ${quiet.best.ownVsActive}`);
  assert.ok(quiet.imperium.vsActive >= 3.8 && quiet.imperium.vsActive <= 4.2, `imperium ${quiet.imperium.vsActive}`);
  assert.ok(Sim.ACTIVE_PER_HOUR > 0);
});
t('de 3x-grens geldt voor het passieve inkomen buiten de snackwagen: wat medewerkers verdienen, na de rem, blijft binnen 3x actief', () => {
  assert.ok(quiet.imperium.passiveC <= P.PASSIVE_CAP_DAY + 1);
  assert.ok(Sim.passivePerHourAt(1000) <= 3 * Sim.ACTIVE_PER_HOUR + 1);
});
t('een medewerker-wagen levert minder dan jijzelf op dezelfde plek (zonder jou 85% en 15% aanvoerkosten, plus loon)', () => {
  const day = (own) => {
    const S = SN.newSnack(); S.rival.spots = []; S.rival.lastEvent = 1e7; S.rival.lastOffer = 1e7;
    S.permits.park = { until: 1e7, paid: 1 };
    if (own) { S.own.spot = 'park'; S.own.stockDays = 5; } else SN.buyFleetWagon(S, 'park', 1, 1e9);
    const r = SN.settleDay(S, { day: 9, weekend: true, money: 1e9, ownWagon: true, ownQ: 100, kermisAt: () => false, chainOwn: () => 0 });
    return own ? r.own.net : r.fleet[0].net;
  };
  assert.ok(day(false) < day(true) && day(false) > 0);
});
t('Us Mem en sabotage kosten geld, maar breken je niet (tussen 2% en 25% van de opbrengst)', () => {
  for (const id of ['mid', 'best', 'imperium']) {
    const ratio = live[id].perDay / quiet[id].perDay;
    assert.ok(ratio < 0.995 && ratio > 0.75, `${id} ${ratio}`);
  }
});
t('de eerste standplaats: de goedkoopste kost minder dan een eerste wagen; het beste plekje kost meer dan een derde van de hele wagen-investering', () => {
  assert.ok(SP.permitPrice('dorp') < 3000);
  assert.ok(SP.permitPrice('markt') > 8000 && SP.permitPrice('markt') < 15000);
  assert.ok(RV.askPrice('markt', 50) > 2 * SP.permitPrice('markt') * 0.9);       // Us Mem overnemen kost ruim het dubbele van een vrije plek
});
t('schaalprijs: de volgende vergunning en wagen worden duurder, begrensd op drie maal', () => {
  assert.ok(SP.permitPrice('park', 5) > SP.permitPrice('park', 0) * 1.7);
  assert.ok(SP.permitPrice('park', 100) <= SP.permitPrice('park', 0) * 3.01);
  assert.ok(SN.wagonPrice(10) <= 2 * SN.wagonPrice(0) + 1);
});
t('geen exploit: een wagen kopen en direct verkopen kost 40%, een upgrade is eenmalig, geld kan niet uit het niets ontstaan', () => {
  const S = SN.newSnack(); S.permits.dorp = { until: 1e6, paid: 1 };
  const b = SN.buyFleetWagon(S, 'dorp', 1, 1e9), s = SN.sellFleetWagon(S, 'w1');
  assert.ok(b.cost - s.refund >= 0.39 * b.cost);
  assert.equal(SN.buyUpgrade(S, 'pan', 1e9).ok, true); assert.equal(SN.buyUpgrade(S, 'pan', 1e9).ok, false);
  const rep = SN.settleDay(S, { day: 3, weekend: false, money: 0, ownWagon: false, ownQ: 100 });
  assert.ok(rep.fixed === 0 && rep.ownNet === 0);
});
t('een dag zonder voorraad is veel slechter dan met: actief beheer loont (de wagen die je zelf runt vraagt aanvullen)', () => {
  const net = (stock) => { const S = SN.newSnack(); S.rival.spots = []; S.rival.lastEvent = 1e7; S.rival.lastOffer = 1e7; S.permits.markt = { until: 1e7, paid: 1 }; S.own.spot = 'markt'; S.own.stockDays = stock; S.own.tier = 'groot'; return SN.settleDay(S, { day: 9, weekend: false, money: 1e9, ownWagon: true, ownQ: 100, kermisAt: () => false, chainOwn: () => 0 }).own.net; };
  assert.ok(net(0) < 0.25 * net(1));
});
t('de eigen keten maakt de wagen voordeliger, maar nooit meer dan een derde extra', () => {
  const net = (own) => { const S = SN.newSnack(); S.rival.spots = []; S.rival.lastEvent = 1e7; S.rival.lastOffer = 1e7; S.permits.markt = { until: 1e7, paid: 1 }; S.own.spot = 'markt'; S.own.stockDays = 5; S.own.tier = 'groot'; return SN.settleDay(S, { day: 9, weekend: false, money: 1e9, ownWagon: true, ownQ: 100, kermisAt: () => false, chainOwn: () => own }).own.net; };
  assert.ok(net(1) > net(0) * 1.03 && net(1) < net(0) * 1.33);
});
const campaign = (perDay) => {
  const S = SN.newSnack(); let money = 60000;
  for (let d = 2; d < 302; d++) {
    money += perDay;
    for (const id of SP.SPOT_IDS) { if (SP.permitHeld(S.permits, id, d) || money < 0) continue; const r = RV.holds(S.rival, id) ? SN.bidForSpot(S, id, d, money) : SN.buyPermit(S, id, d, money); if (r.ok) money -= r.cost; }
    const r = SN.settleDay(S, { day: d, weekend: false, money, ownWagon: false, ownQ: 100 }); money -= r.fixed;
    if (SN.pendingEvent(S)) SN.answerEvent(S, SN.pendingEvent(S).choices.find((c) => c.def).id, d, 0);
  }
  return SN.empireScore(S, 301);
};
t('Us Mem is te verslaan: met een gewone geldstroom (900 per speldag) neem je in 300 dagen de meeste plekken, met een goede wagen (1.800) ruim driekwart', () => {
  const a = campaign(900), b = campaign(1800);
  assert.ok(a.share >= 0.55 && a.share < 1, JSON.stringify(a));
  assert.ok(b.share >= 0.75 && b.score > a.score, JSON.stringify(b));
});
console.log(`snackbalans_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
