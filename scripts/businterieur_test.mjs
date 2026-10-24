// Test van de bus-passagiersruimte (#444, #442): de indeling en de bezetting (puur), en de geometrie (met three uit vendor-cache).
//   node scripts/businterieur_test.mjs
import './node3d.mjs';
import assert from 'node:assert';
import { busInterieur, bezetting, ruimteReizigers, deurXs, jointXVan, GANG, RIJ } from '../game/js/businterieur.js';

for (const [len, wid, trailer] of [[11.2, 2.55, 6.8], [11.5, 2.55, 0]]) {
  const L = busInterieur(len, wid, { trailer });
  const hl = len / 2, jx = jointXVan(len, trailer);
  assert.ok(L.seats.length >= 8, `genoeg stoelen: ${L.seats.length} (${len})`);
  assert.ok(L.seats.every((s) => s.x < hl - 2 && s.x > jx + 0.5), 'stoelen alleen in de voorste eenheid, achter de bestuurder');
  assert.ok(L.seats.every((s) => Math.abs(s.z) > GANG && Math.abs(s.z) < wid / 2), 'stoelen naast het gangpad en binnen de romp');
  const doors = deurXs(len);
  assert.ok(!L.seats.some((s) => s.kant === 1 && doors.some((d) => Math.abs(s.x - d) < 0.9)), 'geen stoel in een deuropening (stoepkant)');
  assert.ok(L.stand.length >= 4 && L.poles.length >= 6);
  for (let i = 1; i < L.seats.length; i++) assert.ok(L.seats[i].x <= L.seats[0].x + 1e-9);
  assert.ok(RIJ > 0.7 && L.rail.x0 > L.rail.x1);
}

const L = busInterieur(11.2, 2.55, { trailer: 6.8 });
const b0 = bezetting(L, 0);
assert.deepStrictEqual([b0.zit.length, b0.sta.length], [0, 0]);
const b10 = bezetting(L, 10);
assert.strictEqual(b10.zit.length + b10.sta.length, 10);
assert.strictEqual(new Set(b10.zit).size, b10.zit.length, 'niemand zit op dezelfde stoel');
const vol = bezetting(L, 999);
assert.ok(vol.zit.length <= L.seats.length && vol.sta.length <= L.stand.length, 'afgekapt op de capaciteit');
assert.ok(bezetting(L, 30).sta.length > 0, 'bij een volle bus staan mensen');
assert.strictEqual(ruimteReizigers('a1'), ruimteReizigers('a1'));
assert.ok(ruimteReizigers('x') >= 3 && ruimteReizigers('x') < 21);

// geometrie: alleen als three beschikbaar is
let THREE = null;
try { THREE = await import('three'); } catch { /* geen vendor-cache */ }
if (THREE) {
  const M = await import('../game/js/businterieur3d.js');
  const g = M.buildInrichting(L);
  assert.ok(g.attributes.position.count > 100, 'inrichting heeft geometrie');
  const g1 = M.buildReizigers(L, 12), g2 = M.buildReizigers(L, 24);
  assert.ok(g2.attributes.position.count > g1.attributes.position.count, 'meer reizigers, meer geometrie');
  assert.ok(M.reizigersAanBoord({ id: 7, busBediend: { ride: { onBoard: 17 } } }) === 17);
  assert.ok(M.reizigersAanBoord({ id: 7 }) === ruimteReizigers(7));
  assert.ok(M.reizigersAanBoord({ id: 7, busBediend: { ride: { onBoard: 17, done: true } } }) === ruimteReizigers(7));
}
console.log('businterieur_test ok' + (THREE ? '' : ' (zonder geometrie)'));
