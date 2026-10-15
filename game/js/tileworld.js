// TileWorld: the GameMap query API (buildingsNear, roadsNear, waterNear,
// nearestRoadPoint, groundHeightAt, isOnBridge, escapeBuilding, isOpenSpot,
// ...) over streamed .gdt tiles (docs/PROVINCIE-PLAN.md 2.6, 2.4).
//
// F0: the existing systems still read whole arrays (map.roads, map.buildings,
// ...) and one elevation model, so the city tiles (index.pins.city) are
// pinned: they come in at load, in the form the GameMap constructor leaves
// its arrays in (scripts/world/pack_tiles.mjs), which skips that derivation
// (about 12 s in Node, 1-3 s in the game). Every other tile that streams in
// or out goes through the same code path - addTile / dropTile with a
// reference count per object, into the same lookup grids, on the frame queue -
// and is visible through the query methods and queryView. The arrays and the
// elevation model keep to the pinned set until the F1 builder gives them a
// tile home.
import { GameMap, loadMap } from './mapdata.js';
import { polygonBounds } from './util.js';
import { SECTION, decodeBlob } from './gdt.js';
import { TileStore, FrameQueue, HttpRangeSource, inflateRaw, makeWorkerDecoder, decodeCompressed } from './tilestore.js';

const KIND_OF = new Map([
  [SECTION.BUILDINGS, 'buildings'], [SECTION.ROADS, 'roads'], [SECTION.WATER, 'water'], [SECTION.GREEN, 'green'],
  [SECTION.TREES, 'trees'], [SECTION.RAILS, 'rails'], [SECTION.CANOPIES, 'canopies'], [SECTION.PASSAGES, 'passageWays'],
]);
const GRID_OF = { buildings: 'buildingGrid', roads: 'roadGrid', water: 'waterGrid', green: 'greenGrid', trees: 'treeGrid' };

// the objects of one tile section as the game holds them, with their ids
const GID = new WeakMap(); // decoded row -> its id (the game's objects carry no gid field)
function rowsOf(kind, section) {
  return section.rows.map((row) => {
    if (kind === 'trees') return { gid: row.g, obj: row.p[0] };
    let gid = GID.get(row);
    if (gid === undefined) { gid = row.gid; delete row.gid; GID.set(row, gid); }
    return { gid, obj: row };
  });
}

function boundsOfObj(kind, o) {
  if (kind === 'trees') return [o[0], o[1], o[0], o[1]];
  return polygonBounds(o.pts);
}

export class TileWorld extends GameMap {
  // global: decoded global blob; tiles: decoded tiles of the pinned set
  static fromTiles(global, tiles) {
    const info = {};
    for (const s of global.sections) if (s.type === SECTION.META) Object.assign(info, s.json);
    const arrays = {};
    for (const kind of KIND_OF.values()) arrays[kind] = new Array((info.counts && info.counts[kind]) || 0);
    const res = {};
    for (const kind of KIND_OF.values()) res[kind] = new Map();
    for (const tile of tiles) {
      const key = `${tile.i},${tile.j}`;
      for (const s of tile.sections) {
        const kind = KIND_OF.get(s.type);
        if (!kind) continue;
        for (const { gid, obj } of rowsOf(kind, s)) {
          let e = res[kind].get(gid);
          if (!e) { e = { obj, tiles: new Set() }; res[kind].set(gid, e); arrays[kind][gid] = obj; }
          e.tiles.add(key);
        }
      }
    }
    for (const kind of Object.keys(arrays)) for (let i = 0; i < arrays[kind].length; i++) if (!arrays[kind][i]) throw new Error(`tiles lack ${kind} ${i}: the pinned set is not the whole map`);
    const clipped = (info.clippedWays || []).map((c) => ({ ...c, building: c.building >= 0 ? arrays.buildings[c.building] : null }));
    const map = GameMap.fromParts.call(this, {
      meta: info.meta,
      ...arrays,
      stations: info.stations, levelCrossings: info.levelCrossings, railRoutes: info.railRoutes, railLifts: info.railLifts,
      dryCrossings: info.dryCrossings, clippedWays: clipped,
    });
    map._res = res;
    map._gidOf = new WeakMap();
    for (const kind of Object.keys(res)) for (const [gid, e] of res[kind]) if (typeof e.obj === 'object') map._gidOf.set(e.obj, gid);
    map.frame = new FrameQueue();
    map.store = null;
    map.resident = new Set(tiles.map((t) => `${t.i},${t.j}`));
    map.info = info;
    return map;
  }

