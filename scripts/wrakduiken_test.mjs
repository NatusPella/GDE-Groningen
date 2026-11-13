// #839: drie duikplekken op bestaande waterplekken, met een vondst per plek.
//   node scripts/wrakduiken_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { duikplekken, duikplekVoor, vondstVoor, vondstId, duikplekBij, duikStand, WRAKVONDSTEN_SET, DUIK_R } from '../game/js/wrakduiken.js';

const lees = (f) => fs.readFileSync(new URL('../game/js/' + f, import.meta.url), 'utf8');
let n = 0;
const t = (naam, f) => { f(); n++; console.log(`ok ${naam}`); };

t('drie duikplekken met unieke vondsten', () => {
  const p = duikplekken();
  assert.equal(p.length, 3);
  assert.equal(new Set(p.map((q) => q.vondst.id)).size, 3);
  assert.ok(p.every((q) => Number.isFinite(q.x) && Number.isFinite(q.y) && q.wrak.naam && q.vondst.tekst));
  assert.equal(vondstVoor('lauwersmeer').id, 'scheepsklok');
});

t('de plek vindt de speler binnen de duikstraal', () => {
  const p = duikplekken()[0];
  assert.equal(duikplekBij(p.x, p.y).id, p.id);
  assert.equal(duikplekBij(p.x + DUIK_R + 2, p.y), null);
  assert.equal(vondstId(duikplekVoor('lauwersoog')), 'verrekijker');
});

t('de stand loopt van leeg naar compleet', () => {
  const ids = duikplekken().map((p) => p.vondst.id);
  assert.equal(duikStand([]).gevonden, 0);
  assert.equal(duikStand(ids).klaar, true);
  assert.equal(duikStand(ids.slice(0, 2)).gevonden, 2);
});

t('de live module schrijft in de bestaande set en is gewired', () => {
  const live = lees('wrakduikenlive.js');
  assert.match(live, new RegExp(`recordUnique\\(world, WRAKVONDSTEN_SET, id\\)`));
  assert.match(lees('main.js'), /tryWrakduikInteract\(world\)/);
  assert.match(lees('achievements.js'), /set: 'wrakvondsten', goal: 3/);
  assert.equal(WRAKVONDSTEN_SET, 'wrakvondsten');
});

console.log(`wrakduiken_test: ${n}/${n} ok`);
