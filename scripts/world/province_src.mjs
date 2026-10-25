// Waar de provincie-extracten staan (scripts/world/extract_province.py), los van de bouw zelf: de
// stadsbouwcache (stad_cache.mjs) heeft ze nodig voor zijn sleutel, en die wordt óók gebruikt terwijl
// build_province.mjs nog draait. Stonden ze in build_province.mjs zelf, dan importeerde de cache het
// bestand waarin hij werd aangeroepen en wachtte hij eeuwig op zichzelf (#506).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// GDE_PROVINCE_SRC: een extract buiten de werkboom (worktrees)
export const SRC_DIR = process.env.GDE_PROVINCE_SRC ? path.resolve(process.env.GDE_PROVINCE_SRC) : path.join(ROOT, 'data', 'cache', 'province');

export const haveProvince = (dir = SRC_DIR) => fs.existsSync(path.join(dir, 'province.json.gz'));

// The buffer strips next to the province: extracts of the neighbouring
// provinces cut to the strip (extract_province.py --near), in
// data/cache/province-<name>/ next to the province's own.
export function bufferDirs(src = SRC_DIR) {
  const base = path.dirname(src), name = path.basename(src);
  if (!fs.existsSync(base)) return [];
  return fs.readdirSync(base).filter((d) => d.startsWith(name + '-') && haveProvince(path.join(base, d))).sort().map((d) => path.join(base, d));
}
