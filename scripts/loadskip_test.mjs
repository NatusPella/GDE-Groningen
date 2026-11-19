// Laadscherm onderbreken (#985):  node scripts/loadskip_test.mjs
import assert from 'node:assert/strict';
import { skipReady, isSkipKey, SKIP_AFTER_S } from '../game/js/loadskip.js';
let n = 0, fails = 0;
const ok = (f, name) => { n++; try { f(); } catch (e) { fails++; console.log('FAIL ' + name + ': ' + e.message); } };
ok(() => assert.equal(skipReady('save', 0.5), false), 'in het begin nog geen Verder');
ok(() => assert.equal(skipReady('save', SKIP_AFTER_S), true), 'na een paar seconden wel');
ok(() => assert.equal(skipReady('travel', 6), true), 'ook na een reis');
ok(() => assert.equal(skipReady('snel', 60), false), 'het kleine sprongetje krijgt geen knop');
ok(() => assert.equal(skipReady('save', NaN), false), 'een ongeldige tijd telt niet');
ok(() => assert.equal(isSkipKey({ key: 'Enter' }), true), 'Enter');
ok(() => assert.equal(isSkipKey({ key: 'Escape' }), true), 'Escape');
ok(() => assert.equal(isSkipKey({ key: ' ' }), true), 'Spatie');
ok(() => assert.equal(isSkipKey({ key: 'Enter', ctrlKey: true }), false), 'Ctrl+Enter niet');
ok(() => assert.equal(isSkipKey({ key: 'w' }), false), 'andere toetsen niet');
ok(() => assert.equal(isSkipKey(null), false), 'geen event');
console.log(`loadskip_test: ${n - fails}/${n}`);
process.exit(fails ? 1 : 0);
