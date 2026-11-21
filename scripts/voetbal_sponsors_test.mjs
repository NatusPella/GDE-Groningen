// Test van de sponsors (#1118) en het clubbezit (#1113): scripts/voetbal_sponsors_test.mjs. Puur.
import assert from 'node:assert/strict';
import PARKDATA from '../game/js/voetbalparkendata.js';
import { makeParkIndex } from '../game/js/voetbalparken.js';
import * as Sp from '../game/js/voetbalsponsors.js';
import * as B from '../game/js/voetbalclub_bezit.js';
import * as C from '../game/js/voetbalcarriere.js';
import { hasForbiddenWord } from './voetbal_verboden.mjs';

let n = 0;
const t = (naam, f) => { try { f(); n++; } catch (e) { console.error('FAIL', naam); throw e; } };
const index = makeParkIndex(PARKDATA);
const getClub = C.clubResolver(index);
const ECHTE_MERKEN = /\b(jumbo|albert heijn|aldi|lidl|plus|coop|hema|gamma|praxis|karwei|rabobank|abn|ing|shell|esso|bp|vattenfall|essent|eneco|gall|mcdonald|kfc|burger king|febo|kwalitaria|toyota|volkswagen|mercedes|bmw|batavus|gazelle|friesland|campina|ah)\b/i;

