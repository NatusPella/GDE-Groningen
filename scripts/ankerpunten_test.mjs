// Ankerpunten (#422): een plaats met de knoop buiten het winkelmidden wijst met kaartlabel en "Reis erheen" naar het ankerpunt.
//   node scripts/ankerpunten_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { ANKERPUNTEN, ankerVan } from '../game/js/ankerpunten.js';
import { setWorldPlaces, worldPlaceNamed, worldPlaceLabels } from '../game/js/worldplaces.js';
import { bouwIndeling } from '../game/js/gebieden.js';
import { ontvouw, gebiedIn } from '../game/js/grenzen.js';

let n = 0;
const t = (naam, fn) => { n++; try { fn(); } catch (e) { console.log('FAIL', naam, '\n  ', e.message.split('\n')[0]); process.exitCode = 1; } };
const grenzen = ontvouw(JSON.parse(fs.readFileSync(new URL('../game/grenzen.json', import.meta.url), 'utf8')));

t('Delfzijl heeft een ankerpunt, Appingedam niet', () => {
  assert.deepEqual(ankerVan('Delfzijl'), [23852, -13004]);
  assert.equal(ankerVan('Appingedam'), null);
});
t('elk ankerpunt ligt in de eigen woonplaats (BAG), niet in zee of in een buur', () => {
  for (const [naam, [x, y]] of Object.entries(ANKERPUNTEN)) {
    const g = gebiedIn(grenzen.woonplaatsen, x, y);
    assert.ok(g && g.naam === naam, `${naam}: ankerpunt ligt in ${g ? g.naam : 'niets'}`);
  }
});
t('de plaatsknoop en het kaartlabel van Delfzijl staan op het ankerpunt, andere plaatsen en wijken niet', () => {
  setWorldPlaces([
    { name: 'Delfzijl', kind: 'town', x: 23009, y: -13018, pop: 25000 },
    { name: 'Appingedam', kind: 'town', x: 19323, y: -11582 },
    { name: 'Delfzijl-Noord', kind: 'suburb', of: 'Delfzijl', x: 23100, y: -13000 },
  ]);
  const p = worldPlaceNamed('Delfzijl');
  assert.deepEqual([p.x, p.y], [23852, -13004]);
  assert.equal(worldPlaceNamed('Appingedam').x, 19323);
  const lab = worldPlaceLabels(0, -20000, 40000, 0);
  const d = lab.find((l) => l.name === 'Delfzijl');
  assert.deepEqual([d.x, d.y], [23852, -13004]);
  assert.equal(lab.find((l) => l.name === 'Delfzijl-Noord').x, 23100);
  setWorldPlaces([]);
});
t('het gebied Delfzijl (en dus het safehouse met Reis erheen) ligt op het ankerpunt', () => {
  const ind = bouwIndeling({ grenzen, taken: [] });
  const g = ind.gebieden.find((x) => x.niveau === 'woonplaats' && x.naam === 'Delfzijl');
  assert.ok(g, 'Delfzijl als woonplaats');
  assert.deepEqual([g.x, g.y], [23852, -13004]);
  const a = ind.gebieden.find((x) => x.niveau === 'woonplaats' && x.naam === 'Appingedam');
  assert.ok(a && a.x === a.grens.c[0]);
});
console.log(process.exitCode ? 'ankerpunten_test: MISLUKT' : `ankerpunten_test: ${n} ok`);
