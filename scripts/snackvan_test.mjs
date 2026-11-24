// De snackwagen (snackvan.js): toestand en opslag, menu, een dag, voorraad, naam, gebeurtenissen en antwoorden, acties, doelen en de score.   node scripts/snackvan_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as SN from '../game/js/snackvan.js';
import * as SP from '../game/js/pitch.js';
import * as RV from '../game/js/rival.js';

let n = 0, fails = 0;
const t = (name, fn) => { n++; try { fn(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', String(e.stack || e.message).split('\n').slice(0, 3).join(' | ')); } };
const wk = (cd) => { const wd = (cd + 4) % 7; return wd === 6 || wd === 0; };
const ctx = (day, o = {}) => ({ day, weekend: wk(day), money: 1e9, ownWagon: true, ownQ: 100, kermisAt: () => false, chainOwn: () => 0, ...o });
const give = (S, ids, until = 1e6) => { for (const id of ids) S.permits[id] = { until, paid: SP.permitPrice(id, 0) }; };
const quiet = (S) => { S.rival.spots = []; S.rival.mood = 5; S.rival.lastEvent = 1e6; S.rival.lastOffer = 1e6; return S; };      // geen concurrent die ingrijpt

t('een nieuwe toestand: leeg, niet actief, wagen zonder plek, menu van vier, naam 50, Us Mem op zijn startplekken', () => {
  const S = SN.newSnack();
  assert.ok(!SN.isActive(S) && S.own.spot === null && S.own.menu.length === 4 && S.rep === 50);
  assert.deepEqual(S.rival.spots, RV.OPENING_SPOTS);
});
t('normalizeSnack: rommel, onbekende plekken en menu-items worden gezuiverd, de rest blijft', () => {
  const S = SN.newSnack(); give(S, ['dorp']); S.up = ['koeling']; S.own.spot = 'dorp'; S.own.menu = ['friet', 'burger', 'softy']; S.fleet.push({ id: 'w1', spot: 'dorp', tier: 'groot', mode: 'aandeel', staff: { id: 'a', name: 'Marit', skill: 55 }, paid: 12000, wageUp: 20 });
  const back = SN.normalizeSnack(JSON.parse(JSON.stringify(S)));
  assert.deepEqual(back.permits, S.permits); assert.deepEqual(back.own.menu, ['friet', 'burger', 'softy']); assert.equal(back.fleet[0].mode, 'aandeel'); assert.equal(back.fleet[0].wageUp, 20);
  const bad = SN.normalizeSnack({ permits: { zzz: { until: 1 }, dorp: { until: 5 } }, up: ['x', 'pan', 'pan'], rep: 999, own: { spot: 'zzz', tier: 'mega', hours: 99, pr: 9, menu: ['burger', 'friet'] }, fleet: [{ id: 'x1' }, { id: 'w2', spot: 'leek' }, null], ev: { pending: { kind: 'zzz' } } });
  assert.deepEqual(Object.keys(bad.permits), ['dorp']); assert.deepEqual(bad.up, ['pan']); assert.equal(bad.rep, 100); assert.equal(bad.own.spot, null); assert.equal(bad.own.tier, 'klein');
  assert.equal(bad.own.hours, 14); assert.equal(bad.own.pr, 1.4); assert.deepEqual(bad.own.menu, ['friet']);      // burger vraagt koeling
  assert.equal(bad.fleet.length, 1); assert.equal(bad.ev.pending, null);
  assert.ok(SN.normalizeSnack(null).own.menu.length === 4);
  assert.ok(JSON.stringify(S).length < 3000);
});
t('menu: slots per wagen, koeling opent burger, milkshake en softy; nooit een leeg menu', () => {
  const S = SN.newSnack();
  assert.equal(SN.toggleOffering(S, 'burger').why, 'dicht');
  assert.equal(SN.toggleOffering(S, 'souffle').why, 'vol');
  assert.equal(SN.buyUpgrade(S, 'koeling', 1e9).ok, true);
  assert.equal(SN.upgradeTier(S, 'own', 1e9).tier, 'groot');
  assert.ok(SN.toggleOffering(S, 'burger').ok && SN.toggleOffering(S, 'milkshake').ok);
  assert.equal(S.own.menu.length, 6); assert.equal(SN.toggleOffering(S, 'softy').why, 'vol');
  for (const id of ['milkshake', 'burger', 'friet', 'frikandel', 'kroket']) SN.toggleOffering(S, id);
  assert.equal(S.own.menu.length, 1); assert.equal(SN.toggleOffering(S, 'bamischijf').why, 'leeg'); assert.equal(SN.toggleOffering(S, 'souffle').ok, true);
  assert.equal(SN.setOfferings(S, []).ok, false); assert.equal(SN.setOfferings(S, ['x']).why, 'leeg');
});
t('menu-cijfers: een eigen keten maakt het inkopen goedkoper, sauzen en variatie brengen meer, koeling scheelt bederf', () => {
  const m = ['friet', 'frikandel', 'kroket', 'bamischijf'];
  const a = SN.offeringNumbers(m, [], () => 0), b = SN.offeringNumbers(m, [], () => 1), c = SN.offeringNumbers(m, ['sauzen', 'koeling'], () => 0);
  assert.ok(b.cogs < a.cogs * 0.9 && b.localAppeal > a.localAppeal);
  assert.ok(Math.abs(c.ticket - a.ticket - 0.6) < 1e-9 && c.cogs < a.cogs);
  assert.ok(SN.offeringNumbers([...m, 'burger', 'milkshake', 'softy', 'souffle'], ['koeling'], () => 0).variety === 1.08);
  assert.ok(a.ticket / a.cogs > 3);
});
t('een dag: zonder plek of vergunning geen omzet, met een plek een winst; voorraad telt af', () => {
  const S = quiet(SN.newSnack());
  const r0 = SN.settleDay(S, ctx(5));
  assert.equal(r0.own, null); assert.equal(r0.ownNet, 0);
  give(S, ['markt']); S.own.spot = 'markt'; S.own.stockDays = 2;
  const r = SN.settleDay(S, ctx(6));
  assert.ok(r.own.revenue > 500 && r.own.net > 200 && r.own.sold > 100 && r.own.stocked);
  assert.equal(S.own.stockDays, 1); assert.equal(S.lastDay, 6); assert.equal(r.ownQ, 99.5);
  assert.ok(r.usage.friet > 10 && r.usage.vlees > 0);
});
t('zonder voorraad verkoop je bijna niets, je naam lijdt en het zegt waarom; restock herstelt het', () => {
  const S = quiet(SN.newSnack()); give(S, ['markt']); S.own.spot = 'markt'; S.own.stockDays = 0;
  const r = SN.settleDay(S, ctx(6));
  assert.ok(!r.own.stocked && r.own.sold < 30 && /voorraad/i.test(r.own.note) && r.empty && S.rep < 50);
  assert.equal(SN.restock(S, 10).why, 'te-weinig-geld');
  assert.deepEqual(SN.restock(S, 100), { ok: true, cost: SN.RESTOCK_FEE }); assert.equal(S.own.stockDays, 5);
  assert.equal(SN.restock(S, 100).why, 'vol');
  const r2 = SN.settleDay(S, ctx(7)); assert.ok(r2.own.stocked && r2.own.net > r.own.net);
});
t('een wagen die je niet hebt (ownWagon false) draait niet; een verlopen vergunning haalt de wagen van de plek', () => {
  const S = quiet(SN.newSnack()); give(S, ['markt'], 10); S.own.spot = 'markt'; S.own.stockDays = 5;
  assert.equal(SN.settleDay(S, ctx(5, { ownWagon: false })).own, null);
  const r = SN.settleDay(S, ctx(11, { money: 0 }));
  assert.equal(S.own.spot, null); assert.ok(r.lines.some((l) => /verlopen/.test(l)));
});
t('verlengen kost een kwart en komt in fixed', () => {
  const S = quiet(SN.newSnack()); give(S, ['markt'], 10); S.own.spot = 'markt'; S.own.stockDays = 5;
  const r = SN.settleDay(S, ctx(11));
  assert.ok(r.fixed > 0 && r.fixed < SP.permitPrice('markt')); assert.equal(S.permits.markt.until, 50);
});
t('een medewerker-wagen: loon of aandeel, passief en minder dan jij; hij heeft geen voorraadzorg', () => {
  const S = quiet(SN.newSnack()); give(S, ['markt', 'park']); S.own.spot = 'markt'; S.own.stockDays = 5;
  const b = SN.buyFleetWagon(S, 'park', 3, 1e9);
  assert.ok(b.ok && b.cost === 12000 && S.fleet[0].staff.name && S.fleet[0].id === 'w1');
  const r = SN.settleDay(S, ctx(6));
  assert.equal(r.fleet.length, 1); const w = r.fleet[0];
  assert.ok(w.wage >= 100 && w.wage <= 160 && w.net > 0 && r.fleetNet === w.net);
  SN.setFleetMode(S, 'w1', 'aandeel');
  const r2 = SN.settleDay(S, ctx(7)); const w2 = r2.fleet[0];
  assert.ok(w2.wage > 0 && Math.abs(w2.wage - 0.3 * (w2.revenue - w2.cogs - w2.opex)) <= 1);
  assert.equal(SN.setFleetMode(S, 'w9', 'loon').ok, false);
});
t('wagens kopen: vergunning nodig, plek vrij, schaalprijs per wagen, vol bij elf, verkopen geeft 60% terug', () => {
  const S = quiet(SN.newSnack());
  assert.equal(SN.buyFleetWagon(S, 'park', 3, 1e9).why, 'geen-vergunning');
  give(S, ['park', 'dorp']); S.own.spot = 'dorp';
  assert.equal(SN.buyFleetWagon(S, 'dorp', 3, 1e9).why, 'bezet');
  assert.equal(SN.buyFleetWagon(S, 'park', 3, 100).why, 'te-weinig-geld');
  assert.ok(SN.buyFleetWagon(S, 'park', 3, 1e9).ok);
  assert.equal(SN.wagonPrice(0), 12000); assert.equal(SN.wagonPrice(1), 13200); assert.equal(SN.wagonPrice(10), 24000);
  assert.equal(SN.sellFleetWagon(S, 'w1').refund, 7200);
  assert.equal(SN.sellFleetWagon(S, 'w1').ok, false);
  assert.ok(SN.MAX_FLEET <= 11);
});
t('verplaatsen: de eigen wagen kiest een vrije plek, een vloot-wagen vraagt een vergunning en de verhuiskosten', () => {
  const S = quiet(SN.newSnack()); give(S, ['markt', 'park', 'dorp']);
  assert.ok(SN.setOwn(S, { spot: 'markt' }).ok);
  SN.buyFleetWagon(S, 'park', 3, 1e9);
  assert.equal(SN.setOwn(S, { spot: 'park' }).why, 'bezet'); assert.equal(SN.setOwn(S, { spot: 'zzz' }).why, 'onbekend');
  assert.equal(SN.moveFleetWagon(S, 'w1', 'leek', 3, 1e9).why, 'geen-vergunning');
  assert.equal(SN.moveFleetWagon(S, 'w1', 'markt', 3, 1e9).why, 'bezet');
  assert.deepEqual(SN.moveFleetWagon(S, 'w1', 'dorp', 3, 1e9), { ok: true, cost: SN.MOVE_FEE }); assert.equal(S.fleet[0].spot, 'dorp');
  SN.setOwn(S, { hours: 99, pr: 0.1, from: 30 }); assert.deepEqual([S.own.hours, S.own.pr, S.own.from], [14, 0.7, 23]);
});
t('upgrades: eenmalig, bedrijfsbreed; pan geeft capaciteit; wagen groter in drie stappen', () => {
  const S = quiet(SN.newSnack());
  assert.equal(SN.buyUpgrade(S, 'pan', 10).why, 'te-weinig-geld');
  assert.equal(SN.buyUpgrade(S, 'pan', 1e9).cost, 4000); assert.equal(SN.buyUpgrade(S, 'pan', 1e9).why, 'al-van-jou');
  assert.equal(SN.upgradeTier(S, 'own', 1e9).cost, 12000); assert.equal(SN.upgradeTier(S, 'own', 1e9).cost, 24000);
  assert.equal(SN.upgradeTier(S, 'own', 1e9).why, 'al-het-grootst'); assert.equal(SN.upgradeTier(S, 'nee', 1e9).why, 'onbekend');
  assert.equal(SN.buyUpgrade(S, 'zzz', 1e9).why, 'onbekend');
});
t('een grotere wagen verkoopt meer op een drukke plek (de rij schaalt mee)', () => {
  const a = quiet(SN.newSnack()), b = quiet(SN.newSnack());
  for (const S of [a, b]) { give(S, ['markt']); S.own.spot = 'markt'; S.own.stockDays = 5; }
  b.own.tier = 'groot';
  const ra = SN.settleDay(a, ctx(9)), rb = SN.settleDay(b, ctx(9));
  assert.ok(rb.own.sold > ra.own.sold * 1.3 && rb.own.net > ra.own.net);
  assert.ok(ra.own.unserved > 0);
});
t('de prijs: rond het optimum is het het best, ver erboven of eronder verlies je omzet; opening buiten de drukte kost klanten', () => {
  const net = (pr, from = 11, hours = 10) => { const S = quiet(SN.newSnack()); give(S, ['markt']); S.own.spot = 'markt'; S.own.stockDays = 5; S.own.tier = 'groot'; S.own.pr = pr; S.own.from = from; S.own.hours = hours; return SN.settleDay(S, ctx(9)).own.net; };
  assert.ok(net(1) > net(1.4) && net(1) > net(0.7));
  assert.ok(net(1, 11) > net(1, 2));
  assert.ok(net(1, 11, 10) > net(1, 11, 4));
});
t('naam: goede dagen bouwen op, begrensd op 100; de reputatiefactor loopt van 0,8 tot 1,2', () => {
  const S = quiet(SN.newSnack()); give(S, ['markt']); S.own.spot = 'markt';
  for (let d = 2; d < 120; d++) { S.own.stockDays = 5; SN.settleDay(S, ctx(d)); }
  assert.ok(S.rep > 80 && S.rep <= 100);
  assert.equal(SN.repFactor(0), 0.8); assert.equal(SN.repFactor(100), 1.2); assert.equal(SN.repFactor(150), 1.2);
});
t('prijzenoorlog: wie meeprijst houdt zijn klanten, wie negeert verliest ze; alleen in de stad', () => {
  assert.deepEqual(SN.warEffect(null, 5, 'stad', 1), { demand: 1, pr: 1 });
  const war = { until: 10, depth: 0.2, matched: false };
  assert.ok(Math.abs(SN.warEffect(war, 5, 'stad', 1).demand - 0.84) < 1e-9);
  const mw = SN.warEffect({ ...war, matched: true }, 5, 'stad', 1); assert.ok(Math.abs(mw.demand - 0.98) < 1e-9 && Math.abs(mw.pr - 0.8) < 1e-9);
  assert.ok(Math.abs(SN.warEffect({ ...war, softened: true }, 5, 'stad', 1).demand - 0.92) < 1e-9);
  assert.deepEqual(SN.warEffect(war, 5, 'noord', 1), { demand: 1, pr: 1 });
  assert.deepEqual(SN.warEffect(war, 11, 'stad', 1), { demand: 1, pr: 1 });
});
t('gebeurtenissen over 300 dagen: een wacht op antwoord, het standaardgevolg treedt in, antwoorden kosten geld, nooit negatief saldo door het systeem', () => {
  const S = SN.newSnack(); give(S, ['markt', 'park']); S.own.spot = 'markt'; S.rival.mood = 80; SN.buyFleetWagon(S, 'park', 1, 1e9);
  const seen = {}; let money = 1e6;
  for (let d = 2; d < 302; d++) {
    S.own.stockDays = 5; S.permits.markt.until = 1e6; S.permits.park.until = 1e6; S.rival.mood = 80;
    const r = SN.settleDay(S, ctx(d, { money }));
    const p = SN.pendingEvent(S);
    if (p && p.day === d) {
      seen[p.kind] = (seen[p.kind] || 0) + 1;
      assert.ok(p.choices.length >= 2 && p.text);
      if (d % 2 === 0) { const a = SN.answerEvent(S, p.kind === 'vergunning' ? 'beroep' : p.choices[0].id, d, money); assert.ok(a.ok && a.cost >= 0); money -= a.cost; assert.equal(SN.pendingEvent(S), null); }
    }
    assert.ok(Number.isFinite(r.ownNet) && Number.isFinite(r.fleetNet));
  }
  assert.ok(Object.keys(seen).length >= 4, JSON.stringify(seen));
  assert.ok(S.stats.answered > 5);
});
t('een storing kost omzet, direct repareren kost 350 en doet het beter dan wachten', () => {
  const mk = () => { const S = quiet(SN.newSnack()); give(S, ['dorp']); S.own.spot = 'dorp'; S.own.stockDays = 5; S.ev.seq = 0; return S; };
  const evStart = (S) => { S.ev.pending = { kind: 'storing', id: 1, wagon: 'own', spot: 'markt', depth: 0, price: 0, text: 'x', choices: RV.CHOICES.storing, day: 9, deadline: 12 }; S.ev.mods.push({ k: 'omzet', wagon: 'own', until: 10, mult: 0.3, d: 0, ev: 1 }); };
  const a = mk(), b = mk(), c = mk();
  evStart(a); evStart(b);
  assert.equal(SN.answerEvent(b, 'repareer', 9, 1000).ok, true);
  const ra = SN.settleDay(a, ctx(9)), rb = SN.settleDay(b, ctx(9)), rc = SN.settleDay(c, ctx(9));
  assert.ok(ra.own.revenue < rb.own.revenue && rb.own.revenue < rc.own.revenue);
  assert.equal(SN.answerEvent(mk(), 'x', 9, 0).why, 'niets-te-doen');
  const d = mk(); evStart(d); assert.equal(SN.answerEvent(d, 'repareer', 9, 100).why, 'te-weinig-geld'); assert.equal(SN.answerEvent(d, 'zzz', 9, 1e9).why, 'onbekend');
});
t('pech sluit de wagen: geen omzet, halve kosten; het antwoord sleepdienst bekort het', () => {
  const S = quiet(SN.newSnack()); give(S, ['markt']); S.own.spot = 'markt'; S.own.stockDays = 5;
  S.ev.mods.push({ k: 'dicht', wagon: 'own', until: 9, mult: 1, d: 0, ev: 7 });
  const r = SN.settleDay(S, ctx(9));
  assert.ok(r.own.closed && r.own.revenue === 0 && r.own.net === -Math.round(45 * 0.5));
  assert.equal(S.own.stockDays, 5);                          // een dichte dag verbruikt geen voorraad
  assert.equal(SN.settleDay(S, ctx(10)).own.closed, false);
});
t('een bod van Us Mem: verkopen geeft het geld en de plek (de wagen staat leeg), weigeren geeft een goede naam; verloopt na drie dagen', () => {
  const S = quiet(SN.newSnack()); give(S, ['park']); S.own.spot = 'park'; S.rival.lastOffer = 0;
  const e = { kind: 'bod', id: 3, wagon: 'own', spot: 'park', depth: 0, price: 9000, text: 'Bod', choices: RV.CHOICES.bod, day: 40, deadline: 43 };
  S.ev.pending = { ...e };
  const gain = SN.answerEvent(S, 'verkoop', 40, 0);
  assert.ok(gain.ok && gain.gain === 9000 && !S.permits.park && S.own.spot === null && RV.holds(S.rival, 'park'));
  S.ev.pending = { ...e, spot: 'dorp' }; give(S, ['dorp']); const rep0 = S.rep;
  assert.ok(SN.answerEvent(S, 'weiger', 40, 0).ok && S.rep > rep0 && S.stats.refused === 1);
  S.ev.pending = { ...e }; S.rival.lastOffer = 1e6; SN.settleDay(S, ctx(44)); assert.equal(S.ev.pending, null);
});
t('verkoper weggekocht: loonsverhoging houdt hem, laten gaan geeft een nieuwe verkoper en twee dagen dicht', () => {
  const S = quiet(SN.newSnack()); give(S, ['park']); SN.buyFleetWagon(S, 'park', 3, 1e9);
  const e = { kind: 'overkoop', id: 5, wagon: 'w1', spot: 'park', depth: 0, price: 0, text: 'x', choices: RV.CHOICES.overkoop, day: 20, deadline: 23 };
  S.ev.pending = { ...e }; const old = S.fleet[0].staff.name;
  assert.ok(SN.answerEvent(S, 'loon', 20, 0).ok && S.fleet[0].wageUp === 20 && S.fleet[0].staff.name === old);
  assert.ok(SN.staffWage(50, 20) > SN.staffWage(50, 0));
  S.ev.pending = { ...e, id: 6 }; SN.answerEvent(S, 'laatgaan', 21, 0);
  assert.equal(S.fleet[0].wageUp, 0); assert.ok(S.ev.mods.some((m) => m.k === 'dicht' && m.wagon === 'w1'));
});
t('een valse recensie drukt tijdelijk je naam, een gratis friet-dag herstelt sneller', () => {
  const S = quiet(SN.newSnack()); S.rep = 60; S.ev.pending = { kind: 'recensie', id: 2, wagon: 'own', spot: 'markt', depth: 0, price: 0, text: 'x', choices: RV.CHOICES.recensie, day: 10, deadline: 13 };
  SN.answerEvent(S, 'negeer', 10, 0);
  assert.equal(SN.effRep(S, 11), 52); assert.equal(SN.effRep(S, 17), 60);
  S.ev.pending = { kind: 'recensie', id: 3, wagon: 'own', spot: 'markt', depth: 0, price: 0, text: 'x', choices: RV.CHOICES.recensie, day: 30, deadline: 33 };
  const before = S.rep; SN.answerEvent(S, 'actie', 30, 500);
  assert.ok(SN.effRep(S, 31) > before - 3 && S.rep === before + 3);
});
t('overname van Us Mem: kost zijn vraagprijs, geeft een vergunning van 40 dagen, telt als doel; een medespeler blokkeert', () => {
  const S = quiet(SN.newSnack()); S.rival = RV.newRival(); S.rep = 50;
  assert.equal(SN.bidForSpot(S, 'markt', 5, 100).why, 'te-weinig-geld');
  assert.equal(SN.bidForSpot(S, 'markt', 5, 1e9, { taken: () => true }).why, 'bezet');
  assert.equal(SN.bidForSpot(S, 'dorp', 5, 1e9).why, 'niet-van-hem');
  const r = SN.bidForSpot(S, 'markt', 5, 1e9);
  assert.ok(r.ok && r.cost === RV.askPrice('markt', 50) && SP.permitHeld(S.permits, 'markt', 44) && !SP.permitHeld(S.permits, 'markt', 45) && !RV.holds(S.rival, 'markt'));
  assert.equal(SN.goalStatus(S, { day: 5 }).find((g) => g.id === 'overname').done, true);
  assert.equal(SN.goalStatus(S, { day: 5 }).find((g) => g.id === 'beste').done, true);
  assert.equal(SN.buyPermit(S, 'markt', 6, 1e9).why, 'al-van-jou');
  assert.equal(SN.buyPermit(S, 'station', 6, 1e9).why, 'bezet');        // van Us Mem: eerst overnemen
  assert.equal(SN.buyPermit(S, 'dorp', 6, 1e9, { taken: (x) => x === 'dorp' }).why, 'bezet');
});
t('de eindscore: aandeel, wagens, ketens, naam en het beste plekje; 0 tot 100', () => {
  const S = SN.newSnack();
  assert.equal(SN.empireScore(S, 5).score, 5);                          // alleen de naam 50: 5 punten
  S.rival.spots = ['stadion']; give(S, SP.SPOT_IDS.filter((id) => id !== 'stadion'));
  S.rival.spots = ['stadion'];
  S.own.spot = 'markt'; S.rep = 100;
  for (const id of ['park', 'reitdiep', 'haren', 'dorp']) SN.buyFleetWagon(S, id, 5, 1e9);
  const sc = SN.empireScore(S, 5, { chains: 3 });
  assert.ok(sc.share > 0.9 && sc.score >= 90 && sc.score <= 100, JSON.stringify(sc));
  assert.equal(SN.empireScore(S, 5, { chains: 9 }).parts.ketens, 10);
});
t('doelen: Us Mem klein gekregen vraagt acht plekken en 75% aandeel; tien plekken is de prestatie', () => {
  const S = SN.newSnack(); give(S, SP.SPOT_IDS.slice(0, 10)); S.rival.spots = ['stadion'];
  const g = Object.fromEntries(SN.goalStatus(S, { day: 5 }).map((x) => [x.id, x.done]));
  assert.ok(g.tien && g.usmem && g.helft && g.drie && g.vergunning && !g.overname);
  S.rival.spots = ['markt', 'station', 'oosterpoort', 'stadion'];
  const h = Object.fromEntries(SN.goalStatus(S, { day: 5 }).map((x) => [x.id, x.done]));
  assert.ok(h.tien && !h.usmem);
});
t('meerdere dagen: opgeteld, hoogstens 60, de onderhoudsstand loopt door; incomeOf trekt de vaste kosten af', () => {
  const S = quiet(SN.newSnack()); give(S, ['markt'], 1e6); S.own.spot = 'markt';
  S.own.stockDays = 5;
  const { sum, last } = SN.settleDays(S, 1, 500, (d) => { S.own.stockDays = 5; return ctx(d); });
  assert.equal(sum.days, 60); assert.ok(sum.ownNet > 5000 && last.day === 61);
  assert.ok(sum.ownQ < 100 && sum.ownQ > 60);
  const inc = SN.incomeOf({ ownNet: 4000, fleetNet: 900, fixed: 77 });
  assert.ok(inc.own > 0 && inc.own < 4000 && inc.passiveRaw === 900 && inc.fixed === -77);
});
t('compressOwn: zacht plafond, nooit boven 1.800, verlies blijft verlies', () => {
  assert.ok(SN.compressOwn(100) > 95 && SN.compressOwn(100) <= 100);
  assert.ok(SN.compressOwn(1e9) <= SN.OWN_CAP_DAY && SN.compressOwn(1e9) >= SN.OWN_CAP_DAY - 1);
  assert.equal(SN.compressOwn(-50), -50); assert.equal(SN.compressOwn(0), 0);
});
t('deterministisch: twee runs met dezelfde invoer geven dezelfde toestand', () => {
  const run = () => { const S = SN.newSnack(); give(S, ['markt', 'park']); S.own.spot = 'markt'; SN.buyFleetWagon(S, 'park', 2, 1e9); S.rival.mood = 70; for (let d = 2; d < 80; d++) { S.own.stockDays = 5; S.permits.markt.until = 1e6; S.permits.park.until = 1e6; SN.settleDay(S, ctx(d)); } return JSON.stringify(S); };
  assert.equal(run(), run());
});
t('bronregels: geen Math.random, geen fetch, geen DOM; geen echte merken in de menu-namen', () => {
  const src = fs.readFileSync(new URL('../game/js/snackvan.js', import.meta.url), 'utf8').split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
  assert.ok(!/Math\.random|fetch\(|document\.|window\.|localStorage/.test(src));
  const names = Object.values(SN.ITEMS).map((i) => i.label).concat(Object.values(SN.TIERS).map((x) => x.label), Object.values(SN.UPGRADES).map((u) => u.label)).join(' ');
  assert.ok(!/(McD|Burger King|Febo|Mora|Van Dobben|Zoom)/i.test(names));
});
console.log(`snackvan_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