t('sponsors: twee of drie sleuven, elk een ander soort, bedragen binnen 150 tot 800, deterministisch', () => {
  for (const [div, lo, hi] of [['talent', 150, 300], ['terp', 250, 500], ['kroon', 400, 800]]) {
    for (let s = 1; s <= 20; s++) {
      const o = Sp.offersFor('lc1', div, s);
      assert.ok(o.length >= 2 && o.length <= Sp.MAX_SLOTS);
      assert.equal(new Set(o.map((x) => x.sort)).size, o.length);
      for (const x of o) { assert.ok(x.amount >= lo && x.amount <= hi, `${div} ${x.amount}`); assert.ok(Sp.GOALS[x.goal]); assert.equal(x.accepted, false); }
    }
  }
  assert.deepEqual(Sp.offersFor('lc1', 'talent', 3), Sp.offersFor('lc1', 'talent', 3));
  assert.notDeepEqual(Sp.offersFor('lc1', 'talent', 3), Sp.offersFor('lc1', 'talent', 4));
});
t('namen: verzonnen, nooit een echt merk, geen gaswinning, elke soort heeft een pandtype', () => {
  const alle = new Set();
  for (let s = 1; s <= 60; s++) for (const x of Sp.offersFor(`c${s % 7}`, 'terp', s)) alle.add(x.naam);
  assert.ok(alle.size > 20);
  for (const naam of alle) { assert.ok(!ECHTE_MERKEN.test(naam), naam); assert.ok(!hasForbiddenWord(naam), naam); assert.ok(!/gas|aardgas|nam\b|groningen gas/i.test(naam), naam); }
  for (const id of Sp.SORT_IDS) { assert.ok(Sp.SORTS[id].pand && Sp.SORTS[id].voor.length >= 3); assert.ok(!/gas/i.test(Sp.SORTS[id].naam)); }
});
t('aannemen, het pand uit de index, en eenmalig uitbetalen per doel', () => {
  const sp = Sp.newSponsors('lc1', 'talent', 1);
  const idx = { find: (type) => 4242 + type.length };
  const r = Sp.accept(sp, sp.slots[0].id, idx, { x: 0, y: 0 });
  assert.ok(r.ok && r.slot.osm > 4242);
  assert.equal(Sp.accept(r.sponsors, sp.slots[0].id).ok, false, 'niet tweemaal');
  assert.equal(Sp.accept(sp, 'nep').ok, false);
  assert.equal(Sp.accept(sp, sp.slots[1].id, null).slot.osm, null, 'zonder pandindex geen pand');
  let s = r.sponsors; s.slots[0].goal = 'doelpunt';
  const a = Sp.settle(s, { goals: 0, unbeaten: 0, promoted: false }); assert.equal(a.earn.length, 0);
  const b = Sp.settle(a.sponsors, { goals: 1, unbeaten: 0, promoted: false });
  assert.equal(b.earn.length, 1); assert.equal(b.earn[0].amount, s.slots[0].amount); assert.match(b.earn[0].label, /^Sponsor /);
  assert.equal(Sp.settle(b.sponsors, { goals: 5, unbeaten: 9, promoted: true }).earn.filter((x) => x.label === b.earn[0].label).length, 0, 'eenmalig');
  assert.equal(Sp.settle(sp, { goals: 9, unbeaten: 9, promoted: true }).earn.length, 0, 'een niet-aangenomen sleuf betaalt niet');
  assert.equal(Sp.unbeatenRun([{ r: 'L' }, { r: 'W' }, { r: 'D' }, { r: 'W' }]), 3);
});
t('de sponsor staat op het veld; de pandeigenaar krijgt hooguit +10% op thuisdagen en nooit een tweede uitbetaling', () => {
  const s = Sp.accept(Sp.newSponsors('lc1', 'talent', 1), 'sp1-0').sponsors;
  assert.deepEqual(Sp.boardNames(s).length, 1); assert.equal(Sp.shirtText(s), s.slots[0].naam); assert.match(Sp.commentaryLine(s), /^Hilbrand: /);
  assert.equal(Sp.commentaryLine(null), null);
  assert.equal(Sp.ownerBonus({ isHomeDay: false, ownsPand: true }).factor, 1);
  assert.equal(Sp.ownerBonus({ isHomeDay: true, ownsPand: false }).factor, 1);
  for (const form of [0.92, 1, 1.08, 3]) { const o = Sp.ownerBonus({ isHomeDay: true, ownsPand: true, form }); assert.ok(o.factor > 1 && o.factor <= 1.1 + 1e-9); assert.equal(o.extraPayout, 0); }
});
t('in de carrière: sponsors per seizoen, doelen betalen mee en de opslag blijft heel', () => {
  let c = C.startCareer({ char: 'anita', index });
  assert.ok(c.sponsors.slots.length >= 2);
  const slot = c.sponsors.slots[0];
  const r = C.acceptSponsor(c, slot.id); c = r.career; assert.ok(r.ok);
  c.sponsors.slots[0].goal = 'doelpunt';
  c = C.advanceDays(c, 3, getClub).career;
  const res = C.playEvent(c, getClub, { gf: 1, ga: 0, stats: { goals: 1, minutes: 8 } });
  assert.ok(res.summary.earn.some((e) => e.bron === 'sponsor' && e.amount === slot.amount));
  assert.ok(res.career.sponsors.slots[0].paid);
  const back = C.normalize(C.serialize(res.career));
  assert.deepEqual(back.sponsors, res.career.sponsors);
  assert.equal(C.normalize(JSON.stringify({ ...res.career, sponsors: { slots: [{ sort: 'x' }] } })).sponsors.slots.length, 0);
  const nxt = C.advanceDays(res.career, 24, getClub).career;
  assert.equal(nxt.sponsors.nr, 2); assert.ok(nxt.sponsors.slots.every((x) => !x.accepted), 'een nieuwe sleuf elk seizoen');
});
t('clubbezit: aandelen, schaalprijs, spaargeld blijft over, geen eigen opslag, zichtbaar pas na ontgrendeling', () => {
  const c = { bezit: B.newClubBezit(), roles: { manager: false }, flags: {} };
  assert.equal(B.canBuy(c, 'x', 'talent', 0.1, 1e6).ok, false, 'dicht');
  const open = { ...c, flags: { shareReady: true } };
  assert.equal(B.priceOf('talent', 0.1), 3000);
  assert.equal(B.canBuy(open, 'x', 'talent', 0.1, 3000).ok, false, 'leegt het spaargeld');
  assert.equal(B.canBuy(open, 'x', 'talent', 0.1, 4001).ok, true);
  assert.equal(B.canBuy(open, 'x', 'talent', 0.3, 1e6).ok, false, 'onbekend aandeel');
  let r = B.buy(open, 'x', 'talent', 0.25, 1e6); assert.ok(r.ok && r.price === 7500);
  assert.equal(B.buy(r.career, 'x', 'talent', 1, 1e6).ok, false, 'meer dan 100% kan niet');
  r = B.buy(r.career, 'x', 'talent', 0.51, 1e6); assert.ok(r.ok && r.career.bezit.clubs.x.aandeel === 0.76);
  assert.ok(B.isVisible(r.career));
  assert.ok(B.priceOf('talent', 0.1, 100) > B.priceOf('talent', 0.1, 0), 'schaalprijs');
  assert.equal(B.priceOf('talent', 0.1, 9999), B.priceOf('talent', 0.1, 200), 'de schaal is begrensd');
  const s = B.sell(r.career, 'x'); assert.equal(s.price, Math.round(r.career.bezit.clubs.x.prijs * 0.75));
  assert.equal(B.sell(open, 'y').ok, false);
});
t('dividend: rustig passief inkomen, tussen de pacht en de huur; nooit de snelste geldmachine', () => {
  const h = { aandeel: 0.1, prijs: 3000 }, grote = { aandeel: 0.1, prijs: 300000 };
  const mid = B.dividendOf(h, 4.5), top = B.dividendOf(h, 1), last = B.dividendOf(h, 8);
  assert.ok(top.payout > mid.payout && mid.payout > last.payout);
  const gm = B.dividendOf(grote, 4.5).gross; assert.ok(Math.abs(B.dividendOf(grote, 1).gross / gm - 1.4) < 0.005 && Math.abs(B.dividendOf(grote, 8).gross / gm - 0.6) < 0.005, 'plus of min 40%');
  const perDay = mid.payout / 3;
  assert.ok(perDay > 5 && perDay < 20, `ongeveer 14 per speldag bruto, netto ${perDay}`);
  const hoursToRepay = 3000 / (perDay / 0.4);        // een speldag is 24 minuten = 0,4 uur
  assert.ok(hoursToRepay > 44 && hoursToRepay < 400, `terugverdientijd ${Math.round(hoursToRepay)} speeluren`);
  assert.equal(mid.toClub, Math.round(mid.gross * 0.25));
  assert.ok(B.dividendOf(h, 8).payout >= 0);
});
t('tribune, bank en de claim bij Samen spelen', () => {
  assert.equal(B.tribunePrice('klein'), 120 * 700); assert.equal(B.tribunePrice('nep'), 0);
  assert.ok(B.capacityOf(['klein', 'middel']) > B.capacityOf([]));
  assert.equal(B.bankRecall({ prijs: 1000 }, 1).recall, false); assert.deepEqual(B.bankRecall({ prijs: 1000 }, 2), { recall: true, payout: 750 });
  assert.equal(B.claimWinner({ time: 5, player: 'b' }, { time: 7, player: 'a' }).player, 'b');
  assert.equal(B.claimWinner({ time: 5, player: 'b' }, { time: 5, player: 'a' }).player, 'a');
  assert.equal(B.bezitSoort.id, 'club');
});
console.log(`voetbal_sponsors_test ok (${n} groepen)`);
