// The AHN terrain field for the height solvers in Node (docs/PROVINCIE-PLAN.md
// 2.7): the rasters of scripts/world/fetch_ahn.py --fetch (data/world/ahn) as
// one sampler, (x, y) -> m relative to street level. Flat (0) where there is
// no raster, and everywhere when none has been fetched. The game draws the
// world flat until F2, so the solvers only take it with --terrain.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TerrainField, shiftRaster } from '../../game/js/terrainraster.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// tile key -> raster (shifted to m NAP where the file is relative to its tile's street level)
export function loadTerrainRasters(root = ROOT) {
  const out = new Map();
  const dir = path.join(root, 'data/world/ahn');
  const f = path.join(dir, 'index.json');
  if (!fs.existsSync(f)) return out;
  const idx = JSON.parse(fs.readFileSync(f, 'utf8'));
  for (const [key, t] of Object.entries(idx.tiles || {})) {
    const bin = path.join(dir, key + '.bin');
    if (fs.existsSync(bin)) out.set(key, shiftRaster({ w: t.w, h: t.h, cell: t.cell, x0: t.x0, y0: t.y0, codec: 1, data: new Uint8Array(fs.readFileSync(bin)) }, t.abs === false ? t.street_nap : 0));
  }
  return out;
}

export function loadTerrainField(root = ROOT) {
  const field = new TerrainField();
  for (const [key, r] of loadTerrainRasters(root)) field.add(key, r);
  return field;
}
