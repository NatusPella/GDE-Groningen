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
import { GameMap, SpatialGrid, loadMap, markDryRoad } from './mapdata.js';
import { polygonBounds, pointInPolygon } from './util.js';
import { promoteMainWaterway } from './waterlevels.js';
import { dropWaterDuplicates } from './waterdupes.js';
import { addMooredBuilding, dropMooredBuilding } from './waterindex.js';
import { SECTION, decodeBlob, tileKey, tileOrigin, TILE_M } from './gdt.js';
import { trimTileGreenery, trimHedgeRow } from './tilegreenery.js';
import { TileStore, FrameQueue, HttpRangeSource, inflateRaw, makeWorkerDecoder, decodeCompressed } from './tilestore.js';
import { TerrainField } from './terrainraster.js';
import { extendElevation, shrinkElevation } from './elevation.js';
import { joinMeta } from './poisections.js';
import { RULES } from './junctions.js';

const KIND_OF = new Map([
  [SECTION.BUILDINGS, 'buildings'], [SECTION.ROADS, 'roads'], [SECTION.WATER, 'water'], [SECTION.GREEN, 'green'],
  [SECTION.TREES, 'trees'], [SECTION.RAILS, 'rails'], [SECTION.CANOPIES, 'canopies'], [SECTION.PASSAGES, 'passageWays'],
  [SECTION.FURNITURE, 'furniture'], [SECTION.PARCELS, 'parcels'],
]);
// Een knooppunt met een seinarm: de tegel-haak voor de verkeerslichten (#314 C2b).
// De JUNCTIONS-rijen zelf staan niet in KIND_OF: het zijn geen rasterobjecten met een gid,
// maar het kruispuntmodel per tegel (junctionRows, junctions.js tileJunctionNodes).
const SIGNAL_RULE = RULES.indexOf('signal');
const hasSignalArm = (rows) => rows.some((row) => (row.a || []).some((a) => a[3] === SIGNAL_RULE));
// the sections whose rows the game keeps without their id (rowsOf)
const ID_ASIDE = [...KIND_OF.keys()];
const GRID_OF = { buildings: 'buildingGrid', roads: 'roadGrid', water: 'waterGrid', green: 'greenGrid', trees: 'treeGrid', rails: 'railGrid', furniture: 'furnitureGrid', parcels: 'parcelGrid' };
// A province tile's water row carries kind, lv, dp and nav (waterlevels.js
// annotateProvinceWater): it joins the water grid like the city's, so boats,
// swimmers and waterAt see it. An older tile has `flat` only: it stays out of
// the grid, drawn flat, and flatWaterNear finds it.
const gridOf = (kind, obj) => (kind === 'water' && obj.flat && obj.nav === undefined ? 'flatWaterGrid' : GRID_OF[kind]);

// The ids of the rows the OSM tile build (build_province.mjs) makes start here (GID0); the city's own are below. An overlay of
// a city tile (the part its data leaves empty) is merged into that tile (scripts/world/merge_overlays.mjs): its rows are the ones
// from here up, and splitOverlay takes them apart again.
export const OVERLAY_GID0 = 20_000_000;
const SPLIT_TYPES = new Set([...KIND_OF.keys(), SECTION.HEIGHTS]);

// A pinned tile as { city, overlay }: city holds the rows below OVERLAY_GID0 (what fromTiles takes into the arrays), overlay a tile
// of the rows from there up (what addTile takes into the grids, as the overlay tiles it replaces were) or null. A tile without
// overlay rows comes back as it is.
export function splitOverlay(tile) {
  const idOf = (s, k) => (s.gids ? s.gids[k] : s.type === SECTION.TREES ? s.rows[k].g : s.rows[k].gid);
  const cityS = [], ovS = [];
  let any = false;
  for (const s of tile.sections) {
    if (!SPLIT_TYPES.has(s.type) || !s.rows) { cityS.push(s); continue; }
    const to = [];
    let ov = 0;
    for (let k = 0; k < s.rows.length; k++) { const hi = idOf(s, k) >= OVERLAY_GID0; to.push(hi); if (hi) ov++; }
    if (!ov) { cityS.push(s); continue; }
    any = true;
    const pick = (want) => {
      const part = { ...s, rows: s.rows.filter((r, k) => to[k] === want) };
      if (s.gids) part.gids = s.gids.filter((g, k) => to[k] === want);
      return part;
    };
    if (ov < s.rows.length) cityS.push(pick(false));
    ovS.push(pick(true));
  }
  if (!any) return { city: tile, overlay: null };
  return { city: { ...tile, sections: cityS }, overlay: { ...tile, sections: ovS } };
}

