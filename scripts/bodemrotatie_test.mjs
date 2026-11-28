// De bodem zichtbaar en de rotatiebeloning (#1373, audit B5): drie verschillende gewassen achter elkaar op een perceel geven meer opbrengst en vermoeien de grond minder,
// dezelfde teelt put hem twee keer zo hard uit, de vruchtbaarheid en een advies staan in het veldkaartmodel, en een oude opslag zonder geschiedenis laadt gewoon.
//   node scripts/bodemrotatie_test.mjs
import './node3d.mjs';
import assert from 'node:assert/strict';
import * as B from '../game/js/boerderij.js';
import { veldKaart } from '../game/js/farmmodel.js';

let n = 0, fails = 0;
const t = (name, fn) => { n++; try { fn(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', String(e.message).split('\n')[0]); } };

// Eén hele teelt op het actieve perceel: ploegen, zaaien, groeien, oogsten. Geeft de verwachte kilo's vlak vóór de oogst.
function teelt(b, gewas, { mest = true } = {}) {
  B.rondTaakAf(b, 'ploegen', 1);
  B.kiesGewas(b, gewas);
  B.rondTaakAf(b, 'cultiveren', 1);
  B.rondTaakAf(b, 'zaaien', 1, { gewas });
  if (mest) B.rondTaakAf(b, 'bemesten', 1);
  b.uren += B.GEWASSEN[gewas].groeiUren + 1;
  const kg = B.opbrengstKg(b);
  const voor = (b.bodemlog[b.veldVan] || { u: 0 }).u;
  B.rondTaakAf(b, 'oogsten', 1);
  teelt.du = Math.round((b.bodemlog[b.veldVan].u - voor) * 1000) / 1000;   // wat alleen de oogst aan de grond deed
  return kg;
}

t('drie verschillende gewassen achter elkaar geven vijf procent meer; twee gelijke geen bonus', () => {
  const b = B.nieuweBoerderij();
  const id = b.veldVan;
  assert.equal(B.rotatieBonus(b, id, 'graan'), 0, 'nog geen geschiedenis');
  teelt(b, 'aardappelen');
  assert.equal(B.rotatieBonus(b, id, 'graan'), 0, 'twee gewassen is nog geen rotatie');
  teelt(b, 'graan');
  assert.equal(B.rotatieBonus(b, id, 'uien'), B.ROTATIE_BONUS, 'aardappelen, graan, uien: drie verschillende');
  assert.equal(B.rotatieBonus(b, id, 'graan'), 0, 'graan staat al in de laatste twee');
  assert.equal(B.rotatieBonus(b, id, 'aardappelen'), 0);
  assert.deepEqual(b.bodemlog[id].h, ['aardappelen', 'graan']);
});

t('met rotatie meer kilo en een moeie grond herstelt eerder dan met monocultuur', () => {
  const rot = B.nieuweBoerderij(), mono = B.nieuweBoerderij();
  const id = rot.veldVan;
  // rotatie: a g u b ; monocultuur: a a a a
  const rk = ['aardappelen', 'graan', 'uien', 'bieten'].map((g) => teelt(rot, g));
  const mk = ['aardappelen', 'aardappelen', 'aardappelen', 'aardappelen'].map((g) => teelt(mono, g));
  assert.ok(rot.bodemlog[id].u < mono.bodemlog[id].u, `uitputting ${rot.bodemlog[id].u} < ${mono.bodemlog[id].u}`);
  // de derde teelt (uien) heeft de bonus, de eerste twee niet
  const zonderBonus = (() => { const x = B.nieuweBoerderij(); teelt(x, 'aardappelen'); teelt(x, 'aardappelen'); return teelt(x, 'uien'); })();
  assert.ok(rk[2] > zonderBonus * 1.03, `met rotatie ${rk[2]} > zonder ${zonderBonus}`);
  assert.ok(mk[3] < mk[0], 'monocultuur levert steeds minder');
});

t('dezelfde teelt put de grond twee keer zo hard uit als wisselen, en drie verschillende maar half zo hard', () => {
  const b = B.nieuweBoerderij();
  teelt(b, 'aardappelen'); const eerste = teelt.du;                      // eerste oogst: 0,04
  teelt(b, 'aardappelen'); const zelfde = teelt.du;                      // dezelfde teelt: 0,08
  const c = B.nieuweBoerderij(); teelt(c, 'aardappelen'); teelt(c, 'graan'); const wissel = teelt.du;   // twee verschillende: 0,04
  teelt(c, 'uien'); const rotatie = teelt.du;                            // drie verschillende: 0,02
  assert.equal(eerste, 0.04); assert.equal(zelfde, 0.08); assert.equal(wissel, 0.04); assert.equal(rotatie, 0.02);
});

t('het veldkaartmodel toont vruchtbaarheid en een advies', () => {
  const b = B.nieuweBoerderij(); const id = b.veldVan;
  let k = veldKaart(b, id);
  assert.equal(k.vruchtbaar, 100); assert.equal(k.advies, '');
  teelt(b, 'aardappelen');
  k = veldKaart(b, id);
  assert.equal(k.vruchtbaar, 96);
  assert.match(k.advies, /Wissel van gewas: aardappelen/);
  teelt(b, 'graan');
  assert.match(veldKaart(b, id).advies, /Zaai nu niet aardappelen of graan: drie verschillende gewassen achter elkaar geven 5% meer/);
  for (let i = 0; i < 4; i++) teelt(b, 'aardappelen', { mest: false });
  assert.ok(b.bodemlog[id].u >= 0.2);
  assert.match(veldKaart(b, id).advies, /grond is moe/);
  assert.ok(veldKaart(b, id).vruchtbaar >= 70, 'de ondergrens is 70%');
});

t('de verwachting op de kaart en de echte oogst gebruiken dezelfde rotatie', () => {
  const b = B.nieuweBoerderij(); const id = b.veldVan;
  teelt(b, 'aardappelen'); teelt(b, 'graan');
  B.kiesGewas(b, 'uien');
  const met = veldKaart(b, id).verwachting.kg;
  b.bodemlog[id].h = ['uien', 'uien'];
  const zonder = veldKaart(b, id).verwachting.kg;
  assert.ok(met > zonder, `${met} > ${zonder}`);
});

t('opslag: de geschiedenis blijft bewaard, een oude opslag zonder geschiedenis laadt gewoon en rommel valt weg', () => {
  const b = B.nieuweBoerderij(); const id = b.veldVan;
  teelt(b, 'aardappelen'); teelt(b, 'graan');
  const terug = B.normaliseer(JSON.parse(JSON.stringify(b)));
  assert.deepEqual(terug.bodemlog[id].h, ['aardappelen', 'graan']);
  const oud = JSON.parse(JSON.stringify(b)); delete oud.bodemlog[id].h;
  assert.deepEqual(B.normaliseer(oud).bodemlog[id].h, []);
  const rommel = JSON.parse(JSON.stringify(b)); rommel.bodemlog[id].h = ['nep', 'graan', 7, 'uien', 'bieten'];
  assert.deepEqual(B.normaliseer(rommel).bodemlog[id].h, ['uien', 'bieten']);
});

console.log(`bodemrotatie_test: ${n - fails}/${n}`);
process.exit(fails ? 1 : 0);
