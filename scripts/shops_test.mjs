// De hengelhoek in de winkel (#492): hengels, aas en een sterkere lijn van je eigen geld, met je eigen tuig in
// gde-hengeltuig-v1. De winkelmodule trekt three.js uit de CDN, dus deze test laadt node3d.mjs eerst.
//   node scripts/shops_test.mjs
import './node3d.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as TUIG from '../game/js/hengeltuig.js';
import * as LIVE from '../game/js/hengeltuiglive.js';
import { KEYS } from '../game/js/storagekeys.js';
import { winkelMagVoorGast } from '../game/js/coopgast.js';

const S = await import('../game/js/shops.js');

let n = 0, fails = 0;
const t = (name, fn) => { n++; try { fn(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', e.message.split('\n').slice(0, 3).join(' | ')); } };
const read = (f) => fs.readFileSync(new URL('../game/js/' + f, import.meta.url), 'utf8');

function nepOpslag() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)); }, removeItem: (k) => m.delete(k), _m: m };
}
const st = nepOpslag();
const wereld = (money = 1000) => ({ money });
const alles = (w) => S.hengelSections(w).flatMap((s) => s.items);
const item = (w, id) => alles(w).find((x) => x.id === id);
const opnieuw = () => { st._m.clear(); LIVE.zetTuigVoorTest(null, st); LIVE.initHengeltuig({ opslag: st }); };

t('de hengelhoek heeft twee schappen: vier hengels met de lijn, en zes soorten aas', () => {
  opnieuw();
  const sec = S.hengelSections(wereld());
  assert.deepEqual(sec.map((s) => s.title), ['Hengels en lijn', 'Aas']);
  assert.deepEqual(sec.map((s) => s.items.length), [5, 6]);
  assert.deepEqual(sec[0].items.slice(0, 4).map((i) => i.id), TUIG.HENGELS.map((h) => 'hg-' + h.id));
  assert.equal(sec[0].items[4].id, 'lijn-up');
  assert.deepEqual(sec[1].items.map((i) => i.id), TUIG.AAS.map((a) => 'as-' + a.id));
});

t('de prijzen in de winkel zijn de prijzen van het tuig, en zonder geld staat een hengel op slot', () => {
  opnieuw();
  const w = wereld(100);
  for (const h of TUIG.HENGELS) assert.equal(item(w, 'hg-' + h.id).price, h.prijs, h.id);
  for (const a of TUIG.AAS) assert.equal(item(w, 'as-' + a.id).price, a.prijs, a.id);
  assert.equal(item(w, 'hg-peur').disabled, 'Heb je al (of een betere)', 'je begint met de peurhengel');
  assert.equal(item(w, 'hg-werp').disabled, '', 'de werphengel kan met honderd euro');
  assert.equal(item(w, 'hg-voer').disabled, 'Te weinig geld');
  assert.equal(item(w, 'hg-karper').disabled, 'Te weinig geld');
  assert.equal(item(w, 'lijn-up').price, TUIG.VERBETERINGEN[0].prijs);
});

t('een hengel kopen kost eigen geld, zet hem in je tuig en bewaart hem in je eigen opslag', () => {
  opnieuw();
  const w = wereld(200);
  const res = item(w, 'hg-werp').buy();
  assert.ok(typeof res === 'string' && res.includes('Werphengel'), res);
  assert.equal(w.money, 140);
  assert.equal(LIVE.getTuig().hengel, 'werp');
  LIVE.schrijfNu();
  assert.equal(JSON.parse(st.getItem(KEYS.hengeltuig)).hengel, 'werp');
  // de winkel laat meteen de nieuwe stand zien: de peurhengel is nu niet meer te koop, de karperhengel ook niet met 140 euro
  assert.equal(item(w, 'hg-peur').disabled, 'Heb je al (of een betere)');
  assert.equal(item(w, 'hg-werp').tag, 'Nu');
  assert.equal(item(w, 'hg-voer').disabled, 'Te weinig geld');
  // en terug kan niet
  assert.equal(item(w, 'hg-peur').buy(), null);
  assert.equal(w.money, 140);
});

t('te weinig geld: geen aankoop, geen geld eraf en het tuig blijft staan', () => {
  opnieuw();
  const w = wereld(5);
  assert.equal(item(w, 'hg-karper').buy(), null);
  assert.equal(w.money, 5);
  assert.equal(LIVE.getTuig().hengel, 'peur');
  assert.equal(item(w, 'as-kunstaas').buy(), null);
  assert.equal(w.money, 5);
  assert.equal(LIVE.getTuig().aas, null);
});

t('aas kopen: een pak van tien beten en een ander soort vervangt je zak', () => {
  opnieuw();
  const w = wereld(100);
  assert.ok(item(w, 'as-maden').buy().includes('Maden'));
  assert.equal(w.money, 98);
  assert.deepEqual(LIVE.getTuig().aas, { id: 'maden', n: TUIG.AAS_PER_PAK });
  assert.equal(item(w, 'as-maden').tag, 'In je zak: 10');
  assert.ok(item(w, 'as-worm').buy().includes('Wormen'));
  assert.deepEqual(LIVE.getTuig().aas, { id: 'worm', n: TUIG.AAS_PER_PAK });
  assert.equal(w.money, 95);
  LIVE.schrijfNu();
  assert.equal(JSON.parse(st.getItem(KEYS.hengeltuig)).aas.id, 'worm');
});

t('de lijn twee keer verbeteren: duurder, sterker, en daarna is het op', () => {
  opnieuw();
  const w = wereld(200);
  assert.equal(item(w, 'lijn-up').price, TUIG.VERBETERINGEN[0].prijs);
  assert.ok(item(w, 'lijn-up').buy().includes(TUIG.VERBETERINGEN[0].naam));
  assert.equal(LIVE.getTuig().upgrades, 1);
  assert.ok(Math.abs(TUIG.lijnsterkte(LIVE.getTuig()) - 0.6) < 1e-9);
  assert.equal(item(w, 'lijn-up').price, TUIG.VERBETERINGEN[1].prijs);
  assert.ok(item(w, 'lijn-up').buy());
  assert.equal(LIVE.getTuig().upgrades, TUIG.UPGRADE_MAX);
  assert.ok(Math.abs(TUIG.lijnsterkte(LIVE.getTuig()) - 0.7) < 1e-9);
  assert.equal(item(w, 'lijn-up').disabled, 'De lijn is al op zijn sterkst');
  assert.equal(item(w, 'lijn-up').buy(), null);
  assert.equal(w.money, 200 - TUIG.VERBETERINGEN[0].prijs - TUIG.VERBETERINGEN[1].prijs);
});

t('de hengelhoek staat in de Avondwinkel en aan de steiger, en een gast koopt er zelf', () => {
  assert.ok(/export function hengelSections/.test(read('shops.js')));
  assert.ok(/super: \(w\) => \[[^\]]*hengelSections/.test(read('shops.js')), 'de Avondwinkel');
  assert.ok(/boot: \(w\) => [^\n]*hengelSections/.test(read('shops.js')), 'de botenverhuur aan de steiger');
  // een gast mag hier kopen: de Avondwinkel is een winkel met spullen voor jezelf, met je eigen geld
  assert.ok(winkelMagVoorGast('super'));
  // geen gedeelde kas en geen netwerkbericht: het tuig raakt geen coop- of netmodule aan
  for (const f of ['hengeltuig.js', 'hengeltuiglive.js']) {
    const src = read(f);
    assert.ok(!/coopnet|coopdeel|broadcast/i.test(src), f + ' praat met niemand');
  }
});

opnieuw();
console.log(`shops_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
