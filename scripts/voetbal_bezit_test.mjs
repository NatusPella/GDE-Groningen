// Test van de dunne adapter tussen voetbal en Bezit (#1179): scripts/voetbal_bezit_test.mjs. Puur; Bezit wordt alleen gelezen.
import assert from 'node:assert/strict';
import { createBuildingIndex } from '../game/js/parcelindex.js';
import { newBezit, buyBuilding } from '../game/js/bezit.js';
import * as Sp from '../game/js/voetbalsponsors.js';
import * as C from '../game/js/voetbalcarriere.js';
import * as A from '../game/js/voetbalbezit.js';

let n = 0;
const t = (naam, f) => { try { f(); n++; } catch (e) { console.error('FAIL', naam); throw e; } };
// [osm, x, y, m2, typeIdx, h, landmark]
const file = { v: 1, types: ['retail', 'commercial', 'industrial', 'house'], rows: [
  [101, 1000, 1000, 300, 0, 6, 0], [102, 1100, 1000, 900, 0, 6, 0], [103, 1050, 1050, 5000, 3, 6, 0], [104, 1020, 1000, 700, 1, 9, 0],
  [105, 1010, 1010, 2000, 0, 9, 1], [106, 3000, 1000, 400, 2, 5, 0], [107, 20000, 20000, 400, 0, 5, 0],
] };
const buildings = createBuildingIndex(file);
const idx = A.makeSponsorPandIndex(buildings);

