// #1264: het detail van een loopbaan noemt elk ding één keer: het niveau ("niveau 1 van 6") niet drie keer, de eerste
// klus niet onder de knop én in zijn kader, en het icoon van het vak niet in de band én in de kop.
// Draait de echte renderLoopbaanPanel met een nep-element en een leeg profiel.
//   node scripts/loopbaan_dubbel_test.mjs
import assert from 'node:assert/strict';
import { skipIfThreeMissing } from './lib/threeskip.mjs';

let ui, L;
try {
  await import('./node3d.mjs');
  ui = await import('../game/js/loopbaanui.js');
  L = await import('../game/js/loopbaan.js');
} catch (e) { skipIfThreeMissing('loopbaan_dubbel_test.mjs', e); }

const el = { innerHTML: '', dataset: {}, querySelectorAll: () => [], querySelector: () => null, addEventListener() {}, classList: { add() {}, remove() {}, toggle() {}, contains: () => false } };
ui.renderLoopbaanPanel(el, null, null);
const html = el.innerHTML;
assert.ok(html.length > 0, 'het paneel tekent iets');
const detail = html.slice(html.indexOf('lb-d-kop'));
assert.ok(detail.length > 0, 'er is een detail');
const niveaus = detail.match(/[Nn]iveau \d+ van \d+/g) || [];
assert.ok(niveaus.length <= 1, `het niveau staat hooguit één keer in het detail (nu ${niveaus.length}: ${niveaus.join(', ')})`);
const eerste = detail.match(/Eerste klus:/g) || [];
assert.ok(eerste.length <= 1, `de eerste klus staat hooguit één keer (nu ${eerste.length})`);
assert.doesNotMatch(detail, /<h2 class="m-h2 td-h2"><svg|<h2 class="m-h2 td-h2"><span class="[^"]*pa-ico/, 'de kop draagt niet nog een keer het icoon van de band');
assert.ok(L.MAX_NIVEAU >= 1);
// #1264 (hertest 24-11): geen tweede kop onder Loopbanen zonder vak, en de volgende stap van een nog niet begonnen vak staat één keer
assert.doesNotMatch(html, /Nog geen vak gekozen|Kies een vak en doe een eerste klus/, 'zonder vak geen tweede kop "Je loopbaan · Nog geen vak gekozen"');
assert.match(html, /lb-balk lb-balk--leeg/, 'de kop houdt alleen de wissel Tour of Vakken');
assert.doesNotMatch(detail, /Eerstvolgende stap:/, 'een nog niet begonnen vak heeft geen tweede volgende stap naast "Begin met deze loopbaan"');
console.log(`loopbaan_dubbel_test: detail met ${niveaus.length} niveauregel en ${eerste.length} eersteklusregel`);
