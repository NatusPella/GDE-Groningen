// Test van de sponsorpanden (#1102/#1118): pandkeuze per sponsortype, uitsluiting, gevelnaam, eigenaarsbonus (max +10%, nooit een tweede uitbetaling).   node scripts/sponsorpanden_test.mjs
import assert from 'node:assert/strict';
import * as SP from '../game/js/sponsorpanden.js';
import * as V from '../game/js/voetbalsponsors.js';
import * as L from '../game/js/bezitlive.js';
import * as BL from '../game/js/boerderijlive.js';

let n = 0;
const t = (name, fn) => { try { fn(); n++; } catch (e) { console.error('FAIL', name); throw e; } };
const st = { m: new Map(), getItem(k) { return this.m.has(k) ? this.m.get(k) : null; }, setItem(k, v) { this.m.set(k, String(v)); }, removeItem(k) { this.m.delete(k); } };
L.initBezit({ opslag: st }); BL.initBoerderij({ opslag: st });
// types: 0 retail, 1 industrial, 2 hospital, 3 commercial, 4 house
const rows = [
  [1, 100, 0, 120, 0, 3, 0],      // klein winkelpand dichtbij (bakker, snackbar, fiets)
  [2, 300, 0, 900, 0, 6, 0],      // groot winkelpand (bouwmarkt, supermarkt)
  [3, 500, 0, 1200, 1, 8, 0],     // bedrijfshal (zuivel, energie)
  [4, 50, 0, 400, 2, 9, 0],       // ziekenhuis: uitgesloten
  [5, 80, 0, 100, 0, 3, 1],       // monument: nooit
  [6, 20, 0, 90, 4, 3, 0],        // woning: past nergens
  [7, 2000, 0, 500, 3, 6, 0],     // verder weg, commercieel
  [8, 1500, 0, 200, 3, 4, 0],     // kleiner commercieel pand verder weg
];
L.setIndexForTest({ v: 1, kinds: ['w', 'a', 'b'], access: ['weg'], places: [['Winsum', 0, 0, 800]], rows: [] }, { v: 1, types: ['retail', 'industrial', 'hospital', 'commercial', 'house'], rows });