t('het pand: het juiste type, grootste oppervlakte, geen woning en geen monument', () => {
  assert.equal(idx.find('bakery', { x: 1000, y: 1000 }), 102);      // retail gaat voor commercial; 102 is groter dan 101; 105 is een monument; 103 een woning
  assert.equal(idx.find('bank', { x: 1000, y: 1000 }), 104);        // commercial gaat voor retail
  assert.equal(idx.find('dairy', { x: 3000, y: 1000 }), 106, 'industrial gaat voor retail');
  assert.equal(idx.find('dairy', { x: 1000, y: 1000 }), 102, 'dichtbij gaat voor de voorkeur: het eerste bereik dat een passend pand heeft');
  assert.equal(idx.find('energy', { x: 2000, y: 1000 }), 104, 'binnen de wijde omgeving (1500 m), commercial gaat voor industrial');
  assert.equal(idx.find('onbekend', { x: 1000, y: 1000 }), 102, 'een onbekende soort valt terug op de standaardtypen');
  assert.equal(idx.find('bakery', { x: 90000, y: 90000 }), null, 'niets in de buurt');
  assert.equal(idx.find('bakery', null), null);
  assert.equal(A.makeSponsorPandIndex(null).find('bakery', { x: 0, y: 0 }), null, 'zonder index geen pand, geen fout');
  assert.equal(A.makeSponsorPandIndex(buildings, { exclude: [102] }).find('bakery', { x: 1000, y: 1000 }), 101);
  assert.equal(idx.find('bakery', { x: 1000, y: 1000 }), idx.find('bakery', { x: 1000, y: 1000 }), 'deterministisch');
});
t('Sp.accept gebruikt de adapter en zet het osm-id op de sleuf', () => {
  const sp = Sp.newSponsors('lc1', 'talent', 1);
  const r = Sp.accept(sp, sp.slots[0].id, idx, { x: 1000, y: 1000 });
  assert.ok(r.ok && Number.isSafeInteger(r.slot.osm));
  assert.ok(buildings.near(1000, 1000, 5000).some((b) => b.osm === r.slot.osm), 'het pand staat in de Bezit-pandindex');
  assert.equal(A.facadeNames(r.sponsors)[r.slot.osm], r.slot.naam);
  assert.deepEqual(A.facadeNames(sp), {}, 'een niet-aangenomen sleuf staat niet op een gevel');
  assert.deepEqual(A.facadeNames(null), {});
});
t('de pandeigenaar: alleen met het pand in Bezit, hooguit +10%, nooit een tweede uitbetaling', () => {
  const sp = Sp.accept(Sp.newSponsors('lc1', 'talent', 1), 'sp1-0', idx, { x: 1000, y: 1000 }).sponsors;
  const osm = sp.slots[0].osm;
  const bezit = newBezit();
  assert.equal(A.ownsSponsorPand(bezit, sp.slots[0]), false);
  assert.equal(A.sponsorBonus(sp, bezit, { isHomeDay: true }).factor, 1);
  assert.ok(buyBuilding(bezit, osm, 50000, 3, 60000).ok);
  assert.equal(A.ownsSponsorPand(bezit, sp.slots[0]), true);
  assert.equal(A.ownsSponsorPand(bezit, { ...sp.slots[0], accepted: false }), false, 'een niet-aangenomen sleuf telt niet');
  assert.equal(A.sponsorBonus(sp, bezit, { isHomeDay: false }).factor, 1, 'alleen op thuisdagen');
  for (const form of [0.9, 1, 1.1, 5]) { const b = A.sponsorBonus(sp, bezit, { isHomeDay: true, form }); assert.ok(b.factor > 1 && b.factor <= 1.1 + 1e-9); assert.equal(b.extraPayout, 0); }
  assert.equal(A.sponsorBonus(null, bezit, { isHomeDay: true }).factor, 1);
  assert.equal(A.sponsorBonus(sp, null, { isHomeDay: true }).factor, 1);
});
t('Bezit blijft ongemoeid: de adapter schrijft niets in het Bezit-object', () => {
  const bezit = newBezit(); buyBuilding(bezit, 102, 40000, 1, 50000);
  const stand = () => JSON.stringify([...bezit.buildings]) + JSON.stringify(bezit.bstate) + JSON.stringify(bezit.totals);
  const voor = stand();
  const sp = Sp.accept(Sp.newSponsors('lc1', 'talent', 1), 'sp1-0', idx, { x: 1000, y: 1000 }).sponsors;
  A.sponsorBonus(sp, bezit, { isHomeDay: true }); A.ownsSponsorPand(bezit, sp.slots[0]);
  assert.equal(stand(), voor);
});
t('in de carrière: acceptSponsor geeft de plaats door', () => {
  const c = C.createCareer({ char: 'anita' });
  const r = C.acceptSponsor(c, c.sponsors.slots[0].id, idx, { x: 1000, y: 1000 });
  assert.ok(r.ok && r.slot.osm > 0);
  assert.equal(C.acceptSponsor(r.career, c.sponsors.slots[0].id, idx, { x: 1000, y: 1000 }).ok, false, 'niet tweemaal');
});
// ---- clubaandelen in de carrière (#1113): kopen, dividend per competitieronde, opslag en de live-laag ----
import PARKDATA from '../game/js/voetbalparkendata.js';
import { makeParkIndex } from '../game/js/voetbalparken.js';
import * as V from '../game/js/voetbalcarrierelive.js';
const parks = makeParkIndex(PARKDATA), getClub = C.clubResolver(parks);
const rijk = () => { const c = C.createCareer({ char: 'anita', index: parks }); c.flags.shareReady = true; return c; };

