// Velden en Team (24-11, bezitvelden.js): de HTML van lijst, detail, bulk en team; de gele hoofdactie; gast bij Samen spelen.   node scripts/bezitvelden_test.mjs
import assert from 'node:assert/strict';
import * as V from '../game/js/bezitvelden.js';
import { hireWorker, staffOf } from '../game/js/farmstaff.js';

let n = 0, fails = 0;
const t = (name, fn) => { n++; try { fn(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', String(e.message).split('\n')[0]); } };
const rij = (o = {}) => ({ id: 'a', name: 'Wierdeakker', kind: 'a', soort: 'akker', ha: 2, region: 'Hoogkerk', level: 'self', statusId: 'rijp', ripe: true, groei: 1, crop: 'graan', plan: 'graan', expectedKg: 3600, incomeDay: 0, herd: null, attention: ['rijp'], ...o });
const bezit = { parcels: { a: { p: 2400, k: 'a', ha: 2, m: 'self' }, b: { p: 3000, k: 'w', ha: 5, m: 'self' } }, x: { herds: {} }, buildings: new Set() };
const ctx = (o = {}) => ({ bezit: { ...bezit, x: { staff: { workers: [] }, herds: {} } }, rows: [rij()], money: 5000, gast: false, ...o });

t('fasen: een rijp veld staat op Rijp, een braak veld op Zaaien; vee heeft geen fasen', () => {
  const rijp = V.fasenHtml(rij());
  assert.ok(/is-klaar[\s\S]*is-nu[\s\S]*<b>Rijp<\/b>/.test(rijp) && (rijp.match(/is-klaar/g) || []).length === 3);
  assert.ok(/is-nu"><i>[\s\S]*<b>Zaaien/.test(V.fasenHtml(rij({ statusId: 'braak', ripe: false, groei: 0 }))));
  assert.equal(V.fasenHtml(rij({ herd: { sp: 'melkvee', n: 5, sick: 0 } })), '');
  assert.equal(V.faseIndex(rij({ statusId: 'groeiend', ripe: false })), 2);
});
t('lijst: een rij heeft een vinkvak, een kies-knop en een woord voor de stand (geen kleur alleen)', () => {
  const h = V.rijHtml(rij(), { sel: true, vink: false });
  assert.match(h, /data-vd="vink"/); assert.match(h, /data-vd="kies"/); assert.match(h, /aria-current="true"/); assert.match(h, /Oogstklaar/);
  assert.match(V.rijHtml(rij({ ripe: false, statusId: 'braak' }), { sel: false, vink: true }), /Ligt braak[\s\S]*|bz-vink--aan/);
  assert.match(V.rijHtml(rij({ herd: { sp: 'melkvee', n: 14, sick: 3 }, ripe: false }), { sel: false, vink: false }), /Ziek/);
});
t('hero: rijp = de gele Oogsten; een gast ziet Zet op de kaart; een ziek veld Bel de dierenarts; groeiend heeft geen gele knop', () => {
  const sel = V.detailHtml(rij(), ctx());
  assert.match(sel, /<button type="button" class="ds-z-knop" data-vd="oogst">Oogsten<\/button>/);
  assert.match(sel, /± 3\.600 kg/);
  const gast = V.detailHtml(rij(), ctx({ gast: true }));
  assert.ok(!gast.includes('data-vd="oogst"') && gast.includes('data-vd="kaart"') && gast.includes('Zet op de kaart') && gast.includes('eigen spel'));
  const ziek = V.detailHtml(rij({ ripe: false, herd: { sp: 'melkvee', n: 14, sick: 3 } }), ctx({ bezit: { ...bezit, x: { staff: { workers: [] }, herds: { a: { sp: 'melkvee', n: 14, sick: 3 } } } } }));
  assert.match(ziek, /Bel de dierenarts/); assert.match(ziek, /bz-hero--probleem/);
  const groeit = V.detailHtml(rij({ ripe: false, statusId: 'groeiend', groei: 0.62 }), ctx());
  assert.ok(!/<button type="button" class="ds-z-knop" data-vd/.test(groeit), 'geen gele knop zonder doel');
});
t('detail: het gebruik is een segment met het bedrag per dag, het gewas een segment, de verzekering een knop', () => {
  const h = V.detailHtml(rij(), ctx());
  assert.match(h, /role="radiogroup" aria-label="Gebruik"/); assert.match(h, /data-mode="leased"/); assert.match(h, /aria-checked="true"[^>]*data-vd="gebruik" data-mode="self"/);
  assert.match(h, /aria-label="Gewas"/); assert.match(h, /data-vd="verzeker"/); assert.match(h, /Team beheren/);
  assert.ok(!/ds-z-chip/.test(h), 'geen chips');
});
t('bulk: meerdere velden geven één gele knop voor wat past en de reden bij wat niet kan', () => {
  const sel = [rij(), rij({ id: 'z', name: 'Zuidhorn', statusId: 'braak', ripe: false, groei: 0 })];
  const h = V.bulkDetailHtml(sel, { bezit: ctx().bezit, money: 10 });
  assert.match(h, /2 velden gekozen/); assert.match(h, /Oogst 1 veld/); assert.match(h, /data-vd="zaai"/); assert.match(h, /Je mist nog/);
  assert.equal((h.match(/class="ds-z-knop" data-vd/g) || []).length, 1, 'één gele knop');
});
t('velden: kaart, lijst en detail in één raster; zonder velden niets', () => {
  assert.equal(V.veldenHtml({ rows: [], bezit: ctx().bezit }), '');
  const h = V.veldenHtml({ rows: [rij(), rij({ id: 'b', name: 'Eenrum' })], bezit: ctx().bezit, money: 1, sel: 'a', vlakken: [{ id: 'a', x: 1, y: 1, statusId: 'rijp', level: 'self', naam: 'A' }] });
  assert.match(h, /class="bz-md"/); assert.match(h, /bz-kaartvlak/); assert.match(h, /bz-legenda/); assert.match(h, /ds-z-stapper/); assert.match(h, /2 velden/);
});
t('team: lijst, capaciteit en drie aannemkaarten; ontslaan vraagt een tweede druk', () => {
  const b = { ...bezit, x: { herds: {} } };
  hireWorker(b, 2, 0);
  const w1 = staffOf(b).workers[0];
  const h = V.teamHtml({ bezit: b, money: 100 });
  assert.ok(w1 && h.includes(w1.name)); assert.match(h, /data-vd="huur" data-skill="3"/); assert.ok(h.includes(`data-vd="ontsla" data-id="${w1.id}"`));
  assert.match(V.teamHtml({ bezit: b, money: 100, confirm: `ontsla:${w1.id}` }), /Zeker\?[\s\S]*data-ok="1"/);
});
console.log(`bezitvelden_test: ${n - fails}/${n} ok`);
if (fails) process.exit(1);
