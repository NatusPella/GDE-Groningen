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
console.log(`voetbal_bezit_test: ${n} ok`);
