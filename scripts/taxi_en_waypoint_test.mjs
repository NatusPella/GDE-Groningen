// #836: snel waypoint (5) en de taxi als reisoptie. De taxi is een gewone reisoptie met
// prijs, wachttijd en een veilige aankomst; de scène valt terug op de auto-opnamen.
//   node scripts/taxi_en_waypoint_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { reisOpties, MODE_LABEL, taxiPrice } from '../game/js/ovopties.js';
import { KEY_ACTIONS } from '../game/js/controls.js';

const lees = (f) => fs.readFileSync(new URL('../game/js/' + f, import.meta.url), 'utf8');
let n = 0;
const t = (naam, f) => { f(); n++; console.log(`ok ${naam}`); };

t('de taxi is een reisoptie met prijs en label', () => {
  const opts = reisOpties({ auto: { length: 1200, etaS: 100 }, taxi: { length: 1200, etaS: 300 } }, { directM: 1000, money: 50 });
  const taxi = opts.find((o) => o.id === 'taxi');
  assert.ok(taxi, 'taxi staat in de opties');
  assert.equal(taxi.label, 'Met de taxi');
  assert.equal(taxi.price, taxiPrice(1200));
  assert.equal(taxi.afford, true);
  assert.equal(taxi.ride, true);
  assert.equal(MODE_LABEL.taxi, 'Met de taxi');
});

t('te weinig geld maakt de taxi onbetaalbaar', () => {
  const opts = reisOpties({ auto: { length: 1200, etaS: 100 }, taxi: { length: 1200, etaS: 300 } }, { directM: 1000, money: 0 });
  assert.equal(opts.find((o) => o.id === 'taxi').afford, false);
});

t('de kaart vraagt de taxi alleen aan bij een echte rit en de sneltoets is 5', () => {
  const kaart = lees('reiskaart.js');
  assert.match(kaart, /routes\.taxi = /);
  assert.match(kaart, /TAXI_WAIT_S/);
  assert.match(lees('snelwaypoint.js'), /wasPressed\('5'\)/);
  assert.ok(KEY_ACTIONS.some(([k]) => k === '5'));
});

t('de taxi gebruikt de bestaande reisscène en aankomst', () => {
  const rit = lees('meerijden.js');
  assert.match(rit, /SHOT_NAMES\[optie.id\]/);
  const reis = lees('reisrit.js');
  assert.match(reis, /startMeerijden\(world, optie, dest\)/);
});

console.log(`taxi_en_waypoint_test: ${n}/${n} ok`);
