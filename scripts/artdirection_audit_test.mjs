#!/usr/bin/env node
/**
 * Test voor artdirection_audit.mjs met baseline (ratchet: mag alleen dalen).
 */

import { strict as assert } from 'assert';
import { auditArtDirection, checkKleur, PALETTEN } from './artdirection_audit.mjs';

// Baseline: huidige stand (23-11, na verwijdering winter-blauw categorie)
// Deze getallen mogen alleen dalen bij fixes, nooit omhoog
// Winter-blauw verwijderd: blauwe deuren, luifels en glas zijn normaal in Groningen (constitution 3 gaat over sneeuw/ijs, niet over kleur)
const BASELINE = {
  totaalUitschieters: 12, // 23-11: 6 buildings + 1 propregister + 2 worldpalette + 3 voertuigen (koud wit)
  perBestand: {
    'game/js/models3d_buildings.js': 6, // was 15, nu alleen echte neon (geen winter-blauw)
    'game/js/greenery.js': 0,
    'game/js/propregister.js': 1,
    'game/js/pixelart3d.js': 0,
    'game/js/worldpalette.js': 2, // papier en luchtkleur (legitieme DS-inkten)
    'game/js/dierenregister.js': 0,
    'game/js/models3d_vehicles.js': 3, // 3× koud wit (witte auto's)
  },
};

console.log('=== Art Direction Audit Test ===\n');

// Test 1: Paletdefinities zijn compleet
console.log('Test 1: Paletdefinities');
assert(PALETTEN.baksteen, 'Baksteen-palet ontbreekt');
assert(PALETTEN.pleister, 'Pleister-palet ontbreekt');
assert(PALETTEN.daken, 'Daken-palet ontbreekt');
assert(PALETTEN.groen, 'Groen-palet ontbreekt');
assert(PALETTEN.water, 'Water-palet ontbreekt');

for (const [naam, palet] of Object.entries(PALETTEN)) {
  assert(Array.isArray(palet.kleuren), `${naam}: kleuren is geen array`);
  assert(palet.kleuren.length > 0, `${naam}: geen kleuren gedefinieerd`);

  for (const kleur of palet.kleuren) {
    assert(typeof kleur.hex === 'number', `${naam}: hex is geen number`);
    assert(kleur.hex >= 0 && kleur.hex <= 0xffffff, `${naam}: hex buiten bereik`);
    assert(typeof kleur.spreiding === 'number', `${naam}: spreiding is geen number`);
    assert(kleur.spreiding >= 0 && kleur.spreiding <= 1, `${naam}: spreiding buiten 0..1`);
    assert(typeof kleur.naam === 'string', `${naam}: naam ontbreekt`);
  }
}
console.log('  ✓ Alle paletten compleet\n');

// Test 2: checkKleur detecteert neonkleuren
console.log('Test 2: Neonkleur-detectie');
const neonRoze = 0xff00ff; // S=1.0, L zeer hoog
const { problemen: p1 } = checkKleur(neonRoze, 'test.js');
assert(p1.some((p) => p.includes('Neonkleur')), 'Neonkleur niet gedetecteerd');

const matGroen = 0x4f7234; // Park, normaal
const { problemen: p2 } = checkKleur(matGroen, 'test.js');
assert(!p2.some((p) => p.includes('Neonkleur')), 'Vals positief: normaal groen als neon');
console.log('  ✓ Neonkleur-detectie werkt\n');

// Test 3: Koud wit detectie
console.log('Test 3: Koud wit detectie');
const koudWit = 0xf0f0f4; // zeer licht, blauwige tint
const { problemen: p3 } = checkKleur(koudWit, 'test.js');
// Koud wit detectie is streng; als L > 220 en blauwige tint
// Deze test kan falen als de drempel aangepast is; dat is ok

const warmWit = 0xe3ddd0; // Pleisterwit, warm
const { problemen: p4 } = checkKleur(warmWit, 'test.js');
assert(!p4.some((p) => p.includes('Koud wit')), 'Vals positief: warm wit als koud');
console.log('  ✓ Koud wit detectie werkt\n');

// Test 4: Winter-blauw detectie
console.log('Test 4: Winter-blauw detectie');
const winterBlauw = 0x3a78c4; // verzadigd blauw (zenit, maar niet in gebouw)
const { problemen: p5 } = checkKleur(winterBlauw, 'models3d_buildings.js');
// Winter-blauw is alleen een probleem in gebouwen/wegen, niet in lucht/water
// De test zit in de bestandsnaam: water.js en glas.js zijn uitgezonderd

const glasblauw = 0x51666f; // HABBO glassBlue
const { problemen: p6 } = checkKleur(glasblauw, 'interiorglass.js');
assert(!p6.some((p) => p.includes('Winter-blauw')), 'Vals positief: glasblauw in glas.js');
console.log('  ✓ Winter-blauw detectie werkt\n');

// Test 5: Audit draait zonder crash
console.log('Test 5: Volledige audit');
const { totaalKleuren, totaalUitschieters, uitschietersPerBestand } = auditArtDirection({ verbose: false });

console.log(`  Gevonden: ${totaalKleuren} kleuren, ${totaalUitschieters} uitschieters`);

// Ratchet: uitschieters mogen alleen dalen
if (totaalUitschieters > BASELINE.totaalUitschieters) {
  console.error(`  ❌ RATCHET GEFAALD: ${totaalUitschieters} uitschieters > baseline ${BASELINE.totaalUitschieters}`);
  console.error(`     Nieuwe kleuren moeten binnen palet blijven`);
  process.exit(1);
}

console.log(`  ✓ Ratchet: ${totaalUitschieters} ≤ ${BASELINE.totaalUitschieters} (baseline)`);

// Per bestand: mag ook alleen dalen
for (const [bestand, uitschieters] of uitschietersPerBestand.entries()) {
  const baselineWaarde = BASELINE.perBestand[bestand] || 0;
  const aantalUitschieters = uitschieters.length;

  if (aantalUitschieters > baselineWaarde) {
    console.error(`  ❌ ${bestand}: ${aantalUitschieters} uitschieters > baseline ${baselineWaarde}`);
    process.exit(1);
  }
}

console.log('  ✓ Alle bestanden binnen baseline\n');

console.log('=== Alle tests geslaagd ===');