  attachStore(store) {
    this.store = store;
    store.on('tile', (tile) => this.frame.add(() => this.addTile(tile), 1, `add:${tile.i},${tile.j}`));
    store.on('drop', (key) => { const e = store.index.tiles[key]; if (e) this.frame.add(() => this.dropTile(`${e.i},${e.j}`), 0, `drop:${e.i},${e.j}`); });
    return this;
  }

  // tiles that came in by streaming (not the pinned city) go into the grids
  addTile(tile) {
    const tk = `${tile.i},${tile.j}`;
    if (this.resident.has(tk)) return false;
    this.resident.add(tk);
    for (const s of tile.sections) {
      const kind = KIND_OF.get(s.type);
      if (!kind) continue;
      for (const { gid, obj } of rowsOf(kind, s)) {
        let e = this._res[kind].get(gid);
        if (!e) {
          e = { obj, tiles: new Set() };
          this._res[kind].set(gid, e);
          if (kind !== 'trees') this._gidOf.set(obj, gid);
          if (kind === 'buildings' || kind === 'roads' || kind === 'water' || kind === 'green') obj.bounds = boundsOfObj(kind, obj);
          const grid = GRID_OF[kind];
          if (grid) this[grid].insert(obj, boundsOfObj(kind, obj));
        }
        e.tiles.add(tk);
      }
    }
    return true;
  }

  dropTile(tk) {
    if (!this.resident.delete(tk)) return false;
    for (const kind of Object.keys(this._res)) {
      for (const [gid, e] of this._res[kind]) {
        if (!e.tiles.delete(tk) || e.tiles.size) continue;
        this._res[kind].delete(gid);
        const grid = GRID_OF[kind];
        if (grid) this[grid].remove(e.obj, boundsOfObj(kind, e.obj));
      }
    }
    return true;
  }

  // keep the tiles round (x, y) coming: prefetch by speed and heading, then
  // the grids are updated within the frame budget
  follow(x, y, opts, budgetMs = 2) {
    if (this.store) this.store.prefetch(x, y, opts);
    return this.frame.run(budgetMs);
  }

  // the tile keys of a camera shot or a destination, for a pre-roll
  prefetchPoints(points, { radius = 400, token = 'shot' } = {}) {
    const keys = new Set();
    for (const [x, y] of points) for (const k of this.store.keysAround(x, y, radius)) keys.add(k);
    return Promise.all([...keys].map((k) => this.store.request(k, { priority: -1000, token }))).then(() => this.frame.run(1e9));
  }
}

// --------------------------------------------------------------- loading

// The tile world at `base` (index.json, packs, global blob), the pinned city
// resident. null when there is no index there (a build without tiles).
export async function loadTileWorld(base = 'world/', { source = new HttpRangeSource(base), onProgress = null, pool = true, ...opts } = {}) {
  let index;
  try { index = JSON.parse(new TextDecoder().decode(await source.readAll('index.json'))); } catch (e) { return null; }
  const decode = (pool && makeWorkerDecoder(new URL('./tileworker.js', import.meta.url), 2)) || decodeCompressed;
  const store = new TileStore({ source, index, decode, ...opts });
  const g = index.global;
  const globalBlob = decodeBlob(await inflateRaw(await source.read(index.packs[g.pack].file, g.off, g.len)));
  const keys = (index.pins.city && index.pins.city.tiles) || Object.keys(index.tiles);
  let done = 0;
  for (const k of keys) store.pin(k);
  const tiles = await Promise.all(keys.map((k) => store.request(k, { priority: 0 }).then((t) => { if (onProgress) onProgress(++done / keys.length); return t; })));
  const world = TileWorld.fromTiles(globalBlob, tiles).attachStore(store);
  world.tileIndex = index;
  return { world, store, index, global: globalBlob, source };
}

// The Ommeland data (countryreal.js initReal) out of the global blob.
export function tileOmmeland(global) {
  const om = global.sections.find((s) => s.type === SECTION.META && s.json.ommeland).json.ommeland;
  const bin = global.sections.find((s) => s.type === SECTION.BLOB && s.name === 'ommeland.bin').bytes;
  return { ...om, bin: bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength) };
}

// The map at `url` (citymap.json) for code that only needs the map: the tile
// world when the build has tiles, else the JSON files (dev server).
export async function loadMapAuto(url = 'citymap.json', onProgress = null, { pool = true } = {}) {
  const t = await loadTileWorld(url.replace(/[^/]*$/, '') + 'world/', { onProgress, pool });
  return t ? t.world : loadMap(url, onProgress);
}
