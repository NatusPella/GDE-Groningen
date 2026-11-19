// Prestatie: loadTileWorld leest index.json en de extra indexen tegelijk (niet na elkaar) en de decoderpool
// volgt de kernen (min 2, max 4, twee kernen voor de hoofdthread en de renderer).
import assert from 'node:assert/strict';
import { loadTileWorld, tileDecoderPoolSize } from '../game/js/tileworld.js';

assert.equal(tileDecoderPoolSize(0), 2, 'onbekend: 2');
assert.equal(tileDecoderPoolSize(undefined), 2);
assert.equal(tileDecoderPoolSize(2), 2, '2 kernen: 2');
assert.equal(tileDecoderPoolSize(4), 2);
assert.equal(tileDecoderPoolSize(5), 3);
assert.equal(tileDecoderPoolSize(6), 4);
assert.equal(tileDecoderPoolSize(32), 4, 'nooit meer dan 4 (de concurrency van de store)');

const requested = [];
let releaseIndex;
const source = {
  readAll(name) {
    requested.push(name);
    if (name === 'index.json') return new Promise((res) => { releaseIndex = res; });
    return Promise.resolve(new TextEncoder().encode('{}'));
  },
  read() { throw new Error('niet nodig'); },
};
const p = loadTileWorld('x/', { source, pool: false, extra: ['index-provincie.json', { name: 'index-corridor.json', only: null }] });
await new Promise((r) => setTimeout(r, 20));
assert.deepEqual(requested, ['index.json', 'index-provincie.json', 'index-corridor.json'].sort((a, b) => requested.indexOf(a) - requested.indexOf(b)));
assert.ok(requested.includes('index-provincie.json') && requested.includes('index-corridor.json'), 'de extra indexen zijn al gevraagd terwijl index.json nog laadt: ' + requested);
releaseIndex(new TextEncoder().encode('niet-json'));
assert.equal(await p, null, 'zonder geldige index.json: null, zoals voorheen');
console.log('tileworld_load_parallel_test ok');
