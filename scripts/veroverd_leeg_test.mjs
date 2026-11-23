// #1269: het Veroverd-paneel zolang de gebieden niet geladen zijn: geen "0 van 0"-tegels, geen "alles gedaan" en geen
// leeg kaartvlak met een loze lijst en de zin "wordt nog ingeladen"; wel één regel over de eerstvolgende taak.
// Draait de echte renderVeroverdPanel zonder geladen gebieden (getOverzicht geeft dan null).
//   node scripts/veroverd_leeg_test.mjs
import assert from 'node:assert/strict';
import { skipIfThreeMissing } from './lib/threeskip.mjs';

let m;
try {
  await import('./node3d.mjs');
  m = await import('../game/js/veroverdpanel.js');
} catch (e) { skipIfThreeMissing('veroverd_leeg_test.mjs', e); }

const el = { innerHTML: '', dataset: {}, querySelectorAll: () => [], querySelector: () => null, addEventListener() {} };
m.renderVeroverdPanel(el, null, null);
const html = el.innerHTML;
assert.ok(html.length > 0, 'het paneel tekent iets');
assert.doesNotMatch(html, /van 0 gebieden|van 0 buurten/, 'geen 0-van-0-tegels');
assert.doesNotMatch(html, /Alles wat meetelt is gedaan/, 'geen alles gedaan bij nul voortgang');
assert.match(html, /Zodra de gebieden geladen zijn/, 'wel een regel over wat er komt');
assert.doesNotMatch(html, /gb-pane|lb-list/, 'geen leeg kaartvlak met een loze lijst ernaast');
assert.doesNotMatch(html, /wordt nog ingeladen/, 'de laadzin staat er niet nog eens onder');
console.log('veroverd_leeg_test: 6 controles ok');
