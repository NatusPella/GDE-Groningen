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
import { registerMemSource } from './memwatch.js';
import { GameMap, SpatialGrid, loadMap, markDryRoad, dropNeedlessDeck } from './mapdata.js';
import { polygonBounds, pointInPolygon } from './util.js';
import { promoteMainWaterway } from './waterlevels.js';
import { dropWaterDuplicates } from './waterdupes.js';
import { addMooredBuilding, dropMooredBuilding } from './waterindex.js';
import { SECTION, decodeBlob, tileKey, tileOrigin, TILE_M } from './gdt.js';
export const GEO_LOG_MAX = 256; // zoveel tegelwissels onthoudt geoLog; een cache die verder achterloopt, begint opnieuw
import { trimTileGreenery, trimHedgeRow } from './tilegreenery.js';
import { isProceduralEdgeRow } from './edgeclasses.js';
import * as propfilter from './propfilter.js';
import { TileStore, FrameQueue, HttpRangeSource, inflateRaw, makeWorkerDecoder, decodeCompressed } from './tilestore.js';
import { BACKGROUND_PRIORITY, BG_FOLLOW_MS, BG_GEO_M, BG_JUNCTION_FLUSH_MS, BG_PROMOTE_M, addPriority, backgroundHeld, whenReady, JUMP_BUDGET_MS, JUMP_RING_M } from './tilestream.js';
import { thinPath } from './lodstable.js';
import { TerrainField } from './terrainraster.js';
import { extendElevation, shrinkElevation } from './elevation.js';
import { joinMeta } from './poisections.js';
import { RULES } from './junctions.js';
import { TERRAIN_FILE, decodeTerrain, terrainHoleRows, terrainRowsSignature, sameBounds } from './terraincache.js';

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
// Tile decoder workers: as many as the store's concurrency (4) when the machine has the cores, leaving two for the main
// thread and the renderer; never fewer than 2 (what it was).
export function tileDecoderPoolSize(hardwareConcurrency) {
  const hw = Number(hardwareConcurrency);
  if (!Number.isFinite(hw) || hw <= 0) return 2;
  return Math.max(2, Math.min(4, Math.floor(hw) - 2));
}
// NAV (the nav graph chains of the tiles) is only read by scripts (navgraph_test); the game never looks at it, so streamed tiles do not decode it
export const GAME_SKIP_SECTIONS = [SECTION.NAV];
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
// ... en hoogstens zoveel ms per stuk: 300 rijen met grote vlakken (gebouwen, wegen met veel punten) duurden tot 35 ms (scripts/perf/streamsteps.mjs),
// een hapering die geen frame-budget kon knippen. De volgorde van de rijen blijft gelijk, alleen de yield komt eerder (de wereld is identiek).
export const ROW_CHUNK_MS = 1.2;
const TREE_TRIM_SLICE = 150; // bomen per stap bij het bijsnoeien van een nieuwe tegel (perf-r3)
export const BUILDING_DELTA_MAX = 20000;
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
    map.bgQueue = new FrameQueue(); // the rows of the tiles a background placement window asked for (#1052)
    map.store = null;
    map.resident = new Set(tiles.map((t) => `${t.i},${t.j}`));
    map.info = info;
    return map;
  }

  // De gebouwen van tegelwissels voor de routing-cache (routing.js syncThroughCache). Begrensd: leest niemand hem (de routing draait
  // niet), dan groeide hij met elke tegel; boven de grens wordt hij leeggemaakt en gemeld als overloop (alles opnieuw toetsen).
  _noteBuildingDelta(obj) {
    const d = this._buildingDelta;
    if (!d) return;
    if (d.length >= BUILDING_DELTA_MAX) { d.length = 0; this._buildingDeltaOverflow = true; } else d.push(obj);
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
      // a reload that arrives before this queued drop runs has a job of its own: the drop removes the old rows and leaves that job alone
      this._queueDrop(tk);
      // #762: de overlay-resident van deze stadstegel ('o' + plaats) is bij het laden
      // met de stad meegekomen en heeft geen eigen store-entry; hij valt dus nooit
      // via de store. Zonder deze drop blijven zijn gebouwen, wegen en bomen de hele
      // sessie in _res en in de rasters staan terwijl de stad al gestroomd is.
      const ov = `o${e.i},${e.j}`;
      if (this.resident.has(ov)) this.tileQueue.add(() => this.dropTile(ov), 0, `drop:${ov}`);
    });
    return this;
  }

  _queueDrop(tk) {
    const dropping = this._dropping || (this._dropping = new Set());
    dropping.add(tk);
    const steps = this.dropTileSteps(tk, true);
    const step = () => {
      const r = steps.next();
      if (r.done) { dropping.delete(tk); return; }
      this.tileQueue.add(step, 0, `drop:${tk}`); // volgende stuk, volgende frame
    };
    this.tileQueue.add(step, 0, `drop:${tk}`);
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
    // #1052: dichtbij eerst. De rijen van een tegel gaan met de urgentie waarmee hij is aangevraagd
    // (een afstand, of de achtergrondwaarde van een plaatsingsvenster) door de wachtrij, niet allemaal als eerste in de rij.
    const sp = this.store && this.store.priorityOf ? this.store.priorityOf(key) : 0;
    const prio = addPriority(sp);
    // a tile only a background window asked for waits in a queue of its own: the frame budget of the
    // stream (follow) and a held window (a film, the benchmark) do not have to work it
    const bg = sp >= BACKGROUND_PRIORITY && !!this.bgQueue;
    const job = { cancelled: false, queue: bg ? this.bgQueue : this.tileQueue, prio };
    (this._tileJobs || (this._tileJobs = new Map())).set(tk, job);
    const bgTiles = this._bgTiles || (this._bgTiles = new Set());
    if (bg) bgTiles.add(tk); else bgTiles.delete(tk);
    const steps = this.addTileSteps(tile, key);
    const step = () => {
      // (a cancelled job is already out of the books; the entry under this key may be the reload's job)
      if (job.cancelled) { if (this._tileJobs.get(tk) === job) this._tileJobs.delete(tk); return; }
      // perf-r3: de drop van dezelfde tegel loopt nog in stukken: eerst die af
      if (this._dropping && this._dropping.has(tk)) { job.queue.add(step, job.prio, `add:${tk}`); return; }
      const r = steps.next();
      if (r.done) { if (this._tileJobs.get(tk) === job) this._tileJobs.delete(tk); return; }
      job.queue.add(step, job.prio, `add:${tk}`); // volgende stuk, volgende frame
    };
    job.queue.add(step, prio, `add:${tk}`);
    return tk;
  }

  // Een achtergrondtegel (alleen een plaatsingsvenster vroeg hem) waar de speler of de camera binnen BG_PROMOTE_M heen komt, hoort bij de
  // gewone stroom: zijn rijen gaan naar de wachtrij van follow() met de afstand als prioriteit, anders kroop hij als druppel binnen terwijl
  // de speler er al staat. Zo vaak als follow() het vraagt; goedkoop als er geen achtergrondtegels zijn.
  promoteBgTiles(x, y) {
    const bgq = this.bgQueue;
    if (!bgq || !bgq.items.length || !this._bgTiles || !this._bgTiles.size) return 0;
    let n = 0;
    for (const [tk, job] of this._tileJobs || []) {
      if (job.queue !== bgq || job.cancelled) continue;
      const [i, j] = tk.split(',').map(Number);
      if (!Number.isFinite(i) || !Number.isFinite(j)) continue;
      const [ox, oy] = tileOrigin(i, j);
      const d = Math.hypot(ox + TILE_M / 2 - x, oy + TILE_M / 2 - y);
      if (d > BG_PROMOTE_M + TILE_M / 2) continue;
      job.queue = this.tileQueue; job.prio = addPriority(d);
      const label = `add:${tk}`;
      const keep = [];
      for (const it of bgq.items) { if (it.label === label) { it.priority = job.prio; this.tileQueue.items.push(it); } else keep.push(it); }
      bgq.items = keep;
      this._bgTiles.delete(tk);
      n++;
    }
    return n;
  }

  // Is dit een achtergrondtegel (alleen een plaatsingsvenster vroeg hem) ver van de speler en de camera (meer dan BG_GEO_M)? Elke tegel
  // verhoogt geoVer en daarmee verversen farlod, het straatmeubilair, de bomenlijst en de wegsync hun caches; voor een tegel waar geen van
  // die caches kijkt kostte dat alleen werk (het straatmeubilair per tegel herbouwde elke twee seconden: nearestOnRoadList 1 s per 17 s rit).
  // Zonder focus (de titel, een test) is niets ver.
  // geoVer omhoog en onthoud welke tegel het was (geoLog: [versie, tegelsleutel, ...], hoogstens GEO_LOG_MAX paren), zodat een cache alleen
  // de stukken rond die tegel opnieuw hoeft te bouwen in plaats van alles (streetfurniture3d.js, 24-11)
  _bumpGeo(tk) {
    this.geoVer = (this.geoVer || 0) + 1;
    const log = this.geoLog || (this.geoLog = []);
    log.push(this.geoVer, tk);
    if (log.length > GEO_LOG_MAX * 2) log.splice(0, log.length - GEO_LOG_MAX * 2);
  }

  _farBgTile(tk) {
    if (!this._bgTiles || !this._bgTiles.has(tk) || !this.focusAt) return false;
    const [i, j] = tk.split(',').map(Number);
    if (!Number.isFinite(i) || !Number.isFinite(j)) return false;
    const [ox, oy] = tileOrigin(i, j);
    return Math.hypot(ox + TILE_M / 2 - this.focusAt.x, oy + TILE_M / 2 - this.focusAt.y) > BG_GEO_M;
  }

  // De kruispuntversie (junctionVer, signalVer) telt op bij elke tegel met kruispunten: het kruispuntmodel, de signaalgrid en de lichtenlijst
  // lopen dan opnieuw over de rijen van ALLE geladen tegels. Een achtergrondtegel (plaatsingsvenster) bundelt zijn bump: hoogstens eens per
  // BG_JUNCTION_FLUSH_MS (follow), anders herbouwde elke tegel van de druppel het hele model (junctionModel + tileJunctionNodes ca. 800 ms per 30 s).
  _bumpJunctions(bg, signals) {
    if (!bg) {
      this.junctionVer = (this.junctionVer || 0) + 1;
      if (signals) this.signalVer = (this.signalVer || 0) + 1;
      return;
    }
    this._junctionPending = true;
    if (signals) this._signalPending = true;
  }

  flushJunctions(now = performance.now(), force = false) {
    if (!this._junctionPending && !this._signalPending) return false;
    if (!force && now - (this._junctionFlushAt || -Infinity) < BG_JUNCTION_FLUSH_MS) return false;
    this._junctionFlushAt = now;
    if (this._junctionPending) { this.junctionVer = (this.junctionVer || 0) + 1; this._junctionPending = false; }
    if (this._signalPending) { this.signalVer = (this.signalVer || 0) + 1; this._signalPending = false; }
    return true;
  }

  // Is the tile (i, j) in the grids with ALL its rows (not only handed to the world: resident is set when the first rows go in)?
  // The M13 plan decides from this (containerplan.js m13DecisionReady): a guest that loads later must decide as the host did.
  tileRowsDone(i, j) {
    const tk = `${i},${j}`;
    return this.resident.has(tk) && !(this._tileJobs && this._tileJobs.has(tk));
  }

  // Is any of these store keys still being worked into the grids (its rows are queued)? (#1052)
  tilesPending(keys) {
    if (!this._tileJobs || !this.store) return false;
    for (const k of keys) {
      const m = this.store.index.tiles[k];
      if (m && this._tileJobs.has(residentKey(m.i, m.j, k))) return true;
    }
    return false;
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
    let chunkT = performance.now();
    const chunkDue = () => { if (++rows >= ROW_CHUNK || ((rows & 7) === 0 && performance.now() - chunkT >= ROW_CHUNK_MS)) { rows = 0; return true; } return false; };
    // een stap die per item duur is (een weg die markDryRoad toetst, een gebouw dat misplacedBuilding toetst): de klok elk item, niet elke achtste (8 x 5 ms was een stuk van 40 ms)
    const slowDue = () => { if (performance.now() - chunkT >= ROW_CHUNK_MS) { rows = 0; return true; } return false; };
    // (#4) alleen een tegel die echt groen toevoegt hoeft de groschunks te
    // verversen: de graschunks hangen aan greenVer, niet aan elke geoVer-bump
    let greenAdded = false;
    // de bomen en heggen van deze tegel, voor de groenopruiming onderaan (#508), en of de tegel wegen meebrengt:
    // ook een rij die een buurtegel al invoegde, reikt met zijn zoom deze tegel in en moet de ring laten kijken
    const ownTrees = [], ownHedges = [], ownBuildings = [];
    let hasRoads = false;
    // the rows this tile holds, [kind, gid, kind, gid, ...]: dropTile visits these instead of every row of the world (#379, #247)
    const held = [];
    (this._tileRows || (this._tileRows = new Map())).set(tk, held);
    for (const s of tile.sections) {
      if (s.type === SECTION.RASTER && this.terrain) { this.terrain.add(tk, s.raster); continue; }
      // de kruispunten van deze tegel (de JUNCTIONS-sectie): junctions.js leest ze bij het model (#469)
      if (s.type === SECTION.JUNCTIONS) {
        const jrows = s.rows || [];
        if (this.signalVer === undefined) this.signalVer = 0; // junctions.js signalKey: de lichten volgen signalVer, niet elke kruispunttegel
        (this.junctionRows || (this.junctionRows = new Map())).set(tk, jrows);
        // een tegel met een beveiligde kruising vraagt de verkeerslichten om een herbouw (#314 C2b)
        const signal = hasSignalArm(jrows);
        this._bumpJunctions(!!(this._bgTiles && this._bgTiles.has(tk)), signal);
        if (signal) (this._signalTiles || (this._signalTiles = new Set())).add(tk);
        continue;
      }
      const kind = KIND_OF.get(s.type);
      if (!kind) continue;
      // the same lake mapped twice is drawn once (waterdupes.js, #231)
      const twins = kind === 'water' ? dropWaterDuplicates(s.rows) : null;
      for (const { gid, obj } of rowsOf(kind, s)) {
        if (twins && twins.size && twins.has(obj)) continue;
        // #1092: een randrij zonder bron-id is niet uit de kaartdata (een oude wereld, een verzonnen rij): niet laden
        if (isProceduralEdgeRow(kind, obj, gid)) { this.proceduralEdgesSkipped = (this.proceduralEdgesSkipped || 0) + 1; continue; }
        if (kind === 'roads') hasRoads = true;
        let e = this._res[kind].get(gid);
        if (!e) {
          e = { obj };
          this._res[kind].set(gid, e);
          if (kind === 'buildings' || kind === 'roads' || kind === 'water' || kind === 'green' || kind === 'rails' || kind === 'parcels') obj.bounds = boundsOfObj(kind, obj);
          if (kind === 'water') { obj.tile = true; promoteMainWaterway(obj); this._waterVer = (this._waterVer || 0) + 1; newWater.push(obj); }
          if (kind === 'roads') { obj._ord = 1e7 + (this._ordSeq = (this._ordSeq || 0) + 1); newRoads.push(obj); this._roadVer = (this._roadVer || 0) + 1; }
          // (#754) laagversies: de routinggraaf hangt aan wegen en gebouwen; een tegel
          // met alleen bomen, groen of water laat hem staan (routing.js ensureGraph)
          if (kind === 'buildings') { this._buildingVer = (this._buildingVer || 0) + 1; ownBuildings.push(obj); }
          if (kind === 'green') greenAdded = true;
          if (kind === 'trees') ownTrees.push(obj);
          if (kind === 'furniture' && obj.k === 'hedge' && obj.pts) ownHedges.push(obj);
          if (kind === 'buildings' && obj.type === 'houseboat') addMooredBuilding(this, obj); // (boats keep off it, #343)
          const grid = gridOf(kind, obj);
          if (grid) (this[grid] || (this[grid] = new SpatialGrid(64))).insert(obj, boundsOfObj(kind, obj));
          if (kind === 'roads' && this._roadIndex) this._roadIndex.add(obj); // de gedeelde hoekpuntindex (roadindex.js)
          if (kind === 'green' && this._greenDelta) this._greenDelta.push(1, obj); // grass.js werkt de chunks per vlak bij
          if (kind === 'buildings' && this._buildingDelta) this._noteBuildingDelta(obj); // routing.js: wegen onder dit gebouw opnieuw toetsen
          // the mapped hedges (OSM barrier=hedge): the countryside draws none of its own beside them (hedgeNear)
          if (kind === 'furniture' && obj.k === 'hedge' && obj.pts) {
            obj.bounds = polygonBounds(obj.pts);
            (this.hedgeGrid || (this.hedgeGrid = new SpatialGrid(64))).insert(obj, obj.bounds);
          }
        }
        holdIn(e, tk);
        held.push(kind, gid);
        if (chunkDue()) { yield; chunkT = performance.now(); }
      }
    }
    yield; // de profielen/hoogtes en het droogmaken zijn eigen stukken (#650)
    // the profiles of streamed bridges and viaducts (build_province.mjs, #235): the roads of the tile join the elevation
    // model with them (surfaceAt, embankments, walls, a deck a boat sails under: #300). ?vlakbruggen leaves them flat.
    if (this.streamProfiles !== false) {
      attachProfiles(tile, (gid) => { const e = this._res.roads.get(gid); return e && e.obj; }, this.terrainProfiles);
      for (const r of newRoads) dropNeedlessDeck(this, r);
      if (newRoads.length && tile.sections.some((s) => s.type === SECTION.HEIGHTS)) this.elevAdded = (this.elevAdded || 0) + extendElevation(this, newRoads);
    }
    // a road over water without a bridge tag is a culvert or a dry deck (mapdata.js markDryRoad)
    for (const r of newRoads) { markDryRoad(this, r); if (slowDue()) { yield; chunkT = performance.now(); } }
    for (const w of newWater) {
      if (chunkDue()) { yield; chunkT = performance.now(); }
      if (!w.bounds) continue;
      const cx = (w.bounds[0] + w.bounds[2]) / 2, cy = (w.bounds[1] + w.bounds[3]) / 2;
      for (const r of this.roadsNear(cx, cy, Math.hypot(w.bounds[2] - w.bounds[0], w.bounds[3] - w.bounds[1]) / 2)) markDryRoad(this, r);
    }
    // een ongenaamd gebouw op een rijbaan of in water is een fout in de kaart (wereldaudit 21-11, #1045): het gaat
    // niet de grids in, zodat het niet getekend wordt en niet blokkeert (propfilter.misplacedBuilding); `dropped` laat
    // de verre laag het ook overslaan. Alleen kijken naar wat deze tegel zelf meebrengt, met de wegen en het water
    // die er dan liggen.
    const [bx0, by0] = tileOrigin(tile.i, tile.j);
    const candidates = ownBuildings.slice();
    if ((newRoads.length || newWater.length) && this.buildingGrid) {
      // (de wegen en het water van deze tegel reiken ook de buurtegel in: de gebouwen binnen 12 m van de rand opnieuw toetsen)
      const R = 12;
      for (const q of [[bx0 - R, by0 - R, bx0 + TILE_M + R, by0], [bx0 - R, by0 + TILE_M, bx0 + TILE_M + R, by0 + TILE_M + R], [bx0 - R, by0, bx0, by0 + TILE_M], [bx0 + TILE_M, by0, bx0 + TILE_M + R, by0 + TILE_M]]) {
        for (const b of this.buildingGrid.query(...q)) if (!b.dropped && !ownBuildings.includes(b)) candidates.push(b);
      }
    }
    for (const b of candidates) {
      if (slowDue()) { yield; chunkT = performance.now(); }
      if (b.dropped || !propfilter.misplacedBuilding(this, b)) continue;
      b.dropped = true;
      if (this.buildingGrid) this.buildingGrid.remove(b, b.bounds || boundsOfObj('buildings', b));
      if (this._buildingDelta) this._noteBuildingDelta(b);
      this.droppedBuildings = (this.droppedBuildings || 0) + 1;
    }
    yield; // de listeners (far-LOD, canopies) hoeven niet in hetzelfde stuk (#650)
    for (const fn of this._tileListeners || []) fn('add', tile, tk);
    // het groen van deze tegel naast de weg (#508): de vulbomen van bos en kerkhof kwamen per tegel op de weg te
    // staan waar de weg in de buurtegel ligt, en de gemapte heggen liepen over de rijbaan. Met deze tegel erbij zijn
    // de eigen bomen en heggen te beoordelen, en met zijn wegen ook die van de buren binnen 12 m.
    const [ox, oy] = tileOrigin(tile.i, tile.j);
    // perf-r3 (24-11, profiel: retrimTree 101 ms in één stap voor een bostegel): de eigen bomen in stukken van TREE_TRIM_SLICE met een
    // yield ertussen, daarna de heggen en de ring om de tegel; dezelfde volgorde en uitkomst als in één aanroep
    const gs = this.greeneryStats || (this.greeneryStats = { removed: 0, moved: 0, hedges: 0 });
    const tally = (t) => { gs.removed += t.removed; gs.moved += t.moved; gs.hedges += t.hedges; };
    const trees = ownTrees || [];
    for (let k = 0; k < trees.length; k += TREE_TRIM_SLICE) {
      tally(trimTileGreenery(this, null, { trees: trees.length > TREE_TRIM_SLICE ? trees.slice(k, k + TREE_TRIM_SLICE) : trees }));
      if (k + TREE_TRIM_SLICE < trees.length) yield;
    }
    tally(trimTileGreenery(this, [ox, oy, ox + TILE_M, oy + TILE_M], { hedges: ownHedges, roads: hasRoads || newWater.length > 0 || ownBuildings.length > 0 }));
    // #314 C2 (stap 4): één geo-versie voor de caches die uit de rasters/arrays bouwen
    // (farlod, scene3d, grass, routing, ...): per add/drop opgehoogd, zodat een cache zich
    // kan verversen. De pin houdt de stad nog vast; dit is de haak voor de volgende ronde.
    // een achtergrondtegel ver weg (plaatsingsvenster) raakt geen cache bij de speler en ververst er dus geen (_farBgTile)
    if (!this._farBgTile(tk)) {
      if (greenAdded) this.greenVer = (this.greenVer || 0) + 1;
      this._bumpGeo(tk);
    }
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

  // keepJob: the store's own queued drop (attachStore) already cancelled the job of the load it drops; a job under this key now
  // belongs to a reload that came in since and must go on after the old rows are out
  // de synchrone variant (de stad, de tests, een overlaytegel): dezelfde stappen in één keer
  dropTile(tk, keepJob = false) {
    const steps = this.dropTileSteps(tk, keepJob);
    let r = steps.next();
    while (!r.done) r = steps.next();
    return r.value;
  }

  // perf-r3 (24-11, profiel: dropTile/release tot 126 ms in één stap, vooral roadindex.remove): een gestroomde tegel die wegvalt,
  // laat zijn rijen in stukken los (de klok elke 64 rijen, ROW_CHUNK_MS), net als addTileSteps. Een tegel die intussen opnieuw
  // binnenkomt, wacht tot zijn drop klaar is (queueTile, _dropping).
  *dropTileSteps(tk, keepJob = false) {
    const job = this._tileJobs && this._tileJobs.get(tk);
    if (job && !keepJob) { job.cancelled = true; this._tileJobs.delete(tk); }
    if (!this.resident.delete(tk)) return false;
    const farBg = this._farBgTile(tk);
    for (const fn of this._tileListeners || []) fn('drop', null, tk);
    if (this.terrain) this.terrain.drop(tk);
    // de kruispunten van deze tegel gaan mee uit het model (#469)
    if (this.junctionRows && this.junctionRows.delete(tk)) {
      // alleen als deze tegel een beveiligde kruising had, moeten de lichten opnieuw (#314 C2b)
      this._bumpJunctions(!!(this._bgTiles && this._bgTiles.has(tk)), !!(this._signalTiles && this._signalTiles.delete(tk)));
    }
    if (this._bgTiles) this._bgTiles.delete(tk);
    const goneRoads = [];
    let greenGone = false;
    const release = (kind, gid, e) => {
      // Een rij van de gepinde stad blijft in de arrays en rasters zolang zijn soort nog
      // dicht is (de pin). Alleen een sparse soort (rails, meubels) laat hem per tegel gaan.
      if (e.pinned && !(this.sparse && this.sparse.has(kind))) return;
      if (!releaseFrom(e, tk)) return;
      this._res[kind].delete(gid);
      if (kind === 'green') greenGone = true;
      if (kind === 'roads') { this._roadVer = (this._roadVer || 0) + 1; if (e.obj.z) goneRoads.push(e.obj); }
      if (kind === 'buildings') this._buildingVer = (this._buildingVer || 0) + 1;
      if (kind === 'water') {
        this._waterVer = (this._waterVer || 0) + 1;
        // (#754) alleen het vaste water (geen gestroomde tegelrij) telt voor de
        // waterindex: die cache hangt aan deze teller (waterindex.js staticWater)
        if (!e.obj.tile) this._staticWaterVer = (this._staticWaterVer || 0) + 1;
      }
      if (kind === 'buildings' && e.obj.type === 'houseboat') dropMooredBuilding(this, e.obj);
      const grid = gridOf(kind, e.obj);
      if (grid && this[grid]) this[grid].remove(e.obj, boundsOfObj(kind, e.obj));
      if (kind === 'roads') { e.obj._tb = null; if (this._roadIndex) this._roadIndex.remove(e.obj); } // _tb: de onthouden gebouwtoetsen (routing.js)
      if (kind === 'green' && this._greenDelta) this._greenDelta.push(-1, e.obj);
      if (kind === 'buildings' && this._buildingDelta) this._noteBuildingDelta(e.obj);
      if (kind === 'furniture' && e.obj.k === 'hedge' && e.obj.pts && this.hedgeGrid) this.hedgeGrid.remove(e.obj, e.obj.bounds || polygonBounds(e.obj.pts));
    };
    const held = this._tileRows && this._tileRows.get(tk);
    if (held && !this.scanDrops) {
      this._tileRows.delete(tk);
      let chunkT = performance.now();
      for (let i = 0; i < held.length; i += 2) {
        const e = this._res[held[i]].get(held[i + 1]);
        if (e) release(held[i], held[i + 1], e);
        if ((i & 127) === 126 && performance.now() - chunkT >= ROW_CHUNK_MS) { yield; chunkT = performance.now(); }
      }
    } else {
      // a tile that came in with the pinned set (no list) and the A/B of the old way (scanDrops): every row of the world
      if (this._tileRows) this._tileRows.delete(tk);
      for (const kind of Object.keys(this._res)) for (const [gid, e] of this._res[kind]) release(kind, gid, e);
    }
    if (goneRoads.length) shrinkElevation(this, goneRoads);
    if (!farBg) {
      if (greenGone) this.greenVer = (this.greenVer || 0) + 1;
      this._bumpGeo(tk); // caches verversen (#314 C2, stap 4)
    }
    return true;
  }

  // keep the tiles round (x, y) coming: prefetch by speed and heading, then
  // the grids are updated within the frame budget
  follow(x, y, opts, budgetMs = 2) {
    this.focusAt = { x, y }; // where the player (or the camera) is: tileplace.js withTiles decides from it how urgent a window is (placementurgency.js)
    if (this.store) this.store.prefetch(x, y, opts);
    this.flushJunctions();
    if (this.bgQueue && this.bgQueue.items.length && ((this._promoteAt = (this._promoteAt || 0) + 1) % 20 === 0)) this.promoteBgTiles(x, y);
    const n = this.tileQueue.run(budgetMs);
    // what a background window asked for goes on as a trickle (BG_FOLLOW_MS), unless a film or the benchmark holds it
    if (this.bgQueue && this.bgQueue.items.length && !backgroundHeld()) return n + this.bgQueue.run(Math.min(budgetMs / 2, BG_FOLLOW_MS));
    return n;
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

  // A jump (a cut to a far place, the benchmark's next scene): ask for the tiles round the target
  // now, nearest first, and resolve when they are in or after budgetMs (true = all in). The rows
  // go through the normal frame budget (follow), nothing is worked in one go, and a tile that
  // never comes does not hold the caller (#1052). Best effort: a stopped store resolves false.
  warmAhead(x, y, { radius = JUMP_RING_M, budgetMs = JUMP_BUDGET_MS, token = 'jump', wait = null } = {}) {
    const st = this.store;
    if (!st || !Number.isFinite(x) || !Number.isFinite(y)) return Promise.resolve(true);
    const keys = st.keysAround(x, y, radius);
    for (const k of keys) {
      const m = st.index.tiles[k], [ox, oy] = tileOrigin(m.i, m.j);
      st.request(k, { priority: Math.hypot(ox + TILE_M / 2 - x, oy + TILE_M / 2 - y), token }).catch(() => {});
    }
    const frame = wait || (() => new Promise((r) => { const t = setTimeout(r, 50); if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => { clearTimeout(t); r(); }); }));
    return whenReady(st, keys, { budgetMs, wait: frame }).then((ok) => ok && !this.tileQueue.items.length);
  }

  // A cutscene that is about to cut to another place (cutscenewarm.js): the tiles round (x, y) are asked for and held (pinned) until
  // releaseWarm, so the cut finds them in. Not a wait: the caller polls store.missing. The rows go through the normal frame budget.
  warmPoint(x, y, { radius = 400, token = 'cutwarm' } = {}) {
    const st = this.store;
    if (!st || !Number.isFinite(x) || !Number.isFinite(y)) return 0;
    if (!this._warmPins) this._warmPins = new Set();
    let n = 0;
    for (const k of st.keysAround(x, y, radius)) {
      if (!this._warmPins.has(k)) { this._warmPins.add(k); st.pin(k); }
      st.request(k, { priority: -500, token }).catch(() => {});
      n++;
    }
    return n;
  }
  releaseWarm() {
    if (this._warmPins) for (const k of this._warmPins) this.store.unpin(k);
    this._warmPins = null;
  }

  // A route the player will travel (a taxi, a train, a flight, a ride cutscene): the tiles along the whole route are asked for
  // up front, nearest the start first (priority = metres along the route), so the stream does not first meet them at speed. They are
  // not pinned and their rows go through the normal frame budget; resolves with how many tiles were asked for. A new route
  // replaces the previous one (its token). `points` is [[x, y], ...].
  warmRoute(points, { radius = 400, step = 250, token = 'route', maxTiles = 600 } = {}) {
    const st = this.store;
    if (!st || !points || !points.length) return 0;
    if (this._routeToken && st.cancel) st.cancel(this._routeToken);
    this._routeToken = token + ':' + (this._routeN = (this._routeN || 0) + 1);
    const asked = new Set();
    for (const p of thinPath(points, step)) {
      for (const k of st.keysAround(p.x, p.y, radius)) {
        if (asked.has(k)) continue;
        if (asked.size >= maxTiles) return asked.size;
        asked.add(k);
        st.request(k, { priority: p.s, token: this._routeToken }).catch(() => {});
      }
    }
    return asked.size;
  }

  // the tile keys of a camera shot or a destination, for a pre-roll
  prefetchPoints(points, { radius = 400, token = 'shot' } = {}) {
    const keys = new Set();
    for (const [x, y] of points) for (const k of this.store.keysAround(x, y, radius)) keys.add(k);
    // Een prewarm is best effort: stopt de scène/kaart, dan is een afgebroken tegel geen fout (#588, #764).
    const veilig = (k) => this.store.request(k, { priority: -1000, token }).catch((err) => {
      if (err && (err.cancelled || err.name === 'AbortError')) return null;
      throw err;
    });
    return Promise.all([...keys].map(veilig)).then(() => this.tileQueue.run(1e9));
  }
}

