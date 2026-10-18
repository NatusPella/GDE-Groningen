// De stadskaart voor tests en audits op één plek (#90, stap S1):
//   WORLD_SRC=json   (standaard) citymap.json + mapextras.json > GameMap
//   WORLD_SRC=tiles  dezelfde stad als tegels (pack_tiles, in het geheugen) via loadTileWorld
// loadCityWorld() geeft { map, src }; loadCityData() de ruwe JSON voor tests die die zelf willen.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import '../node3d.mjs';

const root = new URL('../../game/', import.meta.url);
export const worldSrc = (env = process.env) => (env.WORLD_SRC === 'tiles' ? 'tiles' : 'json');

export async function loadCityData() {
  const { applyMapExtras } = await import('../../game/js/mapdata.js');
  const data = JSON.parse(fs.readFileSync(new URL('citymap.json', root)));
  applyMapExtras(data, JSON.parse(fs.readFileSync(new URL('mapextras.json', root))));
  return data;
}

export async function loadCityWorld({ src = worldSrc() } = {}) {
  if (src === 'tiles') {
    const P = await import('../world/pack_tiles.mjs');
    const S = await import('../../game/js/tilestore.js');
    const { loadTileWorld } = await import('../../game/js/tileworld.js');
    const built = P.build(P.loadSources());
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gde-loadworld-'));
    try {
      P.writeWorld(dir, built, new Set(built.blobs.keys()));
      const files = {};
      for (const f of fs.readdirSync(dir)) files[f] = new Uint8Array(fs.readFileSync(path.join(dir, f)));
      const tw = await loadTileWorld('world/', { source: new S.MemorySource(files), pool: false });
      return { map: tw.world, src };
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  }
  const { GameMap } = await import('../../game/js/mapdata.js');
  return { map: new GameMap(await loadCityData()), src };
}
