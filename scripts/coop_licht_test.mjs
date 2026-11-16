// De coop-tests onder scripts/coop/ draaien mee in de gewone suite (#646): ze staan niet
// in scripts/*_test.mjs en werden daardoor nooit gedraaid. Deze test start elk bestand
// als eigen Node-proces (ze delen geen staat en sommige openen echte TCP-poorten), met
// een eigen tijdslimiet, en telt ze als PASS, SKIP (bekend kapot, met reden) of FAIL.
//   node scripts/coop_licht_test.mjs            alle coop-tests
//   node scripts/coop_licht_test.mjs --only=bijbaan
//
// Een test die hieronder bij BEKEND_KAPOT staat, is bewust nog niet groen: de code is
// intussen veranderd (namen, sessies, wedstrijdflow) en de test moet mee. Ze draaien wel
// mee, zodat de stand zichtbaar blijft, maar ze tellen niet als nieuwe fout. Haal een
// test uit deze lijst zodra hij weer klopt; de lijst hoort te krimpen, niet te groeien.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const COOP = path.join(ROOT, 'scripts', 'coop');
const PER_TEST_MS = 240_000;
const only = (process.argv.find((a) => a.startsWith('--only=')) || '').slice(7);

// Geen bekend kapotte coöptests meer (16-11-2026, na #452/#502/#583).
export const BEKEND_KAPOT = {};

const bestanden = fs.readdirSync(COOP)
  .filter((n) => /_test\.mjs$/.test(n))
  .filter((n) => !only || n.includes(only))
  .sort();

let pass = 0, fail = 0, bekend = 0;
const fouten = [];
const t0 = Date.now();
for (const naam of bestanden) {
  const bestand = path.join(COOP, naam);
  const r = spawnSync(process.execPath, [bestand], { cwd: ROOT, encoding: 'utf8', timeout: PER_TEST_MS, maxBuffer: 32 << 20 });
  const out = ((r.stdout || '') + (r.stderr || '')).trim();
  const secs = (Date.now() - t0) / 1000;
  const laatste = out.split(/\r?\n/).filter(Boolean).slice(-1)[0] || '';
  const code = r.status;
  if (code === 0) {
    pass++;
    console.log(`PASS    coop/${naam} ${laatste}`);
  } else if (BEKEND_KAPOT[naam]) {
    bekend++;
    console.log(`OVER    coop/${naam} (bekend kapot: ${BEKEND_KAPOT[naam]})`); // niet met SKIP laten beginnen: test_all leest dat als een overgeslagen item
  } else {
    fail++;
    fouten.push(`${naam}: ${laatste || 'geen uitvoer'}`);
    console.log(`FAIL    coop/${naam}`);
    for (const regel of out.split(/\r?\n/).slice(0, 8)) console.log('    ' + regel);
    for (const regel of out.split(/\r?\n/).slice(-8)) console.log('    ' + regel);
  }
  void secs;
}

console.log(`\ncoop-tests: ${pass} geslaagd, ${bekend} bekend kapot (zie #646), ${fail} onverwacht mislukt (${bestanden.length} bestanden)`);
if (fail) { console.log('Onverwacht mislukt: ' + fouten.join(' | ')); process.exit(1); }
process.exit(0);
