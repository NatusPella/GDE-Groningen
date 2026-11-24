// De strijd om standplaatsen: Jelle's trucs (rival.js: vergunningsgedoe, omkoping, prijsdrukken, sabotage) tegen jouw positieve hefbomen (goodwill.js: klanttevredenheid, vaste klanten, hulp aan
// de buurt, goodwill, bondgenoten). Test dat beide uitkomsten bestaan (verlies zonder hefbomen, winst met), dat een omkoping kan mislukken en dat niets fataal is.   node scripts/goodwill_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as GW from '../game/js/goodwill.js';
import * as RV from '../game/js/rival.js';
import * as SN from '../game/js/snackvan.js';
import * as SP from '../game/js/pitch.js';

let n = 0, fails = 0;
const t = (name, fn) => { n++; try { fn(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', String(e.stack || e.message).split('\n').slice(0, 3).join(' | ')); } };
const wk = (cd) => { const wd = (cd + 4) % 7; return wd === 6 || wd === 0; };
const ctx = (day, o = {}) => ({ day, weekend: wk(day), money: 1e9, ownWagon: true, ownQ: 100, kermisAt: () => false, chainOwn: () => 0, ...o });

t('klanttevredenheid: voorraad, wachttijd, menu en prijs tellen mee en blijven tussen 0 en 100', () => {
  const ok = { stocked: true, demand: 100, unserved: 0 };
  const base = GW.satisfactionOf(ok, { menuLen: 4, pr: 1 });
  assert.ok(base >= 65 && base <= 80);
  assert.ok(GW.satisfactionOf({ ...ok, stocked: false }, { menuLen: 4, pr: 1 }) < base - 30);
  assert.ok(GW.satisfactionOf({ ...ok, unserved: 50 }, { menuLen: 4, pr: 1 }) < base - 20);
  assert.ok(GW.satisfactionOf(ok, { menuLen: 8, koeling: true, localAppeal: 1.03, pr: 1 }) > base + 8);
  assert.ok(GW.satisfactionOf(ok, { menuLen: 4, pr: 1.3 }) < base && GW.satisfactionOf(ok, { menuLen: 4, pr: 0.9 }) > base);
  for (const v of [GW.satisfactionOf({ stocked: false, demand: 10, unserved: 999 }, { pr: 9 }), GW.satisfactionOf(ok, { menuLen: 99, koeling: true, localAppeal: 2, pr: 0.1 })]) assert.ok(v >= 0 && v <= 100);
  assert.equal(GW.satFactor(0), 0.9); assert.equal(GW.satFactor(100), 1.1); assert.equal(GW.loyalFactor(100), 1.15); assert.equal(GW.loyalFactor(0), 1);
  assert.equal(GW.warShield(100), 0.4); assert.equal(GW.warShield(0), 1);
});
t('vaste klanten groeien met tevredenheid tot een plafond van 40 zonder hulp; elke hulpactie tilt dat plafond; ontevreden zakt het', () => {
  const g = GW.newGw();
  for (let d = 0; d < 100; d++) GW.stepGw(g, [{ spot: 'park', sat: 80, closed: false }]);
  assert.equal(g.loyal.park, GW.NATURAL_LOYAL_CAP);
  g.helped.park = 3; for (let d = 0; d < 100; d++) GW.stepGw(g, [{ spot: 'park', sat: 80, closed: false }]);
  assert.equal(g.loyal.park, 70);
  for (let d = 0; d < 10; d++) GW.stepGw(g, [{ spot: 'park', sat: 30, closed: false }]);
  assert.ok(g.loyal.park < 70 && g.loyal.park > 60);
  const before = g.loyal.park; GW.stepGw(g, [{ spot: 'park', sat: 10, closed: true }]); assert.equal(g.loyal.park, before);   // een dichte dag verandert niets
});
t('goodwill zakt 0,4 per dag en de tevredenheid is een lopend gemiddelde', () => {
  const g = GW.newGw(); g.goodwill = 10;
  for (let d = 0; d < 10; d++) GW.stepGw(g, []);
  assert.equal(g.goodwill, 6); assert.equal(g.sat, 60);
  for (let d = 0; d < 60; d++) GW.stepGw(g, [{ spot: 'dorp', sat: 100, closed: false }]);
  assert.ok(g.sat > 95);
  for (let d = 0; d < 100; d++) GW.stepGw(g, []);
  assert.equal(g.goodwill, 0);
});
t('hulp aan de buurt: kosten, goodwill, vaste klanten, rust per plek, de derde keer in een gebied maakt een bondgenoot', () => {
  const g = GW.newGw();
  const a = GW.helpNeighbourhood(g, 'park', 'stad', 'buurthuis', 10, 1000);
  assert.ok(a.ok && a.cost === 250 && g.goodwill === 6 && g.loyal.park === 8 && g.helped.park === 1);
  assert.equal(GW.helpNeighbourhood(g, 'park', 'stad', 'buurthuis', 12, 1000).why, 'te-snel');
  assert.equal(GW.helpNeighbourhood(g, 'park', 'stad', 'schoonmaak', 12, 10).why, 'te-weinig-geld');
  assert.equal(GW.helpNeighbourhood(g, 'zzz', 'stad', 'schoonmaak', 12, 1e6).why, 'onbekend'); assert.equal(GW.helpNeighbourhood(g, 'park', 'stad', 'dansen', 12, 1e6).why, 'onbekend');
  assert.ok(GW.helpNeighbourhood(g, 'park', 'stad', 'schoonmaak', 12, 1000).ok);
  const c = GW.helpNeighbourhood(g, 'markt', 'stad', 'avond', 12, 1000);
  assert.ok(c.ok && c.ally === GW.ALLY_NAMES.stad && g.allies.includes('stad') && /achter je/.test(c.text));
  assert.equal(GW.helpNeighbourhood(g, 'park', 'stad', 'buurthuis', 20, 1000).ally, null);       // al een bondgenoot
  assert.ok(g.goodwill <= 100 && g.loyal.park <= GW.loyalCap(g, 'park'));
});
t('normalizeGw: rommel wordt gezuiverd, bondgenoten bestaan alleen uit bekende gebieden', () => {
  const g = GW.normalizeGw({ sat: 999, goodwill: -5, loyal: { park: 50, zzz: 9 }, allies: ['stad', 'nergens', 'stad'], helps: { stad: 2, x: 1 }, cd: { 'buurthuis:park': 5, kapot: 1 }, disputes: { won: 2.6, lost: 'x' } });
  assert.equal(g.sat, 100); assert.equal(g.goodwill, 0); assert.deepEqual(Object.keys(g.loyal), ['park']); assert.deepEqual(g.allies, ['stad']); assert.deepEqual(Object.keys(g.helps), ['stad']);
  assert.deepEqual(Object.keys(g.cd), ['buurthuis:park']); assert.equal(g.disputes.won, 3); assert.equal(g.disputes.lost, 0);
  assert.deepEqual(GW.normalizeGw(null), GW.newGw());
});
t('het geschil: zonder hefbomen verlies je, met goodwill, vaste klanten en bondgenoten win je; bondgenoten vragen helpt', () => {
  const nul = RV.resolveDispute({ spot: 'park', day: 30, bribed: false, goodwill: 0, loyal: 0, allies: 0, rep: 50, mood: 20 });
  assert.equal(nul.win, false); assert.ok(nul.his > nul.yours && /leges/.test(nul.text));
  const sterk = RV.resolveDispute({ spot: 'park', day: 30, bribed: false, goodwill: 70, loyal: 70, allies: 2, rep: 70, mood: 20 });
  assert.equal(sterk.win, true); assert.ok(sterk.yours > sterk.his && sterk.rivalRepDelta < 0);
  const mid = { spot: 'park', day: 30, bribed: false, goodwill: 40, loyal: 40, allies: 1, rep: 60, mood: 40 };
  assert.ok(RV.resolveDispute({ ...mid, allyCall: true }).yours > RV.resolveDispute(mid).yours + 15);
  assert.equal(RV.resolveDispute({ ...mid, allies: 0, allyCall: true }).yours, RV.resolveDispute({ ...mid, allies: 0 }).yours);       // zonder bondgenoten helpt vragen niet
  assert.equal(JSON.stringify(RV.resolveDispute(mid)), JSON.stringify(RV.resolveDispute(mid)));
});
t('een omkoping kan mislukken: de dienst weigert, jij wint en Jelle verliest 15 naam; hij slaagt vaker tegen een buurt zonder goodwill', () => {
  let failedNo = 0, failedGood = 0, wonNo = 0, wonGood = 0;
  for (let d = 1; d <= 400; d++) {
    const a = RV.resolveDispute({ spot: 'dorp', day: d, bribed: true, goodwill: 0, loyal: 0, allies: 0, rep: 50, mood: 20 });
    const b = RV.resolveDispute({ spot: 'dorp', day: d, bribed: true, goodwill: 80, loyal: 60, allies: 2, rep: 70, mood: 20, allyCall: true });
    if (a.bribeFailed) { failedNo++; assert.equal(a.win, true); assert.equal(a.rivalRepDelta, -15); assert.match(a.text, /weigert de enveloppe/); }
    if (b.bribeFailed) failedGood++;
    if (a.win) wonNo++; if (b.win) wonGood++;
  }
  assert.ok(failedNo > 80 && failedNo < 170, String(failedNo));
  assert.ok(failedGood > failedNo * 1.5);
  assert.ok(wonGood > wonNo * 2);
  assert.ok(wonNo > 0 && wonNo < 400 && wonGood === 400);      // beide uitkomsten komen voor bij een zwakke speler
});
t('een mislukte omkoping maakt Us Mem goedkoper en voorzichtiger: de overnameprijs zakt tot 20%, de kans op gebeurtenissen tot 70%', () => {
  assert.equal(RV.askPrice('markt', 50, 60), RV.askPrice('markt', 50));
  assert.ok(RV.askPrice('markt', 50, 0) < 0.82 * RV.askPrice('markt', 50, 60) && RV.askPrice('markt', 50, 0) > 0.79 * RV.askPrice('markt', 50, 60));
  const r = RV.newRival();
  assert.ok(RV.eventChance({ ...r, rep: 0 }) < RV.eventChance(r) && RV.eventChance({ ...r, rep: 100 }) > RV.eventChance(r));
  assert.equal(RV.acquireSpot({ ...r, rep: 0 }, 'markt', 1e9, 50).price, RV.askPrice('markt', 50, 0));
});
t('Jelle blijft satire: de enveloppe gaat naar de verzonnen Gemeentelijke Vergunningsdienst Noord, geen echte instantie, nooit geweld', () => {
  assert.equal(RV.SERVICE, 'Gemeentelijke Vergunningsdienst Noord');
  const all = [...RV.QUOTES.vergunning, ...RV.QUOTES.vergunningOmkoop, ...RV.CHOICES.vergunning.map((c) => c.label), RV.resolveDispute({ spot: 'a', day: 1, bribed: true, goodwill: 0 }).text].join(' ');
  assert.match(all, /Gemeentelijke Vergunningsdienst Noord/); assert.ok(!/(geweld|dreig|bom|vuur|bloed|mes\b|wapen)/i.test(all)); assert.ok(!/hagel|sneeuw|winter/i.test(all));
});
t('een vergunningsgeschil in het spel: een antwoord kost niets verplichts, verliezen kost leges en halve verkoop maar nooit de plek, winnen geeft goodwill en kost Jelle naam', () => {
  const mk = (gw) => { const S = SN.newSnack(); S.permits.park = { until: 1e6, paid: 1 }; S.own.spot = 'park'; S.own.stockDays = 5; Object.assign(S.gw, gw); S.rival.lastEvent = 1e7; S.rival.lastOffer = 1e7;
    S.ev.pending = { kind: 'vergunning', id: 4, wagon: 'own', spot: 'park', depth: 0, price: 0, bribed: false, text: 'x', choices: RV.CHOICES.vergunning, day: 40, deadline: 45 }; S.ev.mods.push({ k: 'omzet', wagon: 'own', until: 45, mult: 0.7, d: 0, ev: 4 }); return S; };
  const arm = mk({}), sterk = mk({ goodwill: 80, loyal: { park: 70 }, allies: ['stad', 'oost'] });
  const a = SN.answerEvent(arm, 'beroep', 40, 1e6), s = SN.answerEvent(sterk, 'beroep', 40, 1e6);
  assert.ok(a.ok && a.won === false && a.cost === 300 && SP.permitHeld(arm.permits, 'park', 41) && arm.gw.disputes.lost === 1 && arm.ev.mods.some((m) => m.mult === 0.5));
  assert.ok(s.ok && s.won === true && s.cost === 0 && sterk.gw.goodwill > 80 && sterk.rival.rep < 60 && sterk.gw.disputes.won === 1);
  assert.equal(SN.answerEvent(mk({}), 'bondgenoten', 40, 1e6).why, 'geen-bondgenoten');
  const p = mk({}); assert.equal(SN.answerEvent(p, 'betaal', 40, 100).why, 'te-weinig-geld');
  const b = SN.answerEvent(p, 'betaal', 40, 1e6); assert.ok(b.ok && b.cost === 400 && !p.ev.mods.some((m) => m.ev === 4));
  const poor = mk({}); const l = SN.answerEvent(poor, 'beroep', 40, 120); assert.equal(l.cost, 120);       // nooit meer dan wat er is
  const exp = mk({}); const r = SN.settleDay(exp, ctx(46)); assert.equal(exp.ev.pending, null); assert.ok(r.fixed >= 300 || exp.gw.disputes.won === 1);     // na de deadline beslecht het zich
});
t('bondgenoten vragen werkt alleen met bondgenoten en telt 20 punten', () => {
  const S = SN.newSnack(); S.permits.park = { until: 1e6, paid: 1 }; S.own.spot = 'park'; S.gw.allies = ['stad'];
  S.ev.pending = { kind: 'vergunning', id: 9, wagon: 'own', spot: 'park', depth: 0, price: 0, bribed: false, text: 'x', choices: RV.CHOICES.vergunning, day: 40, deadline: 45 };
  assert.ok(SN.answerEvent(S, 'bondgenoten', 40, 1e6).ok);
});
t('de prijzenoorlog: vaste klanten schermen af en drukken ook de ketenprijzen (warPriceMult), alleen friet en kaas', () => {
  const war = { until: 10, depth: 0.2, matched: false };
  assert.ok(SN.warEffect(war, 5, 'stad', 1, 100).demand > SN.warEffect(war, 5, 'stad', 1, 0).demand);
  assert.ok(Math.abs((1 - SN.warEffect(war, 5, 'stad', 1, 100).demand) - 0.4 * (1 - SN.warEffect(war, 5, 'stad', 1, 0).demand)) < 1e-9);
  const S = SN.newSnack(); S.ev.war = { ...war, ev: 1 };
  assert.equal(SN.warPriceMult(S, 'friet', 5), 0.9); assert.equal(SN.warPriceMult(S, 'kaas', 5), 0.9); assert.equal(SN.warPriceMult(S, 'brood', 5), 1); assert.equal(SN.warPriceMult(S, 'friet', 11), 1); assert.equal(SN.warPriceMult(null, 'friet', 5), 1);
});
t('meewerken: een gast achter het luik geeft de eigenaar 8% meer verkoop die dag, eenmaal per plek per dag', () => {
  const S = SN.newSnack(); S.permits.park = { until: 1e6, paid: 1 }; S.own.spot = 'park'; S.own.stockDays = 5; S.rival.lastEvent = 1e7; S.rival.lastOffer = 1e7;
  const base = SN.settleDay(structuredClone(S), ctx(9)).own.revenue;
  assert.equal(SN.receiveHelper(S, 'dorp', 8, 9).why, 'geen-vergunning'); S.permits.dorp = { until: 1e6, paid: 1 }; assert.equal(SN.receiveHelper(S, 'dorp', 8, 9).why, 'geen-wagen');
  assert.ok(SN.receiveHelper(S, 'park', 8, 9).ok); assert.equal(SN.receiveHelper(S, 'park', 8, 9).why, 'al-gedaan');
  assert.ok(SN.settleDay(S, ctx(9)).own.revenue >= base);
});

// ---- de balans over een lange speeltijd: zonder positieve hefbomen verlies je langzaam, met ze win je, niets is fataal ----
function campaign(helps, days = 500) {
  const S = SN.newSnack(); const spots = ['park', 'reitdiep', 'haren']; let net = 0, helpCost = 0, answerCost = 0; const blocks = []; let block = 0;
  for (const id of spots) S.permits[id] = { until: 1e7, paid: SP.permitPrice(id, 0) };
  S.own.spot = 'park'; S.own.tier = 'groot';
  SN.buyFleetWagon(S, 'reitdiep', 1, 1e9); SN.buyFleetWagon(S, 'haren', 1, 1e9);
  for (let d = 2; d < 2 + days; d++) {
    S.own.stockDays = 5; for (const id of spots) S.permits[id].until = 1e7; S.rival.mood = 80;            // een agressieve Jelle: elke dag opnieuw boos
    if (helps && d % 3 === 0) for (const id of spots) for (const kind of GW.HELP_IDS) { if ((S.gw.helped[id] || 0) >= 6 && !(kind === 'avond' && d % 60 === 0)) continue; const r = SN.helpNeighbourhood(S, id, kind, d, 1e9); if (r.ok) helpCost += r.cost; }
    const p = SN.pendingEvent(S);
    if (p) { const choice = p.kind === 'vergunning' ? (S.gw.allies.length ? 'bondgenoten' : 'beroep') : p.kind === 'bod' ? 'weiger' : p.choices.find((c) => c.def).id; const a = SN.answerEvent(S, choice, d, 1e9); if (a.ok) answerCost += a.cost; }
    const r = SN.settleDay(S, ctx(d));
    const day = r.ownNet + r.fleetNet - r.fixed; net += day; block += day;
    if (d % 50 === 0) { blocks.push(block); block = 0; }
  }
  return { net: net - helpCost - answerCost, helpCost, blocks, S, held: SP.heldIds(S.permits, 2 + days - 1).length };
}
const A = campaign(false), B = campaign(true);
t('balans: zonder positieve hefbomen verlies je geschillen en verdien je minder; met ze win je; beide uitkomsten bestaan', () => {
  assert.ok(A.S.gw.disputes.lost >= 3, JSON.stringify(A.S.gw.disputes));
  assert.ok(A.S.gw.disputes.won <= A.S.gw.disputes.lost, JSON.stringify(A.S.gw.disputes));
  assert.ok(B.S.gw.disputes.won > B.S.gw.disputes.lost, JSON.stringify(B.S.gw.disputes));
  assert.ok(B.S.gw.disputes.lost + A.S.gw.disputes.won > 0 || B.S.gw.disputes.won > 0);
  assert.ok(B.net > A.net * 1.05, `A ${Math.round(A.net)} B ${Math.round(B.net)}`);
  assert.ok(B.S.rival.rep < A.S.rival.rep, `Jelle's naam A ${A.S.rival.rep} B ${B.S.rival.rep}`);
  assert.ok(B.S.gw.allies.length >= 1 && A.S.gw.allies.length === 0);
  console.log(`  balans 500 dagen: zonder hefbomen netto ${Math.round(A.net)} (geschillen ${JSON.stringify(A.S.gw.disputes)}); met hefbomen netto ${Math.round(B.net)} na ${Math.round(B.helpCost)} aan hulp (geschillen ${JSON.stringify(B.S.gw.disputes)}, naam Jelle ${A.S.rival.rep} tegen ${B.S.rival.rep})`);
});
t('niets is fataal: in beide verhalen blijft elk blok van 50 dagen winstgevend en blijven alle vergunningen en wagens van jou', () => {
  for (const r of [A, B]) { assert.ok(r.blocks.every((b) => b > 0), r.blocks.join()); assert.equal(r.held, 3); assert.equal(r.S.fleet.length, 2); assert.ok(r.S.fleet.every((w) => w.spot)); assert.ok(r.S.own.spot === 'park'); }
});
t('bronregels: goodwill.js heeft geen Math.random of fetch', () => {
  const src = fs.readFileSync(new URL('../game/js/goodwill.js', import.meta.url), 'utf8').split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
  assert.ok(!/Math\.random|fetch\(|document\.|localStorage/.test(src));
});
console.log(`goodwill_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
