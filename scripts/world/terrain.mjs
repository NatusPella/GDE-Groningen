// The AHN terrain field for the height solvers in Node (docs/PROVINCIE-PLAN.md
// 2.7): the rasters of scripts/world/fetch_ahn.py --fetch (data/world/ahn) as
// one sampler, (x, y) -> m relative to street level. Flat (0) where there is
// no raster, and everywhere when none has been fetched. The game draws the
// world flat until F2, so the solvers only take it with --terrain.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TerrainField, shiftRaster } from '../../game/js/terrainraster.js';
import { reliefRasters } from './relief.mjs';

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

// The rasters as RELIEF (relief.mjs, #269): the ground above its local datum, which is what the tiles carry, what the height solver
// takes and what the game reads with ?terrain. Computed from the whole province's rasters once per process.
const reliefCache = new Map();
export function loadReliefRasters(root = ROOT) {
  if (!reliefCache.has(root)) {
    const nap = loadTerrainRasters(root);
    reliefCache.set(root, nap.size ? reliefRasters(nap).rasters : nap);
  }
  return reliefCache.get(root);
}

// The terrain field of the solvers and the tests: the relief, or with { nap: true } the heights in m NAP
export function loadTerrainField(root = ROOT, { nap = false } = {}) {
  const field = new TerrainField();
  for (const [key, r] of nap ? loadTerrainRasters(root) : loadReliefRasters(root)) field.add(key, r);
  return field;
}

// The roads of a city map as ?terrain reads them (#269, tileworld.js attachProfiles): where a road has a terrain profile
// (`zt`, terrain_solve.mjs) it is the profile; `zt = []` is flat over the terrain. Roads without one keep their flat z.
export function useTerrainProfiles(roads) {
  let swapped = 0;
  for (const r of roads) {
    if (r.zt === undefined) continue;
    r.zFlat = r.z;
    r.z = r.zt.length ? r.zt : undefined;
    if (r.z && r.bridge && !r.tunnel) r.zDeck = true; // (a deck is a ribbon over its line even where it is flat, elevation.js)
    swapped++;
  }
  return swapped;
}
