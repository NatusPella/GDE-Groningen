// Test van de bus-passagiersruimte (#444, #442): de indeling en de bezetting (puur), en de geometrie (met three uit vendor-cache).
//   node scripts/businterieur_test.mjs
import './node3d.mjs';
import assert from 'node:assert';
import { busInterieur, midibusInterieur, bezetting, ruimteReizigers, deurXs, jointXVan, GANG, RIJ } from '../game/js/businterieur.js';

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

// De midibus (#442): een korte buurtbus met de deuren die het model tekent, van de voordeur tot de achterwand.
const M = midibusInterieur(8.4, 2.3);
assert.ok(M.seats.length >= 10, `midibus: rijen stoelen (${M.seats.length})`);
assert.ok(M.seats.every((s) => s.x < 8.4 / 2 - 1.5 && s.x > -8.4 / 2 + 0.5), 'midibus: stoelen achter de bestuurder en binnen de romp');
assert.ok(M.seats.every((s) => Math.abs(s.z) > GANG && Math.abs(s.z) < 2.3 / 2), 'midibus: stoelen naast het gangpad en binnen de romp');
assert.ok(!M.seats.some((s) => s.kant === 1 && M.doors.some((d) => Math.abs(s.x - d) < 0.9)), 'midibus: geen stoel in een deuropening (stoepkant)');
assert.ok(M.seats.some((s) => M.doors.some((d) => Math.abs(s.x - d) < 0.9)), 'midibus: de deuropening houdt een rij vrij');
assert.ok(M.stand.length >= 4 && M.poles.length >= 6, 'midibus: staanplaatsen en haltestangen');
assert.ok(M.rail.x0 > M.rail.x1 && M.rail.x1 > -8.4 / 2, 'midibus: de handrail loopt tot achterin');
assert.ok(M.rail.x0 < 8.4 / 2 - 1.5, 'midibus: de handrail begint achter de bestuurder');
assert.strictEqual(M.floor, 0.46);
assert.strictEqual(bezetting(M, 8).zit.length + bezetting(M, 8).sta.length, 8);
const mvol = bezetting(M, 999);
assert.ok(mvol.zit.length > 0 && mvol.sta.length > 0, 'midibus: bij drukte wordt er ook gestaan');
assert.ok(mvol.zit.length <= M.seats.length && mvol.sta.length <= M.stand.length, 'midibus: afgekapt op de eigen capaciteit');

// geometrie: alleen als three beschikbaar is
let THREE = null;
try { THREE = await import('three'); } catch { /* geen vendor-cache */ }
if (THREE) {
  const M3 = await import('../game/js/businterieur3d.js');
  const g = M3.buildInrichting(L);
  assert.ok(g.attributes.position.count > 100, 'inrichting heeft geometrie');
  const gm = M3.buildInrichting(M);
  assert.ok(gm.attributes.position.count > 100, 'midibus: inrichting heeft geometrie');
  assert.ok(gm.attributes.position.count < g.attributes.position.count, 'midibus: minder stoelen en stangen dan de gelede bus');
  const midR = M3.reizigersAanBoord({ id: 7, model: { name: 'midibus' } });
  assert.ok(midR >= 2 && midR <= 9, `midibus: een handvol reizigers (${midR})`);
  const g1 = M3.buildReizigers(L, 12), g2 = M3.buildReizigers(L, 24);
  assert.ok(g2.attributes.position.count > g1.attributes.position.count, 'meer reizigers, meer geometrie');
  assert.ok(M3.reizigersAanBoord({ id: 7, busBediend: { ride: { onBoard: 17 } } }) === 17);
  assert.ok(M3.reizigersAanBoord({ id: 7 }) === ruimteReizigers(7));
  assert.ok(M3.reizigersAanBoord({ id: 7, busBediend: { ride: { onBoard: 17, done: true } } }) === ruimteReizigers(7));
}
console.log('businterieur_test ok' + (THREE ? '' : ' (zonder geometrie)'));
