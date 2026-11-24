// Land en bedrijf in DS3 (#1272): secties als kaart met kop, getal en info-knop; knoppen die uit staan tonen slot en reden; geen native
// keuzelijsten en geen kale m-h3-koppen meer in Overzicht, Bedrijven, Te koop en Snackwagen.   node scripts/holdingcards_test.mjs
// Puur: geen DOM, geen opslag.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { sectionCard, missReason, lockedInner, holdingButton, statusChip } from '../game/js/holdingcards.js';

let n = 0, fails = 0;
const t = (name, fn) => { n++; try { fn(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', String(e.message).split('\n')[0]); } };

t('een sectie is een DS3-kaart met icoon, kop en getal; de uitleg zit achter de info-knop', () => {
  const h = sectionCard('ketens', 'fabriek', 'Ketens', '<p>lijf</p>', { count: 2, info: 'Een eigen verwerker geeft +15%.' });
  assert.match(h, /^<section class="ds-z-kaart ds-z-kaart--recht bz-kaart" data-sectie="ketens">/);
  assert.match(h, /<header class="ds-z-kaart__kop bz-kaart-kop"><h3 class="ds-z-kaart__titel bz-kaart-titel"><svg[^>]*bz-kaart-ic[^>]*>.*<\/svg>Ketens<\/h3><b class="bz-kaart-n">2<\/b><\/header>/);
  assert.match(h, /<details class="bz-info"><summary class="bz-info-knop" aria-label="Uitleg bij Ketens">/);
  assert.match(h, /<p class="bz-info-tekst">Een eigen verwerker geeft \+15%\.<\/p><\/details><p>lijf<\/p><\/section>$/);
});
t('zonder getal en zonder uitleg: geen leeg getal en geen info-knop', () => {
  const h = sectionCard('nieuws', 'nieuws', 'Nieuws', '');
  assert.ok(!h.includes('bz-kaart-n') && !h.includes('bz-info'));
  assert.ok(sectionCard('x', 'kaart', 'X', '', { count: 0 }).includes('<b class="bz-kaart-n">0</b>'), 'nul is een getal');
  assert.ok(!sectionCard('x', 'kaart', 'X', '', { count: null }).includes('bz-kaart-n'));
});
t('kop en uitleg worden ontsnapt', () => {
  const h = sectionCard('<x>', 'kaart', '<b>kop</b>', '', { info: '<i>' });
  assert.ok(!h.includes('<b>kop</b>') && h.includes('&lt;b&gt;kop') && h.includes('&lt;i&gt;') && h.includes('data-sectie="&lt;x&gt;"'));
});
t('de reden van een koopknop: wat je mist, of niets als het geld er is', () => {
  assert.equal(missReason(100, 125), 'Je mist nog €25');
  assert.equal(missReason(125, 125), '');
  assert.equal(missReason(7500, 100), '');
});
t('een knop die uit staat: slot en reden in de knop, disabled, en het eigen data-attribuut', () => {
  const h = holdingButton('data-bz', 'huur', 'Stel beginner aan', ' data-skill="1"', 'Je mist nog €25', true);
  assert.match(h, /^<button type="button" class="m-bt bz-hoofd bz-uit" data-bz="huur" data-skill="1" disabled>/);
  assert.match(h, /<svg[^>]*bz-slot/);
  assert.match(h, /<span class="bz-knoptekst">Stel beginner aan<\/span><small class="bz-reden">Je mist nog €25<\/small><\/button>$/);
  const zonder = holdingButton('data-sn', 'open', 'Korter', '', true);
  assert.match(zonder, /data-sn="open" disabled>/); assert.match(zonder, /bz-slot/); assert.ok(!zonder.includes('bz-reden'), 'true = slot zonder reden');
  const aan = holdingButton('data-bz', 'meer', 'Toon alle 50');
  assert.equal(aan, '<button type="button" class="m-bt" data-bz="meer">Toon alle 50</button>');
  assert.ok(lockedInner('x', '<b>').includes('&lt;b&gt;'));
});
t('een status is een chip met een vinkje, geen grijze knop', () => {
  const h = statusChip('In orde', ' data-bz-status="reno"');
  assert.match(h, /^<span class="ds-z-chip bz-status" data-bz-status="reno"><svg[^>]*>.*<\/svg>In orde<\/span>$/);
});
t('de schermen van Land en bedrijf: geen native keuzelijst, geen kale m-h3-kop, wel kaarten (#1272)', () => {
  for (const f of ['game/js/bezitui.js', 'game/js/snackui.js']) {
    const s = fs.readFileSync(f, 'utf8');
    assert.ok(!/<select/.test(s), f + ': geen <select>');
    // de enige m-h3 die blijft: "Nog dicht" (een dichte tak) en de kop van een gebeurtenis of keten binnen een kaart
    const kaal = (s.match(/<h3 class="m-h3">[^<$]*<\/h3>/g) || []).filter((k) => !/Nog dicht/.test(k));
    assert.deepEqual(kaal, [], f + ': kale koppen');
    assert.ok(/sectionCard\(/.test(s), f + ': gebruikt de kaart');
  }
  const css = fs.readFileSync('game/js/farm.css', 'utf8');
  for (const k of ['.bz-kaart', '.bz-info-knop', '.bz-reden', '.bz-slot']) assert.ok(css.includes(k), 'farm.css: ' + k);
});

console.log(`holdingcards_test: ${n - fails}/${n} ok`);
if (fails) process.exit(1);
