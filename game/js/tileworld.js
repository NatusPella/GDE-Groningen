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
import { TerrainField } from './terrainraster.js';

const KIND_OF = new Map([
  [SECTION.BUILDINGS, 'buildings'], [SECTION.ROADS, 'roads'], [SECTION.WATER, 'water'], [SECTION.GREEN, 'green'],
  [SECTION.TREES, 'trees'], [SECTION.RAILS, 'rails'], [SECTION.CANOPIES, 'canopies'], [SECTION.PASSAGES, 'passageWays'],
  [SECTION.FURNITURE, 'furniture'],
]);
const GRID_OF = { buildings: 'buildingGrid', roads: 'roadGrid', water: 'waterGrid', green: 'greenGrid', trees: 'treeGrid' };

// the objects of one tile section as the game holds them, with their ids
const GID = new WeakMap(); // decoded row -> its id (the game's objects carry no gid field)
function rowsOf(kind, section) {
  return section.rows.map((row) => {
    // a tree: [x, y] plus species, height (dm) and flags when the tile has them (greenery.js)
    if (kind === 'trees') return { gid: row.g, obj: row.s !== undefined ? [row.p[0][0], row.p[0][1], row.s, row.h, row.f || 0] : row.p[0] };
    let gid = GID.get(row);
    if (gid === undefined) { gid = row.gid; delete row.gid; GID.set(row, gid); }
    return { gid, obj: row };
  });
}

// The heights section (pack_tiles.mjs, roadprofile.js heightRows): a road's
// vertical profile `z`, its network `pnet` (not `net`: that is the road
// network realmap.js gives its roads), the structure per segment `st`
// (STRUCT) and the grade order per segment `ly`, joined to the road by gid.
// Render meshes, colliders and the height query all read this one profile.
function attachProfiles(tile, roadOf) {
  for (const s of tile.sections) {
    if (s.type !== SECTION.HEIGHTS) continue;
    for (const row of s.rows) {
      const r = roadOf(row.gid);
      if (!r || r.z) continue;
      r.z = row.z;
      r.pnet = row.pnet;
      r.st = row.st;
      r.ly = row.ly;
    }
  }
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
    for (const tile of tiles) attachProfiles(tile, (gid) => arrays.roads[gid]);
    // the AHN terrain of the tiles that carry one (terrainraster.js); flat elsewhere
    const terrain = new TerrainField();
    for (const tile of tiles) for (const s of tile.sections) if (s.type === SECTION.RASTER) terrain.add(`${tile.i},${tile.j}`, s.raster);
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
    map.terrain = terrain;
    map.tileQueue = new FrameQueue();
    map.store = null;
    map.resident = new Set(tiles.map((t) => `${t.i},${t.j}`));
    map.info = info;
    return map;
  }

  attachStore(store) {
    this.store = store;
    store.on('tile', (tile) => this.tileQueue.add(() => this.addTile(tile), 1, `add:${tile.i},${tile.j}`));
    store.on('drop', (key) => { const e = store.index.tiles[key]; if (e) this.tileQueue.add(() => this.dropTile(`${e.i},${e.j}`), 0, `drop:${e.i},${e.j}`); });
    return this;
  }

  // tiles that came in by streaming (not the pinned city) go into the grids
  addTile(tile) {
    const tk = `${tile.i},${tile.j}`;
    if (this.resident.has(tk)) return false;
    this.resident.add(tk);
    for (const s of tile.sections) {
      if (s.type === SECTION.RASTER && this.terrain) { this.terrain.add(tk, s.raster); continue; }
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
    attachProfiles(tile, (gid) => { const e = this._res.roads.get(gid); return e && e.obj; });
    return true;
  }

  dropTile(tk) {
    if (!this.resident.delete(tk)) return false;
    if (this.terrain) this.terrain.drop(tk);
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
    return this.tileQueue.run(budgetMs);
  }

  // A cutscene registers its shots before it starts: { at: [x, y], look: [x, y] }
  // per shot (camera and look-at). Their tiles load first (the pre-roll) and are
  // held (pinned) until releaseShots, so the cut never shows a hole.
  // Resolves when every tile is in; shotsReady() asks without waiting.
  registerShots(shots, { radius = 350, token = 'shots' } = {}) {
    this._shotKeys = new Set();
    for (const s of shots) for (const [x, y] of [s.at, s.look].filter(Boolean)) for (const k of this.store.keysAround(x, y, radius)) this._shotKeys.add(k);
    for (const k of this._shotKeys) this.store.pin(k);
    return Promise.all([...this._shotKeys].map((k) => this.store.request(k, { priority: -1000, token }))).then(() => { this.tileQueue.run(1e9); return this._shotKeys.size; });
  }
  shotsReady() { return !this._shotKeys || this.store.missing([...this._shotKeys]).length === 0; }
  releaseShots() { if (this._shotKeys) for (const k of this._shotKeys) this.store.unpin(k); this._shotKeys = null; }

  // the tile keys of a camera shot or a destination, for a pre-roll
  prefetchPoints(points, { radius = 400, token = 'shot' } = {}) {
    const keys = new Set();
    for (const [x, y] of points) for (const k of this.store.keysAround(x, y, radius)) keys.add(k);
    return Promise.all([...keys].map((k) => this.store.request(k, { priority: -1000, token }))).then(() => this.tileQueue.run(1e9));
  }
}

// --------------------------------------------------------------- loading

// The tile world at `base` (index.json, packs, global blob), the pinned city
// resident. null when there is no index there (a build without tiles).
export async function loadTileWorld(base = 'world/', { source = new HttpRangeSource(base), onProgress = null, pool = true, extra = [], ...opts } = {}) {
  let index;
  try { index = JSON.parse(new TextDecoder().decode(await source.readAll('index.json'))); } catch (e) { return null; }
  // more tile layers next to the city (index-corridor.json: the proefstrook,
  // scripts/world/build_corridor.mjs); a missing one is skipped
  for (const x of extra) {
    const { name, only = null } = typeof x === 'string' ? { name: x } : x;
    try { mergeIndex(index, JSON.parse(new TextDecoder().decode(await source.readAll(name))), { only }); } catch (e) { /* not in this build */ }
  }
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

// Another layer's tiles and packs into the index; a tile the index already
// has stays (the city's own tiles win). The layer's global part is kept
// under index.layers[name] for whoever reads it.
export function mergeIndex(index, extra, { only = null } = {}) {
  const name = extra.layer || 'extra';
  for (const [pk, p] of Object.entries(extra.packs || {})) if (!index.packs[pk]) index.packs[pk] = p;
  let n = 0;
  for (const [k, t] of Object.entries(extra.tiles || {})) {
    if (index.tiles[k] || (only && !only(t, k))) continue;
    index.tiles[k] = t;
    n++;
  }
  (index.layers || (index.layers = {}))[name] = { global: extra.global || null, tiles: n };
  return n;
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
