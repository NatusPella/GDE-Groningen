// De stad als TileWorld uit een al gebouwde wereldmap (game/world of GAME_WORLD): geen OSM-bouw van 7 minuten zoals
// loadworld.mjs loadCityWorld, wel dezelfde kaart als het spel (de vastgepinde stadstegels). Voor audits van wat er op
// de straat staat (heggen, bomen, garages, dieren). Zonder wereldmap sluit de aanroeper af met SKIP.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import '../node3d.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const wereldMap = (env = process.env) => path.resolve(env.GAME_WORLD || path.join(ROOT, 'game', 'world'));
export const heeftWereld = (dir = wereldMap()) => fs.existsSync(path.join(dir, 'index.json'));

export async function laadStadTegels(dir = wereldMap()) {
  const S = await import('../../game/js/tilestore.js');
  const { loadTileWorld } = await import('../../game/js/tileworld.js');
  const files = {};
  for (const f of fs.readdirSync(dir)) if (/\.(gdp|json)$/.test(f)) files[f] = new Uint8Array(fs.readFileSync(path.join(dir, f)));
  const tw = await loadTileWorld('world/', { source: new S.MemorySource(files), pool: false });
  if (!tw) throw new Error('geen index.json in ' + dir);
  return tw;
}
