// De stadskaart voor tests en audits op één plek (#90, stap S1; sinds C3 uit stad.json, citymap.json bestaat niet meer als bron):
//   loadStadData()    de handlaag zelf (game/stad.json): meta, wegen, spoor, meubilair, handgebouwen. Snel, zonder OSM-lagen:
//                     water, groen en bomen zijn lege lijsten, gebouwen alleen het handwerk. Voor tests die alleen meta, wegen of spoor lezen.
//   loadCityData()    de volledige kaartdata: stad.json + de lagen uit de OSM-tegelbouw + mapextras (voor tests die zelf in de lijsten kijken)
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

// De oude stad (citymap.json) als bron, alleen voor de pariteitstests tegenover de OSM-bouw (city_diff, city_parity, stadlaag_*);
// ze eindigen met SKIP zodra citymap.json weg is (scripts/stad_opruimen.mjs).
// lagen: de lagen die (zoals STAD_LAAG vroeger) uit de OSM-bouw komen; de rest blijft uit citymap.json
export async function loadLegacySources(lagen = [], name = path.basename(process.argv[1] || 'test')) {
  if (!fs.existsSync(new URL('citymap.json', game))) { console.log(`SKIP ${name}: geen game/citymap.json meer (de vergelijking met het oude stadspad is afgerond)`); process.exit(0); }
  const P = await import('../world/pack_tiles.mjs');
  const { readCitymap } = await import('../world/stad_split.mjs');
  return P.loadSourcesLaag(undefined, lagen, { city: await readCitymap() });
}

export async function loadStadData({ extras = false } = {}) {
  const P = await import('../world/pack_tiles.mjs');
  const { data, fromOsm } = P.readStad(fileURLToPath(game));
  for (const l of fromOsm) if (!data[l]) data[l] = [];
  if (extras) {
    const { applyMapExtras } = await import('../../game/js/mapdata.js');
    applyMapExtras(data, JSON.parse(fs.readFileSync(new URL('mapextras.json', game))));
  }
  return data;
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
