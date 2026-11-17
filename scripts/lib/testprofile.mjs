// Het wegwerpprofiel van een QA-harnas. Op deze machine is %TEMP% soms niet
// schrijfbaar voor Electron ("Lock file can not be created", "Toegang geweigerd"),
// en dan start geen enkel beeld- of meetscript. Daarom: eerst %TEMP%, en lukt dat
// niet, dan naast de uitvoer van het script zelf. Een absolute GDE_PROFILE_DIR
// wint altijd, zodat de releasegate het profiel binnen haar eigen uitvoermap kan
// zetten (net als PERF_PROFILE_DIR bij de perf-fase doet).
//
//   import { profileDirFor } from './lib/testprofile.mjs';
//   const dir = profileDirFor(`gde-test-shots-${process.pid}`, out);
//
// Geeft een ABSOLUUT pad terug: desktop/main.js laat een absolute
// GDE_TEST_PROFILE absoluut en plakt een relatieve naam weer aan %TEMP% vast.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export function profileDirFor(naam, uitMap) {
  // De uitvoermap staat vooraan: die hebben we zelf net aangemaakt en daar schrijft
  // Electron gegarandeerd, terwijl %TEMP% op deze machine voor Node wel maar voor
  // Electron niet schrijfbaar is (het profiel, de lock en de GPU-cache falen daar).
  // %TEMP% blijft de tweede keuze voor scripts zonder uitvoermap.
  const kandidaten = [
    process.env.GDE_PROFILE_DIR && path.resolve(process.env.GDE_PROFILE_DIR),
    uitMap && path.resolve(uitMap, '.profielen'),
    os.tmpdir(),
  ].filter(Boolean);
  for (const basis of kandidaten) {
    const dir = path.join(basis, naam);
    try {
      fs.mkdirSync(dir, { recursive: true });
      fs.accessSync(dir, fs.constants.W_OK);
      return dir;
    } catch (e) {
      // deze basis werkt niet: de volgende
    }
  }
  // Niets schrijfbaar: laat de aanroeper falen met een duidelijke regel.
  throw new Error(`geen schrijfbare profielmap voor ${naam} (geprobeerd: ${kandidaten.join(', ')})`);
}

// Ruimt het profiel weer op; stil als het al weg is.
export function verwijderProfiel(dir) {
  if (!dir) return;
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) { /* al weg */ }
}
