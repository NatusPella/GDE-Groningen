// Schrijft de sha256 van een releasebestand in de vorm die `sha256sum -c` verwacht:
//   node scripts/release_hashes.mjs <bestand> [...]
// Uitvoer: "<hex>  <naam>" per bestand, naar stdout. Geen netwerk, geen staat.
import { createHash } from 'node:crypto';
import { createReadStream, statSync } from 'node:fs';
import { basename } from 'node:path';

const files = process.argv.slice(2);
if (!files.length) { console.error('gebruik: node scripts/release_hashes.mjs <bestand> [...]'); process.exit(2); }

const hashOf = (file) => new Promise((resolve, reject) => {
  const h = createHash('sha256');
  createReadStream(file).on('data', (c) => h.update(c)).on('end', () => resolve(h.digest('hex'))).on('error', reject);
});

for (const f of files) {
  if (!statSync(f, { throwIfNoEntry: false })) { console.error('bestaat niet: ' + f); process.exitCode = 1; continue; }
  console.log((await hashOf(f)) + '  ' + basename(f));
}
