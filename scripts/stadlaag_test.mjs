// ?stadlaag / STAD_LAAG (game/js/stadlaag.js, #90): parsen, standaard uit
import assert from 'node:assert/strict';
import { parseStadLagen, stadLagen, STAD_LAGEN } from '../game/js/stadlaag.js';

assert.equal(parseStadLagen(null).size, 0);
assert.deepEqual([...parseStadLagen('water,Wegen, onzin')].sort(), ['water', 'wegen']);
assert.equal(parseStadLagen('alle').size, STAD_LAGEN.length);
assert.equal(stadLagen('', {}).size, 0, 'standaard uit');
assert.deepEqual([...stadLagen('?stadlaag=spoor', {})], ['spoor']);
assert.deepEqual([...stadLagen('', { STAD_LAAG: 'groen' })], ['groen']);
assert.deepEqual([...stadLagen('?stadlaag=water', { STAD_LAAG: 'groen' })], ['water'], 'URL wint van omgeving');
console.log('stadlaag_test: ok');
