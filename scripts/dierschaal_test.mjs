// Reuzenvogel (#433): elk dier, en dus elk vogelmodel, heeft een harde bovengrens: de schaal van zijn eigen
// bouw (game/js/dierschaal.js). wildlife.js begrenst daarmee elk model, coopextra3d.js elk dier van een gast.
// Puur en zonder three.js, zodat deze test met gewone node draait.
import assert from 'node:assert/strict';
import { DIER_MAX_SCHAAL, VOGEL_SOORTEN, maxDierSchaal, veiligeDierSchaal } from '../game/js/dierschaal.js';

let n = 0;
const t = (naam, f) => { f(); n++; };

t('elk vogelmodel heeft een harde bovengrens', () => {
  assert.deepEqual([...VOGEL_SOORTEN].sort(), ['duck', 'gans', 'pigeon', 'reiger', 'seagull']);
  for (const soort of VOGEL_SOORTEN) {
    const max = maxDierSchaal(soort);
    assert.ok(max > 0, `${soort} heeft een bovengrens`);
    assert.ok(max <= 3.5, `${soort}: de bovengrens (${max}) is de eigen bouw, geen reuzenvogel`);
  }
});

t('geen enkele soort komt boven zijn eigen bouw, ook niet met een ongeldige schaal', () => {
  for (const soort of Object.keys(DIER_MAX_SCHAAL)) {
    for (const schaal of [1e9, 6, 3.4, 3.1, 1.8, 1, 0.5, 0, -4, NaN, Infinity, -Infinity]) {
      const v = veiligeDierSchaal(soort, schaal);
      assert.ok(Number.isFinite(v) && v > 0, `${soort} met ${schaal} geeft een geldige schaal`);
      assert.ok(v <= DIER_MAX_SCHAAL[soort] + 1e-9, `${soort} met ${schaal} blijft binnen de eigen bouw (${v})`);
    }
  }
});

t('de duif wordt in de wereld nooit groter dan 1; alleen de cheat schaalt in scene3d.js', () => {
  assert.equal(veiligeDierSchaal('pigeon', 6), 1);
  assert.equal(veiligeDierSchaal('pigeon', 1), 1);
  assert.equal(veiligeDierSchaal('seagull', 6), 1, 'een meeuw wordt nooit 6 maal');
});

t('de zwaan (eend) en de reiger houden hun eigen, grotere bouw', () => {
  assert.equal(veiligeDierSchaal('duck', 3.1), 3.1);
  assert.equal(veiligeDierSchaal('reiger', 3.4), 3.4);
  assert.equal(veiligeDierSchaal('reiger', 12), 3.4);
  assert.equal(veiligeDierSchaal('gans', 1.7), 1.7);
});

t('een onbekende soort wordt niet getekend', () => {
  assert.equal(maxDierSchaal('draak'), null);
  assert.equal(veiligeDierSchaal('draak', 1), null);
});

console.log(`dierschaal_test: ${n}/${n} ok`);
