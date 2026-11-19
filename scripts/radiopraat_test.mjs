// Gedragstest voor game/js/radiopraat.js (#985): geen herhaling vlak na elkaar en een bewaarde staat die klopt.
import assert from 'node:assert/strict';
import { kiesVers, leesPraatStaat, schrijfPraatStaat, PRAAT_RECENT_MAX } from '../game/js/radiopraat.js';

let n = 0;
const t = (naam, f) => { f(); n++; };
const rng = (zaad) => () => { zaad = (zaad * 1664525 + 1013904223) % 4294967296; return zaad / 4294967296; };

t('een poel van drie geeft nooit twee keer dezelfde regel achter elkaar, en alle drie komen aan bod', () => {
  const recent = [], r = rng(7), poel = ['a', 'b', 'c'], gezien = new Set();
  let vorige = null;
  for (let i = 0; i < 60; i++) { const x = kiesVers(poel, recent, r); assert.notEqual(x, vorige); gezien.add(x); vorige = x; }
  assert.equal(gezien.size, 3);
});
t('een poel van twee wisselt, een poel van een geeft die ene regel', () => {
  const recent = [], poel = ['x', 'y'];
  const reeks = Array.from({ length: 6 }, () => kiesVers(poel, recent));
  for (let i = 1; i < reeks.length; i++) assert.notEqual(reeks[i], reeks[i - 1]);
  assert.equal(kiesVers(['enige'], recent), 'enige');
  assert.equal(kiesVers([], recent), undefined);
});
t('regels uit een andere poel tellen niet mee; een regel als lijst (koe, tekst) werkt ook', () => {
  const recent = [];
  kiesVers(['a', 'b'], recent, () => 0);
  assert.equal(kiesVers(['c', 'd'], recent, () => 0), 'c', 'een andere poel wordt niet beperkt door a');
  const koe = [['Bella', 'Boe.'], ['Wietske', 'Muu.']];
  const eerste = kiesVers(koe, recent, () => 0), tweede = kiesVers(koe, recent, () => 0);
  assert.notDeepEqual(eerste, tweede);
});
t('de recent-lijst blijft begrensd', () => {
  const recent = [], poel = Array.from({ length: 200 }, (_, i) => 'r' + i);
  for (let i = 0; i < 500; i++) kiesVers(poel, recent);
  assert.ok(recent.length <= PRAAT_RECENT_MAX);
});
t('de bewaarde staat gaat heen en weer, en rommel geeft een lege geldige staat', () => {
  const staat = { rot: { dag: 5, nacht: 2 }, recent: ['a', 'b'], ads: { history: ['sok', 'tandarts'], blocks: 3 } };
  assert.deepEqual(leesPraatStaat(schrijfPraatStaat(staat)), staat);
  for (const slecht of ['', 'geen json', 'null', '[]', '{"rot":5}']) {
    const s = leesPraatStaat(slecht);
    assert.deepEqual(s.recent, []); assert.deepEqual(s.ads, { history: [], blocks: 0 });
  }
  const vies = leesPraatStaat('{"rot":{"dag":-1,"x y":3,"avond":"4","nacht":2},"recent":[1,"ok"],"ads":{"history":["a",7],"blocks":-4}}');
  assert.deepEqual(vies.rot, { nacht: 2 }); assert.deepEqual(vies.recent, ['ok']); assert.deepEqual(vies.ads, { history: ['a'], blocks: 0 });
});
console.log(`radiopraat_test: ${n}/${n} ok`);
