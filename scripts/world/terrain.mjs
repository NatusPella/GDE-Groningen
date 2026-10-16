// The AHN terrain field for the height solvers in Node (docs/PROVINCIE-PLAN.md
// 2.7): the rasters of scripts/world/fetch_ahn.py --fetch (data/world/ahn) as
// one sampler, (x, y) -> m relative to street level. Flat (0) where there is
// no raster, and everywhere when none has been fetched. The game draws the
// world flat until F2, so the solvers only take it with --terrain.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TerrainField } from '../../game/js/terrainraster.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export function loadTerrainField(root = ROOT) {
  const field = new TerrainField();
  const dir = path.join(root, 'data/world/ahn');
  const f = path.join(dir, 'index.json');
  if (!fs.existsSync(f)) return field;
  const idx = JSON.parse(fs.readFileSync(f, 'utf8'));
  for (const [key, t] of Object.entries(idx.tiles || {})) {
    const bin = path.join(dir, key + '.bin');
    if (fs.existsSync(bin)) field.add(key, { w: t.w, h: t.h, cell: t.cell, x0: t.x0, y0: t.y0, codec: 1, data: new Uint8Array(fs.readFileSync(bin)) });
  }
  return field;
}
