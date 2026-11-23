import assert from 'node:assert/strict';
import { hiddenSubtitles, SUBTITLE_LAYERS } from '../game/js/subtitlegate.js';

const h = (z, b) => [...hiddenSubtitles(z, b)].sort();
assert.deepEqual(h([], false), []);
assert.deepEqual(h(['banter-sub'], false), [], 'één ondertitel blijft staan');
assert.deepEqual(h(['banter-sub', 'radio-sub'], false), ['radio-sub'], 'twee tegelijk: de laagste voorrang wacht');
assert.deepEqual(h(['radio-sub', 'story-talk', 'banter-sub'], false), ['banter-sub', 'radio-sub'], 'het gesprek gaat voor');
assert.deepEqual(h(['cine', 'story-talk'], false), ['story-talk'], 'de film gaat voor het gesprek');
assert.deepEqual(h(['banter-sub'], true), ['banter-sub'], 'menu of laadscherm open: alles verborgen');
assert.deepEqual(h(['onbekend'], false), [], 'onbekende lagen worden genegeerd');
assert.equal(new Set(SUBTITLE_LAYERS).size, SUBTITLE_LAYERS.length);
console.log('subtitlegate_test ok');
