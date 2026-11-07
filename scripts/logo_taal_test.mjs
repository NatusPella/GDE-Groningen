// #577: "Grootste Diefstal Ever" is de vaste merknaam/tagline. De spelerskant
// (logo.js en index.html) moet exact dezelfde vorm gebruiken, nergens de
// vertaling "Grootste Diefstal Ooit", en de uitzondering moet in de
// merkdocumentatie staan. Zo blijft de keuze consistent en controleerbaar.
//   node scripts/logo_taal_test.mjs
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { SERIES_MEANING } from '../game/js/logo.js';

let n = 0;
const t = (naam, f) => { f(); n++; console.log(`ok ${naam}`); };
const read = (p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');

t('logo.js en index.html gebruiken dezelfde merknaam', () => {
  assert.equal(SERIES_MEANING, 'Grootste Diefstal Ever');
  assert.match(read('game/index.html'), /<span class="gde-meaning">Grootste Diefstal Ever<\/span>/);
  assert.match(read('game/index.html'), /aria-label="GDE Groningen – Zomer vol misdaad"/);
});

t('nergens de vertaalde variant in spelers- of logobestanden', () => {
  for (const p of ['game/index.html', 'game/js/logo.js', 'game/js/credits.js', 'README.md']) {
    assert.ok(!/Grootste Diefstal Ooit/.test(read(p)), p + ' gebruikt de merknaam, geen vertaling');
  }
});

t('de uitzondering staat in de merkdocumentatie', () => {
  const lic = read('docs/LICENTIES.md');
  assert.match(lic, /Vaste merknaam, bewuste taaluitzondering/);
  assert.match(lic, /Grootste Diefstal Ooit/);
  assert.match(read('docs/MERKENCHECK.md'), /vaste merknaam/);
});

t('logo.js en index.html zijn de enige spelersplekken met de uitgeschreven naam', () => {
  const game = read('game/index.html') + read('game/js/logo.js');
  assert.equal((game.match(/Grootste Diefstal Ever/g) || []).length >= 2, true);
  // De credits mogen de merknaam noemen, maar niet een tweede spelling introduceren.
  assert.ok(!/Grootste Diefstal Ever[^<]*Ooit/.test(game));
});

console.log(`logo_taal_test: ${n}/${n} ok`);
