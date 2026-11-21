// De provinciewereld voor de bootaudit en -tests (zoals hull_route_audit.mjs): tegels per streek laden, het vaarnet, de
// reparaties van vaarnet_fixes.json en de kade-ankers. Zonder game/world met de provincielaag: laadBootWereld() geeft null (SKIP).
import fs from 'node:fs';
import '../node3d.mjs';

const root = new URL('../../game/world/', import.meta.url);
const game = new URL('../../game/', import.meta.url);

export async function laadBootWereld() {
  if (!fs.existsSync(new URL('index-provincie.json', root))) return null;
  const { setCountryBounds } = await import('../../game/js/countryfield.js');
  const { setRegionData } = await import('../../game/js/regions.js');
  const { patchRows, createVaarNet, setSharedNet } = await import('../../game/js/vaarnet.js');
  const S = await import('../../game/js/tilestore.js');
  const TW = await import('../../game/js/tileworld.js');
  const G = await import('../../game/js/gdt.js');
  const B = await import('../../game/js/vehicle/boatspots.js');
  globalThis.requestAnimationFrame = globalThis.requestAnimationFrame || ((f) => setImmediate(f));
  const files = new Proxy({}, { get: (o, f) => (typeof f === 'string' ? (o[f] || (o[f] = new Uint8Array(fs.readFileSync(new URL(f, root))))) : undefined) });
  const T = await TW.loadTileWorld('world/', { source: new S.MemorySource(files), pool: false, extra: ['index-provincie.json'] });
  const map = T.world;
  setCountryBounds(map.meta.bounds);
  const idx = JSON.parse(fs.readFileSync(new URL('index-provincie.json', root), 'utf8'));
  setRegionData(idx.global);
  const json = (f) => JSON.parse(fs.readFileSync(new URL(f, game), 'utf8'));
  map.addWaterPatches(patchRows(json('vaarnet_fixes.json')).filter((r) => !r.strip));
  const net = createVaarNet(json('vaarnet.json'));
  setSharedNet(net);
  B.configureBoatSource({ net, plekken: json('waterplekken.json'), marinas: json('marinas.json') });
  const loaded = new Set();
  // laad de tegels rond (x, y) tot straal r (rooster van 3 x 3 rond het punt)
  async function laadRond(x, y, r = 700) {
    const keys = new Set();
    for (const dx of [-r, 0, r]) for (const dy of [-r, 0, r]) {
      const [i, j] = G.tileIndexOf(x + dx, y + dy), k = G.tileKey(i, j);
      if (!loaded.has(k) && T.index.tiles[k]) keys.add(k);
    }
    for (const k of keys) loaded.add(k);
    if (keys.size) { await Promise.all([...keys].map((k) => T.store.request(k, { priority: -1 }))); map.tileQueue.run(1e9); }
  }
  return { map, net, idx, laadRond, json, T };
}
