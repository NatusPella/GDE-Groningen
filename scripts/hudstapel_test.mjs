// De HUD-kaartenstapel (duivenspot en museum): geen overlap, prioriteit, compact en automatisch wegvallen.
//   node scripts/hudstapel_test.mjs
import assert from 'node:assert/strict';
import { stapel, overlap, stapelRuimte, duivenKaarten, STAPEL_TOP, STAPEL_GAP } from '../game/js/hudstapel.js';

let n = 0;
const t = (naam, f) => { f(); n++; console.log(`ok ${naam}`); };

t('kaarten staan onder elkaar zonder overlap, met een vaste tussenruimte', () => {
  const r = stapel([{ id: 'a', prio: 3, h: 84 }, { id: 'b', prio: 2, h: 150 }, { id: 'c', prio: 1, h: 54 }], { ruimte: 400 });
  assert.equal(r.zichtbaar.length, 3);
  assert.deepEqual(overlap(r.zichtbaar), []);
  assert.equal(r.zichtbaar[0].top, STAPEL_TOP);
  assert.equal(r.zichtbaar[1].top, STAPEL_TOP + 84 + STAPEL_GAP);
  assert.equal(r.onder, STAPEL_TOP + 84 + 150 + 54 + 2 * STAPEL_GAP);
});

t('een kaart die niet nodig is valt automatisch weg', () => {
  const r = stapel(duivenKaarten({ introActief: false, holdActief: false, hoogteActief: false }), { ruimte: 400 });
  assert.deepEqual(r.zichtbaar.map((k) => k.id), ['opdracht']);
  assert.deepEqual([...r.weg].sort(), ['hoogte', 'uitleg']);
});

t('bij krappe ruimte wordt de uitleg eerst compact, dan valt de laagste prio weg; de opdracht blijft altijd', () => {
  const alles = duivenKaarten({ introActief: true, holdActief: true, hoogteActief: true });
  const ruim = stapel(alles, { ruimte: 600 });
  assert.equal(ruim.zichtbaar.length, 3);
  const krap = stapel(alles, { ruimte: 110 + STAPEL_GAP + 74 });
  assert.ok(krap.zichtbaar.some((k) => k.id === 'uitleg' && k.compact), 'uitleg compact');
  assert.ok(!krap.zichtbaar.some((k) => k.id === 'hoogte'), 'hoogtekaart (laagste prio) valt weg');
  const nauw = stapel(alles, { ruimte: 60 });
  assert.deepEqual(nauw.zichtbaar.map((k) => k.id), ['opdracht'], 'alleen de belangrijkste blijft');
  for (const r of [ruim, krap, nauw]) assert.deepEqual(overlap(r.zichtbaar), [], 'nooit overlap');
});

t('de stapel blijft boven de pijl in het midden van het scherm', () => {
  for (const h of [600, 720, 900, 1080, 1440]) {
    const ruimte = stapelRuimte(h);
    const r = stapel(duivenKaarten({ introActief: true, holdActief: true, hoogteActief: true }), { ruimte });
    assert.ok(r.onder <= Math.max(STAPEL_TOP + ruimte, STAPEL_TOP + 110) + 1e-9, `hoogte ${h}: onder ${r.onder}`);
    assert.deepEqual(overlap(r.zichtbaar), []);
  }
  assert.ok(stapelRuimte(NaN) >= 110, 'kapotte invoer geeft een bruikbare ruimte');
});

t('kapotte kaarten worden overgeslagen', () => {
  const r = stapel([null, { id: 'x', h: NaN }, { id: 'ok', prio: 1, h: 40 }], { ruimte: 100 });
  assert.deepEqual(r.zichtbaar.map((k) => k.id), ['ok']);
  assert.deepEqual(stapel(null).zichtbaar, []);
});

t('de museumkaart: ondertitel en naamplaten blijven buiten de stapel (eigen lane)', () => {
  // de stapel levert alleen de bovenste kaarten; de ondertitel zit onderaan het scherm en de naamplaten zijn sprites in de wereld
  const r = stapel(duivenKaarten({ introActief: true, holdActief: true, hoogteActief: true }), { ruimte: stapelRuimte(720) });
  assert.ok(r.onder < 720 * 0.5, `de stapel eindigt boven het midden (${r.onder} < 360)`);
});

console.log(`hudstapel_test: ${n}/${n} ok`);