// the objects of one tile section as the game holds them, with their ids
const GID = new WeakMap(); // decoded row -> its id (the game's objects carry no gid field)
// The rows the game keeps have no id field. A delete of the id (the first key of a decoded row) turns the row into a
// dictionary-mode object: every building, road and water of the city then weighs ~45 MB more and costs a hash lookup per
// property read (checked with %HasFastProperties). So the tiles of the store are decoded with the ids aside (`section.gids`,
// gdt.js readTableG); a row that still has its id (fromTiles with hand-made tiles) is copied without it.
function rowsOf(kind, section) {
  const rows = section.rows, gids = section.gids;
  return rows.map((row, k) => {
    // a tree: [x, y] plus species, height (dm) and flags when the tile has them (greenery.js)
    if (kind === 'trees') return { gid: row.g, obj: row.s !== undefined ? [row.p[0][0], row.p[0][1], row.s, row.h, row.f || 0] : row.p[0] };
    if (gids) return { gid: gids[k], obj: row };
    let gid = GID.get(row);
    if (gid === undefined) {
      if ('gid' in row) {
        const { gid: id, ...rest } = row;
        gid = id;
        row = rows[k] = rest;
      }
      GID.set(row, gid);
    }
    return { gid, obj: row };
  });
}

// The heights section (pack_tiles.mjs, roadprofile.js heightRows): a road's
// vertical profile `z`, its network `pnet` (not `net`: that is the road
// network the tile roads carry), the structure per segment `st`
// (STRUCT) and the grade order per segment `ly`, joined to the road by gid.
// Render meshes, colliders and the height query all read this one profile.
// With `terrain` (?terrain, #269) a row that carries a terrain profile gives that one instead: zt, its structures stt;
// a row with `zf` (flat over the terrain) gives none. Rows from before it, and roads without one, keep their flat z.
function attachProfiles(tile, roadOf, terrain = false) {
  for (const s of tile.sections) {
    if (s.type !== SECTION.HEIGHTS) continue;
    for (const row of s.rows) {
      const r = roadOf(row.gid);
      if (!r || r.z || r.zAttached) continue;
      if (terrain && (row.zt || row.zf)) {
        r.zAttached = true;
        if (row.zt) { r.z = row.zt; r.st = row.stt; if (r.bridge && !r.tunnel) r.zDeck = true; } else { r.z = undefined; r.st = undefined; }
        r.pnet = row.pnet;
        r.ly = row.ly;
        continue;
      }
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

// The key a tile is resident under: its place, or for an overlay (the part of
// a city tile the city's data leaves empty, store key 'o' + the tile's) 'o' + its place.
// rijen per FrameQueue-stuk van een gestroomde tegel (#650); ruim onder het
// frame-budget van 1,5 ms (0,6 ms in een traag beeld)
export const ROW_CHUNK = 300;
const residentKey = (i, j, key) => (key && key[0] === 'o' ? 'o' : '') + `${i},${j}`;

// The tiles an object is resident in. Nearly every object lies in one tile: that key sits in `t`, and only an object that
// several tiles hold (a road across a border) gets a Set in `more`. A Set per object cost ~190 bytes of the ~150.000 rows
// of the city and its overlays (scripts/perf/pinned_meet.mjs).
function holdIn(e, tk) {
  if (e.t === undefined) e.t = tk;
  else if (e.t !== tk) (e.more || (e.more = new Set())).add(tk);
}
// true when tile tk was the last to hold the object (false: it still lies in another, or tk never held it)
function releaseFrom(e, tk) {
  if (e.t === tk) {
    if (e.more && e.more.size) { e.t = e.more.values().next().value; e.more.delete(e.t); if (!e.more.size) e.more = undefined; return false; }
    e.t = undefined;
    return true;
  }
  if (e.more && e.more.delete(tk) && !e.more.size) e.more = undefined;
  return false;
}

export class TileWorld extends GameMap {
  // global: decoded global blob; tiles: decoded tiles of the pinned set
  // sparse: de soorten waarvan de gepinde arraylaag weg mag (index.sparse: rails, furniture).
  // Hun rijen leven dan alleen in _res en de rasters; dropTile haalt ze er per tegel uit en
  // addTile zet ze terug, zonder dat er een array-slot of een tweede kopie bestaat (#314 C1/C2).
  static fromTiles(global, tiles, { terrain = false, sparse = null } = {}) {
    const sparseKinds = new Set(sparse || []);
    const info = {};
    for (const s of global.sections) if (s.type === SECTION.META) Object.assign(info, s.json);
    // the places of the meta (shops, horeca, garages, ...) are rows of their tiles (poisections.js)
    const slim = info.meta;
    info.meta = joinMeta(slim, tiles.map((t) => t.sections.filter((s) => s.type === SECTION.POIS).flatMap((s) => s.rows)));
    const arrays = {};
    for (const kind of KIND_OF.values()) arrays[kind] = new Array((info.counts && info.counts[kind]) || 0);
    const res = {};
    for (const kind of KIND_OF.values()) res[kind] = new Map();
    // De rijen die een gepinde tegel vasthoudt (voor dropTile): per tegel [soort, gid, ...].
    const tileRows = new Map();
    for (const tile of tiles) {
      const key = `${tile.i},${tile.j}`;
      const held = [];
      for (const s of tile.sections) {
        const kind = KIND_OF.get(s.type);
        if (!kind) continue;
        for (const { gid, obj } of rowsOf(kind, s)) {
          let e = res[kind].get(gid);
          if (!e) {
            e = { obj, pinned: true };
            res[kind].set(gid, e);
            // ook een sparse soort vult de bronlijst (voor de rasters en de gid-opzoekingen);
            // de map-arraylaag blijft leeg (fromParts, `layer`).
            arrays[kind][gid] = obj;
          }
          holdIn(e, key);
          held.push(kind, gid);
        }
      }
      tileRows.set(key, held);
    }
    // Een soort met een sparse arraylaag (rails, meubels) hoeft niet dicht te zijn: zijn rijen
    // staan in _res en in de rasters; de andere soorten moeten nog de hele kaart zijn.
    for (const kind of Object.keys(arrays)) {
      if (sparseKinds.has(kind)) continue;
      for (let i = 0; i < arrays[kind].length; i++) if (!arrays[kind][i]) throw new Error(`tiles lack ${kind} ${i}: the pinned set is not the whole map`);
    }
    for (const tile of tiles) attachProfiles(tile, (gid) => arrays.roads[gid], terrain);
    // the AHN terrain of the tiles that carry one (terrainraster.js); flat elsewhere
    const terrainField = new TerrainField();
    for (const tile of tiles) for (const s of tile.sections) if (s.type === SECTION.RASTER) terrainField.add(`${tile.i},${tile.j}`, s.raster);
    const clipped = (info.clippedWays || []).map((c) => ({ ...c, building: c.building >= 0 ? arrays.buildings[c.building] : null }));
    // Een sparse soort krijgt een lege arraylaag (fromParts zet die op []); de rasters
    // worden uit dezelfde bron (de rijen van de gepinde tegels) gebouwd. De sparse rijen
    // zitten als gaten in `arrays` (voor de gid-opzoekingen hierboven), dus het bouwpad
    // krijgt de compacte lijst.
    const parts = { ...arrays };
    for (const kind of sparseKinds) parts[kind] = arrays[kind].filter(Boolean);
    const map = GameMap.fromParts.call(this, {
      meta: info.meta,
      ...parts,
      sparse: sparseKinds,
      stations: info.stations, levelCrossings: info.levelCrossings, railRoutes: info.railRoutes, railLifts: info.railLifts, perrons: info.perrons,
      dryCrossings: info.dryCrossings, clippedWays: clipped,
      terrain: terrainField, terrainOn: terrain,
    });
    map._res = res;
    // #314 C1/C2: de sparse soorten leven per tegel (dropTile/addTile); de gepinde tegelrijen
    // staan in _tileRows zodat een drop niet de hele kaart hoeft te scannen.
    map.sparse = sparseKinds;
    map._tileRows = tileRows;
    // The same lake mapped twice (#231): the streamed path leaves the twin out (addTile, waterdupes.js). The pinned set
    // keeps every row: the arrays are indexed by gid and the queries have to answer what the map answers, so the twin is
    // only marked in `map.duplicateWater` and the terrain and the water meshes do not draw it a second time (scene3d.js).
    // The rule runs on copies: it hands the twin's name to the row that stays, and that name is not ours to move here.
    const twins = new Set();
    for (const tile of tiles) for (const s of tile.sections) {
      if (s.type !== SECTION.WATER || s.rows.length < 2) continue;
      const rows = rowsOf('water', s).map((r) => arrays.water[r.gid]);
      const probe = rows.map((w) => ({ ...w }));
      for (const dup of dropWaterDuplicates(probe)) twins.add(rows[probe.indexOf(dup)]);
    }
    if (twins.size) map.duplicateWater = twins;
    // the global meta without the places (poiLists, poiRest) stays with the map: a reader asks only the tiles of its layer
    // (facilities.js poiLayerPlaces, #314 C1) while meta keeps the whole list for the readers that are still on it
    map.poiMeta = slim;
    // what the streamed path (addTile) puts in its own grids too: the parcels (landUseAt) and the mapped hedges (hedgeNear) of the
    // pinned tiles. The city's tiles carry none today (its overlay tiles stream them), but a city of tiles to the very edge (#314, C2)
    // would lose the countryside's fences, herds and hedges at its rim without them.
    for (const [, e] of res.parcels || []) {
      e.obj.bounds = boundsOfObj('parcels', e.obj);
      (map.parcelGrid || (map.parcelGrid = new SpatialGrid(64))).insert(e.obj, e.obj.bounds);
    }
    for (const [, e] of res.furniture || []) {
      if (e.obj.k !== 'hedge' || !e.obj.pts) continue;
      // een gemapte heg die over een weg loopt houdt op bij de rand (#508): de stad is hier compleet, dus alle wegen zijn er
      trimHedgeRow(map, e.obj);
      if (!e.obj.pts.length) continue;
      if (!e.obj.bounds) e.obj.bounds = polygonBounds(e.obj.pts);
      (map.hedgeGrid || (map.hedgeGrid = new SpatialGrid(64))).insert(e.obj, e.obj.bounds);
    }
    map.terrain = terrainField;
    map.terrainProfiles = terrain;
    map.tileQueue = new FrameQueue();
    map.store = null;
    map.resident = new Set(tiles.map((t) => `${t.i},${t.j}`));
    map.info = info;
    return map;
  }

  attachStore(store) {
    this.store = store;
    this._tileJobs = new Map();
    store.on('tile', (tile, key) => this.queueTile(tile, key));
    store.on('drop', (key) => {
      const e = store.index.tiles[key];
      if (!e) return;
      const tk = residentKey(e.i, e.j, key);
      // een tegel die halverwege zijn rijen wegvalt: het chunkwerk stopt meteen,
      // ook als het eerste stuk nog in de wachtrij staat (#650)
      const job = this._tileJobs && this._tileJobs.get(tk);
      if (job) { job.cancelled = true; this._tileJobs.delete(tk); }
      this.tileQueue.add(() => this.dropTile(tk), 0, `drop:${tk}`);
    });
    return this;
  }

  // #650: een gestroomde tegel is geen onbegrensd FrameQueue-item meer. De rijen
  // gaan in stukken van hooguit ROW_CHUNK door de wachtrij (het budget knipt
  // alleen tussen items, niet binnen een item), met dezelfde volgorde en
  // dezelfde listeners als voorheen. De pinned/overlay-tegels en de tests
  // gebruiken addTile hieronder, dat de generator in één keer leegmaakt.
  queueTile(tile, key) {
    const tk = residentKey(tile.i, tile.j, key);
    const old = this._tileJobs && this._tileJobs.get(tk);
    if (old) old.cancelled = true;
    const job = { cancelled: false };
    (this._tileJobs || (this._tileJobs = new Map())).set(tk, job);
    const steps = this.addTileSteps(tile, key);
    const step = () => {
      if (job.cancelled) { this._tileJobs.delete(tk); return; }
      const r = steps.next();
      if (r.done) { this._tileJobs.delete(tk); return; }
      this.tileQueue.add(step, 1, `add:${tk}`); // volgende stuk, volgende frame
    };
    this.tileQueue.add(step, 1, `add:${tk}`);
    return tk;
  }

  // synchronous variant (pinned/overlay tiles and the tests): the same steps in one go
  addTile(tile, key) {
    const steps = this.addTileSteps(tile, key);
    let r = steps.next();
    while (!r.done) r = steps.next();
    return r.value;
  }

  // tiles that came in by streaming (not the pinned city) go into the grids
  *addTileSteps(tile, key) {
    const tk = residentKey(tile.i, tile.j, key);
    if (this.resident.has(tk)) return false;
    this.resident.add(tk);
    const newRoads = [], newWater = [];
    let rows = 0; // rijen sinds de vorige yield (#650)
    // de bomen en heggen van deze tegel, voor de groenopruiming onderaan (#508), en of de tegel wegen meebrengt:
    // ook een rij die een buurtegel al invoegde, reikt met zijn zoom deze tegel in en moet de ring laten kijken
    const ownTrees = [], ownHedges = [];
    let hasRoads = false;
    // the rows this tile holds, [kind, gid, kind, gid, ...]: dropTile visits these instead of every row of the world (#379, #247)
    const held = [];
    (this._tileRows || (this._tileRows = new Map())).set(tk, held);
    for (const s of tile.sections) {
      if (s.type === SECTION.RASTER && this.terrain) { this.terrain.add(tk, s.raster); continue; }
      // de kruispunten van deze tegel (de JUNCTIONS-sectie): junctions.js leest ze bij het model (#469)
      if (s.type === SECTION.JUNCTIONS) {
        const jrows = s.rows || [];
        (this.junctionRows || (this.junctionRows = new Map())).set(tk, jrows);
        this.junctionVer = (this.junctionVer || 0) + 1;
        // een tegel met een beveiligde kruising vraagt de verkeerslichten om een herbouw (#314 C2b)
        if (hasSignalArm(jrows)) {
          this.signalVer = (this.signalVer || 0) + 1;
          (this._signalTiles || (this._signalTiles = new Set())).add(tk);
        }
        continue;
      }
      const kind = KIND_OF.get(s.type);
      if (!kind) continue;
      // the same lake mapped twice is drawn once (waterdupes.js, #231)
      const twins = kind === 'water' ? dropWaterDuplicates(s.rows) : null;
      for (const { gid, obj } of rowsOf(kind, s)) {
        if (twins && twins.size && twins.has(obj)) continue;
        if (kind === 'roads') hasRoads = true;
        let e = this._res[kind].get(gid);
        if (!e) {
          e = { obj };
          this._res[kind].set(gid, e);
          if (kind === 'buildings' || kind === 'roads' || kind === 'water' || kind === 'green' || kind === 'rails' || kind === 'parcels') obj.bounds = boundsOfObj(kind, obj);
          if (kind === 'water') { obj.tile = true; promoteMainWaterway(obj); this._waterVer = (this._waterVer || 0) + 1; newWater.push(obj); }
          if (kind === 'roads') { obj._ord = 1e7 + (this._ordSeq = (this._ordSeq || 0) + 1); newRoads.push(obj); }
          if (kind === 'trees') ownTrees.push(obj);
          if (kind === 'furniture' && obj.k === 'hedge' && obj.pts) ownHedges.push(obj);
          if (kind === 'buildings' && obj.type === 'houseboat') addMooredBuilding(this, obj); // (boats keep off it, #343)
          const grid = gridOf(kind, obj);
          if (grid) (this[grid] || (this[grid] = new SpatialGrid(64))).insert(obj, boundsOfObj(kind, obj));
          // the mapped hedges (OSM barrier=hedge): the countryside draws none of its own beside them (hedgeNear)
          if (kind === 'furniture' && obj.k === 'hedge' && obj.pts) {
            obj.bounds = polygonBounds(obj.pts);
            (this.hedgeGrid || (this.hedgeGrid = new SpatialGrid(64))).insert(obj, obj.bounds);
          }
        }
        holdIn(e, tk);
        held.push(kind, gid);
        if (++rows >= ROW_CHUNK) { rows = 0; yield; }
      }
    }
    yield; // de profielen/hoogtes en het droogmaken zijn eigen stukken (#650)
    // the profiles of streamed bridges and viaducts (build_province.mjs, #235): the roads of the tile join the elevation
    // model with them (surfaceAt, embankments, walls, a deck a boat sails under: #300). ?vlakbruggen leaves them flat.
    if (this.streamProfiles !== false) {
      attachProfiles(tile, (gid) => { const e = this._res.roads.get(gid); return e && e.obj; }, this.terrainProfiles);
      if (newRoads.length && tile.sections.some((s) => s.type === SECTION.HEIGHTS)) this.elevAdded = (this.elevAdded || 0) + extendElevation(this, newRoads);
    }
    // a road over water without a bridge tag is a culvert or a dry deck (mapdata.js markDryRoad)
    for (const r of newRoads) markDryRoad(this, r);
    for (const w of newWater) {
      if (++rows >= ROW_CHUNK) { rows = 0; yield; }
      if (!w.bounds) continue;
      const cx = (w.bounds[0] + w.bounds[2]) / 2, cy = (w.bounds[1] + w.bounds[3]) / 2;
      for (const r of this.roadsNear(cx, cy, Math.hypot(w.bounds[2] - w.bounds[0], w.bounds[3] - w.bounds[1]) / 2)) markDryRoad(this, r);
    }
    yield; // de listeners (far-LOD, canopies) hoeven niet in hetzelfde stuk (#650)
    for (const fn of this._tileListeners || []) fn('add', tile, tk);
    // het groen van deze tegel naast de weg (#508): de vulbomen van bos en kerkhof kwamen per tegel op de weg te
    // staan waar de weg in de buurtegel ligt, en de gemapte heggen liepen over de rijbaan. Met deze tegel erbij zijn
    // de eigen bomen en heggen te beoordelen, en met zijn wegen ook die van de buren binnen 12 m.
    const [ox, oy] = tileOrigin(tile.i, tile.j);
    const trimmed = trimTileGreenery(this, [ox, oy, ox + TILE_M, oy + TILE_M], { trees: ownTrees, hedges: ownHedges, roads: hasRoads });
    const gs = this.greeneryStats || (this.greeneryStats = { removed: 0, moved: 0, hedges: 0 });
    gs.removed += trimmed.removed; gs.moved += trimmed.moved; gs.hedges += trimmed.hedges;
    // #314 C2 (stap 4): één geo-versie voor de caches die uit de rasters/arrays bouwen
    // (farlod, scene3d, grass, routing, ...): per add/drop opgehoogd, zodat een cache zich
    // kan verversen. De pin houdt de stad nog vast; dit is de haak voor de volgende ronde.
    this.geoVer = (this.geoVer || 0) + 1;
    return true;
  }

  flatWaterNear(x, y, r) {
    return this.flatWaterGrid ? this.flatWaterGrid.query(x - r, y - r, x + r, y + r) : [];
  }

  // the maps draw the flat water too
  queryView(minx, miny, maxx, maxy, withTrees = true) {
    const v = super.queryView(minx, miny, maxx, maxy, withTrees);
    if (this.flatWaterGrid) v.water = v.water.concat(this.flatWaterGrid.query(minx, miny, maxx, maxy));
    return v;
  }

  // fn(kind, tile, key): 'add' (the decoded tile, its rows as the grids hold
  // them) once a streamed tile is in the grids, 'drop' (tile null) once it left
  onTiles(fn) { (this._tileListeners || (this._tileListeners = [])).push(fn); }

  // The track of the streamed tiles (the city's own is map.rails): realBlockedAt keeps the countryside's props off it (#124)
  railNear(x, y, r) {
    return this.railGrid ? this.railGrid.query(x - r, y - r, x + r, y + r) : [];
  }

  // The mapped hedges of the streamed tiles within r of (x, y) (their bounds): the countryside keeps its own hedges off them (#124)
  hedgeNear(x, y, r) {
    return this.hedgeGrid ? this.hedgeGrid.query(x - r, y - r, x + r, y + r) : [];
  }

  // The OSM land use of the streamed tiles at (x, y): 'akker' | 'weide' | 'boomgaard' or null (the countryside's fences and herds, #124)
  landUseAt(x, y) {
    if (!this.parcelGrid) return null;
    let best = null, ba = Infinity;
    for (const p of this.parcelGrid.query(x - 0.5, y - 0.5, x + 0.5, y + 0.5)) {
      const b = p.bounds;
      if (!b || x < b[0] || x > b[2] || y < b[1] || y > b[3] || !pointInPolygon(x, y, p.pts)) continue;
      const a = (b[2] - b[0]) * (b[3] - b[1]);
      if (a < ba) { ba = a; best = p.use; } // the smallest polygon wins (a meadow in a farmland)
    }
    return best;
  }

  // Water rows that come with no tile: the fixes of the waterway network (vaarnet.js
  // patchRows): the holes the map leaves under bridges and in locks, a canal it lacks.
  // They stay for good (no tile drops them); the ground's water mask follows.
  addWaterPatches(rows) {
    for (const w of rows) {
      w.tile = true; // een patch is geen vast water van de kaart (waterindex.js staticWater)
      w.bounds = polygonBounds(w.pts);
      this.waterGrid.insert(w, w.bounds);
    }
    // a patch lies over roads the map draws no bridge for (a link over the Eeldersingel, the Damsterdiep):
    // they pass it on a deck like any road over water, or cars sink there (#222, #235)
    for (const w of rows) {
      const cx = (w.bounds[0] + w.bounds[2]) / 2, cy = (w.bounds[1] + w.bounds[3]) / 2;
      for (const r of this.roadsNear(cx, cy, Math.hypot(w.bounds[2] - w.bounds[0], w.bounds[3] - w.bounds[1]) / 2 + 2)) markDryRoad(this, r);
    }
    this._waterVer = (this._waterVer || 0) + 1;
    return rows.length;
  }

  dropTile(tk) {
    const job = this._tileJobs && this._tileJobs.get(tk);
    if (job) { job.cancelled = true; this._tileJobs.delete(tk); }
    if (!this.resident.delete(tk)) return false;
    for (const fn of this._tileListeners || []) fn('drop', null, tk);
    if (this.terrain) this.terrain.drop(tk);
    // de kruispunten van deze tegel gaan mee uit het model (#469)
    if (this.junctionRows && this.junctionRows.delete(tk)) {
      this.junctionVer = (this.junctionVer || 0) + 1;
      // alleen als deze tegel een beveiligde kruising had, moeten de lichten opnieuw (#314 C2b)
      if (this._signalTiles && this._signalTiles.delete(tk)) this.signalVer = (this.signalVer || 0) + 1;
    }
    const goneRoads = [];
    const release = (kind, gid, e) => {
      // Een rij van de gepinde stad blijft in de arrays en rasters zolang zijn soort nog
      // dicht is (de pin). Alleen een sparse soort (rails, meubels) laat hem per tegel gaan.
      if (e.pinned && !(this.sparse && this.sparse.has(kind))) return;
      if (!releaseFrom(e, tk)) return;
      this._res[kind].delete(gid);
      if (kind === 'roads' && e.obj.z) goneRoads.push(e.obj);
      if (kind === 'water') this._waterVer = (this._waterVer || 0) + 1;
      if (kind === 'buildings' && e.obj.type === 'houseboat') dropMooredBuilding(this, e.obj);
      const grid = gridOf(kind, e.obj);
      if (grid && this[grid]) this[grid].remove(e.obj, boundsOfObj(kind, e.obj));
      if (kind === 'furniture' && e.obj.k === 'hedge' && e.obj.pts && this.hedgeGrid) this.hedgeGrid.remove(e.obj, e.obj.bounds || polygonBounds(e.obj.pts));
    };
    const held = this._tileRows && this._tileRows.get(tk);
    if (held && !this.scanDrops) {
      this._tileRows.delete(tk);
      for (let i = 0; i < held.length; i += 2) {
        const e = this._res[held[i]].get(held[i + 1]);
        if (e) release(held[i], held[i + 1], e);
      }
    } else {
      // a tile that came in with the pinned set (no list) and the A/B of the old way (scanDrops): every row of the world
      if (this._tileRows) this._tileRows.delete(tk);
      for (const kind of Object.keys(this._res)) for (const [gid, e] of this._res[kind]) release(kind, gid, e);
    }
    if (goneRoads.length) shrinkElevation(this, goneRoads);
    this.geoVer = (this.geoVer || 0) + 1; // caches verversen (#314 C2, stap 4)
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
    this.releaseShots(); // (pins are counted: a second registration must not leak the first)
    this._shotKeys = new Set();
    this._shotToken = token + ':' + (this._shotN = (this._shotN || 0) + 1); // eigen token, zodat deze ronde zijn loads kan intrekken (#588)
    for (const s of shots) for (const [x, y] of [s.at, s.look].filter(Boolean)) for (const k of this.store.keysAround(x, y, radius)) this._shotKeys.add(k);
    for (const k of this._shotKeys) this.store.pin(k);
    return Promise.all([...this._shotKeys].map((k) => this.store.request(k, { priority: -1000, token: this._shotToken }))).then(() => { this.tileQueue.run(1e9); return this._shotKeys.size; });
  }
  shotsReady() { return !this._shotKeys || this.store.missing([...this._shotKeys]).length === 0; }
  releaseShots() {
    if (this._shotKeys) for (const k of this._shotKeys) this.store.unpin(k);
    // De shots zijn klaar of de scène stopt: hun lopende reads hoeven niet meer (#588).
    if (this._shotToken && this.store.cancel) this.store.cancel(this._shotToken);
    this._shotKeys = null; this._shotToken = null;
  }

  // the tile keys of a camera shot or a destination, for a pre-roll
  prefetchPoints(points, { radius = 400, token = 'shot' } = {}) {
    const keys = new Set();
    for (const [x, y] of points) for (const k of this.store.keysAround(x, y, radius)) keys.add(k);
    // Een prewarm is best effort: stopt de scène/kaart, dan is een afgebroken tegel geen fout.\n    const veilig = (k) => this.store.request(k, { priority: -1000, token }).catch((err) => {\n      if (err && (err.cancelled || err.name === 'AbortError')) return null;\n      throw err;\n    });\n    return Promise.all([...keys].map(veilig)).then(() => this.tileQueue.run(1e9));
  }
}

// --------------------------------------------------------------- loading

// The tile world at `base` (index.json, packs, global blob), the pinned city
// resident. null when there is no index there (a build without tiles).
export async function loadTileWorld(base = 'world/', { source = new HttpRangeSource(base), onProgress = null, pool = true, extra = [], terrain = false, ...opts } = {}) {
  let index;
  try { index = JSON.parse(new TextDecoder().decode(await source.readAll('index.json'))); } catch (e) { return null; }
  // more tile layers next to the city (index-corridor.json: the proefstrook,
  // scripts/world/build_corridor.mjs); a missing one is skipped
  for (const x of extra) {
    const { name, only = null } = typeof x === 'string' ? { name: x } : x;
    try { mergeIndex(index, JSON.parse(new TextDecoder().decode(await source.readAll(name))), { only }); } catch (e) { /* not in this build */ }
  }
  const decode = (pool && makeWorkerDecoder(new URL('./tileworker.js', import.meta.url), 2, ID_ASIDE)) || ((bytes) => decodeCompressed(bytes, ID_ASIDE));
  const store = new TileStore({ source, index, decode, ...opts });
  const g = index.global;
  const globalBlob = decodeBlob(await inflateRaw(await source.read(index.packs[g.pack].file, g.off, g.len)));
  // De stadstegels: uit de nieuwe cityTiles, de oude pins.city of (zonder beide) de
  // tegels zonder overlay/stub-velden (die horen bij een extra laag).
  const keys = index.cityTiles || (index.pins.city && index.pins.city.tiles)
    || Object.keys(index.tiles).filter((k) => { const t = index.tiles[k]; return t && !t.ov && !t.in; });
  // (#314 C1) Een volledig sparse wereld houdt de stad niet vast: de tegels komen binnen
  // voor de eerste opbouw en mogen daarna door de store worden gestroomd. Een oude,
  // dichte wereld (zonder index.sparse) blijft gepind zoals voorheen.
  const ALL_SPARSE = ['roads', 'buildings', 'water', 'trees', 'rails', 'furniture', 'green'];
  const unpinCity = Array.isArray(index.sparse) && ALL_SPARSE.every((k) => index.sparse.includes(k));
  let done = 0;
  // tijdens de eerste opbouw moet de hele stad binnenblijven (fromTiles eist de hele set);
  // daarna laat unpinCity haar los zodat de store kan streamen.
  for (const k of keys) store.pin(k);
  const tiles = await Promise.all(keys.map((k) => store.request(k, { priority: 0 }).then((t) => { if (onProgress) onProgress(++done / keys.length); return t; })));
  const split = tiles.map(splitOverlay);
  const world = TileWorld.fromTiles(globalBlob, split.map((x) => x.city), { terrain, sparse: index.sparse }).attachStore(store);
  world.tileIndex = index;
  // the overlays of the city's tiles (the rows of build_province.mjs the city's data leaves out, merged into their tile by
  // scripts/world/merge_overlays.mjs): into the grids like a streamed tile, held for good with the city
  // (in the order of the stumps in the province index, as the overlay tiles came before: extendElevation builds a viaduct over what is
  // there, so the order shows in a few walls; a build without the province layer adds them in the order of the pins)
  const byKey = new Map(split.map((x) => [tileKey(x.city.i, x.city.j), x]));
  const order = Object.keys(index.tiles).filter((k) => index.tiles[k].ov && index.tiles[k].in).map((k) => index.tiles[k].in);
  for (const k of [...order, ...byKey.keys()]) {
    const x = byKey.get(k);
    if (!x || !x.overlay) continue;
    byKey.delete(k);
    world.addTile(x.overlay, 'o' + k);
  }
  // a world from before the merge still has its overlays as tiles of their own: pinned as they were
  const loose = Object.keys(index.tiles).filter((k) => index.tiles[k].ov && !index.tiles[k].in);
  for (const k of loose) store.pin(k);
  await Promise.all(loose.map((k) => store.request(k, { priority: 0 })));
  world.tileQueue.run(1e9);
  // De eerste opbouw is klaar: laat de stad los zodat de store haar kan streamen.
  if (unpinCity) for (const k of keys) store.unpin(k);
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


// The map at `url` (stad.json) for code that only needs the map: the tile
// world when the build has tiles, else stad.json alone (dev server).
export async function loadMapAuto(url = 'stad.json', onProgress = null, { pool = true } = {}) {
  // the overlays of the city's tiles come with the tiles (the worker's roads and shores see the same neighbours as the game's map)
  const t = await loadTileWorld(url.replace(/[^/]*$/, '') + 'world/', { onProgress, pool });
  return t ? t.world : loadMap(url, onProgress);
}

