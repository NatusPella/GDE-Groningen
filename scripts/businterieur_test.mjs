// Test van de bus-passagiersruimte (#444, #442, #847): de indeling en de bezetting (puur), en de geometrie (met three uit vendor-cache).
//   node scripts/businterieur_test.mjs
import './node3d.mjs';
import assert from 'node:assert';
import { busInterieur, midibusInterieur, bezetting, verdeelReizigers, ruimteReizigers, deurXs, jointXVan, trailerDeurXs, TRAILER_DEURX, JOINT_GAP, GANG, RIJ } from '../game/js/businterieur.js';

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
  // de binnenhuid van de voorste eenheid (#833): van de eerste rij tot de achterkant van de eenheid
  assert.ok(Math.abs(L.huid.x0 - (L.rail.x0 - 0.4)) < 1e-9 && Math.abs(L.huid.x1 - (L.rail.x1 + 0.2)) < 1e-9, 'voorunit: de huid omsluit de handrail');
  if (trailer) {
    // de achterwagen (#847): dezelfde indeling, maar in de coördinaten van de trailer-groep
    const R = L.rear;
    assert.ok(R, `gelede bus ${len}: een achterwagen-indeling`);
    assert.strictEqual(R.x0, -trailer);
    assert.strictEqual(R.x1, -JOINT_GAP);
    assert.ok(R.seats.length >= 8, `achterwagen: genoeg stoelen (${R.seats.length})`);
    assert.ok(R.seats.length + L.seats.length > L.seats.length, 'achterwagen: meer stoelen dan de voorunit alleen');
    assert.ok(R.seats.every((s) => s.x > R.x0 + 0.3 && s.x < R.x1), 'achterwagen: rijen binnen de trailerromp');
    assert.ok(R.seats.every((s) => Math.abs(s.z) > GANG && Math.abs(s.z) < wid / 2), 'achterwagen: stoelen naast het gangpad en binnen de romp');
    assert.deepStrictEqual(R.doors, trailerDeurXs(), 'achterwagen: de deur van de trailer');
    assert.strictEqual(TRAILER_DEURX, -JOINT_GAP - 1.4, 'achterwagen: de deurplek van de trailer');
    assert.ok(!R.seats.some((s) => s.kant === 1 && R.doors.some((d) => Math.abs(s.x - d) < 0.9)), 'achterwagen: geen stoel in de trailerdeur (stoepkant)');
    assert.ok(R.seats.some((s) => R.doors.some((d) => Math.abs(s.x - d) < 0.9)), 'achterwagen: de trailerdeur houdt een rij vrij');
    assert.ok(R.poles.length >= 6 && R.stand.length >= 4, 'achterwagen: haltestangen en staanplaatsen');
    assert.ok(R.rail.x0 > R.rail.x1 && R.rail.x1 > R.x0 + 0.2, 'achterwagen: de handrail loopt tot achterin');
    assert.ok(R.rail.x0 < R.x1, 'achterwagen: de handrail begint bij de balg');
    assert.ok(R.huid.x0 === R.x1 && R.huid.x1 === R.xRear, 'achterwagen: de binnenhuid loopt van de balg tot de achterwand');
    // de achterwagen heeft ook staanplaatsen in het gangpad en een eigen vloer
    assert.strictEqual(R.floor, 0.46);
    assert.ok(R.xRear < R.xFront, 'achterwagen: de rijen lopen naar achteren');
  } else {
    assert.strictEqual(L.rear, null, 'zonder trailer geen achterwagen');
  }
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
// de midibus is compleet tot de achterwand (#847): de laatste rij staat met de rug tegen de binnenhuid
assert.ok(M.huid && M.huid.x1 < M.huid.x0, 'midibus: een binnenhuid van voor naar achter');
assert.ok(Math.abs(M.huid.x0 - (M.rail.x0 - 0.4)) < 1e-9 && Math.abs(M.huid.x1 - (M.rail.x1 + 0.2)) < 1e-9, 'midibus: de huid omsluit de handrail');
const mLaatste = M.seats[M.seats.length - 1];
assert.ok(Math.abs((mLaatste.x - 0.22) - M.huid.x1) < 0.2, `midibus: de laatste rij staat bij de achterwand (${mLaatste.x - 0.22} tegen ${M.huid.x1})`);
assert.ok(mLaatste.x - 0.22 > M.huid.x1 - 0.05, 'midibus: de laatste rij steekt niet door de achterwand');
assert.ok(M.seats.every((s) => s.x > M.huid.x1 + 0.1 && s.x <= M.huid.x0 + 1e-9), 'midibus: alle rijen tussen de wanden');

// de reizigers over beide eenheden van de gelede bus (#847)
{
  const verd = verdeelReizigers(L, 20);
  assert.strictEqual(verd.voor + verd.achter, 20, 'gelede bus: iedereen is ingedeeld');
  assert.ok(verd.voor > 0 && verd.achter > 0, 'gelede bus: ook reizigers in de achterwagen');
  assert.ok(verd.achter <= L.rear.seats.length + L.rear.stand.length, 'achterwagen: binnen de eigen capaciteit');
  const bA = bezetting(L.rear, verd.achter);
  assert.strictEqual(bA.zit.length + bA.sta.length, verd.achter, 'achterwagen: de bezetting past');
  assert.deepStrictEqual(verdeelReizigers(L, 0), { voor: 0, achter: 0 });
  const volV = verdeelReizigers(L, 999);
  assert.ok(volV.voor <= L.seats.length + L.stand.length && volV.achter <= L.rear.seats.length + L.rear.stand.length, 'volle gelede bus: beide eenheden binnen hun capaciteit');
  // de medespelers blijven in de voorste eenheid, dus de coop-stoelen veranderen niet (#847)
  assert.strictEqual(verdeelReizigers(M, 12).voor, 12, 'midibus: geen achterwagen');
  assert.strictEqual(verdeelReizigers(M, 12).achter, 0, 'midibus: geen achterwagen');
}

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
