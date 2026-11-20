// #836: snel waypoint (5) en de taxi als reisoptie. De taxi is een gewone reisoptie met
// prijs, wachttijd en een veilige aankomst; de scène valt terug op de auto-opnamen.
//   node scripts/taxi_en_waypoint_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { reisOpties, MODE_LABEL, taxiPrice, taxiBlokkade } from '../game/js/ovopties.js';
import { reisKeuzes } from '../game/js/kaartactie.js';
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
  assert.doesNotMatch(kaart, /if \(direct >= 300\) routes\.taxi/, 'de taxi hangt niet meer aan een afstandsdrempel: hij staat er altijd, soms uitgeschakeld');
  assert.match(kaart, /TAXI_WAIT_S/);
  assert.match(lees('snelwaypoint.js'), /wasPressed\('5'\)/);
  assert.ok(KEY_ACTIONS.some(([k]) => k === '5'));
});

t('de taxi gebruikt de bestaande reisscène en aankomst', () => {
  const rit = lees('meerijden.js');
  assert.match(rit, /SHOT_NAMES\[optie.id\]/);
  assert.match(rit, /taxi: \['instappen', 'rit', 'aankomst'\]/);
  const reis = lees('reisrit.js');
  assert.match(reis, /startMeerijden\(world, optie, dest\)/);
  // #882: de taxi is in beeld, niet alleen een balk en een skipknop
  assert.match(reis, /reisrit-taxi/);
  assert.match(reis, /rr-cab/);
  assert.match(reis, /cab\.style\.left/);
});

t('tabeltest: de taxi staat er altijd en weigert met een reden in gewone taal (#882, playtest 0.64.0)', () => {
  const rij = (hemels, money, wanted = 0) => {
    const routes = { auto: { length: hemels * 1.25, etaS: 100 }, taxi: { length: Math.max(1, hemels * 1.25), etaS: 200 } };
    return reisOpties(routes, { directM: hemels * 1.25, hemelsM: hemels, money, wanted }).find((o) => o.id === 'taxi');
  };
  const tabel = [
    // hemelsbreed, geld, wanted, verwacht
    [50, 500, 0, /^Te dichtbij/], [299, 500, 0, /^Te dichtbij/], [300, 500, 0, null], [5000, 500, 0, null],
    [5000, 500, 1, /^Niet tijdens een achtervolging/], [5000, 500, 3, /politie weg/],
    [5000, 3, 0, /^Je hebt € \d+ te weinig$/], [50, 0, 2, /^Te dichtbij/], [5000, 0, 1, /^Niet tijdens/],
  ];
  for (const [d, m, w, v] of tabel) {
    const o = rij(d, m, w);
    assert.ok(o, `de taxi staat er bij ${d} m`);
    assert.equal(o.ride, true);
    if (v === null) { assert.equal(o.blokkade, null); assert.equal(o.afford, true); } else { assert.match(o.blokkade, v); assert.equal(o.afford, false, `${d} m, € ${m}, wanted ${w}`); }
  }
  assert.equal(taxiBlokkade({ directM: 1000, money: 100, price: 10 }), null);
  assert.equal(taxiBlokkade({ directM: 1000, money: 8.5, price: 10 }), 'Je hebt € 2 te weinig');
  // een geblokkeerde taxi is nooit de aanbevolen rit
  const opts = reisOpties({ auto: { length: 2000, etaS: 400 }, taxi: { length: 2000, etaS: 100 } }, { directM: 2000, hemelsM: 1600, money: 100, wanted: 1 });
  assert.ok(!opts.find((o) => o.id === 'taxi').aanbevolen);
  // de kaartkeuze toont de reden
  const keuzes = reisKeuzes(opts, 1600);
  assert.match(keuzes.find((r) => r.id === 'taxi').disabled, /achtervolging/);
  assert.equal(keuzes.find((r) => r.id === 'zelf').disabled, null);
});

console.log(`taxi_en_waypoint_test: ${n}/${n} ok`);
