// De stadskaart voor tests en audits op één plek (#90; de stad komt uit stad.json en de OSM-tegelbouw, citymap.json bestaat niet meer):
//   loadStadData()    de stadsdata zoals de bouw ze maakt (zelfde als loadCityData)
//   loadCityWorld()   dezelfde stad als GameMap, of (WORLD_SRC=tiles) als tegels (pack_tiles, in het geheugen) via loadTileWorld
// De OSM-lagen komen uit de cache van de stadsbouw (scripts/world/stad_cache.mjs) en vragen data/cache/province (of GDE_PROVINCE_SRC):
// ontbreekt die, dan eindigt de test met SKIP (zoals stadlaag_*_test).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import '../node3d.mjs';

const game = new URL('../../game/', import.meta.url);
export const worldSrc = (env = process.env) => (env.WORLD_SRC === 'tiles' ? 'tiles' : 'json');

// de OSM-bouw heeft de provincie-extracten nodig; zonder die sluit een test met SKIP af
export async function skipUnlessCity(name = path.basename(process.argv[1] || 'test')) {
  const { haveProvince } = await import('../world/build_province.mjs');
  if (!haveProvince()) { console.log(`SKIP ${name}: geen data/cache/province (stad.json mist water, groen, bomen en gebouwen uit OSM)`); process.exit(0); }
}

// de stadsdata zoals de bouw ze maakt: stad.json (handlaag) + de OSM-lagen (wegen, spoor, gebouwen, water, groen, bomen);
// extras: true legt ook mapextras erover. Zonder provincie-extract sluit de test af met SKIP.
export async function loadStadData({ extras = false } = {}) {
  return loadCityData({ extras });
}

// extras: false laat mapextras weg (voor tests die ze zelf nog aanzetten)
export async function loadCityData({ extras = true } = {}) {
  await skipUnlessCity();
  const P = await import('../world/pack_tiles.mjs');
  return (await P.loadCityDataLaag(undefined, undefined, { extras })).data;
}

export async function loadCityWorld({ src = worldSrc() } = {}) {
  await skipUnlessCity();
  const P = await import('../world/pack_tiles.mjs');
  if (src === 'tiles') {
    const S = await import('../../game/js/tilestore.js');
    const { loadTileWorld } = await import('../../game/js/tileworld.js');
    const built = P.build(await P.loadSourcesLaag());
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gde-loadworld-'));
    try {
      P.writeWorld(dir, built, new Set(built.blobs.keys()));
      const files = {};
      for (const f of fs.readdirSync(dir)) files[f] = new Uint8Array(fs.readFileSync(path.join(dir, f)));
      const tw = await loadTileWorld('world/', { source: new S.MemorySource(files), pool: false });
      return { map: tw.world, src };
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  }
  return { map: (await P.loadSourcesLaag()).map, src };
}
