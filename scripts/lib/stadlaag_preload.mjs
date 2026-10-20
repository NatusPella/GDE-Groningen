// Draait een test of audit op de stad uit de OSM-tegelbouw in plaats van citymap.json (#90, STAD_LAAG=roads,rails,...):
//
//   STAD_LAAG=roads,rails STAD_LAAG_CACHE=<bestand> node --import ./scripts/lib/stadlaag_preload.mjs scripts/world/drive_audit.mjs
//
// De tests lezen citymap.json en mapextras.json zelf (JSON.parse + applyMapExtras + new GameMap). Deze voorlader bouwt de
// stad met de gewisselde lagen (pack_tiles.mjs loadRawLaag: vóór applyMapExtras) en laat fs.readFileSync die twee
// bestanden terugleveren, zodat elk bestaand testbestand ongewijzigd de nieuwe stad ziet. Zonder STAD_LAAG doet hij niets.
// Het verslag van de bouw gaat naar stderr. Alleen voor ontwikkeling en audits, niet voor het spel.
import fs from 'node:fs';
import path from 'node:path';
import { syncBuiltinESMExports } from 'node:module';
import { fileURLToPath } from 'node:url';

if (process.env.STAD_LAAG) {
  const P = await import('../world/pack_tiles.mjs');
  const lagen = P.parseLagen(process.env.STAD_LAAG);
  if (lagen.length) {
    const raw = await P.loadRawLaag(undefined, lagen);
    const files = { 'citymap.json': JSON.stringify(raw.data), 'mapextras.json': JSON.stringify(raw.extras) };
    const orig = fs.readFileSync;
    fs.readFileSync = function (file, opts) {
      let f = file;
      try { if (f instanceof URL) f = fileURLToPath(f); } catch { /* geen bestands-URL */ }
      if (typeof f === 'string') {
        const base = path.basename(f), dir = path.basename(path.dirname(f));
        if (files[base] !== undefined && dir === 'game') {
          const enc = typeof opts === 'string' ? opts : opts && opts.encoding;
          return enc ? files[base] : Buffer.from(files[base]);
        }
      }
      return orig.apply(this, arguments);
    };
    syncBuiltinESMExports();
    console.error(`[stadlaag_preload] stad met lagen ${lagen.join(',')}: ${raw.data.roads.length} wegen, ${raw.data.rails.length} rails; ${JSON.stringify(raw.report)}`);
  }
}
