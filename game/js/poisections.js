// The city's places as tile rows (#314, B6-B8): the lists of map.meta that are points (shops, horeca, garages, neighbourhood points,
// landmarks, traffic lights, care sites, police stations, the hospital, the helipad and the pois per kind) sit in the POIS section of
// the tile their point lies in, instead of whole in the global layer. Pure: the packer (scripts/world/pack_tiles.mjs) splits, the
// tile world (tileworld.js fromTiles) joins them again for the consumers that still read the whole list, so a place is data of its
// tile and only the readers have to catch up (the pinned city holds all of them until they do).
//
//   splitMeta(meta, tileKeyOf, canHold) -> { meta: slim, rows: Map(tile key -> rows) }
//   joinMeta(slim, rows) -> meta, equal to what went in (the order of every list too)
//   layerRows(slim, list, rowSets) -> that one list from the tiles of its layer (null when a place is missing)
//
// The readers ask a layer through facilities.js: poiLayerPlaces (a list) and poiLayerPlace (a single such as the hospital
// or the helipad), which pick the tiles of the layer out of index.pois.layers (scripts/world/poilagen.mjs) and fall back
// on map.meta when a tile is not in.
//
// A row is the place's own fields plus `_l` (the list: 'shops', 'pois.health', ...) and `_n` (its place in the list; -1 for a single
// object such as the helipad). A point whose tile cannot hold it (canHold false: a tile the city has no data for) stays in the slim
// meta under `poiRest`, in the same row form. `poiLists` names every list that moved, so an empty list comes back empty.

const isPoint = (o) => !!o && typeof o === 'object' && !Array.isArray(o) && Number.isFinite(o.x) && Number.isFinite(o.y);
const isPointList = (v) => Array.isArray(v) && v.length > 0 && v.every(isPoint);
const isPointMap = (v) => !!v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length > 0 && Object.values(v).every((l) => Array.isArray(l) && l.every(isPoint));

// meta key -> the lists it carries: [[list name, items, single]]
function listsOf(key, v) {
  if (isPointList(v)) return [[key, v, false]];
  if (isPoint(v)) return [[key, [v], true]];
  if (isPointMap(v)) return Object.entries(v).map(([k, l]) => [`${key}.${k}`, l, false]);
  return [];
}

export function splitMeta(meta, tileKeyOf, canHold = () => true) {
  const slim = {}, rows = new Map(), rest = [], lists = {};
  for (const [key, v] of Object.entries(meta || {})) {
    const found = listsOf(key, v);
    if (!found.length) { slim[key] = v; continue; }
    if (isPointMap(v)) slim[key] = null; // (the kinds of a map come back from poiLists, also the empty ones)
    for (const [name, items, single] of found) {
      lists[name] = single ? -1 : items.length;
      items.forEach((item, n) => {
        for (const k of Object.keys(item)) if (k === '_l' || k === '_n') throw new Error(`poisections: ${name} has a field called ${k}`);
        const row = { _l: name, _n: single ? -1 : n, ...item };
        const tk = tileKeyOf(item.x, item.y);
        if (tk !== null && canHold(tk)) (rows.get(tk) || rows.set(tk, []).get(tk)).push(row);
        else rest.push(row);
      });
    }
  }
  slim.poiLists = lists;
  if (rest.length) slim.poiRest = rest;
  return { meta: slim, rows };
}

// One list out of only the tiles of its layer (#314, C1): a reader asks the tiles the tile index names for its layer
// (scripts/world/poilagen.mjs, index.pois.layers) and gets the same list as out of the whole meta, in the order of the places
// (_n). The places that stayed in the global layer (poiRest, outside the city's tiles) come along. null when a place is
// missing or two share a place: the reader then falls back on the whole list of map.meta.
export function layerRows(slim, name, rowSets) {
  if (!slim || !slim.poiLists || slim.poiLists[name] === undefined) return null;
  const count = slim.poiLists[name], byN = new Map();
  const take = (row) => { if (row._l === name) byN.set(row._n, row); };
  for (const rows of rowSets) for (const row of rows) take(row);
  for (const row of slim.poiRest || []) take(row);
  if (byN.size !== (count < 0 ? 1 : count)) return null;
  const items = [...byN].sort((a, b) => a[0] - b[0]).map(([, row]) => { const { _l, _n, ...item } = row; return item; });
  return count < 0 ? items[0] : items;
}

export function joinMeta(slim, rowSets) {
  if (!slim || !slim.poiLists) return slim;
  const { poiLists, poiRest, ...meta } = slim;
  const got = {};
  const take = (row) => { const { _l, _n, ...item } = row; (got[_l] || (got[_l] = [])).push([_n, item]); };
  for (const rows of rowSets) for (const row of rows) take(row);
  for (const row of poiRest || []) take(row);
  for (const [name, count] of Object.entries(poiLists)) {
    const items = (got[name] || []).sort((a, b) => a[0] - b[0]);
    if (count === -1) { if (items.length) set(meta, name, items[0][1]); continue; }
    if (items.length !== count) throw new Error(`poisections: ${name} has ${items.length} of ${count} places (a tile is missing)`);
    set(meta, name, items.map((q) => q[1]));
  }
  return meta;
}

function set(meta, name, value) {
  const i = name.indexOf('.');
  if (i < 0) { meta[name] = value; return; }
  const k = name.slice(0, i);
  if (!meta[k] || typeof meta[k] !== 'object') meta[k] = {};
  meta[k][name.slice(i + 1)] = value;
}
