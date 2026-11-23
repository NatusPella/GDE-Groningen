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
t('de bodem is een DS3-balk met breedte, geen tekenblokken (#1233)', () => {
  const h = C.offerCardHtml(L.parcelOffer('pbbbbbbbbbbb2'), { money: w.money });
  assert.ok(h.includes('ds-z-balk__vul') && !/[█░]/.test(h));
  assert.match(C.soilMeter(0.75), /--ds-z-w:75%/);
});
t('de knoptekst heeft een spatie tussen label en prijs (#1256)', () => {
  const h = C.offerCardHtml(L.parcelOffer('pbbbbbbbbbbb2'), { money: w.money });
  assert.ok(!/<\/span><small>/.test(h), 'geen span direct tegen small');
});
t('#1233: de echte omtrek als plaatje bovenaan, noorden boven; zonder omtrek geen plaatje; de drie kernregels eerst', () => {
  const svg = C.parcelShapeSvg([[0, 0], [100, 0], [100, 50]]);
  assert.ok(/^<svg class="mv-perceel" viewBox="0 0 160 96"/.test(svg) && /aria-hidden="true"/.test(svg), svg);
  const pts = svg.match(/points="([^"]+)"/)[1].split(' ').map((q) => q.split(',').map(Number));
  assert.ok(pts[0][1] > pts[2][1], 'y naar het noorden staat boven in het plaatje');
  assert.ok(pts.every(([x, y]) => x >= 0 && x <= 160 && y >= 0 && y <= 96), 'binnen het vak');
  assert.equal(C.parcelShapeSvg(null), '');
  assert.equal(C.parcelShapeSvg([[0, 0], [1, 1]]), '', 'twee punten is geen vorm');
  assert.equal(C.parcelShapeSvg([[0, 0], [NaN, 1], [2, 2]]), '', 'geen NaN in het plaatje');
  const offer = L.parcelOffer('pbbbbbbbbbbb2');
  const zonder = C.offerCardHtml({ ...offer, shape: null }, { money: w.money });
  const met = C.offerCardHtml({ ...offer, shape: [[0, 0], [100, 0], [100, 80], [0, 80]] }, { money: w.money });
  assert.ok(!zonder.includes('mv-perceel') && met.includes('<svg class="mv-perceel"'), 'alleen met een echte omtrek');
  const kern = [...met.matchAll(/<div class="mv-kern"><dt>([^<]+)<\/dt>/g)].map((m) => m[1]);
  assert.deepEqual(kern, ['Oppervlakte', 'Bodem', 'Verwacht']);
});
console.log(`forsalecard_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
