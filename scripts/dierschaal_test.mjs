// Reuzenvogel (#433): elk dier, en dus elk vogelmodel, heeft een harde bovengrens: de schaal van zijn eigen
// bouw (game/js/dierschaal.js). wildlife.js begrenst daarmee elk model, coopextra3d.js elk dier van een gast.
// Sinds 23-11 ook de echte maat: elk dier uit het register wordt gebouwd zoals de wereld het doet en gemeten (schofthoogte,
// hoogte of lengte, scripts/lib/diermaat.mjs); meer dan 15% naast de maat in het register (dierenregister.js maat) faalt.
import './node3d.mjs';
import fs from 'node:fs';
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

t('de zwaan (eend) en de reiger houden hun eigen bouw', () => {
  assert.equal(veiligeDierSchaal('duck', 3.1), 3.1);
  assert.equal(veiligeDierSchaal('reiger', 3.4), 1.56, 'de reiger is 1 m hoog, niet 2 m');
  assert.equal(veiligeDierSchaal('reiger', 12), 1.56);
  assert.equal(veiligeDierSchaal('gans', 1.95), 1.95);
});

// --- de echte maat van elk dier uit het register ---
const R = await import('../game/js/dierenregister.js');
const W = await import('../game/js/wildlife.js');
const C = await import('../game/js/countryside.js');
const AM = await import('../game/js/animalmodels.js');
const { measureAnimal } = await import('./lib/diermaat.mjs');
for (const id of [...AM.ANIMAL_MODEL_IDS, ...AM.FISH_MODEL_IDS]) AM.primeAnimalModel(id, JSON.parse(fs.readFileSync(new URL(`../game/models/dieren/${id}.json`, import.meta.url), 'utf8')));
const gemeten = [];
t('elk dier heeft een echte maat en zijn model klopt daarmee (15%)', () => {
  for (const d of R.DIEREN) {
    assert.ok(d.maat && Object.keys(d.maat).length === 1, `${d.id}: maat in het register`);
    const [soort, doel] = Object.entries(d.maat)[0];
    // het model zoals de wereld het bouwt (de grootste variant: zaad zo gekozen dat de maatvariatie 1 is)
    const g = d.model.module === 'countryside' ? C[d.model.fn](...d.model.args) : W.buildWildlifeMesh3D({ kind: d.kind, variant: d.variant, bobSeed: 0, breed: 0, color: 0 });
    const m = measureAnimal(g)[soort];
    const [lo, hi] = Array.isArray(doel) ? [doel[0] * 0.85, doel[1] * 1.15] : [doel * 0.85, doel * 1.15];
    gemeten.push(`${d.id} ${soort} ${m.toFixed(2)}`);
    assert.ok(m >= lo && m <= hi, `${d.id}: ${soort} ${m.toFixed(2)} m, register ${doel} m`);
    // DIER_MAX_SCHAAL volgt de bouw: het model is nooit groter dan de grens van zijn soort
    if (DIER_MAX_SCHAAL[d.kind] !== undefined && d.model.module === 'wildlife') assert.ok(g.scale.x <= DIER_MAX_SCHAAL[d.kind] + 1e-9, `${d.id}: schaal ${g.scale.x} binnen DIER_MAX_SCHAAL`);
  }
});
t('de modelschalen en DIER_MAX_SCHAAL zijn dezelfde getallen', () => {
  for (const [k, v] of Object.entries(W.MODEL_SCALE)) assert.equal(DIER_MAX_SCHAAL[k], v, `${k}: MODEL_SCALE ${v} en DIER_MAX_SCHAAL ${DIER_MAX_SCHAAL[k]}`);
});
t('de wolf is ongeveer twee keer zo groot als de vos', () => {
  const vos = measureAnimal(W.buildWildlifeMesh3D({ kind: 'vos', bobSeed: 0 })).schoft, wolf = measureAnimal(W.buildWildlifeMesh3D({ kind: 'wolf', bobSeed: 0 })).schoft;
  assert.ok(wolf / vos > 1.7 && wolf / vos < 2.3, `wolf ${wolf.toFixed(2)} m, vos ${vos.toFixed(2)} m`);
});
console.log(gemeten.join(', '));

t('een onbekende soort wordt niet getekend', () => {
  assert.equal(maxDierSchaal('draak'), null);
  assert.equal(veiligeDierSchaal('draak', 1), null);
});

console.log(`dierschaal_test: ${n}/${n} ok`);
