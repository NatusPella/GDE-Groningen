// Prestatie: de lijst graskernen rond de camera (syncTufts) komt uit een pure functie en wordt hergebruikt zolang de
// camera in zijn cel blijft en < 0,25 m beweegt. Dezelfde cellen als de oude lus voor een reeks posities.
import assert from 'node:assert/strict';
import './node3d.mjs';
const { CELL, QUALITY, tuftWantCells, canReuseWant } = await import('../game/js/grass.js');

// de oude lus, letterlijk
function oud(cx, cy, outer, inner) {
  const ci = Math.floor(cx / CELL), cj = Math.floor(cy / CELL);
  const span = Math.ceil(outer / CELL);
  const want = [];
  for (let j = cj - span; j <= cj + span; j++) for (let i = ci - span; i <= ci + span; i++) {
    const d = Math.hypot((i + 0.5) * CELL - cx, (j + 0.5) * CELL - cy);
    if (d > outer) continue;
    want.push({ i, j, d, full: d < inner });
  }
  want.sort((a, b) => a.d - b.d);
  return want;
}
const norm = (l) => l.map((w) => [w.i, w.j, w.d, w.full]);

let seed = 7;
const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
for (const name of Object.keys(QUALITY).filter((k) => QUALITY[k])) {
  const Q = QUALITY[name];
  const outer = Q.shrubRadius + CELL, inner = Q.radius + CELL * 0.75;
  for (let n = 0; n < 40; n++) {
    const cx = (rnd() - 0.5) * 4000, cy = (rnd() - 0.5) * 4000;
    const nieuw = tuftWantCells(cx, cy, outer, inner);
    assert.deepEqual(norm(nieuw), norm(oud(cx, cy, outer, inner)), `${name} ${cx},${cy}`);
    assert.ok(nieuw.length > 0 && nieuw.every((w) => w.cell === null));
  }
}
const Q = QUALITY.hoog, outer = Q.shrubRadius + CELL, inner = Q.radius + CELL * 0.75;
const prev = { key: 5, cx: 100, cy: 100, outer, inner, list: [] };
assert.ok(canReuseWant(prev, 5, 100.1, 99.9, outer, inner), 'kleine stap in dezelfde cel: hergebruik');
assert.ok(!canReuseWant(prev, 5, 100.3, 100, outer, inner), 'te ver: opnieuw');
assert.ok(!canReuseWant(prev, 6, 100, 100, outer, inner), 'andere cel: opnieuw');
assert.ok(!canReuseWant(prev, 5, 100, 100, outer + 1, inner), 'andere kwaliteit: opnieuw');
assert.ok(!canReuseWant(null, 5, 100, 100, outer, inner), 'geen cache: opnieuw');
console.log('grass_want_test ok');