// --------------------------------------------------------------- loading

// The tile world at `base` (index.json, packs, global blob), the pinned city
// resident. null when there is no index there (a build without tiles).
// terrainCache: the build may have baked the terrain arrays next to the tiles
// (scripts/world/bake_terrain.mjs); read them alongside the city tiles and
// hand them to the scene as world.terrainCache, or null when absent/stale.
export async function loadTileWorld(base = 'world/', { source = new HttpRangeSource(base), onProgress = null, pool = true, extra = [], terrain = false, terrainCache = false, ...opts } = {}) {
  let index;
  // more tile layers next to the city (index-corridor.json: the proefstrook,
  // scripts/world/build_corridor.mjs); a missing one is skipped. All the index files are
  // read in parallel (one round trip instead of one after the other), merged in order.
  const extras = extra.map((x) => (typeof x === 'string' ? { name: x } : x));
  const extraReads = extras.map(({ name }) => Promise.resolve().then(() => source.readAll(name)).catch(() => null));
  try { index = JSON.parse(new TextDecoder().decode(await source.readAll('index.json'))); } catch (e) { await Promise.all(extraReads); return null; }
  for (const [k, bytes] of (await Promise.all(extraReads)).entries()) {
    if (!bytes) continue;
    try { mergeIndex(index, JSON.parse(new TextDecoder().decode(bytes)), { only: extras[k].only || null }); } catch (e) { /* not in this build */ }
  }
  // start reading the baked ground while the city tiles come in; a build without
  // a cache (or an old stage) silently falls back to building it
  const bakedRead = terrainCache ? Promise.resolve().then(() => source.readAll(TERRAIN_FILE)).catch(() => null) : null;
  const decode = (pool && makeWorkerDecoder(new URL('./tileworker.js', import.meta.url), tileDecoderPoolSize(typeof navigator !== 'undefined' ? navigator.hardwareConcurrency : 0), ID_ASIDE, { skip: GAME_SKIP_SECTIONS })) || ((bytes) => decodeCompressed(bytes, ID_ASIDE, GAME_SKIP_SECTIONS));
  // dense: forceer de dichte arraylaag voor tests/audits die kaartrijen lezen; het spel
  // laadt de sparse productiewereld en streamt de stad.
  const dense = !!opts.dense;
  const sparseIdx = dense ? null : (index.sparse || null);
  const store = new TileStore({ source, index, decode, ...opts });
  const g = index.global;
  // the global block is read and decoded while the city tiles come in (it is only needed once they are all there)
  const globalRead = Promise.resolve().then(async () => decodeBlob(await inflateRaw(await source.read(index.packs[g.pack].file, g.off, g.len))));
  globalRead.catch(() => {}); // a failure is raised below, with the tiles
  // De stadstegels: uit de nieuwe cityTiles, de oude pins.city of (zonder beide) de
  // tegels zonder overlay/stub-velden (die horen bij een extra laag).
  const keys = index.cityTiles || (index.pins.city && index.pins.city.tiles)
    || Object.keys(index.tiles).filter((k) => { const t = index.tiles[k]; return t && !t.ov && !t.in; });
  // (#314 C1) Een volledig sparse wereld houdt de stad niet vast: de tegels komen binnen
  // voor de eerste opbouw en mogen daarna door de store worden gestroomd. Een oude,
  // dichte wereld (zonder index.sparse) blijft gepind zoals voorheen.
  const ALL_SPARSE = ['roads', 'buildings', 'water', 'trees', 'rails', 'furniture', 'green'];
  const unpinCity = !dense && Array.isArray(index.sparse) && ALL_SPARSE.every((k) => index.sparse.includes(k));
  let done = 0;
  // tijdens de eerste opbouw moet de hele stad binnenblijven (fromTiles eist de hele set);
  // daarna laat unpinCity haar los zodat de store kan streamen.
  for (const k of keys) store.pin(k);
  const [globalBlob, tiles] = await Promise.all([globalRead, Promise.all(keys.map((k) => store.request(k, { priority: 0 }).then((t) => { if (onProgress) onProgress(++done / keys.length); return t; })))]);
  const split = tiles.map(splitOverlay);
  const world = TileWorld.fromTiles(globalBlob, split.map((x) => x.city), { terrain, sparse: sparseIdx }).attachStore(store);
  world.tileIndex = index;
  registerMemSource('tiles', () => ({ resident: store.residentKeys.length, bytes: store.residentBytes, loads: store.stats.loads, evictions: store.stats.evictions }));   // technische info (#1004)
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
  // the baked ground belongs to exactly this world; when it does not fit the
  // game builds it itself (never half or wrong ground under the city)
  if (bakedRead) world.terrainCache = await readBakedTerrain(bakedRead, world);
  return { world, store, index, global: globalBlob, source };
}

// Decode the baked terrain block and check that it belongs to this world: the
// same map bounds and the same water list. A failure (old format, another world,
// a damaged file) is not fatal: the caller builds the terrain as before.
async function readBakedTerrain(reading, world) {
  const bytes = await reading;
  if (!bytes) return null;
  let cache;
  try { cache = decodeTerrain(await inflateRaw(bytes)); }
  catch (e) { console.warn(`terrein: ${TERRAIN_FILE} onleesbaar (${e.message}); het terrein wordt opnieuw gebouwd`); return null; }
  if (!sameBounds(cache.bounds, world.meta.bounds)) {
    console.warn('terrein: de gebakken grond hoort bij andere kaartgrenzen; het terrein wordt opnieuw gebouwd');
    return null;
  }
  if (cache.rowsSig !== terrainRowsSignature(terrainHoleRows(world))) {
    console.warn('terrein: de gebakken grond hoort bij een andere waterlijst; het terrein wordt opnieuw gebouwd');
    return null;
  }
  return cache;
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
