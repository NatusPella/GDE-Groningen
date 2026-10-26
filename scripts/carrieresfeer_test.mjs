// Sfeer per loopbaan (#492): elk vak heeft een eigen patroon in cream en groen, zonder een
// tweede merkkleur. Rood blijft de gevarenkleur; de boerenzakdoek is daarom geblokt cream/groen.
//   node scripts/carrieresfeer_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as S from '../game/js/carrieresfeer.js';
import * as L from '../game/js/loopbaan.js';

let n = 0;
const t = (naam, fn) => { n++; try { fn(); } catch (e) { console.log('FAIL', naam, '\n  ', String(e.message || e).split('\n').slice(0, 3).join('\n  ')); process.exitCode = 1; } };
const lees = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

t('elk loopbaanvak heeft een eigen sfeer', () => {
  for (const id of L.VAK_IDS) {
    const s = S.sfeerVan(id);
    assert.ok(s.vorm, `geen sfeer voor ${id}`);
    assert.ok(s.naam && s.motief, `geen naam of motief voor ${id}`);
    assert.ok(S.sfeerStijl(id).includes('background-image:'), `geen patroon voor ${id}`);
  }
  assert.deepEqual([...S.SFEER_IDS].sort(), [...L.VAK_IDS].sort(), 'de sfeerlijst en de vakken lopen gelijk');
});

t('de sferen zijn te onderscheiden', () => {
  const namen = L.VAK_IDS.map((id) => S.sfeerVan(id).naam);
  assert.equal(new Set(namen).size, namen.length, 'elke sfeer heeft een eigen naam');
  const vormen = L.VAK_IDS.map((id) => S.sfeerVan(id).vorm);
  assert.ok(new Set(vormen).size >= 12, 'er zijn genoeg verschillende patronen');
});

t('de patronen gebruiken alleen de tokens van het designsysteem', () => {
  const kleuren = new Set();
  const tinten = new Set();
  for (const id of L.VAK_IDS) {
    const css = S.sfeerStijl(id);
    for (const m of css.matchAll(/rgba?\(([^)]*)\)/g)) {
      const delen = m[1].split(',').map((x) => x.trim());
      kleuren.add(delen.slice(0, 3).join(','));
    }
    const tint = css.match(/background-color:([^;]+);/);
    assert.ok(tint, `geen tint in ${id}`);
    tinten.add(tint[1]);
    assert.ok(!/#[0-9a-f]{3,8}/i.test(css), `geen losse hex in ${id}`);
    assert.ok(!/d93f3f|217,\s*63,\s*63/i.test(css), `geen gevarenrood in ${id}`);
    assert.ok(!/[<>"]/.test(css), `geen invoer van buiten in ${id}`);
    assert.equal(S.sfeerStijl(id), S.sfeerStijl(id), `deterministisch in ${id}`);
  }
  assert.deepEqual([...kleuren].sort(), ['12,20,14', '15,92,48', '240,237,228', '30,158,86', '63,201,122'], 'alleen de basis, cream en de drie groenen');
  assert.ok(tinten.size >= 4, 'er zijn minstens vier tonaliteiten');
});

t('de boerenzakdoek is geblokt cream/groen met een vouw', () => {
  const s = S.sfeerVan('landbouw');
  assert.equal(s.naam, 'Boerenzakdoek');
  assert.equal(s.vorm, 'zakdoek');
  assert.equal(s.vouw, true, 'de zakdoek heeft een gevouwen punt');
  const css = S.sfeerStijl('landbouw');
  assert.ok((css.match(/repeating-linear-gradient/g) || []).length >= 4, 'het geblokte patroon heeft horizontale en verticale draden');
  assert.ok(css.includes('30, 158, 86') && css.includes('240, 237, 228'));
});

t('de loopbaan-UI gebruikt de sfeer in de lijst en boven het vak', () => {
  const ui = lees('game/js/loopbaanui.js');
  assert.match(ui, /from '\.\/carrieresfeer\.js'/);
  assert.match(ui, /lb-sfeer-strip/);
  assert.match(ui, /sfeerHtml\(id\)/);
  assert.match(ui, /lb-sfeer-ico/);
  assert.match(ui, /lb-sfeer-groot/);
  assert.match(ui, /\.lb-sfeer \{/);
  assert.match(ui, /\.lb-sfeer-vouw \{/);
});

t('een onbekend vak geeft geen sfeer en geen crash', () => {
  assert.equal(S.sfeerVan('bestaatniet').vorm, '');
  assert.equal(S.sfeerStijl('bestaatniet'), '');
  assert.equal(S.sfeerStijl(null), '');
  assert.equal(S.sfeerStijl('kade').includes('background-image:'), true, 'de kadevorm blijft bruikbaar');
});

if (process.exitCode) console.log(`carrieresfeer_test: ${n} tests, mislukt`);
else console.log(`carrieresfeer_test: ${n}/${n} ok`);
