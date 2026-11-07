// #497: de raycast-chunks van de camera-occlusie die uit scene3d.js zijn getild (scene/raychunks.js).
// Puur en THREE-vrij: nep-geometrie met positie-/index-attributen en een segment als gewone getallen.
//   node scripts/raychunks_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as R from '../game/js/scene/raychunks.js';

const bron = (p) => fs.readFileSync(new URL('../game/js/' + p, import.meta.url), 'utf8');
let n = 0, fails = 0;
const t = (name, f) => { n++; try { f(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', e.message.split('\n')[0]); } };

// vier driehoeken op bekende plekken, zonder index
function geo(punten, index = null) {
  const pos = {
    count: punten.length, version: 1,
    getX: (i) => punten[i][0], getY: (i) => punten[i][1], getZ: (i) => punten[i][2],
  };
  return { attributes: { position: pos }, index, userData: {} };
}

t('#497: rayChunks maakt een doos per chunk met de kleine marge', () => {
  const g = geo([[0, 0, 0], [1, 0, 0], [0, 1, 0], [10, 5, 2], [11, 5, 2], [10, 6, 2], [0, 0, -3], [1, 0, -3], [0, 1, -3]]);
  const c = R.rayChunks(g);
  assert.equal(c.triCount, 3);
  assert.equal(c.n, 1, 'drie driehoeken passen in één chunk van 32');
  const b = c.boxes;
  assert.ok(Math.abs(b[0] - (0 - R.RAY_BOX_EPS)) < 1e-6, 'x-min met marge');
  assert.ok(Math.abs(b[3] - (11 + R.RAY_BOX_EPS)) < 1e-6, 'x-max met marge');
  assert.ok(Math.abs(b[1] - (0 - R.RAY_BOX_EPS)) < 1e-6);
  assert.ok(Math.abs(b[4] - (6 + R.RAY_BOX_EPS)) < 1e-6);
  assert.ok(Math.abs(b[2] - (-3 - R.RAY_BOX_EPS)) < 1e-6);
  assert.ok(Math.abs(b[5] - (2 + R.RAY_BOX_EPS)) < 1e-6);
});

t('#497: rayChunks cachet op de attribuutversie en de index', () => {
  const g = geo([[0, 0, 0], [1, 0, 0], [0, 1, 0]]);
  const a = R.rayChunks(g);
  assert.equal(R.rayChunks(g), a, 'zelfde attributen: dezelfde chunk');
  g.attributes.position.version = 2;
  const b = R.rayChunks(g);
  assert.notEqual(b, a, 'een nieuwe versie maakt een nieuwe chunk');
  assert.equal(b.version, 2);
});

t('#497: een geïndexeerde geometry leest de index', () => {
  const punten = [[0, 0, 0], [0, 0, 0], [0, 0, 0], [7, 7, 7], [7, 7, 7], [7, 7, 7]];
  const idx = { count: 6, version: 1, getX: (v) => v };
  const c = R.rayChunks(geo(punten, idx));
  assert.equal(c.triCount, 2);
  const b = c.boxes;
  assert.ok(Math.abs(b[3] - (7 + R.RAY_BOX_EPS)) < 1e-6, 'de tweede driehoek bepaalt de max');
});

t('#497: segmentHitsChunk ziet door, langs en buiten de doos', () => {
  const dozen = new Float32Array([0, 0, 0, 10, 10, 10]);
  assert.equal(R.segmentHitsChunk(dozen, 0, 5, 5, -5, 5, 5, 15), true, 'recht erdoor');
  assert.equal(R.segmentHitsChunk(dozen, 0, 5, 5, 20, 5, 5, 30), false, 'ervoor langs');
  assert.equal(R.segmentHitsChunk(dozen, 0, 20, 5, 5, 30, 5, 5), false, 'ernaast');
  assert.equal(R.segmentHitsChunk(dozen, 0, 5, 5, 5, 5, 5, 5), true, 'punt in de doos');
});

t('#497: scene3d.js gebruikt de module en heeft geen tweede kopie', () => {
  const s = bron('scene3d.js');
  assert.match(s, /from '\.\/scene\/raychunks\.js'/);
  assert.match(s, /segmentHitsChunk\(c\.boxes, k \* 6, _segA\.x, _segA\.y, _segA\.z, _segB\.x, _segB\.y, _segB\.z\)/);
  assert.doesNotMatch(s, /function rayChunks\(/);
  assert.doesNotMatch(s, /function segmentHitsChunk\(/);
  assert.doesNotMatch(s, /const RAY_CHUNK_TRIS = /);
  assert.ok(s.split('\n').length < 4230, 'scene3d.js is korter dan 4230 regels');
});

console.log(`raychunks_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
