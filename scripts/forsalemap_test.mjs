// De kaartlaag Te koop (#1098): standen, prijsstappen, clusters bij uitzoomen, het maximum aan vlakken, klikken en de kleurtaal (geen geel).
//   node scripts/forsalemap_test.mjs
import assert from 'node:assert/strict';
import * as F from '../game/js/forsalemap.js';
import { createParcelIndex } from '../game/js/parcelindex.js';
import { INK } from '../game/js/mapstyle.js';

let n = 0, fails = 0;
const t = (name, fn) => { n++; try { fn(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', String(e.message).split('\n')[0]); } };
const rows = [];
for (let i = 0; i < 600; i++) rows.push(['p' + (i + 1).toString(16).padStart(12, '0'), 1000 + (i % 30) * 60, 1000 + Math.floor(i / 30) * 60, 150 + (i % 7) * 40, i % 3 === 0 ? 0 : 1, i % 50 === 0 ? 4 : 0, 1000, 1000]);
const ix = createParcelIndex({ v: 1, kinds: ['w', 'a', 'b'], access: ['weg', 'pad', 'wegNabij', 'padNabij', 'geen'], rows });
const own = new Set(['p000000000002']);
const claims = { p000000000003: { name: 'Lotte', color: '#c0c' } };
const layer = F.forSaleLayer({ parcels: ix, ownsId: (id) => own.has(id), claimOf: (id) => claims[id] || null, priceOf: (p) => Math.round(p.ha * 2300) });
const all = [0, 0, 5000, 5000];

t('uitgezoomd: niets; ver: een telling per cel; dichtbij: losse percelen', () => {
  assert.equal(layer.view(all, 0.01).mode, 'none');
  const c = layer.view(all, 0.05);
  assert.equal(c.mode, 'clusters'); assert.ok(c.clusters.length >= 1);
  assert.equal(c.clusters.reduce((s, q) => s + q.n, 0), 600 - 12);   // percelen zonder toegang tellen niet mee
  const s = layer.view([1000, 1000, 1300, 1300], 0.3);
  assert.equal(s.mode, 'shapes'); assert.ok(s.shapes.length > 0);
});
t('standen: te koop, van jou, medespeler en niet te koop (geen toegang)', () => {
  const s = layer.view([900, 900, 3000, 3000], 0.3);
  const by = (id) => s.shapes.find((x) => x.id === id);
  assert.equal(by('p000000000002').state, 'own');
  assert.equal(by('p000000000003').state, 'claimed'); assert.equal(by('p000000000003').claim.name, 'Lotte');
  assert.equal(by('p000000000004').state, 'forSale');
  const locked = s.shapes.find((x) => x.access === 'geen');
  assert.equal(locked.state, 'locked'); assert.equal(locked.price, 0);
});
t('maximaal 250 vlakken, het totaal klopt wel', () => {
  const s = layer.view(all, 0.5);
  assert.ok(s.shapes.length <= F.MAX_SHAPES); assert.equal(s.total, 600);
});
t('prijsstappen: vier stappen op prijs per hectare', () => {
  assert.equal(F.priceStep(1000, 1), 0); assert.equal(F.priceStep(2000, 1), 1); assert.equal(F.priceStep(5000, 1), 2); assert.equal(F.priceStep(9000, 1), 3);
});
t('vorm: een schets met vier hoekpunten rond het binnenpunt', () => {
  const s = layer.view([1000, 1000, 1100, 1100], 0.5).shapes[0];
  assert.equal(s.punten.length, 4);
  const cx = s.punten.reduce((a, q) => a + q[0], 0) / 4, cy = s.punten.reduce((a, q) => a + q[1], 0) / 4;
  assert.ok(Math.hypot(cx - s.x, cy - s.y) < 1);
});
t('klikken: het vlak eronder, of niets', () => {
  const s = layer.view([1000, 1000, 1400, 1400], 0.5).shapes;
  const p = s[5];
  assert.equal(F.pickShape(s, p.x, p.y).id, p.id);
  assert.equal(F.pickShape(s, -5000, -5000), null);
  assert.equal(F.pickShape(null, 0, 0), null);
});
t('kleurtaal: geen geel voor te koop, elke stand heeft een patroon of vorm en een icoon, alle inkten bestaan', () => {
  for (const [id, st] of Object.entries(F.STATES)) {
    assert.ok(INK[st.ink], `${id}: onbekende ink ${st.ink}`);
    assert.notEqual(INK[st.ink], INK.yellow, `${id} mag niet geel zijn`);
    assert.ok(st.icon && st.label);
  }
  assert.ok(F.STATES.forSale.dash.length && F.STATES.locked.dash.length && F.STATES.claimed.dash.length && !F.STATES.own.dash.length, 'niet alleen kleur');
  assert.equal(F.LEGEND.length, 4);
});
t('zonder index of leeg: veilig', () => {
  const l = F.forSaleLayer({ parcels: null, ownsId: () => false, claimOf: () => null, priceOf: () => 0 });
  assert.equal(l.view(all, 0.5).mode, 'none');
});
t('prestatie: een beeld met 600 percelen onder 5 ms', () => {
  const t0 = performance.now();
  for (let i = 0; i < 50; i++) layer.view(all, 0.5);
  assert.ok((performance.now() - t0) / 50 < 5);
});
console.log(`forsalemap_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
