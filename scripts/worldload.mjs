// The built game/world as the game loads it, in Node: the city's tiles pinned,
// the province layer merged, the other tiles streaming in on
// request (needs game/world: desktop stage, or pack_tiles + build_corridor +
// build_province). For the scripts that place things on the tiles.
//   import './node3d.mjs';  (first)   const { loadGameWorld, loadArea } = await import('./worldload.mjs');
//   const T = await loadGameWorld();   // { world, store, index, global, land } or null without game/world
// The province is set up as main.js does: its places, its polder blocks and prop rule
// (provinceworld.js initProvince); T.land is the layer's land file (rails, turbines).
//   await loadArea(T, [x0, y0, x1, y1]);   // every tile of the rectangle resident (pinned)
import fs from 'node:fs';

export async function loadGameWorld() {
  globalThis.requestAnimationFrame = (f) => setImmediate(f);
  const root = new URL('../game/world/', import.meta.url);
  if (!fs.existsSync(new URL('index-provincie.json', root))) return null;
  const S = await import('../game/js/tilestore.js');
  const TW = await import('../game/js/tileworld.js');
  const files = new Proxy({}, { get: (o, f) => (typeof f === 'string' ? (o[f] || (o[f] = new Uint8Array(fs.readFileSync(new URL(f, root))))) : undefined) });
  const T = await TW.loadTileWorld('world/', { source: new S.MemorySource(files), pool: false, extra: [{ name: 'index-provincie.json' }, { name: 'index-corridor.json' }] });
  const layers = (T && T.index.layers) || {};
  const lay = (layers.provincie && layers.provincie.global ? layers.provincie : null) || layers.corridor;
  if (lay && lay.global) (await import('../game/js/worldplaces.js')).setWorldPlaces(lay.global.places);
  if (T) (await import('../game/js/provinceworld.js')).initProvince(T);
  // what lies in a built tile is the built world (main.js setExtraBuiltWorld)
  if (T && lay) {
    const G = await import('../game/js/gdt.js');
    (await import('../game/js/facilities.js')).setExtraBuiltWorld((x, y) => { const [i, j] = G.tileIndexOf(x, y); const t = T.index.tiles[G.tileKey(i, j)]; return !!t && !!(t.flags & 4); });
  }
  if (T && lay && lay.global && lay.global.landFile) T.land = JSON.parse(fs.readFileSync(new URL(lay.global.landFile, root), 'utf8'));
  return T;
}

// Every tile that touches the rectangle in, held there: what the game's
// placement windows (tileplace.js withTiles) give a spot, for a whole area.
export async function loadArea(T, [x0, y0, x1, y1]) {
  const G = await import('../game/js/gdt.js');
  const keys = [];
  const [i0, j0] = G.tileIndexOf(x0, y0), [i1, j1] = G.tileIndexOf(x1, y1);
  for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) { const k = G.tileKey(i, j); if (T.store.has(k)) keys.push(k); }
  for (const k of keys) T.store.pin(k);
  await Promise.all(keys.map((k) => T.store.request(k, { priority: -1 })));
  T.world.tileQueue.run(1e9);
  return keys.length;
}
