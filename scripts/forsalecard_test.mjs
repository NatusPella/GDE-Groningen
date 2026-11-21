// De perceelkaart (#1098): inhoud, Koop met bevestiging, te weinig geld, van jou met Verkoop, medespeler, niet te koop, en de Nederlandse taal.
//   node scripts/forsalecard_test.mjs
import assert from 'node:assert/strict';
import * as C from '../game/js/forsalecard.js';
import * as L from '../game/js/bezitlive.js';
import * as BL from '../game/js/boerderijlive.js';

let n = 0, fails = 0;
const t = (name, fn) => { n++; try { fn(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', String(e.message).split('\n')[0]); } };
const nep = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };
const FILE = { v: 1, kinds: ['w', 'a', 'b'], access: ['weg', 'pad', 'wegNabij', 'padNabij', 'geen'], places: [['Winsum', 220000, 590000]],
  rows: [['paaaaaaaaaaa1', 220100, 590100, 300, 0, 0, 220090, 590090], ['pbbbbbbbbbbb2', 220900, 590500, 1500, 1, 1, 220890, 590490], ['pcccccccccc3', 221000, 591000, 800, 1, 4, 221000, 591000]] };
const st = nep();
L.initBezit({ opslag: st }); BL.initBoerderij({ opslag: st }); L.setIndexForTest(FILE); L.setClaimLookup(null);
const w = { money: 50000, addMessage() {} };

t('te koop: naam-vrije inhoud met soort, oppervlakte, bodem, ligging, verkoper, verwachting, prijs en Koop', () => {
  const h = C.offerCardHtml(L.parcelOffer('pbbbbbbbbbbb2'), { money: w.money });
  for (const x of ['Soort', 'akker', '15,0 ha', 'Bodem', 'Ligging', 'aan een pad', 'Verkoper', 'Verwacht', 'kg aardappelen', 'data-card="bezit-koop"', 'Koop']) assert.ok(h.includes(x), x);
  assert.ok(!h.includes('data-card="bezit-ok"'));
});
t('Koop vraagt eerst een bevestiging met wat je overhoudt', () => {
  const o = L.parcelOffer('pbbbbbbbbbbb2');
  const h = C.offerCardHtml(o, { stap: 'koop', money: 50000 });
  assert.ok(h.includes('data-card="bezit-ok"') && h.includes('data-card="bezit-annuleer"'));
  assert.ok(h.includes('Je houdt'));
  assert.ok(!h.includes('aria-disabled="true"'));
});
t('te weinig geld: de bevestiging toont het tekort en de knop staat uit', () => {
  const h = C.offerCardHtml(L.parcelOffer('pbbbbbbbbbbb2'), { stap: 'koop', money: 10 });
  assert.ok(h.includes('Je mist nog') && h.includes('aria-disabled="true"'));
});
t('van jou: Verkoop met 75% en een bevestiging; geen Koop', () => {
  L.koopPerceel(w, 'paaaaaaaaaaa1');
  const o = L.parcelOffer('paaaaaaaaaaa1');
  const h = C.offerCardHtml(o, {});
  assert.ok(h.includes('Van jou') && h.includes('data-card="bezit-verkoop"') && !h.includes('bezit-koop"'));
  const b = C.offerCardHtml(o, { stap: 'verkoop' });
  assert.ok(b.includes('bezit-verkoop-ok') && b.includes('onomkeerbaar'));
});
t('medespeler en geen toegang: een reden, geen koopknop', () => {
  L.setClaimLookup((id) => (id === 'pbbbbbbbbbbb2' ? { name: 'Lotte' } : null));
  const c = C.offerCardHtml(L.parcelOffer('pbbbbbbbbbbb2'), {});
  assert.ok(c.includes('Lotte') && !c.includes('data-card="bezit-koop"'));
  L.setClaimLookup(null);
  const g = C.offerCardHtml(L.parcelOffer('pcccccccccc3'), {});
  assert.ok(g.includes('geen toegang') && !g.includes('bezit-koop'));
});
t('meldingen worden ontsnapt en geen leeg perceel geeft een lege kaart', () => {
  const h = C.offerCardHtml(L.parcelOffer('pbbbbbbbbbbb2'), { melding: '<b>x</b>' });
  assert.ok(h.includes('&lt;b&gt;') && !h.includes('<b>x</b>'));
  assert.equal(C.offerCardHtml(null), '');
});
t('verwachte opbrengst volgt soort, bodem en grootte', () => {
  const a = C.expectedYield('a', 1.2, 0.75), b = C.expectedYield('a', 4.8, 0.75), c = C.expectedYield('a', 1.2, 0.3);
  assert.ok(b.kg > 3.9 * a.kg && b.kg <= 4.1 * a.kg); assert.ok(c.kg < a.kg);
  assert.equal(C.expectedYield('w', 2, 0.6).gewas, 'Gras'); assert.equal(C.expectedYield('b', 2, 0.6).gewas, 'Boomgaardfruit');
});
t('hoverregel: Nederlands en met prijs', () => {
  assert.match(C.pointerSub(L.parcelOffer('pbbbbbbbbbbb2')), /akker · 15,0 ha · te koop €/);
  assert.match(C.pointerSub(L.parcelOffer('paaaaaaaaaaa1')), /van jou/);
});
t('de bodembalk heeft altijd tien tekens', () => { for (const q of [0, 0.3, 0.75, 1]) assert.equal(C.soilBar(q).length, 10); });
console.log(`forsalecard_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
