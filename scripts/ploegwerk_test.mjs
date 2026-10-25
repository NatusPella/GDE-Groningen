// Boerderij: ploegen en de andere taken (#437). Bij rij 1 van 4 moet duidelijk zijn wat je moet doen (de machine werkt
// vanzelf, er is geen knop voor de ploeg), welke snelheid netjes is en hoe je stopt; na een taak staat de volgende klus
// als doel op de kaart. De teksten komen uit sidejob_boerderij.js zelf, zodat de test de echte regels dekt.
//   node scripts/ploegwerk_test.mjs
// Schrijft nooit naar echte opslag: de opslag is een nepobject.
import './node3d.mjs';
import assert from 'node:assert/strict';
import * as B from '../game/js/boerderij.js';
import * as W from '../game/js/werkgang.js';
import * as Live from '../game/js/boerderijlive.js';

let n = 0, fails = 0;
const t = (name, fn) => { n++; try { fn(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', String(e.message).split('\n')[0]); } };
const nepOpslag = (start = {}) => { const m = new Map(Object.entries(start)); return { m, getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };

const { default: boerderij, UITLEG, rijUitleg, doelUitleg, volgendeKlus } = await import('../game/js/sidejob_boerderij.js');

t('elke taak heeft uitleg; bij ploegen staat er dat de ploeg vanzelf zakt en dat er geen knop is', () => {
  for (const taak of ['ploegen', 'zaaien', 'bemesten', 'oogsten']) {
    assert.ok(UITLEG[taak], `${taak}: uitleg`);
    assert.match(UITLEG[taak], /vanzelf/, `${taak}: de machine werkt vanzelf`);
    assert.match(UITLEG[taak], /gas geven met W/, `${taak}: welke toets gas geeft`);
  }
  assert.match(UITLEG.ploegen, /De ploeg zakt vanzelf/);
  assert.match(UITLEG.ploegen, /geen knop voor de ploeg/);
  assert.deepEqual(Object.keys(UITLEG).sort(), ['bemesten', 'oogsten', 'ploegen', 'zaaien'], 'geen taak zonder uitleg');
});

t('de uitleg bij rij 1 van 4 noemt de taak, de baan en hoe je stopt', () => {
  const tekst = rijUitleg('ploegen', 'Eigen boerderij');
  assert.match(tekst, /^Rij 1 van 4: /);
  assert.match(tekst, /De ploeg zakt vanzelf/);
  assert.match(tekst, /Stoppen kan altijd: Esc en dan Stoppen met Eigen boerderij\./);
  assert.match(rijUitleg('oogsten'), /Stoppen met deze dienst/, 'zonder baan een nette terugval');
});

t('het doel in het HUD noemt de band in km/u en de stophint', () => {
  const tekst = doelUitleg('ploegen', 5, 'Eigen boerderij');
  const kmh = (ms) => Math.round(ms * 3.6);
  assert.match(tekst, new RegExp(`${kmh(W.BAND.ploegen.vMin)} tot ${kmh(5)} km/u`));
  assert.match(tekst, /harder is slordig werk/);
  assert.match(tekst, /Esc en dan Stoppen met Eigen boerderij/);
});

t('de volgende klus staat als doel op de kaart, met de taak die nu moet (#437)', () => {
  Live.initBoerderij({ opslag: nepOpslag() });
  assert.equal(volgendeKlus(), null, 'zonder eigen akker is er geen akkerdoel');
  assert.equal(Live.zetPerceel({ x: 120, y: -80, a: 0.5 }), true);
  const doel = volgendeKlus();
  assert.deepEqual(doel, { x: 120, y: -80, label: 'Je akker: ploegen' });
  const b = Live.getBoerderij();
  B.rondTaakAf(b, 'ploegen', 1); B.rondTaakAf(b, 'zaaien', 1);
  assert.deepEqual(volgendeKlus(), { x: 120, y: -80, label: 'Je akker: bemesten' }, 'het gewas groeit: bemesten kan nog');
  B.rondTaakAf(b, 'bemesten', 1); B.tikUren(b, 200);
  assert.deepEqual(volgendeKlus(), { x: 120, y: -80, label: 'Je akker: oogsten' }, 'rijp: oogsten');
});

t('de adapter van de eigen boerderij hoort bij het vak Landbouw en noemt de taken', () => {
  assert.equal(boerderij.id, 'boerderij');
  assert.equal(boerderij.kicker, 'Boerderij');
  assert.equal(boerderij.name, 'Eigen boerderij');
  assert.match(boerderij.blurb, /ploegen/);
  assert.ok(boerderij.intro.join(' ').includes('Stoppen kan altijd via Esc'));
});

console.log(`ploegwerk_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
