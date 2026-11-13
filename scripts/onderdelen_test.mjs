// #837: vijf onderdelen op bestaande plekken, per speler gevonden, en één Eigen Maaksel.
//   node scripts/onderdelen_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { onderdelen, onderdeelId, heeftAlle, stand, ONDERDELEN_TOTAAL, ONDERDEEL_R, ONDERDEEL_AUTO } from '../game/js/onderdelen.js';
import { VEHICLE_STOCK } from '../game/js/shopdata.js';

const lees = (f) => fs.readFileSync(new URL('../game/js/' + f, import.meta.url), 'utf8');
let n = 0;
const t = (naam, f) => { f(); n++; console.log(`ok ${naam}`); };

t('vijf onderdelen, unieke ids en een bestaand automodel', () => {
  const p = onderdelen();
  assert.equal(p.length, 5);
  assert.equal(ONDERDELEN_TOTAAL, 5);
  assert.equal(new Set(p.map((q) => q.id)).size, 5);
  assert.ok(p.every((q) => Number.isFinite(q.x) && Number.isFinite(q.y) && q.naam && q.plek));
  assert.ok(VEHICLE_STOCK[ONDERDEEL_AUTO.basis], 'het basismodel bestaat in de winkelvoorraad');
});

t('vinden werkt binnen de straal en niet op afstand', () => {
  const p = onderdelen()[0];
  assert.equal(onderdeelId(p.x, p.y), p.id);
  assert.equal(onderdeelId(p.x + ONDERDEEL_R + 1, p.y), null);
});

t('de stand loopt van leeg naar compleet', () => {
  const ids = onderdelen().map((q) => q.id);
  assert.equal(stand([]).gevonden, 0);
  assert.equal(stand([ids[0], ids[1]]).gevonden, 2);
  assert.equal(heeftAlle(ids), true);
  assert.equal(heeftAlle(ids.slice(0, 4)), false);
  assert.equal(stand(ids).compleet, true);
  assert.deepEqual(stand(ids).ontbrekend, []);
});

t('de live module schrijft in de prestatieset en bouwt via de garage', () => {
  const live = lees('onderdelenlive.js');
  assert.match(live, /recordUnique\(world, PRESTATIE_SET, id\)/);
  assert.match(live, /export function bouwAuto/);
  assert.match(live, /VEHICLE_STOCK\[ONDERDEEL_AUTO\.basis\]/);
  assert.match(lees('garages.js'), /Bouw je Knutselwagen/);
  assert.match(lees('achievements.js'), /set: 'autodelen', goal: 5/);
});

console.log(`onderdelen_test: ${n}/${n} ok`);