t('clubaandelen: pas zichtbaar na shareReady, kopen kost de schaalprijs, de club staat in de profielopslag', () => {
  const dicht = C.createCareer({ char: 'anita', index: parks });
  assert.equal(C.buyClubShare(dicht, dicht.club, 0.1, 1e6, getClub).ok, false, 'dicht');
  const c = rijk();
  assert.equal(C.buyClubShare(c, c.club, 0.1, 1000, getClub).ok, false, 'te weinig geld');
  const r = C.buyClubShare(c, c.club, 0.1, 10000, getClub);
  assert.ok(r.ok && r.price === 3000 && r.career.bezit.clubs[c.club].aandeel === 0.1);
  assert.equal(c.bezit.clubs[c.club], undefined, 'het oude profiel blijft ongewijzigd');
  assert.equal(C.buyClubShare(r.career, 'bestaatniet', 0.1, 1e6, getClub).ok, false, 'onbekende club');
  const back = C.normalize(C.serialize(r.career));
  assert.deepEqual(back.bezit, r.career.bezit);
  assert.equal(C.sellClubShare(r.career, c.club).price, 2250, '75% terug');
  assert.equal(C.sellClubShare(c, c.club).ok, false);
  assert.deepEqual(C.clubSharesOf(r.career).map((x) => x.club), [c.club]);
});
t('clubaandelen: een kapotte opslag wordt geschoond', () => {
  const c = rijk();
  const raw = JSON.parse(C.serialize(c)); raw.bezit = { clubs: { ok: { aandeel: 0.25, sinds: 3, prijs: 7500 }, slecht: { aandeel: 7, sinds: 1, prijs: 5 }, 'x y': { aandeel: 0.1 }, nul: { aandeel: 0 } } };
  const b = C.normalize(JSON.stringify(raw)).bezit;
  assert.deepEqual(Object.keys(b.clubs), ['ok']);
  assert.deepEqual(C.normalize(JSON.stringify({ ...raw, bezit: 'nep' })).bezit, { clubs: {} });
});
t('dividend: een ronde van de competitie betaalt het aandeel uit, een beker niet; geen aandeel geen regel', () => {
  let c = rijk(); c = C.buyClubShare(c, c.club, 0.25, 1e6, getClub).career;
  const zonder = rijk();
  c = C.advanceDays(c, 3, getClub).career; const z = C.advanceDays(zonder, 3, getClub).career;
  const r = C.playEvent(c, getClub, { gf: 1, ga: 0, stats: { goals: 1, minutes: 8 } });
  const d = r.summary.earn.filter((e) => e.bron === 'club');
  assert.equal(d.length, 1); assert.ok(d[0].amount > 0 && /^Dividend /.test(d[0].label));
  const r0 = C.playEvent(z, getClub, { gf: 1, ga: 0, stats: { goals: 1, minutes: 8 } });
  assert.equal(r0.summary.earn.filter((e) => e.bron === 'club').length, 0);
  assert.ok(d[0].amount < 100, 'rustig passief inkomen, nooit de snelste geldmachine');
});
t('het eerste aandeel komt klaar na genoeg voetbalgeld', () => {
  let c = C.createCareer({ char: 'anita', index: parks }); c.stats.earned = C.SHARE_READY_EARNED - 1;
  c = C.advanceDays(c, 3, getClub).career;
  const r = C.playEvent(c, getClub, { gf: 2, ga: 0, stats: { goals: 2, minutes: 8 } });
  assert.equal(r.career.flags.shareReady, true);
});
t('live: kopen haalt het geld van het saldo, verkopen stort 75% terug, zonder geld gebeurt er niets', () => {
  const mem = new Map(); V.useStorage({ getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, v) });
  V.useParkData(PARKDATA);
  const w = { money: 10000, addMessage() {} };
  V.replaceCareer(rijk());
  const club = V.getCareer().club;
  const r = V.buyShare(w, club, 0.1);
  assert.ok(r.ok); assert.equal(w.money, 7000);
  const arm = { money: 100, addMessage() {} };
  assert.equal(V.buyShare(arm, club, 0.1).ok, false); assert.equal(arm.money, 100);
  const s = V.sellShare(w, club);
  assert.ok(s.ok); assert.equal(w.money, 7000 + 2250);
  assert.equal(V.getSponsorPandIndex(), null, 'zonder Bezit-pandindex geen pand');
  V.zetPandIndexProbe(() => buildings);
  assert.ok(V.getSponsorPandIndex() && typeof V.getSponsorPandIndex().find === 'function');
  V.zetPandIndexProbe(null); V.useStorage(null);
});
console.log(`voetbal_bezit_test: ${n} ok`);
