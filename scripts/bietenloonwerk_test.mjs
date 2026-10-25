// Bietenoogst hoort bij het boerderijsysteem (#437). Het loonwerk voor de buurman bij Hoogkerk staat onder Boerderij en
// valt weg zodra de speler een eigen akker heeft: daarna oogst je bieten op Eigen boerderij. Zo staan er geen twee
// bietenoogsten naast elkaar.
//   node scripts/bietenloonwerk_test.mjs
// Schrijft nooit naar echte opslag: de opslag is een nepobject.
import './node3d.mjs';
import assert from 'node:assert/strict';
import * as Live from '../game/js/boerderijlive.js';

let n = 0, fails = 0;
const t = (name, fn) => { n++; try { fn(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', String(e.message).split('\n')[0]); } };
const nepOpslag = (start = {}) => { const m = new Map(Object.entries(start)); return { m, getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };
const kaart = { nearestRoadPoint: () => null };
const { default: bietenoogst } = await import('../game/js/sidejob_bieten.js');

t('de bietenoogst heet loonwerk en staat onder Boerderij, niet als eigen baan ernaast', () => {
  assert.equal(bietenoogst.name, 'Loonwerk: bietenoogst');
  assert.equal(bietenoogst.kicker, 'Boerderij');
  assert.equal(bietenoogst.glyph, 'suikerbieten');
  assert.match(bietenoogst.blurb, /Loonwerk/);
  assert.match(bietenoogst.blurb, /Eigen boerderij/, 'de blurp wijst naar de eigen akker');
});

t('de uitleg zegt dat het loonwerk stopt zodra je zelf boert', () => {
  const tekst = bietenoogst.intro.join(' ');
  assert.match(tekst, /loonwerk voor de buurman/i);
  assert.match(tekst, /Zodra je eigen akker/);
  assert.match(tekst, /Eigen boerderij/);
  assert.ok(!/de Grunn/.test(tekst), 'geen de Grunn');
});

t('zonder eigen akker staat het startpunt er; met een eigen akker valt het weg', () => {
  Live.initBoerderij({ opslag: nepOpslag() });
  const eerst = bietenoogst.anchor(kaart);
  assert.ok(eerst && Number.isFinite(eerst.x) && Number.isFinite(eerst.y), 'een startpunt bij de akker');
  assert.equal(Live.zetPerceel({ x: 10, y: 20, a: 0 }), true);
  assert.equal(bietenoogst.anchor(kaart), null, 'geen tweede bietenoogst naast de eigen akker');
});

t('met een eigen akker stuurt de baan je naar Eigen boerderij in plaats van te starten', () => {
  Live.initBoerderij({ opslag: nepOpslag() });
  Live.zetPerceel({ x: 10, y: 20, a: 0 });
  const uit = bietenoogst.start({});
  assert.equal(uit, 'Je eigen akker ligt vast: oogst je bieten daar (Eigen boerderij).');
});

console.log(`bietenloonwerk_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
