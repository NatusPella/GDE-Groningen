// De haken van Bezit (#1098, #1099): aanbod en prijs, kopen met bevestiging van geld, het perceel verschijnt in de boerderij, verkopen met 75%,
// claim van een medespeler, de poort per akte, het terugdraaien na een nieuwe wereldbouw en opslag die niet schrijft.   node scripts/bezitlive_test.mjs
// Schrijft nooit naar echte opslag: de opslag is een nepobject.
import assert from 'node:assert/strict';
import * as L from '../game/js/bezitlive.js';
import * as BL from '../game/js/boerderijlive.js';
import * as GT from '../game/js/bezitgate.js';
import * as Z from '../game/js/bezit.js';
import * as PC from '../game/js/percelen.js';
import { KEYS } from '../game/js/storagekeys.js';

let n = 0, fails = 0;
const t = (name, fn) => { n++; try { fn(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', String(e.message).split('\n')[0]); } };
const nepOpslag = (start = {}) => { const m = new Map(Object.entries(start)); return { m, getItem: (k) => (m.has(k) ? m.get(k) : null), setItem(k, v) { m.set(k, String(v)); }, removeItem: (k) => m.delete(k) }; };
const FILE = { v: 1, kinds: ['w', 'a', 'b'], access: ['weg', 'pad', 'wegNabij', 'padNabij', 'geen'], places: [['Winsum', 220000, 590000]],
  rows: [['paaaaaaaaaaa1', 220100, 590100, 300, 0, 0, 220090, 590090], ['pbbbbbbbbbbb2', 220900, 590500, 1500, 1, 1, 220890, 590490], ['pcccccccccc3', 221000, 591000, 800, 1, 4, 221000, 591000]] };
const wereld = (money = 100000) => ({ money, msgs: [], addMessage(x) { this.msgs.push(x); } });
const reset = (store = nepOpslag()) => { L.initBezit({ opslag: store }); BL.initBoerderij({ opslag: store }); L.setIndexForTest(FILE); L.setClaimLookup(null); L.setClaimSend(null); GT.resetUnlockGate(); return store; };

t('aanbod: prijs, naam, streek, bodem en reden', () => {
  reset();
  const o = L.parcelOffer('paaaaaaaaaaa1');
  assert.ok(o.forSale && o.price >= 1200 && o.price % 50 === 0);
  assert.match(o.name, /^[A-Za-zë]+ bij Winsum \(K\d{4}\)$/);
  assert.equal(o.kindName, 'weide'); assert.equal(o.ha, 3);
  assert.ok(o.soil >= 0 && o.soil <= 1);
  const g = L.parcelOffer('pcccccccccc3');
  assert.equal(g.forSale, false); assert.match(g.reason, /geen toegang/);
  assert.equal(L.parcelOffer('pnietbestaand'), null);
});
t('kopen: geld eraf, perceel in bezit, register en boerderij, kasboek', () => {
  reset();
  const w = wereld(100000);
  const o = L.parcelOffer('paaaaaaaaaaa1');
  const r = L.koopPerceel(w, 'paaaaaaaaaaa1');
  assert.ok(r.ok, JSON.stringify(r));
  assert.equal(w.money, 100000 - o.price);
  assert.ok(L.getBezit().parcels.paaaaaaaaaaa1);
  assert.ok(PC.perceelDef('paaaaaaaaaaa1'));
  assert.ok(BL.getBoerderij().bedrijf.percelen.paaaaaaaaaaa1);
  assert.equal(L.parcelOffer('paaaaaaaaaaa1').mine, true);
  assert.equal(L.koopPerceel(w, 'paaaaaaaaaaa1').why, 'al-van-jou');
});
t('het gekochte perceel heeft een ligging (lat en lon) zodat het veld in de wereld gezocht kan worden', () => {
  reset();
  L.koopPerceel(wereld(), 'pbbbbbbbbbbb2');
  const d = PC.perceelDef('pbbbbbbbbbbb2');
  assert.ok(Number.isFinite(d.lat) && Number.isFinite(d.lon) && Number.isFinite(d.x));
  assert.deepEqual(L.getBezit().parcels.pbbbbbbbbbbb2.c, [220900, 590500]);
});
t('kopen: te weinig geld en geen toegang veranderen niets', () => {
  reset();
  const w = wereld(100);
  const r = L.koopPerceel(w, 'paaaaaaaaaaa1');
  assert.equal(r.ok, false); assert.equal(r.why, 'te-weinig-geld'); assert.match(r.text, /mist nog/);
  assert.equal(w.money, 100); assert.equal(Z.parcelCount(L.getBezit()), 0);
  assert.equal(L.koopPerceel(wereld(), 'pcccccccccc3').why, 'niet-te-koop');
});
t('verkopen levert 75% en haalt het perceel uit de boerderij; kopen en verkopen kost altijd geld', () => {
  reset();
  const w = wereld(100000);
  const r0 = L.koopPerceel(w, 'pbbbbbbbbbbb2');
  const v = L.verkoopPerceel(w, 'pbbbbbbbbbbb2');
  assert.ok(v.ok); assert.ok(v.refund < r0.cost);
  assert.ok(w.money < 100000);
  assert.equal(BL.getBoerderij().bedrijf.percelen.pbbbbbbbbbbb2, undefined);
  assert.equal(L.verkoopPerceel(w, 'pbbbbbbbbbbb2').ok, false);
});
t('schaalprijs: het tweede perceel kost meer dan hetzelfde als eerste', () => {
  reset();
  const eerste = L.parcelOffer('pbbbbbbbbbbb2').price;
  L.koopPerceel(wereld(), 'paaaaaaaaaaa1');
  assert.ok(L.parcelOffer('pbbbbbbbbbbb2').price > eerste);
});
t('claim van een medespeler: niet te koop in deze sessie, met zijn naam', () => {
  reset();
  L.setClaimLookup((id) => (id === 'paaaaaaaaaaa1' ? { name: 'Lotte', playerId: 'p2' } : null));
  const r = L.koopPerceel(wereld(), 'paaaaaaaaaaa1');
  assert.equal(r.why, 'geclaimd'); assert.match(r.text, /Lotte/);
  L.setClaimLookup(null);
  assert.ok(L.koopPerceel(wereld(), 'paaaaaaaaaaa1').ok);
});
t('claim wordt verstuurd bij kopen en loslaten', () => {
  reset();
  const sent = [];
  L.setClaimSend((m) => sent.push(m));
  const w = wereld();
  L.koopPerceel(w, 'paaaaaaaaaaa1'); L.verkoopPerceel(w, 'paaaaaaaaaaa1');
  assert.deepEqual(sent.map((m) => m.action), ['claim', 'release']);
});
t('poort: een dichte tak weigert met uitleg, open na de akte', () => {
  reset();
  let act = 1;
  GT.setUnlockGate(GT.makeActGate(() => act));
  const r = L.koopPerceel(wereld(), 'paaaaaaaaaaa1');
  assert.equal(r.why, 'dicht'); assert.match(r.text, /gaat open bij ".+" in het verhaal/); assert.doesNotMatch(r.text, /akte \d/i); // #912: de speler leest de hoofdstuknaam, nooit een aktenummer
  act = 2;
  assert.ok(L.koopPerceel(wereld(), 'paaaaaaaaaaa1').ok);
  GT.resetUnlockGate();
});
t('bezit blijft bij een nieuwe start: opslag en laden, ook met de boerderij', () => {
  const st = reset();
  const w = wereld();
  L.koopPerceel(w, 'paaaaaaaaaaa1');
  L.schrijfNu(); BL.schrijfNu();
  assert.ok(st.m.get(KEYS.bezit));
  L.initBezit({ opslag: st }); BL.initBoerderij({ opslag: st });
  assert.ok(L.getBezit().parcels.paaaaaaaaaaa1);
  assert.ok(BL.getBoerderij().bedrijf.percelen.paaaaaaaaaaa1, 'het perceel overleeft normaliseer dankzij het register');
});
t('na een nieuwe wereldbouw: een verdwenen perceel wordt teruggedraaid met volledige terugbetaling, eenmalig gemeld', () => {
  const st = reset();
  const w = wereld();
  const o = L.parcelOffer('paaaaaaaaaaa1');
  L.koopPerceel(w, 'paaaaaaaaaaa1'); L.schrijfNu();
  const leeg = { ...FILE, rows: FILE.rows.slice(1) };
  L.initBezit({ opslag: st }); BL.initBoerderij({ opslag: st });
  L.setIndexForTest(leeg);
  const rep = L.takeReconcileReport();
  assert.equal(rep.refund, o.price);
  assert.equal(L.takeReconcileReport(), null);
  assert.equal(Z.parcelCount(L.getBezit()) - Object.values(L.getBezit().parcels).filter((p) => p.lg).length, 0);
});
t('een opslag die niet schrijft laat het spel doorgaan', () => {
  const kapot = { getItem: () => null, setItem() { throw new Error('vol'); }, removeItem() {} };
  reset(kapot);
  assert.ok(L.koopPerceel(wereld(), 'paaaaaaaaaaa1').ok);
  L.schrijfNu();
});

console.log(`bezitlive_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