t('elk sponsorpandtype heeft een specificatie', () => { for (const d of Object.values(V.SORTS)) assert.ok(SP.SPEC[d.pand], d.pand); });
t('pandkeuze: dichtstbijzijnde passende, monument en ziekenhuis en woning nooit', () => {
  assert.equal(SP.findSponsorBuilding('bakery', [0, 0]), 1);
  assert.equal(SP.findSponsorBuilding('fast_food', [0, 0]), 1);
  assert.equal(SP.findSponsorBuilding('supermarket', [0, 0]), 2);
  assert.equal(SP.findSponsorBuilding('doityourself', [0, 0]), 2);
  assert.equal(SP.findSponsorBuilding('dairy', [0, 0]), 3);
  assert.equal(SP.findSponsorBuilding('energy', [0, 0]), 3);
  for (const d of Object.values(V.SORTS)) { const o = SP.findSponsorBuilding(d.pand, [0, 0]); assert.ok(o == null || ![4, 5, 6].includes(o), d.pand); }
});
t('onbekend type, rare plaats en lege index geven null, nooit een fout', () => {
  assert.equal(SP.findSponsorBuilding('onzin', [0, 0]), null);
  assert.equal(SP.findSponsorBuilding('bank', [NaN, 0]), null);
  assert.equal(SP.findSponsorBuilding('bank', null), null);
  assert.equal(SP.findSponsorBuilding('bank', [0, 0], { index: { buildings: { near: () => [] } } }), null);
  assert.equal(SP.pickSponsorBuilding(null, 'bank', [0, 0]), null);
});
t('het gekozen pand is koopbaar via de gewone Bezit-flow', () => {
  const o = L.buildingOffer(SP.findSponsorBuilding('bakery', [0, 0]));
  assert.ok(o.forSale && o.price > 0);
  assert.equal(L.buildingOffer(4).forSale, false);
});
t('deterministisch en een pand krijgt maar een sponsor', () => {
  assert.equal(SP.findSponsorBuilding('bakery', [0, 0]), SP.findSponsorBuilding('bakery', [0, 0]));
  SP.syncSponsorDeals({ slots: [{ accepted: true, osm: 1, naam: 'Knappe Oven' }] });
  assert.equal(SP.findSponsorBuilding('bakery', [0, 0]), 8);        // 1 is bezet; 8 is het volgende kleine pand
  SP.syncSponsorDeals(null);
});
t('interface: voetbalsponsors.accept gebruikt de geregistreerde index en kent de gevelnaam', () => {
  SP.registerSponsorPanden();
  const sp = V.newSponsors('lc1', 'terp', 1);
  const slot = sp.slots.find((x) => V.SORTS[x.sort].pand !== 'x');
  const r = V.accept(sp, slot.id, null, [0, 0]);
  assert.ok(r.ok);
  const want = SP.findSponsorBuilding(V.SORTS[slot.sort].pand, [0, 0]);
  assert.equal(r.slot.osm, want);
  SP.syncSponsorDeals(r.sponsors);
  if (want != null) assert.equal(SP.sponsorNameOf(want), slot.naam);
  assert.equal(SP.sponsorNameOf(999), null);
  V.setPandIndex(null);
  assert.equal(V.accept(sp, slot.id, null, [0, 0]).slot.osm, null);
});
t('eigenaarsbonus: alleen thuis en als eigenaar, hooguit +10%, nooit een uitbetaling', () => {
  const w = { money: 1e7, addMessage() {} };
  SP.syncSponsorDeals({ slots: [{ accepted: true, osm: 1, naam: 'Knappe Oven' }] });
  assert.equal(SP.ownerRevMult(1, { isHomeDay: true, form: 3 }), 1);        // nog niet van jou
  assert.ok(L.koopPand(w, 1).ok);
  assert.equal(SP.ownerRevMult(1, { isHomeDay: false }), 1);
  assert.equal(SP.ownerRevMult(2, { isHomeDay: true }), 1);                 // geen sponsorpand
  for (const form of [0, 1, 1.5, 3, 10]) { const f = SP.ownerRevMult(1, { isHomeDay: true, form }); assert.ok(f > 1 && f <= 1 + SP.OWNER_BONUS_MAX + 1e-9, `${form} ${f}`); }
  assert.equal(V.ownerBonus({ isHomeDay: true, ownsPand: true, form: 9 }).extraPayout, 0);
  assert.deepEqual(SP.eventModsFor(1, { revMult: 1.2 }, 5), { revMult: 1.2 });          // geen thuishaak: ongewijzigd
  SP.setCareerHooks({ homeDayOf: (d) => d === 5, formOf: () => 1 });
  const m = SP.eventModsFor(1, { revMult: 1.2 }, 5);
  assert.ok(m.revMult > 1.2 && m.revMult <= 1.2 * 1.1 + 1e-9);
  assert.equal(SP.eventModsFor(1, { revMult: 1.2 }, 6).revMult, 1.2);
  assert.equal(SP.eventModsFor(1, { closed: true }, 5).closed, true);                    // staking: geen omzet, geen bonus
  assert.equal(SP.eventModsFor(1, {}, 5).revMult, SP.ownerRevMult(1, { isHomeDay: true }));
});
t('bezitlive-haak: setEventHook is aanwezig en herstelt zich bij een ongeldige waarde', () => { assert.equal(typeof L.setEventHook, 'function'); L.setEventHook(null); L.setEventHook(SP.eventModsFor); });
t('broncontrole: geen netwerk, geen DOM, geen cyclus naar voetbalsponsors', async () => {
  const fs = await import('node:fs');
  const src = fs.readFileSync(new URL('../game/js/sponsorpanden.js', import.meta.url), 'utf8');
  assert.ok(!/fetch\(|document\.|window\./.test(src));
  const vs = fs.readFileSync(new URL('../game/js/voetbalsponsors.js', import.meta.url), 'utf8');
  assert.ok(!/sponsorpanden|bezitlive/.test(vs.replace(/\/\/.*$/gm, '')));
});
t('linkCareer: sync na laden en na wijziging, thuisdag alleen vandaag, vorm van de carrière', () => {
  let career = { sponsors: { slots: [{ accepted: true, osm: 777, naam: 'Weidevreugd Zuivel' }] } }, listener = null, today = 10, home = true;
  const off = SP.linkCareer({ getCareer: () => career, subscribe: (f) => { listener = f; return () => { listener = null; }; }, homeMatchToday: () => home, formOf: () => 1.2, getClub: () => null, today: () => today });
  assert.equal(SP.sponsorNameOf(777), 'Weidevreugd Zuivel');
  career = { sponsors: { slots: [{ accepted: true, osm: 778, naam: 'Gouden Bakkerij' }] } }; listener(career);
  assert.equal(SP.sponsorNameOf(777), null); assert.equal(SP.sponsorNameOf(778), 'Gouden Bakkerij');
  assert.equal(typeof off, 'function');
  const mods = { revMult: 1 };
  assert.ok(SP.eventModsFor(778, mods, 9).revMult === 1);                       // een andere dag: nooit een thuisbonus
  L.getBezit().buildings.add(778);
  assert.ok(SP.eventModsFor(778, mods, today).revMult > 1 && SP.eventModsFor(778, mods, today).revMult <= 1 + V.OWNER_BONUS_MAX + 1e-9);
  home = false; assert.ok(SP.eventModsFor(778, mods, today).revMult > 1, 'de thuisdag is onthouden');   // ook nadat de wedstrijd gespeeld is
  assert.equal(SP.eventModsFor(778, mods, today + 1).revMult, 1);
  L.getBezit().buildings.delete(778);
  SP.syncSponsorDeals(null);
});
t('thuisdag wordt onthouden: een rekendag na slapen krijgt de bonus, een andere dag niet', () => {
  let career = { sponsors: { slots: [{ accepted: true, osm: 790, naam: 'Weide Bank' }] } }, listener = null, today = 20, home = true;
  const off = SP.linkCareer({ getCareer: () => career, subscribe: (f) => { listener = f; return () => { listener = null; }; }, homeMatchToday: () => home, formOf: () => 1, getClub: () => null, today: () => today });
  L.getBezit().buildings.add(790);
  home = false; today = 22;                                                      // de wedstrijd van dag 20 is gespeeld, het is dag 22
  assert.ok(SP.eventModsFor(790, { revMult: 1 }, 20).revMult > 1);
  assert.equal(SP.eventModsFor(790, { revMult: 1 }, 21).revMult, 1);
  assert.equal(SP.eventModsFor(790, { revMult: 1 }, 22).revMult, 1);
  off(); L.getBezit().buildings.delete(790); SP.syncSponsorDeals(null);
});
t('sponsor aangenomen voor het laden van de index: het pand komt er alsnog, een tweede keer verandert niets', () => {
  SP.registerSponsorPanden();
  let career = { club: 'club-a', sponsors: V.accept(V.newSponsors('club-a', 'talent', 1), 'sp1-0', { find: () => null }, [0, 0]).sponsors };
  assert.equal(career.sponsors.slots[0].osm, null);
  const r = V.resolveMissingPanden(career.sponsors, { find: () => 4242 }, [0, 0]);
  assert.equal(r.changed, 1); assert.equal(r.sponsors.slots[0].osm, 4242); assert.equal(career.sponsors.slots[0].osm, null);
  assert.equal(V.resolveMissingPanden(r.sponsors, { find: () => 9 }, [0, 0]).changed, 0);
  assert.equal(V.resolveMissingPanden(career.sponsors, { find: () => 4242 }, null).changed, 0);     // zonder plaats niets
  assert.equal(V.resolveMissingPanden(career.sponsors, { find: () => null }, [0, 0]).changed, 0);
  let saved = null, ready = null;
  const off = SP.linkCareer({ getCareer: () => career, subscribe: () => () => {}, homeMatchToday: () => false, formOf: () => 1, getClub: () => null, replaceCareer: (c) => { saved = c; career = c; }, clubPlace: () => [0, 0] });
  assert.equal(typeof off, 'function');
  off();
  assert.equal(SP.resolvePendingSponsors({ getCareer: () => ({ club: 'x', sponsors: null }), replaceCareer: () => assert.fail('geen carrière'), clubPlace: () => [0, 0] }), 0);
});
t('accept met plaats: het pand komt uit de index bij de plek van de club, zonder plaats niets', () => {
  SP.registerSponsorPanden();
  const sp = V.newSponsors('club-a', 'talent', 1);
  const slot = sp.slots[0];
  const a = V.accept(sp, slot.id, null, [100, 0]), b = V.accept(sp, slot.id, null, null);
  assert.equal(b.slot.osm, null);
  assert.ok(a.slot.osm === null || Number.isFinite(a.slot.osm));
});
console.log(`sponsorpanden_test: ${n} tests groen`);
